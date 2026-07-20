import React, { useState, useEffect } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

import CreateOrderPanel from "./CreateOrderPanel";
import EtiquetasCustomSelect from "./EtiquetasCustomSelect";
import HistorialEncargados from "./HistorialEncargados";
import IncidenciasCliente from "./IncidenciasCliente";
import OrderList from "./OrderList";
import OrderDetail from "./OrderDetail";
import EncuestasCliente from "./EncuestasCliente";
import CarteraImporsuitSection from "../imporsuit/CarteraImporsuitSection";
import ChecklistImporsuitSection from "../imporsuit/ChecklistImporsuitSection";

import useDropiOrders from "../../hooks/useDropiOrders";
import useCreateOrder from "../../hooks/UseCreateOrders";

import {
  showOrderId,
  canEditOrder,
  isPendingConfirm,
  pickDistributionCompanyFromQuote,
  canCancelOrder,
} from "../../utils/orderHelper";

/* ── Badge: enlace contacto ↔ orden (cuando la orden usa otro teléfono) ── */
function EnlaceOrdenBadge({ idCliente, idConfiguracion }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (!idCliente || !idConfiguracion) {
      setInfo(null);
      return;
    }
    let alive = true;
    chatApi
      .get("clientes_chat_center/enlace_orden_contacto", {
        params: { id_cliente: idCliente, id_configuracion: idConfiguracion },
        silentError: true,
      })
      .then(({ data }) => alive && setInfo(data?.data || null))
      .catch(() => alive && setInfo(null));
    return () => {
      alive = false;
    };
  }, [idCliente, idConfiguracion]);

  const origen = info?.como_origen;
  const orden = info?.como_orden;
  if (!origen && !orden) return null;

  const abrirChat = (id) =>
    id && window.open(`/chat/${id}`, "_blank", "noopener,noreferrer");
  const fmtTel = (t) => "+" + String(t || "").replace(/\D/g, "");

  return (
    <div className="mb-2 space-y-1">
      {/* Este contacto es el ORIGEN: la orden corre en otro número */}
      {origen && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-6 rounded-lg bg-amber-400/15 grid place-items-center shrink-0">
              <i className="bx bx-git-branch text-amber-300 text-sm" />
            </span>
            <span className="text-[11px] font-bold text-amber-100">
              Este pedido se gestiona en otro contacto
            </span>
          </div>
          <p className="text-[10px] text-amber-200/80 leading-relaxed text-justify mb-2">
            Las notificaciones de seguimiento se envían al contacto{" "}
            <span className="font-semibold text-amber-100">
              {origen.nombre_orden
                ? `${origen.nombre_orden} (${fmtTel(origen.celular_orden)})`
                : fmtTel(origen.celular_orden)}
            </span>
            . Este chat solo refleja el estado del pedido, sin mensajes, para
            optimizar el uso de plantillas y prevenir reportes de spam.
          </p>
          {origen.id_cliente_orden && (
            <button
              type="button"
              onClick={() => abrirChat(origen.id_cliente_orden)}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-100 text-[10px] font-semibold py-1.5 transition-colors"
            >
              <i className="bx bx-chat text-sm" /> Abrir chat del pedido
            </button>
          )}
        </div>
      )}
      {/* Este contacto es el de la ORDEN: aquí corren las automatizaciones */}
      {orden && (
        <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.07] p-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-6 rounded-lg bg-cyan-400/15 grid place-items-center shrink-0">
              <i className="bx bx-check-shield text-cyan-300 text-sm" />
            </span>
            <span className="text-[11px] font-bold text-cyan-100">
              Seguimiento activo en este chat
            </span>
          </div>
          <p className="text-[10px] text-cyan-200/80 leading-relaxed text-justify mb-2">
            Las notificaciones de seguimiento de este pedido se envían desde este
            chat. La orden se originó en el contacto{" "}
            <span className="font-semibold text-cyan-100">
              {(() => {
                const nom = [orden.nombre_cliente, orden.apellido_cliente]
                  .filter(Boolean)
                  .join(" ");
                const tel = fmtTel(orden.celular_cliente);
                return nom ? `${nom} (${tel})` : tel;
              })()}
            </span>
            .
          </p>
          {orden.id_cliente_origen && (
            <button
              type="button"
              onClick={() => abrirChat(orden.id_cliente_origen)}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/30 text-cyan-100 text-[10px] font-semibold py-1.5 transition-colors"
            >
              <i className="bx bx-chat text-sm" /> Abrir chat original
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Props comunes que se pasan al CreateOrderPanel ── */
function buildCreateOrderPanelProps(createHook) {
  return {
    phoneInput: createHook.phoneInput,
    setPhoneInput: createHook.setPhoneInput,
    name: createHook.name,
    setName: createHook.setName,
    surname: createHook.surname,
    setSurname: createHook.setSurname,
    dir: createHook.dir,
    setDir: createHook.setDir,
    notes: createHook.notes,
    setNotes: createHook.setNotes,
    botHints: createHook.botHints,
    autoGeo: createHook.autoGeo,
    rateType: createHook.rateType,
    setRateType: createHook.setRateType,
    states: createHook.states,
    statesLoading: createHook.statesLoading,
    selectedDepartmentId: createHook.selectedDepartmentId,
    handleSelectDepartment: createHook.handleSelectDepartment,
    cities: createHook.cities,
    citiesLoading: createHook.citiesLoading,
    selectedCityId: createHook.selectedCityId,
    handleSelectCity: createHook.handleSelectCity,
    shippingQuotes: createHook.shippingQuotes,
    shippingQuotesLoading: createHook.shippingQuotesLoading,
    shippingQuotesError: createHook.shippingQuotesError,
    selectedShipping: createHook.selectedShipping,
    setSelectedShipping: createHook.setSelectedShipping,
    canShowShipping:
      Boolean(createHook.selectedCityCodDane) &&
      Boolean(createHook.remitCodDane),
    onRecotizar: createHook.emitCotizaTransportadoras,
    keywords: createHook.keywords,
    setKeywords: createHook.setKeywords,
    prodList: createHook.prodList,
    prodLoading: createHook.prodLoading,
    prodError: createHook.prodError,
    emitGetProducts: createHook.emitGetProducts,
    addProductToCart: createHook.addProductToCart,
    productsCart: createHook.productsCart,
    updateCartItem: createHook.updateCartItem,
    removeProductFromCart: createHook.removeProductFromCart,
    canSubmit:
      Boolean(createHook.name?.trim()) &&
      Boolean(createHook.surname?.trim()) &&
      Boolean(createHook.dir?.trim()) &&
      Boolean(createHook.selectedDepartmentId) &&
      Boolean(createHook.selectedCityId) &&
      Array.isArray(createHook.productsCart) &&
      createHook.productsCart.length > 0 &&
      Boolean(
        pickDistributionCompanyFromQuote(createHook.selectedShipping)?.id,
      ),
    onClose: () => createHook.setCreateOrderOpen(false),
    onSubmit: createHook.emitCreateOrder,
    selectedCityCodDane: createHook.selectedCityCodDane,
    remitCodDane: createHook.remitCodDane,
    noProrateFlete: createHook.noProrateFlete,
    customerHistory: createHook.customerHistory,
    customerHistoryLoading: createHook.customerHistoryLoading,
  };
}

export default function DropshipperClientPanel(props) {
  const {
    socketRef,
    id_configuracion,
    selectedChat,
    DEFAULT_AVATAR,
    isOpen,
    setIsOpen,
    isOpenNovedades,
    setIsOpenNovedades,
    isOpenMiniCal,
    setIsOpenMiniCal,
    handleToggleCalendar,
    activar_cotizacion,
    isCotizacionesOpen,
    handleToggleCotizaciones,
    loadingCotizaciones,
    cotizacionesData,
    Cotizador,
    MiniCalendario,
    openEditContact,
    isGoogleLinked,
  } = props;

  // const noProrateFlete = Number(id_configuracion) === 185;
  //cambios para todos
  const noProrateFlete = true;

  const ordersHook = useDropiOrders({
    socketRef,
    id_configuracion,
    selectedChat,
    isOpen,
  });

  const createHook = useCreateOrder({
    socketRef,
    id_configuracion,
    phone: ordersHook.phone,
    selectedChat,
    emitGetOrders: ordersHook.emitGetOrders,
    noProrateFlete,
  });

  const [phoneInput, setPhoneInput] = useState("");
  const [orderName, setOrderName] = useState("");
  const [orderSurname, setOrderSurname] = useState("");
  const [orderDir, setOrderDir] = useState("");

  const handleToggleOrders = () => {
    setIsOpen((prev) => !prev);
    setIsOpenNovedades(false);
    setIsOpenMiniCal(false);
    if (isOpen) ordersHook.setSelectedOrder(null);
  };

  const openOrder = (order) => {
    ordersHook.setSelectedOrder(order);
    const orderPhone = String(order?.phone || ordersHook.phone || "").replace(
      /\D/g,
      "",
    );
    setPhoneInput(orderPhone);
    setOrderName(order?.name || "");
    setOrderSurname(order?.surname || "");
    setOrderDir(order?.dir || "");
  };

  const closeOrder = () => ordersHook.setSelectedOrder(null);

  const handleEditOrder = (order) => {
    if (!canEditOrder(order)) return;
    const orderId = showOrderId(order);
    const cleanPhone = String(phoneInput || "").replace(/\D/g, "");
    if (!cleanPhone) {
      Swal.fire({ icon: "warning", title: "Teléfono inválido" });
      return;
    }
    Swal.fire({
      icon: "question",
      title: "Guardar cambios",
      text: `¿Desea actualizar la orden #${orderId}?`,
      showCancelButton: true,
      confirmButtonText: "Sí, guardar",
      cancelButtonText: "Cancelar",
    }).then((r) => {
      if (!r.isConfirmed) return;
      ordersHook.emitUpdateOrder(orderId, {
        name: String(orderName || "").trim(),
        surname: String(orderSurname || "").trim(),
        phone: cleanPhone,
        dir: String(orderDir || "").trim(),
      });
    });
  };

  const handleCancelOrder = (order) => {
    if (!canCancelOrder(order)) {
      Swal.fire({
        icon: "info",
        title: "No se puede cancelar",
        text: "Dropi solo permite cancelar órdenes en PENDIENTE CONFIRMACION o PENDIENTE. Gestiónala como devolución/novedad.",
      });
      return;
    }

    const orderId = showOrderId(order);
    Swal.fire({
      icon: "warning",
      title: "Cancelar orden",
      text: `¿Desea cancelar la orden #${orderId}?`,
      showCancelButton: true,
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "No",
    }).then((r) => {
      if (!r.isConfirmed) return;
      ordersHook.emitSetOrderStatus(orderId, "CANCELADO");
    });
  };

  const handleConfirmOrder = (order) => {
    if (!isPendingConfirm(order)) return;
    const orderId = showOrderId(order);
    Swal.fire({
      icon: "question",
      title: "Confirmar pedido",
      text: `Esto cambiará el estado de la orden #${orderId} a PENDIENTE.`,
      showCancelButton: true,
      confirmButtonText: "Sí, confirmar",
      cancelButtonText: "Cancelar",
    }).then((r) => {
      if (!r.isConfirmed) return;
      ordersHook.emitSetOrderStatus(orderId, "PENDIENTE");
    });
  };

  const openCreateOrderPanel = () => {
    createHook.resetCreateOrderState();
    createHook.setCreateOrderOpen(true);
    createHook.setStep(1);
    createHook.emitGetStates();
    // Prellenar con los datos del cierre del bot y buscar el producto por el
    // ID de Dropi del anuncio (si lo hay); si no, carga la lista por defecto.
    createHook.prefillFromBot().then((pre) => {
      // Con ID → busca ese producto; sin ID → lista por defecto (no por
      // nombre, para no traer una lista interminable).
      createHook.emitGetProducts(true, pre?.searchTerm || "");
    });
  };

  const handleUsarProductoEnOrden = (data) => {
    if (!data) return;
    setIsOpen(true);
    openCreateOrderPanel();
    setTimeout(() => {
      const term = String(
        data.external_id || data.producto_nombre || "",
      ).trim();
      if (!term) return;
      createHook.setKeywords(term);
      createHook.emitGetProducts(true, term);
    }, 150);
  };

  const { selectedOrder } = ordersHook;
  const { orders, ordersLoading, ordersError, phone } = ordersHook;
  const createPanelProps = buildCreateOrderPanelProps(createHook);

  const CreateOrderButton = () => (
    <button
      type="button"
      onClick={openCreateOrderPanel}
      className="w-full px-2 py-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/25 text-[10px] font-semibold flex items-center justify-center gap-1 text-emerald-300 transition-colors"
      disabled={!phone}
      title={
        !phone ? "Falta teléfono para crear orden" : "Crear una nueva orden"
      }
    >
      <i className="bx bx-plus-circle text-xs" />
      Crear nueva orden
    </button>
  );

  return (
    <div className="relative h-full text-white flex flex-col">
      <div className="w-full max-w-2xl mx-auto h-full flex flex-col flex-1 min-h-0 px-2 pt-2">
        {/* ===== Header cliente ===== */}
        <ClientHeader
          selectedChat={selectedChat}
          DEFAULT_AVATAR={DEFAULT_AVATAR}
          phone={phone}
          openEditContact={openEditContact}
          id_configuracion={id_configuracion}
          onUsarProductoEnOrden={handleUsarProductoEnOrden}
        />

        <EnlaceOrdenBadge
          idCliente={selectedChat?.id}
          idConfiguracion={id_configuracion}
        />

        {/* ===== Cartera Imporsuit (deudas / pagos) ===== */}
        <CarteraImporsuitSection
          selectedChat={selectedChat}
          idConfiguracion={id_configuracion}
        />

        {/* ===== Checklist del alumno (solo lectura) ===== */}
        <ChecklistImporsuitSection
          selectedChat={selectedChat}
          idConfiguracion={id_configuracion}
        />

        {/* ===== Botonera superior ===== */}
        <div className="grid grid-cols-2 gap-1.5 mb-3 opacity-0 animate-slideInRightOnce delay-[0ms]">
          <TopButton
            label="Órdenes"
            icon="bx-package"
            active={isOpen}
            onClick={handleToggleOrders}
          />
          <TopButton
            label="Novedades"
            icon="bx-bell"
            active={isOpenNovedades}
            onClick={() => {
              setIsOpenNovedades((prev) => !prev);
              setIsOpen(false);
              setIsOpenMiniCal(false);
              ordersHook.setSelectedOrder(null);
            }}
          />
          {isGoogleLinked && (
            <TopButton
              label="Calendario"
              icon="bx-calendar"
              active={isOpenMiniCal}
              className={activar_cotizacion == 1 ? "" : "col-span-2"}
              onClick={() => {
                ordersHook.setSelectedOrder(null);
                handleToggleCalendar();
              }}
            />
          )}
          {activar_cotizacion == 1 && (
            <TopButton
              label="Cotizaciones"
              icon="bx-file-blank"
              active={isCotizacionesOpen}
              iconColor={isCotizacionesOpen ? "glow-yellow" : "text-green-300"}
              onClick={() => {
                ordersHook.setSelectedOrder(null);
                handleToggleCotizaciones();
              }}
            />
          )}
        </div>

        {/* ===== Panel Órdenes ===== */}
        <div
          className={`transition-all duration-300 ease-in-out transform origin-top ${
            isOpen
              ? "opacity-100 scale-100 max-h-[2000px] pointer-events-auto"
              : "opacity-0 scale-95 max-h-0 overflow-hidden pointer-events-none"
          } bg-[#12172e] rounded-md shadow-md mb-3`}
        >
          <div className="p-1.5 text-white">
            {/* Encabezado */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <i className="bx bx-package text-yellow-300 text-base" />
                <h3 className="font-semibold text-xs">
                  {selectedOrder ? "Orden seleccionada" : "Órdenes del cliente"}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedOrder && (
                  <button
                    className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-[10px] flex items-center gap-1"
                    onClick={closeOrder}
                  >
                    <i className="bx bx-x text-xs" />
                    Cerrar
                  </button>
                )}
                {!selectedOrder && (
                  <button
                    className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-[10px]"
                    onClick={() => ordersHook.emitGetOrders()}
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
              <div className="text-[10px] text-white/70">Cargando órdenes…</div>
            )}

            {/* Sin órdenes */}
            {!selectedOrder &&
              !ordersLoading &&
              !ordersError &&
              orders?.length === 0 && (
                <div className="rounded-lg bg-white/5 border border-white/10 p-2">
                  {!createHook.createOrderOpen ? (
                    <>
                      <p className="text-[10px] text-white/80">
                        No hay órdenes para este cliente.
                      </p>
                      <div className="mt-2">
                        <CreateOrderButton />
                      </div>
                    </>
                  ) : (
                    <CreateOrderPanel {...createPanelProps} />
                  )}
                </div>
              )}

            {/* Lista de órdenes + botón crear */}
            {!selectedOrder &&
              !ordersLoading &&
              !ordersError &&
              orders?.length > 0 && (
                <>
                  {!createHook.createOrderOpen ? (
                    <div className="mb-1.5">
                      <CreateOrderButton />
                    </div>
                  ) : (
                    <div className="mb-1.5 rounded-lg bg-white/5 border border-white/10">
                      <CreateOrderPanel {...createPanelProps} />
                    </div>
                  )}
                  {!createHook.createOrderOpen && (
                    <OrderList orders={orders} onOpenOrder={openOrder} />
                  )}
                </>
              )}

            {/* Detalle de orden */}
            {selectedOrder && (
              <OrderDetail
                order={selectedOrder}
                phoneInput={phoneInput}
                setPhoneInput={setPhoneInput}
                orderName={orderName}
                setOrderName={setOrderName}
                orderSurname={orderSurname}
                setOrderSurname={setOrderSurname}
                orderDir={orderDir}
                setOrderDir={setOrderDir}
                onClose={closeOrder}
                onEditOrder={handleEditOrder}
                onCancelOrder={handleCancelOrder}
                onConfirmOrder={handleConfirmOrder}
              />
            )}
          </div>
        </div>

        {/* ===== Panel Cotizaciones ===== */}
        <div
          className={`transition-all duration-300 ease-in-out transform origin-top ${
            isCotizacionesOpen
              ? "opacity-100 scale-100 max-h-[1000px] pointer-events-auto"
              : "opacity-0 scale-95 max-h-0 overflow-hidden pointer-events-none"
          } bg-[#12172e] rounded-md shadow-md mb-3`}
        >
          <Cotizador
            loadingCotizaciones={loadingCotizaciones}
            cotizacionesData={cotizacionesData}
          />
        </div>

        {/* ===== Mini calendario ===== */}
        {isOpenMiniCal && (
          <div className="bg-transparent rounded-md shadow-md">
            <div className="p-2">
              <div className="rounded-md shadow-md bg-white text-slate-900">
                <MiniCalendario />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componentes locales compactos ───

function ClientHeader({
  selectedChat,
  DEFAULT_AVATAR,
  phone,
  openEditContact,
  id_configuracion,
  onUsarProductoEnOrden,
}) {
  return (
    <div className="mb-3">
      <div className="relative rounded-xl border border-white/10 bg-[#0b1222] shadow-lg overflow-visible">
        <button
          type="button"
          onClick={openEditContact}
          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[9px] text-white/80 hover:bg-white/10 hover:text-white transition"
          title="Editar contacto"
        >
          <i className="bx bx-pencil text-xs" />
        </button>

        {/* Top strip */}
        <div className="px-3 py-2.5 bg-[#162c4a]">
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <img
                src={selectedChat?.imagePath || DEFAULT_AVATAR}
                alt="Avatar"
                className="h-9 w-9 rounded-full object-cover bg-white/10 border border-white/10"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_AVATAR;
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-white font-semibold text-xs truncate">
                  {selectedChat?.nombre_cliente || "Cliente sin nombre"}
                </p>
                <span className="text-[9px] text-white/40">
                  {selectedChat?.psid
                    ? `PSID ${selectedChat.psid}`
                    : `ID ${selectedChat?.id ?? "N/A"}`}
                </span>
              </div>
              <p className="text-[10px] text-white/55 truncate mt-0.5">
                {selectedChat?.email_cliente || "Sin email registrado"}
              </p>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 divide-x divide-white/10 bg-[#0f1b33]">
          <InfoCell
            label="Teléfono"
            value={selectedChat?.celular_cliente || "N/A"}
          />
          <InfoCell
            label="Email"
            value={selectedChat?.email_cliente || "Sin email"}
          />
        </div>

        {/* Producto del anuncio por el que vino el cliente */}
        <ProductoOrigenAnuncio
          idCliente={selectedChat?.id}
          idConfiguracion={id_configuracion}
          onUsarEnOrden={onUsarProductoEnOrden}
        />

        {/* <EtiquetasCustomSelect clienteId={selectedChat?.id} /> */}
        <HistorialEncargados clienteId={selectedChat?.id} />
        <IncidenciasCliente
          clienteId={selectedChat?.id}
          idConfiguracion={id_configuracion}
        />
        <EncuestasCliente
          clienteId={selectedChat?.id}
          id_configuracion={id_configuracion}
        />

        {!phone && (
          <div className="px-3 py-1.5 bg-amber-500/10 border-t border-amber-400/20 text-amber-200 text-[9px]">
            No se detectó un teléfono válido. No se podrán consultar órdenes.
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCell({ label, value }) {
  return (
    <div className="px-3 py-2">
      <p className="text-[9px] text-white/45">{label}</p>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <p className="text-[11px] text-white/90 font-medium truncate">
          {value}
        </p>
        <button
          type="button"
          className="shrink-0 p-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 transition"
          onClick={() => {
            if (!value || value === "N/A") return;
            navigator.clipboard?.writeText(String(value));
          }}
          title={`Copiar ${label.toLowerCase()}`}
        >
          <i className="bx bx-copy-alt text-xs text-white/70" />
        </button>
      </div>
    </div>
  );
}

function TopButton({
  label,
  icon,
  active,
  onClick,
  className = "",
  iconColor,
}) {
  return (
    <button
      className={`group w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all duration-300 border ${
        active
          ? "bg-[#1e3a5f] border-blue-400"
          : "bg-[#162c4a] border-transparent hover:border-blue-300"
      } ${className}`}
      onClick={onClick}
    >
      <i
        className={`bx ${icon} text-sm ${
          iconColor || (active ? "glow-yellow" : "text-yellow-300")
        }`}
      />
      <span className="text-white">{label}</span>
    </button>
  );
}

function ProductoOrigenAnuncio({ idCliente, idConfiguracion, onUsarEnOrden }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!idCliente || !idConfiguracion) {
      setData(null);
      return;
    }
    let cancel = false;
    setLoading(true);
    setData(null);

    chatApi
      .get(
        `/clientes_chat_center/origen_anuncio?id_cliente=${idCliente}&id_configuracion=${idConfiguracion}`,
      )
      .then((r) => {
        if (cancel) return;
        if (r.data?.status === 200 && r.data?.data?.id_anuncio) {
          setData(r.data.data);
        } else {
          setData(null);
        }
      })
      .catch(() => !cancel && setData(null))
      .finally(() => !cancel && setLoading(false));

    return () => {
      cancel = true;
    };
  }, [idCliente, idConfiguracion]);

  const copy = (val, label) => {
    if (!val) return;
    navigator.clipboard?.writeText(String(val));
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `${label} copiado`,
      showConfirmButton: false,
      timer: 1200,
    });
  };

  if (loading) {
    return (
      <div className="mx-3 my-2 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[10px] text-white/60">
        <i className="bx bx-loader-alt bx-spin mr-1" />
        Buscando producto del anuncio...
      </div>
    );
  }

  if (!data) return null;

  const tieneProducto = !!data.id_producto;
  const tieneIdDropi = !!data.external_id;
  const matchAprox = data.match_tipo === "aproximado";

  /* ─── SIN PRODUCTO VINCULADO ─── */
  if (!tieneProducto) {
    return (
      <div className="mx-3 my-2 rounded-lg border border-amber-400/25 bg-gradient-to-br from-amber-500/[0.08] via-amber-500/[0.03] to-transparent overflow-hidden">
        <div className="flex items-start gap-2 px-2.5 py-2">
          <i className="bx bxs-error-circle text-amber-400 text-[14px] mt-px shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-amber-300">
                Anuncio sin vincular
              </span>
              {data.source_url && (
                <a
                  href={data.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-0.5 text-[9px] text-white/50 hover:text-amber-200 transition"
                  title="Ver anuncio en Meta"
                >
                  <i className="bx bx-link-external text-[10px]" />
                  Ver
                </a>
              )}
            </div>
            <p
              className="text-[11px] text-white/85 mt-0.5 leading-tight truncate italic"
              title={data.headline}
            >
              "{data.headline || "Sin titular"}"
            </p>
            <p className="text-[9.5px] text-amber-200/70 mt-1 leading-snug">
              💡 Nombra tu anuncio igual al producto de tu listado para
              vincularlo automáticamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ─── CON PRODUCTO VINCULADO ─── */
  // Match exacto = naranja, aproximado = ámbar (color de advertencia leve)
  const accent = matchAprox
    ? {
        text: "text-amber-300",
        border: "border-amber-400/25",
        dot: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]",
        btnBg:
          "bg-gradient-to-r from-amber-500/20 to-amber-500/10 hover:from-amber-500/30 hover:to-amber-500/20 text-amber-100",
      }
    : {
        text: "text-orange-300",
        border: "border-orange-400/25",
        dot: "bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.6)]",
        btnBg:
          "bg-gradient-to-r from-orange-500/20 to-orange-500/10 hover:from-orange-500/30 hover:to-orange-500/20 text-orange-100",
      };

  return (
    <div
      className={`mx-3 my-2 rounded-lg overflow-hidden border ${accent.border} bg-white/[0.025] shadow-sm`}
    >
      {/* Body principal */}
      <div className="flex items-center gap-2.5 p-2">
        {/* Imagen producto */}
        {data.producto_imagen ? (
          <img
            src={data.producto_imagen}
            alt=""
            className="w-12 h-12 rounded-md object-cover bg-white/5 border border-white/10 shrink-0"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <div className="w-12 h-12 rounded-md bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
            <i className="bx bx-package text-xl text-white/30" />
          </div>
        )}

        {/* Columna info */}
        <div className="min-w-0 flex-1">
          {/* Label + Ver anuncio */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${accent.dot}`}
            />
            <span
              className={`text-[8.5px] font-bold uppercase tracking-wider ${accent.text}`}
              title={
                matchAprox
                  ? `Match aproximado (${Math.round(
                      (data.match_score || 0) * 100,
                    )}%)`
                  : "Match exacto"
              }
            >
              Producto del anuncio
              {matchAprox && (
                <span className="opacity-70 normal-case ml-1">(aprox.)</span>
              )}
            </span>
            {data.source_url && (
              <a
                href={data.source_url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-0.5 text-[9px] text-white/50 hover:text-white transition"
                title="Ver anuncio en Meta"
              >
                <i className="bx bx-link-external text-[10px]" />
                Ver
              </a>
            )}
          </div>

          {/* Nombre producto */}
          <p
            className="text-[12px] font-semibold text-white leading-tight truncate"
            title={data.producto_nombre}
          >
            {data.producto_nombre}
          </p>

          {/* Metadata en una línea */}
          <div className="flex items-center gap-1.5 mt-1 text-[10px] flex-wrap">
            <span className="font-semibold text-white/95">
              ${Number(data.producto_precio || 0).toFixed(2)}
            </span>
            <span className="text-white/20">·</span>
            <span className="text-white/70">
              <b
                className={
                  Number(data.stock) > 0 ? "text-emerald-300" : "text-red-300"
                }
              >
                {data.stock ?? "?"}
              </b>{" "}
              stock
            </span>
            {tieneIdDropi && (
              <>
                <span className="text-white/20">·</span>
                <button
                  onClick={() => copy(data.external_id, "ID Dropi")}
                  className="inline-flex items-center gap-0.5 text-orange-200 hover:text-white font-semibold transition"
                  title="Copiar ID Dropi"
                >
                  #{data.external_id}
                  <i className="bx bx-copy-alt text-[11px]" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      {onUsarEnOrden && (
        <button
          onClick={() => onUsarEnOrden(data)}
          className={`w-full px-2 py-1.5 border-t ${accent.border} ${accent.btnBg} text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition`}
        >
          Usar en nueva orden
          <i className="bx bx-right-arrow-alt text-[13px]" />
        </button>
      )}
    </div>
  );
}
