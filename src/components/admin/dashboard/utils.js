// Helpers de formato
export const money0 = (n) =>
  n == null
    ? "—"
    : "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

export const money2 = (n) =>
  n == null
    ? "—"
    : "$" +
      Number(n).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

export const num = (n) => (Number(n) || 0).toLocaleString("en-US");

export const pct1 = (n) => (n == null ? "—" : `${Number(n).toFixed(1)}%`);

export const fmtDate = (d) =>
  !d
    ? "—"
    : new Date(d).toLocaleDateString("es-EC", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

export const mesLabel = (yyyymm) => {
  const [y, m] = yyyymm.split("-");
  const meses = [
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
  return `${meses[parseInt(m, 10) - 1]} ${y.slice(2)}`;
};

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const decode = (s) => {
  if (!s) return "—";
  return String(s)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
};

export const planDurationLabel = (plan) => {
  if (plan.id_plan === 21) {
    return "$29 · Periodo gratis variable (30 / 90 / 180 días según membresía externa)";
  }
  return `$${Number(plan.precio_plan).toFixed(0)} cada ${plan.duracion_plan} días`;
};

// Constantes
export const PRODUCTO_LABEL = {
  imporchat: "ImporChat",
  insta_landing: "Insta Landing",
  both: "ImporChat + Insta Landing + Dashboard",
};

export const PRODUCTO_BADGE = {
  imporchat: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  insta_landing: "bg-violet-50 text-violet-700 ring-violet-200",
  both: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};
