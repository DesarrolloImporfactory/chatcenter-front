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

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const hour = payload[0]?.payload?.hour || "N/A";
  const chats = payload[0]?.value || 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <div className="border-b border-slate-100 pb-2">
        <div className="text-sm font-semibold text-slate-900">Hora: {hour}</div>
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold text-blue-700">{chats}</div>
        <div className="mt-1 text-xs text-slate-500">chats creados</div>
      </div>
    </div>
  );
};

export default function ChatsCreatedChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <ChartShell
        title="Chats Creados por Hora"
        explanation="Distribución horaria de las conversaciones iniciadas por los clientes"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <i className="bx bx-message-square-add text-3xl text-slate-400"></i>
            </div>
            <div className="mt-3 text-sm font-medium text-slate-700">
              No hay datos disponibles
            </div>
            <div className="mt-1 text-xs text-slate-500">
              No se crearon chats en este período
            </div>
          </div>
        </div>
      </ChartShell>
    );
  }

  const total = data.reduce((sum, item) => sum + (Number(item.chats) || 0), 0);

  return (
    <ChartShell
      title="Chats Creados por Hora"
      explanation="Cantidad de nuevas conversaciones iniciadas por clientes en cada hora del día"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 30, bottom: 10, left: 10 }}
        >
          <defs>
            <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
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
            style={{ fontSize: "12px" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="chats"
            stroke="#3b82f6"
            strokeWidth={3}
            fill="url(#colorCreated)"
            dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Resumen */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <i className="bx bx-message-square-add text-lg text-blue-600"></i>
            <span className="text-xs font-medium text-slate-600">
              Total en el período
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
