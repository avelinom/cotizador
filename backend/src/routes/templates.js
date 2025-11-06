const express = require('express');
const router = express.Router();
const {
  getTemplates,
  getTemplateById,
  applyTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate
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

// Admin routes - require admin role
router.post('/', requireAdmin, createTemplate);
router.put('/:id', requireAdmin, updateTemplate);
router.delete('/:id', requireAdmin, deleteTemplate);

module.exports = router;

