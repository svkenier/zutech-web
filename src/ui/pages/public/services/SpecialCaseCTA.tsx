import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AnimatedSection from '@ui/components/AnimatedSection';
import { getServicioGeneralUrl, openWhatsApp } from '@ui/utils/whatsapp';

interface SpecialCaseCTAProps {
  phone: string;
}

export default function SpecialCaseCTA({ phone }: SpecialCaseCTAProps) {
  return (
    <Box
      component="section"
      sx={{
        bgcolor: 'background.paper', // #F8FAFC — colchón de aire antes del Footer
        py: { xs: 8, md: 10 },
      }}
    >
      <Container maxWidth="lg">
        <AnimatedSection>
          {/* Tarjeta flotante — ancho completo del contenedor lg */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              bgcolor: '#060D17',
              borderRadius: '24px',
              border: '1px solid rgba(0, 229, 255, 0.15)',
              boxShadow:
                '0 24px 60px -20px rgba(10, 19, 34, 0.22), 0 0 0 1px rgba(0, 229, 255, 0.06)',
              px: { xs: 3, sm: 6, md: 8 },
              py: { xs: 5, md: 7 },
              textAlign: 'center',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                background:
                  'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(0, 229, 255, 0.10) 0%, transparent 65%)',
                pointerEvents: 'none',
              },
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              {/* Badge overline */}
              <Typography
                variant="overline"
                sx={{
                  color: 'secondary.main',
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                  display: 'block',
                  mb: 1.5,
                }}
              >
                Consulta Especializada
              </Typography>

              {/* Título */}
              <Typography
                variant="h4"
                component="h2"
                sx={{ fontWeight: 800, color: '#FFFFFF', mb: 1.5 }}
              >
                ¿Tu caso es especial?
              </Typography>

              {/* Subtítulo */}
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255,255,255,0.72)',
                  mb: 4,
                  maxWidth: 520,
                  mx: 'auto',
                  lineHeight: 1.75,
                }}
              >
                Si tu problema no encaja en ninguno de los servicios anteriores,
                descríbelo y te respondemos en minutos.
              </Typography>

              {/* Botón WhatsApp */}
              <Button
                variant="contained"
                size="large"
                startIcon={<WhatsAppIcon />}
                id="cta-wa-general"
                onClick={() => openWhatsApp(getServicioGeneralUrl(phone))}
                sx={{
                  bgcolor: '#25D366',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  px: 4,
                  py: 1.5,
                  borderRadius: 1.5,
                  boxShadow: 'none',
                  fontSize: '1rem',
                  transition:
                    'background-color 200ms ease, transform 200ms ease, box-shadow 200ms ease',
                  '&:hover': {
                    bgcolor: '#1ebe5a',
                    boxShadow: '0 8px 32px rgba(37,211,102,0.40)',
                  },
                  '&:active': { transform: 'scale(0.97)' },
                }}
              >
                Escribir consulta especial
              </Button>
            </Box>
          </Box>
        </AnimatedSection>
      </Container>
    </Box>
  );
}
