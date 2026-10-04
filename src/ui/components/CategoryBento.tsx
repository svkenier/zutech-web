import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import AnimatedSection from './AnimatedSection';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link as RouterLink } from 'react-router-dom';

// ─── Imágenes locales del proyecto ────────────────────────────────────────────
import GPU_IMG   from '@ui/assets/images/Tarjeta_de_Video.webp';
import CPU_IMG   from '@ui/assets/images/Procesador.webp';
import MOBO_IMG  from '@ui/assets/images/Motherboard.webp';
import RAM_IMG   from '@ui/assets/images/hp-cat-memory.webp';
import SSD_IMG   from '@ui/assets/images/almacenamiento.webp';
import COOL_IMG  from '@ui/assets/images/hp-cat-coolers.webp';
import PSU_IMG   from '@ui/assets/images/hp-cat-psu.webp';
import PERI_IMG  from '@ui/assets/images/hp-cat-headsets.webp';

// ─── Gradiente oscuro para legibilidad de textos ─────────────────────────────
const OVERLAY = 'linear-gradient(to top, rgba(6,13,23,0.95) 0%, rgba(6,13,23,0.55) 55%, rgba(6,13,23,0.1) 100%)';

// ─── Estilos de tarjeta base ─────────────────────────────────────────────────
const cardBase = {
  position: 'relative' as const,
  overflow: 'hidden',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'block',
  borderRadius: '16px',
  border: '1px solid rgba(0, 240, 255, 0.08)',
  bgcolor: '#060D17',
  transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    borderColor: 'rgba(0, 240, 255, 0.25)',
    boxShadow: '0 8px 40px rgba(0, 240, 255, 0.06)',
    '& .cat-img': { transform: 'scale(1.06)' },
    '& .cat-arrow': { transform: 'translateX(5px)' },
  },
};

// ─── Sub-componente: imagen con overlay ──────────────────────────────────────
function CardImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Box
      className="cat-img"
      component="img"
      src={src}
      alt={alt}
      sx={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        objectFit: 'cover',
        transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    />
  );
}

// ─── Sub-componente: overlay de texto ────────────────────────────────────────
function CardOverlay() {
  return (
    <Box sx={{ position: 'absolute', inset: 0, background: OVERLAY, zIndex: 1 }} />
  );
}

// ─── Sub-componente: badge de acento ─────────────────────────────────────────
function Badge({ label }: { label: string }) {
  return (
    <Typography
      variant="caption"
      sx={{
        display: 'inline-block',
        fontWeight: 800,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#00F0FF',
        mb: 0.75,
        fontSize: '0.7rem',
      }}
    >
      {label}
    </Typography>
  );
}

// ─── Sub-componente: etiqueta "Explorar →" ───────────────────────────────────
function ExploreLink() {
  return (
    <Typography
      variant="caption"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        color: '#00F0FF',
        fontWeight: 700,
        mt: 1,
        fontSize: '0.8rem',
        '& .cat-arrow': { transition: 'transform 0.2s ease' },
      }}
    >
      Explorar <ArrowForwardIcon className="cat-arrow" sx={{ fontSize: '0.9rem' }} />
    </Typography>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CategoryBento() {
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#FFFFFF' }}>
      <Container maxWidth="lg">

        {/* Encabezado de sección */}
        <AnimatedSection>
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
            <Typography
              variant="h2"
              fontWeight={900}
              sx={{
                color: '#0A1322',
                letterSpacing: '-0.01em',
                textTransform: 'uppercase',
                fontSize: { xs: '1.75rem', md: '2.25rem' },
              }}
            >
              Comprar por Categoría
            </Typography>
          </Box>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          {/* ── Bloque Principal (GPU grande + bloque derecho) ── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' }, gap: 2, mb: 2 }}>

            {/* GPU — Grande, abarca 2 filas */}
            <Box
              component={RouterLink}
              to="/productos?category=Tarjetas Gráficas"
              sx={{ ...cardBase, height: { xs: 320, md: '100%' }, minHeight: { md: 500 } }}
            >
              <CardImage src={GPU_IMG} alt="Tarjetas Gráficas" />
              <CardOverlay />
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, p: 3, zIndex: 2 }}>
                <Badge label="Prioridad #1" />
                <Typography variant="h4" fontWeight={900} color="#FFFFFF" sx={{ letterSpacing: '-0.01em', lineHeight: 1.2, textTransform: 'uppercase' }}>
                  Tarjetas Gráficas
                </Typography>
                <ExploreLink />
              </Box>
            </Box>

            {/* Bloque derecho: CPU + (Mobo / RAM) */}
            <Box sx={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 2 }}>

              {/* CPU — Ancho completo del bloque derecho */}
              <Box
                component={RouterLink}
                to="/productos?category=Procesadores"
                sx={{ ...cardBase, minHeight: { xs: 200, md: 'auto' } }}
              >
                <CardImage src={CPU_IMG} alt="Procesadores" />
                <CardOverlay />
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, p: 3, zIndex: 2 }}>
                  <Badge label="Alto Rendimiento" />
                  <Typography variant="h5" fontWeight={900} color="#FFFFFF" sx={{ textTransform: 'uppercase' }}>
                    Procesadores
                  </Typography>
                  <ExploreLink />
                </Box>
              </Box>

              {/* Mobo + RAM en fila media (50/50) */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>

                {/* Placas Base */}
                <Box
                  component={RouterLink}
                  to="/productos?category=Tarjetas Madre"
                  sx={{ ...cardBase, minHeight: { xs: 180, md: 'auto' } }}
                >
                  <CardImage src={MOBO_IMG} alt="Placas Base" />
                  <CardOverlay />
                  <Box sx={{ position: 'absolute', bottom: 0, left: 0, p: 2.5, zIndex: 2 }}>
                    <Typography variant="subtitle1" fontWeight={900} color="#FFFFFF" sx={{ textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      Placas Base
                    </Typography>
                    <ExploreLink />
                  </Box>
                </Box>

                {/* Memorias RAM */}
                <Box
                  component={RouterLink}
                  to="/productos?category=Memorias RAM"
                  sx={{ ...cardBase, minHeight: { xs: 180, md: 'auto' } }}
                >
                  <CardImage src={RAM_IMG} alt="Memorias RAM" />
                  <CardOverlay />
                  <Box sx={{ position: 'absolute', bottom: 0, left: 0, p: 2.5, zIndex: 2 }}>
                    <Typography variant="subtitle1" fontWeight={900} color="#FFFFFF" sx={{ textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      Memorias RAM
                    </Typography>
                    <ExploreLink />
                  </Box>
                </Box>

              </Box>
            </Box>
          </Box>

          {/* ── Fila Inferior: 4 tarjetas iguales ── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
            {[
              { label: 'Almacenamiento', slug: 'Almacenamiento', img: SSD_IMG },
              { label: 'Refrigeración',  slug: 'Refrigeración',  img: COOL_IMG },
              { label: 'Chasis & Energía', slug: 'Fuentes de Poder', img: PSU_IMG },
              { label: 'Periféricos',    slug: 'Periféricos', img: PERI_IMG },
            ].map(({ label, slug, img }) => (
              <Box
                key={slug}
                component={RouterLink}
                to={`/productos?category=${slug}`}
                sx={{ ...cardBase, minHeight: { xs: 160, md: 200 } }}
              >
                <CardImage src={img} alt={label} />
                <CardOverlay />
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, p: 2.5, zIndex: 2 }}>
                  <Typography variant="subtitle1" fontWeight={900} color="#FFFFFF" sx={{ textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.2 }}>
                    {label}
                  </Typography>
                  <ExploreLink />
                </Box>
              </Box>
            ))}
          </Box>
        </AnimatedSection>
      </Container>
    </Box>
  );
}
