import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get, formatApiError } from '@core/api/client';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import ArrowBackIcon  from '@mui/icons-material/ArrowBack';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import ShareIcon      from '@mui/icons-material/Share';
import CategoryIcon   from '@mui/icons-material/Category';
import MemoryIcon     from '@mui/icons-material/Memory';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import Navbar         from '@ui/components/Navbar';
import Footer         from '@ui/components/Footer';
import AnimatedSection from '@ui/components/AnimatedSection';
import { useCart }    from '@ui/context/CartContext';
import SEO            from '@core/media/SEO';
import type { BaseRecord } from '@core/types/record';
import { ITEM_IMAGE_FALLBACK } from '@core/coreConfig';

export default function ProductDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [snackOpen, setSnackOpen]   = useState(false);

  const { addToCart } = useCart();

  const { data: record, isLoading, isError, error } = useQuery<BaseRecord>({
    queryKey: ['product', id],
    queryFn:  async () => {
      const records = await get<BaseRecord[]>('/public/products');
      const found = records?.find(p => p.id === id);
      if (!found) throw new Error('Producto no encontrado');
      return found;
    },
  });

  const allImages = record
    ? [record.main_image, ...(record.gallery ?? [])].filter(Boolean) as string[]
    : [];

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setSnackOpen(true);
    } catch {
      setSnackOpen(true);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 6, flexGrow: 1 }}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Skeleton variant="rounded" height={420} />
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                {[1, 2, 3].map((n) => <Skeleton key={n} variant="rounded" width={80} height={60} />)}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Skeleton variant="text" width="70%" height={40} />
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="rounded" height={120} sx={{ mt: 2 }} />
              <Skeleton variant="rounded" height={48} sx={{ mt: 3 }} />
            </Grid>
          </Grid>
        </Container>
        <Footer />
      </Box>
    );
  }

  if (isError || !record) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center', flexGrow: 1 }}>
          <Typography fontSize="4rem" mb={2}>🔍</Typography>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Registro no encontrado
          </Typography>
          <Typography color="text.secondary" mb={3}>
            {isError ? formatApiError(error, 'Ocurrió un problema de conexión al servidor.') : 'Es posible que esta ficha haya sido eliminada o el ID no sea correcto.'}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/productos')}>
            Ver catálogo
          </Button>
        </Container>
        <Footer />
      </Box>
    );
  }

  const attributes = record.attributes || {};
  const inStock = Boolean(attributes['in_stock']);
  const category = attributes['category'] as string | undefined;
  const brand = attributes['brand'] as string | undefined;
  const price = Number(attributes['price']) || 0;
  const specs = attributes['specs'] as string | undefined;

  const handleAddToCart = () => {
    if (inStock && record.title) {
      addToCart({
        id: record.id,
        title: record.title,
        price,
        brand: brand || '',
        image: record.main_image || ''
      });
      setSnackOpen(true);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SEO 
        title={`${record.title} · Zutech`} 
        description={record.description || `Comprar ${record.title} en Zutech.`} 
        url={`/productos/${record.id}`}
        image={record.main_image}
      />
      <Navbar />

      <Box sx={{ py: { xs: 3, md: 6 }, flexGrow: 1 }}>
        <Container maxWidth="lg">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mb: 3, color: 'text.secondary' }}
          >
            Volver
          </Button>

          <Grid container spacing={{ xs: 3, md: 4 }} alignItems="flex-start">
            <Grid size={{ xs: 12, md: 6 }}>
              <AnimatedSection direction="left">
                <Box
                  sx={{
                    width: '100%',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    aspectRatio: { xs: '1 / 1', sm: '4 / 3' },
                    maxHeight: { xs: 320, sm: 400, md: 520 },
                    p: 2,
                    mx: 'auto'
                  }}
                >
                  {allImages.length > 0 ? (
                    <Box
                      component="img"
                      src={allImages[galleryIdx]}
                      alt={record.title ? `Foto ${galleryIdx + 1} de ${record.title}` : `Foto ${galleryIdx + 1}`}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                        e.currentTarget.parentElement?.querySelector('.fallback-icon')?.removeAttribute('hidden');
                      }}
                      sx={{
                        width: '100%',
                        height: '100%',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        display: 'block',
                        transition: 'transform 0.25s ease-in-out',
                        '&:hover': {
                          transform: 'scale(1.03)',
                        }
                      }}
                    />
                  ) : null}
                  {(allImages.length === 0) && (
                    <Box
                      className="fallback-icon"
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'grey.100',
                      }}
                    >
                      <MemoryIcon sx={{ fontSize: 80, color: 'text.disabled', opacity: 0.5 }} />
                    </Box>
                  )}
                </Box>

                {allImages.length > 1 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                    {allImages.map((img, idx) => (
                      <Box
                        key={idx}
                        component="img"
                        src={img}
                        alt={`Miniatura ${idx + 1}`}
                        onClick={() => setGalleryIdx(idx)}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = ITEM_IMAGE_FALLBACK;
                        }}
                        sx={{
                          width:      72,
                          height:     56,
                          objectFit:  'cover',
                          borderRadius: 0,
                          cursor:     'pointer',
                          border:     '2px solid',
                          borderColor: idx === galleryIdx ? 'primary.main' : 'transparent',
                          opacity:    idx === galleryIdx ? 1 : 0.65,
                          transition: 'all 200ms',
                          '&:hover':  { opacity: 1 },
                        }}
                      />
                    ))}
                  </Box>
                )}
              </AnimatedSection>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <AnimatedSection direction="right">
                <Chip
                  label={inStock ? '✅ En Stock' : '❌ Agotado'}
                  color={inStock ? 'success' : 'default'}
                  size="small"
                  sx={{ mb: 1.5, fontWeight: 700 }}
                />

                <Typography variant="h2" fontWeight={800} mb={0.5} color="text.primary">
                  {record.title}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {brand && (
                    <Chip label={brand} variant="outlined" size="small" sx={{ borderColor: 'primary.main', color: 'primary.main', fontWeight: 600 }} />
                  )}
                  {category && <Chip icon={<CategoryIcon />} label={category} size="small" variant="outlined" />}
                  <Chip icon={<AttachMoneyIcon />} label={price.toFixed(2)} size="small" variant="outlined" sx={{ fontWeight: 800 }} />
                </Box>

                <Divider sx={{ mb: 2.5 }} />

                {record.description && (
                  <Typography variant="body1" color="text.secondary" lineHeight={1.8} mb={3}>
                    {record.description}
                  </Typography>
                )}

                {specs && (
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 0, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="text.primary">
                      Especificaciones Técnicas
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                      {specs}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<ShoppingCartOutlinedIcon />}
                    disabled={!inStock}
                    onClick={handleAddToCart}
                    sx={{ flexGrow: 1, borderRadius: 0, py: 1.3, fontWeight: 800 }}
                  >
                    {!inStock ? 'Agotado' : 'Añadir al carrito'}
                  </Button>

                  <Tooltip title="Copiar enlace">
                    <IconButton aria-label="Acción"
                      onClick={() => void handleShare()}
                      sx={{
                        border:     '1px solid',
                        borderColor: 'divider',
                        borderRadius: 0,
                      }}
                    >
                      <ShareIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Typography variant="caption" color="text.disabled" display="block" mt={1.5}>
                  ID: {record.id} · Registrado el {new Date(record.created_at).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
              </AnimatedSection>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Snackbar
        open={snackOpen}
        autoHideDuration={2500}
        onClose={() => setSnackOpen(false)}
        message="✅ Añadido al carrito / Enlace copiado"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <Footer />
    </Box>
  );
}
