import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";
import chatApi from "../../api/chatcenter";
import botImage from "../../assets/bot.png";
import "./conexiones.css";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

/* ════════════════════════════════════════════════════════════════
   Vista superadmin /administrador-conexiones — "Salud del bot".
   Tab 1: rendimiento del bot en todas las cuentas (KPIs, tendencia,
          embudo con cuellos de botella y tabla por cuenta), leído
          del snapshot precalculado admin_bot_salud/*.
   Tab 2: la tabla de conexiones de siempre (listar_admin_conexiones).
   ════════════════════════════════════════════════════════════════ */

/* Colores de serie (validados para daltonismo sobre fondo claro) */
const C_CONVERS = "#6366f1"; // conversaciones IA
const C_CIERRE = "#0d9488"; // cierres / % de cierre
const META_CIERRE = 20; // % de cierre objetivo (benchmark del mercado)

const num = (v) => Number(v || 0).toLocaleString("es-EC");
const pct = (parte, total) =>
  Number(total) > 0 ? (Number(parte) / Number(total)) * 100 : null;
const pctTxt = (v) => (v === null || Number.isNaN(v) ? "—" : `${v.toFixed(1)}%`);

/* Color de estado para % de cierre: rojo <5, ámbar 5-10, verde >10 */
const toneCierre = (v) => {
  if (v === null) return "text-slate-400";
  if (v < 5) return "text-rose-600";
  if (v < 10) return "text-amber-600";
  return "text-emerald-600";
};

const fechaCorta = (f) => {
  const s = String(f).slice(0, 10);
  const [, m, d] = s.split("-");
  return `${d}/${m}`;
};

/* ── Piezas de UI ─────────────────────────────────────────────── */

const Kpi = ({ label, value, sub, delta }) => {
  let deltaEl = null;
  if (delta !== null && delta !== undefined && Number.isFinite(delta)) {
    const up = delta >= 0;
    deltaEl = (
      <span
        className={`text-[11px] font-semibold ${up ? "text-emerald-600" : "text-rose-600"}`}
        title="vs período anterior"
      >
        {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
      </span>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {deltaEl}
      </div>
      {sub ? <div className="mt-0.5 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
};

const Card = ({ title, subtitle, right, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5">
    <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle ? (
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const TooltipBox = ({ active, payload, label, lineas }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-lg shadow-lg ring-1 ring-slate-200 p-3 text-xs">
      <div className="font-bold text-slate-900 mb-1">{fechaCorta(label)}</div>
      <div className="space-y-0.5 text-slate-600">
        {lineas.map((l) => (
          <div key={l.key} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: l.color }}
            />
            {l.label}:{" "}
            <b className="text-slate-900">{l.fmt ? l.fmt(d[l.key]) : num(d[l.key])}</b>
          </div>
        ))}
      </div>
    </div>
  );
};

/* Embudo horizontal: barras proporcionales al primer paso, con el % de
   conversión respecto al paso anterior. */
const Embudo = ({ pasos }) => {
  const base = pasos[0]?.valor || 0;
  return (
    <div className="space-y-2">
      {pasos.map((p, i) => {
        const w = base > 0 ? Math.max((p.valor / base) * 100, 1.5) : 0;
        const prev = i > 0 ? pasos[i - 1].valor : null;
        const conv = prev ? pct(p.valor, prev) : null;
        return (
          <div key={p.paso}>
            <div className="flex items-baseline justify-between text-xs mb-0.5">
              <span className="text-slate-600">{p.paso}</span>
              <span className="text-slate-900 font-semibold">
                {num(p.valor)}
                {conv !== null ? (
                  <span className="ml-1.5 font-normal text-slate-400">
                    ({pctTxt(conv)} del paso previo)
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-4 bg-slate-100 rounded overflow-hidden">
              <div
                className="h-full rounded"
                style={{
                  width: `${w}%`,
                  background: i >= 2 ? C_CIERRE : C_CONVERS,
                  opacity: 1 - i * 0.12,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ETIQUETA_FALLO = {
  "(sin paso)": "Sin paso registrado",
};

const FallosAutoOrden = ({ fallos }) => {
  const max = fallos[0]?.n || 0;
  if (!fallos.length)
    return (
      <p className="text-xs text-slate-500">
        Sin fallos de auto-orden en el período. 🎉
      </p>
    );
  return (
    <div className="space-y-1.5">
      {fallos.map((f) => (
        <div key={f.paso} className="flex items-center gap-2 text-xs">
          <span className="w-44 truncate text-slate-600" title={f.paso}>
            {ETIQUETA_FALLO[f.paso] || f.paso}
          </span>
          <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
            <div
              className="h-full rounded bg-rose-400"
              style={{ width: `${max ? (f.n / max) * 100 : 0}%` }}
            />
          </div>
          <span className="w-10 text-right font-semibold text-slate-900">
            {num(f.n)}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── Tab: Salud del bot ───────────────────────────────────────── */

const COLS_CUENTAS = [
  { key: "nombre", label: "Cuenta", sortable: false },
  { key: "modelos", label: "Modelo IA", sortable: false },
  { key: "convers_ia", label: "Convers. IA", sortable: true },
  { key: "pct_respuesta", label: "% respuesta", sortable: true },
  { key: "auto_creadas", label: "Auto-órdenes", sortable: true },
  { key: "cierres_bot", label: "Cierres", sortable: true },
  { key: "pct_cierre", label: "% cierre", sortable: true },
  { key: "pct_entrega", label: "% entrega", sortable: true },
];

function TabSalud() {
  const [rango, setRango] = useState(30);
  const [loading, setLoading] = useState(true);
  const [recalculando, setRecalculando] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [embudo, setEmbudo] = useState(null);
  const [cuentaSel, setCuentaSel] = useState(null); // {id, nombre} | null
  const [busca, setBusca] = useState("");
  const [orden, setOrden] = useState({ key: "convers_ia", dir: "desc" });

  const fetchTodo = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        chatApi.get(`admin_bot_salud/resumen?dias=${rango}`),
        chatApi.get(`admin_bot_salud/cuentas?dias=${rango}`),
        chatApi.get(`admin_bot_salud/embudo?dias=${rango}`),
      ]);
      setResumen(r1.data.data);
      setCuentas(r2.data.data || []);
      setEmbudo(r3.data.data);
      setCuentaSel(null);
    } catch {
      toast.error("Error cargando la salud del bot");
    } finally {
      setLoading(false);
    }
  }, [rango]);

  useEffect(() => {
    fetchTodo();
  }, [fetchTodo]);

  const verEmbudoCuenta = useCallback(
    async (cta) => {
      try {
        const { data } = await chatApi.get(
          `admin_bot_salud/embudo?dias=${rango}&id_configuracion=${cta.id_configuracion}`,
        );
        setEmbudo(data.data);
        setCuentaSel({ id: cta.id_configuracion, nombre: cta.nombre });
      } catch {
        toast.error("No se pudo cargar el embudo de la cuenta");
      }
    },
    [rango],
  );

  const verEmbudoGlobal = useCallback(async () => {
    try {
      const { data } = await chatApi.get(`admin_bot_salud/embudo?dias=${rango}`);
      setEmbudo(data.data);
      setCuentaSel(null);
    } catch {
      /* el toast global del interceptor ya avisa */
    }
  }, [rango]);

  const recalcular = useCallback(async () => {
    setRecalculando(true);
    try {
      await chatApi.post(
        "admin_bot_salud/recalcular",
        { dias: 35 },
        { timeout: 300000 },
      );
      toast.success("Snapshot recalculado");
      await fetchTodo();
    } catch {
      toast.error("Falló el recálculo (revisa el log del server)");
    } finally {
      setRecalculando(false);
    }
  }, [fetchTodo]);

  /* KPIs con delta vs período anterior */
  const kpis = useMemo(() => {
    if (!resumen) return null;
    const a = resumen.actual || {};
    const p = resumen.previo || {};
    const cierreA = pct(a.cierres_bot, a.convers_ia);
    const cierreP = pct(p.cierres_bot, p.convers_ia);
    const respA = pct(a.convers_respondieron, a.convers_ia);
    const entA = pct(a.entregadas_bot, a.convers_ia);
    const deltaPts = (x, y) => (x !== null && y !== null ? x - y : null);
    const deltaPct = (x, y) =>
      Number(y) > 0 ? ((Number(x || 0) - Number(y)) / Number(y)) * 100 : null;
    return {
      cierre: cierreA,
      cierreDelta: deltaPts(cierreA, cierreP),
      convers: Number(a.convers_ia || 0),
      conversDelta: deltaPct(a.convers_ia, p.convers_ia),
      cierres: Number(a.cierres_bot || 0),
      cierresDelta: deltaPct(a.cierres_bot, p.cierres_bot),
      respuesta: respA,
      entrega: entA,
      autoCreadas: Number(a.auto_creadas || 0),
      autoIntentos: Number(a.auto_intentos || 0),
    };
  }, [resumen]);

  const serieChart = useMemo(() => {
    if (!resumen?.serie) return [];
    return resumen.serie.map((d) => ({
      fecha: String(d.fecha).slice(0, 10),
      convers_ia: Number(d.convers_ia || 0),
      cierres_bot: Number(d.cierres_bot || 0),
      pct_cierre: pct(d.cierres_bot, d.convers_ia),
    }));
  }, [resumen]);

  const cuentasVisibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let data = q
      ? cuentas.filter(
          (c) =>
            c.nombre?.toLowerCase().includes(q) ||
            String(c.telefono || "").includes(q),
        )
      : [...cuentas];
    const { key, dir } = orden;
    data.sort((x, y) => {
      const a = x[key] === null ? -1 : Number(x[key]);
      const b = y[key] === null ? -1 : Number(y[key]);
      return dir === "desc" ? b - a : a - b;
    });
    return data;
  }, [cuentas, busca, orden]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
        <i className="bx bx-loader-alt bx-spin text-2xl mr-2" />
        Cargando salud del bot...
      </div>
    );
  }

  const snapshotVacio = !resumen || !resumen.serie?.length;

  return (
    <div className="space-y-5">
      {/* Controles */}
      <div className="flex items-center gap-2 flex-wrap">
        {[7, 30, 60].map((d) => (
          <button
            key={d}
            onClick={() => setRango(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              rango === d
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {d} días
          </button>
        ))}
        <div className="flex-1" />
        {resumen?.snapshot_actualizado ? (
          <span className="text-[11px] text-slate-400">
            Snapshot: {String(resumen.snapshot_actualizado).slice(0, 16).replace("T", " ")}
          </span>
        ) : null}
        <button
          onClick={recalcular}
          disabled={recalculando}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {recalculando ? (
            <span>
              <i className="bx bx-loader-alt bx-spin mr-1" />
              Recalculando (~1 min)...
            </span>
          ) : (
            <span>
              <i className="bx bx-refresh mr-1" />
              Recalcular ahora
            </span>
          )}
        </button>
      </div>

      {snapshotVacio ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4">
          Aún no hay snapshot calculado. Pulsa <b>Recalcular ahora</b> (tarda
          ~1 minuto) o espera al cron de las 03:20.
        </div>
      ) : null}

      {/* KPIs */}
      {kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <Kpi
            label="% de cierre"
            value={
              <span className={toneCierre(kpis.cierre)}>
                {pctTxt(kpis.cierre)}
              </span>
            }
            sub={`meta ${META_CIERRE}%`}
            delta={kpis.cierreDelta}
          />
          <Kpi
            label="Conversaciones IA"
            value={num(kpis.convers)}
            sub={`${num(Math.round(kpis.convers / rango))} por día`}
            delta={kpis.conversDelta}
          />
          <Kpi
            label="Cierres (órdenes)"
            value={num(kpis.cierres)}
            sub="atribuidos al bot"
            delta={kpis.cierresDelta}
          />
          <Kpi
            label="% clientes que responden"
            value={pctTxt(kpis.respuesta)}
            sub="tras el 1er mensaje IA"
          />
          <Kpi
            label="% entrega"
            value={pctTxt(kpis.entrega)}
            sub="sobre conversaciones"
          />
          <Kpi
            label="Cuentas con IA"
            value={num(resumen.cuentas_con_ia)}
            sub={`auto-orden: ${num(kpis.autoCreadas)}/${num(kpis.autoIntentos)} ok`}
          />
        </div>
      ) : null}

      {/* Tendencia: dos paneles con el mismo eje X (nunca doble eje Y) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title="Conversaciones IA por día"
          subtitle="Contactos distintos atendidos por el bot"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serieChart} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={fechaCorta}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={
                    <TooltipBox
                      lineas={[
                        { key: "convers_ia", label: "Conversaciones", color: C_CONVERS },
                        { key: "cierres_bot", label: "Cierres", color: C_CIERRE },
                      ]}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="convers_ia"
                  stroke={C_CONVERS}
                  strokeWidth={2}
                  fill={C_CONVERS}
                  fillOpacity={0.12}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="% de cierre por día"
          subtitle={`Cierres ÷ conversaciones · línea punteada = meta ${META_CIERRE}%`}
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serieChart} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={fechaCorta}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                  domain={[0, (max) => Math.max(Math.ceil(max), META_CIERRE + 2)]}
                />
                <Tooltip
                  content={
                    <TooltipBox
                      lineas={[
                        {
                          key: "pct_cierre",
                          label: "% cierre",
                          color: C_CIERRE,
                          fmt: (v) => pctTxt(v),
                        },
                      ]}
                    />
                  }
                />
                <ReferenceLine
                  y={META_CIERRE}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="pct_cierre"
                  stroke={C_CIERRE}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Embudo + cuellos de botella */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title={
            cuentaSel
              ? `Embudo de conversión — ${cuentaSel.nombre}`
              : "Embudo de conversión (global)"
          }
          subtitle="Dónde se pierden los clientes, del primer mensaje a la entrega"
          right={
            cuentaSel ? (
              <button
                onClick={verEmbudoGlobal}
                className="text-xs text-indigo-600 hover:underline"
              >
                ← volver al global
              </button>
            ) : null
          }
        >
          {embudo ? <Embudo pasos={embudo.embudo} /> : null}
        </Card>

        <Card
          title="Cuello de botella del auto-orden"
          subtitle="En qué paso fallan las órdenes automáticas del bot"
        >
          {embudo?.auto ? (
            <p className="text-xs text-slate-600 mb-3">
              {num(embudo.auto.creadas)} de {num(embudo.auto.intentos)} intentos
              crearon orden (
              {pctTxt(pct(embudo.auto.creadas, embudo.auto.intentos))}
              ) · {num(embudo.auto.fallidas)} fallaron
            </p>
          ) : null}
          {embudo ? <FallosAutoOrden fallos={embudo.fallos_auto_orden} /> : null}
        </Card>
      </div>

      {/* Tabla por cuenta */}
      <Card
        title="Rendimiento por cuenta"
        subtitle="Clic en una fila para ver su embudo · % cierre: 🔴 <5% · 🟡 5-10% · 🟢 >10%"
        right={
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cuenta..."
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {COLS_CUENTAS.map((c) => (
                  <th
                    key={c.key}
                    onClick={
                      c.sortable
                        ? () =>
                            setOrden((o) => ({
                              key: c.key,
                              dir: o.key === c.key && o.dir === "desc" ? "asc" : "desc",
                            }))
                        : undefined
                    }
                    className={`py-2.5 px-3 text-left text-xs font-semibold whitespace-nowrap ${
                      c.sortable ? "cursor-pointer select-none hover:text-slate-900" : ""
                    }`}
                  >
                    {c.label}
                    {orden.key === c.key ? (orden.dir === "desc" ? " ↓" : " ↑") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cuentasVisibles.map((c) => (
                <tr
                  key={c.id_configuracion}
                  onClick={() => verEmbudoCuenta(c)}
                  className={`hover:bg-slate-50 transition cursor-pointer ${
                    cuentaSel?.id === c.id_configuracion ? "bg-indigo-50" : ""
                  }`}
                >
                  <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[220px] truncate">
                    {c.nombre}
                    <span className="block text-[10px] text-slate-400 font-normal">
                      #{c.id_configuracion} · {c.telefono || "sin teléfono"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-500 max-w-[140px] truncate">
                    {c.modelos || "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    {num(c.convers_ia)}
                    <span className="text-[10px] text-slate-400 ml-1">
                      ({c.convers_dia}/día)
                    </span>
                  </td>
                  <td className="py-2.5 px-3">{pctTxt(c.pct_respuesta)}</td>
                  <td className="py-2.5 px-3">
                    {num(c.auto_creadas)}
                    {c.auto_fallidas > 0 ? (
                      <span className="text-[10px] text-rose-500 ml-1">
                        ({num(c.auto_fallidas)} fallidas)
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5 px-3">{num(c.cierres_bot)}</td>
                  <td className={`py-2.5 px-3 font-bold ${toneCierre(c.pct_cierre)}`}>
                    {pctTxt(c.pct_cierre)}
                  </td>
                  <td className="py-2.5 px-3">{pctTxt(c.pct_entrega)}</td>
                </tr>
              ))}
              {!cuentasVisibles.length ? (
                <tr>
                  <td colSpan={COLS_CUENTAS.length} className="py-8 text-center text-slate-400 text-sm">
                    Sin cuentas con actividad del bot en el período.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Metodología */}
      <details className="text-xs text-slate-500 bg-white rounded-xl border border-slate-200 p-4">
        <summary className="cursor-pointer font-semibold text-slate-700">
          ¿Cómo se calculan estas métricas?
        </summary>
        <ul className="mt-2 space-y-1 list-disc pl-5">
          <li>
            <b>Conversación IA:</b> contacto con al menos un mensaje enviado por
            el bot ese día (responsable IA_*).
          </li>
          <li>
            <b>Cierre:</b> orden Dropi (creada por el bot o a mano) cuyo
            teléfono tuvo conversación IA en la misma cuenta hasta 30 días antes
            de la orden.
          </li>
          <li>
            <b>% respuesta:</b> contactos que escribieron después del primer
            mensaje del bot del día.
          </li>
          <li>
            <b>% entrega:</b> cierres cuya orden ya figura entregada. Sube con
            los días porque la logística tarda.
          </li>
          <li>
            Los datos se precalculan cada madrugada (03:20) sobre una ventana
            móvil de 35 días; el botón "Recalcular ahora" fuerza la corrida.
          </li>
        </ul>
      </details>
    </div>
  );
}

/* ── Tab: Conexiones (la tabla clásica) ───────────────────────── */

const isConectado = (c) => {
  if (typeof c?.status_whatsapp === "string")
    return c.status_whatsapp.toUpperCase() === "CONNECTED";
  return Boolean(
    String(c?.id_telefono || "").trim() && String(c?.id_whatsapp || "").trim(),
  );
};

function TabConexiones() {
  const [lista, setLista] = useState(null); // null = sin cargar
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroPago, setFiltroPago] = useState("");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(12);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setLoading(true);
      try {
        const r = await chatApi.post("configuraciones/listar_admin_conexiones");
        if (vivo) setLista(r.data.data || []);
      } catch {
        if (vivo) setLista([]);
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const filtrada = useMemo(() => {
    if (!lista) return [];
    const q = search.trim().toLowerCase();
    let data = [...lista];
    if (q)
      data = data.filter(
        (c) =>
          c?.nombre_configuracion?.toLowerCase().includes(q) ||
          c?.telefono?.toLowerCase().includes(q),
      );
    if (filtroEstado)
      data = data.filter((c) => isConectado(c) === (filtroEstado === "conectado"));
    if (filtroPago)
      data = data.filter(
        (c) => Number(c.metodo_pago) === (filtroPago === "activo" ? 1 : 0),
      );
    return data;
  }, [lista, search, filtroEstado, filtroPago]);

  useEffect(() => setPagina(1), [search, filtroEstado, filtroPago]);

  const totalPaginas = Math.max(1, Math.ceil(filtrada.length / porPagina));
  const visibles = filtrada.slice((pagina - 1) * porPagina, pagina * porPagina);

  const stats = useMemo(() => {
    const total = lista?.length || 0;
    const conectados = (lista || []).filter(isConectado).length;
    const pagos = (lista || []).filter((c) => Number(c.metodo_pago) === 1).length;
    return { total, conectados, pendientes: total - conectados, pagos };
  }, [lista]);

  if (loading || lista === null) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
        <i className="bx bx-loader-alt bx-spin text-2xl mr-2" />
        Cargando conexiones...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Total conexiones" value={num(stats.total)} />
        <Kpi label="Conectados" value={num(stats.conectados)} />
        <Kpi label="Pendientes" value={num(stats.pendientes)} />
        <Kpi label="Pagos activos" value={num(stats.pagos)} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Estado: todos</option>
          <option value="conectado">Conectados</option>
          <option value="pendiente">Pendientes</option>
        </select>
        <select
          value={filtroPago}
          onChange={(e) => setFiltroPago(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Pago: todos</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <div className="flex-1" />
        <select
          value={porPagina}
          onChange={(e) => setPorPagina(Number(e.target.value))}
          className="border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white"
        >
          {[12, 20, 32, 50].map((n) => (
            <option key={n} value={n}>
              {n} por página
            </option>
          ))}
        </select>
      </div>

      {!filtrada.length ? (
        <div className="flex flex-col items-center justify-center text-center py-16">
          <img src={botImage} alt="Robot" className="w-32 h-32" />
          <h3 className="mt-4 text-sm font-semibold text-slate-700">
            Sin conexiones que coincidan
          </h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
          <table className="w-full text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-left font-semibold">Nombre</th>
                <th className="py-3 px-4 text-left font-semibold">Teléfono</th>
                <th className="py-3 px-4 text-left font-semibold">Estado</th>
                <th className="py-3 px-4 text-left font-semibold">Pago</th>
                <th className="py-3 px-4 text-left font-semibold">
                  Conversaciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visibles.map((config) => {
                const conectado = isConectado(config);
                const pagoActivo = Number(config.metodo_pago) === 1;
                return (
                  <tr key={config.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {config.nombre_configuracion}
                    </td>
                    <td className="py-3 px-4">{config.telefono}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          conectado
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {conectado ? "Conectado" : "Pendiente"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          pagoActivo
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {pagoActivo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 rounded-lg bg-slate-800 text-white text-xs font-semibold">
                        {config.cantidad_conversaciones ?? 0}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPaginas > 1 ? (
        <div className="flex items-center justify-end gap-2 text-xs">
          <button
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-slate-500">
            {pagina} / {totalPaginas}
          </span>
          <button
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ── Página ───────────────────────────────────────────────────── */

const AdminConexiones = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("salud");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      const dec = jwtDecode(token);
      if (dec?.exp && dec.exp * 1000 < Date.now()) navigate("/login");
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-[#171931] text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">
          <h1 className="text-lg md:text-xl font-bold">
            Salud del negocio · Bot IA
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Rendimiento del bot en todas las cuentas: conversaciones, cierres y
            cuellos de botella.
          </p>
          <div className="mt-4 flex gap-1">
            {[
              { id: "salud", label: "Salud del bot", icon: "bx-pulse" },
              { id: "conexiones", label: "Conexiones", icon: "bx-link" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-t-lg text-xs font-semibold transition ${
                  tab === t.id
                    ? "bg-slate-100 text-slate-900"
                    : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
              >
                <i className={`bx ${t.icon} mr-1`} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">
        {tab === "salud" ? <TabSalud /> : <TabConexiones />}
      </div>
    </div>
  );
};

export default AdminConexiones;
