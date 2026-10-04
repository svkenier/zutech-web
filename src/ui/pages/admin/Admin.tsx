/**
 * Admin — Panel de Administración Principal.
 *
 * Secciones (Pestañas):
 * 1. Productos: Tabla con todos los productos. CRUD (crear, editar, eliminar).
 * 2. Usuarios: Gestión de usuarios del sistema (solo encargado/superadmin).
 */

import { useState, useMemo } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Snackbar from '@mui/material/Snackbar';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import AdminEmptyState from '@ui/components/AdminEmptyState';
import QuotaAlertBanner from '@ui/components/QuotaAlertBanner';
import AddIcon       from '@mui/icons-material/Add';
import EditIcon      from '@mui/icons-material/Edit';
import DeleteIcon    from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import InventoryIcon from '@mui/icons-material/Inventory';
import MenuIcon from '@mui/icons-material/Menu';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Stack from '@mui/material/Stack';
import LanguageIcon from '@mui/icons-material/Language';
import Navbar from '@ui/components/Navbar';
import ProductForm from '@ui/components/ProductForm';
import UserManagement from '@ui/pages/admin/UserManagement';
import SettingsManager from '@ui/pages/admin/SettingsManager';
import DomainManagement from '@ui/pages/admin/DomainManagement';
import DomainAlert from '@ui/components/DomainAlert';
import OrdersTab from '@ui/pages/admin/OrdersTab';
import FacturacionTab from '@ui/pages/admin/FacturacionTab';
import BulkImportModal from '@ui/components/BulkImportModal';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { exportCatalogToExcel } from '@core/excel/catalogExporter';
import { useAuth } from '@ui/context/AuthContext';
import { get, del, formatApiError } from '@core/api/client';
import { ROLE_HIERARCHY } from '@core/types/user';
import type { BaseRecord, PaginatedRecords } from '@core/types/record';
import SEO from '@core/media/SEO';


// ─── Pestañas ─────────────────────────────────────────────────────────────────

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`admin-tabpanel-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Admin() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [tabIndex, setTabIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Estados Productos
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen]     = useState(false);
  const [productToEdit, setProductToEdit]     = useState<BaseRecord | null>(null);
  const [productToDelete, setProductToDelete] = useState<BaseRecord | null>(null);

  // Snackbar para Toasts
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const showToast = (message: string, severity: 'success' | 'error' = 'success') => setToast({ open: true, message, severity });
  const handleCloseToast = () => setToast((prev) => ({ ...prev, open: false }));

  // Carga de productos (desde CDN)
  const { data: productsData, isLoading: productsLoading, isError: productsError } = useQuery<PaginatedRecords>({
    queryKey: ['products-index'],
    queryFn: async () => {
      const res = await get<BaseRecord[] | { records: BaseRecord[] }>(`/public/products?t=${Date.now()}`);
      const records: BaseRecord[] = Array.isArray(res)
        ? res
        : (res as { records: BaseRecord[] }).records ?? [];

      // Ordenar: destacados primero
      records.sort((a, b) => {
        const aDestacado = Boolean(a.attributes?.destacado);
        const bDestacado = Boolean(b.attributes?.destacado);
        if (aDestacado && !bDestacado) return -1;
        if (!aDestacado && bDestacado) return 1;
        return 0;
      });

      return {
        records: records,
        page: 1,
        limit: records.length,
        total: records.length
      } as PaginatedRecords;
    },
    staleTime: 60000,
  });

  // Filtros de Productos
  const [productSearch, setProductSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('Todos'); // 'Todos', 'En Stock', 'Agotados'
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  const { filteredProducts, uniqueCategories } = useMemo(() => {
    if (!productsData?.records) return { filteredProducts: [], uniqueCategories: [] };
    
    let records = [...productsData.records];
    const cats = new Set<string>();
    
    productsData.records.forEach(p => {
      if (p.attributes?.category) cats.add(p.attributes.category as string);
    });

    if (productSearch) {
      const term = productSearch.toLowerCase();
      records = records.filter(p => p.title.toLowerCase().includes(term));
    }

    if (stockFilter !== 'Todos') {
      const wantsStock = stockFilter === 'En Stock';
      records = records.filter(p => Boolean(p.attributes?.in_stock) === wantsStock);
    }

    if (categoryFilter !== 'Todas') {
      records = records.filter(p => p.attributes?.category === categoryFilter);
    }

    return { filteredProducts: records, uniqueCategories: Array.from(cats).sort() };
  }, [productsData, productSearch, stockFilter, categoryFilter]);

  // Eliminar producto (API)
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

  // ─── Render ─────────────────────────────────────────────────────────────────

  const canManageUsers = user && ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY['encargado'];
  const isSuperadmin   = user && ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY['superadmin'];
  const isOwner        = user && ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY['owner'];

  const adminTitle = useMemo(() => {
    if (tabIndex === 0) return 'Inventario y Productos · Panel Zutech';
    if (tabIndex === 1) return 'Control de Pedidos · Panel Zutech';
    if (tabIndex === 2) return 'Facturación · Panel Zutech';
    if (canManageUsers && tabIndex === 3) return 'Gestión de Usuarios · Panel Zutech';
    if (isSuperadmin && tabIndex === (canManageUsers ? 4 : 3)) return 'Configuración del Sistema · Panel Zutech';
    if (isOwner && tabIndex === 5) return 'Gestión de Dominio · Panel Zutech';
    return 'Panel de Administración · Zutech';
  }, [tabIndex, canManageUsers, isSuperadmin, isOwner]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <SEO noIndex title={adminTitle} description="Panel de Administración de Zutech" />
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, flexGrow: 1 }}>
        {/* Header Admin */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          {/* Hamburger Menu solo en móvil */}
          <IconButton aria-label="Abrir menú de administración" 
            onClick={() => setDrawerOpen(true)} 
            sx={{ display: { xs: 'block', md: 'none' }, color: 'primary.main' }}
          >
            <MenuIcon fontSize="large" />
          </IconButton>
          
          <AdminPanelSettingsIcon sx={{ fontSize: '2.5rem', color: 'primary.main', display: { xs: 'none', md: 'block' } }} />
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>Panel de Administración</Typography>
            {user && (
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip label={user.username} size="small" />
                <Chip label={user.role} size="small" color="primary" variant="outlined" sx={{ textTransform: 'capitalize' }} />
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <DomainAlert />
        </Box>

        {/* Tabs de Escritorio */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: { xs: 'none', md: 'block' } }}>
          <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} aria-label="admin tabs" variant="scrollable">
            <Tab label="Productos" />
            <Tab label="Pedidos" />
            <Tab label="Facturación" />
            {canManageUsers && <Tab label="Usuarios" />}
            {isSuperadmin && <Tab label="Configuración" />}
            {isOwner && <Tab icon={<LanguageIcon sx={{ mr: 1, fontSize: 20 }} />} iconPosition="start" label="Dominio" sx={{ minHeight: 48, pt: '12px' }} />}
          </Tabs>
        </Box>

        {/* Drawer de Móvil */}
        <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: 260, borderRadius: 0 } }}>
          <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6" fontWeight={700}>Menú Admin</Typography>
          </Box>
          <List>
            {['Productos', 'Pedidos', 'Facturación'].map((text, index) => (
              <ListItem key={text} disablePadding>
                <ListItemButton 
                  selected={tabIndex === index} 
                  onClick={() => { setTabIndex(index); setDrawerOpen(false); }}
                >
                  <ListItemText primary={text} />
                </ListItemButton>
              </ListItem>
            ))}
            {canManageUsers && (
              <ListItem disablePadding>
                <ListItemButton selected={tabIndex === 3} onClick={() => { setTabIndex(3); setDrawerOpen(false); }}>
                  <ListItemText primary="Usuarios" />
                </ListItemButton>
              </ListItem>
            )}
            {isSuperadmin && (
              <ListItem disablePadding>
                <ListItemButton selected={tabIndex === (canManageUsers ? 4 : 3)} onClick={() => { setTabIndex(canManageUsers ? 4 : 3); setDrawerOpen(false); }}>
                  <ListItemText primary="Configuración" />
                </ListItemButton>
              </ListItem>
            )}
            {isOwner && (
              <ListItem disablePadding>
                <ListItemButton selected={tabIndex === 5} onClick={() => { setTabIndex(5); setDrawerOpen(false); }}>
                  <ListItemText primary="Dominio" />
                </ListItemButton>
              </ListItem>
            )}
          </List>
        </Drawer>

        {/* ── PANEL PRODUCTOS ──────────────────────────────────────────────── */}
        <TabPanel value={tabIndex} index={0}>
          {/* Alerta de Cuota R2/KV */}
          <QuotaAlertBanner totalProducts={productsData?.records?.length || 0} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>Gestión de Productos</Typography>
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
                onClick={() => { setProductToEdit(null); setProductFormOpen(true); }}
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
                  startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                }}
                sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 200 } }}
              />
              <FormControl size="small" sx={{ minWidth: 160, flexGrow: { xs: 1, sm: 0 } }}>
                <InputLabel>Stock</InputLabel>
                <Select
                  value={stockFilter}
                  label="Stock"
                  onChange={(e) => setStockFilter(e.target.value)}
                >
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
                  {uniqueCategories.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<DownloadIcon />}
                onClick={() => exportCatalogToExcel(filteredProducts)}
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

          {/* ── VISTA DE TARJETAS (MÓVIL) ── */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
            {productsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} variant="outlined" sx={{ borderRadius: 0 }}>
                  <CardContent><Skeleton variant="rectangular" height={100} /></CardContent>
                </Card>
              ))
            ) : filteredProducts.map((product) => (
              <Card key={product.id} variant="outlined" sx={{ borderRadius: 0 }}>
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
                    <Box sx={{ 
                      width: 80, height: 80, 
                      bgcolor: '#F5F5F4', 
                      border: '1px solid #E7E5E4',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                      <InventoryIcon sx={{ color: 'primary.main', opacity: 0.5, fontSize: 40 }} />
                    </Box>
                  )}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                      {product.title} {product.attributes?.destacado && '⭐'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                      {(product.attributes?.brand as string) || 'Sin Marca'} • {(product.attributes?.category as string) || 'Sin Categoría'}
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
                      onClick={() => handleOpenEdit(product)}
                      startIcon={<EditIcon />}
                    >
                      Editar
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="error" 
                      onClick={() => setProductToDelete(product)}
                      sx={{ minWidth: 40, px: 0 }}
                    >
                      <DeleteIcon />
                    </Button>
                  </Stack>
                </CardActions>
              </Card>
            ))}
            {(!filteredProducts || filteredProducts.length === 0) && !productsLoading && (
              <AdminEmptyState 
                iconType="inventory"
                title="No hay productos para mostrar"
                subtitle="Ajusta los filtros o agrega nuevos productos."
                actionButton={
                  <Button variant="outlined" onClick={() => { setProductToEdit(null); setProductFormOpen(true); }} startIcon={<AddIcon />}>
                    Registrar Producto
                  </Button>
                }
              />
            )}</Box>

          {/* ── VISTA DE TABLA (ESCRITORIO) ── */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 0, display: { xs: 'none', md: 'block' }, bgcolor: 'background.paper' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ width: 60, color: 'text.secondary' }}></TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Producto</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Marca / Categoría</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Precio</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Stock</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productsLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}><Skeleton height={40} /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : filteredProducts.map((product) => (
                      <TableRow key={product.id} hover>
                        <TableCell>
                          <Box sx={{ position: 'relative', width: 40, height: 40, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <InventoryIcon sx={{ color: 'primary.main', opacity: 0.5, fontSize: 24, position: 'absolute' }} />
                            {product.main_image && (
                              <Box
                                component="img"
                                src={product.main_image}
                                alt={product.title ? `Miniatura de ${product.title}` : 'Miniatura'}
                                width="40"
                                height="40"
                                loading="lazy"
                                onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                                sx={{ width: 40, height: 40, borderRadius: 0, objectFit: 'cover', position: 'relative', zIndex: 1 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ minWidth: 200 }}>
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {product.title} {product.attributes?.destacado && '⭐'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{(product as any).sku || product.id}</Typography>
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
                            <IconButton aria-label="Ver ficha pública" size="small" href={`/productos/${product.id}`} target="_blank" rel="noopener noreferrer">
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar registro">
                            <IconButton aria-label="Editar registro" size="small" color="primary" onClick={() => handleOpenEdit(product)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar registro">
                            <IconButton aria-label="Eliminar registro" size="small" color="error" onClick={() => setProductToDelete(product)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                {(!filteredProducts || filteredProducts.length === 0) && !productsLoading && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ p: 0, borderBottom: 0 }}>
                      <AdminEmptyState 
                        iconType="inventory"
                        title="No hay productos para mostrar"
                        subtitle="Ajusta los filtros o agrega nuevos productos."
                        actionButton={
                          <Button variant="outlined" onClick={() => { setProductToEdit(null); setProductFormOpen(true); }} startIcon={<AddIcon />}>
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
        </TabPanel>

        {/* ── PANEL PEDIDOS ───────────────────────────────────────────────── */}
        <TabPanel value={tabIndex} index={1}>
          <OrdersTab showToast={showToast} />
        </TabPanel>

        {/* ── PANEL FACTURACIÓN ───────────────────────────────────────────── */}
        <TabPanel value={tabIndex} index={2}>
          <FacturacionTab showToast={showToast} />
        </TabPanel>

        {/* ── PANEL USUARIOS ──────────────────────────────────────────────── */}
        {canManageUsers && (
          <TabPanel value={tabIndex} index={3}>
            <UserManagement />
          </TabPanel>
        )}

        {/* ── PANEL CONFIGURACIÓN ─────────────────────────────────────────── */}
        {isSuperadmin && (
          <TabPanel value={tabIndex} index={canManageUsers ? 4 : 3}>
            <SettingsManager />
          </TabPanel>
        )}

        {/* ── PANEL INFRAESTRUCTURA ───────────────────────────────────────── */}
        {isOwner && (
          <TabPanel value={tabIndex} index={5}>
            <DomainManagement />
          </TabPanel>
        )}
      </Container>

      {productFormOpen && (
        <ProductForm
          open={productFormOpen}
          initial={productToEdit}
          onClose={handleCloseForm}
          onSuccess={(isEdit) => {
            handleCloseForm();
            showToast(isEdit ? 'Producto actualizado' : 'Producto registrado exitosamente');
          }}
        />
      )}

      {bulkModalOpen && (
        <BulkImportModal
          open={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['products-index'] })}
        />
      )}

      {/* ── Dialog Eliminar Producto ───────────────────────────────────────── */}
      <Dialog open={Boolean(productToDelete)} onClose={() => setProductToDelete(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle fontWeight={700} color="error">Eliminar Producto</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar <strong>{productToDelete?.title}</strong>?
          </Typography>
          <Typography variant="body2" color="error.main" mt={1}>
            Esta acción lo eliminará de forma permanente del catálogo.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setProductToDelete(null)} color="inherit">Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteProductMutation.isPending}
            onClick={() => { if (productToDelete) deleteProductMutation.mutate(productToDelete.id); }}
            startIcon={deleteProductMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={toast.open} autoHideDuration={6000} onClose={handleCloseToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%', borderRadius: 0, boxShadow: 3 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
