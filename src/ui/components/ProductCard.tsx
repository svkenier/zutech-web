import { Link as RouterLink } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import VisibilityIcon from '@mui/icons-material/Visibility';
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

  const handleAddToCart = () => {
    addToCart({ id, title, brand, price, image: image || ITEM_IMAGE_FALLBACK });
  };

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: 'background.paper',
        position: 'relative'
      }}
    >
      <Box sx={{ position: 'relative', pt: '100%', overflow: 'hidden' }}>
        <CardMedia
          component="img"
          image={image || ITEM_IMAGE_FALLBACK}
          alt={title}
          sx={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'contain',
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            p: 2,
            transition: 'transform 0.3s ease-in-out',
            '&:hover': {
              transform: 'scale(1.05)'
            }
          }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = ITEM_IMAGE_FALLBACK; }}
        />
        {destacado && (
          <Chip
            label="Destacado"
            color="warning"
            size="small"
            sx={{ position: 'absolute', top: 8, left: 8, fontWeight: 700 }}
          />
        )}
        <Chip
          label={inStock ? 'En Stock' : 'Agotado'}
          color={inStock ? 'success' : 'error'}
          size="small"
          variant="filled"
          sx={{ position: 'absolute', top: 8, right: 8, fontWeight: 600 }}
        />
      </Box>

      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
          {brand || 'Genérico'} • {category || 'Varios'}
        </Typography>
        <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} sx={{ mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {title}
        </Typography>
        <Box sx={{ mt: 'auto' }}>
          <Typography variant="h6" color="primary.main" fontWeight={800}>
            ${Number(price).toFixed(2)}
          </Typography>
        </Box>
      </CardContent>

      <Box sx={{ p: 2, pt: 0 }}>
        <Stack spacing={1}>
          <Button 
            variant="contained" 
            fullWidth 
            onClick={handleAddToCart}
            disabled={!inStock}
            startIcon={<AddShoppingCartIcon />}
            sx={{ fontWeight: 700 }}
          >
            Añadir al carrito
          </Button>
          <Button 
            component={RouterLink} 
            to={`/productos/${id}`} 
            variant="outlined" 
            fullWidth
            startIcon={<VisibilityIcon />}
          >
            Ver Detalles
          </Button>
        </Stack>
      </Box>
    </Card>
  );
}
