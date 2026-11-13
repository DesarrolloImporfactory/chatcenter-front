// src/pages/asistentes/ControlGastoIA.jsx
// Optimizador AI: cuánto gasta el asistente, a dónde se va cada dólar, cuánto
// cuesta atender a cada cliente y qué puede hacer el cliente para bajarlo.
// Las reglas y los números vienen del backend (POST /consumo_ia/diagnostico);
// acá solo se pintan, en orden de impacto. Lo que depende de nosotros (modelo
// equivalente por columna, recordatorios con el modelo económico, caché) va
// aparte, como «en piloto automático».
// Todo va desplegado: nada se esconde detrás de un clic.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";

const usd = (v, dec = 2) =>
  `$${(Number(v) || 0).toLocaleString("en-US", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })}`;
const num = (v) => (Number(v) || 0).toLocaleString("es-EC");
const pct = (v) => `${Math.round((Number(v) || 0) * 100)}%`;
/* Centavos con los decimales que hagan falta para que no salga $0.00. */
const usdFino = (v) => {
  const n = Number(v) || 0;
  return usd(n, n > 0 && n < 0.1 ? 3 : 2);
};

const NIVEL = {
  alto: {
    etiqueta: "Mayor impacto",
    chip: "bg-rose-100 text-rose-700",
    numero: "bg-rose-600 text-white",
    borde: "border-rose-200",
  },
  medio: {
    etiqueta: "Recomendado",
    chip: "bg-amber-100 text-amber-800",
    numero: "bg-amber-500 text-white",
    borde: "border-amber-200",
  },
  info: {
    etiqueta: "Ponte al día",
    chip: "bg-sky-100 text-sky-700",
    numero: "bg-sky-600 text-white",
    borde: "border-sky-200",
  },
};

const DIA_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/* Última respuesta por cuenta, para pintar al instante al volver a la pestaña
   (el componente se desmonta al cambiar de pestaña). El backend guarda la suya
   los mismos 5 minutos; «Actualizar» salta las dos. */
const CACHE_TTL_MS = 5 * 60 * 1000;
const cacheLocal = new Map(); // idConfiguracion -> { t, data }
const enCache = (id) => {
  const c = cacheLocal.get(String(id));
  return c && Date.now() - c.t < CACHE_TTL_MS ? c.data : null;
};

/* Un paso puede traer enlaces como [texto](/ruta): se pintan subrayados y
   llevan directo a esa pantalla. */
function TextoConEnlaces({ texto, onIr }) {
  const partes = String(texto || "").split(/(\[[^\]]+\]\(\/[^)\s]*\))/g);
  return (
    <>
      {partes.map((parte, i) => {
        const m = parte.match(/^\[([^\]]+)\]\((\/[^)\s]*)\)$/);
        if (!m) return <React.Fragment key={i}>{parte}</React.Fragment>;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onIr(m[2])}
            className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900 hover:decoration-indigo-600"
          >
            {m[1]}
          </button>
        );
      })}
    </>
  );
}

/* Esqueleto con la misma forma de la pantalla cargada: así no hay salto ni
   pantalla en blanco mientras llega el diagnóstico. */
function Esqueleto() {
  const linea = "rounded bg-slate-200/80 animate-pulse";
  const lineaOscura = "rounded bg-white/10 animate-pulse";
  return (
    <div className="space-y-3 mb-4" aria-busy="true" aria-label="Cargando el gasto de tu asistente">
      <div className="rounded-2xl bg-gradient-to-br from-[#12142b] via-[#1b1e4b] to-[#2b2f77] px-5 py-4">
        <div className={`${lineaOscura} h-5 w-64 rounded-full`} />
        <div className="mt-3 grid lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-4 space-y-2">
            <div className={`${lineaOscura} h-3 w-40`} />
            <div className={`${lineaOscura} h-10 w-44`} />
            <div className={`${lineaOscura} h-3 w-64`} />
            <div className={`${lineaOscura} h-10 w-48 rounded-xl`} />
          </div>
          <div className="lg:col-span-3 lg:border-l lg:border-white/10 lg:pl-5">
            <div className="flex items-center gap-3">
              <div className="w-[84px] h-[84px] rounded-full border-8 border-white/10 animate-pulse" />
              <div className="space-y-2">
                <div className={`${lineaOscura} h-2.5 w-28`} />
                <div className={`${lineaOscura} h-4 w-20`} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`${lineaOscura} h-11 rounded-lg`} />
              ))}
            </div>
          </div>
          <div className="lg:col-span-5 lg:border-l lg:border-white/10 lg:pl-5">
            <div className="flex items-end gap-1.5 h-24">
              {[35, 55, 40, 70, 50, 85, 65].map((h, i) => (
                <div
                  key={i}
                  className={`${lineaOscura} flex-1 rounded-md`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className={`${lineaOscura} h-2.5 w-56 mt-3`} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <div className="bg-white border rounded-2xl shadow-sm p-4">
          <div className={`${linea} h-4 w-56`} />
          <div className={`${linea} h-7 w-full mt-3 rounded-lg`} />
          <div className="mt-3 space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex justify-between gap-4">
                <div className={`${linea} h-3 w-2/3`} />
                <div className={`${linea} h-3 w-12`} />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border rounded-2xl shadow-sm p-4">
          <div className={`${linea} h-4 w-56`} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`${linea} h-[66px] rounded-xl`} />
            ))}
          </div>
          <div className={`${linea} h-3 w-3/4 mt-3`} />
          <div className={`${linea} h-3 w-2/3 mt-2`} />
        </div>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm p-4">
        <div className={`${linea} h-4 w-72`} />
        <div className="mt-3 rounded-xl border border-slate-200 p-3.5 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="space-y-2">
            <div className={`${linea} h-4 w-44 rounded-full`} />
            <div className={`${linea} h-4 w-4/5`} />
            <div className={`${linea} h-3 w-full`} />
            <div className={`${linea} h-3 w-11/12`} />
            <div className={`${linea} h-3 w-3/4`} />
          </div>
          <div className="rounded-lg bg-slate-50 p-3 space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`${linea} h-3`} style={{ width: `${90 - i * 12}%` }} />
            ))}
            <div className={`${linea} h-7 w-48 rounded-lg`} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-4">
        <div className={`${linea} h-4 w-64`} />
        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[74px] rounded-xl bg-white border border-emerald-100 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* Los últimos 7 días de calendario, con cero donde el bot no trabajó. */
function semanaCompleta(serie) {
  const porDia = new Map((serie || []).map((d) => [d.dia, d]));
  const dias = [];
  const hoy = new Date();
  for (let i = 6; i >= 0; i--) {
    const f = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    const clave = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
    const d = porDia.get(clave) || {};
    const total = Number(d.costo_usd) || 0;
    const rmk = Math.min(total, Number(d.costo_remarketing_usd) || 0);
    dias.push({
      clave,
      etiqueta: i === 0 ? "Hoy" : DIA_CORTO[f.getDay()],
      total,
      rmk,
      respuestas: total - rmk,
      esHoy: i === 0,
    });
  }
  return dias;
}

/* Anillo del puntaje de eficiencia. */
function Anillo({ valor }) {
  const v = Math.max(0, Math.min(100, Number(valor) || 0));
  const R = 36;
  const C = 2 * Math.PI * R;
  const color = v >= 85 ? "#34d399" : v >= 60 ? "#fbbf24" : "#fb7185";
  const texto = v >= 85 ? "Óptimo" : v >= 60 ? "Mejorable" : "Gastas de más";
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-[84px] h-[84px] shrink-0">
        <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90" aria-hidden="true">
          <circle cx="42" cy="42" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
          <circle
            cx="42"
            cy="42"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(v / 100) * C} ${C}`}
            style={{ transition: "stroke-dasharray 700ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center leading-none">
            <div className="text-[22px] font-extrabold text-white tabular-nums">{v}</div>
            <div className="text-[9px] font-semibold text-white/50 mt-0.5">de 100</div>
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">
          Eficiencia del gasto
        </div>
        <div className="text-[15px] font-bold leading-tight" style={{ color }}>
          {texto}
        </div>
        <div className="text-[11px] text-white/55 leading-[14px]">
          100 = la IA solo se usa donde hace falta.
        </div>
      </div>
    </div>
  );
}

/* Gasto por día: barra apilada (respuestas + recordatorios). */
function GraficaSemana({ dias }) {
  const max = Math.max(...dias.map((d) => d.total), 0.01);
  return (
    <div>
      <div className="flex items-end gap-1.5 h-24" role="img" aria-label="Gasto por día de los últimos 7 días">
        {dias.map((d) => {
          const alto = d.total > 0 ? Math.max(6, (d.total / max) * 100) : 0;
          const parteRmk = d.total > 0 ? (d.rmk / d.total) * 100 : 0;
          return (
            <div
              key={d.clave}
              className="group relative flex-1 h-full flex flex-col justify-end"
              title={`${d.etiqueta}: ${usd(d.total)} (respuestas ${usd(d.respuestas)}, recordatorios ${usd(d.rmk)})`}
            >
              <div
                className={`text-center text-[10px] font-semibold tabular-nums mb-1 ${
                  d.esHoy ? "text-white" : "text-white/55"
                }`}
              >
                {d.total > 0 ? usd(d.total, d.total < 10 ? 2 : 0) : ""}
              </div>
              {d.total > 0 ? (
                <div
                  className={`w-full rounded-md overflow-hidden flex flex-col transition-all duration-500 ${
                    d.esHoy ? "ring-2 ring-white/70" : "opacity-90 group-hover:opacity-100"
                  }`}
                  style={{ height: `${alto}%` }}
                >
                  <div className="bg-rose-400" style={{ height: `${parteRmk}%` }} />
                  <div className="bg-indigo-300 flex-1" />
                </div>
              ) : (
                <div className="w-full h-[3px] rounded-full bg-white/15" />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1">
        {dias.map((d) => (
          <div
            key={d.clave}
            className={`flex-1 text-center text-[10px] font-semibold ${
              d.esHoy ? "text-white" : "text-white/45"
            }`}
          >
            {d.etiqueta}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ControlGastoIA({ idConfiguracion }) {
  const navigate = useNavigate();
  // Si ya se cargó hace menos de 5 minutos, se pinta de una (sin esqueleto).
  const [data, setData] = useState(() => enCache(idConfiguracion));
  const [cargando, setCargando] = useState(() => !enCache(idConfiguracion));
  const [error, setError] = useState(false);
  // 0 = entrada normal (usa lo guardado); >0 = pulsó «Actualizar» o reintentó.
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!idConfiguracion) return;
    const guardado = intento === 0 ? enCache(idConfiguracion) : null;
    if (guardado) {
      setData(guardado);
      setCargando(false);
      return;
    }
    let vivo = true;
    setCargando(true);
    setError(false);
    chatApi
      .post(
        "/consumo_ia/diagnostico",
        { id_configuracion: idConfiguracion, refrescar: intento > 0 },
        { silentError: true },
      )
      .then(({ data: r }) => {
        if (!vivo) return;
        const nuevo = r?.data || null;
        if (nuevo) cacheLocal.set(String(idConfiguracion), { t: Date.now(), data: nuevo });
        setData(nuevo);
      })
      .catch((e) => {
        if (!vivo) return;
        console.error("[ControlGastoIA] no se pudo cargar el diagnóstico:", e);
        setError(true);
      })
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [idConfiguracion, intento]);

  const dias = useMemo(() => semanaCompleta(data?.serie), [data]);

  // Sin datos y sin error = todavía cargando (también antes del primer efecto).
  if (!data && !error && (cargando || !idConfiguracion)) return <Esqueleto />;

  if (error || !data) {
    return (
      <div className="bg-white border rounded-2xl shadow-sm p-6 text-center">
        <i className="bx bx-bar-chart-alt-2 text-3xl text-slate-300" />
        <div className="mt-1 text-sm font-semibold text-slate-600">
          No pudimos cargar el gasto de tu asistente
        </div>
        <button
          type="button"
          onClick={() => setIntento((i) => i + 1)}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171931] text-white text-[12.5px] font-semibold"
        >
          <i className="bx bx-refresh" /> Volver a cargar
        </button>
      </div>
    );
  }

  const r = data.resumen || {};
  const recomendaciones = data.recomendaciones || [];
  const automatico = data.automatico || [];
  const columnas = data.columnas || [];
  const prod = data.productos || {};
  const sinActividad = !(r.gasto_periodo_usd > 0);
  const proveedor = data.proveedor === "claude" ? "Claude" : "OpenAI";
  const pRmk = Math.max(0, Math.min(1, Number(r.pct_remarketing) || 0));
  const promedio = Number(r.promedio_diario_usd) || 0;
  const ahorroMes = Number(r.ahorro_posible_mensual_usd) || 0;
  const hayAhorro = ahorroMes >= 0.5;

  const columnasPiloto =
    automatico.length >= 4
      ? "lg:grid-cols-4"
      : automatico.length === 3
        ? "lg:grid-cols-3"
        : "lg:grid-cols-2";

  return (
    <div className="space-y-3 mb-4">
      {/* ════════ Cabecera: cuánto gasta y cuánto puede bajar ════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#12142b] via-[#1b1e4b] to-[#2b2f77] text-white shadow">
        <div
          className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-indigo-500/25 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative px-5 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white/80">
              <i className="bx bx-trending-down text-sm text-emerald-300" />
              Optimizador AI
              <span className="text-white/35">·</span>
              {proveedor}
              <span className="text-white/35">·</span>
              últimos {data.rango_dias} días
            </div>
            <button
              type="button"
              onClick={() => setIntento((i) => i + 1)}
              disabled={cargando}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11.5px] font-semibold text-white transition disabled:opacity-50"
            >
              <i className={`bx bx-refresh ${cargando ? "bx-spin" : ""}`} />
              Actualizar
            </button>
          </div>

          <div className="mt-3 grid lg:grid-cols-12 gap-5 items-center">
            <div className="lg:col-span-4">
              {sinActividad ? (
                <>
                  <h3 className="text-2xl font-extrabold leading-tight">
                    Tu asistente todavía no ha gastado
                  </h3>
                  <p className="mt-1 text-white/65 text-[13px]">
                    Cuando empiece a responder, aquí verás cuánto consume cada
                    día y qué hacer para que gaste lo justo.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-[12px] font-semibold text-white/60">
                    Tu asistente gasta en promedio
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-4xl font-extrabold tabular-nums tracking-tight">
                      {usd(promedio)}
                    </span>
                    <span className="text-base font-semibold text-white/60">al día</span>
                  </div>
                  <p className="text-white/65 text-[12.5px]">
                    A este ritmo son{" "}
                    <b className="text-white">{usd(r.proyeccion_mensual_usd, 0)} al mes</b>
                    {r.dias_activos
                      ? ` (promedio de ${r.dias_activos} ${r.dias_activos === 1 ? "día" : "días"} con actividad).`
                      : "."}
                  </p>

                  {hayAhorro ? (
                    <div className="mt-2.5 inline-flex items-center gap-2.5 rounded-xl bg-emerald-400/15 ring-1 ring-emerald-300/30 px-3 py-1.5">
                      <i className="bx bx-trending-down text-xl text-emerald-300" />
                      <div className="leading-tight">
                        <div className="text-[10.5px] font-semibold text-emerald-200/90">
                          Puedes bajarlo hasta
                        </div>
                        <div className="text-[15px] font-extrabold text-emerald-300 tabular-nums">
                          {usd(ahorroMes, 0)} menos al mes
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2.5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/85">
                      <i className="bx bxs-check-circle text-base text-emerald-300" />
                      {recomendaciones.length
                        ? "Hay ajustes pendientes en tu plan de ahorro"
                        : "Tu asistente está gastando lo justo"}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="lg:col-span-3 lg:border-l lg:border-white/10 lg:pl-5">
              <Anillo valor={sinActividad ? 100 : r.eficiencia} />
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {[
                  { rotulo: "Hoy", valor: usd(r.gasto_hoy_usd) },
                  { rotulo: "7 días", valor: usd(r.gasto_periodo_usd) },
                  { rotulo: "Sin IA", valor: pct(r.pct_sin_ia) },
                ].map((c) => (
                  <div
                    key={c.rotulo}
                    className="rounded-lg bg-white/[0.07] ring-1 ring-white/10 px-2 py-1.5"
                  >
                    <div className="text-[9.5px] font-bold uppercase tracking-wider text-white/50">
                      {c.rotulo}
                    </div>
                    <div className="text-[13.5px] font-bold tabular-nums">{c.valor}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 lg:border-l lg:border-white/10 lg:pl-5">
              <GraficaSemana dias={dias} />
              <div className="mt-1.5 flex gap-4 text-[10.5px] text-white/60">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-indigo-300" />
                  Respuestas a clientes
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-rose-400" />
                  Recordatorios con IA
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!sinActividad && (
        <div className="grid lg:grid-cols-2 gap-3">
          {/* ════════ A dónde se va cada dólar ════════ */}
          <div className="bg-white border rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2">
              <i className="bx bx-pie-chart-alt-2 text-lg text-indigo-600" />
              <h4 className="text-[15px] font-bold text-gray-900">
                A dónde se va cada dólar
              </h4>
              <span className="text-[12px] text-gray-400">
                de cada $1 que recargas en {proveedor}
              </span>
            </div>

            <div
              className="mt-3 flex h-7 w-full overflow-hidden rounded-lg bg-slate-100 text-[11.5px] font-bold text-white"
              role="img"
              aria-label={`Respuestas a clientes ${pct(1 - pRmk)}, recordatorios con IA ${pct(pRmk)}`}
            >
              {1 - pRmk > 0.005 && (
                <div
                  className="bg-indigo-500 grid place-items-center transition-all duration-700"
                  style={{ width: `${(1 - pRmk) * 100}%` }}
                >
                  {1 - pRmk >= 0.12 ? pct(1 - pRmk) : ""}
                </div>
              )}
              {pRmk > 0.005 && (
                <div
                  className="bg-rose-400 grid place-items-center transition-all duration-700"
                  style={{ width: `${pRmk * 100}%` }}
                >
                  {pRmk >= 0.12 ? pct(pRmk) : ""}
                </div>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {[
                {
                  color: "bg-indigo-500",
                  titulo: "Respuestas a clientes",
                  nota: `${num(r.msgs_ia)} escritas por la IA`,
                  valor: usd(r.costo_respuestas_usd),
                },
                {
                  color: "bg-rose-400",
                  titulo: "Recordatorios con IA",
                  nota: `${num(r.msgs_remarketing)} de remarketing${r.hay_estimados ? " (parte estimada)" : ""}`,
                  valor: usd(r.costo_remarketing_usd),
                },
                {
                  color: "bg-emerald-500",
                  titulo: "Respuestas sin IA",
                  nota: `${num(r.msgs_sin_ia)} mensajes de bienvenida y respuestas rápidas`,
                  valor: "Gratis",
                  gratis: true,
                },
              ].map((f) => (
                <div key={f.titulo} className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 shrink-0 rounded-sm ${f.color}`} />
                  <div className="min-w-0 flex-1 text-[12.5px] truncate">
                    <b className="font-semibold text-slate-900">{f.titulo}</b>
                    <span className="text-slate-500"> · {f.nota}</span>
                  </div>
                  <div
                    className={`text-[13.5px] font-bold tabular-nums ${
                      f.gratis ? "text-emerald-600" : "text-slate-900"
                    }`}
                  >
                    {f.valor}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ════════ Cuánto cuesta atender (lo medido, sin proyectar) ════════ */}
          <div className="bg-white border rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2">
              <i className="bx bx-user-check text-lg text-indigo-600" />
              <h4 className="text-[15px] font-bold text-gray-900">
                Cuánto te cuesta atender
              </h4>
              <span className="text-[12px] text-gray-400">
                medido en los últimos {data.rango_dias} días
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                {
                  rotulo: "Por cliente atendido",
                  valor:
                    r.costo_por_cliente_usd != null
                      ? usdFino(r.costo_por_cliente_usd)
                      : "—",
                  nota: `${num(r.clientes_atendidos)} clientes`,
                  destacado: true,
                },
                {
                  rotulo: "Cada 100 respuestas",
                  valor:
                    r.costo_por_respuesta_usd != null
                      ? usd(r.costo_por_respuesta_usd * 100)
                      : "—",
                  nota: "escritas por la IA",
                },
                {
                  rotulo: "Cada 100 recordatorios",
                  valor:
                    r.costo_por_recordatorio_usd != null
                      ? usd(r.costo_por_recordatorio_usd * 100)
                      : "—",
                  nota: "de remarketing con IA",
                },
              ].map((c) => (
                <div
                  key={c.rotulo}
                  className={`rounded-xl px-3 py-2 ${
                    c.destacado
                      ? "bg-indigo-50 ring-1 ring-indigo-100"
                      : "bg-slate-50 ring-1 ring-slate-100"
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold uppercase tracking-wide ${
                      c.destacado ? "text-indigo-700" : "text-slate-500"
                    }`}
                  >
                    {c.rotulo}
                  </div>
                  <div
                    className={`text-lg font-extrabold tabular-nums leading-tight ${
                      c.destacado ? "text-indigo-900" : "text-slate-900"
                    }`}
                  >
                    {c.valor}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{c.nota}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-1.5 text-[12.5px] text-slate-600">
              <div className="flex items-start gap-2">
                <i className="bx bx-bolt-circle text-base text-emerald-600 mt-px" />
                <span>
                  <b className="text-slate-900">{pct(r.pct_sin_ia)}</b> de las
                  respuestas salió sin IA, gratis.
                </span>
              </div>
              {prod.cargados > 0 && (
                <div className="flex items-start gap-2">
                  <i className="bx bx-package text-base text-indigo-500 mt-px" />
                  <span>
                    {prod.en_pauta != null ? (
                      <>
                        <b className="text-slate-900">
                          {prod.en_pauta} de {prod.cargados}
                        </b>{" "}
                        productos recibieron clientes por anuncios en las
                        últimas 4 semanas: el plan solo revisa esos.
                      </>
                    ) : (
                      <>
                        Tienes <b className="text-slate-900">{prod.cargados}</b>{" "}
                        productos cargados. Los que no estás pautando no generan
                        gasto.
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════ Plan de ahorro (todo desplegado) ════════ */}
      <div className="bg-white border rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <i className="bx bx-list-check text-xl text-indigo-600" />
          <h4 className="text-[15px] font-bold text-gray-900">Tu plan de ahorro</h4>
          {recomendaciones.length > 0 && (
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              {recomendaciones.length}{" "}
              {recomendaciones.length === 1 ? "paso" : "pasos"}
            </span>
          )}
          <span className="text-[12px] text-gray-400">
            ordenado por lo que más te ahorra; ninguno cambia cómo vende tu
            asistente
          </span>
        </div>

        {recomendaciones.length === 0 ? (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5">
            <i className="bx bxs-check-shield text-2xl text-emerald-600" />
            <div className="text-[12.5px] text-emerald-900">
              <b>
                {sinActividad
                  ? "Aún no hay gasto que revisar."
                  : "No tienes nada pendiente."}
              </b>{" "}
              {sinActividad
                ? "Cuando el asistente empiece a responder, aquí aparece el plan para tu cuenta."
                : "No encontramos nada que te esté haciendo gastar de más. Lo revisamos cada vez que abres esta pestaña."}
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {recomendaciones.map((rec, i) => {
              const n = NIVEL[rec.nivel] || NIVEL.medio;
              const ahorro = Number(rec.ahorro_mensual_usd) || 0;
              const conPasos = rec.pasos?.length > 0;
              return (
                <div
                  key={rec.id}
                  className={`rounded-xl border ${n.borde} p-3.5 grid gap-4 ${
                    conPasos ? "lg:grid-cols-[1.35fr_1fr]" : ""
                  }`}
                >
                  <div className="flex gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-[12.5px] font-extrabold ${n.numero}`}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${n.chip}`}
                        >
                          {n.etiqueta}
                        </span>
                        {ahorro >= 0.5 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 tabular-nums">
                            <i className="bx bx-trending-down" />
                            hasta {usd(ahorro, 0)} menos al mes
                          </span>
                        )}
                      </div>
                      <div className="text-[14px] font-bold text-slate-900 mt-1 leading-snug">
                        {rec.titulo}
                      </div>
                      <p className="text-[12.5px] text-slate-600 leading-[18px] mt-1">
                        {rec.detalle}
                      </p>
                    </div>
                  </div>

                  {conPasos && (
                    <div className="rounded-lg bg-slate-50 p-3 flex flex-col">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Cómo se hace
                      </div>
                      <ol className="space-y-1.5 flex-1">
                        {rec.pasos.map((paso, j) => (
                          <li
                            key={paso}
                            className="flex gap-2 text-[12.5px] text-slate-700 leading-[18px]"
                          >
                            <span className="shrink-0 w-[18px] h-[18px] rounded-full bg-white ring-1 ring-slate-200 grid place-items-center text-[10.5px] font-bold text-slate-600">
                              {j + 1}
                            </span>
                            <span>
                              <TextoConEnlaces texto={paso} onIr={navigate} />
                            </span>
                          </li>
                        ))}
                      </ol>
                      {rec.accion?.ruta && (
                        <button
                          type="button"
                          onClick={() => navigate(rec.accion.ruta)}
                          className="mt-2.5 self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171931] hover:bg-[#22254f] text-white text-[12.5px] font-semibold transition"
                        >
                          {rec.accion.texto}
                          <i className="bx bx-right-arrow-alt text-base" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════ En piloto automático (todo desplegado) ════════ */}
      {automatico.length > 0 && (
        <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 to-white p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <i className="bx bxs-zap text-lg text-emerald-600" />
            <h4 className="text-[15px] font-bold text-gray-900">En piloto automático</h4>
            <span className="text-[12px] text-gray-400">
              esto ya lo hace ImporChat por ti, no tienes que configurar nada
            </span>
          </div>

          <div className={`mt-3 grid sm:grid-cols-2 ${columnasPiloto} gap-2`}>
            {automatico.map((a) => (
              <div
                key={a.titulo}
                className="rounded-xl bg-white border border-emerald-100 p-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 shrink-0 rounded-lg bg-emerald-100 grid place-items-center">
                    <i className={`bx ${a.icono || "bx-check"} text-base text-emerald-700`} />
                  </div>
                  <div className="text-[12.5px] font-bold text-slate-900 leading-tight flex-1">
                    {a.titulo}
                  </div>
                  <i className="bx bxs-check-circle text-emerald-500" />
                </div>
                <p className="text-[12px] text-slate-600 leading-[17px] mt-1.5">
                  {a.detalle}
                </p>
              </div>
            ))}
          </div>

          {columnas.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Con qué modelo responde cada columna
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {columnas.map((c) => {
                  const elegido =
                    c.premium && !c.equivalente_automatico && !c.de_plantilla;
                  return (
                    <div
                      key={c.id}
                      className="rounded-xl bg-white border border-slate-200 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-semibold text-slate-800 truncate">
                          {c.nombre}
                        </span>
                        {(c.equivalente_automatico || c.de_plantilla) && (
                          <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            Recomendado
                          </span>
                        )}
                        {elegido && (
                          <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Elegido por ti
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-baseline justify-between gap-2">
                        <span className="text-[12px] text-slate-600 truncate">
                          {c.modelo_nombre}
                        </span>
                        <span className="text-[11.5px] text-slate-500 tabular-nums whitespace-nowrap">
                          {usd(c.costo_tipico_usd * 100)} / 100 resp.
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
