export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || '/api';
  }
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('cotizador_token');
};

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      let data;
      if (isJson) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Error del servidor (${response.status}): ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        const errorMessage = data.message || data.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      return data;
    } catch (error: any) {
      console.error(`API request failed for ${endpoint}:`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error.message || 'Error desconocido en la petición');
    }
  }

  // Proposals API
  async getProposals() {
    return this.request<{ success: boolean; data: any[] }>('/proposals');
  }

  async getProposal(id: number) {
    return this.request<{ success: boolean; data: any }>(`/proposals/${id}`);
  }

  async uploadProposal(formData: FormData) {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/proposals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Error al subir propuesta');
    }
    return data;
  }

  async updateProposal(id: number, updates: any) {
    return this.request<{ success: boolean; data: any }>(`/proposals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async updateSection(proposalId: number, sectionId: number, updates: any) {
    return this.request<{ success: boolean; data: any }>(`/proposals/${proposalId}/sections/${sectionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteProposal(id: number) {
    return this.request<{ success: boolean }>(`/proposals/${id}`, {
      method: 'DELETE',
    });
  }

  exportToWord(id: number) {
    const token = getAuthToken();
    window.open(`${API_BASE_URL}/proposals/${id}/export/word?token=${token}`, '_blank');
  }

  exportToPDF(id: number) {
    const token = getAuthToken();
    window.open(`${API_BASE_URL}/proposals/${id}/export/pdf?token=${token}`, '_blank');
  }

  // Generic HTTP methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiService = new ApiService();

