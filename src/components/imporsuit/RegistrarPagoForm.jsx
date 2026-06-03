import { useState } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { agregarPago, MEDIOS_PAGO, MONEDAS } from "../../services/imporsuit";
import { Overlay, Field, inputCls, btnPrimary, btnGhost } from "./CrearUsuarioForm";
import { ComprobantesUploader } from "./ComprobantesUploader";

const MONEY = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });
const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Registra un pago/abono sobre una deuda.
 * Props: { deuda, onClose, onSaved }
 *
 * Los comprobantes se suben a S3 con <ComprobantesUploader/> (drag&drop) y se
 * mandan como `imagenes_urls` al registrar el pago.
 */
export function RegistrarPagoForm({ deuda, onClose, onSaved }) {
  const pendiente = Number(deuda?.monto_pendiente ?? 0);
  const [form, setForm] = useState({
    montoPagado: "",
    fechaPago: todayIso(),
    medioPago: "transferencia_ec",
    moneda: "USD",
    referencia: "",
    numeroCuota: "",
  });
  const [imagenesUrls, setImagenesUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  if (!deuda) return null;

  const set = (name) => (e) =>
    setForm((p) => ({ ...p, [name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const monto = Number(form.montoPagado);
    if (!form.montoPagado || monto <= 0) return toast.error("Monto > 0");
    if (monto > pendiente)
      return toast.error(`No puede superar ${MONEY.format(pendiente)}`);
    if (!form.fechaPago) return toast.error("Selecciona la fecha");

    if (imagenesUrls.length === 0) {
      const c = await Swal.fire({
        icon: "warning",
        title: "¿Registrar sin comprobante?",
        text: "No subiste ninguna imagen ni archivo.",
        showCancelButton: true,
        confirmButtonText: "Sí, registrar",
        cancelButtonText: "Cancelar",
      });
      if (!c.isConfirmed) return;
    }

    setSubmitting(true);
    try {
      const resultado = await agregarPago({
        idCpp: deuda.id_cpp,
        montoPagado: monto,
        fechaPago: form.fechaPago,
        medioPago: form.medioPago,
        referencia: form.referencia,
        imagenesUrls,
        numeroCuota: form.numeroCuota,
        moneda: form.moneda,
      });
      toast.success("Pago registrado");
      onSaved?.(resultado);
      onClose?.();
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo registrar el pago", text: err?.message ?? "Inténtalo de nuevo." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClose={() => !submitting && onClose?.()}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <header className="border-b border-gray-100 px-5 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-800">Registrar pago</h3>
            <button onClick={onClose} disabled={submitting} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">✕</button>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {deuda.concepto} · Pendiente:{" "}
            <strong className="text-amber-600">{MONEY.format(pendiente)}</strong>
          </p>
        </header>

        <form onSubmit={submit} className="max-h-[80vh] space-y-3 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto pagado">
              <input type="number" step="0.01" min="0" max={pendiente} className={inputCls} value={form.montoPagado} onChange={set("montoPagado")} disabled={submitting} placeholder="0.00" />
            </Field>
            <Field label="Fecha del pago">
              <input type="date" className={inputCls} value={form.fechaPago} onChange={set("fechaPago")} disabled={submitting} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Medio de pago">
              <select className={inputCls} value={form.medioPago} onChange={set("medioPago")} disabled={submitting}>
                {MEDIOS_PAGO.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Moneda">
              <select className={inputCls} value={form.moneda} onChange={set("moneda")} disabled={submitting}>
                {MONEDAS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Referencia (opcional)">
            <input className={inputCls} value={form.referencia} onChange={set("referencia")} disabled={submitting} placeholder="N° de transferencia, depósito…" />
          </Field>

          <Field label="Número de cuota (opcional)">
            <input className={inputCls} value={form.numeroCuota} onChange={set("numeroCuota")} disabled={submitting} placeholder="Ej. 1, 2, 3… (dispara webhook de cuotas)" />
          </Field>

          <Field label="Comprobantes (imágenes / PDF / archivos)">
            <ComprobantesUploader
              urls={imagenesUrls}
              onChange={setImagenesUrls}
              disabled={submitting}
            />
          </Field>

          <footer className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button type="button" onClick={onClose} disabled={submitting} className={btnGhost}>Cancelar</button>
            <button type="submit" disabled={submitting} className={btnPrimary}>
              {submitting ? "Procesando…" : "Registrar pago"}
            </button>
          </footer>
        </form>
      </div>
    </Overlay>
  );
}
