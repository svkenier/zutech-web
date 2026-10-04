import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import { useQuery } from '@tanstack/react-query';
import { get } from '@core/api/client';
import { DEFAULT_SETTINGS, type Settings } from '@core/types/settings';
import { openWhatsApp, getGenericInfoUrl } from '@ui/utils/whatsapp';

export default function FinalCTA() {
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
    <Box
      component="section"
      sx={{
        py: { xs: 8, md: 12 },
        position: 'relative',
        bgcolor: 'background.default',
        borderTop: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(45deg, rgba(0, 240, 255, 0.05) 0%, rgba(0, 102, 255, 0.05) 100%)',
          zIndex: 1,
        },
      }}
    >
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <Typography variant="h2" fontWeight={800} gutterBottom>
          ¿Tu equipo necesita mantenimiento urgente o quieres armar una PC Custom?
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto', fontSize: '1.1rem' }}>
          Contáctanos ahora y recibe asesoría inmediata por parte de nuestros técnicos especializados.
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<WhatsAppIcon />}
          onClick={() => openWhatsApp(getGenericInfoUrl(phone))}
          sx={{
            bgcolor: '#25D366',
            color: '#FFFFFF',
            px: 4,
            py: 1.5,
            fontSize: '1.1rem',
            '&:hover': {
              bgcolor: '#1EBE5D',
              boxShadow: '0 0 20px rgba(37, 211, 102, 0.4)',
            },
          }}
        >
          Contactar por WhatsApp
        </Button>
      </Container>
    </Box>
  );
}
