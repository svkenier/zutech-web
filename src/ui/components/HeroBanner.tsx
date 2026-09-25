import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AnimatedSection from './AnimatedSection';
// ─── Asset servido desde /public (no requiere import de Vite) ────────────────
const HERO_BG = '/images/hero-banner.jpg';

export default function HeroBanner() {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        minHeight: '90vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: '#060D17',
        overflow: 'hidden',
      }}
    >
      {/* ── Imagen de fondo cinematográfica ─────────────────────────────── */}
      <Box
        component="img"
        src={HERO_BG}
        alt="ZUTECH – Hardware de Alta Gama"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'right center',
          zIndex: 0,
        }}
      />

      {/* ── Gradiente quirúrgico: tapa solo el lado izquierdo (zona de texto) */}
      <Box sx={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: {
          xs: 'linear-gradient(to right, #060D17 0%, rgba(6,13,23,0.92) 55%, rgba(6,13,23,0.6) 80%, transparent 100%)',
          md: 'linear-gradient(to right, #060D17 0%, #060D17 25%, rgba(6,13,23,0.88) 50%, rgba(6,13,23,0.3) 70%, transparent 100%)',
        },
      }} />

      {/* ── Sombra sutil en el pie ───────────────────────────────────────── */}
      <Box sx={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 100, zIndex: 1,
        background: 'linear-gradient(to top, #060D17 0%, transparent 100%)',
      }} />

      {/* ── Bloque de texto ─────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Box sx={{ maxWidth: { xs: '100%', sm: '70%', md: '55%' } }}>

          <AnimatedSection delay={80}>
            <Typography
              component="h1"
              sx={{
                fontWeight: 900,
                fontSize: { xs: '2.75rem', sm: '3.75rem', md: '4.75rem' },
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                textTransform: 'uppercase',
                color: '#FFFFFF',
                mb: 3,
              }}
            >
              Potencia sin{' '}
              <Box component="span" sx={{ color: '#00F0FF' }}>
                límites
              </Box>
              {' '}para tu setup
            </Typography>
          </AnimatedSection>

          <AnimatedSection delay={180}>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.72)',
                fontSize: { xs: '1rem', md: '1.15rem' },
                lineHeight: 1.75,
                maxWidth: 500,
                mb: 5,
              }}
            >
              Componentes de hardware de última generación y servicio técnico especializado. Diseñado para entusiastas y profesionales.
            </Typography>
          </AnimatedSection>

          <AnimatedSection delay={280}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>

              {/* Primario: Cian — texto oscuro (WCAG AA) */}
              <Button
                component={RouterLink}
                to="/productos"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  fontWeight: 700,
                  px: 4, py: 1.5,
                  bgcolor: '#00F0FF',
                  color: '#060D17',
                  borderRadius: '6px',
                  boxShadow: '0 0 20px rgba(0,240,255,0.2)',
                  transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease',
                  '&:hover': {
                    bgcolor: '#33F5FF',
                    boxShadow: '0 0 32px rgba(0,240,255,0.4)',
                    transform: 'translateY(-2px)',
                  },
                  '&:active': { transform: 'scale(0.97)' },
                }}
              >
                Ver Catálogo
              </Button>

              {/* Secundario: Ghost */}
              <Button
                component={RouterLink}
                to="/contacto"
                variant="outlined"
                size="large"
                sx={{
                  fontWeight: 600,
                  px: 4, py: 1.5,
                  borderRadius: '6px',
                  borderColor: 'rgba(255,255,255,0.25)',
                  color: '#FFFFFF',
                  backdropFilter: 'blur(8px)',
                  bgcolor: 'rgba(255,255,255,0.04)',
                  transition: 'transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.55)',
                    bgcolor: 'rgba(255,255,255,0.09)',
                    transform: 'translateY(-2px)',
                  },
                  '&:active': { transform: 'scale(0.97)' },
                }}
              >
                Contactar Servicio
              </Button>

            </Box>
          </AnimatedSection>
        </Box>
      </Container>
    </Box>
  );
}
