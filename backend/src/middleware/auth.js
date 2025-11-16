const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Middleware to protect routes - verifies JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Also check query parameter (for export endpoints opened in new window)
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado - No se proporcionó token'
      });
    }

    try {
      // Try to verify with cotizador secret first
      let decoded;
      let verified = false;
      
      try {
        decoded = jwt.verify(token, config.jwt.secret);
        verified = true;
      } catch (cotizadorError) {
        // If that fails, try with portal secret (if configured)
        const portalSecret = process.env.CEFIRO_PORTAL_JWT_SECRET;
        if (portalSecret && portalSecret !== config.jwt.secret) {
          try {
            decoded = jwt.verify(token, portalSecret);
            // Map portal user structure to cotizador structure if needed
            if (decoded.role_name) {
              decoded.role = decoded.role_name;
            }
            verified = true;
            logger.info('Token verified with portal secret');
          } catch (portalError) {
            // Continue to throw original error
            logger.debug('Token verification failed with both secrets');
          }
        }
      }
      
      if (!verified || !decoded) {
        return res.status(401).json({
          success: false,
          message: 'No autorizado - Token inválido'
        });
      }
      
      // Attach user info to request
      req.user = decoded;
      next();
    } catch (error) {
      logger.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Token inválido'
      });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en autenticación'
    });
  }
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  const userRole = req.user?.role || req.user?.role_name;
  if (req.user && userRole === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado - Se requieren permisos de administrador'
    });
  }
};

module.exports = {
  protect,
  requireAdmin
};

