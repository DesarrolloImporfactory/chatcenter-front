import React, { useState, useEffect, useRef, useMemo } from "react";
import chatApi from "../../../../api/chatcenter";
import { toYMD } from "../dropiHelpers";

// ═══════════════════════════════════════════════════════════════
// DropiFilters — Selector de integración + rango de fechas
// ═══════════════════════════════════════════════════════════════

// ── Presets de fecha ──
const DATE_PRESETS = [
  { label: "Hoy", days: 0 },
  { label: "7 días", days: 7 },
  { label: "15 días", days: 15 },
  { label: "30 días", days: 30 },
  { label: "Este mes", days: "month" },
];

function getPresetRange(preset) {
  const today = new Date();
  const until = toYMD(today);

  if (preset.days === "month") {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toYMD(firstDay), until };
  }

  if (preset.days === 0) {
    return { from: until, until };
  }

  const from = new Date();
  from.setDate(today.getDate() - preset.days);
  return { from: toYMD(from), until };
}

export default function DropiFilters({
  selectedIntegration,
  onChangeIntegration,
  dateRange,
  onChangeDateRange,
  onApply,
  loading,
}) {
  const [integrations, setIntegrations] = useState([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [activePreset, setActivePreset] = useState(1); // default "7 días"

  useEffect(() => {
    const fetchIntegrations = async () => {
      setLoadingIntegrations(true);
      try {
        const { data } = await chatApi.get(
          "dropi_integrations/all-my-integrations",
        );
        const items = data?.data || [];
        setIntegrations(items);
        if (items.length > 0 && !selectedIntegration) {
          onChangeIntegration(items[0]);
        }
      } catch (e) {
        console.error("Error fetching integrations:", e);
      } finally {
        setLoadingIntegrations(false);
      }
    };
    fetchIntegrations();
  }, []);
  const handlePreset = (idx) => {
    setActivePreset(idx);
    const range = getPresetRange(DATE_PRESETS[idx]);
    onChangeDateRange(range);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-6">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        {/* ── Integración selector ── */}
        <div className="min-w-[220px]">
          <div className="mb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Conexión Dropi
          </div>
          <select
            className="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#00BFFF] focus:ring-2 focus:ring-[#00BFFF]/15 transition"
            value={selectedIntegration?.id || ""}
            onChange={(e) => {
              const found = integrations.find(
                (i) => String(i.id) === e.target.value,
              );
              if (found) onChangeIntegration(found);
            }}
            disabled={loadingIntegrations}
          >
            {loadingIntegrations && (
              <option value="">Cargando integraciones...</option>
            )}
            {!loadingIntegrations && integrations.length === 0 && (
              <option value="">Sin integraciones Dropi</option>
            )}
            {integrations.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── Date presets ── */}
        <div className="flex-1">
          <div className="mb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Período
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Preset pills */}
            <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
              {DATE_PRESETS.map((p, idx) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePreset(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    activePreset === idx
                      ? "bg-[#0B1426] text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom dates */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-[#00BFFF] transition"
                value={dateRange.from}
                onChange={(e) => {
                  setActivePreset(-1);
                  onChangeDateRange({ ...dateRange, from: e.target.value });
                }}
              />
              <span className="text-slate-300 text-xs">→</span>
              <input
                type="date"
                className="h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-[#00BFFF] transition"
                value={dateRange.until}
                onChange={(e) => {
                  setActivePreset(-1);
                  onChangeDateRange({ ...dateRange, until: e.target.value });
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Apply button ── */}
        <button
          onClick={onApply}
          disabled={loading || !selectedIntegration}
          className="h-[42px] shrink-0 rounded-xl px-6 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #00BFFF 0%, #0090cc 100%)",
          }}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  opacity="0.25"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
              Cargando...
            </span>
          ) : (
            "Consultar"
          )}
        </button>
      </div>

      {/* ── Info text ── */}
      <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400">
        {selectedIntegration && (
          <>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
              {selectedIntegration.type === "user"
                ? "👤 Usuario"
                : "📱 Conexión"}
            </span>
            <span>
              {selectedIntegration.store_name} ·{" "}
              {selectedIntegration.country_code}
            </span>
          </>
        )}
        {!selectedIntegration && !loadingIntegrations && (
          <span className="text-amber-500 font-medium">
            Vincule una integración Dropi para usar el dashboard
          </span>
        )}
      </div>
    </div>
  );
}
