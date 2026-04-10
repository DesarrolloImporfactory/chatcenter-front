import React, { useState, useEffect, useCallback, useMemo } from "react";
import chatApi from "../../api/chatcenter";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

// ─── Helpers ───

const fmt = (n, decimals = 0) => {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const fmtCurrency = (n, currency = "USD") => {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });
};

const statusColor = (s) => {
  if (!s) return "bg-slate-100 text-slate-600";
  const st = String(s).toUpperCase();
  if (st === "ACTIVE")
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (st === "PAUSED")
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  return "bg-slate-50 text-slate-600 ring-1 ring-slate-200";
};

const StatCard = ({ icon, label, value, sub, tone = "default" }) => {
  const tones = {
    default: "bg-white ring-slate-200",
    green: "bg-emerald-50/50 ring-emerald-200",
    blue: "bg-blue-50/50 ring-blue-200",
    purple: "bg-indigo-50/50 ring-indigo-200",
    red: "bg-rose-50/50 ring-rose-200",
    amber: "bg-amber-50/50 ring-amber-200",
  };
  return (
    <div
      className={`rounded-xl p-4 ring-1 ${tones[tone] || tones.default} transition hover:shadow-sm`}
    >
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
        <i className={`bx ${icon} text-sm`} />
        {label}
      </div>
      <div className="text-xl font-bold text-slate-900 tracking-tight">
        {value}
      </div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
};

const presets = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "last_7d", label: "7 días" },
  { value: "last_14d", label: "14 días" },
  { value: "last_30d", label: "30 días" },
  { value: "this_month", label: "Este mes" },
  { value: "last_month", label: "Mes pasado" },
];

// ─── Main ───

const MetaAdsConexion = () => {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const t = localStorage.getItem("token");
      if (t) setUserData(jwtDecode(t));
    } catch {}
  }, []);

  // Conexiones (meta_ads_conectado viene del SQL)
  const [conexiones, setConexiones] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(null);
  const [loadingConexiones, setLoadingConexiones] = useState(true);

  // Dashboard
  const [datePreset, setDatePreset] = useState("last_30d");
  const [accountData, setAccountData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [topAds, setTopAds] = useState([]);
  const [dashLoading, setDashLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Cargar conexiones
  const fetchConexiones = useCallback(async () => {
    if (!userData?.id_usuario) return;
    setLoadingConexiones(true);
    try {
      const { data } = await chatApi.post(
        "configuraciones/listar_conexiones_sub_user",
        {
          id_usuario: userData.id_usuario,
          id_sub_usuario: userData.id_sub_usuario,
        },
      );
      const configs = data.data || [];
      setConexiones(configs);

      const lsConfig = Number(localStorage.getItem("id_configuracion"));
      if (lsConfig && configs.some((c) => c.id === lsConfig)) {
        setSelectedConfigId(lsConfig);
      } else {
        const withAds = configs.find((c) => Number(c.meta_ads_conectado) === 1);
        setSelectedConfigId(withAds?.id || configs[0]?.id || null);
      }
    } catch (err) {
      console.error("Error loading conexiones:", err);
    } finally {
      setLoadingConexiones(false);
    }
  }, [userData?.id_usuario]);

  useEffect(() => {
    fetchConexiones();
  }, [fetchConexiones]);

  // Derived
  const selectedConfig = useMemo(
    () => conexiones.find((c) => c.id === selectedConfigId) || null,
    [conexiones, selectedConfigId],
  );
  const isAdsConnected = Number(selectedConfig?.meta_ads_conectado) === 1;
  const adsAccountName = selectedConfig?.meta_ads_account_name || null;

  // Fetch dashboard
  const fetchDashboard = useCallback(async () => {
    if (!selectedConfigId || !isAdsConnected) return;
    try {
      setDashLoading(true);
      setHasFetched(true);
      const [acctRes, campRes, adsRes] = await Promise.all([
        chatApi.get("/meta_ads/insights/account", {
          params: {
            id_configuracion: selectedConfigId,
            date_preset: datePreset,
          },
        }),
        chatApi.get("/meta_ads/insights/campaigns", {
          params: {
            id_configuracion: selectedConfigId,
            date_preset: datePreset,
          },
        }),
        chatApi.get("/meta_ads/insights/top-ads", {
          params: {
            id_configuracion: selectedConfigId,
            date_preset: datePreset,
            limit: 10,
          },
        }),
      ]);
      setAccountData(acctRes.data.success ? acctRes.data.data : null);
      setCampaigns(campRes.data.success ? campRes.data.data || [] : []);
      setTopAds(adsRes.data.success ? adsRes.data.data || [] : []);
    } catch (err) {
      console.error("MetaAds dashboard:", err);
    } finally {
      setDashLoading(false);
    }
  }, [selectedConfigId, isAdsConnected, datePreset]);

  const currency = accountData?.currency || "USD";
  const d = accountData || {};

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0B1426] via-[#1a1040] to-[#4f46e5] text-white px-6 py-5">
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
            <div className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center">
              <i className="bx bxs-bar-chart-alt-2 text-xl text-white" />
            </div>
            <div className="h-8 w-px bg-white/30" />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-tight">
                Dashboard analítico de Meta Ads
              </h1>
              <p className="text-[11px] text-white/70 mt-0.5">
                Métricas de campañas, ROAS, CPA y top ads
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAdsConnected && adsAccountName && (
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-white font-medium">
                  {adsAccountName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 sm:px-6 py-5">
        {/* FILTERS BAR */}
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
                  onChange={(e) => {
                    setSelectedConfigId(Number(e.target.value));
                    setHasFetched(false);
                    setAccountData(null);
                    setCampaigns([]);
                    setTopAds([]);
                  }}
                >
                  {conexiones.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre_configuracion ||
                        c.telefono ||
                        `Config #${c.id}`}
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
              <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5 flex-wrap">
                {presets.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setDatePreset(p.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                      datePreset === p.value
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action — solo Consultar si está conectado */}
            {isAdsConnected ? (
              <button
                onClick={fetchDashboard}
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
                onClick={() => navigate("/conexiones")}
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
                <i className="bx bx-info-circle" /> Esta conexión no tiene Meta
                Ads vinculado. Conéctalo desde la vista de Conexiones.
              </span>
            )}
          </div>
        </div>

        {/* EMPTY STATE */}
        {!hasFetched && !dashLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-indigo-600 via-indigo-400 to-blue-300" />
            <div className="px-8 py-14 text-center">
              <div className="flex items-center justify-center gap-5 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 ring-1 ring-indigo-200 grid place-items-center">
                  <i className="bx bxs-bar-chart-alt-2 text-3xl text-indigo-600" />
                </div>
                <div className="h-12 w-px bg-slate-200" />
                <div className="flex items-end gap-1.5">
                  {[40, 65, 50, 80, 60, 90, 72].map((h, i) => (
                    <div
                      key={i}
                      className="w-3 rounded-t-sm"
                      style={{
                        height: `${h * 0.55}px`,
                        background:
                          i % 3 === 0
                            ? "#4f46e5"
                            : i % 3 === 1
                              ? "#10B981"
                              : "#3b82f6",
                        opacity: 0.7 + i * 0.04,
                        animation: `growBar 1.5s ease-out ${i * 0.1}s both`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">
                Tus campañas de Meta Ads en un solo lugar
              </h3>
              <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                Visualiza gasto total, ROAS, CPA, estado de campañas, top ads
                por rendimiento, mensajes de WhatsApp y más.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {[
                  {
                    label: "Gasto y Revenue",
                    color: "bg-rose-50 text-rose-700 border-rose-200",
                  },
                  {
                    label: "ROAS & CPA",
                    color: "bg-blue-50 text-blue-700 border-blue-200",
                  },
                  {
                    label: "Top Ads",
                    color: "bg-violet-50 text-violet-700 border-violet-200",
                  },
                  {
                    label: "Status campañas",
                    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  },
                  {
                    label: "Msgs WhatsApp",
                    color: "bg-green-50 text-green-700 border-green-200",
                  },
                  {
                    label: "Post ID",
                    color: "bg-amber-50 text-amber-700 border-amber-200",
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
                <i className="bx bx-up-arrow-alt text-lg animate-bounce" />
                <span className="text-xs font-medium">
                  {isAdsConnected ? (
                    <>
                      Selecciona el período y presiona{" "}
                      <strong className="text-indigo-600">Consultar</strong>
                    </>
                  ) : (
                    <>
                      Conecta Meta Ads desde{" "}
                      <strong
                        className="text-indigo-600 cursor-pointer"
                        onClick={() => navigate("/conexiones")}
                      >
                        Conexiones
                      </strong>{" "}
                      para empezar
                    </>
                  )}
                </span>
              </div>
            </div>
            <style>{`@keyframes growBar { from { height: 0; opacity: 0; } }`}</style>
          </div>
        )}

        {/* LOADING */}
        {dashLoading && !accountData && (
          <div className="rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center">
            <div className="flex justify-center gap-1 mb-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-indigo-600"
                  style={{ animation: `pulse 1.2s infinite ${i * 0.2}s` }}
                />
              ))}
            </div>
            <p className="text-sm font-semibold text-slate-700">
              Consultando métricas desde Meta...
            </p>
            <style>{`@keyframes pulse { 0%,100% { opacity:0.2; transform:scale(0.8); } 50% { opacity:1; transform:scale(1.2); } }`}</style>
          </div>
        )}

        {/* DASHBOARD DATA */}
        {hasFetched && !dashLoading && accountData && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
              <div className="flex gap-1">
                {[
                  { key: "overview", icon: "bx-grid-alt", label: "Resumen" },
                  { key: "campaigns", icon: "bx-layer", label: "Campañas" },
                  { key: "top-ads", icon: "bx-trophy", label: "Top Ads" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                      activeTab === t.key
                        ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <i className={`bx ${t.icon}`} />
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                onClick={fetchDashboard}
                disabled={dashLoading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
              >
                <i
                  className={`bx bx-refresh text-sm ${dashLoading ? "animate-spin" : ""}`}
                />{" "}
                Actualizar
              </button>
            </div>

            {activeTab === "overview" ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    icon="bx-dollar-circle"
                    label="Gasto total"
                    value={fmtCurrency(d.spend, currency)}
                    tone="red"
                  />
                  <StatCard
                    icon="bx-trending-up"
                    label="Revenue"
                    value={fmtCurrency(d.purchase_value, currency)}
                    tone="green"
                  />
                  <StatCard
                    icon="bx-target-lock"
                    label="ROAS"
                    value={`${fmt(d.roas, 2)}x`}
                    tone="blue"
                    sub={d.roas >= 2 ? "✓ Rentable" : "⚠ Bajo"}
                  />
                  <StatCard
                    icon="bx-cart"
                    label="Compras"
                    value={fmt(d.purchases)}
                    tone="purple"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    icon="bx-dollar"
                    label="CPA Compra"
                    value={fmtCurrency(d.cpa_purchase, currency)}
                    tone="amber"
                  />
                  <StatCard
                    icon="bx-pointer"
                    label="CTR promedio"
                    value={`${fmt(d.ctr, 2)}%`}
                  />
                  <StatCard
                    icon="bx-mouse"
                    label="CPC promedio"
                    value={fmtCurrency(d.cpc, currency)}
                  />
                  <StatCard
                    icon="bx-show"
                    label="Impresiones"
                    value={fmt(d.impressions)}
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    icon="bx-user-check"
                    label="Registros"
                    value={fmt(d.complete_registrations)}
                    tone="blue"
                  />
                  <StatCard
                    icon="bxl-whatsapp"
                    label="Conversaciones WA"
                    value={fmt(d.messaging_conversations)}
                    tone="green"
                  />
                  <StatCard
                    icon="bx-user-plus"
                    label="Leads"
                    value={fmt(d.leads)}
                  />
                  <StatCard
                    icon="bx-cart-add"
                    label="Add to Cart"
                    value={fmt(d.add_to_cart)}
                  />
                </div>
              </div>
            ) : activeTab === "campaigns" ? (
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  {campaigns.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">
                      No hay datos de campañas para este período.
                    </p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                          <th className="px-4 pb-3 pt-4">Campaña</th>
                          <th className="pb-3 pt-4">Estado</th>
                          <th className="pb-3 pt-4 text-right">Gasto</th>
                          <th className="pb-3 pt-4 text-right">Revenue</th>
                          <th className="pb-3 pt-4 text-right">ROAS</th>
                          <th className="pb-3 pt-4 text-right">Compras</th>
                          <th className="pb-3 pt-4 text-right">CPA</th>
                          <th className="pb-3 pt-4 text-right">CTR</th>
                          <th className="pb-3 pt-4 text-right">Msgs WA</th>
                          <th className="pb-3 pt-4 pr-4 text-right">
                            Budget/día
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c, i) => (
                          <tr
                            key={c.campaign_id || i}
                            className="border-b border-slate-50 hover:bg-slate-50/50"
                          >
                            <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate">
                              {c.campaign_name}
                            </td>
                            <td className="py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor(c.effective_status)}`}
                              >
                                {c.effective_status || "—"}
                              </span>
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {fmtCurrency(c.spend, currency)}
                            </td>
                            <td className="py-3 text-right tabular-nums text-emerald-700 font-medium">
                              {fmtCurrency(c.purchase_value, currency)}
                            </td>
                            <td className="py-3 text-right tabular-nums font-medium">
                              <span
                                className={
                                  c.roas >= 2
                                    ? "text-emerald-700"
                                    : c.roas > 0
                                      ? "text-amber-700"
                                      : "text-slate-400"
                                }
                              >
                                {fmt(c.roas, 2)}x
                              </span>
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {fmt(c.purchases)}
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {fmtCurrency(c.cpa_purchase, currency)}
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {fmt(c.ctr, 2)}%
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {fmt(c.messaging_conversations)}
                            </td>
                            <td className="py-3 pr-4 text-right tabular-nums text-slate-500">
                              {c.daily_budget
                                ? fmtCurrency(c.daily_budget, currency)
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  {topAds.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">
                      No hay datos de ads para este período.
                    </p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                          <th className="px-4 pb-3 pt-4">Ad</th>
                          <th className="pb-3 pt-4">Campaña</th>
                          <th className="pb-3 pt-4 text-right">Gasto</th>
                          <th className="pb-3 pt-4 text-right">Revenue</th>
                          <th className="pb-3 pt-4 text-right">ROAS</th>
                          <th className="pb-3 pt-4 text-right">Compras</th>
                          <th className="pb-3 pt-4 text-right">CPA</th>
                          <th className="pb-3 pt-4 text-right">CTR</th>
                          <th className="pb-3 pt-4 text-right">Clicks</th>
                          <th className="pb-3 pt-4 pr-4">Post ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topAds.map((ad, i) => (
                          <tr
                            key={ad.ad_id || i}
                            className="border-b border-slate-50 hover:bg-slate-50/50"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {ad.thumbnail_url ? (
                                  <img
                                    src={ad.thumbnail_url}
                                    alt=""
                                    className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 grid place-items-center shrink-0">
                                    <i className="bx bx-image text-slate-400" />
                                  </div>
                                )}
                                <span className="font-medium text-slate-800 max-w-[150px] truncate">
                                  {ad.ad_name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 text-slate-500 max-w-[130px] truncate">
                              {ad.campaign_name}
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {fmtCurrency(ad.spend, currency)}
                            </td>
                            <td className="py-3 text-right tabular-nums text-emerald-700 font-medium">
                              {fmtCurrency(ad.purchase_value, currency)}
                            </td>
                            <td className="py-3 text-right tabular-nums font-medium">
                              <span
                                className={
                                  ad.roas >= 2
                                    ? "text-emerald-700"
                                    : ad.roas > 0
                                      ? "text-amber-700"
                                      : "text-slate-400"
                                }
                              >
                                {fmt(ad.roas, 2)}x
                              </span>
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {fmt(ad.purchases)}
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {fmtCurrency(ad.cpa_purchase, currency)}
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {fmt(ad.ctr, 2)}%
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {fmt(ad.clicks)}
                            </td>
                            <td className="py-3 pr-4 text-[10px] text-slate-400 font-mono max-w-[120px] truncate">
                              {ad.post_id ? (
                                <a
                                  href={`https://www.facebook.com/${ad.post_id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline hover:text-blue-600"
                                  title={ad.post_id}
                                >
                                  {ad.post_id}
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            <div className="text-center pt-6 pb-2 border-t border-slate-200 mt-4">
              <p className="text-[10px] text-slate-400">
                Meta Marketing API · {adsAccountName} · {currency}
              </p>
            </div>
          </>
        )}

        {hasFetched && !dashLoading && !accountData && (
          <div className="rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center">
            <i className="bx bx-bar-chart text-4xl text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-600 mb-1">
              Sin datos para este período
            </h3>
            <p className="text-xs text-slate-400">
              Prueba con otro rango de fechas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetaAdsConexion;
