import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../../api/chatcenter";
import { toYMD } from "../dropiHelpers";
import VincularDropiModal from "../../../../pages/landingai/modales/VincularDropiModal";

// ── Presets de fecha (máximo 30 días) ──
const DATE_PRESETS = [
  { label: "Hoy", days: 0 },
  { label: "7 días", days: 7 },
  { label: "15 días", days: 15 },
  { label: "30 días", days: 30 },
];

function getPresetRange(preset) {
  const today = new Date();
  const until = toYMD(today);
  if (preset.days === 0) return { from: until, until };
  const from = new Date();
  from.setDate(today.getDate() - preset.days);
  return { from: toYMD(from), until };
}

const MAX_DAYS = 180;

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
  const [activePreset, setActivePreset] = useState(1);

  // ── Vincular Dropi modal (solo cuando no tiene ninguna integración) ──
  const [dropiLinkModal, setDropiLinkModal] = useState(false);

  const fetchIntegrations = async () => {
    setLoadingIntegrations(true);
    try {
      const { data } = await chatApi.get(
        "dropi_integrations/all-my-integrations",
      );
      const items = data?.data || [];
      setIntegrations(items);
      if (items.length > 0 && !selectedIntegration)
        onChangeIntegration(items[0]);
    } catch (e) {
      console.error("Error fetching integrations:", e);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handlePreset = (idx) => {
    setActivePreset(idx);
    onChangeDateRange(getPresetRange(DATE_PRESETS[idx]));
  };

  const handleDropiSaved = () => {
    fetchIntegrations();
  };

  const todayStr = toYMD(new Date());

  const hasNoIntegrations = !loadingIntegrations && integrations.length === 0;

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          {/* ── Integración selector ── */}
          <div className="min-w-[220px]">
            <div className="mb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Conexión Dropi
            </div>

            {hasNoIntegrations ? (
              /* ── Sin integraciones: CTA para vincular ── */
              <button
                onClick={() => setDropiLinkModal(true)}
                className="h-[42px] w-full rounded-xl text-sm font-bold transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,107,53,0.08), rgba(255,107,53,0.04))",
                  border: "1px dashed #FF6B35",
                  color: "#FF6B35",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,107,53,0.12)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    "linear-gradient(135deg, rgba(255,107,53,0.08), rgba(255,107,53,0.04))")
                }
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
                Vincular mi cuenta Dropi
              </button>
            ) : (
              /* ── Con integraciones: select limpio sin gear ── */
              <select
                className="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/15 transition"
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
                {integrations.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* ── Date presets ── */}
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
                        ? "bg-[#FF6B35] text-white shadow-sm"
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
                  className="h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-[#FF6B35] transition"
                  value={dateRange.from}
                  max={dateRange.until || todayStr}
                  onChange={(e) => {
                    setActivePreset(-1);
                    const from = e.target.value;
                    const fromDate = new Date(from + "T00:00:00");
                    const untilDate = new Date(dateRange.until + "T00:00:00");
                    const diffDays = Math.floor(
                      (untilDate - fromDate) / (1000 * 60 * 60 * 24),
                    );
                    if (diffDays > MAX_DAYS) {
                      const maxUntil = new Date(fromDate);
                      maxUntil.setDate(maxUntil.getDate() + MAX_DAYS);
                      onChangeDateRange({ from, until: toYMD(maxUntil) });
                    } else {
                      onChangeDateRange({ ...dateRange, from });
                    }
                  }}
                />
                <span className="text-slate-300 text-xs">→</span>
                <input
                  type="date"
                  className="h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-[#FF6B35] transition"
                  value={dateRange.until}
                  max={todayStr}
                  min={dateRange.from}
                  onChange={(e) => {
                    setActivePreset(-1);
                    const until = e.target.value;
                    const fromDate = new Date(dateRange.from + "T00:00:00");
                    const untilDate = new Date(until + "T00:00:00");
                    const diffDays = Math.floor(
                      (untilDate - fromDate) / (1000 * 60 * 60 * 24),
                    );
                    if (diffDays > MAX_DAYS) {
                      const minFrom = new Date(untilDate);
                      minFrom.setDate(minFrom.getDate() - MAX_DAYS);
                      onChangeDateRange({ from: toYMD(minFrom), until });
                    } else {
                      onChangeDateRange({ ...dateRange, until });
                    }
                  }}
                />
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  rango máx {MAX_DAYS} días (6 meses)
                </span>
              </div>
            </div>
          </div>

          {/* ── Apply button ── */}
          <button
            onClick={onApply}
            disabled={loading || !selectedIntegration}
            className="h-[42px] shrink-0 rounded-xl px-6 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #FF6B35 0%, #e5551f 100%)",
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium border border-orange-100">
                {selectedIntegration.type === "user" ? "Mi cuenta" : "Conexión"}
              </span>
              <span>
                {selectedIntegration.store_name} ·{" "}
                {selectedIntegration.country_code}
              </span>
            </>
          )}
          {hasNoIntegrations && (
            <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Vincula tu cuenta Dropi para acceder al dashboard
            </span>
          )}
        </div>
      </div>

      {/* ── Modal Vincular Dropi (solo para crear nueva integración user-level) ── */}
      <VincularDropiModal
        open={dropiLinkModal}
        onClose={() => setDropiLinkModal(false)}
        integration={null}
        onSaved={handleDropiSaved}
        Swal={Swal}
      />
    </>
  );
}
