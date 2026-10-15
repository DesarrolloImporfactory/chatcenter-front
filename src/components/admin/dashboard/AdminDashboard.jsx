import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import PageShell from "../../layout/PageShell";
import chatApi from "../../../api/chatcenter";

import { mesLabel, currentMonth, fmtDate } from "./utils";
import HeaderBar from "./sections/HeaderBar";
import Glosario from "./sections/Glosario";
import IngresosKpis from "./sections/IngresosKpis";
import PipelineFunnel from "./sections/PipelineFunnel";
import Distribucion from "./sections/Distribucion";
import Crecimiento from "./sections/Crecimiento";
import EvolucionChart from "./sections/EvolucionChart";
import PlanesTable from "./sections/PlanesTable";
import CancelacionesTable from "./sections/CancelacionesTable";
import CobrosTab from "./sections/CobrosTab";
import RecuperacionPanel from "../../../pages/recuperacion/RecuperacionPanel";
import ClienteListDrawer from "./ClienteListDrawer";

// Pestañas: cada una carga solo lo suyo (Cobros consulta Stripe en vivo)
const TABS = [
  { id: "resumen", label: "Resumen", icon: "bx-dollar-circle" },
  { id: "cobros", label: "Cobros reales", icon: "bx-wallet" },
  { id: "clientes", label: "Clientes", icon: "bx-group" },
  { id: "historico", label: "Histórico y planes", icon: "bx-line-chart" },
  { id: "cancelaciones", label: "Cancelaciones", icon: "bx-user-x" },
  { id: "recuperacion", label: "Recuperación", icon: "bx-support" },
];

// Finanzas (lista en requireFinanzasDashboard del back) solo lee: sin Recalcular,
// sin Recuperación ni Panel de usuarios. El back lo exige igual.
const esSuperAdmin = () => {
  try {
    return localStorage.getItem("user_role") === "super_administrador";
  } catch {
    return false;
  }
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const superAdmin = useMemo(esSuperAdmin, []);
  const tabs = useMemo(
    () => (superAdmin ? TABS : TABS.filter((t) => t.id !== "recuperacion")),
    [superAdmin],
  );
  const tab = tabs.some((t) => t.id === searchParams.get("tab"))
    ? searchParams.get("tab")
    : "resumen";
  const setTab = (id) => setSearchParams({ tab: id }, { replace: true });
  const [loading, setLoading] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [serie, setSerie] = useState([]);
  const [cancelaciones, setCancelaciones] = useState([]);
  const [mesCancel, setMesCancel] = useState(currentMonth());
  const [glosarioOpen, setGlosarioOpen] = useState(false);
  const [diasComp, setDiasComp] = useState(30);
  const [drawer, setDrawer] = useState({
    open: false,
    categoria: null,
    titulo: "",
    color: "",
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const opts = { silentError: true };
      const [r1, r2] = await Promise.all([
        chatApi.get(`admin_dashboard/resumen?dias=${diasComp}`, opts),
        chatApi.get("admin_dashboard/serie?meses=12", opts),
      ]);
      setResumen(r1.data.data);
      setSerie(r2.data.data || []);
    } catch (e) {
      if (e?.response?.status === 403) setSinPermiso(true);
      else toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, [diasComp]);

  const fetchCancel = useCallback(async (mes) => {
    try {
      const { data } = await chatApi.get(
        `admin_dashboard/cancelaciones_mes?mes=${mes}`,
      );
      setCancelaciones(data.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  useEffect(() => {
    if (tab === "cancelaciones") fetchCancel(mesCancel);
  }, [tab, mesCancel, fetchCancel]);

  const recalcular = async () => {
    setRefreshing(true);
    try {
      await chatApi.post("admin_dashboard/snapshot_now");
      await fetchAll();
      toast.success("Recalculado");
    } catch (e) {
      toast.error(
        e?.response?.status === 403
          ? "No tienes permiso para recalcular."
          : "Error",
      );
    } finally {
      setRefreshing(false);
    }
  };

  const openDrawer = (categoria, titulo, color) => {
    setDrawer({ open: true, categoria, titulo, color });
  };

  const serieChart = useMemo(
    () =>
      serie.map((s) => ({
        ...s,
        label: mesLabel(s.mes),
        mrr_render: s.is_estimated ? s.mrr_potencial : s.mrr_stripe,
      })),
    [serie],
  );

  const indiceCorte = useMemo(
    () => serieChart.findIndex((s) => !s.is_estimated),
    [serieChart],
  );

  const distribucion = useMemo(() => {
    if (!resumen) return [];
    return [
      {
        name: "Pagando Stripe",
        value: resumen.clientes_pagando_stripe,
        color: "#10B981",
        cat: "pagando_stripe",
      },
      {
        name: "Trial Stripe",
        value: resumen.clientes_trial_stripe,
        color: "#06B6D4",
        cat: "trial_stripe",
      },
      {
        name: "Acceso manual",
        value: resumen.clientes_acceso_manual,
        color: "#F59E0B",
        cat: "acceso_manual",
      },
      {
        name: "Cortesía VIP",
        value: resumen.clientes_cortesia,
        color: "#8B5CF6",
        cat: "permanentes",
      },
      {
        name: "Trial uso (IL)",
        value: resumen.clientes_trial_usage,
        color: "#0EA5E9",
        cat: "trial_usage",
      },
      {
        name: "Código promo",
        value: resumen.clientes_promo_usage,
        color: "#EC4899",
        cat: "promo_usage",
      },
      {
        name: "Vencidos",
        value: resumen.clientes_vencidos,
        color: "#94A3B8",
        cat: "vencidos",
      },
      {
        name: "Suspendidos",
        value: resumen.clientes_suspendidos,
        color: "#FB923C",
        cat: "suspendidos",
      },
      {
        name: "Cancelados",
        value: resumen.clientes_cancelados,
        color: "#F43F5E",
        cat: "cancelados",
      },
      {
        name: "Inactivos (sin plan)",
        value: resumen.clientes_inactivos,
        color: "#CBD5E1",
        cat: "inactivos",
      },
    ].filter((x) => x.value > 0);
  }, [resumen]);

  const fechaHoy = new Date();
  const fechaRef = resumen?.referencia_delta
    ? new Date(resumen.referencia_delta)
    : null;
  const totalDistribucion = distribucion.reduce((s, x) => s + x.value, 0);

  const cargando = loading || !resumen;

  if (sinPermiso) {
    return (
      <PageShell>
        <div className="bg-slate-50 w-full min-h-[82vh] flex items-center justify-center px-4">
          <div className="text-center">
            <i className="bx bx-lock-alt text-5xl text-slate-400" />
            <p className="mt-3 text-lg font-bold text-slate-800">
              Acceso denegado
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Esta sección es solo para super administradores y finanzas.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
    <div className="bg-slate-50 w-full min-h-[82vh]">
      <div className="w-full max-w-[1800px] mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        <HeaderBar
          resumen={resumen}
          refreshing={refreshing}
          onRecalcular={
            !superAdmin || tab === "cobros" || tab === "recuperacion"
              ? null
              : recalcular
          }
          mostrarPanelUsuarios={superAdmin}
          diasComp={diasComp}
          setDiasComp={setDiasComp}
          fechaHoy={fechaHoy}
          fechaRef={fechaRef}
          mostrarPeriodo={tab === "resumen" || tab === "clientes"}
        />

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 -mt-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition ${
                tab === t.id
                  ? "border-cyan-600 text-cyan-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <i className={`bx ${t.icon} text-base`} />
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "cobros" ? (
          <CobrosTab />
        ) : tab === "recuperacion" ? (
          <RecuperacionPanel />
        ) : cargando ? (
          <div className="py-20 text-center">
            <i className="bx bx-loader-alt bx-spin text-5xl text-cyan-600" />
            <p className="mt-3 text-slate-500">Cargando dashboard…</p>
          </div>
        ) : (
          <>
            <Glosario
              open={glosarioOpen}
              onToggle={() => setGlosarioOpen(!glosarioOpen)}
            />
            {tab === "resumen" && (
              <>
                <IngresosKpis resumen={resumen} />
                <PipelineFunnel resumen={resumen} onOpenDrawer={openDrawer} />
              </>
            )}
            {tab === "clientes" && (
              <>
                <Distribucion
                  resumen={resumen}
                  distribucion={distribucion}
                  totalDistribucion={totalDistribucion}
                  onOpenDrawer={openDrawer}
                />
                <Crecimiento resumen={resumen} onOpenDrawer={openDrawer} />
              </>
            )}
            {tab === "historico" && (
              <>
                <EvolucionChart
                  serieChart={serieChart}
                  indiceCorte={indiceCorte}
                />
                <PlanesTable
                  planes={resumen.desglose_planes || []}
                  mrrStripe={resumen.mrr_stripe}
                />
              </>
            )}
            {tab === "cancelaciones" && (
              <CancelacionesTable
                rows={cancelaciones}
                mesCancel={mesCancel}
                setMesCancel={setMesCancel}
                navigate={navigate}
              />
            )}
          </>
        )}

        {tab !== "cobros" && tab !== "recuperacion" && resumen && (
          <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200">
            Snapshot diario · 23:55 America/Guayaquil · Comparativa con:{" "}
            {fmtDate(resumen.referencia_delta)}
          </footer>
        )}
      </div>

      {drawer.open && (
        <ClienteListDrawer
          categoria={drawer.categoria}
          titulo={drawer.titulo}
          color={drawer.color}
          onClose={() => setDrawer({ open: false })}
          navigate={navigate}
        />
      )}
    </div>
    </PageShell>
  );
}
