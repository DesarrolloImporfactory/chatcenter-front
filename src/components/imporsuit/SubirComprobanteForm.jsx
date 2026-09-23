import { useState } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { subirComprobantePago } from "../../services/imporsuit";
import { Overlay, Field, inputCls, btnPrimary, btnGhost } from "./CrearUsuarioForm";
import { ComprobantesUploader } from "./ComprobantesUploader";

const MONEY = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });
const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Adjunta comprobantes a un pago que se registró sin ellos (antes de que el
 * comprobante fuera obligatorio). No toca el monto ni el saldo de la deuda.
 * Props: { deuda, pago, onClose, onSaved }
 */
export function SubirComprobanteForm({ deuda, pago, onClose, onSaved }) {
  const [urls, setUrls] = useState([]);
  const [fechaTransaccion, setFechaTransaccion] = useState(
    String(pago?.fecha_pago || "").slice(0, 10) || todayIso(),
  );
  const [submitting, setSubmitting] = useState(false);

  if (!pago) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (urls.length === 0) return toast.error("Adjunta al menos un comprobante");
    if (!fechaTransaccion) return toast.error("Indica la fecha de la transacción");
    if (fechaTransaccion > todayIso()) return toast.error("La fecha no puede ser futura");

    setSubmitting(true);
    try {
      await subirComprobantePago({ idPago: pago.id_pago, imagenesUrls: urls, fechaTransaccion });
      toast.success("Comprobante agregado");
      onSaved?.();
      onClose?.();
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo guardar el comprobante", text: err?.message ?? "Inténtalo de nuevo." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClose={() => !submitting && onClose?.()}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <header className="border-b border-gray-100 px-5 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-800">Subir comprobante</h3>
            <button onClick={onClose} disabled={submitting} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">✕</button>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {deuda?.concepto} · Pago de{" "}
            <strong className="text-emerald-600">{MONEY.format(Number(pago.monto_pagado) || 0)}</strong>
            {pago.medio_pago ? ` · ${pago.medio_pago}` : ""}
          </p>
        </header>

        <form onSubmit={submit} className="max-h-[80vh] space-y-3 overflow-y-auto px-5 py-4">
          <Field label="Fecha de la transacción (del comprobante) *">
            <input
              type="date"
              className={inputCls}
              value={fechaTransaccion}
              max={todayIso()}
              onChange={(e) => setFechaTransaccion(e.target.value)}
              disabled={submitting}
            />
          </Field>

          <Field label="Comprobantes (imágenes / PDF / archivos) *">
            <ComprobantesUploader urls={urls} onChange={setUrls} disabled={submitting} />
          </Field>

          <footer className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button type="button" onClick={onClose} disabled={submitting} className={btnGhost}>Cancelar</button>
            <button type="submit" disabled={submitting} className={btnPrimary}>
              {submitting ? "Guardando…" : "Guardar comprobante"}
            </button>
          </footer>
        </form>
      </div>
    </Overlay>
  );
}
