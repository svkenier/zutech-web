import { useMemo, useState, useDeferredValue, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon  from '@mui/icons-material/Clear';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import Navbar     from '@ui/components/Navbar';
import Footer     from '@ui/components/Footer';
import ProductCard from '@ui/components/ProductCard';
import AnimatedSection from '@ui/components/AnimatedSection';
import SEO from '@core/media/SEO';
import Skeleton from '@mui/material/Skeleton';
import Card from '@mui/material/Card';
import { get, formatApiError } from '@core/api/client';
import type { BaseRecord } from '@core/types/record';

interface RecordFilters {
  busqueda: string;
  category: string;
  brand: string;
  inStock: string;
}

const INITIAL_FILTERS: RecordFilters = {
  busqueda: '',
  category: '',
  brand: '',
  inStock: '',
};

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

export default function ProductsPage() {
  const [filters, setFilters] = useState<RecordFilters>(INITIAL_FILTERS);
  const [visibleCount, setVisibleCount] = useState(8);

  useEffect(() => {
    setVisibleCount(8);
  }, [filters]);

  const { data, isLoading, isError, error, refetch } = useQuery<{ records: BaseRecord[]; total: number }>({
    queryKey: ['products-index'],
    queryFn: async () => {
      const res = await get<BaseRecord[] | { records: BaseRecord[] }>(`/public/products?t=${Date.now()}`);
      const records = Array.isArray(res) ? res : (res?.records ?? []);
      return { 
        records, 
        total: records.length 
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filters.busqueda?.trim().toLowerCase() ?? '';

    const results = data.records.filter((p) => {
      const category = (p.attributes?.['category'] as string) ?? '';
      const brand = (p.attributes?.['brand'] as string) ?? '';
      const inStock = Boolean(p.attributes?.['in_stock']);

      if (q && !p.title.toLowerCase().includes(q) && !brand.toLowerCase().includes(q) && !category.toLowerCase().includes(q))
        return false;
      if (filters.category && category !== filters.category) return false;
      if (filters.brand    && brand !== filters.brand) return false;
      if (filters.inStock === 'yes' && !inStock) return false;
      if (filters.inStock === 'no'  && inStock)  return false;
      return true;
    });

    return results.sort((a, b) => {
      const aStock = Boolean(a.attributes?.in_stock);
      const bStock = Boolean(b.attributes?.in_stock);
      if (aStock && !bStock) return -1;
      if (!aStock && bStock) return 1;

      const aDest = Boolean(a.attributes?.featured || a.attributes?.destacado);
      const bDest = Boolean(b.attributes?.featured || b.attributes?.destacado);
      if (aDest && !bDest) return -1;
      if (!aDest && bDest) return 1;
      
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [data, filters]);

  const deferredFiltered = useDeferredValue(filtered);
  const visibleRecords = deferredFiltered.slice(0, visibleCount);

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');
  const clearFilters     = () => setFilters(INITIAL_FILTERS);

  const set = <K extends keyof RecordFilters>(key: K, value: RecordFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SEO 
        title="Catálogo de Productos | ZUTECH" 
        description="Explora todo nuestro catálogo de componentes y hardware."
        url="/productos"
      />
      <Navbar />

      <Box
        sx={{
          bgcolor:    'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py:         { xs: 4, md: 6 },
        }}
      >
        <Container maxWidth="lg">
          <AnimatedSection>
            <Typography variant="overline" color="primary" fontWeight={700} letterSpacing="0.12em">
              Nuestro Inventario
            </Typography>
            <Typography variant="h2" fontWeight={800} mt={0.5} mb={1}>
              Catálogo de Hardware
            </Typography>
            {data && (
              <Typography variant="body1" color="text.secondary">
                {data.total} producto{data.total !== 1 ? 's' : ''} disponibles
              </Typography>
            )}
          </AnimatedSection>
        </Container>
      </Box>

      <Box sx={{ bgcolor: '#F8F7F4', borderBottom: '1px solid', borderColor: 'divider', py: 2.5 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <FilterListIcon sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }} />

            <TextField
              id="products-search"
              placeholder="Buscar producto o marca..."
              value={filters.busqueda}
              onChange={(e) => set('busqueda', e.target.value)}
              size="small"
              sx={{ minWidth: 220, bgcolor: 'background.paper' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" sx={{ minWidth: 160, bgcolor: 'background.paper' }}>
              <InputLabel id="filter-category-label">Categoría</InputLabel>
              <Select
                labelId="filter-category-label"
                id="filter-category"
                value={filters.category ?? ''}
                label="Categoría"
                onChange={(e) => set('category', e.target.value as string)}
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="Procesadores">Procesadores</MenuItem>
                <MenuItem value="Tarjetas Gráficas">Tarjetas Gráficas</MenuItem>
                <MenuItem value="Tarjetas Madre">Tarjetas Madre</MenuItem>
                <MenuItem value="Memorias RAM">Memorias RAM</MenuItem>
                <MenuItem value="Almacenamiento">Almacenamiento</MenuItem>
                <MenuItem value="Fuentes de Poder">Fuentes de Poder</MenuItem>
                <MenuItem value="Chasis / Cases">Chasis / Cases</MenuItem>
                <MenuItem value="Periféricos">Periféricos</MenuItem>
                <MenuItem value="Servicio Técnico / Software">Servicio Técnico / Software</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120, bgcolor: 'background.paper' }}>
              <InputLabel id="filter-stock-label">Stock</InputLabel>
              <Select
                labelId="filter-stock-label"
                id="filter-stock"
                value={filters.inStock ?? ''}
                label="Stock"
                onChange={(e) => set('inStock', e.target.value as string)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="yes">En Stock</MenuItem>
                <MenuItem value="no">Agotado</MenuItem>
              </Select>
            </FormControl>

            {hasActiveFilters && (
              <Button
                size="small"
                color="error"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                variant="outlined"
                sx={{ borderRadius: 0 }}
              >
                Limpiar
              </Button>
            )}
          </Box>

          {!isLoading && data && (
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {deferredFiltered.length} resultado{deferredFiltered.length !== 1 ? 's' : ''}
              </Typography>
              {hasActiveFilters && (
                <Chip
                  label="Filtros activos"
                  size="small"
                  color="primary"
                  variant="outlined"
                  onDelete={clearFilters}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          )}
        </Container>
      </Box>

      <Box sx={{ flexGrow: 1, py: { xs: 4, md: 6 }, bgcolor: 'background.default', contentVisibility: 'auto', containIntrinsicSize: 'auto 800px' }}>
        <Container maxWidth="lg">
          <style>
            {`
              @keyframes catalogFadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}
          </style>

          {isError && (
            <Alert
              severity="error"
              action={<Button color="inherit" size="small" onClick={() => void refetch()}>Reintentar</Button>}
              sx={{ mb: 4 }}
            >
              {formatApiError(error, 'No pudimos cargar la lista.')}
            </Alert>
          )}

          <Grid container spacing={3}>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <ProductCardSkeleton />
                  </Grid>
                ))
              : visibleRecords?.map((record, i) => {
                  const isInitialStatic = i < 6;
                  return (
                    <Grid key={record?.id || i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                      <Box
                        sx={
                          isInitialStatic
                            ? {}
                            : {
                                opacity: 0,
                                animation: 'catalogFadeInUp 0.5s ease forwards',
                                animationDelay: `${Math.min((i - 6) * 40, 320)}ms`,
                                willChange: 'opacity, transform',
                              }
                        }
                      >
                        {record ? (
                          <ProductCard 
                            id={record.id}
                            title={record.title || ''}
                            brand={(record.attributes?.brand as string) || ''}
                            category={(record.attributes?.category as string) || ''}
                            price={Number(record.attributes?.price) || 0}
                            inStock={Boolean(record.attributes?.in_stock)}
                            image={record.main_image}
                            destacado={Boolean(record.attributes?.featured || record.attributes?.destacado)}
                          />
                        ) : null}
                      </Box>
                    </Grid>
                  );
                })}
          </Grid>

          {!isLoading && !isError && visibleCount < deferredFiltered.length && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setVisibleCount((prev) => prev + 8)}
                aria-label="Cargar más registros"
                sx={{ px: 4, py: 1, borderRadius: 2, fontWeight: 700 }}
              >
                Cargar más
              </Button>
            </Box>
          )}

          {!isLoading && !isError && deferredFiltered.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <ViewModuleIcon sx={{ fontSize: '4rem', color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {hasActiveFilters
                  ? 'Sin resultados con esos filtros'
                  : 'No hay productos disponibles en el catálogo en este momento.'}
              </Typography>
              <Typography variant="body2" color="text.disabled" mb={3}>
                {hasActiveFilters
                  ? 'Prueba combinaciones diferentes o limpia los filtros.'
                  : 'Vuelve pronto.'}
              </Typography>
              {hasActiveFilters && (
                <Button variant="outlined" color="primary" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </Box>
          )}

          <Divider sx={{ mt: 6 }} />
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
