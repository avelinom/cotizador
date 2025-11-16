const express = require('express');
const router = express.Router();
const {
  getTemplates,
  getTemplateById,
  applyTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  uploadTemplateDocuments,
  processMappingDocumentPreview,
  downloadDynamicDocumentWithFields,
  processGoogleDriveDocument,
  createTemplateFromGoogleDrive,
  upload,
  uploadForProcessing
} = require('../controllers/templatesController');
const { protect, requireAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get all templates (public)
router.get('/', getTemplates);

// Get single template (public)
router.get('/:id', getTemplateById);

// Apply template to proposal (public)
router.post('/apply/:proposalId', applyTemplate);

// Process mapping document for preview (admin only)
router.post('/process-mapping', requireAdmin, uploadForProcessing.single('mappingDocument'), processMappingDocumentPreview);

// Process Google Drive document and extract sections (admin only)
router.post('/process-google-drive-document', requireAdmin, processGoogleDriveDocument);

// Create template from Google Drive (admin only)
router.post('/create-from-google-drive', requireAdmin, createTemplateFromGoogleDrive);

// Download dynamic document with fields replaced (public)
router.post('/:id/download-dynamic', downloadDynamicDocumentWithFields);

// Upload template documents (admin only)
router.post('/upload', requireAdmin, uploadTemplateDocuments);

// Admin routes - require admin role
router.post('/', requireAdmin, createTemplate);
router.put('/:id', requireAdmin, updateTemplate);
router.delete('/:id', requireAdmin, deleteTemplate);

module.exports = router;

