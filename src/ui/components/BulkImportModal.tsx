import React, { useState, useEffect, useRef } from 'react';
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
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Chip from '@mui/material/Chip';
import Autocomplete from '@mui/material/Autocomplete';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import { generateExcelTemplate, downloadBlob } from '@core/excel/templateGenerator';
import { parseExcel, StagingProduct, evaluateRowStatus } from '@core/excel/excelParser';
import { blobToBase64, optimizeImage } from '@core/media/imageOptimizer';
import { post, get, formatApiError } from '@core/api/client';
import { saveStash, loadStash, clearStash } from '@core/storage/importStash';
import { assignSkusToProducts } from '@core/utils/skuGenerator';

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BulkImportModal({ open, onClose, onSuccess }: BulkImportModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stagingData, setStagingData] = useState<StagingProduct[] | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number, total: number } | null>(null);
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<StagingProduct>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [existingBrands, setExistingBrands] = useState<string[]>([]);
  const [existingProducts, setExistingProducts] = useState<any[]>([]);
  const [toast, setToast] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'warning' }>({ open: false, message: '', severity: 'info' as any });
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, title: string, content: string, onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (open) {
      get('/public/products').then((res: any) => {
        setExistingProducts(Array.isArray(res) ? res : (res.records ?? []));
      }).catch(err => console.warn('Error fetching products:', err));

      get('/admin/brands').then((res: any) => {
        if (res.success && res.brands) {
          setExistingBrands(res.brands.map((b: any) => b.name));
        }
      }).catch(err => console.warn('Error fetching brands:', err));

      loadStash().then(data => {
        if (data && data.length > 0) {
          setConfirmDialog({
            open: true,
            title: 'Borrador Encontrado',
            content: 'Recuperamos un borrador de importación de tu última sesión. ¿Deseas continuar con estos productos o limpiar la mesa?',
            onConfirm: () => { setStagingData(data); setConfirmDialog(null); }
          });
        }
      });
    }
  }, [open]);

  useEffect(() => {
    if (stagingData) {
      saveStash(stagingData);
    }
  }, [stagingData]);

  // Clean up object URLs on unmount to prevent memory leaks
  const stagingDataRef = useRef(stagingData);
  useEffect(() => {
    stagingDataRef.current = stagingData;
  }, [stagingData]);

  useEffect(() => {
    return () => {
      if (stagingDataRef.current) {
        stagingDataRef.current.forEach(p => {
          if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
        });
      }
    };
  }, []);

  const handleDownloadTemplate = async () => {
    try {
      const blob = await generateExcelTemplate();
      downloadBlob(blob, 'ZUTECH_Plantilla_Productos.xlsx');
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Utilidad: Extraer archivos de forma recursiva desde un FileSystemEntry ──
  const collectFilesFromEntry = (entry: FileSystemEntry): Promise<File[]> => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        (entry as FileSystemFileEntry).file(
          (file) => resolve([file]),
          () => resolve([]),
        );
      } else if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        const allFiles: File[] = [];

        const readBatch = () => {
          reader.readEntries(async (entries) => {
            if (entries.length === 0) {
              resolve(allFiles);
              return;
            }
            const batchResults = await Promise.all(entries.map(collectFilesFromEntry));
            allFiles.push(...batchResults.flat());
            readBatch(); // continúa hasta agotar los lotes
          }, () => resolve(allFiles));
        };

        readBatch();
      } else {
        resolve([]);
      }
    });
  };

  const processDroppedFiles = async (files: File[]) => {
    setError(null);
    setIsLoading(true);

    try {
      const excelFile = files.find(f => f.name.endsWith('.xlsx'));
      const imageFiles = files.filter(f => f.type.startsWith('image/'));

      const stagingMap = new Map<string, StagingProduct>();
      if (stagingData) {
        stagingData.forEach(p => stagingMap.set(p.ref_num, p));
      }

      if (excelFile) {
        const buffer = await excelFile.arrayBuffer();
        let products = await parseExcel(buffer);
        products = await assignSkusToProducts(products);
        
        products.forEach(p => {
          const matched = existingProducts.find(ep => ep.sku === p.sku);
          if (matched && matched.main_image) {
            p.existingImageUrl = matched.main_image;
          }
          p.status = evaluateRowStatus(p);

          if (stagingMap.has(p.ref_num)) {
            const existing = stagingMap.get(p.ref_num)!;
            stagingMap.set(p.ref_num, { ...existing, ...p, imagenBlob: existing.imagenBlob, previewUrl: existing.previewUrl, existingImageUrl: existing.existingImageUrl, removeImage: existing.removeImage });
          } else {
            stagingMap.set(p.ref_num, p);
          }
        });
      }

      const newStaging = Array.from(stagingMap.values());

      if (imageFiles.length > 0 && newStaging.length > 0) {
        // REF_MATCH: REF-001, REF001, ref-001, ref_001 (case-insensitive, dashes/underscores optional)
        const REF_PATTERN = /^ref[-_]?(\d+)$/i;

        for (const imgFile of imageFiles) {
          const nameWithoutExt = imgFile.name.split('.').slice(0, -1).join('.');

          // Construir clave normalizada del archivo: eliminar separadores y pasar a mayúsculas
          const normalized = nameWithoutExt.replace(/[-_]/g, '').toUpperCase(); // e.g. "REF001"

          const refMatch = normalized.match(REF_PATTERN);

          // Rechazar números planos sueltos (1.jpg, 001.jpg) — no deben matchear
          const isPlainNumber = /^\d+$/.test(nameWithoutExt.trim());
          if (isPlainNumber || !refMatch) continue;

          // Normalizar ref_num del staging igual: eliminar separadores → "REF001"
          const targetIndex = newStaging.findIndex(p => {
            const pRef = p.ref_num.replace(/[-_]/g, '').toUpperCase();
            const pSku = (p.sku ?? '').replace(/[-_]/g, '').toUpperCase();
            return pRef === normalized || pSku === normalized;
          });

          if (targetIndex !== -1) {
            const optimized = await optimizeImage(imgFile, 0.8, 700);
            const p = newStaging[targetIndex];
            p.imagenBlob = optimized.blob;
            p.previewUrl = optimized.previewUrl;
            p.status = evaluateRowStatus(p);
          }
        }
      }

      setStagingData(newStaging.length > 0 ? newStaging : null);
    } catch (err: any) {
      if (err?.message === 'INVALID_ORIGIN') {
        setError('El archivo subido no es una plantilla válida del sistema o su estructura ha sido alterada. Por favor descarga y usa la plantilla oficial.');
      } else if (err?.message === 'INVALID_STRUCTURE') {
        setError('La estructura de columnas del archivo ha sido modificada o es inválida. Por favor descarga y usa la plantilla oficial.');
      } else if (err?.message === 'INVALID_REFERENCES') {
        setError('Se detectaron filas sin código de referencia oficial (REF-###).');
      } else if (err?.message === 'INVALID_TEMPLATE') {
        setError('El archivo subido no coincide con la estructura de la plantilla oficial. Por favor descarga y utiliza la plantilla del sistema.');
      } else {
        setError('Error al procesar los archivos. Revisa el formato.');
      }
    } finally {
      setIsLoading(false);
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();

    const items = Array.from(e.dataTransfer.items);
    const hasDirectories = items.some(item => {
      const entry = item.webkitGetAsEntry?.();
      return entry?.isDirectory;
    });

    if (hasDirectories) {
      // Extracción recursiva de archivos desde carpetas y sub-carpetas
      const allEntries = items
        .map(item => item.webkitGetAsEntry?.())
        .filter((entry): entry is FileSystemEntry => entry !== null && entry !== undefined);

      const allFiles = (await Promise.all(allEntries.map(collectFilesFromEntry))).flat();
      processDroppedFiles(allFiles);
    } else {
      processDroppedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processDroppedFiles(Array.from(e.target.files));
    }
  };

  const handleRowImageUpload = async (id: string, file: File) => {
    const optimized = await optimizeImage(file, 0.8, 700);
    setStagingData(prev => prev ? prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, imagenBlob: optimized.blob, previewUrl: optimized.previewUrl };
        updated.status = evaluateRowStatus(updated);
        return updated;
      }
      return p;
    }) : null);
  };

  const handleDiscard = (id: string) => {
    setStagingData(prev => prev ? prev.filter(p => p.id !== id) : null);
  };

  const handleClear = async () => {
    if (stagingData) {
      stagingData.forEach(p => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    }
    setStagingData(null);
    setError(null);
    setImportProgress(null);
    setEditRowId(null);
    await clearStash();
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
        const errors = [];
        if (!updated.nombre) errors.push('Nombre es requerido');
        if (!updated.marca) errors.push('Marca es requerida');
        if (isNaN(updated.precio) || updated.precio <= 0) errors.push('Precio debe ser mayor a 0');
        if (!updated.categoria) errors.push('Categoría es requerida');
        
        updated.errors = errors;
        updated.status = evaluateRowStatus(updated);
        return updated;
      }
      return p;
    }) : null);
    
    setEditRowId(null);
  };

  const executeImport = async (validProducts: StagingProduct[]) => {
    setIsLoading(true);
    setError(null);
    setImportProgress({ current: 0, total: validProducts.length });

    try {
      const CHUNK_SIZE = 20;
      let processed = 0;

      for (let i = 0; i < validProducts.length; i += CHUNK_SIZE) {
        const chunk = validProducts.slice(i, i + CHUNK_SIZE);
        
        const payloadProducts = await Promise.all(chunk.map(async (p) => {
          let base64 = undefined;
          if (p.imagenBlob) {
            base64 = await blobToBase64(p.imagenBlob);
          }
          return {
            id: p.id,
            sku: p.sku,
            nombre: p.nombre,
            marca: p.marca,
            precio: p.precio,
            categoria: p.categoria,
            descripcion: p.descripcion,
            in_stock: p.in_stock,
            imagenUrl: p.imagenUrl,
            imagenBase64: base64,
            removeImage: p.removeImage
          };
        }));

        await post('/admin/products/bulk', { products: payloadProducts });
        
        setStagingData(prev => prev ? prev.filter(p => !chunk.find(c => c.id === p.id)) : null);
        
        processed += chunk.length;
        setImportProgress({ current: processed, total: validProducts.length });
      }

      await clearStash();
      setToast({ open: true, message: 'Importación completada con éxito', severity: 'success' });
      if (onSuccess) {
        await onSuccess();
      }
      onClose();
    } catch (err: any) {
      setToast({ open: true, message: formatApiError(err, 'Error durante la importación'), severity: 'error' });
    } finally {
      setIsLoading(false);
      setImportProgress(null);
    }
  };

  const handleImport = async () => {
    if (!stagingData) return;
    const validProducts = stagingData.filter(p => p.status === 'Listo');
    if (validProducts.length === 0) return;

    const pendingPhotos = validProducts.filter(p => !p.imagenBlob);
    if (pendingPhotos.length > 0) {
      setConfirmDialog({
        open: true,
        title: 'Fotos Pendientes',
        content: `Hay ${pendingPhotos.length} productos sin foto. ¿Deseas importar de todos modos? Se usará la imagen por defecto.`,
        onConfirm: () => {
          setConfirmDialog(null);
          executeImport(validProducts);
        }
      });
      return;
    }

    executeImport(validProducts);
  };

  const renderDropzone = (isCompact = false) => (
    <Box
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        border: '2px dashed',
        borderColor: isDragOver ? 'primary.main' : 'divider',
        bgcolor: isDragOver ? 'action.hover' : 'background.paper',
        borderRadius: 1,
        p: isCompact ? 3 : 5,
        width: '100%',
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        cursor: 'pointer',
        mb: isCompact ? 2 : 0,
        transition: 'background-color 0.2s, border-color 0.2s'
      }}
      component="label"
    >
      <input type="file" hidden multiple accept=".xlsx,image/*" onChange={handleFileInput} />
      <CloudUploadIcon color={isDragOver ? "primary" : "action"} sx={{ fontSize: 48, mb: 1 }} />
      <Typography variant="h6" color={isDragOver ? "primary" : "textPrimary"}>
        Arrastra aquí el Excel y/o las fotos, o haz clic para subir
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        (Puedes subir el .xlsx primero y luego arrojar las fotos)
      </Typography>
    </Box>
  );

  if (stagingData) {
    const validCount = stagingData.filter(p => p.status === 'Listo').length;
    
    return (
      <Dialog open={open} onClose={() => {}} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle fontWeight={700}>Mesa de Trabajo (Staging)</DialogTitle>
        <DialogContent dividers>
          
          {renderDropzone(true)}

          <Box display="flex" justifyContent="space-between" mb={2} alignItems="center">
            <Typography variant="body2">
              <strong>{stagingData.length}</strong> productos ({validCount} listos).
            </Typography>
            <Box display="flex" gap={1}>
              <Button size="small" variant="outlined" onClick={() => setStagingData(prev => prev ? prev.filter(p => p.status === 'Listo') : null)} disabled={isLoading}>
                Limpiar Incompletos
              </Button>
              <Button size="small" color="error" onClick={handleClear} disabled={isLoading}>
                Limpiar mesa
              </Button>
            </Box>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 0, maxHeight: 400, overflowX: 'auto' }}>
            <Table size="small" stickyHeader sx={{ tableLayout: 'auto', minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 100 }}>SKU / REF</TableCell>
                  <TableCell>Imagen</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Nombre</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>Marca</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Precio</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>Categoría</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Stock</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Estado</TableCell>
                  <TableCell align="right" sx={{ minWidth: 100 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stagingData.map(prod => {
                  const isEditing = editRowId === prod.id;
                  
                  return (
                  <TableRow key={prod.id} hover>
                    <TableCell>
                      <Typography variant="caption" display="block" color="primary">{prod.sku}</Typography>
                      <Typography variant="caption" color="text.secondary">Ref: {prod.ref_num}</Typography>
                    </TableCell>
                    <TableCell>
                      {prod.previewUrl || (prod.existingImageUrl && !prod.removeImage) ? (
                        <Box sx={{ position: 'relative', width: 40, height: 40 }}>
                          <Box component="img" src={prod.previewUrl || prod.existingImageUrl} width={40} height={40} sx={{ objectFit: 'contain', bgcolor: '#fff', border: '1px solid #ccc' }} />
                          <IconButton
                            size="small"
                            sx={{ position: 'absolute', top: -10, right: -10, p: 0.2, bgcolor: 'background.paper' }}
                            onClick={() => {
                              if (prod.previewUrl) URL.revokeObjectURL(prod.previewUrl);
                              setStagingData(prev => prev ? prev.map(p => {
                                if (p.id === prod.id) {
                                  const updated = { ...p, imagenBlob: null, previewUrl: undefined, removeImage: true, allowNoPhoto: false };
                                  updated.status = evaluateRowStatus(updated);
                                  return updated;
                                }
                                return p;
                              }) : null);
                            }}
                          >
                            <CloseIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      ) : (
                        <Tooltip title="Foto Pendiente. Haz clic para subir.">
                          <IconButton component="label" size="small" color="warning">
                            <input type="file" hidden accept="image/*" onChange={(e) => {
                              if (e.target.files?.[0]) handleRowImageUpload(prod.id, e.target.files[0]);
                            }} />
                            <WarningAmberIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField size="small" value={editForm.nombre || ''} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} />
                      ) : (
                        prod.nombre
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <Autocomplete
                          freeSolo
                          options={existingBrands}
                          value={editForm.marca || ''}
                          onChange={(_, newValue) => setEditForm({ ...editForm, marca: newValue || '' })}
                          onInputChange={(_, newInputValue) => setEditForm({ ...editForm, marca: newInputValue || '' })}
                          renderInput={(params) => <TextField {...params} size="small" placeholder="Marca" />}
                          sx={{ minWidth: 140 }}
                        />
                      ) : (
                        prod.marca
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField size="small" type="number" value={editForm.precio || 0} onChange={e => setEditForm({ ...editForm, precio: Number(e.target.value) })} sx={{ width: 80 }} />
                      ) : (
                        `$${prod.precio}`
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <TextField size="small" value={editForm.categoria || ''} onChange={e => setEditForm({ ...editForm, categoria: e.target.value })} sx={{ minWidth: 140 }} />
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
                      {prod.status === 'Listo' ? (
                        <Chip label={prod.allowNoPhoto && !prod.imagenBlob ? "Listo (sin foto)" : "Listo"} color="success" size="small" />
                      ) : prod.status === 'Sin foto' ? (
                        <Chip label="Sin foto" color="warning" size="small" />
                      ) : (
                        <Tooltip title={prod.errors.length > 0 ? prod.errors.join(', ') : "Datos incompletos"}>
                          <Chip label="Incompleto" color="error" size="small" />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
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
                          {prod.status === 'Sin foto' && (
                            <Tooltip title="Permitir sin foto">
                              <IconButton size="small" onClick={() => {
                                setStagingData(prev => prev ? prev.map(p => {
                                  if (p.id === prod.id) {
                                    const updated = { ...p, allowNoPhoto: true };
                                    updated.status = evaluateRowStatus(updated);
                                    return updated;
                                  }
                                  return p;
                                }) : null);
                              }}>
                                <VisibilityOffIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
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
          <Button onClick={onClose} color="inherit" disabled={isLoading}>Ocultar</Button>
          <Button variant="contained" disabled={validCount === 0 || isLoading} onClick={handleImport}>
            {isLoading ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                {importProgress
                  ? `Procesando ${importProgress.current}/${importProgress.total}...`
                  : 'Procesando...'}
              </>
            ) : (
              `Importar ${validCount} Productos`
            )}
          </Button>
        </DialogActions>
      <Dialog open={confirmDialog?.open || false} onClose={() => setConfirmDialog(null)}>
        <DialogTitle>{confirmDialog?.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog?.content}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(null)} color="inherit">Cancelar</Button>
          <Button onClick={confirmDialog?.onConfirm} color="primary" variant="contained">Confirmar</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={toast.open} autoHideDuration={6000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
      </Dialog>
    );
  }

  // UI Inicial de carga
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
      <DialogTitle fontWeight={700}>Importación Masiva Inteligente</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Descarga la plantilla, complétala y sube el archivo .xlsx junto a las fotos de tus productos.
        </Typography>

        <Box display="flex" flexDirection="column" gap={2}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadTemplate} sx={{ borderRadius: 0 }}>
            Descargar Plantilla Oficial
          </Button>

          {renderDropzone()}

          {isLoading && (
             <Box textAlign="center" mt={2}>
               <CircularProgress size={24} />
               <Typography variant="body2">Procesando...</Typography>
             </Box>
          )}

          {error && <Typography variant="body2" color="error.main" mt={1}>{error}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cerrar</Button>
      </DialogActions>
      <Dialog open={confirmDialog?.open || false} onClose={() => setConfirmDialog(null)}>
        <DialogTitle>{confirmDialog?.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog?.content}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(null)} color="inherit">Cancelar</Button>
          <Button onClick={confirmDialog?.onConfirm} color="primary" variant="contained">Confirmar</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={toast.open} autoHideDuration={6000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
