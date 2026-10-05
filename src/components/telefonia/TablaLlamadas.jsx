import { Fragment, useEffect, useMemo, useState } from "react";
import { ChipResultado, DetalleIA, RESULTADOS } from "./ResumenLlamadaIA";

/**
 * Tabla de llamadas telefónicas, compartida por el historial de /telefonia
 * (super admin) y el bloque de llamadas del dashboard de atención
 * (administrador de la conexión).
 *
 * Pensada para supervisar, no para leer transcripciones una por una:
 *   - Filtros: texto (cliente o teléfono), asesor, resultado de la IA y
 *     "solo para revisar".
 *   - "Para revisar" = la IA detectó algo que un supervisor debería mirar:
 *     atención calificada 1 o 2 de 5, cliente negativo o reclamo. Se marca
 *     con una bandera y un borde rojo; el filtro las deja solas.
 *   - Cada fila es una línea; el detalle (resumen completo, objeciones,
 *     mejoras, transcripción y audio) se abre al pulsarla.
 *   - Paginada de a `porPagina` (sin scroll infinito).
 *
 * Espera las filas del back (/telefonia/historial o /telefonia/admin/historial):
 * asesor, cliente, telefono_cliente, estado, duracion_seg, costo_centavos,
 * grabacion_url, caller_id, ia_estado, ia_resumen, ia_analisis, ia_transcripcion.
 */
const fmtUSD = (c) => `$${(Number(c || 0) / 100).toFixed(2)}`;
const tel = (t) => (t ? `+${String(t).replace(/^\+/, "")}` : "—");
const fmtFecha = (v) => {
  if (!v) return "—";
  const d = new Date(String(v).includes("T") ? v : `${String(v).replace(" ", "T")}-05:00`);
  if (Number.isNaN(d.getTime())) return String(v);
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  const hora = d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
  return mismoDia ? `Hoy ${hora}` : `${d.toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit" })} ${hora}`;
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

/** ¿Un supervisor debería mirar esta llamada? */
export const necesitaRevision = (l) => {
  if (l?.ia_estado !== "listo" || !l.ia_analisis) return false;
  const a = l.ia_analisis;
  return Number(a.calidad_atencion) > 0 && Number(a.calidad_atencion) <= 2 || a.sentimiento === "negativo" || a.resultado === "reclamo";
};
const motivoRevision = (l) => {
  const a = l.ia_analisis || {};
  const m = [];
  if (Number(a.calidad_atencion) > 0 && Number(a.calidad_atencion) <= 2) m.push(`atención ${a.calidad_atencion}/5`);
  if (a.sentimiento === "negativo") m.push("cliente molesto");
  if (a.resultado === "reclamo") m.push("reclamo");
  return m.join(" · ");
};

const sel = "h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none focus:border-indigo-500";

export default function TablaLlamadas({ llamadas = [], porPagina = 10, mostrarSalioCon = false, mostrarCosto = true, cargando = false }) {
  const [q, setQ] = useState("");
  const [asesor, setAsesor] = useState("");
  const [resultado, setResultado] = useState("");
  const [soloRevisar, setSoloRevisar] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [abierta, setAbierta] = useState(null);

  const asesores = useMemo(() => {
    const m = new Map();
    llamadas.forEach((l) => m.set(String(l.id_sub_usuario), l.asesor || `Asesor ${l.id_sub_usuario}`));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [llamadas]);

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return llamadas.filter((l) => {
      if (asesor && String(l.id_sub_usuario) !== asesor) return false;
      if (resultado && (l.ia_analisis?.resultado || (l.estado !== "answered" ? "sin_conversacion" : "")) !== resultado) return false;
      if (soloRevisar && !necesitaRevision(l)) return false;
      if (t && !`${l.cliente || ""} ${l.telefono_cliente || ""} ${l.asesor || ""}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [llamadas, q, asesor, resultado, soloRevisar]);

  useEffect(() => {
    setPagina(1);
    setAbierta(null);
  }, [q, asesor, resultado, soloRevisar, llamadas]);

  const paginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const desde = (pagina - 1) * porPagina;
  const visibles = filtradas.slice(desde, desde + porPagina);
  const revisar = llamadas.filter(necesitaRevision).length;
  const columnas = 6 + (mostrarSalioCon ? 1 : 0) + (mostrarCosto ? 1 : 0);

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <i className="bx bx-search absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente, teléfono o asesor" className={`${sel} w-56 pl-7`} />
        </div>
        {asesores.length > 1 ? (
          <select value={asesor} onChange={(e) => setAsesor(e.target.value)} className={sel} aria-label="Asesor">
            <option value="">Todos los asesores</option>
            {asesores.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
          </select>
        ) : null}
        <select value={resultado} onChange={(e) => setResultado(e.target.value)} className={sel} aria-label="Resultado">
          <option value="">Todos los resultados</option>
          {Object.entries(RESULTADOS).map(([k, [txt]]) => <option key={k} value={k}>{txt}</option>)}
          <option value="sin_conversacion">No contestaron / falló</option>
        </select>
        <button
          type="button"
          onClick={() => setSoloRevisar((v) => !v)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold ${soloRevisar ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
          title="Atención calificada 1 o 2, cliente molesto o reclamo"
        >
          <i className="bx bxs-flag-alt" /> Para revisar{revisar ? ` (${revisar})` : ""}
        </button>
        <span className="ml-auto text-xs text-slate-500">
          {filtradas.length === llamadas.length ? `${llamadas.length} llamadas` : `${filtradas.length} de ${llamadas.length} llamadas`}
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
            {cargando && llamadas.length === 0 ? (
              <tr><td colSpan={columnas} className="px-3 py-8 text-center text-slate-400">Cargando…</td></tr>
            ) : visibles.length === 0 ? (
              <tr><td colSpan={columnas} className="px-3 py-8 text-center text-slate-400">{llamadas.length ? "Ninguna llamada coincide con el filtro." : "Ninguna llamada todavía."}</td></tr>
            ) : (
              visibles.map((l) => {
                const rev = necesitaRevision(l);
                const open = abierta === l.id;
                const [estTxt, estCls] = ESTADOS[l.estado] || [l.estado, "text-slate-600 bg-slate-100"];
                const a = l.ia_analisis;
                return (
                  <Fragment key={l.id}>
                    <tr
                      onClick={() => setAbierta(open ? null : l.id)}
                      className={`cursor-pointer border-t border-slate-100 align-middle hover:bg-slate-50 ${rev ? "border-l-4 border-l-rose-500" : ""} ${open ? "bg-indigo-50/40" : ""}`}
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">{fmtFecha(l.inicio_at)}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-slate-800">{l.asesor || `Asesor ${l.id_sub_usuario}`}</td>
                      <td className="px-3 py-2 text-xs">
                        <div className="font-medium text-slate-800">{l.cliente || tel(l.telefono_cliente)}</div>
                        {l.cliente ? <div className="text-slate-400">{tel(l.telefono_cliente)}</div> : null}
                      </td>
                      {mostrarSalioCon ? <td className="whitespace-nowrap px-3 py-2 text-xs">{l.caller_id ? tel(l.caller_id) : <span className="text-slate-400">—</span>}</td> : null}
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {l.estado === "answered" && a?.resultado ? <ChipResultado resultado={a.resultado} /> : <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${estCls}`}>{estTxt}</span>}
                          {a?.calidad_atencion ? <span className="text-xs text-amber-500" title={`Atención del asesor ${a.calidad_atencion}/5`}>{"★".repeat(Number(a.calidad_atencion))}<span className="text-slate-300">{"★".repeat(5 - Number(a.calidad_atencion))}</span></span> : null}
                          {rev ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700" title={motivoRevision(l)}><i className="bx bxs-flag-alt" /> Revisar</span> : null}
                          {l.estado === "answered" && l.ia_estado && l.ia_estado !== "listo" ? <span className="text-[11px] text-slate-400">{l.ia_estado === "pendiente" ? "analizando…" : l.ia_estado === "sin_llave" ? "sin llave de IA" : "IA falló"}</span> : null}
                        </div>
                        {l.ia_resumen && !open ? <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">{l.ia_resumen}</div> : null}
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
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="max-w-3xl">
                              {l.ia_resumen ? <p className="text-sm text-slate-800">{l.ia_resumen}</p> : <p className="text-sm text-slate-400">{l.estado === "answered" ? "Sin resumen de IA para esta llamada." : "No hubo conversación."}</p>}
                              {rev ? <p className="mt-1 text-xs font-semibold text-rose-700"><i className="bx bxs-flag-alt" /> Para revisar: {motivoRevision(l)}</p> : null}
                            </div>
                            {l.grabacion_url ? (
                              <div className="flex items-center gap-2">
                                <audio controls src={l.grabacion_url} className="h-8 w-64" />
                                <a href={l.grabacion_url} download className="text-xs text-slate-500 hover:underline" onClick={(e) => e.stopPropagation()}>descargar</a>
                              </div>
                            ) : null}
                          </div>
                          {l.ia_estado === "listo" ? <div className="mt-3 border-t border-slate-200 pt-3"><DetalleIA l={l} /></div> : null}
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
            <button type="button" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} className="rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              <i className="bx bx-chevron-left" /> Anterior
            </button>
            <span className="px-2">Página {pagina} de {paginas}</span>
            <button type="button" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)} className="rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              Siguiente <i className="bx bx-chevron-right" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
