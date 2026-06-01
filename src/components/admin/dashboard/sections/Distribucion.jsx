import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import Section from "../shared/Section";
import { num } from "../utils";

function DonutTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-lg shadow-lg ring-1 ring-slate-200 px-3 py-2 text-xs">
      <div className="font-bold text-slate-900 flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-sm"
          style={{ background: d.color }}
        />
        {d.name}
      </div>
      <div className="text-slate-700 mt-1">
        <b>{num(d.value)}</b> clientes ({((d.value / total) * 100).toFixed(1)}%)
      </div>
    </div>
  );
}

function EstadoCard({ icon, color, label, value, total, explain, onClick }) {
  const colors = {
    emerald:
      "text-emerald-700 bg-emerald-50 ring-emerald-200 hover:ring-emerald-400",
    cyan: "text-cyan-700 bg-cyan-50 ring-cyan-200 hover:ring-cyan-400",
    amber: "text-amber-700 bg-amber-50 ring-amber-200 hover:ring-amber-400",
    violet:
      "text-violet-700 bg-violet-50 ring-violet-200 hover:ring-violet-400",
    sky: "text-sky-700 bg-sky-50 ring-sky-200 hover:ring-sky-400",
    pink: "text-pink-700 bg-pink-50 ring-pink-200 hover:ring-pink-400",
    slate: "text-slate-700 bg-slate-100 ring-slate-200 hover:ring-slate-400",
    orange:
      "text-orange-700 bg-orange-50 ring-orange-200 hover:ring-orange-400",
    rose: "text-rose-700 bg-rose-50 ring-rose-200 hover:ring-rose-400",
  }[color];
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm text-left hover:shadow-md hover:border-slate-400 transition group"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div
          className={`h-7 w-7 rounded-md flex items-center justify-center ring-1 ${colors}`}
        >
          <i className={`bx ${icon} text-base`} />
        </div>
        <i className="bx bx-chevron-right text-slate-300 group-hover:text-cyan-600 transition" />
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </div>
      <div className="text-xl font-extrabold text-slate-900 leading-tight">
        {num(value)}
      </div>
      <div className="text-[10px] text-slate-400 mt-0.5">
        {pct.toFixed(1)}% del total BD
      </div>
      <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 leading-snug">
        {explain}
      </div>
    </button>
  );
}

export default function Distribucion({
  resumen,
  distribucion,
  totalDistribucion,
  onOpenDrawer,
}) {
  const cards = [
    {
      icon: "bx-check-circle",
      color: "emerald",
      label: "Pagando Stripe",
      value: resumen.clientes_pagando_stripe,
      explain: "Suscripción Stripe activa. Generan MRR.",
      cat: "pagando_stripe",
      titulo: "Pagando Stripe",
    },
    {
      icon: "bx-credit-card",
      color: "cyan",
      label: "Trial Stripe",
      value: resumen.clientes_trial_stripe,
      explain: "Tarjeta capturada, en prueba. Stripe cobrará automático.",
      cat: "trial_stripe",
      titulo: "Trial Stripe",
    },
    {
      icon: "bx-key",
      color: "amber",
      label: "Acceso manual",
      value: resumen.clientes_acceso_manual,
      explain:
        "Plan activo SIN tarjeta. Curso Method Ecommerce y cortesías implícitas.",
      cat: "acceso_manual",
      titulo: "Acceso manual (sin tarjeta)",
    },
    {
      icon: "bxs-crown",
      color: "violet",
      label: "Cortesía VIP",
      value: resumen.clientes_cortesia,
      explain: "Permanente=1: equipo interno, partners, demos.",
      cat: "permanentes",
      titulo: "Cortesía VIP",
    },
    {
      icon: "bx-gift",
      color: "sky",
      label: "Trial uso (IL)",
      value: resumen.clientes_trial_usage,
      explain: "10 imágenes gratis para probar Insta Landing.",
      cat: "trial_usage",
      titulo: "Trial uso de Insta Landing",
    },
    {
      icon: "bx-tag",
      color: "pink",
      label: "Código promo",
      value: resumen.clientes_promo_usage,
      explain: "Canjearon código promocional, recursos limitados.",
      cat: "promo_usage",
      titulo: "Código promocional",
    },
    {
      icon: "bx-time-five",
      color: "slate",
      label: "Vencidos",
      value: resumen.clientes_vencidos,
      explain: "Plan expirado. Posibles a recuperar con win-back.",
      cat: "vencidos",
      titulo: "Vencidos",
    },
    {
      icon: "bx-pause-circle",
      color: "orange",
      label: "Suspendidos",
      value: resumen.clientes_suspendidos,
      explain: "Pago Stripe falló. URGENTE: contactar.",
      cat: "suspendidos",
      titulo: "Suspendidos (pago fallido)",
    },
    {
      icon: "bx-block",
      color: "rose",
      label: "Cancelados",
      value: resumen.clientes_cancelados,
      explain: "Cancelaron definitivamente la suscripción.",
      cat: "cancelados",
      titulo: "Cancelados",
    },
    {
      icon: "bx-user",
      color: "slate",
      label: "Inactivos (sin plan)",
      value: resumen.clientes_inactivos,
      explain: "Cuentas creadas sin plan asignado. Posibles a captar.",
      cat: "inactivos",
      titulo: "Inactivos (sin plan)",
    },
  ];

  return (
    <Section
      icon="bx-pie-chart-alt-2"
      title="Distribución de clientes"
      subtitle={`Vista completa de los ${num(resumen.total_registros_bd)} registros · ${num(totalDistribucion)} con estado clasificable · Click en cada tarjeta para ver la lista`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-700">Vista visual</h3>
            <div className="text-xs text-slate-500">
              <span className="font-bold text-slate-900">
                {num(totalDistribucion)}
              </span>{" "}
              de {num(resumen.total_registros_bd)} totales
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribucion}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {distribucion.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.color}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip total={totalDistribucion} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 mt-2 max-h-48 overflow-y-auto pr-1">
            {distribucion.map((d) => {
              const p = ((d.value / totalDistribucion) * 100).toFixed(1);
              return (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                    style={{ background: d.color }}
                  />
                  <span className="flex-1 text-slate-700 truncate">
                    {d.name}
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {num(d.value)}
                  </span>
                  <span className="text-slate-400 w-10 text-right">{p}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map((c) => (
            <EstadoCard
              key={c.cat}
              icon={c.icon}
              color={c.color}
              label={c.label}
              value={c.value}
              total={resumen.total_registros_bd}
              explain={c.explain}
              onClick={() => onOpenDrawer(c.cat, c.titulo, c.color)}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}
