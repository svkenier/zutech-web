import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, del, formatApiError } from '@core/api/client';
import QuotaAlertBanner from '@ui/components/QuotaAlertBanner';
import ProductForm from '@ui/components/ProductForm';
import BulkImportModal from '@ui/components/BulkImportModal';
import AdminProductTable from '../products/AdminProductTable';
import AdminProductMobileList from '../products/AdminProductMobileList';
import type { BaseRecord, PaginatedRecords } from '@core/types/record';

interface ProductsTabProps {
  showToast: (message: string, severity?: 'success' | 'error') => void;
}

export default function ProductsTab({ showToast }: ProductsTabProps) {
  const qc = useQueryClient();

  // Estados de formularios y modales
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<BaseRecord | null>(null);
  const [productToDelete, setProductToDelete] = useState<BaseRecord | null>(null);

  // Filtros
  const [productSearch, setProductSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('Todos');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  // Query de productos
  const { data: productsData, isLoading: productsLoading, isError: productsError } = useQuery<PaginatedRecords>({
    queryKey: ['products-index'],
    queryFn: async () => {
      const res = await get<BaseRecord[] | { records: BaseRecord[] }>(`/public/products?t=${Date.now()}`);
      const records: BaseRecord[] = Array.isArray(res)
        ? res
        : (res as { records: BaseRecord[] }).records ?? [];

      records.sort((a, b) => {
        const aDestacado = Boolean(a.attributes?.destacado);
        const bDestacado = Boolean(b.attributes?.destacado);
        if (aDestacado && !bDestacado) return -1;
        if (!aDestacado && bDestacado) return 1;
        return 0;
      });

      return {
        records,
        page: 1,
        limit: records.length,
        total: records.length,
      } as PaginatedRecords;
    },
    staleTime: 60000,
  });

  // Filtrado reactivo en memoria
  const { filteredProducts, uniqueCategories } = useMemo(() => {
    if (!productsData?.records) return { filteredProducts: [], uniqueCategories: [] };

    let records = [...productsData.records];
    const cats = new Set<string>();

    productsData.records.forEach((p) => {
      if (p.attributes?.category) cats.add(p.attributes.category as string);
    });

    if (productSearch) {
      const term = productSearch.toLowerCase();
      records = records.filter((p) => p.title.toLowerCase().includes(term));
    }

    if (stockFilter !== 'Todos') {
      const wantsStock = stockFilter === 'En Stock';
      records = records.filter((p) => Boolean(p.attributes?.in_stock) === wantsStock);
    }

    if (categoryFilter !== 'Todas') {
      records = records.filter((p) => p.attributes?.category === categoryFilter);
    }

    return { filteredProducts: records, uniqueCategories: Array.from(cats).sort() };
  }, [productsData, productSearch, stockFilter, categoryFilter]);

  // Mutación de eliminación
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => del(`/admin/products/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products-index'] });
      setProductToDelete(null);
      showToast('Producto eliminado del catálogo');
    },
    onError: (error) => {
      showToast(formatApiError(error, 'Error al eliminar el registro'), 'error');
    },
  });

  const handleOpenEdit = (product: BaseRecord) => {
    setProductToEdit(product);
    setProductFormOpen(true);
  };

  const handleCloseForm = () => {
    setProductFormOpen(false);
    setProductToEdit(null);
  };

  return (
    <>
      <QuotaAlertBanner totalProducts={productsData?.records?.length || 0} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          Gestión de Productos
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<UploadFileIcon />}
            onClick={() => setBulkModalOpen(true)}
            sx={{ borderRadius: 0 }}
          >
            Carga Masiva
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setProductToEdit(null);
              setProductFormOpen(true);
            }}
            sx={{ borderRadius: 0 }}
          >
            Registrar Producto
          </Button>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 0, bgcolor: 'background.paper' }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" width="100%">
          <TextField
            placeholder="Buscar producto, marca..."
            variant="outlined"
            size="small"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 200 } }}
          />
          <FormControl size="small" sx={{ minWidth: 160, flexGrow: { xs: 1, sm: 0 } }}>
            <InputLabel>Stock</InputLabel>
            <Select value={stockFilter} label="Stock" onChange={(e) => setStockFilter(e.target.value)}>
              <MenuItem value="Todos">Todos</MenuItem>
              <MenuItem value="En Stock">En Stock</MenuItem>
              <MenuItem value="Agotados">Agotados</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160, flexGrow: { xs: 1, sm: 0 } }}>
            <InputLabel>Categoría</InputLabel>
            <Select
              value={categoryFilter}
              label="Categoría"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="Todas">Todas</MenuItem>
              {uniqueCategories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={async () => {
              const { exportCatalogToExcel } = await import('@core/excel/catalogExporter');
              exportCatalogToExcel(filteredProducts);
            }}
            sx={{ ml: 'auto' }}
          >
            Exportar
          </Button>
        </Box>
      </Paper>

      {productsError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No se pudo cargar el índice. Verifica la configuración de GitHub.
        </Alert>
      )}

      {/* Vista Móvil */}
      <AdminProductMobileList
        products={filteredProducts}
        isLoading={productsLoading}
        onEdit={handleOpenEdit}
        onDelete={setProductToDelete}
        onNewProduct={() => {
          setProductToEdit(null);
          setProductFormOpen(true);
        }}
      />

      {/* Vista Escritorio */}
      <AdminProductTable
        products={filteredProducts}
        isLoading={productsLoading}
        onEdit={handleOpenEdit}
        onDelete={setProductToDelete}
        onNewProduct={() => {
          setProductToEdit(null);
          setProductFormOpen(true);
        }}
      />

      {/* Diálogo de Confirmación de Eliminación */}
      <Dialog
        open={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 0 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            ¿Estás seguro de que deseas eliminar permanentemente "{productToDelete?.title}" del catálogo?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setProductToDelete(null)}
            disabled={deleteProductMutation.isPending}
            sx={{ borderRadius: 0 }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => productToDelete && deleteProductMutation.mutate(productToDelete.id)}
            disabled={deleteProductMutation.isPending}
            startIcon={
              deleteProductMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />
            }
            sx={{ borderRadius: 0 }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Formularios Modales */}
      {productFormOpen && (
        <ProductForm
          open={productFormOpen}
          onClose={handleCloseForm}
          initial={productToEdit}
          onSuccess={() => {
            handleCloseForm();
            void qc.invalidateQueries({ queryKey: ['products-index'] });
            showToast(productToEdit ? 'Producto actualizado' : 'Producto registrado exitosamente');
          }}
        />
      )}

      {bulkModalOpen && (
        <BulkImportModal
          open={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          onSuccess={() => {
            void qc.invalidateQueries({ queryKey: ['products-index'] });
            showToast('Importación masiva completada');
          }}
        />
      )}
    </>
  );
}
