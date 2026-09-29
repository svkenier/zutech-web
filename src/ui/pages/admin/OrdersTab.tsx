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
import ReceiptIcon from '@mui/icons-material/Receipt';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
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
import Alert from '@mui/material/Alert';
import { get, put, post, formatApiError } from '@core/api/client';
import OrderEditModal, { EditableOrder, OrderItem } from '@ui/components/OrderEditModal';
import AdminEmptyState from '@ui/components/AdminEmptyState';
import InvoiceModal from '@ui/components/InvoiceModal';

export default function OrdersTab({ showToast }: { showToast: (m: string, s?: 'success'|'error') => void }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [editOrder, setEditOrder] = useState<EditableOrder | null>(null);
  
  // Modals state
  const [approveOrder, setApproveOrder] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  
  const [discardOrder, setDiscardOrder] = useState<any | null>(null);
  const [revertOrder, setRevertOrder] = useState<any | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);
  const [viewOrder, setViewOrder] = useState<any | null>(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

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
    if (filter === 'all') return true;
    if (filter === 'pending') {
      return (o.status === 'pendiente' || o.status === 'pending') && pendingApproval !== o.id;
    } else {
      return (o.status === 'aprobado' || o.status === 'approved') || pendingApproval === o.id;
    }
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string, action: string, updates?: any, payment_method?: string }) => put('/admin/orders', args),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (err) => {
      showToast(formatApiError(err, 'Error actualizando orden'), 'error');
    }
  });

  const handleConfirmApprove = () => {
    if (!paymentMethod) {
      showToast('Debe seleccionar un método de pago', 'error');
      return;
    }
    const orderId = approveOrder.id;
    const method = paymentMethod;
    setApproveOrder(null);
    setPaymentMethod('');

    // Optimistic Update with Undo
    setPendingApproval(orderId);
    showToast('Pedido aprobado. Deshacer disponible...', 'success');

    approvalTimeoutRef.current = setTimeout(() => {
      // Commit
      updateMutation.mutate({ id: orderId, action: 'aprobar', payment_method: method });
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

  const handleConfirmRevert = () => {
    if (revertOrder) {
      updateMutation.mutate({ id: revertOrder.id, action: 'revertir' }, {
        onSuccess: () => {
          showToast('Pedido devuelto a pendientes');
          setRevertOrder(null);
        }
      });
    }
  };

  const handleConfirmDiscard = () => {
    if (discardOrder) {
      updateMutation.mutate({ id: discardOrder.id, action: 'descartar' }, {
        onSuccess: () => {
          showToast('Pedido descartado');
          setDiscardOrder(null);
        }
      });
    }
  };

  const handleSaveEdit = (id: string, newItems: OrderItem[], newTotal: number) => {
    updateMutation.mutate({ id, action: 'edit', updates: { items: newItems, totalUSD: newTotal } }, {
      onSuccess: () => {
        setEditOrder(null);
        showToast('Pedido actualizado');
      }
    });
  };

  const isMutating = updateMutation.isPending;

  // Calculate live box summary (orders approved and not closed)
  const openBoxOrders = orders.filter(o => o.status === 'aprobado' || o.status === 'approved');
  const boxSummary = openBoxOrders.reduce((acc, o) => {
    acc.total += o.totalUSD;
    acc.count += 1;
    acc[o.payment_method] = (acc[o.payment_method] || 0) + o.totalUSD;
    return acc;
  }, { total: 0, count: 0, pago_movil: 0, transferencia: 0, zelle: 0, binance: 0, efectivo: 0 });

  const closeMutation = useMutation({
    mutationFn: () => post('/admin/orders/close', {}),
    onSuccess: () => {
      showToast('Caja cerrada exitosamente', 'success');
      setCloseModalOpen(false);
      void qc.invalidateQueries({ queryKey: ['admin-orders'] });
      void qc.invalidateQueries({ queryKey: ['admin-closures'] });
    },
    onError: (err) => showToast(formatApiError(err, 'Error al cerrar caja'), 'error')
  });

  const isMutating = updateMutation.isPending || closeMutation.isPending;

  return (
    <Box>
      <Box mb={3} p={2.5} border="1px solid" borderColor="divider" borderRadius={2} bgcolor="background.paper" boxShadow={1}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" fontSize="0.75rem" textTransform="uppercase">ESTADO DE CAJA ABIERTA (EN VIVO)</Typography>
          <Button variant="contained" color="primary" startIcon={<LockIcon />} size="small" onClick={() => setCloseModalOpen(true)} disabled={isLoading || isMutating}>
            Realizar Cierre de Caja
          </Button>
        </Box>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} mt={1} alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight={800} color="text.primary" fontSize="1.75rem">${boxSummary.total.toFixed(2)}</Typography>
            <Typography variant="body2" color="text.secondary">Total acumulado de {boxSummary.count} órdenes aprobadas hoy</Typography>
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

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={filter} onChange={(_, v) => setFilter(v)}>
          <Tab value="all" label="Todos" disabled={isMutating} />
          <Tab value="pending" label="Pendientes" disabled={isMutating} />
          <Tab value="approved" label="Aprobados" disabled={isMutating} />
        </Tabs>
      </Box>

      {pendingApproval && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'warning.light', color: 'warning.contrastText', borderRadius: 1 }}>
          <Typography fontWeight={700}>Aprobación en progreso para la orden {pendingApproval}</Typography>
          <Button variant="contained" color="inherit" size="small" startIcon={<UndoIcon />} onClick={handleUndoApprove} sx={{ color: 'black' }} disabled={isMutating}>
            Deshacer
          </Button>
        </Box>
      )}

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
          {visibleOrders.map(order => {
            const isPending = (order.status === 'pendiente' || order.status === 'pending') && pendingApproval !== order.id;
            const isApproved = (order.status === 'aprobado' || order.status === 'approved') || pendingApproval === order.id;

            return (
              <Card key={order.id} variant="outlined" sx={{ borderRadius: 0 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" mb={1} alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h6" fontWeight={700}>{order.id}</Typography>
                      {filter === 'all' && (
                        isPending ? (
                          <Chip label="Pendiente" size="small" color="warning" />
                        ) : (
                          <Chip label="Aprobado" size="small" color="success" />
                        )
                      )}
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {order.payment_method && (
                        <Chip label={order.payment_method.replace('_', ' ').toUpperCase()} size="small" variant="outlined" color="primary" />
                      )}
                      <Typography variant="h6" color="primary.main" fontWeight={800}>${order.totalUSD.toFixed(2)}</Typography>
                    </Stack>
                  </Box>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    {new Date(order.created_at).toLocaleString()} • {order.client?.name} ({order.client?.phone})
                  </Typography>
                  <Typography variant="body2" mb={1}>
                    <strong>Entrega:</strong> {order.delivery?.method === 'pickup' ? 'Pick up' : `Delivery: ${order.delivery?.address}`}
                  </Typography>
                  <Box bgcolor="background.default" p={1} borderRadius={1} border="1px solid" borderColor="divider">
                    {order.items.slice(0, 3).map((it: any, idx: number) => (
                      <Typography key={idx} variant="caption" display="block">
                        {it.quantity}x {it.title} (${it.price.toFixed(2)})
                      </Typography>
                    ))}
                    {order.items.length > 3 ? (
                      <Button size="small" variant="text" sx={{ mt: 1, p: 0, minWidth: 0, textTransform: 'none', fontWeight: 'bold' }} onClick={() => setViewOrder(order)}>
                        + Ver {order.items.length - 3} productos más
                      </Button>
                    ) : (
                      <Button size="small" variant="text" sx={{ mt: 1, p: 0, minWidth: 0, textTransform: 'none', fontWeight: 'bold' }} onClick={() => setViewOrder(order)}>
                        Ver Detalle
                      </Button>
                    )}
                  </Box>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                  {isPending ? (
                    <Stack direction="row" spacing={1} width="100%">
                      <Button variant="contained" color="success" fullWidth onClick={() => {
                        setApproveOrder(order);
                        setPaymentMethod(order.payment_method || '');
                      }} startIcon={<CheckIcon />} disabled={isMutating || pendingApproval === order.id}>
                        Aprobar
                      </Button>
                      <Button variant="outlined" color="primary" fullWidth onClick={() => setEditOrder(order)} startIcon={<EditIcon />} disabled={isMutating || pendingApproval === order.id}>
                        Editar
                      </Button>
                      <Button variant="outlined" color="error" onClick={() => setDiscardOrder(order)} disabled={isMutating || pendingApproval === order.id}>
                        <DeleteIcon />
                      </Button>
                    </Stack>
                  ) : isApproved ? (
                    <Stack direction="row" spacing={1} width="100%">
                      <Button variant="outlined" color="primary" fullWidth onClick={() => setInvoiceOrder(order)} startIcon={<ReceiptIcon />} disabled={isMutating}>
                        Ver Factura
                      </Button>
                      <Button variant="outlined" color="inherit" fullWidth onClick={() => pendingApproval === order.id ? handleUndoApprove() : setRevertOrder(order)} startIcon={<UndoIcon />} disabled={isMutating} sx={{ color: 'text.primary' }}>
                        Revertir a Pendiente
                      </Button>
                    </Stack>
                  ) : null}
                </CardActions>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Approve Modal */}
      <Dialog open={!!approveOrder} onClose={() => !isMutating && setApproveOrder(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Aprobar Pedido {approveOrder?.id}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            Selecciona el método de pago utilizado por el cliente.
          </Typography>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel>Método de Pago</InputLabel>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              label="Método de Pago"
            >
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
          <Typography variant="body2" mb={2}><strong>Entrega:</strong> {viewOrder?.delivery?.method === 'pickup' ? 'Pick up' : `Delivery: ${viewOrder?.delivery?.address}`}</Typography>
          
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Productos ({viewOrder?.items?.length || 0})</Typography>
          <Box bgcolor="background.default" p={1.5} borderRadius={1} border="1px solid" borderColor="divider">
            {viewOrder?.items?.map((it: any, idx: number) => (
              <Box key={idx} display="flex" justifyContent="space-between" mb={1} borderBottom={idx < viewOrder.items.length - 1 ? '1px solid' : 'none'} borderColor="divider" pb={idx < viewOrder.items.length - 1 ? 1 : 0}>
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
          {(viewOrder?.status === 'pendiente' || viewOrder?.status === 'pending') && pendingApproval !== viewOrder?.id && (
            <Button variant="contained" color="success" onClick={() => {
              setApproveOrder(viewOrder);
              setPaymentMethod(viewOrder.payment_method || '');
              setViewOrder(null);
            }} startIcon={<CheckIcon />} disabled={isMutating}>
              Aprobar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <InvoiceModal 
        open={!!invoiceOrder} 
        order={invoiceOrder} 
        onClose={() => setInvoiceOrder(null)} 
      />

      {/* Close Caja Modal */}
      <Dialog open={closeModalOpen} onClose={() => !isMutating && setCloseModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Realizar Cierre de Caja</DialogTitle>
        <DialogContent>
          {openBoxOrders.length === 0 ? (
            <Typography color="error" mt={1}>
              No hay órdenes aprobadas pendientes de cierre. Debe aprobar órdenes primero.
            </Typography>
          ) : (
            <Box mt={1}>
              <Typography variant="body2" mb={2}>
                Se agruparán <strong>{openBoxOrders.length}</strong> órdenes aprobadas en un nuevo cierre oficial.
              </Typography>
              <Box p={2} border="1px solid" borderColor="divider" borderRadius={1} bgcolor="background.default">
                <Typography variant="subtitle2" mb={1}>Totales a declarar:</Typography>
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between"><Typography variant="body2">Pago Móvil</Typography><Typography variant="body2">${boxSummary.pago_movil.toFixed(2)}</Typography></Box>
                  <Box display="flex" justifyContent="space-between"><Typography variant="body2">Transferencia</Typography><Typography variant="body2">${boxSummary.transferencia.toFixed(2)}</Typography></Box>
                  <Box display="flex" justifyContent="space-between"><Typography variant="body2">Zelle</Typography><Typography variant="body2">${boxSummary.zelle.toFixed(2)}</Typography></Box>
                  <Box display="flex" justifyContent="space-between"><Typography variant="body2">Binance</Typography><Typography variant="body2">${boxSummary.binance.toFixed(2)}</Typography></Box>
                  <Box display="flex" justifyContent="space-between"><Typography variant="body2">Efectivo</Typography><Typography variant="body2">${boxSummary.efectivo.toFixed(2)}</Typography></Box>
                  <Box display="flex" justifyContent="space-between" mt={1} pt={1} borderTop="1px solid"><Typography variant="body2" fontWeight={700}>TOTAL CAJA</Typography><Typography variant="body2" fontWeight={700}>${boxSummary.total.toFixed(2)}</Typography></Box>
                </Stack>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseModalOpen(false)} disabled={isMutating}>Cancelar</Button>
          <Button onClick={() => closeMutation.mutate()} variant="contained" color="primary" disabled={isMutating || openBoxOrders.length === 0}>
            {isMutating ? <CircularProgress size={24} /> : 'Confirmar y Cerrar Caja'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
