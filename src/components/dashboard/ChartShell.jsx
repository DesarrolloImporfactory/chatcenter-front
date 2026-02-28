import React from "react";

export default function ChartShell({ title, rightActions, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        {rightActions ? (
          <div className="text-xs text-slate-600">{rightActions}</div>
        ) : null}
      </div>
      <div className="h-[320px]">{children}</div>
    </div>
  );
}
