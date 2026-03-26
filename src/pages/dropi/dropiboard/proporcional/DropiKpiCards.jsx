import React from "react";
import { fmtMoney, fmtNum } from "../dropiHelpers";

const KPIS_CONFIG = [
  { key: "totalOrders", label: "Total Pedidos", icon: "📊", color: "#00BFFF" },
  { key: "entregadas", label: "Entregadas", icon: "✅", color: "#10B981" },
  { key: "devoluciones", label: "Devoluciones", icon: "↩️", color: "#EF4444" },
  { key: "ticketProm", label: "Ticket Promedio", icon: "💰", color: "#8B5CF6" },
  { key: "retiro", label: "Retiro Agencia", icon: "📦", color: "#FF6B35" },
];

export default function DropiKpiCards({ kpis }) {
  const cards = [
    {
      ...KPIS_CONFIG[0],
      value: fmtNum(kpis.totalOrders),
      sub: `$${kpis.totalMoney.toFixed(0)} en valor`,
    },
    {
      ...KPIS_CONFIG[1],
      value: fmtNum(kpis.entregadas),
      sub: `${kpis.tasaEntrega.toFixed(1)}% tasa entrega`,
    },
    {
      ...KPIS_CONFIG[2],
      value: fmtNum(kpis.devoluciones),
      sub: `${kpis.tasaDevolucion.toFixed(1)}% tasa devolución`,
    },
    {
      ...KPIS_CONFIG[3],
      value: fmtMoney(kpis.ticketPromedio),
      sub: "por pedido entregado",
    },
    {
      ...KPIS_CONFIG[4],
      value: fmtNum(kpis.retiroAgencia),
      sub: "pendientes de retiro",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      {cards.map((c) => (
        <div
          key={c.key}
          className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-md transition group"
        >
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              {c.label}
            </p>
            <span className="text-lg leading-none">{c.icon}</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {c.value}
          </p>
          <p className="text-xs mt-1 font-medium" style={{ color: c.color }}>
            {c.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
