export const TIPOS_SEGUIMIENTO = [
  {
    value: "llamada",
    label: "Llamada telefónica",
    icon: "bx-phone",
    color: "cyan",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    icon: "bxl-whatsapp",
    color: "emerald",
  },
  { value: "email", label: "Email", icon: "bx-envelope", color: "sky" },
  { value: "reunion", label: "Reunión", icon: "bx-video", color: "violet" },

  {
    value: "cancelacion",
    label: "Registro de cancelación",
    icon: "bx-x-circle",
    color: "rose",
  },
  {
    value: "retencion",
    label: "Intento de retención",
    icon: "bx-shield-quarter",
    color: "amber",
  },
  {
    value: "onboarding",
    label: "Onboarding / activación",
    icon: "bx-rocket",
    color: "emerald",
  },
  {
    value: "cobro",
    label: "Gestión de cobro",
    icon: "bx-credit-card",
    color: "amber",
  },
  {
    value: "otro",
    label: "Otro",
    icon: "bx-dots-horizontal-rounded",
    color: "slate",
  },
];

export const TIPO_MAP = Object.fromEntries(
  TIPOS_SEGUIMIENTO.map((t) => [t.value, t]),
);

// `grupo` ordena el selector del formulario para que el asesor encuentre rápido
// qué pasó. «promesa_pago» exige fecha: va en «Próximo contacto» y el embudo
// de recuperación la muestra como promesa (vencida si pasa sin pago).
export const RESULTADOS = [
  { value: "sin_resultado", label: "— Sin clasificar", grupo: "" },
  { value: "contactado_exitoso", label: "✓ Conversó conmigo", grupo: "Contacto" },
  { value: "no_contesto", label: "☎ No contestó / no respondió", grupo: "Contacto" },
  { value: "numero_invalido", label: "✗ Número inválido o equivocado", grupo: "Contacto" },
  { value: "programar_seguimiento", label: "⏰ Quedamos en hablar otro día", grupo: "Contacto" },
  { value: "promesa_pago", label: "🤝 Prometió pagar en una fecha", grupo: "Resultado comercial" },
  { value: "pago_confirmado", label: "💰 Pagó / regularizó su cuenta", grupo: "Resultado comercial" },
  { value: "retenido", label: "🛡 Retenido (ya no cancela)", grupo: "Resultado comercial" },
  { value: "convertido", label: "💳 Convertido (capturó tarjeta)", grupo: "Resultado comercial" },
  { value: "interesado", label: "⭐ Interesado, falta cerrar", grupo: "Resultado comercial" },
  { value: "no_interesado", label: "◯ No le interesa", grupo: "Resultado comercial" },
  { value: "cancelado", label: "✗ Confirmó que cancela", grupo: "Resultado comercial" },
  { value: "otro", label: "... Otro (lo explico en la nota)", grupo: "" },
];

export const MOTIVOS_CANCELACION = [
  { value: "precio_alto", label: "Precio muy alto" },
  { value: "no_uso", label: "No le da uso" },
  { value: "no_funciona", label: "No le funcionó / problemas técnicos" },
  { value: "cambio_proveedor", label: "Se cambió a otro proveedor" },
  { value: "no_lo_solicito", label: "No lo solicitó / cargo desconocido" },
  { value: "no_entiende", label: "No entiende cómo usarlo" },
  { value: "cerro_negocio", label: "Cerró su negocio" },
  { value: "pidio_reembolso", label: "Pidió reembolso" },
  { value: "otro", label: "Otro motivo (escribir manualmente)" },
];

export const fmtFechaCorta = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const fmtFechaHora = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const fmtTamanoBytes = (b) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};
