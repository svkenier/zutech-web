import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import InventoryIcon from '@mui/icons-material/Inventory';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AdminEmptyState from '@ui/components/AdminEmptyState';
import type { BaseRecord } from '@core/types/record';

interface AdminProductMobileListProps {
  products: BaseRecord[];
  isLoading: boolean;
  onEdit: (product: BaseRecord) => void;
  onDelete: (product: BaseRecord) => void;
  onNewProduct: () => void;
}

export default function AdminProductMobileList({
  products,
  isLoading,
  onEdit,
  onDelete,
  onNewProduct,
}: AdminProductMobileListProps) {
  return (
    <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Skeleton variant="rectangular" height={100} />
            </CardContent>
          </Card>
        ))
      ) : (
        products.map((product) => (
          <Card key={product.id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', gap: 2, pb: 1 }}>
              {product.main_image ? (
                <Box
                  component="img"
                  src={product.main_image}
                  alt={product.title ? `Foto de ${product.title}` : 'Foto'}
                  width="80"
                  height="80"
                  loading="lazy"
                  sx={{ width: 80, height: 80, objectFit: 'cover' }}
                />
              ) : (
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: '#F5F5F4',
                    border: '1px solid #E7E5E4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <InventoryIcon sx={{ color: 'primary.main', opacity: 0.5, fontSize: 40 }} />
                </Box>
              )}
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  {product.title} {product.attributes?.destacado && '⭐'}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  {(product.attributes?.brand as string) || 'Sin Marca'} •{' '}
                  {(product.attributes?.category as string) || 'Sin Categoría'}
                </Typography>
                <Typography variant="body2" fontWeight={700} color="primary" mb={0.5}>
                  ${Number(product.attributes?.price).toFixed(2)}
                </Typography>
                <Chip
                  label={product.attributes?.in_stock ? 'En Stock' : 'Agotado'}
                  size="small"
                  variant="outlined"
                  color={product.attributes?.in_stock ? 'success' : 'error'}
                />
              </Box>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
              <Stack direction="row" spacing={1} width="100%">
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  fullWidth
                  href={`/productos/${product.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<OpenInNewIcon />}
                >
                  Ver
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={() => onEdit(product)}
                  startIcon={<EditIcon />}
                >
                  Editar
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => onDelete(product)}
                  sx={{ minWidth: 40, px: 0 }}
                  aria-label="Eliminar producto"
                >
                  <DeleteIcon />
                </Button>
              </Stack>
            </CardActions>
          </Card>
        ))
      )}
      {(!products || products.length === 0) && !isLoading && (
        <AdminEmptyState
          iconType="inventory"
          title="No hay productos para mostrar"
          subtitle="Ajusta los filtros o agrega nuevos productos."
          actionButton={
            <Button variant="outlined" onClick={onNewProduct} startIcon={<AddIcon />}>
              Registrar Producto
            </Button>
          }
        />
      )}
    </Box>
  );
}
