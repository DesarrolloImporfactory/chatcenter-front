import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  AreaChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import chatApi from "../../api/chatcenter";
import EfectividadCiudades from "./EfectividadCiudades";
import RentabilidadReal from "./RentabilidadReal";
import { esRolVentas } from "../../utils/rolActual";
import {
  DATE_PRESETS,
  STATUS_LABELS,
  STATUS_COLORS,
  productImg,
  toYMD,
  daysAgo,
  rangoAnterior,
  fmtDiaCorto,
  fmtRango,
  fmtHora,
  fmt$,
  fmtNum,
  fmtPct,
  fmtDur,
  deltaPct,
  iniciales,
} from "./utils";

/* ═════════════════════════════════════════════════════════════════
   Dashboard de conexión v2 — PROPUESTA EN REVISIÓN
   Una sola página que cuenta la historia de la conexión de arriba
   hacia abajo: cuánto vendió → cómo convierte → qué productos →
   cómo atiende el equipo. Sin tabs. Se entra solo por la ruta
   /conexion-dashboard-v2 (no está en ningún menú) y toma la conexión
   activa de localStorage, igual que /conexion-dashboard.
   Datos: los mismos endpoints del dashboard actual, sin cambios en
   el back:
     · POST dropi_integrations/dashboard/connection-summary (x2: rango
       actual y rango anterior, para los chips de variación)
     · POST /dashboard/obtener_dashboard_completo (atención)
     · GET  /dashboard/modo (ventas vs atención)
     · GET  /marketing-control/dashboard (anuncios ganadores)
   ═════════════════════════════════════════════════════════════════ */

const CSS = `
@keyframes dv2Rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes dv2Sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
@keyframes dv2Pulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
.dv2-rise { animation: dv2Rise .55s cubic-bezier(.16,1,.3,1) both; }
.dv2-card { background:#fff; border:1px solid rgba(226,232,240,.8); border-radius:22px;
  box-shadow: 0 1px 2px rgba(16,24,40,.04), 0 10px 30px -16px rgba(16,24,40,.14); }
.dv2-glass { background: rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); backdrop-filter: blur(10px); }
.dv2-num { font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.dv2-scroll::-webkit-scrollbar { height: 6px; }
.dv2-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
`;

const ACENTO = {
  cyan: "#22d3ee",
  emerald: "#34d399",
  violet: "#a78bfa",
  amber: "#fbbf24",
  rose: "#fb7185",
  blue: "#60a5fa",
  slate: "#94a3b8",
};

const SECCIONES_ATENCION = [
  "summary",
  "slaToday",
  "charts",
  "agentLoad",
  "pendingQueue",
  "atencionAsesores",
];

/* ─── hooks ─── */

/* Número que «sube» hasta su valor al cargar o al cambiar de rango. */
function useCountUp(value, ms = 750) {
  const [n, setN] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const desde = prev.current;
    const hasta = Number(value || 0);
    if (desde === hasta) return undefined;
    let raf;
    const t0 = performance.now();
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setN(desde + (hasta - desde) * e);
      if (k < 1) raf = requestAnimationFrame(paso);
      else prev.current = hasta;
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return n;
}

/* ─── piezas chicas ─── */

function Skel({ className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-100 ${className}`}>
      <div className="absolute inset-0 animate-[dv2Sweep_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
    </div>
  );
}

/* Chip de variación contra el periodo anterior. `invertir` cuando bajar
   es bueno (tiempo de respuesta, cancelados). */
function Delta({ valor, invertir = false, oscuro = false, puntos = false }) {
  if (valor == null) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
          oscuro ? "bg-white/10 text-white/60" : "bg-slate-100 text-slate-500"
        }`}
      >
        sin base previa
      </span>
    );
  }
  const v = Number(valor);
  // Lo que se redondea a 0 se pinta neutro (antes salía «↓ 0%» en rojo).
  const neutro = Math.abs(v) < (puntos ? 0.05 : 0.5);
  const bueno = invertir ? v < 0 : v > 0;
  const color = neutro
    ? oscuro
      ? "bg-white/10 text-white/70"
      : "bg-slate-100 text-slate-600"
    : bueno
      ? oscuro
        ? "bg-emerald-400/15 text-emerald-300"
        : "bg-emerald-50 text-emerald-700"
      : oscuro
        ? "bg-rose-400/15 text-rose-300"
        : "bg-rose-50 text-rose-600";
  const icono = neutro ? "bx-minus" : v > 0 ? "bx-up-arrow-alt" : "bx-down-arrow-alt";
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold dv2-num ${color}`}
      title="Comparado con el periodo anterior de la misma duración"
    >
      <i className={`bx ${icono} text-[13px]`} />
      {Math.abs(v).toFixed(puntos ? 1 : 0)}
      {puntos ? " pts" : "%"}
    </span>
  );
}

function Seccion({ titulo, sub, derecha, children, className = "", delay = 0 }) {
  return (
    <section
      className={`dv2-card dv2-rise p-5 sm:p-6 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900">
            {titulo}
          </h2>
          {sub && (
            <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{sub}</p>
          )}
        </div>
        {derecha && <div className="shrink-0">{derecha}</div>}
      </header>
      {children}
    </section>
  );
}

function Vacio({ icono, texto, alto = "h-[180px]" }) {
  return (
    <div
      className={`${alto} grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60`}
    >
      <div className="text-center">
        <i className={`bx ${icono} text-3xl text-slate-300`} />
        <p className="mt-1 text-[12px] font-medium text-slate-500">{texto}</p>
      </div>
    </div>
  );
}

function TooltipChart({ active, payload, label, dinero = [] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[11.5px] shadow-xl backdrop-blur">
      <p className="mb-1 font-bold text-slate-800">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-slate-500">{p.name}</span>
          <span className="ml-auto font-bold dv2-num text-slate-900">
            {dinero.includes(p.dataKey) ? fmt$(p.value) : fmtNum(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════ barra superior ═══════════════ */

function BarraSuperior({
  conexion,
  modo,
  rango,
  preset,
  onPreset,
  onRangoManual,
  actualizado,
  cargando,
  onRefrescar,
  canal,
  onCanal,
  vendeShopify,
}) {
  const hoy = toYMD(new Date());
  return (
    <div className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 2xl:px-10">
        {/* identidad de la conexión */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-[12px] font-black text-white shadow-md">
            {iniciales(conexion.nombre) || "C"}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2">
              <p className="truncate text-[14px] font-extrabold tracking-tight text-slate-900">
                {conexion.nombre}
              </p>
              <span
                className={`hidden rounded-full px-2 py-[2px] text-[10px] font-bold uppercase tracking-wide sm:inline ${
                  modo === "atencion"
                    ? "bg-sky-50 text-sky-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {modo === "atencion" ? "Atención" : "Ventas"}
              </span>
              <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2 py-[2px] text-[10px] font-bold text-amber-700 md:inline">
                Vista nueva · en revisión
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {fmtRango(rango.from, rango.to)}
              {actualizado && (
                <span className="text-slate-400"> · actualizado {fmtHora(actualizado)}</span>
              )}
            </p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {vendeShopify && (
            <div className="flex rounded-full bg-slate-100 p-0.5">
              {[
                { k: "wa", t: "WhatsApp", i: "bxl-whatsapp" },
                { k: "shopify", t: "Tienda", i: "bxl-shopify" },
              ].map((c) => (
                <button
                  key={c.k}
                  onClick={() => onCanal(c.k)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                    canal === c.k
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <i className={`bx ${c.i} text-[14px]`} />
                  {c.t}
                </button>
              ))}
            </div>
          )}

          {/* presets */}
          <div className="flex rounded-full bg-slate-100 p-0.5">
            {DATE_PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => onPreset(i)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                  preset === i
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* rango manual */}
          <div className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-[3px] lg:flex">
            <input
              type="date"
              value={rango.from}
              max={rango.to}
              onChange={(e) => onRangoManual({ ...rango, from: e.target.value })}
              className="w-[118px] bg-transparent text-[11px] font-semibold text-slate-700 outline-none"
            />
            <span className="text-slate-300">→</span>
            <input
              type="date"
              value={rango.to}
              min={rango.from}
              max={hoy}
              onChange={(e) => onRangoManual({ ...rango, to: e.target.value })}
              className="w-[118px] bg-transparent text-[11px] font-semibold text-slate-700 outline-none"
            />
          </div>

          <button
            onClick={onRefrescar}
            disabled={cargando}
            title="Volver a consultar"
            className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <i className={`bx bx-refresh text-[18px] ${cargando ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ hero ═══════════════ */

function KpiHero({ icono, color, label, valor, sub, delta, invertir, puntos }) {
  return (
    <div className="dv2-glass rounded-2xl p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-white/55">
          <i className={`bx ${icono} text-[15px]`} style={{ color }} />
          {label}
        </span>
        {delta !== undefined && (
          <Delta valor={delta} invertir={invertir} oscuro puntos={puntos} />
        )}
      </div>
      <p className="dv2-num mt-2 text-[24px] font-black leading-none text-white">
        {valor}
      </p>
      {sub && <p className="mt-1 truncate text-[11px] text-white/55" title={sub}>{sub}</p>}
    </div>
  );
}

function Hero({ titulo, etiqueta, valorNum, formato, delta, invertir, sub, serie, serieKey, serieNombre, serieDinero, kpis, cargando, nota }) {
  const n = useCountUp(valorNum);
  return (
    <section
      className="dv2-rise relative overflow-hidden rounded-[28px] p-6 text-white sm:p-8"
      style={{
        background:
          "radial-gradient(1200px 400px at 85% -20%, rgba(34,211,238,.22), transparent 60%), radial-gradient(800px 300px at -10% 110%, rgba(167,139,250,.18), transparent 60%), linear-gradient(135deg,#0b1220 0%,#111c38 55%,#0d2440 100%)",
      }}
    >
      {/* grid decorativa */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage: "radial-gradient(ellipse at 30% 40%, black 30%, transparent 75%)",
        }}
      />
      <div className="relative grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
            {etiqueta}
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            {cargando ? (
              <Skel className="h-[56px] w-[260px] !bg-white/10" />
            ) : (
              <h1 className="dv2-num text-[44px] font-black leading-none tracking-tight sm:text-[56px]">
                {formato(n)}
              </h1>
            )}
            {!cargando && <Delta valor={delta} invertir={invertir} oscuro />}
          </div>
          <p className="mt-2 text-[13px] text-white/60">{sub}</p>
          {nota && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-amber-300/90">
              <i className="bx bx-info-circle" /> {nota}
            </p>
          )}

          <div className="mt-auto pt-6">
            <div className="h-[92px] w-full">
              {cargando ? (
                <Skel className="h-full w-full !bg-white/10" />
              ) : serie?.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={serie} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dv2HeroGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACENTO.cyan} stopOpacity={0.55} />
                        <stop offset="100%" stopColor={ACENTO.cyan} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      cursor={{ stroke: "rgba(255,255,255,.25)" }}
                      content={<TooltipChart dinero={serieDinero ? [serieKey] : []} />}
                    />
                    <Area
                      type="monotone"
                      dataKey={serieKey}
                      name={serieNombre}
                      stroke={ACENTO.cyan}
                      strokeWidth={2.2}
                      fill="url(#dv2HeroGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#fff", stroke: ACENTO.cyan }}
                    />
                    <XAxis dataKey="label" hide />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center rounded-xl border border-dashed border-white/15 text-[11.5px] text-white/40">
                  Elige más de un día para ver la tendencia
                </div>
              )}
            </div>
            <p className="mt-1 text-[10.5px] text-white/40">{titulo}</p>
          </div>
        </div>

        {/* 6 tiles compactos en 2 filas: antes eran 3 tarjetas altas con la
            mitad vacía (Daniel, 07-11-2026). */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cargando
            ? [0, 1, 2, 3, 4, 5].map((i) => <Skel key={i} className="h-[104px] !bg-white/10" />)
            : kpis.map((k) => <KpiHero key={k.label} {...k} />)}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ embudo ═══════════════ */

/* Tres pasos en horizontal con el % de conversión ENTRE ellos (nunca dentro
   de una barra: con 6 pedidos sobre 260 conversaciones la barra mide 2% y
   cualquier texto adentro se sale). Abajo, una barra proporcional apilada. */
function Embudo({ pasos, nota }) {
  const base = Math.max(1, pasos[0]?.valor || 0);
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
        {pasos.map((p, i) => (
          <Fragment key={p.label}>
            {i > 0 && (
              <div className="flex items-center justify-center gap-1 sm:flex-col sm:px-1">
                <i className="bx bx-chevron-down text-2xl text-slate-300 sm:hidden" />
                <i className="bx bx-chevron-right hidden text-2xl text-slate-300 sm:block" />
                <span
                  className="dv2-num rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-black text-white"
                  title="Del paso anterior"
                >
                  {fmtPct(p.pct)}
                </span>
              </div>
            )}
            <div
              className="relative overflow-hidden rounded-2xl p-4 text-white"
              style={{ background: p.color }}
            >
              <i className={`bx ${p.icono} absolute -right-2 -top-2 text-[64px] opacity-10`} />
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/70">
                {p.label}
              </p>
              <p className="dv2-num mt-1 text-[32px] font-black leading-none">{fmtNum(p.valor)}</p>
              <p className="mt-1.5 text-[11px] text-white/70">
                {i === 0 ? "punto de partida" : `${fmtPct((p.valor / base) * 100)} de las conversaciones`}
              </p>
            </div>
          </Fragment>
        ))}
      </div>
      <div className="relative mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {pasos.map((p, i) => (
          <div
            key={p.label}
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{
              width: `${Math.max(p.valor > 0 ? 1.5 : 0, (p.valor / base) * 100)}%`,
              background: p.color,
              zIndex: i + 1,
            }}
          />
        ))}
      </div>
      {nota && <p className="mt-3 text-[12px] leading-snug text-slate-600">{nota}</p>}
    </div>
  );
}

/* ═══════════════ dona de estados ═══════════════ */

function DonaEstados({ estados, total }) {
  if (!estados.length) return <Vacio icono="bx-package" texto="Sin pedidos en el periodo" />;
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[170px_1fr]">
      <div className="relative mx-auto h-[170px] w-[170px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={estados}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
              cornerRadius={4}
            >
              {estados.map((e) => (
                <Cell key={e.key} fill={e.color} />
              ))}
            </Pie>
            <Tooltip content={<TooltipChart />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="dv2-num text-[24px] font-black leading-none text-slate-900">
              {fmtNum(total)}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              pedidos
            </p>
          </div>
        </div>
      </div>
      <ul className="space-y-1.5">
        {estados.slice(0, 6).map((e) => (
          <li key={e.key} className="flex items-center gap-2 text-[12px]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
            <span className="text-slate-600">{e.name}</span>
            <span className="ml-auto dv2-num font-bold text-slate-900">{fmtNum(e.value)}</span>
            <span className="dv2-num w-11 text-right text-slate-400">{fmtPct(e.pct, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ═══════════════ ritmo diario ═══════════════ */

/* Un solo gráfico (Daniel, 07-11-2026: sin tabs ventas/conversaciones):
   barras de facturado en el eje izquierdo; conversaciones (área) y pedidos
   (línea) en ejes ocultos propios, para que cada forma se lea aunque las
   magnitudes sean muy distintas (4.000 conversaciones vs 400 pedidos). */
const LEYENDA_RITMO = [
  { k: "facturado", t: "Facturado", c: "#6366f1" },
  { k: "conversaciones", t: "Conversaciones", c: ACENTO.emerald },
  { k: "pedidos", t: "Pedidos", c: "#0f172a" },
];

function RitmoDiario({ serie, canal }) {
  if (!serie?.length) return <Vacio icono="bx-bar-chart-alt-2" texto="Sin movimiento en el periodo" alto="h-[260px]" />;
  const keyPedidos = canal === "shopify" ? "pedidos_shopify" : "pedidos_wa";
  return (
    <div>
      <div className="mb-2 flex flex-wrap justify-end gap-x-4 gap-y-1">
        {LEYENDA_RITMO.map((l) => (
          <span key={l.k} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.c }} />
            {l.t}
          </span>
        ))}
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={serie} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="dv2Bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="dv2Conv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACENTO.emerald} stopOpacity={0.5} />
                <stop offset="100%" stopColor={ACENTO.emerald} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#eef2f7" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10.5, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="l"
              tick={{ fontSize: 10.5, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                v >= 1000
                  ? `$${(v / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
                  : `$${Math.round(v)}`
              }
              width={44}
            />
            <YAxis yAxisId="conv" orientation="right" hide />
            <YAxis yAxisId="ped" orientation="right" hide />
            <Tooltip
              cursor={{ fill: "rgba(99,102,241,.06)" }}
              content={<TooltipChart dinero={["facturado"]} />}
            />
            <Area
              yAxisId="conv"
              type="monotone"
              dataKey="conversaciones"
              name="Conversaciones"
              stroke={ACENTO.emerald}
              strokeWidth={2}
              fill="url(#dv2Conv)"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Bar
              yAxisId="l"
              dataKey="facturado"
              name="Facturado"
              fill="url(#dv2Bar)"
              radius={[6, 6, 0, 0]}
              maxBarSize={38}
            />
            <Line
              yAxisId="ped"
              type="monotone"
              dataKey={keyPedidos}
              name="Pedidos"
              stroke="#0f172a"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#0f172a" }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ═══════════════ productos estrella ═══════════════ */

const MEDALLA = ["from-amber-300 to-yellow-500", "from-slate-300 to-slate-400", "from-orange-300 to-amber-600"];

function ProductosEstrella({ productos }) {
  /* Ranking por pedidos (lo que el dueño reconoce de inmediato); la utilidad
     se muestra tal cual, en rojo si es negativa: ordenar por utilidad ponía
     primero productos que pierden plata cuando ninguno había dado ganancia. */
  const top = useMemo(
    () =>
      [...(productos || [])]
        .filter((p) => p.ordenes > 0 || p.gananciaNeta > 0)
        .sort((a, b) => b.ordenes - a.ordenes || b.gananciaNeta - a.gananciaNeta)
        .slice(0, 5),
    [productos],
  );
  if (!top.length) return <Vacio icono="bx-star" texto="Todavía no hay productos con ventas" />;
  const maxP = Math.max(1, ...top.map((p) => p.ordenes));
  return (
    /* flex-wrap con mínimo/máximo: con 3 productos se reparten el ancho sin
       dejar dos huecos a la derecha, y con 5 caben en una fila en pantallas
       grandes sin estirarse de más. */
    <div className="flex flex-wrap gap-3">
      {top.map((p, i) => {
        const img = productImg(p.image);
        const pierde = p.gananciaNeta < 0;
        return (
          <article
            key={`${p.product_id}-${p.sku}`}
            className="group relative min-w-[200px] max-w-[440px] flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="relative h-[130px] bg-slate-50">
              {img ? (
                <img
                  src={img}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="grid h-full place-items-center text-slate-300">
                  <i className="bx bx-package text-4xl" />
                </div>
              )}
              <span
                className={`absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br text-[12px] font-black text-white shadow ${
                  MEDALLA[i] || "from-slate-500 to-slate-700"
                }`}
              >
                {i + 1}
              </span>
            </div>
            <div className="p-3">
              <p className="line-clamp-2 min-h-[34px] text-[12px] font-bold leading-snug text-slate-800" title={p.name}>
                {p.name}
              </p>
              {/* Lo grande y en verde es lo que queda si se entrega lo que
                  va en camino (Daniel, 07-11-2026: «no estoy ganando» casi
                  siempre es «todavía no me han entregado»); debajo, lo real
                  hasta hoy. Sin pedidos en camino, lo real es lo único. */}
              {p.gananciaPotencial != null && p.transito > 0 ? (
                <>
                  <p className={`dv2-num mt-1 text-[20px] font-black leading-none ${p.gananciaPotencial < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {p.gananciaPotencial >= 0 ? "+" : ""}
                    {fmt$(p.gananciaPotencial)}
                  </p>
                  <p className="text-[10.5px] font-semibold text-emerald-700/80">
                    si se entregan los {fmtNum(p.transito)} en camino
                  </p>
                  <p className={`mt-1 text-[11px] ${pierde ? "text-rose-600" : "text-slate-600"}`}>
                    Hoy: <b className="dv2-num">{fmt$(p.gananciaNeta)}</b> con {fmtNum(p.entregadas)} entregados
                  </p>
                </>
              ) : (
                <>
                  <p className={`dv2-num mt-1 text-[20px] font-black leading-none ${pierde ? "text-rose-600" : "text-emerald-600"}`}>
                    {fmt$(p.gananciaNeta)}
                  </p>
                  <p className="text-[10.5px] text-slate-400">
                    {pierde ? "pérdida neta en lo entregado" : "utilidad neta en lo entregado"}
                  </p>
                </>
              )}
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100" title="Pedidos frente al producto más pedido">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500"
                  style={{ width: `${Math.max(6, (p.ordenes / maxP) * 100)}%` }}
                />
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-1 text-center">
                {[
                  ["Pedidos", fmtNum(p.ordenes)],
                  ["Entreg.", fmtNum(p.entregadas)],
                  ["Margen", p.margenPct != null ? fmtPct(p.margenPct, 0) : "—"],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-slate-50 py-1">
                    <p className="dv2-num text-[12px] font-extrabold text-slate-800">{v}</p>
                    <p className="text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ═══════════════ carritos ═══════════════ */

function Anillo({ pct, color, size = 120, grosor = 11, children }) {
  const r = (size - grosor) / 2;
  const c = 2 * Math.PI * r;
  const k = Math.max(0, Math.min(100, Number(pct || 0))) / 100;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eef2f7" strokeWidth={grosor} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={grosor}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - k)}
          style={{ transition: "stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

function Carritos({ c }) {
  return (
    <div className="flex items-center gap-5">
      <Anillo pct={c.tasaRecuperacion} color={ACENTO.violet}>
        <div>
          <p className="dv2-num text-[22px] font-black leading-none text-slate-900">
            {fmtPct(c.tasaRecuperacion, 0)}
          </p>
          <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">
            recuperados
          </p>
        </div>
      </Anillo>
      <div className="grid flex-1 grid-cols-3 gap-2">
        {[
          ["Abandonados", fmtNum(c.abandonados), "text-slate-900"],
          ["Recuperados", fmtNum(c.recuperados), "text-violet-600"],
          ["Pendientes", fmtNum(c.pendientes), "text-amber-600"],
        ].map(([l, v, cls]) => (
          <div key={l} className="rounded-xl bg-slate-50 p-2.5 text-center">
            <p className={`dv2-num text-[18px] font-black ${cls}`}>{v}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{l}</p>
          </div>
        ))}
        <p className="col-span-3 text-[11.5px] text-slate-500">
          En juego <b className="dv2-num text-slate-800">{fmt$(c.valorPendiente)}</b> de carritos
          que aún no cerraron.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════ anuncios ganadores ═══════════════ */

function Anuncios({ ads, accountName, podio = false }) {
  if (!ads?.length)
    return <Vacio icono="bxl-meta" texto="Ningún anuncio con entregas en el periodo" alto={podio ? "h-[120px]" : "h-[180px]"} />;
  return (
    <ul className={podio ? "grid gap-3 sm:grid-cols-3" : "space-y-2"}>
      {ads.map((a, i) => (
        <li
          key={a.ad_id || i}
          className={`flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 ${podio ? "p-3.5" : "p-2.5"}`}
        >
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[12px] font-black text-white ${
              MEDALLA[i] || "from-slate-500 to-slate-700"
            }`}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold text-slate-800" title={a.ad_name}>
              {a.ad_name || "Anuncio sin nombre"}
            </p>
            <p className="truncate text-[10.5px] text-slate-400">
              {a.product_attributed || accountName || "Meta Ads"}
            </p>
          </div>
          <div className="text-right">
            <p className="dv2-num text-[13px] font-black text-blue-600">
              {fmtNum(a.entregadas_estimadas)} <span className="text-[10px] font-semibold text-slate-400">entregas</span>
            </p>
            <p className="dv2-num text-[10.5px] text-slate-500">
              ROI {Number(a.roi_estimado || 0).toFixed(1)}x · {fmt$(a.utilidad_estimada)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ═══════════════ atención ═══════════════ */

const CANAL_ICONO = {
  WhatsApp: ["bxl-whatsapp", "#25D366"],
  Messenger: ["bxl-messenger", "#0084FF"],
  Instagram: ["bxl-instagram", "#E1306C"],
};

function KpiPlano({ icono, color, label, valor, sub, delta, invertir }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${color}1a`, color }}>
          <i className={`bx ${icono} text-[18px]`} />
        </span>
        {delta !== undefined && <Delta valor={delta} invertir={invertir} />}
      </div>
      <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="dv2-num mt-0.5 text-[20px] font-black leading-none text-slate-900 sm:text-[24px]">{valor}</p>
      {sub && <p className="mt-1.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

function HorasPico({ serie }) {
  const datos = useMemo(() => {
    const porHora = new Map((serie || []).map((r) => [r.hour, Number(r.chats || 0)]));
    return Array.from({ length: 24 }, (_, h) => {
      const k = `${String(h).padStart(2, "0")}:00`;
      return { hora: k, label: `${h}h`, chats: porHora.get(k) || 0 };
    });
  }, [serie]);
  const max = Math.max(...datos.map((d) => d.chats));
  if (!max) return <Vacio icono="bx-time-five" texto="Sin conversaciones nuevas en el periodo" alto="h-[180px]" />;
  const pico = datos.find((d) => d.chats === max);
  return (
    <div>
      <div className="h-[170px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} margin={{ top: 6, right: 0, left: -24, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eef2f7" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: "rgba(14,165,233,.08)" }} content={<TooltipChart />} />
            <Bar dataKey="chats" name="Conversaciones nuevas" radius={[5, 5, 0, 0]} maxBarSize={22}>
              {datos.map((d) => (
                <Cell key={d.hora} fill={d.chats === max ? "#0ea5e9" : "#bae6fd"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11.5px] text-slate-500">
        La hora con más entradas es <b className="text-slate-800">{pico.label}</b> con{" "}
        <b className="dv2-num text-slate-800">{fmtNum(max)}</b> conversaciones nuevas.
      </p>
    </div>
  );
}

function Equipo({ asesores, agentLoad, umbrales }) {
  /* Preferimos la medición fina de atencionAsesores (mediana de respuesta y
     semáforo); si no vino, caemos a agentLoad (chats totales / abiertos). */
  const filas = useMemo(() => {
    if (asesores?.length) {
      return asesores
        .filter((a) => a.chats > 0 || a.mensajes > 0)
        .slice(0, 6)
        .map((a) => ({
          id: a.id_sub_usuario,
          nombre: a.nombre,
          chats: a.chats,
          mediana: a.mediana_seg,
          ok: a.ok || 0,
          adv: a.advertencia || 0,
          crit: a.critico || 0,
          conectado: a.conectado_seg,
        }));
    }
    return (agentLoad || []).slice(0, 6).map((a) => ({
      id: a.id_sub_usuario,
      nombre: a.nombre_encargado,
      chats: a.total_chats,
      abiertos: a.chats_abiertos_ahora,
    }));
  }, [asesores, agentLoad]);

  if (!filas.length) return <Vacio icono="bx-group" texto="Sin actividad del equipo en el periodo" alto="h-[180px]" />;
  const max = Math.max(1, ...filas.map((f) => f.chats));
  return (
    <ul className="space-y-2.5">
      {filas.map((f) => {
        const tot = (f.ok || 0) + (f.adv || 0) + (f.crit || 0);
        return (
          <li key={f.id ?? f.nombre} className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-black text-white">
              {iniciales(f.nombre) || "?"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
                <p className="truncate text-[12.5px] font-bold text-slate-800">{f.nombre || "Sin nombre"}</p>
                <p className="dv2-num shrink-0 text-[11.5px] text-slate-500">
                  <b className="text-slate-900">{fmtNum(f.chats)}</b> chats
                  {f.mediana != null && <> · responde en <b className="text-slate-900">{fmtDur(f.mediana)}</b></>}
                  {f.abiertos != null && <> · <b className="text-slate-900">{fmtNum(f.abiertos)}</b> abiertos</>}
                </p>
              </div>
              {tot > 0 ? (
                <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-100" title={`${f.ok} rápidas · ${f.adv} lentas · ${f.crit} críticas (umbral ${umbrales?.advertencia ?? "—"}/${umbrales?.critico ?? "—"} min)`}>
                  <div style={{ width: `${(f.ok / tot) * 100}%`, background: ACENTO.emerald }} />
                  <div style={{ width: `${(f.adv / tot) * 100}%`, background: ACENTO.amber }} />
                  <div style={{ width: `${(f.crit / tot) * 100}%`, background: ACENTO.rose }} />
                </div>
              ) : (
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500" style={{ width: `${(f.chats / max) * 100}%` }} />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ColaEspera({ cola }) {
  const filas = useMemo(
    () => [...(cola || [])].sort((a, b) => b.waitSeconds - a.waitSeconds).slice(0, 6),
    [cola],
  );
  if (!filas.length)
    return (
      <div className="grid h-[180px] place-items-center rounded-2xl border border-emerald-100 bg-emerald-50/50">
        <div className="text-center">
          <i className="bx bx-check-double text-3xl text-emerald-400" />
          <p className="mt-1 text-[12px] font-semibold text-emerald-700">Nadie está esperando respuesta</p>
        </div>
      </div>
    );
  const PRIO = { Alta: "bg-rose-50 text-rose-600", Media: "bg-amber-50 text-amber-700", Baja: "bg-slate-100 text-slate-600" };
  return (
    <ul className="divide-y divide-slate-100">
      {filas.map((f) => {
        const [ic, col] = CANAL_ICONO[f.channel] || ["bx-message", "#64748b"];
        return (
          <li key={f.id} className="flex items-center gap-3 py-2">
            <i className={`bx ${ic} text-[20px]`} style={{ color: col }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-bold text-slate-800">{f.client}</p>
              <p className="truncate text-[10.5px] text-slate-400">{f.responsable} · {f.estado_contacto}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIO[f.priority] || PRIO.Baja}`}>
              {f.priority}
            </span>
            <span className="dv2-num shrink-0 whitespace-nowrap text-right text-[12px] font-black text-slate-900">
              {fmtDur(f.waitSeconds)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SlaCanales({ sla }) {
  const canales = (sla?.channels || []).filter((c) => c.pct > 0 || sla?.resolvedToday > 0);
  if (!canales.length) return null;
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
        Nivel de servicio por canal
      </p>
      <div className="grid grid-cols-3 gap-2">
      {canales.map((c) => {
        const [ic, col] = CANAL_ICONO[c.name] || ["bx-message", "#64748b"];
        return (
          <div key={c.name} className="rounded-xl bg-slate-50 p-2.5 text-center">
            <i className={`bx ${ic} text-[18px]`} style={{ color: col }} />
            <p className="dv2-num text-[16px] font-black text-slate-900">{fmtPct(c.pct, 0)}</p>
            <p className="text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">{c.name}</p>
          </div>
        );
      })}
      </div>
    </div>
  );
}

/* Tira de KPIs del modo atención: lo que el hero NO muestra. (En modo
   atención el hero ya trae conversaciones, 1ª respuesta y resueltas; repetirlo
   abajo dejaba la vista pobre para quien solo atiende.) */
function StripAtencion({ atencion, tot, umbrales }) {
  const sla = atencion?.slaToday || null;
  const ok = tot?.ok || 0;
  const adv = tot?.advertencia || 0;
  const crit = tot?.critico || 0;
  const totR = ok + adv + crit;
  const canales = (atencion?.charts?.byChannel || [])
    .map((c) => ({ name: c.name, value: Number(c.value || 0) }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const maxCanal = Math.max(1, ...canales.map((c) => c.value));
  const NOMBRE_CANAL = { WA: "WhatsApp", MS: "Messenger", IG: "Instagram", OTHER: "Otro" };
  const COLOR_CANAL = { WA: "#25D366", MS: "#0084FF", IG: "#E1306C", OTHER: "#94a3b8" };
  const asesores = (atencion?.atencionAsesores?.asesores || []).filter((a) => a.chats > 0 || a.mensajes > 0);
  const deptos = atencion?.atencionAsesores?.departamentos || [];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <KpiPlano
        icono="bx-target-lock"
        color="#f59e0b"
        label="Nivel de servicio"
        valor={fmtPct(sla?.generalPct, 0)}
        sub={`${fmtNum(sla?.resolvedToday || 0)} resueltas · ${fmtNum(sla?.abandoned || 0)} abandonadas`}
      />

      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
          <i className="bx bx-tachometer text-[15px] text-violet-500" /> Rapidez de respuesta
        </span>
        {totR > 0 ? (
          <>
            <p className="dv2-num mt-2 text-[20px] font-black leading-none text-slate-900 sm:text-[24px]">
              {fmtPct((ok / totR) * 100, 0)} <span className="text-[12px] font-semibold text-slate-400">rápidas</span>
            </p>
            <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70">
              <div style={{ width: `${(ok / totR) * 100}%`, background: ACENTO.emerald }} />
              <div style={{ width: `${(adv / totR) * 100}%`, background: ACENTO.amber }} />
              <div style={{ width: `${(crit / totR) * 100}%`, background: ACENTO.rose }} />
            </div>
            <p className="mt-1.5 text-[10.5px] text-slate-500">
              <span className="font-bold text-emerald-700">{fmtNum(ok)}</span> en menos de {umbrales?.advertencia ?? "—"} min ·{" "}
              <span className="font-bold text-amber-700">{fmtNum(adv)}</span> lentas ·{" "}
              <span className="font-bold text-rose-600">{fmtNum(crit)}</span> de más de {umbrales?.critico ?? "—"} min
            </p>
          </>
        ) : (
          <p className="mt-3 text-[12px] text-slate-400">Sin respuestas humanas medidas</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
          <i className="bx bx-broadcast text-[15px] text-sky-500" /> Por canal
        </span>
        {canales.length ? (
          <ul className="mt-2.5 space-y-1.5">
            {canales.slice(0, 3).map((c) => (
              <li key={c.name} className="text-[11.5px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{NOMBRE_CANAL[c.name] || c.name}</span>
                  <span className="dv2-num font-black text-slate-900">{fmtNum(c.value)}</span>
                </div>
                <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-200/70">
                  <div className="h-full rounded-full" style={{ width: `${(c.value / maxCanal) * 100}%`, background: COLOR_CANAL[c.name] || "#94a3b8" }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[12px] text-slate-400">Sin mensajes en el periodo</p>
        )}
      </div>

      <KpiPlano
        icono="bx-group"
        color="#6366f1"
        label="Equipo activo"
        valor={fmtNum(asesores.length)}
        sub={
          deptos.length
            ? `${deptos.length} ${deptos.length === 1 ? "departamento" : "departamentos"} · ${fmtNum(tot?.respuestas || 0)} respuestas`
            : `${fmtNum(tot?.respuestas || 0)} respuestas humanas en el periodo`
        }
      />
    </div>
  );
}

/* ═══════════════ página ═══════════════ */

function usuarioDelToken() {
  try {
    const t = localStorage.getItem("token");
    return t ? jwtDecode(t) : null;
  } catch {
    return null;
  }
}

export default function DashboardConexionV2() {
  const navigate = useNavigate();

  // Igual que el dashboard actual: el asesor de ventas no ve dinero.
  useEffect(() => {
    if (esRolVentas()) navigate("/conexiones", { replace: true });
  }, [navigate]);

  const conexion = useMemo(
    () => ({
      id: Number(localStorage.getItem("id_configuracion")) || null,
      nombre: localStorage.getItem("nombre_configuracion") || "Conexión",
    }),
    [],
  );

  const [preset, setPreset] = useState(1);
  const [rango, setRango] = useState(() => ({ from: daysAgo(7), to: toYMD(new Date()) }));
  const [canal, setCanal] = useState("wa");

  const [modo, setModo] = useState(null); // 'dropshipping' | 'atencion'
  const [resumen, setResumen] = useState(null);
  const [resumenPrev, setResumenPrev] = useState(null);
  const [atencion, setAtencion] = useState(null);
  const [atencionPrev, setAtencionPrev] = useState(null);
  const [ads, setAds] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [actualizado, setActualizado] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll(".overflow-y-auto").forEach((el) => (el.scrollTop = 0));
  }, []);

  /* Modo (ventas / atención). Respeta la elección guardada por el dashboard
     actual en este navegador para que las dos vistas coincidan. */
  useEffect(() => {
    if (!conexion.id) return undefined;
    let vivo = true;
    let guardado = "auto";
    try {
      const v = localStorage.getItem(`dashboard_modo:${conexion.id}`);
      if (v === "dropshipping" || v === "atencion") guardado = v;
    } catch {
      /* sin almacenamiento */
    }
    if (guardado !== "auto") {
      setModo(guardado);
      return undefined;
    }
    chatApi
      .get("/dashboard/modo", { params: { id_configuracion: conexion.id }, silentError: true })
      .then(({ data }) => vivo && setModo(data?.data?.modo_efectivo || "dropshipping"))
      .catch(() => vivo && setModo("dropshipping"));
    return () => {
      vivo = false;
    };
  }, [conexion.id]);

  /* Carga principal: resumen actual + anterior, atención actual + anterior,
     anuncios si hay Meta. Todo en paralelo; lo que falle deja su sección
     vacía sin tumbar el resto. */
  const cargar = useCallback(async () => {
    if (!conexion.id) return;
    setCargando(true);
    setError("");
    const prev = rangoAnterior(rango.from, rango.to);
    const u = usuarioDelToken();
    const base = { id_configuracion: conexion.id };

    const pResumen = chatApi
      .post("dropi_integrations/dashboard/connection-summary", { ...base, from: rango.from, until: rango.to })
      .then((r) => r?.data?.data || null);
    const pResumenPrev = chatApi
      .post("dropi_integrations/dashboard/connection-summary", { ...base, from: prev.from, until: prev.to }, { silentError: true })
      .then((r) => r?.data?.data || null)
      .catch(() => null);
    const pAtencion = u?.id_usuario
      ? chatApi
          .post(
            "/dashboard/obtener_dashboard_completo",
            { ...base, id_usuario: u.id_usuario, from: rango.from, to: rango.to, sections: SECCIONES_ATENCION },
            { timeout: 50000, silentError: true },
          )
          .then((r) => r?.data?.data || null)
          .catch(() => null)
      : Promise.resolve(null);
    const pAtencionPrev = u?.id_usuario
      ? chatApi
          .post(
            "/dashboard/obtener_dashboard_completo",
            { ...base, id_usuario: u.id_usuario, from: prev.from, to: prev.to, sections: ["summary"] },
            { timeout: 50000, silentError: true },
          )
          .then((r) => r?.data?.data || null)
          .catch(() => null)
      : Promise.resolve(null);

    try {
      const [r, rp, a, ap] = await Promise.all([pResumen, pResumenPrev, pAtencion, pAtencionPrev]);
      setResumen(r);
      setResumenPrev(rp);
      setAtencion(a);
      setAtencionPrev(ap);
      setActualizado(new Date());
      if (r?.metaAds?.conectado) {
        chatApi
          .get("/marketing-control/dashboard", {
            params: { ...base, since: rango.from, until: rango.to, limit: 30 },
            silentError: true,
          })
          .then(({ data: mc }) => {
            const items = mc?.attribution?.items || [];
            setAds(
              items
                .filter((x) => Number(x.entregadas_estimadas || 0) > 0)
                .sort((x, y) => Number(y.roi_estimado || 0) - Number(x.roi_estimado || 0))
                .slice(0, 3),
            );
          })
          .catch(() => setAds([]));
      } else {
        setAds(null);
      }
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudieron consultar los datos de la conexión");
      setResumen(null);
    } finally {
      setCargando(false);
    }
  }, [conexion.id, rango.from, rango.to]);

  useEffect(() => {
    cargar();
  }, [cargar, tick]);

  const onPreset = (i) => {
    setPreset(i);
    const hoy = toYMD(new Date());
    setRango({ from: DATE_PRESETS[i].days === 0 ? hoy : daysAgo(DATE_PRESETS[i].days), to: hoy });
  };
  const onRangoManual = (r) => {
    if (!r.from || !r.to || r.from > r.to) return;
    setPreset(-1);
    setRango(r);
  };

  /* ── derivados ── */
  const esAtencion = modo === "atencion";
  const vendeShopify =
    resumen?.shopifyConectado === true || (resumen?.canales?.shopify?.pedidos || 0) > 0;
  const canalEf = vendeShopify ? canal : "wa";
  const v = resumen?.canales?.[canalEf] || null;
  const vp = resumenPrev?.canales?.[canalEf] || null;
  const convs = canalEf === "wa" ? resumen?.totalConversaciones || 0 : v?.conversaciones || 0;
  const convsPrev = canalEf === "wa" ? resumenPrev?.totalConversaciones || 0 : vp?.conversaciones || 0;

  const serieDiaria = useMemo(
    () =>
      (resumen?.dailyChart || []).map((d) => ({
        ...d,
        label: fmtDiaCorto(d.day),
        facturado: Number(d.facturado || 0),
      })),
    [resumen],
  );

  const estados = useMemo(() => {
    const lista = resumen?.statusBreakdown || [];
    return lista.map((s) => ({
      key: s.status,
      name: STATUS_LABELS[s.status] || s.status,
      value: Number(s.count || 0),
      pct: s.pct,
      color: STATUS_COLORS[s.status] || STATUS_COLORS.otro,
    }));
  }, [resumen]);

  /* Lo que va en camino (todos los productos): cuántos pedidos y cuánta
     ganancia entraría si se entregan. Viene por producto desde el back
     (gananciaEnCamino); si el back aún no manda el campo, solo se cuenta. */
  const enCamino = useMemo(() => {
    const lista = resumen?.productos || [];
    let n = 0;
    let ganancia = 0;
    let conDato = false;
    for (const p of lista) {
      n += Number(p.transito || 0);
      if (p.gananciaEnCamino != null) {
        conDato = true;
        ganancia += Number(p.gananciaEnCamino || 0);
      }
    }
    return { n, ganancia: conDato ? ganancia : null };
  }, [resumen]);

  const sumA = atencion?.summary || null;
  const sumAP = atencionPrev?.summary || null;
  const tot = atencion?.atencionAsesores?.totales || null;
  const serieHoras = useMemo(() => {
    const porHora = new Map((atencion?.charts?.chatsCreated || []).map((r) => [r.hour, Number(r.chats || 0)]));
    return Array.from({ length: 24 }, (_, h) => {
      const k = `${String(h).padStart(2, "0")}:00`;
      return { label: `${h}h`, chats: porHora.get(k) || 0 };
    });
  }, [atencion]);

  /* ── hero según modo ── */
  const hero = esAtencion
    ? {
        etiqueta: "Conversaciones atendidas",
        valorNum: sumA?.chatsCreated || 0,
        formato: (n) => fmtNum(Math.round(n)),
        delta: deltaPct(sumA?.chatsCreated, sumAP?.chatsCreated),
        sub: `${fmtNum(sumA?.withReplies || 0)} con respuesta · ${fmtNum(sumA?.noReply || 0)} sin respuesta en el periodo`,
        serie: serieHoras,
        serieKey: "chats",
        serieNombre: "Conversaciones nuevas",
        serieDinero: false,
        titulo: "Conversaciones nuevas por hora del día",
        kpis: [
          {
            icono: "bx-timer",
            color: ACENTO.cyan,
            label: "1ª respuesta",
            valor: fmtDur(tot?.mediana_seg ?? sumA?.avgFirstResponseSeconds),
            sub: tot?.p90_seg != null ? `9 de cada 10 en menos de ${fmtDur(tot.p90_seg)}` : "promedio del periodo",
            delta: deltaPct(sumA?.avgFirstResponseSeconds, sumAP?.avgFirstResponseSeconds),
            invertir: true,
          },
          {
            icono: "bx-check-circle",
            color: ACENTO.emerald,
            label: "Resueltas",
            valor: fmtNum(sumA?.chatsResolved || 0),
            sub: sumA?.avgResolutionSeconds != null ? `cierran en ${fmtDur(sumA.avgResolutionSeconds)}` : "chats cerrados",
            delta: deltaPct(sumA?.chatsResolved, sumAP?.chatsResolved),
          },
          {
            icono: "bx-hourglass",
            color: ACENTO.amber,
            label: "Esperando ahora",
            valor: fmtNum(tot?.sin_responder?.total ?? atencion?.pendingQueue?.length ?? 0),
            sub: tot?.sin_responder?.peor?.seg != null ? `el más antiguo lleva ${fmtDur(tot.sin_responder.peor.seg)}` : "clientes sin respuesta",
            delta: undefined,
          },
          {
            icono: "bx-message-check",
            color: ACENTO.blue,
            label: "Con respuesta",
            valor: fmtPct(sumA?.chatsCreated ? ((sumA.withReplies || 0) / sumA.chatsCreated) * 100 : null, 0),
            sub: `${fmtNum(sumA?.withReplies || 0)} de ${fmtNum(sumA?.chatsCreated || 0)} conversaciones`,
            delta: deltaPct(
              sumA?.chatsCreated ? (sumA.withReplies || 0) / sumA.chatsCreated : 0,
              sumAP?.chatsCreated ? (sumAP.withReplies || 0) / sumAP.chatsCreated : 0,
            ),
          },
          {
            icono: "bx-chat",
            color: ACENTO.violet,
            label: "Mensajes",
            valor: fmtNum(resumen?.totalMensajes || 0),
            sub: tot?.respuestas != null ? `${fmtNum(tot.respuestas)} respuestas humanas` : "entrantes y salientes",
            delta: deltaPct(resumen?.totalMensajes, resumenPrev?.totalMensajes),
          },
          {
            icono: "bx-stopwatch",
            color: ACENTO.rose,
            label: "Tiempo de manejo",
            valor: tot?.manejo_mediana_seg > 0 ? fmtDur(tot.manejo_mediana_seg) : "—",
            sub: tot?.manejo_mediana_seg > 0 ? "desde que abre el chat hasta que contesta" : "sin medición en el periodo",
          },
        ],
      }
    : {
        etiqueta: canalEf === "shopify" ? "Facturado en la tienda" : "Facturado por WhatsApp",
        valorNum: v?.facturado || 0,
        formato: (n) => fmt$(n),
        delta: deltaPct(v?.facturado, vp?.facturado),
        sub: `${fmtNum(v?.pedidosNeto || 0)} pedidos vivos · ${fmtNum(v?.entregadas || 0)} ya entregados · ${fmtNum(enCamino.n)} en camino`,
        serie: serieDiaria,
        serieKey: "facturado",
        serieNombre: "Facturado",
        serieDinero: true,
        titulo: "Facturado por día",
        nota: resumen?.pctConfirmacionTope
          ? "Hay más pedidos que conversaciones: parte de las órdenes no pasó por el chat."
          : null,
        /* Arriba lo que trae el chat; abajo en qué se va el facturado:
           facturado = costo del producto + fletes + utilidad (reunión 10-nov). */
        kpis: [
          {
            icono: "bx-conversation",
            color: ACENTO.cyan,
            label: "Conversaciones",
            valor: fmtNum(convs),
            sub: `${fmtNum(resumen?.totalMensajes || 0)} mensajes cruzados`,
            delta: deltaPct(convs, convsPrev),
          },
          {
            icono: "bx-package",
            color: ACENTO.blue,
            label: "Pedidos vivos",
            valor: fmtNum(v?.pedidosNeto || 0),
            sub: `${fmtNum(v?.canceladas || 0)} cancelados fuera`,
            delta: deltaPct(v?.pedidosNeto, vp?.pedidosNeto),
          },
          {
            icono: "bx-check-double",
            color: ACENTO.emerald,
            label: "Confirmación",
            valor: fmtPct(v?.pctConfirmacion),
            sub: "de los que escriben, compran",
            delta:
              vp?.pctConfirmacion != null && v?.pctConfirmacion != null
                ? Number(v.pctConfirmacion) - Number(vp.pctConfirmacion)
                : null,
            puntos: true,
          },
          {
            icono: "bx-cube",
            color: ACENTO.amber,
            label: "Costo producto",
            valor: v?.costoProducto != null ? fmt$(v.costoProducto) : "—",
            sub: v?.facturado > 0 && v?.costoProducto != null ? `${fmtPct((v.costoProducto / v.facturado) * 100)} del facturado` : "lo que cobra el proveedor",
          },
          {
            icono: "bx-trip",
            color: ACENTO.rose,
            label: "Fletes",
            valor: v?.flete != null ? fmt$(v.flete) : "—",
            sub: v?.facturado > 0 && v?.flete != null ? `${fmtPct((v.flete / v.facturado) * 100)} del facturado` : "envío de cada pedido",
          },
          {
            icono: "bx-wallet",
            color: ACENTO.violet,
            label: "Utilidad",
            valor: fmt$(v?.ganancia || 0),
            sub: v?.facturado > 0 ? `${fmtPct((v.ganancia / v.facturado) * 100)} del facturado` : "venta − proveedor − envío",
            delta: deltaPct(v?.ganancia, vp?.ganancia),
          },
        ],
      };

  const pasosEmbudo = v
    ? [
        { label: "Conversaciones", valor: convs, color: "#0f172a", icono: "bx-conversation" },
        { label: "Pedidos vivos", valor: v.pedidosNeto, color: "#6366f1", pct: v.pctConfirmacion, icono: "bx-package" },
        { label: "Entregados", valor: v.entregadas, color: "#10b981", pct: v.tasaEntregaReal, icono: "bx-check-shield" },
      ]
    : [];

  if (!conexion.id) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-6">
        <div className="dv2-card max-w-md p-8 text-center">
          <i className="bx bx-plug text-4xl text-slate-300" />
          <h1 className="mt-2 text-lg font-extrabold text-slate-900">Primero entra a una conexión</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Esta vista trabaja sobre la conexión activa. Elige una en Conexiones y vuelve a esta ruta.
          </p>
          <button
            onClick={() => navigate("/conexiones")}
            className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-[12.5px] font-bold text-white"
          >
            Ir a Conexiones
          </button>
        </div>
      </div>
    );
  }

  const cargandoHero = cargando || modo === null;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f4f6fb] pb-10">
      <style>{CSS}</style>
      <BarraSuperior
        conexion={conexion}
        modo={modo}
        rango={rango}
        preset={preset}
        onPreset={onPreset}
        onRangoManual={onRangoManual}
        actualizado={actualizado}
        cargando={cargando}
        onRefrescar={() => setTick((t) => t + 1)}
        canal={canalEf}
        onCanal={setCanal}
        vendeShopify={vendeShopify && !esAtencion}
      />

      <main className="w-full space-y-5 px-4 pt-5 sm:px-6 2xl:px-10">
        {error && (
          <div className="dv2-rise flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">
            <i className="bx bx-error-circle text-lg" />
            {error}
            <button onClick={() => setTick((t) => t + 1)} className="ml-auto font-bold underline">
              Reintentar
            </button>
          </div>
        )}

        <Hero {...hero} cargando={cargandoHero} />

        {/* ────── bloque de ventas (solo modo dropshipping) ────── */}
        {!esAtencion && (
          <>
            {/* Sin la nota «De cada 100 personas…» bajo el embudo (10-nov, Daniel). */}
            <div className="grid gap-5 lg:grid-cols-5">
              <Seccion
                titulo="Del chat a la entrega"
                sub="De todo lo que entró por el canal, cuánto terminó en pedido y cuánto llegó a destino."
                className="lg:col-span-3"
                delay={60}
              >
                {cargando ? (
                  <Skel className="h-[180px]" />
                ) : pasosEmbudo.length ? (
                  <Embudo pasos={pasosEmbudo} />
                ) : (
                  <Vacio icono="bx-filter-alt" texto="Sin datos del canal" />
                )}
              </Seccion>
              <Seccion
                titulo="Estado de los pedidos"
                sub="Dónde está cada pedido Dropi del periodo, de todos los canales."
                className="lg:col-span-2"
                delay={120}
              >
                {cargando ? <Skel className="h-[180px]" /> : <DonaEstados estados={estados} total={resumen?.totalPedidos || 0} />}
              </Seccion>
            </div>

            <Seccion
              titulo="¿Cuánto ganaste de verdad?"
              sub="Lo que te queda después del producto, los fletes, las devoluciones y la publicidad; no lo que facturaste."
              delay={130}
            >
              <RentabilidadReal idConfiguracion={conexion.id} from={rango.from} to={rango.to} tick={tick} />
            </Seccion>

            <Seccion
              titulo="Efectividad por ciudad"
              sub="Cuánto se entrega y cuánto te deja cada ciudad y transportadora, comparado con el mercado en esa misma ciudad."
              delay={140}
            >
              <EfectividadCiudades idConfiguracion={conexion.id} from={rango.from} to={rango.to} tick={tick} />
            </Seccion>

            <Seccion
              titulo="Ritmo diario"
              sub="Cuánto se facturó cada día, cuánta gente escribió y cuántos pedidos salieron, en una sola mirada."
              delay={160}
            >
              {cargando ? <Skel className="h-[260px]" /> : <RitmoDiario serie={serieDiaria} canal={canalEf} />}
            </Seccion>

            <Seccion
              titulo="Productos estrella"
              sub="Los cinco más pedidos del periodo, con la utilidad neta de lo que ya se entregó."
              delay={200}
              derecha={
                resumen?.productos?.length > 5 ? (
                  <button
                    onClick={() => navigate("/conexion-dashboard?view=resumen")}
                    className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Ver los {resumen.productos.length}
                  </button>
                ) : null
              }
            >
              {cargando ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Skel key={i} className="h-[260px]" />
                  ))}
                </div>
              ) : (
                <ProductosEstrella productos={resumen?.productos} />
              )}
            </Seccion>

            {(resumen?.carritos?.abandonados > 0 || resumen?.metaAds?.conectado) && (
              <div className="grid gap-5 lg:grid-cols-2">
                {resumen?.carritos?.abandonados > 0 && (
                  <Seccion titulo="Carritos abandonados" sub="Compras que quedaron a medias en la tienda y cuántas se rescataron." delay={240}>
                    <Carritos c={resumen.carritos} />
                  </Seccion>
                )}
                {resumen?.metaAds?.conectado && (
                  <Seccion
                    titulo="Anuncios que más venden"
                    sub="Ordenados por retorno estimado sobre lo invertido."
                    delay={280}
                    /* Sin carritos (vende solo por WhatsApp) la tarjeta ocupa
                       toda la fila como podio; con carritos comparten la fila. */
                    className={resumen?.carritos?.abandonados > 0 ? "" : "lg:col-span-2"}
                    derecha={
                      <button
                        onClick={() => navigate("/conexion-dashboard?view=ads")}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Ver anuncios
                      </button>
                    }
                  >
                    {ads === null ? (
                      <Skel className="h-[160px]" />
                    ) : (
                      <Anuncios ads={ads} accountName={resumen.metaAds.accountName} podio={!(resumen?.carritos?.abandonados > 0)} />
                    )}
                  </Seccion>
                )}
              </div>
            )}
          </>
        )}

        {/* ────── atención al cliente (ambos modos) ────── */}
        <Seccion
          titulo={esAtencion ? "Cómo se está atendiendo" : "Atención al cliente"}
          sub="Velocidad de respuesta, cola de espera y carga del equipo en el periodo."
          delay={esAtencion ? 60 : 320}
          derecha={
            <button
              onClick={() => navigate("/conexion-dashboard?view=mensajes")}
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
            >
              Ver detalle
            </button>
          }
        >
          {cargando ? (
            <Skel className="h-[320px]" />
          ) : !atencion ? (
            <Vacio icono="bx-conversation" texto="No se pudo cargar la atención de esta conexión" />
          ) : (
            <div className="space-y-5">
              {esAtencion ? (
                <StripAtencion atencion={atencion} tot={tot} umbrales={atencion?.atencionAsesores?.umbrales_min} />
              ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiPlano
                  icono="bx-message-add"
                  color="#0ea5e9"
                  label="Conversaciones nuevas"
                  valor={fmtNum(sumA?.chatsCreated || 0)}
                  sub={`${fmtNum(sumA?.noReply || 0)} quedaron sin respuesta`}
                  delta={deltaPct(sumA?.chatsCreated, sumAP?.chatsCreated)}
                />
                <KpiPlano
                  icono="bx-timer"
                  color="#8b5cf6"
                  label="1ª respuesta (mediana)"
                  valor={fmtDur(tot?.mediana_seg ?? sumA?.avgFirstResponseSeconds)}
                  sub={tot?.p90_seg != null ? `el 90% en menos de ${fmtDur(tot.p90_seg)}` : "tiempo hasta la primera respuesta"}
                  delta={deltaPct(sumA?.avgFirstResponseSeconds, sumAP?.avgFirstResponseSeconds)}
                  invertir
                />
                <KpiPlano
                  icono="bx-check-circle"
                  color="#10b981"
                  label="Resueltas"
                  valor={fmtNum(sumA?.chatsResolved || 0)}
                  sub={sumA?.avgResolutionSeconds != null ? `cierran en ${fmtDur(sumA.avgResolutionSeconds)}` : "chats cerrados en el periodo"}
                  delta={deltaPct(sumA?.chatsResolved, sumAP?.chatsResolved)}
                />
                <KpiPlano
                  icono="bx-target-lock"
                  color="#f59e0b"
                  label="Nivel de servicio"
                  valor={fmtPct(atencion?.slaToday?.generalPct, 0)}
                  sub={`${fmtNum(atencion?.slaToday?.resolvedToday || 0)} resueltas · ${fmtNum(atencion?.slaToday?.abandoned || 0)} abandonadas`}
                />
              </div>
              )}

              {/* 12 columnas: horas pico y equipo apilados a la izquierda (7),
                  la cola de espera alta a la derecha (5). Así ningún bloque
                  queda con media tarjeta vacía. */}
              <div className="grid gap-5 xl:grid-cols-12">
                <div className="rounded-2xl border border-slate-100 p-4 xl:col-span-7">
                  <h3 className="mb-2 text-[12.5px] font-extrabold text-slate-800">Horas pico</h3>
                  <HorasPico serie={atencion?.charts?.chatsCreated} />
                </div>
                <div className="rounded-2xl border border-slate-100 p-4 xl:col-span-5 xl:row-span-2">
                  <h3 className="mb-2 text-[12.5px] font-extrabold text-slate-800">Esperando respuesta</h3>
                  <ColaEspera cola={atencion?.pendingQueue} />
                  <SlaCanales sla={atencion?.slaToday} />
                </div>
                <div className="rounded-2xl border border-slate-100 p-4 xl:col-span-7">
                  <h3 className="mb-2 text-[12.5px] font-extrabold text-slate-800">El equipo</h3>
                  <Equipo
                    asesores={atencion?.atencionAsesores?.asesores}
                    agentLoad={atencion?.agentLoad}
                    umbrales={atencion?.atencionAsesores?.umbrales_min}
                  />
                </div>
              </div>
            </div>
          )}
        </Seccion>

        <p className="pt-2 text-center text-[10.5px] text-slate-400">
          Propuesta de dashboard por conexión · mismos datos que el dashboard actual · comparativas contra el periodo anterior de igual duración
        </p>
      </main>
    </div>
  );
}
