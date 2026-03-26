import React, { useState, useMemo, useCallback } from "react";
import chatApi from "../../api/chatcenter";

import DropiFilters from "./dropiboard/formatters/DropiFilters";
import DropiStatusBar from "./dropiboard/presets/DropiStatusBar";
import DropiKpiCards from "./dropiboard/proporcional/DropiKpiCards";
import DropiCharts from "./dropiboard/proporcional/DropiCharts";
import DropiProductsTable from "./dropiboard/proporcional/DropiProductsTable";
import DropiRetiroAgencia from "./dropiboard/proporcional/DropiRetiroAgencia";
import {
  STATUS_CATEGORIES,
  DISPLAY_ORDER,
  toYMD,
} from "./dropiboard/dropiHelpers";

// ═══════════════════════════════════════════════════════════════
// DROPIBOARD — Dashboard Inteligente para Dropi
// ═══════════════════════════════════════════════════════════════
const Dropiboard = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Integration selection ──
  const [selectedIntegration, setSelectedIntegration] = useState(null);

  // ── Date range (only fetches on "Consultar" click) ──
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 7);
    return { from: toYMD(from), until: toYMD(today) };
  });

  // ─── Fetch dashboard stats (1 call, backend pagina internamente) ───
  const fetchDashboard = useCallback(async () => {
    if (!selectedIntegration) return;

    const cfgId =
      selectedIntegration.id_configuracion ||
      parseInt(localStorage.getItem("id_configuracion"), 10);

    if (!cfgId) {
      setErrorMsg("No se encontró id_configuracion para esta integración.");
      return;
    }

    setLoading(true);
    setHasFetched(true);
    setErrorMsg("");

    try {
      const { data } = await chatApi.post(
        "dropi_integrations/dashboard/stats",
        {
          id_configuracion: cfgId,
          from: dateRange.from,
          until: dateRange.until,
        },
        { timeout: 300000 },
      );

      setStats(data?.data || null);
    } catch (err) {
      console.error("Dropiboard fetch error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Error al consultar datos de Dropi";
      setErrorMsg(msg);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [selectedIntegration, dateRange]);

  // ─── Extract data from backend response ───
  const statusStats = stats?.statusStats || {};
  const kpis = stats?.kpis || {
    totalOrders: 0,
    entregadas: 0,
    devoluciones: 0,
    canceladas: 0,
    totalMoney: 0,
    ingresoEntregadas: 0,
    tasaEntrega: 0,
    tasaDevolucion: 0,
    ticketPromedio: 0,
    retiroAgencia: 0,
  };
  const dailyChart = stats?.dailyChart || [];
  const topProducts = stats?.topProducts || [];
  const retiroAgencia = stats?.retiroAgencia || [];
  const totalOrders = stats?.totalOrders || 0;

  // ─── Pie data (frontend, a partir de statusStats del backend) ───
  const pieData = useMemo(() => {
    return DISPLAY_ORDER.map((key) => ({
      name: STATUS_CATEGORIES[key].label,
      value: statusStats[key]?.count || 0,
      color: STATUS_CATEGORIES[key].color,
    })).filter((d) => d.value > 0);
  }, [statusStats]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="w-full min-h-[calc(100vh-4rem)]">
      {/* ══════════════════════════════════════
          HEADER
         ══════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-[#0B1426] to-[#162A4A] text-white px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00BFFF] to-[#00E5FF] flex items-center justify-center text-[#0B1426] font-extrabold text-lg shrink-0 shadow-lg shadow-cyan-500/20">
            D
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Dropi<span className="text-[#00BFFF]">Board</span>
            </h1>
            <p className="text-[11px] text-[#8899AA] mt-0.5">
              Dashboard Inteligente
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          CONTENT
         ══════════════════════════════════════ */}
      <div className="px-4 sm:px-6 py-5">
        {/* ── Filters ── */}
        <DropiFilters
          selectedIntegration={selectedIntegration}
          onChangeIntegration={setSelectedIntegration}
          dateRange={dateRange}
          onChangeDateRange={setDateRange}
          onApply={fetchDashboard}
          loading={loading}
        />

        {/* ── Error state ── */}
        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg
              className="w-5 h-5 shrink-0 text-red-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── Empty state ── */}
        {!hasFetched && !loading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#00BFFF]/10 to-[#00E5FF]/5 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-[#00BFFF]/60"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">
              Seleccione una conexión y haga clic en Consultar
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Elija su integración Dropi, configure el rango de fechas y
              presione el botón para cargar los datos del dashboard.
            </p>
          </div>
        )}

        {/* ── Loading state ── */}
        {loading && (
          <div className="text-center py-16">
            <svg
              className="w-10 h-10 mx-auto animate-spin text-[#00BFFF] mb-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2.5"
                opacity="0.2"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-sm text-slate-500 font-medium">
              Consultando órdenes desde Dropi...
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Dependiendo del volumen esto puede tomar entre 30 segundos y 3
              minutos
            </p>
            <p className="text-[10px] text-slate-300 mt-3">
              No cierre esta página — el servidor está recopilando todas las
              órdenes del período
            </p>
          </div>
        )}

        {/* ── Dashboard data ── */}
        {hasFetched && !loading && stats && (
          <>
            {/* Info bar */}
            {stats.pagesFetched > 1 && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2 text-xs text-slate-500">
                <svg
                  className="w-4 h-4 text-[#00BFFF]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                <span>
                  Se consultaron{" "}
                  <strong className="text-slate-700">
                    {stats.pagesFetched}
                  </strong>{" "}
                  páginas de Dropi para obtener{" "}
                  <strong className="text-slate-700">
                    {totalOrders.toLocaleString()}
                  </strong>{" "}
                  órdenes
                </span>
              </div>
            )}

            {/* Status Bar */}
            <DropiStatusBar
              statusStats={statusStats}
              totalOrders={totalOrders}
            />

            {/* KPI Cards */}
            <DropiKpiCards kpis={kpis} />

            {/* Charts */}
            <DropiCharts
              dailyChart={dailyChart}
              pieData={pieData}
              loading={loading}
            />

            {/* Retiro Agencia Alert */}
            <DropiRetiroAgencia orders={retiroAgencia} />

            {/* Products */}
            <DropiProductsTable topProducts={topProducts} loading={loading} />

            {/* Footer */}
            <div className="text-center pt-6 pb-2 border-t border-slate-200 mt-4">
              <p className="text-[10px] text-slate-400">
                {totalOrders > 0 && (
                  <span>{totalOrders.toLocaleString()} órdenes procesadas</span>
                )}
              </p>
            </div>
          </>
        )}

        {/* ── No data state ── */}
        {hasFetched && !loading && !stats && !errorMsg && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-600 mb-1">
              Sin datos en este rango
            </h3>
            <p className="text-xs text-slate-400">
              Intente con un rango de fechas más amplio
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dropiboard;
