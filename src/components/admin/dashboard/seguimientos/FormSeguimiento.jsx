import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import chatApi from "../../../../api/chatcenter";
import EvidenciaUploader from "./EvidenciaUploader";
import {
  TIPOS_SEGUIMIENTO,
  RESULTADOS,
  MOTIVOS_CANCELACION,
  fmtTamanoBytes,
} from "./constants";

const toLocalInput = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 16);
};

const toLocalDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
};

export default function FormSeguimiento({
  id_usuario,
  seguimiento,
  onClose,
  onSaved,
}) {
  const isEdit = !!seguimiento;

  const [tipo, setTipo] = useState(seguimiento?.tipo || "llamada");
  const [resultado, setResultado] = useState(
    seguimiento?.resultado || "sin_resultado",
  );
  const [asunto, setAsunto] = useState(seguimiento?.asunto || "");
  const [contenido, setContenido] = useState(seguimiento?.contenido || "");
  const [motivoCanc, setMotivoCanc] = useState(
    seguimiento?.motivo_cancelacion || "",
  );
  const [motivoDetalle, setMotivoDetalle] = useState(
    seguimiento?.motivo_cancelacion_detalle || "",
  );
  const [fechaSeg, setFechaSeg] = useState(
    toLocalInput(seguimiento?.fecha_seguimiento) || toLocalInput(new Date()),
  );
  const [proximo, setProximo] = useState(
    toLocalDate(seguimiento?.proximo_contacto),
  );
  const [evidencias, setEvidencias] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const muestraMotivo = tipo === "cancelacion" || tipo === "retencion";

  const submit = async (e) => {
    e.preventDefault();
    if (!contenido.trim()) {
      toast.error("El contenido es requerido");
      return;
    }

    if (muestraMotivo) {
      if (!motivoCanc) {
        toast.error("Selecciona un motivo de cancelación/retención");
        return;
      }
      if (!motivoDetalle.trim()) {
        toast.error("Agrega un detalle del motivo");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        id_usuario,
        tipo,
        resultado,
        asunto: asunto.trim() || null,
        contenido: contenido.trim(),
        motivo_cancelacion: muestraMotivo ? motivoCanc || null : null,
        motivo_cancelacion_detalle: muestraMotivo
          ? motivoDetalle.trim() || null
          : null,
        fecha_seguimiento: fechaSeg ? new Date(fechaSeg).toISOString() : null,
        proximo_contacto: proximo || null,
      };

      if (isEdit) {
        await chatApi.put(`seguimientos/${seguimiento.id_seguimiento}`, {
          ...payload,
          evidencias_nuevas: evidencias,
        });
        toast.success("Seguimiento actualizado");
      } else {
        await chatApi.post("seguimientos", { ...payload, evidencias });
        toast.success("Seguimiento registrado");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header FIJO */}
        <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 text-white px-5 py-4 flex items-start justify-between flex-shrink-0">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
              {isEdit ? "Editar seguimiento" : "Nuevo seguimiento"}
            </div>
            <h2 className="text-lg font-extrabold mt-0.5">
              Cliente #{id_usuario}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <i className="bx bx-x text-2xl" />
          </button>
        </div>

        <form
          onSubmit={submit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          {/* Body SCROLLEABLE */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Tipo */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                Tipo de seguimiento *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {TIPOS_SEGUIMIENTO.map((t) => {
                  const active = tipo === t.value;
                  const colorMap = {
                    cyan: "bg-cyan-100 text-cyan-700 ring-cyan-500",
                    emerald: "bg-emerald-100 text-emerald-700 ring-emerald-500",
                    sky: "bg-sky-100 text-sky-700 ring-sky-500",
                    violet: "bg-violet-100 text-violet-700 ring-violet-500",
                    slate: "bg-slate-200 text-slate-700 ring-slate-500",
                    rose: "bg-rose-100 text-rose-700 ring-rose-500",
                    amber: "bg-amber-100 text-amber-700 ring-amber-500",
                  };
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTipo(t.value)}
                      className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-[10px] font-semibold transition ${
                        active
                          ? `${colorMap[t.color]} ring-2`
                          : "bg-slate-50 text-slate-500 hover:bg-slate-100 ring-1 ring-slate-200"
                      }`}
                    >
                      <i className={`bx ${t.icon} text-xl`} />
                      <span className="text-center leading-tight">
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resultado */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Resultado
              </label>
              <select
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {RESULTADOS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Asunto */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Asunto{" "}
                <span className="text-slate-400 normal-case">
                  (opcional · resumen breve)
                </span>
              </label>
              <input
                type="text"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder="Ej: Llamada de cobro - pidió 3 días más"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Contenido */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Contenido / Nota *
              </label>
              <textarea
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                required
                rows={4}
                placeholder="Describe la conversación, acuerdos, problemas detectados, próximos pasos…"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500 resize-y"
              />
            </div>

            {/* Motivo (solo si es cancelacion/retencion) */}
            {muestraMotivo && (
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 space-y-3">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
                  <i className="bx bx-info-circle" />
                  Detalle de cancelación/retención
                  <span className="ml-auto text-[10px] font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                    Requerido
                  </span>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Motivo principal <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={motivoCanc}
                    onChange={(e) => setMotivoCanc(e.target.value)}
                    required={muestraMotivo}
                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white ${
                      muestraMotivo && !motivoCanc
                        ? "border-rose-300"
                        : "border-slate-300"
                    }`}
                  >
                    <option value="">— Selecciona un motivo —</option>
                    {MOTIVOS_CANCELACION.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Detalle adicional <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={motivoDetalle}
                    onChange={(e) => setMotivoDetalle(e.target.value)}
                    required={muestraMotivo}
                    placeholder="Ej: 'Cerró su tienda física por temas familiares'"
                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white ${
                      muestraMotivo && !motivoDetalle.trim()
                        ? "border-rose-300"
                        : "border-slate-300"
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Fecha del seguimiento
                </label>
                <input
                  type="datetime-local"
                  value={fechaSeg}
                  onChange={(e) => setFechaSeg(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Próximo contacto{" "}
                  <span className="text-slate-400 normal-case">(opcional)</span>
                </label>
                <input
                  type="date"
                  value={proximo}
                  onChange={(e) => setProximo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Evidencias ya guardadas (solo en edit) */}
            {isEdit && seguimiento?.evidencias?.length > 0 && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  Evidencias ya guardadas
                  <span className="ml-1 text-slate-400 normal-case">
                    ({seguimiento.evidencias.length})
                  </span>
                </label>
                <div className="space-y-1.5">
                  {seguimiento.evidencias.map((ev) => (
                    <div
                      key={ev.id_evidencia}
                      className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg border border-slate-200 text-xs"
                    >
                      <i
                        className={`bx ${
                          ev.tipo === "image"
                            ? "bx-image"
                            : ev.tipo === "video"
                              ? "bx-video"
                              : "bx-file"
                        } text-lg text-slate-500 flex-shrink-0`}
                      />

                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 truncate text-cyan-700 hover:underline font-semibold"
                      >
                        {ev.nombre_archivo || "archivo"}
                      </a>
                      <span className="text-slate-400 font-mono">
                        {fmtTamanoBytes(ev.tamano_bytes)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 text-[11px] text-slate-500 italic flex items-center gap-1">
                  <i className="bx bx-info-circle" />
                  Para eliminar una evidencia existente, hazlo desde la tarjeta
                  del seguimiento.
                </div>
              </div>
            )}

            {/* Uploader de nuevas evidencias */}
            <EvidenciaUploader
              evidencias={evidencias}
              setEvidencias={setEvidencias}
              isEdit={isEdit}
            />
          </div>

          {/* Footer FIJO con acciones */}
          <div className="flex-shrink-0 border-t border-slate-100 px-5 py-3 flex items-center justify-end gap-2 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm transition disabled:opacity-50"
            >
              <i
                className={`bx ${saving ? "bx-loader-alt bx-spin" : "bx-check"}`}
              />
              {saving
                ? "Guardando…"
                : isEdit
                  ? "Actualizar"
                  : "Registrar seguimiento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
