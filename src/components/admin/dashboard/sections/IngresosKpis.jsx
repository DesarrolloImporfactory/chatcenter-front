import Section from "../shared/Section";
import { money0, money2, num } from "../utils";

function DeltaBadge({ delta, deltaFmt = (v) => num(v) }) {
  const isUp = (delta.abs || 0) >= 0;
  const cls = isUp
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-rose-50 text-rose-700 ring-rose-200";
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ring-1 ${cls}`}
      title="vs periodo de comparación"
    >
      <i className={`bx ${isUp ? "bx-trending-up" : "bx-trending-down"}`} />
      {isUp ? "+" : ""}
      {deltaFmt(delta.abs)}
      <span className="opacity-70">
        ({isUp ? "+" : ""}
        {Number(delta.pct).toFixed(0)}%)
      </span>
    </span>
  );
}

export function Kpi({
  accent,
  icon,
  label,
  value,
  delta,
  deltaFmt = (v) => num(v),
  explain,
  hint,
}) {
  const accents = {
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      bar: "bg-emerald-500",
    },
    cyan: { bg: "bg-cyan-50", text: "text-cyan-700", bar: "bg-cyan-500" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-500" },
    rose: { bg: "bg-rose-50", text: "text-rose-700", bar: "bg-rose-500" },
    violet: {
      bg: "bg-violet-50",
      text: "text-violet-700",
      bar: "bg-violet-500",
    },
  }[accent] || {
    bg: "bg-slate-100",
    text: "text-slate-700",
    bar: "bg-slate-500",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 ${accents.bar}`} />
      <div className="flex items-start justify-between gap-2 mb-2">
        <div
          className={`h-9 w-9 rounded-lg ${accents.bg} ${accents.text} flex items-center justify-center`}
        >
          <i className={`bx ${icon} text-xl`} />
        </div>
        {delta && delta.pct != null && (
          <DeltaBadge delta={delta} deltaFmt={deltaFmt} />
        )}
      </div>
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
        {value}
      </div>
      {hint && (
        <div className={`text-xs font-semibold mt-1 ${accents.text}`}>
          {hint}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] leading-relaxed text-slate-500">
        <i className="bx bx-info-circle mr-1 text-slate-400" />
        {explain}
      </div>
    </div>
  );
}

export default function IngresosKpis({ resumen }) {
  return (
    <Section
      icon="bx-dollar-circle"
      title="Ingresos"
      subtitle="Lo que cobras hoy vía Stripe y lo que podrías cobrar si convirtieras todo el pipeline"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          accent="emerald"
          icon="bx-dollar"
          label="MRR real (Stripe)"
          value={money0(resumen.mrr_stripe)}
          delta={resumen.deltas?.mrr_stripe}
          deltaFmt={(v) => money0(v)}
          explain="Suma del precio de las suscripciones Stripe que SE ESTÁN COBRANDO ahora. Debe coincidir con el MRR de Stripe dashboard."
        />
        <Kpi
          accent="cyan"
          icon="bx-line-chart"
          label="ARR proyectado"
          value={money0(resumen.arr_stripe)}
          explain="Annual Recurring Revenue = MRR × 12."
        />
        <Kpi
          accent="amber"
          icon="bx-target-lock"
          label="MRR potencial"
          value={money0(resumen.mrr_potencial)}
          delta={resumen.deltas?.mrr_potencial}
          deltaFmt={(v) => money0(v)}
          explain="Lo que cobrarías SI todos los del pipeline (trial Stripe + acceso manual) convirtieran a pagar."
          hint={`${((resumen.mrr_potencial / Math.max(1, resumen.mrr_stripe) - 1) * 100).toFixed(0)}% más que el MRR actual`}
        />
        <Kpi
          accent="violet"
          icon="bx-coin"
          label="ARPU"
          value={money2(resumen.arpu)}
          explain="Ingreso promedio por cliente pagando. = MRR Stripe ÷ clientes pagando."
          hint="Por cliente pagando"
        />
      </div>
    </Section>
  );
}
