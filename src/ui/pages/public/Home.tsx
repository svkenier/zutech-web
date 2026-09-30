import { useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
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
import HeroBanner      from '@ui/components/HeroBanner';
import BrandCarousel   from '@ui/components/BrandCarousel';
import CategoryBento   from '@ui/components/CategoryBento';
import LaptopFeature   from '@ui/components/LaptopFeature';
import FinalCTA        from '@ui/components/FinalCTA';
import SEO             from '@core/media/SEO';
import TALLER_IMG      from '@ui/assets/images/WhatsApp Image 2026-07-12 at 3.40.21 PM (1).webp';
import { get, formatApiError } from '@core/api/client';
import type { BaseRecord, PaginatedRecords } from '@core/types/record';

const ProductCardSkeleton = () => (
  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
    <Skeleton variant="rectangular" height={200} />
    <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="90%" height={32} />
      <Skeleton variant="text" width="40%" height={32} sx={{ mt: 'auto' }} />
    </Box>
  </Card>
);

export default function Home() {
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

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SEO 
        title="ZUTECH | Hardware, Software y Servicio Técnico" 
        description="Todo en software y hardware para tu PC. Tienda de componentes, equipos y servicio técnico especializado." 
      />
      
      {/* 1. Header / Navbar */}
      <Navbar />

      {/* 2. Hero Section */}
      <HeroBanner />

      {/* 3. Comprar por Categoría (Bento Grid) */}
      <AnimatedSection delay={100}>
        <CategoryBento />
      </AnimatedSection>

      {/* 4. Feature Section: Laptops y Portátiles */}
      <LaptopFeature />

      {/* 5. Módulo de Productos Destacados (Hardware Élite) */}
      <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F8FAFC' }}>
        <Container maxWidth="lg">
          <AnimatedSection>
            <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={800} letterSpacing="0.12em">
                  [ HARDWARE ÉLITE ]
                </Typography>
                <Typography variant="h2" fontWeight={900} mt={1} color="text.primary" letterSpacing="-0.02em">
                  Productos Destacados
                </Typography>
              </Box>
              {!isLoading && hasProducts && isDesktop && (
                <Button
                  component={RouterLink}
                  to="/productos"
                  endIcon={<ArrowForwardIcon />}
                  sx={{ fontWeight: 700, color: 'text.primary' }}
                >
                  Ver Todos
                </Button>
              )}
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
                <Box sx={{ position: 'relative', px: { xs: 0, md: 2 } }}>
                {isDesktop && loopActive && hasMultipleProducts && (
                  <IconButton 
                    aria-label="Anterior"
                    onClick={() => emblaApi && emblaApi.scrollPrev()}
                    sx={{ position: 'absolute', left: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 2, bgcolor: 'background.paper', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                )}

                <Box sx={{ overflow: 'hidden', p: { xs: 2, sm: 2 }, m: { xs: -2, sm: -2 } }} ref={emblaRef}>
                  <Box sx={{ display: 'flex', touchAction: 'pan-y', ml: { xs: -2, sm: -2 } }}>
                    {isLoading
                      ? Array.from({ length: itemsVisible }).map((_, i) => (
                          <Box key={i} sx={{ flex: '0 0 auto', minWidth: 0, pl: { xs: 2, sm: 2 }, width: { xs: '100%', sm: '50%', md: '25%' } }}>
                            <Box sx={{ mx: 'auto', height: '100%' }}>
                              <ProductCardSkeleton />
                            </Box>
                          </Box>
                        ))
                      : displayProducts?.map((product, i) => (
                          <Box key={product?.id || i} sx={{ flex: '0 0 auto', minWidth: 0, pl: { xs: 2, sm: 2 }, width: { xs: '100%', sm: '50%', md: '25%' } }}>
                            <AnimatedSection delay={i * 60} sx={{ height: '100%' }}>
                              <Box sx={{ mx: 'auto', height: '100%' }}>
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
                    sx={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 2, bgcolor: 'background.paper', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                )}
              </Box>
              )}

              {!isLoading && hasProducts && !isDesktop && (
                <AnimatedSection sx={{ textAlign: 'center', mt: 4 }}>
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

      {/* 6. Carrusel / Franja de Marcas Oficiales */}
      <BrandCarousel />

      {/* Opcional: Sección de Taller Técnico antes del footer */}
      <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#060D17', color: '#FFFFFF' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <AnimatedSection>
                <Typography variant="overline" color="secondary.main" fontWeight={800} letterSpacing="0.12em">
                  [ LABORATORIO TÉCNICO ]
                </Typography>
                <Typography variant="h2" fontWeight={800} mt={1} mb={3} color="#FFFFFF">
                  No solo vendemos hardware.<br/>Lo reparamos.
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 4, fontSize: '1.1rem' }}>
                  A diferencia de las tiendas convencionales, ZUTECH nació como un laboratorio de electrónica. Nuestro equipo domina la lectura de esquemáticos y la microsoldadura para salvar componentes que otros darían por perdidos.
                </Typography>
                <Button 
                  component={RouterLink}
                  to="/servicios"
                  variant="outlined"
                  size="large"
                  sx={{
                    color: 'secondary.main',
                    borderColor: 'secondary.main',
                    borderWidth: 2,
                    fontWeight: 700,
                    '&:hover': {
                      borderWidth: 2,
                      bgcolor: 'rgba(0, 229, 255, 0.1)'
                    }
                  }}
                >
                  Agendar Diagnóstico
                </Button>
              </AnimatedSection>
            </Grid>
            <Grid item xs={12} md={6}>
              <AnimatedSection delay={200}>
                <Box 
                  component="img"
                  src={TALLER_IMG}
                  alt="Motherboard Repair"
                  sx={{ 
                    width: '100%', 
                    borderRadius: 2, 
                    border: '1px solid',
                    borderColor: 'rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                  }}
                />
              </AnimatedSection>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Final */}
      <FinalCTA />
      
      {/* 7. Footer Corporativo */}
      <Footer />
    </Box>
  );
}
