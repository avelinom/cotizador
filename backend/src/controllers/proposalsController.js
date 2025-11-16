const db = require('../config/database');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, WidthType } = require('docx');
const PDFDocument = require('pdfkit');

// Configure multer for text file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/proposals');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `proposal-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept Word documents (.docx, .doc)
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
    fileSize: 50 * 1024 * 1024 // 50MB max for Word documents
  }
});

/**
 * Process Word document and extract dynamic sections
 */
const processWordFile = async (filePath, selectedTemplate = null) => {
  try {
    // Extract text from Word document
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    
    // Split content into lines
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Extract dynamic sections from Word document
    // The Word document should have sections marked as dynamic
    const dynamicSections = [];
    let currentSection = null;
    let order = 1;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if this is a section title
      if (trimmedLine.match(/^\d+[\.\)]\s+[A-Z]/) || trimmedLine.match(/^[A-Z][A-Z\s]+$/)) {
        // Save previous section if exists
        if (currentSection) {
          dynamicSections.push(currentSection);
        }
        
        // Check for dynamic marker (or assume all are dynamic if no marker)
        const isDynamic = trimmedLine.includes('[DINÁMICO]') || trimmedLine.includes('[DINAMICO]') || 
                          trimmedLine.includes('(DINÁMICO)') || trimmedLine.includes('(DINAMICO)') ||
                          (!trimmedLine.includes('[ESTÁTICO]') && !trimmedLine.includes('[ESTATICO]'));
        
        if (isDynamic) {
          currentSection = {
            id: order,
            title: trimmedLine.replace(/\[.*?\]|\(.*?\)/g, '').trim(),
            order: order++,
            content: '',
            isDynamic: true,
            marginTop: 20,
            marginBottom: 20,
            marginLeft: 0,
            marginRight: 0
          };
        } else {
          currentSection = null;
        }
      } else if (currentSection && currentSection.isDynamic) {
        // Add content to current dynamic section
        currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
      }
    }
    
    // Add last section
    if (currentSection) {
      dynamicSections.push(currentSection);
    }
    
    // Use template metadata if available
    const templateMetadata = selectedTemplate && typeof selectedTemplate.metadata === 'string'
      ? JSON.parse(selectedTemplate.metadata)
      : selectedTemplate?.metadata || {
          margins: { top: 72, bottom: 72, left: 72, right: 72 },
          fontSize: 12,
          fontFamily: 'Arial',
          lineSpacing: 1.5
        };
    
    return {
      sections: dynamicSections,
      metadata: templateMetadata
    };
  } catch (error) {
    logger.error('Error processing Word file:', error);
    throw new Error('Error al procesar el archivo Word: ' + error.message);
  }
};

/**
 * Parse text lines into sections based on template structure
 */
const parseTextIntoTemplateSections = (lines, templateSections) => {
  const sections = [];
  const textContent = lines.join('\n');
  
  // Create a map of template sections by title (case-insensitive)
  const templateMap = new Map();
  templateSections.forEach((templateSection, index) => {
    const key = templateSection.title.toLowerCase().trim();
    templateMap.set(key, {
      ...templateSection,
      order: templateSection.order || index + 1
    });
  });
  
  // Try to find sections in the text by matching titles
  let currentSectionTitle = null;
  let currentSectionContent = [];
  let sectionIndex = 0;
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Check if this line matches a template section title
    let matchedTemplate = null;
    for (const [key, templateSection] of templateMap.entries()) {
      // Check if line matches template title (case-insensitive, partial match)
      if (trimmed.toLowerCase().includes(key) || key.includes(trimmed.toLowerCase())) {
        // If we have a current section, save it
        if (currentSectionTitle && currentSectionContent.length > 0) {
          const template = templateMap.get(currentSectionTitle.toLowerCase());
          sections.push({
            id: sectionIndex + 1,
            title: template ? template.title : currentSectionTitle,
            content: currentSectionContent.join('\n'),
            htmlContent: `<p>${currentSectionContent.join('\n').replace(/\n\n/g, '</p><p>')}</p>`,
            marginTop: template ? template.marginTop : 20,
            marginBottom: template ? template.marginBottom : 20,
            marginLeft: template ? template.marginLeft : 0,
            marginRight: template ? template.marginRight : 0,
            order: template ? template.order : sectionIndex + 1
          });
          sectionIndex++;
        }
        matchedTemplate = templateSection;
        currentSectionTitle = key;
        currentSectionContent = [];
        break;
      }
    }
    
    if (!matchedTemplate) {
      // This line is content, not a section title
      if (currentSectionTitle) {
        currentSectionContent.push(trimmed);
      } else {
        // No section matched yet, check if it looks like a heading
        const isHeading = trimmed.length < 100 && (
          trimmed === trimmed.toUpperCase() ||
          trimmed.match(/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+$/) ||
          trimmed.match(/^\d+\.\s+[A-Z]/)
        );
        
        if (isHeading) {
          // Try to match with template
          for (const [key, templateSection] of templateMap.entries()) {
            if (trimmed.toLowerCase().includes(key) || key.includes(trimmed.toLowerCase())) {
              currentSectionTitle = key;
              matchedTemplate = templateSection;
              break;
            }
          }
          
          if (!matchedTemplate) {
            // Use as section title anyway
            currentSectionTitle = trimmed.toLowerCase();
          }
        } else if (sections.length === 0) {
          // First content without section, create default
          const firstTemplate = templateSections[0];
          currentSectionTitle = firstTemplate ? firstTemplate.title.toLowerCase() : 'introducción';
          currentSectionContent.push(trimmed);
        }
      }
    }
  });
  
  // Add last section
  if (currentSectionTitle && currentSectionContent.length > 0) {
    const template = templateMap.get(currentSectionTitle.toLowerCase());
    sections.push({
      id: sectionIndex + 1,
      title: template ? template.title : currentSectionTitle,
      content: currentSectionContent.join('\n'),
      htmlContent: `<p>${currentSectionContent.join('\n').replace(/\n\n/g, '</p><p>')}</p>`,
      marginTop: template ? template.marginTop : 20,
      marginBottom: template ? template.marginBottom : 20,
      marginLeft: template ? template.marginLeft : 0,
      marginRight: template ? template.marginRight : 0,
      order: template ? template.order : sectionIndex + 1
    });
  }
  
  // Ensure all template sections are present (add empty ones if missing)
  templateSections.forEach((templateSection, index) => {
    const exists = sections.some(s => 
      s.title.toLowerCase() === templateSection.title.toLowerCase()
    );
    
    if (!exists) {
      sections.push({
        id: sections.length + 1,
        title: templateSection.title,
        content: templateSection.baseContent || '',
        htmlContent: `<p>${templateSection.baseContent || ''}</p>`,
        marginTop: templateSection.marginTop || 20,
        marginBottom: templateSection.marginBottom || 20,
        marginLeft: templateSection.marginLeft || 0,
        marginRight: templateSection.marginRight || 0,
        order: templateSection.order || index + 1
      });
    }
  });
  
  // Sort by order
  sections.sort((a, b) => (a.order || 999) - (b.order || 999));
  
  return sections;
};

/**
 * Fallback: Parse text into sections automatically (when no template)
 */
const parseTextIntoSections = (lines) => {
  const sections = [];
  let currentSection = null;
  let currentContent = [];
  
  lines.forEach((line) => {
    const trimmed = line.trim();
    
    // Check if it's a heading
    const isHeading = trimmed.length < 100 && (
      trimmed === trimmed.toUpperCase() ||
      trimmed.match(/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+$/) ||
      trimmed.match(/^\d+\.\s+[A-Z]/)
    );
    
    if (isHeading && currentSection) {
      // Save previous section
      sections.push({
        id: sections.length + 1,
        title: currentSection,
        content: currentContent.join('\n'),
        htmlContent: `<p>${currentContent.join('\n').replace(/\n\n/g, '</p><p>')}</p>`,
        marginTop: 20,
        marginBottom: 20,
        marginLeft: 0,
        marginRight: 0
      });
      currentSection = trimmed;
      currentContent = [];
    } else if (isHeading && !currentSection) {
      currentSection = trimmed;
    } else {
      if (currentSection) {
        currentContent.push(trimmed);
      } else {
        if (sections.length === 0) {
          sections.push({
            id: 1,
            title: 'Introducción',
            content: trimmed,
            htmlContent: `<p>${trimmed}</p>`,
            marginTop: 20,
            marginBottom: 20,
            marginLeft: 0,
            marginRight: 0
          });
        } else {
          sections[0].content += '\n\n' + trimmed;
        }
      }
    }
  });
  
  // Add last section
  if (currentSection) {
    sections.push({
      id: sections.length + 1,
      title: currentSection,
      content: currentContent.join('\n'),
      htmlContent: `<p>${currentContent.join('\n').replace(/\n\n/g, '</p><p>')}</p>`,
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 0,
      marginRight: 0
    });
  }
  
  return sections;
};

/**
 * Get all proposals for authenticated user
 */
const getProposals = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { client_name } = req.query; // Filtro opcional por nombre de cliente
    
    let query = db('proposals')
      .select('proposals.*')
      .orderBy('proposals.created_at', 'desc');
    
    // Non-admin users only see their own proposals
    if (userRole !== 'admin' && userRole !== 'manager') {
      query = query.where('proposals.user_id', userId);
    }
    
    // Filtrar por nombre de cliente si se proporciona
    if (client_name) {
      query = query.where('proposals.client_name', client_name);
    }
    
    const proposals = await query;
    
    // Parse JSON fields for each proposal
    proposals.forEach(proposal => {
      try {
        if (proposal.sections) {
          proposal.sections = typeof proposal.sections === 'string' 
            ? JSON.parse(proposal.sections) 
            : proposal.sections;
        } else {
          proposal.sections = [];
        }
        
        if (proposal.metadata) {
          proposal.metadata = typeof proposal.metadata === 'string' 
            ? JSON.parse(proposal.metadata) 
            : proposal.metadata;
        } else {
          proposal.metadata = {
            margins: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          };
        }
      } catch (parseError) {
        logger.warn(`Error parsing proposal ${proposal.id} JSON fields:`, parseError);
        if (!proposal.sections) proposal.sections = [];
        if (!proposal.metadata) {
          proposal.metadata = {
            margins: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          };
        }
      }
    });
    
    res.json({
      success: true,
      data: proposals
    });
  } catch (error) {
    logger.error('Error fetching proposals:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las propuestas',
      error: error.message
    });
  }
};

/**
 * Get a single proposal by ID
 */
const getProposalById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let query = db('proposals')
      .select('proposals.*')
      .where('proposals.id', id)
      .first();
    
    // Non-admin users can only access their own proposals
    if (userRole !== 'admin' && userRole !== 'manager') {
      query = query.where('proposals.user_id', userId);
    }
    
    const proposal = await query;
    
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Propuesta no encontrada'
      });
    }
    
    // Parse JSON fields
    try {
      if (proposal.sections) {
        proposal.sections = typeof proposal.sections === 'string' 
          ? JSON.parse(proposal.sections) 
          : proposal.sections;
      } else {
        proposal.sections = [];
      }
      
      if (proposal.metadata) {
        proposal.metadata = typeof proposal.metadata === 'string' 
          ? JSON.parse(proposal.metadata) 
          : proposal.metadata;
      } else {
        proposal.metadata = {
          margins: {
            top: 1440,
            bottom: 1440,
            left: 1440,
            right: 1440
          }
        };
      }
    } catch (parseError) {
      logger.warn('Error parsing proposal JSON fields:', parseError);
      if (!proposal.sections) proposal.sections = [];
      if (!proposal.metadata) {
        proposal.metadata = {
          margins: {
            top: 1440,
            bottom: 1440,
            left: 1440,
            right: 1440
          }
        };
      }
    }
    
    res.json({
      success: true,
      data: proposal
    });
  } catch (error) {
    logger.error('Error fetching proposal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la propuesta',
      error: error.message
    });
  }
};

/**
 * Upload and process text file, automatically applying commercial template
 */
/**
 * Load static sections from Word mapping document
 */
const loadStaticSectionsFromWord = async (mappingDocumentPath) => {
  try {
    if (!mappingDocumentPath || !fs.existsSync(mappingDocumentPath)) {
      logger.warn('Mapping document not found:', mappingDocumentPath);
      return [];
    }

    const result = await mammoth.extractRawText({ path: mappingDocumentPath });
    const text = result.value;
    const lines = text.split('\n').filter(line => line.trim());
    
    const staticSections = [];
    let currentSection = null;
    let order = 1;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if this is a section title
      if (trimmedLine.match(/^\d+[\.\)]\s+[A-Z]/) || trimmedLine.match(/^[A-Z][A-Z\s]+$/)) {
        // Save previous section if exists
        if (currentSection) {
          staticSections.push(currentSection);
        }
        
        // Check for static marker
        const isStatic = trimmedLine.includes('[ESTÁTICO]') || trimmedLine.includes('[ESTATICO]') || 
                         trimmedLine.includes('(ESTÁTICO)') || trimmedLine.includes('(ESTATICO)');
        
        if (isStatic) {
          currentSection = {
            id: order,
            title: trimmedLine.replace(/\[.*?\]|\(.*?\)/g, '').trim(),
            order: order++,
            content: '',
            isStatic: true,
            marginTop: 20,
            marginBottom: 20,
            marginLeft: 0,
            marginRight: 0
          };
        } else {
          // Dynamic section, skip for now
          currentSection = null;
        }
      } else if (currentSection && currentSection.isStatic) {
        // Add content to current static section
        currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
      }
    }
    
    // Add last section
    if (currentSection) {
      staticSections.push(currentSection);
    }
    
    return staticSections;
  } catch (error) {
    logger.error('Error loading static sections from Word:', error);
    return [];
  }
};

const uploadProposal = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }
    
    const { title, description, proposalType, proposalId, completeProposal } = req.body;
    const userId = req.user.id;
    
    // If completing an in-progress proposal
    if (completeProposal === 'true' && proposalId) {
      const proposal = await db('proposals').where('id', proposalId).first();
      
      if (!proposal) {
        return res.status(404).json({
          success: false,
          message: 'Propuesta no encontrada'
        });
      }
      
      if (proposal.status !== 'in_progress') {
        return res.status(400).json({
          success: false,
          message: 'Esta propuesta no está en progreso'
        });
      }
      
      // Process the uploaded Word file
      const dynamicSections = await processWordFile(req.file.path, null);
      
      // Ensure metadata exists with default margins
      let proposalMetadata = {};
      try {
        if (proposal.metadata) {
          proposalMetadata = typeof proposal.metadata === 'string' 
            ? JSON.parse(proposal.metadata) 
            : proposal.metadata;
        }
      } catch (parseError) {
        logger.warn('Error parsing proposal metadata:', parseError);
      }
      
      if (!proposalMetadata.margins) {
        proposalMetadata.margins = {
          top: 1440,
          bottom: 1440,
          left: 1440,
          right: 1440
        };
      }
      
      // Update proposal with completed document
      const [updatedProposal] = await db('proposals')
        .where('id', proposalId)
        .update({
          file_path: req.file.path,
          original_filename: req.file.originalname,
          sections: JSON.stringify(dynamicSections),
          metadata: JSON.stringify(proposalMetadata),
          status: 'completed',
          completed_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');
      
      // Parse JSON fields
      if (typeof updatedProposal.sections === 'string') {
        updatedProposal.sections = JSON.parse(updatedProposal.sections);
      }
      if (typeof updatedProposal.metadata === 'string') {
        updatedProposal.metadata = JSON.parse(updatedProposal.metadata);
      }
      
      // Calculate time elapsed
      const timeElapsed = updatedProposal.started_at && updatedProposal.completed_at
        ? Math.round((new Date(updatedProposal.completed_at).getTime() - new Date(updatedProposal.started_at).getTime()) / 1000 / 60)
        : null;
      
      logger.info(`Proposal ${proposalId} completed by user ${userId}. Time elapsed: ${timeElapsed} minutes`);
      
      return res.json({
        success: true,
        message: `Propuesta completada exitosamente. Tiempo transcurrido: ${timeElapsed} minutos`,
        data: updatedProposal,
        timeElapsed: timeElapsed
      });
    }
    
    // New proposal creation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'El título es requerido'
      });
    }
    
    // Get template by proposal type or default template
    let selectedTemplate = null;
    try {
      if (proposalType) {
        // Try to find template by proposal type
        const templatesByType = await db('templates')
          .where('proposal_type', proposalType)
          .orderBy('created_at', 'desc')
          .limit(1);
        
        if (templatesByType.length > 0) {
          selectedTemplate = templatesByType[0];
          logger.info(`Using template for proposal type "${proposalType}": ${selectedTemplate.name}`);
        }
      }
      
      // Fallback to default template if no template found by type
      if (!selectedTemplate) {
        const templates = await db('templates')
          .where('is_default', true)
          .orderBy('created_at', 'desc')
          .limit(1);
        
        if (templates.length > 0) {
          selectedTemplate = templates[0];
          logger.info(`Using default template: ${selectedTemplate.name}`);
        } else {
          logger.warn('No template found, processing text without template structure');
        }
      }
      
      // Parse JSON fields
      if (selectedTemplate) {
        if (typeof selectedTemplate.sections === 'string') {
          selectedTemplate.sections = JSON.parse(selectedTemplate.sections);
        }
        if (typeof selectedTemplate.metadata === 'string') {
          selectedTemplate.metadata = JSON.parse(selectedTemplate.metadata);
        }
      }
    } catch (templateError) {
      logger.error('Error fetching template:', templateError);
      // Continue without template
    }
    
    // Process the Word file with template
    let processed = await processWordFile(req.file.path, selectedTemplate);
    
    // If template has Word documents, merge static sections from mapping document with dynamic sections from uploaded Word
    if (selectedTemplate && selectedTemplate.mapping_document_path) {
      try {
        const staticSections = await loadStaticSectionsFromWord(selectedTemplate.mapping_document_path);
        
        // Merge static sections with dynamic sections from text
        const mergedSections = [];
        const dynamicSectionsMap = new Map();
        
        // Create map of dynamic sections by title
        processed.sections.forEach(section => {
          const key = section.title.toLowerCase().trim();
          dynamicSectionsMap.set(key, section);
        });
        
        // Add static sections first
        staticSections.forEach(staticSection => {
          mergedSections.push({
            ...staticSection,
            htmlContent: `<p>${staticSection.content.replace(/\n\n/g, '</p><p>')}</p>`,
            order: staticSection.order
          });
        });
        
        // Add dynamic sections (avoid duplicates with static sections)
        processed.sections.forEach(dynamicSection => {
          const key = dynamicSection.title.toLowerCase().trim();
          const hasStatic = staticSections.some(s => 
            s.title.toLowerCase().trim() === key
          );
          
          if (!hasStatic) {
            mergedSections.push({
              ...dynamicSection,
              order: dynamicSection.order || mergedSections.length + 1
            });
          }
        });
        
        // Sort by order
        mergedSections.sort((a, b) => (a.order || 999) - (b.order || 999));
        
        processed.sections = mergedSections;
        logger.info(`Merged ${staticSections.length} static sections with ${processed.sections.length - staticSections.length} dynamic sections`);
      } catch (mergeError) {
        logger.error('Error merging Word document sections:', mergeError);
        // Continue with text-only sections if merge fails
      }
    }
    
    // Save proposal to database
    const [proposal] = await db('proposals').insert({
      title: title || req.file.originalname.replace(/\.(docx|doc)$/i, ''),
      description: description || null,
      original_filename: req.file.originalname,
      file_path: `/uploads/proposals/${req.file.filename}`,
      user_id: userId,
      template_id: selectedTemplate ? selectedTemplate.id : null,
      sections: JSON.stringify(processed.sections),
      metadata: JSON.stringify(processed.metadata),
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    
    // Parse JSON fields for response (PostgreSQL JSONB already returns objects)
    if (typeof proposal.sections === 'string') {
      proposal.sections = JSON.parse(proposal.sections);
    }
    if (typeof proposal.metadata === 'string') {
      proposal.metadata = JSON.parse(proposal.metadata);
    }
    
    res.status(201).json({
      success: true,
      message: selectedTemplate 
        ? `Propuesta creada exitosamente con template "${selectedTemplate.name}" aplicado automáticamente`
        : 'Propuesta creada exitosamente',
      data: proposal
    });
  } catch (error) {
    logger.error('Error uploading proposal:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al procesar la propuesta',
      error: error.message
    });
  }
};

/**
 * Update proposal sections
 */
const updateProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, sections, metadata } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check if proposal exists and user has permission
    let query = db('proposals').where('id', id);
    if (userRole !== 'admin' && userRole !== 'manager') {
      query = query.where('user_id', userId);
    }
    
    const existingProposal = await query.first();
    
    if (!existingProposal) {
      return res.status(404).json({
        success: false,
        message: 'Propuesta no encontrada o sin permisos'
      });
    }
    
    // Prepare update data
    const updateData = {
      updated_at: new Date()
    };
    
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (sections) updateData.sections = JSON.stringify(sections);
    if (metadata) updateData.metadata = JSON.stringify(metadata);
    
    // Update proposal
    const [updatedProposal] = await db('proposals')
      .where('id', id)
      .update(updateData)
      .returning('*');
    
    // Parse JSON fields for response (PostgreSQL JSONB already returns objects)
    if (typeof updatedProposal.sections === 'string') {
      updatedProposal.sections = JSON.parse(updatedProposal.sections);
    }
    if (typeof updatedProposal.metadata === 'string') {
      updatedProposal.metadata = JSON.parse(updatedProposal.metadata);
    }
    
    res.json({
      success: true,
      message: 'Propuesta actualizada exitosamente',
      data: updatedProposal
    });
  } catch (error) {
    logger.error('Error updating proposal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la propuesta',
      error: error.message
    });
  }
};

/**
 * Update a specific section
 */
const updateSection = async (req, res) => {
  try {
    const { id, sectionId } = req.params;
    const { title, content, htmlContent, marginTop, marginBottom, marginLeft, marginRight } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get proposal
    let query = db('proposals').where('id', id);
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
    
    // Parse sections (PostgreSQL JSONB already returns objects)
    const sections = typeof proposal.sections === 'string' 
      ? JSON.parse(proposal.sections) 
      : proposal.sections;
    
    // Find and update section
    const sectionIndex = sections.findIndex(s => s.id === parseInt(sectionId));
    if (sectionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Sección no encontrada'
      });
    }
    
    // Update section
    if (title !== undefined) sections[sectionIndex].title = title;
    if (content !== undefined) sections[sectionIndex].content = content;
    if (htmlContent !== undefined) sections[sectionIndex].htmlContent = htmlContent;
    if (marginTop !== undefined) sections[sectionIndex].marginTop = marginTop;
    if (marginBottom !== undefined) sections[sectionIndex].marginBottom = marginBottom;
    if (marginLeft !== undefined) sections[sectionIndex].marginLeft = marginLeft;
    if (marginRight !== undefined) sections[sectionIndex].marginRight = marginRight;
    
    // Save updated sections
    await db('proposals')
      .where('id', id)
      .update({
        sections: JSON.stringify(sections),
        updated_at: new Date()
      });
    
    res.json({
      success: true,
      message: 'Sección actualizada exitosamente',
      data: sections[sectionIndex]
    });
  } catch (error) {
    logger.error('Error updating section:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la sección',
      error: error.message
    });
  }
};

/**
 * Delete proposal
 */
const deleteProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get proposal to check permissions and file path
    let query = db('proposals').where('id', id);
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
    
    // Delete file if it exists
    if (proposal.file_path) {
      const filePath = path.join(__dirname, '../../uploads', proposal.file_path.replace('/uploads/', ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Delete from database
    await db('proposals').where('id', id).delete();
    
    res.json({
      success: true,
      message: 'Propuesta eliminada exitosamente'
    });
  } catch (error) {
    logger.error('Error deleting proposal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la propuesta',
      error: error.message
    });
  }
};

/**
 * Export proposal to Word
 * If final_document_path exists, serves that file directly.
 * Otherwise, generates a basic Word document from sections.
 */
const exportToWord = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get proposal
    let query = db('proposals').where('id', id);
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

    // Check if final document exists and serve it directly
    if (proposal.final_document_path) {
      const resolvePath = (filePath) => {
        if (!filePath) return null;
        return path.isAbsolute(filePath) 
          ? filePath 
          : path.resolve(__dirname, '../../', filePath);
      };

      const finalDocPath = resolvePath(proposal.final_document_path);
      
      logger.info(`🔍 Verificando documento final:`);
      logger.info(`   - Ruta en BD: ${proposal.final_document_path}`);
      logger.info(`   - Ruta resuelta: ${finalDocPath}`);
      logger.info(`   - Existe: ${fs.existsSync(finalDocPath)}`);
      
      if (fs.existsSync(finalDocPath)) {
        try {
          logger.info(`📄 Sirviendo documento final desde: ${finalDocPath}`);
          
          // Generate filename with proposal type, client, and date
          const sanitizeFilename = (str) => {
            return str ? str.replace(/[^a-z0-9]/gi, '_').toLowerCase() : '';
          };
          
          let filename = 'propuesta.docx';
          if (proposal.proposal_type && proposal.client_name) {
            const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
            filename = `${sanitizeFilename(proposal.proposal_type)}_${sanitizeFilename(proposal.client_name)}_${date}.docx`;
          } else if (proposal.title) {
            filename = `${sanitizeFilename(proposal.title)}.docx`;
          }
          
          logger.info(`📝 Nombre de archivo generado: ${filename}`);
          
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          
          // Use absolute path for sendFile
          return res.sendFile(path.resolve(finalDocPath), (err) => {
            if (err) {
              logger.error(`❌ Error al enviar archivo: ${err.message}`);
              logger.error(`   Stack: ${err.stack}`);
              if (!res.headersSent) {
                return res.status(500).json({
                  success: false,
                  message: 'Error al exportar a Word',
                  error: err.message
                });
              }
            } else {
              logger.info(`✅ Archivo enviado exitosamente`);
            }
          });
        } catch (sendError) {
          logger.error(`❌ Error al preparar envío de archivo: ${sendError.message}`);
          logger.error(`   Stack: ${sendError.stack}`);
          // Continue to fallback
        }
      } else {
        logger.warn(`⚠️ Documento final no encontrado en: ${finalDocPath}, generando documento básico...`);
      }
    }
    
    // Fallback: Generate basic Word document from sections
    logger.info('📝 Generando documento Word básico desde secciones...');
    
    // PostgreSQL JSONB already returns objects
    let sections = [];
    try {
      if (proposal.sections) {
        sections = typeof proposal.sections === 'string' 
          ? JSON.parse(proposal.sections) 
          : proposal.sections;
      }
      if (!Array.isArray(sections)) {
        sections = [];
      }
    } catch (parseError) {
      logger.warn('Error parsing sections:', parseError);
      sections = [];
    }
    
    let metadata = {};
    try {
      if (proposal.metadata) {
        metadata = typeof proposal.metadata === 'string' 
          ? JSON.parse(proposal.metadata) 
          : proposal.metadata;
      }
      if (!metadata || typeof metadata !== 'object') {
        metadata = {};
      }
    } catch (parseError) {
      logger.warn('Error parsing metadata:', parseError);
      metadata = {};
    }
    
    // Default margins if not present
    const margins = metadata.margins || {
      top: 1440,    // 1 inch in twips (20 * 72)
      bottom: 1440,
      left: 1440,
      right: 1440
    };
    
    if (!sections || sections.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La propuesta no tiene secciones disponibles para exportar'
      });
    }
    
    // Create Word document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: margins.top || 1440,
                bottom: margins.bottom || 1440,
                left: margins.left || 1440,
                right: margins.right || 1440
              }
            }
          },
          children: [
            // Title
            new Paragraph({
              text: proposal.title,
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            
            // Sections
            ...sections.filter(section => section && section.title).flatMap(section => [
              new Paragraph({
                text: section.title || 'Sin título',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: (section.marginTop || 20) * 20, after: 200 }
              }),
              new Paragraph({
                text: section.content || '',
                spacing: { after: (section.marginBottom || 20) * 20 }
              })
            ])
          ]
        }
      ]
    });
    
    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    
    // Generate filename
    const sanitizeFilename = (str) => {
      return str ? str.replace(/[^a-z0-9]/gi, '_').toLowerCase() : '';
    };
    
    let filename = 'propuesta.docx';
    if (proposal.proposal_type && proposal.client_name) {
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      filename = `${sanitizeFilename(proposal.proposal_type)}_${sanitizeFilename(proposal.client_name)}_${date}.docx`;
    } else if (proposal.title) {
      filename = `${sanitizeFilename(proposal.title)}.docx`;
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    logger.info(`✅ Documento Word básico generado exitosamente: ${filename}`);
    res.send(buffer);
  } catch (error) {
    logger.error('❌ Error al exportar a Word:', error);
    logger.error(`   Mensaje: ${error.message}`);
    logger.error(`   Stack: ${error.stack}`);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error al exportar a Word',
        error: error.message
      });
    }
  }
};

/**
 * Export proposal to PDF
 * If final_document_path exists, extracts content from it and generates PDF.
 * Otherwise, generates PDF from sections.
 */
const exportToPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get proposal
    let query = db('proposals').where('id', id);
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

    // Check if final document exists and extract content from it
    let sections = [];
    let metadata = {};
    
    if (proposal.final_document_path) {
      const resolvePath = (filePath) => {
        if (!filePath) return null;
        return path.isAbsolute(filePath) 
          ? filePath 
          : path.resolve(__dirname, '../../', filePath);
      };

      const finalDocPath = resolvePath(proposal.final_document_path);
      
      if (fs.existsSync(finalDocPath)) {
        logger.info(`📄 Extrayendo contenido del documento final para PDF: ${finalDocPath}`);
        
        try {
          // Extract content from final Word document
          const result = await mammoth.extractRawText({ path: finalDocPath });
          const text = result.value;
          const lines = text.split('\n').filter(line => line.trim());
          
          // Parse sections from the final document
          sections = [];
          let currentSection = null;
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Check if this is a section title (numbered or all caps)
            if (trimmedLine.match(/^\d+[\.\)]\s+[A-Z]/) || 
                (trimmedLine.match(/^[A-Z][A-Z\s]+$/) && trimmedLine.length > 3)) {
              if (currentSection) {
                sections.push(currentSection);
              }
              currentSection = {
                title: trimmedLine,
                content: '',
                marginTop: 20,
                marginBottom: 20
              };
            } else if (currentSection) {
              currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
            } else if (sections.length === 0 && trimmedLine.length > 0) {
              // First line might be the title
              if (!proposal.title || proposal.title === trimmedLine) {
                // Skip, it's the title
              } else {
                currentSection = {
                  title: trimmedLine,
                  content: '',
                  marginTop: 20,
                  marginBottom: 20
                };
              }
            }
          }
          
          if (currentSection) {
            sections.push(currentSection);
          }
          
          logger.info(`✅ Extraídas ${sections.length} secciones del documento final`);
        } catch (extractError) {
          logger.warn('⚠️ Error extrayendo contenido del documento final, usando secciones de BD:', extractError);
          // Fall through to use sections from database
        }
      }
    }
    
    // If no sections extracted from final document, use database sections
    if (!sections || sections.length === 0) {
      logger.info('📝 Usando secciones de la base de datos...');
      try {
        if (proposal.sections) {
          sections = typeof proposal.sections === 'string' 
            ? JSON.parse(proposal.sections) 
            : proposal.sections;
        }
        if (!Array.isArray(sections)) {
          sections = [];
        }
      } catch (parseError) {
        logger.warn('Error parsing sections:', parseError);
        sections = [];
      }
      
      try {
        if (proposal.metadata) {
          metadata = typeof proposal.metadata === 'string' 
            ? JSON.parse(proposal.metadata) 
            : proposal.metadata;
        }
        if (!metadata || typeof metadata !== 'object') {
          metadata = {};
        }
      } catch (parseError) {
        logger.warn('Error parsing metadata:', parseError);
        metadata = {};
      }
    } else {
      // Use metadata from proposal for margins
      try {
        if (proposal.metadata) {
          metadata = typeof proposal.metadata === 'string' 
            ? JSON.parse(proposal.metadata) 
            : proposal.metadata;
        }
        if (!metadata || typeof metadata !== 'object') {
          metadata = {};
        }
      } catch (parseError) {
        metadata = {};
      }
    }
    
    // Default margins if not present (in points, 72 points = 1 inch)
    const margins = metadata.margins || {
      top: 72,
      bottom: 72,
      left: 72,
      right: 72
    };
    
    if (!sections || sections.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La propuesta no tiene secciones disponibles para exportar'
      });
    }
    
    // Create PDF
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: {
        top: margins.top || 72,
        bottom: margins.bottom || 72,
        left: margins.left || 72,
        right: margins.right || 72
      }
    });
    
    // Generate filename
    const sanitizeFilename = (str) => {
      return str ? str.replace(/[^a-z0-9]/gi, '_').toLowerCase() : '';
    };
    
    let filename = 'propuesta.pdf';
    if (proposal.proposal_type && proposal.client_name) {
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      filename = `${sanitizeFilename(proposal.proposal_type)}_${sanitizeFilename(proposal.client_name)}_${date}.pdf`;
    } else if (proposal.title) {
      filename = `${sanitizeFilename(proposal.title)}.pdf`;
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Title
    doc.fontSize(20).font('Helvetica-Bold').text(proposal.title, { align: 'center' });
    doc.moveDown(2);
    
    // Sections
    sections.filter(section => section && section.title).forEach((section, index) => {
      if (index > 0) {
        doc.moveDown((section.marginTop || 20) / 20);
      }
      
      // Section title
      doc.fontSize(16).font('Helvetica-Bold').text(section.title || 'Sin título');
      doc.moveDown(0.5);
      
      // Section content
      doc.fontSize(12).font('Helvetica').text(section.content || '', {
        align: 'left',
        indent: section.marginLeft || 0
      });
      
      doc.moveDown((section.marginBottom || 20) / 20);
    });
    
    doc.end();
  } catch (error) {
    logger.error('Error exporting to PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar a PDF',
      error: error.message
    });
  }
};

/**
 * Download dynamic document template
 * Returns the dynamic document Word file associated with the template
 */
const downloadTemplate = async (req, res) => {
  try {
    let selectedTemplate = null;
    const templateId = req.params.id; // This is actually template ID when called from proposals page
    
    // If templateId is provided, get template directly
    if (templateId) {
      selectedTemplate = await db('templates').where('id', templateId).first();
    }
    
    // Fallback to default template if no template found
    if (!selectedTemplate) {
      const templates = await db('templates')
        .where('is_default', true)
        .orderBy('created_at', 'desc')
        .limit(1);
      
      if (templates.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró un template. Por favor crea un template y márcalo como predeterminado.'
        });
      }
      
      selectedTemplate = templates[0];
    }
    
    // Check if dynamic document exists
    if (!selectedTemplate.dynamic_document_path || !fs.existsSync(selectedTemplate.dynamic_document_path)) {
      return res.status(404).json({
        success: false,
        message: 'El documento dinámico no está disponible para este template.'
      });
    }
    
    // Read and send the dynamic document file
    const dynamicDocPath = selectedTemplate.dynamic_document_path;
    const filename = path.basename(dynamicDocPath) || `documento-dinamico-${selectedTemplate.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.docx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send the file
    res.sendFile(path.resolve(dynamicDocPath));
  } catch (error) {
    logger.error('Error generating template file:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el template',
      error: error.message
    });
  }
};

/**
 * Get proposal preview (HTML from final document)
 */
const getProposalPreview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get proposal
    let query = db('proposals').where('id', id);
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

    // Check if final document exists
    if (!proposal.final_document_path) {
      return res.status(400).json({
        success: false,
        message: 'La propuesta no tiene documento final. Por favor aplica un template primero.'
      });
    }

    const resolvePath = (filePath) => {
      if (!filePath) return null;
      return path.isAbsolute(filePath) 
        ? filePath 
        : path.resolve(__dirname, '../../', filePath);
    };

    const finalDocPath = resolvePath(proposal.final_document_path);
    
    if (!fs.existsSync(finalDocPath)) {
      return res.status(404).json({
        success: false,
        message: 'El documento final no se encuentra en el servidor'
      });
    }

    logger.info(`📄 Generando preview HTML desde: ${finalDocPath}`);
    
    // Convert Word document to HTML using mammoth
    const result = await mammoth.convertToHtml({ path: finalDocPath });
    const html = result.value;
    const messages = result.messages;

    // Log any conversion warnings
    if (messages && messages.length > 0) {
      logger.warn('⚠️ Advertencias al convertir Word a HTML:', messages);
    }

    // Return HTML with basic styling
    const styledHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Preview - ${proposal.title || 'Propuesta'}</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              max-width: 8.5in;
              margin: 0 auto;
              padding: 1in;
              line-height: 1.6;
              color: #333;
            }
            h1, h2, h3, h4, h5, h6 {
              margin-top: 1em;
              margin-bottom: 0.5em;
              color: #2c3e50;
            }
            p {
              margin-bottom: 1em;
              text-align: justify;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
            }
            table td, table th {
              border: 1px solid #ddd;
              padding: 8px;
            }
            table th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(styledHtml);
  } catch (error) {
    logger.error('Error generating proposal preview:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el preview',
      error: error.message
    });
  }
};

/**
 * Cancel a proposal
 */
const cancelProposal = async (req, res) => {
  try {
    const proposalId = req.params.id;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'La justificación de cancelación es requerida'
      });
    }

    const proposal = await db('proposals').where('id', proposalId).first();

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Propuesta no encontrada'
      });
    }

    if (proposal.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Esta propuesta ya está cancelada'
      });
    }

    if (proposal.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar una propuesta completada'
      });
    }

    // Update proposal status to cancelled
    const [updatedProposal] = await db('proposals')
      .where('id', proposalId)
      .update({
        status: 'cancelled',
        cancellation_reason: reason.trim(),
        cancelled_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    logger.info(`Proposal ${proposalId} cancelled by user ${userId}. Reason: ${reason.substring(0, 50)}...`);

    res.json({
      success: true,
      message: 'Propuesta cancelada exitosamente',
      data: updatedProposal
    });
  } catch (error) {
    logger.error('Error cancelling proposal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar la propuesta',
      error: error.message
    });
  }
};

// Import Google Drive controllers
const {
  createProposalFromGoogleDrive,
  exportProposalToPDF,
  sendProposalEmail
} = require('./proposalsGoogleDriveController');

module.exports = {
  getProposals,
  getProposalById,
  uploadProposal,
  updateProposal,
  updateSection,
  deleteProposal,
  exportToWord,
  exportToPDF,
  getProposalPreview,
  downloadTemplate,
  cancelProposal,
  createProposalFromGoogleDrive,
  exportProposalToPDF,
  sendProposalEmail,
  upload: upload.single('file')
};

