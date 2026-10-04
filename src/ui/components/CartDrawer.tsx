import { useState, useEffect } from 'react';
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
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormHelperText from '@mui/material/FormHelperText';
import { useCart } from '@ui/context/CartContext';
import { ITEM_IMAGE_FALLBACK } from '@core/coreConfig';
import { post, formatApiError } from '@core/api/client';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme, alpha } from '@mui/material/styles';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { getCheckoutUrl, openWhatsApp } from '@ui/utils/whatsapp';

const validationSchema = Yup.object({
  name: Yup.string().min(3, 'El nombre completo es requerido').required('El nombre completo es requerido'),
  phone: Yup.string().matches(/^[0-9+\-\s()]+$/, 'Ingresa un número de contacto válido').min(7, 'Ingresa un número de contacto válido').required('Ingresa un número de contacto válido'),
  deliveryMethod: Yup.string().oneOf(['pickup', 'delivery']).required(),
  paymentMethod: Yup.string().required('Selecciona un método de pago')
});

import { useQuery } from '@tanstack/react-query';

export default function CartDrawer() {
  const { cartItems, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, subtotal, clearCart, canCheckout, removeUnavailableItems } = useCart();
  const { data: settings } = useQuery<any>({ queryKey: ['settings'], queryFn: () => get('/settings'), staleTime: 60000 });
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [errorToast, setErrorToast] = useState('');

  const formik = useFormik({
    initialValues: {
      name: '',
      phone: '',
      deliveryMethod: 'pickup',
      paymentMethod: ''
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      if (!canCheckout) return;

      setErrorToast('');

      try {
        const payload = {
          client: { name: values.name, phone: values.phone },
          delivery: { method: values.deliveryMethod, address: '' },
          payment_method: values.paymentMethod,
          items: cartItems.map(i => ({ id: i.id, title: i.title, quantity: i.quantity, price: i.price })),
          totalUSD: subtotal
        };

        const res = await post<{ success?: boolean, ok?: boolean, orderId: string }>('/public/orders', payload);

        if ((res.success || res.ok) && res.orderId) {
          const whatsappNumber = settings?.whatsapp || '';
          
          let itemsText = '';
          cartItems.forEach(item => {
            itemsText += `- ${item.quantity}x ${item.title} ($${(item.price * item.quantity).toFixed(2)})\n`;
          });
          itemsText = itemsText.trimEnd();
          
          let deliveryInstructions = '';
          if (values.deliveryMethod === 'delivery') {
              deliveryInstructions = `*DELIVERY:* El costo se calculará con la tienda vía WhatsApp según tu zona.\n*Por favor, comparte tu ubicación actual por este chat para cotizar el envío.*`;
          }
          
          let paymentInstructions = '';
          if (values.paymentMethod !== 'Dólares en Efectivo') {
              paymentInstructions = `*Por favor, adjunta tu comprobante de pago por aquí para procesar tu orden.*`;
          } else {
              paymentInstructions = `*Pago en efectivo al retirar en tienda.*`;
          }

          const whatsappUrl = getCheckoutUrl(whatsappNumber, {
            orderId: res.orderId,
            name: values.name,
            phone: values.phone,
            deliveryMethod: values.deliveryMethod === 'pickup' ? 'Retiro en Tienda' : 'Delivery',
            paymentMethod: values.paymentMethod,
            itemsText,
            total: subtotal.toFixed(2),
            deliveryInstructions,
            paymentInstructions
          });
          
          openWhatsApp(whatsappUrl);
          clearCart();
          setIsCartOpen(false);
          setCheckoutMode(false);
          formik.resetForm();
        }
      } catch (err: any) {
        if (err?.status === 409 || err?.message?.includes('409') || err?.message?.includes('precio')) {
          setErrorToast('⚠️ Los precios del catálogo han cambiado. Por favor recarga la página para ver los precios actualizados.');
        } else {
          setErrorToast(formatApiError(err, 'Error procesando la orden'));
        }
      } finally {
        setSubmitting(false);
      }
    }
  });

  useEffect(() => {
    if (formik.values.deliveryMethod === 'delivery' && formik.values.paymentMethod === 'Dólares en Efectivo') {
      formik.setFieldValue('paymentMethod', '');
    }
  }, [formik.values.deliveryMethod, formik.values.paymentMethod, formik.setFieldValue]);

  const theme = useTheme();

  return (
    <Drawer
      anchor="right"
      open={isCartOpen}
      onClose={() => setIsCartOpen(false)}
      PaperProps={{
        sx: { 
          width: { xs: '100%', sm: 400 }, 
          bgcolor: alpha(theme.palette.background.default, 0.95), 
          backdropFilter: 'blur(10px)',
          backgroundImage: 'none',
          borderLeft: '1px solid',
          borderColor: 'divider'
        }
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
          <form id="checkout-form" onSubmit={formik.handleSubmit}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Datos del Cliente</Typography>
            <Stack spacing={2}>
              <TextField 
                label="Nombre Completo" 
                name="name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
                fullWidth 
              />
              <TextField 
                label="Teléfono" 
                name="phone"
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.phone && Boolean(formik.errors.phone)}
                helperText={formik.touched.phone && formik.errors.phone}
                fullWidth 
              />
              
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" fontWeight={700}>Método de Entrega</Typography>
              
              <RadioGroup 
                name="deliveryMethod"
                value={formik.values.deliveryMethod} 
                onChange={formik.handleChange}
              >
                <FormControlLabel value="pickup" control={<Radio />} label="Pick up (Gran bazar local # 326 y 327)" />
                <FormControlLabel value="delivery" control={<Radio />} label="Delivery" />
              </RadioGroup>

              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" fontWeight={700}>Método de Pago</Typography>
              
              <FormControl fullWidth error={formik.touched.paymentMethod && Boolean(formik.errors.paymentMethod)}>
                <InputLabel id="payment-method-label">Selecciona tu pago</InputLabel>
                <Select
                  labelId="payment-method-label"
                  name="paymentMethod"
                  value={formik.values.paymentMethod}
                  label="Selecciona tu pago"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  <MenuItem value="Pago Móvil">Pago Móvil</MenuItem>
                  <MenuItem value="Transferencia Bancaria">Transferencia Bancaria</MenuItem>
                  <MenuItem value="Zelle">Zelle</MenuItem>
                  <MenuItem value="Binance Pay (USDT)">Binance Pay (USDT)</MenuItem>
                  {formik.values.deliveryMethod === 'pickup' && (
                    <MenuItem value="Dólares en Efectivo">Dólares en Efectivo</MenuItem>
                  )}
                </Select>
                {formik.touched.paymentMethod && formik.errors.paymentMethod && (
                  <FormHelperText>{formik.errors.paymentMethod}</FormHelperText>
                )}
              </FormControl>
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
          {checkoutMode && formik.values.deliveryMethod === 'delivery' && (
            <Typography variant="caption" color="warning.dark" sx={{ display: 'block', mb: 2, lineHeight: 1.3, fontWeight: 600, p: 1, borderRadius: 1, backgroundColor: 'rgba(237, 108, 2, 0.1)' }}>
              🛵 <strong>Costo de Delivery:</strong> No está incluido en este monto. Se cotizará con la tienda por WhatsApp según la ubicación exacta que compartas por el chat (costo adicional).
            </Typography>
          )}
          {checkoutMode && ['Pago Móvil', 'Transferencia Bancaria', 'Zelle', 'Binance Pay (USDT)'].includes(formik.values.paymentMethod) && (
            <Typography variant="caption" color="info.dark" sx={{ display: 'block', mb: 2, lineHeight: 1.3, fontWeight: 600, p: 1, borderRadius: 1, backgroundColor: 'rgba(2, 136, 209, 0.1)' }}>
              📸 <strong>Comprobante de pago:</strong> Recuerda que para procesar y validar tu orden es indispensable adjuntar la captura del comprobante de pago por el chat de WhatsApp una vez enviado el pedido.
            </Typography>
          )}
          {checkoutMode && formik.values.paymentMethod === 'Dólares en Efectivo' && (
            <Typography variant="caption" color="success.dark" sx={{ display: 'block', mb: 2, lineHeight: 1.3, fontWeight: 600, p: 1, borderRadius: 1, backgroundColor: 'rgba(46, 125, 50, 0.1)' }}>
              💵 <strong>Pago en tienda:</strong> Pagarás el monto exacto en efectivo al momento de retirar tu pedido en la tienda física.
            </Typography>
          )}
          {!canCheckout && cartItems.length > 0 && (
            <Button variant="outlined" color="warning" fullWidth sx={{ mb: 2 }} onClick={removeUnavailableItems}>
              Remover no disponibles
            </Button>
          )}
          {checkoutMode ? (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" fullWidth onClick={() => setCheckoutMode(false)} disabled={formik.isSubmitting}>Atrás</Button>
              <Button 
                type="submit" 
                form="checkout-form" 
                variant="contained" 
                color="primary" 
                fullWidth 
                startIcon={formik.isSubmitting ? <CircularProgress size={20} color="inherit" /> : <WhatsAppIcon />}
                disabled={!canCheckout || formik.isSubmitting}
                onClick={() => {
                  if (!formik.isValid) {
                    formik.submitForm();
                  }
                }}
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
