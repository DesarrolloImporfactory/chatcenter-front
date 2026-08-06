import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

/* ============================================================
   Programa de Referidos
   ============================================================

   LA REGLA QUE ESTA PANTALLA TIENE QUE DEJAR OBVIA
   La comisión NO arranca el primer mes: arranca en el ciclo 3, porque el mes 1
   se vende a $5 y el mes 2 apenas recupera ese subsidio. Si no se explica bien,
   el referidor trae gente, ve $0 durante dos meses y asume que el sistema está
   roto. Por eso cada cifra lleva su tooltip, cada referido dice en qué fecha
   empieza a rendir, y las dos formas de cobrar están explicadas en su propia
   tarjeta en vez de en dos botones sueltos.

   ESTÉTICA — la misma de "Mi plan y facturación"
   Cabecera oscura #171931 con los radiales indigo/violeta y la retícula al 4%.
   Es deliberado que sea idéntica: referidos y facturación son la misma
   conversación con el cliente vista desde los dos lados.

   PALETA — validada, no elegida a ojo
   Indigo #4F46E5, naranja #EA580C para lo que madura, gris #64748B para lo
   inactivo. Peor par adyacente ΔE 15.2 en protanopía y los tres por encima de
   3:1 contra fondo blanco. El gris es intencional: significa "no está pasando
   nada", por eso no lleva color propio.
   Los porcentajes NO se calculan aquí, vienen resueltos del backend.
   ============================================================ */

const C = {
  bien: "#4F46E5",
  espera: "#EA580C",
  neutro: "#64748B",
  grid: "#E2E8F0",
  eje: "#64748B",
};

const money = (cent) =>
  `$${((Number(cent) || 0) / 100).toLocaleString("es-EC", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const money0 = (cent) => `$${Math.round((Number(cent) || 0) / 100)}`;

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

const fecha = (v) =>
  v
    ? new Date(v).toLocaleDateString("es-EC", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/**
 * Formatea un "YYYY-MM-DD" partiendo la cadena a mano.
 *
 * `new Date("2026-09-05")` se interpreta como medianoche UTC, y en Ecuador
 * (UTC-5) eso se muestra como el 4. Una comisión anunciada un día antes de
 * cuando llega es justo el detalle que hace desconfiar del número. El año solo
 * aparece si no es el actual, y entonces completo: "28 ago 26" se lee como
 * día 26.
 */
const fechaCorta = (ymd) => {
  const [a, m, d] = String(ymd || "").split("-");
  if (!a || !m || !d) return "—";
  const anio = Number(a) === new Date().getFullYear() ? "" : ` de ${a}`;
  return `${Number(d)} de ${MESES[Number(m) - 1] || ""}${anio}`;
};

const etiquetaMes = (ym) => {
  const [a, m] = String(ym || "").split("-");
  return `${MESES[Number(m) - 1] || ""} ${String(a || "").slice(2)}`;
};

/** Rellena los meses sin comisiones: un hueco en la serie lee como caída, no como cero. */
const serieCompleta = (serie) => {
  const mapa = new Map((serie || []).map((s) => [s.mes, s]));
  const hoy = new Date();
  const out = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const row = mapa.get(ym);
    out.push({
      mes: ym,
      label: etiquetaMes(ym),
      comision: (row?.comision_cent || 0) / 100,
      referidos: row?.referidos || 0,
    });
  }
  return out;
};

const esActivo = (r) =>
  ["activo", "trial_usage", "promo_usage"].includes(
    String(r?.estado || "").toLowerCase(),
  );

/** "hace 3 meses" — sitúa al referido en el tiempo sin obligar a restar fechas. */
const antiguedad = (v) => {
  if (!v) return "";
  const dias = Math.floor((Date.now() - new Date(v).getTime()) / 86400000);
  if (dias < 1) return "hoy";
  if (dias < 30) return `hace ${dias} día${dias === 1 ? "" : "s"}`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `hace ${meses} mes${meses === 1 ? "" : "es"}`;
  const anios = Math.floor(meses / 12);
  return `hace ${anios} año${anios === 1 ? "" : "s"}`;
};

const ESTADO_COMISION = {
  pendiente: { label: "En espera", cls: "bg-orange-100 text-orange-700" },
  disponible: { label: "Disponible", cls: "bg-indigo-100 text-indigo-700" },
  pagada: { label: "Pagada", cls: "bg-slate-100 text-slate-600" },
  revertida: { label: "Revertida", cls: "bg-rose-100 text-rose-700" },
};

const ESTADO_PAGO = {
  solicitado: { label: "Solicitada", cls: "bg-orange-100 text-orange-700" },
  aprobado: { label: "Aprobada", cls: "bg-sky-100 text-sky-700" },
  pagado: { label: "Pagada", cls: "bg-indigo-100 text-indigo-700" },
  rechazado: { label: "Rechazada", cls: "bg-rose-100 text-rose-700" },
};

/**
 * Motivos de bloqueo del crédito que se arreglan eligiendo o reactivando plan.
 * Para esos vale la pena ofrecer el atajo; para el resto, el enlace sería ruido.
 */
const NECESITA_PLAN = new Set([
  "SIN_PLAN",
  "SUSCRIPCION_CANCELADA",
  "PLAN_INACTIVO",
  "CANCELACION_PROGRAMADA",
  "SIN_FACTURA_PROXIMA",
]);

const FILTROS = [
  { k: "todos", label: "Todos" },
  { k: "comisionando", label: "Comisionando" },
  { k: "camino", label: "En camino" },
  { k: "inactivos", label: "Sin plan" },
];

/**
 * El enlace se arma AQUÍ y no en el backend.
 *
 * El servidor no sabe desde qué dominio lo están usando: en desarrollo es
 * localhost y en producción el dominio real. Una URL quemada en el backend
 * significa repartir enlaces rotos en cuanto uno de los dos cambie.
 */
const armarEnlace = (codigo) =>
  codigo ? `${window.location.origin}/register?ref=${codigo}` : null;

/* ─────────────────────────────────────────────────────────────
   Piezas
   ───────────────────────────────────────────────────────────── */

/**
 * Tooltip de ayuda.
 *
 * Se ancla a la TARJETA, no al ícono: `left-2 right-2` lo obliga a caber
 * dentro del ancho de la tarjeta, así que nunca se sale del marco ni se
 * recorta —que era lo que pasaba con la primera tarjeta de la fila, donde un
 * tooltip anclado al ícono se desplegaba hacia la izquierda y quedaba cortado.
 * Por eso la tarjeta es `relative` y este `<span>` exterior no lo es.
 *
 * Y baja en vez de subir: el contenedor recorta por arriba.
 */
const Info = ({ texto }) => (
  <span className="group/info inline-flex align-middle">
    <i className="bx bx-info-circle text-[13px] text-slate-300 group-hover/info:text-indigo-500 cursor-help transition-colors" />
    <span className="pointer-events-none absolute left-2 right-2 top-[calc(100%-0.5rem)] rounded-xl bg-[#171931] text-white/90 text-[11px] leading-relaxed p-3 opacity-0 group-hover/info:opacity-100 transition-opacity duration-150 z-40 shadow-2xl ring-1 ring-white/10">
      {texto}
    </span>
  </span>
);

const Kpi = ({ label, valor, detalle, color, icon, ayuda, destacado }) => (
  <div
    className={`relative rounded-2xl p-4 transition ${
      destacado
        ? "bg-indigo-50/70 border border-indigo-200"
        : "bg-white border border-slate-200"
    }`}
  >
    <div className="flex items-start justify-between gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-tight">
        {label}
      </p>
      <span className="flex items-center gap-1 shrink-0">
        {icon && <i className={`bx ${icon} text-base text-slate-300`} />}
        {ayuda && <Info texto={ayuda} />}
      </span>
    </div>
    <p
      className="text-[1.6rem] font-bold mt-1 tabular-nums leading-none"
      style={{ color: color || "#1E293B" }}
    >
      {valor}
    </p>
    {detalle && (
      <p className="text-[11px] text-slate-500 mt-1.5 leading-tight">
        {detalle}
      </p>
    )}
  </div>
);

const Panel = ({ icon, title, subtitle, children, accion }) => (
  <div className="bg-white rounded-2xl border border-slate-200">
    {(title || subtitle) && (
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon && <i className={`bx ${icon} text-lg text-slate-400`} />}
            <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {accion}
      </div>
    )}
    {children}
  </div>
);

const TooltipMes = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-xl">
      <p className="text-xs font-semibold text-slate-900 capitalize">
        {d.label}
      </p>
      <p className="text-xl font-bold text-indigo-700 tabular-nums mt-0.5">
        ${d.comision.toFixed(2)}
      </p>
      <p className="text-[11px] text-slate-500">
        {d.referidos} referido{d.referidos === 1 ? "" : "s"} generaron comisión
      </p>
    </div>
  );
};

const TooltipTop = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-xl">
      <p className="text-xs font-semibold text-slate-900">{d.nombreCompleto}</p>
      <p className="text-lg font-bold text-indigo-700 tabular-nums mt-0.5">
        ${d.generado.toFixed(2)}
      </p>
      <p className="text-[11px] text-slate-500">
        {d.meses} mes{d.meses === 1 ? "" : "es"} pagados
      </p>
    </div>
  );
};

/**
 * Estado de la cartera de referidos, en dona.
 *
 * Es reparto de un total entre tres estados excluyentes y se lee de un
 * vistazo, que es justo lo que una dona hace bien. Va aquí, en la fila de
 * gráficos, y no como una sección propia a lo ancho: ocupaba una franja
 * entera de alto para decir tres números.
 *
 * El centro lleva el total y la leyenda lleva los conteos, así que la
 * identidad de cada porción nunca depende solo del color.
 */
const Dona = ({ comisionando, enCamino, sinPlan }) => {
  const seg = [
    { n: comisionando, color: C.bien, label: "Comisionando" },
    { n: enCamino, color: C.espera, label: "En camino" },
    { n: sinPlan, color: C.neutro, label: "Sin plan" },
  ].filter((s) => s.n > 0);

  const total = comisionando + enCamino + sinPlan;
  if (!total) return null;

  return (
    <div className="px-5 pb-5 flex items-center gap-4">
      <div className="relative h-[8.5rem] w-[8.5rem] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={seg}
              dataKey="n"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
            >
              {seg.map((s) => (
                <Cell key={s.label} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xl">
                    <p className="text-xs font-semibold text-slate-900">
                      {payload[0].payload.label}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {payload[0].value} de {total} referidos
                    </p>
                  </div>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center leading-none">
            <p className="text-2xl font-bold text-slate-800 tabular-nums">
              {total}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">referidos</p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 min-w-0">
        {seg.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[12px] text-slate-600 truncate">
              {s.label}
            </span>
            <span className="text-[12px] font-bold text-slate-800 tabular-nums ml-auto pl-2">
              {s.n}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Esqueleto de carga.
 *
 * Reproduce la MISMA retícula de la pantalla real —cabecera oscura, seis
 * cifras, dos tarjetas de cobro, tres gráficos y la tabla— para que al llegar
 * los datos nada salte de sitio. Un spinner centrado no dice cuánto viene ni
 * dónde, y aquí viene bastante.
 *
 * Los bloques van en gris neutro sobre la cabecera oscura porque esa cabecera
 * sí se pinta de inmediato: es lo único que no depende de la petición.
 */
const Bloque = ({ className = "" }) => (
  <div className={`rounded-lg bg-slate-200/70 ${className}`} />
);

const Esqueleto = () => (
  <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-3 md:px-5 py-5">
    <div className="mx-auto w-full bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 overflow-hidden animate-pulse">
      <header className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[#171931]" aria-hidden />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.6]"
          style={{
            backgroundImage:
              "radial-gradient(600px circle at 0% 0%, rgba(79,70,229,0.25), transparent 45%), radial-gradient(500px circle at 100% 120%, rgba(99,102,241,0.18), transparent 40%)",
          }}
        />
        <div className="relative px-5 py-5 md:px-7 md:py-6 grid lg:grid-cols-[1.4fr_1fr] gap-5 lg:gap-8 items-start border-b border-white/10">
          <div className="min-w-0 space-y-3">
            <div className="h-4 w-40 rounded-full bg-white/10" />
            <div className="h-7 w-3/4 rounded-lg bg-white/10" />
            <div className="h-4 w-2/3 rounded-lg bg-white/[0.07]" />
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <div className="flex-1 h-11 rounded-xl bg-black/25" />
              <div className="flex gap-2">
                <div className="h-11 w-24 rounded-xl bg-white/15" />
                <div className="h-11 w-12 rounded-xl bg-white/10" />
              </div>
            </div>
          </div>
          <div className="bg-white/[0.07] border border-white/15 rounded-2xl p-5 space-y-3">
            <div className="h-3 w-32 rounded-full bg-white/10" />
            <div className="h-10 w-44 rounded-lg bg-white/15" />
            <div className="h-3 w-full rounded-full bg-white/[0.07]" />
          </div>
        </div>
      </header>

      <div className="p-3 md:p-5 space-y-4">
        {/* Cómo funciona */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <Bloque className="h-4 w-52 mb-5" />
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="relative pl-11">
                <span className="absolute left-0 top-0 w-8 h-8 rounded-xl bg-slate-200" />
                <Bloque className="h-3.5 w-32 mb-2" />
                <Bloque className="h-3 w-full mb-1.5" />
                <Bloque className="h-3 w-4/5" />
              </div>
            ))}
          </div>
        </div>

        {/* Cifras */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-4 bg-white border border-slate-200"
            >
              <Bloque className="h-2.5 w-20 mb-3" />
              <Bloque className="h-7 w-24 mb-2.5" />
              <Bloque className="h-2.5 w-28" />
            </div>
          ))}
        </div>

        {/* Cómo cobrar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <Bloque className="h-4 w-44 mb-4" />
          <div className="grid md:grid-cols-2 gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-xl border-2 border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
                  <div className="flex-1">
                    <Bloque className="h-3.5 w-40 mb-1.5" />
                    <Bloque className="h-2.5 w-24" />
                  </div>
                </div>
                <Bloque className="h-3 w-full mb-1.5" />
                <Bloque className="h-3 w-full mb-1.5" />
                <Bloque className="h-3 w-2/3" />
                <Bloque className="h-10 w-full mt-5" />
              </div>
            ))}
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid lg:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr] gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-5"
            >
              <Bloque className="h-3.5 w-36 mb-1.5" />
              <Bloque className="h-2.5 w-48 mb-5" />
              <div className="h-40 flex items-end gap-2">
                {/* Alturas fijas y crecientes: un gráfico de barras aleatorio
                    parpadeando distrae más de lo que informa. */}
                {[45, 65, 40, 80, 55, 70].map((h, j) => (
                  <div
                    key={j}
                    className="flex-1 rounded-t-lg bg-slate-200/70"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="flex gap-6 px-5 py-4 border-b border-slate-200">
            <Bloque className="h-3.5 w-28" />
            <Bloque className="h-3.5 w-24" />
            <Bloque className="h-3.5 w-20" />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100"
            >
              <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 min-w-0">
                <Bloque className="h-3 w-40 mb-1.5" />
                <Bloque className="h-2.5 w-28" />
              </div>
              <Bloque className="h-3 w-20 hidden md:block" />
              <Bloque className="h-3 w-24 hidden lg:block" />
              <Bloque className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/**
 * Franja de estado al pie de las tarjetas de cobro.
 *
 * Existe para que las dos tarjetas midan lo mismo: van en un grid de dos
 * columnas y estiran a la misma altura, así que si solo una lleva contenido
 * extra, la otra se queda con un hueco blanco enorme bajo su texto.
 */
const Franja = ({ children, tono = "neutro" }) => (
  <div
    className={`mt-3 rounded-lg px-3 py-2.5 border ${
      tono === "aviso"
        ? "bg-orange-50 border-orange-200"
        : "bg-white border-slate-200"
    }`}
  >
    {children}
  </div>
);

const Vacio = ({ icon, titulo, texto }) => (
  <div className="p-12 text-center">
    <i className={`bx ${icon} text-4xl text-slate-300 block mb-2`} />
    <p className="text-sm font-medium text-slate-600">{titulo}</p>
    {texto && <p className="text-xs text-slate-400 mt-1">{texto}</p>}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   Vista
   ───────────────────────────────────────────────────────────── */

export default function ReferidosView() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [tab, setTab] = useState("referidos");
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const cargar = useCallback(async () => {
    try {
      const { data: res } = await chatApi.get("referidos/mi-programa");
      setData(res.data);
    } catch (e) {
      Swal.fire(
        "No se pudo cargar",
        e?.response?.data?.message || "Inténtalo de nuevo en unos minutos.",
        "error",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const enlace = useMemo(() => armarEnlace(data?.codigo), [data?.codigo]);
  const serie = useMemo(
    () => serieCompleta(data?.serie_mensual),
    [data?.serie_mensual],
  );

  const top = useMemo(() => {
    if (!data?.referidos) return [];
    return data.referidos
      .filter((r) => r.generado_cent > 0)
      .sort((a, b) => b.generado_cent - a.generado_cent)
      .slice(0, 6)
      .map((r) => ({
        nombreCompleto: r.nombre || "—",
        nombre:
          (r.nombre || "—").length > 16
            ? `${(r.nombre || "").slice(0, 15)}…`
            : r.nombre || "—",
        generado: r.generado_cent / 100,
        meses: r.ciclos_pagados,
      }));
  }, [data?.referidos]);

  /* "Sin plan activo" se evalúa PRIMERO: quien no está pagando no pertenece a
     ninguna de las otras dos categorías, haya llegado al ciclo 3 o no. */
  const embudo = useMemo(() => {
    const rs = data?.referidos || [];
    return {
      comisionando: rs.filter((r) => esActivo(r) && r.comisiona).length,
      enCamino: rs.filter((r) => esActivo(r) && !r.comisiona).length,
      sinPlan: rs.filter((r) => !esActivo(r)).length,
    };
  }, [data?.referidos]);

  const referidosVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (data?.referidos || []).filter((r) => {
      if (q && !String(r.nombre || "").toLowerCase().includes(q)) return false;
      if (filtro === "comisionando") return esActivo(r) && r.comisiona;
      if (filtro === "camino") return esActivo(r) && !r.comisiona;
      if (filtro === "inactivos") return !esActivo(r);
      return true;
    });
  }, [data?.referidos, filtro, busqueda]);

  /* Totales de lo que se ve, no de todo: si filtró por "comisionando", el pie
     tiene que sumar eso y no el total general. */
  const totalesVisibles = useMemo(
    () => ({
      generado: referidosVisibles.reduce((a, r) => a + (r.generado_cent || 0), 0),
      mensual: referidosVisibles.reduce(
        (a, r) => a + (r.proxima_comision?.monto_cent || 0),
        0,
      ),
    }),
    [referidosVisibles],
  );

  const copiar = async () => {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      Swal.fire({
        icon: "success",
        title: "Enlace copiado",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire("Copia manual", enlace, "info");
    }
  };

  const compartirWhatsapp = () => {
    if (!enlace) return;
    /* El precio se enuncia como dato del producto, NO como beneficio del
       enlace: el cupón de primer mes lo tienen todos los planes y el enlace no
       aplica ninguno. Prometer lo contrario es una promesa que el sistema no
       cumple, y la descubre el invitado en el checkout. */
    const texto = `Te comparto mi acceso a Imporchat 👉 ${enlace}\n\nEl primer mes cuesta $5.`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(texto)}`,
      "_blank",
      "noopener",
    );
  };

  /**
   * Abre el comprobante que subió el administrador.
   *
   * Las imágenes se muestran dentro del modal —es lo que se quiere ver, no
   * descargar— y los PDF se abren en otra pestaña, porque un <img> con un PDF
   * dentro no pinta nada y parece que el comprobante no existe.
   */
  const verComprobante = (p) => {
    const url = p.comprobante_url;
    if (!url) return;
    if (/\.pdf($|\?)/i.test(url)) {
      window.open(url, "_blank", "noopener");
      return;
    }
    Swal.fire({
      title: `Comprobante · ${money(p.monto_cent)}`,
      html: `<p style="font-size:12px;color:#64748B;margin-bottom:10px">
               Transferencia del ${fecha(p.pagado_en || p.created_at)}${
                 p.referencia ? ` · Ref. ${p.referencia}` : ""
               }
             </p>
             <img src="${url}" alt="Comprobante de la transferencia"
                  style="max-width:100%;border-radius:12px;border:1px solid #E2E8F0" />`,
      width: 620,
      showCloseButton: true,
      showConfirmButton: false,
      footer: `<a href="${url}" target="_blank" rel="noopener" style="font-size:12px">Abrir en una pestaña nueva</a>`,
    });
  };

  const aplicarCredito = async () => {
    const f = data.credito?.proxima_factura;
    /* Con la factura delante, el usuario confirma sabiendo la cifra exacta que
       va a pagar. Sin ella queda en "se descontará algún día", que es
       justamente la duda que hace que nadie use este botón. */
    const detalle = f
      ? `<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px;margin-top:12px;text-align:left">
           <p style="font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin:0">
             Tu factura del ${fechaCorta(f.fecha)}
           </p>
           <p style="margin:6px 0 0;font-size:15px;color:#334155">
             <s style="color:#94A3B8">${money(f.total_cent)}</s>
             &nbsp;→&nbsp;
             <b style="color:#4338CA;font-size:20px">${money(f.a_pagar_con_saldo_cent)}</b>
           </p>
           ${
             f.saldo_restante_cent > 0
               ? `<p style="margin:4px 0 0;font-size:12px;color:#64748B">Te quedarían ${money(f.saldo_restante_cent)} para las siguientes facturas.</p>`
               : ""
           }
         </div>`
      : "";

    const confirma = await Swal.fire({
      icon: "question",
      title: "Pagar tu plan con este saldo",
      html: `Se aplicarán <b>${money(data.saldos.disponible_cent)}</b> como saldo a favor de tu cuenta de Imporchat.<br><br>Se descuentan solos de tu próxima mensualidad: si tu plan cuesta menos que este saldo, no pagas nada ese mes y el resto queda para el siguiente.${detalle}`,
      showCancelButton: true,
      confirmButtonText: "Sí, aplicar a mi plan",
      cancelButtonText: "Cancelar",
      confirmButtonColor: C.bien,
    });
    if (!confirma.isConfirmed) return;

    setEnviando(true);
    try {
      const { data: res } = await chatApi.post("referidos/aplicar-credito");
      Swal.fire("Listo", res.message, "success");
      cargar();
    } catch (e) {
      Swal.fire(
        "No se pudo aplicar",
        e?.response?.data?.message || "Inténtalo de nuevo.",
        "error",
      );
    } finally {
      setEnviando(false);
    }
  };

  const solicitarTransferencia = async () => {
    const { value: datos } = await Swal.fire({
      title: "Solicitar transferencia",
      input: "textarea",
      inputLabel: "Banco, tipo de cuenta, número y cédula del titular",
      inputPlaceholder:
        "Ej: Banco Pichincha, Ahorros, 2201234567, Juan Pérez, 1712345678",
      showCancelButton: true,
      confirmButtonText: "Enviar solicitud",
      cancelButtonText: "Cancelar",
      confirmButtonColor: C.bien,
      inputValidator: (v) =>
        !v || v.trim().length < 10 ? "Completa los datos de la cuenta" : null,
    });
    if (!datos) return;

    setEnviando(true);
    try {
      const { data: res } = await chatApi.post(
        "referidos/solicitar-transferencia",
        { datos_pago: datos },
      );
      Swal.fire("Solicitud enviada", res.message, "success");
      cargar();
    } catch (e) {
      Swal.fire(
        "No se pudo registrar",
        e?.response?.data?.message || "Inténtalo de nuevo.",
        "error",
      );
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <Esqueleto />;
  if (!data) return null;

  const { saldos, proyeccion } = data;
  /* `credito` puede no venir en respuestas viejas cacheadas: sin este respaldo,
     un despliegue a medias dejaría el botón muerto sin decir por qué. */
  const credito = data.credito || { puede: true, code: "OK", message: null };
  const factura = credito.proxima_factura;
  const puedeTransferir =
    saldos.disponible_cent >= data.umbral_transferencia_cent;
  const solicitudEnCurso = (data.pagos || []).find(
    (p) =>
      p.metodo === "transferencia" &&
      ["solicitado", "aprobado"].includes(p.estado),
  );
  const ultimoMes = serie[serie.length - 1]?.comision || 0;
  const hayMovimiento = serie.some((s) => s.comision !== 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-3 md:px-5 py-5">
      <div className="mx-auto w-full bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 overflow-hidden">
        {/* ═══════════ Cabecera ═══════════ */}
        <header className="relative isolate overflow-hidden">
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

          <div className="relative px-5 py-5 md:px-7 md:py-6 grid lg:grid-cols-[1.4fr_1fr] gap-5 lg:gap-8 items-start border-b border-white/10">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 ring-1 ring-white/15">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </span>
                ImporChat · Referidos
              </span>
              <h1 className="mt-2 text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
                Gana el 25% de lo que paguen{" "}
                <span className="bg-gradient-to-r from-indigo-300 to-violet-200 bg-clip-text text-transparent">
                  las personas que invites
                </span>
              </h1>
              <p className="mt-1 text-white/55 text-[13px] leading-snug max-w-3xl">
                Comparte tu enlace. Cada persona que se registre y permanezca te
                genera comisión mensual a partir de su tercer mes pagado.
              </p>

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <div className="flex-1 min-w-0 bg-black/25 rounded-xl px-4 py-2.5 font-mono text-[12.5px] break-all text-white/85 ring-1 ring-white/10">
                  {enlace || "Generando tu enlace…"}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={copiar}
                    disabled={!enlace}
                    className="px-4 py-2.5 bg-white text-[#171931] rounded-xl font-semibold text-[12.5px] hover:bg-slate-100 transition disabled:opacity-40 whitespace-nowrap"
                  >
                    <i className="bx bx-copy mr-1.5" />
                    Copiar
                  </button>
                  {/* Este verde NO es del tema: es el color de marca de
                      WhatsApp y se reconoce por eso. */}
                  <button
                    onClick={compartirWhatsapp}
                    disabled={!enlace}
                    className="px-4 py-2.5 bg-[#25D366] text-white rounded-xl font-semibold text-sm hover:brightness-110 transition disabled:opacity-40"
                    title="Compartir por WhatsApp"
                  >
                    <i className="bx bxl-whatsapp text-lg" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-white/40 mt-2">
                Tu código: <b className="text-white/70">{data.codigo || "—"}</b>
              </p>
            </div>

            {/* El saldo es LA cifra de esta pantalla */}
            <div className="bg-white/[0.07] border border-white/15 rounded-2xl p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Disponible para cobrar
              </p>
              <p className="text-[2.75rem] font-extrabold text-white tabular-nums mt-1 leading-none">
                {money(saldos.disponible_cent)}
              </p>
              <p className="text-[11px] text-white/45 mt-2 leading-snug">
                {saldos.disponible_cent > 0
                  ? "Disponible para usar. Elige la modalidad más abajo."
                  : "Aquí se refleja tu comisión una vez liberada."}
              </p>
            </div>
          </div>
        </header>

        <div className="p-3 md:p-5 space-y-4">
          {/* ═══════════ Cómo funciona ═══════════
              Va ANTES de las cifras a propósito: sin las reglas delante, los
              números de abajo no significan nada —un "$0.00 en espera" solo se
              entiende si antes leíste que la comisión arranca en el mes 3—. */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <i className="bx bx-book-open text-lg text-slate-400" />
              <h2 className="font-semibold text-slate-800 text-sm">
                Cómo funciona el programa
              </h2>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                {
                  n: 1,
                  titulo: "Comparte tu enlace",
                  texto:
                    "Quien se registre con él queda vinculado a tu cuenta de forma permanente.",
                },
                {
                  n: 2,
                  titulo: "Sus dos primeros meses",
                  texto:
                    "No generan comisión, y tampoco quedan acumulados: son los meses en que su plan tiene precio promocional.",
                },
                {
                  n: 3,
                  titulo: "Desde su tercer mes",
                  texto:
                    "Recibes el 25% de cada mensualidad que pague. A partir del mes 13, el 10% de forma permanente.",
                },
                {
                  n: 4,
                  titulo: "Disponible a los 30 días",
                  texto:
                    "Cada comisión se libera un mes después del pago. Desde ahí la usas en tu plan o la recibes en tu banco.",
                },
              ].map((p) => (
                <div key={p.n} className="relative pl-11">
                  <span className="absolute left-0 top-0 w-8 h-8 rounded-xl bg-indigo-600 text-white grid place-items-center text-sm font-bold">
                    {p.n}
                  </span>
                  <p className="font-semibold text-slate-800 text-[13px] leading-tight pt-1">
                    {p.titulo}
                  </p>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed mt-1">
                    {p.texto}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 mt-5 pt-4 border-t border-slate-100 leading-relaxed">
              La comisión se calcula sobre el importe{" "}
              <b className="text-slate-500">facturado a tu referido</b>: si abona
              con descuento, la comisión se reduce en la misma proporción. Si
              solicita un reembolso o desconoce el cargo, la comisión
              correspondiente se revierte. No es posible referir cuentas
              propias.
            </p>
          </div>

          {/* ═══════════ Cifras ═══════════
              Todas con tooltip: cada una responde una pregunta distinta y sin
              explicación se confunden entre sí —"en espera" contra "por
              llegar" es la que más se confunde—. */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Kpi
              label="Este mes"
              valor={`$${ultimoMes.toFixed(2)}`}
              detalle="Comisión del mes en curso"
              color={C.bien}
              icon="bx-trending-up"
              ayuda="Comisión devengada durante el mes en curso. Se incrementa cada vez que uno de tus referidos abona su mensualidad."
            />
            <Kpi
              label="En espera"
              valor={money(saldos.pendiente_cent)}
              detalle="Se libera 30 días después de cada pago"
              color={C.espera}
              icon="bx-time-five"
              ayuda="Comisión ya devengada que aún no puede utilizarse. Permanece 30 días desde el pago del referido, plazo en el que todavía puede solicitarse una devolución. Cumplido ese periodo pasa automáticamente a Disponible."
            />
            <Kpi
              label="Ya cobrado"
              valor={money(saldos.pagado_cent)}
              detalle="Total retirado hasta hoy"
              icon="bx-check-double"
              ayuda="Importe total que ya has retirado, sea como descuento en tu plan o mediante transferencia bancaria."
            />
            <Kpi
              label="Próxima comisión"
              valor={
                proyeccion?.proxima
                  ? `≈${money(proyeccion.proxima.monto_cent)}`
                  : "—"
              }
              detalle={
                proyeccion?.proxima
                  ? `El ${fechaCorta(proyeccion.proxima.fecha)}`
                  : "Sin referidos próximos a comisionar"
              }
              color={C.espera}
              icon="bx-calendar-star"
              ayuda="Próxima comisión que se generará y su fecha estimada. Se calcula sobre el precio de lista del plan del referido: si abona con descuento, la comisión se reduce en la misma proporción."
              destacado
            />
            <Kpi
              label="Cuando todos maduren"
              valor={
                proyeccion?.mensual_cent
                  ? `${money(proyeccion.mensual_cent)}`
                  : "—"
              }
              detalle={
                proyeccion?.referidos_en_camino
                  ? `Mensual, con ${proyeccion.referidos_en_camino} referidos activos`
                  : "Sin referidos activos por ahora"
              }
              color={C.bien}
              icon="bx-line-chart"
              ayuda="Comisión mensual que alcanzarías una vez que todos tus referidos activos superen su tercer mes pagado. No es saldo disponible: es la proyección de tu ingreso recurrente si todos mantienen su plan."
              destacado
            />
            <Kpi
              label="Tus referidos"
              valor={data.referidos.length}
              detalle={`${embudo.comisionando} generan comisión`}
              icon="bx-group"
              ayuda="Personas registradas mediante tu enlace o provenientes de tu comunidad. No todas generan comisión: deben tener un plan activo y haber superado su tercer mes pagado."
            />
          </div>

          {/* ═══════════ Cómo cobrar ═══════════
              Antes eran dos botones sueltos con una línea de letra chica. Cada
              opción hace algo bastante distinto con el dinero y merece su
              propia explicación: sin ella, "aplicar crédito" no le dice nada a
              nadie. */}
          <Panel
            icon="bx-wallet"
            title="Cómo cobras tu dinero"
            subtitle="Dos modalidades disponibles. Puedes alternar entre ellas en cualquier momento"
          >
            <div className="px-5 pb-5 grid md:grid-cols-2 gap-3">
              {/* Crédito */}
              <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/40 p-4 flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded-xl bg-indigo-600 grid place-items-center shrink-0">
                    <i className="bx bx-credit-card-front text-lg text-white" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm leading-tight">
                      Pagar tu plan de Imporchat
                    </p>
                    <p className="text-[11px] text-indigo-600 font-semibold">
                      Inmediato · sin mínimo
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-3 flex-1">
                  Tu comisión se acredita como saldo a favor en tu cuenta de
                  Imporchat. Tu próxima mensualidad se emite{" "}
                  <b>descontando ese saldo</b>, y si lo cubre por completo, ese
                  mes no se te cobra nada: el remanente queda acreditado para
                  las siguientes. Se aplica de inmediato, sin importe mínimo ni
                  aprobación previa.
                </p>

                {/* Una sola franja, no tres bloques apilados: la tarjeta de al
                    lado crece con esta y el desbalance deja un hueco enorme. */}
                {factura ? (
                  <Franja>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Próxima factura · {fechaCorta(factura.fecha)}
                      </span>
                      <span className="whitespace-nowrap">
                        <s className="text-slate-400 tabular-nums">
                          {money(factura.total_cent)}
                        </s>
                        <i className="bx bx-right-arrow-alt mx-1 text-slate-400 align-middle" />
                        <b className="text-indigo-700 tabular-nums text-[13.5px]">
                          {money(
                            saldos.disponible_cent > 0
                              ? factura.a_pagar_con_saldo_cent
                              : factura.a_pagar_ahora_cent,
                          )}
                        </b>
                      </span>
                    </div>
                    {/* El sobrante lleva SU nombre: es saldo en la cuenta de
                        facturación, no comisiones por cobrar. Decir "te
                        quedarían $41 a favor" cuando el saldo del programa es
                        $35 se lee como un número inventado, y son dos bolsillos
                        distintos. Solo se desglosa si venías con crédito de
                        antes, que es el único caso que necesita explicación. */}
                    {factura.saldo_restante_cent > 0 && (
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Sobran{" "}
                        <b className="text-slate-700">
                          {money(factura.saldo_restante_cent)}
                        </b>
                        , que se descuentan de las facturas siguientes
                        {credito.credito_en_cuenta_cent > 0 &&
                        saldos.disponible_cent > 0
                          ? ` (${money(credito.credito_en_cuenta_cent)} que ya tenías a favor + ${money(saldos.disponible_cent)} de este cobro − ${money(factura.total_cent)} de la factura)`
                          : ""}
                        .
                      </p>
                    )}
                  </Franja>
                ) : credito.credito_en_cuenta_cent > 0 ? (
                  <Franja>
                    <p className="text-[11.5px] text-slate-600 leading-snug">
                      Ya tienes{" "}
                      <b className="text-indigo-700">
                        {money(credito.credito_en_cuenta_cent)}
                      </b>{" "}
                      a favor en tu cuenta de facturación. Se descontará solo en
                      cuanto se emita tu próxima factura.
                    </p>
                  </Franja>
                ) : null}

                {/* Por qué no se puede —un botón apagado sin explicación se lee
                    como que el programa no paga— y también los avisos que no
                    bloquean, como una factura vencida. */}
                {credito.message && (
                  <Franja tono="aviso">
                    <p className="text-[11.5px] text-orange-900 leading-snug">
                      {credito.message}
                      {NECESITA_PLAN.has(credito.code) && (
                        <button
                          onClick={() => navigate("/planes")}
                          className="ml-1 font-bold underline underline-offset-2"
                        >
                          Ver los planes
                        </button>
                      )}
                    </p>
                  </Franja>
                )}

                <button
                  onClick={aplicarCredito}
                  disabled={
                    enviando || saldos.disponible_cent <= 0 || !credito.puede
                  }
                  className="mt-4 w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-[13px] font-bold hover:bg-indigo-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {saldos.disponible_cent <= 0
                    ? "Sin saldo disponible"
                    : !credito.puede
                      ? "No disponible ahora"
                      : `Aplicar ${money(saldos.disponible_cent)} a mi plan`}
                </button>
              </div>

              {/* Transferencia */}
              <div className="rounded-xl border-2 border-slate-200 p-4 flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded-xl bg-slate-700 grid place-items-center shrink-0">
                    <i className="bx bx-transfer text-lg text-white" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm leading-tight">
                      Recibirlo en tu banco
                    </p>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      Desde {money0(data.umbral_transferencia_cent)} · revisión
                      manual
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-3 flex-1">
                  Recibes el importe en tu cuenta bancaria. Registras los datos
                  del titular, verificamos la solicitud y procesamos la
                  transferencia. Durante la verificación el saldo queda
                  reservado y no puede destinarse al pago de tu plan.
                </p>

                {/* Contrapeso de la franja de la tarjeta de al lado, y de paso
                    el dato que falta: a qué distancia estás del mínimo. */}
                {solicitudEnCurso ? (
                  <Franja>
                    <p className="text-[11.5px] text-slate-600 leading-snug">
                      Tu solicitud de{" "}
                      <b className="text-slate-800">
                        {money(solicitudEnCurso.monto_cent)}
                      </b>{" "}
                      está en revisión desde el{" "}
                      {fecha(solicitudEnCurso.created_at)}.
                    </p>
                  </Franja>
                ) : puedeTransferir ? (
                  <Franja>
                    <p className="text-[11.5px] text-slate-600 leading-snug">
                      Puedes pedir{" "}
                      <b className="text-slate-800">
                        {money(saldos.disponible_cent)}
                      </b>
                      . Se transfiere tras revisar los datos de la cuenta.
                    </p>
                  </Franja>
                ) : (
                  <Franja>
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Para el mínimo te faltan
                      </span>
                      <b className="text-[13.5px] text-slate-700 tabular-nums">
                        {money(
                          data.umbral_transferencia_cent -
                            saldos.disponible_cent,
                        )}
                      </b>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-slate-400"
                        style={{
                          width: `${Math.min(100, Math.round((saldos.disponible_cent / (data.umbral_transferencia_cent || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  </Franja>
                )}

                <button
                  onClick={solicitarTransferencia}
                  disabled={enviando || !puedeTransferir || !!solicitudEnCurso}
                  className="mt-4 w-full px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-[13px] font-bold hover:border-slate-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {/* Con una solicitud abierta el saldo está reservado y el
                      disponible es cero: decir "necesitas $30" ahí sería
                      mentir sobre el motivo. */}
                  {solicitudEnCurso
                    ? "Tienes una solicitud en revisión"
                    : puedeTransferir
                      ? `Solicitar ${money(saldos.disponible_cent)}`
                      : `Necesitas ${money0(data.umbral_transferencia_cent)} para pedirla`}
                </button>
              </div>
            </div>

            {saldos.reservado_cent > 0 && (
              <div className="mx-5 mb-5 -mt-1 rounded-xl bg-orange-50 border border-orange-200 px-4 py-2.5">
                <p className="text-[11px] text-orange-800">
                  <i className="bx bx-time-five mr-1" />
                  {money(saldos.reservado_cent)} están reservados en una
                  solicitud de transferencia en curso. Se liberarán si la solicitud
                  no prospera.
                </p>
              </div>
            )}
          </Panel>

          {/* ═══════════ Gráficos ═══════════
              Los tres en una sola fila. El estado de la cartera estaba antes
              en una sección propia a lo ancho y gastaba una franja entera de
              alto para mostrar tres números. */}
          <div className="grid lg:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr] gap-4">
            <Panel
              icon="bx-line-chart"
              title="Comisiones por mes"
              subtitle="Últimos 6 meses · las comisiones revertidas se descuentan del mes"
            >
              <div className="h-56 px-2 pb-4">
                {hayMovimiento ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={serie}
                      margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="gradRef" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.bien} stopOpacity={0.22} />
                          <stop offset="100%" stopColor={C.bien} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={C.grid} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: C.eje }}
                        axisLine={{ stroke: C.grid }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: C.eje }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        content={<TooltipMes />}
                        cursor={{ stroke: C.bien, strokeWidth: 1 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="comision"
                        stroke={C.bien}
                        strokeWidth={2}
                        fill="url(#gradRef)"
                        dot={{ r: 3, fill: C.bien, stroke: "#fff", strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: C.bien, stroke: "#fff", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Vacio
                    icon="bx-line-chart"
                    titulo="Sin comisiones registradas"
                    texto="Se registrarán cuando tu primer referido alcance su tercer mes"
                  />
                )}
              </div>
            </Panel>

            <Panel
              icon="bx-medal"
              title="Quién te genera más"
              subtitle="Acumulado por referido"
            >
              <div className="h-56 px-2 pb-4">
                {top.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={top}
                      layout="vertical"
                      margin={{ top: 8, right: 20, left: 0, bottom: 0 }}
                      barCategoryGap="22%"
                    >
                      <CartesianGrid stroke={C.grid} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: C.eje }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="nombre"
                        tick={{ fontSize: 11, fill: C.eje }}
                        axisLine={false}
                        tickLine={false}
                        width={96}
                      />
                      <Tooltip
                        content={<TooltipTop />}
                        cursor={{ fill: "rgba(79,70,229,0.06)" }}
                      />
                      {/* Un solo color: la longitud ya codifica la magnitud,
                          teñir por tamaño duplicaría la misma información. */}
                      <Bar dataKey="generado" radius={[0, 4, 4, 0]} maxBarSize={20}>
                        {top.map((t) => (
                          <Cell key={t.nombreCompleto} fill={C.bien} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Vacio
                    icon="bx-medal"
                    titulo="Sin comisiones registradas"
                    texto="Aquí aparecerán tus referidos con mayor aporte"
                  />
                )}
              </div>
            </Panel>

            <Panel
              icon="bx-pie-chart-alt-2"
              title="Estado de tus referidos"
              subtitle="La comisión arranca en el tercer mes pagado"
            >
              {data.referidos.length ? (
                <Dona {...embudo} />
              ) : (
                <Vacio
                  icon="bx-group"
                  titulo="Sin referidos registrados"
                  texto="Comparte tu enlace para comenzar"
                />
              )}
            </Panel>
          </div>

          {/* ═══════════ Tablas ═══════════ */}
          <div className="bg-white rounded-2xl border border-slate-200">
            {/* flex-wrap y NO overflow-x-auto: una barra de scroll sobre los
                títulos se lee como si las pestañas estuvieran rotas. El scroll
                va en los datos, más abajo. */}
            <div className="flex flex-wrap gap-1 px-2 pt-1 border-b border-slate-200">
              {[
                ["referidos", "Mis referidos", data.referidos.length],
                ["comisiones", "Comisiones", data.comisiones.length],
                ["pagos", "Cobros", data.pagos.length],
              ].map(([k, label, n]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
                    tab === k
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                  {n > 0 && (
                    <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full tabular-nums">
                      {n}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ─── Referidos ─── */}
            {tab === "referidos" &&
              (data.referidos.length === 0 ? (
                <Vacio
                  icon="bx-user-plus"
                  titulo="Aún no hay registros con tu enlace"
                  texto="Compártelo desde los botones de la cabecera"
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex gap-1 flex-wrap">
                      {FILTROS.map((f) => {
                        const n =
                          f.k === "todos"
                            ? data.referidos.length
                            : f.k === "comisionando"
                              ? embudo.comisionando
                              : f.k === "camino"
                                ? embudo.enCamino
                                : embudo.sinPlan;
                        return (
                          <button
                            key={f.k}
                            onClick={() => setFiltro(f.k)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${
                              filtro === f.k
                                ? "bg-white text-[#171931] shadow-sm ring-1 ring-slate-200"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            {f.label}
                            <span className="ml-1.5 text-[10px] text-slate-400 tabular-nums">
                              {n}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="relative ml-auto">
                      <i className="bx bx-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                      <input
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre…"
                        className="pl-8 pr-3 py-1.5 text-[12px] rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-400 w-44"
                      />
                    </div>
                  </div>

                  {/* max-h ≈ 9 filas: pasado eso la tabla empuja el resto de la
                      página fuera de la pantalla. La cabecera va sticky para
                      que al bajar no se pierda de qué es cada columna. */}
                  <div className="overflow-auto max-h-[30rem]">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">Usuario</th>
                          <th className="text-left px-4 py-3 font-semibold">Plan</th>
                          <th className="text-left px-4 py-3 font-semibold">Cuenta creada</th>
                          <th className="text-left px-4 py-3 font-semibold">Avance</th>
                          <th className="text-right px-4 py-3 font-semibold">Te genera</th>
                          <th className="text-right px-4 py-3 font-semibold">Acumulado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {referidosVisibles.map((r) => (
                          <tr key={r.id_usuario} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold text-white shrink-0"
                                  style={{
                                    backgroundColor:
                                      esActivo(r) && r.comisiona ? C.bien : C.neutro,
                                  }}
                                >
                                  {(r.nombre || "?").slice(0, 2).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-800 truncate">
                                    {r.nombre}
                                  </p>
                                  <p className="text-[11px] text-slate-400 truncate">
                                    {r.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {r.plan || <span className="text-slate-400">Sin plan</span>}
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                              {fecha(r.referido_en)}
                              <span className="block text-[10px] text-slate-400">
                                {antiguedad(r.referido_en)}
                                {r.origen === "comunidad" && " · vía comunidad"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {!esActivo(r) ? (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">
                                  <i className="bx bx-pause-circle" />
                                  Sin plan activo
                                </span>
                              ) : r.comisiona ? (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                                  <i className="bx bx-check-circle" />
                                  Comisionando
                                </span>
                              ) : (
                                <div>
                                  {/* Barra de 3 pasos: la forma más corta de
                                      explicar por qué este referido aún da $0 */}
                                  <div className="flex gap-1 mb-1">
                                    {[0, 1, 2].map((i) => (
                                      <span
                                        key={i}
                                        className="h-1.5 w-6 rounded-full"
                                        style={{
                                          backgroundColor:
                                            i < r.ciclos_pagados ? C.espera : "#E2E8F0",
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-[11px] text-slate-500">
                                    {r.ciclos_faltantes === 0
                                      ? "Comisiona en su próximo pago"
                                      : `Faltan ${r.ciclos_faltantes} mes${r.ciclos_faltantes === 1 ? "" : "es"}`}
                                  </span>
                                </div>
                              )}
                            </td>
                            {/* Valor RECURRENTE: lo que esa persona deja cada
                                mes. Un referido viejo con plan barato puede
                                tener más acumulado y valer menos hacia
                                adelante; el acumulado solo no lo dice. */}
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              {r.proxima_comision ? (
                                <>
                                  <span className="font-bold text-slate-800 tabular-nums">
                                    {money(r.proxima_comision.monto_cent)}
                                  </span>
                                  <span className="text-[11px] text-slate-400">/mes</span>
                                  <span className="block text-[10px] text-slate-400">
                                    {r.comisiona
                                      ? `${r.proxima_comision.porcentaje}% de su plan`
                                      : `desde el ${fechaCorta(r.proxima_comision.fecha)}`}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums">
                              {money(r.generado_cent)}
                            </td>
                          </tr>
                        ))}
                        {referidosVisibles.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-10 text-center">
                              <p className="text-sm text-slate-500">
                                Ningún referido coincide con ese filtro
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Los totales viven FUERA del área con scroll: si van dentro
                      del tfoot hay que bajar hasta el final para verlos, que es
                      justo lo contrario de para qué sirven. */}
                  {referidosVisibles.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {referidosVisibles.length} de {data.referidos.length} referidos
                      </span>
                      <span className="ml-auto text-xs text-slate-500">
                        Te generan{" "}
                        <b className="text-slate-800 tabular-nums">
                          {money(totalesVisibles.mensual)}
                        </b>
                        /mes
                      </span>
                      <span className="text-xs text-slate-500">
                        Acumulado{" "}
                        <b className="text-slate-800 tabular-nums">
                          {money(totalesVisibles.generado)}
                        </b>
                      </span>
                    </div>
                  )}
                </>
              ))}

            {/* ─── Comisiones ─── */}
            {tab === "comisiones" &&
              (data.comisiones.length === 0 ? (
                <Vacio
                  icon="bx-receipt"
                  titulo="Todavía no hay comisiones devengadas"
                  texto="Se registran automáticamente con cada pago de tus referidos"
                />
              ) : (
                <div className="overflow-auto max-h-[30rem] rounded-b-2xl">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Fecha</th>
                        <th className="text-left px-4 py-3 font-semibold">Referido</th>
                        <th className="text-left px-4 py-3 font-semibold">Mes</th>
                        <th className="text-right px-4 py-3 font-semibold">Él pagó</th>
                        <th className="text-right px-4 py-3 font-semibold">Tu %</th>
                        <th className="text-right px-4 py-3 font-semibold">Comisión</th>
                        <th className="text-left px-4 py-3 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.comisiones.map((c) => {
                        const est = ESTADO_COMISION[c.estado] || {
                          label: c.estado,
                          cls: "bg-slate-100 text-slate-600",
                        };
                        const negativa = Number(c.monto_comision_cent) < 0;
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                              {fecha(c.created_at)}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {c.nombre_referido || "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-600 tabular-nums">
                              {c.ciclo_num}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                              {money(c.monto_base_cent)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                              {Number(c.porcentaje)}%
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-bold tabular-nums ${negativa ? "text-rose-600" : "text-slate-800"}`}
                            >
                              {money(c.monto_comision_cent)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-[11px] px-2 py-1 rounded-full font-semibold ${est.cls}`}
                                title={c.motivo_reversion || ""}
                              >
                                {est.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}

            {/* ─── Cobros ─── */}
            {tab === "pagos" &&
              (data.pagos.length === 0 ? (
                <Vacio
                  icon="bx-money-withdraw"
                  titulo="Aún no has realizado ningún cobro"
                  texto="Con saldo disponible podrás aplicarlo a tu plan o solicitar una transferencia"
                />
              ) : (
                <div className="overflow-auto max-h-[30rem] rounded-b-2xl">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Fecha</th>
                        <th className="text-left px-4 py-3 font-semibold">Método</th>
                        <th className="text-right px-4 py-3 font-semibold">Monto</th>
                        <th className="text-left px-4 py-3 font-semibold">Estado</th>
                        <th className="text-left px-4 py-3 font-semibold">Referencia</th>
                        <th className="text-left px-4 py-3 font-semibold">Comprobante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.pagos.map((p) => {
                        const est = ESTADO_PAGO[p.estado] || {
                          label: p.estado,
                          cls: "bg-slate-100 text-slate-600",
                        };
                        const esTransferencia = p.metodo !== "credito";
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70 align-top">
                            <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                              {fecha(p.created_at)}
                              {p.pagado_en && (
                                <span className="block text-[10px] text-slate-400">
                                  Pagada el {fecha(p.pagado_en)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              <span className="whitespace-nowrap">
                                <i
                                  className={`bx ${p.metodo === "credito" ? "bx-credit-card-front" : "bx-transfer"} mr-1 text-slate-400`}
                                />
                                {p.metodo === "credito"
                                  ? "Descuento en tu plan"
                                  : "Transferencia"}
                              </span>
                              {/* La cuenta destino se muestra siempre: es el
                                  dato que permite detectar un número mal
                                  escrito ANTES de reclamar por un dinero que
                                  se fue a otro lado. */}
                              {esTransferencia && p.datos_pago && (
                                <span
                                  className="block text-[10px] text-slate-400 max-w-[15rem] truncate"
                                  title={p.datos_pago}
                                >
                                  {p.datos_pago}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums">
                              {money(p.monto_cent)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-[11px] px-2 py-1 rounded-full font-semibold ${est.cls}`}
                              >
                                {est.label}
                              </span>
                              {p.nota_admin && (
                                <span className="block text-[10px] text-slate-500 mt-1 max-w-[13rem]">
                                  {p.nota_admin}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-[11px] font-mono break-all max-w-[10rem]">
                              {p.referencia || "—"}
                            </td>
                            <td className="px-4 py-3">
                              {p.comprobante_url ? (
                                <button
                                  onClick={() => verComprobante(p)}
                                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition"
                                >
                                  <i className="bx bx-receipt text-sm" />
                                  Ver comprobante
                                </button>
                              ) : p.estado === "pagado" && esTransferencia ? (
                                <span className="text-[11px] text-slate-400">
                                  Sin adjuntar
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
