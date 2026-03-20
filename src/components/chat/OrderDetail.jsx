import React from "react";
import Swal from "sweetalert2";
import {
  showOrderId,
  showOrderStatus,
  showOrderDate,
  fmtDate,
  getCityState,
  statusStyle,
  isPendingConfirm,
  isCancelled,
  canEditOrder,
  getProductImage,
  getProductName,
  getProductSku,
  getQty,
  getWarehouseName,
  getTransportadora,
  getShippingAmount,
  getTotal,
  NO_IMAGE,
} from "../../utils/orderHelper";

export default function OrderDetail({
  order,
  phoneInput,
  setPhoneInput,
  orderName,
  setOrderName,
  orderSurname,
  setOrderSurname,
  orderDir,
  setOrderDir,
  onClose,
  onEditOrder,
  onCancelOrder,
  onConfirmOrder,
}) {
  if (!order) return null;

  const editable = canEditOrder(order);
  const cancelled = isCancelled(order);
  const pendingConfirm = isPendingConfirm(order);

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold truncate">
            Orden #{showOrderId(order)}
          </p>
          <p className="text-xs text-white/60 truncate">
            {fmtDate(showOrderDate(order))} • {getCityState(order)}
          </p>
        </div>
        <span
          className={`text-[11px] px-2 py-1 rounded-full border ${statusStyle(
            showOrderStatus(order),
          )}`}
        >
          {showOrderStatus(order)}
        </span>
      </div>

      {/* Botones acción */}
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        {pendingConfirm && (
          <button
            type="button"
            onClick={() => onEditOrder(order)}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/30 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <i className="bx bx-save" />
            Guardar cambios
          </button>
        )}

        {/* ✅ FIX: Solo mostrar "Cancelar orden" si NO está ya cancelada */}
        {!cancelled && (
          <button
            type="button"
            onClick={() => onCancelOrder(order)}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <i className="bx bx-x-circle" />
            Cancelar orden
          </button>
        )}

        {pendingConfirm && (
          <button
            type="button"
            onClick={() => onConfirmOrder(order)}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <i className="bx bx-check-circle" />
            Confirmar pedido
          </button>
        )}

        {cancelled && (
          <div className="text-xs text-rose-200 bg-rose-500/10 border border-rose-400/20 rounded-lg p-2">
            Esta orden está cancelada y no se puede modificar.
          </div>
        )}
      </div>

      {/* Datos clave */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Producto */}
        <div className="flex items-start gap-3 bg-black/20 rounded-lg p-3 border border-white/10">
          <img
            src={getProductImage(order)}
            alt="Producto"
            className="h-12 w-12 rounded-lg object-cover bg-white/5 border border-white/10 shrink-0"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = NO_IMAGE;
            }}
          />
          <div className="min-w-0">
            <p className="text-xs text-white/60">Producto</p>
            <p className="text-sm font-semibold truncate">
              {getQty(order)} x {getProductName(order)}
            </p>
            <p className="text-xs text-white/60 truncate">
              SKU: {getProductSku(order)}
            </p>
          </div>
        </div>

        {/* Bodega */}
        <div className="flex items-start gap-3 bg-black/20 rounded-lg p-3 border border-white/10">
          <i className="bx bx-store text-xl text-emerald-300" />
          <div className="min-w-0">
            <p className="text-xs text-white/60">Bodega</p>
            <p className="text-xs text-white truncate">
              {getWarehouseName(order)}
            </p>
          </div>
        </div>

        {/* Teléfono */}
        <div className="flex items-start gap-3 bg-black/20 rounded-lg p-3 border border-white/10">
          <i className="bx bx-phone text-xl text-yellow-300" />
          <div className="min-w-0">
            <p className="text-[11px] text-white/60 mb-1">Teléfono</p>
            <input
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              disabled={!editable}
              className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400/60 ${
                editable
                  ? "text-white"
                  : "text-white/40 cursor-not-allowed opacity-70"
              }`}
              placeholder="Ej: 57XXXXXXXXXX"
            />
          </div>
        </div>

        {/* Transportadora */}
        <div className="flex items-start gap-3 bg-black/20 rounded-lg p-3 border border-white/10">
          <i className="bx bx-trip text-xl text-sky-300" />
          <div className="min-w-0">
            <p className="text-xs text-white/60">Transportadora</p>
            <p className="text-sm font-semibold truncate">
              {getTransportadora(order)}
            </p>
            <p className="text-xs text-white/60 truncate">
              Envío: ${getShippingAmount(order)}
            </p>
          </div>
        </div>
      </div>

      {/* Totales */}
      <div className="mt-3 flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
        <p className="text-xs text-white/70">Total orden</p>
        <p className="text-sm font-semibold text-white">${getTotal(order)}</p>
      </div>

      {/* Dirección */}
      <div className="mt-3">
        <p className="text-[11px] text-white/60 mb-1">Dirección</p>
        <input
          value={orderDir}
          onChange={(e) => setOrderDir(e.target.value)}
          disabled={!editable}
          className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400/60 ${
            editable
              ? "text-white"
              : "text-white/40 cursor-not-allowed opacity-70"
          }`}
          placeholder="Dirección de entrega"
        />
      </div>

      {/* Nombre / Apellido */}
      <div className="mt-3 text-xs text-white/50">
        <div className="flex items-start gap-3 bg-black/20 rounded-lg p-3 border border-white/10">
          <i className="bx bx-id-card text-xl text-violet-300" />
          <div className="min-w-0 w-full">
            <p className="text-[11px] text-white/60 mb-1">Nombre</p>
            <input
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              disabled={!editable}
              className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400/60 ${
                editable
                  ? "text-white"
                  : "text-white/40 cursor-not-allowed opacity-70"
              }`}
            />
            <p className="text-[11px] text-white/60 mt-2 mb-1">Apellido</p>
            <input
              value={orderSurname}
              onChange={(e) => setOrderSurname(e.target.value)}
              disabled={!editable}
              className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400/60 ${
                editable
                  ? "text-white"
                  : "text-white/40 cursor-not-allowed opacity-70"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
