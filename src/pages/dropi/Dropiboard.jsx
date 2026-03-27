import React, { useState, useMemo, useCallback, useRef } from "react";
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
  const [syncingMsg, setSyncingMsg] = useState("");
  const retryCountRef = useRef(0);

  const [selectedIntegration, setSelectedIntegration] = useState(null);

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
    const totalDays = Math.max(
      1,
      Math.ceil((untilDate - fromDate) / (1000 * 60 * 60 * 24)),
    );
    const daysPerChunk = Math.ceil(totalDays / chunks);
    const ranges = [];

    for (let i = 0; i < chunks; i++) {
      const chunkFrom = new Date(fromDate);
      chunkFrom.setDate(chunkFrom.getDate() + i * daysPerChunk);
      const chunkUntil = new Date(fromDate);
      chunkUntil.setDate(chunkUntil.getDate() + (i + 1) * daysPerChunk);
      if (chunkUntil > untilDate) chunkUntil.setTime(untilDate.getTime());
      if (chunkFrom >= untilDate) break;
      ranges.push({ from: toYMD(chunkFrom), until: toYMD(chunkUntil) });
    }
    return ranges;
  }, []);

  // ─── Merge multiple chunk responses ───
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

      for (const [key, val] of Object.entries(r.statusStats || {})) {
        if (!merged.statusStats[key])
          merged.statusStats[key] = { count: 0, money: 0 };
        merged.statusStats[key].count += val.count || 0;
        merged.statusStats[key].money += val.money || 0;
      }
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

  // ─── Fetch dashboard ───
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
      if (!syncingMsg) retryCountRef.current = 0;
      const fromDate = new Date(dateRange.from);
      const untilDate = new Date(dateRange.until);
      const totalDays = Math.max(
        1,
        Math.ceil((untilDate - fromDate) / (1000 * 60 * 60 * 24)),
      );
      const numChunks = totalDays <= 5 ? 1 : totalDays <= 10 ? 2 : 3;
      const ranges = splitDateRange(dateRange.from, dateRange.until, numChunks);

      const promises = ranges.map((range) =>
        chatApi
          .post(
            "dropi_integrations/dashboard/stats",
            { id_configuracion: cfgId, from: range.from, until: range.until },
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
        setSyncingMsg("");
      } else {
        const merged = mergeStats(validResults);
        const anySyncing = validResults.some((r) => r?.syncing === true);
        if (anySyncing && merged.totalOrders === 0) {
          retryCountRef.current += 1;
          if (retryCountRef.current >= 6) {
            setSyncingMsg("");
            setStats(null);
            return;
          }
          setErrorMsg("");
          setStats(null);
          setSyncingMsg("Sincronizando órdenes por primera vez...");
          setTimeout(() => {
            setSyncingMsg("");
            fetchDashboard();
          }, 5000);
          return;
        }
        setSyncingMsg("");
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
  }, [selectedIntegration, dateRange, splitDateRange, mergeStats, syncingMsg]);

  // ─── Data extraction ───
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
    <div className="w-full min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* ══════════════════════════════════════
          HEADER — Pro dark navy
         ══════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0B1426] via-[#111d35] to-[#162A4A] text-white px-6 py-6">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow accent */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#00BFFF]/8 rounded-full blur-3xl" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00BFFF] to-[#0090cc] flex items-center justify-center shadow-lg shadow-cyan-500/25 ring-1 ring-white/10">
              <svg
                className="w-6 h-6 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3h18v18H3z" opacity="0" />
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight leading-tight">
                Dropi<span className="text-[#00BFFF]">Board</span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Dashboard Inteligente de Órdenes</span>
                <span className="w-px h-3 bg-slate-600" />
                <span className="text-[#00BFFF]/70 font-medium">
                  GRUPO IMPOR
                </span>
              </p>
            </div>
          </div>

          {/* Right side badges */}
          <div className="hidden md:flex items-center gap-3">
            {selectedIntegration && (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-slate-300 font-medium">
                  {selectedIntegration.store_name}
                </span>
                <span className="text-[10px] text-slate-500">
                  {selectedIntegration.country_code}
                </span>
              </div>
            )}
            {stats && totalOrders > 0 && (
              <div className="flex items-center gap-1.5 bg-[#00BFFF]/10 border border-[#00BFFF]/20 rounded-lg px-3 py-1.5">
                <svg
                  className="w-3.5 h-3.5 text-[#00BFFF]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <span className="text-[11px] text-[#00BFFF] font-bold">
                  {totalOrders.toLocaleString()} órdenes
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          CONTENT
         ══════════════════════════════════════ */}
      <div className="px-4 sm:px-6 py-5">
        {/* Filters */}
        <DropiFilters
          selectedIntegration={selectedIntegration}
          onChangeIntegration={setSelectedIntegration}
          dateRange={dateRange}
          onChangeDateRange={setDateRange}
          onApply={fetchDashboard}
          loading={loading}
        />

        {/* Error state */}
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

        {/* Syncing state */}
        {syncingMsg && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#00BFFF]/20 bg-[#00BFFF]/5 px-4 py-3 text-sm text-[#0B1426]">
            <svg
              className="w-5 h-5 shrink-0 text-[#00BFFF] animate-spin"
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
            <span>
              {syncingMsg}{" "}
              <strong className="text-[#00BFFF]">
                Reintentando automáticamente...
              </strong>
            </span>
          </div>
        )}

        {/* ══════════════════════════════════════
            EMPTY STATE — Primera vista
           ══════════════════════════════════════ */}
        {!hasFetched && !loading && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {/* Top gradient bar */}
            <div className="h-1 bg-gradient-to-r from-[#00BFFF] via-[#10B981] to-[#FF6B35]" />

            <div className="px-8 py-14 text-center">
              {/* Animated dashboard preview */}
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#0B1426] to-[#162A4A] shadow-xl shadow-slate-300/50 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-[#00BFFF]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                    <path d="M13 13h4" />
                    <path d="M13 17h4" />
                  </svg>
                </div>
                {/* Floating dots */}
                <div
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#10B981] border-2 border-white shadow-sm animate-bounce"
                  style={{ animationDelay: "0s", animationDuration: "2s" }}
                />
                <div
                  className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-[#FF6B35] border-2 border-white shadow-sm animate-bounce"
                  style={{ animationDelay: "0.5s", animationDuration: "2.5s" }}
                />
                <div
                  className="absolute top-1/2 -right-3 w-3 h-3 rounded-full bg-[#00BFFF] border-2 border-white shadow-sm animate-bounce"
                  style={{ animationDelay: "1s", animationDuration: "2s" }}
                />
              </div>

              <h3 className="text-xl font-extrabold text-slate-800 mb-2">
                Tu operación Dropi en un solo lugar
              </h3>
              <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                Visualiza estados de guías, tasa de entrega, devoluciones,
                productos top y retiros en agencia — todo sincronizado
                automáticamente desde tu cuenta Dropi.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {[
                  {
                    label: "Estados en vivo",
                    color: "bg-sky-50 text-sky-700 border-sky-200",
                  },
                  {
                    label: "KPIs automáticos",
                    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  },
                  {
                    label: "Top productos",
                    color: "bg-violet-50 text-violet-700 border-violet-200",
                  },
                  {
                    label: "Alertas retiro",
                    color: "bg-orange-50 text-orange-700 border-orange-200",
                  },
                  {
                    label: "Charts por día",
                    color: "bg-blue-50 text-blue-700 border-blue-200",
                  },
                ].map((f) => (
                  <span
                    key={f.label}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${f.color}`}
                  >
                    {f.label}
                  </span>
                ))}
              </div>

              {/* Arrow pointing up to filters */}
              <div className="mt-8 flex flex-col items-center gap-1 text-slate-400">
                <svg
                  className="w-5 h-5 animate-bounce"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
                <span className="text-xs font-medium">
                  Seleccione su conexión arriba y presione{" "}
                  <strong className="text-[#00BFFF]">Consultar</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#0B1426] to-[#162A4A] flex items-center justify-center shadow-lg">
              <svg
                className="w-8 h-8 text-[#00BFFF] animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity="0.2"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700">
              Consultando órdenes desde Dropi...
            </p>
            <p className="text-xs text-slate-400 mt-1.5">
              Dependiendo del volumen esto puede tomar entre 10 y 60 segundos
            </p>
            <div className="flex justify-center gap-1 mt-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#00BFFF]"
                  style={{ animation: `pulse 1.2s infinite ${i * 0.2}s` }}
                />
              ))}
            </div>
            <style>{`@keyframes pulse { 0%,100% { opacity:0.2; transform:scale(0.8); } 50% { opacity:1; transform:scale(1.2); } }`}</style>
          </div>
        )}

        {/* ══════════════════════════════════════
            DASHBOARD DATA
           ══════════════════════════════════════ */}
        {hasFetched && !loading && stats && (
          <>
            {/* Partial warning */}
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

            <DropiStatusBar
              statusStats={statusStats}
              totalOrders={totalOrders}
            />
            <DropiKpiCards kpis={kpis} />
            <DropiCharts
              dailyChart={dailyChart}
              pieData={pieData}
              loading={loading}
            />
            <DropiRetiroAgencia orders={retiroAgencia} />
            <DropiProductsTable topProducts={topProducts} loading={loading} />

            {/* Footer */}
            <div className="text-center pt-6 pb-2 border-t border-slate-200 mt-4">
              <p className="text-[10px] text-slate-400">
                Dropi<span className="text-[#00BFFF] font-semibold">Board</span>{" "}
                —{" "}
                {totalOrders > 0 && (
                  <span>{totalOrders.toLocaleString()} órdenes analizadas</span>
                )}
              </p>
            </div>
          </>
        )}

        {/* No data state */}
        {hasFetched && !loading && !stats && !errorMsg && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-slate-100 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-600 mb-1">
              Sin órdenes en este período
            </h3>
            <p className="text-xs text-slate-400">
              No se encontraron órdenes para las fechas seleccionadas. Pruebe
              con un rango más amplio.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dropiboard;
