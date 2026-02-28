import React from "react";
import { classNames, formatDuration } from "../../utils/parseEventDef";

function PriorityPill({ value }) {
  const map = {
    Alta: "bg-rose-50 text-rose-700 border-rose-200",
    Media: "bg-amber-50 text-amber-700 border-amber-200",
    Baja: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs",
        map[value] || map.Media,
      )}
    >
      ● {value}
    </span>
  );
}

function ChannelBadge({ value }) {
  const v = (value ?? "").toString().toLowerCase();

  const label =
    v === "wa"
      ? "WhatsApp"
      : v === "ig"
        ? "Instagram"
        : v === "ms"
          ? "Messenger"
          : value;

  const map = {
    whatsapp: "text-emerald-700",
    instagram: "text-amber-700",
    messenger: "text-sky-700",
    ms: "text-sky-700",
    wa: "text-emerald-700",
    ig: "text-amber-700",
  };

  return (
    <span
      className={classNames("text-sm font-medium", map[v] || "text-slate-700")}
    >
      {label}
    </span>
  );
}

export default function PendingQueue({ rows }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide text-slate-700">
          • COLA DE CHATS PENDIENTES
        </div>
        <div className="text-xs text-slate-400">Actualizado: ahora</div>
      </div>

      <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[720px] border-collapse">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="text-left text-xs text-slate-500">
              <th className="px-4 py-3">PRIORIDAD</th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">CLIENTE</th>
              <th className="px-4 py-3">CANAL</th>
              <th className="px-4 py-3">ESPERA</th>
              <th className="px-4 py-3">MOTIVO</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5 text-sm">
                <td className="px-4 py-3">
                  <PriorityPill value={r.priority} />
                </td>
                <td className="px-4 py-3 text-slate-600">{r.id}</td>
                <td className="px-4 py-3">{r.client}</td>
                <td className="px-4 py-3">
                  <ChannelBadge value={r.channel} />
                </td>
                <td className="px-4 py-3 font-semibold text-rose-600">
                  {formatDuration(r.waitSeconds)}
                </td>
                <td className="px-4 py-3 text-slate-700">{r.motive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
