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
  NO_IMAGE,
} from "../../utils/orderHelper";

export default function OrderList({ orders, onOpenOrder }) {
  if (!orders?.length) return null;

  return (
    <div className="space-y-2">
      {orders.map((o, idx) => (
        <div
          key={String(showOrderId(o)) + "_" + idx}
          className="group rounded-[10px] bg-[#0f1629] border border-white/[0.08] overflow-hidden transition-all hover:border-blue-400/25"
        >
          {/* Header: ID + Badge */}
          <div className="flex items-start justify-between gap-2 px-3.5 pt-3 pb-0">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-white tracking-tight">
                #{showOrderId(o)}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5">
                {fmtDate(showOrderDate(o))} · {getCityState(o)}
              </p>
            </div>
            <span
              className={`text-[9px] px-2 py-1 rounded font-bold tracking-wide uppercase shrink-0 ${statusStyle(
                showOrderStatus(o),
              )}`}
            >
              {showOrderStatus(o)}
            </span>
          </div>

          {/* Producto */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5">
            <img
              src={getProductImage(o)}
              alt="Producto"
              className="h-[42px] w-[42px] rounded-lg object-cover bg-white/[0.04] border border-white/[0.08] shrink-0"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = NO_IMAGE;
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-white/90 truncate">
                {getProductName(o)}
              </p>
              <p className="text-[10px] text-white/35 mt-0.5">
                SKU {getProductSku(o)}
              </p>
            </div>
            <span className="text-[10px] font-semibold text-white/55 bg-white/[0.06] px-2.5 py-1 rounded shrink-0">
              ×{getQty(o)}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex border-t border-white/[0.06]">
            <div className="flex-1 px-3.5 py-2 border-r border-white/[0.06]">
              <p className="text-[9px] uppercase tracking-wider text-white/40">
                Total
              </p>
              <p className="text-[12px] font-semibold text-white mt-0.5">
                ${getTotal(o)}
              </p>
            </div>
            <div className="flex-1 px-3.5 py-2 border-r border-white/[0.06]">
              <p className="text-[9px] uppercase tracking-wider text-white/40">
                Envío
              </p>
              <p className="text-[11px] text-white/60 mt-0.5">
                ${getShippingAmount(o)}
              </p>
            </div>
            <div className="flex-1 px-3.5 py-2">
              <p className="text-[9px] uppercase tracking-wider text-white/40">
                Transp.
              </p>
              <p className="text-[11px] text-white/60 mt-0.5 truncate">
                {getTransportadora(o)}
              </p>
            </div>
          </div>

          {/* CTA bar full-width */}
          <button
            type="button"
            onClick={() => onOpenOrder(o)}
            className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 border-t border-white/[0.06] bg-white/[0.02] text-white/40 transition-all group-hover:bg-blue-500/[0.06] group-hover:border-blue-400/[0.12] group-hover:text-blue-300"
          >
            <span className="text-[11px] font-semibold">
              Ver detalle de la orden
            </span>
            <span className="text-[15px] leading-none transition-transform group-hover:translate-x-0.5">
              ›
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
