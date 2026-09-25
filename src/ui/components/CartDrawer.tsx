import { useState } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useCart } from '@ui/context/CartContext';
import { ITEM_IMAGE_FALLBACK } from '@core/coreConfig';
import { post, formatApiError } from '@core/api/client';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

export default function CartDrawer() {
  const { cartItems, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, subtotal, clearCart, canCheckout, removeUnavailableItems } = useCart();
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('pickup'); // 'pickup' | 'delivery'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorToast, setErrorToast] = useState('');

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !phone || !canCheckout) return;

    setIsSubmitting(true);
    setErrorToast('');

    try {
      const payload = {
        client: { name, phone },
        delivery: { method: deliveryMethod, address: '' },
        items: cartItems.map(i => ({ id: i.id, title: i.title, quantity: i.quantity, price: i.price })),
        totalUSD: subtotal
      };

      const res = await post<{ ok: boolean, orderId: string }>('/public/orders', payload);

      if (res.ok && res.orderId) {
        const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '584121234567'; // Fallback
        
        let message = `¡Hola ZUTECH! 👋\nAcabo de generar el pedido *${res.orderId}* para *${deliveryMethod === 'pickup' ? 'Retiro en Tienda' : 'Delivery'}*:\n\n`;
        message += `👤 *Cliente:* ${name}\n`;
        message += `📱 *Teléfono:* ${phone}\n`;
        
        if (deliveryMethod === 'pickup') {
            message += `📦 *Método:* Retiro en Gran Bazar\n\n`;
        } else {
            message += `🛵 *Método:* Servicio de Delivery\n\n`;
        }
        
        message += `🛒 *Detalle del Pedido:*\n`;
        cartItems.forEach(item => {
          message += `- ${item.quantity}x ${item.title} - $${(item.price * item.quantity).toFixed(2)}\n`;
        });
        
        message += `...\n`;
        
        if (deliveryMethod === 'pickup') {
            message += `💰 *Total a Pagar:* $${subtotal.toFixed(2)} USD\n\n`;
            message += `Quedo a la espera de la confirmación para pasar a retirar. ¡Gracias!`;
        } else {
            message += `💰 *Total Productos:* $${subtotal.toFixed(2)} USD\n`;
            message += `⚠️ *Nota:* El costo del delivery se acordará con la tienda según la zona.\n\n`;
            message += `📍 *Ubicación de entrega:* (Por favor, adjunta aquí tu ubicación actual o punto de referencia exacto).`;
        }

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
        clearCart();
        setIsCartOpen(false);
        setCheckoutMode(false);
        setName('');
        setPhone('');
      }
    } catch (err) {
      setErrorToast(formatApiError(err, 'Error procesando la orden'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={isCartOpen}
      onClose={() => setIsCartOpen(false)}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 400 }, bgcolor: 'background.default', backgroundImage: 'none' }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight={700} display="flex" alignItems="center" gap={1}>
          <ShoppingCartIcon color="primary" /> Mi Carrito
        </Typography>
        <IconButton onClick={() => setIsCartOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        {cartItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <ShoppingCartIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Tu carrito está vacío</Typography>
          </Box>
        ) : checkoutMode ? (
          <form id="checkout-form" onSubmit={handleCheckout}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Datos del Cliente</Typography>
            <Stack spacing={2}>
              <TextField 
                label="Nombre Completo" 
                required 
                fullWidth 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
              <TextField 
                label="Teléfono" 
                required 
                fullWidth 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
              />
              
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" fontWeight={700}>Método de Entrega</Typography>
              
              <RadioGroup value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)}>
                <FormControlLabel value="pickup" control={<Radio />} label="Pick up (Gran bazar local # 326 y 327)" />
                <FormControlLabel value="delivery" control={<Radio />} label="Delivery" />
              </RadioGroup>
            </Stack>
          </form>
        ) : (
          <Stack spacing={2}>
            {cartItems.map(item => (
              <Box key={item.id} sx={{ display: 'flex', gap: 2, bgcolor: 'background.paper', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider', opacity: item.inStock ? 1 : 0.5 }}>
                <Box
                  component="img"
                  src={item.image || ITEM_IMAGE_FALLBACK}
                  alt={item.title}
                  sx={{ width: 60, height: 60, objectFit: 'contain', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}
                />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.title} {(!item.inStock) && <Typography component="span" color="error" variant="caption" fontWeight={700} ml={1}>(Agotado)</Typography>}
                  </Typography>
                  <Typography variant="caption" color={item.inStock ? "primary.main" : "text.secondary"} fontWeight={700}>${item.price.toFixed(2)}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ bgcolor: 'action.hover', borderRadius: 1 }}>
                      <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantity - 1)}><RemoveIcon fontSize="small" /></IconButton>
                      <Typography variant="body2" fontWeight={600}>{item.quantity}</Typography>
                      <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantity + 1)}><AddIcon fontSize="small" /></IconButton>
                    </Stack>
                    <IconButton size="small" color="error" onClick={() => removeFromCart(item.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {cartItems.length > 0 && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>Total a pagar:</Typography>
            <Typography variant="h6" fontWeight={800} color="primary.main">${subtotal.toFixed(2)}</Typography>
          </Box>
          {checkoutMode && deliveryMethod === 'delivery' && (
            <Typography variant="caption" color="warning.dark" sx={{ display: 'block', mb: 2, lineHeight: 1.3, fontWeight: 600, bgcolor: 'warning.light', p: 1, borderRadius: 1, color: 'warning.contrastText', backgroundColor: 'rgba(237, 108, 2, 0.1)' }}>
              ⚠️ El costo del delivery no está incluido y será cotizado por la tienda vía WhatsApp según su ubicación exacta.
            </Typography>
          )}
          {!canCheckout && cartItems.length > 0 && (
            <Button variant="outlined" color="warning" fullWidth sx={{ mb: 2 }} onClick={removeUnavailableItems}>
              Remover no disponibles
            </Button>
          )}
          {checkoutMode ? (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" fullWidth onClick={() => setCheckoutMode(false)} disabled={isSubmitting}>Atrás</Button>
              <Button 
                type="submit" 
                form="checkout-form" 
                variant="contained" 
                color="primary" 
                fullWidth 
                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <WhatsAppIcon />}
                disabled={!canCheckout || isSubmitting}
              >
                Hacer Pedido
              </Button>
            </Stack>
          ) : (
            <Button variant="contained" color="primary" fullWidth size="large" onClick={() => setCheckoutMode(true)} sx={{ fontWeight: 700 }} disabled={!canCheckout}>
              Procesar Compra
            </Button>
          )}
        </Box>
      )}

      <Snackbar open={!!errorToast} autoHideDuration={6000} onClose={() => setErrorToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setErrorToast('')} severity="error" sx={{ width: '100%', borderRadius: 0, boxShadow: 3 }}>
          {errorToast}
        </Alert>
      </Snackbar>
    </Drawer>
  );
}
