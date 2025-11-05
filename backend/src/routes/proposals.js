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
  upload
} = require('../controllers/proposalsController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get all proposals
router.get('/', getProposals);

// Get single proposal
router.get('/:id', getProposalById);

// Upload and process Word document
router.post('/', upload, uploadProposal);

// Update proposal
router.put('/:id', updateProposal);

// Update specific section
router.put('/:id/sections/:sectionId', updateSection);

// Delete proposal
router.delete('/:id', deleteProposal);

// Export to Word
router.get('/:id/export/word', exportToWord);

// Export to PDF
router.get('/:id/export/pdf', exportToPDF);

module.exports = router;

