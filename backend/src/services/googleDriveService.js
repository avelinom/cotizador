const { google } = require('googleapis');
const logger = require('../utils/logger');
const googleOAuthService = require('./googleOAuthService');

/**
 * Google Drive Service
 * Handles file/folder operations in Google Drive
 */
class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.initialized = false;
  }

  /**
   * Initialize Google Drive API
   */
  async initialize() {
    try {
      // Try OAuth first
      if (googleOAuthService.isAuthenticated()) {
        const oauthClient = googleOAuthService.getAuthenticatedClient();
        if (oauthClient) {
          this.drive = google.drive({ version: 'v3', auth: oauthClient });
          this.initialized = true;
          logger.info('✅ Google Drive Service inicializado con OAuth 2.0');
          return true;
        }
      }

      // Fallback to Service Account
      const { googleDocsService } = require('./googleDocsService');
      await googleDocsService.initialize();
      if (googleDocsService.drive) {
        this.drive = googleDocsService.drive;
        this.initialized = true;
        logger.info('✅ Google Drive Service inicializado con Service Account');
        return true;
      }

      logger.warn('⚠️ Google Drive Service no se pudo inicializar');
      return false;
    } catch (error) {
      logger.error('❌ Error inicializando Google Drive Service:', error);
      return false;
    }
  }

  /**
   * List files in a folder
   */
  async listFilesInFolder(folderId, mimeType = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive Service no está inicializado');
    }

    try {
      const query = `'${folderId}' in parents and trashed=false${mimeType ? ` and mimeType='${mimeType}'` : ''}`;
      
      logger.info(`🔍 Buscando archivos en carpeta ${folderId} con query: ${query}`);
      
      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, modifiedTime, createdTime, webViewLink)',
        orderBy: 'name',
        pageSize: 100
      });

      const files = response.data.files || [];
      logger.info(`✅ Se encontraron ${files.length} archivos en la carpeta ${folderId}`);
      
      if (files.length === 0) {
        logger.warn(`⚠️ No se encontraron archivos en la carpeta ${folderId}. Verifica que el folder ID sea correcto y que tenga archivos.`);
      }

      return files;
    } catch (error) {
      logger.error(`❌ Error listando archivos en carpeta ${folderId}:`, error);
      logger.error(`   Error details:`, {
        message: error.message,
        code: error.code,
        errors: error.errors
      });
      throw error;
    }
  }

  /**
   * List only Google Docs files in a folder
   */
  async listGoogleDocsInFolder(folderId) {
    return await this.listFilesInFolder(folderId, 'application/vnd.google-apps.document');
  }

  /**
   * Get folder by name (searches in root or specified parent)
   */
  async findFolderByName(folderName, parentFolderId = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive Service no está inicializado');
    }

    try {
      let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      
      if (parentFolderId) {
        query += ` and '${parentFolderId}' in parents`;
      }

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, webViewLink)'
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0];
      }

      return null;
    } catch (error) {
      logger.error(`❌ Error buscando carpeta ${folderName}:`, error);
      throw error;
    }
  }

  /**
   * Create folder if it doesn't exist
   */
  async createFolder(folderName, parentFolderId = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive Service no está inicializado');
    }

    try {
      // Check if folder already exists
      const existingFolder = await this.findFolderByName(folderName, parentFolderId);
      if (existingFolder) {
        logger.info(`📁 Carpeta ${folderName} ya existe: ${existingFolder.id}`);
        return existingFolder;
      }

      const requestBody = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      if (parentFolderId) {
        requestBody.parents = [parentFolderId];
      }

      const response = await this.drive.files.create({
        requestBody: requestBody,
        fields: 'id, name, webViewLink'
      });

      logger.info(`✅ Carpeta creada: ${folderName} (${response.data.id})`);
      return response.data;
    } catch (error) {
      logger.error(`❌ Error creando carpeta ${folderName}:`, error);
      throw error;
    }
  }

  /**
   * Copy a Google Doc
   */
  async copyDocument(documentId, newName, destinationFolderId = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive Service no está inicializado');
    }

    try {
      const response = await this.drive.files.copy({
        fileId: documentId,
        requestBody: {
          name: newName
        },
        fields: 'id, name, webViewLink'
      });

      // Move to destination folder if specified
      if (destinationFolderId) {
        // First, get the file's current parents
        const file = await this.drive.files.get({
          fileId: response.data.id,
          fields: 'parents'
        });
        
        // Remove from all current parents and add to destination folder
        await this.drive.files.update({
          fileId: response.data.id,
          addParents: destinationFolderId,
          removeParents: file.data.parents ? file.data.parents.join(',') : undefined,
          fields: 'id, name, webViewLink'
        });
      }

      logger.info(`✅ Documento copiado: ${newName} (${response.data.id})`);
      return response.data;
    } catch (error) {
      logger.error(`❌ Error copiando documento ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Get document content as text (for merging sections)
   */
  async getDocumentText(documentId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive Service no está inicializado');
    }

    try {
      const googleDocsService = require('./googleDocsService');
      await googleDocsService.initialize();
      
      const docData = await googleDocsService.getDocumentContent(documentId);
      return googleDocsService.extractTextFromDocument(docData);
    } catch (error) {
      logger.error(`❌ Error obteniendo texto del documento ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Merge sections from static and dynamic documents into a new document
   * Uses copy and insert operations to preserve formatting
   */
  async mergeSections(staticDocId, dynamicDocId, outputName, destinationFolderId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive Service no está inicializado');
    }

    try {
      const googleDocsService = require('./googleDocsService');
      await googleDocsService.initialize();

      // Get both documents
      const staticDoc = await googleDocsService.getDocumentContent(staticDocId);
      const dynamicDoc = await googleDocsService.getDocumentContent(dynamicDocId);

      // Extract sections from both documents
      const staticSections = this.extractSections(staticDoc);
      const dynamicSections = this.extractSections(dynamicDoc);

      logger.info(`📊 Secciones estáticas: ${staticSections.length}, dinámicas: ${dynamicSections.length}`);

      // Merge sections respecting order
      const mergedSections = this.mergeSectionsByOrder(staticSections, dynamicSections);

      // Use dynamic document as base (it's already formatted)
      const baseDoc = await this.copyDocument(dynamicDocId, outputName, destinationFolderId);
      
      // Clear the base document content (keep formatting)
      const baseDocContent = await googleDocsService.getDocumentContent(baseDoc.id);
      const endIndex = baseDocContent.body.content.length > 0
        ? baseDocContent.body.content[baseDocContent.body.content.length - 1].endIndex - 1
        : 1;

      // Delete existing content
      if (endIndex > 1) {
        await googleDocsService.batchUpdate(baseDoc.id, [{
          deleteContentRange: {
            range: {
              startIndex: 1,
              endIndex: endIndex
            }
          }
        }]);
      }

      // Insert merged sections
      let insertionIndex = 1;
      for (const section of mergedSections) {
        await googleDocsService.insertText(baseDoc.id, insertionIndex, section.content);
        // Update insertion index (approximate)
        insertionIndex += section.content.length;
      }

      logger.info(`✅ Secciones fusionadas en documento: ${baseDoc.id}`);
      return {
        documentId: baseDoc.id,
        name: baseDoc.name,
        webViewLink: baseDoc.webViewLink
      };
    } catch (error) {
      logger.error('❌ Error fusionando secciones:', error);
      throw error;
    }
  }

  /**
   * Extract sections from a Google Doc
   * Sections are identified by numbered titles (1., 2., etc.)
   * Preserves full content including formatting
   */
  extractSections(docData) {
    const sections = [];
    let currentSection = null;

    if (!docData.body || !docData.body.content) {
      return sections;
    }

    for (const element of docData.body.content) {
      if (element.paragraph) {
        const text = this.extractTextFromParagraph(element.paragraph);
        const trimmedText = text.trim();

        // Check if this is a section title (starts with number)
        // Pattern: "1.", "1. ", "1. Título", etc.
        const sectionMatch = trimmedText.match(/^(\d+)\.\s*(.+)$/);
        
        if (sectionMatch) {
          // Save previous section
          if (currentSection) {
            sections.push(currentSection);
          }

          // Start new section
          const order = parseInt(sectionMatch[1]);
          // Clean title to remove any classification labels
          const rawTitle = sectionMatch[2].trim();
          const cleanedTitle = this.cleanSectionContent(rawTitle);
          const title = cleanedTitle || `Sección ${order}`;
          
          // Clean the initial content line
          const cleanedText = this.cleanSectionContent(text);
          
          currentSection = {
            order: order,
            title: title,
            content: cleanedText + '\n',
            startIndex: element.startIndex || null
          };
        } else if (currentSection) {
          // Add to current section (clean content to remove labels)
          const cleanedText = this.cleanSectionContent(text);
          currentSection.content += cleanedText + '\n';
        } else {
          // Content before first section - add to a default section
          if (sections.length === 0 && trimmedText.length > 0) {
            const cleanedText = this.cleanSectionContent(text);
            currentSection = {
              order: 0,
              title: 'Introducción',
              content: cleanedText + '\n',
              startIndex: element.startIndex || null
            };
          }
        }
      } else if (element.table && currentSection) {
        // Handle tables - add marker for table
        currentSection.content += '[TABLA]\n';
      }
    }

    // Add last section
    if (currentSection) {
      sections.push(currentSection);
    }

    // Sort by order
    sections.sort((a, b) => a.order - b.order);

    logger.info(`📋 Secciones extraídas: ${sections.length}`);
    return sections;
  }

  /**
   * Extract text from a paragraph element
   */
  extractTextFromParagraph(paragraph) {
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
  }

  /**
   * Clean section content by removing classification labels
   * Removes: "(Dinámico)", "[DINÁMICO]", "[ESTÁTICO]", "(Estático)", etc.
   */
  cleanSectionContent(content) {
    if (!content || typeof content !== 'string') {
      return content;
    }

    // Remove various forms of classification labels
    let cleaned = content
      // Remove (Dinámico) or (Dinamico) with or without spaces
      .replace(/\s*\(Dinámico\)\s*/gi, ' ')
      .replace(/\s*\(Dinamico\)\s*/gi, ' ')
      // Remove [DINÁMICO] or [DINAMICO] with or without spaces
      .replace(/\s*\[DINÁMICO\]\s*/gi, ' ')
      .replace(/\s*\[DINAMICO\]\s*/gi, ' ')
      // Remove [ESTÁTICO] or [ESTATICO] with or without spaces
      .replace(/\s*\[ESTÁTICO\]\s*/gi, ' ')
      .replace(/\s*\[ESTATICO\]\s*/gi, ' ')
      // Remove (Estático) or (Estatico) with or without spaces
      .replace(/\s*\(Estático\)\s*/gi, ' ')
      .replace(/\s*\(Estatico\)\s*/gi, ' ')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }

  /**
   * Merge sections by order
   * Static sections and dynamic sections are merged respecting numerical order
   * If same order number exists in both, dynamic takes precedence
   */
  mergeSectionsByOrder(staticSections, dynamicSections) {
    // Create a map to handle duplicates (dynamic takes precedence)
    const sectionMap = new Map();

    // Add static sections first
    for (const section of staticSections) {
      sectionMap.set(section.order, { ...section, source: 'static' });
    }

    // Add/override with dynamic sections
    for (const section of dynamicSections) {
      sectionMap.set(section.order, { ...section, source: 'dynamic' });
    }

    // Convert to array and sort by order
    const merged = Array.from(sectionMap.values());
    merged.sort((a, b) => a.order - b.order);

    logger.info(`🔄 Secciones fusionadas: ${merged.length} (${staticSections.length} estáticas, ${dynamicSections.length} dinámicas)`);
    return merged;
  }

  /**
   * Get or create "Propuestas no terminadas" folder
   * Uses fixed folder ID: 1nLLV-UogyP40ujepcWnl-Um6DYbqdR8E
   * @param {string} baseFolderId - Optional base folder ID (if null, uses fixed ID)
   */
  async getOrCreateInProgressFolder(baseFolderId = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Use fixed folder ID if provided, otherwise use the default
    const FIXED_FOLDER_ID = '1nLLV-UogyP40ujepcWnl-Um6DYbqdR8E';
    const targetFolderId = baseFolderId || FIXED_FOLDER_ID;

    try {
      // Try to get the folder by ID first
      const folderInfo = await this.drive.files.get({
        fileId: targetFolderId,
        fields: 'id, name'
      });
      logger.info(`✅ Carpeta "Propuestas no terminadas" encontrada por ID: ${folderInfo.data.id}`);
      return { id: folderInfo.data.id, name: folderInfo.data.name };
    } catch (err) {
      // If folder doesn't exist by ID, try to find by name
      logger.warn(`⚠️ Carpeta con ID ${targetFolderId} no encontrada, buscando por nombre...`);
      const folderName = 'Propuestas no terminadas';
      let folder = await this.findFolderByName(folderName, null);
      
      if (!folder) {
        folder = await this.createFolder(folderName, null);
        logger.info(`✅ Carpeta "Propuestas no terminadas" creada: ${folder.id}`);
      } else {
        logger.info(`✅ Carpeta "Propuestas no terminadas" encontrada por nombre: ${folder.id}`);
      }
      
      return folder;
    }
  }

  /**
   * Get or create "Propuestas terminadas" folder
   * Uses fixed folder ID: 1z8fSDokMXV8XlHiV2rCDwSrv6-pxedeK
   * @param {string} baseFolderId - Optional base folder ID (if null, uses fixed ID)
   */
  async getOrCreateCompletedFolder(baseFolderId = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Use fixed folder ID if provided, otherwise use the default
    const FIXED_FOLDER_ID = '1z8fSDokMXV8XlHiV2rCDwSrv6-pxedeK';
    const targetFolderId = baseFolderId || FIXED_FOLDER_ID;

    try {
      // Try to get the folder by ID first
      const folderInfo = await this.drive.files.get({
        fileId: targetFolderId,
        fields: 'id, name'
      });
      logger.info(`✅ Carpeta "Propuestas terminadas" encontrada por ID: ${folderInfo.data.id}`);
      return { id: folderInfo.data.id, name: folderInfo.data.name };
    } catch (err) {
      // If folder doesn't exist by ID, try to find by name
      logger.warn(`⚠️ Carpeta con ID ${targetFolderId} no encontrada, buscando por nombre...`);
      const folderName = 'Propuestas terminadas';
      let folder = await this.findFolderByName(folderName, null);
      
      if (!folder) {
        folder = await this.createFolder(folderName, null);
        logger.info(`✅ Carpeta "Propuestas terminadas" creada: ${folder.id}`);
      } else {
        logger.info(`✅ Carpeta "Propuestas terminadas" encontrada por nombre: ${folder.id}`);
      }
      
      return folder;
    }
  }

  /**
   * Get or create client folder inside "Propuestas terminadas"
   * @param {string} clientName - Client name
   * @param {string} baseFolderId - Optional base folder ID for "Propuestas terminadas"
   */
  async getOrCreateClientFolder(clientName, baseFolderId = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    // First get or create "Propuestas terminadas"
    const completedFolder = await this.getOrCreateCompletedFolder(baseFolderId);
    
    // Then get or create client folder inside it
    let clientFolder = await this.findFolderByName(clientName, completedFolder.id);
    
    if (!clientFolder) {
      clientFolder = await this.createFolder(clientName, completedFolder.id);
    }
    
    return clientFolder;
  }

  /**
   * Move a document from one folder to another
   * @param {string} documentId - Google Doc ID
   * @param {string} fromFolderId - Source folder ID
   * @param {string} toFolderId - Destination folder ID
   */
  async moveDocument(documentId, fromFolderId, toFolderId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive Service no está inicializado');
    }

    try {
      // Remove from old folder and add to new folder
      await this.drive.files.update({
        fileId: documentId,
        addParents: toFolderId,
        removeParents: fromFolderId,
        fields: 'id, name, webViewLink'
      });

      logger.info(`✅ Documento ${documentId} movido de ${fromFolderId} a ${toFolderId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Error moviendo documento ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Update dynamic sections in a Google Doc
   * Replaces content of dynamic sections while preserving static sections
   * @param {string} documentId - Google Doc ID
   * @param {Array} dynamicSections - Array of {order, title, content} objects
   */
  async updateDynamicSections(documentId, dynamicSections) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive Service no está inicializado');
    }

    try {
      const googleDocsService = require('./googleDocsService');
      await googleDocsService.initialize();

      // Get current document content
      const docData = await googleDocsService.getDocumentContent(documentId);
      
      // Extract all sections
      const allSections = this.extractSections(docData);
      
      // Identify which sections are dynamic (by matching order with provided dynamicSections)
      const dynamicOrders = new Set(dynamicSections.map(s => s.order));
      
      // Build update requests
      const requests = [];
      
      // Process sections one by one (not in batch) to avoid index shifting issues
      // Process in NORMAL order (0, 1, 2...) so that earlier sections don't affect later ones
      const sortedDynamicSections = [...dynamicSections].sort((a, b) => a.order - b.order);
      
      logger.info(`📝 Procesando ${sortedDynamicSections.length} secciones dinámicas para actualizar...`);
      logger.info(`   Orden de procesamiento: ${sortedDynamicSections.map(s => s.order).join(', ')}`);
      
      for (const dynamicSection of sortedDynamicSections) {
        logger.info(`  🔍 Procesando sección ${dynamicSection.order}: "${dynamicSection.title}"`);
        
        const existingSection = allSections.find(s => s.order === dynamicSection.order);
        
        if (!existingSection) {
          logger.warn(`  ⚠️ Sección ${dynamicSection.order} no encontrada. Secciones disponibles: ${allSections.map(s => s.order).join(', ')}`);
          continue;
        }
        
        if (existingSection.startIndex === null || existingSection.startIndex === undefined) {
          logger.warn(`  ⚠️ Sección ${dynamicSection.order} sin startIndex`);
          continue;
        }
        
        logger.info(`  ✅ Sección ${dynamicSection.order} encontrada con startIndex: ${existingSection.startIndex}`);
        
        // Find the paragraph that contains the section startIndex
        // This works the same for section 0 and numbered sections
        let insertIndex = existingSection.startIndex;
        let sectionStartIndex = existingSection.startIndex;
        let sectionEndIndex = docData.body.content.length > 0 
          ? docData.body.content[docData.body.content.length - 1].endIndex 
          : existingSection.startIndex + 1000;
        
        // Find the exact paragraph that starts at or near startIndex
        let foundParagraph = false;
        for (const element of docData.body.content) {
          if (element.paragraph) {
            const elementStart = element.startIndex || 0;
            const elementEnd = element.endIndex || elementStart;
            
            // Check if this is the paragraph we're looking for (with tolerance)
            if (Math.abs(elementStart - existingSection.startIndex) <= 10) {
              // For numbered sections, insert after the title paragraph
              // For section 0, insert at the start of the first content paragraph
              insertIndex = elementEnd;
              sectionStartIndex = elementStart;
              foundParagraph = true;
              logger.info(`  📍 Párrafo de sección encontrado: start=${elementStart}, end=${elementEnd}, insertIndex=${insertIndex}`);
              break;
            }
          }
        }
        
        if (!foundParagraph) {
          logger.warn(`  ⚠️ No se encontró el párrafo exacto para sección ${dynamicSection.order}, usando startIndex como insertIndex`);
          // Fallback: use startIndex + estimated title length
          insertIndex = existingSection.startIndex + (dynamicSection.title?.length || 20) + 5;
        }
        
        // Find where this section ends (start of next section)
        const nextSection = allSections.find(s => s.order > dynamicSection.order);
        if (nextSection && nextSection.startIndex !== null) {
          // Find the paragraph that contains the next section's startIndex
          for (const element of docData.body.content) {
            if (element.paragraph) {
              const elementStart = element.startIndex || 0;
              if (Math.abs(elementStart - nextSection.startIndex) <= 10) {
                sectionEndIndex = elementStart;
                logger.info(`  📍 Siguiente sección (${nextSection.order}) encontrada en índice: ${sectionEndIndex}`);
                break;
              }
            }
          }
        } else {
          logger.info(`  📍 No hay siguiente sección, usando final del documento: ${sectionEndIndex}`);
        }
        
        // Delete old content (from after title/content start until next section)
        // Make sure we don't delete the title itself
        if (sectionEndIndex > insertIndex) {
          logger.info(`  🗑️ Eliminando contenido viejo de sección ${dynamicSection.order}:`);
          logger.info(`     Desde índice ${insertIndex} hasta ${sectionEndIndex - 1} (${sectionEndIndex - insertIndex} caracteres)`);
          requests.push({
            deleteContentRange: {
              range: {
                startIndex: insertIndex,
                endIndex: sectionEndIndex - 1
              }
            }
          });
        } else {
          logger.warn(`  ⚠️ sectionEndIndex (${sectionEndIndex}) <= insertIndex (${insertIndex}), no se eliminará contenido`);
          logger.warn(`     Esto puede causar que el contenido se inserte en el lugar incorrecto`);
        }
        
        // Insert new content at insertIndex (after delete, this will be the correct position)
        if (dynamicSection.content && dynamicSection.content.trim()) {
          const contentToInsert = dynamicSection.content.trim() + '\n';
          logger.info(`  ✏️ Insertando contenido de sección ${dynamicSection.order} en índice ${insertIndex}:`);
          logger.info(`     Longitud: ${contentToInsert.length} caracteres`);
          logger.info(`     Preview: "${contentToInsert.substring(0, 50)}${contentToInsert.length > 50 ? '...' : ''}"`);
          logger.info(`     Título de sección: "${dynamicSection.title}"`);
          requests.push({
            insertText: {
              location: {
                index: insertIndex
              },
              text: contentToInsert
            }
          });
        } else {
          logger.warn(`  ⚠️ Sección ${dynamicSection.order} tiene contenido vacío, no se insertará nada`);
        }
        
        // Execute batch update for this section immediately to avoid index shifting
        if (requests.length > 0) {
          try {
            logger.info(`  📤 Ejecutando batch update con ${requests.length} requests para sección ${dynamicSection.order}`);
            logger.info(`     Requests:`, JSON.stringify(requests, null, 2));
            
            const batchResult = await googleDocsService.batchUpdate(documentId, requests);
            logger.info(`  ✅ Batch update completado para sección ${dynamicSection.order}`);
            logger.info(`     Resultado:`, batchResult ? 'OK' : 'Sin respuesta');
            
            requests.length = 0; // Clear requests for next section
            
            // Wait a bit for Google Docs to process the update
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Re-fetch document to get updated indices for next sections
            // This is critical: after inserting content, all subsequent section indices shift
            logger.info(`  🔄 Re-obteniendo documento para actualizar índices...`);
            const updatedDocData = await googleDocsService.getDocumentContent(documentId);
            const updatedSections = this.extractSections(updatedDocData);
            logger.info(`  📋 Secciones actualizadas: ${updatedSections.length} encontradas`);
            
            // Update allSections with new indices for ALL remaining sections (not just the ones we haven't processed)
            // This ensures that when we process the next section, we use the correct, updated indices
            for (let i = 0; i < allSections.length; i++) {
              const updated = updatedSections.find(s => s.order === allSections[i].order);
              if (updated && updated.startIndex !== null) {
                const oldIndex = allSections[i].startIndex;
                allSections[i].startIndex = updated.startIndex;
                if (oldIndex !== updated.startIndex) {
                  logger.info(`  📍 Sección ${allSections[i].order}: índice actualizado de ${oldIndex} a ${updated.startIndex}`);
                }
              } else {
                logger.warn(`  ⚠️ Sección ${allSections[i].order} no encontrada en documento actualizado`);
              }
            }
            
            // Update docData for next iteration - CRITICAL: use the fresh document data
            docData = updatedDocData;
          } catch (error) {
            logger.error(`  ❌ Error actualizando sección ${dynamicSection.order}:`, error);
            logger.error(`     Stack:`, error.stack);
            requests.length = 0; // Clear requests even on error
            throw error; // Re-throw to stop processing
          }
        } else {
          logger.warn(`  ⚠️ No hay requests para ejecutar para sección ${dynamicSection.order}`);
        }
      }
      
      logger.info(`✅ Todas las secciones dinámicas procesadas en documento ${documentId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Error actualizando secciones dinámicas en ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Merge sections from static and dynamic documents, keeping dynamic sections empty
   * Creates a new document with static sections complete and dynamic sections empty
   * @param {Array} templateSections - Optional array of template sections with isStatic/isDynamic flags
   */
  async mergeSectionsWithEmptyDynamic(staticDocId, dynamicDocId, outputName, destinationFolderId, templateSections = []) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive Service no está inicializado');
    }

    try {
      const googleDocsService = require('./googleDocsService');
      await googleDocsService.initialize();

      // Get both documents
      const staticDoc = await googleDocsService.getDocumentContent(staticDocId);
      const dynamicDoc = await googleDocsService.getDocumentContent(dynamicDocId);

      // Extract sections from both documents
      const staticSections = this.extractSections(staticDoc);
      const dynamicSections = this.extractSections(dynamicDoc);

      logger.info(`📊 Secciones estáticas: ${staticSections.length}, dinámicas: ${dynamicSections.length}`);

      // Create a map of template sections by order to identify which are dynamic
      const templateSectionMap = new Map();
      if (templateSections && templateSections.length > 0) {
        for (const templateSection of templateSections) {
          templateSectionMap.set(templateSection.order, templateSection);
        }
        logger.info(`📋 Usando ${templateSectionMap.size} secciones del template para identificar dinámicas`);
      }

      // Create merged sections: static sections with full content, dynamic sections with empty content
      const mergedSections = [];
      
      // Add all static sections with their content
      for (const staticSection of staticSections) {
        // Check template to see if this section is marked as dynamic
        const templateSection = templateSectionMap.get(staticSection.order);
        const isDynamic = templateSection ? (templateSection.isDynamic || !templateSection.isStatic) : false;
        
        // Clean content to remove classification labels
        const cleanedContent = this.cleanSectionContent(staticSection.content);
        const cleanedTitle = this.cleanSectionContent(staticSection.title);
        
        mergedSections.push({
          order: staticSection.order,
          title: cleanedTitle,
          content: cleanedContent,
          isStatic: !isDynamic // If marked as dynamic in template, it's not static
        });
      }
      
      // Add dynamic sections with empty content (keep structure)
      for (const dynamicSection of dynamicSections) {
        // Check if we already have a section with this order (from static)
        const existing = mergedSections.find(s => s.order === dynamicSection.order);
        if (!existing) {
          // Check template to confirm this is dynamic
          const templateSection = templateSectionMap.get(dynamicSection.order);
          const isDynamic = templateSection ? (templateSection.isDynamic || !templateSection.isStatic) : true; // Default to dynamic if not in template
          
          // Clean title to remove classification labels
          const cleanedTitle = this.cleanSectionContent(dynamicSection.title);
          
          // Add dynamic section with empty content
          mergedSections.push({
            order: dynamicSection.order,
            title: cleanedTitle,
            content: '', // Empty content for dynamic sections
            isStatic: !isDynamic
          });
        } else {
          // Update existing section if template says it's dynamic
          const templateSection = templateSectionMap.get(dynamicSection.order);
          if (templateSection && (templateSection.isDynamic || !templateSection.isStatic)) {
            existing.isStatic = false;
            existing.content = ''; // Clear content for dynamic sections
            // Also clean the title if it has labels
            existing.title = this.cleanSectionContent(existing.title);
          }
        }
      }
      
      // Sort by order
      mergedSections.sort((a, b) => a.order - b.order);

      // Use dynamic document as base (it's already formatted)
      const baseDoc = await this.copyDocument(dynamicDocId, outputName, destinationFolderId);
      
      // Clear the base document content (keep formatting)
      const baseDocContent = await googleDocsService.getDocumentContent(baseDoc.id);
      const endIndex = baseDocContent.body.content.length > 0
        ? baseDocContent.body.content[baseDocContent.body.content.length - 1].endIndex - 1
        : 1;

      // Delete existing content
      if (endIndex > 1) {
        await googleDocsService.batchUpdate(baseDoc.id, [{
          deleteContentRange: {
            range: {
              startIndex: 1,
              endIndex: endIndex
            }
          }
        }]);
      }

      // Insert merged sections (static with content, dynamic empty)
      let insertionIndex = 1;
      for (const section of mergedSections) {
        // Insert section title
        const titleText = `${section.order}. ${section.title}\n`;
        await googleDocsService.insertText(baseDoc.id, insertionIndex, titleText);
        insertionIndex += titleText.length;
        
        // Insert section content (empty for dynamic sections)
        if (section.content) {
          await googleDocsService.insertText(baseDoc.id, insertionIndex, section.content);
          insertionIndex += section.content.length;
        }
      }

      logger.info(`✅ Secciones fusionadas (dinámicas vacías) en documento: ${baseDoc.id}`);
      return {
        documentId: baseDoc.id,
        name: baseDoc.name,
        webViewLink: baseDoc.webViewLink,
        sections: mergedSections // Return sections info for frontend
      };
    } catch (error) {
      logger.error('❌ Error fusionando secciones con dinámicas vacías:', error);
      throw error;
    }
  }

  /**
   * Export Google Doc to PDF and save to folder
   */
  async exportToPDF(documentId, pdfName, destinationFolderId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Google Drive Service no está inicializado');
    }

    try {
      // Export as PDF
      const response = await this.drive.files.export({
        fileId: documentId,
        mimeType: 'application/pdf'
      }, {
        responseType: 'stream'
      });

      // Upload PDF to destination folder
      const fileMetadata = {
        name: pdfName,
        parents: destinationFolderId ? [destinationFolderId] : []
      };

      const media = {
        mimeType: 'application/pdf',
        body: response.data
      };

      const pdfFile = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink'
      });

      logger.info(`✅ PDF exportado: ${pdfName} (${pdfFile.data.id})`);
      return pdfFile.data;
    } catch (error) {
      logger.error(`❌ Error exportando PDF de ${documentId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
const googleDriveService = new GoogleDriveService();

module.exports = googleDriveService;

