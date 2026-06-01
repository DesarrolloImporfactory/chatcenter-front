import Section from "../shared/Section";
import { num, money0, pct1 } from "../utils";

function EtapaCard({ etapa, idx, max, onOpen }) {
  const accents = {
    amber: {
      bg: "bg-amber-50",
      bar: "bg-amber-500",
      text: "text-amber-700",
      border: "border-amber-200",
      hover: "hover:border-amber-400",
    },
    cyan: {
      bg: "bg-cyan-50",
      bar: "bg-cyan-500",
      text: "text-cyan-700",
      border: "border-cyan-200",
      hover: "hover:border-cyan-400",
    },
    emerald: {
      bg: "bg-emerald-50",
      bar: "bg-emerald-500",
      text: "text-emerald-700",
      border: "border-emerald-200",
      hover: "hover:border-emerald-400",
    },
  }[etapa.color];
  const widthPct = (etapa.value / max) * 100;
  return (
    <div className="relative">
      <div
        onClick={() => onOpen(etapa.cat, etapa.label, etapa.color)}
        className={`rounded-xl border-2 ${accents.border} ${accents.bg} p-4 h-full cursor-pointer ${accents.hover} hover:shadow-md transition`}
      >
        <div className="flex items-center justify-between mb-2">
          <div
            className={`h-9 w-9 rounded-lg bg-white ${accents.text} flex items-center justify-center shadow-sm`}
          >
            <i className={`bx ${etapa.icon} text-xl`} />
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${accents.text}`}
          >
            Etapa {idx + 1}
          </span>
        </div>
        <div className="text-3xl font-extrabold text-slate-900 leading-none">
          {num(etapa.value)}
        </div>
        <div className={`text-sm font-bold ${accents.text} mt-1`}>
          {etapa.label}
        </div>
        <div className="text-[11px] text-slate-600 mt-1">{etapa.desc}</div>
        <div className="mt-3 h-1.5 bg-white rounded-full overflow-hidden ring-1 ring-slate-200">
          <div
            className={`h-full ${accents.bar}`}
            style={{ width: `${widthPct}%` }}
          />
        </div>
        <div className="mt-3 pt-3 border-t border-white/80 text-[11px] text-slate-700 leading-relaxed">
          <b>Qué es:</b> {etapa.detalle}
        </div>
        <div
          className={`mt-2 text-[11px] font-bold ${accents.text} flex items-center gap-1`}
        >
          <i className="bx bx-right-arrow-circle" /> {etapa.stat}
        </div>
        <div className="mt-2 text-[11px] text-slate-600">
          <b>Acción:</b> {etapa.action}
        </div>
        <div
          className={`mt-3 pt-2 border-t border-white/80 text-[10px] font-bold ${accents.text} flex items-center gap-1 uppercase tracking-wider`}
        >
          <i className="bx bx-list-ul" /> Click para ver clientes
        </div>
      </div>
    </div>
  );
}

export default function PipelineFunnel({ resumen, onOpenDrawer }) {
  const etapas = [
    {
      key: "manual",
      cat: "acceso_manual",
      label: "Acceso manual (sin tarjeta)",
      desc: "Tienen plan activo PERO no han ingresado tarjeta de pago",
      detalle:
        "Mayoritariamente clientes del curso 'Method Ecommerce' a quienes activaste el plan manualmente por 30/90/180 días según su membresía. Después deben capturar tarjeta o pierden acceso.",
      value: resumen.clientes_acceso_manual,
      color: "amber",
      icon: "bx-key",
      stat: `${resumen.por_convertir_30d} terminan periodo en los próximos 30 días`,
      action: "Capturar tarjeta antes que termine su acceso",
    },
    {
      key: "trial",
      cat: "trial_stripe",
      label: "Trial Stripe (con tarjeta)",
      desc: "Tarjeta ya capturada en Stripe, en periodo de prueba",
      detalle:
        "Stripe los tiene en estado 'trialing'. Cuando termine el plazo (5-7 días o duración variable para Method Ecommerce), Stripe cobra automáticamente.",
      value: resumen.clientes_trial_stripe,
      color: "cyan",
      icon: "bx-credit-card",
      stat: "Próximo cobro automático cuando termine su trial",
      action: "Asegurar que el producto les esté entregando valor",
    },
    {
      key: "pagando",
      cat: "pagando_stripe",
      label: "Pagando ($ MRR)",
      desc: "Suscripción Stripe en estado 'active'",
      detalle:
        "Estos clientes están generando tu MRR real cada mes. Stripe les cobra automáticamente en cada ciclo.",
      value: resumen.clientes_pagando_stripe,
      color: "emerald",
      icon: "bx-check-circle",
      stat: `Aportan ${money0(resumen.mrr_stripe)} de MRR`,
      action: "Reducir churn, evitar cancelaciones",
    },
  ];
  const max = Math.max(...etapas.map((e) => e.value), 1);
  return (
    <Section
      icon="bx-filter"
      title="Pipeline de conversión"
      subtitle="Cómo se mueven los clientes desde acceso gratuito hacia el pago recurrente"
    >
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {etapas.map((e, idx) => (
            <EtapaCard
              key={e.key}
              etapa={e}
              idx={idx}
              max={max}
              onOpen={onOpenDrawer}
            />
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-slate-600 flex items-center gap-2 flex-1">
            <i className="bx bx-info-circle text-slate-400 text-base" />
            <span>
              <b>Trial → Paid:</b> % de clientes que pagaron después de terminar
              periodo gratis (últimos 90 días).
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {pct1(resumen.tasa_conversion_pct)}
            </div>
            <div className="text-xs text-slate-500">
              Muestra
              <br />
              <span className="font-mono">
                {resumen.conversion_muestra?.convertidos || 0}/
                {resumen.conversion_muestra?.total || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
