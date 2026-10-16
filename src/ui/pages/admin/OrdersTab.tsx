import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import LockIcon from '@mui/icons-material/Lock';
import UndoIcon from '@mui/icons-material/Undo';
import CheckIcon from '@mui/icons-material/Check';

import { get, put, post, formatApiError } from '@core/api/client';
import OrderEditModal, { type EditableOrder, type OrderItem } from '@ui/components/OrderEditModal';
import AdminEmptyState from '@ui/components/AdminEmptyState';
import InvoiceModal from '@ui/components/InvoiceModal';

import type { AdminOrderRecord, BoxSummary, OrderDateFilter } from './orders/orderTypes';
import { useOrderFilters } from '@ui/hooks/useOrderFilters';
import { useOptimisticApproval } from '@ui/hooks/useOptimisticApproval';
import OrderCardItem from './orders/OrderCardItem';
import DailyCloseDialog from './orders/DailyCloseDialog';

interface OrdersTabProps {
  showToast: (m: string, s?: 'success' | 'error') => void;
}

export default function OrdersTab({ showToast }: OrdersTabProps) {
  const qc = useQueryClient();
  const [editOrder, setEditOrder] = useState<EditableOrder | null>(null);
  const [approveOrder, setApproveOrder] = useState<AdminOrderRecord | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [discardOrder, setDiscardOrder] = useState<AdminOrderRecord | null>(null);
  const [revertOrder, setRevertOrder] = useState<AdminOrderRecord | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<AdminOrderRecord | null>(null);
  const [viewOrder, setViewOrder] = useState<AdminOrderRecord | null>(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  const { data, isLoading } = useQuery<{ records: AdminOrderRecord[] }>({
    queryKey: ['admin-orders'],
    queryFn: () => get('/admin/orders?t=' + Date.now()),
    staleTime: 5000,
  });

  const orders = useMemo(() => data?.records || [], [data?.records]);

  const updateMutation = useMutation({
    mutationFn: (args: { id: string; action: string; updates?: { items: OrderItem[]; totalUSD: number }; payment_method?: string }) =>
      put('/admin/orders', args),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (err) => {
      showToast(formatApiError(err, 'Error actualizando orden'), 'error');
    },
  });

  const { pendingApproval, triggerApproval, handleUndoApprove } = useOptimisticApproval({
    onCommit: (orderId, method) => {
      updateMutation.mutate({ id: orderId, action: 'aprobar', payment_method: method });
    },
    showToast,
  });

  const {
    filter,
    setFilter,
    filterDelivery,
    setFilterDelivery,
    filterDate,
    setFilterDate,
    searchQuery,
    setSearchQuery,
    visibleOrders,
  } = useOrderFilters(orders, pendingApproval);

  const handleConfirmApprove = () => {
    if (!paymentMethod) {
      showToast('Debe seleccionar un método de pago', 'error');
      return;
    }
    if (!approveOrder) return;
    const orderId = approveOrder.id;
    const method = paymentMethod;
    setApproveOrder(null);
    setPaymentMethod('');
    triggerApproval(orderId, method);
  };

  const handleConfirmRevert = () => {
    if (revertOrder) {
      updateMutation.mutate({ id: revertOrder.id, action: 'revertir' }, {
        onSuccess: () => {
          showToast('Pedido devuelto a pendientes');
          setRevertOrder(null);
        },
      });
    }
  };

  const handleConfirmDiscard = () => {
    if (discardOrder) {
      updateMutation.mutate({ id: discardOrder.id, action: 'descartar' }, {
        onSuccess: () => {
          showToast('Pedido descartado');
          setDiscardOrder(null);
        },
      });
    }
  };

  const handleSaveEdit = (id: string, newItems: OrderItem[], newTotal: number) => {
    updateMutation.mutate({ id, action: 'edit', updates: { items: newItems, totalUSD: newTotal } }, {
      onSuccess: () => {
        setEditOrder(null);
        showToast('Pedido actualizado');
      },
    });
  };

  const openBoxOrders = useMemo(() => orders.filter((o) => o.status === 'approved'), [orders]);
  const boxSummary = useMemo<BoxSummary>(() => {
    return openBoxOrders.reduce<BoxSummary>(
      (acc, o) => {
        acc.total += o.totalUSD;
        acc.count += 1;
        acc[o.payment_method] = (acc[o.payment_method] || 0) + o.totalUSD;
        return acc;
      },
      { total: 0, count: 0, pago_movil: 0, transferencia: 0, zelle: 0, binance: 0, efectivo: 0 }
    );
  }, [openBoxOrders]);

  const closeMutation = useMutation({
    mutationFn: () => post('/admin/orders/close', {}),
    onSuccess: () => {
      showToast('Caja cerrada exitosamente', 'success');
      setCloseModalOpen(false);
      void qc.invalidateQueries({ queryKey: ['admin-orders'] });
      void qc.invalidateQueries({ queryKey: ['admin-closures'] });
    },
    onError: (err) => showToast(formatApiError(err, 'Error al cerrar caja'), 'error'),
  });

  const isMutating = updateMutation.isPending || closeMutation.isPending;

  return (
    <Box>
      {/* Live box summary banner */}
      <Box mb={3} p={2.5} border="1px solid" borderColor="divider" borderRadius={2} bgcolor="background.paper" boxShadow={1}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" fontSize="0.75rem" textTransform="uppercase">
            ESTADO DE CAJA ABIERTA (EN VIVO)
          </Typography>
          <Button variant="contained" color="primary" startIcon={<LockIcon />} size="small" onClick={() => setCloseModalOpen(true)} disabled={isLoading || isMutating}>
            Realizar Cierre de Caja
          </Button>
        </Box>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} mt={1} alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight={800} color="text.primary" fontSize="1.75rem">
              ${boxSummary.total.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total acumulado de {boxSummary.count} órdenes aprobadas hoy
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: { xs: 1, md: 0 } }}>
            <Box textAlign="center" px={2} borderRight="1px solid" borderColor="divider">
              <Typography variant="caption" display="block" color="text.secondary" fontSize="0.75rem">Pago Móvil</Typography>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary" fontSize="0.95rem">${boxSummary.pago_movil.toFixed(2)}</Typography>
            </Box>
            <Box textAlign="center" px={2} borderRight="1px solid" borderColor="divider">
              <Typography variant="caption" display="block" color="text.secondary" fontSize="0.75rem">Transferencia</Typography>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary" fontSize="0.95rem">${boxSummary.transferencia.toFixed(2)}</Typography>
            </Box>
            <Box textAlign="center" px={2} borderRight="1px solid" borderColor="divider">
              <Typography variant="caption" display="block" color="text.secondary" fontSize="0.75rem">Zelle</Typography>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary" fontSize="0.95rem">${boxSummary.zelle.toFixed(2)}</Typography>
            </Box>
            <Box textAlign="center" px={2} borderRight="1px solid" borderColor="divider">
              <Typography variant="caption" display="block" color="text.secondary" fontSize="0.75rem">Binance Pay</Typography>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary" fontSize="0.95rem">${boxSummary.binance.toFixed(2)}</Typography>
            </Box>
            <Box textAlign="center" px={2}>
              <Typography variant="caption" display="block" color="text.secondary" fontSize="0.75rem">Efectivo ($)</Typography>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary" fontSize="0.95rem">${boxSummary.efectivo.toFixed(2)}</Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>

      {/* Filters row */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Buscar orden, cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1, width: { xs: '100%', md: 'auto' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150, width: { xs: '100%', md: 'auto' } }}>
            <Select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value as OrderDateFilter)}
              displayEmpty
            >
              <MenuItem value="today">Hoy</MenuItem>
              <MenuItem value="last_7_days">Últimos 7 días</MenuItem>
              <MenuItem value="all">Todas las fechas</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center" sx={{ overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
          <Stack direction="row" spacing={1}>
            <Chip label="Todos" clickable variant={filter === 'all' ? 'filled' : 'outlined'} color={filter === 'all' ? 'primary' : 'default'} onClick={() => setFilter('all')} disabled={isMutating} />
            <Chip label="Pendientes" clickable variant={filter === 'pending' ? 'filled' : 'outlined'} color={filter === 'pending' ? 'warning' : 'default'} onClick={() => setFilter('pending')} disabled={isMutating} />
            <Chip label="Aprobados" clickable variant={filter === 'approved' ? 'filled' : 'outlined'} color={filter === 'approved' ? 'success' : 'default'} onClick={() => setFilter('approved')} disabled={isMutating} />
          </Stack>
          <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
          <Stack direction="row" spacing={1}>
            <Chip label="Todas entregas" clickable variant={filterDelivery === 'all' ? 'filled' : 'outlined'} color={filterDelivery === 'all' ? 'primary' : 'default'} onClick={() => setFilterDelivery('all')} />
            <Chip label="Delivery" clickable variant={filterDelivery === 'delivery' ? 'filled' : 'outlined'} color={filterDelivery === 'delivery' ? 'primary' : 'default'} onClick={() => setFilterDelivery('delivery')} />
            <Chip label="Pick up" clickable variant={filterDelivery === 'pickup' ? 'filled' : 'outlined'} color={filterDelivery === 'pickup' ? 'primary' : 'default'} onClick={() => setFilterDelivery('pickup')} />
          </Stack>
        </Stack>
      </Stack>

      {/* Optimistic Approval Banner */}
      {pendingApproval && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'warning.light', color: 'warning.contrastText', borderRadius: 1 }}>
          <Typography fontWeight={700}>Aprobación en progreso para la orden {pendingApproval}</Typography>
          <Button variant="contained" color="inherit" size="small" startIcon={<UndoIcon />} onClick={handleUndoApprove} sx={{ color: 'black' }} disabled={isMutating}>
            Deshacer
          </Button>
        </Box>
      )}

      {/* Orders List / Empty State */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
      ) : visibleOrders.length === 0 ? (
        <AdminEmptyState
          iconType="inventory"
          title={`No hay pedidos ${filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobados' : 'activos'}`}
          subtitle="Los pedidos aparecerán aquí."
        />
      ) : (
        <Stack spacing={2}>
          {visibleOrders.map((order) => (
            <OrderCardItem
              key={order.id}
              order={order}
              filter={filter}
              pendingApproval={pendingApproval}
              isMutating={isMutating}
              onApprove={(o) => {
                setApproveOrder(o);
                setPaymentMethod(o.payment_method || '');
              }}
              onEdit={(o) => setEditOrder(o as unknown as EditableOrder)}
              onDiscard={(o) => setDiscardOrder(o)}
              onInvoice={(o) => setInvoiceOrder(o)}
              onRevert={(o) => setRevertOrder(o)}
              onUndoApprove={handleUndoApprove}
              onViewDetail={(o) => setViewOrder(o)}
            />
          ))}
        </Stack>
      )}

      {/* Approve Modal */}
      <Dialog open={!!approveOrder} onClose={() => !isMutating && setApproveOrder(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Aprobar Pedido {approveOrder?.id}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>Selecciona el método de pago utilizado por el cliente.</Typography>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel>Método de Pago</InputLabel>
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} label="Método de Pago">
              <MenuItem value="pago_movil">Pago Móvil</MenuItem>
              <MenuItem value="transferencia">Transferencia Bancaria</MenuItem>
              <MenuItem value="zelle">Zelle</MenuItem>
              <MenuItem value="binance">Binance Pay</MenuItem>
              <MenuItem value="efectivo">Dólares en Efectivo</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveOrder(null)} disabled={isMutating}>Cancelar</Button>
          <Button onClick={handleConfirmApprove} variant="contained" color="success" disabled={isMutating || !paymentMethod}>
            {isMutating ? <CircularProgress size={24} color="inherit" /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revert Modal */}
      <Dialog open={!!revertOrder} onClose={() => !isMutating && setRevertOrder(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Revertir Pedido</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Estás seguro de que deseas devolver el pedido <strong>{revertOrder?.id}</strong> a pendientes?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevertOrder(null)} disabled={isMutating}>Cancelar</Button>
          <Button onClick={handleConfirmRevert} variant="contained" color="warning" disabled={isMutating}>
            {isMutating ? <CircularProgress size={24} /> : 'Revertir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Discard Modal */}
      <Dialog open={!!discardOrder} onClose={() => !isMutating && setDiscardOrder(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Descartar Pedido</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="error.main">
            ¿Estás seguro de que deseas eliminar permanentemente el pedido <strong>{discardOrder?.id}</strong>? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardOrder(null)} disabled={isMutating}>Cancelar</Button>
          <Button onClick={handleConfirmDiscard} variant="contained" color="error" disabled={isMutating}>
            {isMutating ? <CircularProgress size={24} color="inherit" /> : 'Descartar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Edit Modal */}
      <OrderEditModal
        open={!!editOrder}
        order={editOrder}
        onClose={() => setEditOrder(null)}
        onSave={handleSaveEdit}
      />

      {/* Detail Modal */}
      <Dialog open={!!viewOrder} onClose={() => setViewOrder(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Detalle del Pedido {viewOrder?.id}
          {viewOrder?.payment_method && (
            <Chip label={viewOrder.payment_method.replace('_', ' ').toUpperCase()} size="small" variant="outlined" color="primary" sx={{ ml: 2, verticalAlign: 'middle' }} />
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Datos del Cliente</Typography>
          <Typography variant="body2" mb={0.5}><strong>Nombre:</strong> {viewOrder?.client?.name}</Typography>
          <Typography variant="body2" mb={0.5}><strong>Teléfono:</strong> {viewOrder?.client?.phone}</Typography>
          <Typography variant="body2" mb={2}><strong>Entrega:</strong> {(viewOrder?.delivery_type || viewOrder?.delivery?.method) === 'pickup' ? 'Pick up' : 'Delivery (se coordina por WhatsApp)'}</Typography>
          
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Productos ({viewOrder?.items?.length || 0})</Typography>
          <Box bgcolor="background.default" p={1.5} borderRadius={1} border="1px solid" borderColor="divider">
            {viewOrder?.items?.map((it, idx) => (
              <Box key={idx} display="flex" justifyContent="space-between" mb={1} borderBottom={idx < (viewOrder?.items?.length || 0) - 1 ? '1px solid' : 'none'} borderColor="divider" pb={idx < (viewOrder?.items?.length || 0) - 1 ? 1 : 0}>
                <Typography variant="body2">{it.quantity}x {it.title}</Typography>
                <Typography variant="body2" fontWeight={600}>${(it.price * it.quantity).toFixed(2)}</Typography>
              </Box>
            ))}
            <Box display="flex" justifyContent="space-between" mt={2} pt={1} borderTop="2px solid" borderColor="divider">
              <Typography variant="subtitle1" fontWeight={800}>TOTAL</Typography>
              <Typography variant="subtitle1" fontWeight={800} color="primary.main">${viewOrder?.totalUSD?.toFixed(2)}</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOrder(null)}>Cerrar</Button>
          {viewOrder?.status === 'pending' && pendingApproval !== viewOrder?.id && (
            <Button
              variant="contained"
              color="success"
              onClick={() => {
                setApproveOrder(viewOrder);
                setPaymentMethod(viewOrder.payment_method || '');
                setViewOrder(null);
              }}
              startIcon={<CheckIcon />}
              disabled={isMutating}
            >
              Aprobar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Invoice Modal */}
      <InvoiceModal
        open={!!invoiceOrder}
        order={invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
      />

      {/* Daily Close Dialog */}
      <DailyCloseDialog
        open={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        onConfirm={() => closeMutation.mutate()}
        isMutating={isMutating}
        approvedCount={openBoxOrders.length}
        boxSummary={boxSummary}
      />
    </Box>
  );
}
