import React from "react";
import { classNames, formatPct } from "../../utils/parseEventDef";

function Progress({ pct, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-400",
    sky: "bg-sky-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
  };

  return (
    <div className="h-3 w-full rounded-full bg-slate-200">
      <div
        className={classNames("h-3 rounded-full", tones[tone] || tones.emerald)}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export default function SlaToday({ data }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 text-sm font-semibold tracking-wide text-slate-700">
        • CUMPLIMIENTO SLA HOY
      </div>

      <div className="mb-4">
        <div className="flex items-end justify-between">
          <div className="text-sm text-slate-500">General</div>
          <div className="text-5xl font-extrabold text-emerald-300">
            {formatPct(data.generalPct, 1)}
          </div>
        </div>
        <div className="mt-3">
          <Progress pct={data.generalPct} tone="emerald" />
          <div className="mt-2 flex justify-between text-xs bg-slate-400">
            <span>0%</span>
            <span>Meta {formatPct(data.metaPct, 0)}</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {data.channels.map((c) => (
          <div key={c.name}>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm text-white/55">{c.name}</div>
              <div
                className={classNames(
                  "text-lg font-bold",
                  c.pct >= 90 ? "text-emerald-300" : "text-amber-300",
                )}
              >
                {formatPct(c.pct, 0)}
              </div>
            </div>
            <Progress pct={c.pct} tone={c.pct >= 90 ? "emerald" : "amber"} />
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
          <div className="text-5xl font-extrabold text-sky-300">
            {data.resolvedToday}
          </div>
          <div className="mt-1 text-xs tracking-widest bg-slate-400">
            RESUELTOS HOY
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
          <div className="text-5xl font-extrabold text-rose-400">
            {data.abandoned}
          </div>
          <div className="mt-1 text-xs tracking-widest bg-slate-400">
            ABANDONADOS
          </div>
        </div>
      </div>
    </div>
  );
}
