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

  // ─── Split date range into chunks ───
  const splitDateRange = useCallback((from, until, chunks) => {
    const fromDate = new Date(from);
    const untilDate = new Date(until);
    const totalDays = Math.ceil((untilDate - fromDate) / (1000 * 60 * 60 * 24));
    const daysPerChunk = Math.ceil(totalDays / chunks);
    const ranges = [];

    for (let i = 0; i < chunks; i++) {
      const chunkFrom = new Date(fromDate);
      chunkFrom.setDate(chunkFrom.getDate() + i * daysPerChunk);

      const chunkUntil = new Date(fromDate);
      chunkUntil.setDate(chunkUntil.getDate() + (i + 1) * daysPerChunk);

      if (chunkUntil > untilDate) chunkUntil.setTime(untilDate.getTime());
      if (chunkFrom >= untilDate) break;

      ranges.push({
        from: toYMD(chunkFrom),
        until: toYMD(chunkUntil),
      });
    }
    return ranges;
  }, []);

  // ─── Merge multiple chunk responses into one ───
  const mergeStats = useCallback((results) => {
    const merged = {
      totalOrders: 0,
      totalMoney: 0,
      statusStats: {},
      kpis: {},
      dailyChart: [],
      topProducts: [],
      retiroAgencia: [],
      pagesFetched: 0,
      isPartial: false,
      partialMessage: null,
    };

    const dailyMap = {};
    const productMap = {};
    const allRetiro = [];

    for (const r of results) {
      if (!r) continue;
      merged.totalOrders += r.totalOrders || 0;
      merged.totalMoney += r.totalMoney || 0;
      merged.pagesFetched += r.pagesFetched || 0;
      if (r.isPartial) merged.isPartial = true;

      // Merge statusStats
      for (const [key, val] of Object.entries(r.statusStats || {})) {
        if (!merged.statusStats[key])
          merged.statusStats[key] = { count: 0, money: 0 };
        merged.statusStats[key].count += val.count || 0;
        merged.statusStats[key].money += val.money || 0;
      }

      // Merge dailyChart
      for (const day of r.dailyChart || []) {
        if (!dailyMap[day.day])
          dailyMap[day.day] = {
            day: day.day,
            pedidos: 0,
            entregadas: 0,
            devoluciones: 0,
          };
        dailyMap[day.day].pedidos += day.pedidos || 0;
        dailyMap[day.day].entregadas += day.entregadas || 0;
        dailyMap[day.day].devoluciones += day.devoluciones || 0;
      }

      // Merge products
      for (const p of r.topProducts || []) {
        if (!productMap[p.name])
          productMap[p.name] = {
            name: p.name,
            ordenes: 0,
            entregadas: 0,
            devoluciones: 0,
            ingreso: 0,
          };
        productMap[p.name].ordenes += p.ordenes || 0;
        productMap[p.name].entregadas += p.entregadas || 0;
        productMap[p.name].devoluciones += p.devoluciones || 0;
        productMap[p.name].ingreso += p.ingreso || 0;
      }

      // Merge retiro
      allRetiro.push(...(r.retiroAgencia || []));
    }

    merged.dailyChart = Object.values(dailyMap).sort((a, b) =>
      a.day.localeCompare(b.day),
    );
    merged.topProducts = Object.values(productMap)
      .sort((a, b) => b.ordenes - a.ordenes)
      .slice(0, 10);
    merged.retiroAgencia = allRetiro
      .sort((a, b) => b.days - a.days)
      .slice(0, 20);

    // Recalcular KPIs desde statusStats mergeados
    const entregadas = merged.statusStats.entregada?.count || 0;
    const devoluciones = merged.statusStats.devolucion?.count || 0;
    merged.kpis = {
      totalOrders: merged.totalOrders,
      entregadas,
      devoluciones,
      canceladas: merged.statusStats.cancelada?.count || 0,
      totalMoney: merged.totalMoney,
      ingresoEntregadas: merged.statusStats.entregada?.money || 0,
      tasaEntrega:
        merged.totalOrders > 0 ? (entregadas / merged.totalOrders) * 100 : 0,
      tasaDevolucion:
        merged.totalOrders > 0 ? (devoluciones / merged.totalOrders) * 100 : 0,
      ticketPromedio:
        entregadas > 0
          ? (merged.statusStats.entregada?.money || 0) / entregadas
          : 0,
      retiroAgencia: merged.statusStats.retiro_agencia?.count || 0,
    };

    if (merged.isPartial) {
      merged.partialMessage =
        "Se analizaron las primeras órdenes de cada período. Para datos completos, seleccione un rango más corto.";
    }

    return merged;
  }, []);

  // ─── Fetch dashboard (parallel chunks to avoid Apache 60s timeout) ───
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
      const fromDate = new Date(dateRange.from);
      const untilDate = new Date(dateRange.until);
      const totalDays = Math.ceil(
        (untilDate - fromDate) / (1000 * 60 * 60 * 24),
      );

      // ≤5 días → 1 request, ≤10 → 2 paralelos, >10 → 3 paralelos
      const numChunks = totalDays <= 5 ? 1 : totalDays <= 10 ? 2 : 3;
      const ranges = splitDateRange(dateRange.from, dateRange.until, numChunks);

      console.log(
        `[dropiboard] Splitting ${totalDays} days into ${ranges.length} chunks:`,
        ranges,
      );

      // Fetch all chunks in parallel
      const promises = ranges.map((range) =>
        chatApi
          .post(
            "dropi_integrations/dashboard/stats",
            {
              id_configuracion: cfgId,
              from: range.from,
              until: range.until,
            },
            { timeout: 60000 },
          )
          .then((res) => res?.data?.data || null)
          .catch((err) => {
            console.error(
              `[dropiboard] Chunk ${range.from}→${range.until} failed:`,
              err?.message,
            );
            return null;
          }),
      );

      const results = await Promise.all(promises);
      const validResults = results.filter(Boolean);

      if (validResults.length === 0) {
        setErrorMsg("No se pudieron obtener datos de Dropi. Intente de nuevo.");
        setStats(null);
      } else {
        const merged = mergeStats(validResults);
        setStats(merged);

        if (validResults.length < ranges.length) {
          setErrorMsg(
            `${ranges.length - validResults.length} de ${ranges.length} consultas fallaron. Los datos pueden estar incompletos.`,
          );
        }
      }
    } catch (err) {
      console.error("Dropiboard fetch error:", err);
      setErrorMsg(err?.message || "Error al consultar datos de Dropi");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [selectedIntegration, dateRange, splitDateRange, mergeStats]);

  // ─── Extract data from stats ───
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

  // ─── Pie data ───
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
              Dependiendo del volumen esto puede tomar entre 30 segundos y 2
              minutos
            </p>
            <p className="text-[10px] text-slate-300 mt-3">
              No cierre esta página — el servidor está recopilando las órdenes
              del período
            </p>
          </div>
        )}

        {/* ── Dashboard data ── */}
        {hasFetched && !loading && stats && (
          <>
            {/* Partial data warning */}
            {stats.isPartial && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <svg
                  className="w-5 h-5 shrink-0 text-amber-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>{stats.partialMessage}</span>
              </div>
            )}

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
