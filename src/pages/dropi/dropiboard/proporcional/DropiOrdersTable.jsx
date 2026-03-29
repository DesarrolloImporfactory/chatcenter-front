import React from "react";
import { STATUS_CATEGORIES } from "../dropiHelpers";

export default function DropiOrdersTable({ orders, statusKey, totalCount }) {
  if (!orders || orders.length === 0) return null;

  const cat = STATUS_CATEGORIES[statusKey] || {
    label: "Órdenes",
    color: "#64748b",
  };

  const urgentCount =
    statusKey === "retiro_agencia"
      ? orders.filter((o) => o.days >= 5).length
      : 0;

  // Icono según estado
  const statusIcon = {
    pendiente: (
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    ),
    en_transito: (
      <>
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </>
    ),
    entregada: (
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
    ),
    retiro_agencia: (
      <>
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </>
    ),
    novedad: (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
    devolucion: <path d="M9 14l-4-4 4-4M5 10h11a4 4 0 010 8h-1" />,
    cancelada: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </>
    ),
    indemnizada: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
  };

  // Color de fila según días (solo relevante para retiro_agencia y novedad)
  const showDaysColumn =
    statusKey === "retiro_agencia" ||
    statusKey === "novedad" ||
    statusKey === "pendiente";

  return (
    <div
      className="mb-6 rounded-2xl border-2 overflow-hidden shadow-sm"
      style={{
        borderColor: `${cat.color}40`,
        background: `linear-gradient(135deg, ${cat.color}08, white 60%)`,
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${cat.color}15` }}
        >
          <svg
            className="w-5 h-5"
            style={{ color: cat.color }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {statusIcon[statusKey] || (
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83" />
            )}
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold" style={{ color: cat.color }}>
            {cat.label}
          </h3>
          <p className="text-[10px] text-slate-400">
            Órdenes en estado{" "}
            <span className="font-semibold">{cat.label.toLowerCase()}</span>
            {totalCount > orders.length && (
              <span>
                {" "}
                · mostrando {orders.length} de {totalCount}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-red-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full animate-pulse">
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {urgentCount} urgente{urgentCount > 1 ? "s" : ""}
            </span>
          )}
          <span
            className="text-white text-xs font-extrabold px-3 py-1 rounded-full"
            style={{ background: cat.color }}
          >
            {totalCount || orders.length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[400px]">
        <table className="w-full text-sm">
          <thead
            className="sticky top-0 backdrop-blur-sm"
            style={{ background: `${cat.color}08` }}
          >
            <tr
              className="text-[10px] uppercase tracking-wider"
              style={{ color: cat.color }}
            >
              <th className="text-left px-3 py-2 font-semibold"># Orden</th>
              <th className="text-left px-3 py-2 font-semibold">Cliente</th>
              <th className="text-left px-3 py-2 font-semibold">Teléfono</th>
              <th className="text-left px-3 py-2 font-semibold">Ciudad</th>
              <th className="text-left px-3 py-2 font-semibold">Courier</th>
              <th className="text-left px-3 py-2 font-semibold">Guía</th>
              <th className="text-right px-3 py-2 font-semibold">Valor</th>
              {showDaysColumn && (
                <th className="text-center px-3 py-2 font-semibold">Días</th>
              )}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const isUrgent = o.days >= 5;
              const isWarning = o.days >= 3 && o.days < 5;

              return (
                <tr
                  key={o.id}
                  className={`border-t transition ${
                    isUrgent && showDaysColumn ? "bg-red-50/40" : ""
                  }`}
                  style={{ borderColor: `${cat.color}15` }}
                >
                  <td className="px-3 py-2 font-bold text-slate-900 text-xs">
                    #{o.id}
                  </td>
                  <td className="px-3 py-2 text-slate-700 text-xs">
                    {`${o.name || ""} ${o.surname || ""}`.trim() || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {o.phone ? (
                      <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                        <svg
                          className="w-3 h-3 text-emerald-500"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.624-1.474A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-2.168 0-4.19-.577-5.94-1.588l-.425-.254-2.742.875.876-2.685-.278-.442A9.776 9.776 0 012.182 12c0-5.423 4.395-9.818 9.818-9.818S21.818 6.577 21.818 12 17.423 21.818 12 21.818z" />
                        </svg>
                        {o.phone}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-xs">
                    {o.city || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px]">
                      {o.shipping_company || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">
                    {o.shipping_guide || "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800 text-xs">
                    ${Number(o.total_order || 0).toFixed(2)}
                  </td>
                  {showDaysColumn && (
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isUrgent
                            ? "bg-red-100 text-red-700"
                            : isWarning
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isUrgent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        )}
                        {o.days}d
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
