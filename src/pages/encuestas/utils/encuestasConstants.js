/* ── Constantes y helpers del módulo de encuestas ── */

export const TIPO_CONFIG = {
  webhook_lead: {
    label: "Webhook Lead",
    color: "bg-blue-100 text-blue-700",
    icon: "bx-link-external",
    descripcionCorta: "Recibe respuestas de formularios externos",
    descripcionLarga:
      "Conecta tu formulario, funnel o landing page para recibir automáticamente los datos de tus leads. Solo necesitas apuntar tu formulario a la URL del webhook con el secret en el header.",
  },
  satisfaccion: {
    label: "Satisfacción",
    color: "bg-emerald-100 text-emerald-700",
    icon: "bx-happy-heart-eyes",
    descripcionCorta: "Calificación post-atención del cliente",
    descripcionLarga:
      "Se envía automáticamente por WhatsApp cuando un asesor cierra un chat. El cliente califica del 1 al 5 y si la nota es baja, se genera una alerta de escalación.",
  },
};

export const SCORE_EMOJIS = ["", "😡", "😞", "😐", "😊", "🤩"];

export const SCORE_COLORS = {
  1: "text-red-600",
  2: "text-orange-500",
  3: "text-yellow-500",
  4: "text-green-500",
  5: "text-emerald-600",
};

export const SOURCE_STYLES = {
  webhook: "bg-blue-50 text-blue-600",
  link: "bg-purple-50 text-purple-600",
  whatsapp: "bg-emerald-50 text-emerald-600",
  manual: "bg-gray-50 text-gray-500",
};
