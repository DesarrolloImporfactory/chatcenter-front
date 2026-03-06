import React from "react";

export default function ChartShell({ title, explanation, children }) {
  return (
    <div className="flex h-[400px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {explanation && (
          <p className="mt-1 text-xs text-slate-500">{explanation}</p>
        )}
      </div>

      {/* Chart content */}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
