/**
 * Configuración de Plantillas de WhatsApp (Capa de Negocio)
 * 
 * Este archivo centraliza todos los mensajes y textos estáticos que se envían por WhatsApp.
 * Esta arquitectura es completamente agnóstica: si decides adaptar este template para otro tipo 
 * de negocio (ej. catálogo de productos, servicios inmobiliarios, tienda online, etc.),
 * este es el ÚNICO archivo que debes modificar para cambiar los textos de los botones de contacto.
 * 
 * Uso de Variables Dinámicas:
 * El motor de WhatsApp es 100% flexible y no tiene variables restringidas o listas estáticas.
 * Puedes insertar CUALQUIER variable dinámica en tus textos envolviéndola en llaves (ej. `{title}`, `{price}`, `{location}`).
 * Al llamar a la función constructora en la UI, simplemente pasas un objeto con esas llaves y el motor del core 
 * se encargará de reemplazarlas automáticamente mediante expresiones regulares antes de generar el enlace.
 */

export const WHATSAPP_TEMPLATES = {
  /**
   * Plantilla principal para solicitar información sobre un elemento específico del catálogo (producto, servicio, registro).
   * Variables de ejemplo usadas aquí: {title}, {id}, {fichaUrl}.
   * Puedes agregar {price} u otras si lo deseas.
   */
  item: 
`¡Hola! Me interesa obtener información sobre *{title}* (ID: {id}).

Vi su ficha aquí: {fichaUrl}

¿Podrían darme más detalles al respecto?`,

  /**
   * Plantilla para pedir información general o contacto genérico.
   */
  generic: 
`Hola ZUTECH, me gustaría obtener más información sobre sus productos y servicios.`,

  /**
   * Plantilla para reportes de casos urgentes, soporte técnico o incidencias.
   */
  emergency: 
`¡Hola! *Reporte de Emergencia / Soporte Urgente*

Tengo una situación que necesita atención inmediata.
Ubicación/Detalles: [Enviaré más detalles a continuación por este chat]

¿Podrían indicarme cómo proceder o si pueden asistir?`,

  /**
   * Plantilla para coordinación de ventas corporativas, alianzas estratégicas o patrocinios.
   */
  donation: 
`¡Hola! Quisiera ofrecer una propuesta comercial o de apoyo.

Me gustaría recibir información sobre:
- Alianzas estratégicas
- Aportes o patrocinios
- Programas especiales

¿Cómo podemos coordinar una reunión?`,

  /**
   * Plantilla para reclutamiento, bolsa de empleo o postulaciones al equipo.
   */
  volunteer: 
`¡Hola! Me gustaría postularme para colaborar y formar parte de su equipo.

¿Cuáles son los requisitos o cómo puedo enviar mis credenciales?`,

  // ─── Enlaces de Footer ───────────────────────────────────────────────────────
  footer_soporte: `Hola ZUTECH, necesito comunicarme con el área de soporte técnico.`,
  footer_ventas: `Hola ZUTECH, tengo una duda sobre un producto de la tienda.`,
  footer_estado: `Hola, quiero consultar el estado de mi pedido.`,

  // ─── Servicios Técnicos Zutech ─────────────────────────────────────────────

  /**
   * Plantilla para agendar un mantenimiento preventivo de PC en el taller.
   */
  service_mantenimiento:
`Hola ZUTECH, me gustaría agendar un mantenimiento preventivo para mi equipo (limpieza/pasta térmica). ¿Qué disponibilidad tienen?`,

  /**
   * Plantilla para solicitar diagnóstico y reparación de PC.
   */
  service_reparacion:
`Hola ZUTECH, necesito una revisión para mi computadora.
*Falla:* [Describe brevemente qué le ocurre]
¿Cuándo podría llevarla para un diagnóstico?`,

  /**
   * Plantilla para solicitar asesoría de compra / armado de equipo.
   */
  service_asesoria:
`Hola ZUTECH, quiero armar o mejorar mi PC. Me gustaría recibir asesoría sobre componentes compatibles y presupuesto.`,

  /**
   * Plantilla para coordinar un upgrade de hardware (RAM, SSD, GPU, etc.).
   */
  service_upgrades:
`Hola ZUTECH, quiero armar o mejorar mi PC. Me gustaría recibir asesoría sobre componentes compatibles y presupuesto.`,

  /**
   * Plantilla para Instalación de Software / Sistema
   */
  service_software:
`Hola ZUTECH, necesito asistencia con la instalación de sistema operativo o programas en mi equipo.`,

  /**
   * Plantilla para Soporte a Empresas / Redes
   */
  service_empresas:
`Hola ZUTECH, requiero soporte técnico para la infraestructura o equipos de mi oficina/negocio.`,

  /**
   * Plantilla para consultas técnicas especiales no cubiertas por los 4 servicios principales.
   */
  service_general:
`Hola ZUTECH, requiero soporte técnico para la infraestructura o equipos de mi oficina/negocio.`,

  /**
   * Plantilla para notificar un nuevo pedido realizado desde el carrito de compras.
   */
  checkout:
`*NUEVO PEDIDO ZUTECH*
*REFERENCIA:* {orderId}
--------------------------------
*Cliente:* {name}
*Teléfono:* {phone}
*Modalidad:* {deliveryMethod}
*Pago:* {paymentMethod}
--------------------------------
*PRODUCTOS:*
{items}
--------------------------------
*TOTAL:* \${total}
--------------------------------
{deliveryInstructions}
{paymentInstructions}`

} as const;

export type WhatsAppAction = keyof typeof WHATSAPP_TEMPLATES;
