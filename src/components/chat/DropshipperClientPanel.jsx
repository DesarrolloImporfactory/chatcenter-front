import React, { useState } from "react";
import Swal from "sweetalert2";

import CreateOrderPanel from "./CreateOrderPanel";
import EtiquetasCustomSelect from "./EtiquetasCustomSelect";
import HistorialEncargados from "./HistorialEncargados";
import OrderList from "./OrderList";
import OrderDetail from "./OrderDetail";

import useDropiOrders from "../../hooks/useDropiOrders";
import useCreateOrder from "../../hooks/UseCreateOrders";

import {
  showOrderId,
  canEditOrder,
  isPendingConfirm,
  pickDistributionCompanyFromQuote,
} from "../../utils/orderHelper";

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
    createHook.emitGetProducts(true);
    createHook.emitGetStates();
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
    <div className="relative col-span-1 h-[calc(100vh_-_130px)] overflow-y-auto custom-scrollbar text-white px-2 duration-700 transition-all animate-slide-in bg-[#171931]">
      <div className="w-full max-w-2xl mx-auto">
        {/* ===== Header cliente ===== */}
        <ClientHeader
          selectedChat={selectedChat}
          DEFAULT_AVATAR={DEFAULT_AVATAR}
          phone={phone}
          openEditContact={openEditContact}
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

        <EtiquetasCustomSelect clienteId={selectedChat?.id} />
        <HistorialEncargados clienteId={selectedChat?.id} />

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
