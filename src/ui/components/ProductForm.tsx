import { useState, useCallback, useRef, memo, useEffect, type ChangeEvent, type MouseEvent } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import CloseIcon from '@mui/icons-material/Close';
import AddPhotoIcon from '@mui/icons-material/AddPhotoAlternate';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post, put, formatApiError, clearEtagCache } from '@core/api/client';
import { optimizeImage } from '@core/media/imageOptimizer';
import { compressScannerImage } from '@core/media/scannerCompressor';
import { ITEM_IMAGE_FALLBACK } from '@core/coreConfig';
import CameraScannerModal from './CameraScannerModal';
import type { BaseRecord } from '@core/types/record';

const DRAFT_STORAGE_KEY = 'zetech_product_form_draft';

interface ProductFormProps {
  open:    boolean;
  onClose: () => void;
  initial?: BaseRecord | null;
  collectionName?: string;
  onSuccess?: (isEdit: boolean) => void;
}

const EMPTY = {
  title: '', brand: '', category: '', price: '',
  description: '', status: 'active',
  in_stock: true, featured: false,
};

const validationSchema = Yup.object({
  title: Yup.string().trim().required('El título/nombre es obligatorio'),
  brand: Yup.string().trim(),
  category: Yup.string().required('La categoría es obligatoria'),
  price: Yup.number()
    .typeError('Debe ser un número válido')
    .positive('El precio debe ser mayor a 0')
    .required('El precio es obligatorio'),
  description: Yup.string(),
  in_stock: Yup.boolean(),
  featured: Yup.boolean(),
});

interface ImageSourceBottomSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
}

const ImageSourceBottomSheet = memo(function ImageSourceBottomSheet({
  open,
  onClose,
  onSelectCamera,
  onSelectGallery,
}: ImageSourceBottomSheetProps) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 20,
      }}
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(3px)',
            bgcolor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: '16px 16px 0 0',
          bgcolor: 'background.paper',
          p: 0,
          maxWidth: 480,
          mx: 'auto',
          borderTop: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          color: 'text.primary',
          pt: 2.5,
          pb: 1,
          px: 3,
        }}
      >
        Seleccionar imagen
      </Typography>

      <List disablePadding sx={{ pb: 2 }}>
        <ListItemButton
          onClick={() => {
            onClose();
            onSelectCamera();
          }}
          sx={{ px: 3, py: 1.5 }}
        >
          <CameraAltOutlinedIcon sx={{ color: 'text.secondary', mr: 2 }} />
          <Typography sx={{ fontSize: '1rem', color: 'text.primary' }}>
            Tomar foto
          </Typography>
        </ListItemButton>

        <ListItemButton
          onClick={() => {
            onClose();
            onSelectGallery();
          }}
          sx={{ px: 3, py: 1.5 }}
        >
          <PhotoLibraryOutlinedIcon sx={{ color: 'text.secondary', mr: 2 }} />
          <Typography sx={{ fontSize: '1rem', color: 'text.primary' }}>
            Elegir de la galería
          </Typography>
        </ListItemButton>
      </List>
    </Drawer>
  );
});

interface ImagePickerProps {
  label:   string;
  preview: string;
  onFile:  (file: File) => void;
  onClear?: () => void;
  size?:   'small' | 'large';
}

const ImagePicker = memo(function ImagePicker({ label, preview, onFile, onClear, size = 'large' }: ImagePickerProps) {
  const h = size === 'large' ? 180 : 110;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (file) {
        onFile(file);
      }
    } finally {
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      setDrawerOpen(false);
    }
  };

  const handleOpenDrawer = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        onClick={handleOpenDrawer}
        sx={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          height:         h,
          border:         '2px dashed',
          borderColor:    preview ? 'primary.main' : 'divider',
          borderRadius:   2,
          cursor:         'pointer',
          overflow:       'hidden',
          bgcolor:        'background.default',
          transition:     'border-color 200ms',
          '&:hover':      { borderColor: 'primary.main' },
        }}
      >
        {preview ? (
          <Box
            component="img"
            src={preview}
            alt={label ? `Vista previa de ${label}` : 'Vista previa de imagen'}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = ITEM_IMAGE_FALLBACK; }}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box sx={{ textAlign: 'center', p: 1, pointerEvents: 'none' }}>
            <AddPhotoIcon sx={{ fontSize: '2rem', color: 'text.disabled', mb: 0.5 }} />
            <Typography variant="caption" color="text.disabled" display="block">
              {label}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Input de archivo para selección desde Galería */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      {/* Bottom Sheet nativo para selección de origen (Cámara / Galería) */}
      <ImageSourceBottomSheet
        open={drawerOpen}
        onClose={handleCloseDrawer}
        onSelectCamera={() => setCameraModalOpen(true)}
        onSelectGallery={() => galleryInputRef.current?.click()}
      />

      {/* Visor de Cámara WebRTC Integrado para foto de producto (Sin IA) */}
      <CameraScannerModal
        open={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={(file) => {
          onFile(file);
        }}
        onSelectGallery={() => {
          galleryInputRef.current?.click();
        }}
        title="Foto del Producto"
        subtitle="Encuadra el producto y presiona capturar"
      />

      {preview && onClear && (
        <Tooltip title="Quitar foto">
          <IconButton
            aria-label="Quitar foto"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            sx={{
              position: 'absolute', top: 4, right: 4,
              bgcolor: 'rgba(0,0,0,0.55)', color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
});

export default function ProductForm({ open, onClose, initial, collectionName = 'products', onSuccess }: ProductFormProps) {
  const isEdit = Boolean(initial?.id);
  const qc     = useQueryClient();

  const getInitialFormValues = () => {
    if (initial) {
      return {
        title:           initial.title,
        description:     initial.description     ?? '',
        status:          'active',
        brand:           (initial.attributes?.['brand'] as string) ?? '',
        category:        (initial.attributes?.['category'] as string) ?? '',
        price:           initial.attributes?.['price'] !== undefined ? String(initial.attributes?.['price']) : '',
        in_stock:        (initial.attributes?.['in_stock'] as boolean) ?? true,
        featured:        (initial.attributes?.['featured'] as boolean) ?? false,
      };
    }
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 1000 * 60 * 30 && parsed.values && !parsed.isEdit) {
          return parsed.values;
        }
      }
    } catch {
      // ignore
    }
    return EMPTY;
  };

  const formik = useFormik({
    initialValues: getInitialFormValues(),
    enableReinitialize: true,
    validationSchema,
    onSubmit: () => {
      mutation.mutate();
    },
  });

  const [mainPreview,  setMainPreview]  = useState<string>(initial?.main_image ?? '');
  const [mainBase64,   setMainBase64]   = useState<string>('');
  const [extraFiles,   setExtraFiles]   = useState<{ preview: string; base64: string }[]>([]);
  const [imgLoading,   setImgLoading]   = useState(false);
  const [error,        setError]        = useState('');
  const [isScanning,   setIsScanning]   = useState(false);
  const [scanAlert,    setScanAlert]    = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef   = useRef<HTMLInputElement>(null);

  // Sincronización continua de borrador en sessionStorage para resiliencia ante recargas del SO
  useEffect(() => {
    if (!open) return;
    const hasContent = Boolean(
      formik.values.title ||
      formik.values.description ||
      formik.values.brand ||
      formik.values.price
    );
    if (hasContent) {
      try {
        sessionStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            values: formik.values,
            isEdit,
            editId: initial?.id,
            timestamp: Date.now(),
          })
        );
      } catch {
        // ignore
      }
    }
  }, [open, formik.values, isEdit, initial?.id]);

  const handleCleanClose = () => {
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
    onClose();
  };

  const [scannerDrawerOpen, setScannerDrawerOpen] = useState(false);

  const processScannerFile = async (file: File) => {
    setIsScanning(true);
    setScanAlert(null);

    try {
      const compressedDataUrl = await compressScannerImage(file);
      const res = await post<{
        data: {
          title: string;
          brand: string;
          model: string;
          category: string;
          specs: Record<string, string>;
          description: string;
        };
      }>('/admin/products/scan-ai', {
        image: compressedDataUrl,
        mimeType: 'image/jpeg',
      });

      const data = res?.data;
      if (!data) {
        throw new Error('Respuesta vacía del servidor de escaneo');
      }

      // Hidratación reactiva de inputs (Human-in-the-Loop)
      if (data.title) {
        void formik.setFieldValue('title', data.title);
      }
      if (data.brand) {
        void formik.setFieldValue('brand', data.brand);
      }
      if (data.category) {
        void formik.setFieldValue('category', data.category);
      }

      let composedDescription = data.description || '';
      if (data.model && !composedDescription.includes(data.model)) {
        composedDescription = `Modelo: ${data.model}\n\n${composedDescription}`.trim();
      }
      const specsEntries = Object.entries(data.specs || {});
      if (specsEntries.length > 0) {
        const specsText = specsEntries.map(([k, v]) => `• ${k}: ${v}`).join('\n');
        composedDescription = `${composedDescription}\n\nEspecificaciones técnicas:\n${specsText}`.trim();
      }

      if (composedDescription) {
        void formik.setFieldValue('description', composedDescription);
      }

      setScanAlert({
        type: 'success',
        message: 'Datos extraídos con éxito. Por favor verifica los campos y asigna el precio.',
      });

      // Foco obligatorio inmediato en el campo de precio
      setTimeout(() => {
        priceInputRef.current?.focus();
        priceInputRef.current?.select();
      }, 150);
    } catch (err: unknown) {
      console.error('[Scanner AI Error]:', err);
      const msg = formatApiError(err, 'No se pudo completar el escaneo con IA. Ingrese los datos manualmente.');
      setScanAlert({
        type: 'warning',
        message: msg,
      });
    } finally {
      setIsScanning(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleScannerFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processScannerFile(file);
  };

  const handleMainFile = useCallback(async (file: File) => {
    setImgLoading(true);
    try {
      const result = await optimizeImage(file);
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve((reader.result as string).split(',')[1] ?? '');
        reader.onerror = reject;
        reader.readAsDataURL(result.blob);
      });
      setMainPreview(result.previewUrl);
      setMainBase64(b64);
    } finally {
      setImgLoading(false);
    }
  }, []);

  const handleExtraFile = useCallback(async (file: File) => {
    if (extraFiles.length >= 5) return;
    setImgLoading(true);
    try {
      const result = await optimizeImage(file);
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve((reader.result as string).split(',')[1] ?? '');
        reader.onerror = reject;
        reader.readAsDataURL(result.blob);
      });
      setExtraFiles((p) => [...p, { preview: result.previewUrl, base64: b64 }]);
    } finally {
      setImgLoading(false);
    }
  }, [extraFiles.length]);

  const removeExtra = (idx: number) =>
    setExtraFiles((p) => p.filter((_, i) => i !== idx));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...(isEdit && initial?.id ? { id: initial.id } : {}),
        title: formik.values.title,
        description: formik.values.description,
        status: formik.values.status,
        attributes: {
          brand: formik.values.brand,
          category: formik.values.category,
          price: parseFloat(formik.values.price as string),
          in_stock: formik.values.in_stock,
          featured: formik.values.featured,
        },
        ...(mainBase64 ? { 
          main_image_base64: mainBase64,
        } : {}),
        ...(extraFiles.length > 0
          ? { gallery_base64: extraFiles.map((f) => f.base64) }
          : {}),
        ...(isEdit
          ? { gallery_existing: initial?.gallery ?? [] }
          : {}),
      };
      if (isEdit) {
        return put(`/admin/${collectionName}/${initial?.id}`, payload);
      }
      return post(`/admin/${collectionName}`, payload);
    },
    onSuccess: () => {
      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }
      clearEtagCache(collectionName);
      void qc.invalidateQueries({ queryKey: [`${collectionName}-index`] });
      if (onSuccess) {
        onSuccess(isEdit);
      } else {
        handleCleanClose();
      }
    },
    onError: (err: unknown) => {
      const msg = formatApiError(err, isEdit ? 'Error al actualizar el registro' : 'Error al crear el registro');
      setError(msg);
    },
  });

  const handleSubmit = () => {
    setError('');
    formik.handleSubmit();
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={handleCleanClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={700}>
          {isEdit ? 'Editar Producto' : 'Registrar Nuevo Producto'}
        </Typography>
        <IconButton aria-label="Cerrar formulario" onClick={handleCleanClose} size="small" disabled={mutation.isPending}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {scanAlert && (
          <Alert
            severity={scanAlert.type}
            onClose={() => setScanAlert(null)}
            sx={{ mb: 2, borderRadius: 2 }}
          >
            {scanAlert.message}
          </Alert>
        )}

        {/* Input dedicado para selección de fotos desde Galería */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleScannerFileChange}
        />

        {/* Disparador de Escáner IA (Fase 1) */}
        <Box
          sx={{
            mb: 2.5,
            p: { xs: 1.5, sm: 2 },
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AutoAwesomeOutlinedIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2} color="text.primary">
                Autocompletar con Escáner IA
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Captura la etiqueta o empaque para rellenar especificaciones técnicas
              </Typography>
            </Box>
          </Box>
          <Button
            id="btn-trigger-ai-scan"
            type="button"
            variant="contained"
            disabled={mutation.isPending || isScanning}
            onClick={() => {
              setScanAlert(null);
              setScannerDrawerOpen(true);
            }}
            startIcon={isScanning ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeOutlinedIcon fontSize="small" />}
            sx={{
              fontWeight: 600,
              borderRadius: 2,
              textTransform: 'none',
              px: 2.5,
              py: 1,
              whiteSpace: 'nowrap',
              display: { xs: 'flex', md: 'inline-flex' },
              justifyContent: 'center',
              boxShadow: 'none',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: '#162238',
                boxShadow: 'none',
              },
              '&:active': { transform: 'scale(0.98)' },
              transition: 'transform 150ms ease-out, background-color 150ms',
            }}
          >
            {isScanning ? 'Iniciando escáner...' : 'Escanear producto con IA'}
          </Button>

          {/* Bottom Sheet nativo para selección de origen en Escáner IA */}
          <ImageSourceBottomSheet
            open={scannerDrawerOpen}
            onClose={() => setScannerDrawerOpen(false)}
            onSelectCamera={() => setCameraModalOpen(true)}
            onSelectGallery={() => galleryInputRef.current?.click()}
          />
        </Box>

        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={1.5}>
          Datos básicos
        </Typography>
        <Grid container spacing={2} mb={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Nombre / Título comercial *"
              name="title"
              value={formik.values.title}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.title && Boolean(formik.errors.title)}
              helperText={formik.touched.title && (formik.errors.title as string)}
              fullWidth size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Marca"
              name="brand"
              value={formik.values.brand}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              fullWidth size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <FormControl fullWidth size="small" error={formik.touched.category && Boolean(formik.errors.category)}>
              <InputLabel id="label-category">Categoría *</InputLabel>
              <Select labelId="label-category" name="category" value={formik.values.category} label="Categoría *" onChange={formik.handleChange} onBlur={formik.handleBlur}>
                <MenuItem value="">—</MenuItem>
                <MenuItem value="Procesadores">Procesadores</MenuItem>
                <MenuItem value="Tarjetas Gráficas">Tarjetas Gráficas</MenuItem>
                <MenuItem value="Tarjetas Madre">Tarjetas Madre</MenuItem>
                <MenuItem value="Memorias RAM">Memorias RAM</MenuItem>
                <MenuItem value="Almacenamiento">Almacenamiento</MenuItem>
                <MenuItem value="Fuentes de Poder">Fuentes de Poder</MenuItem>
                <MenuItem value="Chasis / Cases">Chasis / Cases</MenuItem>
                <MenuItem value="Refrigeración">Refrigeración</MenuItem>
                <MenuItem value="Periféricos">Periféricos</MenuItem>
                <MenuItem value="Laptops">Laptops</MenuItem>
                <MenuItem value="PCs / Computadoras">PCs / Computadoras</MenuItem>
                <MenuItem value="Servicio Técnico / Software">Servicio Técnico / Software</MenuItem>
                <MenuItem value="Otros">Otros</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              inputRef={priceInputRef}
              label="Precio (USD) *"
              type="number"
              name="price"
              value={formik.values.price}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.price && Boolean(formik.errors.price)}
              helperText={formik.touched.price && (formik.errors.price as string)}
              fullWidth size="small"
              inputProps={{ min: 0, step: 0.01 }}
              InputProps={{ startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>$</Typography> }}
            />
          </Grid>
        </Grid>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={1.5}>
          Estado y descripción
        </Typography>
        <Grid container spacing={2} mb={2}>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={<Switch name="in_stock" checked={formik.values.in_stock} onChange={formik.handleChange} color="primary" />}
                label="En Stock / Disponible"
              />
              <FormControlLabel
                control={<Switch name="featured" checked={formik.values.featured} onChange={formik.handleChange} color="warning" />}
                label="Destacado ⭐"
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Descripción"
              name="description"
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              fullWidth
              multiline
              rows={3}
              size="small"
            />
          </Grid>
        </Grid>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
            Fotos
          </Typography>
          {imgLoading && <CircularProgress size={16} />}
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Foto Principal (Opcional, pero recomendado)
            </Typography>
            <ImagePicker
              label="Foto Principal"
              preview={mainPreview}
              onFile={handleMainFile}
              onClear={() => { setMainPreview(''); setMainBase64(''); }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 8 }}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Fotos adicionales (máx. 5)
            </Typography>
            <Grid container spacing={1}>
              {extraFiles.map((ef, idx) => (
                <Grid key={idx} size={{ xs: 4 }}>
                  <ImagePicker
                    label={`Foto ${idx + 2}`}
                    preview={ef.preview}
                    onFile={() => {}}
                    onClear={() => removeExtra(idx)}
                    size="small"
                  />
                </Grid>
              ))}
              {extraFiles.length < 5 && (
                <Grid size={{ xs: 4 }}>
                  <ImagePicker
                    label="Agregar foto"
                    preview=""
                    onFile={handleExtraFile}
                    size="small"
                  />
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={handleCleanClose} disabled={mutation.isPending} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mutation.isPending || imgLoading || formik.isSubmitting}
          startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ px: 3 }}
        >
          {mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar Producto'}
        </Button>
      </DialogActions>

      {/* Visor de Cámara WebRTC Integrado en la App (Cero recargas / Cero LMK) */}
      <CameraScannerModal
        open={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={(file) => {
          void processScannerFile(file);
        }}
        onSelectGallery={() => {
          galleryInputRef.current?.click();
        }}
        title="Escanear Producto con IA"
        subtitle="Apunta a la etiqueta o empaque del producto"
      />
    </Dialog>
  );
}
