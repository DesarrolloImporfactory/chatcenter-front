import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import chatApi from "../../api/chatcenter";
import PendingQueue from "./PendingQueue";
import { formatDuration } from "../../utils/parseEventDef";
import { usePresence } from "../../context/PresenceProvider";

/**
 * Resumen de ATENCIÓN de una conexión (reemplaza al Resumen de ventas cuando
 * la conexión está en modo "atencion", ver /dashboard/modo en el back).
 *
 * De arriba a abajo:
 *   1. Quién está esperando ahora y desde cuándo (cola de espera).
 *   2. Una tarjeta por asesor del equipo con tres cosas en grande:
 *      cuántos chats atendió, cuánto tarda en contestarle al cliente y cuánto
 *      se demora desde que abre el chat. Debajo, un gráfico de barras con los
 *      chats que atendió en cada hora del día.
 *   3. Quién más contestó sin ser del equipo (por ejemplo desde el celular).
 *
 * El equipo son los subusuarios de los departamentos de la conexión (los
 * mismos que reparten chats en /departamentos), no toda la cuenta.
 *
 * Datos: POST /dashboard/obtener_dashboard_completo con las secciones
 * pendingQueue y atencionAsesores (cache de 60s en el back). Se refresca
 * solo cada minuto mientras la pestaña esté visible.
 */

const DATE_PRESETS = [
  { label: "Hoy", days: 0 },
  { label: "7 días", days: 7 },
  { label: "15 días", days: 15 },
  { label: "30 días", days: 30 },
];

const REFRESCO_MS = 60_000;

function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toYMD(d);
}

const fmtSeg = (seg) => (seg == null ? "—" : formatDuration(seg));
const fmtMin = (seg) => {
  if (!seg) return "0m";
  const m = Math.round(seg / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const hh = (h) => `${String(h).padStart(2, "0")}:00`;

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Nombres que trae `responsable` cuando no es un asesor del sistema. */
const NOMBRES_OTROS = {
  "whatsapp business": {
    nombre: "Desde el celular",
    detalle: "Respuestas enviadas desde la app WhatsApp Business del teléfono: no se sabe qué asesor fue.",
  },
  "messenger inbox": {
    nombre: "Desde la app de Messenger",
    detalle: "Respuestas enviadas desde el inbox de la página en Meta, no desde ChatCenter: no se sabe qué asesor fue.",
  },
  "instagram inbox": {
    nombre: "Desde la app de Instagram",
    detalle: "Respuestas enviadas desde el inbox de Instagram, no desde ChatCenter: no se sabe qué asesor fue.",
  },
};
const describirOtro = (o) => {
  const conocido = NOMBRES_OTROS[String(o.nombre || "").toLowerCase()];
  if (conocido) return conocido;
  if (o.origen === "fuera_del_equipo") {
    return {
      nombre: o.nombre,
      detalle: "Es de la cuenta pero no está en el departamento de esta conexión.",
    };
  }
  return {
    nombre: o.nombre,
    detalle: "Respuestas por la API o con un nombre que no coincide con ningún asesor.",
  };
};

/** Color del semáforo para un tiempo en segundos. */
function nivelDe(seg, umbrales) {
  if (seg == null) return "sin";
  const min = seg / 60;
  if (min >= umbrales.critico) return "critico";
  if (min >= umbrales.advertencia) return "advertencia";
  return "ok";
}
const TEMA = {
  ok: {
    caja: "bg-emerald-50 border-emerald-200",
    valor: "text-emerald-700",
    texto: "bien",
  },
  advertencia: {
    caja: "bg-orange-50 border-orange-200",
    valor: "text-orange-700",
    texto: "lento",
  },
  critico: {
    caja: "bg-rose-50 border-rose-200",
    valor: "text-rose-700",
    texto: "muy lento",
  },
  sin: {
    caja: "bg-slate-50 border-slate-200",
    valor: "text-slate-400",
    texto: "sin datos",
  },
};

function Kpi({ icon, color, label, value, sub, title }) {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      title={title}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg grid place-items-center"
          style={{ background: `${color}15` }}
        >
          <i className={`bx ${icon} text-base`} style={{ color }} />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 leading-none">
        {value}
      </div>
      {sub ? <div className="mt-1.5 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

/** Dato grande con semáforo: "Tarda en contestar · 24 min · muy lento". */
function DatoSemaforo({ etiqueta, seg, umbrales, ayuda }) {
  const tema = TEMA[nivelDe(seg, umbrales)];
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${tema.caja}`}
      title={ayuda}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {etiqueta}
      </div>
      <div className={`text-xl font-extrabold leading-tight ${tema.valor}`}>
        {fmtSeg(seg)}
      </div>
      <div className={`text-[11px] font-semibold ${tema.valor}`}>
        {tema.texto}
      </div>
    </div>
  );
}

function TooltipHora({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md">
      <div className="font-bold text-slate-800">{hh(d.h)}</div>
      <div className="text-slate-600">
        {d.chats} chats · {d.mensajes} mensajes
      </div>
      <div className="text-slate-500">
        {d.conectadoMin ? `${d.conectadoMin} min conectado` : "desconectado"}
      </div>
    </div>
  );
}

/** Barras: chats atendidos en cada hora. Barra ámbar bajita = estuvo
 *  conectado esa hora pero no atendió a nadie; sin barra = desconectado. */
function GraficoHoras({ porHora, horas, maxChats }) {
  const datos = horas.map((h) => {
    const c = porHora[h];
    const conectadoMin = Math.round(c.conectado_seg / 60);
    const sinResponder = c.chats === 0 && conectadoMin >= 5;
    return {
      h,
      label: `${h}h`,
      chats: c.chats,
      mensajes: c.mensajes,
      conectadoMin,
      valor: sinResponder ? Math.max(0.35, maxChats * 0.08) : c.chats,
      color: sinResponder ? "#fbbf24" : "#059669",
    };
  });
  return (
    <div className="h-[110px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={datos}
          margin={{ top: 14, right: 4, left: -22, bottom: 0 }}
          barCategoryGap="22%"
        >
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, Math.max(2, maxChats)]}
            tick={{ fontSize: 10, fill: "#cbd5e1" }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip content={<TooltipHora />} cursor={{ fill: "#f1f5f9" }} />
          <Bar
            dataKey="valor"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            label={{
              position: "top",
              fontSize: 10,
              fill: "#334155",
              formatter: (v, entry) =>
                entry?.payload?.chats > 0 ? entry.payload.chats : "",
            }}
          >
            {datos.map((d) => (
              <Cell key={d.h} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TarjetaAsesor({ a, horas, maxChats, umbrales, online }) {
  const totalResp = a.ok + a.advertencia + a.critico;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Quién */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 grid place-items-center text-sm font-bold text-white">
            {getInitials(a.nombre)}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white ${
              online ? "bg-emerald-500" : "bg-slate-300"
            }`}
            title={online ? "Conectado ahora" : "Desconectado"}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold text-slate-900">
            {a.nombre}
          </div>
          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-800">{a.chats}</span> chats
            atendidos · {a.mensajes} mensajes ·{" "}
            <span className="font-semibold">{fmtMin(a.conectado_seg)}</span>{" "}
            conectado
            {online ? (
              <span className="ml-1 text-emerald-600 font-semibold">
                · en línea
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Los dos tiempos */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <DatoSemaforo
          etiqueta="Tarda en contestar"
          seg={a.mediana_seg}
          umbrales={umbrales}
          ayuda={`Desde que el cliente escribe hasta que ${a.nombre} responde (mediana de ${a.respuestas} respuestas, en horario laboral).`}
        />
        <DatoSemaforo
          etiqueta="Desde que abre el chat"
          seg={a.manejo_mediana_seg}
          umbrales={umbrales}
          ayuda={
            a.manejos
              ? `Desde que abre el chat hasta que envía la respuesta (mediana de ${a.manejos} chats). Es el cronómetro que ve en la cabecera.`
              : "Todavía no hay chats abiertos con el cronómetro nuevo."
          }
        />
      </div>

      {/* Semáforo de sus respuestas */}
      {totalResp > 0 ? (
        <div className="mt-2">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="bg-emerald-500"
              style={{ width: `${pct(a.ok, totalResp)}%` }}
            />
            <div
              className="bg-orange-400"
              style={{ width: `${pct(a.advertencia, totalResp)}%` }}
            />
            <div
              className="bg-rose-500"
              style={{ width: `${pct(a.critico, totalResp)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px]">
            <span className="text-emerald-600 font-semibold">
              {pct(a.ok, totalResp)}% contestó en menos de{" "}
              {umbrales.advertencia} min
            </span>
            <span className="text-rose-600 font-semibold">
              {pct(a.critico, totalResp)}% tardó más de {umbrales.critico} min
            </span>
          </div>
        </div>
      ) : null}

      {/* Por hora */}
      <div className="mt-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Chats atendidos por hora
        </div>
        <GraficoHoras porHora={a.por_hora} horas={horas} maxChats={maxChats} />
      </div>
    </div>
  );
}

const DIAS = [
  { n: 1, l: "L" },
  { n: 2, l: "M" },
  { n: 3, l: "X" },
  { n: 4, l: "J" },
  { n: 5, l: "V" },
  { n: 6, l: "S" },
  { n: 0, l: "D" },
];
const nombreDias = (dias = []) => {
  const set = new Set(dias);
  const orden = [1, 2, 3, 4, 5, 6, 0];
  const activos = orden.filter((d) => set.has(d));
  const etiqueta = { 1: "lun", 2: "mar", 3: "mié", 4: "jue", 5: "vie", 6: "sáb", 0: "dom" };
  if (activos.length === 0) return "ningún día";
  // Rango seguido (lun-vie) o lista (lun, mié, vie)
  const idx = activos.map((d) => orden.indexOf(d));
  const seguido = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (seguido && activos.length > 2) {
    return `${etiqueta[activos[0]]}-${etiqueta[activos[activos.length - 1]]}`;
  }
  return activos.map((d) => etiqueta[d]).join(", ");
};

/**
 * Horario de atención de la conexión: lo edita el administrador aquí mismo.
 * Todos los tiempos (tarda en contestar, desde que abre el chat, cronómetro
 * de la cabecera) cuentan solo dentro de este horario.
 */
function HorarioEditor({ configId, horario, onGuardado }) {
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(() => ({
    inicio: horario.inicio,
    fin: horario.fin,
    dias: horario.dias || [1, 2, 3, 4, 5],
  }));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!abierto) {
      setForm({
        inicio: horario.inicio,
        fin: horario.fin,
        dias: horario.dias || [1, 2, 3, 4, 5],
      });
    }
  }, [horario, abierto]);

  const toggleDia = (n) =>
    setForm((f) => ({
      ...f,
      dias: f.dias.includes(n)
        ? f.dias.filter((d) => d !== n)
        : [...f.dias, n],
    }));

  const guardar = async () => {
    setGuardando(true);
    setError("");
    try {
      const { data } = await chatApi.post("/dashboard/atencion/horario", {
        id_configuracion: configId,
        hora_inicio: form.inicio,
        hora_fin: form.fin,
        dias: form.dias,
      });
      onGuardado?.(data?.data || form);
      setAbierto(false);
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
        title="Los tiempos se cuentan solo dentro de este horario. Clic para cambiarlo."
      >
        <i className="bx bx-time text-sm text-indigo-500" />
        Horario: {hh(horario.inicio)}–{hh(horario.fin)} · {nombreDias(horario.dias)}
        <i className="bx bx-edit-alt text-sm text-slate-400" />
      </button>
    );
  }

  const horas = Array.from({ length: 25 }, (_, i) => i);
  return (
    <div className="w-full rounded-xl border border-indigo-200 bg-indigo-50/40 px-3 py-2.5">
      <div className="mb-2">
        <div className="text-xs font-bold text-slate-800">
          <i className="bx bx-time text-indigo-500" /> Horario de atención de
          esta conexión
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500 max-w-2xl">
          Sirve para medir los tiempos con justicia. Todos los relojes de
          atención (cuánto tarda cada asesor en contestar, cuánto se demora
          desde que abre un chat y el cronómetro que ve en la cabecera) solo
          cuentan el tiempo dentro de este horario; la noche, los fines de
          semana y los días que no atiendes no suman. Ejemplo: un chat abierto
          el viernes a las 16:57 y respondido el lunes a las 09:00 marca 1h
          03m, no tres días. Elige la hora en que tu equipo empieza, la hora
          en que termina y los días que atiende.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
        <span className="font-semibold">De</span>
        <select
          className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[11px]"
          value={form.inicio}
          onChange={(e) => setForm((f) => ({ ...f, inicio: Number(e.target.value) }))}
        >
          {horas.slice(0, 24).map((h) => (
            <option key={h} value={h}>
              {hh(h)}
            </option>
          ))}
        </select>
        <span>a</span>
        <select
          className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[11px]"
          value={form.fin}
          onChange={(e) => setForm((f) => ({ ...f, fin: Number(e.target.value) }))}
        >
          {horas.slice(1).map((h) => (
            <option key={h} value={h}>
              {hh(h)}
            </option>
          ))}
        </select>
        <span className="ml-1 inline-flex gap-1">
          {DIAS.map((d) => (
            <button
              key={d.n}
              type="button"
              onClick={() => toggleDia(d.n)}
              className={`h-7 w-7 rounded-md text-[11px] font-bold transition ${
                form.dias.includes(d.n)
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-400 border border-slate-200"
              }`}
              title={nombreDias([d.n])}
            >
              {d.l}
            </button>
          ))}
        </span>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || form.fin <= form.inicio || form.dias.length === 0}
          className="ml-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-white"
        >
          Cancelar
        </button>
      </div>
      {form.fin <= form.inicio ? (
        <div className="mt-1 text-[11px] text-rose-600">
          La hora de cierre debe ser mayor que la de inicio.
        </div>
      ) : null}
      {error ? <div className="mt-1 text-[11px] text-rose-600">{error}</div> : null}
    </div>
  );
}

export default function AtencionResumen({
  configId,
  configNombre,
  allowSwitch,
  conexiones,
  onChangeConexion,
}) {
  const todayStr = toYMD(new Date());
  const [dateRange, setDateRange] = useState(() => ({
    from: todayStr,
    to: todayStr,
  }));
  const [activePreset, setActivePreset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [actualizado, setActualizado] = useState(null);
  const { getPresence } = usePresence();

  const fetchData = useCallback(
    async (silencioso = false) => {
      if (!configId) return;
      if (!silencioso) setLoading(true);
      setErrorMsg("");
      try {
        const { data: resp } = await chatApi.post(
          "/dashboard/obtener_dashboard_completo",
          {
            from: dateRange.from,
            to: dateRange.to,
            id_configuracion: configId,
            sections: ["pendingQueue", "atencionAsesores"],
          },
        );
        setData(resp?.data || null);
        setActualizado(new Date());
      } catch (err) {
        setErrorMsg(
          err?.response?.data?.message || "No se pudo cargar el resumen",
        );
      } finally {
        if (!silencioso) setLoading(false);
      }
    },
    [configId, dateRange.from, dateRange.to],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresco silencioso cada minuto, solo con la pestaña visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchData(true);
    }, REFRESCO_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  const handlePreset = (idx) => {
    const p = DATE_PRESETS[idx];
    setActivePreset(idx);
    setDateRange({ from: daysAgo(p.days), to: toYMD(new Date()) });
  };

  const pendientes = data?.pendingQueue || [];
  const at = data?.atencionAsesores || null;
  const tot = at?.totales || null;
  const umbrales = at?.umbrales_min || { advertencia: 5, critico: 10 };
  const horario = at?.horario || { inicio: 8, fin: 17, dias: [1, 2, 3, 4, 5] };
  const esperaMax = pendientes.reduce(
    (m, r) => Math.max(m, Number(r.waitSeconds) || 0),
    0,
  );
  const totalResp = tot ? tot.ok + tot.advertencia + tot.critico : 0;

  const asesores = at?.asesores || [];
  const activos = useMemo(
    () => asesores.filter((a) => a.chats > 0 || a.conectado_seg > 0),
    [asesores],
  );
  const visibles = mostrarInactivos ? asesores : activos;
  const inactivos = asesores.length - activos.length;

  // Horas del gráfico: el horario laboral más cualquier hora con actividad.
  const horas = useMemo(() => {
    const set = new Set();
    for (let h = horario.inicio; h < horario.fin; h += 1) set.add(h);
    for (const a of visibles) {
      for (const c of a.por_hora) {
        if (c.chats > 0 || c.conectado_seg >= 300) set.add(c.h);
      }
    }
    return [...set].sort((a, b) => a - b);
  }, [visibles, horario]);
  const maxChats = useMemo(
    () =>
      Math.max(1, ...visibles.flatMap((a) => a.por_hora.map((c) => c.chats))),
    [visibles],
  );

  const equipo = at?.departamentos?.length
    ? at.departamentos.join(", ")
    : "toda la cuenta";

  return (
    <div className="px-3 sm:px-6 py-4 space-y-4">
      {/* ── Conexión + período ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="min-w-[210px]">
            <div className="mb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Conexión
            </div>
            {allowSwitch ? (
              <select
                className="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                value={configId || ""}
                onChange={(e) => onChangeConexion(e.target.value)}
              >
                {conexiones.length === 0 && (
                  <option value="">Cargando conexiones…</option>
                )}
                {conexiones.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_configuracion || c.telefono || `Config #${c.id}`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 flex items-center gap-2 overflow-hidden">
                <i className="bx bx-link shrink-0 text-indigo-500" />
                <span className="truncate font-medium">{configNombre}</span>
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="mb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Período
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
                {DATE_PRESETS.map((p, idx) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handlePreset(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                      activePreset === idx
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  className="h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                  value={dateRange.from}
                  max={dateRange.to || todayStr}
                  onChange={(e) => {
                    setActivePreset(-1);
                    setDateRange((r) => ({ ...r, from: e.target.value }));
                  }}
                />
                <span className="text-slate-300 text-xs">→</span>
                <input
                  type="date"
                  className="h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                  value={dateRange.to}
                  min={dateRange.from}
                  max={todayStr}
                  onChange={(e) => {
                    setActivePreset(-1);
                    setDateRange((r) => ({ ...r, to: e.target.value }));
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => fetchData()}
                className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                title={
                  actualizado
                    ? `Actualizado ${actualizado.toLocaleTimeString("es-EC")}`
                    : "Actualizar"
                }
              >
                <i
                  className={`bx bx-refresh text-base ${loading ? "animate-spin" : ""}`}
                />
                Actualizar
              </button>
            </div>
          </div>
        </div>
        {errorMsg ? (
          <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {errorMsg}
          </div>
        ) : null}
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          icon="bx-hourglass"
          color="#e11d48"
          label="Esperando ahora"
          value={pendientes.length}
          sub={
            esperaMax
              ? `El más antiguo lleva ${formatDuration(esperaMax)}`
              : "Nadie en cola"
          }
          title="Clientes cuyo último mensaje sigue sin respuesta"
        />
        <Kpi
          icon="bx-conversation"
          color="#059669"
          label="Chats atendidos"
          value={tot ? tot.chats : "—"}
          sub={tot ? `${tot.mensajes} mensajes del equipo` : ""}
          title="Chats distintos en los que escribió alguien del equipo"
        />
        <Kpi
          icon="bx-timer"
          color="#4f46e5"
          label="El equipo tarda en contestar"
          value={tot ? fmtSeg(tot.mediana_seg) : "—"}
          sub={
            tot && totalResp
              ? `${pct(tot.ok, totalResp)}% en menos de ${umbrales.advertencia} min`
              : ""
          }
          title={`Mediana desde que el cliente escribe hasta la primera respuesta de una persona, en horario ${hh(horario.inicio)}–${hh(horario.fin)}`}
        />
        <Kpi
          icon="bx-error"
          color="#f97316"
          label={`Tardaron más de ${umbrales.critico} min`}
          value={tot ? tot.critico : "—"}
          sub={
            tot && totalResp
              ? `${pct(tot.critico, totalResp)}% de ${totalResp} respuestas`
              : ""
          }
          title="Respuestas que superaron el umbral rojo"
        />
      </div>

      {/* ── Cola de espera ── */}
      <PendingQueue rows={pendientes} />

      {/* ── Equipo ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-sm">
              <i className="bx bx-group text-base text-white"></i>
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-slate-700">
                EQUIPO · {equipo.toUpperCase()}
              </h3>
              <p className="text-xs text-slate-400">
                {activePreset === 0
                  ? "Lo que hizo cada asesor hoy."
                  : "Lo que hizo cada asesor en el período (las horas suman todos los días)."}{" "}
                Los tiempos se cuentan solo dentro del horario de atención; el
                bot y las plantillas no cuentan como respuesta.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-emerald-600" />
              chats atendidos
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-amber-400" />
              conectado sin atender
            </span>
            <HorarioEditor
              configId={configId}
              horario={horario}
              onGuardado={() => fetchData(true)}
            />
          </div>
        </div>

        {!at ? (
          <div className="py-8 text-center text-sm text-slate-400">
            {loading ? "Cargando…" : "Sin datos"}
          </div>
        ) : visibles.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Nadie del equipo respondió ni se conectó en este período.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {visibles.map((a) => (
              <TarjetaAsesor
                key={a.id_sub_usuario}
                a={a}
                horas={horas}
                maxChats={maxChats}
                umbrales={umbrales}
                online={!!getPresence(a.id_sub_usuario)?.online}
              />
            ))}
          </div>
        )}

        {inactivos > 0 ? (
          <button
            type="button"
            onClick={() => setMostrarInactivos((v) => !v)}
            className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
          >
            {mostrarInactivos
              ? "Ocultar a los que no tuvieron actividad"
              : `Ver ${inactivos} del equipo sin actividad en el período`}
          </button>
        ) : null}

        {at?.otros?.length ? (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Respuestas que no son de un asesor del equipo
            </p>
            <div className="space-y-1.5">
              {at.otros.map((o) => {
                const d = describirOtro(o);
                return (
                  <div
                    key={o.nombre}
                    className="flex flex-wrap items-baseline gap-x-2 text-xs text-slate-600"
                  >
                    <span className="font-bold text-slate-800">{d.nombre}</span>
                    <span>
                      {o.chats} chats · tarda en contestar{" "}
                      <span className="font-semibold">
                        {fmtSeg(o.mediana_seg)}
                      </span>
                    </span>
                    <span className="text-slate-400">— {d.detalle}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {tot?.truncado ? (
          <p className="mt-2 text-[11px] text-amber-600">
            El período tiene demasiados mensajes: se analizó una parte. Acorta
            el rango para ver el dato completo.
          </p>
        ) : null}
      </div>
    </div>
  );
}
