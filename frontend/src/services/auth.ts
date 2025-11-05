const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || '/api';
  }
  return '/api';
};

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}

const setToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cotizador_token', token);
  }
};

const getToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('cotizador_token');
};

const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cotizador_token');
  }
};

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    if (data.token) {
      setToken(data.token);
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al iniciar sesión');
  }
};

export const register = async (credentials: { email: string; password: string; name: string }): Promise<LoginResponse> => {
  try {
    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al registrar usuario');
    }

    if (data.token) {
      setToken(data.token);
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al registrar usuario');
  }
};

export const logout = async (): Promise<void> => {
  removeToken();
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const token = getToken();
    if (!token) return null;

    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      removeToken();
      return null;
    }

    const data = await response.json();
    return data.user || null;
  } catch (error) {
    removeToken();
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  return getToken() !== null;
};

