import React from "react";
import {
  TIPO_CONFIG,
  SCORE_EMOJIS,
  SCORE_COLORS,
} from "../utils/encuestasConstants";

/* ── Badge de tipo ── */
export function TipoBadge({ tipo }) {
  const t = TIPO_CONFIG[tipo] || TIPO_CONFIG.webhook_lead;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.color}`}
    >
      <i className={`bx ${t.icon} text-xs`} />
      {t.label}
    </span>
  );
}

/* ── Score visual ── */
export function ScoreDisplay({ score }) {
  if (score === null || score === undefined)
    return <span className="text-gray-400 text-xs">—</span>;
  const emoji = SCORE_EMOJIS[score] || "";
  return (
    <span className={`font-bold ${SCORE_COLORS[score] || "text-gray-600"}`}>
      {emoji} {score}/5
    </span>
  );
}

/* ── Barra de NPS ── */
export function NpsBar({ promotores = 0, neutrales = 0, detractores = 0 }) {
  const total = promotores + neutrales + detractores;
  if (total === 0) return <p className="text-xs text-gray-400">Sin datos</p>;
  const pPct = (promotores / total) * 100;
  const nPct = (neutrales / total) * 100;
  const dPct = (detractores / total) * 100;
  const nps = Math.round(((promotores - detractores) / total) * 100);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-gray-500">NPS</span>
        <span
          className={`text-sm font-bold ${nps >= 0 ? "text-emerald-600" : "text-red-600"}`}
        >
          {nps}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex bg-gray-100">
        {pPct > 0 && (
          <div className="bg-emerald-400" style={{ width: `${pPct}%` }} />
        )}
        {nPct > 0 && (
          <div className="bg-yellow-300" style={{ width: `${nPct}%` }} />
        )}
        {dPct > 0 && (
          <div className="bg-red-400" style={{ width: `${dPct}%` }} />
        )}
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-emerald-500">
          Promotores ({promotores})
        </span>
        <span className="text-[9px] text-red-400">
          Detractores ({detractores})
        </span>
      </div>
    </div>
  );
}
