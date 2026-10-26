import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import { money2, fmtFecha, fmtFechaHora } from "./recuperacionUtils";

/**
 * Registrar un pago recibido FUERA de Stripe (transferencia, efectivo).
 *
 * Qué hace al guardar:
 *  1. Sube el comprobante y deja el pago en pagos_manuales_chat_center.
 *  2. Si se eligió una factura, la salda en Stripe «fuera de banda»: no cobra
 *     nada, pasa a pagada, Stripe deja de reintentar la tarjeta y, si era de
 *     la suscripción, el webhook reactiva la cuenta y cuenta el mes (KPI de
 *     cobros y ciclo de referidos). El mes siguiente Stripe cobra la tarjeta
 *     por el camino normal.
 *  3. Opcional: anula las demás facturas abiertas del cliente (la típica es
 *     una manual creada en el dashboard de Stripe por este mismo mes).
 *  4. Si no hay factura que saldar, el acceso se fija a mano con una fecha.
 *
 * Nunca crea una factura nueva en Stripe: una factura manual no tiene período
 * ni suscripción y el webhook no puede sincronizar nada desde ella.
 */
const METODOS = [
  { id: "transferencia", label: "Transferencia" },
  { id: "efectivo", label: "Efectivo" },
  { id: "otro", label: "Otro" },
];

const hoyISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const sumarDias = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const ESTADO_FACTURA = {
  open: { label: "Abierta", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  uncollectible: { label: "Incobrable", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
};

function Factura({ f, elegida, onElegir, recomendada }) {
  const est = ESTADO_FACTURA[f.status] || { label: f.status, cls: "bg-slate-100 text-slate-600 ring-slate-200" };
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
        elegida ? "border-cyan-500 bg-cyan-50/60 ring-1 ring-cyan-300" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <input type="radio" name="factura" checked={elegida} onChange={onElegir} className="mt-1 accent-cyan-600" />
      <div className="min-w-0 flex-1 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-800 text-sm tabular-nums">{money2(f.monto)}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ring-1 ${est.cls}`}>{est.label}</span>
          {f.es_de_suscripcion_bd ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">
              Factura de la suscripción
            </span>
          ) : f.es_manual ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold ring-1 bg-slate-100 text-slate-700 ring-slate-200">
              Manual (creada en Stripe)
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold ring-1 bg-slate-100 text-slate-700 ring-slate-200">
              Otra suscripción
            </span>
          )}
          {recomendada && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-600 text-white">Recomendada</span>
          )}
        </div>
        <div className="text-slate-500 mt-1">
          {f.es_de_suscripcion_bd && f.periodo_inicio && f.periodo_fin && (
            <>
              Período {fmtFecha(f.periodo_inicio)} → {fmtFecha(f.periodo_fin)} ·{" "}
            </>
          )}
          Emitida {fmtFechaHora(f.created)} · {f.intentos} intento{f.intentos === 1 ? "" : "s"}
          {f.proximo_intento && <> · Stripe reintenta {fmtFechaHora(f.proximo_intento)}</>}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5 break-all">{f.id}</div>
      </div>
      {f.hosted_invoice_url && (
        <a
          href={f.hosted_invoice_url}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-slate-500 hover:text-cyan-700 whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          Ver <i className="bx bx-link-external" />
        </a>
      )}
    </label>
  );
}

export default function ModalPagoManual({ id_usuario, panel, onClose, onRegistrado }) {
  const facturas = panel?.facturas || [];
  const usuario = panel?.usuario || {};
  const sub = panel?.suscripcion || null;

  // La recomendada es la de la suscripción guardada en la BD: saldarla cuenta
  // el mes y, si estaba past_due, reactiva por el webhook. Si no hay, la
  // abierta más reciente.
  const recomendada = useMemo(() => {
    const deSub = facturas.find((f) => f.es_de_suscripcion_bd && f.saldable);
    if (deSub) return deSub.id;
    const abierta = facturas.find((f) => f.status === "open");
    return abierta ? abierta.id : "";
  }, [facturas]);

  const [facturaId, setFacturaId] = useState(recomendada);
  const [anularOtras, setAnularOtras] = useState(true);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("transferencia");
  const [referencia, setReferencia] = useState("");
  const [fechaPago, setFechaPago] = useState(hoyISO());
  const [nota, setNota] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [accesoHasta, setAccesoHasta] = useState("");
  const [enviando, setEnviando] = useState(false);

  const facturaElegida = facturas.find((f) => f.id === facturaId) || null;
  const otrasAbiertas = facturas.filter((f) => f.id !== facturaId && f.status === "open");

  // Monto por defecto: el de la factura elegida; sin factura, el precio del plan.
  useEffect(() => {
    if (facturaElegida) setMonto(String(facturaElegida.monto.toFixed(2)));
    else if (usuario.precio_plan != null) setMonto(String(Number(usuario.precio_plan).toFixed(2)));
  }, [facturaElegida, usuario.precio_plan]);

  // Sin factura que saldar, el acceso se fija a mano: por defecto un mes desde hoy.
  useEffect(() => {
    if (!facturaId && !accesoHasta) setAccesoHasta(sumarDias(hoyISO(), 30));
  }, [facturaId, accesoHasta]);

  useEffect(() => {
    if (!archivo || !archivo.type?.startsWith("image/")) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(archivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && !enviando && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose, enviando]);

  const elegirArchivo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      Swal.fire("Archivo muy pesado", "El máximo es 10 MB.", "warning");
      e.target.value = "";
      return;
    }
    setArchivo(f);
  };

  const enviar = async () => {
    const m = Number(monto);
    if (!Number.isFinite(m) || m <= 0) {
      Swal.fire("Falta el monto", "Escribe cuánto llegó a la cuenta.", "warning");
      return;
    }
    if (!archivo) {
      const r = await Swal.fire({
        title: "¿Registrar sin comprobante?",
        text: "Lo normal es adjuntar la captura o el PDF del banco. Puedes seguir sin él.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, registrar",
        cancelButtonText: "Volver",
      });
      if (!r.isConfirmed) return;
    }
    if (!facturaId && !accesoHasta) {
      Swal.fire("Falta la fecha de acceso", "Sin factura que saldar, indica hasta cuándo queda activo.", "warning");
      return;
    }

    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("monto", m.toFixed(2));
      fd.append("moneda", facturaElegida?.moneda || "usd");
      fd.append("metodo", metodo);
      if (referencia.trim()) fd.append("referencia", referencia.trim());
      if (fechaPago) fd.append("fecha_pago", fechaPago);
      if (nota.trim()) fd.append("nota", nota.trim());
      if (facturaId) {
        fd.append("stripe_invoice_id", facturaId);
        if (anularOtras && otrasAbiertas.length) {
          fd.append("anular_invoice_ids", otrasAbiertas.map((f) => f.id).join(","));
        }
      } else if (accesoHasta) {
        fd.append("acceso_hasta", accesoHasta);
      }
      if (archivo) fd.append("comprobante", archivo);

      const { data: res } = await chatApi.post(`recuperacion/cliente/${id_usuario}/pagos-manuales`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const st = res?.data?.stripe || {};

      if (st.accion === "error") {
        await Swal.fire({
          icon: "warning",
          title: "Pago registrado, Stripe no",
          html: `El pago quedó guardado, pero la factura <b>no</b> se pudo saldar en Stripe:<br/><span class="text-xs">${st.detalle || "sin detalle"}</span><br/><br/>Sáldala a mano en Stripe (Más → Marcar como pagada fuera de Stripe) o vuelve a intentar.`,
        });
      } else if (archivo && res?.comprobante_subido === false) {
        await Swal.fire(
          "Pago registrado, comprobante no",
          "El pago quedó guardado, pero el archivo no se pudo subir. Vuelve a registrar solo el comprobante si hace falta.",
          "warning",
        );
      } else {
        const partes = [];
        if (st.accion === "saldada") partes.push("La factura quedó pagada en Stripe y no se reintentará la tarjeta.");
        if (st.anuladas?.length) partes.push(`Se anularon ${st.anuladas.length} factura(s) abiertas más.`);
        if (st.no_anuladas?.length) partes.push(`No se pudo anular: ${st.no_anuladas.join("; ")}`);
        if (!facturaId && accesoHasta) partes.push(`Acceso activo hasta el ${fmtFecha(`${accesoHasta}T12:00:00`)}.`);
        await Swal.fire({
          icon: "success",
          title: "Pago registrado",
          text: partes.join(" ") || "Quedó guardado con su comprobante.",
          timer: partes.length ? undefined : 2200,
          showConfirmButton: !!partes.length,
        });
      }
      onRegistrado?.();
    } catch (e) {
      Swal.fire("No se pudo registrar", e?.response?.data?.message || "Inténtalo de nuevo.", "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={enviando ? undefined : onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800">Registrar pago fuera de Stripe</h3>
            <p className="text-[11.5px] text-slate-500 mt-0.5 truncate">
              {usuario.empresa || usuario.email} · {usuario.nombre_plan || "sin plan"}
              {usuario.precio_plan != null && <> · {money2(usuario.precio_plan)}/mes</>}
              {sub && (
                <>
                  {" "}
                  · Stripe <b>{sub.status}</b>
                  {sub.periodo_fin && <> hasta {fmtFecha(sub.periodo_fin)}</>}
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={enviando}
            className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 transition"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-auto">
          {panel?.stripe_error && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-800">
              Stripe no respondió ({panel.stripe_error}). Puedes registrar el pago igual, pero no se saldará ninguna factura.
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-semibold text-slate-700">¿Qué factura de Stripe cubre este pago?</span>
              {panel?.modo === "test" && (
                <span className="text-[10px] font-bold text-orange-600">Stripe en modo TEST</span>
              )}
            </div>
            {facturas.length === 0 ? (
              <p className="text-[12px] text-slate-500 rounded-xl border border-dashed border-slate-200 p-3">
                Este cliente no tiene facturas abiertas ni incobrables en Stripe. El pago se registra y el acceso se fija con la fecha de abajo.
              </p>
            ) : (
              <div className="space-y-2">
                {facturas.map((f) => (
                  <Factura
                    key={f.id}
                    f={f}
                    elegida={facturaId === f.id}
                    onElegir={() => setFacturaId(f.id)}
                    recomendada={recomendada === f.id}
                  />
                ))}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 text-xs text-slate-600">
                  <input type="radio" name="factura" checked={!facturaId} onChange={() => setFacturaId("")} className="mt-0.5 accent-cyan-600" />
                  <span>
                    <b>Ninguna.</b> Solo registrar el pago y fijar el acceso a mano (no toca Stripe).
                  </span>
                </label>
              </div>
            )}
            {facturaElegida && (
              <p className="mt-1.5 text-[11px] text-slate-500 leading-snug">
                Se marca como <b>pagada fuera de Stripe</b>: no se cobra nada y Stripe deja de reintentar la tarjeta.
                {facturaElegida.es_de_suscripcion_bd && (
                  <> Como es la de la suscripción, cuenta como el cobro del mes y la cuenta queda al día; el próximo mes Stripe vuelve a intentar la tarjeta.</>
                )}
                {facturaElegida.es_manual && (
                  <> Es una factura manual (sin suscripción): quita el cobro pendiente pero no cuenta como mes de la suscripción.</>
                )}
              </p>
            )}
            {facturaId && otrasAbiertas.length > 0 && (
              <label className="mt-2 flex items-start gap-2 text-[12px] text-slate-700 rounded-xl bg-rose-50 border border-rose-200 p-3 cursor-pointer">
                <input type="checkbox" checked={anularOtras} onChange={(e) => setAnularOtras(e.target.checked)} className="mt-0.5 accent-rose-600" />
                <span>
                  <b>Anular también</b> {otrasAbiertas.length === 1 ? "la otra factura abierta" : `las otras ${otrasAbiertas.length} facturas abiertas`} (
                  {otrasAbiertas.map((f) => money2(f.monto)).join(", ")}). Si se deja abierta, Stripe seguirá intentando cobrarla a la tarjeta y el cliente pagaría dos veces.
                </span>
              </label>
            )}
          </div>

          {!facturaId && (
            <label className="block">
              <span className="text-[12px] font-semibold text-slate-700">Acceso activo hasta</span>
              <input
                type="date"
                value={accesoHasta}
                min={hoyISO()}
                onChange={(e) => setAccesoHasta(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:border-cyan-400"
              />
              <span className="text-[11px] text-slate-400">
                Se escribe como fecha de renovación y la cuenta queda activa. Hoy vence {fmtFecha(usuario.fecha_renovacion)}.
              </span>
            </label>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-[12px] font-semibold text-slate-700">Monto recibido (USD)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:border-cyan-400 tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold text-slate-700">Método</span>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:border-cyan-400 bg-white"
              >
                {METODOS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold text-slate-700">Fecha del pago</span>
              <input
                type="date"
                value={fechaPago}
                max={hoyISO()}
                onChange={(e) => setFechaPago(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:border-cyan-400"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[12px] font-semibold text-slate-700">Número de transferencia / referencia</span>
            <input
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej: 4471209835"
              className="mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:border-cyan-400"
            />
          </label>

          <div>
            <span className="text-[12px] font-semibold text-slate-700">Comprobante</span>
            <label className="mt-1 flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-cyan-300 cursor-pointer transition">
              <i className="bx bx-cloud-upload text-2xl text-slate-400" />
              <span className="text-[12px] text-slate-600 min-w-0 flex-1 truncate">
                {archivo ? archivo.name : "Adjunta la captura o el PDF del banco (máx. 10 MB)"}
              </span>
              <input type="file" accept="image/*,application/pdf" onChange={elegirArchivo} className="hidden" />
            </label>
            {preview && <img src={preview} alt="Vista previa del comprobante" className="mt-2 max-h-56 rounded-xl border border-slate-200 object-contain" />}
          </div>

          <label className="block">
            <span className="text-[12px] font-semibold text-slate-700">Nota interna (opcional)</span>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              placeholder="Ej: transfirió desde Pichincha; la tarjeta le rebotaba"
              className="mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:border-cyan-400 resize-none"
            />
          </label>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex gap-2 justify-end">
          <button onClick={onClose} disabled={enviando} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-100 transition">
            Cancelar
          </button>
          <button
            onClick={enviar}
            disabled={enviando}
            className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white bg-cyan-600 hover:bg-cyan-700 transition disabled:opacity-50"
          >
            {enviando ? (
              <>
                <i className="bx bx-loader-alt bx-spin mr-1.5" />
                Guardando…
              </>
            ) : facturaElegida ? (
              `Registrar ${money2(Number(monto) || 0)} y saldar factura`
            ) : (
              `Registrar ${money2(Number(monto) || 0)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
