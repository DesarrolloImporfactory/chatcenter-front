import React from "react";
import { STATUS_CATEGORIES, DISPLAY_ORDER, fmtMoney } from "../dropiHelpers";

export default function DropiStatusBar({ statusStats, totalOrders }) {
  return (
    <>
      {/* ── Status segments ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-slate-200 rounded-2xl overflow-hidden shadow-sm mb-1.5">
        {DISPLAY_ORDER.map((key) => {
          const cat = STATUS_CATEGORIES[key];
          const stat = statusStats[key] || { count: 0, money: 0 };
          const isHighlight = key === "retiro_agencia" && stat.count > 0;

          return (
            <div
              key={key}
              className={`bg-white px-3 py-4 text-center transition hover:bg-slate-50 relative ${
                isHighlight ? "ring-1 ring-inset ring-orange-200" : ""
              }`}
            >
              {isHighlight && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span
                  className="w-2 h-2 rounded-full inline-block shrink-0"
                  style={{ background: cat.color }}
                />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  {cat.label}
                </span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900">
                {stat.count}
              </p>
              <p
                className="text-xs font-semibold mt-0.5"
                style={{ color: cat.color }}
              >
                {fmtMoney(stat.money)}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Proportional bar ── */}
      {totalOrders > 0 && (
        <div className="h-2 flex rounded-full overflow-hidden mb-6 shadow-sm">
          {DISPLAY_ORDER.map((key) => {
            const stat = statusStats[key] || { count: 0 };
            const pct = (stat.count / totalOrders) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={key}
                className="h-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: STATUS_CATEGORIES[key].color,
                }}
                title={`${STATUS_CATEGORIES[key].label}: ${stat.count} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
