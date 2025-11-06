import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useTemplates, Template, TemplateSection } from '../hooks/useTemplates';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/dateFormatter';

const TemplatesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const {
    templates,
    loading,
    error: hookError,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    fetchTemplates,
  } = useTemplates();

  const [isClient, setIsClient] = useState(false);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    is_default: false,
    metadata: {
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      fontSize: 12,
      fontFamily: 'Arial',
      lineSpacing: 1.5,
      header: { enabled: false },
      footer: { enabled: false },
    },
    sections: [] as TemplateSection[],
    default_styles: {
      heading1: { fontSize: 16, bold: true, marginTop: 30, marginBottom: 15 },
      heading2: { fontSize: 14, bold: true, marginTop: 20, marginBottom: 10 },
      paragraph: { fontSize: 12, marginTop: 0, marginBottom: 10 },
    },
  });

  const [sectionForm, setSectionForm] = useState({
    title: '',
    order: 1,
    required: false,
    baseContent: '',
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 0,
    marginRight: 0,
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleOpenCreateModal = () => {
    setTemplateForm({
      name: '',
      description: '',
      is_default: false,
      metadata: {
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        fontSize: 12,
        fontFamily: 'Arial',
        lineSpacing: 1.5,
        header: { enabled: false },
        footer: { enabled: false },
      },
      sections: [],
      default_styles: {
        heading1: { fontSize: 16, bold: true, marginTop: 30, marginBottom: 15 },
        heading2: { fontSize: 14, bold: true, marginTop: 20, marginBottom: 10 },
        paragraph: { fontSize: 12, marginTop: 0, marginBottom: 10 },
      },
    });
    setSectionForm({
      title: '',
      order: 1,
      required: false,
      baseContent: '',
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 0,
      marginRight: 0,
    });
    setError(null);
    setOpenCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setOpenCreateModal(false);
    setError(null);
  };

  const handleOpenEditModal = (template: Template) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      is_default: template.is_default,
      metadata: template.metadata || {
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        fontSize: 12,
        fontFamily: 'Arial',
        lineSpacing: 1.5,
        header: { enabled: false },
        footer: { enabled: false },
      },
      sections: template.sections || [],
      default_styles: template.default_styles || {
        heading1: { fontSize: 16, bold: true, marginTop: 30, marginBottom: 15 },
        heading2: { fontSize: 14, bold: true, marginTop: 20, marginBottom: 10 },
        paragraph: { fontSize: 12, marginTop: 0, marginBottom: 10 },
      },
    });
    setError(null);
    setOpenEditModal(true);
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setSelectedTemplate(null);
    setError(null);
  };

  const handleAddSection = () => {
    if (!sectionForm.title.trim()) {
      setError('El título de la sección es requerido');
      return;
    }

    const newSection: TemplateSection = {
      title: sectionForm.title,
      order: sectionForm.order || templateForm.sections.length + 1,
      required: sectionForm.required,
      baseContent: sectionForm.baseContent,
      marginTop: sectionForm.marginTop,
      marginBottom: sectionForm.marginBottom,
      marginLeft: sectionForm.marginLeft,
      marginRight: sectionForm.marginRight,
    };

    setTemplateForm({
      ...templateForm,
      sections: [...templateForm.sections, newSection].sort((a, b) => a.order - b.order),
    });

    setSectionForm({
      title: '',
      order: templateForm.sections.length + 2,
      required: false,
      baseContent: '',
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 0,
      marginRight: 0,
    });
    setError(null);
  };

  const handleRemoveSection = (index: number) => {
    const newSections = [...templateForm.sections];
    newSections.splice(index, 1);
    setTemplateForm({ ...templateForm, sections: newSections });
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim()) {
      setError('El nombre del template es requerido');
      return;
    }
    if (templateForm.sections.length === 0) {
      setError('Debe agregar al menos una sección');
      return;
    }

    try {
      setError(null);
      const result = await createTemplate(templateForm);
      if (result.success) {
        setSuccess('Template creado exitosamente');
        handleCloseCreateModal();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Error al crear el template');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear el template');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;
    if (!templateForm.name.trim()) {
      setError('El nombre del template es requerido');
      return;
    }
    if (templateForm.sections.length === 0) {
      setError('Debe agregar al menos una sección');
      return;
    }

    try {
      setError(null);
      const result = await updateTemplate(selectedTemplate.id, templateForm);
      if (result.success) {
        setSuccess('Template actualizado exitosamente');
        handleCloseEditModal();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Error al actualizar el template');
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el template');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de que desea eliminar este template?')) {
      try {
        setError(null);
        const result = await deleteTemplate(id);
        if (result.success) {
          setSuccess('Template eliminado exitosamente');
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(result.message || 'Error al eliminar el template');
        }
      } catch (err: any) {
        setError(err.message || 'Error al eliminar el template');
      }
    }
  };

  if (!isClient) {
    return (
      <Layout title="Templates">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout title="Templates">
        <Alert severity="error">
          No tiene permisos para acceder a esta sección. Se requieren permisos de administrador.
        </Alert>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Cotizador - Administración de Templates</title>
        <meta name="description" content="Administración de templates de propuestas" />
      </Head>

      <Layout title="Administración de Templates">
        <Box>
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}
          {(error || hookError) && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => { setError(null); }}>
              {error || hookError}
            </Alert>
          )}

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">Templates de Propuestas</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateModal}
            >
              Nuevo Template
            </Button>
          </Box>

          {loading && templates.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
              <CircularProgress />
            </Box>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent>
                <Typography variant="body1" color="textSecondary" align="center">
                  No hay templates. Haga clic en "Nuevo Template" para comenzar.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Secciones</TableCell>
                    <TableCell>Por Defecto</TableCell>
                    <TableCell>Fecha Creación</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {template.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {template.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${template.sections?.length || 0} secciones`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {template.is_default ? (
                          <Chip label="Sí" size="small" color="primary" />
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {formatDate(template.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEditModal(template)}
                          title="Editar template"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(template.id)}
                          title="Eliminar"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        {/* Create/Edit Modal */}
        <Dialog
          open={openCreateModal || openEditModal}
          onClose={openCreateModal ? handleCloseCreateModal : handleCloseEditModal}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {openCreateModal ? 'Crear Nuevo Template' : 'Editar Template'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre del Template"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Descripción"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={templateForm.is_default}
                      onChange={(e) => setTemplateForm({ ...templateForm, is_default: e.target.checked })}
                    />
                  }
                  label="Template por defecto"
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Secciones
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Título de la Sección"
                  value={sectionForm.title}
                  onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Orden"
                  value={sectionForm.order}
                  onChange={(e) => setSectionForm({ ...sectionForm, order: parseInt(e.target.value) || 1 })}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={sectionForm.required}
                      onChange={(e) => setSectionForm({ ...sectionForm, required: e.target.checked })}
                    />
                  }
                  label="Requerida"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Contenido Base"
                  value={sectionForm.baseContent}
                  onChange={(e) => setSectionForm({ ...sectionForm, baseContent: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  onClick={handleAddSection}
                  disabled={!sectionForm.title.trim()}
                >
                  Agregar Sección
                </Button>
              </Grid>

              {templateForm.sections.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Secciones Agregadas ({templateForm.sections.length})
                  </Typography>
                  {templateForm.sections.map((section, index) => (
                    <Accordion key={index}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%" mr={2}>
                          <Typography>
                            {section.order}. {section.title}
                            {section.required && <Chip label="Requerida" size="small" sx={{ ml: 1 }} />}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSection(index);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" color="textSecondary">
                          {section.baseContent || '(Sin contenido base)'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                          Márgenes: Top {section.marginTop}px, Bottom {section.marginBottom}px, Left {section.marginLeft}px, Right {section.marginRight}px
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={openCreateModal ? handleCloseCreateModal : handleCloseEditModal}>
              Cancelar
            </Button>
            <Button
              onClick={openCreateModal ? handleCreateTemplate : handleUpdateTemplate}
              variant="contained"
              color="primary"
              disabled={!templateForm.name.trim() || templateForm.sections.length === 0}
            >
              {openCreateModal ? 'Crear' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Layout>
    </>
  );
};

export default TemplatesPage;

