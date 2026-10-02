import { Fragment, useCallback, useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import { ResumenIACelda, DetalleIA, RESULTADOS } from "../telefonia/ResumenLlamadaIA";

/**
 * Bloque "Llamadas telefónicas" del dashboard de atención de una conexión.
 *
 * Es la vista del administrador del negocio (no del super admin): cuántas
 * llamadas hizo su equipo en el período, cuántas se contestaron, minutos y
 * gasto, por asesor, y la lista con grabación y el resumen de la IA. Solo
 * aparece si la conexión tiene telefonía por saldo (o ya hizo llamadas).
 *
 * Datos: GET /telefonia/historial?id_configuracion&desde&hasta (sesión del
 * administrador; el back valida que la conexión sea de su cuenta).
 */
const fmtUSD = (c) => `$${(Number(c || 0) / 100).toFixed(2)}`;
const tel = (t) => (t ? `+${String(t).replace(/^\+/, "")}` : "—");
const fmtFecha = (v) => {
  if (!v) return "—";
  const d = new Date(String(v).includes("T") ? v : `${String(v).replace(" ", "T")}-05:00`);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("es-EC", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};
const fmtSeg = (s) => {
  const n = Number(s) || 0;
  return n < 60 ? `${n} s` : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")} min`;
};
const fmtMin = (seg) => {
  const m = Math.round((Number(seg) || 0) / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
};
const ESTADOS = {
  answered: ["contestada", "text-emerald-700"],
  no_answer: ["no contestaron", "text-amber-700"],
  busy: ["ocupado", "text-amber-700"],
  cancel: ["colgó antes", "text-slate-500"],
  failed: ["falló", "text-rose-700"],
  ringing: ["timbrando", "text-sky-700"],
  pedida: ["marcando", "text-sky-700"],
};

function Tile({ icon, color, label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-1 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: `${color}15` }}>
          <i className={`bx ${icon} text-sm`} style={{ color }} />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className="text-xl font-extrabold leading-none text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-[11px] text-slate-500">{sub}</div> : null}
    </div>
  );
}

export default function LlamadasResumen({ configId, from, to, refrescoMs = 60_000 }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [escuchando, setEscuchando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [verTodas, setVerTodas] = useState(false);

  const cargar = useCallback(async () => {
    if (!configId) return;
    setCargando(true);
    try {
      const { data } = await chatApi.get("/telefonia/historial", {
        params: { id_configuracion: configId, desde: from, hasta: to, limit: 300 },
      });
      setDatos({ llamadas: data?.data || [], resumen: data?.resumen || null });
    } catch {
      setDatos(null);
    } finally {
      setCargando(false);
    }
  }, [configId, from, to]);

  useEffect(() => {
    cargar();
  }, [cargar]);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") cargar();
    }, refrescoMs);
    return () => clearInterval(id);
  }, [cargar, refrescoMs]);

  const r = datos?.resumen;
  const llamadas = datos?.llamadas || [];
  // Sin telefonía contratada y sin llamadas: el bloque no existe para este negocio.
  if (!datos || (!r?.activo && llamadas.length === 0)) return null;

  const lista = verTodas ? llamadas : llamadas.slice(0, 15);
  const minutosDisponibles = r?.saldo_centavos != null && r?.tarifa_centavos_min ? Math.floor(r.saldo_centavos / r.tarifa_centavos_min) : null;
  const resultados = Object.entries(r?.resultados || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-600 to-sky-700 shadow-sm">
            <i className="bx bx-phone-call text-base text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-700">LLAMADAS TELEFÓNICAS</h3>
            <p className="text-xs text-slate-400">
              Llamadas al celular hechas desde el chat con saldo. Cada una queda grabada y la IA la resume: qué se habló, en qué quedó y qué puede mejorar el asesor.
            </p>
          </div>
        </div>
        {r?.activo ? (
          <div className="text-xs text-slate-500">
            Saldo <b className="text-slate-800">{fmtUSD(r.saldo_centavos)}</b>
            {minutosDisponibles != null ? <> · unos <b className="text-slate-800">{minutosDisponibles} min</b> a {fmtUSD(r.tarifa_centavos_min)}/min</> : null}
          </div>
        ) : (
          <div className="text-xs text-amber-700">Telefonía apagada para esta conexión.</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile icon="bx-phone-outgoing" color="#0369a1" label="Llamadas" value={r?.llamadas ?? 0} sub={cargando ? "actualizando…" : "en el período"} />
        <Tile
          icon="bx-phone-call"
          color="#059669"
          label="Contestadas"
          value={r?.contestadas ?? 0}
          sub={r?.llamadas ? `${Math.round((r.contestadas / r.llamadas) * 100)}% de las llamadas` : "—"}
        />
        <Tile icon="bx-time-five" color="#7c3aed" label="Minutos hablados" value={fmtMin(r?.segundos)} sub={r?.contestadas ? `promedio ${fmtSeg(Math.round(r.segundos / r.contestadas))}` : "—"} />
        <Tile icon="bx-dollar-circle" color="#b45309" label="Gastado" value={fmtUSD(r?.costo_centavos)} sub="descontado del saldo" />
      </div>

      {resultados.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400">Según la IA:</span>
          {resultados.map(([k, n]) => {
            const [txt, cls] = RESULTADOS[k] || RESULTADOS.otro;
            return (
              <span key={k} className={`rounded-full px-2 py-0.5 font-bold ${cls}`}>
                {n} {txt.toLowerCase()}
              </span>
            );
          })}
        </div>
      ) : null}

      {r?.por_asesor?.length > 1 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-1 pr-3">Asesor</th>
                <th className="py-1 pr-3">Llamadas</th>
                <th className="py-1 pr-3">Contestadas</th>
                <th className="py-1 pr-3">Minutos</th>
                <th className="py-1 pr-3">Gasto</th>
              </tr>
            </thead>
            <tbody>
              {r.por_asesor.map((a) => (
                <tr key={a.id_sub_usuario} className="border-t border-slate-100">
                  <td className="py-1.5 pr-3 font-semibold text-slate-800">{a.asesor}</td>
                  <td className="py-1.5 pr-3">{a.llamadas}</td>
                  <td className="py-1.5 pr-3">{a.contestadas}</td>
                  <td className="py-1.5 pr-3">{fmtMin(a.segundos)}</td>
                  <td className="py-1.5 pr-3">{fmtUSD(a.costo_centavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-1.5 pr-3">Fecha</th>
              <th className="py-1.5 pr-3">Asesor</th>
              <th className="py-1.5 pr-3">Cliente</th>
              <th className="py-1.5 pr-3">Estado</th>
              <th className="py-1.5 pr-3">Duración</th>
              <th className="py-1.5 pr-3">Grabación</th>
              <th className="py-1.5 pr-3">Resumen IA</th>
            </tr>
          </thead>
          <tbody>
            {llamadas.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-6 text-center text-slate-400">Ninguna llamada en este período.</td>
              </tr>
            ) : (
              lista.map((l) => {
                const [txt, cls] = ESTADOS[l.estado] || [l.estado, "text-slate-600"];
                return (
                  <Fragment key={l.id}>
                    <tr className="border-t border-slate-100 align-top">
                      <td className="whitespace-nowrap py-2 pr-3 text-xs text-slate-600">{fmtFecha(l.inicio_at)}</td>
                      <td className="py-2 pr-3 text-xs font-semibold text-slate-800">{l.asesor || `Asesor ${l.id_sub_usuario}`}</td>
                      <td className="py-2 pr-3 text-xs">
                        <div className="font-medium text-slate-800">{l.cliente || "—"}</div>
                        <div className="text-slate-400">{tel(l.telefono_cliente)}</div>
                      </td>
                      <td className={`py-2 pr-3 text-xs font-semibold ${cls}`}>{txt}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-xs">{l.estado === "answered" ? fmtSeg(l.duracion_seg) : "—"}</td>
                      <td className="py-2 pr-3 text-xs">
                        {l.grabacion_url ? (
                          escuchando === l.id ? (
                            <audio controls autoPlay src={l.grabacion_url} className="h-8 w-52" />
                          ) : (
                            <button type="button" onClick={() => setEscuchando(l.id)} className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline">
                              <i className="bx bx-play-circle" /> escuchar
                            </button>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="max-w-xs py-2 pr-3">
                        <ResumenIACelda l={l} abierto={detalle === l.id} onToggle={() => setDetalle((d) => (d === l.id ? null : l.id))} />
                      </td>
                    </tr>
                    {detalle === l.id && l.ia_estado === "listo" ? (
                      <tr className="bg-slate-50">
                        <td colSpan="7" className="px-3 py-3">
                          <DetalleIA l={l} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
        {llamadas.length > 15 ? (
          <button type="button" onClick={() => setVerTodas((v) => !v)} className="mt-2 text-xs font-semibold text-indigo-600 hover:underline">
            {verTodas ? "Ver menos" : `Ver las ${llamadas.length} llamadas`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
