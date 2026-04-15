import React, { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

/**
 * AdsboardTopAdsTable
 */

const fmt = (n, decimals = 0) => {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const fmtCurrency = (n, currency = "USD") => {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });
};

/* ── Tooltip con Portal + detección de bordes del viewport ── */
const Tip = ({ text, children, width = 224, mono = false }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, arrowLeft: "50%" });
  const triggerRef = useRef(null);

  const handleEnter = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const halfW = width / 2;
      let left = rect.left + rect.width / 2;
      let arrowLeft = "50%";

      if (left + halfW > vw - 12) {
        const shift = left + halfW - (vw - 12);
        arrowLeft = `${halfW + shift}px`;
        left = left - shift;
      }
      if (left - halfW < 12) {
        const shift = 12 - (left - halfW);
        arrowLeft = `${halfW - shift}px`;
        left = left + shift;
      }

      setPos({ top: rect.top - 8, left, arrowLeft });
    }
    setShow(true);
  }, [width]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show &&
        createPortal(
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{
              top: pos.top,
              left: pos.left,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div
              className={`px-3 py-2 rounded-lg bg-slate-900 text-white text-[11px] leading-relaxed shadow-lg font-normal normal-case tracking-normal ${mono ? "break-all font-mono" : "break-words"}`}
              style={{ width }}
            >
              {text}
              <span
                className="absolute top-full -mt-px w-2 h-2 rotate-45 bg-slate-900"
                style={{ left: pos.arrowLeft, transform: "translateX(-50%)" }}
              />
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
};

const Th = ({ children, tip, className = "" }) => (
  <th className={className}>
    <div className="inline-flex items-center gap-1">
      <span>{children}</span>
      {tip && (
        <Tip text={tip}>
          <i className="bx bx-help-circle text-slate-300 hover:text-slate-500 cursor-help text-[11px] transition" />
        </Tip>
      )}
    </div>
  </th>
);

export default function AdsboardTopAdsTable({ topAds, currency = "USD" }) {
  if (!topAds.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center">
        <i className="bx bx-trophy text-3xl text-slate-300 mb-2" />
        <p className="text-sm text-slate-500">
          No hay datos de anuncios para este período.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Prueba con un rango de fechas diferente.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <i className="bx bx-trophy text-indigo-600" />
          <span className="text-xs font-semibold text-slate-700">
            Top Ads por rendimiento ({topAds.length})
          </span>
          <span className="text-[10px] text-slate-400 ml-auto">
            Ordenados por mayor gasto
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <Th
                className="px-4 pb-3 pt-4"
                tip="Nombre del anuncio individual dentro de la campaña."
              >
                Ad
              </Th>
              <Th
                className="pb-3 pt-4"
                tip="Campaña a la que pertenece este anuncio."
              >
                Campaña
              </Th>
              <Th
                className="pb-3 pt-4 text-right"
                tip="Total invertido en este anuncio durante el período."
              >
                Gasto
              </Th>
              <Th
                className="pb-3 pt-4 text-right"
                tip="Valor de ventas atribuidas a este anuncio vía pixel o API de conversiones."
              >
                Revenue
              </Th>
              <Th
                className="pb-3 pt-4 text-right"
                tip="Return On Ad Spend. ROAS 3x = $3 generados por cada $1 invertido."
              >
                ROAS
              </Th>
              <Th
                className="pb-3 pt-4 text-right"
                tip="Ventas completadas generadas por este anuncio."
              >
                Compras
              </Th>
              <Th
                className="pb-3 pt-4 text-right"
                tip="Costo Por Adquisición — cuánto costó cada venta. Gasto ÷ Compras."
              >
                CPA
              </Th>
              <Th
                className="pb-3 pt-4 text-right"
                tip="Click-Through Rate — porcentaje de personas que vieron este anuncio y dieron clic."
              >
                CTR
              </Th>
              <Th
                className="pb-3 pt-4 text-right"
                tip="Total de clics recibidos por este anuncio."
              >
                Clicks
              </Th>
              <Th
                className="pb-3 pt-4 text-right"
                tip="Conversaciones de WhatsApp iniciadas a partir de este anuncio."
              >
                Msgs WA
              </Th>
              <Th
                className="pb-3 pt-4 text-right"
                tip="Costo por cada conversación de WhatsApp iniciada desde este anuncio."
              >
                CPA Msg
              </Th>
              <Th
                className="pb-3 pt-4 text-right"
                tip="Leads generados por este anuncio vía formularios."
              >
                Leads
              </Th>
              <Th
                className="pb-3 pt-4 text-right"
                tip="Costo por cada lead generado con este anuncio."
              >
                CPA Lead
              </Th>
              <Th
                className="pb-3 pt-4 pr-4 text-center"
                tip="Ver la publicación original en Facebook."
              >
                Post
              </Th>
            </tr>
          </thead>
          <tbody>
            {topAds.map((ad, i) => (
              <tr
                key={ad.ad_id || i}
                className="border-b border-slate-50 hover:bg-slate-50/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {ad.thumbnail_url ? (
                      <img
                        src={ad.thumbnail_url}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-100 grid place-items-center shrink-0">
                        <i className="bx bx-image text-slate-400" />
                      </div>
                    )}
                    <span className="font-medium text-slate-800 max-w-[150px] truncate">
                      {ad.ad_name}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-slate-500 max-w-[130px] truncate">
                  {ad.campaign_name}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {fmtCurrency(ad.spend, currency)}
                </td>
                <td className="py-3 text-right tabular-nums text-emerald-700 font-medium">
                  {fmtCurrency(ad.purchase_value, currency)}
                </td>
                <td className="py-3 text-right tabular-nums font-medium">
                  <span
                    className={
                      ad.roas >= 2
                        ? "text-emerald-700"
                        : ad.roas > 0
                          ? "text-amber-700"
                          : "text-slate-400"
                    }
                  >
                    {fmt(ad.roas, 2)}x
                  </span>
                </td>
                <td className="py-3 text-right tabular-nums">
                  {fmt(ad.purchases)}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {fmtCurrency(ad.cpa_purchase, currency)}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {fmt(ad.ctr, 2)}%
                </td>
                <td className="py-3 text-right tabular-nums">
                  {fmt(ad.clicks)}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {fmt(ad.messaging_conversations)}
                </td>
                <td className="py-3 text-right tabular-nums text-emerald-600">
                  {Number(ad.cpa_messaging) > 0
                    ? fmtCurrency(ad.cpa_messaging, currency)
                    : "—"}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {fmt(ad.leads)}
                </td>
                <td className="py-3 text-right tabular-nums text-amber-600">
                  {Number(ad.cpa_lead) > 0
                    ? fmtCurrency(ad.cpa_lead, currency)
                    : "—"}
                </td>
                <td className="py-3 pr-4 text-center">
                  {ad.post_id ? (
                    <Tip text={ad.post_id} width={280} mono>
                      <a
                        href={`https://www.facebook.com/${ad.post_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 ring-1 ring-blue-200 transition"
                      >
                        <i className="bx bxl-facebook text-sm" />
                      </a>
                    </Tip>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
