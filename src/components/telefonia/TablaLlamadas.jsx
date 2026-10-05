import { Fragment, useEffect, useMemo, useState } from "react";
import chatApi from "../../api/chatcenter";
import { ChipResultado, DetalleIA, RESULTADOS } from "./ResumenLlamadaIA";

/**
 * Tabla de llamadas telefónicas, compartida por el historial de /telefonia
 * (super admin) y el bloque de llamadas del dashboard de atención
 * (administrador de la conexión).
 *
 * Pensada para supervisar, no para leer transcripciones una por una:
 *   - Filtros: texto, asesor, resultado de la IA y seguimiento.
 *   - Seguimiento de cada llamada:
 *       pendiente → "Para revisar": la IA detectó atención 1-2 de 5, cliente
 *                   molesto o reclamo (solo en llamadas con conversación
 *                   real), o un supervisor la marcó a mano.
 *       resuelta  → el supervisor dejó la solución que se dio.
 *       escalada  → se pasó a otra persona o área.
 *     Se guarda con POST /telefonia/revision (el back niega al rol ventas).
 *   - Cada fila es una línea; al pulsarla se abre el detalle: resumen,
 *     audio, seguimiento, calidad de red y el análisis completo.
 *   - Paginada de a `porPagina`.
 */
const fmtUSD = (c) => `$${(Number(c || 0) / 100).toFixed(2)}`;
const tel = (t) => (t ? `+${String(t).replace(/^\+/, "")}` : "—");
const aFecha = (v) => (v ? new Date(String(v).includes("T") ? v : `${String(v).replace(" ", "T")}-05:00`) : null);
const fmtFecha = (v) => {
  const d = aFecha(v);
  if (!d || Number.isNaN(d.getTime())) return v ? String(v) : "—";
  const hora = d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? `Hoy ${hora}` : `${d.toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit" })} ${hora}`;
};
const fmtSeg = (s) => {
  const n = Number(s) || 0;
  return n < 60 ? `${n} s` : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")} min`;
};
const ESTADOS = {
  answered: ["Contestada", "text-emerald-700 bg-emerald-50"],
  no_answer: ["No contestaron", "text-amber-700 bg-amber-50"],
  busy: ["Ocupado", "text-amber-700 bg-amber-50"],
  cancel: ["Colgó antes", "text-slate-600 bg-slate-100"],
  failed: ["Falló", "text-rose-700 bg-rose-50"],
  ringing: ["Timbrando", "text-sky-700 bg-sky-50"],
  pedida: ["Marcando", "text-sky-700 bg-sky-50"],
};

/** Hubo conversación real: contestada y la IA no la clasificó como buzón. */
const huboConversacion = (l) => l?.estado === "answered" && l.ia_analisis?.resultado !== "no_contesto";

/** Motivos por los que la IA pide revisar (vacío = ninguno). */
const motivosIA = (l) => {
  if (l?.ia_estado !== "listo" || !l.ia_analisis || !huboConversacion(l)) return [];
  const a = l.ia_analisis;
  const m = [];
  const nota = Number(a.calidad_atencion);
  if (nota > 0 && nota <= 2) m.push(`atención ${nota}/5`);
  if (a.sentimiento === "negativo") m.push("cliente molesto");
  if (a.resultado === "reclamo") m.push("reclamo");
  return m;
};

/** 'pendiente' | 'resuelta' | 'escalada' | null */
export const seguimientoDe = (l) => {
  if (l?.rev_estado === "resuelta" || l?.rev_estado === "escalada") return l.rev_estado;
  if (l?.rev_estado === "pendiente" || motivosIA(l).length) return "pendiente";
  return null;
};
export const necesitaRevision = (l) => seguimientoDe(l) === "pendiente";

/** Calidad de red medida por el navegador del asesor. */
const calidadRed = (l) => {
  if (l.red_perdida_subida == null && l.red_jitter_ms == null) return null;
  const perdida = Math.max(Number(l.red_perdida_subida) || 0, Number(l.red_perdida_bajada) || 0);
  const jitter = Number(l.red_jitter_ms) || 0;
  const rtt = Number(l.red_rtt_ms) || 0;
  const nivel = perdida > 5 || jitter > 60 || rtt > 500 ? "mala" : perdida > 2 || jitter > 30 || rtt > 300 ? "regular" : "buena";
  return { nivel, texto: `pérdida ${perdida.toFixed(1)}% · variación ${Math.round(jitter)} ms · latencia ${Math.round(rtt)} ms` };
};

const CHIP_SEG = {
  pendiente: ["Revisar", "bg-rose-100 text-rose-700", "bxs-flag-alt"],
  resuelta: ["Resuelta", "bg-emerald-100 text-emerald-800", "bx-check-circle"],
  escalada: ["Escalada", "bg-amber-100 text-amber-800", "bx-up-arrow-circle"],
};

const sel = "h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none focus:border-indigo-500";

/** Formulario de seguimiento dentro del detalle de la llamada. */
function Seguimiento({ l, onGuardado }) {
  const seg = seguimientoDe(l);
  const [nota, setNota] = useState(l.rev_nota || "");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setNota(l.rev_nota || ""), [l.id, l.rev_nota]);
  const guardar = async (estado) => {
    setOcupado(true);
    setError("");
    try {
      const { data } = await chatApi.post("/telefonia/revision", { id_llamada: l.id, estado, nota });
      onGuardado(l.id, data?.data || { rev_estado: null, rev_nota: null, rev_por: null, rev_at: null });
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo guardar el seguimiento");
    } finally {
      setOcupado(false);
    }
  };
  const motivos = motivosIA(l);
  const b = "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-50";
  return (
    <div className={`rounded-xl border p-3 ${seg === "pendiente" ? "border-rose-200 bg-rose-50/60" : seg === "resuelta" ? "border-emerald-200 bg-emerald-50/50" : seg === "escalada" ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Seguimiento del supervisor</div>
        {l.rev_estado ? (
          <div className="text-[11px] text-slate-500">
            {CHIP_SEG[l.rev_estado]?.[0] || l.rev_estado} por {l.rev_por || "—"}{l.rev_at ? ` · ${fmtFecha(l.rev_at)}` : ""}
          </div>
        ) : null}
      </div>
      {motivos.length ? <div className="mt-1 text-xs font-semibold text-rose-700"><i className="bx bxs-flag-alt" /> La IA pide revisarla: {motivos.join(" · ")}</div> : null}
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        rows={2}
        placeholder="Qué pasó y qué se hizo: solución que se le dio al cliente, a quién se escaló, acuerdo con el asesor…"
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-indigo-500"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" disabled={ocupado} onClick={() => guardar("resuelta")} className={`${b} bg-emerald-600 text-white hover:bg-emerald-700`}><i className="bx bx-check-circle" /> Marcar resuelta</button>
        <button type="button" disabled={ocupado} onClick={() => guardar("escalada")} className={`${b} bg-amber-500 text-white hover:bg-amber-600`}><i className="bx bx-up-arrow-circle" /> Escalar</button>
        {seg !== "pendiente" ? (
          <button type="button" disabled={ocupado} onClick={() => guardar("pendiente")} className={`${b} border border-rose-300 bg-white text-rose-700 hover:bg-rose-50`}><i className="bx bxs-flag-alt" /> Marcar para revisar</button>
        ) : null}
        {l.rev_estado ? (
          <button type="button" disabled={ocupado} onClick={() => guardar("")} className={`${b} text-slate-500 hover:underline`}>Quitar seguimiento</button>
        ) : null}
        {error ? <span className="text-xs text-rose-700">{error}</span> : null}
      </div>
    </div>
  );
}

export default function TablaLlamadas({ llamadas = [], porPagina = 10, mostrarSalioCon = false, mostrarCosto = true, cargando = false, onSeguimiento, claveReset = "" }) {
  const [q, setQ] = useState("");
  const [asesor, setAsesor] = useState("");
  const [resultado, setResultado] = useState("");
  const [seguimiento, setSeguimiento] = useState("");
  const [pagina, setPagina] = useState(1);
  const [abierta, setAbierta] = useState(null);
  /* Seguimientos guardados en esta sesión, encima de lo que vino del back.
     No se limpian cuando llegan datos nuevos: el panel se refresca solo cada
     minuto y eso no debe cerrar la fila abierta ni borrar una nota a medio
     escribir. */
  const [parches, setParches] = useState({});
  const filas = useMemo(() => llamadas.map((l) => (parches[l.id] ? { ...l, ...parches[l.id] } : l)), [llamadas, parches]);

  const asesores = useMemo(() => {
    const m = new Map();
    filas.forEach((l) => m.set(String(l.id_sub_usuario), l.asesor || `Asesor ${l.id_sub_usuario}`));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [filas]);
  const cuenta = useMemo(() => {
    const c = { pendiente: 0, resuelta: 0, escalada: 0 };
    filas.forEach((l) => {
      const s = seguimientoDe(l);
      if (s) c[s] += 1;
    });
    return c;
  }, [filas]);

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return filas.filter((l) => {
      if (asesor && String(l.id_sub_usuario) !== asesor) return false;
      if (resultado) {
        const r = huboConversacion(l) ? l.ia_analisis?.resultado || "" : "sin_conversacion";
        if (r !== resultado) return false;
      }
      if (seguimiento && seguimientoDe(l) !== seguimiento) return false;
      if (t && !`${l.cliente || ""} ${l.telefono_cliente || ""} ${l.asesor || ""}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [filas, q, asesor, resultado, seguimiento]);

  // Se vuelve a la página 1 al cambiar un filtro o el período (claveReset),
  // no en cada refresco automático de los datos.
  useEffect(() => {
    setPagina(1);
    setAbierta(null);
  }, [q, asesor, resultado, seguimiento, claveReset]);

  const paginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const paginaOk = Math.min(pagina, paginas);
  const desde = (paginaOk - 1) * porPagina;
  const visibles = filtradas.slice(desde, desde + porPagina);
  const columnas = 6 + (mostrarSalioCon ? 1 : 0) + (mostrarCosto ? 1 : 0);
  const guardado = (id, patch) => {
    setParches((p) => ({ ...p, [id]: patch }));
    onSeguimiento?.();
  };

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <i className="bx bx-search absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente, teléfono o asesor" className={`${sel} w-52 pl-7`} />
        </div>
        {asesores.length > 1 ? (
          <select value={asesor} onChange={(e) => setAsesor(e.target.value)} className={sel} aria-label="Asesor">
            <option value="">Todos los asesores</option>
            {asesores.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
          </select>
        ) : null}
        <select value={resultado} onChange={(e) => setResultado(e.target.value)} className={sel} aria-label="Resultado">
          <option value="">Todos los resultados</option>
          {Object.entries(RESULTADOS).filter(([k]) => k !== "no_contesto").map(([k, [txt]]) => <option key={k} value={k}>{txt}</option>)}
          <option value="sin_conversacion">Sin conversación</option>
        </select>
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-xs font-bold">
          {[
            ["", "Todas", "text-slate-700", null],
            ["pendiente", "Para revisar", "text-rose-700", cuenta.pendiente],
            ["resuelta", "Resueltas", "text-emerald-700", cuenta.resuelta],
            ["escalada", "Escaladas", "text-amber-700", cuenta.escalada],
          ].map(([k, txt, color, n]) => (
            <button
              key={k || "todas"}
              type="button"
              onClick={() => setSeguimiento(k)}
              className={`h-9 border-l border-slate-300 px-2.5 first:border-l-0 ${seguimiento === k ? "bg-slate-900 text-white" : `bg-white hover:bg-slate-50 ${color}`}`}
            >
              {txt}{n ? ` ${n}` : ""}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-500">
          {filtradas.length === filas.length ? `${filas.length} llamadas` : `${filtradas.length} de ${filas.length}`}
        </span>
      </div>

      {/* Tabla */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2">Cuándo</th>
              <th className="px-3 py-2">Asesor</th>
              <th className="px-3 py-2">Cliente</th>
              {mostrarSalioCon ? <th className="px-3 py-2">Salió con</th> : null}
              <th className="px-3 py-2">Resultado</th>
              <th className="px-3 py-2">Duración</th>
              {mostrarCosto ? <th className="px-3 py-2">Costo</th> : null}
              <th className="px-3 py-2 text-right">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {cargando && filas.length === 0 ? (
              <tr><td colSpan={columnas} className="px-3 py-8 text-center text-slate-400">Cargando…</td></tr>
            ) : visibles.length === 0 ? (
              <tr><td colSpan={columnas} className="px-3 py-8 text-center text-slate-400">{filas.length ? "Ninguna llamada coincide con el filtro." : "Ninguna llamada en este período."}</td></tr>
            ) : (
              visibles.map((l) => {
                const seg = seguimientoDe(l);
                const open = abierta === l.id;
                const conv = huboConversacion(l);
                const [estTxt, estCls] = ESTADOS[l.estado] || [l.estado, "text-slate-600 bg-slate-100"];
                const a = l.ia_analisis;
                const red = calidadRed(l);
                const borde = seg === "pendiente" ? "border-l-4 border-l-rose-500" : seg === "resuelta" ? "border-l-4 border-l-emerald-500" : seg === "escalada" ? "border-l-4 border-l-amber-500" : "";
                return (
                  <Fragment key={l.id}>
                    <tr onClick={() => setAbierta(open ? null : l.id)} className={`cursor-pointer border-t border-slate-100 align-middle hover:bg-slate-50 ${borde} ${open ? "bg-indigo-50/40" : ""}`}>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">{fmtFecha(l.inicio_at)}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-slate-800">{l.asesor || `Asesor ${l.id_sub_usuario}`}</td>
                      <td className="px-3 py-2 text-xs">
                        <div className="font-medium text-slate-800">{l.cliente || tel(l.telefono_cliente)}</div>
                        {l.cliente ? <div className="text-slate-400">{tel(l.telefono_cliente)}</div> : null}
                      </td>
                      {mostrarSalioCon ? <td className="whitespace-nowrap px-3 py-2 text-xs">{l.caller_id ? tel(l.caller_id) : <span className="text-slate-400">—</span>}</td> : null}
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {conv && a?.resultado ? (
                            <ChipResultado resultado={a.resultado} />
                          ) : (
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${l.estado === "answered" ? "text-slate-600 bg-slate-100" : estCls}`}>{l.estado === "answered" && a ? "Sin conversación" : estTxt}</span>
                          )}
                          {conv && a?.calidad_atencion ? (
                            <span className="text-xs text-amber-500" title={`Atención del asesor ${a.calidad_atencion}/5`}>
                              {"★".repeat(Number(a.calidad_atencion))}<span className="text-slate-300">{"★".repeat(Math.max(0, 5 - Number(a.calidad_atencion)))}</span>
                            </span>
                          ) : null}
                          {seg ? <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${CHIP_SEG[seg][1]}`}><i className={`bx ${CHIP_SEG[seg][2]}`} /> {CHIP_SEG[seg][0]}</span> : null}
                          {red?.nivel === "mala" ? <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700" title={`Red del asesor: ${red.texto}`}><i className="bx bx-wifi-off" /> red mala</span> : null}
                          {l.estado === "answered" && l.ia_estado && l.ia_estado !== "listo" ? <span className="text-[11px] text-slate-400">{l.ia_estado === "pendiente" ? "analizando…" : l.ia_estado === "sin_llave" ? "sin llave de IA" : "IA falló"}</span> : null}
                        </div>
                        {conv && l.ia_resumen && !open ? <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">{l.ia_resumen}</div> : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">{l.estado === "answered" ? fmtSeg(l.duracion_seg) : "—"}</td>
                      {mostrarCosto ? <td className="whitespace-nowrap px-3 py-2 text-xs">{l.costo_centavos ? fmtUSD(l.costo_centavos) : "—"}</td> : null}
                      <td className="px-3 py-2 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
                          {l.grabacion_url ? <i className="bx bx-play-circle text-base" title="Tiene grabación" /> : null}
                          <i className={`bx bx-chevron-down text-lg transition ${open ? "rotate-180" : ""}`} />
                        </span>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="bg-slate-50/70">
                        <td colSpan={columnas} className="px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-3">
                            <div className="space-y-3 lg:col-span-2">
                              {conv && l.ia_resumen ? <p className="text-sm text-slate-800">{l.ia_resumen}</p> : <p className="text-sm text-slate-400">{l.estado === "answered" ? "No hubo conversación (buzón, música o nadie habló)." : "La llamada no se contestó."}</p>}
                              {l.grabacion_url ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <audio controls src={l.grabacion_url} className="h-9 w-full max-w-md" />
                                  <a href={l.grabacion_url} download className="text-xs text-slate-500 hover:underline" onClick={(e) => e.stopPropagation()}>descargar</a>
                                </div>
                              ) : null}
                              {red ? (
                                <div className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs ${red.nivel === "mala" ? "bg-orange-100 text-orange-800" : red.nivel === "regular" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                                  <i className={`bx ${red.nivel === "mala" ? "bx-wifi-off" : "bx-wifi"}`} />
                                  <b>Red del asesor {red.nivel}</b> · {red.texto}
                                </div>
                              ) : null}
                              {conv && l.ia_estado === "listo" ? <div className="border-t border-slate-200 pt-3"><DetalleIA l={l} /></div> : null}
                            </div>
                            <div>{l.estado === "answered" ? <Seguimiento l={l} onGuardado={guardado} /> : null}</div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {filtradas.length > porPagina ? (
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>{desde + 1}–{Math.min(desde + porPagina, filtradas.length)} de {filtradas.length}</span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={paginaOk <= 1} onClick={() => setPagina(paginaOk - 1)} className="rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              <i className="bx bx-chevron-left" /> Anterior
            </button>
            <span className="px-2">Página {paginaOk} de {paginas}</span>
            <button type="button" disabled={paginaOk >= paginas} onClick={() => setPagina(paginaOk + 1)} className="rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              Siguiente <i className="bx bx-chevron-right" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
