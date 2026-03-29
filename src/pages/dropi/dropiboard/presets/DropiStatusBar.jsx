import React from "react";
import { STATUS_CATEGORIES, DISPLAY_ORDER } from "../dropiHelpers";

export default function DropiStatusBar({
  statusStats,
  totalOrders,
  activeFilter,
  onFilterStatus,
}) {
  if (!totalOrders || totalOrders === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Estados
          </h3>
          {activeFilter && (
            <button
              onClick={() => onFilterStatus?.(null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition"
            >
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Quitar filtro
            </button>
          )}
        </div>
        <span className="text-[10px] text-slate-400">
          Click en una tarjeta para ver sus órdenes
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {DISPLAY_ORDER.map((key) => {
          const cat = STATUS_CATEGORIES[key];
          if (!cat) return null;

          const count = statusStats[key]?.count || 0;
          const money = statusStats[key]?.money || 0;
          const isActive = activeFilter === key;
          const hasOrders = count > 0;

          return (
            <button
              key={key}
              onClick={() => {
                if (!hasOrders) return;
                onFilterStatus?.(isActive ? null : key);
              }}
              disabled={!hasOrders}
              className={`relative rounded-xl p-3 text-left transition-colors duration-200 group ${
                hasOrders
                  ? "cursor-pointer active:scale-[0.98]"
                  : "cursor-default opacity-50"
              }`}
              style={{
                background: isActive ? `${cat.color}15` : "white",
                border: isActive
                  ? `2px solid ${cat.color}`
                  : "1px solid #e2e8f0",
                boxShadow: isActive
                  ? `0 4px 12px ${cat.color}20`
                  : "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              {/* Indicator dot cuando está activo */}
              {isActive && (
                <div
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse"
                  style={{ background: cat.color }}
                />
              )}

              <div className="flex items-center gap-1.5 mb-1">
                <div
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: cat.color }}
                />
                <span
                  className="text-[10px] font-bold uppercase tracking-wide truncate"
                  style={{ color: isActive ? cat.color : "#64748b" }}
                >
                  {cat.label}
                </span>
              </div>

              <div
                className="text-lg font-extrabold leading-tight"
                style={{ color: isActive ? cat.color : "#1e293b" }}
              >
                {count}
              </div>

              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                $
                {money.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
