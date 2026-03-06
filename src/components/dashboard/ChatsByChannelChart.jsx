import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import ChartShell from "./ChartShell";

// Colores profesionales por canal (azules/grises consistentes)
const CHANNEL_COLORS = {
  WA: "#1e40af", // blue-800
  WHATSAPP: "#1e40af",
  MS: "#3b82f6", // blue-500
  MESSENGER: "#3b82f6",
  IG: "#60a5fa", // blue-400
  INSTAGRAM: "#60a5fa",
};

const DEFAULT_COLOR = "#64748b"; // slate-500

// Tooltip profesional
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const name = data.payload.name || "N/A";
  const value = data.value || 0;
  const percentage = data.payload.percentage || 0;

  const channelNames = {
    WA: "WhatsApp",
    WHATSAPP: "WhatsApp",
    MS: "Messenger",
    MESSENGER: "Messenger",
    IG: "Instagram",
    INSTAGRAM: "Instagram",
  };

  const fullName = channelNames[name] || name;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: data.fill }}
        />
        <div className="text-sm font-semibold text-slate-900">{fullName}</div>
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold text-slate-900">
          {value.toLocaleString()}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {percentage}% del total
        </div>
      </div>
    </div>
  );
};

export default function ChatsByChannelChart({ data }) {
  const total = (data || []).reduce(
    (sum, item) => sum + (Number(item.value) || 0),
    0,
  );

  const dataWithPercentage = (data || []).map((item) => {
    const value = Number(item.value) || 0;
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    return {
      ...item,
      value,
      percentage,
    };
  });

  if (!data || data.length === 0) {
    return (
      <ChartShell
        title="Distribución por Canal"
        explanation="Muestra cuántos chats se recibieron por cada canal de comunicación"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <i className="bx bx-bar-chart-alt text-3xl text-slate-400"></i>
            </div>
            <div className="mt-3 text-sm font-medium text-slate-700">
              No hay datos disponibles
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Ajusta el rango de fechas o los filtros
            </div>
          </div>
        </div>
      </ChartShell>
    );
  }

  return (
    <ChartShell
      title="Distribución por Canal"
      explanation="Cantidad de conversaciones recibidas en cada canal durante el período seleccionado"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={dataWithPercentage}
          margin={{ top: 20, right: 30, bottom: 60, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
          <XAxis
            dataKey="name"
            stroke="#64748b"
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
            style={{ fontSize: "13px", fontWeight: 600 }}
            interval={0}
          />
          <YAxis
            stroke="#64748b"
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
            style={{ fontSize: "12px" }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(148,163,184,0.1)" }}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={80}>
            {dataWithPercentage.map((entry, index) => {
              const channelName = (entry.name || "").toUpperCase();
              const color = CHANNEL_COLORS[channelName] || DEFAULT_COLOR;
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Leyenda limpia sin superposición */}
      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="grid grid-cols-3 gap-3">
          {dataWithPercentage.map((item, index) => {
            const channelName = (item.name || "").toUpperCase();
            const color = CHANNEL_COLORS[channelName] || DEFAULT_COLOR;
            const fullNames = {
              WA: "WhatsApp",
              WHATSAPP: "WhatsApp",
              MS: "Messenger",
              MESSENGER: "Messenger",
              IG: "Instagram",
              INSTAGRAM: "Instagram",
            };
            const displayName = fullNames[channelName] || item.name;

            return (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2"
              >
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-slate-700">
                    {displayName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.value.toLocaleString()} ({item.percentage}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ChartShell>
  );
}
