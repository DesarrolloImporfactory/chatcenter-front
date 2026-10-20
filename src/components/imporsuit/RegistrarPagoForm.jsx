import { useState } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { agregarPago, MEDIOS_PAGO, MONEDAS, TIPOS_PAGO } from "../../services/imporsuit";
import { Overlay, Field, inputCls, btnPrimary, btnGhost } from "./CrearUsuarioForm";
import { ComprobantesUploader } from "./ComprobantesUploader";

import {
  MXN,
  convertirMoneda,
  errorTipoCambio,
  monedaLocalDelCruce,
  monedasRecibibles,
  nombreMoneda,
  fmtMoneda,
  normalizarMoneda,
} from "../../services/imporsuit/moneda";

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Registra un pago/abono sobre una deuda.
 * Props: { deuda, onClose, onSaved }
 *
 * Los comprobantes se suben a S3 con <ComprobantesUploader/> (drag&drop) y se
 * mandan como `imagenes_urls` al registrar el pago. Comprobante y tipo de pago
 * son obligatorios (el back los exige igual).
 *
 * Moneda: el abono va SIEMPRE en la moneda de la deuda. Si el cliente pagó en
 * la otra, se pide lo recibido y el tipo de cambio. Una deuda vieja sin moneda
 * pide confirmarla primero (docs/separacion_monedas.md en Imporsuit).
 */
export function RegistrarPagoForm({ deuda, onClose, onSaved }) {
  const pendiente = Number(deuda?.monto_pendiente ?? 0);
  const monedaDeLaDeuda = normalizarMoneda(deuda?.moneda);
  const [form, setForm] = useState({
    montoPagado: "",
    fechaPago: todayIso(),
    medioPago: monedaDeLaDeuda === MXN ? "transferencia_mx" : "transferencia_ec",
    // Sin default a propósito: el agente tiene que elegirlo.
    tipoPago: "",
    // Solo si la deuda no tiene moneda: el agente la confirma.
    monedaDeuda: "",
    // En qué moneda llegó el pago. Vacío = la de la deuda.
    monedaRecibida: "",
    tipoCambio: "",
    referencia: "",
    numeroCuota: "",
    // Fecha que consta en el comprobante. Arranca igual que la del pago
    // porque suele coincidir; el agente la corrige si el depósito es de otro
    // día. El back la exige cuando hay comprobante adjunto.
    fechaTransaccion: todayIso(),
  });
  const [imagenesUrls, setImagenesUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  if (!deuda) return null;

  const set = (name) => (e) =>
    setForm((p) => ({ ...p, [name]: e.target.value }));

  const monedaAbono = monedaDeLaDeuda ?? normalizarMoneda(form.monedaDeuda);
  const monedaRecibida = normalizarMoneda(form.monedaRecibida) ?? monedaAbono;
  const cruzado = Boolean(monedaAbono && monedaRecibida && monedaAbono !== monedaRecibida);
  // La moneda local del cruce (el que no es USD): da sentido al tipo de cambio.
  const local = cruzado ? monedaLocalDelCruce(monedaRecibida, monedaAbono) : null;
  const errorTc = cruzado
    ? local
      ? errorTipoCambio(form.tipoCambio, local)
      : "Los cruces pasan por el dólar: elige USD o la moneda de la deuda"
    : null;
  const abono = cruzado
    ? convertirMoneda(form.montoPagado, monedaRecibida, monedaAbono, form.tipoCambio)
    : Number(form.montoPagado) || 0;

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const monto = Number(form.montoPagado);
    if (!monedaAbono) return toast.error("Confirma en qué moneda está esta deuda");
    if (!form.montoPagado || monto <= 0) return toast.error("Monto > 0");
    if (errorTc) return toast.error(errorTc);
    if (abono > pendiente + 0.009)
      return toast.error(
        cruzado
          ? `Equivale a ${fmtMoneda(abono, monedaAbono)}: supera lo pendiente (${fmtMoneda(pendiente, monedaAbono)})`
          : `No puede superar ${fmtMoneda(pendiente, monedaAbono)}`,
      );
    if (!form.fechaPago) return toast.error("Selecciona la fecha");
    if (!form.tipoPago) return toast.error("Selecciona el tipo de pago");
    if (imagenesUrls.length === 0)
      return toast.error("Adjunta el comprobante del pago");
    if (!form.fechaTransaccion)
      return toast.error("Indica la fecha de la transacción del comprobante");

    setSubmitting(true);
    try {
      const resultado = await agregarPago({
        idCpp: deuda.id_cpp,
        // Siempre en la moneda de la deuda; el back lo recalcula si es cruzado.
        montoPagado: abono,
        monedaRecibida,
        montoRecibido: cruzado ? monto : null,
        tipoCambio: cruzado ? Number(form.tipoCambio) : null,
        monedaDeuda: monedaDeLaDeuda ? null : monedaAbono,
        fechaPago: form.fechaPago,
        medioPago: form.medioPago,
        tipoPago: form.tipoPago,
        referencia: form.referencia,
        imagenesUrls,
        numeroCuota: form.numeroCuota,
        fechaTransaccion: form.fechaTransaccion,
      });
      if (resultado?.aviso) {
        // Pidió «gestionado» pero el CRM ya había mandado la plantilla de
        // cobro: el back lo guardó como automático (Class/AtribucionPago).
        Swal.fire({ icon: "info", title: "Pago registrado como automático", text: resultado.aviso });
      } else {
        toast.success("Pago registrado");
      }
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
            <strong className="text-amber-600">{fmtMoneda(pendiente, monedaDeLaDeuda)}</strong>
            {!monedaDeLaDeuda && <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">SIN MONEDA</span>}
          </p>
        </header>

        <form onSubmit={submit} className="max-h-[80vh] space-y-3 overflow-y-auto px-5 py-4">
          {!monedaDeLaDeuda && (
            <Field label="¿En qué moneda está esta deuda? *">
              <select className={inputCls} value={form.monedaDeuda} onChange={set("monedaDeuda")} disabled={submitting}>
                <option value="">Seleccionar…</option>
                {MONEDAS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-amber-600">
                Es una deuda vieja que nunca guardó su moneda. Lo que elijas queda fijo para esta deuda y sus cuotas.
              </span>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="El cliente pagó en">
              <select className={inputCls} value={form.monedaRecibida || monedaAbono || ""} onChange={set("monedaRecibida")} disabled={submitting || !monedaAbono}>
                {!monedaAbono && <option value="">—</option>}
                {monedasRecibibles(monedaAbono).map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
            {cruzado ? (
              <Field label={`Tipo de cambio (${nombreMoneda(local)} por 1 dólar) *`}>
                <input type="number" step="0.0001" min="0" className={inputCls} value={form.tipoCambio} onChange={set("tipoCambio")} disabled={submitting} />
              </Field>
            ) : (
              <div />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={cruzado ? `Monto recibido (${monedaRecibida})` : `Monto pagado${monedaAbono ? ` (${monedaAbono})` : ""}`}>
              <input type="number" step="0.01" min="0" max={cruzado ? undefined : pendiente} className={inputCls} value={form.montoPagado} onChange={set("montoPagado")} disabled={submitting} placeholder="0.00" />
              {cruzado && abono > 0 && !errorTc && (
                <span className="mt-1 block text-[11px] text-emerald-700">
                  Se abonan {fmtMoneda(abono, monedaAbono)} a la deuda.
                </span>
              )}
            </Field>
            <Field label="Fecha del pago">
              <input type="date" className={inputCls} value={form.fechaPago} onChange={set("fechaPago")} disabled={submitting} />
            </Field>
          </div>

          {/* Solo con comprobante: es el dato con el que se concilia contra el
              banco, y el back lo exige en ese caso. Sin adjunto sería ruido. */}
          {imagenesUrls.length > 0 && (
            <Field label="Fecha de la transacción (del comprobante)">
              <input
                type="date"
                className={inputCls}
                value={form.fechaTransaccion}
                max={todayIso()}
                onChange={set("fechaTransaccion")}
                disabled={submitting}
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Medio de pago">
              <select className={inputCls} value={form.medioPago} onChange={set("medioPago")} disabled={submitting}>
                {MEDIOS_PAGO.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de pago *">
              <select className={inputCls} value={form.tipoPago} onChange={set("tipoPago")} disabled={submitting}>
                <option value="">Seleccionar…</option>
                {TIPOS_PAGO.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
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

          <Field label="Comprobantes (imágenes / PDF / archivos) *">
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
