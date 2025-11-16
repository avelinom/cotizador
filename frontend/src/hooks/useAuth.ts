import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import * as authService from '../services/auth';
import { User } from '../services/auth';

export const useAuth = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      
      // Verificar si hay token primero (más rápido)
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('cotizador_token');
        if (!token) {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
      }
      
      // Agregar timeout para evitar que se quede bloqueado
      const timeoutPromise = new Promise<User | null>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const currentUser = await Promise.race([
        authService.getCurrentUser(),
        timeoutPromise
      ]) as User | null;
      
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error: any) {
      console.error('Error checking auth:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      if (response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        // Also verify by calling getCurrentUser to ensure consistency
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      }
      return response;
    } catch (error: any) {
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await authService.register({ email, password, name });
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    router.push('/login');
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    checkAuth,
  };
};

