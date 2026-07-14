import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import ClienteListDrawer from "./ClienteListDrawer";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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
      const [r1, r2] = await Promise.all([
        chatApi.get(`admin_dashboard/resumen?dias=${diasComp}`),
        chatApi.get("admin_dashboard/serie?meses=12"),
      ]);
      setResumen(r1.data.data);
      setSerie(r2.data.data || []);
    } catch {
      toast.error("Error cargando datos");
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
    fetchCancel(mesCancel);
  }, [mesCancel, fetchCancel]);

  const recalcular = async () => {
    setRefreshing(true);
    try {
      await chatApi.post("admin_dashboard/snapshot_now");
      await fetchAll();
      toast.success("Recalculado");
    } catch {
      toast.error("Error");
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

  if (loading || !resumen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <i className="bx bx-loader-alt bx-spin text-5xl text-cyan-600" />
          <p className="mt-3 text-slate-500">Cargando dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <PageShell>
    <div className="bg-slate-50 w-full min-h-[82vh]">
      <div className="w-full max-w-[1800px] mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        <HeaderBar
          resumen={resumen}
          refreshing={refreshing}
          onRecalcular={recalcular}
          diasComp={diasComp}
          setDiasComp={setDiasComp}
          fechaHoy={fechaHoy}
          fechaRef={fechaRef}
        />
        <Glosario
          open={glosarioOpen}
          onToggle={() => setGlosarioOpen(!glosarioOpen)}
        />
        <IngresosKpis resumen={resumen} />
        <PipelineFunnel resumen={resumen} onOpenDrawer={openDrawer} />
        <Distribucion
          resumen={resumen}
          distribucion={distribucion}
          totalDistribucion={totalDistribucion}
          onOpenDrawer={openDrawer}
        />
        <Crecimiento resumen={resumen} onOpenDrawer={openDrawer} />
        <EvolucionChart serieChart={serieChart} indiceCorte={indiceCorte} />
        <PlanesTable
          planes={resumen.desglose_planes || []}
          mrrStripe={resumen.mrr_stripe}
        />
        <CancelacionesTable
          rows={cancelaciones}
          mesCancel={mesCancel}
          setMesCancel={setMesCancel}
          navigate={navigate}
        />

        <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200">
          Snapshot diario · 23:55 America/Guayaquil · Comparativa con:{" "}
          {fmtDate(resumen.referencia_delta)}
        </footer>
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
