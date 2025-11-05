import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiBaseUrl } from '../services/api';

export interface Template {
  id: number;
  name: string;
  description: string | null;
  metadata: any;
  sections: TemplateSection[];
  default_styles: any;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateSection {
  title: string;
  order: number;
  required: boolean;
  baseContent: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

interface UseTemplatesReturn {
  templates: Template[];
  loading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
  applyTemplate: (proposalId: number, templateId: number) => Promise<{ success: boolean; message?: string }>;
}

export const useTemplates = (): UseTemplatesReturn => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('cotizador_token');
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await axios.get(`${getApiBaseUrl()}/templates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setTemplates(response.data.data || []);
      } else {
        throw new Error(response.data.message || 'Error al obtener los templates');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Error al obtener los templates';
      setError(errorMessage);
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async (proposalId: number, templateId: number): Promise<{ success: boolean; message?: string }> => {
    try {
      setError(null);
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await axios.post(
        `${getApiBaseUrl()}/templates/apply/${proposalId}`,
        { templateId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Template aplicado exitosamente',
        };
      } else {
        throw new Error(response.data.message || 'Error al aplicar el template');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Error al aplicar el template';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    applyTemplate,
  };
};

