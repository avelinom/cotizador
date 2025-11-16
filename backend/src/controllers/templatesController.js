const db = require('../config/database');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const googleDocsService = require('../services/googleDocsService');

/**
 * Get all templates
 */
const getTemplates = async (req, res) => {
  try {
    const templates = await db('templates')
      .select('*')
      .orderBy('is_default', 'desc')
      .orderBy('name', 'asc');

    // Parse JSON fields
    const parsedTemplates = templates.map(template => ({
      ...template,
      metadata: typeof template.metadata === 'string' 
        ? JSON.parse(template.metadata) 
        : template.metadata,
      sections: typeof template.sections === 'string' 
        ? JSON.parse(template.sections) 
        : template.sections,
      default_styles: typeof template.default_styles === 'string' 
        ? JSON.parse(template.default_styles) 
        : template.default_styles
    }));

    res.json({
      success: true,
      data: parsedTemplates
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los templates',
      error: error.message
    });
  }
};

/**
 * Get a single template by ID
 */
const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await db('templates')
      .where('id', id)
      .first();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template no encontrado'
      });
    }

    // Parse JSON fields
    template.metadata = typeof template.metadata === 'string' 
      ? JSON.parse(template.metadata) 
      : template.metadata;
    template.sections = typeof template.sections === 'string' 
      ? JSON.parse(template.sections) 
      : template.sections;
    template.default_styles = typeof template.default_styles === 'string' 
      ? JSON.parse(template.default_styles) 
      : template.default_styles;

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el template',
      error: error.message
    });
  }
};

/**
 * Apply template to a proposal
 */
const applyTemplate = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { templateId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: 'El ID del template es requerido'
      });
    }

    // Get proposal
    let query = db('proposals').where('id', proposalId);
    if (userRole !== 'admin' && userRole !== 'manager') {
      query = query.where('user_id', userId);
    }

    const proposal = await query.first();

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Propuesta no encontrada o sin permisos'
      });
    }

    // Get template
    const template = await db('templates')
      .where('id', templateId)
      .first();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template no encontrado'
      });
    }

    // Parse template data
    let templateMetadata = {};
    let templateSections = [];
    let templateStyles = {};
    
    try {
      if (template.metadata) {
        templateMetadata = typeof template.metadata === 'string' 
          ? JSON.parse(template.metadata) 
          : template.metadata;
      }
      if (!templateMetadata || typeof templateMetadata !== 'object') {
        templateMetadata = {};
      }
    } catch (parseError) {
      logger.warn('Error parsing template metadata:', parseError);
      templateMetadata = {};
    }
    
    try {
      if (template.sections) {
        templateSections = typeof template.sections === 'string' 
          ? JSON.parse(template.sections) 
          : template.sections;
      }
      if (!Array.isArray(templateSections)) {
        templateSections = [];
      }
    } catch (parseError) {
      logger.warn('Error parsing template sections:', parseError);
      templateSections = [];
    }
    
    try {
      if (template.default_styles) {
        templateStyles = typeof template.default_styles === 'string' 
          ? JSON.parse(template.default_styles) 
          : template.default_styles;
      }
      if (!templateStyles || typeof templateStyles !== 'object') {
        templateStyles = {};
      }
    } catch (parseError) {
      logger.warn('Error parsing template styles:', parseError);
      templateStyles = {};
    }

    // Parse current proposal sections
    let currentSections = [];
    try {
      if (proposal.sections) {
        currentSections = typeof proposal.sections === 'string' 
          ? JSON.parse(proposal.sections) 
          : proposal.sections;
      }
      if (!Array.isArray(currentSections)) {
        currentSections = [];
      }
    } catch (parseError) {
      logger.warn('Error parsing proposal sections, using empty array:', parseError);
      currentSections = [];
    }
    
    let currentMetadata = {};
    try {
      if (proposal.metadata) {
        currentMetadata = typeof proposal.metadata === 'string' 
          ? JSON.parse(proposal.metadata) 
          : proposal.metadata;
      }
      if (!currentMetadata || typeof currentMetadata !== 'object') {
        currentMetadata = {};
      }
    } catch (parseError) {
      logger.warn('Error parsing proposal metadata, using empty object:', parseError);
      currentMetadata = {};
    }

    // Validate template sections - if empty, we'll still update the template_id but keep existing sections
    if (!templateSections || !Array.isArray(templateSections) || templateSections.length === 0) {
      logger.warn(`Template ${templateId} has no sections defined. Updating template_id only.`);
      // Still update the template_id but keep existing sections
      const [updatedProposal] = await db('proposals')
        .where('id', proposalId)
        .update({
          template_id: templateId,
          updated_at: new Date()
        })
        .returning('*');
      
      // Parse JSON fields for response
      if (updatedProposal.sections) {
        updatedProposal.sections = typeof updatedProposal.sections === 'string' 
          ? JSON.parse(updatedProposal.sections) 
          : updatedProposal.sections;
      }
      if (updatedProposal.metadata) {
        updatedProposal.metadata = typeof updatedProposal.metadata === 'string' 
          ? JSON.parse(updatedProposal.metadata) 
          : updatedProposal.metadata;
      }
      
      return res.json({
        success: true,
        message: 'Template aplicado exitosamente (el template no tiene secciones definidas, se mantuvieron las secciones existentes)',
        data: updatedProposal
      });
    }

    // Apply template: merge sections from template with existing sections
    const updatedSections = [];
    
    // Create a map of existing sections by title (case-insensitive)
    const existingSectionsMap = new Map();
    currentSections.forEach(section => {
      if (section && section.title) {
        const key = section.title.toLowerCase().trim();
        existingSectionsMap.set(key, section);
      }
    });

    // Process template sections in order
    templateSections.forEach((templateSection, index) => {
      // Skip invalid sections
      if (!templateSection || !templateSection.title) {
        logger.warn(`Template section at index ${index} is invalid, skipping`);
        return;
      }
      
      const key = templateSection.title.toLowerCase().trim();
      if (!key) {
        logger.warn(`Template section at index ${index} has empty title, skipping`);
        return;
      }
      
      const existingSection = existingSectionsMap.get(key);

      if (existingSection) {
        // Keep existing content but update formatting and order
        updatedSections.push({
          id: existingSection.id || index + 1,
          title: existingSection.title,
          content: existingSection.content || templateSection.baseContent || '',
          htmlContent: existingSection.htmlContent || '',
          marginTop: templateSection.marginTop || existingSection.marginTop || 20,
          marginBottom: templateSection.marginBottom || existingSection.marginBottom || 20,
          marginLeft: templateSection.marginLeft || existingSection.marginLeft || 0,
          marginRight: templateSection.marginRight || existingSection.marginRight || 0,
          order: templateSection.order || index + 1
        });
        // Remove from map so we know it's been processed
        existingSectionsMap.delete(key);
      } else {
        // Add new section from template
        updatedSections.push({
          id: index + 1,
          title: templateSection.title,
          content: templateSection.baseContent || '',
          htmlContent: '',
          marginTop: templateSection.marginTop || 20,
          marginBottom: templateSection.marginBottom || 20,
          marginLeft: templateSection.marginLeft || 0,
          marginRight: templateSection.marginRight || 0,
          order: templateSection.order || index + 1
        });
      }
    });

    // Add any remaining existing sections that weren't in the template
    existingSectionsMap.forEach((section, key) => {
      updatedSections.push({
        ...section,
        order: section.order || updatedSections.length + 1
      });
    });

    // Sort sections by order
    updatedSections.sort((a, b) => (a.order || 999) - (b.order || 999));

    // Update metadata with template metadata
    const updatedMetadata = {
      ...currentMetadata,
      ...templateMetadata,
      margins: templateMetadata.margins || currentMetadata.margins || {
        top: 1440,
        bottom: 1440,
        left: 1440,
        right: 1440
      }
    };

    // Resolve file paths (handle both absolute and relative paths)
    const resolvePath = (filePath) => {
      if (!filePath) return null;
      return path.isAbsolute(filePath) 
        ? filePath 
        : path.resolve(__dirname, '../../', filePath);
    };

    const mappingDocPath = resolvePath(template.mapping_document_path);
    const dynamicDocPath = resolvePath(template.dynamic_document_path);
    const formatTemplatePath = resolvePath(template.format_template_path);
    const proposalDocPath = resolvePath(proposal.file_path);

    // Validate template has all required files
    if (!mappingDocPath || !fs.existsSync(mappingDocPath)) {
      return res.status(400).json({
        success: false,
        message: 'El template no tiene documento de mapeo configurado'
      });
    }
    
    if (!dynamicDocPath || !fs.existsSync(dynamicDocPath)) {
      return res.status(400).json({
        success: false,
        message: 'El template no tiene documento dinámico configurado'
      });
    }
    
    if (!formatTemplatePath || !fs.existsSync(formatTemplatePath)) {
      return res.status(400).json({
        success: false,
        message: 'El template no tiene template de formato configurado'
      });
    }

    // Check if proposal has completed dynamic document
    if (!proposalDocPath || !fs.existsSync(proposalDocPath)) {
      return res.status(400).json({
        success: false,
        message: 'La propuesta no tiene documento dinámico completado. Por favor sube el documento dinámico primero.'
      });
    }

    // Generate final formatted document
    let finalDocumentPath = null;
    try {
      logger.info('🔄 Generando documento final formateado...');
      
      // Prepare output path
      const proposalsDir = path.join(__dirname, '../../uploads/proposals');
      if (!fs.existsSync(proposalsDir)) {
        fs.mkdirSync(proposalsDir, { recursive: true });
      }
      
      const finalFilename = `proposal-${proposalId}-final-${Date.now()}.docx`;
      finalDocumentPath = path.join(proposalsDir, finalFilename);

      // Generate final document
      await generateFinalDocument({
        mappingDocumentPath: mappingDocPath,
        dynamicDocumentPath: proposalDocPath, // The completed dynamic document uploaded by user
        formatTemplatePath: formatTemplatePath,
        outputPath: finalDocumentPath,
        proposalData: {
          proposalId: proposalId,
          title: proposal.title,
          clientName: proposal.client_name,
          proposal_type: proposal.proposal_type
        }
      });
      
      logger.info(`✅ Documento final generado: ${finalDocumentPath}`);
    } catch (genError) {
      logger.error('❌ Error generando documento final:', genError);
      // Continue with template application even if final document generation fails
      // The user can regenerate it later
      logger.warn('⚠️ Continuando con aplicación de template sin documento final');
    }

    // Update proposal
    const updateData = {
      template_id: templateId,
      sections: JSON.stringify(updatedSections),
      metadata: JSON.stringify(updatedMetadata),
      updated_at: new Date()
    };
    
    // Add final document path if generated successfully
    if (finalDocumentPath) {
      // Store relative path from project root
      const relativePath = path.relative(path.join(__dirname, '../../'), finalDocumentPath);
      updateData.final_document_path = relativePath;
    }
    
    const [updatedProposal] = await db('proposals')
      .where('id', proposalId)
      .update(updateData)
      .returning('*');

    // Parse JSON fields for response
    if (typeof updatedProposal.sections === 'string') {
      updatedProposal.sections = JSON.parse(updatedProposal.sections);
    }
    if (typeof updatedProposal.metadata === 'string') {
      updatedProposal.metadata = JSON.parse(updatedProposal.metadata);
    }

    const successMessage = finalDocumentPath 
      ? 'Template aplicado exitosamente. Documento final generado.'
      : 'Template aplicado exitosamente (error al generar documento final, puedes regenerarlo más tarde)';

    res.json({
      success: true,
      message: successMessage,
      data: updatedProposal
    });
  } catch (error) {
    logger.error('Error applying template:', error);
    logger.error('Error stack:', error.stack);
    console.error('❌ [applyTemplate] Error completo:', error);
    console.error('❌ [applyTemplate] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error al aplicar el template',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Extract sections from Word document using mammoth to identify section numbers
 * @param {Buffer} docBuffer - Word document buffer
 * @returns {Promise<Array>} Array of sections with {number, title, isStatic, isDynamic, xmlContent, baseContent}
 */
const extractSectionsFromDocument = async (docBuffer) => {
  const zip = new PizZip(docBuffer);
  const docXml = zip.files['word/document.xml'].asText();
  const bodyMatch = docXml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/);
  if (!bodyMatch) return [];
  
  const bodyContent = bodyMatch[1];
  
  // Extract text using mammoth to identify sections
  const { value: html } = await mammoth.convertToHtml({ buffer: docBuffer });
  const textResult = await mammoth.extractRawText({ buffer: docBuffer });
  const rawText = textResult.value;
  
  // Split document into paragraphs (XML)
  const paragraphRegex = /<w:p[^>]*>[\s\S]*?<\/w:p>/g;
  const paragraphs = bodyContent.match(paragraphRegex) || [];
  
  // Identify sections by looking for numbered titles in text
  // Pattern: "1.", "2.", "I.", "II.", etc. or "[ESTÁTICO]" / "[DINÁMICO]" markers
  const sectionPattern = /^(\d+|[IVX]+)\.?\s+(.+)$/m;
  const sections = [];
  let currentSection = null;
  let currentSectionXml = [];
  let sectionNumber = null;
  
  // Process paragraphs to identify sections
  for (let i = 0; i < paragraphs.length; i++) {
    const paraXml = paragraphs[i];
    const paraText = paraXml.replace(/<[^>]+>/g, '').trim();
    
    // Check if this paragraph is a section title
    const titleMatch = paraText.match(sectionPattern);
    const hasStaticMarker = paraText.includes('[ESTÁTICO]') || paraText.includes('[ESTATICO]');
    const hasDynamicMarker = paraText.includes('[DINÁMICO]') || paraText.includes('[DINAMICO]');
    
    if (titleMatch || hasStaticMarker || hasDynamicMarker) {
      // Save previous section if exists
      if (currentSection && currentSectionXml.length > 0) {
        // Extract base content from XML paragraphs
        const sectionText = currentSectionXml.map(p => {
          return p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }).join(' ').trim();
        
        sections.push({
          number: sectionNumber,
          title: currentSection.title,
          isStatic: currentSection.isStatic,
          isDynamic: currentSection.isDynamic,
          xmlContent: currentSectionXml.join(''),
          baseContent: sectionText
        });
      }
      
      // Start new section
      const numMatch = paraText.match(/^(\d+)/);
      sectionNumber = numMatch ? parseInt(numMatch[1]) : (sections.length + 1);
      const title = paraText.replace(/^(\d+|[IVX]+)\.?\s*/, '')
                            .replace(/\[ESTÁTICO\]|\[ESTATICO\]|\[DINÁMICO\]|\[DINAMICO\]/g, '')
                            .trim();
      
      currentSection = {
        number: sectionNumber,
        title: title,
        isStatic: hasStaticMarker || (!hasDynamicMarker && !hasStaticMarker), // Default to static if no marker
        isDynamic: hasDynamicMarker
      };
      currentSectionXml = [paraXml];
    } else if (currentSection) {
      // Add paragraph to current section
      currentSectionXml.push(paraXml);
    } else {
      // Content before first section - add to a default section
      if (sections.length === 0) {
        currentSection = {
          number: 0,
          title: 'Introducción',
          isStatic: true,
          isDynamic: false
        };
        currentSectionXml = [paraXml];
      }
    }
  }
  
  // Add last section
  if (currentSection && currentSectionXml.length > 0) {
    // Extract base content from XML paragraphs
    const sectionText = currentSectionXml.map(p => {
      return p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }).join(' ').trim();
    
    sections.push({
      number: sectionNumber,
      title: currentSection.title,
      isStatic: currentSection.isStatic,
      isDynamic: currentSection.isDynamic,
      xmlContent: currentSectionXml.join(''),
      baseContent: sectionText
    });
  }
  
  return sections;
};

/**
 * Generate final document by merging mapping document and dynamic document, preserving original format
 * Sections are ordered numerically
 * @param {Object} options - Configuration options
 * @param {string} options.mappingDocumentPath - Path to mapping document (static sections)
 * @param {string} options.dynamicDocumentPath - Path to completed dynamic document
 * @param {string} options.formatTemplatePath - Path to format template (.dotx) - NOT USED, kept for compatibility
 * @param {string} options.outputPath - Path where final document will be saved
 * @param {Object} options.proposalData - Proposal metadata (title, client, etc.)
 * @returns {Promise<string>} Path to generated final document
 */
const generateFinalDocument = async (options) => {
  const {
    mappingDocumentPath,
    dynamicDocumentPath,
    formatTemplatePath, // Not used, but kept for compatibility
    outputPath,
    proposalData = {}
  } = options;

  try {
    logger.info('📄 Iniciando merge usando Google Docs...');
    logger.info(`   - Mapping: ${mappingDocumentPath}`);
    logger.info(`   - Dynamic: ${dynamicDocumentPath}`);
    logger.info(`   - Output: ${outputPath}`);

    // Check if Google Docs API is available
    const useGoogleDocs = process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;
    
    if (useGoogleDocs) {
      return await generateFinalDocumentWithGoogleDocs(options);
    } else {
      logger.warn('⚠️ Google Docs API no configurada, usando método Word tradicional');
      return await generateFinalDocumentWithWord(options);
    }
  } catch (error) {
    logger.error('❌ Error generando documento final:', error);
    throw error;
  }
};

/**
 * Generate final document using Google Docs API
 */
const generateFinalDocumentWithGoogleDocs = async (options) => {
  const {
    mappingDocumentPath,
    dynamicDocumentPath,
    outputPath,
    proposalData = {}
  } = options;

  try {
    // Initialize Google Docs service
    await googleDocsService.initialize();
    
    if (!googleDocsService.initialized) {
      throw new Error('Google Docs API no está disponible. Verifica las credenciales.');
    }

    // Extract text content from Word documents using mammoth
    logger.info('📖 Extrayendo contenido de documentos Word...');
    
    const mappingResult = await mammoth.extractRawText({ path: mappingDocumentPath });
    const dynamicResult = await mammoth.extractRawText({ path: dynamicDocumentPath });
    
    const staticContent = mappingResult.value || '';
    const dynamicContent = dynamicResult.value || '';

    // Generate document title
    const documentTitle = proposalData.title || 
                         `Propuesta ${proposalData.clientName || ''} ${new Date().toISOString().split('T')[0]}`.trim();

    // Create merged document in Google Docs
    logger.info('📝 Creando documento en Google Docs...');
    const googleDoc = await googleDocsService.createMergedDocument(
      documentTitle,
      staticContent,
      dynamicContent
    );

    // Export to Word format
    logger.info('📥 Exportando documento a Word...');
    await googleDocsService.exportToWord(googleDoc.documentId, outputPath);

    // Store Google Doc ID in proposal data for future reference
    if (proposalData.proposalId) {
      await db('proposals')
        .where('id', proposalData.proposalId)
        .update({
          google_doc_id: googleDoc.documentId,
          google_doc_url: `https://docs.google.com/document/d/${googleDoc.documentId}/edit`
        });
    }

    logger.info(`✅ Documento creado en Google Docs: ${googleDoc.documentId}`);
    logger.info(`   URL: https://docs.google.com/document/d/${googleDoc.documentId}/edit`);
    logger.info(`   Archivo Word exportado: ${outputPath}`);

    return outputPath;
  } catch (error) {
    logger.error('❌ Error generando documento con Google Docs:', error);
    throw error;
  }
};

/**
 * Generate final document using traditional Word manipulation (fallback)
 */
const generateFinalDocumentWithWord = async (options) => {
  const {
    mappingDocumentPath,
    dynamicDocumentPath,
    outputPath
  } = options;

  try {
    logger.info('📄 Haciendo merge seguro: copiando documento dinámico completo y agregando secciones estáticas...');

    // Validate files exist
    if (!fs.existsSync(mappingDocumentPath)) {
      throw new Error(`Documento de mapeo no encontrado: ${mappingDocumentPath}`);
    }
    if (!fs.existsSync(dynamicDocumentPath)) {
      throw new Error(`Documento dinámico no encontrado: ${dynamicDocumentPath}`);
    }

    // Read both documents
    const mappingContent = fs.readFileSync(mappingDocumentPath);
    const dynamicContent = fs.readFileSync(dynamicDocumentPath);
    
    logger.info('📄 Haciendo merge seguro: copiando documento dinámico completo y agregando secciones estáticas...');
    
    // Strategy: Copy the entire dynamic document (preserves all formatting, styles, etc.)
    // Then insert static sections from mapping document at the beginning
    const dynamicZip = new PizZip(dynamicContent);
    
    // Get the full dynamic document XML to preserve all structure
    const dynamicDocXml = dynamicZip.files['word/document.xml'].asText();
    
    // Extract mapping document's static sections only
    const mappingZip = new PizZip(mappingContent);
    const mappingDocXml = mappingZip.files['word/document.xml'].asText();
    
    // Find body boundaries more safely
    const dynamicBodyStart = dynamicDocXml.indexOf('<w:body');
    const dynamicBodyEnd = dynamicDocXml.indexOf('</w:body>');
    
    if (dynamicBodyStart === -1 || dynamicBodyEnd === -1) {
      throw new Error('No se pudo encontrar el body en el documento dinámico');
    }
    
    const mappingBodyStart = mappingDocXml.indexOf('<w:body');
    const mappingBodyEnd = mappingDocXml.indexOf('</w:body>');
    
    if (mappingBodyStart === -1 || mappingBodyEnd === -1) {
      throw new Error('No se pudo encontrar el body en el documento de mapeo');
    }
    
    // Extract body content more safely using substring
    const dynamicBodyTagEnd = dynamicDocXml.indexOf('>', dynamicBodyStart);
    const dynamicBodyContent = dynamicDocXml.substring(dynamicBodyTagEnd + 1, dynamicBodyEnd);
    
    const mappingBodyTagEnd = mappingDocXml.indexOf('>', mappingBodyStart);
    const mappingBodyContent = mappingDocXml.substring(mappingBodyTagEnd + 1, mappingBodyEnd);
    
    logger.info(`   📏 Tamaño del contenido de mapeo: ${mappingBodyContent.length} caracteres`);
    logger.info(`   📏 Tamaño del contenido dinámico: ${dynamicBodyContent.length} caracteres`);
    
    // Find and preserve the last sectPr from dynamic document (user's formatting)
    const sectPrRegex = /<w:sectPr[\s\S]*?<\/w:sectPr>/g;
    const dynamicSectPrMatches = dynamicBodyContent.match(sectPrRegex);
    const lastSectPr = dynamicSectPrMatches && dynamicSectPrMatches.length > 0 
      ? dynamicSectPrMatches[dynamicSectPrMatches.length - 1] 
      : '';
    
    // Remove last sectPr from dynamic body (we'll add it at the end)
    let dynamicBodyWithoutSectPr = dynamicBodyContent;
    if (lastSectPr) {
      const lastSectPrIndex = dynamicBodyContent.lastIndexOf(lastSectPr);
      dynamicBodyWithoutSectPr = dynamicBodyContent.substring(0, lastSectPrIndex) + 
                                  dynamicBodyContent.substring(lastSectPrIndex + lastSectPr.length);
    }
    
    // Remove all sectPr from mapping content (we'll use dynamic's sectPr)
    let mappingBodyWithoutSectPr = mappingBodyContent;
    const mappingSectPrMatches = mappingBodyContent.match(sectPrRegex);
    if (mappingSectPrMatches) {
      mappingSectPrMatches.forEach(sectPr => {
        mappingBodyWithoutSectPr = mappingBodyWithoutSectPr.replace(sectPr, '');
      });
    }
    
    // Merge: static sections first, then dynamic content, then sectPr
    // This ensures static content appears before dynamic content
    const mergedBodyContent = mappingBodyWithoutSectPr + dynamicBodyWithoutSectPr + lastSectPr;
    
    logger.info(`   📏 Tamaño del contenido combinado: ${mergedBodyContent.length} caracteres`);
    
    // Validate merged content has valid XML structure
    const paragraphCount = (mergedBodyContent.match(/<w:p/g) || []).length;
    const runCount = (mergedBodyContent.match(/<w:r/g) || []).length;
    logger.info(`   📊 Estructura XML: ${paragraphCount} párrafos, ${runCount} runs`);
    
    if (paragraphCount === 0) {
      throw new Error('Error: El contenido combinado no tiene párrafos válidos');
    }
    
    // Copy resources (images, relationships) from mapping document to dynamic document
    logger.info('🔗 Copiando recursos del documento de mapeo al documento dinámico...');
    const mappingRelsPath = 'word/_rels/document.xml.rels';
    const dynamicRelsPath = 'word/_rels/document.xml.rels';
    
    let dynamicRelsXml = '';
    let nextRelId = 1;
    const relIdMapping = new Map();
    
    // Start with dynamic document's relationships (preserve user's document structure)
    if (dynamicZip.files[dynamicRelsPath]) {
      dynamicRelsXml = dynamicZip.files[dynamicRelsPath].asText();
      const relIdMatches = dynamicRelsXml.match(/rId(\d+)/g);
      if (relIdMatches && relIdMatches.length > 0) {
        const maxId = Math.max(...relIdMatches.map(m => parseInt(m.replace('rId', ''))));
        nextRelId = maxId + 1;
      }
    }
    
    // Merge mapping document's relationships (static sections may have images/resources)
    if (mappingZip.files[mappingRelsPath]) {
      const mappingRelsXml = mappingZip.files[mappingRelsPath].asText();
      const relsMatch = mappingRelsXml.match(/<Relationships[^>]*>([\s\S]*?)<\/Relationships>/);
      if (relsMatch) {
        let mappingRels = relsMatch[1];
        const relationshipRegex = /<Relationship[^>]*Id="(rId\d+)"[^>]*>/g;
        let match;
        let updatedRels = mappingRels;
        
        // Map old relationship IDs to new ones to avoid conflicts
        while ((match = relationshipRegex.exec(mappingRels)) !== null) {
          const oldRelId = match[1];
          const newRelId = `rId${nextRelId}`;
          relIdMapping.set(oldRelId, newRelId);
          updatedRels = updatedRels.replace(new RegExp(`Id="${oldRelId}"`, 'g'), `Id="${newRelId}"`);
          nextRelId++;
        }
        
        // Update relationship IDs in merged body content (mapping sections)
        relIdMapping.forEach((newId, oldId) => {
          mergedBodyContent = mergedBodyContent.replace(
            new RegExp(`r:embed="${oldId}"`, 'g'),
            `r:embed="${newId}"`
          );
          mergedBodyContent = mergedBodyContent.replace(
            new RegExp(`r:link="${oldId}"`, 'g'),
            `r:link="${newId}"`
          );
          mergedBodyContent = mergedBodyContent.replace(
            new RegExp(`r:id="${oldId}"`, 'g'),
            `r:id="${newId}"`
          );
        });
        
        // Merge relationships into dynamic document
        if (dynamicRelsXml) {
          const dynamicRelsMatch = dynamicRelsXml.match(/(<Relationships[^>]*>)([\s\S]*?)(<\/Relationships>)/);
          if (dynamicRelsMatch) {
            dynamicRelsXml = dynamicRelsMatch[1] + dynamicRelsMatch[2] + updatedRels + dynamicRelsMatch[3];
          }
        } else {
          dynamicRelsXml = `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${updatedRels}</Relationships>`;
        }
        
        dynamicZip.file(dynamicRelsPath, dynamicRelsXml);
        logger.info(`✅ Relaciones actualizadas (${relIdMapping.size} relaciones del documento de mapeo)`);
      }
    }
    
    // Copy media files and other resources from mapping document to dynamic document
    const copiedResources = [];
    Object.keys(mappingZip.files).forEach(fileName => {
      if (fileName.startsWith('word/media/')) {
        dynamicZip.file(fileName, mappingZip.files[fileName].asNodeBuffer());
        copiedResources.push(fileName);
      } else if (fileName !== 'word/document.xml' && 
                 fileName !== mappingRelsPath &&
                 fileName.startsWith('word/') &&
                 !fileName.includes('_rels/')) {
        if (!dynamicZip.files[fileName]) {
          dynamicZip.file(fileName, mappingZip.files[fileName].asNodeBuffer());
          copiedResources.push(fileName);
        }
      }
    });
    logger.info(`   Recursos copiados del documento de mapeo: ${copiedResources.length}`);
    
    // Update document XML with merged content
    // Preserve everything from dynamic document except the body content
    const beforeBody = dynamicDocXml.substring(0, dynamicBodyTagEnd + 1);
    const afterBody = dynamicDocXml.substring(dynamicBodyEnd);
    
    // Reconstruct the full XML document
    const finalDocXml = beforeBody + mergedBodyContent + afterBody;
    
    // Validate XML structure before saving
    if (!finalDocXml.includes('<w:body') || !finalDocXml.includes('</w:body>')) {
      throw new Error('Error: El XML del documento no tiene una estructura válida después del merge');
    }
    
    // Check for basic XML well-formedness
    const openBodyTags = (finalDocXml.match(/<w:body/g) || []).length;
    const closeBodyTags = (finalDocXml.match(/<\/w:body>/g) || []).length;
    if (openBodyTags !== 1 || closeBodyTags !== 1) {
      throw new Error(`Error: El XML tiene ${openBodyTags} tags de apertura y ${closeBodyTags} tags de cierre para body`);
    }
    
    // Validate we have at least one paragraph
    if (!finalDocXml.includes('<w:p')) {
      throw new Error('Error: El documento final no tiene párrafos');
    }
    
    if (!finalDocXml.includes('<w:sectPr')) {
      logger.warn('⚠️ Advertencia: El documento final no tiene propiedades de sección');
    }
    
    // Validate XML declaration is present
    if (!finalDocXml.startsWith('<?xml')) {
      logger.warn('⚠️ Advertencia: El XML no comienza con declaración XML');
    }
    
    // Update the document.xml in the ZIP
    dynamicZip.file('word/document.xml', finalDocXml);
    
    // Update Content Types - merge from mapping document
    const contentTypesPath = '[Content_Types].xml';
    if (mappingZip.files[contentTypesPath] && dynamicZip.files[contentTypesPath]) {
      const mappingContentTypes = mappingZip.files[contentTypesPath].asText();
      const dynamicContentTypes = dynamicZip.files[contentTypesPath].asText();
      
      const overrideRegex = /<Override[^>]*\/>/g;
      const defaultRegex = /<Default[^>]*\/>/g;
      
      let newOverrides = [];
      let newDefaults = [];
      let match;
      
      // Get new content types from mapping document
      while ((match = overrideRegex.exec(mappingContentTypes)) !== null) {
        const overrideXml = match[0];
        if (!dynamicContentTypes.includes(overrideXml)) {
          newOverrides.push(overrideXml);
        }
      }
      
      while ((match = defaultRegex.exec(mappingContentTypes)) !== null) {
        const defaultXml = match[0];
        if (!dynamicContentTypes.includes(defaultXml)) {
          newDefaults.push(defaultXml);
        }
      }
      
      if (newOverrides.length > 0 || newDefaults.length > 0) {
        const typesMatch = dynamicContentTypes.match(/(<Types[^>]*>)([\s\S]*?)(<\/Types>)/);
        if (typesMatch) {
          const newContentTypes = typesMatch[1] + typesMatch[2] + 
            newDefaults.join('\n') + newOverrides.join('\n') + typesMatch[3];
          dynamicZip.file(contentTypesPath, newContentTypes);
        }
      }
    }
    
    // Generate final document using dynamic document as base
    logger.info('📦 Generando documento final...');
    
    // Try to generate with different options for better compatibility
    let buffer;
    try {
      buffer = dynamicZip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }, // Medium compression level
        streamFiles: false // Don't stream, load everything into memory for better compatibility
      });
    } catch (genError) {
      logger.warn('⚠️ Error con opciones de compresión, intentando sin compresión...');
      // Fallback: try without compression
      buffer = dynamicZip.generate({
        type: 'nodebuffer',
        compression: 'STORE', // No compression
        streamFiles: false
      });
    }
    
    logger.info('✅ Documentos combinados preservando formato');
    logger.info(`   Tamaño del buffer: ${buffer.length} bytes`);
    
    // Validate buffer is a valid ZIP file
    if (buffer.length < 2 || buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
      throw new Error('El documento generado no es un archivo ZIP válido');
    }

    // Validate buffer before saving
    if (!buffer || buffer.length === 0) {
      throw new Error('Buffer del documento final está vacío o es inválido');
    }
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save final document
    try {
      fs.writeFileSync(outputPath, buffer);
      logger.info(`✅ Documento final guardado en: ${outputPath}`);
      logger.info(`   Tamaño del archivo: ${buffer.length} bytes`);
      
      // Verify file was written correctly
      if (!fs.existsSync(outputPath)) {
        throw new Error('El archivo no se creó correctamente después de escribir');
      }
      
      const stats = fs.statSync(outputPath);
      if (stats.size === 0) {
        throw new Error('El archivo guardado está vacío');
      }
      
      logger.info(`   Verificación: Archivo existe y tiene ${stats.size} bytes`);
    } catch (writeError) {
      logger.error('❌ Error al guardar documento final:', writeError);
      throw new Error(`Error al guardar documento: ${writeError.message}`);
    }

    return outputPath;
  } catch (error) {
    logger.error('❌ Error generando documento final:', error);
    throw error;
  }
};

/**
 * Create a new template
 */
const createTemplate = async (req, res) => {
  try {
    const { name, description, metadata, sections, default_styles, is_default } = req.body;

    if (!name || !sections || !Array.isArray(sections)) {
      return res.status(400).json({
        success: false,
        message: 'El nombre y las secciones son requeridos'
      });
    }

    const [template] = await db('templates').insert({
      name,
      description: description || null,
      metadata: JSON.stringify(metadata || {}),
      sections: JSON.stringify(sections),
      default_styles: JSON.stringify(default_styles || {}),
      is_default: is_default || false,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    // Parse JSON fields for response
    if (typeof template.metadata === 'string') {
      template.metadata = JSON.parse(template.metadata);
    }
    if (typeof template.sections === 'string') {
      template.sections = JSON.parse(template.sections);
    }
    if (typeof template.default_styles === 'string') {
      template.default_styles = JSON.parse(template.default_styles);
    }

    res.status(201).json({
      success: true,
      message: 'Template creado exitosamente',
      data: template
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el template',
      error: error.message
    });
  }
};

/**
 * Update a template
 */
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, metadata, sections, default_styles, is_default } = req.body;

    const template = await db('templates').where('id', id).first();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template no encontrado'
      });
    }

    const updateData = {
      updated_at: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (metadata !== undefined) updateData.metadata = JSON.stringify(metadata);
    if (sections !== undefined) updateData.sections = JSON.stringify(sections);
    if (default_styles !== undefined) updateData.default_styles = JSON.stringify(default_styles);
    if (is_default !== undefined) updateData.is_default = is_default;

    const [updatedTemplate] = await db('templates')
      .where('id', id)
      .update(updateData)
      .returning('*');

    // Parse JSON fields for response
    if (typeof updatedTemplate.metadata === 'string') {
      updatedTemplate.metadata = JSON.parse(updatedTemplate.metadata);
    }
    if (typeof updatedTemplate.sections === 'string') {
      updatedTemplate.sections = JSON.parse(updatedTemplate.sections);
    }
    if (typeof updatedTemplate.default_styles === 'string') {
      updatedTemplate.default_styles = JSON.parse(updatedTemplate.default_styles);
    }

    res.json({
      success: true,
      message: 'Template actualizado exitosamente',
      data: updatedTemplate
    });
  } catch (error) {
    logger.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el template',
      error: error.message
    });
  }
};

/**
 * Delete a template
 */
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await db('templates').where('id', id).first();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template no encontrado'
      });
    }

    await db('templates').where('id', id).delete();

    res.json({
      success: true,
      message: 'Template eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el template',
      error: error.message
    });
  }
};

// Configure multer for Word document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/templates');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const proposalType = req.body.proposalType || 'unknown';
    let fileType = 'unknown';
    if (file.fieldname === 'mappingDocument') {
      fileType = 'mapping';
    } else if (file.fieldname === 'dynamicDocument') {
      fileType = 'dynamic';
    } else if (file.fieldname === 'formatTemplate') {
      fileType = 'format';
    }
    cb(null, `template-${proposalType}-${fileType}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // For formatTemplate field, accept .dotx (Word Template)
  if (file.fieldname === 'formatTemplate') {
    if (file.originalname.endsWith('.dotx')) {
      cb(null, true);
    } else {
      cb(new Error('El template de formato debe ser un archivo Word Template (.dotx)'), false);
    }
    return;
  }
  
  // For other fields (mappingDocument, dynamicDocument), accept Word documents
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword' // .doc
  ];
  
  if (allowedMimes.includes(file.mimetype) || 
      file.originalname.endsWith('.docx') || 
      file.originalname.endsWith('.doc')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos Word (.docx o .doc)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});

// Multer instance for processing mapping document only
const uploadForProcessing = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../../uploads/templates/temp');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `temp-mapping-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (allowedMimes.includes(file.mimetype) || 
        file.originalname.endsWith('.docx') || 
        file.originalname.endsWith('.doc')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Word (.docx o .doc)'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

/**
 * Process Word document to extract sections and identify static/dynamic markers
 * Uses extractSectionsFromDocument for better section detection
 */
const processMappingDocument = async (filePath) => {
  try {
    console.log(`📖 [processMappingDocument] Procesando archivo: ${filePath}`);
    
    // Try using extractSectionsFromDocument first (better for Word documents)
    try {
      const docBuffer = fs.readFileSync(filePath);
      const sections = await extractSectionsFromDocument(docBuffer);
      
      if (sections.length > 0) {
        // Transform to expected format
        return sections.map((section, index) => ({
          id: section.number || index + 1,
          order: section.number || index + 1,
          title: section.title || `Sección ${section.number || index + 1}`,
          isStatic: section.isStatic || false,
          isDynamic: section.isDynamic || false,
          baseContent: section.baseContent || '',
          hasTitle: !!section.title
        }));
      }
    } catch (extractError) {
      console.warn('⚠️ [processMappingDocument] Error usando extractSectionsFromDocument, usando método alternativo:', extractError.message);
      logger.warn('Error using extractSectionsFromDocument, falling back to text extraction:', extractError);
    }
    
    // Fallback to text extraction method
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    
    console.log(`📖 [processMappingDocument] Texto extraído: ${text.length} caracteres`);
    console.log(`📖 [processMappingDocument] Primeros 500 caracteres: ${text.substring(0, 500)}`);
    logger.info(`Document text length: ${text.length} characters`);
    logger.debug(`First 500 characters: ${text.substring(0, 500)}`);
    
    // Parse sections from the document
    // Look for section titles and markers for static/dynamic
    const sections = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    console.log(`📖 [processMappingDocument] Total líneas después de filtrar: ${lines.length}`);
    console.log(`📖 [processMappingDocument] Primeras 20 líneas:`, lines.slice(0, 20));
    logger.info(`Total lines after filtering: ${lines.length}`);
    logger.debug(`First 20 lines: ${JSON.stringify(lines.slice(0, 20))}`);
    
    let currentSection = null;
    let order = 1;
    
    // First pass: try to find sections with improved regex
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if line contains static/dynamic markers first (most reliable indicator)
      const lineUpper = trimmedLine.toUpperCase();
      const hasStaticMarker = lineUpper.includes('[ESTÁTICO]') || lineUpper.includes('[ESTATICO]') || 
                              lineUpper.includes('(ESTÁTICO)') || lineUpper.includes('(ESTATICO)') ||
                              lineUpper.includes('ESTÁTICO') || lineUpper.includes('ESTATICO');
      const hasDynamicMarker = lineUpper.includes('[DINÁMICO]') || lineUpper.includes('[DINAMICO]') || 
                               lineUpper.includes('(DINÁMICO)') || lineUpper.includes('(DINAMICO)') ||
                               lineUpper.includes('DINÁMICO') || lineUpper.includes('DINAMICO');
      
      // More flexible regex patterns:
      // - Numbered sections: "1. Title", "1) Title", "1 - Title", "1 Title"
      // - Lettered sections: "A. Title", "A) Title"
      // - Roman numerals: "I. Title", "II. Title"
      // - All caps titles (potential sections)
      // - Lines with static/dynamic markers (even without numbers)
      const numberedPattern = /^\d+[\.\)\-\s]+[A-ZÁÉÍÓÚÑa-záéíóúñ]/;
      const letteredPattern = /^[A-Z][\.\)\-\s]+[A-ZÁÉÍÓÚÑa-záéíóúñ]/;
      const romanPattern = /^[IVX]+[\.\)\-\s]+[A-ZÁÉÍÓÚÑa-záéíóúñ]/i;
      const allCapsPattern = /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{3,}$/;
      
      // A line is a section title if:
      // 1. It matches standard patterns (numbered, lettered, etc.)
      // 2. OR it has static/dynamic markers (even without numbers)
      const isSectionTitle = numberedPattern.test(trimmedLine) || 
                             letteredPattern.test(trimmedLine) ||
                             romanPattern.test(trimmedLine) ||
                             (allCapsPattern.test(trimmedLine) && trimmedLine.length < 100) ||
                             (hasStaticMarker || hasDynamicMarker);
      
      if (isSectionTitle) {
        logger.debug(`Found potential section title: "${trimmedLine}"`);
        
        // Save previous section if exists
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Use the markers we already detected
        const isStatic = hasStaticMarker;
        const isDynamic = hasDynamicMarker;
        
        // Clean title: remove markers but preserve the actual title text
        let cleanTitle = trimmedLine;
        
        // First, remove static/dynamic markers (but preserve everything else)
        cleanTitle = cleanTitle.replace(/\[ESTÁTICO\]|\[ESTATICO\]|\(ESTÁTICO\)|\(ESTATICO\)/gi, '').trim();
        cleanTitle = cleanTitle.replace(/\[DINÁMICO\]|\[DINAMICO\]|\(DINÁMICO\)|\(DINAMICO\)/gi, '').trim();
        
        // Remove leading number/letter/roman numeral and separator, but keep the rest
        // Pattern: "1. Title" -> "Title", "1) Title" -> "Title", "1 - Title" -> "Title"
        cleanTitle = cleanTitle.replace(/^\d+[\.\)\-\s]+/, '').trim();
        cleanTitle = cleanTitle.replace(/^[IVX]+[\.\)\-\s]+/i, '').trim();
        cleanTitle = cleanTitle.replace(/^[A-Z][\.\)\-\s]+/, '').trim();
        
        // Remove trailing tabs and page numbers (e.g., "\t3" at the end)
        cleanTitle = cleanTitle.replace(/\s*\t+\d+\s*$/, '').trim();
        cleanTitle = cleanTitle.replace(/\s+\d+\s*$/, '').trim();
        
        // If after cleaning we only have a number, something went wrong - try a different approach
        if (/^\d+$/.test(cleanTitle) && cleanTitle.length <= 3) {
          console.log(`⚠️ Title cleaning resulted in only number "${cleanTitle}", original line: "${trimmedLine}"`);
          logger.warn(`Title cleaning resulted in only number "${cleanTitle}", original line: "${trimmedLine}"`);
          // Try to extract title differently - look for text before markers or numbers
          const match = trimmedLine.match(/^(.+?)(?:\(.*?\)|\[.*?\]|\s*\t+\d+|\s+\d+)?$/);
          if (match && match[1]) {
            cleanTitle = match[1].trim();
            // Remove markers from extracted title
            cleanTitle = cleanTitle.replace(/\[ESTÁTICO\]|\[ESTATICO\]|\(ESTÁTICO\)|\(ESTATICO\)/gi, '').trim();
            cleanTitle = cleanTitle.replace(/\[DINÁMICO\]|\[DINAMICO\]|\(DINÁMICO\)|\(DINAMICO\)/gi, '').trim();
            cleanTitle = cleanTitle.replace(/\s*\t+\d+\s*$/, '').trim();
            cleanTitle = cleanTitle.replace(/\s+\d+\s*$/, '').trim();
          }
        }
        
        // Final cleanup - remove any remaining brackets/parentheses that might be markers
        cleanTitle = cleanTitle.replace(/^\s*\[.*?\]\s*/, '').trim();
        cleanTitle = cleanTitle.replace(/^\s*\(.*?\)\s*/, '').trim();
        
        // Remove trailing dots if they're just punctuation (not part of the title)
        cleanTitle = cleanTitle.replace(/\.\s*$/, '').trim();
        
        currentSection = {
          id: order,
          title: cleanTitle,
          order: order++,
          required: true,
          baseContent: '',
          isStatic: isStatic,
          // Default to dynamic if not explicitly marked as static
          isDynamic: isDynamic || (!isStatic && !isDynamic),
          marginTop: 20,
          marginBottom: 20,
          marginLeft: 0,
          marginRight: 0
        };
        
        logger.debug(`Created section: "${cleanTitle}" - isDynamic: ${currentSection.isDynamic}, isStatic: ${currentSection.isStatic}`);
      } else if (currentSection) {
        // Add content to current section
        currentSection.baseContent += (currentSection.baseContent ? '\n' : '') + trimmedLine;
      }
    }
    
    // Add last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    // If no sections were found with standard format, try alternative parsing
    if (sections.length === 0) {
      logger.warn('No sections found with standard format, trying alternative parsing...');
      logger.info(`Total lines to check: ${lines.length}`);
      logger.debug(`Sample lines (first 15): ${JSON.stringify(lines.slice(0, 15))}`);
      
      // Try alternative: look for any numbered list items (more flexible)
      const numberedPatterns = [
        /^\d+[\.\)\-\s]+/,  // "1. ", "1) ", "1 - "
        /^\d+\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]/,  // "1 Title" (number followed by letter)
        /^\d+[\.\)\-\s]+[A-ZÁÉÍÓÚÑa-záéíóúñ]/,  // "1. Title" with letter after separator
      ];
      
      let numberedLines = [];
      for (const pattern of numberedPatterns) {
        const matches = lines.filter(line => pattern.test(line.trim()));
        if (matches.length > 0) {
          logger.info(`Found ${matches.length} numbered lines with pattern: ${pattern}`);
          numberedLines = matches;
          break;
        }
      }
      
      // If still no matches, try even more flexible: any line starting with a number
      if (numberedLines.length === 0) {
        logger.warn('No matches with standard patterns, trying very flexible pattern...');
        numberedLines = lines.filter(line => {
          const trimmed = line.trim();
          return /^\d+/.test(trimmed) && trimmed.length > 2; // Starts with number and has content
        });
        logger.info(`Found ${numberedLines.length} lines starting with numbers`);
      }
      
      if (numberedLines.length > 0) {
        logger.info(`Processing ${numberedLines.length} numbered lines as sections`);
        numberedLines.forEach((line, index) => {
          let cleanTitle = line.trim();
          
          // Check for markers first (before cleaning)
          const lineUpper = cleanTitle.toUpperCase();
          const isStatic = lineUpper.includes('[ESTÁTICO]') || lineUpper.includes('[ESTATICO]') || 
                           lineUpper.includes('(ESTÁTICO)') || lineUpper.includes('(ESTATICO)') ||
                           lineUpper.includes('ESTÁTICO') || lineUpper.includes('ESTATICO');
          const isDynamic = lineUpper.includes('[DINÁMICO]') || lineUpper.includes('[DINAMICO]') || 
                            lineUpper.includes('(DINÁMICO)') || lineUpper.includes('(DINAMICO)') ||
                            lineUpper.includes('DINÁMICO') || lineUpper.includes('DINAMICO');
          
          // Remove leading number and separators, but preserve the title text
          cleanTitle = cleanTitle.replace(/^\d+[\.\)\-\s]+/, '').trim();
          cleanTitle = cleanTitle.replace(/^\d+\s+/, '').trim();
          
          // Remove markers from title (case insensitive)
          cleanTitle = cleanTitle.replace(/\[ESTÁTICO\]|\[ESTATICO\]|\(ESTÁTICO\)|\(ESTATICO\)/gi, '').trim();
          cleanTitle = cleanTitle.replace(/\[DINÁMICO\]|\[DINAMICO\]|\(DINÁMICO\)|\(DINAMICO\)/gi, '').trim();
          
          // Final cleanup
          cleanTitle = cleanTitle.replace(/^\s*\[.*?\]\s*/, '').trim();
          cleanTitle = cleanTitle.replace(/^\s*\(.*?\)\s*/, '').trim();
          
          if (cleanTitle.length > 0 && !/^\d+$/.test(cleanTitle)) {
            sections.push({
              id: index + 1,
              title: cleanTitle,
              order: index + 1,
              required: true,
              baseContent: '',
              isStatic: isStatic,
              isDynamic: isDynamic || !isStatic, // Default to dynamic
              marginTop: 20,
              marginBottom: 20,
              marginLeft: 0,
              marginRight: 0
            });
            
            logger.debug(`Alternative parsing - Section ${index + 1}: "${cleanTitle}" (isStatic: ${isStatic}, isDynamic: ${isDynamic || !isStatic})`);
          } else {
            logger.warn(`Skipping line "${line.trim()}" - cleaned title is empty or only number`);
          }
        });
      } else {
        logger.warn('No numbered lines found. Showing sample lines for debugging:');
        lines.slice(0, 10).forEach((line, idx) => {
          logger.debug(`Line ${idx + 1}: "${line.substring(0, 100)}"`);
        });
      }
    }
    
    logger.info(`Total sections extracted: ${sections.length}`);
    sections.forEach((section, index) => {
      logger.debug(`Section ${index + 1}: "${section.title}" - isDynamic: ${section.isDynamic}, isStatic: ${section.isStatic}`);
    });
    
    return sections;
  } catch (error) {
    logger.error('Error processing mapping document:', error);
    throw new Error(`Error al procesar el documento de mapeo: ${error.message}`);
  }
};

/**
 * Process mapping document and return sections (for preview)
 * Note: This function expects req.file to be set by multer middleware
 */
const processMappingDocumentPreview = async (req, res) => {
  try {
    if (!req.file) {
        console.warn('⚠️ [processMappingDocumentPreview] No file uploaded');
        logger.warn('No file uploaded');
        return res.status(400).json({
          success: false,
          message: 'No se ha subido ningún archivo'
        });
      }

      console.log(`📄 [processMappingDocumentPreview] Procesando documento: ${req.file.path}`);
      console.log(`📄 [processMappingDocumentPreview] Nombre archivo: ${req.file.originalname}`);
      logger.info(`Procesando documento de mapeo: ${req.file.path}`);
      
      // Process mapping document to extract sections
      const sections = await processMappingDocument(req.file.path);
      
      console.log(`✅ [processMappingDocumentPreview] Secciones extraídas: ${sections.length}`);
      logger.info(`Secciones extraídas: ${sections.length}`);
      
      if (sections.length > 0) {
        sections.forEach((section, index) => {
          console.log(`  📌 Sección ${index + 1}: "${section.title}" - isDynamic: ${section.isDynamic}, isStatic: ${section.isStatic}`);
          logger.info(`Sección ${index + 1}: "${section.title}" - isDynamic: ${section.isDynamic}, isStatic: ${section.isStatic}`);
        });
      } else {
        console.warn('⚠️ [processMappingDocumentPreview] No se encontraron secciones');
        logger.warn('No se encontraron secciones en el documento. Esto puede indicar un problema con el formato del documento.');
      }
      
      // Clean up temp file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      console.log(`📤 [processMappingDocumentPreview] Enviando respuesta con ${sections.length} secciones`);
      res.json({
        success: true,
        data: { sections }
      });
    } catch (error) {
      // Clean up temp file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      console.error('❌ [processMappingDocumentPreview] Error:', error);
      logger.error('Error processing mapping document preview:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar el documento de mapeo',
        error: error.message
      });
  }
};

/**
 * Upload template documents (mapping document and format template)
 */
const uploadTemplateDocuments = async (req, res) => {
  const uploadFields = upload.fields([
    { name: 'mappingDocument', maxCount: 1 },
    { name: 'dynamicDocument', maxCount: 1 },
    { name: 'formatTemplate', maxCount: 1 }
  ]);

  uploadFields(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Error al subir los archivos'
        });
      }

      if (!req.files || !req.files.mappingDocument || !req.files.dynamicDocument || !req.files.formatTemplate) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren los tres documentos: documento de mapeo, documento dinámico y template de formato'
        });
      }

      const { proposalType, name, description } = req.body;
      
      if (!proposalType) {
        return res.status(400).json({
          success: false,
          message: 'El tipo de propuesta es requerido'
        });
      }

      const mappingDoc = req.files.mappingDocument[0];
      const dynamicDoc = req.files.dynamicDocument[0];
      const formatDoc = req.files.formatTemplate[0];

      // Process mapping document to extract sections
      let sections = [];
      try {
        sections = await processMappingDocument(mappingDoc.path);
      } catch (error) {
        // If processing fails, create empty sections array
        logger.warn('Could not process mapping document, using empty sections:', error);
        sections = [];
      }

      // Create template record
      const [template] = await db('templates').insert({
        name: name || `Template - ${proposalType}`,
        description: description || `Template para ${proposalType}`,
        proposal_type: proposalType,
        mapping_document_path: mappingDoc.path,
        dynamic_document_path: dynamicDoc.path,
        format_template_path: formatDoc.path,
        metadata: JSON.stringify({
          margins: { top: 72, bottom: 72, left: 72, right: 72 },
          fontSize: 12,
          fontFamily: 'Arial',
          lineSpacing: 1.5,
          header: { enabled: false },
          footer: { enabled: false }
        }),
        sections: JSON.stringify(sections),
        default_styles: JSON.stringify({
          heading1: { fontSize: 16, bold: true, marginTop: 30, marginBottom: 15 },
          heading2: { fontSize: 14, bold: true, marginTop: 20, marginBottom: 10 },
          paragraph: { fontSize: 12, marginTop: 0, marginBottom: 10 }
        }),
        is_default: false,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');

      // Parse JSON fields for response
      if (typeof template.metadata === 'string') {
        template.metadata = JSON.parse(template.metadata);
      }
      if (typeof template.sections === 'string') {
        template.sections = JSON.parse(template.sections);
      }
      if (typeof template.default_styles === 'string') {
        template.default_styles = JSON.parse(template.default_styles);
      }

      res.status(201).json({
        success: true,
        message: 'Template creado exitosamente con documentos Word',
        data: template
      });
    } catch (error) {
      logger.error('Error uploading template documents:', error);
      res.status(500).json({
        success: false,
        message: 'Error al subir los documentos del template',
        error: error.message
      });
    }
  });
};

/**
 * Download dynamic document with fields replaced
 * Processes the dynamic document Word file and replaces placeholder fields using docxtemplater
 * This preserves the original document format including headers, footers, and styling
 */
const downloadDynamicDocumentWithFields = async (req, res) => {
  try {
    const templateId = req.params.id;
    const { proposalType, clientName, modificationDate, clientId, customDescription } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: 'ID de template requerido'
      });
    }

    if (!proposalType || !clientName || !modificationDate) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos: proposalType, clientName, modificationDate'
      });
    }

    // Get template from database
    const template = await db('templates').where('id', templateId).first();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template no encontrado'
      });
    }

    // Resolve the full path to the dynamic document
    const dynamicDocPath = path.isAbsolute(template.dynamic_document_path) 
      ? template.dynamic_document_path 
      : path.resolve(__dirname, '../../', template.dynamic_document_path);
    
    console.log(`📄 [downloadDynamicDocumentWithFields] Ruta del documento: ${dynamicDocPath}`);
    console.log(`📄 [downloadDynamicDocumentWithFields] Existe: ${fs.existsSync(dynamicDocPath)}`);
    
    if (!template.dynamic_document_path || !fs.existsSync(dynamicDocPath)) {
      console.error(`❌ [downloadDynamicDocumentWithFields] Documento no encontrado: ${dynamicDocPath}`);
      return res.status(404).json({
        success: false,
        message: `El documento dinámico no está disponible para este template. Ruta buscada: ${dynamicDocPath}`
      });
    }

    console.log(`📄 [downloadDynamicDocumentWithFields] Procesando documento: ${dynamicDocPath}`);
    logger.info(`Processing dynamic document with fields: ${dynamicDocPath}`);

    // Read the Word document
    let docxBuffer;
    try {
      docxBuffer = fs.readFileSync(dynamicDocPath);
      console.log(`✅ [downloadDynamicDocumentWithFields] Archivo leído: ${docxBuffer.length} bytes`);
    } catch (readError) {
      console.error(`❌ [downloadDynamicDocumentWithFields] Error leyendo archivo:`, readError);
      throw new Error(`Error al leer el documento dinámico: ${readError.message}`);
    }
    
    // Load the docx file as a zip
    let zip;
    let doc;
    try {
      zip = new PizZip(docxBuffer);
      console.log('✅ [downloadDynamicDocumentWithFields] PizZip creado exitosamente');
      
      // Initialize docxtemplater with zip file
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });
      console.log('✅ [downloadDynamicDocumentWithFields] Docxtemplater inicializado exitosamente');
    } catch (initError) {
      console.error('❌ [downloadDynamicDocumentWithFields] Error inicializando docxtemplater:', initError);
      throw new Error(`Error al inicializar el procesador de documentos: ${initError.message}`);
    }

    // Set the template variables
    // docxtemplater uses {variableName} syntax in the Word document
    doc.setData({
      proposalType: proposalType,
      clientName: clientName,
      modificationDate: modificationDate,
      fecha: modificationDate,
      cliente: clientName,
      tipoPropuesta: proposalType,
      // Also support common variations
      'Tipo de Propuesta': proposalType,
      'Cliente': clientName,
      'Fecha de hoy': modificationDate,
    });

    try {
      // Render the document (replace all occurrences of {variableName} with actual values)
      doc.render();
    } catch (error) {
      // If rendering fails, it might be because the document doesn't use {variableName} syntax
      // In that case, we'll fall back to text replacement
      console.warn('⚠️ [downloadDynamicDocumentWithFields] docxtemplater render failed, using fallback:', error.message);
      logger.warn('docxtemplater render failed, using fallback method');
      
      // Fallback: Use mammoth to extract text and replace, then recreate with docx
      const result = await mammoth.extractRawText({ buffer: docxBuffer });
      let text = result.value;

      // Replace placeholder fields
      const replacements = [
        { pattern: /Insertar Tipo de Propuesta/gi, value: proposalType },
        { pattern: /Insertar Tipo de propuesta/gi, value: proposalType },
        { pattern: /Tipo de Propuesta.*?Insertar/gi, value: proposalType },
        { pattern: /\[Tipo de Propuesta\]/gi, value: proposalType },
        { pattern: /\{Tipo de Propuesta\}/gi, value: proposalType },
        { pattern: /\{proposalType\}/gi, value: proposalType },
        
        { pattern: /Insertar Cliente/gi, value: clientName },
        { pattern: /Insertar cliente/gi, value: clientName },
        { pattern: /Cliente.*?Insertar/gi, value: clientName },
        { pattern: /\[Cliente\]/gi, value: clientName },
        { pattern: /\{Cliente\}/gi, value: clientName },
        { pattern: /\{clientName\}/gi, value: clientName },
        
        { pattern: /Insertar Fecha de hoy/gi, value: modificationDate },
        { pattern: /Insertar fecha de hoy/gi, value: modificationDate },
        { pattern: /Insertar Fecha/gi, value: modificationDate },
        { pattern: /Fecha de hoy.*?Insertar/gi, value: modificationDate },
        { pattern: /\[Fecha de hoy\]/gi, value: modificationDate },
        { pattern: /\[Fecha\]/gi, value: modificationDate },
        { pattern: /\{Fecha de hoy\}/gi, value: modificationDate },
        { pattern: /\{Fecha\}/gi, value: modificationDate },
        { pattern: /\{modificationDate\}/gi, value: modificationDate },
      ];

      replacements.forEach(({ pattern, value }) => {
        text = text.replace(pattern, value);
      });

      // Create new document with docx library (loses formatting but works)
      const { Document, Packer, Paragraph, TextRun } = require('docx');
      const paragraphs = text.split('\n').filter(line => line.trim().length > 0).map(line => {
        return new Paragraph({
          children: [new TextRun(line.trim())]
        });
      });

      const newDoc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      });

      const buffer = await Packer.toBuffer(newDoc);
      
      // Save processed document to uploads/proposals directory
      const uploadPath = path.resolve(__dirname, '../../uploads/proposals');
      console.log(`📁 [downloadDynamicDocumentWithFields] Upload path: ${uploadPath}`);
      if (!fs.existsSync(uploadPath)) {
        console.log(`📁 [downloadDynamicDocumentWithFields] Creando directorio: ${uploadPath}`);
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      
      // Generate filename with proposal type, client name and date
      const sanitizeFilename = (str) => {
        return str.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
      };
      
      // Convert date from DD/MM/YYYY to YYYYMMDD for filename
      const dateParts = modificationDate.split('/');
      const formattedDate = dateParts.length === 3 
        ? `${dateParts[2]}${dateParts[1]}${dateParts[0]}` // YYYYMMDD
        : modificationDate.replace(/\//g, '');
      
      const proposalTypeSanitized = sanitizeFilename(proposalType);
      const clientNameSanitized = sanitizeFilename(clientName);
      const processedFilename = `${proposalTypeSanitized}_${clientNameSanitized}_${formattedDate}.docx`;
      const processedFilePath = path.join(uploadPath, processedFilename);
      
      try {
        fs.writeFileSync(processedFilePath, buffer);
        console.log(`✅ [downloadDynamicDocumentWithFields] Archivo guardado (fallback): ${processedFilePath}`);
      } catch (fileError) {
        console.error('❌ [downloadDynamicDocumentWithFields] Error guardando archivo (fallback):', fileError);
        throw new Error(`Error al guardar el archivo procesado: ${fileError.message}`);
      }

      // Create proposal record in database
      const proposalData = {
        title: proposalType,
        description: customDescription || `Propuesta para ${clientName}`,
        original_filename: processedFilename,
        file_path: processedFilePath,
        user_id: userId,
        status: 'in_progress',
        client_name: clientName,
        proposal_type: proposalType,
        template_id: templateId,
        started_at: new Date(),
        sections: JSON.stringify([]),
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Only add client_id if it's a valid number
      if (clientId) {
        const clientIdNum = parseInt(clientId, 10);
        if (!isNaN(clientIdNum)) {
          proposalData.client_id = clientIdNum;
        }
      }
      
      let proposal;
      try {
        [proposal] = await db('proposals').insert(proposalData).returning('*');
        console.log(`✅ [downloadDynamicDocumentWithFields] Propuesta creada en BD (fallback): ${proposal.id}`);
      } catch (dbError) {
        console.error('❌ [downloadDynamicDocumentWithFields] Error insertando en BD (fallback):', dbError);
        console.error('❌ [downloadDynamicDocumentWithFields] Datos:', JSON.stringify(proposalData, null, 2));
        throw new Error(`Error al crear el registro en la base de datos: ${dbError.message}`);
      }

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      // Encode filename for Content-Disposition header (RFC 5987)
      const encodedFilename = encodeURIComponent(processedFilename).replace(/'/g, "%27");
      res.setHeader('Content-Disposition', `attachment; filename="${processedFilename}"; filename*=UTF-8''${encodedFilename}`);

      // Send the buffer
      res.send(buffer);

      console.log(`✅ [downloadDynamicDocumentWithFields] Documento generado y propuesta creada (fallback): ${proposal.id}`);
      logger.info(`Document generated and proposal created (fallback): ${proposal.id}`);
      
      return;
    }

    // If docxtemplater worked, get the generated document
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // Save processed document to uploads/proposals directory
    const uploadPath = path.resolve(__dirname, '../../uploads/proposals');
    console.log(`📁 [downloadDynamicDocumentWithFields] Upload path: ${uploadPath}`);
    if (!fs.existsSync(uploadPath)) {
      console.log(`📁 [downloadDynamicDocumentWithFields] Creando directorio: ${uploadPath}`);
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    // Generate filename with proposal type, client name and date
    const sanitizeFilename = (str) => {
      return str.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
    };
    
    // Convert date from DD/MM/YYYY to YYYYMMDD for filename
    const dateParts = modificationDate.split('/');
    const formattedDate = dateParts.length === 3 
      ? `${dateParts[2]}${dateParts[1]}${dateParts[0]}` // YYYYMMDD
      : modificationDate.replace(/\//g, '');
    
    const proposalTypeSanitized = sanitizeFilename(proposalType);
    const clientNameSanitized = sanitizeFilename(clientName);
    const processedFilename = `${proposalTypeSanitized}_${clientNameSanitized}_${formattedDate}.docx`;
    const processedFilePath = path.join(uploadPath, processedFilename);
    
    try {
      fs.writeFileSync(processedFilePath, buffer);
      console.log(`✅ [downloadDynamicDocumentWithFields] Archivo guardado: ${processedFilePath}`);
    } catch (fileError) {
      console.error('❌ [downloadDynamicDocumentWithFields] Error guardando archivo:', fileError);
      throw new Error(`Error al guardar el archivo procesado: ${fileError.message}`);
    }

    // Create proposal record in database
    const proposalData = {
      title: proposalType,
      description: customDescription || `Propuesta para ${clientName}`,
      original_filename: processedFilename,
      file_path: processedFilePath,
      user_id: userId,
      status: 'in_progress',
      client_name: clientName,
      proposal_type: proposalType,
      template_id: templateId,
      started_at: new Date(),
      sections: JSON.stringify([]),
      metadata: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Only add client_id if it's a valid number
    if (clientId) {
      const clientIdNum = parseInt(clientId, 10);
      if (!isNaN(clientIdNum)) {
        proposalData.client_id = clientIdNum;
      }
    }
    
    let proposal;
    try {
      [proposal] = await db('proposals').insert(proposalData).returning('*');
      console.log(`✅ [downloadDynamicDocumentWithFields] Propuesta creada en BD: ${proposal.id}`);
    } catch (dbError) {
      console.error('❌ [downloadDynamicDocumentWithFields] Error insertando en BD:', dbError);
      console.error('❌ [downloadDynamicDocumentWithFields] Datos:', JSON.stringify(proposalData, null, 2));
      throw new Error(`Error al crear el registro en la base de datos: ${dbError.message}`);
    }

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    // Encode filename for Content-Disposition header (RFC 5987)
    const encodedFilename = encodeURIComponent(processedFilename).replace(/'/g, "%27");
    res.setHeader('Content-Disposition', `attachment; filename="${processedFilename}"; filename*=UTF-8''${encodedFilename}`);

    // Send the buffer
    res.send(buffer);

    console.log(`✅ [downloadDynamicDocumentWithFields] Documento generado y propuesta creada: ${proposal.id}`);
    logger.info(`Document generated and proposal created: ${proposal.id}`);
  } catch (error) {
    console.error('❌ [downloadDynamicDocumentWithFields] Error completo:', error);
    console.error('❌ [downloadDynamicDocumentWithFields] Stack:', error.stack);
    logger.error('Error downloading dynamic document with fields:', error);
    logger.error('Error stack:', error.stack);
    
    // Provide more detailed error message
    let errorMessage = 'Error al procesar el documento dinámico';
    if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Extract text from a paragraph element in Google Doc
 */
const extractTextFromParagraph = (paragraph) => {
  if (!paragraph.elements) {
    return '';
  }

  let text = '';
  for (const element of paragraph.elements) {
    if (element.textRun) {
      text += element.textRun.content || '';
    }
  }

  return text;
};

/**
 * Extract sections from Google Doc data
 */
const extractSectionsFromGoogleDoc = (docData) => {
  const sections = [];

  if (!docData.body || !docData.body.content) {
    return sections;
  }

  let currentSection = null;

  for (const element of docData.body.content) {
    if (element.paragraph) {
      const text = extractTextFromParagraph(element.paragraph);
      const trimmedText = text.trim();

      // Check if this is a section title (starts with number)
      const sectionMatch = trimmedText.match(/^(\d+)\.\s*(.+)$/);

      if (sectionMatch) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }

        // Start new section
        const order = parseInt(sectionMatch[1]);
        const title = sectionMatch[2].trim();

        // Check for [ESTÁTICO] or [DINÁMICO] markers
        const isStatic = /\[ESTÁTICO\]|\[ESTATICO\]/i.test(title);
        const isDynamic = /\[DINÁMICO\]|\[DINAMICO\]/i.test(title);

        // Clean title (remove markers)
        const cleanTitle = title
          .replace(/\[ESTÁTICO\]|\[ESTATICO\]/gi, '')
          .replace(/\[DINÁMICO\]|\[DINAMICO\]/gi, '')
          .trim();

        currentSection = {
          order: order,
          title: cleanTitle || `Sección ${order}`,
          content: text + '\n',
          isStatic: isStatic,
          isDynamic: isDynamic || (!isStatic && !isDynamic), // Default to dynamic if not marked
          baseContent: ''
        };
      } else if (currentSection) {
        // Add to current section
        currentSection.content += text + '\n';
        if (!currentSection.baseContent) {
          currentSection.baseContent = text.substring(0, 200);
        }
      }
    }
  }

  // Add last section
  if (currentSection) {
    sections.push(currentSection);
  }

  // Sort by order
  sections.sort((a, b) => a.order - b.order);

  return sections;
};

/**
 * Process Google Drive document and extract sections
 * POST /api/templates/process-google-drive-document
 */
const processGoogleDriveDocument = async (req, res) => {
  try {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'documentId es requerido'
      });
    }

    logger.info(`📄 Procesando documento de Google Drive: ${documentId}`);

    // Initialize Google Docs service
    await googleDocsService.initialize();

    if (!googleDocsService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Docs Service no está disponible. Verifica la autenticación OAuth.'
      });
    }

    // Get document content
    const docData = await googleDocsService.getDocumentContent(documentId);

    // Extract sections
    const sections = extractSectionsFromGoogleDoc(docData);

    logger.info(`✅ Secciones extraídas: ${sections.length}`);

    res.json({
      success: true,
      data: {
        sections: sections
      }
    });
  } catch (error) {
    logger.error('Error procesando documento de Google Drive:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar el documento de Google Drive',
      error: error.message
    });
  }
};

/**
 * Create template from Google Drive documents
 * POST /api/templates/create-from-google-drive
 */
const createTemplateFromGoogleDrive = async (req, res) => {
  try {
    const {
      proposalType,
      proposalId,
      staticDocumentId,
      dynamicDocumentId,
      staticDocumentName,
      dynamicDocumentName,
      staticFolderId,
      dynamicFolderId
    } = req.body;

    if (!proposalType || !staticDocumentId || !dynamicDocumentId) {
      return res.status(400).json({
        success: false,
        message: 'proposalType, staticDocumentId y dynamicDocumentId son requeridos'
      });
    }

    logger.info(`📝 Creando template desde Google Drive para: ${proposalType}`);
    logger.info(`   Proposal ID: ${proposalId}`);
    logger.info(`   Static Folder ID: ${staticFolderId}`);
    logger.info(`   Dynamic Folder ID: ${dynamicFolderId}`);

    // Initialize Google Docs service
    await googleDocsService.initialize();

    if (!googleDocsService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Docs Service no está disponible'
      });
    }

    // Get sections from static document
    logger.info(`📄 Obteniendo contenido del documento estático: ${staticDocumentId}`);
    let staticDocData;
    try {
      staticDocData = await googleDocsService.getDocumentContent(staticDocumentId);
      logger.info(`✅ Documento estático obtenido, extrayendo secciones...`);
    } catch (error) {
      logger.error(`❌ Error obteniendo documento estático ${staticDocumentId}:`, error);
      return res.status(500).json({
        success: false,
        message: `Error al obtener documento estático: ${error.message}`,
        error: error.message
      });
    }

    const staticSections = extractSectionsFromGoogleDoc(staticDocData);
    logger.info(`✅ Se encontraron ${staticSections.length} secciones en documento estático`);

    // Filter dynamic sections from static document
    const dynamicSections = staticSections.filter(s => s.isDynamic || (!s.isStatic && !s.isDynamic));
    logger.info(`✅ Se identificaron ${dynamicSections.length} secciones dinámicas`);

    // Get sections from dynamic document
    logger.info(`📄 Obteniendo contenido del documento dinámico: ${dynamicDocumentId}`);
    let dynamicDocData;
    try {
      dynamicDocData = await googleDocsService.getDocumentContent(dynamicDocumentId);
      logger.info(`✅ Documento dinámico obtenido, extrayendo secciones...`);
    } catch (error) {
      logger.error(`❌ Error obteniendo documento dinámico ${dynamicDocumentId}:`, error);
      return res.status(500).json({
        success: false,
        message: `Error al obtener documento dinámico: ${error.message}`,
        error: error.message
      });
    }

    const dynamicDocSections = extractSectionsFromGoogleDoc(dynamicDocData);
    logger.info(`✅ Se encontraron ${dynamicDocSections.length} secciones en documento dinámico`);

    // Clean sections to only include serializable properties
    const cleanSections = dynamicSections.map(section => ({
      order: section.order,
      title: section.title || '',
      required: section.required || false,
      baseContent: section.baseContent || '',
      marginTop: section.marginTop || 20,
      marginBottom: section.marginBottom || 20,
      marginLeft: section.marginLeft || 0,
      marginRight: section.marginRight || 0
    }));

    logger.info(`🧹 Secciones limpiadas: ${cleanSections.length}`);

    // Create template record
    let templateData;
    try {
      const metadataObj = {
        proposalId: proposalId || null,
        staticDocumentId,
        dynamicDocumentId,
        staticDocumentName: staticDocumentName || '',
        dynamicDocumentName: dynamicDocumentName || '',
        staticFolderId: staticFolderId || null,
        dynamicFolderId: dynamicFolderId || null,
        createdFrom: 'google_drive',
        totalSections: staticSections.length,
        dynamicSections: dynamicSections.length
      };

      const defaultStylesObj = {
        heading1: { fontSize: 16, bold: true, marginTop: 30, marginBottom: 15 },
        heading2: { fontSize: 14, bold: true, marginTop: 20, marginBottom: 10 },
        paragraph: { fontSize: 12, marginTop: 0, marginBottom: 10 },
      };

      // Test JSON serialization before creating templateData
      const metadataStr = JSON.stringify(metadataObj);
      const sectionsStr = JSON.stringify(cleanSections);
      const stylesStr = JSON.stringify(defaultStylesObj);

      logger.info(`✅ JSON serialization test passed`);

      // Create template name with ID if available
      const templateName = proposalId 
        ? `${proposalId} - ${proposalType}`
        : `Template - ${proposalType}`;

      templateData = {
        name: templateName,
        description: `Template para ${proposalType} creado desde Google Drive`,
        proposal_type: proposalType,
        proposal_id: proposalId || null, // Store proposal ID
        static_folder_id: staticFolderId || null, // Store static folder ID
        dynamic_folder_id: dynamicFolderId || null, // Store dynamic folder ID
        is_default: false,
        mapping_document_path: staticDocumentId, // Store Google Doc ID
        dynamic_document_path: dynamicDocumentId, // Store Google Doc ID
        format_template_path: null, // No format template needed
        metadata: metadataStr,
        sections: sectionsStr,
        default_styles: stylesStr,
        created_at: new Date(),
        updated_at: new Date()
      };
    } catch (jsonError) {
      logger.error(`❌ Error serializando JSON:`, jsonError);
      logger.error(`   Sections:`, cleanSections);
      return res.status(500).json({
        success: false,
        message: `Error al serializar datos: ${jsonError.message}`,
        error: jsonError.message
      });
    }

    logger.info(`💾 Insertando template en base de datos...`);
    logger.info(`   Template data keys:`, Object.keys(templateData));
    logger.info(`   Static Folder ID en templateData: ${templateData.static_folder_id}`);
    logger.info(`   Dynamic Folder ID en templateData: ${templateData.dynamic_folder_id}`);
    logger.info(`   Proposal ID en templateData: ${templateData.proposal_id}`);
    
    let template;
    try {
      const result = await db('templates').insert(templateData).returning('*');
      
      // Knex with PostgreSQL returns an array
      if (Array.isArray(result) && result.length > 0) {
        template = result[0];
      } else if (result && result.id) {
        template = result;
      } else {
        throw new Error('No se pudo obtener el template creado de la base de datos');
      }
      
      logger.info(`✅ Template creado con ID: ${template.id}`);
      logger.info(`   Template guardado - Static Folder ID: ${template.static_folder_id || 'NULL'}`);
      logger.info(`   Template guardado - Dynamic Folder ID: ${template.dynamic_folder_id || 'NULL'}`);
      logger.info(`   Template guardado - Proposal ID: ${template.proposal_id || 'NULL'}`);
    } catch (error) {
      logger.error(`❌ Error insertando template en base de datos:`, error);
      logger.error(`   Error stack:`, error.stack);
      logger.error(`   Error message:`, error.message);
      logger.error(`   Template data (first 500 chars):`, JSON.stringify(templateData).substring(0, 500));
      
      // Check if it's a column error
      if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
        logger.error(`   ⚠️ Parece que las columnas no existen en la base de datos. Ejecuta la migración.`);
      }
      
      // Provide more specific error message
      let errorMessage = error.message || 'Error desconocido al guardar template';
      if (error.code) {
        errorMessage = `Error de base de datos (${error.code}): ${errorMessage}`;
      }
      
      return res.status(500).json({
        success: false,
        message: `Error al guardar template en base de datos: ${errorMessage}`,
        error: errorMessage,
        code: error.code
      });
    }

    // Parse JSON fields safely
    let parsedMetadata = {};
    let parsedSections = [];
    let parsedStyles = {};
    
    try {
      parsedMetadata = JSON.parse(template.metadata || '{}');
    } catch (e) {
      logger.warn('Error parsing metadata, using empty object');
    }
    
    try {
      parsedSections = JSON.parse(template.sections || '[]');
    } catch (e) {
      logger.warn('Error parsing sections, using empty array');
    }
    
    try {
      parsedStyles = JSON.parse(template.default_styles || '{}');
    } catch (e) {
      logger.warn('Error parsing default_styles, using empty object');
    }

    res.json({
      success: true,
      message: 'Template creado exitosamente desde Google Drive',
      data: {
        ...template,
        metadata: parsedMetadata,
        sections: parsedSections,
        default_styles: parsedStyles
      }
    });
  } catch (error) {
    logger.error('Error creando template desde Google Drive:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el template desde Google Drive',
      error: error.message
    });
  }
};

module.exports = {
  getTemplates,
  getTemplateById,
  applyTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  uploadTemplateDocuments,
  processMappingDocumentPreview,
  downloadDynamicDocumentWithFields,
  processGoogleDriveDocument,
  createTemplateFromGoogleDrive,
  upload, // Export multer upload for use in routes
  uploadForProcessing // Export multer upload for processing mapping documents
};

