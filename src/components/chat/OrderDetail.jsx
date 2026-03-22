import React, { useMemo } from "react";
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
  const rateType = order?.rate_type || "—";

  // ── Dirty check: comparar valores actuales vs originales de la orden ──
  const isDirty = useMemo(() => {
    const originalPhone = String(order?.phone || "").replace(/\D/g, "");
    const originalName = order?.name || "";
    const originalSurname = order?.surname || "";
    const originalDir = order?.dir || "";

    return (
      String(phoneInput || "").replace(/\D/g, "") !== originalPhone ||
      String(orderName || "").trim() !== originalName ||
      String(orderSurname || "").trim() !== originalSurname ||
      String(orderDir || "").trim() !== originalDir
    );
  }, [phoneInput, orderName, orderSurname, orderDir, order]);

  return (
    <div className="space-y-2">
      {/* ═══ Header + Stats ═══ */}
      <div className="rounded-[10px] bg-[#0f1629] border border-white/[0.07] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-br from-[#141d35] to-[#111827]">
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-white tracking-tight">
              #{showOrderId(order)}
            </p>
            <p className="text-[10px] text-white/35 mt-0.5">
              {fmtDate(showOrderDate(order))} · {getCityState(order)}
            </p>
          </div>
          <span
            className={`text-[9px] px-2 py-1 rounded font-bold tracking-wide uppercase ${statusStyle(
              showOrderStatus(order),
            )}`}
          >
            {showOrderStatus(order)}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex border-t border-white/5">
          <div className="flex-1 px-3 py-2 border-r border-white/5">
            <p className="text-[9px] uppercase tracking-widest text-white/30">
              Total
            </p>
            <p className="text-[14px] font-bold text-white mt-0.5 tracking-tight">
              ${getTotal(order)}
            </p>
          </div>
          <div className="flex-1 px-3 py-2 border-r border-white/5">
            <p className="text-[9px] uppercase tracking-widest text-white/30">
              Envío
            </p>
            <p className="text-[12px] font-semibold text-white mt-0.5">
              ${getShippingAmount(order)}
            </p>
          </div>
          <div className="flex-1 px-3 py-2">
            <p className="text-[9px] uppercase tracking-widest text-white/30">
              Tipo
            </p>
            <p className="text-[11px] font-semibold text-white/85 mt-0.5 truncate">
              {rateType}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Producto + Envío ═══ */}
      <div className="rounded-[10px] bg-[#0f1629] border border-white/[0.07] overflow-hidden">
        {/* Producto */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <img
            src={getProductImage(order)}
            alt="Producto"
            className="h-10 w-10 rounded-md object-cover bg-white/[0.04] border border-white/[0.08] shrink-0"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = NO_IMAGE;
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-white/90 truncate">
              {getProductName(order)}
            </p>
            <p className="text-[10px] text-white/30 mt-0.5">
              SKU {getProductSku(order)}
            </p>
          </div>
          <span className="text-[10px] font-semibold text-white/50 bg-white/[0.06] px-2 py-0.5 rounded shrink-0">
            ×{getQty(order)}
          </span>
        </div>

        {/* Transportadora + Bodega */}
        <div className="grid grid-cols-2 border-t border-white/5">
          <div className="px-3 py-2 border-r border-white/5">
            <p className="text-[9px] uppercase tracking-wider text-white/30">
              Transportadora
            </p>
            <p className="text-[11px] font-semibold text-white/85 mt-0.5 truncate">
              {getTransportadora(order)}
            </p>
          </div>
          <div className="px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-white/30">
              Bodega
            </p>
            <p className="text-[11px] text-white/50 mt-0.5 truncate">
              {getWarehouseName(order)}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Datos del cliente ═══ */}
      <div className="rounded-[10px] bg-[#0f1629] border border-white/[0.07] overflow-hidden">
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
          <span className="text-[9px] uppercase tracking-widest text-white/25 font-semibold">
            Cliente
          </span>
          {editable && (
            <span className="text-[8px] uppercase tracking-wider text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded font-semibold">
              Editable
            </span>
          )}
        </div>

        {/* Nombre + Apellido */}
        <div className="grid grid-cols-2 gap-1.5 px-3 pb-1.5">
          <div>
            <label className="text-[9px] uppercase tracking-wider text-white/30 block mb-1">
              Nombre
            </label>
            <input
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              disabled={!editable}
              className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-2.5 py-[7px] text-[11px] outline-none transition-colors focus:border-violet-400/50 ${
                editable
                  ? "text-white hover:border-white/15"
                  : "text-white/30 cursor-not-allowed opacity-55"
              }`}
              placeholder="Nombre"
            />
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-wider text-white/30 block mb-1">
              Apellido
            </label>
            <input
              value={orderSurname}
              onChange={(e) => setOrderSurname(e.target.value)}
              disabled={!editable}
              className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-2.5 py-[7px] text-[11px] outline-none transition-colors focus:border-violet-400/50 ${
                editable
                  ? "text-white hover:border-white/15"
                  : "text-white/30 cursor-not-allowed opacity-55"
              }`}
              placeholder="Apellido"
            />
          </div>
        </div>

        {/* Teléfono */}
        <div className="px-3 pb-1.5">
          <label className="text-[9px] uppercase tracking-wider text-white/30 block mb-1">
            Teléfono
          </label>
          <input
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            disabled={!editable}
            className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-2.5 py-[7px] text-[11px] outline-none transition-colors focus:border-violet-400/50 ${
              editable
                ? "text-white hover:border-white/15"
                : "text-white/30 cursor-not-allowed opacity-55"
            }`}
            placeholder="Ej: 0962803007"
          />
        </div>

        {/* Dirección */}
        <div className="px-3 pb-2.5">
          <label className="text-[9px] uppercase tracking-wider text-white/30 block mb-1">
            Dirección
          </label>
          <input
            value={orderDir}
            onChange={(e) => setOrderDir(e.target.value)}
            disabled={!editable}
            className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-2.5 py-[7px] text-[11px] outline-none transition-colors focus:border-violet-400/50 ${
              editable
                ? "text-white hover:border-white/15"
                : "text-white/30 cursor-not-allowed opacity-55"
            }`}
            placeholder="Dirección de entrega"
          />
        </div>
      </div>

      {/* ═══ Acciones ═══ */}
      <div className="flex flex-col gap-1.5 pt-0.5">
        {pendingConfirm && (
          <button
            type="button"
            onClick={() => onConfirmOrder(order)}
            className="w-full px-3 py-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/25 text-[11px] font-semibold flex items-center justify-center gap-1.5 text-emerald-300 transition-colors"
          >
            <i className="bx bx-check-circle text-sm" />
            Confirmar pedido
          </button>
        )}

        {pendingConfirm && (
          <button
            type="button"
            onClick={() => onEditOrder(order)}
            disabled={!isDirty}
            className={`w-full px-3 py-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              isDirty
                ? "bg-violet-500/10 hover:bg-violet-500/20 border-violet-400/18 text-violet-300"
                : "bg-white/[0.02] border-white/[0.06] text-white/20 cursor-not-allowed"
            }`}
          >
            <i className="bx bx-save text-sm" />
            Guardar cambios
          </button>
        )}

        {!cancelled && (
          <button
            type="button"
            onClick={() => onCancelOrder(order)}
            className="w-full px-3 py-2.5 rounded-lg bg-transparent hover:bg-rose-500/10 border border-white/[0.06] hover:border-rose-400/15 text-[11px] font-medium flex items-center justify-center gap-1.5 text-white/35 hover:text-rose-300 transition-colors"
          >
            <i className="bx bx-x-circle text-sm" />
            Cancelar orden
          </button>
        )}

        {cancelled && (
          <div className="text-center text-[10px] text-rose-300/70 bg-rose-500/[0.08] border border-rose-400/10 rounded-lg py-2.5 px-3">
            Orden cancelada — no se puede modificar
          </div>
        )}
      </div>
    </div>
  );
}
