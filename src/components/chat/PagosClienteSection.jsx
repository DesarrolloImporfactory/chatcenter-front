import React, { useCallback, useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";

/**
 * Sección "Cobros" del panel de información del cliente.
 *
 * Lista los enlaces de pago de ESTE contacto (pendiente / pagado / anulado)
 * para que el asesor no tenga que buscarlos en el historial del chat. Solo
 * aparece si la cuenta tiene Stripe vinculado (Integraciones → Stripe): si
 * no, no pinta nada. Misma línea visual que IncidenciasCliente.
 *
 * Se recarga sola cuando entra un pago o se crea un cobro (evento de ventana
 * `enlace-pago:actualizado`, lo emiten Chat.jsx y ModalEnlacePago).
 */

const ESTADO = {
  pendiente: {
    label: "Pendiente",
    icon: "bx-time-five",
    color: "text-amber-300",
    bg: "bg-amber-500/15",
    chip: "bg-amber-500/20 text-amber-200",
  },
  pagado: {
    label: "Pagado",
    icon: "bx-check-circle",
    color: "text-emerald-300",
    bg: "bg-emerald-500/15",
    chip: "bg-emerald-500/20 text-emerald-200",
  },
  anulado: {
    label: "Anulado",
    icon: "bx-x-circle",
    color: "text-white/40",
    bg: "bg-white/5",
    chip: "bg-white/10 text-white/50",
  },
};

const fmtMonto = (monto, moneda) =>
  `${String(moneda || "usd").toUpperCase()} ${Number(monto || 0).toFixed(2)}`;

const fmt = (d) => {
  if (!d) return "";
  const f = new Date(d);
  return Number.isNaN(f.getTime())
    ? ""
    : f.toLocaleString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};

export default function PagosClienteSection({ clienteId, idConfiguracion }) {
  const [activa, setActiva] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [ocupado, setOcupado] = useState(null);

  // ¿La cuenta tiene Stripe? Se pregunta una vez por configuración.
  useEffect(() => {
    let vivo = true;
    if (!idConfiguracion) return undefined;
    chatApi
      .get("stripe_integrations/estado", {
        params: { id_configuracion: idConfiguracion },
        silentError: true,
      })
      .then((res) => vivo && setActiva(!!res?.data?.data?.activa))
      .catch(() => vivo && setActiva(false));
    return () => {
      vivo = false;
    };
  }, [idConfiguracion]);

  const fetchItems = useCallback(async () => {
    // Se carga aunque Stripe esté desvinculado: los cobros ya enviados
    // siguen en nuestra base y el asesor debe poder verlos.
    if (!clienteId || !idConfiguracion) return;
    setLoading(true);
    try {
      const { data } = await chatApi.get("enlaces_pago", {
        params: { id_configuracion: idConfiguracion, id_cliente: clienteId },
        silentError: true,
      });
      setItems(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [clienteId, idConfiguracion]);

  useEffect(() => {
    setItems([]);
    setExpanded(false);
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    const onActualizado = (ev) => {
      const d = ev?.detail || {};
      if (d.chatId == null || String(d.chatId) === String(clienteId || "")) {
        fetchItems();
      }
    };
    window.addEventListener("enlace-pago:actualizado", onActualizado);
    return () =>
      window.removeEventListener("enlace-pago:actualizado", onActualizado);
  }, [fetchItems, clienteId]);

  // Sin Stripe vinculado y sin cobros históricos no hay nada que mostrar. Con
  // cobros previos se muestra igual, aunque ya no se puedan crear nuevos.
  if (!activa && items.length === 0) return null;

  const pendientes = items.filter((i) => i.estado === "pendiente");
  const pagados = items.filter((i) => i.estado === "pagado");
  const ultimo = items[0] || null;
  const totalPagado = pagados.reduce((a, i) => a + Number(i.monto || 0), 0);

  const copiar = (url) => {
    if (url && navigator?.clipboard)
      navigator.clipboard.writeText(url).catch(() => {});
  };

  const verificar = async (row) => {
    setOcupado(row.id);
    try {
      const res = await chatApi.post(`enlaces_pago/${row.id}/refrescar`);
      await fetchItems();
      window.dispatchEvent(
        new CustomEvent("enlace-pago:actualizado", {
          detail: {
            chatId: clienteId,
            enlace: res?.data?.data,
            origen: "panel",
          },
        }),
      );
    } catch {
      /* el toast lo da el interceptor */
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="px-3 py-2.5 bg-[#0d1a30] border-t border-white/10">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full group"
      >
        <div className="flex items-center justify-between">
          <p className="text-[9px] text-white/45 uppercase tracking-[0.15em] flex items-center gap-1 font-semibold">
            <i className="bx bx-credit-card text-[11px] text-emerald-400" />
            Cobros
            {!loading && pendientes.length > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center h-3.5 min-w-[14px] px-1 rounded-full bg-amber-500/20 text-[9px] text-amber-300 font-medium">
                {pendientes.length}
              </span>
            )}
          </p>
          <i
            className={`bx bx-chevron-down text-white/40 text-[14px] transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>

        {/* Colapsado: el último cobro y el total pagado */}
        {!loading && ultimo && !expanded && (
          <div className="flex items-center gap-2 mt-2 mb-0.5 text-left">
            <div
              className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${
                (ESTADO[ultimo.estado] || ESTADO.pendiente).bg
              }`}
            >
              <i
                className={`bx ${(ESTADO[ultimo.estado] || ESTADO.pendiente).icon} text-[12px] ${
                  (ESTADO[ultimo.estado] || ESTADO.pendiente).color
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-white/75 truncate">
                {fmtMonto(ultimo.monto, ultimo.moneda)} ·{" "}
                {(ESTADO[ultimo.estado] || ESTADO.pendiente).label} ·{" "}
                {ultimo.concepto}
              </p>
              <p className="text-[9px] text-white/35 truncate">
                {pagados.length
                  ? `${pagados.length} pagado${pagados.length === 1 ? "" : "s"} · ${fmtMonto(totalPagado, ultimo.moneda)}`
                  : "Sin pagos todavía"}
                {pendientes.length
                  ? ` · ${pendientes.length} pendiente${pendientes.length === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
          </div>
        )}
        {!loading && !ultimo && !expanded && (
          <p className="mt-2 text-[10px] text-white/35 text-left">
            Sin cobros. Créalos desde el botón + del chat.
          </p>
        )}
      </button>

      {/* Expandido: lista completa */}
      {expanded && (
        <div className="mt-2.5 space-y-1.5">
          {loading ? (
            <p className="text-[10px] text-white/40">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="text-[10px] text-white/40">
              Este contacto no tiene cobros. Créalos desde el botón + del chat.
            </p>
          ) : (
            items.map((row) => {
              const ui = ESTADO[row.estado] || ESTADO.pendiente;
              return (
                <div
                  key={row.id}
                  className="rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-white">
                      {fmtMonto(row.monto, row.moneda)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${ui.chip}`}
                    >
                      <i className={`bx ${ui.icon}`} />
                      {ui.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/70 truncate mt-0.5">
                    {row.concepto}
                  </p>
                  <p className="text-[9px] text-white/35">
                    {row.estado === "pagado"
                      ? `Pagado ${fmt(row.pagado_at)}`
                      : row.estado === "anulado"
                        ? `Anulado ${fmt(row.anulado_at)}`
                        : `Enviado ${fmt(row.created_at)}`}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => copiar(row.url_pago)}
                      className="text-cyan-300 hover:underline"
                    >
                      Copiar enlace
                    </button>
                    {row.estado === "pendiente" && (
                      <button
                        type="button"
                        disabled={ocupado === row.id}
                        onClick={() => verificar(row)}
                        className="text-white/70 hover:underline disabled:opacity-50"
                      >
                        {ocupado === row.id ? "…" : "¿Ya pagó?"}
                      </button>
                    )}
                    {row.estado === "pagado" && row.url_pdf && (
                      <a
                        href={row.url_pdf}
                        target="_blank"
                        rel="noreferrer"
                        className="text-white/70 hover:underline"
                      >
                        Recibo
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
