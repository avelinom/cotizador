import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import * as authService from '../services/auth';
import { User } from '../services/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, name: string) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Cambiar a false inicialmente
  const isCheckingRef = useRef(false);
  const hasCheckedRef = useRef(false);

  const checkAuth = async () => {
    // Evitar múltiples llamadas simultáneas
    if (isCheckingRef.current) return;
    
    try {
      isCheckingRef.current = true;
      
      // Verificar si hay token primero (más rápido)
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('cotizador_token');
        if (!token) {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          isCheckingRef.current = false;
          hasCheckedRef.current = true;
          return;
        }
      }
      
      // Solo mostrar loading si hay token (evitar flash en login)
      setIsLoading(true);
      
      // Agregar timeout para evitar que se quede bloqueado
      const timeoutPromise = new Promise<User | null>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
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
      // Silenciar errores de timeout o no autenticado (es normal)
      if (error.message !== 'Timeout') {
        console.error('Error checking auth:', error);
      }
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      isCheckingRef.current = false;
      hasCheckedRef.current = true;
    }
  };

  useEffect(() => {
    // Solo ejecutar una vez al montar, pero de forma asíncrona para no bloquear
    if (!hasCheckedRef.current) {
      // Ejecutar checkAuth de forma asíncrona para no bloquear el render inicial
      Promise.resolve().then(() => {
        checkAuth();
      });
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      if (response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        // Verificar también llamando getCurrentUser
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
    isCheckingRef.current = false;
    // El router.push se manejará en el componente que llama a logout
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

