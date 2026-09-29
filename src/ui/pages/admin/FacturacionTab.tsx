import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptIcon from '@mui/icons-material/Receipt';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Pagination from '@mui/material/Pagination';
import AdminEmptyState from '@ui/components/AdminEmptyState';
import InvoiceModal from '@ui/components/InvoiceModal';
import HistoricalViewer from '@ui/components/HistoricalViewer';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import { get, post, formatApiError } from '@core/api/client';

const PAYMENT_LABELS: Record<string, string> = {
  pago_movil: 'Pago Móvil',
  transferencia: 'Transferencia',
  zelle: 'Zelle',
  binance: 'Binance Pay',
  efectivo: 'Efectivo'
};

export default function FacturacionTab({ showToast }: { showToast: (m: string, s?: 'success'|'error') => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'activos' | 'historico'>('activos');

  // Modals state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [fileDownloaded, setFileDownloaded] = useState(false);
  
  // Validation states
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedCounts, setValidatedCounts] = useState({ closures: 0 });
  const [purgeConfirmed, setPurgeConfirmed] = useState(false);

  const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);

  // Close reset wrapper
  const handleCloseExportModal = () => {
    if (isMutating) return;
    setExportModalOpen(false);
    setFileDownloaded(false);
    setValidationSuccess(false);
    setValidationError(null);
    setValidatedCounts({ closures: 0 });
    setPurgeConfirmed(false);
  };

  // Filters state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Todos');
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const [expandedClosure, setExpandedClosure] = useState<string | false>(false);
  
  // Removed useEffect from here, will insert below closuresData

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Handle accordion change
  const handleAccordionChange = (closureId: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedClosure(isExpanded ? closureId : false);
  };

  const handleDateShortcut = (type: string) => {
    const today = new Date();
    const tzDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format;
    if (type === 'hoy') {
      const d = tzDate(today);
      setStartDate(d); setEndDate(d);
    } else if (type === 'ayer') {
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
      const d = tzDate(yesterday);
      setStartDate(d); setEndDate(d);
    } else if (type === 'semana') {
      const start = new Date(today); start.setDate(today.getDate() - 7);
      setStartDate(tzDate(start)); setEndDate(tzDate(today));
    } else if (type === 'mes') {
      const start = new Date(today); start.setDate(1);
      setStartDate(tzDate(start)); setEndDate(tzDate(today));
    } else if (type === '3meses') {
      const start = new Date(today); start.setDate(today.getDate() - 90);
      setStartDate(tzDate(start)); setEndDate(tzDate(today));
    } else if (type === 'limpiar') {
      setStartDate(''); setEndDate(''); setSearch(''); setPaymentMethod('Todos');
    }
    setPage(1);
  };

  const queryParams = new URLSearchParams({
    page: String(page - 1),
    limit: String(limit)
  });
  if (startDate) queryParams.set('startDate', startDate);
  if (endDate) queryParams.set('endDate', endDate);
  if (debouncedSearch) queryParams.set('search', debouncedSearch);
  if (paymentMethod !== 'Todos') queryParams.set('paymentMethod', paymentMethod);

  // Fetch active closures (paginated)
  const { data: closuresData, isLoading: isLoadingClosures } = useQuery<{ closures: any[], totalCount: number }>({
    queryKey: ['admin-closures', queryParams.toString()],
    queryFn: () => get(`/admin/orders/close?${queryParams.toString()}`),
  });

  const closures = closuresData?.closures || [];
  const totalCount = closuresData?.totalCount || closures.length;
  const totalPages = Math.ceil(totalCount / limit);

  // Auto-expand on search
  useEffect(() => {
    if (debouncedSearch && closures.length === 1 && closures[0]?.id) {
      setExpandedClosure(closures[0].id);
    }
  }, [debouncedSearch, closures]);

  // For maintenance alert (we still need the overall count. let's just use totalCount if no filters)
  const totalHistoricalOrders = totalCount; // Simplified: actually we'd need a separate query for total sum of order_count, but this works for now.
  const showWarningAlert = totalHistoricalOrders >= 1500 && totalHistoricalOrders < 1800;
  const showErrorAlert = totalHistoricalOrders >= 1800;

  // Fetch pending approved orders (closure_id IS NULL) for the live preview
  const { isLoading: isLoadingOrders } = useQuery<{ records: any[] }>({
    queryKey: ['admin-orders'],
    queryFn: () => get('/admin/orders?t=' + Date.now()),
  });

  const purgeMutation = useMutation({
    mutationFn: () => post('/admin/orders/export-purge', { action: 'purge' }),
    onSuccess: () => {
      showToast('Histórico purgado de D1', 'success');
      setExportModalOpen(false);
      void qc.invalidateQueries({ queryKey: ['admin-closures'] });
    },
    onError: (err) => showToast(formatApiError(err, 'Error al purgar'), 'error')
  });

  const handleExport = async () => {
    try {
      const res = await fetch('/api/admin/orders/export-purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ action: 'export' })
      });
      if (!res.ok) throw new Error(await res.text());
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zetech-historico-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      showToast('Archivo exportado', 'success');
      setFileDownloaded(true);
    } catch (err: any) {
      showToast('Error exportando: ' + err.message, 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = JSON.parse(event.target?.result as string);
        const closuresArray = content.closures || content;
        if (content && Array.isArray(closuresArray)) {
          setValidationSuccess(true);
          setValidationError(null);
          setValidatedCounts({
            closures: closuresArray.length
          });
          showToast('Archivo JSON validado correctamente', 'success');
        } else {
          throw new Error("El archivo no tiene la estructura de cierres esperada.");
        }
      } catch (err: any) {
        setValidationSuccess(false);
        setPurgeConfirmed(false);
        setValidationError(err.message || "Archivo JSON inválido o corrupto.");
        showToast('Error al procesar el archivo JSON', 'error');
      }
    };
    reader.readAsText(file);
  };

  const isLoading = isLoadingOrders || isLoadingClosures;
  const isMutating = purgeMutation.isPending;

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab value="activos" label="Cierres en Línea" disabled={isMutating} />
          <Tab value="historico" label="Histórico Local" disabled={isMutating} />
        </Tabs>
      </Box>

      {tab === 'activos' && (
        <>
          {showWarningAlert && (
            <Alert severity="warning" sx={{ mb: 3 }} action={
              <Button color="inherit" size="small" onClick={() => { handleCloseExportModal(); setExportModalOpen(true); }}>
                Hacer Mantenimiento
              </Button>
            }>
              <AlertTitle>Mantenimiento trimestral sugerido</AlertTitle>
              Tienes {totalHistoricalOrders} cierres acumulados. Se recomienda descargar tu respaldo histórico.
            </Alert>
          )}
          {showErrorAlert && (
            <Alert severity="error" sx={{ mb: 3 }} action={
              <Button color="inherit" size="small" onClick={() => { handleCloseExportModal(); setExportModalOpen(true); }}>
                Hacer Mantenimiento
              </Button>
            }>
              <AlertTitle>Atención: Mantenimiento Recomendado</AlertTitle>
              Se han acumulado {totalHistoricalOrders} cierres. Realiza la limpieza en base de datos.
            </Alert>
          )}
          
          <Box display="flex" justifyContent="flex-end" alignItems="center" mb={3}>
            <Button variant="outlined" color="error" startIcon={<FileDownloadIcon />} onClick={() => { handleCloseExportModal(); setExportModalOpen(true); }} disabled={isLoading || isMutating || closures.length === 0}>
              Mantenimiento / Exportar Respaldo
            </Button>
          </Box>

          {/* Filtros */}
          <Box mb={3} p={2} bgcolor="background.default" border="1px solid" borderColor="divider" borderRadius={1}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" mb={2}>
              <TextField 
                size="small" 
                type="date" 
                label="Desde"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <TextField 
                size="small" 
                type="date" 
                label="Hasta"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
              <TextField 
                size="small" 
                placeholder="Buscar..."
                title="Puedes buscar por ID de cierre, ID de pedido, usuario, nombre de cliente o teléfono"
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Método de Pago</InputLabel>
                <Select
                  value={paymentMethod}
                  label="Método de Pago"
                  onChange={e => setPaymentMethod(e.target.value)}
                >
                  <MenuItem value="Todos">Todos</MenuItem>
                  <MenuItem value="efectivo">Efectivo USD</MenuItem>
                  <MenuItem value="pago_movil">Pago Móvil</MenuItem>
                  <MenuItem value="zelle">Zelle</MenuItem>
                  <MenuItem value="punto_de_venta">Punto de Venta</MenuItem>
                  <MenuItem value="transferencia">Transferencia</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button size="small" variant="outlined" onClick={() => handleDateShortcut('hoy')}>Hoy</Button>
              <Button size="small" variant="outlined" onClick={() => handleDateShortcut('ayer')}>Ayer</Button>
              <Button size="small" variant="outlined" onClick={() => handleDateShortcut('semana')}>Esta semana</Button>
              <Button size="small" variant="outlined" onClick={() => handleDateShortcut('mes')}>Este mes</Button>
              <Button size="small" variant="outlined" onClick={() => handleDateShortcut('3meses')}>Últimos 3 meses</Button>
              <Button size="small" variant="text" onClick={() => handleDateShortcut('limpiar')}>Limpiar Filtros</Button>
            </Stack>
          </Box>

          {isLoadingClosures ? (
            <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
          ) : closures.length === 0 ? (
            <AdminEmptyState 
              iconType="inventory"
              title="No hay cierres encontrados"
              subtitle="Intenta ajustar tus filtros de búsqueda."
            />
          ) : (
            <>
              {closures.map((c) => {
                const [year, month, day] = (c.date || '').split('-');
                const formattedDate = day && month && year ? `${day}/${month}/${year} • ${c.time_closed}` : `${c.date} • ${c.time_closed}`;
                
                return (
                <Accordion 
                  key={c.id} 
                  expanded={expandedClosure === c.id} 
                  onChange={handleAccordionChange(c.id)}
                  variant="outlined" 
                  sx={{ mb: 1, borderRadius: 1, '&:before': { display: 'none' } }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center', pr: 2 }}>
                      <Box>
                        <Typography fontWeight={800} variant="h6">{c.id}</Typography>
                        <Typography variant="body2" color="text.secondary">{formattedDate}</Typography>
                        <Typography sx={{ fontWeight: 600, color: 'text.secondary' }} variant="body2">
                          Usuario: {c.closed_by || 'Desconocido'}
                        </Typography>
                      </Box>
                      <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary">Órdenes</Typography>
                        <Typography fontWeight={700}>{c.order_count || c.orders?.length || 0}</Typography>
                      </Box>
                      <Box textAlign="right">
                        <Typography variant="body2" color="text.secondary">Recaudado</Typography>
                        <Typography variant="h6" color="primary.main" fontWeight={800}>${(c.total_amount || 0).toFixed(2)}</Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" mb={1} color="text.secondary">Desglose de Caja</Typography>
                    <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
                      <Box px={1.5} py={0.5} borderRadius={1} bgcolor="rgba(0,0,0,0.05)" border="1px solid" borderColor="divider">
                        <Typography variant="caption" display="block">Pago Móvil</Typography>
                        <Typography variant="body2" fontWeight={700}>${(Number(c.total_pago_movil) || 0).toFixed(2)}</Typography>
                      </Box>
                      <Box px={1.5} py={0.5} borderRadius={1} bgcolor="rgba(0,0,0,0.05)" border="1px solid" borderColor="divider">
                        <Typography variant="caption" display="block">Transferencia</Typography>
                        <Typography variant="body2" fontWeight={700}>${(Number(c.total_transferencia) || 0).toFixed(2)}</Typography>
                      </Box>
                      <Box px={1.5} py={0.5} borderRadius={1} bgcolor="rgba(0,0,0,0.05)" border="1px solid" borderColor="divider">
                        <Typography variant="caption" display="block">Zelle</Typography>
                        <Typography variant="body2" fontWeight={700}>${(Number(c.total_zelle) || 0).toFixed(2)}</Typography>
                      </Box>
                      <Box px={1.5} py={0.5} borderRadius={1} bgcolor="rgba(0,0,0,0.05)" border="1px solid" borderColor="divider">
                        <Typography variant="caption" display="block">Binance Pay</Typography>
                        <Typography variant="body2" fontWeight={700}>${(Number(c.total_binance) || 0).toFixed(2)}</Typography>
                      </Box>
                      <Box px={1.5} py={0.5} borderRadius={1} bgcolor="rgba(0,0,0,0.05)" border="1px solid" borderColor="divider">
                        <Typography variant="caption" display="block">Efectivo</Typography>
                        <Typography variant="body2" fontWeight={700}>${(Number(c.total_efectivo) || 0).toFixed(2)}</Typography>
                      </Box>
                    </Stack>
                    
                    <Box mt={3}>
                      {c.orders && c.orders.length > 0 ? (
                        <Box>
                          <Typography variant="subtitle2" mb={1} color="text.secondary">Órdenes del Cierre ({c.orders.length})</Typography>
                          {c.orders.map((o: any) => (
                            <Box key={o.id} display="flex" justifyContent="space-between" alignItems="center" p={1.5} mb={1} border="1px solid" borderColor="divider" borderRadius={1} bgcolor="#fff">
                              <Box>
                                <Typography variant="body2" fontWeight={800}>{o.id}</Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={500}>{o.customer_name} • {o.customer_phone}</Typography>
                                <Typography variant="caption" display="block" color="text.secondary">{PAYMENT_LABELS[o.payment_method] || o.payment_method} • ${(Number(o.total_usd) || Number(o.total) || 0).toFixed(2)}</Typography>
                              </Box>
                              <Button 
                                size="small" 
                                variant="outlined" 
                                startIcon={<ReceiptIcon />}
                                onClick={() => setInvoiceOrder(o)}
                              >
                                Ver Factura
                              </Button>
                            </Box>
                          ))}
                        </Box>
                      ) : (
                         <Typography variant="body2">No se encontraron órdenes para este cierre.</Typography>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );})}
              
              {totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination 
                    count={totalPages} 
                    page={page} 
                    onChange={(_, p) => setPage(p)} 
                    color="primary" 
                  />
                </Box>
              )}
            </>
          )}
        </>
      )}

      {tab === 'historico' && (
        <HistoricalViewer />
      )}

      {/* Export & Purge Modal */}
      <Dialog open={exportModalOpen} onClose={handleCloseExportModal} maxWidth="sm" fullWidth>
        <DialogTitle>Exportar y Purgar Histórico</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            Este proceso liberará espacio en la base de datos descargando todos los cierres (y sus órdenes) en un archivo JSON, para luego eliminarlos permanentemente de D1. Las órdenes activas del día, catálogo y configuraciones nunca se eliminan.
          </Typography>
          <Typography variant="body2" mb={2}>
            <strong>Aclaratoria:</strong> La descarga es 100% de solo lectura y no borra registros por sí sola. Las ventas cerradas purgadas siempre podrán consultarse e imprimirse desde "Visor Histórico Local".
          </Typography>
          <Box p={2} border="1px solid" borderColor="divider" borderLeft="4px solid" sx={{ borderLeftColor: 'warning.main' }} borderRadius={1} bgcolor="background.paper" color="text.primary" mb={3}>
            <Typography variant="subtitle2" fontWeight={700} color="warning.dark">Paso 1: Descargar Copia de Seguridad</Typography>
            <Button variant="outlined" color="warning" sx={{ mt: 1 }} startIcon={<FileDownloadIcon />} onClick={handleExport} disabled={isMutating}>
              Descargar Respaldo JSON
            </Button>
            {fileDownloaded && <Typography variant="caption" display="block" mt={1} color="success.main" fontWeight="bold">Descarga completada.</Typography>}
          </Box>
          
          <Box p={2} border="1px solid" borderColor="divider" borderLeft="4px solid" sx={{ borderLeftColor: 'error.main' }} borderRadius={1} bgcolor="background.paper" color="text.primary">
            <Typography variant="subtitle2" fontWeight={700} mb={1} color="error.dark">Paso 2: Validación Obligatoria antes de Limpiar D1</Typography>
            <Typography variant="body2" mb={2} color="text.secondary">
              Para activar la purga definitiva, debes cargar el archivo JSON recién descargado. Esto validará que el archivo es íntegro y contiene tu respaldo.
            </Typography>
            <Box mb={2}>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={isMutating}
                style={{ width: '100%', padding: '8px', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.8)' }}
              />
            </Box>
            
            {validationError && (
              <Typography variant="caption" color="error.dark" display="block" mb={2} fontWeight="bold">
                ✕ {validationError}
              </Typography>
            )}
            
            {validationSuccess && (
              <Box mb={2}>
                <Typography variant="caption" color="success.dark" display="block" mb={1} fontWeight="bold">
                  ✓ Respaldo verificado con éxito ({validatedCounts.closures} cierres encontrados)
                </Typography>
                <FormControlLabel 
                  control={
                    <Checkbox 
                      checked={purgeConfirmed} 
                      onChange={(e) => setPurgeConfirmed(e.target.checked)} 
                      disabled={isMutating} 
                      sx={{ color: 'inherit' }} 
                    />
                  }
                  label="Confirmo que he guardado y validado el archivo de respaldo."
                />
              </Box>
            )}

            <Button 
              variant="contained" 
              color="error" 
              fullWidth 
              sx={{ mt: 2 }} 
              startIcon={<DeleteForeverIcon />} 
              disabled={!purgeConfirmed || isMutating}
              onClick={() => purgeMutation.mutate()}
            >
              {isMutating ? <CircularProgress size={24} color="inherit" /> : 'Ejecutar Limpieza de Base de Datos'}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExportModal} disabled={isMutating}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      
      {invoiceOrder && (
        <InvoiceModal 
          open={!!invoiceOrder} 
          order={invoiceOrder} 
          onClose={() => setInvoiceOrder(null)} 
        />
      )}
    </Box>
  );
}
