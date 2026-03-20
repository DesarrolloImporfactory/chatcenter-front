// ─────────────────────────────────────────────
// OrderList.jsx  –  lista de órdenes del cliente
// ─────────────────────────────────────────────
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
    <div className="space-y-3">
      {orders.map((o, idx) => (
        <div
          key={String(showOrderId(o)) + "_" + idx}
          className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
        >
          {/* Header: ID + Status + Fecha + Abrir */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                Orden #{showOrderId(o)}
              </p>
              <p className="text-xs text-white/60 truncate">
                {fmtDate(showOrderDate(o))} • {getCityState(o)}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[11px] px-2 py-1 rounded-full border ${statusStyle(
                  showOrderStatus(o),
                )}`}
              >
                {showOrderStatus(o)}
              </span>

              <button
                type="button"
                onClick={() => onOpenOrder(o)}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs flex items-center gap-2"
                title="Abrir orden"
              >
                <i className="bx bx-folder-open" />
                Abrir
              </button>
            </div>
          </div>

          {/* Mini resumen */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Imagen + Producto */}
            <div className="flex items-center gap-3 bg-black/20 rounded-lg p-3 border border-white/10 sm:col-span-2">
              <img
                src={getProductImage(o)}
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
                  {getQty(o)} x {getProductName(o)}
                </p>
                <p className="text-xs text-white/60 truncate">
                  SKU: {getProductSku(o)}
                </p>
              </div>
            </div>

            {/* Totales */}
            <div className="bg-black/20 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-white/60">Total</p>
              <p className="text-sm font-semibold text-white">${getTotal(o)}</p>
              <p className="text-xs text-white/60 mt-1">
                Envío: ${getShippingAmount(o)}
              </p>
            </div>

            {/* Transportadora + Dirección */}
            <div className="bg-black/20 rounded-lg p-3 border border-white/10 sm:col-span-3">
              <p className="text-xs text-white/60">Transportadora</p>
              <p className="text-sm font-semibold truncate">
                {getTransportadora(o)}
              </p>
              <p className="text-xs text-white/60 truncate mt-1">
                Dirección: {o?.dir || "—"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
