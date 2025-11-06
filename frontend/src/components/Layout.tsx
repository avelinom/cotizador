import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import {
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  Description as DescriptionIcon,
  Style as StyleIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title = 'Cotizador' }) => {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  
  // Determine current tab based on route
  const getCurrentTab = () => {
    if (router.pathname === '/proposals') return 0;
    if (router.pathname === '/templates') return 1;
    return -1;
  };
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (newValue === 0) {
      router.push('/proposals');
    } else if (newValue === 1) {
      router.push('/templates');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    router.push('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ mr: 4 }}>
            {title}
          </Typography>

          {isAuthenticated && user && (
            <Tabs
              value={getCurrentTab()}
              onChange={handleTabChange}
              textColor="inherit"
              indicatorColor="secondary"
              sx={{ flexGrow: 1 }}
            >
              <Tab
                icon={<DescriptionIcon />}
                iconPosition="start"
                label="Propuestas"
                value={0}
              />
              {user.role === 'admin' && (
                <Tab
                  icon={<StyleIcon />}
                  iconPosition="start"
                  label="Templates"
                  value={1}
                />
              )}
            </Tabs>
          )}

          {isAuthenticated && user ? (
            <>
              <Typography variant="body2" sx={{ mr: 2 }}>
                {user.name}
              </Typography>
              <IconButton
                size="large"
                edge="end"
                color="inherit"
                onClick={handleMenuOpen}
              >
                <AccountIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon sx={{ mr: 1 }} />
                  Cerrar Sesión
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" onClick={() => router.push('/login')}>
              Iniciar Sesión
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Container maxWidth="lg">
          {title !== 'Cotizador' && (
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
              {title}
            </Typography>
          )}
          {children}
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          py: 2,
          textAlign: 'center',
        }}
      >
        <Typography variant="body2">
          © 2025 Cotizador. Todos los derechos reservados.
        </Typography>
      </Box>
    </Box>
  );
};

export default Layout;

