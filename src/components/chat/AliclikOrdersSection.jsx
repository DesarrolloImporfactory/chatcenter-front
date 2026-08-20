import React from "react";
import Swal from "sweetalert2";

import CreateAliclikOrderPanel from "./CreateAliclikOrderPanel";
import useAliclikOrders from "../../hooks/useAliclikOrders";
import useCreateAliclikOrder from "../../hooks/useCreateAliclikOrder";
// Se reutiliza el formateador de OrderList para que las fechas se lean
// exactamente igual en las dos plataformas.
import { fmtDate } from "../../utils/orderHelper";

/**
 * Placeholder para el producto sin foto.
 *
 * No se usa el `NO_IMAGE` de orderHelper porque ese apunta a
 * `app.dropi.ec/assets/utils/no-image.jpg`: en el panel de Aliclik quedaba una
 * imagen servida por Dropi. Este va embebido, así que además no depende de que
 * un host ajeno responda.
 */
const SIN_IMAGEN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
       <rect width="96" height="96" fill="#1b2432"/>
       <path d="M24 62l14-16 10 11 8-8 16 13z" fill="#3d4a60"/>
       <circle cx="36" cy="34" r="7" fill="#3d4a60"/>
     </svg>`,
  );

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
                  {orders.map((o) => {
                    const prods = o.productos || [];
                    const primero = prods[0] || null;
                    const unidades = prods.reduce(
                      (acc, p) => acc + (Number(p.quantity) || 0),
                      0,
                    );
                    return (
                      <button
                        key={o.order_number}
                        type="button"
                        onClick={() => setSelectedOrder(o)}
                        // Misma estructura que las tarjetas de OrderList
                        // (Dropi): cabecera, fila de producto y fila de datos.
                        // Solo cambia el color del hover, que marca plataforma.
                        className="group w-full text-left rounded-[10px] bg-[#0f1629] border border-white/[0.08] overflow-hidden transition-all hover:border-cyan-400/25"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 px-3.5 pt-3 pb-0">
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
                          <div className="shrink-0">
                            <EstadoBadge estado={o.status} />
                          </div>
                        </div>

                        {/* Producto */}
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                          <img
                            src={primero?.image || SIN_IMAGEN}
                            alt="Producto"
                            className="h-[42px] w-[42px] rounded-lg object-cover bg-white/[0.04] border border-white/[0.08] shrink-0"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = SIN_IMAGEN;
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold text-white/90 truncate">
                              {primero?.name || "—"}
                            </p>
                            {/* Un pedido puede llevar varios productos: la
                                tarjeta muestra el primero y avisa cuántos más,
                                igual que en Dropi. El detalle los lista todos. */}
                            {prods.length > 1 && (
                              <p className="text-[10px] text-cyan-300/80 mt-0.5 font-semibold">
                                +{prods.length - 1} producto
                                {prods.length - 1 === 1 ? "" : "s"} más
                              </p>
                            )}
                          </div>
                          {unidades > 0 && (
                            <span className="text-[10px] font-semibold text-white/55 bg-white/[0.06] px-2.5 py-1 rounded shrink-0">
                              ×{unidades}
                            </span>
                          )}
                        </div>

                        {/* Stats row. Aliclik no expone transportadora ni monto
                            de envío en el pedido, así que en su lugar van los
                            dos ejes de estado que sí explican dónde está. */}
                        <div className="flex border-t border-white/[0.06]">
                          <div className="flex-1 px-3.5 py-2 border-r border-white/[0.06]">
                            <p className="text-[9px] uppercase tracking-wider text-white/40">
                              Total
                            </p>
                            <p className="text-[12px] font-semibold text-white mt-0.5">
                              {soles(o.total_order)}
                            </p>
                          </div>
                          <div className="flex-1 px-3.5 py-2 border-r border-white/[0.06]">
                            <p className="text-[9px] uppercase tracking-wider text-white/40">
                              Llamada
                            </p>
                            <p className="text-[11px] text-white/60 mt-0.5 truncate">
                              {o.call_status || "—"}
                            </p>
                          </div>
                          <div className="flex-1 px-3.5 py-2">
                            <p className="text-[9px] uppercase tracking-wider text-white/40">
                              Despacho
                            </p>
                            <p className="text-[11px] text-white/60 mt-0.5 truncate">
                              {o.dispatch_status || "—"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
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

          {/* ═══ Producto(s) ═══
              Se pinta un renglón por ítem, como en el detalle de Dropi: un
              pedido de dos productos mostrando solo el primero parece haber
              subido incompleto. */}
          <div className="mt-3 border-t border-white/[0.06]">
            <div className="px-3.5 pt-2.5 pb-2">
              <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">
                {(selectedOrder.productos || []).length > 1
                  ? `Productos (${selectedOrder.productos.length})`
                  : "Producto"}
              </span>
            </div>
            {((selectedOrder.productos || []).length
              ? selectedOrder.productos
              : [null]
            ).map((p, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3.5 pb-3 ${
                  i > 0 ? "pt-3 border-t border-white/[0.06]" : ""
                }`}
              >
                <img
                  src={p?.image || SIN_IMAGEN}
                  alt="Producto"
                  className="h-[50px] w-[50px] rounded-lg object-cover bg-white/[0.04] border border-white/[0.08] shrink-0"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = SIN_IMAGEN;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white/90 truncate">
                    {p?.name || "—"}
                  </p>
                  <div className="flex gap-3 mt-1">
                    {p?.quantity != null && (
                      <span className="text-[10px] text-white/50">
                        Cant:{" "}
                        <span className="font-semibold text-white/80">
                          {p.quantity}
                        </span>
                      </span>
                    )}
                    {p?.price != null && Number(p.price) > 0 && (
                      <span className="text-[10px] text-white/50">
                        P. unit:{" "}
                        <span className="font-semibold text-white/80">
                          {soles(p.price)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                {p?.subtotal != null && Number(p.subtotal) > 0 && (
                  <span className="text-[12px] font-semibold text-white/80 shrink-0">
                    {soles(p.subtotal)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* ═══ Resumen ═══ */}
          <div className="flex border-t border-white/[0.06]">
            <div className="flex-1 px-3.5 py-2.5 border-r border-white/[0.06]">
              <p className="text-[9px] uppercase tracking-wider text-white/40">
                Total
              </p>
              <p className="text-[14px] font-bold text-white mt-0.5">
                {soles(selectedOrder.total_order)}
              </p>
            </div>
            <div className="flex-1 px-3.5 py-2.5 border-r border-white/[0.06]">
              <p className="text-[9px] uppercase tracking-wider text-white/40">
                Agente
              </p>
              <p className="text-[12px] text-white/70 mt-0.5 font-medium truncate">
                {selectedOrder.agent_assigned || "—"}
              </p>
            </div>
            <div className="flex-1 px-3.5 py-2.5">
              <p className="text-[9px] uppercase tracking-wider text-white/40">
                Tienda
              </p>
              <p className="text-[12px] text-white/70 mt-0.5 font-medium truncate">
                {selectedOrder.shop_name || "Aliclik"}
              </p>
            </div>
          </div>

          {/* ═══ Datos del cliente ═══ */}
          <div className="border-t border-white/[0.06]">
            <div className="px-3.5 pt-2.5 pb-2">
              <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">
                Datos del cliente
              </span>
            </div>
            <div className="px-3.5 pb-3 space-y-1">
              {[
                [
                  "Nombre",
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
