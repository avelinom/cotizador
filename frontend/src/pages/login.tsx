import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Box,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  Grid,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const router = useRouter();
  const { login, register, isAuthenticated, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  // Debug: verificar estado de autenticación
  useEffect(() => {
    console.log('Login page - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    // Solo redirigir si ya terminó de cargar y está autenticado
    if (!isLoading && isAuthenticated) {
      router.push('/proposals');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        if (!formData.name) {
          setError('El nombre es requerido');
          setLoading(false);
          return;
        }
        await register(formData.email, formData.password, formData.name);
      }
      router.push('/proposals');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar el formulario inmediatamente, sin esperar a que termine la verificación de autenticación
  return (
    <>
      <Head>
        <title>{isLogin ? 'Iniciar Sesión' : 'Registrarse'} - Cotizador</title>
      </Head>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'auto',
          '& *': {
            pointerEvents: 'auto',
          },
        }}
      >
        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 10 }}>
          <Card sx={{ position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
            <CardContent sx={{ p: 4, position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
              <Typography variant="h4" component="h1" gutterBottom align="center">
                {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
                Sistema de Cotizador de Propuestas
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit} style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}>
                {!isLogin && (
                  <TextField
                    fullWidth
                    label="Nombre"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    margin="normal"
                    required={!isLogin}
                  />
                )}
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  margin="normal"
                  required
                  autoComplete="email"
                  sx={{ pointerEvents: 'auto' }}
                />
                <TextField
                  fullWidth
                  label="Contraseña"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  margin="normal"
                  required
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  sx={{ pointerEvents: 'auto' }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading}
                >
                  {loading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
                </Button>
              </form>

              <Box textAlign="center" mt={2}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                  }}
                >
                  {isLogin
                    ? '¿No tienes cuenta? Regístrate'
                    : '¿Ya tienes cuenta? Inicia sesión'}
                </Link>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </>
  );
}

