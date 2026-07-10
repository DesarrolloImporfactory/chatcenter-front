import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  LabelList,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import chatApi from "../../api/chatcenter";

/**
 * Vista analítica de transportadoras (histórico SOLO por ciudad + costo de
 * flete promedio, con rango de fechas). La tasa de entrega se mide por ciudad:
 * la provincial daba un valor demasiado general. Usa TODAS las órdenes de
 * dropi_orders_cache (columna generada flete_amount + índices).
 * Gráficos con recharts, select buscable con react-select.
 */

const COLORES = {
  verde: {
    luz: "#22c55e",
    glow: "34,197,94",
    text: "#4ade80",
    label: "Entrega óptima",
  },
  amarillo: {
    luz: "#f59e0b",
    glow: "245,158,11",
    text: "#fbbf24",
    label: "Entrega aceptable",
  },
  rojo: {
    luz: "#ef4444",
    glow: "239,68,68",
    text: "#f87171",
    label: "Entrega deficiente",
  },
  gris: {
    luz: "#64748b",
    glow: "100,116,139",
    text: "#94a3b8",
    label: "Sin datos",
  },
};

const NOMBRE_PAIS = {
  EC: "Ecuador",
  CO: "Colombia",
  MX: "México",
  PE: "Perú",
  CL: "Chile",
  PA: "Panamá",
  GT: "Guatemala",
  AR: "Argentina",
};

const fmtNum = (n) => (Number(n) || 0).toLocaleString("es-EC");
const fmtFlete = (n) =>
  n == null
    ? "—"
    : "$" +
      (Number(n) || 0).toLocaleString("es-EC", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const colorPorEff = (eff) =>
  eff == null
    ? COLORES.gris
    : eff >= 75
      ? COLORES.verde
      : eff >= 55
        ? COLORES.amarillo
        : COLORES.rojo;

/** Semáforo físico horizontal (3 luces, brilla la activa). */
function Semaforo({ activo, size = 11 }) {
  const luces = ["rojo", "amarillo", "verde"];
  return (
    <span className="inline-flex items-center gap-[3px] rounded-[6px] bg-slate-800 ring-1 ring-slate-700 px-[4px] py-[3px] shrink-0">
      {luces.map((color) => {
        const on = color === activo;
        const c = COLORES[color];
        return (
          <span
            key={color}
            className="block rounded-full transition-all"
            style={{
              width: size,
              height: size,
              background: on ? c.luz : "#334155",
              boxShadow: on
                ? `0 0 6px 1px rgba(${c.glow},.9), inset 0 0 2px rgba(255,255,255,.5)`
                : "inset 0 0 2px rgba(0,0,0,.6)",
              opacity: on ? 1 : 0.45,
            }}
          />
        );
      })}
    </span>
  );
}

function Kpi({ icon, label, value, sub, accent, loading }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-[0_6px_20px_rgba(2,6,23,.04)]">
      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 rounded-xl grid place-items-center ${accent}`}>
          <i className={`bx ${icon} text-[19px]`} />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
      </div>
      {loading ? (
        <div className="mt-2.5 h-6 w-2/3 rounded bg-slate-100 animate-pulse" />
      ) : (
        <div className="mt-2 text-[24px] font-black text-slate-900 tabular-nums leading-none">
          {value}
        </div>
      )}
      {sub && <div className="mt-1 text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

function Panel({ icon, title, right, children, className = "" }) {
  return (
    <div
      className={`rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-[0_6px_20px_rgba(2,6,23,.04)] ${className}`}
    >
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <i className={`bx ${icon} text-indigo-500 text-lg`} />
        <h2 className="text-[14px] font-bold text-slate-800">{title}</h2>
        {right && (
          <span className="ml-auto text-[11px] text-slate-400">{right}</span>
        )}
      </div>
      {children}
    </div>
  );
}

/** Medidor radial (gauge tipo velocímetro) de la efectividad global. */
function GaugeEfectividad({ value, loading }) {
  const v = value == null ? 0 : value;
  const color = colorPorEff(value).luz;
  const data = [{ name: "ef", value: v, fill: color }];
  return (
    <div className="relative h-[240px] p-4">
      {loading ? (
        <div className="h-full rounded-xl bg-slate-100 animate-pulse" />
      ) : (
        <>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="70%"
              outerRadius="100%"
              data={data}
              startAngle={220}
              endAngle={-40}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background={{ fill: "#eef2f7" }}
                dataKey="value"
                cornerRadius={20}
                angleAxisId={0}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              className="text-[38px] font-black leading-none"
              style={{ color }}
            >
              {value == null ? "—" : `${value}%`}
            </span>
            <span className="mt-1 text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
              entrega global
            </span>
          </div>
        </>
      )}
    </div>
  );
}

const PRESETS = [
  { key: "1", label: "Último mes", meses: 1 },
  { key: "3", label: "3 meses", meses: 3 },
  { key: "6", label: "6 meses", meses: 6 },
  { key: "12", label: "1 año", meses: 12 },
  { key: "all", label: "Todo", meses: null },
];

function fechaHaceMeses(meses) {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return d.toISOString().slice(0, 10);
}

// Estilos react-select (limpio, redondeado, tipo SaaS).
const selectStyles = {
  control: (b, s) => ({
    ...b,
    minHeight: 44,
    borderRadius: 12,
    borderColor: s.isFocused ? "#a5b4fc" : "#e2e8f0",
    boxShadow: s.isFocused ? "0 0 0 3px rgba(199,210,254,.45)" : "none",
    ":hover": { borderColor: "#cbd5e1" },
    fontSize: 13.5,
    paddingLeft: 2,
  }),
  placeholder: (b) => ({ ...b, color: "#94a3b8" }),
  menu: (b) => ({
    ...b,
    borderRadius: 14,
    overflow: "hidden",
    zIndex: 40,
    boxShadow: "0 20px 40px rgba(2,6,23,.14)",
  }),
  menuList: (b) => ({ ...b, padding: 6 }),
  option: (b, s) => ({
    ...b,
    borderRadius: 9,
    fontSize: 13,
    cursor: "pointer",
    backgroundColor: s.isSelected
      ? "#4f46e5"
      : s.isFocused
        ? "#eef2ff"
        : "white",
    color: s.isSelected ? "white" : "#0f172a",
  }),
  dropdownIndicator: (b) => ({ ...b, color: "#94a3b8" }),
  indicatorSeparator: (b) => ({ ...b, backgroundColor: "#e2e8f0" }),
};

// Tooltip custom para los charts.
function ChartTooltip({ active, payload, sufijo }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg bg-slate-900 text-white px-2.5 py-1.5 text-[11px] shadow-lg">
      <div className="font-semibold">{p.payload.name}</div>
      <div className="tabular-nums text-white/80">
        {p.payload.display ?? p.value}
        {sufijo || ""}
      </div>
    </div>
  );
}

export default function TransportadorasView() {
  const [zonas, setZonas] = useState({ ciudades: [] });
  const [ciudad, setCiudad] = useState("");
  const [preset, setPreset] = useState("3");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const idConfig =
    typeof window !== "undefined"
      ? localStorage.getItem("id_configuracion") || ""
      : "";

  useEffect(() => {
    chatApi
      .get("/dropi_stats/zonas_disponibles", {
        params: { id_configuracion: idConfig },
      })
      .then(({ data: resp }) => setZonas(resp?.data || { ciudades: [] }))
      .catch(() => {});
  }, [idConfig]);

  const rango = useMemo(() => {
    if (preset === "custom") return { desde, hasta };
    const p = PRESETS.find((x) => x.key === preset);
    if (!p || p.meses == null) return { desde: "", hasta: "" };
    return { desde: fechaHaceMeses(p.meses), hasta: "" };
  }, [preset, desde, hasta]);

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    chatApi
      .post("/dropi_stats/transportadoras_historico", {
        ciudad,
        desde: rango.desde,
        hasta: rango.hasta,
        id_configuracion: idConfig,
      })
      .then(({ data: resp }) => vivo && setData(resp?.data || null))
      .catch(() => vivo && setData(null))
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
  }, [ciudad, rango.desde, rango.hasta]);

  const resumen = data?.resumen || {};
  const transportadoras = data?.transportadoras || [];
  const zonasTabla = data?.zonas || [];
  const paisNombre = NOMBRE_PAIS[data?.pais] || data?.pais || "";
  const maxTot = transportadoras.reduce((a, t) => Math.max(a, t.total), 0);

  // Opciones react-select
  const optCiudades = useMemo(
    () => [
      { value: "", label: "Todas las ciudades" },
      ...zonas.ciudades.map((c) => ({
        value: c.nombre,
        label: `${c.nombre} · ${fmtNum(c.total)}`,
      })),
    ],
    [zonas.ciudades],
  );

  // Datos para charts
  const chartEfectividad = transportadoras
    .filter((t) => t.suficiente)
    .map((t) => ({
      name: t.transportadora,
      value: t.efectividad,
      display: `${t.efectividad}%`,
      fill: colorPorEff(t.efectividad).luz,
    }));
  const chartFlete = transportadoras
    .filter((t) => t.flete_promedio != null)
    .map((t) => ({
      name: t.transportadora,
      value: Number(t.flete_promedio),
      display: fmtFlete(t.flete_promedio),
    }));
  const chartZonas = zonasTabla.slice(0, 10).map((z) => ({
    name: z.zona,
    value: z.total,
    display: fmtNum(z.total),
    fill: colorPorEff(z.efectividad).luz,
  }));

  const hayDatos = transportadoras.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full px-4 sm:px-8 py-6 space-y-5">
        {/* Header redondeado (tipo tarjeta, como el listado de contactos) */}
        <header className="rounded-2xl bg-gradient-to-r from-[#171931] to-[#2a2d55] px-5 sm:px-6 py-5 shadow-[0_10px_30px_rgba(2,6,23,.12)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 ring-1 ring-white/20 grid place-items-center">
              <i className="bx bx-trip text-[26px] text-indigo-200" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[20px] sm:text-[22px] font-black text-white leading-tight">
                Transportadoras{" "}
                {paisNombre && (
                  <span className="text-white/50 font-bold">
                    · {paisNombre}
                  </span>
                )}
              </h1>
              <p className="text-[12px] text-white/60">
                Efectividad de entrega y costo de flete por ciudad · todas las
                órdenes de tu país
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-white/80">
                Datos en vivo
              </span>
            </div>
          </div>
        </header>

        {/* Filtros */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-[0_6px_20px_rgba(2,6,23,.04)]">
          {/* Solo ciudad: la tasa de entrega por provincia salía muy general */}
          <div className="max-w-xl">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
              <i className="bx bx-buildings align-middle mr-1 text-slate-400" />
              Ciudad
            </label>
            <Select
              styles={selectStyles}
              options={optCiudades}
              value={
                optCiudades.find((o) => o.value === ciudad) || optCiudades[0]
              }
              onChange={(o) => setCiudad(o?.value || "")}
              placeholder="Buscar ciudad…"
              isSearchable
              noOptionsMessage={() => "Sin resultados"}
            />
          </div>

          {/* Presets de fecha + custom */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mr-1">
              <i className="bx bx-calendar align-middle mr-1" />
              Periodo
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition ${
                  preset === p.key
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPreset("custom")}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition ${
                preset === "custom"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Por fechas
            </button>
            {preset === "custom" && (
              <div className="flex items-center gap-2 ml-1">
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] focus:ring-2 focus:ring-indigo-200 outline-none"
                />
                <span className="text-slate-400 text-[12px]">a</span>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
            )}
            {ciudad && (
              <button
                type="button"
                onClick={() => setCiudad("")}
                className="ml-auto text-[12px] font-semibold text-slate-500 hover:text-slate-700"
              >
                <i className="bx bx-x text-lg align-middle" /> Limpiar ciudad
              </button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi
            loading={loading}
            icon="bx-package"
            label="Pedidos"
            value={fmtNum(resumen.total)}
            accent="bg-indigo-50 text-indigo-600"
          />
          <Kpi
            loading={loading}
            icon="bx-check-circle"
            label="Entregados"
            value={fmtNum(resumen.entregadas)}
            accent="bg-emerald-50 text-emerald-600"
          />
          <Kpi
            loading={loading}
            icon="bx-target-lock"
            label="Efectividad"
            value={
              resumen.efectividad != null ? `${resumen.efectividad}%` : "—"
            }
            sub="entregados vs. devueltos"
            accent="bg-amber-50 text-amber-600"
          />
          <Kpi
            loading={loading}
            icon="bx-dollar-circle"
            label="Flete promedio"
            value={fmtFlete(resumen.flete_promedio)}
            accent="bg-sky-50 text-sky-600"
          />
        </div>

        {/* Charts */}
        {!loading && !hayDatos ? (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 py-16 text-center text-slate-400 text-[14px]">
            <i className="bx bx-bar-chart-alt-2 text-4xl block mb-2 text-slate-300" />
            No hay datos para esta selección. Prueba otra zona o periodo.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Fila 1: medidor global + efectividad por transportadora */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Panel
                icon="bx-tachometer"
                title="Efectividad global"
                right="entrega"
              >
                <GaugeEfectividad
                  value={resumen.efectividad}
                  loading={loading}
                />
              </Panel>
              <Panel
                className="xl:col-span-2"
                icon="bx-target-lock"
                title="Efectividad por transportadora"
                right="% entregado"
              >
                <div className="p-4 h-[240px]">
                  {loading ? (
                    <div className="h-full rounded-xl bg-slate-100 animate-pulse" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartEfectividad}
                        layout="vertical"
                        margin={{ left: 8, right: 34 }}
                      >
                        <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          unit="%"
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          tick={{ fontSize: 11, fill: "#475569" }}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(99,102,241,.06)" }}
                          content={<ChartTooltip sufijo="%" />}
                        />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
                          {chartEfectividad.map((e, i) => (
                            <Cell key={i} fill={e.fill} />
                          ))}
                          <LabelList
                            dataKey="value"
                            position="right"
                            formatter={(v) => `${v}%`}
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              fill: "#334155",
                            }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Panel>
            </div>

            {/* Fila 2: flete + volumen por zona */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Panel
                icon="bx-dollar-circle"
                title="Costo de flete promedio"
                right="por transportadora"
              >
                <div className="p-4 h-[300px]">
                  {loading ? (
                    <div className="h-full rounded-xl bg-slate-100 animate-pulse" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartFlete}
                        margin={{ left: 0, right: 8, top: 16 }}
                      >
                        <defs>
                          <linearGradient
                            id="gradFlete"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#0284c7" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "#475569" }}
                          interval={0}
                          angle={-18}
                          textAnchor="end"
                          height={54}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          width={44}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(14,165,233,.06)" }}
                          content={<ChartTooltip />}
                        />
                        <Bar
                          dataKey="value"
                          radius={[8, 8, 0, 0]}
                          barSize={38}
                          fill="url(#gradFlete)"
                        >
                          <LabelList
                            dataKey="value"
                            position="top"
                            formatter={(v) => `$${Number(v).toFixed(2)}`}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              fill: "#0369a1",
                            }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Panel>

              <Panel
                icon="bx-map-alt"
                title="Ciudades con más volumen"
                right="top 10"
              >
                <div className="p-4 h-[300px]">
                  {loading ? (
                    <div className="h-full rounded-xl bg-slate-100 animate-pulse" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartZonas}
                        layout="vertical"
                        margin={{ left: 8, right: 34 }}
                      >
                        <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          tick={{ fontSize: 11, fill: "#475569" }}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(99,102,241,.06)" }}
                          content={<ChartTooltip sufijo=" pedidos" />}
                        />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={16}>
                          {chartZonas.map((e, i) => (
                            <Cell key={i} fill={e.fill} />
                          ))}
                          <LabelList
                            dataKey="value"
                            position="right"
                            formatter={(v) => fmtNum(v)}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              fill: "#334155",
                            }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Panel>
            </div>
          </div>
        )}

        {/* Tabla de transportadoras (detalle) */}
        <Panel
          icon="bxs-truck"
          title="Detalle por transportadora"
          right={ciudad || "todas las ciudades"}
        >
          {loading ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : transportadoras.length === 0 ? (
            <p className="text-[13px] text-slate-400 text-center py-10">
              No hay datos de transportadoras para esta selección.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[680px]">
                <thead>
                  <tr className="text-left text-[10.5px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="px-4 py-2.5 font-semibold">
                      Transportadora
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-center">
                      Semáforo
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      Efectividad
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      Entregados
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      Devol.
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      Novedad
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      En curso
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-right">
                      Flete prom.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transportadoras.map((t) => {
                    const c = COLORES[t.semaforo] || COLORES.gris;
                    const pct = maxTot > 0 ? (t.total / maxTot) * 100 : 0;
                    return (
                      <tr
                        key={t.transportadora}
                        className="border-b border-slate-50 hover:bg-slate-50/60 transition"
                      >
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-800">
                            {t.transportadora}
                          </div>
                          <div className="mt-1 h-1 w-24 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: c.luz }}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Semaforo activo={t.semaforo} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {t.suficiente ? (
                            <span
                              className="font-extrabold tabular-nums"
                              style={{ color: c.text }}
                            >
                              {t.efectividad}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              pocos datos
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                          {fmtNum(t.entregadas)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-rose-600">
                          {fmtNum(t.devoluciones)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-amber-600">
                          {fmtNum(t.novedades)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-400">
                          {fmtNum(t.en_curso)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-800">
                          {fmtFlete(t.flete_promedio)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Tabla de zonas (clic para filtrar) */}
        <Panel
          icon="bx-map-pin"
          title="Detalle por ciudad"
          right="clic para filtrar"
        >
          {loading ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-10 rounded-xl bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : zonasTabla.length === 0 ? (
            <p className="text-[13px] text-slate-400 text-center py-8">
              Sin datos de zonas.
            </p>
          ) : (
            <div className="overflow-auto max-h-[420px]">
              <table className="w-full text-[13px] min-w-[520px]">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-left text-[10.5px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="px-4 py-2.5 font-semibold bg-white">
                      Ciudad
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      Pedidos
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      Entregados
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      Efectividad
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-right">
                      Flete prom.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {zonasTabla.map((z) => {
                    const col = colorPorEff(z.efectividad);
                    return (
                      <tr
                        key={z.zona}
                        className="border-b border-slate-50 hover:bg-indigo-50/50 transition cursor-pointer"
                        onClick={() => setCiudad(z.zona)}
                      >
                        <td className="px-4 py-2.5 font-semibold text-slate-800">
                          <i className="bx bx-map-pin text-slate-300 mr-1 align-middle" />
                          {z.zona}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                          {fmtNum(z.total)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                          {fmtNum(z.entregadas)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {z.efectividad != null ? (
                            <span
                              className="font-bold tabular-nums"
                              style={{ color: col.text }}
                            >
                              {z.efectividad}%
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-800">
                          {fmtFlete(z.flete_promedio)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <p className="text-[11px] text-slate-400 text-center pb-4">
          <b>Efectividad</b> = de cada 100 pedidos finalizados (entregados +
          devueltos), cuántos llegaron al cliente.
        </p>
      </div>
    </div>
  );
}
