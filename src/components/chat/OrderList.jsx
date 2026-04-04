import React from "react";
import axios from "axios";
import { useEffect, useState, useRef } from "react";

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
  hasGuide,
  getGuideUrl,
  NO_IMAGE,
} from "../../utils/orderHelper";

export default function OrderList({ orders, onOpenOrder }) {
  if (!orders?.length) return null;
  const [alerts, setAlerts] = useState({});
  const cacheRef = useRef({});

  useEffect(() => {
    if (!orders?.length) return;

    //agrupar teléfonos únicos
    const uniquePhones = [
      ...new Set(
        orders.map((o) => o?.phone?.replace(/\D/g, "")).filter(Boolean),
      ),
    ];

    uniquePhones.forEach((phone) => {
      //  si ya está en cache → NO llamar
      if (cacheRef.current[phone]) return;

      axios
        .get(`https://api-v2.dropi.ec/orders/customers/fingerprint`, {
          params: {
            phone,
            userid: 1,
          },
        })
        .then((res) => {
          const data = res?.data?.data;
          if (!data) return;

          const rate = data.confiability || 0;

          let level = null;
          if (rate < 0.5) level = "danger";
          else if (rate < 0.8) level = "warning";

          // 🔥 guardar en cache
          cacheRef.current[phone] = level;

          // 🔥 aplicar a TODAS las órdenes con ese phone
          setAlerts((prev) => {
            const updated = { ...prev };

            orders.forEach((o) => {
              if (o?.phone?.replace(/\D/g, "") === phone && level) {
                updated[o.id] = level;
              }
            });

            return updated;
          });
        })
        .catch(() => {});
    });
  }, [orders]);

  return (
    <div className="space-y-2">
      {orders.map((o, idx) => (
        <div
          key={String(showOrderId(o)) + "_" + idx}
          className="group rounded-[10px] bg-[#0f1629] border border-white/[0.08] overflow-hidden transition-all hover:border-blue-400/25"
        >
          {/* Header: ID + Guía + Badge */}
          <div className="flex items-start justify-between gap-2 px-3.5 pt-3 pb-0">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-white tracking-tight">
                #{showOrderId(o)}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5">
                {fmtDate(showOrderDate(o))} · {getCityState(o)}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Icono descarga guía */}
              {hasGuide(o) && (
                <a
                  href={getGuideUrl(o)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/15 text-blue-300 transition-colors"
                  title="Descargar guía PDF"
                >
                  <i className="bx bx-download text-sm" />
                </a>
              )}
              <span
                className={`text-[9px] px-2 py-1 rounded font-bold tracking-wide uppercase ${statusStyle(
                  showOrderStatus(o),
                )}`}
              >
                {showOrderStatus(o)}
              </span>
              {alerts[o.id] && (
                <span
                  className={`ml-1 ${
                    alerts[o.id] === "danger"
                      ? "text-rose-400"
                      : "text-amber-400"
                  }`}
                  title="Cliente con historial riesgoso"
                >
                  <i className="bx bx-bell text-sm" />
                </span>
              )}
            </div>
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
