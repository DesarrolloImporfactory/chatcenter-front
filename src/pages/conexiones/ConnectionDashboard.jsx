import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import DateRangePicker from "../../components/dashboard/DataRangePicker";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

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

function fmt$(v) {
  return Number(v || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtShort(v) {
  const n = Number(v || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("es-CO");
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
  otro: "#94A3B8",
};

const HERO_KPIS = [
  {
    key: "totalFacturado",
    label: "Facturado",
    tip: "Suma del valor total de todas las órdenes creadas en este rango",
    sub: (d) => `de ${d.totalPedidos} pedidos`,
    icon: "bx-dollar-circle",
    color: "#34d399",
    bg: "rgba(52,211,153,0.1)",
    render: (v) => fmt$(v),
  },
  {
    key: "totalGanancia",
    label: "Utilidad neta",
    tip: "Tu ganancia real: precio de venta − costo proveedor − flete",
    sub: (d) =>
      d.totalFacturado > 0
        ? `${((d.totalGanancia / d.totalFacturado) * 100).toFixed(1)}% margen`
        : "—",
    icon: "bx-wallet",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.1)",
    render: (v) => fmt$(v),
  },
  {
    key: "totalPedidos",
    label: "Pedidos",
    tip: "Total de órdenes creadas en el rango seleccionado",
    sub: (d) => `${d.entregadas} entregadas`,
    icon: "bx-package",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.1)",
    render: (v) => v,
  },
  {
    key: "totalConversaciones",
    label: "Conversaciones",
    tip: "Clientes nuevos que escribieron en este rango",
    sub: () => "nuevos contactos",
    icon: "bx-message-dots",
    color: "#f472b6",
    bg: "rgba(244,114,182,0.1)",
    render: (v) => v,
  },
  {
    key: "pctConfirmacion",
    label: "Confirmación",
    tip: "Conversaciones convertidas en pedido: (pedidos ÷ conversaciones) × 100",
    sub: (d) => `${d.totalPedidos} de ${d.totalConversaciones} chats`,
    icon: "bx-check-shield",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.1)",
    render: (v) => `${Number(v || 0).toFixed(1)}%`,
  },
  {
    key: "tasaEntrega",
    label: "Tasa entrega",
    tip: "Pedidos entregados al cliente final: (entregadas ÷ total pedidos) × 100",
    sub: (d) => `${d.entregadas} de ${d.totalPedidos} pedidos`,
    icon: "bx-check-double",
    color: "#22d3ee",
    bg: "rgba(34,211,238,0.1)",
    render: (v) => `${Number(v || 0).toFixed(1)}%`,
  },
];

/* ─── chart tooltip ─── */

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl px-4 py-3 text-xs">
      <p className="font-bold text-slate-800 mb-2 text-[13px]">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2.5 py-0.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: p.color }}
          />
          <span className="text-slate-500">{p.name}</span>
          <span className="font-bold text-slate-900 ml-auto">
            {p.dataKey === "pedidos" || p.dataKey === "entregadas"
              ? p.value
              : fmt$(p.value)}
          </span>
        </div>
      ))}
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

  const handlePreset = (idx) => {
    setActivePreset(idx);
    const p = DATE_PRESETS[idx];
    const today = toYMD(new Date());
    const from = p.days === 0 ? today : daysAgo(p.days);
    setDateRange({ from, to: today });
    fetchSummary(from, today);
  };

  const handleDateChange = (range) => {
    setActivePreset(-1);
    setDateRange(range);
  };

  const fetchSummary = useCallback(async (fromDate, toDate) => {
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
  }, [configId]);

  useEffect(() => {
    const today = toYMD(new Date());
    fetchSummary(daysAgo(7), today);
  }, [fetchSummary]);

  const pieData = useMemo(() => {
    if (!data?.statusBreakdown?.length) return [];
    return data.statusBreakdown
      .sort((a, b) => b.count - a.count)
      .map((s) => ({
        name: STATUS_LABELS[s.status] || s.status,
        value: s.count,
        fill: STATUS_COLORS[s.status] || "#94A3B8",
      }));
  }, [data]);

  const hasOrders = data?.totalPedidos > 0;
  const hasCharts = data?.dailyChart?.length > 1;

  return (
    <div className="w-full min-h-screen bg-[#f0f2f5]">
      {/* ══════════════════════ HERO ══════════════════════ */}
      <div className="relative bg-gradient-to-br from-[#070b14] via-[#0f172a] to-[#1e1b4b]">
        {/* Decorative elements (clipped separately) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
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
            style={{ background: "radial-gradient(circle, #818cf8, transparent 60%)" }}
          />
          <div
            className="absolute -left-16 -bottom-16 w-[350px] h-[350px] opacity-[0.05]"
            style={{ background: "radial-gradient(circle, #34d399, transparent 60%)" }}
          />
          <div
            className="absolute top-1/2 left-1/3 w-[400px] h-[400px] opacity-[0.03]"
            style={{ background: "radial-gradient(circle, #f59e0b, transparent 50%)" }}
          />
        </div>

        {/* Hero content (NOT clipped — tooltips visible) */}
        <div className="relative px-5 sm:px-8 pt-5 pb-6">
          {/* ── Top bar ── */}
          <div className="flex items-center justify-between mb-5">
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
            <div className="flex items-center gap-2 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider">
                En vivo
              </span>
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
          ) : data ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {HERO_KPIS.map((kpi, idx) => {
                const align = idx === 0 ? "left" : idx === 5 ? "right" : "center";
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
                        {kpi.render(data[kpi.key])}
                      </p>
                      <p
                        className="text-[10px] font-medium leading-tight"
                        style={{ color: kpi.color }}
                      >
                        {kpi.sub(data)}
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
        {/* ── Filters: presets + date picker + button ── */}
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
            onClick={() => fetchSummary(dateRange.from, dateRange.to)}
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
                  {hasOrders && (
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
                  )}
                </div>
                {hasCharts ? (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={data.dailyChart}
                        margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
                      >
                        <defs>
                          <linearGradient id="gFact" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} />
                          </linearGradient>
                          <linearGradient id="gUtil" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                        <XAxis
                          dataKey="day"
                          tickFormatter={(v) => v.slice(5)}
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
                          activeDot={{ r: 5, stroke: "#6366f1", strokeWidth: 2, fill: "#fff" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="ganancia"
                          name="Utilidad"
                          stroke="#10B981"
                          strokeWidth={2}
                          fill="url(#gUtil)"
                          dot={false}
                          activeDot={{ r: 4, stroke: "#10B981", strokeWidth: 2, fill: "#fff" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[260px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 grid place-items-center mb-3">
                        <i className="bx bx-line-chart text-2xl text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400 font-medium">
                        {hasOrders
                          ? "Selecciona un rango mayor a 1 día para ver la tendencia"
                          : "Aún no hay órdenes en este rango"}
                      </p>
                    </div>
                  </div>
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
                          formatter={(value, name) => [`${value} pedidos`, name]}
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
                  <div className="h-[260px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 grid place-items-center mb-3">
                        <i className="bx bx-pie-chart-alt-2 text-2xl text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400 font-medium">
                        Sin pedidos en este rango
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Bar chart ── */}
            {hasCharts && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-900">
                      Pedidos por día
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Total de pedidos creados vs entregados cada día
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-blue-500" />
                      Creados
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-500" />
                      Entregados
                    </span>
                  </div>
                </div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.dailyChart}
                      margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
                      barGap={2}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis
                        dataKey="day"
                        tickFormatter={(v) => v.slice(5)}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                        allowDecimals={false}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="pedidos" name="Creados" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="entregadas" name="Entregados" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── Products Table ── */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-bold text-slate-900">
                    Ranking de productos
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Top 10 productos ordenados por utilidad neta
                  </p>
                </div>
                {data.topProducts?.length > 0 && (
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                    {data.topProducts.length} productos
                  </span>
                )}
              </div>

              {data.topProducts?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3 w-12">#</th>
                        <th className="px-5 py-3">Producto</th>
                        <th className="px-5 py-3 text-center">Órdenes</th>
                        <th className="px-5 py-3 text-right">
                          <Tip text="Valor total de venta del producto">
                            <span className="cursor-help">Ingreso bruto</span>
                          </Tip>
                        </th>
                        <th className="px-5 py-3 text-right">
                          <Tip text="Lo que ganas después de costos del proveedor y flete" align="right">
                            <span className="cursor-help">Utilidad neta</span>
                          </Tip>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.topProducts.map((p, i) => {
                        const maxG = data.topProducts[0]?.gananciaNeta || 1;
                        const barW =
                          maxG > 0
                            ? Math.max(6, (p.gananciaNeta / maxG) * 100)
                            : 0;
                        return (
                          <tr key={p.name} className="hover:bg-indigo-50/30 transition">
                            <td className="px-5 py-3.5">
                              {i < 3 ? (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-extrabold text-white shadow-sm"
                                  style={{
                                    background:
                                      i === 0
                                        ? "#F59E0B"
                                        : i === 1
                                          ? "#94A3B8"
                                          : "#CD7F32",
                                  }}
                                >
                                  {i + 1}
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold bg-slate-100 text-slate-500">
                                  {i + 1}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 font-semibold text-slate-800 max-w-[300px] truncate">
                              {p.name}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">
                                {p.ordenes}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right text-slate-600 font-medium">
                              {fmt$(p.ingresoBruto)}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                                    style={{ width: `${barW}%` }}
                                  />
                                </div>
                                <span className="font-extrabold text-emerald-700 text-[13px]">
                                  {fmt$(p.gananciaNeta)}
                                </span>
                              </div>
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
