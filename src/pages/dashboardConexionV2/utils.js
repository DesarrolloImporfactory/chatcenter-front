/* Utilidades del dashboard de conexión v2 (propuesta en revisión).
   Formatos y fechas compartidos por la vista; sin lógica de negocio. */

export const DATE_PRESETS = [
  { label: "Hoy", days: 0 },
  { label: "7 días", days: 7 },
  { label: "15 días", days: 15 },
  { label: "30 días", days: 30 },
];

/* Mismos nombres y colores que el dashboard actual, para que un pedido
   «en tránsito» se vea igual en las dos vistas. */
export const STATUS_LABELS = {
  entregada: "Entregadas",
  en_transito: "En tránsito",
  pendiente: "Pendientes",
  devolucion: "Devoluciones",
  cancelada: "Canceladas",
  en_reparto: "En reparto",
  guia_generada: "Guía generada",
  novedad: "Novedad",
  retiro_agencia: "Retiro agencia",
  indemnizada: "Indemnizada",
  otro: "Otro",
};

export const STATUS_COLORS = {
  entregada: "#10B981",
  en_transito: "#3B82F6",
  pendiente: "#F59E0B",
  devolucion: "#EF4444",
  cancelada: "#6B7280",
  en_reparto: "#8B5CF6",
  guia_generada: "#06B6D4",
  novedad: "#F97316",
  retiro_agencia: "#EC4899",
  indemnizada: "#0EA5E9",
  otro: "#94A3B8",
};

const DROPI_IMG_BASE = "https://d39ru7awumhhs2.cloudfront.net/";

export function productImg(image) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  return `${DROPI_IMG_BASE}${image.replace(/^\/+/, "")}`;
}

/* ─── fechas ─── */

export function toYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toYMD(d);
}

function parseYMD(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* Cantidad de días del rango, contando ambos extremos. */
export function diasDelRango(from, to) {
  const ms = parseYMD(to) - parseYMD(from);
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

/* Rango inmediatamente anterior con la misma cantidad de días: la base
   contra la que se comparan los KPIs («vs. periodo anterior»). */
export function rangoAnterior(from, to) {
  const dias = diasDelRango(from, to);
  const fin = parseYMD(from);
  fin.setDate(fin.getDate() - 1);
  const ini = new Date(fin);
  ini.setDate(ini.getDate() - (dias - 1));
  return { from: toYMD(ini), to: toYMD(fin) };
}

/* "2026-07-16" → "16 jul" */
export function fmtDiaCorto(ymd) {
  if (!ymd) return "";
  return parseYMD(ymd)
    .toLocaleDateString("es-EC", { day: "numeric", month: "short" })
    .replace(".", "");
}

/* "2026-07-16" → "16 de julio" */
export function fmtDiaLargo(ymd) {
  if (!ymd) return "";
  return parseYMD(ymd).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "long",
  });
}

export function fmtRango(from, to) {
  if (!from || !to) return "";
  if (from === to) return `Hoy, ${fmtDiaLargo(from)}`;
  return `${fmtDiaCorto(from)} – ${fmtDiaCorto(to)}`;
}

export function fmtHora(d) {
  if (!d) return "";
  return d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
}

/* ─── números ─── */

export function fmt$(v, compact = false) {
  const n = Number(v || 0);
  if (compact && Math.abs(n) >= 10000) {
    return `$${(n / 1000).toLocaleString("en-US", {
      maximumFractionDigits: 1,
    })}k`;
  }
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtNum(v) {
  return Number(v || 0).toLocaleString("en-US");
}

export function fmtPct(v, dec = 1) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `${Number(v).toFixed(dec)}%`;
}

/* Segundos → texto corto: 45 s · 3 min · 1 h 20 min */
export function fmtDur(seg) {
  if (seg == null || Number.isNaN(Number(seg))) return "—";
  const s = Math.round(Number(seg));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 48) return rm ? `${h} h ${rm} min` : `${h} h`;
  // Esperas de días (clientes olvidados en la cola): «7 d 5 h» se lee
  // mejor que «173 h 24 min».
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d} d ${rh} h` : `${d} d`;
}

/* Variación porcentual contra el periodo anterior. null cuando no hay con
   qué comparar (antes no había nada); así el chip no muestra «+∞%». */
export function deltaPct(actual, previo) {
  const a = Number(actual || 0);
  const p = Number(previo || 0);
  if (!p) return a ? null : 0;
  return ((a - p) / Math.abs(p)) * 100;
}

/* "Juan Pérez" → "JP" */
export function iniciales(nombre) {
  return String(nombre || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || "")
    .join("")
    .toUpperCase();
}
