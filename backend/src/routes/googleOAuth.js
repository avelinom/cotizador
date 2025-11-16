const express = require('express');
const router = express.Router();
const googleOAuthService = require('../services/googleOAuthService');
const logger = require('../utils/logger');

/**
 * GET /api/google-oauth/auth
 * Get authorization URL to start OAuth flow
 */
router.get('/auth', (req, res) => {
  try {
    const authUrl = googleOAuthService.getAuthUrl();
    res.json({
      success: true,
      authUrl: authUrl
    });
  } catch (error) {
    logger.error('Error generando URL de autorización:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando URL de autorización',
      error: error.message
    });
  }
});

/**
 * GET /api/google-oauth/callback
 * Handle OAuth callback and exchange code for tokens
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    // Determine redirect URL - prefer Cefiro Portal if available
    const cefiroPortalUrl = process.env.CEFIRO_PORTAL_URL || 'http://localhost:3003';
    const fallbackUrl = process.env.FRONTEND_URL || 'http://localhost:3006';
    const baseUrl = cefiroPortalUrl;

    if (error) {
      logger.error('Error en callback de OAuth:', error);
      return res.redirect(`${baseUrl}/cotizador/templates?oauth_error=${error}`);
    }

    if (!code) {
      return res.redirect(`${baseUrl}/cotizador/templates?oauth_error=no_code`);
    }

    logger.info('📥 Callback recibido, intercambiando código por tokens...');
    logger.info(`   Code recibido: ${code ? '✅ Sí' : '❌ No'}`);
    
    const tokens = await googleOAuthService.getTokens(code);

    // Store tokens (in production, store in database)
    // For now, we'll store in memory and provide a way to check status
    logger.info('✅ OAuth tokens obtenidos y almacenados en memoria');
    logger.info(`   Verifica con: GET /api/google-oauth/status`);

    // Redirect to frontend with success
    const redirectUrl = `${baseUrl}/cotizador/templates?oauth_success=true`;
    logger.info(`   Redirigiendo a: ${redirectUrl}`);
    res.redirect(redirectUrl);
  } catch (error) {
    logger.error('Error en callback de OAuth:', error);
    const baseUrl = process.env.CEFIRO_PORTAL_URL || process.env.FRONTEND_URL || 'http://localhost:3003';
    res.redirect(`${baseUrl}/cotizador/templates?oauth_error=${error.message}`);
  }
});

/**
 * GET /api/google-oauth/status
 * Check OAuth authentication status
 */
router.get('/status', (req, res) => {
  try {
    const isAuthenticated = googleOAuthService.isAuthenticated();
    res.json({
      success: true,
      authenticated: isAuthenticated
    });
  } catch (error) {
    logger.error('Error verificando estado de OAuth:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando estado',
      error: error.message
    });
  }
});

/**
 * POST /api/google-oauth/test
 * Test Google Docs API with OAuth tokens
 */
router.post('/test', async (req, res) => {
  try {
    // Ensure OAuth service is initialized
    if (!googleOAuthService.initialized) {
      googleOAuthService.initialize();
    }

    if (!googleOAuthService.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'No estás autenticado. Visita /api/google-oauth/auth primero.',
        authenticated: false
      });
    }

    const googleDocsService = require('../services/googleDocsService');
    await googleDocsService.initialize();

    if (!googleDocsService.initialized) {
      return res.status(500).json({
        success: false,
        message: 'Google Docs Service no se pudo inicializar'
      });
    }

    // Create test document
    const testDoc = await googleDocsService.createDocument('Test OAuth - Cotizador ' + Date.now());
    
    logger.info(`✅ Documento de prueba creado: ${testDoc.documentId}`);

    // Delete test document
    await googleDocsService.deleteDocument(testDoc.documentId);
    logger.info('✅ Documento de prueba eliminado');

    res.json({
      success: true,
      message: 'Google Docs API funciona correctamente con OAuth 2.0',
      documentId: testDoc.documentId,
      deleted: true
    });
  } catch (error) {
    logger.error('Error en test de Google Docs:', error);
    res.status(500).json({
      success: false,
      message: 'Error probando Google Docs API',
      error: error.message
    });
  }
});

/**
 * POST /api/google-oauth/revoke
 * Revoke OAuth access
 */
router.post('/revoke', async (req, res) => {
  try {
    await googleOAuthService.revoke();
    res.json({
      success: true,
      message: 'Acceso revocado exitosamente'
    });
  } catch (error) {
    logger.error('Error revocando acceso:', error);
    res.status(500).json({
      success: false,
      message: 'Error revocando acceso',
      error: error.message
    });
  }
});

module.exports = router;

