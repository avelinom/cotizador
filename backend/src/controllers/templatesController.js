const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get all templates
 */
const getTemplates = async (req, res) => {
  try {
    const templates = await db('templates')
      .select('*')
      .orderBy('is_default', 'desc')
      .orderBy('name', 'asc');

    // Parse JSON fields
    const parsedTemplates = templates.map(template => ({
      ...template,
      metadata: typeof template.metadata === 'string' 
        ? JSON.parse(template.metadata) 
        : template.metadata,
      sections: typeof template.sections === 'string' 
        ? JSON.parse(template.sections) 
        : template.sections,
      default_styles: typeof template.default_styles === 'string' 
        ? JSON.parse(template.default_styles) 
        : template.default_styles
    }));

    res.json({
      success: true,
      data: parsedTemplates
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los templates',
      error: error.message
    });
  }
};

/**
 * Get a single template by ID
 */
const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await db('templates')
      .where('id', id)
      .first();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template no encontrado'
      });
    }

    // Parse JSON fields
    template.metadata = typeof template.metadata === 'string' 
      ? JSON.parse(template.metadata) 
      : template.metadata;
    template.sections = typeof template.sections === 'string' 
      ? JSON.parse(template.sections) 
      : template.sections;
    template.default_styles = typeof template.default_styles === 'string' 
      ? JSON.parse(template.default_styles) 
      : template.default_styles;

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el template',
      error: error.message
    });
  }
};

/**
 * Apply template to a proposal
 */
const applyTemplate = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { templateId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: 'El ID del template es requerido'
      });
    }

    // Get proposal
    let query = db('proposals').where('id', proposalId);
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

    // Get template
    const template = await db('templates')
      .where('id', templateId)
      .first();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template no encontrado'
      });
    }

    // Parse template data
    const templateMetadata = typeof template.metadata === 'string' 
      ? JSON.parse(template.metadata) 
      : template.metadata;
    const templateSections = typeof template.sections === 'string' 
      ? JSON.parse(template.sections) 
      : template.sections;
    const templateStyles = typeof template.default_styles === 'string' 
      ? JSON.parse(template.default_styles) 
      : template.default_styles;

    // Parse current proposal sections
    const currentSections = typeof proposal.sections === 'string' 
      ? JSON.parse(proposal.sections) 
      : proposal.sections;
    const currentMetadata = typeof proposal.metadata === 'string' 
      ? JSON.parse(proposal.metadata) 
      : proposal.metadata;

    // Apply template: merge sections from template with existing sections
    const updatedSections = [];
    
    // Create a map of existing sections by title (case-insensitive)
    const existingSectionsMap = new Map();
    currentSections.forEach(section => {
      const key = section.title.toLowerCase().trim();
      existingSectionsMap.set(key, section);
    });

    // Process template sections in order
    templateSections.forEach((templateSection, index) => {
      const key = templateSection.title.toLowerCase().trim();
      const existingSection = existingSectionsMap.get(key);

      if (existingSection) {
        // Keep existing content but update formatting and order
        updatedSections.push({
          id: existingSection.id || index + 1,
          title: existingSection.title,
          content: existingSection.content || templateSection.baseContent || '',
          htmlContent: existingSection.htmlContent || '',
          marginTop: templateSection.marginTop || existingSection.marginTop || 20,
          marginBottom: templateSection.marginBottom || existingSection.marginBottom || 20,
          marginLeft: templateSection.marginLeft || existingSection.marginLeft || 0,
          marginRight: templateSection.marginRight || existingSection.marginRight || 0,
          order: templateSection.order || index + 1
        });
        // Remove from map so we know it's been processed
        existingSectionsMap.delete(key);
      } else {
        // Add new section from template
        updatedSections.push({
          id: index + 1,
          title: templateSection.title,
          content: templateSection.baseContent || '',
          htmlContent: '',
          marginTop: templateSection.marginTop || 20,
          marginBottom: templateSection.marginBottom || 20,
          marginLeft: templateSection.marginLeft || 0,
          marginRight: templateSection.marginRight || 0,
          order: templateSection.order || index + 1
        });
      }
    });

    // Add any remaining existing sections that weren't in the template
    existingSectionsMap.forEach((section, key) => {
      updatedSections.push({
        ...section,
        order: section.order || updatedSections.length + 1
      });
    });

    // Sort sections by order
    updatedSections.sort((a, b) => (a.order || 999) - (b.order || 999));

    // Update metadata with template metadata
    const updatedMetadata = {
      ...currentMetadata,
      ...templateMetadata,
      margins: templateMetadata.margins || currentMetadata.margins
    };

    // Update proposal
    const [updatedProposal] = await db('proposals')
      .where('id', proposalId)
      .update({
        template_id: templateId,
        sections: JSON.stringify(updatedSections),
        metadata: JSON.stringify(updatedMetadata),
        updated_at: new Date()
      })
      .returning('*');

    // Parse JSON fields for response
    if (typeof updatedProposal.sections === 'string') {
      updatedProposal.sections = JSON.parse(updatedProposal.sections);
    }
    if (typeof updatedProposal.metadata === 'string') {
      updatedProposal.metadata = JSON.parse(updatedProposal.metadata);
    }

    res.json({
      success: true,
      message: 'Template aplicado exitosamente',
      data: updatedProposal
    });
  } catch (error) {
    logger.error('Error applying template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aplicar el template',
      error: error.message
    });
  }
};

/**
 * Create a new template
 */
const createTemplate = async (req, res) => {
  try {
    const { name, description, metadata, sections, default_styles, is_default } = req.body;

    if (!name || !sections || !Array.isArray(sections)) {
      return res.status(400).json({
        success: false,
        message: 'El nombre y las secciones son requeridos'
      });
    }

    const [template] = await db('templates').insert({
      name,
      description: description || null,
      metadata: JSON.stringify(metadata || {}),
      sections: JSON.stringify(sections),
      default_styles: JSON.stringify(default_styles || {}),
      is_default: is_default || false,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    // Parse JSON fields for response
    if (typeof template.metadata === 'string') {
      template.metadata = JSON.parse(template.metadata);
    }
    if (typeof template.sections === 'string') {
      template.sections = JSON.parse(template.sections);
    }
    if (typeof template.default_styles === 'string') {
      template.default_styles = JSON.parse(template.default_styles);
    }

    res.status(201).json({
      success: true,
      message: 'Template creado exitosamente',
      data: template
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el template',
      error: error.message
    });
  }
};

/**
 * Update a template
 */
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, metadata, sections, default_styles, is_default } = req.body;

    const template = await db('templates').where('id', id).first();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template no encontrado'
      });
    }

    const updateData = {
      updated_at: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (metadata !== undefined) updateData.metadata = JSON.stringify(metadata);
    if (sections !== undefined) updateData.sections = JSON.stringify(sections);
    if (default_styles !== undefined) updateData.default_styles = JSON.stringify(default_styles);
    if (is_default !== undefined) updateData.is_default = is_default;

    const [updatedTemplate] = await db('templates')
      .where('id', id)
      .update(updateData)
      .returning('*');

    // Parse JSON fields for response
    if (typeof updatedTemplate.metadata === 'string') {
      updatedTemplate.metadata = JSON.parse(updatedTemplate.metadata);
    }
    if (typeof updatedTemplate.sections === 'string') {
      updatedTemplate.sections = JSON.parse(updatedTemplate.sections);
    }
    if (typeof updatedTemplate.default_styles === 'string') {
      updatedTemplate.default_styles = JSON.parse(updatedTemplate.default_styles);
    }

    res.json({
      success: true,
      message: 'Template actualizado exitosamente',
      data: updatedTemplate
    });
  } catch (error) {
    logger.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el template',
      error: error.message
    });
  }
};

/**
 * Delete a template
 */
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await db('templates').where('id', id).first();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template no encontrado'
      });
    }

    await db('templates').where('id', id).delete();

    res.json({
      success: true,
      message: 'Template eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el template',
      error: error.message
    });
  }
};

module.exports = {
  getTemplates,
  getTemplateById,
  applyTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate
};

