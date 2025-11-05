import { useState, useEffect } from 'react';

export interface ProposalSection {
  id: number;
  title: string;
  content: string;
  htmlContent?: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export interface Proposal {
  id: number;
  title: string;
  description?: string;
  original_filename: string;
  file_path?: string;
  user_id: number;
  sections: ProposalSection[];
  metadata?: {
    margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    fontSize?: number;
    fontFamily?: string;
    lineSpacing?: number;
  };
  created_at: string;
  updated_at: string;
  user_name?: string;
}

export const useProposals = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('cotizador_token');
  };

  const getApiBaseUrl = (): string => {
    if (typeof window !== 'undefined') {
      return process.env.NEXT_PUBLIC_API_URL || '/api';
    }
    return '/api';
  };

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      const response = await fetch(`${getApiBaseUrl()}/proposals`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setProposals(data.data);
      } else {
        setError(data.message || 'Error al cargar propuestas');
      }
    } catch (error: any) {
      setError(error.message || 'Error al cargar propuestas');
    } finally {
      setLoading(false);
    }
  };

  const getProposal = async (id: number): Promise<Proposal | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      const response = await fetch(`${getApiBaseUrl()}/proposals/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        setError(data.message || 'Error al cargar propuesta');
        return null;
      }
    } catch (error: any) {
      setError(error.message || 'Error al cargar propuesta');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadProposal = async (file: File, title: string, description?: string): Promise<{ success: boolean; data?: Proposal; message?: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      if (description) formData.append('description', description);
      
      const token = getAuthToken();
      const response = await fetch(`${getApiBaseUrl()}/proposals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchProposals(); // Refresh list
        return { success: true, data: data.data };
      } else {
        setError(data.message || 'Error al subir propuesta');
        return { success: false, message: data.message };
      }
    } catch (error: any) {
      setError(error.message || 'Error al subir propuesta');
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProposal = async (id: number, updates: Partial<Proposal>): Promise<{ success: boolean; data?: Proposal; message?: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      const response = await fetch(`${getApiBaseUrl()}/proposals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchProposals(); // Refresh list
        return { success: true, data: data.data };
      } else {
        setError(data.message || 'Error al actualizar propuesta');
        return { success: false, message: data.message };
      }
    } catch (error: any) {
      setError(error.message || 'Error al actualizar propuesta');
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateSection = async (proposalId: number, sectionId: number, updates: Partial<ProposalSection>): Promise<{ success: boolean; data?: ProposalSection; message?: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      const response = await fetch(`${getApiBaseUrl()}/proposals/${proposalId}/sections/${sectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchProposals(); // Refresh list
        return { success: true, data: data.data };
      } else {
        setError(data.message || 'Error al actualizar sección');
        return { success: false, message: data.message };
      }
    } catch (error: any) {
      setError(error.message || 'Error al actualizar sección');
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteProposal = async (id: number): Promise<{ success: boolean; message?: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      const response = await fetch(`${getApiBaseUrl()}/proposals/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchProposals(); // Refresh list
        return { success: true };
      } else {
        setError(data.message || 'Error al eliminar propuesta');
        return { success: false, message: data.message };
      }
    } catch (error: any) {
      setError(error.message || 'Error al eliminar propuesta');
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const exportToWord = (id: number) => {
    const token = getAuthToken();
    window.open(`${getApiBaseUrl()}/proposals/${id}/export/word?token=${token}`, '_blank');
  };

  const exportToPDF = (id: number) => {
    const token = getAuthToken();
    window.open(`${getApiBaseUrl()}/proposals/${id}/export/pdf?token=${token}`, '_blank');
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  return {
    proposals,
    loading,
    error,
    fetchProposals,
    getProposal,
    uploadProposal,
    updateProposal,
    updateSection,
    deleteProposal,
    exportToWord,
    exportToPDF,
  };
};

