import { useState } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { agregarDeuda, TIPOS_VENTA, ASESORES } from "../../services/imporsuit";
import { Overlay, Field, inputCls, btnPrimary, btnGhost } from "./CrearUsuarioForm";

/**
 * Agrega una deuda a una cartera.
 * Props: { idCarteraUuid, onClose, onSaved }
 */
export function AgregarDeudaForm({ idCarteraUuid, onClose, onSaved }) {
  const [form, setForm] = useState({
    concepto: "",
    monto: "",
    tipoVenta: "fria",
    fechaLimite: "",
    launchId: "",
    asesor: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (name) => (e) =>
    setForm((p) => ({ ...p, [name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.concepto.trim()) return toast.error("Ingresa un concepto");
    if (!form.monto || Number(form.monto) <= 0)
      return toast.error("El monto debe ser mayor a 0");
    if (!form.fechaLimite) return toast.error("Selecciona la fecha límite");
    if (!form.asesor) return toast.error("Selecciona el asesor");

    setSubmitting(true);
    try {
      const resultado = await agregarDeuda({
        concepto: form.concepto,
        monto: Number(form.monto),
        idCarteraUuid,
        tipoVenta: form.tipoVenta,
        fechaLimite: form.fechaLimite,
        launchId: form.launchId,
        idAsesor: form.asesor,
      });
      toast.success("Deuda agregada");
      onSaved?.(resultado);
      onClose?.();
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo agregar", text: err?.message ?? "Inténtalo de nuevo." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClose={() => !submitting && onClose?.()}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h3 className="text-base font-bold text-gray-800">Nueva deuda</h3>
          <button onClick={onClose} disabled={submitting} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">✕</button>
        </header>

        <form onSubmit={submit} className="space-y-3 px-5 py-4">
          <Field label="Concepto">
            <input className={inputCls} value={form.concepto} onChange={set("concepto")} disabled={submitting} placeholder="Ej. Cuota 1 - Curso Importador" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto">
              <input type="number" step="0.01" min="0" className={inputCls} value={form.monto} onChange={set("monto")} disabled={submitting} placeholder="0.00" />
            </Field>
            <Field label="Tipo de venta">
              <select className={inputCls} value={form.tipoVenta} onChange={set("tipoVenta")} disabled={submitting}>
                {TIPOS_VENTA.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Asesor">
            <select className={inputCls} value={form.asesor} onChange={set("asesor")} disabled={submitting}>
              <option value="">Selecciona el asesor</option>
              {ASESORES.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </Field>

          <Field label="Fecha límite">
            <input type="date" className={inputCls} value={form.fechaLimite} onChange={set("fechaLimite")} disabled={submitting} />
          </Field>

          <Field label="Launch ID (opcional)">
            <input className={inputCls} value={form.launchId} onChange={set("launchId")} disabled={submitting} placeholder="Identificador del lanzamiento" />
          </Field>

          <footer className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button type="button" onClick={onClose} disabled={submitting} className={btnGhost}>Cancelar</button>
            <button type="submit" disabled={submitting} className={btnPrimary}>
              {submitting ? "Agregando…" : "Agregar deuda"}
            </button>
          </footer>
        </form>
      </div>
    </Overlay>
  );
}
