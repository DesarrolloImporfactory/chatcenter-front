import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import chatApi from "../../../../api/chatcenter";
import FormSeguimiento from "./FormSeguimiento";
import {
  TIPO_MAP,
  RESULTADOS,
  MOTIVOS_CANCELACION,
  fmtFechaHora,
  fmtFechaCorta,
} from "./constants";

const RESULTADO_LABEL = Object.fromEntries(
  RESULTADOS.map((r) => [r.value, r.label]),
);
const MOTIVO_LABEL = Object.fromEntries(
  MOTIVOS_CANCELACION.map((m) => [m.value, m.label]),
);

export default function SeguimientosTab({ id_usuario }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchData = useCallback(async () => {
    if (!id_usuario) return;
    setLoading(true);
    try {
      const { data } = await chatApi.get(`seguimientos/${id_usuario}`);
      setItems(data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Error cargando seguimientos");
    } finally {
      setLoading(false);
    }
  }, [id_usuario]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const eliminar = async (s) => {
    const r = await Swal.fire({
      title: "¿Eliminar este seguimiento?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Sí, eliminar",
    });
    if (!r.isConfirmed) return;
    try {
      await chatApi.delete(`seguimientos/${s.id_seguimiento}`);
      toast.success("Seguimiento eliminado");
      fetchData();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const eliminarEvidencia = async (idEvidencia) => {
    const r = await Swal.fire({
      title: "¿Quitar esta evidencia?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Sí, quitar",
    });
    if (!r.isConfirmed) return;
    try {
      await chatApi.delete(`seguimientos/evidencia/${idEvidencia}`);
      toast.success("Evidencia eliminada");
      fetchData();
    } catch {
      toast.error("Error al eliminar evidencia");
    }
  };

  const proximoPendiente = items.find(
    (s) =>
      s.proximo_contacto &&
      new Date(s.proximo_contacto) >= new Date(new Date().setHours(0, 0, 0, 0)),
  );

  return (
    <div className="space-y-3">
      {/* Header + Nuevo */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Historial de seguimientos
            <span className="ml-2 text-xs text-slate-500 font-normal">
              ({items.length})
            </span>
          </h3>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition"
        >
          <i className="bx bx-plus" /> Nuevo seguimiento
        </button>
      </div>

      {/* Próximo contacto pendiente */}
      {proximoPendiente && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <i className="bx bx-time-five text-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
              🎯 Próximo contacto agendado
            </div>
            <div className="text-sm font-semibold text-slate-800 mt-0.5">
              {fmtFechaCorta(proximoPendiente.proximo_contacto)} ·{" "}
              {TIPO_MAP[proximoPendiente.tipo]?.label || proximoPendiente.tipo}
              {proximoPendiente.asunto && (
                <span className="text-slate-500">
                  {" "}
                  — {proximoPendiente.asunto}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-10 text-slate-400">
          <i className="bx bx-loader-alt bx-spin text-3xl" />
          <p className="mt-1 text-xs">Cargando…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <i className="bx bx-message-square-detail text-4xl text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">
            Sin seguimientos registrados todavía.
          </p>
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="mt-3 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
          >
            + Registrar el primero
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <SeguimientoCard
              key={s.id_seguimiento}
              s={s}
              onEdit={() => {
                setEditing(s);
                setFormOpen(true);
              }}
              onDelete={() => eliminar(s)}
              onDeleteEvidencia={eliminarEvidencia}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <FormSeguimiento
          id_usuario={id_usuario}
          seguimiento={editing}
          onClose={() => setFormOpen(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}

function SeguimientoCard({ s, onEdit, onDelete, onDeleteEvidencia }) {
  const tipo = TIPO_MAP[s.tipo] || {
    label: s.tipo,
    icon: "bx-message",
    color: "slate",
  };
  const colorMap = {
    cyan: "text-cyan-700 bg-cyan-50 ring-cyan-200",
    emerald: "text-emerald-700 bg-emerald-50 ring-emerald-200",
    sky: "text-sky-700 bg-sky-50 ring-sky-200",
    violet: "text-violet-700 bg-violet-50 ring-violet-200",
    slate: "text-slate-700 bg-slate-100 ring-slate-200",
    rose: "text-rose-700 bg-rose-50 ring-rose-200",
    amber: "text-amber-700 bg-amber-50 ring-amber-200",
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-sm transition">
      <div className="flex items-start gap-3">
        <div
          className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 flex-shrink-0 ${colorMap[tipo.color]}`}
        >
          <i className={`bx ${tipo.icon} text-xl`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="font-bold text-slate-800 text-sm">
                {tipo.label}
                {s.asunto && (
                  <span className="text-slate-500 font-normal">
                    {" "}
                    — {s.asunto}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {fmtFechaHora(s.fecha_seguimiento)} · por{" "}
                <b className="text-slate-600">
                  {s.ejecutado_por_nombre || "—"}
                </b>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={onEdit}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-cyan-600 transition"
                title="Editar"
              >
                <i className="bx bx-edit-alt text-base" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                title="Eliminar"
              >
                <i className="bx bx-trash text-base" />
              </button>
            </div>
          </div>

          {/* Badges: resultado + motivo */}
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            {s.resultado && s.resultado !== "sin_resultado" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                {RESULTADO_LABEL[s.resultado] || s.resultado}
              </span>
            )}
            {s.motivo_cancelacion && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 ring-1 ring-rose-200">
                <i className="bx bx-x-circle mr-1" />{" "}
                {MOTIVO_LABEL[s.motivo_cancelacion] || s.motivo_cancelacion}
              </span>
            )}
            {s.proximo_contacto && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                <i className="bx bx-time-five mr-1" /> Próximo:{" "}
                {fmtFechaCorta(s.proximo_contacto)}
              </span>
            )}
          </div>

          {/* Contenido */}
          {s.contenido && (
            <p className="text-xs text-slate-700 mt-2 whitespace-pre-wrap leading-relaxed">
              {s.contenido}
            </p>
          )}

          {/* Detalle del motivo */}
          {s.motivo_cancelacion_detalle && (
            <div className="mt-2 p-2 bg-rose-50 rounded text-[11px] text-rose-800 italic">
              <i className="bx bx-message-rounded-detail mr-1" />{" "}
              {s.motivo_cancelacion_detalle}
            </div>
          )}

          {/* Evidencias */}
          {s.evidencias && s.evidencias.length > 0 && (
            <div className="mt-2 space-y-1">
              {s.evidencias.map((ev) => (
                <div
                  key={ev.id_evidencia}
                  className="flex items-center gap-1.5 text-[11px] bg-slate-50 rounded px-2 py-1"
                >
                  <i
                    className={`bx ${
                      ev.tipo === "image"
                        ? "bx-image"
                        : ev.tipo === "video"
                          ? "bx-video"
                          : "bx-file"
                    } text-slate-500`}
                  />
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate text-cyan-700 hover:underline font-semibold"
                  >
                    {ev.nombre_archivo || "evidencia"}
                  </a>
                  <button
                    onClick={() => onDeleteEvidencia(ev.id_evidencia)}
                    className="p-0.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                    title="Quitar"
                  >
                    <i className="bx bx-x" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
