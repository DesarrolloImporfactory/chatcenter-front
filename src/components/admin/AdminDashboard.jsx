import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import chatApi from "../../api/chatcenter";

/* ═══ Helpers ═══ */
const money0 = (n) =>
  n == null
    ? "—"
    : "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const money2 = (n) =>
  n == null
    ? "—"
    : "$" +
      Number(n).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
const num = (n) => (Number(n) || 0).toLocaleString("en-US");
const pct1 = (n) => (n == null ? "—" : `${Number(n).toFixed(1)}%`);
const fmtDate = (d) =>
  !d
    ? "—"
    : new Date(d).toLocaleDateString("es-EC", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
const mesLabel = (yyyymm) => {
  const [y, m] = yyyymm.split("-");
  const meses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  return `${meses[parseInt(m, 10) - 1]} ${y.slice(2)}`;
};
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/* Label de producto mejorado */
const PRODUCTO_LABEL = {
  imporchat: "ImporChat",
  insta_landing: "Insta Landing",
  both: "ImporChat + Insta Landing + Dashboard",
};
const PRODUCTO_BADGE = {
  imporchat: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  insta_landing: "bg-violet-50 text-violet-700 ring-violet-200",
  both: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

/* Etiqueta especial de duración */
const planDurationLabel = (plan) => {
  if (plan.id_plan === 21) {
    return "$29 · Periodo gratis variable (30 / 90 / 180 días según membresía externa)";
  }
  return `$${Number(plan.precio_plan).toFixed(0)} cada ${plan.duracion_plan} días`;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [serie, setSerie] = useState([]);
  const [cancelaciones, setCancelaciones] = useState([]);
  const [mesCancel, setMesCancel] = useState(currentMonth());
  const [glosarioOpen, setGlosarioOpen] = useState(false); // CERRADO por default
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

  const openCategoryDrawer = (categoria, titulo, color) => {
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

  /* Distribución para donut — INCLUYE TODOS los estados */
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
    <div className="min-h-screen bg-slate-50 w-full">
      <div className="w-full max-w-[1800px] mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {/* HEADER */}
        <header className="flex items-start justify-between flex-wrap gap-3 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-cyan-700">
              <i className="bx bxs-dashboard" /> Dashboard ImporChat
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Salud del negocio
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Métricas en vivo · Excluye automáticamente planes TEST ·{" "}
              {num(resumen.total_registros_bd)} registros en la base de datos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin/usuarios")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-slate-700 ring-1 ring-slate-200 font-semibold text-sm hover:bg-slate-100 transition"
            >
              <i className="bx bx-list-ul" /> Panel de usuarios
            </button>
            <button
              onClick={recalcular}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 transition"
            >
              <i
                className={`bx ${refreshing ? "bx-loader-alt bx-spin" : "bx-refresh"}`}
              />
              {refreshing ? "Recalculando…" : "Recalcular ahora"}
            </button>
          </div>
        </header>

        {/* BANNER FECHAS + SELECTOR */}
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 px-4 py-3 flex items-center gap-3 flex-wrap">
          <i className="bx bx-calendar text-cyan-700 text-xl" />
          <div className="flex items-center gap-2 text-sm flex-wrap flex-1">
            <span className="text-slate-700">
              <b>Comparando:</b> hoy
            </span>
            <span className="font-mono text-cyan-800 bg-white px-2 py-0.5 rounded ring-1 ring-cyan-200">
              {fechaHoy.toLocaleDateString("es-EC", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="text-slate-400">vs</span>
            <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded ring-1 ring-slate-200">
              {fechaRef
                ? fechaRef.toLocaleDateString("es-EC", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : "sin referencia"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600 font-semibold">
              Periodo:
            </label>
            <select
              value={diasComp}
              onChange={(e) => setDiasComp(Number(e.target.value))}
              className="px-3 py-1.5 border border-cyan-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value={7}>vs hace 7 días</option>
              <option value={14}>vs hace 14 días</option>
              <option value={30}>vs hace 30 días</option>
              <option value={60}>vs hace 60 días</option>
              <option value={90}>vs hace 90 días</option>
            </select>
          </div>
        </div>

        {/* GLOSARIO */}
        <Glosario
          open={glosarioOpen}
          onToggle={() => setGlosarioOpen(!glosarioOpen)}
        />

        {/* SECCIÓN 1: INGRESOS */}
        <Section
          icon="bx-dollar-circle"
          title="Ingresos"
          subtitle="Lo que cobras hoy vía Stripe y lo que podrías cobrar si convirtieras todo el pipeline"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi
              accent="emerald"
              icon="bx-dollar"
              label="MRR real (Stripe)"
              value={money0(resumen.mrr_stripe)}
              delta={resumen.deltas?.mrr_stripe}
              deltaFmt={(v) => money0(v)}
              explain="Suma del precio de las suscripciones Stripe que SE ESTÁN COBRANDO ahora (estado active). Debe coincidir con el MRR de Stripe dashboard. Excluye planes TEST."
            />
            <Kpi
              accent="cyan"
              icon="bx-line-chart"
              label="ARR proyectado"
              value={money0(resumen.arr_stripe)}
              explain="Annual Recurring Revenue = MRR × 12. Lo que cobrarías en 12 meses si todo se mantuviera igual."
            />
            <Kpi
              accent="amber"
              icon="bx-target-lock"
              label="MRR potencial"
              value={money0(resumen.mrr_potencial)}
              delta={resumen.deltas?.mrr_potencial}
              deltaFmt={(v) => money0(v)}
              explain="Lo que cobrarías SI todos los del pipeline (trial Stripe + acceso manual) convirtieran a pagar."
              hint={`${((resumen.mrr_potencial / Math.max(1, resumen.mrr_stripe) - 1) * 100).toFixed(0)}% más que el MRR actual`}
            />
            <Kpi
              accent="violet"
              icon="bx-coin"
              label="ARPU"
              value={money2(resumen.arpu)}
              explain="Ingreso promedio por cliente pagando. = MRR Stripe ÷ clientes pagando."
              hint="Por cliente pagando"
            />
          </div>
        </Section>

        {/* SECCIÓN 2: PIPELINE */}
        <Section
          icon="bx-filter"
          title="Pipeline de conversión"
          subtitle="Cómo se mueven los clientes desde acceso gratuito hacia el pago recurrente"
        >
          <PipelineFunnel
            etapas={[
              {
                key: "manual",
                cat: "acceso_manual",
                label: "Acceso manual (sin tarjeta)",
                desc: "Tienen plan activo PERO no han ingresado tarjeta de pago",
                detalle:
                  "Mayoritariamente clientes del curso 'Method Ecommerce' a quienes activaste el plan manualmente por 30/90/180 días según su membresía. Después deben capturar tarjeta o pierden acceso.",
                value: resumen.clientes_acceso_manual,
                color: "amber",
                icon: "bx-key",
                stat: `${resumen.por_convertir_30d} terminan periodo en los próximos 30 días`,
                action: "Capturar tarjeta antes que termine su acceso",
              },
              {
                key: "trial",
                cat: "trial_stripe",
                label: "Trial Stripe (con tarjeta)",
                desc: "Tarjeta ya capturada en Stripe, en periodo de prueba",
                detalle:
                  "Stripe los tiene en estado 'trialing'. Cuando termine el plazo (5-7 días o duración variable para Method Ecommerce), Stripe cobra automáticamente.",
                value: resumen.clientes_trial_stripe,
                color: "cyan",
                icon: "bx-credit-card",
                stat: "Próximo cobro automático cuando termine su trial",
                action: "Asegurar que el producto les esté entregando valor",
              },
              {
                key: "pagando",
                cat: "pagando_stripe",
                label: "Pagando ($ MRR)",
                desc: "Suscripción Stripe en estado 'active'",
                detalle:
                  "Estos clientes están generando tu MRR real cada mes. Stripe les cobra automáticamente en cada ciclo.",
                value: resumen.clientes_pagando_stripe,
                color: "emerald",
                icon: "bx-check-circle",
                stat: `Aportan ${money0(resumen.mrr_stripe)} de MRR`,
                action: "Reducir churn, evitar cancelaciones",
              },
            ]}
            tasaConversion={resumen.tasa_conversion_pct}
            convMuestra={resumen.conversion_muestra}
            onOpen={openCategoryDrawer}
          />
        </Section>

        {/* SECCIÓN 3: DISTRIBUCIÓN COMPLETA */}
        <Section
          icon="bx-pie-chart-alt-2"
          title="Distribución de clientes"
          subtitle={`Vista completa de los ${num(resumen.total_registros_bd)} registros · ${num(totalDistribucion)} con estado clasificable · Click en cada tarjeta para ver la lista`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-700">
                  Vista visual
                </h3>
                <div className="text-xs text-slate-500">
                  <span className="font-bold text-slate-900">
                    {num(totalDistribucion)}
                  </span>{" "}
                  de {num(resumen.total_registros_bd)} totales
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribucion}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {distribucion.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<DonutTooltip total={totalDistribucion} />}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 mt-2 max-h-48 overflow-y-auto pr-1">
                {distribucion.map((d) => {
                  const p = ((d.value / totalDistribucion) * 100).toFixed(1);
                  return (
                    <div
                      key={d.name}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                        style={{ background: d.color }}
                      />
                      <span className="flex-1 text-slate-700 truncate">
                        {d.name}
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {num(d.value)}
                      </span>
                      <span className="text-slate-400 w-10 text-right">
                        {p}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
              <EstadoCard
                icon="bx-check-circle"
                color="emerald"
                label="Pagando Stripe"
                value={resumen.clientes_pagando_stripe}
                total={resumen.total_registros_bd}
                explain="Suscripción Stripe activa. Generan MRR."
                onClick={() =>
                  openCategoryDrawer(
                    "pagando_stripe",
                    "Pagando Stripe",
                    "emerald",
                  )
                }
              />
              <EstadoCard
                icon="bx-credit-card"
                color="cyan"
                label="Trial Stripe"
                value={resumen.clientes_trial_stripe}
                total={resumen.total_registros_bd}
                explain="Tarjeta capturada, en prueba. Stripe cobrará automático."
                onClick={() =>
                  openCategoryDrawer("trial_stripe", "Trial Stripe", "cyan")
                }
              />
              <EstadoCard
                icon="bx-key"
                color="amber"
                label="Acceso manual"
                value={resumen.clientes_acceso_manual}
                total={resumen.total_registros_bd}
                explain="Plan activo SIN tarjeta. Curso Method Ecommerce y cortesías implícitas."
                onClick={() =>
                  openCategoryDrawer(
                    "acceso_manual",
                    "Acceso manual (sin tarjeta)",
                    "amber",
                  )
                }
              />
              <EstadoCard
                icon="bxs-crown"
                color="violet"
                label="Cortesía VIP"
                value={resumen.clientes_cortesia}
                total={resumen.total_registros_bd}
                explain="Permanente=1: equipo interno, partners, demos."
                onClick={() =>
                  openCategoryDrawer("permanentes", "Cortesía VIP", "violet")
                }
              />
              <EstadoCard
                icon="bx-gift"
                color="sky"
                label="Trial uso (IL)"
                value={resumen.clientes_trial_usage}
                total={resumen.total_registros_bd}
                explain="10 imágenes gratis para probar Insta Landing."
                onClick={() =>
                  openCategoryDrawer(
                    "trial_usage",
                    "Trial uso de Insta Landing",
                    "sky",
                  )
                }
              />
              <EstadoCard
                icon="bx-tag"
                color="pink"
                label="Código promo"
                value={resumen.clientes_promo_usage}
                total={resumen.total_registros_bd}
                explain="Canjearon código promocional, recursos limitados."
                onClick={() =>
                  openCategoryDrawer(
                    "promo_usage",
                    "Código promocional",
                    "pink",
                  )
                }
              />
              <EstadoCard
                icon="bx-time-five"
                color="slate"
                label="Vencidos"
                value={resumen.clientes_vencidos}
                total={resumen.total_registros_bd}
                explain="Plan expirado. Posibles a recuperar con win-back."
                onClick={() =>
                  openCategoryDrawer("vencidos", "Vencidos", "slate")
                }
              />
              <EstadoCard
                icon="bx-pause-circle"
                color="orange"
                label="Suspendidos"
                value={resumen.clientes_suspendidos}
                total={resumen.total_registros_bd}
                explain="Pago Stripe falló. URGENTE: contactar."
                onClick={() =>
                  openCategoryDrawer(
                    "suspendidos",
                    "Suspendidos (pago fallido)",
                    "orange",
                  )
                }
              />
              <EstadoCard
                icon="bx-block"
                color="rose"
                label="Cancelados"
                value={resumen.clientes_cancelados}
                total={resumen.total_registros_bd}
                explain="Cancelaron definitivamente la suscripción."
                onClick={() =>
                  openCategoryDrawer("cancelados", "Cancelados", "rose")
                }
              />
              <EstadoCard
                icon="bx-user"
                color="slate"
                label="Inactivos (sin plan)"
                value={resumen.clientes_inactivos}
                total={resumen.total_registros_bd}
                explain="Cuentas creadas sin plan asignado. Posibles a captar."
                onClick={() =>
                  openCategoryDrawer(
                    "inactivos",
                    "Inactivos (sin plan)",
                    "slate",
                  )
                }
              />
            </div>
          </div>
        </Section>

        {/* SECCIÓN 4: CRECIMIENTO */}
        <Section
          icon="bx-trending-up"
          title="Crecimiento del mes"
          subtitle="Movimiento del mes en curso · Captación, pérdida y oportunidad inmediata"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi
              accent="emerald"
              icon="bx-user-plus"
              label="Nuevos registros"
              value={num(resumen.nuevos_mes)}
              delta={resumen.deltas?.nuevos_mes}
              explain="Cuentas creadas este mes."
            />
            <Kpi
              accent="rose"
              icon="bx-user-x"
              label="Cancelados"
              value={num(resumen.cancelados_mes)}
              explain="Suscripciones con canceled_at este mes."
            />
            <Kpi
              accent={resumen.churn_pct > 5 ? "rose" : "emerald"}
              icon="bx-trending-down"
              label="Churn mensual"
              value={pct1(resumen.churn_pct)}
              explain="Cancelados ÷ pagando al inicio del mes × 100. SaaS sano: <5%."
              hint={resumen.churn_pct > 5 ? "Alto — vigilar" : "Saludable"}
            />
            <Kpi
              accent="cyan"
              icon="bx-gift"
              label="Trial → Paid"
              value={pct1(resumen.tasa_conversion_pct)}
              explain="De clientes que terminaron periodo gratis en últimos 90 días, % que paga ahora."
              hint={`Muestra: ${resumen.conversion_muestra?.convertidos || 0}/${resumen.conversion_muestra?.total || 0}`}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div
              onClick={() =>
                openCategoryDrawer(
                  "por_convertir_30d",
                  "Terminan periodo en 30 días",
                  "amber",
                )
              }
              className="bg-white rounded-xl border-2 border-amber-200 p-4 shadow-sm cursor-pointer hover:border-amber-400 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <i className="bx bx-time-five text-2xl" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                      🎯 Acción inmediata · 30 días
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      Terminan su periodo gratis
                    </div>
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-amber-700">
                  {num(resumen.por_convertir_30d)}
                </div>
              </div>
              <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-amber-100">
                Acceso manual cuyo periodo vence en 30 días. Si no capturan
                tarjeta, los pierdes.{" "}
                <b className="text-amber-700">Click para ver lista.</b>
              </div>
            </div>
            <div
              onClick={() =>
                openCategoryDrawer(
                  "por_convertir_30d",
                  "Pipeline 60 días",
                  "cyan",
                )
              }
              className="bg-white rounded-xl border border-cyan-200 p-4 shadow-sm cursor-pointer hover:border-cyan-400 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">
                    <i className="bx bx-time text-2xl" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-cyan-700">
                      Pipeline · 60 días
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      Terminan en 60 días
                    </div>
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-cyan-700">
                  {num(resumen.por_convertir_60d)}
                </div>
              </div>
              <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-cyan-100">
                Pipeline a 2 meses. Tiempo para diseñar campaña de captura de
                tarjeta.
              </div>
            </div>
          </div>
        </Section>

        {/* SECCIÓN 5: EVOLUCIÓN */}
        <Section
          icon="bx-line-chart"
          title="Evolución 12 meses"
          subtitle="MRR mes a mes · Punteada = estimado · Sólida = real desde mayo 2026"
        >
          <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-sm">
            <div className="flex items-center gap-4 mb-4 text-xs flex-wrap text-slate-600">
              <span className="flex items-center gap-1.5">
                <span
                  className="h-[2px] w-6 inline-block"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(to right, #f59e0b 0 4px, transparent 4px 8px)",
                  }}
                />
                Estimado (potencial)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-[2px] w-6 bg-emerald-500 inline-block" />
                MRR Stripe real
              </span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={serieChart}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient
                      id="mrrGradLight"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#10B981"
                        stopOpacity={0.25}
                      />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
                    }
                  />
                  <Tooltip content={<ChartTooltip />} />
                  {indiceCorte > 0 && (
                    <ReferenceLine
                      x={serieChart[indiceCorte].label}
                      stroke="#10B981"
                      strokeDasharray="4 4"
                      label={{
                        value: "Real desde aquí",
                        position: "insideTopLeft",
                        fill: "#10B981",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="mrr_render"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#mrrGradLight)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>

        {/* SECCIÓN 6: PLANES */}
        <Section
          icon="bx-package"
          title="Desglose por plan"
          subtitle="Distribución entre los planes · Planes TEST excluidos automáticamente"
        >
          <PlanesTable
            planes={resumen.desglose_planes || []}
            mrrStripe={resumen.mrr_stripe}
          />
        </Section>

        {/* SECCIÓN 7: CANCELACIONES */}
        <Section
          icon="bx-user-minus"
          title="Cancelaciones del mes"
          subtitle={`${cancelaciones.length} cliente${cancelaciones.length !== 1 ? "s" : ""} en ${mesLabel(mesCancel)}`}
        >
          <div className="flex justify-end mb-3">
            <MesSelect value={mesCancel} onChange={setMesCancel} />
          </div>
          <CancelacionesTable rows={cancelaciones} navigate={navigate} />
        </Section>

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
  );
}

/* ═══ GLOSARIO ═══ */
function Glosario({ open, onToggle }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2">
          <i className="bx bx-book-open text-cyan-700 text-lg" />
          <span className="font-bold text-slate-900 text-sm">
            Glosario · ¿Qué significa cada término?
          </span>
          <span className="text-xs text-slate-500">(click para abrir)</span>
        </div>
        <i
          className={`bx ${open ? "bx-chevron-up" : "bx-chevron-down"} text-xl text-slate-400`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs border-t border-slate-100 pt-4">
          <GlosarioItem term="MRR (Monthly Recurring Revenue)">
            Ingreso recurrente mensual. Suma de suscripciones Stripe cobrando
            ahora.
          </GlosarioItem>
          <GlosarioItem term="ARR (Annual Recurring Revenue)">
            MRR × 12. Proyección anual.
          </GlosarioItem>
          <GlosarioItem term="ARPU">
            Ingreso promedio por cliente pagando. = MRR ÷ clientes pagando.
          </GlosarioItem>
          <GlosarioItem term="LTV">
            Valor de vida del cliente. = ARPU ÷ churn mensual.
          </GlosarioItem>
          <GlosarioItem term="Churn">
            % que cancela al mes. Sano: 5%.
          </GlosarioItem>
          <GlosarioItem term="Pagando Stripe">
            Suscripción Stripe en estado{" "}
            <code className="bg-slate-100 px-1 rounded text-[10px]">
              active
            </code>
            . Stripe cobra automático.
          </GlosarioItem>
          <GlosarioItem term="Trial Stripe">
            Tarjeta capturada, en periodo prueba. Stripe cobra al terminar.
          </GlosarioItem>
          <GlosarioItem term="Acceso manual (sin tarjeta)">
            Plan activo SIN tarjeta. Curso Method Ecommerce: 30/90/180 días
            gratis, después capturan tarjeta.
          </GlosarioItem>
          <GlosarioItem term="Cortesía VIP (permanente=1)">
            Acceso perpetuo sin cobro. Equipo, partners.
          </GlosarioItem>
          <GlosarioItem term="Trial uso">
            Estado{" "}
            <code className="bg-slate-100 px-1 rounded text-[10px]">
              trial_usage
            </code>
            . 10 imágenes Insta Landing gratis.
          </GlosarioItem>
          <GlosarioItem term="Código promo">
            Estado{" "}
            <code className="bg-slate-100 px-1 rounded text-[10px]">
              promo_usage
            </code>
            . Canjeó código.
          </GlosarioItem>
          <GlosarioItem term="MRR potencial">
            Si todo el pipeline (trial + manual) pagara hoy.
          </GlosarioItem>
          <GlosarioItem term="Productos del plan">
            <b>ImporChat:</b> chat WhatsApp · <b>Insta Landing:</b> banners IA ·{" "}
            <b>ImporChat + Insta Landing + Dashboard:</b> ecosistema completo.
          </GlosarioItem>
          <GlosarioItem term="Planes TEST">
            Planes creados para pruebas Stripe. Se excluyen automáticamente de
            todos los conteos.
          </GlosarioItem>
        </div>
      )}
    </div>
  );
}

function GlosarioItem({ term, children }) {
  return (
    <div className="py-1.5 border-b border-slate-100 last:border-0">
      <div className="font-bold text-slate-800">{term}</div>
      <div className="text-slate-600 leading-relaxed">{children}</div>
    </div>
  );
}

/* ═══ Section ═══ */
function Section({ icon, title, subtitle, children }) {
  return (
    <section className="space-y-3">
      <div>
        <div className="flex items-center gap-2 text-slate-900 mb-0.5">
          <i className={`bx ${icon} text-lg text-cyan-600`} />
          <h2 className="text-lg md:text-xl font-extrabold">{title}</h2>
        </div>
        {subtitle && <p className="text-xs text-slate-500 ml-7">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

/* ═══ Kpi ═══ */
function Kpi({
  accent,
  icon,
  label,
  value,
  delta,
  deltaFmt = (v) => num(v),
  explain,
  hint,
}) {
  const accents = {
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      bar: "bg-emerald-500",
    },
    cyan: { bg: "bg-cyan-50", text: "text-cyan-700", bar: "bg-cyan-500" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-500" },
    rose: { bg: "bg-rose-50", text: "text-rose-700", bar: "bg-rose-500" },
    violet: {
      bg: "bg-violet-50",
      text: "text-violet-700",
      bar: "bg-violet-500",
    },
  }[accent] || {
    bg: "bg-slate-100",
    text: "text-slate-700",
    bar: "bg-slate-500",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 ${accents.bar}`} />
      <div className="flex items-start justify-between gap-2 mb-2">
        <div
          className={`h-9 w-9 rounded-lg ${accents.bg} ${accents.text} flex items-center justify-center`}
        >
          <i className={`bx ${icon} text-xl`} />
        </div>
        {delta && delta.pct != null && (
          <DeltaBadge delta={delta} deltaFmt={deltaFmt} />
        )}
      </div>
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
        {value}
      </div>
      {hint && (
        <div className={`text-xs font-semibold mt-1 ${accents.text}`}>
          {hint}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] leading-relaxed text-slate-500">
        <i className="bx bx-info-circle mr-1 text-slate-400" />
        {explain}
      </div>
    </div>
  );
}

function DeltaBadge({ delta, deltaFmt = (v) => num(v) }) {
  const isUp = (delta.abs || 0) >= 0;
  const cls = isUp
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-rose-50 text-rose-700 ring-rose-200";
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ring-1 ${cls}`}
      title="vs periodo de comparación"
    >
      <i className={`bx ${isUp ? "bx-trending-up" : "bx-trending-down"}`} />
      {isUp ? "+" : ""}
      {deltaFmt(delta.abs)}
      <span className="opacity-70">
        ({isUp ? "+" : ""}
        {Number(delta.pct).toFixed(0)}%)
      </span>
    </span>
  );
}

/* ═══ Pipeline ═══ */
function PipelineFunnel({ etapas, tasaConversion, convMuestra, onOpen }) {
  const max = Math.max(...etapas.map((e) => e.value), 1);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {etapas.map((e, idx) => {
          const accents = {
            amber: {
              bg: "bg-amber-50",
              bar: "bg-amber-500",
              text: "text-amber-700",
              border: "border-amber-200",
              hover: "hover:border-amber-400",
            },
            cyan: {
              bg: "bg-cyan-50",
              bar: "bg-cyan-500",
              text: "text-cyan-700",
              border: "border-cyan-200",
              hover: "hover:border-cyan-400",
            },
            emerald: {
              bg: "bg-emerald-50",
              bar: "bg-emerald-500",
              text: "text-emerald-700",
              border: "border-emerald-200",
              hover: "hover:border-emerald-400",
            },
          }[e.color];
          const widthPct = (e.value / max) * 100;
          return (
            <div key={e.key} className="relative">
              <div
                onClick={() => onOpen(e.cat, e.label, e.color)}
                className={`rounded-xl border-2 ${accents.border} ${accents.bg} p-4 h-full cursor-pointer ${accents.hover} hover:shadow-md transition`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`h-9 w-9 rounded-lg bg-white ${accents.text} flex items-center justify-center shadow-sm`}
                  >
                    <i className={`bx ${e.icon} text-xl`} />
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${accents.text}`}
                  >
                    Etapa {idx + 1}
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-slate-900 leading-none">
                  {num(e.value)}
                </div>
                <div className={`text-sm font-bold ${accents.text} mt-1`}>
                  {e.label}
                </div>
                <div className="text-[11px] text-slate-600 mt-1">{e.desc}</div>
                <div className="mt-3 h-1.5 bg-white rounded-full overflow-hidden ring-1 ring-slate-200">
                  <div
                    className={`h-full ${accents.bar}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <div className="mt-3 pt-3 border-t border-white/80 text-[11px] text-slate-700 leading-relaxed">
                  <b>Qué es:</b> {e.detalle}
                </div>
                <div
                  className={`mt-2 text-[11px] font-bold ${accents.text} flex items-center gap-1`}
                >
                  <i className="bx bx-right-arrow-circle" /> {e.stat}
                </div>
                <div className="mt-2 text-[11px] text-slate-600">
                  <b>Acción:</b> {e.action}
                </div>
                <div
                  className={`mt-3 pt-2 border-t border-white/80 text-[10px] font-bold ${accents.text} flex items-center gap-1 uppercase tracking-wider`}
                >
                  <i className="bx bx-list-ul" /> Click para ver clientes
                </div>
              </div>
              {idx < etapas.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-2 -translate-y-1/2 z-10 items-center justify-center h-8 w-8 rounded-full bg-white ring-2 ring-slate-200 text-slate-400">
                  <i className="bx bx-chevron-right text-xl" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-slate-600 flex items-center gap-2 flex-1">
          <i className="bx bx-info-circle text-slate-400 text-base" />
          <span>
            <b>Trial → Paid:</b> % de clientes que pagaron después de terminar
            periodo gratis (últimos 90 días).
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-2xl font-extrabold text-slate-900">
            {pct1(tasaConversion)}
          </div>
          <div className="text-xs text-slate-500">
            Muestra
            <br />
            <span className="font-mono">
              {convMuestra?.convertidos || 0}/{convMuestra?.total || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ EstadoCard ═══ */
function EstadoCard({ icon, color, label, value, total, explain, onClick }) {
  const colors = {
    emerald:
      "text-emerald-700 bg-emerald-50 ring-emerald-200 hover:ring-emerald-400",
    cyan: "text-cyan-700 bg-cyan-50 ring-cyan-200 hover:ring-cyan-400",
    amber: "text-amber-700 bg-amber-50 ring-amber-200 hover:ring-amber-400",
    violet:
      "text-violet-700 bg-violet-50 ring-violet-200 hover:ring-violet-400",
    sky: "text-sky-700 bg-sky-50 ring-sky-200 hover:ring-sky-400",
    pink: "text-pink-700 bg-pink-50 ring-pink-200 hover:ring-pink-400",
    slate: "text-slate-700 bg-slate-100 ring-slate-200 hover:ring-slate-400",
    orange:
      "text-orange-700 bg-orange-50 ring-orange-200 hover:ring-orange-400",
    rose: "text-rose-700 bg-rose-50 ring-rose-200 hover:ring-rose-400",
  }[color];
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm text-left hover:shadow-md hover:border-slate-400 transition group"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div
          className={`h-7 w-7 rounded-md flex items-center justify-center ring-1 ${colors}`}
        >
          <i className={`bx ${icon} text-base`} />
        </div>
        <i className="bx bx-chevron-right text-slate-300 group-hover:text-cyan-600 transition" />
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </div>
      <div className="text-xl font-extrabold text-slate-900 leading-tight">
        {num(value)}
      </div>
      <div className="text-[10px] text-slate-400 mt-0.5">
        {pct.toFixed(1)}% del total BD
      </div>
      <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 leading-snug">
        {explain}
      </div>
    </button>
  );
}

function DonutTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-lg shadow-lg ring-1 ring-slate-200 px-3 py-2 text-xs">
      <div className="font-bold text-slate-900 flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-sm"
          style={{ background: d.color }}
        />
        {d.name}
      </div>
      <div className="text-slate-700 mt-1">
        <b>{num(d.value)}</b> clientes ({((d.value / total) * 100).toFixed(1)}%)
      </div>
    </div>
  );
}

/* ═══ PlanesTable ═══ */
function PlanesTable({ planes, mrrStripe }) {
  if (planes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
        Sin planes con clientes activos.
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Plan</th>
            <th className="px-4 py-3 text-left">Producto</th>
            <th className="px-4 py-3 text-right">Pagando</th>
            <th className="px-4 py-3 text-right">Trial Stripe</th>
            <th className="px-4 py-3 text-right">Acceso manual</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-right">MRR aporta</th>
            <th className="px-4 py-3 text-left w-32">% del MRR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {planes.map((p) => {
            const mrrP = Number(p.mrr_stripe_plan || 0);
            const pctTotal = mrrStripe > 0 ? (mrrP / mrrStripe) * 100 : 0;
            return (
              <tr key={p.id_plan} className="hover:bg-slate-50 transition">
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-900">
                    {p.nombre_plan}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {planDurationLabel(p)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ring-1 ${PRODUCTO_BADGE[p.tools_access] || PRODUCTO_BADGE.both}`}
                  >
                    {PRODUCTO_LABEL[p.tools_access] || p.tools_access}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono font-bold text-emerald-700 text-base">
                    {p.pagando_stripe || 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono font-bold text-cyan-700 text-base">
                    {p.trial_stripe || 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono font-bold text-amber-700 text-base">
                    {p.acceso_manual || 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono font-bold text-slate-700 text-base">
                    {p.activos_total}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-slate-900">
                    {money0(mrrP)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                        style={{ width: `${Math.min(100, pctTotal)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-10 text-right">
                      {pctTotal.toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ═══ MesSelect, Cancelaciones, ChartTooltip, Drawer ═══ */
function MesSelect({ value, onChange }) {
  const opciones = useMemo(() => {
    const arr = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
      arr.push(
        `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`,
      );
    }
    return arr;
  }, []);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-cyan-500"
    >
      {opciones.map((o) => (
        <option key={o} value={o}>
          {mesLabel(o)}
        </option>
      ))}
    </select>
  );
}

function decode(s) {
  if (!s) return "—";
  return String(s)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function CancelacionesTable({ rows, navigate }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
        <i className="bx bx-check-shield text-4xl text-emerald-300" />
        <p className="mt-2 text-sm text-slate-500">
          Sin cancelaciones este mes.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Cliente</th>
            <th className="px-4 py-3 text-left">Plan</th>
            <th className="px-4 py-3 text-center">Días vivido</th>
            <th className="px-4 py-3 text-center">Tipo</th>
            <th className="px-4 py-3 text-left">Motivo</th>
            <th className="px-4 py-3 text-center">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((c) => (
            <tr
              key={c.id_usuario}
              onClick={() => navigate(`/admin/usuarios?id=${c.id_usuario}`)}
              className="hover:bg-cyan-50/40 cursor-pointer transition"
            >
              <td className="px-4 py-3">
                <div className="font-bold text-slate-900">
                  {decode(c.empresa)}
                </div>
                <div className="text-xs text-slate-500">{c.email}</div>
              </td>
              <td className="px-4 py-3 text-xs">
                {c.nombre_plan ? (
                  <>
                    <div className="font-semibold text-slate-700">
                      {c.nombre_plan}
                    </div>
                    <div className="text-slate-400 font-mono">
                      ${c.precio_plan}
                    </div>
                  </>
                ) : (
                  <span className="text-slate-400 italic">sin plan</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`font-mono font-bold text-base ${c.dias_de_vida < 30 ? "text-rose-600" : c.dias_de_vida < 90 ? "text-amber-600" : "text-slate-600"}`}
                >
                  {c.dias_de_vida}d
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                {c.cancel_at_period_end === 1 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                    <i className="bx bx-time" /> Programada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 ring-1 ring-rose-200">
                    <i className="bx bx-x-circle" /> Cancelada
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-xs">
                {c.motivo_cancelacion ? (
                  <div>
                    <div className="font-semibold text-slate-700">
                      {c.motivo_cancelacion}
                    </div>
                    {c.motivo_detalle && (
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {c.motivo_detalle}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 italic text-[11px]">
                    Sin registrar · disponible en Fase 3
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-center text-xs text-slate-500 font-mono">
                {fmtDate(c.canceled_at || c.cancel_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-lg shadow-lg ring-1 ring-slate-200 p-3 text-xs">
      <div className="font-bold text-slate-900 mb-1 flex items-center gap-2">
        {d.label}
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${d.is_estimated ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
        >
          {d.is_estimated ? "ESTIMADO" : "REAL"}
        </span>
      </div>
      <div className="space-y-0.5 text-slate-600">
        <div>
          {d.is_estimated ? "MRR potencial" : "MRR Stripe"}:{" "}
          <b className="text-slate-900 ml-1">{money0(d.mrr_render)}</b>
        </div>
        <div>
          Activos: <b className="text-slate-900">{num(d.clientes_activos)}</b>
        </div>
        <div className="text-emerald-600">Nuevos mes: +{num(d.nuevos_mes)}</div>
        <div className="text-rose-600">
          Cancelados: -{num(d.cancelados_mes)}
        </div>
      </div>
    </div>
  );
}

/* ═══ DRAWER ═══ */
function ClienteListDrawer({ categoria, titulo, color, onClose, navigate }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await chatApi.get(
          `admin_dashboard/clientes_por_categoria?categoria=${categoria}&limit=200`,
        );
        setRows(data.data || []);
      } catch {
        toast.error("Error cargando lista");
      } finally {
        setLoading(false);
      }
    })();
  }, [categoria]);
  const headerCls =
    {
      emerald: "from-emerald-600 to-emerald-700",
      cyan: "from-cyan-600 to-cyan-700",
      amber: "from-amber-600 to-amber-700",
      violet: "from-violet-600 to-violet-700",
      sky: "from-sky-600 to-sky-700",
      pink: "from-pink-600 to-pink-700",
      slate: "from-slate-700 to-slate-800",
      orange: "from-orange-600 to-orange-700",
      rose: "from-rose-600 to-rose-700",
    }[color] || "from-slate-700 to-slate-800";
  return (
    <div className="fixed inset-0 z-50" role="dialog">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="absolute top-0 right-0 h-full w-full max-w-3xl bg-slate-50 shadow-2xl overflow-y-auto">
        <div
          className={`sticky top-0 bg-gradient-to-br ${headerCls} text-white px-5 py-4 flex items-start justify-between z-10 shadow-md`}
        >
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
              Lista de clientes
            </div>
            <h2 className="text-xl font-extrabold mt-1 truncate">{titulo}</h2>
            <div className="text-xs opacity-80 mt-1">
              {loading
                ? "Cargando…"
                : `${rows.length} cliente${rows.length !== 1 ? "s" : ""} encontrado${rows.length !== 1 ? "s" : ""}`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <i className="bx bx-x text-2xl" />
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="text-center py-16 text-slate-400">
              <i className="bx bx-loader-alt bx-spin text-4xl" />
              <p className="mt-2 text-sm">Cargando…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <i className="bx bx-search-alt text-4xl" />
              <p className="mt-2 text-sm">No hay clientes en esta categoría</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((c) => (
                <div
                  key={c.id_usuario}
                  onClick={() => navigate(`/admin/usuarios?id=${c.id_usuario}`)}
                  className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md hover:border-cyan-300 cursor-pointer transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                        {decode(c.empresa)}
                        {c.permanente === 1 && (
                          <i
                            className="bx bxs-crown text-violet-500"
                            title="Cortesía VIP"
                          />
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {c.email}
                      </div>
                      <div className="flex items-center flex-wrap gap-2 mt-2">
                        {c.nombre_plan && (
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {c.nombre_plan} · ${c.precio_plan}
                            {c.id_plan === 21 && (
                              <span className="text-amber-600 ml-1">
                                (periodo variable)
                              </span>
                            )}
                          </span>
                        )}
                        {c.stripe_subscription_status && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              c.stripe_subscription_status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : c.stripe_subscription_status === "trialing"
                                  ? "bg-cyan-100 text-cyan-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            Stripe: {c.stripe_subscription_status}
                          </span>
                        )}
                        {c.cancel_at_period_end === 1 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                            ⚠ Cancel. programada
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {c.dias_para_vencer != null && c.fecha_renovacion && (
                        <div>
                          <div
                            className={`text-lg font-extrabold font-mono ${
                              c.dias_para_vencer < 0
                                ? "text-rose-600"
                                : c.dias_para_vencer <= 7
                                  ? "text-amber-600"
                                  : c.dias_para_vencer <= 30
                                    ? "text-cyan-600"
                                    : "text-slate-600"
                            }`}
                          >
                            {c.dias_para_vencer < 0
                              ? `${Math.abs(c.dias_para_vencer)}d`
                              : `${c.dias_para_vencer}d`}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {c.dias_para_vencer < 0 ? "vencido" : "para vencer"}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {fmtDate(c.fecha_renovacion)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                    <span>
                      ID #{c.id_usuario} · Inicio: {fmtDate(c.fecha_inicio)}
                    </span>
                    {c.ultimo_mensaje && (
                      <span>
                        <i className="bx bx-message-rounded-dots" /> Últ.
                        mensaje: {fmtDate(c.ultimo_mensaje)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
            <i className="bx bx-info-circle" /> Click en cualquier cliente para
            abrir su ficha completa
          </div>
        </div>
      </aside>
    </div>
  );
}
