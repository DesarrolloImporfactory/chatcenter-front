import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";
import chatApi from "../../api/chatcenter";
import botImage from "../../assets/bot.png";
import PageShell from "../../components/layout/PageShell";
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
   Tab 1: rendimiento del bot en las cuentas E-COMMERCE (tablero
          dropshipping): KPIs con tooltip, tendencia, embudo,
          comparativa de períodos y tabla paginada por cuenta.
          Lee el snapshot precalculado admin_bot_salud/*.
   Tab 2: conexiones de todos los negocios (listar_admin_conexiones).
   ════════════════════════════════════════════════════════════════ */

/* Colores de serie (validados para daltonismo sobre fondo claro) */
const C_CONVERS = "#6366f1"; // conversaciones IA
const C_CIERRE = "#0d9488"; // cierres / % de cierre
const META_CIERRE = 20; // % de cierre objetivo (benchmark del mercado)

const num = (v) => Number(v || 0).toLocaleString("es-EC");
const pct = (parte, total) =>
  Number(total) > 0 ? (Number(parte) / Number(total)) * 100 : null;
const pctTxt = (v) =>
  v === null || v === undefined || Number.isNaN(v)
    ? "—"
    : `${Number(v).toFixed(1)}%`;

/* Color de estado para % de cierre: rojo <5, ámbar 5-10, verde >10 */
const toneCierre = (v) => {
  if (v === null || v === undefined) return "text-slate-400";
  if (v < 5) return "text-rose-600";
  if (v < 10) return "text-amber-600";
  return "text-emerald-600";
};

const fechaCorta = (f) => {
  const s = String(f).slice(0, 10);
  const [, m, d] = s.split("-");
  return `${d}/${m}`;
};

/* Texto de ayuda de cada métrica: se usa en tooltips y en la guía. */
const AYUDA = {
  conversaciones:
    "Personas distintas a las que el bot les escribió al menos un mensaje en el período. Cada persona cuenta una sola vez por día.",
  cierre:
    "De cada 100 personas que atendió el bot, cuántas llegaron a 'Generar guía' o más allá en el kanban (guía generada, en tránsito, entregada...). Es la señal del propio asistente e-commerce de que la venta se cerró, tenga o no la cuenta integración con Dropi.",
  cierres:
    "Personas atendidas por el bot cuyo chat llegó al estado 'Generar guía' o a cualquier etapa posterior del tablero (guía generada, en tránsito, entregada, retiro, novedad, devolución). No depende de órdenes Dropi ni del auto-orden.",
  respuesta:
    "De cada 100 personas a las que el bot les escribió, cuántas contestaron algo después del primer mensaje. Si esto está bajo, el problema es el primer mensaje o el interés del cliente, no el cierre.",
  ventas:
    "Todos los pedidos Dropi de tus clientes e-commerce en el período, vengan o no del bot. Sirve para ver si a tus clientes les está yendo bien en ventas.",
  cuentas:
    "Cuentas con tablero de dropshipping y bot encendido que tuvieron actividad en el período. Las cuentas de servicios (citas, inmobiliaria...) no entran porque no venden con pedidos Dropi.",
  vsAnterior:
    "Compara el % de cierre de esta cuenta contra sus días anteriores (mismo largo de período). Verde = el bot le está cerrando más que antes.",
  embudo:
    "El camino completo: cuántas personas atendió el bot, cuántas contestaron, cuántas compraron y cuántos pedidos ya se entregaron. Donde más se achica la barra, ahí está el cuello de botella.",
  modelo: "Modelo de inteligencia artificial configurado en las columnas del kanban de esa cuenta.",
};

/* Icono de ayuda con tooltip (hover y focus). */
const Ayuda = ({ texto, ancho = "w-64" }) => (
  <span className="relative inline-flex group align-middle ml-1">
    <i
      className="bx bx-help-circle text-slate-400 hover:text-indigo-500 cursor-help text-[15px]"
      tabIndex={0}
    />
    <span
      className={`pointer-events-none absolute z-40 hidden group-hover:block group-focus-within:block top-full left-1/2 -translate-x-1/2 mt-1.5 ${ancho} bg-slate-900 text-white text-[11px] leading-snug rounded-lg px-3 py-2 shadow-xl normal-case font-normal tracking-normal text-left`}
    >
      {texto}
    </span>
  </span>
);

/* ── Piezas de UI ─────────────────────────────────────────────── */

const Kpi = ({ label, value, sub, delta, ayuda }) => {
  let deltaEl = null;
  if (delta !== null && delta !== undefined && Number.isFinite(delta)) {
    const up = delta >= 0;
    deltaEl = (
      <span
        className={`text-[11px] font-semibold ${up ? "text-emerald-600" : "text-rose-600"}`}
        title="Comparado con el período anterior del mismo largo"
      >
        {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
      </span>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center">
        {label}
        {ayuda ? <Ayuda texto={ayuda} /> : null}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {deltaEl}
      </div>
      {sub ? <div className="mt-0.5 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
};

const Card = ({ title, subtitle, right, ayuda, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5">
    <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center">
          {title}
          {ayuda ? <Ayuda texto={ayuda} /> : null}
        </h3>
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
            <b className="text-slate-900">
              {l.fmt ? l.fmt(d[l.key]) : num(d[l.key])}
            </b>
          </div>
        ))}
      </div>
    </div>
  );
};

/* Embudo horizontal: barras proporcionales al primer paso, con el % de
   conversión respecto al paso anterior y una explicación por paso. */
const AYUDA_PASO = {
  "Conversaciones IA": "Personas que el bot atendió en el período.",
  "Cliente respondió":
    "De esas personas, las que contestaron algo después del primer mensaje del bot.",
  "Cerró venta (generar guía)":
    "Personas cuyo chat llegó a 'Generar guía' o más allá en el kanban: la venta se cerró.",
  Entregadas: "De esos cierres, los chats que ya están en el estado 'Entregada'.",
};

const Embudo = ({ pasos }) => {
  const base = pasos[0]?.valor || 0;
  return (
    <div className="space-y-2.5">
      {pasos.map((p, i) => {
        const w = base > 0 ? Math.max((p.valor / base) * 100, 1.5) : 0;
        const prev = i > 0 ? pasos[i - 1].valor : null;
        const conv = prev ? pct(p.valor, prev) : null;
        return (
          <div key={p.paso} title={AYUDA_PASO[p.paso] || ""}>
            <div className="flex items-baseline justify-between text-xs mb-0.5">
              <span className="text-slate-600">{p.paso}</span>
              <span className="text-slate-900 font-semibold">
                {num(p.valor)}
                {conv !== null ? (
                  <span className="ml-1.5 font-normal text-slate-400">
                    (pasó el {pctTxt(conv)})
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

/* Comparativa período actual vs anterior: responde "¿el bot vende mejor
   que antes?" y "¿cómo van las ventas de mis clientes?". */
const Comparativa = ({ actual, previo, dias }) => {
  /* Dos grupos con lectura distinta:
     - "bot": % que SÍ son mérito/culpa del bot → delta en verde/rojo.
     - "volumen": números absolutos que suben y bajan con el tráfico de
       anuncios de los clientes → delta en gris neutro, para que una semana
       de menos tráfico no se lea como que el bot empeoró. */
  const filas = [
    {
      grupo: "🤖 Desempeño del bot (esto sí es del bot)",
      label: "% de cierre",
      ayuda:
        "Cierres ÷ conversaciones. Esta es LA métrica del bot: no depende de cuánto tráfico llegó, mide qué tan bien vende con la gente que le llega. Si esta sube, el bot mejoró aunque haya menos pedidos totales.",
      a: pct(actual?.cierres_kanban, actual?.convers_ia),
      p: pct(previo?.cierres_kanban, previo?.convers_ia),
      fmt: pctTxt,
      pts: true,
    },
    {
      label: "% clientes que responden",
      ayuda:
        "De cada 100 personas a las que el bot les escribió, cuántas contestaron algo. Es el primer escalón del embudo: si está bajo, el problema es el primer mensaje o el interés del cliente.",
      a: pct(actual?.convers_respondieron, actual?.convers_ia),
      p: pct(previo?.convers_respondieron, previo?.convers_ia),
      fmt: pctTxt,
      pts: true,
    },
    {
      grupo: "📈 Volumen (sube y baja con el tráfico de anuncios, no con el bot)",
      label: "Conversaciones IA",
      ayuda:
        "Cuánta gente atendió el bot. Si baja, no es culpa del bot: llegó menos tráfico de los anuncios.",
      a: Number(actual?.convers_ia || 0),
      p: Number(previo?.convers_ia || 0),
      fmt: num,
      neutro: true,
    },
    {
      label: "Cierres (llegaron a generar guía)",
      ayuda:
        "Cuántas de esas personas terminaron comprando (su chat llegó a 'Generar guía' o más allá). Depende del tráfico Y de qué tan bien cierra el bot.",
      a: Number(actual?.cierres_kanban || 0),
      p: Number(previo?.cierres_kanban || 0),
      fmt: num,
      neutro: true,
    },
    {
      label: "Ventas de tus clientes (todos los pedidos)",
      ayuda:
        "Todos los pedidos Dropi de tus clientes e-commerce, vengan o no del bot. Mide la salud del negocio de tus clientes, no el desempeño del bot.",
      a: Number(actual?.ordenes_total || 0),
      p: Number(previo?.ordenes_total || 0),
      fmt: num,
      neutro: true,
    },
    /* OJO: aquí NO va "pedidos entregados": los pedidos del período actual
       todavía están en camino, así que esa fila siempre saldría desplomada
       y confunde. Las entregas se ven en el embudo. */
  ];

  /* Veredicto en una frase: responde la pregunta del título sin que haya
     que interpretar la tabla. Manda el % de cierre; el volumen acompaña. */
  const cierreA = pct(actual?.cierres_kanban, actual?.convers_ia);
  const cierreP = pct(previo?.cierres_kanban, previo?.convers_ia);
  let veredicto = null;
  if (cierreA !== null && cierreP !== null) {
    const dPts = cierreA - cierreP;
    const dCierres =
      Number(previo?.cierres_kanban) > 0
        ? ((Number(actual?.cierres_kanban) - Number(previo?.cierres_kanban)) /
            Number(previo?.cierres_kanban)) *
          100
        : null;
    const mejor = dPts >= 0;
    veredicto = (
      <div
        className={`mb-3 rounded-lg px-3 py-2 text-xs font-semibold ${
          mejor
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-rose-50 text-rose-700 border border-rose-200"
        }`}
      >
        {mejor ? "▲ Sí:" : "▼ No:"} el bot cerró el {pctTxt(cierreA)} de las
        conversaciones que atendió ({pctTxt(cierreP)} en el período anterior).
        {dCierres !== null && mejor && dCierres < 0
          ? ` Hubo ${Math.abs(dCierres).toFixed(0)}% menos cierres en total, pero por menos tráfico, no por el bot.`
          : dCierres !== null
            ? ` En total, ${Math.abs(dCierres).toFixed(0)}% ${dCierres >= 0 ? "más" : "menos"} cierres que antes.`
            : ""}
      </div>
    );
  }

  return (
    <div>
      {veredicto}
      <table className="w-full text-sm">
      <thead>
        <tr className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
          <th className="text-left py-2 font-semibold">Métrica</th>
          <th className="text-right py-2 font-semibold">Últimos {dias} días</th>
          <th className="text-right py-2 font-semibold">{dias} días previos</th>
          <th className="text-right py-2 font-semibold">Cambio</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {filas.map((f) => {
          let delta = null;
          if (f.a !== null && f.p !== null && f.p !== 0) {
            delta = f.pts ? f.a - f.p : ((f.a - f.p) / f.p) * 100;
          }
          const up = delta !== null && delta >= 0;
          const colorDelta = f.neutro
            ? "text-slate-500"
            : up
              ? "text-emerald-600"
              : "text-rose-600";
          return (
            <React.Fragment key={f.label}>
              {f.grupo ? (
                <tr>
                  <td
                    colSpan={4}
                    className="pt-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400"
                  >
                    {f.grupo}
                  </td>
                </tr>
              ) : null}
              <tr>
                <td className="py-2 text-slate-600">
                  {f.label}
                  {f.ayuda ? <Ayuda texto={f.ayuda} ancho="w-72" /> : null}
                </td>
                <td className="py-2 text-right font-bold text-slate-900">
                  {f.fmt(f.a)}
                </td>
                <td className="py-2 text-right text-slate-500">{f.fmt(f.p)}</td>
                <td className="py-2 text-right">
                  {delta === null ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <span className={`font-semibold ${colorDelta}`}>
                      {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
                      {f.pts ? " pts" : "%"}
                    </span>
                  )}
                </td>
              </tr>
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
    </div>
  );
};

/* Guía de lectura: modal simple con las definiciones, accesible desde el
   botón "¿Cómo se calcula?" arriba (no escondida al final). */
const GuiaModal = ({ onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 md:p-6 max-h-[85vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-slate-900">
          ¿Cómo se calcula cada métrica?
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 text-xl leading-none"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
      <dl className="space-y-3 text-sm">
        {[
          ["Conversaciones IA", AYUDA.conversaciones],
          ["% de cierre", AYUDA.cierre],
          ["Cierres", AYUDA.cierres],
          ["% clientes que responden", AYUDA.respuesta],
          ["Ventas de tus clientes", AYUDA.ventas],
          ["Cuentas e-commerce", AYUDA.cuentas],
          ["vs período anterior", AYUDA.vsAnterior],
          ["Embudo", AYUDA.embudo],
        ].map(([t, d]) => (
          <div key={t}>
            <dt className="font-semibold text-slate-800">{t}</dt>
            <dd className="text-slate-500 text-xs leading-relaxed">{d}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[11px] text-slate-400">
        Los datos se precalculan cada madrugada (03:20) sobre una ventana móvil
        de 35 días. El botón "Recalcular ahora" fuerza la corrida al momento.
      </p>
    </div>
  </div>
);

/* ── Tab: Salud del bot ───────────────────────────────────────── */

const COLS_CUENTAS = [
  { key: "nombre", label: "Cuenta", sortable: false },
  { key: "modelos", label: "Modelo IA", sortable: false, title: AYUDA.modelo },
  {
    key: "convers_ia",
    label: "Conversaciones IA",
    sortable: true,
    title: AYUDA.conversaciones,
  },
  {
    key: "pct_respuesta",
    label: "% responden",
    sortable: true,
    title: AYUDA.respuesta,
  },
  { key: "cierres_kanban", label: "Cierres", sortable: true, title: AYUDA.cierres },
  { key: "pct_cierre", label: "% de cierre", sortable: true, title: AYUDA.cierre },
  {
    key: "delta_cierre",
    label: "vs período anterior",
    sortable: true,
    title: AYUDA.vsAnterior,
  },
  { key: "embudo", label: "", sortable: false },
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
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [guiaOpen, setGuiaOpen] = useState(false);
  const embudoRef = useRef(null);

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
      setPagina(1);
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
        // Llevar al usuario hasta el embudo: sin esto el clic "no hace nada"
        // visible porque el cambio ocurre fuera de la pantalla.
        embudoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {
        toast.error("No se pudo cargar el embudo de la cuenta");
      }
    },
    [rango],
  );

  const verEmbudoGlobal = useCallback(async () => {
    try {
      const { data } = await chatApi.get(
        `admin_bot_salud/embudo?dias=${rango}`,
      );
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
    const cierreA = pct(a.cierres_kanban, a.convers_ia);
    const cierreP = pct(p.cierres_kanban, p.convers_ia);
    const respA = pct(a.convers_respondieron, a.convers_ia);
    const deltaPts = (x, y) => (x !== null && y !== null ? x - y : null);
    const deltaPct = (x, y) =>
      Number(y) > 0 ? ((Number(x || 0) - Number(y)) / Number(y)) * 100 : null;
    return {
      cierre: cierreA,
      cierreDelta: deltaPts(cierreA, cierreP),
      convers: Number(a.convers_ia || 0),
      conversDelta: deltaPct(a.convers_ia, p.convers_ia),
      cierres: Number(a.cierres_kanban || 0),
      cierresDelta: deltaPct(a.cierres_kanban, p.cierres_kanban),
      respuesta: respA,
      ordenes: Number(a.ordenes_total || 0),
      ordenesDelta: deltaPct(a.ordenes_total, p.ordenes_total),
    };
  }, [resumen]);

  const serieChart = useMemo(() => {
    if (!resumen?.serie) return [];
    return resumen.serie.map((d) => ({
      fecha: String(d.fecha).slice(0, 10),
      convers_ia: Number(d.convers_ia || 0),
      cierres_kanban: Number(d.cierres_kanban || 0),
      pct_cierre: pct(d.cierres_kanban, d.convers_ia),
    }));
  }, [resumen]);

  const cuentasFiltradas = useMemo(() => {
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
      const a =
        x[key] === null || x[key] === undefined ? -Infinity : Number(x[key]);
      const b =
        y[key] === null || y[key] === undefined ? -Infinity : Number(y[key]);
      return dir === "desc" ? b - a : a - b;
    });
    return data;
  }, [cuentas, busca, orden]);

  useEffect(() => setPagina(1), [busca, orden, porPagina]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(cuentasFiltradas.length / porPagina),
  );
  const cuentasVisibles = cuentasFiltradas.slice(
    (pagina - 1) * porPagina,
    pagina * porPagina,
  );

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
      {guiaOpen ? <GuiaModal onClose={() => setGuiaOpen(false)} /> : null}

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
            Últimos {d} días
          </button>
        ))}
        <button
          onClick={() => setGuiaOpen(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
        >
          <i className="bx bx-help-circle mr-1" />
          ¿Cómo se calcula?
        </button>
        <div className="flex-1" />
        {resumen?.snapshot_actualizado ? (
          <span
            className="text-[11px] text-slate-400"
            title="Última vez que se recalcularon los datos"
          >
            Datos al:{" "}
            {String(resumen.snapshot_actualizado)
              .slice(0, 16)
              .replace("T", " ")}
          </span>
        ) : null}
        <button
          onClick={recalcular}
          disabled={recalculando}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          title="Vuelve a calcular todas las métricas con los datos de este momento (tarda ~1 minuto)"
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
          Aún no hay datos calculados. Pulsa <b>Recalcular ahora</b> (tarda ~1
          minuto) o espera al cálculo automático de las 03:20.
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
            sub={`la meta es ${META_CIERRE}%`}
            delta={kpis.cierreDelta}
            ayuda={AYUDA.cierre}
          />
          <Kpi
            label="Conversaciones IA"
            value={num(kpis.convers)}
            sub={`${num(Math.round(kpis.convers / rango))} por día`}
            delta={kpis.conversDelta}
            ayuda={AYUDA.conversaciones}
          />
          <Kpi
            label="Cierres"
            value={num(kpis.cierres)}
            sub="chats que llegaron a generar guía"
            delta={kpis.cierresDelta}
            ayuda={AYUDA.cierres}
          />
          <Kpi
            label="% clientes que responden"
            value={pctTxt(kpis.respuesta)}
            sub="tras el primer mensaje del bot"
            ayuda={AYUDA.respuesta}
          />
          <Kpi
            label="Ventas de tus clientes"
            value={num(kpis.ordenes)}
            sub="todos sus pedidos Dropi"
            delta={kpis.ordenesDelta}
            ayuda={AYUDA.ventas}
          />
          <Kpi
            label="Cuentas e-commerce"
            value={num(resumen.cuentas_con_ia)}
            sub="con bot activo en el período"
            ayuda={AYUDA.cuentas}
          />
        </div>
      ) : null}

      {/* Tendencia: dos paneles con el mismo eje X (nunca doble eje Y) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title="Conversaciones IA por día"
          subtitle="Personas distintas atendidas por el bot cada día"
          ayuda={AYUDA.conversaciones}
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={serieChart}
                margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
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
                        {
                          key: "convers_ia",
                          label: "Conversaciones",
                          color: C_CONVERS,
                        },
                        { key: "cierres_kanban", label: "Cierres", color: C_CIERRE },
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
          subtitle={`Cierres ÷ conversaciones de cada día · la línea punteada es la meta del ${META_CIERRE}%`}
          ayuda={AYUDA.cierre}
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={serieChart}
                margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
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
                          label: "% de cierre",
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

      {/* Embudo + comparativa de períodos */}
      <div ref={embudoRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4 scroll-mt-4">
        <Card
          title={
            cuentaSel
              ? `Embudo de conversión — ${cuentaSel.nombre}`
              : "Embudo de conversión (todas las cuentas)"
          }
          subtitle="Dónde se pierden los clientes, del primer mensaje a la entrega"
          ayuda={AYUDA.embudo}
          right={
            cuentaSel ? (
              <button
                onClick={verEmbudoGlobal}
                className="text-xs text-indigo-600 hover:underline"
              >
                ← volver a todas
              </button>
            ) : null
          }
        >
          {embudo ? <Embudo pasos={embudo.embudo} /> : null}
        </Card>

        <Card
          title="¿El bot vende mejor que antes?"
          subtitle="Período actual comparado con el período anterior del mismo largo"
          ayuda={AYUDA.vsAnterior}
        >
          {resumen ? (
            <Comparativa
              actual={resumen.actual}
              previo={resumen.previo}
              dias={rango}
            />
          ) : null}
        </Card>
      </div>

      {/* Tabla por cuenta (paginada) */}
      <Card
        title="Rendimiento por cuenta"
        subtitle="% de cierre: 🔴 menos de 5% · 🟡 entre 5 y 10% · 🟢 más de 10% · El botón 'Ver embudo' muestra dónde pierde clientes esa cuenta"
        right={
          <div className="flex items-center gap-2">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cuenta..."
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <select
              value={porPagina}
              onChange={(e) => setPorPagina(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} por página
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {COLS_CUENTAS.map((c) => (
                  <th
                    key={c.key}
                    title={c.title || ""}
                    onClick={
                      c.sortable
                        ? () =>
                            setOrden((o) => ({
                              key: c.key,
                              dir:
                                o.key === c.key && o.dir === "desc"
                                  ? "asc"
                                  : "desc",
                            }))
                        : undefined
                    }
                    className={`py-2.5 px-3 text-left text-xs font-semibold whitespace-nowrap ${
                      c.sortable
                        ? "cursor-pointer select-none hover:text-slate-900"
                        : ""
                    } ${c.title ? "cursor-help" : ""}`}
                  >
                    {c.label}
                    {orden.key === c.key
                      ? orden.dir === "desc"
                        ? " ↓"
                        : " ↑"
                      : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cuentasVisibles.map((c) => (
                <tr key={c.id_configuracion}>
                  <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[240px] truncate">
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
                      ({c.convers_dia} por día)
                    </span>
                  </td>
                  <td className="py-2.5 px-3">{pctTxt(c.pct_respuesta)}</td>
                  <td className="py-2.5 px-3">{num(c.cierres_kanban)}</td>
                  <td
                    className={`py-2.5 px-3 font-bold ${toneCierre(c.pct_cierre)}`}
                  >
                    {pctTxt(c.pct_cierre)}
                  </td>
                  <td className="py-2.5 px-3">
                    {c.delta_cierre === null || c.delta_cierre === undefined ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span
                        className={`font-semibold ${
                          c.delta_cierre >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {c.delta_cierre >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(c.delta_cierre).toFixed(1)} pts
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => verEmbudoCuenta(c)}
                      className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-[11px] font-semibold hover:bg-indigo-100 whitespace-nowrap"
                      title="Ver el embudo de conversión de esta cuenta (te lleva arriba)"
                    >
                      <i className="bx bx-filter mr-0.5" />
                      Ver embudo
                    </button>
                  </td>
                </tr>
              ))}
              {!cuentasVisibles.length ? (
                <tr>
                  <td
                    colSpan={COLS_CUENTAS.length}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    Sin cuentas con actividad del bot en el período.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Paginador */}
        <div className="flex items-center justify-between mt-3 text-xs text-slate-500 flex-wrap gap-2">
          <span>
            {num(cuentasFiltradas.length)} cuentas · página {pagina} de{" "}
            {totalPaginas}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── Tab: Conexiones ──────────────────────────────────────────── */

const isConectado = (c) => {
  if (typeof c?.status_whatsapp === "string")
    return c.status_whatsapp.toUpperCase() === "CONNECTED";
  return Boolean(
    String(c?.id_telefono || "").trim() && String(c?.id_whatsapp || "").trim(),
  );
};

/* Punto de canal: icono coloreado si está conectado, gris si no. */
const Canal = ({ activo, icono, nombre, colorOn }) => (
  <span
    title={`${nombre}: ${activo ? "conectado" : "no conectado"}`}
    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[15px] ${
      activo ? colorOn : "bg-slate-100 text-slate-300"
    }`}
  >
    <i className={`bx ${icono}`} />
  </span>
);

function TabConexiones() {
  const [lista, setLista] = useState(null); // null = sin cargar
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroPago, setFiltroPago] = useState("");
  const [orden, setOrden] = useState({ key: "cantidad_conversaciones", dir: "desc" });
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

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
      data = data.filter(
        (c) => isConectado(c) === (filtroEstado === "conectado"),
      );
    if (filtroPago)
      data = data.filter(
        (c) => Number(c.metodo_pago) === (filtroPago === "activo" ? 1 : 0),
      );
    const { key, dir } = orden;
    data.sort((x, y) => {
      const a = Number(x[key]) || 0;
      const b = Number(y[key]) || 0;
      return dir === "desc" ? b - a : a - b;
    });
    return data;
  }, [lista, search, filtroEstado, filtroPago, orden]);

  useEffect(() => setPagina(1), [search, filtroEstado, filtroPago, porPagina]);

  const totalPaginas = Math.max(1, Math.ceil(filtrada.length / porPagina));
  const visibles = filtrada.slice((pagina - 1) * porPagina, pagina * porPagina);

  const stats = useMemo(() => {
    const total = lista?.length || 0;
    const conectados = (lista || []).filter(isConectado).length;
    const pagos = (lista || []).filter((c) => Number(c.metodo_pago) === 1)
      .length;
    const multicanal = (lista || []).filter(
      (c) =>
        Number(c.messenger_conectado) === 1 ||
        Number(c.instagram_conectado) === 1 ||
        Number(c.tiktok_conectado) === 1,
    ).length;
    return { total, conectados, pendientes: total - conectados, pagos, multicanal };
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
        <Kpi
          label="Negocios"
          value={num(stats.total)}
          sub={`${num(stats.multicanal)} con más de un canal`}
        />
        <Kpi
          label="WhatsApp conectado"
          value={num(stats.conectados)}
          sub={`${num(stats.pendientes)} pendientes`}
          ayuda="Cuentas con la conexión de WhatsApp Business activa y lista para enviar y recibir mensajes."
        />
        <Kpi
          label="Pendientes"
          value={num(stats.pendientes)}
          ayuda="Cuentas creadas que todavía no terminan de conectar su número de WhatsApp."
        />
        <Kpi
          label="Con pago activo"
          value={num(stats.pagos)}
          ayuda="Cuentas con método de pago registrado y al día."
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o teléfono..."
              className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">WhatsApp: todos</option>
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
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} por página
              </option>
            ))}
          </select>
        </div>

        {!filtrada.length ? (
          <div className="flex flex-col items-center justify-center text-center py-14">
            <img src={botImage} alt="Robot" className="w-28 h-28" />
            <h3 className="mt-4 text-sm font-semibold text-slate-700">
              Sin conexiones que coincidan con el filtro
            </h3>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-semibold">
                    Negocio
                  </th>
                  <th
                    className="py-3 px-4 text-left text-xs font-semibold cursor-help"
                    title="WhatsApp, Messenger, Instagram y TikTok: de color si el canal está conectado"
                  >
                    Canales
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold">
                    WhatsApp
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold">
                    Pago
                  </th>
                  <th
                    className="py-3 px-4 text-left text-xs font-semibold cursor-pointer select-none hover:text-slate-900"
                    title="Total de conversaciones de la cuenta · clic para ordenar"
                    onClick={() =>
                      setOrden((o) => ({
                        key: "cantidad_conversaciones",
                        dir: o.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  >
                    Conversaciones {orden.dir === "desc" ? "↓" : "↑"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibles.map((config) => {
                  const conectado = isConectado(config);
                  const pagoActivo = Number(config.metodo_pago) === 1;
                  const inicial = (config.nombre_configuracion || "?")
                    .trim()
                    .charAt(0)
                    .toUpperCase();
                  return (
                    <tr key={config.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm shrink-0">
                            {inicial}
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 truncate max-w-[240px]">
                              {config.nombre_configuracion}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {config.telefono || "sin teléfono"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Canal
                            activo={conectado}
                            icono="bxl-whatsapp"
                            nombre="WhatsApp"
                            colorOn="bg-emerald-100 text-emerald-600"
                          />
                          <Canal
                            activo={Number(config.messenger_conectado) === 1}
                            icono="bxl-messenger"
                            nombre="Messenger"
                            colorOn="bg-blue-100 text-blue-600"
                          />
                          <Canal
                            activo={Number(config.instagram_conectado) === 1}
                            icono="bxl-instagram"
                            nombre="Instagram"
                            colorOn="bg-fuchsia-100 text-fuchsia-600"
                          />
                          <Canal
                            activo={Number(config.tiktok_conectado) === 1}
                            icono="bxl-tiktok"
                            nombre="TikTok"
                            colorOn="bg-slate-800 text-white"
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
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
                      <td className="py-2.5 px-4">
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
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {num(config.cantidad_conversaciones ?? 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <span>
            {num(filtrada.length)} negocios · página {pagina} de {totalPaginas}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
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
    <PageShell>
      {/* Hero navy de marca, mismo look que Conexiones/Usuarios */}
      <header className="relative isolate overflow-hidden rounded-t-2xl">
        <div className="absolute inset-0 bg-[#171931]" aria-hidden />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.6]"
          style={{
            backgroundImage:
              "radial-gradient(600px circle at 0% 0%, rgba(79,70,229,0.25), transparent 45%), radial-gradient(500px circle at 100% 120%, rgba(99,102,241,0.18), transparent 40%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative px-5 pt-4 md:px-7 md:pt-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 ring-1 ring-white/15">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            ImporChat · Superadmin
          </span>
          <h1 className="mt-2 text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
            Salud del negocio,{" "}
            <span className="bg-gradient-to-r from-indigo-300 to-violet-200 bg-clip-text text-transparent">
              medida por el bot
            </span>
          </h1>
          <p className="mt-0.5 text-white/55 text-[13px] leading-snug">
            Conversaciones, tasa de cierre y evolución del bot en todas las
            cuentas e-commerce.
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
                    ? "bg-slate-50 text-slate-900"
                    : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
              >
                <i className={`bx ${t.icon} mr-1`} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="bg-slate-50 min-h-[70vh] p-4 md:p-6">
        {tab === "salud" ? <TabSalud /> : <TabConexiones />}
      </div>
    </PageShell>
  );
};

export default AdminConexiones;
