import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import type { BoxSummary } from './orderTypes';

interface DailyCloseDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isMutating: boolean;
  approvedCount: number;
  boxSummary: BoxSummary;
}

export default function DailyCloseDialog({
  open,
  onClose,
  onConfirm,
  isMutating,
  approvedCount,
  boxSummary,
}: DailyCloseDialogProps) {
  return (
    <Dialog open={open} onClose={() => !isMutating && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Realizar Cierre de Caja</DialogTitle>
      <DialogContent>
        {approvedCount === 0 ? (
          <Typography color="error" mt={1}>
            No hay órdenes aprobadas pendientes de cierre. Debe aprobar órdenes primero.
          </Typography>
        ) : (
          <Box mt={1}>
            <Typography variant="body2" mb={2}>
              Se agruparán <strong>{approvedCount}</strong> órdenes aprobadas en un nuevo cierre oficial.
            </Typography>
            <Box p={2} border="1px solid" borderColor="divider" borderRadius={1} bgcolor="background.default">
              <Typography variant="subtitle2" mb={1}>Totales a declarar:</Typography>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Pago Móvil</Typography>
                  <Typography variant="body2">${boxSummary.pago_movil.toFixed(2)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Transferencia</Typography>
                  <Typography variant="body2">${boxSummary.transferencia.toFixed(2)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Zelle</Typography>
                  <Typography variant="body2">${boxSummary.zelle.toFixed(2)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Binance</Typography>
                  <Typography variant="body2">${boxSummary.binance.toFixed(2)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Efectivo</Typography>
                  <Typography variant="body2">${boxSummary.efectivo.toFixed(2)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mt={1} pt={1} borderTop="1px solid" borderColor="divider">
                  <Typography variant="body2" fontWeight={700}>TOTAL CAJA</Typography>
                  <Typography variant="body2" fontWeight={700}>${boxSummary.total.toFixed(2)}</Typography>
                </Box>
              </Stack>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isMutating}>
          Cancelar
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained" 
          color="primary" 
          disabled={isMutating || approvedCount === 0}
        >
          {isMutating ? <CircularProgress size={24} /> : 'Confirmar y Cerrar Caja'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
