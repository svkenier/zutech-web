import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';


export default function BentoGridValueProp() {
  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={3}>
        {/* Main large cell */}
        <Grid item xs={12} md={7}>
          <Card 
            sx={{ 
              height: '100%', 
              minHeight: 320, 
              bgcolor: 'background.paper', 
              p: 4, 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              <Typography variant="overline" color="primary.main" fontWeight={800} letterSpacing="0.1em">
                INFRAESTRUCTURA PROPIA
              </Typography>
              <Typography variant="h3" fontWeight={800} mt={1} mb={2} color="text.primary">
                Laboratorio Técnico Especializado
              </Typography>
              <Typography variant="body1" color="text.secondary" maxWidth={450}>
                No somos solo una tienda. Contamos con un taller equipado con herramientas de precisión para análisis esquemático, microsoldadura y mantenimiento bajo estándares ESD.
              </Typography>
            </Box>
            <Box 
              component="img" 
              src="https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=600&q=80" 
              sx={{ 
                position: 'absolute', 
                right: -50, 
                bottom: -50, 
                width: 350, 
                opacity: 0.15,
                transform: 'rotate(-5deg)'
              }}
              alt="Laboratorio"
            />
          </Card>
        </Grid>

        {/* Micro-comparative cell */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%', bgcolor: 'background.paper', p: 4, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight={800} mb={3} color="text.primary">
              Estándar ZUTECH vs Taller Convencional
            </Typography>
            
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <CheckCircleOutlineIcon color="secondary" fontSize="small" sx={{ mt: 0.3 }} />
                <Box>
                  <Typography variant="body2" fontWeight={700} color="text.primary">Análisis de Placa Base por Esquemático</Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ textDecoration: 'line-through' }}>Diagnósticos superficiales "al ojo"</Typography>
                </Box>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <CheckCircleOutlineIcon color="secondary" fontSize="small" sx={{ mt: 0.3 }} />
                <Box>
                  <Typography variant="body2" fontWeight={700} color="text.primary">Mantenimiento con Pastas Térmicas Premium</Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ textDecoration: 'line-through' }}>Pastas genéricas de baja conductividad</Typography>
                </Box>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <CheckCircleOutlineIcon color="secondary" fontSize="small" sx={{ mt: 0.3 }} />
                <Box>
                  <Typography variant="body2" fontWeight={700} color="text.primary">Entorno de Trabajo Antiestático (ESD)</Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ textDecoration: 'line-through' }}>Manejo inseguro que daña componentes</Typography>
                </Box>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Bottom horizontal cell */}
        <Grid item xs={12}>
          <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 3 }}>
            <Box>
              <Typography variant="h5" fontWeight={800}>Garantía Real y Soporte Directo</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }} mt={1} maxWidth={600}>
                Todas nuestras piezas y ensambles cuentan con trazabilidad y soporte técnico directo en nuestro laboratorio, sin intermediarios ni demoras injustificadas.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Box>
                <Typography variant="h3" fontWeight={900} sx={{ fontFamily: 'monospace' }}>48h</Typography>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 }}>Tiempo diag.</Typography>
              </Box>
              <Box>
                <Typography variant="h3" fontWeight={900} sx={{ fontFamily: 'monospace' }}>+500</Typography>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 }}>Equipos recup.</Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
