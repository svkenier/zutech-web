import { Link as RouterLink } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TechBadge from './TechBadge';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
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
    e.preventDefault(); // prevent navigation since card might be wrapped or button is inside link
    addToCart({ id, title, brand, price, image: image || ITEM_IMAGE_FALLBACK });
  };

  return (
    <Card 
      component={RouterLink}
      to={`/productos/${id}`}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: 'background.default',
        textDecoration: 'none',
        color: 'inherit',
        position: 'relative'
      }}
    >
      <Box sx={{ position: 'relative', pt: '80%', overflow: 'hidden', borderBottom: '1px solid', borderColor: 'divider' }}>
        <CardMedia
          component="img"
          image={image || ITEM_IMAGE_FALLBACK}
          alt={title}
          sx={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'contain',
            bgcolor: '#FFFFFF',
            p: 3,
            transition: 'transform 0.4s ease-in-out',
            '&:hover': {
              transform: 'scale(1.05)'
            }
          }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = ITEM_IMAGE_FALLBACK; }}
        />
        <Box sx={{ position: 'absolute', top: 12, left: 12, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {destacado && (
            <TechBadge label="Destacado" color="info" variant="solid" />
          )}
          {!inStock && (
            <TechBadge label="Agotado" color="error" variant="solid" />
          )}
        </Box>
      </Box>

      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'text.secondary', bgcolor: 'background.paper', px: 1, py: 0.2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            [{brand || 'OEM'}]
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'text.secondary', bgcolor: 'background.paper', px: 1, py: 0.2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            [{category || 'Hardware'}]
          </Typography>
        </Box>

        <Typography variant="subtitle1" fontWeight={700} lineHeight={1.3} sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 1, color: 'text.primary' }}>
          {title}
        </Typography>

        <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" color="text.primary" fontWeight={800} sx={{ fontFamily: 'monospace', fontSize: '1.25rem', letterSpacing: -0.5 }}>
            ${Number(price).toFixed(2)}
          </Typography>
          
          <Button 
            variant="contained" 
            onClick={handleAddToCart}
            disabled={!inStock}
            sx={{ 
              minWidth: 0, 
              p: 1, 
              bgcolor: 'primary.main', 
              color: 'primary.contrastText',
              borderRadius: 1,
              '&:hover': {
                bgcolor: 'primary.main',
                opacity: 0.9,
              }
            }}
          >
            <AddShoppingCartIcon fontSize="small" />
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
