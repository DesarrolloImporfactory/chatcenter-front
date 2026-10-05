/**
 * Resumen y detalle del análisis con IA de una llamada telefónica.
 *
 * Lo usan el historial de /telefonia (super admin) y el bloque de llamadas
 * del dashboard de atención (administrador de la conexión). Espera la fila
 * del historial del back (ia_estado, ia_resumen, ia_analisis, ia_transcripcion).
 */
import { useState } from "react";

export const RESULTADOS = {
  venta_cerrada: ["Venta cerrada", "bg-emerald-100 text-emerald-800"],
  pendiente_pago: ["Pendiente de pago", "bg-lime-100 text-lime-800"],
  interesado: ["Interesado", "bg-sky-100 text-sky-800"],
  soporte: ["Soporte", "bg-violet-100 text-violet-800"],
  sin_interes: ["Sin interés", "bg-rose-100 text-rose-800"],
  no_contesto: ["Sin conversación", "bg-slate-100 text-slate-600"],
  reagendar: ["Reagendar", "bg-amber-100 text-amber-800"],
  reclamo: ["Reclamo", "bg-rose-100 text-rose-800"],
  otro: ["Otro", "bg-slate-100 text-slate-600"],
};

export function ChipResultado({ resultado }) {
  const [txt, cls] = RESULTADOS[resultado] || RESULTADOS.otro;
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{txt}</span>;
}

/** Celda compacta: chip de resultado + primera línea del resumen + "ver más". */
export function ResumenIACelda({ l, abierto, onToggle }) {
  if (l.ia_estado === "listo") {
    return (
      <div className="text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <ChipResultado resultado={l.ia_analisis?.resultado} />
          {l.ia_analisis?.calidad_atencion ? (
            <span className="text-slate-400" title="Nota de atención del asesor (1 a 5)">
              {"★".repeat(Number(l.ia_analisis.calidad_atencion))}
            </span>
          ) : null}
        </div>
        <div className={`mt-1 text-slate-700 ${abierto ? "" : "line-clamp-2"}`}>{l.ia_resumen}</div>
        <button type="button" onClick={onToggle} className="mt-0.5 font-semibold text-indigo-600 hover:underline">
          {abierto ? "ocultar" : "ver detalle"}
        </button>
      </div>
    );
  }
  if (l.ia_estado === "sin_llave") return <span className="text-xs text-amber-700" title="Guarda una llave de OpenAI en /telefonia">sin llave de IA</span>;
  if (l.ia_estado === "error") return <span className="text-xs text-rose-700" title={l.ia_error || ""}>falló el análisis</span>;
  if (l.ia_estado === "pendiente") return <span className="text-xs text-slate-400">analizando…</span>;
  return <span className="text-xs text-slate-400">—</span>;
}

/** Panel completo: datos del análisis + transcripción plegable. */
export function DetalleIA({ l }) {
  const [verTexto, setVerTexto] = useState(false);
  const a = l.ia_analisis || {};
  const lista = (arr) => (Array.isArray(arr) && arr.length ? arr : null);
  return (
    <div className="grid gap-3 text-sm md:grid-cols-2">
      <div className="space-y-2">
        {a.motivo ? (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Motivo</div>
            <div className="text-slate-800">{a.motivo}</div>
          </div>
        ) : null}
        {lista(a.objeciones) ? (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Objeciones del cliente</div>
            <ul className="list-disc pl-5 text-slate-800">{a.objeciones.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        ) : null}
        {lista(a.compromisos) ? (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Compromisos</div>
            <ul className="list-disc pl-5 text-slate-800">{a.compromisos.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        ) : null}
        {a.monto_comprometido ? (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pago comprometido</div>
            <div className="font-semibold text-lime-800">{a.monto_comprometido}</div>
          </div>
        ) : null}
        {a.siguiente_paso ? (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Siguiente paso</div>
            <div className="font-semibold text-slate-900">{a.siguiente_paso}</div>
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-3">
          {a.sentimiento ? (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cliente</div>
              <div className="text-slate-800">{a.sentimiento}</div>
            </div>
          ) : null}
          {a.calidad_atencion ? (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Atención del asesor</div>
              <div className="text-slate-800">{a.calidad_atencion} / 5</div>
            </div>
          ) : null}
        </div>
        {lista(a.mejoras) ? (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Para la próxima</div>
            <ul className="list-disc pl-5 text-slate-800">{a.mejoras.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        ) : null}
        {l.ia_transcripcion ? (
          <div>
            <button type="button" onClick={() => setVerTexto((v) => !v)} className="text-xs font-semibold text-indigo-600 hover:underline">
              {verTexto ? "Ocultar transcripción" : "Ver transcripción completa"}
            </button>
            {verTexto ? (
              <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 font-sans text-xs text-slate-700">
                {l.ia_transcripcion}
              </pre>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
