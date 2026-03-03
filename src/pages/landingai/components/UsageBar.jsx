import React from "react";

const UsageBar = ({ usage, compact = false }) => {
  if (!usage || usage.limit <= 0) return null;
  const pct = Math.min((usage.used / usage.limit) * 100, 100);
  const isEmpty = usage.remaining <= 0;
  const isLow = usage.remaining <= 3 && usage.remaining > 0;

  return (
    <div
      className={`rounded-xl border ${
        isEmpty
          ? "border-rose-200 bg-rose-50"
          : isLow
            ? "border-amber-200 bg-amber-50"
            : "border-emerald-200 bg-emerald-50"
      } ${compact ? "p-2" : "p-3"}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={`text-[11px] font-bold flex items-center gap-1.5 ${
            isEmpty
              ? "text-rose-700"
              : isLow
                ? "text-amber-700"
                : "text-emerald-700"
          }`}
        >
          <i className="bx bx-bar-chart-alt-2 text-sm" />
          {isEmpty
            ? "Límite alcanzado"
            : `${usage.remaining} restante${usage.remaining !== 1 ? "s" : ""}`}
        </span>
        <span className="text-[10px] text-gray-500 font-semibold">
          {usage.used}/{usage.limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/80 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isEmpty ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!compact && usage.plan && (
        <p className="text-[10px] text-gray-400 mt-1.5">
          {usage.plan} · Se renueva cada mes
        </p>
      )}
    </div>
  );
};

export default UsageBar;
