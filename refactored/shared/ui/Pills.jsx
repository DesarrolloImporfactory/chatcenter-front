/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  CAPA SHARED — Pills / Badges reutilizables               ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Extraído de: src/components/chat/Sidebar.jsx             ║
 * ║  Los componentes PillCanal, PillEstado, PillEncargado     ║
 * ║  pueden ser usados en Sidebar, ContactosKanban, etc.      ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import React from "react";

/* ─────── Estilos de canal ─────── */

const CHANNEL_STYLES = {
  wa: {
    icon: "bx bxl-whatsapp",
    cls: "bg-green-50 text-green-700 border border-green-200",
  },
  ms: {
    icon: "bx bxl-messenger",
    cls: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  ig: {
    icon: "bx bxl-instagram",
    cls: "bg-red-50 text-red-700 border border-red-200",
  },
};

/* ─────── Normalizador de canal ─────── */

/**
 * Normaliza variantes de nombre de canal a "wa" | "ms" | "ig" | null.
 * Acepta: "whatsapp", "wsp", "wp", "messenger", "fb", "instagram", "insta", etc.
 */
export function getChannelKey(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim().toLowerCase();
  if (["wa", "whatsapp", "wsp", "wp"].includes(s)) return "wa";
  if (["ms", "messenger", "fb", "facebook", "facebook messenger"].includes(s))
    return "ms";
  if (["ig", "instagram", "insta"].includes(s)) return "ig";
  return null;
}

/* ─────── Componentes ─────── */

/**
 * Pill que muestra el ícono del canal (WhatsApp / Messenger / Instagram).
 */
export function PillCanal({ source }) {
  const key = getChannelKey(source);
  const cfg = key ? CHANNEL_STYLES[key] : null;
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.cls}`}
    >
      <i className={`${cfg.icon} text-sm`} aria-hidden="true" />
    </span>
  );
}

/**
 * Pill genérica de estado con dot coloreado.
 */
export function PillEstado({ texto, colorClass }) {
  if (!texto) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-[3px] text-[10px] font-semibold uppercase tracking-wide text-slate-700 transition-colors duration-200"
      title={`Estado: ${texto}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${colorClass || "bg-slate-400"}`}
      />
      {texto}
    </span>
  );
}

/**
 * Pill de encargado (visualmente idéntica a PillEstado).
 */
export function PillEncargado({ texto, colorClass }) {
  if (!texto) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-[3px] text-[10px] font-semibold tracking-wide text-slate-700 transition-colors duration-200"
      title={`Encargado: ${texto}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${colorClass || "bg-slate-400"}`}
      />
      {texto}
    </span>
  );
}
