const express = require('express');
const router = express.Router();
const {
  getTemplates,
  getTemplateById,
  applyTemplate
} = require('../controllers/templatesController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get all templates
router.get('/', getTemplates);

// Get single template
router.get('/:id', getTemplateById);

// Apply template to proposal
router.post('/apply/:proposalId', applyTemplate);

module.exports = router;

