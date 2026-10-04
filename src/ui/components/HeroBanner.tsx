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
        minHeight: { xs: 'calc(100dvh - 57px)', sm: 'calc(100dvh - 65px)' },
        display: 'flex',
        alignItems: 'center',
        bgcolor: '#060D17',
        overflow: 'hidden',
        borderBottom: 'none',
        mb: 0,
      }}
    >
      {/* ── Imagen de fondo cinematográfica ─────────────────────────────── */}
      <Box
        component="img"
        src={HERO_BG}
        alt="ZUTECH – Hardware de Alta Gama"
        sx={{
          position: 'absolute',
          top: -1,
          left: -1,
          right: -1,
          bottom: -1,
          width: 'calc(100% + 2px)',
          height: 'calc(100% + 2px)',
          objectFit: 'cover',
          objectPosition: 'right center',
          zIndex: 0,
          display: 'block',
        }}
      />

      {/* ── Gradiente quirúrgico: tapa solo el lado izquierdo (zona de texto) */}
      <Box sx={{
        position: 'absolute', top: -1, bottom: -1, left: -1, right: -1, zIndex: 1,
        background: {
          xs: 'linear-gradient(to right, #060D17 0%, rgba(6,13,23,0.92) 55%, rgba(6,13,23,0.6) 80%, transparent 100%)',
          md: 'linear-gradient(to right, #060D17 0%, #060D17 25%, rgba(6,13,23,0.88) 50%, rgba(6,13,23,0.3) 70%, transparent 100%)',
        },
      }} />

      {/* ── Sombra sutil en el pie ───────────────────────────────────────── */}
      <Box sx={{
        position: 'absolute', bottom: -1, left: -1, right: -1,
        height: 102, zIndex: 1,
        background: 'linear-gradient(to top, #060D17 0%, transparent 100%)',
      }} />

      {/* ── Bloque de texto ─────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Box sx={{ maxWidth: { xs: '100%', md: '560px', lg: '620px' } }}>

          <AnimatedSection delay={80}>
            <Typography
              component="h1"
              sx={{
                fontWeight: 900,
                fontSize: {
                  xs: 'clamp(2rem, 6vw, 2.5rem)',
                  sm: 'clamp(2.5rem, 5vw, 3.2rem)',
                  md: 'clamp(3rem, 4.2vw, 4.2rem)',
                },
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                textTransform: 'uppercase',
                color: '#FFFFFF',
                mb: 0,
              }}
            >
              <Box component="span" sx={{ whiteSpace: 'nowrap' }}>HARDWARE Y PC</Box><br />
              <Box component="span" sx={{ color: '#00F0FF' }}>
                DE ÉLITE
              </Box>
              <br />PARA TU SETUP
            </Typography>
          </AnimatedSection>

          <AnimatedSection delay={180}>
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: { xs: '0.95rem', md: '1.1rem' },
                lineHeight: 1.6,
                maxWidth: '520px',
                mt: { xs: 2, md: 2.5 },
                mb: { xs: 3.5, md: 4 },
              }}
            >
              Componentes de última generación y servicio técnico especializado en Maracaibo. Ensambles a medida para gaming y alto rendimiento.
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
