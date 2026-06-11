import { useCallback, useEffect, useState } from "react";
import {
  CHECKLIST_CONFIGS_HABILITADAS,
  getChecklistUsuario,
} from "../../services/imporsuit";

/**
 * Checklist del Alumno (Club de Importadores) — vista de SOLO LECTURA para el
 * asesor desde el panel "Información del cliente" de chatcenter.
 *
 * Igual que la cartera: una barra/botón en el panel que abre un modal grande.
 * El progreso se resuelve por el correo del chat (→ id_users en Imporsuit) y se
 * muestra sin posibilidad de edición. Sin tiempo real: hay un botón "Actualizar".
 */
export default function ChecklistImporsuitSection({
  selectedChat,
  idConfiguracion,
}) {
  const [open, setOpen] = useState(false);
  const correo = selectedChat?.email_cliente || "";
  const nombre = selectedChat?.nombre_cliente || "";

  // Gate propio del checklist (cuenta de importaciones), independiente de la
  // cartera (ventas). Si el array está vacío, no se muestra en ninguna config.
  if (!CHECKLIST_CONFIGS_HABILITADAS.includes(Number(idConfiguracion))) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-1 mb-3 mt-1 flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.07]"
      >
        <span className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-500/10">
            <i className="bx bx-list-check text-[16px] text-sky-300" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[8px] font-semibold uppercase tracking-[0.22em] text-white/35">
              Imporsuit
            </span>
            <span className="text-[12px] font-bold uppercase tracking-wide text-white">
              Checklist del alumno
            </span>
          </span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-sky-400/25 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-200">
          Ver <i className="bx bx-chevron-right text-[14px]" />
        </span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <div
            className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div className="w-full max-w-2xl">
              <ChecklistPanel
                key={correo || "sin-correo"}
                correo={correo}
                nombre={nombre}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

function ChecklistPanel({ correo, nombre, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [secciones, setSecciones] = useState([]);
  const [metricas, setMetricas] = useState(null);

  const cargar = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await getChecklistUsuario({ correo, signal });
        setSecciones(res.secciones);
        setMetricas(res.metricas);
      } catch (e) {
        if (e.name !== "CanceledError" && e.name !== "AbortError") {
          setError(e.message || "No se pudo cargar el checklist.");
        }
      } finally {
        setLoading(false);
      }
    },
    [correo],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    cargar(ctrl.signal);
    return () => ctrl.abort();
  }, [cargar]);

  const pctGlobal = metricas?.pct ?? 0;
  const sinDatos = !loading && !error && secciones.length === 0;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-slate-900 px-5 py-4 text-white">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300/70">
            Checklist del alumno
          </p>
          <h3 className="truncate text-base font-bold">
            {nombre || correo || "Cliente"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => cargar()}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
            title="Actualizar"
          >
            <i className={`bx bx-refresh text-[15px] ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Cerrar"
          >
            <i className="bx bx-x text-[20px]" />
          </button>
        </div>
      </div>

      {/* Barra global */}
      <div className="border-b border-slate-100 px-5 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-700">
            Progreso general
          </span>
          <span className="text-lg font-extrabold text-emerald-600">
            {pctGlobal}%
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
            style={{ width: `${pctGlobal}%` }}
          />
        </div>
        {metricas && (
          <p className="mt-1.5 text-xs text-slate-500">
            {metricas.completados} de {metricas.total} pasos completados
            {metricas.ultima_actividad
              ? ` · última actividad: ${metricas.ultima_actividad}`
              : ""}
          </p>
        )}
      </div>

      {/* Cuerpo */}
      <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
        {loading && (
          <p className="py-10 text-center text-sm text-slate-400">
            Cargando checklist…
          </p>
        )}
        {error && (
          <p className="py-10 text-center text-sm text-rose-500">{error}</p>
        )}
        {sinDatos && (
          <p className="py-10 text-center text-sm text-slate-400">
            Este cliente aún no tiene avance en el checklist
            {correo ? "" : " (sin correo asociado)"}.
          </p>
        )}

        {!loading &&
          !error &&
          secciones.map((sec) => (
            <section key={sec.id} className="mb-4 last:mb-0">
              <header className="mb-2 flex items-center gap-2">
                <span className="text-lg leading-none">{sec.icono || "•"}</span>
                <h4 className="flex-1 text-sm font-bold text-slate-800">
                  {sec.titulo}
                </h4>
                <span className="text-xs font-bold text-emerald-600">
                  {sec.pct ?? 0}%
                </span>
                <span className="text-[11px] text-slate-400">
                  {sec.completados}/{sec.total}
                </span>
              </header>
              <ul className="space-y-1.5">
                {(sec.items || []).map((it) => (
                  <li
                    key={it.id}
                    className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <span
                      className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-[12px] font-bold ${
                        it.completado
                          ? "bg-emerald-500 text-white"
                          : "border border-slate-300 bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-[13px] leading-snug ${
                          it.completado
                            ? "text-slate-400 line-through"
                            : "text-slate-700"
                        }`}
                      >
                        <span className="mr-1 font-bold text-sky-500">
                          {it.numero}
                        </span>
                        {it.titulo}
                      </p>
                      {it.notas ? (
                        <p className="mt-1 rounded border-l-2 border-amber-300 bg-amber-50 px-2 py-1 text-[12px] text-amber-800">
                          📝 {it.notas}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </div>
  );
}
