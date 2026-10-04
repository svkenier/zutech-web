import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import Navbar from '@ui/components/Navbar';
import Footer from '@ui/components/Footer';
import SEO from '@core/media/SEO';
import AnimatedSection from '@ui/components/AnimatedSection';

export default function NotFound() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SEO title="Página no encontrada" description="La página que buscas no existe." />
      <Navbar />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#060D17', // Fondo tech oscuro
          minHeight: { xs: 'calc(100dvh - 57px)', sm: 'calc(100dvh - 65px)' },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow de fondo */}
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '70vw',
          height: '70vw',
          maxWidth: 800,
          maxHeight: 800,
          background: 'radial-gradient(circle, rgba(0, 240, 255, 0.04) 0%, rgba(6, 13, 23, 0) 70%)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        <Container maxWidth="md" sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <AnimatedSection>
            {/* Pieza Gráfica 404 */}
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '7rem', sm: '10rem', md: '12rem' },
                fontWeight: 900,
                background: 'linear-gradient(135deg, #FFFFFF 0%, #00F0FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1,
                mb: 1,
                textShadow: '0 0 45px rgba(0, 240, 255, 0.35)',
                letterSpacing: '-0.04em'
              }}
            >
              404
            </Typography>
            
            <Typography variant="h4" fontWeight={800} color="#FFFFFF" gutterBottom sx={{ letterSpacing: '-0.02em', mb: 2 }}>
              Circuito Desconectado
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.65)', mb: 5, maxWidth: 500, mx: 'auto', fontSize: '1.1rem', lineHeight: 1.6 }}>
              No hemos podido localizar la interfaz que buscas. Es posible que la ruta haya cambiado o esté temporalmente fuera de línea.
            </Typography>
            
            {/* Acciones con micro-interacciones (Emil Kowalski style) */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={RouterLink}
                to="/"
                variant="contained"
                size="large"
                startIcon={<HomeOutlinedIcon />}
                sx={{ 
                  px: 4, py: 1.5, 
                  bgcolor: '#00F0FF',
                  color: '#060D17',
                  fontWeight: 700,
                  borderRadius: '8px',
                  boxShadow: '0 0 15px rgba(0,240,255,0.2)',
                  transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease, background-color 0.25s ease',
                  '&:hover': {
                    bgcolor: '#33F5FF',
                    boxShadow: '0 0 30px rgba(0,240,255,0.4)',
                    transform: 'translateY(-2px)'
                  },
                  '&:active': { transform: 'scale(0.97)' }
                }}
              >
                Volver al Inicio
              </Button>
              <Button
                component={RouterLink}
                to="/productos"
                variant="outlined"
                size="large"
                startIcon={<GridViewOutlinedIcon />}
                sx={{ 
                  px: 4, py: 1.5, 
                  fontWeight: 600,
                  borderRadius: '8px',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  bgcolor: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(10px)',
                  transition: 'transform 0.25s ease, background-color 0.25s ease, border-color 0.25s ease',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                    transform: 'translateY(-2px)'
                  },
                  '&:active': { transform: 'scale(0.97)' }
                }}
              >
                Explorar Catálogo
              </Button>
            </Box>
          </AnimatedSection>
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
