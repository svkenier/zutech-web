import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import DownloadIcon from '@mui/icons-material/Download';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import { generateExcelTemplate, downloadBlob } from '@core/excel/templateGenerator';
import { type StagingProduct, evaluateRowStatus } from '@core/excel/excelParser';
import { blobToBase64, optimizeImage } from '@core/media/imageOptimizer';
import { post, get, formatApiError } from '@core/api/client';
import { useBulkImportStash } from '@ui/hooks/useBulkImportStash';
import { useFileDropParser, type ProductSummary } from '@ui/hooks/useFileDropParser';
import ImportDropzone from './bulk/ImportDropzone';
import StagingTable from './bulk/StagingTable';

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => Promise<void> | void;
}

export default function BulkImportModal({ open, onClose, onSuccess }: BulkImportModalProps) {
  const { stagingData, setStagingData, stashConfirmDialog, setStashConfirmDialog, handleClearStash } =
    useBulkImportStash(open);

  const [existingBrands, setExistingBrands] = useState<string[]>([]);
  const [existingProducts, setExistingProducts] = useState<ProductSummary[]>([]);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<StagingProduct>>({});
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; content: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (open) {
      get('/public/products')
        .then((res: unknown) => {
          const list = Array.isArray(res) ? res : ((res as { records?: ProductSummary[] })?.records ?? []);
          setExistingProducts(list as ProductSummary[]);
        })
        .catch((err) => console.warn('Error fetching products:', err));

      get('/admin/brands')
        .then((res: unknown) => {
          const bRes = res as { success?: boolean; brands?: Array<{ name: string }> };
          if (bRes?.success && bRes.brands) {
            setExistingBrands(bRes.brands.map((b) => b.name));
          }
        })
        .catch((err) => console.warn('Error fetching brands:', err));
    }
  }, [open]);

  const { isDragOver, isLoading: isParsing, error, handleDragOver, handleDragLeave, handleDrop, handleFileInput } =
    useFileDropParser({ stagingData, setStagingData, existingProducts });

  const isLoading = isParsing || isImporting;

  const handleDownloadTemplate = async () => {
    try {
      const blob = await generateExcelTemplate();
      downloadBlob(blob, 'ZUTECH_Plantilla_Productos.xlsx');
    } catch (e) {
      console.error('Error generating template:', e);
    }
  };

  const handleRowImageUpload = async (id: string, file: File) => {
    const optimized = await optimizeImage(file, 0.8, 700);
    setStagingData((prev) =>
      prev ? prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, imagenBlob: optimized.blob, previewUrl: optimized.previewUrl };
          updated.status = evaluateRowStatus(updated);
          return updated;
        }
        return p;
      }) : null
    );
  };

  const handleRemoveImage = (prod: StagingProduct) => {
    if (prod.previewUrl) URL.revokeObjectURL(prod.previewUrl);
    setStagingData((prev) =>
      prev ? prev.map((p) => {
        if (p.id === prod.id) {
          const updated = { ...p, imagenBlob: null, previewUrl: undefined, removeImage: true, allowNoPhoto: false };
          updated.status = evaluateRowStatus(updated);
          return updated;
        }
        return p;
      }) : null
    );
  };

  const handleSaveRow = () => {
    if (!editRowId || !editForm) return;
    setStagingData((prev) =>
      prev ? prev.map((p) => {
        if (p.id === editRowId) {
          const updated = { ...p, ...editForm } as StagingProduct;
          const errors: string[] = [];
          if (!updated.nombre) errors.push('Nombre es requerido');
          if (!updated.marca) errors.push('Marca es requerida');
          if (isNaN(updated.precio) || updated.precio <= 0) errors.push('Precio debe ser mayor a 0');
          if (!updated.categoria) errors.push('Categoría es requerida');
          updated.errors = errors;
          updated.status = evaluateRowStatus(updated);
          return updated;
        }
        return p;
      }) : null
    );
    setEditRowId(null);
  };

  const executeImport = async (validProducts: StagingProduct[]) => {
    setIsImporting(true);
    setImportProgress({ current: 0, total: validProducts.length });
    try {
      const CHUNK_SIZE = 20;
      let processed = 0;
      for (let i = 0; i < validProducts.length; i += CHUNK_SIZE) {
        const chunk = validProducts.slice(i, i + CHUNK_SIZE);
        const payloadProducts = await Promise.all(
          chunk.map(async (p) => ({
            id: p.id,
            sku: p.sku,
            nombre: p.nombre,
            marca: p.marca,
            precio: p.precio,
            categoria: p.categoria,
            descripcion: p.descripcion,
            in_stock: p.in_stock,
            imagenUrl: p.imagenUrl,
            imagenBase64: p.imagenBlob ? await blobToBase64(p.imagenBlob) : undefined,
            removeImage: p.removeImage,
          }))
        );
        await post('/admin/products/bulk', { products: payloadProducts });
        setStagingData((prev) => (prev ? prev.filter((p) => !chunk.find((c) => c.id === p.id)) : null));
        processed += chunk.length;
        setImportProgress({ current: processed, total: validProducts.length });
      }
      await handleClearStash();
      setToast({ open: true, message: 'Importación completada con éxito', severity: 'success' });
      if (onSuccess) await onSuccess();
      onClose();
    } catch (err: unknown) {
      setToast({ open: true, message: formatApiError(err, 'Error durante la importación'), severity: 'error' });
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const handleImport = () => {
    if (!stagingData) return;
    const valid = stagingData.filter((p) => p.status === 'Listo');
    if (valid.length === 0) return;
    const pendingPhotos = valid.filter((p) => !p.imagenBlob);
    if (pendingPhotos.length > 0) {
      setConfirmDialog({
        open: true,
        title: 'Fotos Pendientes',
        content: `Hay ${pendingPhotos.length} productos sin foto. ¿Deseas importar de todos modos? Se usará la imagen por defecto.`,
        onConfirm: () => {
          setConfirmDialog(null);
          void executeImport(valid);
        },
      });
      return;
    }
    void executeImport(valid);
  };

  const activeConfirm = confirmDialog || stashConfirmDialog;
  const validCount = stagingData?.filter((p) => p.status === 'Listo').length ?? 0;

  return (
    <Dialog open={open} onClose={() => !isLoading && onClose()} maxWidth={stagingData ? 'lg' : 'sm'} fullWidth>
      <DialogTitle fontWeight={700}>{stagingData ? 'Mesa de Trabajo (Staging)' : 'Importación Masiva Inteligente'}</DialogTitle>
      <DialogContent dividers>
        {!stagingData ? (
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography variant="body2" color="text.secondary">Descarga la plantilla, complétala y sube el archivo .xlsx junto a las fotos de tus productos.</Typography>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadTemplate}>Descargar Plantilla Oficial</Button>
            <ImportDropzone isDragOver={isDragOver} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onFileInput={handleFileInput} />
            {isLoading && <Box textAlign="center" mt={2}><CircularProgress size={24} /><Typography variant="body2">Procesando...</Typography></Box>}
          </Box>
        ) : (
          <>
            <ImportDropzone isDragOver={isDragOver} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onFileInput={handleFileInput} isCompact />
            <Box display="flex" justifyContent="space-between" mb={2} alignItems="center">
              <Typography variant="body2"><strong>{stagingData.length}</strong> productos ({validCount} listos).</Typography>
              <Box display="flex" gap={1}>
                <Button size="small" variant="outlined" onClick={() => setStagingData((prev) => (prev ? prev.filter((p) => p.status === 'Listo') : null))} disabled={isLoading}>Limpiar Incompletos</Button>
                <Button size="small" color="error" onClick={() => void handleClearStash()} disabled={isLoading}>Limpiar mesa</Button>
              </Box>
            </Box>
            <StagingTable
              stagingData={stagingData}
              editRowId={editRowId}
              editForm={editForm}
              existingBrands={existingBrands}
              isLoading={isLoading}
              onEditChange={setEditForm}
              onSaveRow={handleSaveRow}
              onCancelEdit={() => setEditRowId(null)}
              onStartEdit={(prod) => { setEditRowId(prod.id); setEditForm({ ...prod }); }}
              onDiscard={(id) => setStagingData((prev) => (prev ? prev.filter((p) => p.id !== id) : null))}
              onRemoveImage={handleRemoveImage}
              onImageUpload={(id, file) => void handleRowImageUpload(id, file)}
              onAllowNoPhoto={(id) => setStagingData((prev) => prev ? prev.map((p) => (p.id === id ? { ...p, allowNoPhoto: true, status: evaluateRowStatus({ ...p, allowNoPhoto: true }) } : p)) : null)}
            />
          </>
        )}
        {error && <Typography variant="body2" color="error.main" mt={2}>{error}</Typography>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isLoading}>{stagingData ? 'Ocultar' : 'Cerrar'}</Button>
        {stagingData && (
          <Button variant="contained" disabled={validCount === 0 || isLoading} onClick={handleImport}>
            {isLoading ? (
              <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />{importProgress ? `Procesando ${importProgress.current}/${importProgress.total}...` : 'Procesando...'}</>
            ) : `Importar ${validCount} Productos`}
          </Button>
        )}
      </DialogActions>

      <Dialog open={activeConfirm?.open || false} onClose={() => { setConfirmDialog(null); setStashConfirmDialog(null); }}>
        <DialogTitle>{activeConfirm?.title}</DialogTitle>
        <DialogContent><Typography>{activeConfirm?.content}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmDialog(null); setStashConfirmDialog(null); }} color="inherit">Cancelar</Button>
          <Button onClick={activeConfirm?.onConfirm} color="primary" variant="contained">Confirmar</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={toast.open} autoHideDuration={6000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))} variant="filled">{toast.message}</Alert>
      </Snackbar>
    </Dialog>
  );
}
