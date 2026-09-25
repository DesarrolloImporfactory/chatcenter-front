import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

/**
 * "+" → Crear enlace de pago.
 *
 * Crea el cobro en el Stripe PROPIO de la cuenta (Integraciones → Stripe) y
 * lo manda por WhatsApp al contacto del chat abierto. El asesor ve ANTES el
 * mensaje exacto que va a salir (vista previa), y al enviar la ventana se
 * cierra de inmediato: el mensaje aparece en el chat con su estado de cobro
 * pegado a la burbuja (ChatPrincipal → EstadoEnlacePago).
 *
 * La pestaña Historial lista los cobros de ese contacto; el backend refresca
 * los pendientes contra Stripe cada vez que se pide la lista.
 */

const MONEDAS = [
  { v: "usd", l: "USD" },
  { v: "mxn", l: "MXN" },
  { v: "cop", l: "COP" },
  { v: "pen", l: "PEN" },
  { v: "clp", l: "CLP" },
  { v: "eur", l: "EUR" },
];

const ESTADO_UI = {
  pendiente: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  pagado: {
    label: "Pagado",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  anulado: {
    label: "Anulado",
    cls: "bg-slate-100 text-slate-500 border-slate-200",
  },
};

const fmtMonto = (monto, moneda) =>
  `${String(moneda || "usd").toUpperCase()} ${Number(monto || 0).toFixed(2)}`;

const fmtFecha = (d) => {
  if (!d) return "—";
  const f = new Date(d);
  return Number.isNaN(f.getTime()) ? "—" : f.toLocaleString();
};

const toast = (title, icon = "success", text = "") =>
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    text,
    timer: 3500,
    showConfirmButton: false,
    timerProgressBar: true,
  });

/* Mismo texto por defecto que arma el backend (pagos_stripe.service). Se
   calcula aquí solo para la vista previa. */
const ENLACE_MARCA = "[enlace de pago]";
function armarPreview({ nombre, monto, moneda, concepto, mensaje }) {
  const propio = String(mensaje || "").trim();
  if (propio) {
    return propio.includes("{enlace}")
      ? propio.replace(/\{enlace\}/g, ENLACE_MARCA)
      : `${propio}\n${ENLACE_MARCA}`;
  }
  const primerNombre = String(nombre || "")
    .trim()
    .split(" ")[0];
  const m = Number(String(monto).replace(",", "."));
  const montoTxt = Number.isFinite(m) && m > 0 ? fmtMonto(m, moneda) : "…";
  const conceptoTxt = String(concepto || "").trim() || "…";
  return (
    `${primerNombre ? `Hola ${primerNombre}, ` : "Hola, "}` +
    `aquí tienes tu enlace de pago por ${montoTxt} (${conceptoTxt}):\n${ENLACE_MARCA}`
  );
}

export default function ModalEnlacePago({
  open,
  onClose,
  selectedChat,
  id_configuracion,
  monedaDefault = "usd",
}) {
  const [tab, setTab] = useState("nuevo");
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState(monedaDefault || "usd");
  const [concepto, setConcepto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [accionId, setAccionId] = useState(null);

  const idCliente = selectedChat?.id;
  const nombre = selectedChat?.nombre_cliente || "";

  const cargarLista = useCallback(async () => {
    if (!id_configuracion || !idCliente) return;
    setCargando(true);
    try {
      const res = await chatApi.get("enlaces_pago", {
        params: { id_configuracion, id_cliente: idCliente },
      });
      setLista(res?.data?.data || []);
    } catch {
      setLista([]);
    } finally {
      setCargando(false);
    }
  }, [id_configuracion, idCliente]);

  useEffect(() => {
    if (!open) return;
    setTab("nuevo");
    setMonto("");
    setMoneda(monedaDefault || "usd");
    setConcepto("");
    setMensaje("");
    cargarLista();
  }, [open, monedaDefault, cargarLista]);

  const preview = useMemo(
    () => armarPreview({ nombre, monto, moneda, concepto, mensaje }),
    [nombre, monto, moneda, concepto, mensaje],
  );

  if (!open) return null;

  const errMsg = (e, fb) =>
    e?.response?.data?.message || e?.response?.data?.error || fb;

  const avisarActualizado = (enlace) =>
    window.dispatchEvent(
      new CustomEvent("enlace-pago:actualizado", {
        detail: { chatId: idCliente, enlace },
      }),
    );

  const crear = async () => {
    const m = Number(String(monto).replace(",", "."));
    if (!Number.isFinite(m) || m <= 0) {
      toast("Ingresa un monto válido", "warning");
      return;
    }
    if (!concepto.trim()) {
      toast("Escribe el concepto del cobro", "warning");
      return;
    }
    setEnviando(true);
    try {
      const res = await chatApi.post("enlaces_pago", {
        id_configuracion,
        id_cliente: idCliente,
        monto: m,
        moneda,
        concepto: concepto.trim(),
        mensaje: mensaje.trim() || undefined,
        enviar: true,
      });
      const data = res?.data || {};
      avisarActualizado(data?.data);

      if (data.enviado) {
        // Se cierra ya: el mensaje aparece en el chat con su estado de cobro.
        onClose?.();
        toast(
          `Enlace enviado a ${nombre || "el contacto"}`,
          "success",
          `${fmtMonto(m, moneda)} · ${concepto.trim()}`,
        );
        return;
      }

      // Se creó pero WhatsApp no lo aceptó (fuera de las 24 h): se deja el
      // enlace a mano para mandarlo con una plantilla.
      const url = data?.data?.url_pago || "";
      await Swal.fire({
        icon: "warning",
        title: "El cobro se creó, pero no se pudo enviar",
        html: `<div style="text-align:left;font-size:13px;line-height:1.5">
          <p>${data.aviso || "No se pudo enviar por WhatsApp."}</p>
          <p style="margin-top:8px">Copia el enlace y envíaselo con una plantilla:</p>
          <input value="${url}" readonly style="width:100%;font-size:12px;padding:6px;border:1px solid #cbd5e1;border-radius:6px" />
        </div>`,
        confirmButtonText: "Copiar enlace",
        confirmButtonColor: "#171931",
        showCancelButton: true,
        cancelButtonText: "Cerrar",
      }).then((r) => {
        if (r.isConfirmed && url && navigator?.clipboard) {
          navigator.clipboard.writeText(url).catch(() => {});
        }
      });
      setTab("historial");
      cargarLista();
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "No se pudo crear el cobro",
        text: errMsg(e, "Intenta de nuevo."),
        confirmButtonColor: "#d33",
      });
    } finally {
      setEnviando(false);
    }
  };

  const copiar = (url) => {
    if (!url) return;
    if (navigator?.clipboard)
      navigator.clipboard.writeText(url).catch(() => {});
    toast("Enlace copiado");
  };

  const refrescar = async (row) => {
    setAccionId(row.id);
    try {
      const res = await chatApi.post(`enlaces_pago/${row.id}/refrescar`);
      await cargarLista();
      avisarActualizado(res?.data?.data);
      const est = res?.data?.data?.estado;
      toast(
        est === "pagado" ? "¡Ya está pagado!" : "Todavía no hay pago",
        est === "pagado" ? "success" : "info",
      );
    } catch (e) {
      toast(errMsg(e, "No se pudo consultar"), "error");
    } finally {
      setAccionId(null);
    }
  };

  const anular = async (row) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "¿Anular este cobro?",
      text: `El cliente ya no podrá pagar ${fmtMonto(row.monto, row.moneda)} con ese enlace.`,
      showCancelButton: true,
      confirmButtonText: "Sí, anular",
      cancelButtonText: "Volver",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#171931",
    });
    if (!isConfirmed) return;
    setAccionId(row.id);
    try {
      const res = await chatApi.post(`enlaces_pago/${row.id}/anular`);
      await cargarLista();
      avisarActualizado(res?.data?.data);
      toast("Cobro anulado");
    } catch (e) {
      toast(errMsg(e, "No se pudo anular"), "error");
    } finally {
      setAccionId(null);
    }
  };

  const montoNum = Number(String(monto).replace(",", "."));
  const listo = Number.isFinite(montoNum) && montoNum > 0 && concepto.trim();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a1a36]/50 backdrop-blur-md px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-gray-100 px-6 pt-6 pb-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <i className="bx bx-x text-xl"></i>
          </button>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#635BFF] text-white">
              <i className="bx bx-credit-card text-2xl"></i>
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900">
                Cobrar por WhatsApp
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {nombre || "Contacto"} · {selectedChat?.celular_cliente || ""}
              </p>
            </div>
          </div>
        </div>

        <div className="flex border-b text-sm shrink-0">
          {[
            { k: "nuevo", l: "Nuevo cobro" },
            {
              k: "historial",
              l: `Cobros anteriores${lista.length ? ` (${lista.length})` : ""}`,
            },
          ].map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => setTab(t.k)}
              className={`flex-1 py-2.5 font-semibold ${
                tab === t.k
                  ? "text-[#1d4ed8] border-b-2 border-[#1d4ed8]"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {tab === "nuevo" ? (
          <div className="p-6 overflow-y-auto space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Monto
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.01"
                  name="enlace_pago_monto"
                  autoComplete="off"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="mt-1.5 w-full px-3.5 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-lg font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Moneda
                </label>
                <select
                  name="enlace_pago_moneda"
                  value={moneda}
                  onChange={(e) => setMoneda(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200"
                >
                  {MONEDAS.map((m) => (
                    <option key={m.v} value={m.v}>
                      {m.l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                ¿Por qué es el cobro?
              </label>
              <input
                type="text"
                name="enlace_pago_concepto"
                autoComplete="off"
                maxLength={255}
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej: Abono pedido #123"
                className="mt-1.5 w-full px-3.5 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200"
              />
              <p className="text-xs text-gray-400 mt-1">
                El cliente lo ve en el mensaje y en la página de pago.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Mensaje{" "}
                <span className="font-normal text-gray-400">
                  (opcional, si no te gusta el de abajo)
                </span>
              </label>
              <textarea
                rows={2}
                name="enlace_pago_mensaje"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escribe tu propio texto. El enlace se agrega al final."
                className="mt-1.5 w-full px-3.5 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/25 focus:border-[#1d4ed8] focus:bg-white transition-all duration-200"
              />
            </div>

            {/* Vista previa: lo que va a recibir el cliente */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">
                Así le llegará al cliente
              </p>
              <div className="rounded-xl bg-[#e7ffdb] border border-[#cfeec2] px-3.5 py-2.5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {preview.split(ENLACE_MARCA).map((parte, i, arr) => (
                  <span key={i}>
                    {parte}
                    {i < arr.length - 1 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-white/80 border border-[#b7dca8] px-1.5 py-0.5 text-[11px] text-[#1d4ed8] font-semibold align-middle">
                        <i className="bx bx-link"></i> enlace de pago
                      </span>
                    )}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Se envía como mensaje de WhatsApp: el cliente debe haber escrito
                en las últimas 24 horas. Al pagar, verás el estado en este mismo
                chat.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200"
                disabled={enviando}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={crear}
                disabled={enviando || !listo}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1d4ed8] text-sm text-white font-semibold hover:bg-[#1e40af] shadow-sm transition-all duration-200 disabled:opacity-60"
              >
                {enviando ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" />
                    Enviando
                  </>
                ) : (
                  <>
                    <i className="bx bx-send" />
                    Enviar cobro
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto">
            {cargando && lista.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">Cargando…</p>
            ) : lista.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">
                Este contacto no tiene cobros todavía.
              </p>
            ) : (
              <ul className="divide-y">
                {lista.map((row) => {
                  const ui = ESTADO_UI[row.estado] || ESTADO_UI.pendiente;
                  const ocupado = accionId === row.id;
                  return (
                    <li
                      key={row.id}
                      className="px-6 py-3 flex items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">
                            {fmtMonto(row.monto, row.moneda)}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ui.cls}`}
                          >
                            {ui.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 truncate">
                          {row.concepto}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Enviado {fmtFecha(row.created_at)}
                          {row.estado === "pagado" &&
                            ` · Pagado ${fmtFecha(row.pagado_at)}`}
                          {row.estado === "anulado" &&
                            ` · Anulado ${fmtFecha(row.anulado_at)}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 text-xs">
                        <button
                          type="button"
                          onClick={() => copiar(row.url_pago)}
                          className="font-semibold text-[#1d4ed8] hover:underline"
                        >
                          Copiar enlace
                        </button>
                        {row.url_pdf && row.estado === "pagado" && (
                          <a
                            href={row.url_pdf}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-gray-600 hover:underline"
                          >
                            Recibo PDF
                          </a>
                        )}
                        {row.estado === "pendiente" && (
                          <>
                            <button
                              type="button"
                              disabled={ocupado}
                              onClick={() => refrescar(row)}
                              className="font-semibold text-gray-600 hover:underline disabled:opacity-50"
                            >
                              {ocupado ? "…" : "¿Ya pagó?"}
                            </button>
                            <button
                              type="button"
                              disabled={ocupado}
                              onClick={() => anular(row)}
                              className="font-semibold text-red-600 hover:underline disabled:opacity-50"
                            >
                              Anular
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
