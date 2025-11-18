const express = require('express');
const router = express.Router();
const googleDriveService = require('../services/googleDriveService');
const logger = require('../utils/logger');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

/**
 * GET /api/google-drive/folders/:folderId/files
 * List files in a Google Drive folder
 */
router.get('/folders/:folderId/files', async (req, res) => {
  try {
    const { folderId } = req.params;
    const { mimeType } = req.query; // Optional filter by mimeType

    const files = await googleDriveService.listFilesInFolder(folderId, mimeType);

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    logger.error('Error listando archivos:', error);
    res.status(500).json({
      success: false,
      message: 'Error listando archivos',
      error: error.message
    });
  }
});

/**
 * GET /api/google-drive/folders/:folderId/docs
 * List only Google Docs files in a folder
 */
router.get('/folders/:folderId/docs', async (req, res) => {
  try {
    const { folderId } = req.params;

    logger.info(`📂 Listando documentos de Google Drive en carpeta: ${folderId}`);

    // Initialize service if needed
    if (!googleDriveService.initialized) {
      logger.info('🔧 Inicializando Google Drive Service...');
      const initialized = await googleDriveService.initialize();
      if (!initialized) {
        logger.error('❌ No se pudo inicializar Google Drive Service');
        return res.status(500).json({
          success: false,
          message: 'Google Drive Service no está disponible. Verifica la configuración de Service Account o autenticación OAuth.',
          error: 'Service not initialized'
        });
      }
    }

    if (!googleDriveService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Drive Service no está disponible. Verifica la configuración de Service Account o autenticación OAuth.',
        error: 'Service not initialized'
      });
    }

    const docs = await googleDriveService.listGoogleDocsInFolder(folderId);

    logger.info(`✅ Se encontraron ${docs.length} documentos en la carpeta`);

    res.json({
      success: true,
      data: docs
    });
  } catch (error) {
    logger.error('Error listando documentos:', error);
    logger.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: 'Error listando documentos',
      error: error.message
    });
  }
});

/**
 * POST /api/google-drive/folders/find
 * Find folder by name
 */
router.post('/folders/find', async (req, res) => {
  try {
    const { folderName, parentFolderId } = req.body;

    if (!folderName) {
      return res.status(400).json({
        success: false,
        message: 'folderName es requerido'
      });
    }

    const folder = await googleDriveService.findFolderByName(folderName, parentFolderId);

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: `Carpeta "${folderName}" no encontrada`
      });
    }

    res.json({
      success: true,
      data: folder
    });
  } catch (error) {
    logger.error('Error buscando carpeta:', error);
    res.status(500).json({
      success: false,
      message: 'Error buscando carpeta',
      error: error.message
    });
  }
});

/**
 * POST /api/google-drive/folders/create
 * Create a folder
 */
router.post('/folders/create', async (req, res) => {
  try {
    const { folderName, parentFolderId } = req.body;

    if (!folderName) {
      return res.status(400).json({
        success: false,
        message: 'folderName es requerido'
      });
    }

    const folder = await googleDriveService.createFolder(folderName, parentFolderId);

    res.json({
      success: true,
      data: folder
    });
  } catch (error) {
    logger.error('Error creando carpeta:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando carpeta',
      error: error.message
    });
  }
});

/**
 * GET /api/google-drive/project-resources
 * Get Project_resources document data
 */
router.get('/project-resources', async (req, res) => {
  try {
    const RESOURCES_FOLDER_ID = '1GVnlFSxWm3BGXQJJSYGDFdLW7DjoZFNN';
    const RESOURCES_DOC_NAME = 'Project_resources';

    logger.info(`📋 Obteniendo documento ${RESOURCES_DOC_NAME}...`);

    // Initialize service if needed
    if (!googleDriveService.initialized) {
      await googleDriveService.initialize();
    }

    if (!googleDriveService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Drive Service no está disponible'
      });
    }

    // Find document in folder
    const docs = await googleDriveService.listGoogleDocsInFolder(RESOURCES_FOLDER_ID);
    const resourcesDoc = docs.find(doc => 
      doc.name.toLowerCase().includes('project_resources') || 
      doc.name.toLowerCase().includes('project-resources')
    );

    if (!resourcesDoc) {
      return res.status(404).json({
        success: false,
        message: `Documento ${RESOURCES_DOC_NAME} no encontrado en la carpeta`
      });
    }

    // Get document content
    const googleDocsService = require('../services/googleDocsService');
    await googleDocsService.initialize();
    const docData = await googleDocsService.getDocumentContent(resourcesDoc.id);
    
    // Extract table data
    const tableData = googleDocsService.extractTableData(docData);
    
    // Parse table into structured format
    // First row is header: Tag, Nombre, Experiencia, Certificacion
    if (tableData.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El documento no tiene el formato esperado'
      });
    }

    const resources = [];
    const headerRow = tableData[0];
    
    // Find column indices
    const tagColIndex = headerRow.findIndex(col => col.toLowerCase().includes('tag'));
    const nameColIndex = headerRow.findIndex(col => col.toLowerCase().includes('nombre'));
    const expColIndex = headerRow.findIndex(col => col.toLowerCase().includes('experiencia'));
    const certColIndex = headerRow.findIndex(col => col.toLowerCase().includes('certificacion'));

    // Process data rows (skip header)
    for (let i = 1; i < tableData.length; i++) {
      const row = tableData[i];
      const tagCell = row[tagColIndex] || '';
      const name = row[nameColIndex] || '';
      const experience = row[expColIndex] || '';
      const certification = row[certColIndex] || '';

      // Parse tags (can be multiple like "[PM],[Project Managers]")
      if (tagCell.trim()) {
        const tags = tagCell.split(',').map(t => t.trim()).filter(t => t);
        
        for (const tag of tags) {
          // Find or create resource group for this tag
          let resourceGroup = resources.find(r => r.tag === tag);
          if (!resourceGroup) {
            resourceGroup = {
              tag: tag,
              options: []
            };
            resources.push(resourceGroup);
          }

          // Add option if name exists
          if (name.trim()) {
            resourceGroup.options.push({
              name: name.trim(),
              experience: experience.trim(),
              certification: certification.trim() || 'Ninguna'
            });
          }
        }
      }
    }

    logger.info(`✅ Se encontraron ${resources.length} grupos de recursos`);

    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    logger.error('Error obteniendo recursos del proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo recursos del proyecto',
      error: error.message
    });
  }
});

/**
 * GET /api/google-drive/project-schedule
 * Get Project_schedule document data
 */
router.get('/project-schedule', async (req, res) => {
  try {
    const RESOURCES_FOLDER_ID = '1GVnlFSxWm3BGXQJJSYGDFdLW7DjoZFNN';
    const SCHEDULE_DOC_NAME = 'Project_schedule';

    logger.info(`📅 Obteniendo documento ${SCHEDULE_DOC_NAME}...`);

    // Initialize service if needed
    if (!googleDriveService.initialized) {
      await googleDriveService.initialize();
    }

    if (!googleDriveService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Drive Service no está disponible'
      });
    }

    // Find document in folder
    const docs = await googleDriveService.listGoogleDocsInFolder(RESOURCES_FOLDER_ID);
    const scheduleDoc = docs.find(doc => 
      doc.name.toLowerCase().includes('project_schedule') || 
      doc.name.toLowerCase().includes('project-schedule')
    );

    if (!scheduleDoc) {
      return res.status(404).json({
        success: false,
        message: `Documento ${SCHEDULE_DOC_NAME} no encontrado en la carpeta`
      });
    }

    // Get document content
    const googleDocsService = require('../services/googleDocsService');
    await googleDocsService.initialize();
    const docData = await googleDocsService.getDocumentContent(scheduleDoc.id);
    
    // Extract table data
    const tableData = googleDocsService.extractTableData(docData);
    
    if (tableData.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El documento no tiene el formato esperado'
      });
    }

    const scheduleOptions = [];
    
    // Process table - tags are in first column, units in second row, values in subsequent rows
    let currentTag = null;
    let currentUnit = null;
    
    for (let i = 0; i < tableData.length; i++) {
      const row = tableData[i];
      const firstCell = row[0] || '';
      
      // Check if this is a tag row (starts with [)
      if (firstCell.trim().startsWith('[') && firstCell.trim().endsWith(']')) {
        currentTag = firstCell.trim();
        // Next row should have units
        if (i + 1 < tableData.length) {
          const unitRow = tableData[i + 1];
          currentUnit = unitRow[1] || unitRow[0] || 'Meses'; // Default to Meses
          i++; // Skip unit row
        }
      } else if (currentTag && firstCell.trim() === '') {
        // This is a values row for the current tag
        const values = row.slice(1).filter(v => v.trim() !== '').map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v));
        
        if (values.length > 0) {
          scheduleOptions.push({
            tag: currentTag,
            unit: currentUnit || 'Meses',
            values: values
          });
        }
      }
    }

    logger.info(`✅ Se encontraron ${scheduleOptions.length} opciones de schedule`);

    res.json({
      success: true,
      data: scheduleOptions
    });
  } catch (error) {
    logger.error('Error obteniendo schedule del proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo schedule del proyecto',
      error: error.message
    });
  }
});

module.exports = router;

