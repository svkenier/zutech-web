/**
 * Admin — Panel de Administración Principal.
 * Shell de navegación y orquestación modular de pestañas.
 */

import { useState, useMemo, lazy, Suspense } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import MenuIcon from '@mui/icons-material/Menu';
import LanguageIcon from '@mui/icons-material/Language';
import Navbar from '@ui/components/Navbar';
import DomainAlert from '@ui/components/DomainAlert';
import SEO from '@core/media/SEO';
import { useAuth } from '@ui/context/AuthContext';
import { ROLE_HIERARCHY } from '@core/types/user';

// ─── Code-Splitting Granular de Pestañas Administrativas ──────────────────────
const ProductsTab = lazy(() => import('@ui/pages/admin/tabs/ProductsTab'));
const OrdersTab = lazy(() => import('@ui/pages/admin/OrdersTab'));
const FacturacionTab = lazy(() => import('@ui/pages/admin/FacturacionTab'));
const UserManagement = lazy(() => import('@ui/pages/admin/UserManagement'));
const SettingsManager = lazy(() => import('@ui/pages/admin/SettingsManager'));
const DomainManagement = lazy(() => import('@ui/pages/admin/DomainManagement'));

function AdminTabFallback() {
  return (
    <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <CircularProgress size={36} color="primary" />
      <Typography variant="body2" color="text.secondary">
        Cargando módulo administrativo...
      </Typography>
    </Box>
  );
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`admin-tabpanel-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Toasts
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const showToast = (message: string, severity: 'success' | 'error' = 'success') =>
    setToast({ open: true, message, severity });
  const handleCloseToast = () => setToast((prev) => ({ ...prev, open: false }));

  const canManageUsers = user && ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY['encargado'];
  const isSuperadmin   = user && ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY['superadmin'];
  const isOwner        = user && ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY['owner'];

  const adminTitle = useMemo(() => {
    if (tabIndex === 0) return 'Inventario y Productos · Panel Zutech';
    if (tabIndex === 1) return 'Control de Pedidos · Panel Zutech';
    if (tabIndex === 2) return 'Facturación · Panel Zutech';
    if (canManageUsers && tabIndex === 3) return 'Gestión de Usuarios · Panel Zutech';
    if (isSuperadmin && tabIndex === (canManageUsers ? 4 : 3)) return 'Configuración del Sistema · Panel Zutech';
    if (isOwner && tabIndex === 5) return 'Gestión de Dominio · Panel Zutech';
    return 'Panel de Administración · Zutech';
  }, [tabIndex, canManageUsers, isSuperadmin, isOwner]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <SEO noIndex title={adminTitle} description="Panel de Administración de Zutech" />
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, flexGrow: 1 }}>
        {/* Header Admin */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton
            aria-label="Abrir menú de administración"
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { xs: 'block', md: 'none' }, color: 'primary.main' }}
          >
            <MenuIcon fontSize="large" />
          </IconButton>

          <AdminPanelSettingsIcon
            sx={{ fontSize: '2.5rem', color: 'primary.main', display: { xs: 'none', md: 'block' } }}
          />
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
              Panel de Administración
            </Typography>
            {user && (
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip label={user.username} size="small" />
                <Chip
                  label={user.role}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ textTransform: 'capitalize' }}
                />
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <DomainAlert />
        </Box>

        {/* Tabs de Escritorio */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: { xs: 'none', md: 'block' } }}>
          <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} aria-label="admin tabs" variant="scrollable">
            <Tab label="Productos" />
            <Tab label="Pedidos" />
            <Tab label="Facturación" />
            {canManageUsers && <Tab label="Usuarios" />}
            {isSuperadmin && <Tab label="Configuración" />}
            {isOwner && (
              <Tab
                icon={<LanguageIcon sx={{ mr: 1, fontSize: 20 }} />}
                iconPosition="start"
                label="Dominio"
                sx={{ minHeight: 48, pt: '12px' }}
              />
            )}
          </Tabs>
        </Box>

        {/* Drawer de Móvil */}
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{ sx: { width: 260, borderRadius: 0 } }}
        >
          <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6" fontWeight={700}>
              Menú Admin
            </Typography>
          </Box>
          <List>
            {['Productos', 'Pedidos', 'Facturación'].map((text, index) => (
              <ListItem key={text} disablePadding>
                <ListItemButton
                  selected={tabIndex === index}
                  onClick={() => {
                    setTabIndex(index);
                    setDrawerOpen(false);
                  }}
                >
                  <ListItemText primary={text} />
                </ListItemButton>
              </ListItem>
            ))}
            {canManageUsers && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={tabIndex === 3}
                  onClick={() => {
                    setTabIndex(3);
                    setDrawerOpen(false);
                  }}
                >
                  <ListItemText primary="Usuarios" />
                </ListItemButton>
              </ListItem>
            )}
            {isSuperadmin && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={tabIndex === (canManageUsers ? 4 : 3)}
                  onClick={() => {
                    setTabIndex(canManageUsers ? 4 : 3);
                    setDrawerOpen(false);
                  }}
                >
                  <ListItemText primary="Configuración" />
                </ListItemButton>
              </ListItem>
            )}
            {isOwner && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={tabIndex === 5}
                  onClick={() => {
                    setTabIndex(5);
                    setDrawerOpen(false);
                  }}
                >
                  <ListItemText primary="Dominio" />
                </ListItemButton>
              </ListItem>
            )}
          </List>
        </Drawer>

        {/* Contenido de Pestañas con Suspense */}
        <TabPanel value={tabIndex} index={0}>
          <Suspense fallback={<AdminTabFallback />}>
            <ProductsTab showToast={showToast} />
          </Suspense>
        </TabPanel>

        <TabPanel value={tabIndex} index={1}>
          <Suspense fallback={<AdminTabFallback />}>
            <OrdersTab showToast={showToast} />
          </Suspense>
        </TabPanel>

        <TabPanel value={tabIndex} index={2}>
          <Suspense fallback={<AdminTabFallback />}>
            <FacturacionTab showToast={showToast} />
          </Suspense>
        </TabPanel>

        {canManageUsers && (
          <TabPanel value={tabIndex} index={3}>
            <Suspense fallback={<AdminTabFallback />}>
              <UserManagement />
            </Suspense>
          </TabPanel>
        )}

        {isSuperadmin && (
          <TabPanel value={tabIndex} index={canManageUsers ? 4 : 3}>
            <Suspense fallback={<AdminTabFallback />}>
              <SettingsManager />
            </Suspense>
          </TabPanel>
        )}

        {isOwner && (
          <TabPanel value={tabIndex} index={5}>
            <Suspense fallback={<AdminTabFallback />}>
              <DomainManagement />
            </Suspense>
          </TabPanel>
        )}
      </Container>

      {/* Notificaciones Toast Globales */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%', borderRadius: 0, boxShadow: 3 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
