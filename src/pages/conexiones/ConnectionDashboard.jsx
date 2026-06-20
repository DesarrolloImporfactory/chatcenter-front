import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import DateRangePicker from "../../components/dashboard/DataRangePicker";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

/* ─── config ───
   Base de las imágenes de producto de Dropi.
   El back devuelve la ruta relativa (ej: "ecuador/products/132831/xxx.png").
   Pega aquí el prefijo correcto de tu CDN/S3 de Dropi Ecuador.
   (Abre una imagen de producto en tu panel, copia el inicio de la URL.) */
const DROPI_IMG_BASE = "https://d39ru7awumhhs2.cloudfront.net/";

function productImg(image) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image; // ya viene completa
  return `${DROPI_IMG_BASE}${image.replace(/^\/+/, "")}`;
}

/* ─── helpers ─── */

function toYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toYMD(d);
}

// Ecuador = USD.
function fmt$(v) {
  return Number(v || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtShort(v) {
  const n = Number(v || 0);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtNum(v) {
  return Number(v || 0).toLocaleString("en-US");
}

function fmtPct(v) {
  return `${Number(v || 0).toFixed(1)}%`;
}

/* ─── Tooltip con alineación inteligente ─── */

function Tip({ text, children, align = "center", dir = "up" }) {
  const [show, setShow] = useState(false);
  const posClass =
    align === "left"
      ? "left-0"
      : align === "right"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";
  const arrowPos =
    align === "left"
      ? "left-4"
      : align === "right"
        ? "right-4"
        : "left-1/2 -translate-x-1/2";
  const isDown = dir === "down";
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          className={`absolute ${isDown ? "top-full mt-3" : "bottom-full mb-3"} ${posClass} px-4 py-2.5 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-[11px] text-white/90 font-normal shadow-2xl shadow-black/25 z-[9999] pointer-events-none max-w-[260px] whitespace-normal leading-relaxed border border-white/[0.06] backdrop-blur-sm`}
        >
          {text}
          <span
            className={`absolute ${isDown ? "bottom-full border-b-slate-800" : "top-full border-t-slate-800"} ${arrowPos} border-[5px] border-transparent`}
          />
        </span>
      )}
    </span>
  );
}

/* ─── constants ─── */

const DATE_PRESETS = [
  { label: "Hoy", days: 0 },
  { label: "7 días", days: 7 },
  { label: "15 días", days: 15 },
  { label: "30 días", days: 30 },
];

const CHANNELS = [
  { key: "todos", label: "Todos", icon: "bx-layer" },
  { key: "wa", label: "WhatsApp", icon: "bxl-whatsapp" },
  { key: "shopify", label: "Shopify", icon: "bxl-shopify" },
];

const STATUS_LABELS = {
  entregada: "Entregadas",
  en_transito: "En tránsito",
  pendiente: "Pendientes",
  devolucion: "Devoluciones",
  cancelada: "Canceladas",
  en_reparto: "En reparto",
  guia_generada: "Guía generada",
  novedad: "Novedad",
  retiro_agencia: "Retiro agencia",
  indemnizada: "Indemnizada",
  otro: "Otro",
};

const STATUS_COLORS = {
  entregada: "#10B981",
  en_transito: "#3B82F6",
  pendiente: "#F59E0B",
  devolucion: "#EF4444",
  cancelada: "#6B7280",
  en_reparto: "#8B5CF6",
  guia_generada: "#06B6D4",
  novedad: "#F97316",
  retiro_agencia: "#EC4899",
  indemnizada: "#0EA5E9",
  otro: "#94A3B8",
};

/* ─── vista por canal (alimenta los KPIs del hero) ─── */

function channelView(data, canal) {
  if (!data) return null;
  const base = {
    conversaciones: data.totalConversaciones,
    mensajes: data.totalMensajes,
  };
  if (canal === "wa") return { ...data.canales.wa, ...base };
  if (canal === "shopify") return { ...data.canales.shopify, ...base };
  return {
    pedidos: data.totalPedidos,
    facturado: data.totalFacturado,
    ganancia: data.totalGanancia,
    entregadas: data.entregadas,
    tasaEntrega: data.tasaEntrega,
    pctConfirmacion: data.pctConfirmacion,
    ...base,
  };
}

/* ─── chart tooltip ─── */

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl px-4 py-3 text-xs">
      <p className="font-bold text-slate-800 mb-2 text-[13px]">{label}</p>
      {payload.map((p) => {
        const isMoney = ["facturado", "ganancia"].includes(p.dataKey);
        return (
          <div key={p.dataKey} className="flex items-center gap-2.5 py-0.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: p.color }}
            />
            <span className="text-slate-500">{p.name}</span>
            <span className="font-bold text-slate-900 ml-auto">
              {isMoney ? fmt$(p.value) : fmtNum(p.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ═════════════════════════════════════════════════
   Component
   ═════════════════════════════════════════════════ */

export default function ConnectionDashboard() {
  const navigate = useNavigate();

  const configId = useMemo(
    () => Number(localStorage.getItem("id_configuracion")),
    [],
  );
  const configName = useMemo(
    () => localStorage.getItem("nombre_configuracion") || "Conexión",
    [],
  );

  const [dateRange, setDateRange] = useState(() => {
    const today = toYMD(new Date());
    return { from: daysAgo(7), to: today };
  });
  const [activePreset, setActivePreset] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [canal, setCanal] = useState("todos");

  // Anuncios ganadores (solo si la conexión tiene Meta Ads)
  const [winnerAds, setWinnerAds] = useState(null);

  // Tabla productos
  const [prodSort, setProdSort] = useState({
    key: "gananciaNeta",
    dir: "desc",
  });

  const fetchSummary = useCallback(
    async (fromDate, toDate) => {
      if (!configId) return;
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await chatApi.post(
          "dropi_integrations/dashboard/connection-summary",
          { id_configuracion: configId, from: fromDate, until: toDate },
        );
        setData(res?.data?.data || null);
      } catch (err) {
        setErrorMsg(err?.response?.data?.message || "Error al consultar datos");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [configId],
  );

  // Trae los anuncios ganadores desde marketing-control (igual que Adsboard).
  // Si la conexión no tiene Meta Ads, el endpoint falla → ocultamos la sección.
  const fetchWinners = useCallback(
    async (fromDate, toDate) => {
      if (!configId) return;
      try {
        const { data: mc } = await chatApi.get("/marketing-control/dashboard", {
          params: {
            id_configuracion: configId,
            since: fromDate,
            until: toDate,
            limit: 30,
          },
        });
        const items = mc?.attribution?.items || [];
        const winners = items
          .filter((a) => Number(a.entregadas_estimadas || 0) > 0)
          .sort(
            (a, b) => Number(b.roi_estimado || 0) - Number(a.roi_estimado || 0),
          )
          .slice(0, 3);
        setWinnerAds(winners);
      } catch (_) {
        setWinnerAds(null); // no conectado / error → sección oculta
      }
    },
    [configId],
  );

  const loadAll = useCallback(
    (fromDate, toDate) => {
      fetchSummary(fromDate, toDate);
      fetchWinners(fromDate, toDate);
    },
    [fetchSummary, fetchWinners],
  );

  const handlePreset = (idx) => {
    setActivePreset(idx);
    const p = DATE_PRESETS[idx];
    const today = toYMD(new Date());
    const from = p.days === 0 ? today : daysAgo(p.days);
    setDateRange({ from, to: today });
    loadAll(from, today);
  };

  const handleDateChange = (range) => {
    setActivePreset(-1);
    setDateRange(range);
  };

  useEffect(() => {
    const today = toYMD(new Date());
    loadAll(daysAgo(7), today);
  }, [loadAll]);

  const view = useMemo(() => channelView(data, canal), [data, canal]);

  const pieData = useMemo(() => {
    if (!data?.statusBreakdown?.length) return [];
    return [...data.statusBreakdown]
      .sort((a, b) => b.count - a.count)
      .map((s) => ({
        name: STATUS_LABELS[s.status] || s.status,
        value: s.count,
        fill: STATUS_COLORS[s.status] || "#94A3B8",
      }));
  }, [data]);

  const sortedProducts = useMemo(() => {
    if (!data?.productos?.length) return [];
    const { key, dir } = prodSort;
    return [...data.productos].sort((a, b) => {
      const va = a[key] == null ? -Infinity : a[key];
      const vb = b[key] == null ? -Infinity : b[key];
      return dir === "desc" ? vb - va : va - vb;
    });
  }, [data, prodSort]);

  const handleProdSort = (key) =>
    setProdSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" },
    );

  const hasCharts = data?.dailyChart?.length > 1;

  const HERO_KPIS = view
    ? [
        {
          key: "facturado",
          label: "Facturado",
          tip: "Suma del valor total de las órdenes del canal seleccionado en este rango.",
          sub: `${fmtNum(view.pedidos)} pedidos`,
          icon: "bx-dollar-circle",
          color: "#34d399",
          bg: "rgba(52,211,153,0.1)",
          value: fmt$(view.facturado),
        },
        // {
        //   key: "ganancia",
        //   label: "Utilidad neta",
        //   tip: "Tu ganancia real (profit del dropshipper) de las órdenes del canal.",
        //   sub:
        //     view.facturado > 0
        //       ? `${((view.ganancia / view.facturado) * 100).toFixed(1)}% margen`
        //       : "—",
        //   icon: "bx-wallet",
        //   color: "#a78bfa",
        //   bg: "rgba(167,139,250,0.1)",
        //   value: fmt$(view.ganancia),
        // },
        {
          key: "pedidos",
          label: "Pedidos",
          tip: "Total de órdenes creadas en el rango para el canal seleccionado.",
          sub: `${fmtNum(view.entregadas)} entregadas`,
          icon: "bx-package",
          color: "#60a5fa",
          bg: "rgba(96,165,250,0.1)",
          value: fmtNum(view.pedidos),
        },
        {
          key: "conversaciones",
          label: "Conversaciones",
          tip: "Clientes nuevos que escribieron al chat en este rango (métrica global).",
          sub: `${fmtNum(view.mensajes)} mensajes`,
          icon: "bx-message-dots",
          color: "#f472b6",
          bg: "rgba(244,114,182,0.1)",
          value: fmtNum(view.conversaciones),
        },
        {
          key: "pctConfirmacion",
          label: "Confirmación",
          tip:
            canal === "shopify"
              ? "Checkouts de Shopify que pasaron de «pendiente confirmación» ÷ total Shopify."
              : "Pedidos ÷ conversaciones: chats que se volvieron venta.",
          sub:
            canal === "shopify"
              ? `${fmtNum(data.canales.shopify.confirmados)} confirmados`
              : `${fmtNum(view.pedidos)} ventas`,
          icon: "bx-check-shield",
          color: "#fbbf24",
          bg: "rgba(251,191,36,0.1)",
          value: fmtPct(view.pctConfirmacion),
        },
        {
          key: "tasaEntrega",
          label: "Tasa entrega",
          tip: "Pedidos entregados ÷ total pedidos del canal.",
          sub: `${fmtNum(view.entregadas)} entregados`,
          icon: "bx-check-double",
          color: "#22d3ee",
          bg: "rgba(34,211,238,0.1)",
          value: fmtPct(view.tasaEntrega),
        },
      ]
    : [];

  return (
    <div className="w-full min-h-screen bg-[#f0f2f5]">
      {/* ══════════════════════ HERO ══════════════════════ */}
      <div className="relative bg-gradient-to-br from-[#070b14] via-[#0f172a] to-[#1e1b4b]">
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden
        >
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div
            className="absolute -right-32 -top-32 w-[450px] h-[450px] opacity-[0.07]"
            style={{
              background: "radial-gradient(circle, #818cf8, transparent 60%)",
            }}
          />
          <div
            className="absolute -left-16 -bottom-16 w-[350px] h-[350px] opacity-[0.05]"
            style={{
              background: "radial-gradient(circle, #34d399, transparent 60%)",
            }}
          />
        </div>

        <div className="relative px-5 sm:px-8 pt-5 pb-6">
          {/* ── Top bar ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="shrink-0 w-9 h-9 rounded-xl grid place-items-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-400/15">
                  <i className="bx bx-bar-chart-alt-2 text-lg text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-extrabold text-white truncate tracking-tight leading-tight">
                    {configName}
                  </h1>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mt-0.5">
                    Dashboard de rendimiento
                  </p>
                </div>
              </div>
            </div>

            {/* ── Channel switch ── */}
            <div className="flex items-center gap-1 bg-white/[0.06] border border-white/[0.08] rounded-xl p-1">
              {CHANNELS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCanal(c.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    canal === c.key
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <i className={`bx ${c.icon} text-sm`} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── KPI Grid ── */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white/[0.05] border border-white/[0.07] px-3.5 py-3 animate-pulse"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-5 h-5 rounded-md bg-white/[0.08]" />
                    <div className="h-2 w-14 rounded bg-white/[0.08]" />
                  </div>
                  <div className="h-5 w-20 rounded bg-white/[0.1] mb-1.5" />
                  <div className="h-2 w-16 rounded bg-white/[0.06]" />
                </div>
              ))}
            </div>
          ) : view ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {HERO_KPIS.map((kpi, idx) => {
                const align =
                  idx === 0 ? "left" : idx === 5 ? "right" : "center";
                return (
                  <Tip key={kpi.key} text={kpi.tip} align={align} dir="down">
                    <div className="w-full rounded-xl bg-white/[0.05] border border-white/[0.07] backdrop-blur-sm px-3.5 py-3 hover:bg-white/[0.09] transition cursor-help">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div
                          className="w-5 h-5 rounded-md grid place-items-center"
                          style={{ background: kpi.bg }}
                        >
                          <i
                            className={`bx ${kpi.icon} text-[11px]`}
                            style={{ color: kpi.color }}
                          />
                        </div>
                        <span className="text-[9px] uppercase tracking-widest text-white/35 font-semibold">
                          {kpi.label}
                        </span>
                      </div>
                      <p className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-none mb-0.5">
                        {kpi.value}
                      </p>
                      <p
                        className="text-[10px] font-medium leading-tight"
                        style={{ color: kpi.color }}
                      >
                        {kpi.sub}
                      </p>
                    </div>
                  </Tip>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* ══════════════════════ CONTENT ══════════════════════ */}
      <div className="px-4 sm:px-6 py-4 space-y-4">
        {/* ── Filters ── */}
        <div className="flex flex-wrap items-end gap-3 bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-2.5">
          <DateRangePicker value={dateRange} onChange={handleDateChange} />
          <div className="flex items-center bg-slate-100 rounded-xl h-[42px] px-1 gap-0.5">
            {DATE_PRESETS.map((p, idx) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(idx)}
                className={`px-3.5 h-[34px] rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                  activePreset === idx
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => loadAll(dateRange.from, dateRange.to)}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm shadow-indigo-600/20"
          >
            <i
              className={`bx ${loading ? "bx-loader-alt animate-spin" : "bx-search"} text-base`}
            />
            {loading ? "Cargando…" : "Consultar"}
          </button>
        </div>

        {/* ── Error ── */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
            <i className="bx bx-error-circle text-lg" />
            {errorMsg}
          </div>
        )}

        {data && (
          <>
            {/* ── Comparativa WA vs Shopify + Carritos ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ChannelCard
                title="WhatsApp"
                icon="bxl-whatsapp"
                accent="#22c55e"
                c={data.canales.wa}
                extra={`${fmtNum(data.canales.wa.bot)} creadas por el bot`}
              />
              <ChannelCard
                title="Shopify"
                icon="bxl-shopify"
                accent="#7c3aed"
                c={data.canales.shopify}
                confirmLabel="checkouts confirmados"
              />
              {/* Carritos abandonados */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg grid place-items-center bg-amber-50">
                    <i className="bx bx-cart-alt text-amber-500 text-lg" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-slate-900 leading-tight">
                      Carritos abandonados
                    </h3>
                    <p className="text-[10px] text-slate-400">Shopify</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat
                    label="Abandonados"
                    value={fmtNum(data.carritos.abandonados)}
                  />
                  <MiniStat
                    label="Recuperados"
                    value={fmtNum(data.carritos.recuperados)}
                    tone="#10b981"
                  />
                  <MiniStat
                    label="Tasa recup."
                    value={fmtPct(data.carritos.tasaRecuperacion)}
                    tone="#10b981"
                  />
                  <MiniStat
                    label="Valor recup."
                    value={fmt$(data.carritos.valorRecuperado)}
                  />
                </div>
              </div>
            </div>

            {/* ── Anuncios ganadores (solo si hay Meta Ads conectado) ── */}
            {/* {winnerAds && winnerAds.length > 0 && <WinnerAds ads={winnerAds} />} */}

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Area Chart */}
              <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-900">
                      Facturación vs Utilidad
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Evolución diaria del dinero que mueves y lo que te queda
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-1 rounded-full bg-indigo-500" />
                      Facturado
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-1 rounded-full bg-emerald-500" />
                      Utilidad
                    </span>
                  </div>
                </div>
                {hasCharts ? (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={data.dailyChart}
                        margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="gFact"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#6366f1"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#6366f1"
                              stopOpacity={0.01}
                            />
                          </linearGradient>
                          <linearGradient
                            id="gUtil"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#10B981"
                              stopOpacity={0.15}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10B981"
                              stopOpacity={0.01}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(148,163,184,0.12)"
                        />
                        <XAxis
                          dataKey="day"
                          tickFormatter={(v) => String(v).slice(5)}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={fmtShort}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                          width={50}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="facturado"
                          name="Facturado"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          fill="url(#gFact)"
                          dot={false}
                          activeDot={{
                            r: 5,
                            stroke: "#6366f1",
                            strokeWidth: 2,
                            fill: "#fff",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="ganancia"
                          name="Utilidad"
                          stroke="#10B981"
                          strokeWidth={2}
                          fill="url(#gUtil)"
                          dot={false}
                          activeDot={{
                            r: 4,
                            stroke: "#10B981",
                            strokeWidth: 2,
                            fill: "#fff",
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart
                    icon="bx-line-chart"
                    text="Selecciona un rango mayor a 1 día para ver la tendencia"
                  />
                )}
              </div>

              {/* Pie Chart */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="mb-4">
                  <h2 className="text-[15px] font-bold text-slate-900">
                    Estado de pedidos
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Distribución por estado actual
                  </p>
                </div>
                {pieData.length > 0 ? (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="42%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [
                            `${value} pedidos`,
                            name,
                          ]}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            fontSize: 12,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart
                    icon="bx-pie-chart-alt-2"
                    text="Sin pedidos en este rango"
                  />
                )}
              </div>
            </div>

            {/* ── Pedidos por día + mensajes ── */}
            {hasCharts && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-900">
                      Pedidos y mensajes por día
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Órdenes creadas por canal vs mensajes recibidos cada día
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-500" />
                      WhatsApp
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-violet-500" />
                      Shopify
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-1 rounded-full bg-pink-500" />
                      Mensajes
                    </span>
                  </div>
                </div>
                <div className="h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={data.dailyChart}
                      margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
                      barGap={2}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148,163,184,0.12)"
                      />
                      <XAxis
                        dataKey="day"
                        tickFormatter={(v) => String(v).slice(5)}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                        allowDecimals={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11, fill: "#ec4899" }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                        allowDecimals={false}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        yAxisId="left"
                        dataKey="pedidos_wa"
                        name="WhatsApp"
                        stackId="ped"
                        fill="#10B981"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={34}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="pedidos_shopify"
                        name="Shopify"
                        stackId="ped"
                        fill="#8B5CF6"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={34}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="mensajes"
                        name="Mensajes"
                        stroke="#ec4899"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── Productos vendidos en el periodo ── */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-bold text-slate-900">
                    Productos vendidos en el periodo
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Rendimiento por producto: entregas, utilidad y
                    conversaciones
                  </p>
                </div>
                {data.productos?.length > 0 && (
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                    {data.productos.length} productos
                  </span>
                )}
              </div>

              {sortedProducts.length > 0 ? (
                <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                        <th className="px-4 py-3 w-10">#</th>
                        <th className="px-4 py-3">Producto</th>
                        <SortTh
                          label="Órdenes"
                          k="ordenes"
                          sort={prodSort}
                          onSort={handleProdSort}
                        />
                        <SortTh
                          label="Entreg."
                          k="entregadas"
                          sort={prodSort}
                          onSort={handleProdSort}
                        />
                        <SortTh
                          label="Devol."
                          k="devoluciones"
                          sort={prodSort}
                          onSort={handleProdSort}
                        />
                        <SortTh
                          label="% Entrega"
                          k="tasaEntrega"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="Entregadas ÷ movilizadas (sin contar canceladas)."
                        />
                        <SortTh
                          label="Convers."
                          k="conversaciones"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="Chats distintos que pidieron este producto."
                        />
                        <SortTh
                          label="Ingreso"
                          k="ingresoBruto"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="Venta de las órdenes entregadas (porción del producto)."
                        />
                        <SortTh
                          label="Utilidad"
                          k="gananciaNeta"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="Venta − costo proveedor − flete."
                        />
                        <SortTh
                          label="Margen"
                          k="margenPct"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="Utilidad ÷ ingreso."
                        />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedProducts.map((p, i) => {
                        const maxG = sortedProducts[0]?.gananciaNeta || 1;
                        const img = productImg(p.image);
                        return (
                          <tr
                            key={p.product_id || p.name}
                            className="hover:bg-indigo-50/30 transition"
                          >
                            <td className="px-4 py-3 text-[11px] font-bold text-slate-400 tabular-nums">
                              {i + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                {img ? (
                                  <img
                                    src={img}
                                    alt=""
                                    loading="lazy"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      if (e.currentTarget.nextSibling)
                                        e.currentTarget.nextSibling.style.display =
                                          "grid";
                                    }}
                                    className="w-9 h-9 rounded-lg object-cover ring-1 ring-slate-200 shrink-0 bg-slate-50"
                                  />
                                ) : null}
                                <div
                                  className="w-9 h-9 rounded-lg bg-slate-100 place-items-center shrink-0"
                                  style={{ display: img ? "none" : "grid" }}
                                >
                                  <i className="bx bx-image text-slate-300 text-lg" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-800 max-w-[220px] truncate">
                                    {p.name}
                                  </div>
                                  {p.sku && (
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {p.sku}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">
                                {p.ordenes}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center tabular-nums text-emerald-600 font-medium">
                              {p.entregadas}
                            </td>
                            <td className="px-4 py-3 text-center tabular-nums text-rose-500 font-medium">
                              {p.devoluciones}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {p.tasaEntrega == null ? (
                                <span className="text-slate-300">—</span>
                              ) : (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    p.tasaEntrega >= 60
                                      ? "bg-emerald-50 text-emerald-700"
                                      : p.tasaEntrega >= 40
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-rose-50 text-rose-700"
                                  }`}
                                >
                                  {fmtPct(p.tasaEntrega)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center tabular-nums text-slate-600">
                              {p.conversaciones == null
                                ? "—"
                                : fmtNum(p.conversaciones)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                              {fmt$(p.ingresoBruto)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden hidden lg:block">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                                    style={{
                                      width: `${Math.max(0, Math.min(100, (p.gananciaNeta / maxG) * 100))}%`,
                                    }}
                                  />
                                </div>
                                <span
                                  className={`font-extrabold text-[13px] tabular-nums ${
                                    p.gananciaNeta >= 0
                                      ? "text-emerald-700"
                                      : "text-rose-600"
                                  }`}
                                >
                                  {fmt$(p.gananciaNeta)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                              {p.margenPct == null ? "—" : fmtPct(p.margenPct)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-14 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 grid place-items-center mb-3">
                    <i className="bx bx-package text-2xl text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium">
                    Sin datos de productos para este rango
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── subcomponentes ─── */

function WinnerAds({ ads }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg grid place-items-center bg-amber-50">
          <i className="bx bx-trophy text-amber-500 text-lg" />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
            Anuncios ganadores
          </h2>
          <p className="text-[11px] text-slate-400">
            Tus anuncios más rentables con ventas confirmadas en este rango
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ads.map((ad, i) => {
          const fbUrl = ad.post_id
            ? `https://www.facebook.com/${ad.post_id}`
            : null;
          const roi = Number(ad.roi_estimado || 0);
          return (
            <div
              key={ad.ad_id || i}
              className="rounded-xl border border-slate-200 overflow-hidden flex flex-col bg-slate-50/40"
            >
              <div className="relative aspect-video bg-slate-100">
                {ad.thumbnail_url ? (
                  <img
                    src={ad.thumbnail_url}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center">
                    <i className="bx bx-image text-slate-300 text-2xl" />
                  </div>
                )}
                {i === 0 && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-wide bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow">
                    WINNER
                  </span>
                )}
                {fbUrl && (
                  <a
                    href={fbUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 grid place-items-center bg-black/0 hover:bg-black/30 transition group"
                    title="Ver anuncio en Facebook"
                  >
                    <span className="w-10 h-10 rounded-full bg-white/90 grid place-items-center opacity-90 group-hover:scale-110 transition">
                      <i className="bx bx-play text-slate-900 text-2xl ml-0.5" />
                    </span>
                  </a>
                )}
              </div>
              <div className="p-3">
                <div className="font-bold text-slate-800 text-xs truncate">
                  {ad.ad_name || "(sin nombre)"}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      roi >= 1
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {roi.toFixed(2)}x ROI
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {fmtNum(ad.entregadas_estimadas)} entregadas
                  </span>
                </div>
                {fbUrl && (
                  <a
                    href={fbUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <i className="bx bxl-facebook-circle text-base" />
                    Ver anuncio
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChannelCard({ title, icon, accent, c, extra, confirmLabel }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg grid place-items-center"
          style={{ background: `${accent}1a` }}
        >
          <i className={`bx ${icon} text-lg`} style={{ color: accent }} />
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-slate-900 leading-tight">
            {title}
          </h3>
          <p className="text-[10px] text-slate-400">
            {extra ||
              `${fmtNum(c.confirmados)} ${confirmLabel || "confirmados"}`}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MiniStat label="Pedidos" value={fmtNum(c.pedidos)} />
        <MiniStat label="Facturado" value={fmt$(c.facturado)} />
        <MiniStat
          label="Confirmación"
          value={fmtPct(c.pctConfirmacion)}
          tone={accent}
        />
        <MiniStat label="Tasa entrega" value={fmtPct(c.tasaEntrega)} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
        {label}
      </div>
      <div
        className="text-base font-extrabold tabular-nums leading-none"
        style={{ color: tone || "#1e293b" }}
      >
        {value}
      </div>
    </div>
  );
}

function SortTh({ label, k, sort, onSort, tip }) {
  const active = sort.key === k;
  return (
    <th
      className="px-4 py-3 text-center cursor-pointer hover:text-indigo-600 transition select-none"
      onClick={() => onSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {tip ? (
          <Tip text={tip}>
            <span className="cursor-help">{label}</span>
          </Tip>
        ) : (
          label
        )}
        <i
          className={`bx text-sm ${
            active
              ? sort.dir === "desc"
                ? "bx-sort-down text-indigo-600"
                : "bx-sort-up text-indigo-600"
              : "bx-sort-alt-2 text-slate-300"
          }`}
        />
      </span>
    </th>
  );
}

function EmptyChart({ icon, text }) {
  return (
    <div className="h-[260px] flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 grid place-items-center mb-3">
          <i className={`bx ${icon} text-2xl text-slate-300`} />
        </div>
        <p className="text-sm text-slate-400 font-medium max-w-[220px]">
          {text}
        </p>
      </div>
    </div>
  );
}
