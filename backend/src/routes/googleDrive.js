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

module.exports = router;

