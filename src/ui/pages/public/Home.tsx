/**
 * Home — Portada principal de ZUTECH.
 *
 * Secciones:
 * 1. Hero — banner tech, CTAs.
 * 2. Productos Destacados — grid de ProductCard.
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InventoryIcon from '@mui/icons-material/Inventory';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ChevronLeftIcon   from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon  from '@mui/icons-material/ChevronRight';
import Navbar          from '@ui/components/Navbar';
import Footer          from '@ui/components/Footer';
import ProductCard     from '@ui/components/ProductCard';
import AnimatedSection from '@ui/components/AnimatedSection';
import EmptyState      from '@ui/components/EmptyState';
import Skeleton        from '@mui/material/Skeleton';
import SEO             from '@core/media/SEO';
import { get, formatApiError } from '@core/api/client';
import type { BaseRecord, PaginatedRecords } from '@core/types/record';

const ProductCardSkeleton = () => (
  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', borderRadius: 0 }}>
    <Skeleton variant="rectangular" height={200} />
    <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="90%" height={32} />
      <Skeleton variant="text" width="40%" height={32} sx={{ mt: 'auto' }} />
    </Box>
    <Box sx={{ p: 2, pt: 0 }}>
      <Skeleton variant="rectangular" height={36} sx={{ mb: 1 }} />
      <Skeleton variant="rectangular" height={36} />
    </Box>
  </Card>
);

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Home() {
  // Fetch del catálogo desde el CDN
  const { data, isLoading, isError, error } = useQuery<PaginatedRecords>({
    queryKey: ['products-index'],
    queryFn: async () => {
      const res = await get<BaseRecord[] | { records: BaseRecord[] }>(`/public/products?t=${Date.now()}`);
      const records = Array.isArray(res) ? res : (res?.records ?? []);
      return { 
        records: records, 
        page: 1,
        limit: records.length,
        total: records.length 
      } as PaginatedRecords;
    },
    staleTime: 5 * 60 * 1000,
  });

  const theme = useTheme();

  // Mostrar productos destacados
  const displayProducts = useMemo(() => {
    if (!data?.records) return [];
    return data.records
      .filter((p) => Boolean(p.attributes?.featured || p.attributes?.destacado))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  }, [data]);
  
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const itemsVisible = isDesktop ? 4 : isTablet ? 2 : 1;
  const loopActive = displayProducts.length > itemsVisible;
  const hasMultipleProducts = displayProducts.length > 1;
  const hasProducts = displayProducts.length > 0;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: loopActive,
    align: 'start',
    active: loopActive,
    watchDrag: hasMultipleProducts,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onInit = useCallback((emblaApi: any) => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi?.scrollSnapList?.() ?? []);
  }, []);

  const onSelect = useCallback((emblaApi: any) => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi?.selectedScrollSnap?.() ?? 0);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onInit(emblaApi);
    onSelect(emblaApi);
    emblaApi.on('reInit', onInit).on('reInit', onSelect).on('select', onSelect);
  }, [emblaApi, onInit, onSelect]);

  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SEO 
        title="ZUTECH | Hardware, Software y Servicio Técnico" 
        description="Todo en software y hardware para tu PC. Tienda de componentes, equipos y servicio técnico especializado." 
      />
      <Navbar />

      {/* ── Hero ──────────────────────────────────── */}
      <Box
        component="section"
        sx={{
          position: 'relative',
          minHeight: { xs: '75vh', md: '80vh' },
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          bgcolor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle at 80% 20%, rgba(0, 229, 255, 0.15) 0%, transparent 50%)',
            zIndex: 1,
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, pt: { xs: 8, sm: 10, md: 0 } }}>
          <Box sx={{ maxWidth: { xs: '90%', sm: '80%', md: '600px' } }}>
            <AnimatedSection>
              <Chip
                label="TODO EN SOFTWARE Y HARDWARE"
                sx={{
                  mb: 3,
                  height: 'auto',
                  '& .MuiChip-label': {
                    px: 2.5,
                    py: 0.8,
                  },
                  bgcolor: 'rgba(0, 229, 255, 0.1)',
                  color: 'primary.main',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                  fontWeight: 700,
                  letterSpacing: 1,
                  borderRadius: 1,
                }}
              />
            </AnimatedSection>

            <AnimatedSection delay={80}>
              <Typography
                variant="h1"
                fontWeight={800}
                color="text.primary"
                mb={2.5}
                sx={{ 
                  fontSize: { xs: '2.5rem', md: '4rem' },
                  lineHeight: 1.1,
                  textShadow: '0 0 20px rgba(0, 229, 255, 0.2)' 
                }}
              >
                Eleva el <Box component="span" sx={{ color: 'primary.main' }}>rendimiento</Box> de tu PC
              </Typography>
            </AnimatedSection>

            <AnimatedSection delay={160}>
              <Typography
                variant="body1"
                mb={4.5}
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '1rem', md: '1.25rem' },
                  maxWidth: 500,
                }}
              >
                Descubre nuestra selección premium de componentes, accesorios y servicio técnico especializado en ZUTECH.
              </Typography>
            </AnimatedSection>

            <AnimatedSection delay={240}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  component={RouterLink}
                  to="/productos"
                  variant="contained"
                  size="large"
                  endIcon={<ShoppingCartOutlinedIcon />}
                  sx={{
                    fontWeight: 800,
                    px: 4,
                  }}
                >
                  Ver Catálogo
                </Button>
              </Box>
            </AnimatedSection>
          </Box>
        </Container>
      </Box>

      {/* ── Productos Destacados ───────────────────────────────────────── */}

      <Box component="section" sx={{ py: { xs: 6, md: 10 }, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default', contentVisibility: 'auto', containIntrinsicSize: 'auto 500px' }}>
        <Container maxWidth="lg">
          <AnimatedSection>
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              <Typography variant="overline" color="primary.main" fontWeight={800} letterSpacing="0.12em">
                Lo mejor en tecnología
              </Typography>
              <Typography variant="h2" fontWeight={800} mt={0.5} mb={1.5} color="text.primary">
                Productos Destacados
              </Typography>
              <Typography variant="body1" color="text.secondary" maxWidth={500} mx="auto">
                Seleccionamos los mejores componentes y equipos para garantizar el máximo rendimiento y durabilidad de tu sistema.
              </Typography>
            </Box>
          </AnimatedSection>

          {isError ? (
            <AnimatedSection>
              <Box component={Card} variant="outlined" sx={{ bgcolor: 'transparent', textAlign: 'center', py: 8, borderColor: 'error.light' }}>
                <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
                <Typography variant="h6" component="h3" color="error.main" fontWeight={600} gutterBottom>
                  Error al cargar el catálogo
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatApiError(error, 'Por favor, intenta nuevamente más tarde.')}
                </Typography>
              </Box>
            </AnimatedSection>
          ) : (
            <>
              {(isLoading || hasProducts) && (
                <Box sx={{ position: 'relative', px: { xs: 0, md: 6 } }}>
                {isDesktop && loopActive && hasMultipleProducts && (
                  <IconButton 
                    aria-label="Anterior"
                    onClick={() => emblaApi && emblaApi.scrollPrev()}
                    sx={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 2, bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'grey.100' } }}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                )}

                <Box sx={{ overflow: 'hidden', p: { xs: 2, sm: 3 }, m: { xs: -2, sm: -3 } }} ref={emblaRef}>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      touchAction: 'pan-y', 
                      ml: { xs: -2, sm: -3 },
                    }}
                  >
                    {isLoading
                      ? Array.from({ length: itemsVisible }).map((_, i) => (
                          <Box key={i} sx={{ 
                            flex: '0 0 auto', 
                            minWidth: 0, 
                            pl: { xs: 2, sm: 3 }, 
                            width: { xs: '100%', sm: '50%', md: '25%' } 
                          }}>
                            <Box sx={{ maxWidth: { xs: '92%', sm: 'none' }, mx: 'auto', height: '100%' }}>
                              <ProductCardSkeleton />
                            </Box>
                          </Box>
                        ))
                      : displayProducts?.map((product, i) => (
                          <Box key={product?.id || i} sx={{ 
                            flex: '0 0 auto', 
                            minWidth: 0, 
                            pl: { xs: 2, sm: 3 }, 
                            width: { xs: '100%', sm: '50%', md: '25%' } 
                          }}>
                            <AnimatedSection delay={i * 60} sx={{ height: '100%' }}>
                              <Box sx={{ maxWidth: { xs: '92%', sm: 'none' }, mx: 'auto', height: '100%' }}>
                                {product && (
                                  <ProductCard 
                                    id={product.id}
                                    title={product.title || ''}
                                    brand={(product.attributes?.brand as string) || ''}
                                    category={(product.attributes?.category as string) || ''}
                                    price={Number(product.attributes?.price) || 0}
                                    inStock={Boolean(product.attributes?.in_stock)}
                                    image={product.main_image}
                                    destacado={Boolean(product.attributes?.featured || product.attributes?.destacado)}
                                  />
                                )}
                              </Box>
                            </AnimatedSection>
                          </Box>
                        ))}
                  </Box>
                </Box>

                {isDesktop && loopActive && hasMultipleProducts && (
                  <IconButton 
                    aria-label="Siguiente"
                    onClick={() => emblaApi && emblaApi.scrollNext()}
                    sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 2, bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'grey.100' } }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                )}

                {/* Dots */}
                {!isLoading && hasMultipleProducts && scrollSnaps.length > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
                    {scrollSnaps.map((_, i) => (
                      <Box
                        key={i}
                        onClick={() => scrollTo(i)}
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: i === selectedIndex ? 'primary.main' : 'grey.800',
                          cursor: 'pointer',
                          transition: 'background-color 0.3s',
                          '&:hover': { bgcolor: 'primary.light' }
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
              )}

              {!isLoading && hasProducts && (
                <AnimatedSection sx={{ textAlign: 'center', mt: 5 }}>
                  <Button
                    component={RouterLink}
                    to="/productos"
                    variant="outlined"
                    color="primary"
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                    sx={{ px: 4, fontWeight: 700 }}
                  >
                    Explorar todo el catálogo
                  </Button>
                </AnimatedSection>
              )}

              {!isLoading && !hasProducts && (
                <AnimatedSection>
                  <EmptyState 
                    icon={<InventoryIcon />}
                    title="No hay productos destacados aún"
                    description="Pronto añadiremos los mejores componentes a esta sección."
                  />
                </AnimatedSection>
              )}
            </>
          )}
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
