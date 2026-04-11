import React, { useState, useEffect, useCallback, useMemo } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";

import AdsboardFilters from "./adsboard/AdsboardFilters";
import AdsboardKpiCards from "./adsboard/AdsboardKpiCards";
import AdsboardCampaignsTable from "./adsboard/AdsboardCampaignsTable";
import AdsboardTopAdsTable from "./adsboard/AdsboardTopAdsTable";

/**
 * Adsboard
 *
 * Dashboard analítico de Meta Ads integrado en ImporChat.
 * Permite a los clientes ver el rendimiento de sus campañas
 * de Facebook e Instagram sin salir de la plataforma.
 *
 * La conexión de Meta Ads se realiza desde Conexiones.
 * Este dashboard solo consulta y muestra datos.
 * Con el permiso ads_management también permite pausar/activar campañas.
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

const Adsboard = () => {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const t = localStorage.getItem("token");
      if (t) setUserData(jwtDecode(t));
    } catch {}
  }, []);

  // Conexiones
  const [conexiones, setConexiones] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(null);
  const [loadingConexiones, setLoadingConexiones] = useState(true);

  // Dashboard
  const [dateRange, setDateRange] = useState({
    since: daysAgoISO(30),
    until: todayISO(),
  });
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

  // Fetch dashboard — siempre usa time_range (since/until)
  const fetchDashboard = useCallback(async () => {
    if (!selectedConfigId || !isAdsConnected) return;
    try {
      setDashLoading(true);
      setHasFetched(true);

      const timeRange = JSON.stringify({
        since: dateRange.since,
        until: dateRange.until,
      });

      const [acctRes, campRes, adsRes] = await Promise.all([
        chatApi.get("/meta_ads/insights/account", {
          params: { id_configuracion: selectedConfigId, time_range: timeRange },
        }),
        chatApi.get("/meta_ads/insights/campaigns", {
          params: { id_configuracion: selectedConfigId, time_range: timeRange },
        }),
        chatApi.get("/meta_ads/insights/top-ads", {
          params: {
            id_configuracion: selectedConfigId,
            time_range: timeRange,
            limit: 10,
          },
        }),
      ]);

      setAccountData(acctRes.data.success ? acctRes.data.data : null);
      setCampaigns(campRes.data.success ? campRes.data.data || [] : []);
      setTopAds(adsRes.data.success ? adsRes.data.data || [] : []);
    } catch (err) {
      console.error("Adsboard fetch error:", err);
    } finally {
      setDashLoading(false);
    }
  }, [selectedConfigId, isAdsConnected, dateRange]);

  const currency = accountData?.currency || "USD";

  const handleChangeConfig = (id) => {
    setSelectedConfigId(id);
    setHasFetched(false);
    setAccountData(null);
    setCampaigns([]);
    setTopAds([]);
  };

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
                Métricas de campañas, ROAS, CPA y top ads en tiempo real
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
        <AdsboardFilters
          conexiones={conexiones}
          loadingConexiones={loadingConexiones}
          selectedConfigId={selectedConfigId}
          onChangeConfig={handleChangeConfig}
          isAdsConnected={isAdsConnected}
          dateRange={dateRange}
          onChangeDateRange={setDateRange}
          onConsultar={fetchDashboard}
          dashLoading={dashLoading}
          onGoToConexiones={() => navigate("/conexiones")}
          selectedConfig={selectedConfig}
        />

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
                Visualiza gasto total, ROAS, CPA, embudo de conversión, campañas
                activas, top ads por rendimiento y más.
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
                    label: "Embudo de conversión",
                    color: "bg-violet-50 text-violet-700 border-violet-200",
                  },
                  {
                    label: "Pausar campañas",
                    color: "bg-amber-50 text-amber-700 border-amber-200",
                  },
                  {
                    label: "Msgs WhatsApp",
                    color: "bg-green-50 text-green-700 border-green-200",
                  },
                  {
                    label: "Top Ads + Post ID",
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
            <p className="text-xs text-slate-400 mt-1.5">
              Esto puede tomar unos segundos
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

            {activeTab === "overview" && (
              <AdsboardKpiCards data={accountData} currency={currency} />
            )}
            {activeTab === "campaigns" && (
              <AdsboardCampaignsTable
                campaigns={campaigns}
                currency={currency}
                id_configuracion={selectedConfigId}
                onRefresh={fetchDashboard}
              />
            )}
            {activeTab === "top-ads" && (
              <AdsboardTopAdsTable topAds={topAds} currency={currency} />
            )}
          </>
        )}

        {/* NO DATA */}
        {hasFetched && !dashLoading && !accountData && (
          <div className="rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center">
            <i className="bx bx-bar-chart text-4xl text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-600 mb-1">
              Sin datos para este período
            </h3>
            <p className="text-xs text-slate-400">
              Prueba con otro rango de fechas o verifica que tu cuenta tenga
              campañas activas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Adsboard;
