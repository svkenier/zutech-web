import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Stack from '@mui/material/Stack';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import { get, put, formatApiError } from '@core/api/client';
import OrderEditModal, { EditableOrder, OrderItem } from '@ui/components/OrderEditModal';
import AdminEmptyState from '@ui/components/AdminEmptyState';

export default function OrdersTab({ showToast }: { showToast: (m: string, s?: 'success'|'error') => void }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'approved'>('pending');
  const [editOrder, setEditOrder] = useState<EditableOrder | null>(null);

  // Undo state
  const [pendingApproval, setPendingApproval] = useState<string | null>(null);
  const approvalTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data, isLoading } = useQuery<{ records: any[] }>({
    queryKey: ['admin-orders'],
    queryFn: () => get('/admin/orders?t=' + Date.now()),
    staleTime: 5000,
  });

  const orders = data?.records || [];
  
  // Optimistic approval filter: if ID is in pendingApproval, treat it as approved locally
  const visibleOrders = orders.filter(o => {
    if (filter === 'pending') {
      return o.status === 'pending' && pendingApproval !== o.id;
    } else {
      return o.status === 'approved' || pendingApproval === o.id;
    }
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string, action: string, updates?: any }) => put('/admin/orders', args),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (err) => {
      showToast(formatApiError(err, 'Error actualizando orden'), 'error');
    }
  });

  const handleApprove = (orderId: string) => {
    // Optimistic Update with Undo
    setPendingApproval(orderId);
    showToast('Pedido aprobado. Deshacer disponible...', 'success');

    approvalTimeoutRef.current = setTimeout(() => {
      // Commit
      updateMutation.mutate({ id: orderId, action: 'approve' });
      setPendingApproval(null);
    }, 5000);
  };

  const handleUndoApprove = () => {
    if (approvalTimeoutRef.current) {
      clearTimeout(approvalTimeoutRef.current);
      approvalTimeoutRef.current = null;
    }
    setPendingApproval(null);
    showToast('Aprobación cancelada');
  };

  const handleRevert = (orderId: string) => {
    if (pendingApproval === orderId) {
      handleUndoApprove();
    } else {
      updateMutation.mutate({ id: orderId, action: 'revert' }, {
        onSuccess: () => showToast('Pedido devuelto a pendientes')
      });
    }
  };

  const handleDiscard = (orderId: string) => {
    updateMutation.mutate({ id: orderId, action: 'discard' }, {
      onSuccess: () => showToast('Pedido descartado')
    });
  };

  const handleSaveEdit = (id: string, newItems: OrderItem[], newTotal: number) => {
    updateMutation.mutate({ id, action: 'edit', updates: { items: newItems, totalUSD: newTotal } }, {
      onSuccess: () => {
        setEditOrder(null);
        showToast('Pedido actualizado');
      }
    });
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={filter} onChange={(_, v) => setFilter(v)}>
          <Tab value="pending" label="Pendientes" />
          <Tab value="approved" label="Aprobados" />
        </Tabs>
      </Box>

      {pendingApproval && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'warning.light', color: 'warning.contrastText', borderRadius: 1 }}>
          <Typography fontWeight={700}>Aprobación en progreso para la orden {pendingApproval}</Typography>
          <Button variant="contained" color="inherit" size="small" startIcon={<UndoIcon />} onClick={handleUndoApprove} sx={{ color: 'black' }}>
            Deshacer
          </Button>
        </Box>
      )}

      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
      ) : visibleOrders.length === 0 ? (
        <AdminEmptyState 
          iconType="inventory"
          title={`No hay pedidos ${filter === 'pending' ? 'pendientes' : 'aprobados'}`}
          subtitle="Los pedidos aparecerán aquí."
        />
      ) : (
        <Stack spacing={2}>
          {visibleOrders.map(order => (
            <Card key={order.id} variant="outlined" sx={{ borderRadius: 0 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="h6" fontWeight={700}>{order.id}</Typography>
                  <Typography variant="h6" color="primary.main" fontWeight={800}>${order.totalUSD.toFixed(2)}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  {new Date(order.created_at).toLocaleString()} • {order.client?.name} ({order.client?.phone})
                </Typography>
                <Typography variant="body2" mb={1}>
                  <strong>Entrega:</strong> {order.delivery?.method === 'pickup' ? 'Pick up' : `Delivery: ${order.delivery?.address}`}
                </Typography>
                <Box bgcolor="background.default" p={1} borderRadius={1} border="1px solid" borderColor="divider">
                  {order.items.map((it: any, idx: number) => (
                    <Typography key={idx} variant="caption" display="block">
                      {it.quantity}x {it.title} (${it.price.toFixed(2)})
                    </Typography>
                  ))}
                </Box>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                {filter === 'pending' ? (
                  <Stack direction="row" spacing={1} width="100%">
                    <Button variant="contained" color="success" fullWidth onClick={() => handleApprove(order.id)} startIcon={<CheckIcon />}>
                      Aprobar
                    </Button>
                    <Button variant="outlined" color="primary" fullWidth onClick={() => setEditOrder(order)} startIcon={<EditIcon />}>
                      Editar
                    </Button>
                    <Button variant="outlined" color="error" onClick={() => handleDiscard(order.id)}>
                      <DeleteIcon />
                    </Button>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} width="100%">
                    <Button variant="outlined" color="warning" fullWidth onClick={() => handleRevert(order.id)} startIcon={<UndoIcon />}>
                      Revertir a Pendiente
                    </Button>
                  </Stack>
                )}
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}

      <OrderEditModal 
        open={!!editOrder} 
        order={editOrder} 
        onClose={() => setEditOrder(null)} 
        onSave={handleSaveEdit}
      />
    </Box>
  );
}
