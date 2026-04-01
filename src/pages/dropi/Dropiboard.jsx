import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import chatApi from "../../api/chatcenter";

import DropiFilters from "./dropiboard/formatters/DropiFilters";
import DropiStatusBar from "./dropiboard/presets/DropiStatusBar";
import DropiKpiCards from "./dropiboard/proporcional/DropiKpiCards";
import DropiCharts from "./dropiboard/proporcional/DropiCharts";
import DropiProductsTable from "./dropiboard/proporcional/DropiProductsTable";
import DropiOrdersTable from "./dropiboard/proporcional/DropiOrdersTable";
import DropiProfitBar from "./dropiboard/proporcional/DropiProfitBar";
import DropiDevolucionPanel from "./dropiboard/proporcional/DropiDevolucionPanel";
import {
  STATUS_CATEGORIES,
  DISPLAY_ORDER,
  toYMD,
} from "./dropiboard/dropiHelpers";

const DROPI_LOGO =
  "https://d39ru7awumhhs2.cloudfront.net/ecuador/brands/1/logo/171275980616951779761695177976GVUXDo6TWDrk6URjLWgAFjH65gE1D1c7MAfWNF6r (2).png";

const Dropiboard = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [syncingMsg, setSyncingMsg] = useState("");
  const retryCountRef = useRef(0);
  const profitTimerRef = useRef(null);
  const syncRefreshTimerRef = useRef(null);

  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 7);
    return { from: toYMD(from), until: toYMD(today) };
  });

  // ─── Filtro por status ───
  const [selectedStatus, setSelectedStatus] = useState(null);

  // ─── Split date range into chunks (SIN SOLAPAMIENTO) ───
  const splitDateRange = useCallback((from, until, chunks) => {
    const fromDate = new Date(from + "T00:00:00");
    const untilDate = new Date(until + "T00:00:00");
    const totalDays = Math.max(
      1,
      Math.ceil((untilDate - fromDate) / (1000 * 60 * 60 * 24)),
    );
    const daysPerChunk = Math.ceil(totalDays / chunks);
    const ranges = [];

    for (let i = 0; i < chunks; i++) {
      const chunkFrom = new Date(fromDate);
      chunkFrom.setDate(chunkFrom.getDate() + i * daysPerChunk);
      if (i > 0) chunkFrom.setDate(chunkFrom.getDate() + 1);

      const chunkUntil = new Date(fromDate);
      chunkUntil.setDate(chunkUntil.getDate() + (i + 1) * daysPerChunk);
      if (chunkUntil > untilDate) chunkUntil.setTime(untilDate.getTime());
      if (chunkFrom > untilDate) break;
      ranges.push({ from: toYMD(chunkFrom), until: toYMD(chunkUntil) });
    }
    return ranges;
  }, []);

  // ─── Merge chunks ───
  const mergeStats = useCallback((results) => {
    const merged = {
      totalOrders: 0,
      totalMoney: 0,
      statusStats: {},
      kpis: {},
      dailyChart: [],
      topProducts: [],
      retiroAgencia: [],
      ordersByStatus: {},
      pagesFetched: 0,
      isPartial: false,
      partialMessage: null,
    };
    const dailyMap = {};
    const productMap = {};
    const allRetiro = [];
    const allOrdersByStatus = {};

    const mergedProfit = {
      profitEntregadas: 0,
      profitPotencialTotal: 0,
      profitCalculated: 0,
      profitPending: 0,
      totalOrders: 0,
      entregadas: 0,
      entregables: 0,
      avgProfitPerOrder: 0,
      isComplete: true,
      pctCalculated: 100,
    };

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

      // Merge ordersByStatus
      for (const [key, orders] of Object.entries(r.ordersByStatus || {})) {
        if (!allOrdersByStatus[key]) allOrdersByStatus[key] = [];
        allOrdersByStatus[key].push(...orders);
      }

      if (r.profitData) {
        mergedProfit.profitEntregadas += r.profitData.profitEntregadas || 0;
        mergedProfit.profitPotencialTotal +=
          r.profitData.profitPotencialTotal || 0;
        mergedProfit.profitCalculated += r.profitData.profitCalculated || 0;
        mergedProfit.profitPending += r.profitData.profitPending || 0;
        mergedProfit.entregadas += r.profitData.entregadas || 0;
        mergedProfit.entregables += r.profitData.entregables || 0;
        if (!r.profitData.isComplete) mergedProfit.isComplete = false;
      }
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

    // Limitar ordersByStatus a 25 por estado
    for (const key of Object.keys(allOrdersByStatus)) {
      allOrdersByStatus[key] = allOrdersByStatus[key]
        .sort((a, b) => b.days - a.days)
        .slice(0, 25);
    }
    merged.ordersByStatus = allOrdersByStatus;

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

    mergedProfit.totalOrders = merged.totalOrders;
    mergedProfit.avgProfitPerOrder =
      mergedProfit.profitCalculated > 0
        ? Math.round(
            (mergedProfit.profitPotencialTotal /
              mergedProfit.profitCalculated) *
              100,
          ) / 100
        : 0;
    mergedProfit.pctCalculated =
      merged.totalOrders > 0
        ? Math.round((mergedProfit.profitCalculated / merged.totalOrders) * 100)
        : 0;
    merged.profitData = mergedProfit;

    // ── Merge devolucionAnalysis ──
    const allDevOrders = [];
    let isSupplierView = false;

    for (const r of results) {
      if (!r?.devolucionAnalysis) continue;
      if (r.devolucionAnalysis.isSupplierView) isSupplierView = true;
      allDevOrders.push(...(r.devolucionAnalysis.orders || []));
    }

    if (allDevOrders.length > 0) {
      allDevOrders.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );

      merged.devolucionAnalysis = {
        isSupplierView,
        summary: {
          totalDevolutions: allDevOrders.length,
          withScan: allDevOrders.filter((o) => o.alertLevel === "ok").length,
          withoutScan: allDevOrders.filter((o) => o.alertLevel === "critical")
            .length,
          pendingReturn: allDevOrders.filter((o) => o.alertLevel === "pending")
            .length,
          unverifiable: allDevOrders.filter(
            (o) => o.alertLevel === "unverifiable",
          ).length,
        },
        orders: allDevOrders,
      };
    }

    if (merged.isPartial)
      merged.partialMessage =
        "Se analizaron las primeras órdenes de cada período. Para datos completos, seleccione un rango más corto.";
    return merged;
  }, []);

  // ─── Fetch dashboard ───
  const fetchDashboard = useCallback(
    async (silent = false) => {
      if (!selectedIntegration) return;

      const integrationId = selectedIntegration.id;
      if (!integrationId) {
        setErrorMsg("No se encontró integración válida.");
        return;
      }

      if (!silent) {
        setLoading(true);
        setHasFetched(true);
        setErrorMsg("");
        setSelectedStatus(null);
      }

      // Limpiar timer de sync refresh previo
      if (syncRefreshTimerRef.current) {
        clearTimeout(syncRefreshTimerRef.current);
        syncRefreshTimerRef.current = null;
      }

      try {
        if (!syncingMsg && !silent) retryCountRef.current = 0;
        const fromDate = new Date(dateRange.from + "T00:00:00");
        const untilDate = new Date(dateRange.until + "T00:00:00");
        const totalDays = Math.max(
          1,
          Math.ceil((untilDate - fromDate) / (1000 * 60 * 60 * 24)),
        );
        const numChunks =
          totalDays <= 5 ? 1 : totalDays <= 10 ? 2 : totalDays <= 20 ? 3 : 4;
        const ranges = splitDateRange(
          dateRange.from,
          dateRange.until,
          numChunks,
        );

        const promises = ranges.map((range) =>
          chatApi
            .post(
              "dropi_integrations/dashboard/stats",
              {
                integration_id: integrationId,
                ...(selectedIntegration.id_configuracion
                  ? { id_configuracion: selectedIntegration.id_configuracion }
                  : {}),
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
          if (!silent) {
            setErrorMsg(
              "No se pudieron obtener datos de Dropi. Intente de nuevo.",
            );
            setStats(null);
            setSyncingMsg("");
          }
        } else {
          const merged = mergeStats(validResults);
          const anySyncing = validResults.some((r) => r?.syncing === true);

          // ── CASO 1: Sync en curso pero SIN datos aún → retry completo ──
          if (anySyncing && merged.totalOrders === 0) {
            retryCountRef.current += 1;
            if (retryCountRef.current >= 6) {
              setSyncingMsg("");
              setStats(null);
              if (!silent) setLoading(false);
              return;
            }
            if (!silent) {
              setErrorMsg("");
              setStats(null);
              setSyncingMsg("Sincronizando órdenes por primera vez...");
            }
            setTimeout(() => {
              setSyncingMsg("");
              fetchDashboard();
            }, 5000);
            if (!silent) setLoading(false);
            return;
          }

          // ── CASO 2: Ya hay datos → mostrarlos ──
          setStats(merged);

          // ── CASO 2a: Backend sigue sincronizando → banner + auto-refresh silencioso ──
          if (anySyncing && merged.totalOrders > 0) {
            setSyncingMsg(
              `Mostrando ${merged.totalOrders.toLocaleString()} órdenes. Seguimos sincronizando su información en segundo plano...`,
            );
            syncRefreshTimerRef.current = setTimeout(() => {
              syncRefreshTimerRef.current = null;
              fetchDashboard(true);
            }, 8000);
          } else {
            // ── CASO 2b: Sync terminó → limpiar mensaje ──
            setSyncingMsg("");
          }

          if (!silent && validResults.length < ranges.length) {
            setErrorMsg(
              `${ranges.length - validResults.length} de ${ranges.length} consultas fallaron. Los datos pueden estar incompletos.`,
            );
          }
        }
      } catch (err) {
        if (!silent) {
          setErrorMsg(err?.message || "Error al consultar datos");
          setStats(null);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [selectedIntegration, dateRange, splitDateRange, mergeStats, syncingMsg],
  );

  // ─── Cleanup timers on unmount ───
  useEffect(() => {
    return () => {
      if (syncRefreshTimerRef.current) {
        clearTimeout(syncRefreshTimerRef.current);
        syncRefreshTimerRef.current = null;
      }
    };
  }, []);

  // ─── Auto-refresh para profit ───
  useEffect(() => {
    if (profitTimerRef.current) {
      clearTimeout(profitTimerRef.current);
      profitTimerRef.current = null;
    }

    if (!stats?.profitData || stats.profitData.isComplete) return;
    if (
      stats.profitData.profitPotencialTotal === 0 &&
      stats.profitData.profitCalculated > 0
    )
      return;

    profitTimerRef.current = setTimeout(() => {
      console.log(
        `[profit-autorefresh] ${stats.profitData.profitCalculated}/${stats.profitData.totalOrders} — refreshing...`,
      );
      fetchDashboard(true);
    }, 35000);

    return () => {
      if (profitTimerRef.current) {
        clearTimeout(profitTimerRef.current);
        profitTimerRef.current = null;
      }
    };
  }, [stats?.profitData?.profitCalculated, stats?.profitData?.isComplete]);

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
  const ordersByStatus = stats?.ordersByStatus || {};
  const totalOrders = stats?.totalOrders || 0;
  const profitData = stats?.profitData || null;
  const devolucionAnalysis = stats?.devolucionAnalysis || null;

  // Órdenes filtradas para la tabla
  const filteredOrders = selectedStatus
    ? ordersByStatus[selectedStatus] || []
    : ordersByStatus.retiro_agencia || [];

  const filteredStatusKey = selectedStatus || "retiro_agencia";
  const filteredTotalCount = selectedStatus
    ? statusStats[selectedStatus]?.count || 0
    : statusStats.retiro_agencia?.count || 0;

  const pieData = useMemo(() => {
    return DISPLAY_ORDER.map((key) => ({
      name: STATUS_CATEGORIES[key].label,
      value: statusStats[key]?.count || 0,
      color: STATUS_CATEGORIES[key].color,
    })).filter((d) => d.value > 0);
  }, [statusStats]);

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0B1426] via-[#2a1a0e] to-[#FF6B35] text-white px-6 py-5">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={DROPI_LOGO}
              alt="Dropi"
              className="h-10 w-auto object-contain drop-shadow-lg"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div className="h-8 w-px bg-white/30" />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-tight">
                Dashboard de Órdenes
              </h1>
              <p className="text-[11px] text-white/70 mt-0.5">
                Análisis en tiempo real de tu operación
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {selectedIntegration && (
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[11px] text-white font-medium">
                  {selectedIntegration.store_name}
                </span>
              </div>
            )}
            {stats && totalOrders > 0 && (
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1.5">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="12" width="4" height="9" rx="1" />
                  <rect x="10" y="7" width="4" height="14" rx="1" />
                  <rect x="17" y="3" width="4" height="18" rx="1" />
                </svg>
                <span className="text-[11px] text-white font-bold">
                  {totalOrders.toLocaleString()} órdenes
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 sm:px-6 py-5">
        <DropiFilters
          selectedIntegration={selectedIntegration}
          onChangeIntegration={setSelectedIntegration}
          dateRange={dateRange}
          onChangeDateRange={setDateRange}
          onApply={() => fetchDashboard()}
          loading={loading}
        />

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

        {syncingMsg && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            <svg
              className="w-5 h-5 shrink-0 text-[#FF6B35] animate-spin"
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
              <strong className="text-[#FF6B35]">
                Se actualizará automáticamente.
              </strong>
            </span>
          </div>
        )}

        {/* EMPTY STATE */}
        {!hasFetched && !loading && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#FF6B35] via-[#FF9A5C] to-[#FFD4B8]" />
            <div className="px-8 py-14 text-center">
              <div className="flex items-center justify-center gap-5 mb-8">
                <img
                  src={DROPI_LOGO}
                  alt="Dropi"
                  className="h-14 w-auto object-contain opacity-90"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <div className="h-12 w-px bg-slate-200" />
                <div className="flex items-end gap-1.5">
                  {[40, 65, 50, 80, 60, 90, 72].map((h, i) => (
                    <div
                      key={i}
                      className="w-3 rounded-t-sm transition-all duration-700"
                      style={{
                        height: `${h * 0.55}px`,
                        background:
                          i % 3 === 0
                            ? "#FF6B35"
                            : i % 3 === 1
                              ? "#10B981"
                              : "#00BFFF",
                        opacity: 0.7 + i * 0.04,
                        animation: `growBar 1.5s ease-out ${i * 0.1}s both`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">
                Tu operación Dropi en un solo lugar
              </h3>
              <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                Visualiza estados de guías, tasa de entrega, devoluciones,
                productos top y retiros en agencia — todo sincronizado desde tu
                cuenta Dropi.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {[
                  {
                    label: "Estados en vivo",
                    color: "bg-orange-50 text-orange-700 border-orange-200",
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
                    color: "bg-red-50 text-red-700 border-red-200",
                  },
                  {
                    label: "Utilidad real",
                    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  },
                  {
                    label: "Tendencias diarias",
                    color: "bg-sky-50 text-sky-700 border-sky-200",
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
                  Seleccione su conexión y presione{" "}
                  <strong className="text-[#FF6B35]">Consultar</strong>
                </span>
              </div>
            </div>
            <style>{`@keyframes growBar { from { height: 0; opacity: 0; } }`}</style>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center">
            <img
              src={DROPI_LOGO}
              alt="Dropi"
              className="h-10 mx-auto mb-4 object-contain opacity-60"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div className="flex justify-center gap-1 mb-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#FF6B35]"
                  style={{ animation: `pulse 1.2s infinite ${i * 0.2}s` }}
                />
              ))}
            </div>
            <p className="text-sm font-semibold text-slate-700">
              Consultando órdenes desde Dropi...
            </p>
            <p className="text-xs text-slate-400 mt-1.5">
              Dependiendo del volumen puede tomar hasta 60 segundos
            </p>
            <style>{`@keyframes pulse { 0%,100% { opacity:0.2; transform:scale(0.8); } 50% { opacity:1; transform:scale(1.2); } }`}</style>
          </div>
        )}

        {/* DASHBOARD DATA */}
        {hasFetched && !loading && stats && (
          <>
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
              activeFilter={selectedStatus}
              onFilterStatus={setSelectedStatus}
            />

            <DropiKpiCards kpis={kpis} />

            {/* ── Utilidad Real ── */}
            <DropiProfitBar profitData={profitData} />

            <DropiDevolucionPanel devolucionAnalysis={devolucionAnalysis} />

            {/* ── Tabla de órdenes filtradas ── */}
            {filteredOrders.length > 0 && (
              <DropiOrdersTable
                orders={filteredOrders}
                statusKey={filteredStatusKey}
                totalCount={filteredTotalCount}
              />
            )}

            <DropiCharts
              dailyChart={dailyChart}
              pieData={pieData}
              loading={loading}
            />
            <DropiProductsTable topProducts={topProducts} loading={loading} />

            <div className="text-center pt-6 pb-2 border-t border-slate-200 mt-4">
              <p className="text-[10px] text-slate-400">
                {totalOrders > 0 && (
                  <span>{totalOrders.toLocaleString()} órdenes analizadas</span>
                )}
              </p>
            </div>
          </>
        )}

        {/* No data */}
        {hasFetched && !loading && !stats && !errorMsg && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-slate-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            <h3 className="text-sm font-bold text-slate-600 mb-1">
              Sin órdenes en este período
            </h3>
            <p className="text-xs text-slate-400">
              No se encontraron órdenes. Pruebe con un rango más amplio.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dropiboard;
