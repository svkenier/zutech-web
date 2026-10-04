/**
 * App.tsx — Enrutamiento principal de petRescue.
 *
 * Rutas públicas: /, /productos, /productos/:id, /requisitos, /terminos, /privacidad, /login
 * Rutas protegidas: /admin (minRole: empleado)
 *
 * AuthProvider envuelve toda la app para que useAuth() esté disponible
 * en Navbar, ProtectedRoute y cualquier página que lo necesite.
 */
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { AuthProvider } from '@ui/context/AuthContext';
import ProtectedRoute from '@ui/components/ProtectedRoute';
import ScrollToTop from '@ui/components/ScrollToTop';
import ConfigErrorBanner from '@ui/components/ConfigErrorBanner';

// ─── Lazy-loading de páginas (code splitting automático por Vite) ──────────────
import Home from '@ui/pages/public/Home';
const ProductsPage = lazy(() => import('@ui/pages/public/ProductsPage'));
const ProductDetailPage = lazy(() => import('@ui/pages/public/ProductDetailPage'));
const ServicesPage  = lazy(() => import('@ui/pages/public/ServicesPage'));

const Terms        = lazy(() => import('@ui/pages/utility/Terms'));
const Privacy      = lazy(() => import('@ui/pages/utility/Privacy'));
const Login        = lazy(() => import('@ui/pages/admin/Login'));
const Admin        = lazy(() => import('@ui/pages/admin/Admin'));
const NotFound     = lazy(() => import('@ui/pages/utility/NotFound'));

// ─── Fallback de carga ───────────────────────────────────────────────────────
function PageLoader() {
  return (
    <Box
      sx={{
        minHeight:      '100vh',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        bgcolor:        'background.default',
      }}
    >
      <CircularProgress color="primary" />
    </Box>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <ScrollToTop />
        <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <ConfigErrorBanner />
          <Routes>
            {/* Rutas públicas */}
            <Route path="/"           element={<Home />} />
            <Route path="/productos"   element={<ProductsPage />} />
            <Route path="/productos/:id" element={<ProductDetailPage />} />
            <Route path="/servicios"   element={<ServicesPage />} />

            <Route path="/terminos"   element={<Terms />} />
            <Route path="/privacidad" element={<Privacy />} />
            <Route path="/login"      element={<Login />} />

            {/* Ruta protegida — acceso mínimo: empleado */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute minRole="empleado">
                  <Admin />
                </ProtectedRoute>
              }
            />

            {/* Catch-all → 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Box>
      </Suspense>
    </AuthProvider>
  );
}
