const db = require('../config/database');
const logger = require('../utils/logger');
const googleDriveService = require('../services/googleDriveService');
const googleDocsService = require('../services/googleDocsService');
const nodemailer = require('nodemailer');

/**
 * Create proposal from template (new wizard flow)
 * POST /api/proposals/create-from-template
 * 
 * Creates a merged document with static sections complete and dynamic sections empty
 * Saves it in "Propuestas no terminadas" folder
 */
const createProposalFromTemplate = async (req, res) => {
  try {
    const {
      templateId,
      clientId,
      clientName
    } = req.body;

    // Get user ID from authentication middleware
    const userId = req.user?.id || req.user?.user_id;
    
    if (!userId) {
      logger.error('❌ No se encontró user_id en req.user');
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!templateId || !clientName) {
      return res.status(400).json({
        success: false,
        message: 'templateId y clientName son requeridos'
      });
    }

    logger.info('📝 Creando propuesta desde template...');
    logger.info(`   Template ID (raw): ${templateId} (type: ${typeof templateId})`);
    logger.info(`   Cliente: ${clientName}`);
    logger.info(`   Request body completo:`, JSON.stringify(req.body, null, 2));
    logger.info(`   Request body keys:`, Object.keys(req.body));
    logger.info(`   Request body values:`, Object.values(req.body));

    // CRITICAL: Validate templateId is not a UUID (Google Doc ID)
    if (typeof templateId === 'string' && templateId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      logger.error(`❌ templateId parece ser un UUID de Google Doc, no un template ID: ${templateId}`);
      logger.error(`   Esto sugiere que se está enviando un ID de Google Doc en lugar del ID numérico del template.`);
      logger.error(`   Verifica que el frontend esté enviando template.id (número) y no template.mapping_document_path o template.dynamic_document_path (UUIDs).`);
      return res.status(400).json({
        success: false,
        message: `templateId inválido: parece ser un UUID de Google Doc (${templateId}). Se espera un número entero. Verifica que estés enviando el ID numérico del template, no un ID de Google Doc.`
      });
    }

    // Convert templateId to integer if it's a string
    let templateIdInt;
    if (typeof templateId === 'string') {
      // Check if it's a numeric string
      if (/^\d+$/.test(templateId)) {
        templateIdInt = parseInt(templateId, 10);
      } else {
        logger.error(`❌ templateId es un string no numérico: ${templateId}`);
        return res.status(400).json({
          success: false,
          message: `templateId inválido: ${templateId} (string no numérico)`
        });
      }
    } else if (typeof templateId === 'number') {
      templateIdInt = templateId;
    } else {
      logger.error(`❌ templateId tiene un tipo inválido: ${typeof templateId}, valor: ${templateId}`);
      return res.status(400).json({
        success: false,
        message: `templateId inválido: tipo ${typeof templateId}, valor ${templateId}`
      });
    }
    
    if (isNaN(templateIdInt) || !Number.isInteger(templateIdInt)) {
      logger.error(`❌ templateId no se puede convertir a número entero: ${templateId} -> ${templateIdInt}`);
      return res.status(400).json({
        success: false,
        message: `templateId inválido: ${templateId} (no se puede convertir a número entero)`
      });
    }

    logger.info(`   Template ID (parsed): ${templateIdInt} (type: ${typeof templateIdInt})`);

    // Get template from database
    logger.info(`🔍 Buscando template con ID: ${templateIdInt} (type: ${typeof templateIdInt})`);
    const template = await db('templates').where('id', templateIdInt).first();
    
    if (!template) {
      logger.error(`❌ Template no encontrado con ID: ${templateIdInt}`);
      return res.status(404).json({
        success: false,
        message: 'Template no encontrado'
      });
    }
    
    // CRITICAL: Validate template.id is a number, not a UUID
    logger.info(`📋 Template encontrado:`);
    logger.info(`   Template ID: ${template.id} (type: ${typeof template.id})`);
    logger.info(`   Template name: ${template.name}`);
    logger.info(`   Template mapping_document_path: ${template.mapping_document_path}`);
    logger.info(`   Template dynamic_document_path: ${template.dynamic_document_path}`);
    
    if (typeof template.id !== 'number') {
      logger.error(`❌ Template.id no es un número! Valor: ${template.id}, tipo: ${typeof template.id}`);
      return res.status(500).json({
        success: false,
        message: `Error interno: Template.id no es un número (${template.id})`
      });
    }
    
    // Additional check: ensure template.id is not a UUID string
    if (typeof template.id === 'string' && template.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      logger.error(`❌ Template.id es un UUID! Valor: ${template.id}`);
      return res.status(500).json({
        success: false,
        message: `Error interno: Template.id es un UUID (${template.id}), se espera un número`
      });
    }

    // Parse template metadata to get document IDs
    let metadata;
    try {
      metadata = typeof template.metadata === 'string' 
        ? JSON.parse(template.metadata) 
        : template.metadata || {};
    } catch (e) {
      logger.error('Error parseando metadata del template:', e);
      metadata = {};
    }

    const staticDocumentId = template.mapping_document_path || metadata.staticDocumentId;
    const dynamicDocumentId = template.dynamic_document_path || metadata.dynamicDocumentId;

    if (!staticDocumentId || !dynamicDocumentId) {
      return res.status(400).json({
        success: false,
        message: 'El template no tiene documentos estático y dinámico configurados'
      });
    }

    // Initialize Google Drive service
    await googleDriveService.initialize();

    if (!googleDriveService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Drive Service no está disponible. Verifica la autenticación OAuth.'
      });
    }

    // Get or create "Propuestas no terminadas" folder
    const inProgressFolder = await googleDriveService.getOrCreateInProgressFolder();

    // Generate document name
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const documentName = `${template.proposal_type || 'Propuesta'}_${clientName}_${timestamp}`;

    // Get template sections to identify which are dynamic
    let templateSections = [];
    try {
      if (template.sections) {
        templateSections = typeof template.sections === 'string' 
          ? JSON.parse(template.sections) 
          : template.sections;
      }
    } catch (e) {
      logger.error('Error parsing template sections:', e);
    }

    // Merge sections (static complete, dynamic empty)
    logger.info('🔄 Fusionando secciones (dinámicas vacías)...');
    logger.info(`   Template tiene ${templateSections.length} secciones definidas`);
    const mergedDoc = await googleDriveService.mergeSectionsWithEmptyDynamic(
      staticDocumentId,
      dynamicDocumentId,
      documentName,
      inProgressFolder.id,
      templateSections // Pass template sections to correctly identify dynamic sections
    );

    // Create proposal record in database with "in_progress" status
    logger.info('💾 Insertando propuesta en base de datos...');
    logger.info(`   Template ID (verificado): ${templateIdInt} (type: ${typeof templateIdInt})`);
    logger.info(`   Template ID de la BD: ${template.id} (type: ${typeof template.id})`);
    logger.info(`   Google Doc ID: ${mergedDoc.documentId}`);
    
    // Ensure template_id is an integer - use template.id from database (most reliable)
    const finalTemplateId = template.id;
    
    // Validate clientId - if it's a UUID (string with dashes), set to null
    // The proposals table expects client_id to be an integer, not a UUID
    let validClientId = null;
    if (clientId) {
      // Check if clientId is a valid integer
      const clientIdInt = parseInt(clientId, 10);
      if (!isNaN(clientIdInt) && clientIdInt.toString() === clientId.toString()) {
        validClientId = clientIdInt;
      } else {
        // It's a UUID or non-numeric string, so we'll use null and rely on client_name
        logger.info(`⚠️ clientId es un UUID o string no numérico (${clientId}), usando null y client_name: ${clientName}`);
      }
    }
    
    logger.info(`🔢 Validando finalTemplateId antes de insertar:`);
    logger.info(`   finalTemplateId: ${finalTemplateId} (type: ${typeof finalTemplateId})`);
    logger.info(`   isNaN: ${isNaN(finalTemplateId)}`);
    logger.info(`   Number.isInteger: ${Number.isInteger(finalTemplateId)}`);
    
    // CRITICAL: Final validation before database insert
    if (typeof finalTemplateId !== 'number') {
      logger.error(`❌ finalTemplateId no es un número! Valor: ${finalTemplateId}, tipo: ${typeof finalTemplateId}`);
      return res.status(500).json({
        success: false,
        message: `Error interno: template_id no es un número (${finalTemplateId}, tipo: ${typeof finalTemplateId})`
      });
    }
    
    if (isNaN(finalTemplateId) || !Number.isInteger(finalTemplateId)) {
      logger.error(`❌ finalTemplateId no es un número entero válido! Valor: ${finalTemplateId}`);
      return res.status(500).json({
        success: false,
        message: `Error interno: template_id no es un número entero válido (${finalTemplateId})`
      });
    }
    
    // Additional UUID check
    if (String(finalTemplateId).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      logger.error(`❌ finalTemplateId parece ser un UUID! Valor: ${finalTemplateId}`);
      return res.status(500).json({
        success: false,
        message: `Error interno: template_id parece ser un UUID (${finalTemplateId})`
      });
    }
    
    logger.info(`✅ finalTemplateId validado correctamente: ${finalTemplateId} (número entero)`);
    
    // Build insert object with explicit type checking
    const insertData = {
      title: documentName,
      description: `Propuesta en progreso para ${clientName}`,
      original_filename: `${documentName}.docx`, // Required field
      user_id: userId, // Required field - from authentication middleware
      client_id: validClientId, // null if UUID, integer if valid
      client_name: clientName,
      proposal_type: template.proposal_type || null,
      template_id: finalTemplateId, // Already validated as integer
      status: 'in_progress',
      started_at: new Date(),
      google_doc_id: mergedDoc.documentId,
      google_doc_url: mergedDoc.webViewLink,
      final_document_path: mergedDoc.documentId, // Store Google Doc ID
      metadata: JSON.stringify({
        cefiroClientId: clientId // Store the UUID here for reference
      }),
    };
    
    // Final validation of insertData.template_id before insert
    logger.info(`🔍 Validación final del objeto de inserción:`);
    logger.info(`   insertData.template_id: ${insertData.template_id} (type: ${typeof insertData.template_id})`);
    logger.info(`   insertData completo:`, JSON.stringify(insertData, null, 2));
    
    if (typeof insertData.template_id !== 'number' || isNaN(insertData.template_id) || !Number.isInteger(insertData.template_id)) {
      logger.error(`❌ insertData.template_id inválido antes de insertar: ${insertData.template_id} (type: ${typeof insertData.template_id})`);
      return res.status(500).json({
        success: false,
        message: `Error interno: template_id inválido en objeto de inserción (${insertData.template_id})`
      });
    }
    
    // Add remaining fields
    insertData.metadata = JSON.stringify({
      staticDocumentId,
      dynamicDocumentId,
      inProgressFolderId: inProgressFolder.id,
      createdFrom: 'template_wizard',
      templateId: templateIdInt // Use validated integer, not original templateId
    });
    insertData.sections = JSON.stringify(mergedDoc.sections || []); // Store sections info
    insertData.created_at = new Date();
    insertData.updated_at = new Date();
    
    logger.info(`📝 Insertando propuesta con template_id: ${insertData.template_id} (type: ${typeof insertData.template_id})`);
    
    const [proposal] = await db('proposals').insert(insertData).returning('*');

    logger.info(`✅ Propuesta creada con ID: ${proposal.id}`);

    res.json({
      success: true,
      message: 'Propuesta creada exitosamente',
      data: {
        proposal: {
          ...proposal,
          sections: typeof proposal.sections === 'string' 
            ? JSON.parse(proposal.sections) 
            : proposal.sections,
          metadata: typeof proposal.metadata === 'string' 
            ? JSON.parse(proposal.metadata) 
            : proposal.metadata
        },
        googleDoc: {
          id: mergedDoc.documentId,
          url: mergedDoc.webViewLink,
          name: mergedDoc.name
        }
      }
    });
  } catch (error) {
    logger.error('❌ Error creando propuesta desde template:', error);
    res.status(500).json({
      success: false,
      message: `Error al crear propuesta: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * Create proposal directly from Google Drive documents (without template)
 * POST /api/proposals/create-from-documents
 * 
 * Creates a merged document with static sections complete and dynamic sections empty
 * Saves it in "Propuestas no terminadas" folder
 */
const createProposalFromDocuments = async (req, res) => {
  try {
    const {
      staticDocumentId,
      dynamicDocumentId,
      proposalType,
      proposalId,
      clientId,
      clientName
    } = req.body;

    // Get user ID from authentication middleware
    const userId = req.user?.id || req.user?.user_id;
    
    if (!userId) {
      logger.error('❌ No se encontró user_id en req.user');
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!staticDocumentId || !dynamicDocumentId || !proposalType || !clientName) {
      return res.status(400).json({
        success: false,
        message: 'staticDocumentId, dynamicDocumentId, proposalType y clientName son requeridos'
      });
    }

    logger.info('📝 Creando propuesta desde documentos de Google Drive...');
    logger.info(`   Tipo de propuesta: ${proposalType}`);
    logger.info(`   Cliente: ${clientName}`);
    logger.info(`   Documento estático: ${staticDocumentId}`);
    logger.info(`   Documento dinámico: ${dynamicDocumentId}`);

    // Initialize Google Drive service
    await googleDriveService.initialize();

    if (!googleDriveService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Drive Service no está disponible. Verifica la autenticación OAuth.'
      });
    }

    // Get or create "Propuestas no terminadas" folder (using fixed ID)
    const IN_PROGRESS_FOLDER_ID = '1nLLV-UogyP40ujepcWnl-Um6DYbqdR8E';
    let inProgressFolder;
    try {
      // Try to get the folder by ID first
      const googleDocsService = require('../services/googleDocsService');
      await googleDocsService.initialize();
      const folderInfo = await googleDriveService.drive.files.get({
        fileId: IN_PROGRESS_FOLDER_ID,
        fields: 'id, name'
      });
      inProgressFolder = { id: folderInfo.data.id, name: folderInfo.data.name };
      logger.info(`✅ Carpeta "Propuestas no terminadas" encontrada: ${inProgressFolder.id}`);
    } catch (err) {
      // If folder doesn't exist, create it
      logger.warn('⚠️ Carpeta no encontrada, creando nueva...');
      inProgressFolder = await googleDriveService.getOrCreateInProgressFolder();
    }

    // Generate document name
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const documentName = `${proposalType}_${clientName}_${timestamp}`;

    // Extract sections from static document to identify which are dynamic
    const googleDocsService = require('../services/googleDocsService');
    await googleDocsService.initialize();
    const staticDoc = await googleDocsService.getDocumentContent(staticDocumentId);
    const staticSections = googleDriveService.extractSections(staticDoc);
    
    // Identify dynamic sections (those that exist in dynamic document)
    const dynamicDoc = await googleDocsService.getDocumentContent(dynamicDocumentId);
    const dynamicSections = googleDriveService.extractSections(dynamicDoc);
    
    // Create template sections array for mergeSectionsWithEmptyDynamic
    const templateSections = staticSections.map((section) => ({
      order: section.order,
      title: section.title,
      isStatic: !dynamicSections.some((ds) => ds.order === section.order),
      isDynamic: dynamicSections.some((ds) => ds.order === section.order)
    }));

    logger.info(`📊 Secciones identificadas: ${staticSections.length} total, ${templateSections.filter((s) => s.isDynamic).length} dinámicas`);

    // Merge sections (static complete, dynamic empty)
    logger.info('🔄 Fusionando secciones (dinámicas vacías)...');
    const mergedDoc = await googleDriveService.mergeSectionsWithEmptyDynamic(
      staticDocumentId,
      dynamicDocumentId,
      documentName,
      inProgressFolder.id,
      templateSections
    );

    // Validate clientId - if it's a UUID (string with dashes), set to null
    let validClientId = null;
    if (clientId) {
      const clientIdInt = parseInt(clientId, 10);
      if (!isNaN(clientIdInt) && clientIdInt.toString() === clientId.toString()) {
        validClientId = clientIdInt;
      } else {
        logger.info(`⚠️ clientId es un UUID o string no numérico (${clientId}), usando null y client_name: ${clientName}`);
      }
    }

    // Create proposal record in database with "in_progress" status
    logger.info('💾 Insertando propuesta en base de datos...');
    
    const insertData = {
      title: documentName,
      description: `Propuesta en progreso para ${clientName}`,
      original_filename: `${documentName}.docx`,
      user_id: userId,
      client_id: validClientId,
      client_name: clientName,
      proposal_type: proposalType,
      template_id: null, // No template, created directly from documents
      status: 'in_progress',
      started_at: new Date(),
      google_doc_id: mergedDoc.documentId,
      google_doc_url: mergedDoc.webViewLink,
      final_document_path: mergedDoc.documentId,
      metadata: JSON.stringify({
        cefiroClientId: clientId,
        staticDocumentId,
        dynamicDocumentId,
        inProgressFolderId: inProgressFolder.id,
        createdFrom: 'direct_documents',
        proposalId
      }),
      sections: JSON.stringify(mergedDoc.sections || []),
      created_at: new Date(),
      updated_at: new Date()
    };

    const [proposal] = await db('proposals').insert(insertData).returning('*');

    logger.info(`✅ Propuesta creada con ID: ${proposal.id}`);

    res.json({
      success: true,
      message: 'Propuesta creada exitosamente',
      data: {
        proposal: {
          ...proposal,
          sections: typeof proposal.sections === 'string' 
            ? JSON.parse(proposal.sections) 
            : proposal.sections,
          metadata: typeof proposal.metadata === 'string' 
            ? JSON.parse(proposal.metadata) 
            : proposal.metadata
        },
        googleDoc: {
          id: mergedDoc.documentId,
          url: mergedDoc.webViewLink,
          name: mergedDoc.name
        }
      }
    });
  } catch (error) {
    logger.error('❌ Error creando propuesta desde documentos:', error);
    res.status(500).json({
      success: false,
      message: `Error al crear propuesta: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * Update dynamic sections of a proposal
 * PUT /api/proposals/:id/update-dynamic-sections
 */
const updateDynamicSections = async (req, res) => {
  try {
    const { id } = req.params;
    const { dynamicSections } = req.body;

    logger.info(`📝 Actualizando secciones dinámicas de propuesta ${id}...`);
    logger.info(`   Recibidas ${dynamicSections?.length || 0} secciones:`);
    if (dynamicSections && Array.isArray(dynamicSections)) {
      dynamicSections.forEach((s, i) => {
        logger.info(`   [${i}] Order: ${s.order}, Title: "${s.title}", Content length: ${s.content?.length || 0}`);
      });
    }

    if (!dynamicSections || !Array.isArray(dynamicSections)) {
      return res.status(400).json({
        success: false,
        message: 'dynamicSections debe ser un array'
      });
    }

    // Get proposal
    const proposal = await db('proposals').where('id', id).first();
    
    if (!proposal) {
      logger.error(`❌ Propuesta ${id} no encontrada`);
      return res.status(404).json({
        success: false,
        message: 'Propuesta no encontrada'
      });
    }

    if (!proposal.google_doc_id) {
      logger.error(`❌ Propuesta ${id} no tiene google_doc_id`);
      return res.status(400).json({
        success: false,
        message: 'La propuesta no tiene un documento de Google Drive asociado'
      });
    }

    logger.info(`   Google Doc ID: ${proposal.google_doc_id}`);

    // Initialize Google Drive service
    await googleDriveService.initialize();

    if (!googleDriveService.initialized) {
      logger.error(`❌ Google Drive Service no está inicializado`);
      return res.status(500).json({
        success: false,
        message: 'Google Drive Service no está disponible'
      });
    }

    // Update dynamic sections in Google Doc
    logger.info(`   Llamando a updateDynamicSections...`);
    await googleDriveService.updateDynamicSections(proposal.google_doc_id, dynamicSections);
    logger.info(`   ✅ updateDynamicSections completado`);

    // Update proposal in database
    await db('proposals')
      .where('id', id)
      .update({
        updated_at: new Date()
      });

    logger.info(`✅ Secciones dinámicas actualizadas para propuesta ${id}`);

    res.json({
      success: true,
      message: 'Secciones dinámicas actualizadas exitosamente'
    });
  } catch (error) {
    logger.error('❌ Error actualizando secciones dinámicas:', error);
    logger.error('   Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: `Error al actualizar secciones: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * Complete proposal (move to client folder in "Propuestas terminadas")
 * POST /api/proposals/:id/complete
 */
const completeProposal = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`✅ Completando propuesta ${id}...`);

    // Get proposal
    const proposal = await db('proposals').where('id', id).first();
    
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Propuesta no encontrada'
      });
    }

    if (!proposal.google_doc_id) {
      return res.status(400).json({
        success: false,
        message: 'La propuesta no tiene un documento de Google Drive asociado'
      });
    }

    if (!proposal.client_name) {
      return res.status(400).json({
        success: false,
        message: 'La propuesta no tiene un cliente asociado'
      });
    }

    // Parse metadata to get inProgressFolderId
    let metadata;
    try {
      metadata = typeof proposal.metadata === 'string' 
        ? JSON.parse(proposal.metadata) 
        : proposal.metadata || {};
    } catch (e) {
      logger.error('Error parseando metadata:', e);
      metadata = {};
    }

    const inProgressFolderId = metadata.inProgressFolderId;

    if (!inProgressFolderId) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró la carpeta de origen (Propuestas no terminadas)'
      });
    }

    // Initialize Google Drive service
    await googleDriveService.initialize();

    if (!googleDriveService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Drive Service no está disponible'
      });
    }

    // Get or create client folder in "Propuestas terminadas"
    const clientFolder = await googleDriveService.getOrCreateClientFolder(proposal.client_name);

    // Move document from "Propuestas no terminadas" to client folder
    await googleDriveService.moveDocument(
      proposal.google_doc_id,
      inProgressFolderId,
      clientFolder.id
    );

    // Update proposal status and metadata
    const completedAt = new Date();
    const startedAt = proposal.started_at ? new Date(proposal.started_at) : completedAt;
    const timeElapsed = Math.round((completedAt - startedAt) / 1000 / 60); // minutes

    metadata.completedFolderId = clientFolder.id;
    metadata.completedAt = completedAt.toISOString();
    metadata.timeElapsed = timeElapsed;

    await db('proposals')
      .where('id', id)
      .update({
        status: 'completed',
        completed_at: completedAt,
        metadata: JSON.stringify(metadata),
        updated_at: completedAt
      });

    logger.info(`✅ Propuesta ${id} completada y movida a carpeta del cliente`);

    res.json({
      success: true,
      message: 'Propuesta completada exitosamente',
      data: {
        timeElapsed: timeElapsed,
        clientFolder: {
          id: clientFolder.id,
          name: clientFolder.name
        }
      }
    });
  } catch (error) {
    logger.error('❌ Error completando propuesta:', error);
    res.status(500).json({
      success: false,
      message: `Error al completar propuesta: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * Create proposal from Google Drive documents
 * POST /api/proposals/google-drive/create
 */
const createProposalFromGoogleDrive = async (req, res) => {
  try {
    const {
      staticDocumentId,      // Google Doc ID for static sections
      dynamicDocumentId,     // Google Doc ID for dynamic sections
      proposalType,          // Type of proposal
      clientId,              // Client/Prospect ID
      clientName,            // Client/Prospect name
      clientEmail,           // Client email (for sending)
      staticFolderId,        // Folder ID for static documents
      dynamicFolderId,       // Folder ID for dynamic documents
      finalDocumentsFolderId // Base folder ID for final documents
    } = req.body;

    // Validate required fields
    if (!staticDocumentId || !dynamicDocumentId || !clientName) {
      return res.status(400).json({
        success: false,
        message: 'staticDocumentId, dynamicDocumentId y clientName son requeridos'
      });
    }

    logger.info('📄 Creando propuesta desde Google Drive...');
    logger.info(`   Cliente: ${clientName}`);
    logger.info(`   Documento estático: ${staticDocumentId}`);
    logger.info(`   Documento dinámico: ${dynamicDocumentId}`);

    // Initialize Google Drive service
    await googleDriveService.initialize();

    if (!googleDriveService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Drive Service no está disponible. Verifica la autenticación OAuth.'
      });
    }

    // Create or find client folder in "Documentos Finales"
    let clientFolder;
    if (finalDocumentsFolderId) {
      // Find or create client folder
      clientFolder = await googleDriveService.findFolderByName(clientName, finalDocumentsFolderId);
      
      if (!clientFolder) {
        clientFolder = await googleDriveService.createFolder(clientName, finalDocumentsFolderId);
      }
    } else {
      // If no base folder, create in root (not recommended)
      clientFolder = await googleDriveService.findFolderByName(clientName);
      if (!clientFolder) {
        clientFolder = await googleDriveService.createFolder(clientName);
      }
    }

    // Generate output document name
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const outputName = `${proposalType || 'Propuesta'}_${clientName}_${timestamp}`;

    // Merge sections from static and dynamic documents
    logger.info('🔄 Fusionando secciones...');
    const mergedDoc = await googleDriveService.mergeSections(
      staticDocumentId,
      dynamicDocumentId,
      outputName,
      clientFolder.id
    );

    // Create proposal record in database
    const [proposal] = await db('proposals').insert({
      title: outputName,
      description: `Propuesta generada desde Google Drive para ${clientName}`,
      client_id: clientId || null,
      client_name: clientName,
      proposal_type: proposalType || null,
      status: 'completed',
      started_at: new Date(),
      completed_at: new Date(),
      google_doc_id: mergedDoc.documentId,
      google_doc_url: mergedDoc.webViewLink,
      final_document_path: mergedDoc.documentId, // Store Google Doc ID
      metadata: JSON.stringify({
        staticDocumentId,
        dynamicDocumentId,
        clientFolderId: clientFolder.id,
        createdFrom: 'google_drive'
      }),
      sections: JSON.stringify([]), // Sections are in the merged document
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    logger.info(`✅ Propuesta creada: ${proposal.id}`);

    res.json({
      success: true,
      message: 'Propuesta creada exitosamente desde Google Drive',
      data: {
        proposal: {
          ...proposal,
          sections: JSON.parse(proposal.sections || '[]'),
          metadata: JSON.parse(proposal.metadata || '{}')
        },
        googleDoc: mergedDoc
      }
    });
  } catch (error) {
    logger.error('Error creando propuesta desde Google Drive:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando propuesta desde Google Drive',
      error: error.message
    });
  }
};

/**
 * Export proposal to PDF and save to Google Drive
 * POST /api/proposals/:id/export-pdf
 */
const exportProposalToPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Get proposal
    const proposal = await db('proposals').where('id', id).first();

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Propuesta no encontrada'
      });
    }

    if (!proposal.google_doc_id) {
      return res.status(400).json({
        success: false,
        message: 'La propuesta no tiene un documento de Google Docs asociado'
      });
    }

    // Parse metadata to get client folder
    const metadata = typeof proposal.metadata === 'string' 
      ? JSON.parse(proposal.metadata) 
      : proposal.metadata || {};

    const clientFolderId = metadata.clientFolderId;

    if (!clientFolderId) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró la carpeta del cliente en los metadatos'
      });
    }

    // Initialize Google Drive service
    await googleDriveService.initialize();

    if (!googleDriveService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Drive Service no está disponible'
      });
    }

    // Generate PDF name
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const pdfName = `${proposal.proposal_type || 'Propuesta'}_${proposal.client_name}_${timestamp}.pdf`;

    // Export to PDF
    logger.info(`📥 Exportando propuesta ${id} a PDF...`);
    const pdfFile = await googleDriveService.exportToPDF(
      proposal.google_doc_id,
      pdfName,
      clientFolderId
    );

    // Update proposal metadata with PDF info
    metadata.pdfDocumentId = pdfFile.id;
    metadata.pdfUrl = pdfFile.webViewLink;
    metadata.pdfExportedAt = new Date().toISOString();

    await db('proposals')
      .where('id', id)
      .update({
        metadata: JSON.stringify(metadata),
        updated_at: new Date()
      });

    logger.info(`✅ PDF exportado: ${pdfFile.id}`);

    res.json({
      success: true,
      message: 'PDF exportado exitosamente',
      data: {
        pdf: pdfFile
      }
    });
  } catch (error) {
    logger.error('Error exportando propuesta a PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error exportando propuesta a PDF',
      error: error.message
    });
  }
};

/**
 * Send proposal email to client
 * POST /api/proposals/:id/send-email
 */
const sendProposalEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      clientEmail, 
      subject, 
      message,
      sendAsPDF = false 
    } = req.body;

    // Get proposal
    const proposal = await db('proposals').where('id', id).first();

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Propuesta no encontrada'
      });
    }

    if (!clientEmail) {
      return res.status(400).json({
        success: false,
        message: 'clientEmail es requerido'
      });
    }

    // Initialize Google Drive service
    await googleDriveService.initialize();

    if (!googleDriveService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Drive Service no está disponible'
      });
    }

    let documentToSend = proposal.google_doc_id;
    let documentUrl = proposal.google_doc_url;

    // If PDF requested, export it first
    if (sendAsPDF) {
      const metadata = typeof proposal.metadata === 'string' 
        ? JSON.parse(proposal.metadata) 
        : proposal.metadata || {};

      // Check if PDF already exists
      if (metadata.pdfDocumentId) {
        documentToSend = metadata.pdfDocumentId;
        documentUrl = metadata.pdfUrl;
      } else {
        // Export to PDF first (call the function directly)
        const clientFolderId = metadata.clientFolderId;
        if (clientFolderId) {
          const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
          const pdfName = `${proposal.proposal_type || 'Propuesta'}_${proposal.client_name}_${timestamp}.pdf`;
          
          const pdfFile = await googleDriveService.exportToPDF(
            proposal.google_doc_id,
            pdfName,
            clientFolderId
          );
          
          documentToSend = pdfFile.id;
          documentUrl = pdfFile.webViewLink;
          
          // Update metadata
          metadata.pdfDocumentId = pdfFile.id;
          metadata.pdfUrl = pdfFile.webViewLink;
          metadata.pdfExportedAt = new Date().toISOString();
          
          await db('proposals')
            .where('id', id)
            .update({
              metadata: JSON.stringify(metadata),
              updated_at: new Date()
            });
        } else {
          return res.status(400).json({
            success: false,
            message: 'No se encontró la carpeta del cliente para exportar PDF'
          });
        }
      }
    }

    // Get shareable link (make document viewable)
    const shareableLink = await googleDocsService.getShareableLink(documentToSend, true);

    // Configure email (using environment variables)
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Email content
    const emailSubject = subject || `Propuesta: ${proposal.proposal_type || 'Propuesta'} - ${proposal.client_name}`;
    const emailMessage = message || `
      Estimado/a ${proposal.client_name},
      
      Adjunto encontrará la propuesta solicitada.
      
      Puede acceder al documento en el siguiente enlace:
      ${shareableLink}
      
      Saludos cordiales.
    `;

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: clientEmail,
      subject: emailSubject,
      text: emailMessage,
      html: emailMessage.replace(/\n/g, '<br>')
    };

    await transporter.sendMail(mailOptions);

    // Record email send in database
    await db('proposal_emails').insert({
      proposal_id: id,
      client_email: clientEmail,
      sent_at: new Date(),
      document_type: sendAsPDF ? 'pdf' : 'doc',
      document_id: documentToSend,
      document_url: shareableLink,
      subject: emailSubject
    });

    logger.info(`✅ Correo enviado a ${clientEmail} para propuesta ${id}`);

    res.json({
      success: true,
      message: 'Correo enviado exitosamente',
      data: {
        email: clientEmail,
        documentUrl: shareableLink,
        sentAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Error enviando correo:', error);
    res.status(500).json({
      success: false,
      message: 'Error enviando correo',
      error: error.message
    });
  }
};

/**
 * Apply format template from Google Drive to a proposal document
 * POST /api/proposals/:id/apply-format-template
 * 
 * Applies formatting from a format template document to the proposal's Google Doc
 */
const applyFormatTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { formatTemplateId } = req.body;

    if (!formatTemplateId) {
      return res.status(400).json({
        success: false,
        message: 'formatTemplateId es requerido'
      });
    }

    logger.info(`🎨 Aplicando template de formato a propuesta ${id}...`);
    logger.info(`   Format Template ID: ${formatTemplateId}`);

    // Get proposal from database
    const proposal = await db('proposals').where('id', id).first();

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Propuesta no encontrada'
      });
    }

    if (!proposal.google_doc_id) {
      return res.status(400).json({
        success: false,
        message: 'La propuesta no tiene un documento de Google Drive asociado'
      });
    }

    // Initialize Google Drive and Docs services
    await googleDriveService.initialize();

    if (!googleDriveService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Drive Service no está disponible'
      });
    }

    const googleDocsService = require('../services/googleDocsService');
    await googleDocsService.initialize();

    if (!googleDocsService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Docs Service no está disponible'
      });
    }

    logger.info(`🔄 Aplicando formato del template al documento...`);
    
    // Get format template document
    const formatTemplateDoc = await googleDocsService.getDocumentContent(formatTemplateId);
    
    // Get proposal document
    const proposalDoc = await googleDocsService.getDocumentContent(proposal.google_doc_id);

    // Copy document-level styles (margins, page size, etc.)
    const requests = [];
    
    if (formatTemplateDoc.documentStyle) {
      requests.push({
        updateDocumentStyle: {
          documentStyle: {
            marginTop: formatTemplateDoc.documentStyle.marginTop,
            marginBottom: formatTemplateDoc.documentStyle.marginBottom,
            marginLeft: formatTemplateDoc.documentStyle.marginLeft,
            marginRight: formatTemplateDoc.documentStyle.marginRight,
            pageNumberStart: formatTemplateDoc.documentStyle.pageNumberStart,
            pageSize: formatTemplateDoc.documentStyle.pageSize
          },
          fields: 'marginTop,marginBottom,marginLeft,marginRight,pageNumberStart,pageSize'
        }
      });
    }

    // Copy default paragraph style
    if (formatTemplateDoc.namedStyles && formatTemplateDoc.namedStyles.styles) {
      const normalStyle = formatTemplateDoc.namedStyles.styles.find(s => s.namedStyleType === 'NORMAL_TEXT');
      if (normalStyle && normalStyle.paragraphStyle) {
        const endIndex = proposalDoc.body.content.length > 0 
          ? proposalDoc.body.content[proposalDoc.body.content.length - 1].endIndex 
          : 1;
        
        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: 1,
              endIndex: endIndex
            },
            paragraphStyle: normalStyle.paragraphStyle,
            fields: Object.keys(normalStyle.paragraphStyle).join(',')
          }
        });
      }
    }

    // Execute batch update to apply formatting
    if (requests.length > 0) {
      await googleDocsService.batchUpdate(proposal.google_doc_id, requests);
      logger.info(`✅ Formato aplicado (${requests.length} actualizaciones de estilo)`);
    } else {
      logger.warn(`⚠️ No se encontraron estilos para copiar del template`);
    }

    // Update proposal metadata
    let metadata = {};
    try {
      metadata = typeof proposal.metadata === 'string' 
        ? JSON.parse(proposal.metadata) 
        : proposal.metadata || {};
    } catch (e) {
      logger.error('Error parseando metadata:', e);
    }

    metadata.formatTemplateId = formatTemplateId;
    metadata.formatAppliedAt = new Date().toISOString();

    await db('proposals')
      .where('id', id)
      .update({
        metadata: JSON.stringify(metadata),
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: 'Template de formato aplicado exitosamente',
      data: {
        proposalId: id,
        formatTemplateId,
        googleDocUrl: proposal.google_doc_url
      }
    });
  } catch (error) {
    logger.error('❌ Error aplicando template de formato:', error);
    res.status(500).json({
      success: false,
      message: `Error al aplicar template de formato: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * Get section content from Google Doc
 * GET /api/proposals/:id/sections/:sectionOrder/content
 */
const getSectionContent = async (req, res) => {
  try {
    const { id, sectionOrder } = req.params;
    const sectionOrderNum = parseInt(sectionOrder, 10);

    if (isNaN(sectionOrderNum)) {
      return res.status(400).json({
        success: false,
        message: 'sectionOrder debe ser un número'
      });
    }

    logger.info(`📄 Obteniendo contenido de sección ${sectionOrderNum} de propuesta ${id}...`);

    // Get proposal from database
    const proposal = await db('proposals').where('id', id).first();

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Propuesta no encontrada'
      });
    }

    if (!proposal.google_doc_id) {
      return res.status(400).json({
        success: false,
        message: 'La propuesta no tiene un documento de Google Drive asociado'
      });
    }

    // Initialize Google Docs service
    const googleDocsService = require('../services/googleDocsService');
    await googleDocsService.initialize();

    if (!googleDocsService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Docs Service no está disponible'
      });
    }

    // Get document content (always needed to extract actual content)
    const docData = await googleDocsService.getDocumentContent(proposal.google_doc_id);
    
    // Try to use saved sections from database first (for structure)
    let sections = [];
    let useSavedSections = false;
    if (proposal.sections) {
      try {
        sections = typeof proposal.sections === 'string' 
          ? JSON.parse(proposal.sections) 
          : proposal.sections;
        if (sections && sections.length > 0) {
          useSavedSections = true;
          logger.info(`Usando ${sections.length} secciones guardadas de la base de datos`);
        }
      } catch (e) {
        logger.warn('Error parsing saved sections, will extract from document:', e);
        sections = [];
      }
    }
    
    // If no saved sections, extract from document
    if (!useSavedSections || sections.length === 0) {
      logger.info('Extrayendo secciones del documento...');
      const googleDriveService = require('../services/googleDriveService');
      sections = googleDriveService.extractSections(docData);
    }
    
    // Find the requested section
    const section = sections.find(s => s.order === sectionOrderNum);
    
    if (!section) {
      logger.warn(`Sección ${sectionOrderNum} no encontrada. Secciones disponibles: ${sections.map(s => s.order).join(', ')}`);
      return res.status(404).json({
        success: false,
        message: `Sección ${sectionOrderNum} no encontrada en el documento`,
        availableSections: sections.map(s => s.order)
      });
    }

    // If using saved sections but they don't have current content, re-extract from document
    let actualContent = section.content || '';
    if (useSavedSections && (!section.content || section.content.trim() === '')) {
      logger.info('Sección guardada sin contenido, extrayendo del documento...');
      const googleDriveService = require('../services/googleDriveService');
      const currentSections = googleDriveService.extractSections(docData);
      const currentSection = currentSections.find(s => s.order === sectionOrderNum);
      if (currentSection && currentSection.content) {
        actualContent = currentSection.content;
      }
    } else if (!useSavedSections) {
      // Content already extracted from document
      actualContent = section.content || '';
    }

    // Export section as HTML for formatted display
    try {
      // Use Google Docs API to export the section range as HTML
      const exportResponse = await googleDocsService.docs.documents.export({
        documentId: proposal.google_doc_id,
        mimeType: 'text/html'
      });

      // Return the actual content extracted
      res.json({
        success: true,
        content: actualContent,
        html: null // Can be enhanced later to return formatted HTML
      });
    } catch (exportError) {
      // Fallback to text content if HTML export fails
      logger.warn('Error exporting section as HTML, using text content:', exportError);
      
      res.json({
        success: true,
        content: actualContent,
        html: null
      });
    }
  } catch (error) {
    logger.error('❌ Error obteniendo contenido de sección:', error);
    res.status(500).json({
      success: false,
      message: `Error al obtener contenido de sección: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * Create proposal from Google Drive format template (direct, no database template required)
 * POST /api/proposals/create-from-format-template
 * 
 * Creates a proposal directly from a Google Drive format template document
 */
const createProposalFromFormatTemplate = async (req, res) => {
  try {
    const {
      formatTemplateId,
      clientId,
      clientName
    } = req.body;

    // Get user ID from authentication middleware
    const userId = req.user?.id || req.user?.user_id;
    
    if (!userId) {
      logger.error('❌ No se encontró user_id en req.user');
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!formatTemplateId || !clientName) {
      return res.status(400).json({
        success: false,
        message: 'formatTemplateId y clientName son requeridos'
      });
    }

    logger.info('📝 Creando propuesta desde template de formato de Google Drive...');
    logger.info(`   Format Template ID: ${formatTemplateId}`);
    logger.info(`   Cliente: ${clientName}`);

    // Initialize Google Drive service
    await googleDriveService.initialize();

    if (!googleDriveService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Drive Service no está disponible. Verifica la autenticación OAuth.'
      });
    }

    // Get or create "Propuestas no terminadas" folder
    const inProgressFolder = await googleDriveService.getOrCreateInProgressFolder();

    // Generate document name
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const documentName = `Propuesta_${clientName}_${timestamp}`;

    // Copy the format template as the base document
    logger.info('📄 Copiando template de formato como documento base...');
    const baseDoc = await googleDriveService.copyDocument(
      formatTemplateId,
      documentName,
      inProgressFolder.id
    );

    // Extract sections from the format template
    const googleDocsService = require('../services/googleDocsService');
    await googleDocsService.initialize();
    
    const templateDoc = await googleDocsService.getDocumentContent(formatTemplateId);
    const sections = googleDriveService.extractSections(templateDoc);
    
    // Mark all sections as dynamic initially (user will fill them)
    const proposalSections = sections.map(section => ({
      order: section.order,
      title: section.title,
      content: '', // Empty for user to fill
      isStatic: false // All sections from format template are dynamic
    }));

    // Create proposal record in database with "in_progress" status
    logger.info('💾 Insertando propuesta en base de datos...');
    
    // Validate clientId - if it's a UUID (string with dashes), set to null
    // The proposals table expects client_id to be an integer, not a UUID
    let validClientId = null;
    if (clientId) {
      // Check if clientId is a valid integer
      const clientIdInt = parseInt(clientId, 10);
      if (!isNaN(clientIdInt) && clientIdInt.toString() === clientId.toString()) {
        validClientId = clientIdInt;
      } else {
        // It's a UUID or non-numeric string, so we'll use null and rely on client_name
        logger.info(`⚠️ clientId es un UUID o string no numérico (${clientId}), usando null y client_name: ${clientName}`);
      }
    }
    
    const insertData = {
      title: documentName,
      description: `Propuesta en progreso para ${clientName}`,
      original_filename: `${documentName}.docx`, // Required field
      user_id: userId,
      status: 'in_progress',
      client_id: validClientId, // null if UUID, integer if valid
      client_name: clientName,
      proposal_type: 'Desde Template de Formato',
      started_at: new Date(),
      google_doc_id: baseDoc.id,
      google_doc_url: baseDoc.webViewLink,
      sections: JSON.stringify(proposalSections),
      metadata: JSON.stringify({
        inProgressFolderId: inProgressFolder.id,
        createdFrom: 'format_template',
        formatTemplateId: formatTemplateId,
        cefiroClientId: clientId // Store the UUID here for reference
      }),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Log insertData to verify all fields are present
    logger.info('📋 Datos a insertar en proposals:');
    logger.info(`   original_filename: ${insertData.original_filename}`);
    logger.info(`   title: ${insertData.title}`);
    logger.info(`   client_name: ${insertData.client_name}`);
    logger.info(`   user_id: ${insertData.user_id}`);
    logger.info(`   Todos los campos:`, Object.keys(insertData));
    
    const [proposal] = await db('proposals').insert(insertData).returning('*');

    logger.info(`✅ Propuesta creada con ID: ${proposal.id}`);

    res.json({
      success: true,
      message: 'Propuesta creada exitosamente',
      data: {
        proposal: {
          ...proposal,
          sections: typeof proposal.sections === 'string' 
            ? JSON.parse(proposal.sections) 
            : proposal.sections,
          metadata: typeof proposal.metadata === 'string' 
            ? JSON.parse(proposal.metadata) 
            : proposal.metadata
        },
        googleDoc: {
          id: baseDoc.id,
          url: baseDoc.webViewLink,
          name: baseDoc.name
        }
      }
    });
  } catch (error) {
    logger.error('❌ Error creando propuesta desde template de formato:', error);
    res.status(500).json({
      success: false,
      message: `Error al crear propuesta: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * Reopen completed proposal for editing
 * POST /api/proposals/:id/reopen-for-editing
 * 
 * Changes proposal status from 'completed' to 'in_progress'
 */
const reopenProposalForEditing = async (req, res) => {
  try {
    const { id } = req.params;

    // Get user ID from authentication middleware
    const userId = req.user?.id || req.user?.user_id;
    
    if (!userId) {
      logger.error('❌ No se encontró user_id en req.user');
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    logger.info(`🔄 Reabriendo propuesta ${id} para edición...`);

    // Get proposal
    const proposal = await db('proposals').where('id', id).first();
    
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Propuesta no encontrada'
      });
    }

    // Check if proposal is completed
    if (proposal.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `La propuesta no está completada. Estado actual: ${proposal.status}`
      });
    }

    // Update status to in_progress
    await db('proposals')
      .where('id', id)
      .update({
        status: 'in_progress',
        updated_at: new Date()
      });

    logger.info(`✅ Propuesta ${id} reabierta para edición`);

    res.json({
      success: true,
      message: 'Propuesta reabierta para edición exitosamente'
    });
  } catch (error) {
    logger.error('❌ Error reabriendo propuesta para edición:', error);
    res.status(500).json({
      success: false,
      message: `Error al reabrir propuesta: ${error.message}`,
      error: error.message
    });
  }
};

module.exports = {
  createProposalFromGoogleDrive,
  exportProposalToPDF,
  sendProposalEmail,
  createProposalFromTemplate,
  createProposalFromDocuments,
  updateDynamicSections,
  completeProposal,
  applyFormatTemplate,
  getSectionContent,
  createProposalFromFormatTemplate,
  reopenProposalForEditing
};

