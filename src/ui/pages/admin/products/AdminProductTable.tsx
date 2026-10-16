import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import InventoryIcon from '@mui/icons-material/Inventory';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AdminEmptyState from '@ui/components/AdminEmptyState';
import type { BaseRecord } from '@core/types/record';

interface AdminProductTableProps {
  products: BaseRecord[];
  isLoading: boolean;
  onEdit: (product: BaseRecord) => void;
  onDelete: (product: BaseRecord) => void;
  onNewProduct: () => void;
}

export default function AdminProductTable({
  products,
  isLoading,
  onEdit,
  onDelete,
  onNewProduct,
}: AdminProductTableProps) {
  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{
        borderRadius: 0,
        display: { xs: 'none', md: 'block' },
        bgcolor: 'background.paper',
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'background.default' }}>
            <TableCell sx={{ width: 60, color: 'text.secondary' }}></TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Producto</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Marca / Categoría</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Precio</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Stock</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Acciones
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton height={40} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : products.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell>
                    <Box
                      sx={{
                        position: 'relative',
                        width: 40,
                        height: 40,
                        bgcolor: 'background.default',
                        border: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <InventoryIcon
                        sx={{
                          color: 'primary.main',
                          opacity: 0.5,
                          fontSize: 24,
                          position: 'absolute',
                        }}
                      />
                      {product.main_image && (
                        <Box
                          component="img"
                          src={product.main_image}
                          alt={product.title ? `Miniatura de ${product.title}` : 'Miniatura'}
                          width="40"
                          height="40"
                          loading="lazy"
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            e.currentTarget.style.display = 'none';
                          }}
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 0,
                            objectFit: 'cover',
                            position: 'relative',
                            zIndex: 1,
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ minWidth: 200 }}>
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {product.title} {product.attributes?.destacado && '⭐'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(product as { sku?: string }).sku || product.attributes?.['sku'] || product.id}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 140, whiteSpace: 'nowrap' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {(product.attributes?.brand as string) || 'Sin Marca'}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {(product.attributes?.category as string) || 'Sin Categoría'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 100 }}>
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                      ${Number(product.attributes?.price).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={product.attributes?.in_stock ? 'En Stock' : 'Agotado'}
                      size="small"
                      variant="outlined"
                      color={product.attributes?.in_stock ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Ver ficha pública">
                      <IconButton
                        aria-label="Ver ficha pública"
                        size="small"
                        href={`/productos/${product.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar registro">
                      <IconButton
                        aria-label="Editar registro"
                        size="small"
                        color="primary"
                        onClick={() => onEdit(product)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar registro">
                      <IconButton
                        aria-label="Eliminar registro"
                        size="small"
                        color="error"
                        onClick={() => onDelete(product)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
          {(!products || products.length === 0) && !isLoading && (
            <TableRow>
              <TableCell colSpan={6} sx={{ p: 0, borderBottom: 0 }}>
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
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
