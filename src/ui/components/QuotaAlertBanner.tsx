import { Alert, AlertTitle, Button, Box } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export default function QuotaAlertBanner({ totalProducts }: { totalProducts: number }) {
  if (totalProducts < 50000) return null;

  const isCritical = totalProducts >= 60000;

  return (
    <Box sx={{ mb: 3 }}>
      <Alert 
        severity={isCritical ? "error" : "warning"}
        icon={<WarningAmberIcon />}
        sx={{
          borderRadius: '12px',
          border: '1px solid',
          borderColor: isCritical ? 'error.main' : 'warning.main',
          bgcolor: isCritical ? 'rgba(211, 47, 47, 0.05)' : 'rgba(237, 108, 2, 0.05)',
        }}
        action={
          <Button color="inherit" size="small" variant="outlined">
            Purgar Inventario
          </Button>
        }
      >
        <AlertTitle sx={{ fontWeight: 600 }}>
          {isCritical ? "Capacidad de Almacenamiento Crítica" : "Alerta de Capacidad de Inventario"}
        </AlertTitle>
        El registro actual cuenta con <strong>{totalProducts.toLocaleString()}</strong> artículos. 
        Se recomienda ejecutar una purga de inventario descontinuado antes de alcanzar el límite de 60,000 para evitar incurrir en costos adicionales de almacenamiento R2 / KV.
      </Alert>
    </Box>
  );
}
