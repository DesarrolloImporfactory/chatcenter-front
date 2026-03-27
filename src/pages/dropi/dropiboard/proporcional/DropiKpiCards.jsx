import React from "react";
import { fmtMoney, fmtNum } from "../dropiHelpers";

// ── SVG Icons ──
const IconOrders = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3h18v18H3z" opacity="0" />
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconCheck = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconReturn = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const IconTicket = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const IconPackage = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const KPIS = [
  {
    key: "totalOrders",
    label: "Total Pedidos",
    Icon: IconOrders,
    color: "#00BFFF",
    bg: "bg-sky-50",
  },
  {
    key: "entregadas",
    label: "Entregadas",
    Icon: IconCheck,
    color: "#10B981",
    bg: "bg-emerald-50",
  },
  {
    key: "devoluciones",
    label: "Devoluciones",
    Icon: IconReturn,
    color: "#EF4444",
    bg: "bg-red-50",
  },
  {
    key: "ticketProm",
    label: "Ticket Promedio",
    Icon: IconTicket,
    color: "#8B5CF6",
    bg: "bg-violet-50",
  },
  {
    key: "retiro",
    label: "Retiro Agencia",
    Icon: IconPackage,
    color: "#FF6B35",
    bg: "bg-orange-50",
  },
];

export default function DropiKpiCards({ kpis }) {
  const cards = [
    {
      ...KPIS[0],
      value: fmtNum(kpis.totalOrders),
      sub: `$${kpis.totalMoney.toFixed(0)} en valor`,
    },
    {
      ...KPIS[1],
      value: fmtNum(kpis.entregadas),
      sub: `${kpis.tasaEntrega.toFixed(1)}% tasa entrega`,
    },
    {
      ...KPIS[2],
      value: fmtNum(kpis.devoluciones),
      sub: `${kpis.tasaDevolucion.toFixed(1)}% tasa devolución`,
    },
    {
      ...KPIS[3],
      value: fmtMoney(kpis.ticketPromedio),
      sub: "por pedido entregado",
    },
    {
      ...KPIS[4],
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
            <div
              className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}
              style={{ color: c.color }}
            >
              <c.Icon />
            </div>
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
