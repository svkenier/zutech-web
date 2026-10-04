/**
 * Privacy — Políticas de Privacidad (/privacidad).
 * Diseño de dos columnas con navegación sticky y tarjetas temáticas.
 */

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ShieldIcon from '@mui/icons-material/Shield';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { alpha } from '@mui/material/styles';

import Navbar from '@ui/components/Navbar';
import Footer from '@ui/components/Footer';
import AnimatedSection from '@ui/components/AnimatedSection';
import SEO from '@core/media/SEO';

const SECTIONS = [
  {
    id: 'no-recopilamos',
    title: 'Lo que NO recopilamos',
    summary: 'Cero datos financieros ni seguimiento publicitario. Tu privacidad es prioritaria.',
    body: (
      <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
        Zutech tiene un compromiso irrenunciable con la privacidad de sus usuarios. Declaramos expresamente que esta plataforma <strong>NO solicita, no recopila y no almacena</strong> números de tarjetas de crédito, instrumentos financieros confidenciales, ni direcciones físicas de domicilio. Además, nuestro sitio web está libre de cookies de rastreo publicitario de terceros (como píxeles de marketing intrusivos), garantizando que su navegación no sea monetizada ni compartida con agencias de publicidad.
      </Typography>
    ),
  },
  {
    id: 'si-recopilamos',
    title: 'Datos que SÍ recopilamos y su Finalidad',
    summary: 'Solo guardamos nombre y teléfono para procesar tu nota de entrega y contactarte.',
    body: (
      <>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8} paragraph>
          Al procesar una solicitud a través de nuestro carrito de compras, el sistema requiere y almacena temporalmente únicamente dos datos personales: su <strong>Nombre completo</strong> y su <strong>Número de teléfono</strong>, los cuales son suministrados de manera voluntaria.
        </Typography>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
          <strong>Privacidad en Comprobantes:</strong> Reiteramos que en las notas de entrega y órdenes emitidas por el sistema <em>solo constan el nombre y número telefónico</em>. No exigimos ni registramos direcciones domiciliarias ni instrumentos bancarios en la base de datos web. Estos dos únicos datos tienen como finalidad exclusiva vincular internamente los productos seleccionados con el cliente para brindarle asistencia y coordinar logísticas de entrega a través de WhatsApp.
        </Typography>
      </>
    ),
  },
  {
    id: 'almacenamiento-local',
    title: 'Almacenamiento Local y Accesos de Staff',
    summary: 'Usamos almacenamiento técnico solo para guardar tu carrito y mantener la sesión del staff de Zutech.',
    body: (
      <>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8} paragraph>
          Nuestra aplicación utiliza tecnologías de almacenamiento local del navegador (<em>localStorage</em>) de forma puramente técnica y funcional. Utilizamos una clave (<code>zutech_cart</code>) para memorizar los identificadores de los productos que agrega a su carrito, evitando que pierda su progreso al recargar la página.
        </Typography>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
          <strong>Acceso Administrativo Básico:</strong> El sistema retiene tokens de sesión (<code>session_user</code>) de uso exclusivo para el personal administrativo y técnico de Zutech. Las credenciales de acceso del staff (usuario y contraseña) se procesan con el fin único de autenticar el acceso seguro al panel administrativo para gestionar nuestro catálogo y configuraciones, sin involucrar ningún tipo de rastreo de actividad externa.
        </Typography>
      </>
    ),
  },
  {
    id: 'terceros',
    title: 'Interacción con Plataformas de Terceros (WhatsApp)',
    summary: 'Toda nuestra comunicación transita bajo el cifrado y las políticas de WhatsApp (Meta).',
    body: (
      <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
        Debido a nuestro modelo de atención personalizada, la culminación de compras, cotizaciones y la coordinación de envíos se canalizan a través de mensajería instantánea. Al hacer clic en los botones de "Hacer Pedido" o solicitar servicios técnicos, usted será redirigido a WhatsApp, plataforma propiedad de Meta Platforms, Inc. A partir de ese momento, la comunicación, transferencia de imágenes o envíos de ubicaciones (para delivery) quedan sujetos al cifrado punto a punto y a los Términos de Servicio y Políticas de Privacidad independientes de dicha plataforma. Zutech no extrae ni almacena masivamente las conversaciones de este canal.
      </Typography>
    ),
  },
  {
    id: 'derechos',
    title: 'Control y Derechos sobre tus Datos',
    summary: 'Puedes solicitar la eliminación de tu contacto de nuestro sistema en cualquier momento.',
    body: (
      <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
        Usted posee el control absoluto sobre los datos de contacto suministrados. Si en algún momento desea ejercer su derecho a la rectificación, actualización o eliminación definitiva de su nombre y número telefónico del historial interno de órdenes de Zutech, simplemente debe solicitarlo enviando un mensaje directo a nuestras líneas de soporte por WhatsApp. Su petición será procesada y sus registros anonimizados en un lapso no mayor a 72 horas hábiles.
      </Typography>
    ),
  },
  {
    id: 'datos-comercio',
    title: 'Datos Públicos del Comercio',
    summary: 'La información de contacto de Zutech publicada en la web es de carácter público y transparente.',
    body: (
      <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
        Documentamos de forma transparente que los datos registrados en el módulo de configuración del sistema (Nombre de la tienda, RIF, número de teléfono comercial, WhatsApp, correo de atención, dirección física para la geolocalización en el mapa y los enlaces a nuestras redes sociales oficiales) tienen carácter de <strong>información pública de contacto</strong>. Su propósito exclusivo es visibilizar la tienda física, permitir una interacción directa, transparente y legal con nuestros clientes, y servir como encabezado oficial en las notas de entrega y comprobantes de pedido generados.
      </Typography>
    ),
  },
];

export default function Privacy() {
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        root: null,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      }
    );

    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SEO title="Políticas de Privacidad y Tratamiento de Datos" description="Normativas de privacidad, protección de datos y uso de cookies de Zutech." noIndex />
      <Navbar />

      {/* Encabezado */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', py: { xs: 5, md: 7 } }}>
        <Container maxWidth="lg">
          <AnimatedSection>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <ShieldIcon sx={{ fontSize: '2.2rem', color: 'secondary.main' }} />
              <Typography variant="overline" color="secondary" fontWeight={700} letterSpacing="0.12em">
                Tratamiento de Datos
              </Typography>
            </Box>
            <Typography variant="h2" fontWeight={800} mb={2}>
              Políticas de Privacidad
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Última actualización: {new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          </AnimatedSection>
        </Container>
      </Box>

      {/* Contenido principal en 2 columnas */}
      <Box sx={{ py: { xs: 5, md: 8 }, bgcolor: 'background.default', flexGrow: 1 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 4, md: 6 } }}>
            
            {/* Columna Izquierda: Sticky Navigation */}
            <Box sx={{ width: { xs: '100%', md: '280px' }, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
              <Box sx={{ position: 'sticky', top: 100 }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 2, px: 2 }}>
                  CONTENIDO
                </Typography>
                <List disablePadding>
                  {SECTIONS.map((s) => {
                    const isActive = activeSection === s.id;
                    return (
                      <ListItem key={s.id} disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton 
                          onClick={() => scrollToSection(s.id)}
                          sx={{ 
                            borderRadius: 1.5,
                            bgcolor: isActive ? (theme) => alpha(theme.palette.secondary.main, 0.14) : 'transparent',
                            color: isActive ? 'secondary.main' : 'text.secondary',
                            borderLeft: isActive ? '3px solid' : '3px solid transparent',
                            borderColor: isActive ? 'secondary.main' : 'transparent',
                            '&:hover': {
                              bgcolor: (theme) => alpha(theme.palette.secondary.main, isActive ? 0.14 : 0.05),
                            }
                          }}
                        >
                          <ListItemText 
                            primary={s.title} 
                            primaryTypographyProps={{ 
                              variant: 'body2', 
                              fontWeight: isActive ? 700 : 500,
                              lineHeight: 1.3
                            }} 
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            </Box>

            {/* Columna Derecha: Tarjetas de Contenido */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              {SECTIONS.map((s, i) => (
                <AnimatedSection key={s.id} delay={i * 40}>
                  <Box id={s.id} sx={{ mb: { xs: 4, md: 5 }, scrollMarginTop: '110px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, px: { xs: 1, sm: 0 } }}>
                      <Box sx={{ 
                        bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.15),
                        border: (theme) => `1px solid ${alpha(theme.palette.secondary.main, 0.35)}`,
                        color: 'secondary.main',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        flexShrink: 0
                      }}>
                        {String(i + 1).padStart(2, '0')}
                      </Box>
                      <Typography variant="h5" component="h2" fontWeight={800} color="text.primary">
                        {s.title}
                      </Typography>
                    </Box>
                    <Card sx={{ border: '1px solid', borderColor: (theme) => alpha(theme.palette.secondary.main, 0.18), borderRadius: 3, boxShadow: 'none' }}>
                      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                        
                        {/* Summary Box */}
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: 1.5, 
                            p: 2, 
                            mb: 3, 
                            bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.08), 
                            borderRadius: 2,
                            borderLeft: '4px solid',
                            borderColor: 'secondary.main',
                          }}
                        >
                          <InfoOutlinedIcon sx={{ color: 'secondary.main', fontSize: '1.25rem', mt: 0.2 }} />
                          <Typography variant="body2" color="text.primary">
                            <Box component="strong" sx={{ color: 'secondary.main', fontWeight: 700 }}>En resumen: </Box>{s.summary}
                          </Typography>
                        </Box>

                        {/* Full Body */}
                        {s.body}
                      </CardContent>
                    </Card>
                  </Box>
                </AnimatedSection>
              ))}
            </Box>
            
          </Box>
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
