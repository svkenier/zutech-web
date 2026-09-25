import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import PrintIcon from '@mui/icons-material/Print';
import AdminEmptyState from '@ui/components/AdminEmptyState';
import { get } from '@core/api/client';

export default function FacturacionTab() {
  const { data, isLoading } = useQuery<{ records: any[] }>({
    queryKey: ['admin-orders'],
    queryFn: () => get('/admin/orders?t=' + Date.now()),
    staleTime: 5000,
  });

  const orders = data?.records || [];
  const approvedOrders = orders.filter(o => o.status === 'approved');

  if (isLoading) {
    return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;
  }

  if (approvedOrders.length === 0) {
    return (
      <AdminEmptyState 
        iconType="inventory"
        title="No hay pedidos listos para facturación"
        subtitle="Aprueba pedidos pendientes en la pestaña de Pedidos."
      />
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight={700}>Facturación y Despacho</Typography>
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
          Imprimir Resumen
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell sx={{ fontWeight: 700 }}>ID Pedido</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Fecha / Cliente</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Desglose de Ítems</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Entrega</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Total USD</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {approvedOrders.map((order) => (
              <TableRow key={order.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{order.id}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{order.client?.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{new Date(order.created_at).toLocaleString()}</Typography>
                </TableCell>
                <TableCell>
                  {order.items.map((it: any, idx: number) => (
                    <Typography key={idx} variant="caption" display="block">
                      {it.quantity}x {it.title} (${it.price.toFixed(2)})
                    </Typography>
                  ))}
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {order.delivery?.method === 'pickup' ? 'Pick up' : `Delivery: ${order.delivery?.address}`}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} color="primary.main">
                    ${order.totalUSD.toFixed(2)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
