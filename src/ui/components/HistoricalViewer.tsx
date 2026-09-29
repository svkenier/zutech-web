import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';

import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptIcon from '@mui/icons-material/Receipt';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AdminEmptyState from '@ui/components/AdminEmptyState';
import InvoiceModal from '@ui/components/InvoiceModal';

const PAYMENT_LABELS: Record<string, string> = {
  pago_movil: 'Pago Móvil',
  transferencia: 'Transferencia',
  zelle: 'Zelle',
  binance: 'Binance Pay',
  efectivo: 'Efectivo'
};

export default function HistoricalViewer() {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedClosureId, setSelectedClosureId] = useState<string | false>(false);
  const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleDateShortcut = (type: string) => {
    const today = new Date();
    const tzDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format;
    if (type === 'hoy') {
      const d = tzDate(today);
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
      setStartDate(''); setEndDate(''); setSearch('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        const metadata = parsed.metadata || null;
        const closuresList = 
          Array.isArray(parsed) ? parsed : 
          Array.isArray(parsed.closures) ? parsed.closures : 
          Array.isArray(parsed.cierres) ? parsed.cierres : [];

        if (!closuresList || closuresList.length === 0) {
          throw new Error("El archivo no contiene un listado de cierres válido.");
        }
        
        setData({
          metadata: metadata || {
            exported_at: parsed.exported_at || new Date().toISOString(),
            exported_by: parsed.exported_by || 'Admin',
            closure_count: closuresList.length,
            order_count: closuresList.reduce((acc: number, c: any) => acc + (c.orders?.length || c.ordenes?.length || c.order_count || 0), 0)
          },
          closures: closuresList
        });
        setError(null);
      } catch (err: any) {
        setError('Error al procesar el archivo: ' + err.message);
        setData(null);
      }
    };
    reader.onerror = () => {
      setError('No se pudo leer el archivo.');
      setData(null);
    };
    reader.readAsText(file);
  };

  if (!data) {
    return (
      <Box textAlign="center" py={8}>
        <UploadFileIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" mb={2}>Cargar Respaldo Histórico</Typography>
        <Typography variant="body2" color="text.secondary" mb={4}>
          Selecciona un archivo JSON previamente exportado para visualizar facturas pasadas. Todo el procesamiento se realiza localmente en tu navegador.
        </Typography>
        {error && <Typography color="error" mb={2}>{error}</Typography>}
        <Button variant="contained" component="label" startIcon={<UploadFileIcon />}>
          Seleccionar Archivo .json
          <input type="file" hidden accept=".json" onChange={handleFileUpload} />
        </Button>
      </Box>
    );
  }

  let filteredClosures = data.closures;

  if (startDate) {
    filteredClosures = filteredClosures.filter((c: any) => c.date >= startDate);
  }
  if (endDate) {
    filteredClosures = filteredClosures.filter((c: any) => c.date <= endDate);
  }

  if (search) {
    const s = search.toLowerCase();
    filteredClosures = filteredClosures.filter((c: any) => {
      const matchClosure = c.id.toLowerCase().includes(s);
      const orders = c.orders || c.ordenes || [];
      const matchOrders = orders.some((o: any) => 
        o.id?.toLowerCase().includes(s) || 
        o.customer_name?.toLowerCase().includes(s) ||
        o.client?.name?.toLowerCase().includes(s) ||
        o.customer_phone?.toLowerCase().includes(s)
      );
      return matchClosure || matchOrders;
    });
  }

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 4, bgcolor: 'background.default' }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">Respaldo Cargado</Typography>
          <Typography variant="body1" fontWeight={700}>Exportado el: {new Date(data.metadata?.export_date || data.metadata?.exported_at || Date.now()).toLocaleString()}</Typography>
          <Typography variant="body2">Exportado por: {data.metadata?.exported_by || data.metadata?.exportedBy || 'Sistema'}</Typography>
          <Typography variant="body2">{data.metadata?.total_closures || data.metadata?.closure_count} cierres, {data.metadata?.total_orders || data.metadata?.order_count} órdenes totales.</Typography>
          <Button variant="outlined" size="small" onClick={() => setData(null)} sx={{ mt: 2 }}>Cargar otro archivo</Button>
        </CardContent>
      </Card>

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
            placeholder="Buscar ID, Cliente o Teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            }}
          />
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" variant="outlined" onClick={() => handleDateShortcut('hoy')}>Hoy</Button>
          <Button size="small" variant="outlined" onClick={() => handleDateShortcut('semana')}>Esta semana</Button>
          <Button size="small" variant="outlined" onClick={() => handleDateShortcut('mes')}>Este mes</Button>
          <Button size="small" variant="outlined" onClick={() => handleDateShortcut('3meses')}>Últimos 3 meses</Button>
          <Button size="small" variant="text" onClick={() => handleDateShortcut('limpiar')}>Limpiar Filtros</Button>
        </Stack>
      </Box>

      {filteredClosures.length === 0 ? (
        <AdminEmptyState title="No se encontraron cierres" subtitle="Intenta con otra búsqueda o limpia los filtros." iconType="inventory" />
      ) : (
        filteredClosures.map((c: any) => {
          let cOrders = c.orders || c.ordenes || [];
          if (search) {
            const s = search.toLowerCase();
            cOrders = cOrders.filter((o: any) => 
              o.id?.toLowerCase().includes(s) || 
              o.customer_name?.toLowerCase().includes(s) ||
              o.client?.name?.toLowerCase().includes(s) ||
              o.customer_phone?.toLowerCase().includes(s) ||
              c.id.toLowerCase().includes(s) // si el id del cierre coincide, mostrar todas las órdenes
            );
          }
          
          let displayDate = `${c.date} • ${c.time_closed}`;
          if (c.closed_at) {
            const d = new Date(c.closed_at);
            const pad = (n: number) => n.toString().padStart(2, '0');
            displayDate = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth()+1)}/${d.getUTCFullYear()} • ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
          } else if (c.date) {
            const [year, month, day] = c.date.split('-');
            displayDate = day && month && year ? `${day}/${month}/${year} • ${c.time_closed}` : displayDate;
          }
          
          return (
            <Accordion 
              key={c.id} 
              expanded={selectedClosureId === c.id} 
              onChange={(_, isExpanded) => setSelectedClosureId(isExpanded ? c.id : false)}
              variant="outlined" 
              sx={{ mb: 1, borderRadius: 1, '&:before': { display: 'none' } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center', pr: 2 }}>
                  <Box>
                    <Typography fontWeight={800} variant="h6">{c.id}</Typography>
                    <Typography variant="body2" color="text.secondary">{displayDate} (Cajero: {c.closed_by || c.user_name || 'Admin'})</Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="body2" color="text.secondary">Órdenes Mostradas</Typography>
                    <Typography fontWeight={700}>{cOrders.length}</Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="body2" color="text.secondary">Recaudado (Total)</Typography>
                    <Typography variant="h6" color="primary.main" fontWeight={800}>${(Number(c.total_amount || c.total_usd) || 0).toFixed(2)}</Typography>
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
                  {cOrders.length > 0 ? (
                    <Box>
                      <Typography variant="subtitle2" mb={1} color="text.secondary">Órdenes Encontradas ({cOrders.length})</Typography>
                      {cOrders.map((o: any) => (
                        <Box key={o.id} display="flex" justifyContent="space-between" alignItems="center" p={1.5} mb={1} border="1px solid" borderColor="divider" borderRadius={1} bgcolor="#fff">
                          <Box>
                            <Typography variant="body2" fontWeight={800}>{o.id}</Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>{o.customer_name || o.client?.name || 'N/D'} • {o.customer_phone || o.client?.phone || 'N/D'}</Typography>
                            <Typography variant="caption" display="block" color="text.secondary">{PAYMENT_LABELS[o.payment_method] || o.payment_method || 'N/D'} • ${(Number(o.total_usd) || Number(o.totalUSD) || Number(o.total) || 0).toFixed(2)}</Typography>
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
                    <Typography variant="body2">No se encontraron órdenes para este filtro.</Typography>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })
      )}

      <InvoiceModal open={!!invoiceOrder} order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
    </Box>
  );
}
