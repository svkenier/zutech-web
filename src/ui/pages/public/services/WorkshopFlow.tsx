import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AnimatedSection from '@ui/components/AnimatedSection';
import { WORKSHOP_STEPS, TRUST_BADGES } from './servicesData';

export default function WorkshopFlow() {
  return (
    <Box
      component="section"
      aria-label="Proceso de trabajo en el taller"
      sx={{ bgcolor: 'background.paper', py: { xs: 8, md: 12 } }}
    >
      <Container maxWidth="lg">
        {/* Cabecera */}
        <AnimatedSection>
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
            <Typography
              variant="overline"
              sx={{
                color: 'text.disabled',
                letterSpacing: '0.14em',
                fontWeight: 700,
                display: 'block',
                mb: 1,
              }}
            >
              Proceso de Trabajo
            </Typography>
            <Typography
              variant="h3"
              component="h2"
              sx={{ fontWeight: 800, color: 'text.primary' }}
            >
              Simple y transparente
            </Typography>
          </Box>
        </AnimatedSection>

        {/* Pasos — Alt. 1: Pill técnico + microinteracción Linear-style */}
        <Grid container spacing={3} alignItems="stretch">
          {WORKSHOP_STEPS.map((p, i) => (
            <Grid key={p.num} size={{ xs: 12, md: 4 }}>
              <AnimatedSection delay={i * 120}>
                <Card
                  sx={{
                    height: '100%',
                    bgcolor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 3, // 12px via theme (1 unit = 4px)
                    p: 3.5,
                    boxShadow: 'none',
                    transition:
                      'transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px -8px rgba(10, 19, 34, 0.08)',
                      borderColor: '#CBD5E1',
                      '& .step-pill': {
                        bgcolor: 'rgba(0, 229, 255, 0.14)',
                        borderColor: 'rgba(0, 229, 255, 0.38)',
                      },
                    },
                  }}
                >
                  {/* Pill técnico del número de paso */}
                  <Box
                    className="step-pill"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 52,
                      height: 52,
                      borderRadius: '10px',
                      bgcolor: 'rgba(0, 229, 255, 0.07)',
                      border: '1px solid rgba(0, 229, 255, 0.20)',
                      mb: 2,
                      transition:
                        'background-color 220ms ease, border-color 220ms ease',
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        lineHeight: 1,
                        color: 'secondary.main',
                      }}
                    >
                      {p.num}
                    </Typography>
                  </Box>

                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}
                  >
                    {p.title}
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{ color: '#334155', lineHeight: 1.7 }}
                  >
                    {p.desc}
                  </Typography>
                </Card>
              </AnimatedSection>
            </Grid>
          ))}
        </Grid>

        {/* Banda de confianza */}
        <AnimatedSection delay={80} sx={{ mt: 6 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
            flexWrap="wrap"
          >
            {TRUST_BADGES.map((label) => (
              <Chip
                key={label}
                icon={<CheckCircleOutlineIcon fontSize="small" />}
                label={label}
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  borderColor: 'divider',
                  color: 'text.secondary',
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  px: 1,
                  '& .MuiChip-icon': { color: 'success.main' },
                }}
              />
            ))}
          </Stack>
        </AnimatedSection>
      </Container>
    </Box>
  );
}
