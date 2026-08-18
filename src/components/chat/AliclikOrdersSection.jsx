import React from "react";
import Swal from "sweetalert2";

import CreateAliclikOrderPanel from "./CreateAliclikOrderPanel";
import useAliclikOrders from "../../hooks/useAliclikOrders";
import useCreateAliclikOrder from "../../hooks/useCreateAliclikOrder";
// Se reutiliza el formateador de OrderList para que las fechas se lean
// exactamente igual en las dos plataformas.
import { fmtDate } from "../../utils/orderHelper";

/**
 * Bloque "Pedidos de Aliclik" dentro del panel del cliente.
 *
 * Es el equivalente del bloque de órdenes de Dropi, pero con menos acciones
 * porque la API de Aliclik ofrece menos: se puede listar, crear y cancelar. No
 * hay update de pedido, no hay cambio de transportadora y no hay guía —
 * ninguno de los tres existe en su API, así que no se muestran botones que
 * después no se puedan cumplir.
 */

const soles = (n) =>
  `S/ ${Number(n || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Colores por estado canónico. Se usa la misma forma de clases que
// statusStyle() de utils/orderHelper (bg-x-500/20 · text-x-200 · border-x-400/30)
// para que los badges se vean idénticos a los de Dropi; el mapa es propio
// porque los estados de Aliclik no son los mismos que los crudos de Dropi.
const COLOR_ESTADO = {
  "PENDIENTE CONFIRMACION":
    "bg-amber-500/20 text-amber-200 border-amber-400/30",
  PENDIENTE: "bg-sky-500/20 text-sky-200 border-sky-400/30",
  "EN TRANSITO": "bg-indigo-500/20 text-indigo-200 border-indigo-400/30",
  "RETIRO EN AGENCIA": "bg-violet-500/20 text-violet-200 border-violet-400/30",
  ENTREGADA: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
  NOVEDAD: "bg-orange-500/20 text-orange-200 border-orange-400/30",
  DEVOLUCION: "bg-rose-500/20 text-rose-200 border-rose-400/30",
  CANCELADO: "bg-white/10 text-white/70 border-white/15",
};

function EstadoBadge({ estado }) {
  if (!estado) return null;
  const cls =
    COLOR_ESTADO[estado] || "bg-white/10 text-white/80 border-white/10";
  return (
    <span
      className={`text-[9px] px-2 py-1 rounded font-bold tracking-wide uppercase border ${cls}`}
    >
      {estado}
    </span>
  );
}

export default function AliclikOrdersSection({
  socketRef,
  id_configuracion,
  selectedChat,
  isOpen,
}) {
  const ordersHook = useAliclikOrders({
    socketRef,
    id_configuracion,
    selectedChat,
    isOpen,
  });

  const createHook = useCreateAliclikOrder({
    socketRef,
    id_configuracion,
    phone: ordersHook.phone,
    selectedChat,
    emitGetOrders: ordersHook.emitGetOrders,
  });

  const {
    phone,
    orders,
    ordersLoading,
    ordersError,
    selectedOrder,
    setSelectedOrder,
    emitGetOrders,
    emitCancelOrder,
  } = ordersHook;

  const confirmarCancelacion = (order) => {
    Swal.fire({
      icon: "question",
      title: "Cancelar pedido",
      html: `¿Seguro que quieres cancelar el pedido <b>${order.order_number}</b> en Aliclik?`,
      showCancelButton: true,
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "No",
      confirmButtonColor: "#e11d48",
    }).then((r) => {
      if (r.isConfirmed) emitCancelOrder(order.order_number);
    });
  };

  // Verde como el de Dropi: el color de "crear" es semántico, no de
  // plataforma. Lo que marca la plataforma es el acento cyan del formulario.
  const CreateButton = () => (
    <button
      type="button"
      onClick={() => createHook.setCreateOrderOpen(true)}
      className="w-full px-2 py-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/25 text-[10px] font-semibold flex items-center justify-center gap-1 text-emerald-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      disabled={!phone}
      title={
        !phone
          ? "Falta teléfono para crear el pedido"
          : "Crear un nuevo pedido en Aliclik"
      }
    >
      <i className="bx bx-plus-circle text-xs" />
      Crear nuevo pedido
    </button>
  );

  return (
    <div className="p-1.5 text-white">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <i className="bx bx-store-alt text-cyan-300 text-base" />
          <h3 className="font-semibold text-xs">
            {selectedOrder ? "Pedido seleccionado" : "Pedidos del cliente"}
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          {selectedOrder && (
            <button
              className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-[10px] flex items-center gap-1"
              onClick={() => setSelectedOrder(null)}
            >
              <i className="bx bx-x text-xs" />
              Cerrar
            </button>
          )}
          {!selectedOrder && (
            <button
              className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-[10px]"
              onClick={() => emitGetOrders()}
              disabled={ordersLoading}
              title="Actualizar"
            >
              <i
                className={`bx bx-refresh text-xs ${ordersLoading ? "bx-spin" : ""}`}
              />
            </button>
          )}
        </div>
      </div>

      {ordersError && (
        <div className="text-[10px] text-red-300 bg-red-500/10 border border-red-400/20 rounded-md p-2 mb-2">
          {ordersError}
        </div>
      )}

      {ordersLoading && !selectedOrder && (
        <div className="text-[10px] text-white/70">Cargando pedidos…</div>
      )}

      {/* Crear / listar */}
      {!selectedOrder && !ordersLoading && !ordersError && (
        <>
          {createHook.createOrderOpen ? (
            <div className="mb-1.5 rounded-lg bg-white/5 border border-white/10">
              <CreateAliclikOrderPanel
                hook={createHook}
                onClose={() => createHook.setCreateOrderOpen(false)}
              />
            </div>
          ) : (
            <>
              <div className="mb-1.5">
                <CreateButton />
              </div>

              {orders?.length === 0 ? (
                <div className="rounded-lg bg-white/5 border border-white/10 p-2">
                  <p className="text-[10px] text-white/80">
                    No hay pedidos de Aliclik para este cliente.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.map((o) => (
                    <button
                      key={o.order_number}
                      type="button"
                      onClick={() => setSelectedOrder(o)}
                      // Mismo contenedor que las tarjetas de OrderList (Dropi);
                      // solo cambia el color del hover, que marca la plataforma.
                      className="group w-full text-left rounded-[10px] bg-[#0f1629] border border-white/[0.08] overflow-hidden transition-all hover:border-cyan-400/25 px-3.5 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-white tracking-tight truncate">
                            {o.order_number}
                          </p>
                          <p className="text-[10px] text-white/40 mt-0.5 truncate">
                            {fmtDate(o.order_created_at)}
                            {[o.city, o.state].filter(Boolean).length
                              ? ` · ${[o.city, o.state].filter(Boolean).join(", ")}`
                              : ""}
                          </p>
                        </div>
                        <EstadoBadge estado={o.status} />
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/[0.06]">
                        <span className="text-[10px] text-white/45 truncate max-w-[60%]">
                          {o.productos?.[0]?.name || "—"}
                        </span>
                        <span className="text-[12px] font-bold text-white tracking-tight shrink-0">
                          {soles(o.total_order)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Detalle — mismo contenedor y tipografía que las tarjetas de Dropi */}
      {selectedOrder && (
        <div className="rounded-[10px] bg-[#0f1629] border border-white/[0.08] overflow-hidden">
          <div className="flex items-start justify-between gap-2 px-3.5 pt-3">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-white tracking-tight truncate">
                {selectedOrder.order_number}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5 truncate">
                {fmtDate(selectedOrder.order_created_at)}
              </p>
            </div>
            <EstadoBadge estado={selectedOrder.status} />
          </div>

          {/* Los tres ejes crudos: el asesor los necesita para explicarle al
              cliente en qué punto está, porque el estado canónico los resume. */}
          <div className="grid grid-cols-3 gap-1.5 px-3.5 pt-3">
            {[
              ["Llamada", selectedOrder.call_status],
              ["Entrega", selectedOrder.delivery_status],
              ["Despacho", selectedOrder.dispatch_status],
            ].map(([label, valor]) => (
              <div
                key={label}
                className="rounded-[7px] bg-white/[0.03] border border-white/[0.06] px-2 py-1.5"
              >
                <p className="text-[9px] uppercase tracking-wider text-white/30">
                  {label}
                </p>
                <p className="text-[10px] text-white/75 truncate mt-0.5">
                  {valor || "—"}
                </p>
              </div>
            ))}
          </div>

          <div className="px-3.5 pt-3 space-y-1">
            {[
              [
                "Cliente",
                [selectedOrder.name, selectedOrder.surname]
                  .filter(Boolean)
                  .join(" "),
              ],
              ["Teléfono", selectedOrder.phone],
              ["Dirección", selectedOrder.dir],
              [
                "Destino",
                [selectedOrder.city, selectedOrder.state]
                  .filter(Boolean)
                  .join(", "),
              ],
              ["Productos", selectedOrder.productos?.[0]?.name],
            ].map(([label, valor]) => (
              <div
                key={label}
                className="flex justify-between gap-2 text-[10px]"
              >
                <span className="text-white/30 shrink-0">{label}</span>
                <span className="text-white/70 text-right truncate">
                  {valor || "—"}
                </span>
              </div>
            ))}

            <div className="flex justify-between text-[14px] font-bold text-white pt-2 mt-1 border-t border-white/[0.06] tracking-tight">
              <span>Total</span>
              <span>{soles(selectedOrder.total_order)}</span>
            </div>
          </div>

          {/* Aliclik no expone número de guía ni PDF en ningún endpoint: el
              orderNumber es toda la referencia de seguimiento que existe. */}
          <p className="text-[9px] text-white/25 leading-relaxed px-3.5 pt-2.5">
            Aliclik no emite número de guía. Usa el número de pedido como
            referencia de seguimiento.
          </p>

          {/* Cancelar solo tiene sentido mientras el pedido siga vivo. */}
          <div className="px-3.5 py-3">
            {["ENTREGADA", "CANCELADO", "DEVOLUCION"].includes(
              selectedOrder.status,
            ) ? (
              <p className="text-[9px] text-white/20 text-center">
                Este pedido ya terminó su ciclo. No admite cambios.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => confirmarCancelacion(selectedOrder)}
                className="w-full px-3.5 py-2.5 rounded-[7px] bg-rose-500/[0.10] hover:bg-rose-500/[0.20] border border-rose-400/[0.22] text-[11px] font-semibold text-rose-300 flex items-center justify-center gap-2 transition-colors"
              >
                <i className="bx bx-x-circle text-sm" />
                Cancelar pedido
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
