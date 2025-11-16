import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
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
  Divider,
  Chip,
  Slider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  EditNote as EditNoteIcon,
  Style as StyleIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useProposals, Proposal, ProposalSection } from '../hooks/useProposals';
import { useTemplates, Template } from '../hooks/useTemplates';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/dateFormatter';

const ProposalsPage = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const {
    proposals,
    loading,
    error: hookError,
    uploadProposal,
    updateSection,
    deleteProposal,
    exportToWord,
    exportToPDF,
    fetchProposals,
    getProposal,
  } = useProposals();

  const {
    templates,
    loading: templatesLoading,
    error: templatesError,
    applyTemplate,
    fetchTemplates,
  } = useTemplates();

  const [isClient, setIsClient] = useState(false);
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openTemplateModal, setOpenTemplateModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [selectedSection, setSelectedSection] = useState<ProposalSection | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
  });

  const [sectionEditForm, setSectionEditForm] = useState({
    title: '',
    content: '',
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 0,
    marginRight: 0,
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Solo redirigir si ya terminó de cargar y no está autenticado
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      }
    }
  }, [isAuthenticated, authLoading, router]);

  const handleOpenUploadModal = () => {
    setUploadForm({ title: '', description: '' });
    setSelectedFile(null);
    setError(null);
    setOpenUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    setOpenUploadModal(false);
    setSelectedFile(null);
    setUploadForm({ title: '', description: '' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
        setError('Solo se permiten archivos Word (.docx, .doc)');
        return;
      }
      setSelectedFile(file);
      if (!uploadForm.title) {
        setUploadForm({ ...uploadForm, title: file.name.replace(/\.(docx|doc)$/i, '') });
      }
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Por favor seleccione un archivo Word');
      return;
    }
    if (!uploadForm.title.trim()) {
      setError('Por favor ingrese un título');
      return;
    }

    try {
      setError(null);
      const result = await uploadProposal(selectedFile, uploadForm.title, uploadForm.description);
      if (result.success) {
        setSuccess('Propuesta creada exitosamente');
        handleCloseUploadModal();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Error al subir la propuesta');
      }
    } catch (err: any) {
      setError(err.message || 'Error al subir la propuesta');
    }
  };

  const handleViewProposal = async (id: number) => {
    try {
      setError(null);
      const proposal = proposals.find(p => p.id === id);
      if (proposal) {
        setSelectedProposal(proposal);
        setOpenViewModal(true);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar la propuesta');
    }
  };

  const handleEditSection = (proposal: Proposal, section: ProposalSection) => {
    setSelectedProposal(proposal);
    setSelectedSection(section);
    setSectionEditForm({
      title: section.title,
      content: section.content,
      marginTop: section.marginTop,
      marginBottom: section.marginBottom,
      marginLeft: section.marginLeft,
      marginRight: section.marginRight,
    });
    setError(null);
    setOpenEditModal(true);
  };

  const handleSaveSection = async () => {
    if (!selectedProposal || !selectedSection) return;

    try {
      setError(null);
      const result = await updateSection(selectedProposal.id, selectedSection.id, sectionEditForm);
      if (result.success) {
        setSuccess('Sección actualizada exitosamente');
        setOpenEditModal(false);
        await fetchProposals();
        const updatedProposal = proposals.find(p => p.id === selectedProposal.id);
        if (updatedProposal) {
          setSelectedProposal(updatedProposal);
        }
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Error al actualizar la sección');
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la sección');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de que desea eliminar esta propuesta?')) {
      try {
        setError(null);
        const result = await deleteProposal(id);
        if (result.success) {
          setSuccess('Propuesta eliminada exitosamente');
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(result.message || 'Error al eliminar la propuesta');
        }
      } catch (err: any) {
        setError(err.message || 'Error al eliminar la propuesta');
      }
    }
  };

  const handleExportWord = (id: number) => {
    exportToWord(id);
  };

  const handleExportPDF = (id: number) => {
    exportToPDF(id);
  };

  const handleOpenTemplateModal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setError(null);
    fetchTemplates();
    setOpenTemplateModal(true);
  };

  const handleCloseTemplateModal = () => {
    setOpenTemplateModal(false);
    setSelectedProposal(null);
  };

  const handleApplyTemplate = async (templateId: number) => {
    if (!selectedProposal) return;

    try {
      setError(null);
      const result = await applyTemplate(selectedProposal.id, templateId);
      if (result.success) {
        setSuccess(result.message || 'Template aplicado exitosamente');
        setOpenTemplateModal(false);
        await fetchProposals();
        // Refresh selected proposal by fetching it again
        const updatedProposal = await getProposal(selectedProposal.id);
        if (updatedProposal) {
          setSelectedProposal(updatedProposal);
        }
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Error al aplicar el template');
      }
    } catch (err: any) {
      setError(err.message || 'Error al aplicar el template');
    }
  };

  // Mostrar loading solo mientras carga la autenticación inicial
  if (!isClient) {
    return (
      <Layout title="Cotizador">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  // Si está cargando autenticación, mostrar loading pero no bloquear completamente
  if (authLoading) {
    return (
      <Layout title="Cotizador">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  // Si no está autenticado después de cargar, redirigir (el useEffect ya lo maneja)
  if (!isAuthenticated) {
    return (
      <Layout title="Cotizador">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Cotizador - Propuestas</title>
        <meta name="description" content="Generador de propuestas y cotizaciones" />
      </Head>

      <Layout title="Cotizador de Propuestas">
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
            <Typography variant="h5">Lista de Propuestas</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenUploadModal}
            >
              Nueva Propuesta
            </Button>
          </Box>

          {loading && proposals.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
              <CircularProgress />
            </Box>
          ) : proposals.length === 0 ? (
            <Card>
              <CardContent>
                <Typography variant="body1" color="textSecondary" align="center">
                  No hay propuestas. Haga clic en "Nueva Propuesta" para comenzar.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Título</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Archivo Original</TableCell>
                    <TableCell>Secciones</TableCell>
                    <TableCell>Fecha Creación</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proposals.map((proposal) => (
                    <TableRow key={proposal.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {proposal.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {proposal.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {proposal.original_filename}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${proposal.sections?.length || 0} secciones`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {formatDate(proposal.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleViewProposal(proposal.id)}
                          title="Ver propuesta"
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => handleOpenTemplateModal(proposal)}
                          title="Aplicar template"
                        >
                          <StyleIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleExportWord(proposal.id)}
                          title="Exportar a Word"
                        >
                          <DownloadIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleExportPDF(proposal.id)}
                          title="Exportar a PDF"
                        >
                          <PdfIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(proposal.id)}
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

        <Dialog open={openUploadModal} onClose={handleCloseUploadModal} maxWidth="md" fullWidth>
          <DialogTitle>Subir Nueva Propuesta</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Título"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Descripción (Opcional)"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  fullWidth
                >
                  {selectedFile ? `Archivo: ${selectedFile.name}` : 'Seleccionar Archivo Word (.docx, .doc)'}
                  <input
                    type="file"
                    hidden
                    accept=".docx,.doc"
                    onChange={handleFileChange}
                  />
                </Button>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  Formatos permitidos: Word (.docx, .doc). Máximo 10MB.
                </Typography>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseUploadModal}>Cancelar</Button>
            <Button onClick={handleUpload} variant="contained" color="primary" disabled={!selectedFile}>
              Subir y Procesar
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openViewModal} onClose={() => setOpenViewModal(false)} maxWidth="lg" fullWidth>
          <DialogTitle>
            {selectedProposal?.title}
            <Box display="flex" gap={1} mt={1} flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                startIcon={<StyleIcon />}
                onClick={() => selectedProposal && handleOpenTemplateModal(selectedProposal)}
              >
                Aplicar Template
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => selectedProposal && handleExportWord(selectedProposal.id)}
              >
                Word
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PdfIcon />}
                onClick={() => selectedProposal && handleExportPDF(selectedProposal.id)}
              >
                PDF
              </Button>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedProposal && (
              <Box>
                {selectedProposal.description && (
                  <Typography variant="body2" color="textSecondary" paragraph>
                    {selectedProposal.description}
                  </Typography>
                )}
                <Divider sx={{ my: 2 }} />
                {selectedProposal.sections && selectedProposal.sections.length > 0 ? (
                  selectedProposal.sections.map((section) => (
                    <Box key={section.id} sx={{ mb: 4 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6" component="h3">
                          {section.title}
                        </Typography>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditSection(selectedProposal, section)}
                          title="Editar sección"
                        >
                          <EditNoteIcon />
                        </IconButton>
                      </Box>
                      <Box
                        sx={{
                          p: 2,
                          backgroundColor: 'grey.50',
                          borderRadius: 1,
                          mt: section.marginTop / 20,
                          mb: section.marginBottom / 20,
                          ml: section.marginLeft / 20,
                          mr: section.marginRight / 20,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        <Typography variant="body1">{section.content}</Typography>
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No hay secciones disponibles.
                  </Typography>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenViewModal(false)}>Cerrar</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} maxWidth="md" fullWidth>
          <DialogTitle>Editar Sección</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Título de la Sección"
                  value={sectionEditForm.title}
                  onChange={(e) => setSectionEditForm({ ...sectionEditForm, title: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Contenido"
                  value={sectionEditForm.content}
                  onChange={(e) => setSectionEditForm({ ...sectionEditForm, content: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Márgenes
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  Margen Superior: {sectionEditForm.marginTop}px
                </Typography>
                <Slider
                  value={sectionEditForm.marginTop}
                  onChange={(_, value) => setSectionEditForm({ ...sectionEditForm, marginTop: value as number })}
                  min={0}
                  max={100}
                  step={5}
                  marks
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  Margen Inferior: {sectionEditForm.marginBottom}px
                </Typography>
                <Slider
                  value={sectionEditForm.marginBottom}
                  onChange={(_, value) => setSectionEditForm({ ...sectionEditForm, marginBottom: value as number })}
                  min={0}
                  max={100}
                  step={5}
                  marks
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  Margen Izquierdo: {sectionEditForm.marginLeft}px
                </Typography>
                <Slider
                  value={sectionEditForm.marginLeft}
                  onChange={(_, value) => setSectionEditForm({ ...sectionEditForm, marginLeft: value as number })}
                  min={0}
                  max={100}
                  step={5}
                  marks
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  Margen Derecho: {sectionEditForm.marginRight}px
                </Typography>
                <Slider
                  value={sectionEditForm.marginRight}
                  onChange={(_, value) => setSectionEditForm({ ...sectionEditForm, marginRight: value as number })}
                  min={0}
                  max={100}
                  step={5}
                  marks
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveSection} variant="contained" color="primary">
              Guardar Cambios
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openTemplateModal} onClose={handleCloseTemplateModal} maxWidth="md" fullWidth>
          <DialogTitle>
            Aplicar Template a: {selectedProposal?.title}
          </DialogTitle>
          <DialogContent>
            {(templatesError || error) && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => { setError(null); }}>
                {templatesError || error}
              </Alert>
            )}
            {templatesLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
              </Box>
            ) : templates.length === 0 ? (
              <Typography variant="body2" color="textSecondary" align="center">
                No hay templates disponibles.
              </Typography>
            ) : (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {templates.map((template) => (
                  <Grid item xs={12} key={template.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                        borderColor: template.is_default ? 'primary.main' : 'divider',
                        borderWidth: template.is_default ? 2 : 1,
                      }}
                      onClick={() => handleApplyTemplate(template.id)}
                    >
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start">
                          <Box flex={1}>
                            <Typography variant="h6" component="h3" gutterBottom>
                              {template.name}
                              {template.is_default && (
                                <Chip
                                  label="Por defecto"
                                  size="small"
                                  color="primary"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Typography>
                            {template.description && (
                              <Typography variant="body2" color="textSecondary" paragraph>
                                {template.description}
                              </Typography>
                            )}
                            <Typography variant="caption" color="textSecondary">
                              {template.sections?.length || 0} secciones
                            </Typography>
                          </Box>
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyTemplate(template.id);
                            }}
                          >
                            Aplicar
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseTemplateModal}>Cancelar</Button>
          </DialogActions>
        </Dialog>
      </Layout>
    </>
  );
};

export default ProposalsPage;

