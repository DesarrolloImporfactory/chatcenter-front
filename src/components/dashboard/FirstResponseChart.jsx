import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import ChartShell from "./ChartShell";

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "Sin datos";
  const s = Math.max(0, Number(seconds) || 0);

  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m} min`;
  return `${sec} seg`;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const hour = payload[0]?.payload?.hour || "N/A";
  const avgSeconds = payload[0]?.payload?.avgSeconds;
  const chats = payload[0]?.payload?.chats || 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <div className="border-b border-slate-100 pb-2">
        <div className="text-sm font-semibold text-slate-900">Hora: {hour}</div>
      </div>
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-slate-500">Tiempo promedio:</span>
          <span className="text-sm font-bold text-blue-700">
            {formatDuration(avgSeconds)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-slate-500">Chats:</span>
          <span className="text-sm font-semibold text-slate-700">{chats}</span>
        </div>
      </div>
    </div>
  );
};

export default function FirstResponseChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <ChartShell
        title="Tiempo de Primera Respuesta por Hora"
        explanation="Muestra qué tan rápido el equipo da la primera respuesta a lo largo del día"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <i className="bx bx-time-five text-3xl text-slate-400"></i>
            </div>
            <div className="mt-3 text-sm font-medium text-slate-700">
              No hay datos disponibles
            </div>
            <div className="mt-1 text-xs text-slate-500">
              No se registraron respuestas en este período
            </div>
          </div>
        </div>
      </ChartShell>
    );
  }

  return (
    <ChartShell
      title="Tiempo de Primera Respuesta por Hora"
      explanation="Promedio de tiempo entre el primer mensaje del cliente y la primera respuesta del equipo, agrupado por hora del día"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 30, bottom: 10, left: 10 }}
        >
          <defs>
            <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
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
            tickFormatter={(v) => (v ? formatDuration(v) : "0s")}
            style={{ fontSize: "11px" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="avgSeconds"
            stroke="#3b82f6"
            strokeWidth={3}
            fill="url(#colorTime)"
            dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
