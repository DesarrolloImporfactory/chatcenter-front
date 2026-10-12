// Etiquetas y formatos compartidos por las vistas de /recuperacion.
export const COHORTE_UI = {
  pago_rebotado: { cls: "bg-rose-50 text-rose-700 ring-rose-200", bar: "bg-rose-500" },
  cancelacion_programada: { cls: "bg-amber-50 text-amber-700 ring-amber-200", bar: "bg-amber-500" },
  vencido: { cls: "bg-orange-50 text-orange-700 ring-orange-200", bar: "bg-orange-500" },
  cancelado_reciente: { cls: "bg-slate-100 text-slate-700 ring-slate-200", bar: "bg-slate-500" },
  en_prueba: { cls: "bg-cyan-50 text-cyan-700 ring-cyan-200", bar: "bg-cyan-500" },
  sin_tarjeta: { cls: "bg-violet-50 text-violet-700 ring-violet-200", bar: "bg-violet-500" },
  manual: { cls: "bg-slate-100 text-slate-700 ring-slate-200", bar: "bg-slate-400" },
};

export const ESTADO_CASO = {
  abierto: { label: "Abierto", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  recuperado: { label: "Recuperado", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  perdido: { label: "Perdido", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  descartado: { label: "Descartado", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export const money = (n) =>
  `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
export const money2 = (n) =>
  `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const num = (n) => (Number(n) || 0).toLocaleString("en-US");

export const fmtFecha = (d) =>
  d
    ? new Date(d).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
export const fmtFechaCorta = (d) =>
  d ? new Date(d).toLocaleDateString("es-EC", { day: "2-digit", month: "short" }) : "—";
export const fmtFechaHora = (d) =>
  d
    ? new Date(d).toLocaleString("es-EC", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";

// "en 3 días" / "hace 2 días" / "hoy"
export const relDias = (dias) => {
  if (dias == null) return "";
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  if (dias === -1) return "ayer";
  return dias > 0 ? `en ${dias} días` : `hace ${Math.abs(dias)} días`;
};

// Abre el chat del cliente en la conexión de Expertos igual que el resto de
// la app: /chat/<id_cliente> con la conexión en localStorage. La cabecera del
// chat lee nombre_configuracion de ahí (sin él muestra un nombre de relleno).
export const irAlChatExpertos = (d) => {
  try {
    localStorage.setItem("id_configuracion", String(d.id_configuracion));
    if (d.nombre_configuracion) localStorage.setItem("nombre_configuracion", d.nombre_configuracion);
    else localStorage.removeItem("nombre_configuracion");
    if (d.tipo_configuracion) localStorage.setItem("tipo_configuracion", d.tipo_configuracion);
    else localStorage.removeItem("tipo_configuracion");
    if (d.id_plataforma) localStorage.setItem("id_plataforma_conf", String(d.id_plataforma));
    else localStorage.removeItem("id_plataforma_conf");
  } catch (_) {
    /* sin storage: el chat mandará a Conexiones */
  }
  window.open(`/chat/${d.id_cliente}`, "_blank", "noopener,noreferrer");
};

export const inicialesDe = (nombre) =>
  String(nombre || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
