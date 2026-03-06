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

// Paleta de azules profesionales (gradiente de oscuro a claro)
const COLOR_PALETTE = [
  "#1e3a8a", // blue-900
  "#1e40af", // blue-800
  "#1d4ed8", // blue-700
  "#2563eb", // blue-600
  "#3b82f6", // blue-500
  "#60a5fa", // blue-400
  "#93c5fd", // blue-300
  "#bfdbfe", // blue-200
];

// Tooltip profesional
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const name = data.payload.name || "N/A";
  const value = data.value || 0;
  const percentage = data.payload.percentage || 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <div className="border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: data.fill }}
          />
          <div className="max-w-[220px] truncate text-sm font-semibold text-slate-900">
            {name}
          </div>
        </div>
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold text-slate-900">
          {value.toLocaleString()}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {percentage}% del total de chats
        </div>
      </div>
    </div>
  );
};

// Tick personalizado para nombres largos
const CustomXAxisTick = ({ x, y, payload }) => {
  const maxLength = 15;
  let displayName = payload.value || "";

  if (displayName.length > maxLength) {
    displayName = displayName.substring(0, maxLength) + "...";
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        fill="#64748b"
        style={{ fontSize: "12px", fontWeight: 600 }}
      >
        {displayName}
      </text>
    </g>
  );
};

export default function ChatsByConnectionChart({ data }) {
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

  // Ordenar de mayor a menor
  const sortedData = [...dataWithPercentage].sort((a, b) => b.value - a.value);

  if (!data || data.length === 0) {
    return (
      <ChartShell
        title="Distribución por Conexión"
        explanation="Muestra cuántos chats se recibieron en cada número/cuenta configurada"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <i className="bx bx-network-chart text-3xl text-slate-400"></i>
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
      title="Distribución por Conexión"
      explanation="Cantidad de chats recibidos en cada número de WhatsApp, página de Facebook o cuenta de Instagram configurada"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          margin={{ top: 20, right: 30, bottom: 70, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
          <XAxis
            dataKey="name"
            stroke="#64748b"
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
            interval={0}
            tick={<CustomXAxisTick />}
            height={80}
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
          <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={100}>
            {sortedData.map((entry, index) => {
              const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Estadísticas resumen */}
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
          <div className="text-xs font-medium text-slate-500">Total Chats</div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {total.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
          <div className="text-xs font-medium text-slate-500">Conexiones</div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {sortedData.length}
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
          <div className="text-xs font-medium text-slate-500">Promedio</div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {sortedData.length > 0
              ? Math.round(total / sortedData.length).toLocaleString()
              : "0"}
          </div>
        </div>
      </div>

      {/* Top 3 */}
      {sortedData.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
            <i className="bx bx-medal text-sm"></i>
            <span>Conexiones con más conversaciones</span>
          </div>
          <div className="space-y-2">
            {sortedData.slice(0, 3).map((item, index) => {
              const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
              const medals = ["1°", "2°", "3°"];
              return (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md bg-white px-3 py-2 shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                      {medals[index]}
                    </div>
                    <div
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
                      {item.name}
                    </div>
                  </div>
                  <div className="text-xs flex-shrink-0 ml-2">
                    <span className="font-bold text-slate-900">
                      {item.value.toLocaleString()}
                    </span>
                    <span className="ml-1 text-slate-500">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ChartShell>
  );
}
