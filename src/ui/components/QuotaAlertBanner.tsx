import { useState, useEffect } from 'react';
import { Alert, AlertTitle, Box } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const FORCE_PREVIEW = true; // Activo temporalmente para revisión visual
const DISMISS_KEY = 'zutech_quota_banner_dismissed';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function QuotaAlertBanner({ totalProducts }: { totalProducts: number }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (FORCE_PREVIEW) {
      setIsVisible(true);
      return;
    }

    if (totalProducts >= 60000) {
      const lastDismissed = localStorage.getItem(DISMISS_KEY);
      if (lastDismissed) {
        const timeSinceDismiss = Date.now() - parseInt(lastDismissed, 10);
        if (timeSinceDismiss < SEVEN_DAYS_MS) {
          setIsVisible(false);
          return;
        }
      }
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [totalProducts]);

  const handleClose = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const displayCount = FORCE_PREVIEW ? 61420 : totalProducts;

  return (
    <Box sx={{ mb: 3 }}>
      <Alert 
        severity="warning"
        icon={<WarningAmberIcon />}
        onClose={handleClose}
        sx={{
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'warning.main',
          bgcolor: 'rgba(237, 108, 2, 0.05)',
        }}
      >
        <AlertTitle sx={{ fontWeight: 600 }}>
          Límite de catálogo sugerido
        </AlertTitle>
        Tu inventario cuenta con <strong>{displayCount.toLocaleString()}</strong> artículos. Superar los 60.000 productos registrados podría generar costos adicionales de almacenamiento. Te sugerimos eliminar artículos que ya no estén a la venta.
      </Alert>
    </Box>
  );
}
