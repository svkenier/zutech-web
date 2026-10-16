import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import AnimatedSection from '@ui/components/AnimatedSection';

export default function ServicesHero() {
  return (
    <Box
      component="section"
      aria-label="Servicios técnicos Zutech"
      sx={{
        position: 'relative',
        bgcolor: '#060D17',
        minHeight: { xs: '44vh', md: '50vh' },
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        py: { xs: 10, md: 14 },
        overflow: 'hidden',
        borderTop: '1px solid rgba(0, 229, 255, 0.30)',
        boxShadow: 'inset 0 1px 0 rgba(0, 229, 255, 0.22), inset 0 2px 24px rgba(0, 229, 255, 0.06)',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backgroundImage: [
            'linear-gradient(to right,  rgba(255,255,255,0.04) 1px, transparent 1px)',
            'linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '36px 36px',
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          background: [
            'radial-gradient(ellipse 90% 70% at 50% -10%, rgba(0, 229, 255, 0.28) 0%, rgba(0, 229, 255, 0.08) 40%, transparent 65%)',
            'radial-gradient(ellipse 40% 30% at 50% 0%, rgba(0, 229, 255, 0.15) 0%, transparent 60%)',
            'linear-gradient(to bottom, transparent 50%, rgba(255, 255, 255, 0.07) 100%)',
          ].join(', '),
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 3 }}>
        <AnimatedSection delay={0}>
          <Typography
            variant="overline"
            sx={{
              color: 'secondary.main',
              letterSpacing: '0.14em',
              fontWeight: 800,
              display: 'block',
              mb: 2,
            }}
          >
            Servicio Técnico Profesional
          </Typography>
        </AnimatedSection>

        <AnimatedSection delay={80}>
          <Typography
            component="h1"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '2.25rem', sm: '3rem', md: '3.75rem' },
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#FFFFFF',
              mb: 3,
            }}
          >
            Tu PC falla.{' '}
            <Box component="span" sx={{ color: '#00E5FF' }}>
              Nosotros la resolvemos.
            </Box>
          </Typography>
        </AnimatedSection>

        <AnimatedSection delay={160}>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.68)',
              fontSize: { xs: '1rem', md: '1.1rem' },
              lineHeight: 1.75,
              maxWidth: 520,
              mx: 'auto',
            }}
          >
            Diagnóstico preciso, piezas originales y garantía escrita.
            Selecciona el servicio que necesitas y escríbenos directamente.
          </Typography>
        </AnimatedSection>
      </Container>
    </Box>
  );
}
