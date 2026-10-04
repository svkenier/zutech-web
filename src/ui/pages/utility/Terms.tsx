/**
 * Terms — Términos y Condiciones (/terminos).
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
import GavelIcon from '@mui/icons-material/Gavel';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { alpha } from '@mui/material/styles';

import Navbar from '@ui/components/Navbar';
import Footer from '@ui/components/Footer';
import AnimatedSection from '@ui/components/AnimatedSection';
import SEO from '@core/media/SEO';

const SECTIONS = [
  {
    id: 'identidad',
    title: 'Identidad y Naturaleza del Servicio',
    summary: 'Zutech es un comercio legalmente establecido en Maracaibo. Toda transacción debe hacerse por canales oficiales.',
    body: (
      <>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8} paragraph>
          Zutech opera en Maracaibo, Venezuela, como una tienda especializada en hardware, venta de componentes tecnológicos y laboratorio de servicio técnico. Nuestra razón comercial se encuentra debidamente registrada y opera bajo su respectivo RIF, con sede física ubicada en la dirección publicada en el mapa interactivo de nuestro portal.
        </Typography>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8} paragraph>
          Esta plataforma web actúa exclusivamente como un catálogo interactivo y un organizador de pedidos previos. La confirmación final de stock, condiciones comerciales y cotizaciones definitivas siempre se concretarán mediante la atención personalizada de un asesor vía WhatsApp.
        </Typography>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
          <strong>Canales Oficiales y Deslinde:</strong> Nuestras únicas vías de atención, soporte y ventas son los números telefónicos, enlaces de WhatsApp y redes sociales (Instagram, Facebook y X) publicados de forma visible en esta web. Zutech se deslinda explícitamente de cualquier responsabilidad por transacciones, pagos o acuerdos intentados a través de números, cuentas o canales ajenos a los listados en nuestra configuración oficial.
        </Typography>
      </>
    ),
  },
  {
    id: 'pedidos',
    title: 'Pedidos, Notas de Entrega y Entregas',
    summary: 'Los pedidos web generan una nota de entrega interna. Los precios pueden variar.',
    body: (
      <>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8} paragraph>
          <strong>Naturaleza de los Comprobantes:</strong> Las notas o resúmenes de pedido generados por esta plataforma tienen carácter de <em>notas de entrega y constancias internas de registro de pago</em>, cuyo propósito es el control operativo y la garantía entre las partes. La emisión de documentación tributaria formal se coordina y gestiona directamente con la administración de Zutech al momento de liquidar la compra en tienda o por WhatsApp.
        </Typography>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8} paragraph>
          Toda orden generada a través del carrito de compras web está sujeta a validación de inventario. Zutech se reserva el derecho de modificar los precios publicados sin previo aviso debido a la naturaleza volátil del mercado de componentes. En caso de discrepancia, el asesor le informará el precio real antes de concretar la transacción.
        </Typography>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
          <strong>Modalidades de Entrega:</strong> Los pedidos pueden retirarse directamente en nuestra tienda física (Pick up). Adicionalmente, ofrecemos un servicio de Delivery externo. Zutech no captura ni almacena direcciones de domicilio en la base de datos de esta web; cualquier coordinación logística para entregas a domicilio se realiza estrictamente por WhatsApp, asumiendo el cliente el costo asociado al transporte.
        </Typography>
      </>
    ),
  },
  {
    id: 'pagos',
    title: 'Instrumentos de Pago',
    summary: 'No guardamos ni procesamos tarjetas de crédito en esta web. Pagos manuales.',
    body: (
      <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
        Nuestra plataforma web no procesa, no transita y no almacena información de tarjetas de crédito o instrumentos bancarios confidenciales. Las pasarelas listadas en el carrito (Pago Móvil, Transferencias Bancarias, Efectivo, Zelle, Binance Pay) son únicamente opciones de preferencia para preorganizar su pedido. Toda liquidación de fondos debe realizarse de forma manual y externa, validándose contra el envío del comprobante de pago a través de nuestros canales oficiales de atención por WhatsApp.
      </Typography>
    ),
  },
  {
    id: 'garantias',
    title: 'Políticas de Garantía de Hardware',
    summary: 'La garantía cubre defectos de fábrica, pero se anula por daños físicos, humedad o fallas eléctricas.',
    body: (
      <>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8} paragraph>
          Las piezas nuevas cuentan con el periodo de garantía especificado en su factura original. Los componentes reacondicionados o usados tienen una garantía limitada acordada al momento de la compra. Para hacer valer cualquier garantía, es estrictamente obligatorio presentar la nota de entrega o factura fiscal junto con los empaques originales del producto.
        </Typography>
        <Typography variant="body2" color="text.primary" fontWeight={700} gutterBottom mt={2}>
          Causales de anulación inmediata de la garantía:
        </Typography>
        <Box component="ul" sx={{ pl: 0, m: 0, listStyle: 'none', '& li': { mb: 1, display: 'flex', gap: 1.5, alignItems: 'flex-start' } }}>
          <Typography component="li" variant="body2" color="text.secondary" lineHeight={1.6}>
            <CheckCircleOutlinedIcon sx={{ color: 'secondary.main', fontSize: '1.1rem', mt: 0.3 }} />
            <span>Daños físicos visibles (golpes, fisuras, rayones profundos).</span>
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary" lineHeight={1.6}>
            <CheckCircleOutlinedIcon sx={{ color: 'secondary.main', fontSize: '1.1rem', mt: 0.3 }} />
            <span>Presencia de humedad, oxidación, líquidos o insectos en el interior de los componentes.</span>
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary" lineHeight={1.6}>
            <CheckCircleOutlinedIcon sx={{ color: 'secondary.main', fontSize: '1.1rem', mt: 0.3 }} />
            <span>Pines doblados o rotos en procesadores y tarjetas madre.</span>
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary" lineHeight={1.6}>
            <CheckCircleOutlinedIcon sx={{ color: 'secondary.main', fontSize: '1.1rem', mt: 0.3 }} />
            <span>Sellos de seguridad violentados, despegados o manipulados.</span>
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary" lineHeight={1.6}>
            <CheckCircleOutlinedIcon sx={{ color: 'secondary.main', fontSize: '1.1rem', mt: 0.3 }} />
            <span>Modificaciones no autorizadas, manipulación indebida de BIOS, overclocking extremo o uso de piezas para minería de criptomonedas (salvo equipos específicos).</span>
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary" lineHeight={1.6}>
            <CheckCircleOutlinedIcon sx={{ color: 'secondary.main', fontSize: '1.1rem', mt: 0.3 }} />
            <span>Fallas originadas por fluctuaciones eléctricas, picos de voltaje, cortocircuitos externos o descargas atmosféricas (apagones).</span>
          </Typography>
        </Box>
      </>
    ),
  },
  {
    id: 'taller',
    title: 'Políticas del Taller y Reparación',
    summary: 'Riesgos asumidos en diagnóstico. Equipos no retirados tras 45 días se consideran abandonados.',
    body: (
      <>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8} paragraph>
          <strong>Diagnóstico y Consentimiento:</strong> Al ingresar un equipo a nuestro laboratorio, el cliente autoriza su revisión y desarme parcial o total, entendiendo los riesgos técnicos inherentes a la manipulación de componentes electrónicos con fallas previas, fatiga de soldaduras o desgaste térmico, los cuales podrían dejar de encender de forma irreversible durante las pruebas de diagnóstico rutinarias sin responsabilidad punitiva para Zutech.
        </Typography>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
          <strong>Abandono de Equipos:</strong> Zutech notificará al cliente una vez el equipo esté reparado o diagnosticado (sea reparable o no). Todo equipo que permanezca en nuestro taller por más de <strong>45 días continuos</strong> posteriores a la notificación de retiro, sin ser retirado ni cancelado el importe correspondiente, será considerado en abandono legal. A partir de ese plazo, Zutech podrá disponer de las piezas o el equipo para resarcir los costos operativos de revisión, almacenaje y custodia, perdiendo el cliente todo derecho a reclamo o indemnización.
        </Typography>
      </>
    ),
  },
];

export default function Terms() {
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
      <SEO title="Términos y Condiciones del Servicio" description="Términos y condiciones comerciales, políticas de garantía y servicios de Zutech." noIndex />
      <Navbar />

      {/* Encabezado */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', py: { xs: 5, md: 7 } }}>
        <Container maxWidth="lg">
          <AnimatedSection>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <GavelIcon sx={{ fontSize: '2.2rem', color: 'secondary.main' }} />
              <Typography variant="overline" color="secondary" fontWeight={700} letterSpacing="0.12em">
                Legal y Comercial
              </Typography>
            </Box>
            <Typography variant="h2" fontWeight={800} mb={2}>
              Términos y Condiciones
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
