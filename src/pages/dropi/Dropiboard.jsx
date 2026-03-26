import React, { useEffect, useState, useMemo, useCallback } from "react";
import chatApi from "../../api/chatcenter";

import DropiFilters from "./dropiboard/formatters/DropiFilters";
import DropiStatusBar from "./dropiboard/presets/DropiStatusBar";
import DropiKpiCards from "./dropiboard/proporcional/DropiKpiCards";
import DropiCharts from "./dropiboard/proporcional/DropiCharts";
import DropiProductsTable from "./dropiboard/proporcional/DropiProductsTable";
import DropiRetiroAgencia from "./dropiboard/proporcional/DropiRetiroAgencia";
import {
  classifyStatus,
  STATUS_CATEGORIES,
  DISPLAY_ORDER,
  toYMD,
} from "./dropiboard/dropiHelpers";

// ═══════════════════════════════════════════════════════════════
// DROPIBOARD — Dashboard Inteligente para Dropi
// ═══════════════════════════════════════════════════════════════
const Dropiboard = () => {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);

  // ── Integration selection ──
  const [selectedIntegration, setSelectedIntegration] = useState(null);

  // ── Date range (only fetches on "Consultar" click) ──
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 7);
    return { from: toYMD(from), until: toYMD(today) };
  });

  // ─── Fetch ALL orders for the date range (paginated N+1) ───
  const fetchAllOrders = useCallback(async () => {
    if (!selectedIntegration) return;
    setLoading(true);
    setHasFetched(true);

    try {
      let allOrders = [];
      let start = 0;
      let hasMore = true;
      const pageSize = 200;

      // Determine id_configuracion — for user-level integrations we need
      // a different approach, but for now the API requires id_configuracion
      const id_configuracion = selectedIntegration.id_configuracion;

      if (!id_configuracion) {
        // User-level integration without id_configuracion
        // Try using localStorage fallback
        const fallback = parseInt(localStorage.getItem("id_configuracion"), 10);
        if (!fallback) {
          setOrders([]);
          setLoading(false);
          return;
        }
      }

      const cfgId =
        id_configuracion ||
        parseInt(localStorage.getItem("id_configuracion"), 10);

      while (hasMore) {
        const { data } = await chatApi.post(
          "dropi_integrations/orders/myorders/list",
          {
            id_configuracion: cfgId,
            result_number: pageSize,
            start,
            filter_date_by: "FECHA DE CREADO",
            from: dateRange.from,
            until: dateRange.until,
          },
        );

        const objects = data?.data?.objects ?? [];
        allOrders = [...allOrders, ...objects];
        hasMore = Boolean(data?.data?.hasMore);
        start += pageSize;

        // Safety: max 2000 orders per load
        if (allOrders.length >= 2000) break;
      }

      setOrders(allOrders);
    } catch (err) {
      console.error("Dropiboard fetch error:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedIntegration, dateRange]);

  // ─── Classified orders ───
  const classified = useMemo(() => {
    return orders.map((o) => ({
      ...o,
      _cat: classifyStatus(o.status),
      _total: Number(o.total_order || 0),
    }));
  }, [orders]);

  // ─── Status counts + money ───
  const statusStats = useMemo(() => {
    const stats = {};
    for (const key of Object.keys(STATUS_CATEGORIES)) {
      stats[key] = { count: 0, money: 0 };
    }
    for (const o of classified) {
      const cat = o._cat;
      if (!stats[cat]) stats[cat] = { count: 0, money: 0 };
      stats[cat].count += 1;
      stats[cat].money += o._total;
    }
    return stats;
  }, [classified]);

  const totalOrders = classified.length;
  const totalMoney = classified.reduce((s, o) => s + o._total, 0);

  // ─── KPIs ───
  const kpis = useMemo(() => {
    const entregadas = statusStats.entregada?.count || 0;
    const devoluciones = statusStats.devolucion?.count || 0;
    const ingresoEntregadas = statusStats.entregada?.money || 0;
    const tasaEntrega = totalOrders > 0 ? (entregadas / totalOrders) * 100 : 0;
    const tasaDevolucion =
      totalOrders > 0 ? (devoluciones / totalOrders) * 100 : 0;

    return {
      totalOrders,
      entregadas,
      devoluciones,
      canceladas: statusStats.cancelada?.count || 0,
      ingresoEntregadas,
      tasaEntrega,
      tasaDevolucion,
      totalMoney,
      ticketPromedio: entregadas > 0 ? ingresoEntregadas / entregadas : 0,
      retiroAgencia: statusStats.retiro_agencia?.count || 0,
    };
  }, [statusStats, totalOrders, totalMoney]);

  // ─── Chart: orders by day ───
  const dailyChart = useMemo(() => {
    const byDay = {};
    for (const o of classified) {
      const day = (o.created_at || "").slice(0, 10);
      if (!day) continue;
      if (!byDay[day])
        byDay[day] = { day, pedidos: 0, entregadas: 0, devoluciones: 0 };
      byDay[day].pedidos += 1;
      if (o._cat === "entregada") byDay[day].entregadas += 1;
      if (o._cat === "devolucion") byDay[day].devoluciones += 1;
    }
    return Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day));
  }, [classified]);

  // ─── Chart: pie data ───
  const pieData = useMemo(() => {
    return DISPLAY_ORDER.map((key) => ({
      name: STATUS_CATEGORIES[key].label,
      value: statusStats[key]?.count || 0,
      color: STATUS_CATEGORIES[key].color,
    })).filter((d) => d.value > 0);
  }, [statusStats]);

  // ─── Top products ───
  const topProducts = useMemo(() => {
    const byProduct = {};
    for (const o of classified) {
      const details = Array.isArray(o.orderdetails) ? o.orderdetails : [];
      for (const d of details) {
        const name = d?.product?.name || "Sin nombre";
        if (!byProduct[name])
          byProduct[name] = {
            name,
            ordenes: 0,
            entregadas: 0,
            devoluciones: 0,
            ingreso: 0,
          };
        byProduct[name].ordenes += 1;
        if (o._cat === "entregada") {
          byProduct[name].entregadas += 1;
          byProduct[name].ingreso += o._total;
        }
        if (o._cat === "devolucion") byProduct[name].devoluciones += 1;
      }
    }
    return Object.values(byProduct)
      .sort((a, b) => b.ordenes - a.ordenes)
      .slice(0, 10);
  }, [classified]);

  // ─── Retiro agencia orders ───
  const retiroAgenciaOrders = useMemo(() => {
    return classified
      .filter((o) => o._cat === "retiro_agencia")
      .map((o) => {
        const createdDate = new Date(o.created_at);
        const now = new Date();
        const diffDays = Math.floor(
          (now - createdDate) / (1000 * 60 * 60 * 24),
        );
        return { ...o, _days: diffDays };
      })
      .sort((a, b) => b._days - a._days);
  }, [classified]);

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
              Dashboard Inteligente — by GRUPO IMPOR
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
          onApply={fetchAllOrders}
          loading={loading}
        />

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
              Esto puede tomar unos segundos según el volumen de datos
            </p>
          </div>
        )}

        {/* ── Dashboard data ── */}
        {hasFetched && !loading && (
          <>
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
            <DropiRetiroAgencia orders={retiroAgenciaOrders} />

            {/* Products */}
            <DropiProductsTable topProducts={topProducts} loading={loading} />
          </>
        )}
      </div>
    </div>
  );
};

export default Dropiboard;
