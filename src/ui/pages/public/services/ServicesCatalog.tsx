import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid2';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AnimatedSection from '@ui/components/AnimatedSection';
import { openWhatsApp } from '@ui/utils/whatsapp';
import { SERVICES } from './servicesData';

interface ServicesCatalogProps {
  phone: string;
}

export default function ServicesCatalog({ phone }: ServicesCatalogProps) {
  return (
    <Box
      component="section"
      aria-label="Catálogo de servicios"
      sx={{ bgcolor: 'background.default', py: { xs: 8, md: 12 } }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          {SERVICES.map((srv, i) => (
            <Grid key={srv.badge} size={{ xs: 12, sm: 6 }}>
              <AnimatedSection delay={i * 80} threshold={0.08}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition:
                      'transform 250ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 250ms ease, border-color 250ms ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 16px 48px -12px rgba(10,19,34,0.10)',
                      borderColor: 'rgba(10,19,34,0.18)',
                      '& .svc-icon': { color: 'secondary.main' },
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      flexGrow: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      p: 3,
                      '&:last-child': { pb: 3 },
                    }}
                  >
                    {/* Ícono */}
                    <Box
                      className="svc-icon"
                      sx={{
                        color: 'text.secondary',
                        transition: 'color 200ms ease',
                        mb: 1.5,
                      }}
                    >
                      {srv.icon}
                    </Box>

                    {/* Badge overline */}
                    <Typography
                      variant="overline"
                      sx={{
                        color: 'text.disabled',
                        letterSpacing: '0.12em',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        mb: 0.5,
                        display: 'block',
                      }}
                    >
                      {srv.badge}
                    </Typography>

                    {/* Título */}
                    <Typography
                      variant="h5"
                      component="h2"
                      sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}
                    >
                      {srv.title}
                    </Typography>

                    {/* Viñetas */}
                    <Stack spacing={0.75} sx={{ mb: 2, flexGrow: 1 }}>
                      {srv.bullets.map((b) => (
                        <Box
                          key={b}
                          sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
                        >
                          <Box
                            sx={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              bgcolor: 'text.disabled',
                              mt: '7px',
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{ color: 'text.secondary', lineHeight: 1.55 }}
                          >
                            {b}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>

                    {/* Tiempo estimado */}
                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.disabled',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        Tiempo estimado:&nbsp;
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', fontWeight: 500 }}
                      >
                        {srv.tiempo}
                      </Typography>
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    {/* CTA WhatsApp */}
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<WhatsAppIcon />}
                      id={`cta-wa-${srv.badge.toLowerCase()}`}
                      onClick={() => openWhatsApp(srv.getUrl(phone))}
                      sx={{
                        bgcolor: '#25D366',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        borderRadius: 1.5,
                        py: 1.1,
                        boxShadow: 'none',
                        transition:
                          'background-color 200ms ease, transform 200ms ease',
                        '&:hover': {
                          bgcolor: '#1ebe5a',
                          boxShadow: '0 4px 16px rgba(37,211,102,0.30)',
                        },
                        '&:active': { transform: 'scale(0.97)' },
                      }}
                    >
                      {srv.cta}
                    </Button>
                  </CardContent>
                </Card>
              </AnimatedSection>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
