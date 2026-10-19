/**
 * ProtectedRoute — Guardián de rutas autenticadas.
 *
 * Redirige a /login si:
 *  - La sesión no está cargada aún (isLoading → muestra spinner).
 *  - El usuario no está autenticado.
 *  - El usuario no tiene el nivel de rol mínimo requerido.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '@ui/context/AuthContext';
import { ROLE_HIERARCHY, type UserRole } from '@core/types/user';
import { get } from '@core/api/client';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Rol mínimo requerido para acceder a la ruta.
   * @default 'empleado'
   */
  minRole?: UserRole;
}

export default function ProtectedRoute({
  children,
  minRole = 'empleado',
}: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    let intervalId: number | undefined;

    const checkSession = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastCheckRef.current < 30000) {
        return;
      }
      lastCheckRef.current = now;
      try {
        await get('/auth/verify');
      } catch {
        // El interceptor de Axios (client.ts) captura el 401, limpia la sesión y redirige
      }
    };

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      // Latido cada 30 segundos para respuesta pasiva
      intervalId = window.setInterval(() => checkSession(true), 30000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    // Revisión con throttling (30s) al recuperar el foco de la pestaña (evita saturación tras cámara/galería)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession(false);
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Para navegadores móviles (iOS Safari, Android) con throttling (30s)
    const handlePageShow = () => {
      checkSession(false);
      startPolling();
    };
    
    const handlePageHide = () => {
      stopPolling();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);

    // Verificación inicial
    if (document.visibilityState === 'visible') {
      checkSession(false);
      startPolling();
    }

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isAuthenticated]);

  // Verificar la sesión al cambiar de ruta interna (respetando throttle de 30s)
  useEffect(() => {
    if (isAuthenticated) {
      const now = Date.now();
      if (now - lastCheckRef.current >= 30000) {
        lastCheckRef.current = now;
        get('/auth/verify').catch(() => {});
      }
    }
  }, [location.pathname, isAuthenticated]);

  // Mientras se restaura la sesión desde localStorage
  if (isLoading) {
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

  // No autenticado → /login con estado de retorno
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Nivel insuficiente → /login (no revela la existencia de la ruta a roles menores)
  if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[minRole]) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
