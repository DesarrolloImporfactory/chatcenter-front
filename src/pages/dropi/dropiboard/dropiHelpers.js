export const classifyStatus = (status) => {
  const s = String(status || "")
    .trim()
    .toUpperCase();

  if (
    s === "ENTREGADO" ||
    s.includes("ENTREGADA") ||
    s === "REPORTADO ENTREGADO" ||
    s === "ENTREGA DIGITALIZADA"
  )
    return "entregada";
  if (
    s.includes("DEVOLUCION") ||
    s.includes("DEVOLUCIÓN") ||
    s === "DEVUELTO" ||
    s.includes("DEVOLUCION EN")
  )
    return "devolucion";
  if (
    s === "CANCELADO" ||
    s.includes("CANCELADA") ||
    s === "ANULADA" ||
    s === "RECHAZADO"
  )
    return "cancelada";
  if (s === "PENDIENTE" || s === "PENDIENTE CONFIRMACION") return "pendiente";
  if (s.includes("RETIRO EN AGENCIA") || s.includes("ENVÍO LISTO EN OFICINA"))
    return "retiro_agencia";
  if (s.includes("NOVEDAD") || s.includes("SOLUCION")) return "novedad";
  if (
    s.includes("INDEMNIZ") ||
    s.includes("SINIESTRO") ||
    s.includes("INCAUTADO")
  )
    return "indemnizada";
  if (
    s === "GUIA_GENERADA" ||
    s === "GUIA_ANULADA" ||
    s.includes("TRÁNSITO") ||
    s.includes("TRANSITO") ||
    s.includes("EN RUTA") ||
    s.includes("EN CAMINO") ||
    s.includes("EN REPARTO") ||
    s.includes("BODEGA") ||
    s.includes("EMBARCANDO") ||
    s.includes("RECOLECT") ||
    s.includes("RECOGIDO") ||
    s.includes("ASIGNADO") ||
    s.includes("PICKING") ||
    s.includes("PACKING") ||
    s.includes("GENERADO") ||
    s.includes("GENERADA") ||
    s.includes("ZONA DE ENTREGA") ||
    s.includes("PREPARADO") ||
    s.includes("INVENTARIO") ||
    s.includes("INGRES") ||
    s.includes("RECIBIDO")
  )
    return "en_transito";

  return "otro";
};

export const STATUS_CATEGORIES = {
  pendiente: { label: "Pendientes", color: "#F59E0B", icon: "⏳" },
  en_transito: { label: "En Tránsito", color: "#00BFFF", icon: "🚛" },
  entregada: { label: "Entregadas", color: "#10B981", icon: "✅" },
  retiro_agencia: { label: "Retiro Agencia", color: "#FF6B35", icon: "📦" },
  novedad: { label: "Con Novedad", color: "#8B5CF6", icon: "⚠️" },
  devolucion: { label: "Devoluciones", color: "#EF4444", icon: "↩️" },
  cancelada: { label: "Canceladas", color: "#6B7280", icon: "✕" },
  indemnizada: { label: "Indemnizadas", color: "#DC2626", icon: "🛡️" },
  otro: { label: "Otros", color: "#94A3B8", icon: "?" },
};

export const DISPLAY_ORDER = [
  "pendiente",
  "en_transito",
  "entregada",
  "retiro_agencia",
  "novedad",
  "devolucion",
  "cancelada",
];

export const toYMD = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const fmtMoney = (v) => {
  const n = Number(v || 0);
  return n >= 0 ? `$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`;
};

export const fmtNum = (v) => Number(v || 0).toLocaleString();

export const fmtShortDate = (isoStr) => {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length < 3) return isoStr;
  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
};
