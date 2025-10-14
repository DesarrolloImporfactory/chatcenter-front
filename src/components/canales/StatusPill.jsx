import React from "react";

export default function StatusPill({ status }) {
  const MAP = {
    connected: {
      cls: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      label: "Conectado",
    },
    disconnected: {
      cls: "bg-rose-100 text-rose-700 border border-rose-200",
      label: "Desconectado",
    },
    pending: {
      cls: "bg-amber-100 text-amber-700 border border-amber-200",
      label: "Pendiente",
    },
  };
  const v = MAP[status] || MAP.disconnected;
  return (
    <span className={`text-xs px-2 py-1 rounded-lg ${v.cls}`}>{v.label}</span>
  );
}
