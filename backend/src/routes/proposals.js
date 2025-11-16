const express = require('express');
const router = express.Router();
const {
  getProposals,
  getProposalById,
  uploadProposal,
  updateProposal,
  updateSection,
  deleteProposal,
  exportToWord,
  exportToPDF,
  getProposalPreview,
  downloadTemplate,
  cancelProposal,
  upload
} = require('../controllers/proposalsController');
const {
  createProposalFromTemplate,
  updateDynamicSections,
  completeProposal,
  applyFormatTemplate,
  getSectionContent
} = require('../controllers/proposalsGoogleDriveController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Download template file (default)
router.get('/template/download', downloadTemplate);

// Get all proposals
router.get('/', getProposals);

// Download dynamic document for specific template (must be before /:id)
router.get('/:id/template/download', downloadTemplate);

// Get single proposal
router.get('/:id', getProposalById);

// Create proposal from template (new wizard flow)
router.post('/create-from-template', createProposalFromTemplate);

// Create proposal directly from Google Drive documents (without template)
router.post('/create-from-documents', require('../controllers/proposalsGoogleDriveController').createProposalFromDocuments);

// Create proposal from Google Drive format template
router.post('/create-from-format-template', require('../controllers/proposalsGoogleDriveController').createProposalFromFormatTemplate);

// Reopen completed proposal for editing
router.post('/:id/reopen-for-editing', require('../controllers/proposalsGoogleDriveController').reopenProposalForEditing);

// Upload and process Word document
router.post('/', upload, uploadProposal);

// Update proposal
router.put('/:id', updateProposal);

// Update specific section
router.put('/:id/sections/:sectionId', updateSection);

// Delete proposal
router.delete('/:id', deleteProposal);

// Get proposal preview (HTML)
router.get('/:id/preview', getProposalPreview);

// Export to Word
router.get('/:id/export/word', exportToWord);

// Export to PDF
router.get('/:id/export/pdf', exportToPDF);

// Cancel proposal
router.post('/:id/cancel', cancelProposal);

// Update dynamic sections of a proposal
router.put('/:id/update-dynamic-sections', updateDynamicSections);

// Complete proposal (move to client folder)
router.post('/:id/complete', completeProposal);

// Apply format template from Google Drive
router.post('/:id/apply-format-template', applyFormatTemplate);

// Get section content from Google Doc
router.get('/:id/sections/:sectionOrder/content', getSectionContent);

// Google Drive routes
const {
  createProposalFromGoogleDrive,
  exportProposalToPDF,
  sendProposalEmail
} = require('../controllers/proposalsController');

// Create proposal from Google Drive
router.post('/google-drive/create', createProposalFromGoogleDrive);

// Export proposal to PDF (Google Drive)
router.post('/:id/export-pdf', exportProposalToPDF);

// Send proposal email
router.post('/:id/send-email', sendProposalEmail);

module.exports = router;

