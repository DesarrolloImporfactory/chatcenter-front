import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import Section from "../shared/Section";
import { money0, num } from "../utils";

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-lg shadow-lg ring-1 ring-slate-200 p-3 text-xs">
      <div className="font-bold text-slate-900 mb-1 flex items-center gap-2">
        {d.label}
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${d.is_estimated ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
        >
          {d.is_estimated ? "ESTIMADO" : "REAL"}
        </span>
      </div>
      <div className="space-y-0.5 text-slate-600">
        <div>
          {d.is_estimated ? "MRR potencial" : "MRR Stripe"}:{" "}
          <b className="text-slate-900 ml-1">{money0(d.mrr_render)}</b>
        </div>
        <div>
          Activos: <b className="text-slate-900">{num(d.clientes_activos)}</b>
        </div>
        <div className="text-emerald-600">Nuevos mes: +{num(d.nuevos_mes)}</div>
        <div className="text-rose-600">
          Cancelados: -{num(d.cancelados_mes)}
        </div>
      </div>
    </div>
  );
}

export default function EvolucionChart({ serieChart, indiceCorte }) {
  return (
    <Section
      icon="bx-line-chart"
      title="Evolución 12 meses"
      subtitle="MRR mes a mes · Punteada = estimado · Sólida = real desde mayo 2026"
    >
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-4 text-xs flex-wrap text-slate-600">
          <span className="flex items-center gap-1.5">
            <span
              className="h-[2px] w-6 inline-block"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, #f59e0b 0 4px, transparent 4px 8px)",
              }}
            />
            Estimado (potencial)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-[2px] w-6 bg-emerald-500 inline-block" />
            MRR Stripe real
          </span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={serieChart}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="mrrGradLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={{ stroke: "#E5E7EB" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
                }
              />
              <Tooltip content={<ChartTooltip />} />
              {indiceCorte > 0 && (
                <ReferenceLine
                  x={serieChart[indiceCorte].label}
                  stroke="#10B981"
                  strokeDasharray="4 4"
                  label={{
                    value: "Real desde aquí",
                    position: "insideTopLeft",
                    fill: "#10B981",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="mrr_render"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#mrrGradLight)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Section>
  );
}
