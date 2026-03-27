import React from "react";
import {
  showOrderId,
  showOrderStatus,
  showOrderDate,
  fmtDate,
  getCityState,
  statusStyle,
  getProductImage,
  getProductName,
  getProductSku,
  getQty,
  getTransportadora,
  getShippingAmount,
  getTotal,
  getWarehouseName,
  canEditOrder,
  isPendingConfirm,
  isCancelled,
  NO_IMAGE,
  hasGuide,
  getGuideUrl,
  getGuideNumber,
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
  const pendingConfirm = isPendingConfirm(order);
  const cancelled = isCancelled(order);

  const inputCls =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-[7px] px-3 py-2 text-[12px] text-white outline-none transition-all focus:border-violet-400/50 focus:bg-white/[0.06] hover:border-white/15 placeholder:text-white/[0.18]";
  const readOnlyCls =
    "w-full bg-white/[0.02] border border-white/[0.05] rounded-[7px] px-3 py-2 text-[12px] text-white/60 outline-none cursor-default";
  const labelCls =
    "text-[9px] uppercase tracking-wider text-white/35 block mb-1";
  const sectionCls =
    "rounded-[10px] bg-[#0f1629] border border-white/[0.07] overflow-hidden";

  return (
    <div className="space-y-2">
      {/* ═══ Header con status ═══ */}
      <div className={sectionCls}>
        <div className="flex items-start justify-between gap-2 px-3.5 pt-3 pb-2.5">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-white tracking-tight">
              Orden #{showOrderId(order)}
            </p>
            <p className="text-[10px] text-white/40 mt-0.5">
              {fmtDate(showOrderDate(order))} · {getCityState(order)}
            </p>
          </div>
          <span
            className={`text-[9px] px-2.5 py-1 rounded font-bold tracking-wide uppercase shrink-0 ${statusStyle(
              showOrderStatus(order),
            )}`}
          >
            {showOrderStatus(order)}
          </span>
        </div>
      </div>

      {/* ═══ Producto ═══ */}
      <div className={sectionCls}>
        <div className="px-3.5 pt-2.5 pb-2">
          <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">
            Producto
          </span>
        </div>
        <div className="flex items-center gap-3 px-3.5 pb-3">
          <img
            src={getProductImage(order)}
            alt="Producto"
            className="h-[50px] w-[50px] rounded-lg object-cover bg-white/[0.04] border border-white/[0.08] shrink-0"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = NO_IMAGE;
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white/90 truncate">
              {getProductName(order)}
            </p>
            <p className="text-[10px] text-white/35 mt-0.5">
              SKU {getProductSku(order)}
            </p>
            <div className="flex gap-3 mt-1">
              <span className="text-[10px] text-white/50">
                Cant:{" "}
                <span className="font-semibold text-white/80">
                  {getQty(order)}
                </span>
              </span>
              <span className="text-[10px] text-white/50">
                Bodega:{" "}
                <span className="font-semibold text-white/80">
                  {getWarehouseName(order)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Resumen financiero ═══ */}
      <div className={sectionCls}>
        <div className="flex border-b border-white/[0.06]">
          <div className="flex-1 px-3.5 py-2.5 border-r border-white/[0.06]">
            <p className="text-[9px] uppercase tracking-wider text-white/40">
              Total
            </p>
            <p className="text-[14px] font-bold text-white mt-0.5">
              ${getTotal(order)}
            </p>
          </div>
          <div className="flex-1 px-3.5 py-2.5 border-r border-white/[0.06]">
            <p className="text-[9px] uppercase tracking-wider text-white/40">
              Envío
            </p>
            <p className="text-[12px] text-white/70 mt-0.5 font-medium">
              ${getShippingAmount(order)}
            </p>
          </div>
          <div className="flex-1 px-3.5 py-2.5">
            <p className="text-[9px] uppercase tracking-wider text-white/40">
              Transp.
            </p>
            <p className="text-[12px] text-white/70 mt-0.5 font-medium truncate">
              {getTransportadora(order)}
            </p>
          </div>
        </div>

        {/* Info agente / chat */}
        {(order?.agent_assigned || order?.has_chat !== undefined) && (
          <div className="flex border-b border-white/[0.06]">
            <div className="flex-1 px-3.5 py-2.5 border-r border-white/[0.06]">
              <p className="text-[9px] uppercase tracking-wider text-white/40">
                Agente
              </p>
              <p className="text-[11px] text-white/70 mt-0.5">
                {order?.agent_assigned || "Sin agente"}
              </p>
            </div>
            <div className="flex-1 px-3.5 py-2.5">
              <p className="text-[9px] uppercase tracking-wider text-white/40">
                Chat
              </p>
              <p className="text-[11px] text-white/70 mt-0.5">
                {order?.has_chat ? "Sí" : "No"}
              </p>
            </div>
          </div>
        )}

        {/* Guía de envío */}
        {order?.shipping_guide && (
          <div className="px-3.5 py-2.5">
            <p className="text-[9px] uppercase tracking-wider text-white/40 mb-1">
              Guía de envío
            </p>
            <p className="text-[12px] text-white/80 font-mono">
              {order.shipping_guide}
            </p>
          </div>
        )}
      </div>

      {/* ═══ Descargar Guía PDF ═══ */}
      {hasGuide(order) && (
        <a
          href={getGuideUrl(order)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${sectionCls} w-full flex items-center justify-center gap-2.5 px-3.5 py-3 text-[12px] font-semibold text-blue-300 hover:text-blue-200 bg-blue-500/[0.06] hover:bg-blue-500/[0.12] border-blue-400/[0.15] hover:border-blue-400/[0.25] transition-all no-underline`}
        >
          <i className="bx bx-download text-base" />
          <span>Descargar guía</span>
          {getGuideNumber(order) && (
            <span className="text-[10px] text-blue-300/50 font-mono">
              #{getGuideNumber(order)}
            </span>
          )}
        </a>
      )}

      {/* ═══ Datos editables (solo si PENDIENTE CONFIRMACION) ═══ */}
      <div className={sectionCls}>
        <div className="px-3.5 pt-2.5 pb-2">
          <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">
            Datos del cliente
          </span>
          {!editable && (
            <span className="text-[8px] text-white/20 ml-2">
              (solo lectura)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5 px-3.5 pb-1.5">
          <div>
            <label className={labelCls}>Nombre</label>
            <input
              value={orderName}
              onChange={(e) => editable && setOrderName(e.target.value)}
              className={editable ? inputCls : readOnlyCls}
              readOnly={!editable}
            />
          </div>
          <div>
            <label className={labelCls}>Apellido</label>
            <input
              value={orderSurname}
              onChange={(e) => editable && setOrderSurname(e.target.value)}
              className={editable ? inputCls : readOnlyCls}
              readOnly={!editable}
            />
          </div>
        </div>

        <div className="px-3.5 pb-1.5">
          <label className={labelCls}>Teléfono</label>
          <input
            value={phoneInput}
            onChange={(e) => editable && setPhoneInput(e.target.value)}
            className={editable ? inputCls : readOnlyCls}
            readOnly={!editable}
          />
        </div>

        <div className="px-3.5 pb-3">
          <label className={labelCls}>Dirección</label>
          <input
            value={orderDir}
            onChange={(e) => editable && setOrderDir(e.target.value)}
            className={editable ? inputCls : readOnlyCls}
            readOnly={!editable}
          />
        </div>
      </div>

      {/* ═══ Notas ═══ */}
      {order?.notes && (
        <div className={sectionCls}>
          <div className="px-3.5 py-2.5">
            <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold block mb-1">
              Notas
            </span>
            <p className="text-[11px] text-white/60 whitespace-pre-wrap">
              {order.notes}
            </p>
          </div>
        </div>
      )}

      {/* ═══ Acciones ═══ */}
      <div className="flex flex-col gap-1.5 pt-0.5">
        {/* Confirmar (solo PENDIENTE CONFIRMACION) */}
        {pendingConfirm && (
          <button
            type="button"
            onClick={() => onConfirmOrder(order)}
            className="w-full px-3.5 py-3 rounded-[10px] bg-emerald-500/[0.12] hover:bg-emerald-500/[0.22] border border-emerald-400/[0.22] text-[12px] font-semibold text-emerald-300 flex items-center justify-center gap-2 transition-colors"
          >
            <i className="bx bx-check-double text-sm" />
            Confirmar pedido
          </button>
        )}

        {/* Guardar cambios (solo PENDIENTE CONFIRMACION) */}
        {editable && (
          <button
            type="button"
            onClick={() => onEditOrder(order)}
            className="w-full px-3.5 py-2.5 rounded-[10px] bg-blue-500/[0.12] hover:bg-blue-500/[0.22] border border-blue-400/[0.22] text-[11px] font-semibold text-blue-300 flex items-center justify-center gap-2 transition-colors"
          >
            <i className="bx bx-save text-sm" />
            Guardar cambios
          </button>
        )}

        {/* Cancelar orden (si no está cancelada) */}
        {!cancelled && (
          <button
            type="button"
            onClick={() => onCancelOrder(order)}
            className="w-full px-3.5 py-2.5 rounded-[10px] bg-rose-500/[0.06] hover:bg-rose-500/[0.14] border border-rose-400/[0.12] text-[11px] font-semibold text-rose-300/70 hover:text-rose-300 flex items-center justify-center gap-2 transition-colors"
          >
            <i className="bx bx-x-circle text-sm" />
            Cancelar orden
          </button>
        )}

        {/* Cerrar detalle */}
        <button
          type="button"
          onClick={onClose}
          className="w-full px-3.5 py-2 rounded-[10px] bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-[11px] font-medium text-white/40 hover:text-white/60 flex items-center justify-center gap-2 transition-colors"
        >
          <i className="bx bx-arrow-back text-sm" />
          Volver a la lista
        </button>
      </div>
    </div>
  );
}
