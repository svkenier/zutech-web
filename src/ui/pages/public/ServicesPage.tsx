/**
 * ServicesPage — Página pública de servicios técnicos de Zutech.
 *
 * Estructura:
 *   1. Hero            — Dolor del usuario, sin CTA duplicado
 *   2. Matriz (4 cards) — Mantenimiento / Reparación / Asesoría / Upgrades
 *   3. Flujo de Taller  — 3 pasos: Recepción → Diagnóstico → Reparación
 *   4. CTA de Respaldo  — Consulta especial no cubierta por los 4 servicios
 *
 * WhatsApp: el número proviene de settings.whatsapp (BD),
 * usando el mismo patrón que ContactSection.tsx.
 * No introduce tokens, dependencias ni rutas nuevas en el sistema.
 *
 * Variante de card: A — Utilitaria (Linear / Notion style).
 */

import { useQuery }               from '@tanstack/react-query';
import Box                        from '@mui/material/Box';
import Container                  from '@mui/material/Container';
import Typography                 from '@mui/material/Typography';
import Button                     from '@mui/material/Button';
import Card                       from '@mui/material/Card';
import CardContent                from '@mui/material/CardContent';
import Grid                       from '@mui/material/Grid2';
import Divider                    from '@mui/material/Divider';
import Stack                      from '@mui/material/Stack';
import Chip                       from '@mui/material/Chip';
import BuildOutlinedIcon          from '@mui/icons-material/BuildOutlined';
import ConstructionOutlinedIcon   from '@mui/icons-material/ConstructionOutlined';
import ShoppingCartOutlinedIcon   from '@mui/icons-material/ShoppingCartOutlined';
import TrendingUpOutlinedIcon     from '@mui/icons-material/TrendingUpOutlined';
import WhatsAppIcon               from '@mui/icons-material/WhatsApp';
import CheckCircleOutlineIcon     from '@mui/icons-material/CheckCircleOutline';
import Navbar                     from '@ui/components/Navbar';
import Footer                     from '@ui/components/Footer';
import AnimatedSection            from '@ui/components/AnimatedSection';
import { get }                    from '@core/api/client';
import { DEFAULT_SETTINGS }       from '@core/types/settings';
import type { Settings }          from '@core/types/settings';
import {
  getServicioMantenimientoUrl,
  getServicioReparacionUrl,
  getServicioAsesoriaUrl,
  getServicioUpgradesUrl,
  getServicioGeneralUrl,
  openWhatsApp,
} from '@ui/utils/whatsapp';

// ─── Datos de los 4 servicios ─────────────────────────────────────────────────

interface ServiceCard {
  icon:    React.ReactNode;
  badge:   string;
  title:   string;
  bullets: string[];
  tiempo:  string;
  getUrl:  (phone: string) => string;
  cta:     string;
}

const SERVICES: ServiceCard[] = [
  {
    icon:   <BuildOutlinedIcon sx={{ fontSize: 28 }} />,
    badge:  'PREVENTIVO',
    title:  'Mantenimiento Pro',
    bullets: [
      'Limpieza profunda con aire comprimido',
      'Aplicación de pasta térmica premium',
      'Diagnóstico bajo estándar ESD',
      'Revisión de temperaturas y voltajes',
    ],
    tiempo: '~2 horas',
    getUrl: getServicioMantenimientoUrl,
    cta:    'Agendar Mantenimiento',
  },
  {
    icon:   <ConstructionOutlinedIcon sx={{ fontSize: 28 }} />,
    badge:  'CORRECTIVO',
    title:  'Reparación y Recuperación',
    bullets: [
      'PC no enciende o pantalla azul (BSOD)',
      'Análisis de placa por esquemático',
      'Reparación de puertos y conectores',
      'Recuperación de datos desde HDD/SSD',
    ],
    tiempo: '24–72 horas',
    getUrl: getServicioReparacionUrl,
    cta:    'Solicitar Diagnóstico',
  },
  {
    icon:   <ShoppingCartOutlinedIcon sx={{ fontSize: 28 }} />,
    badge:  'CONSULTORÍA',
    title:  'Asesoría de Compra',
    bullets: [
      '¿Qué PC armar para tu uso real?',
      'Presupuesto honesto sin inflar stock',
      'Compatibilidad entre componentes',
      'Sesión virtual o presencial disponible',
    ],
    tiempo: 'Sesión 30 min',
    getUrl: getServicioAsesoriaUrl,
    cta:    'Pedir Asesoría',
  },
  {
    icon:   <TrendingUpOutlinedIcon sx={{ fontSize: 28 }} />,
    badge:  'MEJORA',
    title:  'Upgrades y Optimización',
    bullets: [
      'Ampliación de RAM y almacenamiento',
      'Cambio o instalación de GPU',
      'Verificación de compatibilidad previa',
      'Instalación y prueba incluidas',
    ],
    tiempo: '1–3 horas',
    getUrl: getServicioUpgradesUrl,
    cta:    'Ver Opciones de Upgrade',
  },
];

// ─── Pasos del taller ─────────────────────────────────────────────────────────

const PASOS = [
  {
    n:     '01',
    title: 'Recepción',
    desc:  'Trae tu equipo al taller Zutech sin cita previa. Registramos el ingreso y revisamos el estado físico contigo.',
  },
  {
    n:     '02',
    title: 'Diagnóstico',
    desc:  'Realizamos un análisis completo y te enviamos un informe con el presupuesto antes de iniciar cualquier trabajo.',
  },
  {
    n:     '03',
    title: 'Reparación',
    desc:  'Ejecutamos la solución acordada. Retiras tu equipo con garantía escrita y soporte post-servicio directo.',
  },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ServicesPage() {
  const { data: settings } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await get<Settings | {}>('/settings');
      if (Object.keys(res).length === 0) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...res } as Settings;
    },
    initialData: DEFAULT_SETTINGS,
  });

  const phone = settings?.whatsapp || DEFAULT_SETTINGS.whatsapp || '';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <Navbar />

      {/* ── Contenido principal ──────────────────────────────────────────── */}
      <Box component="main" sx={{ bgcolor: 'background.default', flexGrow: 1 }}>

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      {/*
       * Composición de fondo — 3 capas CSS puras (0 assets externos):
       *  1. bgcolor #060D17      → base oscura ZUTECH
       *  2. ::before (grid)      → rejilla de líneas 36 × 36 px rgba blanco 0.04
       *                             textura técnica discreta, sin ruido ni estática
       *  3. ::after  (halo)      → halo radial cyan doble desde arriba (0.28 núcleo)
       *  + borderTop glowing     → borde 1px + inset glow estilo Linear.app
       */}
      <Box
        component="section"
        aria-label="Servicios técnicos Zutech"
        sx={{
          position:   'relative',
          bgcolor:    '#060D17',
          minHeight:  { xs: '44vh', md: '50vh' },
          display:    'flex',
          alignItems: 'center',
          textAlign:  'center',
          py:         { xs: 10, md: 14 },
          overflow:   'hidden',
          // Borde superior glowing — técnica Linear.app
          borderTop:  '1px solid rgba(0, 229, 255, 0.30)',
          boxShadow:  'inset 0 1px 0 rgba(0, 229, 255, 0.22), inset 0 2px 24px rgba(0, 229, 255, 0.06)',

          // Grid técnica limpia — sin ruido SVG ni estática
          '&::before': {
            content:         '""',
            position:        'absolute',
            inset:           0,
            zIndex:          1,
            backgroundImage: [
              'linear-gradient(to right,  rgba(255,255,255,0.04) 1px, transparent 1px)',
              'linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize:  '36px 36px',
            pointerEvents:   'none',
          },

          // Capa 2: Halo radial cyan amplificado + fade inferior armónico
          // Núcleo al 0.28 → perceptible como fuente de luz ambiental real
          // Elipse 90%×70% → cubre más superficie lateral para mayor presencia
          '&::after': {
            content:    '""',
            position:   'absolute',
            inset:      0,
            zIndex:     2,
            background: [
              // Halo principal: núcleo 0.28, desvanece a 0 en 65%
              'radial-gradient(ellipse 90% 70% at 50% -10%, rgba(0, 229, 255, 0.28) 0%, rgba(0, 229, 255, 0.08) 40%, transparent 65%)',
              // Halo secundario más pequeño: punto caliente de mayor intensidad en el centro
              'radial-gradient(ellipse 40% 30% at 50% 0%, rgba(0, 229, 255, 0.15) 0%, transparent 60%)',
              // Fade inferior: transición a blanco para la sección de cards siguiente
              'linear-gradient(to bottom, transparent 50%, rgba(255, 255, 255, 0.07) 100%)',
            ].join(', '),
            pointerEvents: 'none',
          },
        }}
      >
        {/* z-index 3 garantiza que el texto queda sobre las dos capas pseudo */}
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 3 }}>
          <AnimatedSection delay={0}>
            <Typography
              variant="overline"
              sx={{
                color:         'secondary.main',
                letterSpacing: '0.14em',
                fontWeight:    800,
                display:       'block',
                mb:            2,
              }}
            >
              Servicio Técnico Profesional
            </Typography>
          </AnimatedSection>

          <AnimatedSection delay={80}>
            <Typography
              component="h1"
              sx={{
                fontWeight:    900,
                fontSize:      { xs: '2.25rem', sm: '3rem', md: '3.75rem' },
                lineHeight:    1.1,
                letterSpacing: '-0.03em',
                color:         '#FFFFFF',
                mb:            3,
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
                color:      'rgba(255,255,255,0.68)',
                fontSize:   { xs: '1rem', md: '1.1rem' },
                lineHeight: 1.75,
                maxWidth:   520,
                mx:         'auto',
              }}
            >
              Diagnóstico preciso, piezas originales y garantía escrita.
              Selecciona el servicio que necesitas y escríbenos directamente.
            </Typography>
          </AnimatedSection>
        </Container>
      </Box>


      {/* ── 2. MATRIZ DE SERVICIOS ──────────────────────────────────────── */}
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
                      height:        '100%',
                      display:       'flex',
                      flexDirection: 'column',
                      transition:    'transform 250ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 250ms ease, border-color 250ms ease',
                      '&:hover': {
                        transform:   'translateY(-4px)',
                        boxShadow:   '0 16px 48px -12px rgba(10,19,34,0.10)',
                        borderColor: 'rgba(10,19,34,0.18)',
                        '& .svc-icon': { color: 'secondary.main' },
                      },
                    }}
                  >
                    <CardContent
                      sx={{
                        flexGrow:       1,
                        display:        'flex',
                        flexDirection:  'column',
                        p:              3.5,
                        '&:last-child': { pb: 3.5 },
                      }}
                    >
                      {/* Ícono */}
                      <Box
                        className="svc-icon"
                        sx={{
                          color:      'text.secondary',
                          transition: 'color 200ms ease',
                          mb:         1.5,
                        }}
                      >
                        {srv.icon}
                      </Box>

                      {/* Badge overline */}
                      <Typography
                        variant="overline"
                        sx={{
                          color:         'text.disabled',
                          letterSpacing: '0.12em',
                          fontWeight:    700,
                          fontSize:      '0.7rem',
                          mb:            0.5,
                          display:       'block',
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
                      <Stack spacing={0.75} sx={{ mb: 2.5, flexGrow: 1 }}>
                        {srv.bullets.map((b) => (
                          <Box
                            key={b}
                            sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
                          >
                            <Box
                              sx={{
                                width:      5,
                                height:     5,
                                borderRadius: '50%',
                                bgcolor:    'text.disabled',
                                mt:         '7px',
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
                            color:         'text.disabled',
                            fontWeight:    600,
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

                      <Divider sx={{ mb: 2.5 }} />

                      {/* CTA WhatsApp */}
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<WhatsAppIcon />}
                        id={`cta-wa-${srv.badge.toLowerCase()}`}
                        onClick={() => openWhatsApp(srv.getUrl(phone))}
                        sx={{
                          bgcolor:      '#25D366',
                          color:        '#FFFFFF',
                          fontWeight:   700,
                          borderRadius: 1.5,
                          py:           1.1,
                          boxShadow:    'none',
                          transition:   'background-color 200ms ease, transform 200ms ease',
                          '&:hover': {
                            bgcolor:   '#1ebe5a',
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

      {/* ── 3. FLUJO DE TALLER ──────────────────────────────────────────── */}
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
                  color:         'text.disabled',
                  letterSpacing: '0.14em',
                  fontWeight:    700,
                  display:       'block',
                  mb:            1,
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

          {/* Pasos — tarjetas independientes, sin conectores */}
          <Grid container spacing={3} alignItems="stretch">
            {PASOS.map((p, i) => (
              <Grid key={p.n} size={{ xs: 12, md: 4 }}>
                <AnimatedSection delay={i * 120}>
                  <Card
                    sx={{
                      height:  '100%',
                      bgcolor: 'background.default',
                      p:       3.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize:   '2.5rem',
                        fontWeight: 900,
                        lineHeight: 1,
                        color:      'secondary.main',
                        mb:         1.5,
                      }}
                    >
                      {p.n}
                    </Typography>

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
              {[
                'Garantía escrita por servicio',
                'Diagnóstico sin costo previo',
                'Piezas 100% originales',
              ].map((label) => (
                <Chip
                  key={label}
                  icon={<CheckCircleOutlineIcon fontSize="small" />}
                  label={label}
                  variant="outlined"
                  sx={{
                    fontWeight:        600,
                    borderColor:       'divider',
                    color:             'text.secondary',
                    bgcolor:           'background.default',
                    borderRadius:      1,
                    px:                1,
                    '& .MuiChip-icon': { color: 'success.main' },
                  }}
                />
              ))}
            </Stack>
          </AnimatedSection>
        </Container>
      </Box>

      {/* ── 4. CTA DE RESPALDO ──────────────────────────────────────────── */}
      <Box
        component="section"
        sx={{ bgcolor: 'primary.main', py: { xs: 8, md: 10 } }}
      >
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <AnimatedSection>
            <Typography
              variant="h4"
              component="h2"
              sx={{ fontWeight: 800, color: '#FFFFFF', mb: 1.5 }}
            >
              ¿Tu caso es especial?
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color:    'rgba(255,255,255,0.72)',
                mb:       4,
                maxWidth: 480,
                mx:       'auto',
              }}
            >
              Si tu problema no encaja en ninguno de los servicios anteriores,
              descríbelo y te respondemos en minutos.
            </Typography>

            <Button
              variant="contained"
              size="large"
              startIcon={<WhatsAppIcon />}
              id="cta-wa-general"
              onClick={() => openWhatsApp(getServicioGeneralUrl(phone))}
              sx={{
                bgcolor:      '#25D366',
                color:        '#FFFFFF',
                fontWeight:   700,
                px:           4,
                py:           1.5,
                borderRadius: 1.5,
                boxShadow:    'none',
                fontSize:     '1rem',
                transition:   'background-color 200ms ease, transform 200ms ease',
                '&:hover': {
                  bgcolor:   '#1ebe5a',
                  boxShadow: '0 6px 24px rgba(37,211,102,0.35)',
                },
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              Escribir consulta especial
            </Button>
          </AnimatedSection>
        </Container>
      </Box>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      </Box>
      <Footer />

    </Box>
  );
}
