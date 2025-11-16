const { google } = require('googleapis');
const logger = require('../utils/logger');

/**
 * Google OAuth 2.0 Service
 * Handles OAuth 2.0 authentication flow for Google Docs API
 */
class GoogleOAuthService {
  constructor() {
    this.oAuth2Client = null;
    this.tokens = null;
    this.initialized = false;
  }

  /**
   * Initialize OAuth 2.0 client
   */
  initialize() {
    try {
      // If already initialized and has tokens, don't reinitialize
      if (this.initialized && this.tokens) {
        return true;
      }

      // OAuth 2.0 credentials from environment
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 
                        `${process.env.FRONTEND_URL || 'http://localhost:3006'}/api/google-oauth/callback`;

      if (!clientId || !clientSecret) {
        logger.warn('⚠️ Google OAuth credentials not found. OAuth features will be disabled.');
        return false;
      }

      this.oAuth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      // Restore tokens if they exist
      if (this.tokens) {
        this.oAuth2Client.setCredentials(this.tokens);
      }

      this.initialized = true;
      logger.info('✅ Google OAuth 2.0 client inicializado');
      return true;
    } catch (error) {
      logger.error('❌ Error inicializando Google OAuth:', error);
      return false;
    }
  }

  /**
   * Get authorization URL
   */
  getAuthUrl() {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google OAuth no está inicializado');
    }

    const scopes = [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive'
    ];

    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: scopes,
      prompt: 'consent' // Force consent screen to get refresh token
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code) {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google OAuth no está inicializado');
    }

    try {
      const { tokens } = await this.oAuth2Client.getToken(code);
      this.oAuth2Client.setCredentials(tokens);
      this.tokens = tokens;
      
      logger.info('✅ Tokens de OAuth obtenidos exitosamente');
      logger.info(`   Access token: ${tokens.access_token ? '✅ Presente' : '❌ Ausente'}`);
      logger.info(`   Refresh token: ${tokens.refresh_token ? '✅ Presente' : '❌ Ausente'}`);
      logger.info(`   Expiry date: ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'N/A'}`);
      
      return tokens;
    } catch (error) {
      logger.error('❌ Error obteniendo tokens:', error);
      throw error;
    }
  }

  /**
   * Set tokens (for restoring from storage)
   */
  setTokens(tokens) {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google OAuth no está inicializado');
    }

    this.tokens = tokens;
    this.oAuth2Client.setCredentials(tokens);
  }

  /**
   * Get authenticated client
   */
  getAuthenticatedClient() {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.initialized || !this.tokens) {
      return null;
    }

    // Refresh token if needed
    if (this.oAuth2Client.isTokenExpiring()) {
      logger.info('🔄 Token expirando, refrescando...');
      this.oAuth2Client.refreshAccessToken()
        .then(({ credentials }) => {
          this.tokens = credentials;
          logger.info('✅ Token refrescado');
        })
        .catch(error => {
          logger.error('❌ Error refrescando token:', error);
          this.tokens = null;
        });
    }

    return this.oAuth2Client;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.initialized && this.tokens !== null;
  }

  /**
   * Revoke access and clear tokens
   */
  async revoke() {
    if (this.tokens && this.tokens.access_token) {
      try {
        await this.oAuth2Client.revokeCredentials();
        logger.info('✅ Acceso revocado');
      } catch (error) {
        logger.error('❌ Error revocando acceso:', error);
      }
    }
    
    this.tokens = null;
    this.oAuth2Client = null;
  }
}

// Export singleton instance
const googleOAuthService = new GoogleOAuthService();

module.exports = googleOAuthService;

