import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import { Link as RouterLink } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AnimatedSection from './AnimatedSection';

const SPEC_CHIPS = ['RTX Serie 40 / 50', 'Paneles 240Hz OLED', 'Chasis de Aluminio'];

export default function LaptopFeature() {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 10, lg: 12 },
        bgcolor: '#060D17',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* ── Resplandor ambiental de fondo ────────────────────────────────────── */}
      <Box sx={{
        position: 'absolute',
        right: { xs: '-10%', lg: 40 },
        top: '50%',
        transform: 'translateY(-50%)',
        width: 500,
        height: 500,
        bgcolor: 'rgba(0, 240, 255, 0.1)',
        filter: 'blur(120px)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, px: { xs: 3, md: 6 } }}>
        <Grid container spacing={{ xs: 6, lg: 12 }} alignItems="center">
          
          {/* ══════════════════════════════════════════════════════════════════
              LADO IZQUIERDO — Texto y Conversión (5 columnas)
          ══════════════════════════════════════════════════════════════════ */}
          <Grid item xs={12} lg={5}>
            <AnimatedSection>
              {/* Badge técnico */}
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#00F0FF', boxShadow: '0 0 8px #00F0FF' }} />
                <Typography sx={{ 
                  fontFamily: '"JetBrains Mono", monospace', 
                  fontWeight: 700, 
                  letterSpacing: '0.12em', 
                  textTransform: 'uppercase', 
                  color: '#00F0FF', 
                  fontSize: '0.75rem' 
                }}>
                  Movilidad &amp; Alto Rendimiento
                </Typography>
              </Box>

              {/* H2 */}
              <Typography component="h2" sx={{
                fontWeight: 900,
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                lineHeight: 1.1,
                color: '#FFFFFF',
                mb: 3,
                letterSpacing: '-0.02em',
              }}>
                Laptops y Portátiles
              </Typography>

              {/* Descripción */}
              <Typography sx={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '1.05rem',
                lineHeight: 1.7,
                mb: 4,
              }}>
                Potencia portátil sin compromisos térmicos. Equipos certificados para ingeniería, modelado 3D, desarrollo de software intensivo y gaming extremo.
              </Typography>

              {/* Chips técnicos */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 5 }}>
                {SPEC_CHIPS.map((chip) => (
                  <Box key={chip} component="span" sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#67E8F9',
                    bgcolor: 'rgba(6,182,212,0.1)',
                    border: '1px solid rgba(0,240,255,0.25)',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '6px',
                    letterSpacing: '0.05em',
                  }}>
                    [{chip}]
                  </Box>
                ))}
              </Box>

              {/* Botón CTA */}
              <Button
                component={RouterLink}
                to="/productos?category=laptops"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  fontWeight: 800,
                  px: 4,
                  py: 1.5,
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
                }}
              >
                Ver Modelos Disponibles
              </Button>
            </AnimatedSection>
          </Grid>

          {/* ══════════════════════════════════════════════════════════════════
              LADO DERECHO — Showcase Visual HD (7 columnas)
          ══════════════════════════════════════════════════════════════════ */}
          <Grid item xs={12} lg={7}>
            <AnimatedSection delay={150}>
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  // Interacción Emil Kowalski
                  transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  '&:hover': {
                    transform: 'translateY(-8px) scale(1.02)',
                    '& img': {
                      filter: 'drop-shadow(0 30px 60px rgba(0,240,255,0.15))',
                    }
                  }
                }}
              >
                <Box
                  component="img"
                  src="/images/laptops-showcase.jpg"
                  alt="Laptops de Alto Rendimiento ZUTECH"
                  sx={{
                    width: '100%',
                    maxWidth: 760,
                    height: 'auto',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.8))',
                    transition: 'filter 0.5s ease',
                  }}
                />
              </Box>
            </AnimatedSection>
          </Grid>

        </Grid>
      </Container>
    </Box>
  );
}
