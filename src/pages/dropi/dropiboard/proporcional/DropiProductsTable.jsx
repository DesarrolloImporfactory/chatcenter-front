import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  background: "white",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

export default function DropiProductsTable({ topProducts, loading }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* ── Products table ── */}
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
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Top Productos</h3>
          <span className="ml-auto text-[10px] text-slate-400 font-medium">
            {topProducts.length} productos
          </span>
        </div>
        <div className="overflow-auto max-h-[340px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-[10px] uppercase text-[#00BFFF] tracking-wider border-b border-slate-100">
                <th className="text-left px-3 py-2 font-semibold">Producto</th>
                <th className="text-center px-3 py-2 font-semibold">Órd.</th>
                <th className="text-center px-3 py-2 font-semibold">
                  % Entrega
                </th>
                <th className="text-center px-3 py-2 font-semibold">
                  % Devol.
                </th>
                <th className="text-right px-3 py-2 font-semibold">Ingreso</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, idx) => {
                const tasaEntrega =
                  p.ordenes > 0 ? (p.entregadas / p.ordenes) * 100 : 0;
                const tasaDevol =
                  p.ordenes > 0 ? (p.devoluciones / p.ordenes) * 100 : 0;
                return (
                  <tr
                    key={idx}
                    className="border-t border-slate-50 hover:bg-slate-50/50 transition"
                  >
                    <td
                      className="px-3 py-2.5 font-semibold text-slate-900 max-w-[180px] truncate"
                      title={p.name}
                    >
                      {p.name}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-slate-700">
                      {p.ordenes}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          tasaEntrega >= 75
                            ? "bg-emerald-50 text-emerald-700"
                            : tasaEntrega >= 60
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {tasaEntrega.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          tasaDevol <= 15
                            ? "bg-emerald-50 text-emerald-700"
                            : tasaDevol <= 30
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {tasaDevol.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-700">
                      ${p.ingreso.toFixed(0)}
                    </td>
                  </tr>
                );
              })}
              {topProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-slate-400 text-sm"
                  >
                    {loading ? "Cargando..." : "Sin datos de productos"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Devolution % bar chart ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-red-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            % Devolución por Producto
          </h3>
        </div>
        {topProducts.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={topProducts.slice(0, 7).map((p) => ({
                name: p.name.length > 16 ? p.name.slice(0, 16) + "…" : p.name,
                devolucion:
                  p.ordenes > 0
                    ? Number(((p.devoluciones / p.ordenes) * 100).toFixed(1))
                    : 0,
                _raw: p,
              }))}
              layout="vertical"
              margin={{ left: 5, right: 20, top: 5, bottom: 5 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                tickFormatter={(v) => v + "%"}
                axisLine={{ stroke: "#E2E8F0" }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={115}
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => `${v}%`}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="devolucion" radius={[0, 6, 6, 0]} barSize={18}>
                {topProducts.slice(0, 7).map((p, idx) => {
                  const rate =
                    p.ordenes > 0 ? (p.devoluciones / p.ordenes) * 100 : 0;
                  return (
                    <Cell
                      key={idx}
                      fill={
                        rate > 30
                          ? "#EF4444"
                          : rate > 15
                            ? "#F59E0B"
                            : "#10B981"
                      }
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
            Sin datos
          </div>
        )}
      </div>
    </div>
  );
}
