import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { generateExcelTemplate, downloadBlob } from '@core/excel/templateGenerator';
import { parseExcel, StagingProduct } from '@core/excel/excelParser';
import { blobToBase64 } from '@core/media/imageOptimizer';
import { post, formatApiError } from '@core/api/client';

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BulkImportModal({ open, onClose }: BulkImportModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stagingData, setStagingData] = useState<StagingProduct[] | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number, total: number } | null>(null);
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<StagingProduct>>({});

  const handleDownloadTemplate = async () => {
    try {
      const blob = await generateExcelTemplate();
      downloadBlob(blob, 'plantilla_productos.xlsx');
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      try {
        const products = await parseExcel(buffer);
        setStagingData(products);
      } catch (err) {
        setError('Error al procesar el archivo Excel. Asegúrate de usar la plantilla oficial.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDiscard = (id: string) => {
    setStagingData(prev => prev ? prev.filter(p => p.id !== id) : null);
  };

  const handleClear = () => {
    setStagingData(null);
    setError(null);
    setImportProgress(null);
    setEditRowId(null);
  };

  const handleEditRow = (prod: StagingProduct) => {
    setEditRowId(prod.id);
    setEditForm({ ...prod });
  };

  const handleSaveRow = () => {
    if (!editRowId || !editForm) return;
    
    setStagingData(prev => prev ? prev.map(p => {
      if (p.id === editRowId) {
        const updated = { ...p, ...editForm } as StagingProduct;
        // Re-validar
        const errors = [];
        if (!updated.nombre) errors.push('Nombre es requerido');
        if (isNaN(updated.precio) || updated.precio <= 0) errors.push('Precio debe ser número positivo');
        if (!updated.categoria) errors.push('Categoría es requerida');
        
        updated.errors = errors;
        updated.status = errors.length > 0 ? 'invalid' : 'valid';
        return updated;
      }
      return p;
    }) : null);
    
    setEditRowId(null);
  };

  const handleImport = async () => {
    if (!stagingData) return;
    const validProducts = stagingData.filter(p => p.status === 'valid');
    if (validProducts.length === 0) return;

    setIsLoading(true);
    setError(null);
    setImportProgress({ current: 0, total: validProducts.length });

    try {
      const CHUNK_SIZE = 20;
      let processed = 0;

      for (let i = 0; i < validProducts.length; i += CHUNK_SIZE) {
        const chunk = validProducts.slice(i, i + CHUNK_SIZE);
        
        // Preparar payload
        const payloadProducts = await Promise.all(chunk.map(async (p) => {
          let base64 = undefined;
          if (p.imagenBlob) {
            base64 = await blobToBase64(p.imagenBlob);
          }
          return {
            id: p.id,
            nombre: p.nombre,
            precio: p.precio,
            categoria: p.categoria,
            descripcion: p.descripcion,
            in_stock: p.in_stock,
            imagenUrl: p.imagenUrl,
            imagenBase64: base64
          };
        }));

        await post('/admin/products/bulk', { products: payloadProducts });
        
        // Remove processed products from staging to allow "retry pending" easily
        setStagingData(prev => prev ? prev.filter(p => !chunk.find(c => c.id === p.id)) : null);
        
        processed += chunk.length;
        setImportProgress({ current: processed, total: validProducts.length });
      }

      alert('Importación completada con éxito.');
      onClose();
    } catch (err) {
      setError(formatApiError(err, 'Error durante la importación'));
    } finally {
      setIsLoading(false);
      setImportProgress(null);
    }
  };

  // UI para cuando hay datos en staging
  if (stagingData) {
    const validCount = stagingData.filter(p => p.status === 'valid').length;
    
    return (
      <Dialog open={open} onClose={handleClear} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle fontWeight={700}>Previsualización (Staging)</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" justifyContent="space-between" mb={2} alignItems="center">
            <Typography variant="body2">
              Se han detectado <strong>{stagingData.length}</strong> productos ({validCount} válidos).
            </Typography>
            <Button color="error" onClick={handleClear} disabled={isLoading}>Cancelar / Limpiar todo</Button>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell>Img</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Precio</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Stock</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stagingData.map(prod => {
                  const isEditing = editRowId === prod.id;
                  
                  return (
                  <TableRow key={prod.id} hover>
                    <TableCell>
                      {prod.previewUrl ? (
                        <Box component="img" src={prod.previewUrl} width={40} height={40} sx={{ objectFit: 'cover' }} />
                      ) : (
                        <Box width={40} height={40} bgcolor="grey.200" />
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField size="small" value={editForm.nombre || ''} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} />
                      ) : (
                        prod.nombre
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField size="small" type="number" value={editForm.precio || 0} onChange={e => setEditForm({ ...editForm, precio: Number(e.target.value) })} sx={{ width: 80 }} />
                      ) : (
                        `$${prod.precio}`
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField size="small" value={editForm.categoria || ''} onChange={e => setEditForm({ ...editForm, categoria: e.target.value })} />
                      ) : (
                        prod.categoria
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField size="small" select SelectProps={{ native: true }} value={editForm.in_stock ? 'si' : 'no'} onChange={e => setEditForm({ ...editForm, in_stock: e.target.value === 'si' })}>
                          <option value="si">Sí</option>
                          <option value="no">No</option>
                        </TextField>
                      ) : (
                        prod.in_stock ? 'Sí' : 'No'
                      )}
                    </TableCell>
                    <TableCell>
                      {prod.status === 'valid' ? (
                        <Tooltip title="Válido"><CheckCircleIcon color="success" /></Tooltip>
                      ) : (
                        <Tooltip title={prod.errors.join(', ')}><ErrorIcon color="error" /></Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {isEditing ? (
                        <>
                          <IconButton size="small" color="primary" onClick={handleSaveRow} disabled={isLoading}>
                            <SaveIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setEditRowId(null)} disabled={isLoading}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <IconButton size="small" color="primary" onClick={() => handleEditRow(prod)} disabled={isLoading}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDiscard(prod.id)} disabled={isLoading}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </TableContainer>
          {error && <Typography variant="body2" color="error.main" mt={2}>{error}</Typography>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClear} color="inherit" disabled={isLoading}>Cancelar</Button>
          <Button variant="contained" disabled={validCount === 0 || isLoading} onClick={handleImport}>
            {isLoading ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                Importando {importProgress?.current} de {importProgress?.total}...
              </>
            ) : (
              `Importar ${validCount} Productos`
            )}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // UI Inicial de carga
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
      <DialogTitle fontWeight={700}>Carga Masiva de Productos</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Descarga la plantilla oficial, complétala y sube el archivo para registrar múltiples productos a la vez.
        </Typography>

        <Box display="flex" flexDirection="column" gap={2} alignItems="center">
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadTemplate} fullWidth sx={{ borderRadius: 0 }}>
            Descargar Plantilla Oficial
          </Button>

          <Button variant="contained" component="label" startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />} fullWidth sx={{ borderRadius: 0, py: 1.5 }} disabled={isLoading}>
            {isLoading ? 'Procesando archivo...' : 'Subir Archivo (.xlsx)'}
            <input type="file" hidden accept=".xlsx" onChange={handleFileUpload} />
          </Button>

          {error && <Typography variant="body2" color="error.main" mt={1}>{error}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
      </DialogActions>
    </Dialog>
  );
}
