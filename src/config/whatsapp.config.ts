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
`¡Hola! Me gustaría recibir información general y conocer el catálogo disponible.`,

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

  // ─── Servicios Técnicos Zutech ─────────────────────────────────────────────

  /**
   * Plantilla para agendar un mantenimiento preventivo de PC en el taller.
   */
  service_mantenimiento:
`Hola Zutech 👋 Quiero agendar un *Mantenimiento Preventivo* para mi equipo.

¿Cuándo puedo llevarlo al taller?`,

  /**
   * Plantilla para solicitar diagnóstico y reparación de PC.
   */
  service_reparacion:
`Hola Zutech 👋 Necesito *reparación* de mi PC.

El problema que presenta es: [describe brevemente el fallo]

¿Cuándo puedo llevarlo para diagnóstico?`,

  /**
   * Plantilla para solicitar asesoría de compra / armado de equipo.
   */
  service_asesoria:
`Hola Zutech 👋 Me gustaría recibir *asesoría de compra* para armar/renovar mi equipo.

Mi presupuesto aproximado es: $___`,

  /**
   * Plantilla para coordinar un upgrade de hardware (RAM, SSD, GPU, etc.).
   */
  service_upgrades:
`Hola Zutech 👋 Quiero hacer un *upgrade* a mi equipo.

Estoy pensando en mejorar: [RAM / SSD / GPU / otro]

¿Me pueden asesorar y hacer la instalación?`,

  /**
   * Plantilla para consultas técnicas especiales no cubiertas por los 4 servicios principales.
   */
  service_general:
`Hola Zutech 👋 Tengo una consulta técnica especial:

`

} as const;

export type WhatsAppAction = keyof typeof WHATSAPP_TEMPLATES;
