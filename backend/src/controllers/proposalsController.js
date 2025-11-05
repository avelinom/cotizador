const db = require('../config/database');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, WidthType } = require('docx');
const PDFDocument = require('pdfkit');

// Configure multer for Word document uploads
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
  // Accept Word documents
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword' // .doc
  ];
  
  if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.docx') || file.originalname.endsWith('.doc')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos Word (.docx, .doc)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

/**
 * Process Word document and extract sections
 */
const processWordDocument = async (filePath) => {
  try {
    // Read the Word document
    const result = await mammoth.extractRawText({ path: filePath });
    const htmlResult = await mammoth.convertToHtml({ path: filePath });
    
    // Extract sections based on headings and paragraphs
    const sections = [];
    const paragraphs = result.value.split('\n\n').filter(p => p.trim());
    
    let currentSection = null;
    let currentContent = [];
    
    paragraphs.forEach((paragraph, index) => {
      const trimmed = paragraph.trim();
      
      // Check if it's a heading (typically short lines or all caps)
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
          content: currentContent.join('\n\n'),
          htmlContent: '', // Will be populated with HTML
          marginTop: 20,
          marginBottom: 20,
          marginLeft: 0,
          marginRight: 0
        });
        currentSection = trimmed;
        currentContent = [];
      } else if (isHeading && !currentSection) {
        // First heading
        currentSection = trimmed;
      } else {
        // Content paragraph
        if (currentSection) {
          currentContent.push(trimmed);
        } else {
          // No section yet, create a default one
          if (sections.length === 0) {
            sections.push({
              id: 1,
              title: 'Introducción',
              content: trimmed,
              htmlContent: '',
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
        content: currentContent.join('\n\n'),
        htmlContent: '',
        marginTop: 20,
        marginBottom: 20,
        marginLeft: 0,
        marginRight: 0
      });
    }
    
    // Process HTML content for each section
    const htmlContent = htmlResult.value;
    // Simple HTML parsing to match sections with HTML
    sections.forEach((section, index) => {
      // For now, use the plain text content
      // In a more sophisticated version, we could parse HTML and match sections
      section.htmlContent = `<p>${section.content.replace(/\n\n/g, '</p><p>')}</p>`;
    });
    
    return {
      sections,
      metadata: {
        margins: {
          top: 72, // 1 inch = 72 points
          bottom: 72,
          left: 72,
          right: 72
        },
        fontSize: 12,
        fontFamily: 'Arial',
        lineSpacing: 1.5
      }
    };
  } catch (error) {
    logger.error('Error processing Word document:', error);
    throw new Error('Error al procesar el documento Word: ' + error.message);
  }
};

/**
 * Get all proposals for authenticated user
 */
const getProposals = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let query = db('proposals')
      .select('proposals.*')
      .orderBy('proposals.created_at', 'desc');
    
    // Non-admin users only see their own proposals
    if (userRole !== 'admin' && userRole !== 'manager') {
      query = query.where('proposals.user_id', userId);
    }
    
    const proposals = await query;
    
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
 * Upload and process Word document
 */
const uploadProposal = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }
    
    const { title, description } = req.body;
    const userId = req.user.id;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'El título es requerido'
      });
    }
    
    // Process the Word document
    const processed = await processWordDocument(req.file.path);
    
    // Save proposal to database
    const [proposal] = await db('proposals').insert({
      title: title || req.file.originalname,
      description: description || null,
      original_filename: req.file.originalname,
      file_path: `/uploads/proposals/${req.file.filename}`,
      user_id: userId,
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
      message: 'Propuesta creada exitosamente',
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
    
    // PostgreSQL JSONB already returns objects
    const sections = typeof proposal.sections === 'string' 
      ? JSON.parse(proposal.sections) 
      : proposal.sections;
    const metadata = typeof proposal.metadata === 'string' 
      ? JSON.parse(proposal.metadata) 
      : proposal.metadata;
    
    // Create Word document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: metadata.margins.top,
                bottom: metadata.margins.bottom,
                left: metadata.margins.left,
                right: metadata.margins.right
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
            ...sections.flatMap(section => [
              new Paragraph({
                text: section.title,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: section.marginTop * 20, after: 200 }
              }),
              new Paragraph({
                text: section.content,
                spacing: { after: section.marginBottom * 20 }
              })
            ])
          ]
        }
      ]
    });
    
    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${proposal.title.replace(/[^a-z0-9]/gi, '_')}.docx"`);
    
    res.send(buffer);
  } catch (error) {
    logger.error('Error exporting to Word:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar a Word',
      error: error.message
    });
  }
};

/**
 * Export proposal to PDF
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
    
    // PostgreSQL JSONB already returns objects
    const sections = typeof proposal.sections === 'string' 
      ? JSON.parse(proposal.sections) 
      : proposal.sections;
    const metadata = typeof proposal.metadata === 'string' 
      ? JSON.parse(proposal.metadata) 
      : proposal.metadata;
    
    // Create PDF
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: {
        top: metadata.margins.top,
        bottom: metadata.margins.bottom,
        left: metadata.margins.left,
        right: metadata.margins.right
      }
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${proposal.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Title
    doc.fontSize(20).font('Helvetica-Bold').text(proposal.title, { align: 'center' });
    doc.moveDown(2);
    
    // Sections
    sections.forEach((section, index) => {
      if (index > 0) {
        doc.moveDown(section.marginTop / 20);
      }
      
      // Section title
      doc.fontSize(16).font('Helvetica-Bold').text(section.title);
      doc.moveDown(0.5);
      
      // Section content
      doc.fontSize(12).font('Helvetica').text(section.content, {
        align: 'left',
        indent: section.marginLeft
      });
      
      doc.moveDown(section.marginBottom / 20);
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

module.exports = {
  getProposals,
  getProposalById,
  uploadProposal,
  updateProposal,
  updateSection,
  deleteProposal,
  exportToWord,
  exportToPDF,
  upload: upload.single('file')
};

