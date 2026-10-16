/**
 * ServicesPage — Página pública de servicios técnicos de Zutech.
 * Orquestador desacoplado en submódulos atómicos.
 */

import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Navbar from '@ui/components/Navbar';
import Footer from '@ui/components/Footer';
import SEO from '@core/media/SEO';
import { get } from '@core/api/client';
import { DEFAULT_SETTINGS } from '@core/types/settings';
import type { Settings } from '@core/types/settings';

import ServicesHero from './services/ServicesHero';
import ServicesCatalog from './services/ServicesCatalog';
import WorkshopFlow from './services/WorkshopFlow';
import SpecialCaseCTA from './services/SpecialCaseCTA';

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
      <SEO
        title="Servicio Técnico y Reparación de Computadoras · Zutech"
        description="Diagnóstico preciso, piezas originales y garantía escrita. Mantenimiento, reparación y asesoría para tu PC."
      />

      <Navbar />

      <Box component="main" sx={{ bgcolor: 'background.default', flexGrow: 1 }}>
        <ServicesHero />
        <ServicesCatalog phone={phone} />
        <WorkshopFlow />
        <SpecialCaseCTA phone={phone} />
      </Box>

      <Footer />
    </Box>
  );
}
