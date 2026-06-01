export const fmtDate = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString("es-EC", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};

export const fmtDateTime = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleString("es-EC", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

export const fmtMoney = (n) => {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return `$${v.toFixed(2)}`;
};

export const fmtNumber = (n) => (Number(n) || 0).toLocaleString("es-EC");

export const relativo = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  const diff = Date.now() - dt.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `hace ${days}d`;
  const mos = Math.floor(days / 30);
  if (mos < 12) return `hace ${mos}mes`;
  const yrs = Math.floor(mos / 12);
  return `hace ${yrs}a`;
};

export const semaforoStyle = {
  verde: {
    dot: "bg-emerald-500",
    chip: "text-emerald-700 bg-emerald-50 ring-emerald-200",
    label: "Al día",
  },
  amarillo: {
    dot: "bg-amber-500",
    chip: "text-amber-700 bg-amber-50 ring-amber-200",
    label: "Por vencer",
  },
  rojo: {
    dot: "bg-rose-500",
    chip: "text-rose-700 bg-rose-50 ring-rose-200",
    label: "Vencido",
  },
  gris: {
    dot: "bg-slate-400",
    chip: "text-slate-600 bg-slate-50 ring-slate-200",
    label: "Sin plan",
  },
};

export const estadoBadge = {
  activo: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactivo: "bg-slate-50 text-slate-700 ring-slate-200",
  suspendido: "bg-orange-50 text-orange-700 ring-orange-200",
  vencido: "bg-rose-50 text-rose-700 ring-rose-200",
  cancelado: "bg-rose-50 text-rose-700 ring-rose-200",
  trial_usage: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  promo_usage: "bg-violet-50 text-violet-700 ring-violet-200",
};
