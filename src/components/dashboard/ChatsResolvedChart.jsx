import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import ChartShell from "./ChartShell";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const hour = payload[0]?.payload?.hour || "N/A";
  const resolved = payload[0]?.value || 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <div className="border-b border-slate-100 pb-2">
        <div className="text-sm font-semibold text-slate-900">Hora: {hour}</div>
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold text-green-700">{resolved}</div>
        <div className="mt-1 text-xs text-slate-500">chats resueltos</div>
      </div>
    </div>
  );
};

export default function ChatsResolvedChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <ChartShell
        title="Chats Resueltos por Hora"
        explanation="Distribución horaria de las conversaciones cerradas por el equipo"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <i className="bx bx-message-square-check text-3xl text-slate-400"></i>
            </div>
            <div className="mt-3 text-sm font-medium text-slate-700">
              No hay datos disponibles
            </div>
            <div className="mt-1 text-xs text-slate-500">
              No se resolvieron chats en este período
            </div>
          </div>
        </div>
      </ChartShell>
    );
  }

  const total = data.reduce(
    (sum, item) => sum + (Number(item.resolved) || 0),
    0,
  );

  return (
    <ChartShell
      title="Chats Resueltos por Hora"
      explanation="Cantidad de conversaciones marcadas como cerradas por el equipo en cada hora del día"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 30, bottom: 10, left: 10 }}
        >
          <defs>
            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
          <XAxis
            dataKey="hour"
            stroke="#64748b"
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="#64748b"
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
            style={{ fontSize: "12px" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="resolved"
            stroke="#10b981"
            strokeWidth={3}
            fill="url(#colorResolved)"
            dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Resumen */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <i className="bx bx-message-square-check text-lg text-green-600"></i>
            <span className="text-xs font-medium text-slate-600">
              Total resueltos
            </span>
          </div>
          <span className="text-lg font-bold text-slate-900">
            {total.toLocaleString()}
          </span>
        </div>
      </div>
    </ChartShell>
  );
}
