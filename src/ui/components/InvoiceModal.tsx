import { useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery } from '@tanstack/react-query';
import { get } from '@core/api/client';

interface InvoiceModalProps {
  open: boolean;
  order: any;
  onClose: () => void;
}

export default function InvoiceModal({ open, order, onClose }: InvoiceModalProps) {
  const { data: settingsData } = useQuery<any>({
    queryKey: ['settings'],
    queryFn: () => get('/settings'),
  });
  const settings = settingsData || {};

  const itemsList = useMemo(() => {
    if (!order?.items) return [];
    if (typeof order.items === 'string') {
      try { return JSON.parse(order.items); } catch { return []; }
    }
    return order.items;
  }, [order?.items]);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'pago_movil': return 'Pago Móvil';
      case 'transferencia': return 'Transferencia Bancaria';
      case 'zelle': return 'Zelle';
      case 'binance': return 'Binance Pay';
      case 'efectivo': return 'Dólares en Efectivo';
      default: return method || 'N/D';
    }
  };

  const isClosed = order.closure_id !== null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, '@media print': { display: 'none' } }}>
        <Stack direction="row" spacing={2}>
          <Button startIcon={<PrintIcon />} variant="contained" onClick={handlePrint}>
            Imprimir / Guardar PDF
          </Button>
          <Button startIcon={<CloseIcon />} variant="outlined" color="inherit" onClick={onClose}>
            Cerrar
          </Button>
        </Stack>
      </Box>

      <DialogContent id="invoice-print-root" sx={{ p: 4, bgcolor: 'white', color: 'black' }}>
        {/* CSS para impresión */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #invoice-print-root, #invoice-print-root * {
              visibility: visible;
            }
            #invoice-print-root {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
            }
            @page {
              margin: 1.5cm;
              size: A4 portrait;
            }
            .no-print {
              display: none;
            }
          }
        `}} />

        <Box className="invoice-header" sx={{ mb: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography fontWeight="bold" variant="h6">
                {settings?.store_name || 'ZuTech Store'}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {settings?.rif ? `RIF: ${settings.rif}` : 'RIF: J-00000000-0'}
              </Typography>
              {settings?.address && (
                <Typography color="text.secondary" variant="body2">
                  {settings.address}
                </Typography>
              )}
              {settings?.phone && (
                <Typography color="text.secondary" variant="body2">
                  Teléfono: {settings.phone}
                </Typography>
              )}
            </Box>
            <Box textAlign="right">
              <Typography variant="h6" fontWeight="bold">FACTURA / NOTA DE ENTREGA</Typography>
              <Typography variant="body1">N°: {order.id}</Typography>
              <Typography variant="body2">
                Fecha: {new Date(order.created_at || Date.now()).toLocaleDateString('es-VE')} 
              </Typography>
              <Typography variant="body2">
                Hora: {new Date(order.created_at || Date.now()).toLocaleTimeString('es-VE')}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" fontWeight="bold">Datos del Cliente:</Typography>
          <Typography variant="body2">Nombre: {order.customer_name || order.client?.name}</Typography>
          <Typography variant="body2">Teléfono: {order.customer_phone || order.client?.phone}</Typography>
          <Typography variant="body2">
            Entrega: {(order.delivery_type || order.delivery?.method) === 'pickup' ? 'Pick up (Retiro en tienda)' : 'Delivery (se coordina por WhatsApp)'}
          </Typography>
          <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
            Método de Pago: {getPaymentMethodLabel(order.payment_method)}
          </Typography>
          {!isClosed && (
            <Typography variant="caption" color="text.secondary" className="no-print">
              * Esta orden aún no forma parte de un cierre de caja.
            </Typography>
          )}
        </Box>

        <Box className="invoice-table" sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', borderBottom: '2px solid black', pb: 1, mb: 1, fontWeight: 'bold' }}>
            <Box sx={{ flex: 1 }}>Ítem</Box>
            <Box sx={{ width: 80, textAlign: 'center' }}>Cant</Box>
            <Box sx={{ width: 100, textAlign: 'right' }}>P. Unit</Box>
            <Box sx={{ width: 100, textAlign: 'right' }}>Subtotal</Box>
          </Box>
          
          {itemsList.length === 0 && (
            <Box sx={{ py: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">No hay ítems registrados en esta orden</Typography>
            </Box>
          )}
          {itemsList.map((it: any, idx: number) => (
            <Box key={idx} sx={{ display: 'flex', borderBottom: '1px solid #ddd', py: 1, pageBreakInside: 'avoid' }}>
              <Box sx={{ flex: 1 }}><Typography variant="body2">{it.title}</Typography></Box>
              <Box sx={{ width: 80, textAlign: 'center' }}><Typography variant="body2">{it.quantity}</Typography></Box>
              <Box sx={{ width: 100, textAlign: 'right' }}><Typography variant="body2">${(it.price || 0).toFixed(2)}</Typography></Box>
              <Box sx={{ width: 100, textAlign: 'right' }}><Typography variant="body2">${((it.price || 0) * (it.quantity || 1)).toFixed(2)}</Typography></Box>
            </Box>
          ))}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
            <Box sx={{ width: 200, display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem' }}>
              <Typography fontWeight="bold">TOTAL:</Typography>
              <Typography fontWeight="bold">${(order.total || order.totalUSD || 0).toFixed(2)}</Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 8, color: 'text.secondary' }}>
          <Typography variant="body2">Gracias por su compra en ZuTech Store.</Typography>
          <Typography variant="caption">Este documento no es una factura fiscal válida.</Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
