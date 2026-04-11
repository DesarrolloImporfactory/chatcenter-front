import React, { useState } from "react";

/**
 * AdsboardFilters
 *
 * Barra de filtros idéntica en estilo a DropiFilters:
 * - Presets rápidos: Hoy, 7 días, 15 días, 30 días
 * - Rango de fechas personalizado siempre visible (sin límite de días)
 * - Selector de conexión
 * - Botón Consultar / Ir a Conexiones
 */

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DATE_PRESETS = [
  { label: "Hoy", days: 0 },
  { label: "7 días", days: 7 },
  { label: "15 días", days: 15 },
  { label: "30 días", days: 30 },
];

export default function AdsboardFilters({
  conexiones,
  loadingConexiones,
  selectedConfigId,
  onChangeConfig,
  isAdsConnected,
  dateRange,
  onChangeDateRange,
  onConsultar,
  dashLoading,
  onGoToConexiones,
  selectedConfig,
}) {
  const [activePreset, setActivePreset] = useState(3);
  const todayStr = todayISO();

  const handlePreset = (idx) => {
    setActivePreset(idx);
    const p = DATE_PRESETS[idx];
    const until = todayStr;
    const since = p.days === 0 ? until : daysAgoISO(p.days);
    onChangeDateRange({ since, until });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-6">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        {/* Conexión selector */}
        <div className="min-w-[220px]">
          <div className="mb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Conexión
          </div>
          {loadingConexiones ? (
            <div className="h-[42px] rounded-xl bg-slate-100 animate-pulse" />
          ) : conexiones.length === 0 ? (
            <div className="h-[42px] rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
              Sin conexiones disponibles
            </div>
          ) : (
            <select
              className="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
              value={selectedConfigId || ""}
              onChange={(e) => onChangeConfig(Number(e.target.value))}
            >
              {conexiones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_configuracion || c.telefono || `Config #${c.id}`}
                  {Number(c.meta_ads_conectado) === 1
                    ? ` — ✓ ${c.meta_ads_account_name || "Ads"}`
                    : " — Sin Ads"}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Período */}
        <div className="flex-1">
          <div className="mb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Período
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
              {DATE_PRESETS.map((p, idx) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePreset(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    activePreset === idx
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                className="h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-indigo-400 transition"
                value={dateRange.since}
                max={dateRange.until || todayStr}
                onChange={(e) => {
                  setActivePreset(-1);
                  onChangeDateRange({ ...dateRange, since: e.target.value });
                }}
              />
              <span className="text-slate-300 text-xs">→</span>
              <input
                type="date"
                className="h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-indigo-400 transition"
                value={dateRange.until}
                max={todayStr}
                min={dateRange.since}
                onChange={(e) => {
                  setActivePreset(-1);
                  onChangeDateRange({ ...dateRange, until: e.target.value });
                }}
              />
            </div>
          </div>
        </div>

        {/* Action */}
        {isAdsConnected ? (
          <button
            onClick={onConsultar}
            disabled={dashLoading}
            className="h-[42px] shrink-0 rounded-xl px-6 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50 bg-gradient-to-r from-indigo-600 to-indigo-700"
          >
            {dashLoading ? (
              <span className="inline-flex items-center gap-2">
                <i className="bx bx-loader-alt animate-spin" /> Cargando...
              </span>
            ) : (
              "Consultar"
            )}
          </button>
        ) : (
          <button
            onClick={onGoToConexiones}
            className="h-[42px] shrink-0 rounded-xl px-5 text-sm font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 hover:bg-indigo-100 transition inline-flex items-center gap-2"
          >
            <i className="bx bx-link-external" /> Ir a Conexiones
          </button>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400">
        {selectedConfig && (
          <>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium border border-indigo-100">
              {selectedConfig.telefono || "Sin teléfono"}
            </span>
            <span>{selectedConfig.nombre_configuracion}</span>
          </>
        )}
        {!isAdsConnected && selectedConfigId && (
          <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
            <i className="bx bx-info-circle" /> Esta conexión no tiene Meta Ads
            vinculado. Conéctalo desde Conexiones.
          </span>
        )}
      </div>
    </div>
  );
}
