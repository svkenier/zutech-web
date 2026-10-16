import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import ReceiptIcon from '@mui/icons-material/Receipt';
import type { AdminOrderRecord, OrderItem, OrderStatusFilter } from './orderTypes';

interface OrderCardItemProps {
  order: AdminOrderRecord;
  filter: OrderStatusFilter;
  pendingApproval: string | null;
  isMutating: boolean;
  onApprove: (order: AdminOrderRecord) => void;
  onEdit: (order: AdminOrderRecord) => void;
  onDiscard: (order: AdminOrderRecord) => void;
  onInvoice: (order: AdminOrderRecord) => void;
  onRevert: (order: AdminOrderRecord) => void;
  onUndoApprove: () => void;
  onViewDetail: (order: AdminOrderRecord) => void;
}

export default function OrderCardItem({
  order,
  filter,
  pendingApproval,
  isMutating,
  onApprove,
  onEdit,
  onDiscard,
  onInvoice,
  onRevert,
  onUndoApprove,
  onViewDetail,
}: OrderCardItemProps) {
  const isPending = order.status === 'pending' && pendingApproval !== order.id;
  const isApproved = order.status === 'approved' || pendingApproval === order.id;

  const paymentLabel = (method: string) => {
    switch (method) {
      case 'pago_movil':
        return 'Pago Móvil';
      case 'transferencia':
        return 'Transferencia';
      case 'zelle':
        return 'Zelle';
      case 'binance':
        return 'Binance';
      case 'efectivo':
        return 'Efectivo';
      default:
        return method;
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" mb={1} alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" fontWeight={500} color="text.secondary">
              {order.id.slice(0, -4)}
              <Box component="span" fontWeight={800} color="primary.main">
                {order.id.slice(-4)}
              </Box>
            </Typography>
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
              <Chip 
                label={paymentLabel(order.payment_method)} 
                size="small" 
                variant="outlined" 
                color="primary" 
              />
            )}
            <Typography variant="h6" color="primary.main" fontWeight={800}>
              ${order.totalUSD.toFixed(2)}
            </Typography>
          </Stack>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={1}>
          {new Date(order.created_at).toLocaleString()} • {order.client?.name} ({order.client?.phone})
        </Typography>
        <Typography variant="body2" mb={1}>
          <strong>Entrega:</strong> {(order.delivery_type || order.delivery?.method) === 'pickup' ? 'Pick up' : 'Delivery (se coordina por WhatsApp)'}
        </Typography>
        <Box bgcolor="background.default" p={1} borderRadius={1} border="1px solid" borderColor="divider">
          {order.items.slice(0, 3).map((it: OrderItem, idx: number) => (
            <Typography key={idx} variant="caption" display="block">
              {it.quantity}x {it.title} (${it.price.toFixed(2)})
            </Typography>
          ))}
          {order.items.length > 3 ? (
            <Button 
              size="small" 
              variant="text" 
              sx={{ mt: 1, p: 0, minWidth: 0, textTransform: 'none', fontWeight: 'bold' }} 
              onClick={() => onViewDetail(order)}
            >
              + Ver {order.items.length - 3} productos más
            </Button>
          ) : (
            <Button 
              size="small" 
              variant="text" 
              sx={{ mt: 1, p: 0, minWidth: 0, textTransform: 'none', fontWeight: 'bold' }} 
              onClick={() => onViewDetail(order)}
            >
              Ver Detalle
            </Button>
          )}
        </Box>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
        {isPending ? (
          <Stack direction="row" spacing={1} width="100%">
            <Button 
              variant="contained" 
              color="success" 
              fullWidth 
              onClick={() => onApprove(order)} 
              startIcon={<CheckIcon />} 
              disabled={isMutating || pendingApproval === order.id}
            >
              Aprobar
            </Button>
            <Button 
              variant="outlined" 
              color="primary" 
              fullWidth 
              onClick={() => onEdit(order)} 
              startIcon={<EditIcon />} 
              disabled={isMutating || pendingApproval === order.id}
            >
              Editar
            </Button>
            <Button 
              variant="outlined" 
              color="error" 
              onClick={() => onDiscard(order)} 
              disabled={isMutating || pendingApproval === order.id}
            >
              <DeleteIcon />
            </Button>
          </Stack>
        ) : isApproved ? (
          <Stack direction="row" spacing={1} width="100%">
            <Button 
              variant="outlined" 
              color="primary" 
              fullWidth 
              onClick={() => onInvoice(order)} 
              startIcon={<ReceiptIcon />} 
              disabled={isMutating}
            >
              Ver Factura
            </Button>
            <Button 
              variant="outlined" 
              color="inherit" 
              fullWidth 
              onClick={() => (pendingApproval === order.id ? onUndoApprove() : onRevert(order))} 
              startIcon={<UndoIcon />} 
              disabled={isMutating} 
              sx={{ color: 'text.primary' }}
            >
              Revertir a Pendiente
            </Button>
          </Stack>
        ) : null}
      </CardActions>
    </Card>
  );
}
