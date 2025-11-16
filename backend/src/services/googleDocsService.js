const { google } = require('googleapis');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const googleOAuthService = require('./googleOAuthService');

/**
 * Google Docs Service
 * Handles creation, modification, and export of Google Docs documents
 */
class GoogleDocsService {
  constructor() {
    this.docs = null;
    this.drive = null;
    this.initialized = false;
  }

  /**
   * Initialize Google APIs with service account or OAuth credentials
   */
  async initialize() {
    try {
      // Try OAuth first (if user has authenticated)
      if (googleOAuthService.isAuthenticated()) {
        const oauthClient = googleOAuthService.getAuthenticatedClient();
        if (oauthClient) {
          this.docs = google.docs({ version: 'v1', auth: oauthClient });
          this.drive = google.drive({ version: 'v3', auth: oauthClient });
          this.initialized = true;
          logger.info('✅ Google Docs API inicializada con OAuth 2.0');
          return true;
        }
      }

      // Fallback to Service Account
      logger.info('🔧 Intentando inicializar con Service Account...');
      const credentials = this.getCredentialsFromEnv();
      
      if (!credentials) {
        logger.warn('⚠️ Google Docs API credentials not found. Google Docs features will be disabled.');
        logger.info('💡 Tip: Configura OAuth 2.0 o Service Account para habilitar Google Docs');
        logger.info('   Verifica que GOOGLE_PRIVATE_KEY y GOOGLE_CLIENT_EMAIL estén configurados en .env');
        return false;
      }

      logger.info(`✅ Credenciales encontradas para: ${credentials.client_email}`);

      // Create auth client with Service Account
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive'
        ]
      });

      const authClient = await auth.getClient();
      logger.info('✅ Cliente de autenticación creado con Service Account');

      // Initialize APIs
      this.docs = google.docs({ version: 'v1', auth: authClient });
      this.drive = google.drive({ version: 'v3', auth: authClient });
      this.initialized = true;

      logger.info('✅ Google Docs API inicializada con Service Account');
      return true;
    } catch (error) {
      logger.error('❌ Error inicializando Google Docs API:', error);
      logger.error('   Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      return false;
    }
  }

  /**
   * Get credentials from environment variables
   */
  getCredentialsFromEnv() {
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    
    // Debug logging
    if (!privateKeyRaw) {
      logger.warn('⚠️ GOOGLE_PRIVATE_KEY no está definido en las variables de entorno');
      return null;
    }
    
    if (!clientEmail) {
      logger.warn('⚠️ GOOGLE_CLIENT_EMAIL no está definido en las variables de entorno');
      return null;
    }
    
    // Replace escaped newlines with actual newlines
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
    
    // Verify the private key looks valid (should start with BEGIN PRIVATE KEY)
    if (!privateKey.includes('BEGIN PRIVATE KEY') && !privateKey.includes('BEGIN RSA PRIVATE KEY')) {
      logger.warn('⚠️ GOOGLE_PRIVATE_KEY no parece ser una clave privada válida');
      return null;
    }

    logger.info(`✅ Credenciales encontradas: ${clientEmail}`);
    
    return {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID || '',
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID || '',
      private_key: privateKey,
      client_email: clientEmail,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL || ''
    };
  }

  /**
   * Create a new Google Doc
   * Uses Drive API to create document, which has fewer permission restrictions
   */
  async createDocument(title) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Docs API no está inicializada. Verifica las credenciales.');
    }

    try {
      // Try using Drive API first (often has fewer permission issues)
      let document;
      
      try {
        // Create document using Drive API
        const requestBody = {
          name: title,
          mimeType: 'application/vnd.google-apps.document'
        };

        // If folder ID is provided, create document in that folder
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (folderId) {
          requestBody.parents = [folderId];
          logger.info(`📁 Creando documento en carpeta compartida: ${folderId}`);
        }

        const driveResponse = await this.drive.files.create({
          requestBody: requestBody,
          fields: 'id, name, webViewLink',
          supportsAllDrives: true  // Important for shared drives
        });

        document = {
          documentId: driveResponse.data.id,
          title: driveResponse.data.name,
          webViewLink: driveResponse.data.webViewLink
        };

        logger.info(`✅ Documento de Google Docs creado vía Drive API: ${document.documentId}`);
      } catch (driveError) {
        // Fallback to Docs API if Drive API fails
        logger.warn('⚠️ Drive API falló, intentando con Docs API:', driveError.message);
        
        const docsResponse = await this.docs.documents.create({
          requestBody: {
            title: title
          }
        });

        document = docsResponse.data;
        logger.info(`✅ Documento de Google Docs creado vía Docs API: ${document.documentId}`);
      }

      return document;
    } catch (error) {
      logger.error('❌ Error creando documento de Google Docs:', error);
      
      // Provide helpful error message
      if (error.code === 403) {
        throw new Error('Permisos insuficientes. Verifica que la Service Account tenga acceso. Revisa SOLUCIONAR_PERMISOS_GOOGLE.md');
      }
      
      throw error;
    }
  }

  /**
   * Read content from a Google Doc
   */
  async getDocumentContent(documentId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Docs API no está inicializada.');
    }

    try {
      const document = await this.docs.documents.get({
        documentId: documentId
      });

      return document.data;
    } catch (error) {
      logger.error(`❌ Error leyendo documento ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Extract text content from a Google Doc
   */
  extractTextFromDocument(docData) {
    if (!docData.body || !docData.body.content) {
      return '';
    }

    let text = '';
    
    const extractText = (elements) => {
      for (const element of elements) {
        if (element.paragraph) {
          if (element.paragraph.elements) {
            for (const paraElement of element.paragraph.elements) {
              if (paraElement.textRun) {
                text += paraElement.textRun.content || '';
              }
            }
          }
        } else if (element.table) {
          // Handle tables
          for (const row of element.table.tableRows || []) {
            for (const cell of row.tableCells || []) {
              if (cell.content) {
                extractText(cell.content);
              }
            }
          }
        }
      }
    };

    extractText(docData.body.content);
    return text;
  }

  /**
   * Execute batch update requests on a Google Doc
   */
  async batchUpdate(documentId, requests) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Docs API no está inicializada.');
    }

    if (!requests || requests.length === 0) {
      logger.warn(`⚠️ batchUpdate llamado sin requests para documento ${documentId}`);
      return false;
    }

    try {
      logger.info(`📤 Ejecutando batchUpdate en documento ${documentId} con ${requests.length} requests`);
      
      const response = await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests
        }
      });

      logger.info(`✅ Batch update ejecutado exitosamente en documento ${documentId}`);
      logger.info(`   Response:`, response.data ? 'OK' : 'Sin data');
      
      return true;
    } catch (error) {
      logger.error(`❌ Error ejecutando batch update en documento ${documentId}:`, error);
      logger.error(`   Error details:`, {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Insert text into a Google Doc at a specific index
   */
  async insertText(documentId, index, text, formatting = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Docs API no está inicializada.');
    }

    try {
      const requests = [{
        insertText: {
          location: {
            index: index
          },
          text: text
        }
      }];

      // Apply formatting if provided
      if (Object.keys(formatting).length > 0) {
        requests.push({
          updateTextStyle: {
            range: {
              startIndex: index,
              endIndex: index + text.length
            },
            textStyle: formatting,
            fields: Object.keys(formatting).join(',')
          }
        });
      }

      await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests
        }
      });

      logger.info(`✅ Texto insertado en documento ${documentId} en índice ${index}`);
    } catch (error) {
      logger.error(`❌ Error insertando texto en documento ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Merge two Google Docs: copy content from source to destination
   */
  async mergeDocuments(sourceDocId, destinationDocId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Docs API no está inicializada.');
    }

    try {
      // Get source document content
      const sourceDoc = await this.getDocumentContent(sourceDocId);
      
      // Get destination document to find insertion point
      const destDoc = await this.getDocumentContent(destinationDocId);
      const insertionIndex = destDoc.body.content.length > 0 
        ? destDoc.body.content[destDoc.body.content.length - 1].endIndex - 1
        : 1;

      // Extract and insert content from source
      const requests = [];
      
      // Copy paragraphs from source
      if (sourceDoc.body && sourceDoc.body.content) {
        for (const element of sourceDoc.body.content) {
          if (element.paragraph) {
            // Extract text from paragraph
            let paragraphText = '';
            if (element.paragraph.elements) {
              for (const paraElement of element.paragraph.elements) {
                if (paraElement.textRun) {
                  paragraphText += paraElement.textRun.content || '';
                }
              }
            }

            if (paragraphText.trim()) {
              // Insert text
              requests.push({
                insertText: {
                  location: {
                    index: insertionIndex
                  },
                  text: paragraphText
                }
              });
            }
          } else if (element.table) {
            // Handle tables - insert as formatted text for now
            // TODO: Implement proper table copying
            logger.warn('⚠️ Tablas no se copian automáticamente. Se requiere implementación adicional.');
          }
        }
      }

      if (requests.length > 0) {
        await this.docs.documents.batchUpdate({
          documentId: destinationDocId,
          requestBody: {
            requests: requests
          }
        });

        logger.info(`✅ Contenido copiado de ${sourceDocId} a ${destinationDocId}`);
      }

      return destinationDocId;
    } catch (error) {
      logger.error('❌ Error fusionando documentos:', error);
      throw error;
    }
  }

  /**
   * Create a document from static and dynamic content
   */
  async createMergedDocument(title, staticContent, dynamicContent) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Docs API no está inicializada.');
    }

    try {
      // Create new document
      const doc = await this.createDocument(title);
      const documentId = doc.documentId;

      // Insert static content first
      if (staticContent && staticContent.trim()) {
        await this.insertText(documentId, 1, staticContent + '\n\n');
      }

      // Insert dynamic content
      if (dynamicContent && dynamicContent.trim()) {
        const docData = await this.getDocumentContent(documentId);
        const insertionIndex = docData.body.content.length > 0
          ? docData.body.content[docData.body.content.length - 1].endIndex - 1
          : 1;
        
        await this.insertText(documentId, insertionIndex, dynamicContent);
      }

      logger.info(`✅ Documento fusionado creado: ${documentId}`);
      return doc;
    } catch (error) {
      logger.error('❌ Error creando documento fusionado:', error);
      throw error;
    }
  }

  /**
   * Export Google Doc to Word format
   */
  async exportToWord(documentId, outputPath) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Docs API no está inicializada.');
    }

    try {
      // Export as DOCX
      const response = await this.drive.files.export({
        fileId: documentId,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }, {
        responseType: 'stream'
      });

      // Save to file
      const dest = fs.createWriteStream(outputPath);
      response.data.pipe(dest);

      return new Promise((resolve, reject) => {
        dest.on('finish', () => {
          logger.info(`✅ Documento exportado a Word: ${outputPath}`);
          resolve(outputPath);
        });
        dest.on('error', reject);
      });
    } catch (error) {
      logger.error(`❌ Error exportando documento ${documentId} a Word:`, error);
      throw error;
    }
  }

  /**
   * Export Google Doc to PDF format
   */
  async exportToPDF(documentId, outputPath) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Docs API no está inicializada.');
    }

    try {
      // Export as PDF
      const response = await this.drive.files.export({
        fileId: documentId,
        mimeType: 'application/pdf'
      }, {
        responseType: 'stream'
      });

      // Save to file
      const dest = fs.createWriteStream(outputPath);
      response.data.pipe(dest);

      return new Promise((resolve, reject) => {
        dest.on('finish', () => {
          logger.info(`✅ Documento exportado a PDF: ${outputPath}`);
          resolve(outputPath);
        });
        dest.on('error', reject);
      });
    } catch (error) {
      logger.error(`❌ Error exportando documento ${documentId} a PDF:`, error);
      throw error;
    }
  }

  /**
   * Get shareable link for a document
   */
  async getShareableLink(documentId, makePublic = false) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Docs API no está inicializada.');
    }

    try {
      if (makePublic) {
        // Make document publicly viewable
        await this.drive.permissions.create({
          fileId: documentId,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });
      }

      return `https://docs.google.com/document/d/${documentId}/edit`;
    } catch (error) {
      logger.error(`❌ Error obteniendo enlace compartible para ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a Google Doc
   */
  async deleteDocument(documentId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Docs API no está inicializada.');
    }

    try {
      await this.drive.files.delete({
        fileId: documentId
      });

      logger.info(`✅ Documento ${documentId} eliminado`);
    } catch (error) {
      logger.error(`❌ Error eliminando documento ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Batch update document (for complex operations)
   */
  async batchUpdate(documentId, requests) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Docs API no está inicializada.');
    }

    try {
      const response = await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests
        }
      });

      return response.data;
    } catch (error) {
      logger.error(`❌ Error en batchUpdate del documento ${documentId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
const googleDocsService = new GoogleDocsService();

module.exports = googleDocsService;

