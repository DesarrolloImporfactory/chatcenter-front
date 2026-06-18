import { useCallback, useEffect, useState } from "react";
import {
  CHECKLIST_CONFIGS_HABILITADAS,
  getChecklistUsuario,
  marcarChecklistItem,
  guardarNotaChecklist,
} from "../../services/imporsuit";

/**
 * Checklist del Alumno (Club de Importadores) — vista EDITABLE para el asesor
 * desde el panel "Información del cliente" de chatcenter.
 *
 * El asesor puede ver Y llenar el checklist del cliente: marcar/desmarcar pasos
 * y editar las notas. El progreso se resuelve por el correo del chat (→ id_users
 * en Imporsuit). Sin tiempo real: la carga es bajo demanda (botón "Actualizar")
 * y cada cambio se guarda al instante con actualización optimista.
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
          Abrir <i className="bx bx-chevron-right text-[14px]" />
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

/** Recalcula completados/total/pct de cada sección a partir de sus items. */
function recalcSecciones(secs) {
  return secs.map((s) => {
    const items = s.items || [];
    const total = items.length;
    const completados = items.filter((i) => i.completado).length;
    return {
      ...s,
      total,
      completados,
      pct: total ? Math.round((completados * 100) / total) : 0,
    };
  });
}

/** Recalcula las métricas globales a partir de las secciones ya recalculadas. */
function recalcMetricas(secs, prev) {
  let total = 0;
  let completados = 0;
  const por_seccion = secs.map((s) => {
    total += s.total || 0;
    completados += s.completados || 0;
    return {
      clave: s.clave,
      titulo: s.titulo,
      total: s.total || 0,
      completados: s.completados || 0,
      pct: s.pct || 0,
    };
  });
  return {
    ...(prev || {}),
    total,
    completados,
    pct: total ? Math.round((completados * 100) / total) : 0,
    por_seccion,
  };
}

function ChecklistPanel({ correo, nombre, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [secciones, setSecciones] = useState([]);
  const [metricas, setMetricas] = useState(null);
  const [idUsuario, setIdUsuario] = useState(0);

  // Estado de escritura (marcar / notas)
  const [savingId, setSavingId] = useState(null);
  const [accionError, setAccionError] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const cargar = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await getChecklistUsuario({ correo, signal });
        setSecciones(res.secciones);
        setMetricas(res.metricas);
        setIdUsuario(res.id_usuario || 0);
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

  // Identificador del cliente para las escrituras: id_usuario si lo tenemos,
  // si no, el correo (el backend resuelve uno u otro).
  const targetCliente = () =>
    idUsuario ? { idUsuario } : { correo };

  /** Marca/desmarca un paso con actualización optimista + reversión si falla. */
  async function toggleItem(it) {
    if (savingId) return;
    const nuevo = !it.completado;
    const prevSecciones = secciones;
    const prevMetricas = metricas;

    const next = recalcSecciones(
      secciones.map((s) => ({
        ...s,
        items: (s.items || []).map((i) =>
          i.id === it.id ? { ...i, completado: nuevo } : i,
        ),
      })),
    );
    setSavingId(it.id);
    setAccionError(null);
    setSecciones(next);
    setMetricas(recalcMetricas(next, metricas));

    try {
      const r = await marcarChecklistItem({
        ...targetCliente(),
        idItem: it.id,
        completado: nuevo,
      });
      if (!idUsuario && r.id_usuario) setIdUsuario(r.id_usuario);
    } catch (e) {
      setSecciones(prevSecciones);
      setMetricas(prevMetricas);
      setAccionError(e.message || "No se pudo guardar el cambio.");
    } finally {
      setSavingId(null);
    }
  }

  function startEditNote(it) {
    setEditingNoteId(it.id);
    setNoteDraft(it.notas || "");
    setAccionError(null);
  }

  function cancelEditNote() {
    setEditingNoteId(null);
    setNoteDraft("");
  }

  /** Guarda la nota de un paso con actualización optimista. */
  async function saveNote(it) {
    const valor = noteDraft;
    const prevSecciones = secciones;
    setSavingNote(true);
    setAccionError(null);

    setSecciones((secs) =>
      secs.map((s) => ({
        ...s,
        items: (s.items || []).map((i) =>
          i.id === it.id ? { ...i, notas: valor } : i,
        ),
      })),
    );

    try {
      const r = await guardarNotaChecklist({
        ...targetCliente(),
        idItem: it.id,
        notas: valor,
      });
      if (!idUsuario && r.id_usuario) setIdUsuario(r.id_usuario);
      setEditingNoteId(null);
      setNoteDraft("");
    } catch (e) {
      setSecciones(prevSecciones);
      setAccionError(e.message || "No se pudo guardar la nota.");
    } finally {
      setSavingNote(false);
    }
  }

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
        {!sinDatos && !loading && !error && (
          <p className="mt-1 text-[11px] text-slate-400">
            Marca los pasos o edita las notas; los cambios se guardan al instante.
          </p>
        )}
      </div>

      {/* Aviso de error de guardado (no bloquea la vista) */}
      {accionError && (
        <div className="border-b border-rose-100 bg-rose-50 px-5 py-2 text-xs font-medium text-rose-600">
          {accionError}
        </div>
      )}

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
                    className="rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleItem(it)}
                        disabled={savingId === it.id}
                        title={
                          it.completado
                            ? "Marcar como pendiente"
                            : "Marcar como completado"
                        }
                        className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-[12px] font-bold transition disabled:opacity-50 ${
                          it.completado
                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                            : "border border-slate-300 bg-white text-transparent hover:border-emerald-400"
                        }`}
                      >
                        ✓
                      </button>
                      <div className="min-w-0 flex-1">
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

                        {editingNoteId === it.id ? (
                          <div className="mt-1.5">
                            <textarea
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              rows={2}
                              placeholder="Escribe una nota…"
                              className="w-full resize-y rounded border border-slate-300 px-2 py-1 text-[12px] text-slate-700 focus:border-sky-400 focus:outline-none"
                            />
                            <div className="mt-1 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => saveNote(it)}
                                disabled={savingNote}
                                className="rounded bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
                              >
                                {savingNote ? "Guardando…" : "Guardar"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditNote}
                                disabled={savingNote}
                                className="rounded px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-200"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : it.notas ? (
                          <div className="mt-1 flex items-start gap-1">
                            <p className="flex-1 rounded border-l-2 border-amber-300 bg-amber-50 px-2 py-1 text-[12px] text-amber-800">
                              📝 {it.notas}
                            </p>
                            <button
                              type="button"
                              onClick={() => startEditNote(it)}
                              title="Editar nota"
                              className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                            >
                              <i className="bx bx-pencil text-[14px]" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditNote(it)}
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition hover:text-sky-600"
                          >
                            <i className="bx bx-plus text-[13px]" /> Agregar nota
                          </button>
                        )}
                      </div>
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
