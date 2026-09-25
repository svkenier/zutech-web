import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';

export interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
}

export interface EditableOrder {
  id: string;
  client: { name: string; phone: string };
  items: OrderItem[];
  totalUSD: number;
}

interface OrderEditModalProps {
  open: boolean;
  order: EditableOrder | null;
  onClose: () => void;
  onSave: (id: string, newItems: OrderItem[], newTotal: number) => void;
}

export default function OrderEditModal({ open, order, onClose, onSave }: OrderEditModalProps) {
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (order) {
      setItems(order.items.map(i => ({ ...i })));
    }
  }, [order]);

  const handleUpdateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return { ...item, quantity: Math.max(0, newQ) };
      }
      return item;
    }).filter(i => i.quantity > 0));
  };

  const handleRemove = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const newTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleSave = () => {
    if (order) {
      onSave(order.id, items, newTotal);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
      <DialogTitle fontWeight={700}>Editar Pedido {order.id}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" color="text.secondary" mb={2}>
          Cliente: {order.client?.name} ({order.client?.phone})
        </Typography>
        <Stack spacing={2}>
          {items.map(item => (
            <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" fontWeight={600}>{item.title}</Typography>
                <Typography variant="caption" color="text.secondary">${item.price.toFixed(2)} c/u</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ bgcolor: 'action.hover', borderRadius: 1 }}>
                  <IconButton size="small" onClick={() => handleUpdateQuantity(item.id, -1)}><RemoveIcon fontSize="small" /></IconButton>
                  <Typography variant="body2" fontWeight={600}>{item.quantity}</Typography>
                  <IconButton size="small" onClick={() => handleUpdateQuantity(item.id, 1)}><AddIcon fontSize="small" /></IconButton>
                </Stack>
                <IconButton size="small" color="error" onClick={() => handleRemove(item.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
          {items.length === 0 && (
            <Typography variant="body2" color="error" align="center" py={2}>
              No hay ítems en la orden. Puedes descartarla desde el panel principal.
            </Typography>
          )}
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography fontWeight={700}>Nuevo Total:</Typography>
          <Typography fontWeight={800} color="primary.main">${newTotal.toFixed(2)}</Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={items.length === 0}>
          Guardar Cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
}
