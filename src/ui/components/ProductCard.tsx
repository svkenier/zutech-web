import { Link as RouterLink } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { useCart } from '@ui/context/CartContext';
import { ITEM_IMAGE_FALLBACK } from '@core/coreConfig';

export interface ProductCardProps {
  id: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  inStock: boolean;
  image?: string;
  destacado?: boolean;
}

export default function ProductCard({ id, title, brand, category, price, inStock, image, destacado }: ProductCardProps) {
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent navigation since button is inside link
    addToCart({ id, title, brand, price, image: image || ITEM_IMAGE_FALLBACK });
  };

  return (
    <Card 
      component={RouterLink}
      to={`/productos/${id}`}
      sx={{
        p: 0,
        borderRadius: 3,
        border: '1px solid #E2E8F0',
        bgcolor: '#FFFFFF',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        textDecoration: 'none',
        color: 'inherit',
        opacity: inStock ? 1 : 0.6,
        filter: inStock ? 'none' : 'grayscale(1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: inStock ? '0 12px 24px -8px rgba(0, 0, 0, 0.08)' : 'none',
          borderColor: inStock ? '#CBD5E1' : '#E2E8F0',
          transform: inStock ? 'translateY(-3px)' : 'none',
          '& .product-image': {
            transform: inStock ? 'scale(1.05)' : 'none'
          }
        },
      }}
    >
      {/* Área Superior: Escenario Edge-to-Edge */}
      <Box sx={{ bgcolor: '#F8FAFC', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', height: { xs: 200, sm: 220 } }}>
        {/* Badge DESTACADO flotante en la esquina */}
        {destacado && (
          <Chip 
            label="DESTACADO" 
            size="small" 
            sx={{ 
              bgcolor: '#2563EB', color: '#FFFFFF', letterSpacing: '0.05em', fontSize: '0.65rem', 
              position: 'absolute', top: 12, left: 12, borderRadius: 9999, fontWeight: 700, zIndex: 2 
            }} 
          />
        )}
        {!inStock && (
          <Chip 
            label="AGOTADO" 
            size="small" 
            sx={{ 
              bgcolor: '#EF4444', color: '#FFFFFF', letterSpacing: '0.05em', fontSize: '0.65rem', 
              position: 'absolute', top: 12, right: 12, borderRadius: 9999, fontWeight: 700, zIndex: 2 
            }} 
          />
        )}

        {/* Imagen del producto */}
        <Box 
          component="img" 
          src={image || ITEM_IMAGE_FALLBACK} 
          alt={title}
          className="product-image"
          onError={(e: any) => { e.currentTarget.src = ITEM_IMAGE_FALLBACK; }}
          sx={{ 
            width: '100%', height: '100%', objectFit: 'contain', p: 2.5, 
            transition: 'transform 0.4s ease-out'
          }} 
        />
      </Box>

      {/* Cuerpo Informativo */}
      <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between', p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box>
          {/* Tags de Marca y Categoría */}
          <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.75rem', display: 'block', fontFamily: 'monospace', mb: 0.5 }}>
            [{brand || 'OEM'}] [{category || 'Hardware'}]
          </Typography>

          {/* Título del Producto */}
          <Typography variant="subtitle1" sx={{ color: '#0F172A', display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 1, textOverflow: 'ellipsis', fontWeight: 700, lineHeight: 1.3, mb: 1 }}>
            {title}
          </Typography>
        </Box>

        {/* Fila Inferior: Precio y Botón de Carrito */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, pt: 2, borderTop: '1px solid #F1F5F9' }}>
          <Typography variant="h6" sx={{ color: '#0F172A', fontSize: '1.15rem', fontWeight: 800 }}>
            ${Number(price).toFixed(2)}
          </Typography>

          <IconButton 
            aria-label="Agregar al carrito" 
            onClick={handleAddToCart}
            disabled={!inStock}
            sx={{ 
              bgcolor: inStock ? '#0F172A' : '#E2E8F0', 
              color: inStock ? '#FFFFFF' : '#94A3B8', 
              borderRadius: 2, 
              p: 1, 
              transition: 'all 0.2s', 
              '&:hover': { 
                bgcolor: inStock ? '#2563EB' : '#E2E8F0', 
                transform: inStock ? 'scale(1.05)' : 'none' 
              }, 
              '&:active': { 
                transform: inStock ? 'scale(0.95)' : 'none' 
              } 
            }}
          >
            <ShoppingCartOutlinedIcon fontSize="small"/>
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
}
