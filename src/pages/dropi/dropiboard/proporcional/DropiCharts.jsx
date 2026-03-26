import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { fmtShortDate } from "../dropiHelpers";

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  background: "white",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

export default function DropiCharts({ dailyChart, pieData, loading }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      {/* ── Line chart: orders by day ── */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#00BFFF]/10 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-[#00BFFF]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Órdenes por Día</h3>
        </div>
        {dailyChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyChart}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                tickFormatter={fmtShortDate}
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="pedidos"
                stroke="#00BFFF"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#00BFFF", strokeWidth: 0 }}
                name="Pedidos"
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="entregadas"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 3, fill: "#10B981", strokeWidth: 0 }}
                name="Entregadas"
              />
              <Line
                type="monotone"
                dataKey="devoluciones"
                stroke="#EF4444"
                strokeWidth={2}
                dot={{ r: 3, fill: "#EF4444", strokeWidth: 0 }}
                name="Devoluciones"
                strokeDasharray="4 4"
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
            {loading ? "Cargando datos..." : "Sin datos en este rango"}
          </div>
        )}
      </div>

      {/* ── Pie chart: distribution ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#00BFFF]/10 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-[#00BFFF]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
              <path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Distribución</h3>
        </div>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="42%"
                innerRadius={52}
                outerRadius={82}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} órdenes`, name]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
            Sin datos
          </div>
        )}
      </div>
    </div>
  );
}
