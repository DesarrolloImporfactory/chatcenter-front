/* ── Contenido de la landing pública (/home) ──
 *
 * Todo el texto y las listas viven aquí para que cambiar un precio, una
 * industria o una pregunta frecuente no obligue a tocar JSX. La regla es
 * una idea por bloque y frases cortas: la página vende con imágenes y
 * espacio, no con párrafos.
 */

export const LOGO_BLANCO =
  "https://imp-datas.s3.amazonaws.com/images/2026-09-07T21-20-06-459Z-IMPORCHAT-02.png";

import productoImg from "../../assets/landing/producto-proyector.webp";
import fotoBoutique from "../../assets/landing/personas/boutique.webp";
import fotoClinica from "../../assets/landing/personas/clinica.webp";
import fotoInmobiliaria from "../../assets/landing/personas/inmobiliaria.webp";
import fotoAcademia from "../../assets/landing/personas/academia.webp";
import fotoRestaurante from "../../assets/landing/personas/restaurante.webp";
import fotoEcommerce from "../../assets/landing/personas/ecommerce.webp";
import fotoSalon from "../../assets/landing/personas/salon.webp";

/* Producto que vende el agente en la demo del hero. */
export const PRODUCT_IMG = productoImg;

/* Número de ventas para el botón flotante de WhatsApp (solo dígitos, con
 * código de país). Vacío = el botón no se muestra. */
export const WHATSAPP_VENTAS = "593979120058";

/* Agenda de Calendly para "Agendar demo". Se abre en pestaña nueva. */
export const CALENDLY_DEMO = "https://calendly.com/comercial-imporchat/30min";

/* Palabras que giran en el titular del hero. Cortas para que nunca partan
 * línea. */
export const PALABRAS_HERO = ["responde", "agenda citas", "toma pedidos", "hace seguimiento", "cierra ventas"];

/* Franja que corre bajo el hero. */
export const FRANJA = [
  "Meta Business Partner oficial",
  "API oficial de WhatsApp Business",
  "Agente IA entrenado con tu negocio",
  "CRM y embudo incluidos",
  "Dropi y Shopify sincronizados",
  "Google Calendar para citas",
  "Campañas con plantillas aprobadas",
];

/* Fotos ilustrativas por industria, generadas con IA en estilo documental.
 * No son clientes reales: por eso llevan rubro y no nombre. */
export const PERSONAS = [
  { img: fotoBoutique, rubro: "Boutique", logro: "Pedidos sin perder ninguno" },
  { img: fotoClinica, rubro: "Clínica", logro: "Citas que se agendan solas" },
  { img: fotoInmobiliaria, rubro: "Inmobiliaria", logro: "Interesados ya calificados" },
  { img: fotoAcademia, rubro: "Academia", logro: "Inscripciones a cualquier hora" },
  { img: fotoRestaurante, rubro: "Restaurante", logro: "Pedido y confirmación en un chat" },
  { img: fotoEcommerce, rubro: "E-commerce", logro: "Cierre contra entrega sin asesor" },
  { img: fotoSalon, rubro: "Salón y spa", logro: "Agenda llena con recordatorios" },
];

export const SIN_CON = {
  sin: [
    "Escriben de noche y les respondes mañana.",
    "Las mismas preguntas, cien veces al día.",
    "Chats regados en varios celulares.",
    "Seguimiento que depende de la memoria.",
  ],
  con: [
    "Respuesta en segundos, 24 horas.",
    "El agente resuelve precio, stock y envío.",
    "Una bandeja, todo el equipo, cada chat asignado.",
    "Seguimientos y recordatorios programados.",
  ],
};

export const CAPACIDADES = [
  { icon: "chat", title: "Bandeja unificada", desc: "WhatsApp, Instagram y Messenger en una sola pantalla." },
  { icon: "robot", title: "Agente IA de ventas", desc: "Responde, maneja objeciones y cierra con tu catálogo." },
  { icon: "kanban", title: "Embudo de ventas", desc: "Cada chat avanza por etapas. Ves el pipeline de un vistazo." },
  { icon: "calendar", title: "Agenda y citas", desc: "Google Calendar sincronizado y recordatorios al cliente." },
  { icon: "cart", title: "Pedidos y catálogo", desc: "Contra entrega y stock real con Dropi y Shopify." },
  { icon: "send", title: "Campañas masivas", desc: "Plantillas aprobadas por Meta, programadas y segmentadas." },
];

export const AGENTE_IA = [
  { title: "Aprende de tu negocio", desc: "Un cuestionario corto y tu catálogo. Sin prompts, sin programar." },
  { title: "Vende como tu mejor asesor", desc: "Objeciones, stock, upsell y fotos. Entrenado con ventas reales de LATAM." },
  { title: "Te lo pasa con contexto", desc: "Cuando hace falta un humano, transfiere el chat con el resumen listo." },
];

export const INDUSTRIAS = [
  {
    k: "ecommerce",
    label: "E-commerce",
    img: fotoEcommerce,
    title: "Vende contra entrega sin un asesor por chat",
    bullets: ["Orden automática en Dropi y Shopify", "Guía y estado del envío sin IA", "Remarketing a carritos abandonados"],
    chat: [
      { s: "l", t: "¿Tienen la freidora de aire?" },
      { s: "r", t: "¡Sí! $69,99 con envío gratis y pago contra entrega. ¿A qué ciudad te la envío?" },
      { s: "l", t: "Quito norte" },
      { s: "r", t: "Perfecto. Tu nombre y dirección exacta y creo el pedido." },
    ],
  },
  {
    k: "clinica",
    label: "Clínicas",
    img: fotoClinica,
    title: "Citas agendadas y confirmadas sin recepción",
    bullets: ["Sedes, especialidades y profesionales", "Recordatorio 24 h antes", "Reagenda desde el chat"],
    chat: [
      { s: "l", t: "Quiero una limpieza dental" },
      { s: "r", t: "Claro. Jueves 10:00 o 15:30 con la Dra. Paz. ¿Cuál prefieres?" },
      { s: "l", t: "Jueves 15:30" },
      { s: "r", t: "Listo, agendada. Te recuerdo el miércoles. 🦷" },
    ],
  },
  {
    k: "inmobiliaria",
    label: "Inmobiliarias",
    img: fotoInmobiliaria,
    title: "Califica interesados antes de gastar una visita",
    bullets: ["Presupuesto y zona en el primer mensaje", "Catálogo de inmuebles con fotos", "Visita agendada con el asesor"],
    chat: [
      { s: "l", t: "Busco departamento de 2 habitaciones" },
      { s: "r", t: "Con gusto. ¿Sector y presupuesto aproximado?" },
      { s: "l", t: "Norte, hasta 120 mil" },
      { s: "r", t: "Tengo 3 opciones. Te envío fotos y coordino la visita con Andrés." },
    ],
  },
  {
    k: "servicios",
    label: "Servicios",
    img: fotoSalon,
    title: "Agenda llena para salones, talleres y consultorías",
    bullets: ["Agenda por profesional", "Enlace de pago para reservar", "Menos inasistencias"],
    chat: [
      { s: "l", t: "¿Cuánto cuesta corte y color?" },
      { s: "r", t: "$45 y toma 2 horas. ¿Reservamos esta semana?" },
      { s: "l", t: "Sábado en la mañana" },
      { s: "r", t: "9:00 u 11:00 con Valeria. Te reservo con un abono de $10 por este enlace." },
    ],
  },
  {
    k: "restaurante",
    label: "Restaurantes",
    img: fotoRestaurante,
    title: "Pedidos a domicilio sin colgar el teléfono",
    bullets: ["Menú del día actualizado", "Pedido y dirección en un flujo", "Encuesta al entregar"],
    chat: [
      { s: "l", t: "¿Hay menú de almuerzo?" },
      { s: "r", t: "Sí: seco de pollo o corvina, con jugo, $4,50. ¿Cuántos y a qué dirección?" },
      { s: "l", t: "2 de pollo, Av. Amazonas y Patria" },
      { s: "r", t: "Anotado: $9 contra entrega. Llega en 35 minutos. 🛵" },
    ],
  },
  {
    k: "educacion",
    label: "Educación",
    img: fotoAcademia,
    title: "Inscripciones resueltas a cualquier hora",
    bullets: ["Programas, fechas y precios al instante", "Seguimiento a indecisos", "Enlace de pago de matrícula"],
    chat: [
      { s: "l", t: "¿Cuándo empieza el curso de marketing?" },
      { s: "r", t: "El 3 de noviembre, 8 semanas, martes y jueves 19:00. Cuesta $180." },
      { s: "l", t: "¿Puedo pagar en dos partes?" },
      { s: "r", t: "Sí, dos cuotas de $90. Te paso el enlace para asegurar tu cupo." },
    ],
  },
];

export const PASOS = [
  { n: "1", title: "Conecta tu WhatsApp", desc: "Conexión oficial con Meta. Sin apps de terceros." },
  { n: "2", title: "Cuéntale tu negocio", desc: "Un cuestionario corto y tu catálogo. El agente arma su ficha." },
  { n: "3", title: "Suma a tu equipo", desc: "Asesores, departamentos y contactos importados." },
  { n: "4", title: "Empieza a vender", desc: "El agente atiende. Tú entras cuando quieres." },
];

export const META_BENEFICIOS = [
  { title: "Menor riesgo de bloqueo", desc: "Operas sobre la API oficial, no sobre un celular con una app no autorizada." },
  { title: "Automatización permitida", desc: "Plantillas aprobadas por Meta y envíos masivos dentro de las políticas." },
  { title: "Acceso a la API real", desc: "Catálogos, botones, ubicación y llamadas desde el primer día." },
  { title: "Escala sin cambiar de plataforma", desc: "De un número y un asesor a varias marcas y países." },
];

export const INTEGRACIONES = [
  { k: "whatsapp", n: "WhatsApp Business API" },
  { k: "instagram", n: "Instagram Direct" },
  { k: "messenger", n: "Messenger" },
  { k: "dropi", n: "Dropi" },
  { k: "shopify", n: "Shopify" },
  { k: "google", n: "Google Calendar" },
  { k: "stripe", n: "Stripe" },
  { k: "openai", n: "OpenAI" },
  { k: "claude", n: "Claude" },
  { k: "aliclik", n: "Aliclik" },
  { k: "api", n: "API pública y webhooks" },
];

export const PLANES = [
  { k: "ic", n: "ImporChat", p: 39, desc: "Un negocio que quiere atender y vender solo.", lim: ["1 negocio conectado", "2 usuarios del equipo", "Conversaciones ilimitadas"] },
  { k: "pro", n: "Pro Ecosistema", p: 49, desc: "Dos marcas o dos números.", lim: ["2 negocios conectados", "5 usuarios del equipo", "Conversaciones ilimitadas"], destacado: true },
  { k: "av", n: "Avanzado", p: 99, desc: "Equipos y operación en varios países.", lim: ["5 negocios conectados", "10 usuarios del equipo", "Conversaciones ilimitadas"] },
];

export const FAQ = [
  {
    q: "¿Necesito un número de WhatsApp nuevo?",
    a: "No. Conectas tu número actual con coexistencia: sigues viendo y respondiendo tus mensajes en el celular y, al mismo tiempo, el agente IA y tu equipo los atienden desde ImporChat. Nada se pierde y todo queda automatizado.",
  },
  {
    q: "¿Tengo que saber programar o escribir prompts?",
    a: "No. El agente se configura respondiendo un cuestionario sobre tu negocio y subiendo tu catálogo. En minutos está vendiendo.",
  },
  {
    q: "¿Qué pasa cuando el cliente quiere hablar con una persona?",
    a: "El agente transfiere el chat a tu equipo con el resumen de la conversación. Tú también puedes entrar en cualquier momento y retomar.",
  },
  {
    q: "¿Qué significa ser Meta Business Partner?",
    a: "Que Meta reconoce a Imporfactory como proveedor oficial de la API de WhatsApp. Menor riesgo de bloqueos y acceso directo a funciones nuevas.",
  },
  {
    q: "¿Cómo funciona la prueba gratuita?",
    a: "7 días gratis. Después, el primer mes cuesta $5 y luego el plan que elijas. Cancelas cuando quieras.",
  },
];
