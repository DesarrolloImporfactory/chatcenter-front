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
    value: "otro",
    label: "Otro",
    icon: "bx-dots-horizontal-rounded",
    color: "slate",
  },
];

export const TIPO_MAP = Object.fromEntries(
  TIPOS_SEGUIMIENTO.map((t) => [t.value, t]),
);

export const RESULTADOS = [
  { value: "sin_resultado", label: "— Sin clasificar" },
  { value: "contactado_exitoso", label: "✓ Conversó exitosamente" },
  { value: "no_contesto", label: "☎ No contestó" },
  { value: "numero_invalido", label: "✗ Número inválido" },
  { value: "interesado", label: "⭐ Interesado" },
  { value: "no_interesado", label: "◯ No interesado" },
  { value: "retenido", label: "🛡 Retenido (no cancela)" },
  { value: "convertido", label: "💳 Convertido (capturó tarjeta)" },
  { value: "cancelado", label: "✗ Confirmó cancelación" },
  { value: "programar_seguimiento", label: "⏰ Programar otro contacto" },
  { value: "otro", label: "... Otro (escribir manualmente)" },
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
