import React, { useState, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

const fmt = (n, dec = 0) => {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
};

const fmtCurrency = (n, cur = "USD") => {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
  });
};

const roasBadge = (roas) => {
  const r = Number(roas || 0);
  if (r >= 3) return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (r >= 1.5) return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  if (r > 0) return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  return "bg-slate-50 text-slate-400 ring-1 ring-slate-200";
};

const sortIcon = (active, dir) => {
  if (!active) return "bx-sort-alt-2";
  return dir === "desc" ? "bx-sort-down" : "bx-sort-up";
};

/* ── Tooltip con Portal ── */
const Tip = ({ text, children, width = 240 }) => {
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
              className="px-3 py-2 rounded-lg bg-slate-900 text-white text-[11px] leading-relaxed shadow-xl font-normal normal-case tracking-normal break-words"
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

const Th = ({
  children,
  sortKey,
  currentSort,
  sortDir,
  onSort,
  tip,
  className = "",
}) => (
  <th
    className={`cursor-pointer hover:text-indigo-600 transition ${className}`}
    onClick={() => onSort(sortKey)}
  >
    <div className="inline-flex items-center gap-1">
      <span>{children}</span>
      {tip && (
        <Tip text={tip}>
          <i className="bx bx-help-circle text-slate-300 hover:text-slate-500 cursor-help text-[11px]" />
        </Tip>
      )}
      <i
        className={`bx ${sortIcon(currentSort === sortKey, sortDir)} text-sm`}
      />
    </div>
  </th>
);

/* ── Thumbnail clickeable que abre Facebook ── */
const AdThumbnail = ({ ad }) => {
  const fbUrl = ad.post_id ? `https://www.facebook.com/${ad.post_id}` : null;

  if (!ad.thumbnail_url) {
    return (
      <div className="w-14 h-14 rounded-lg bg-slate-100 grid place-items-center shrink-0">
        <i className="bx bx-image text-slate-400 text-xl" />
      </div>
    );
  }

  const inner = (
    <>
      <img
        src={ad.thumbnail_url}
        alt=""
        className="w-full h-full object-cover transition group-hover:scale-105"
      />
      {fbUrl && (
        <>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-7 h-7 rounded-full bg-white/90 grid place-items-center shadow-md opacity-90 group-hover:opacity-100 group-hover:scale-110 transition">
              <i className="bx bx-play text-slate-900 text-base ml-0.5" />
            </div>
          </div>
        </>
      )}
    </>
  );

  if (fbUrl) {
    return (
      <a
        href={fbUrl}
        target="_blank"
        rel="noreferrer"
        className="relative w-14 h-14 rounded-lg overflow-hidden ring-1 ring-slate-200 shrink-0 group block focus:outline-none focus:ring-2 focus:ring-indigo-500"
        title="Ver anuncio en Facebook"
      >
        {inner}
      </a>
    );
  }

  return (
    <div className="relative w-14 h-14 rounded-lg overflow-hidden ring-1 ring-slate-200 shrink-0">
      <img
        src={ad.thumbnail_url}
        alt=""
        className="w-full h-full object-cover"
      />
    </div>
  );
};

/* ── KPI compacto del banner ── */
const BannerKPI = ({ label, value, tone = "slate", primary = false }) => (
  <div className="text-right shrink-0">
    <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
      {label}
    </div>
    <div
      className={`tabular-nums leading-tight ${
        primary ? "text-lg font-extrabold" : "text-sm font-bold"
      } ${tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-600" : "text-slate-800"}`}
    >
      {value}
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════ */

export default function AdsboardAttributionAds({
  data,
  loading,
  error,
  currency = "USD",
  onRetry,
}) {
  const [sortKey, setSortKey] = useState("roas_estimado");
  const [sortDir, setSortDir] = useState("desc");
  const [minRoas, setMinRoas] = useState(0);
  const [onlyWithSales, setOnlyWithSales] = useState(false);
  const [expandedAdId, setExpandedAdId] = useState(null);

  const items = data?.attribution?.items || [];
  const totals = data?.attribution?.totales_rango || {};

  const sortedItems = useMemo(() => {
    let filtered = items.filter(
      (it) => Number(it.roas_estimado || 0) >= minRoas,
    );
    if (onlyWithSales) {
      filtered = filtered.filter((it) => Number(it.ordenes_estimadas || 0) > 0);
    }
    return [...filtered].sort((a, b) => {
      const va = Number(a[sortKey] || 0);
      const vb = Number(b[sortKey] || 0);
      return sortDir === "desc" ? vb - va : va - vb;
    });
  }, [items, sortKey, sortDir, minRoas, onlyWithSales]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const pctAtrib = Number(totals.pct_atribuidas || 0);
  const lowAttribution =
    pctAtrib < 50 && Number(totals.ordenes_dropi_total || 0) > 0;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center">
        <div className="flex justify-center gap-1 mb-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-600"
              style={{ animation: `pulse 1.2s infinite ${i * 0.2}s` }}
            />
          ))}
        </div>
        <p className="text-sm font-semibold text-slate-700">
          Cargando información
        </p>
        <p className="text-xs text-slate-400 mt-1.5">
          Cruzando inversión publicitaria con ventas
        </p>
        <style>{`@keyframes pulse { 0%,100% { opacity:0.2; transform:scale(0.8); } 50% { opacity:1; transform:scale(1.2); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5">
        <div className="flex items-start gap-3">
          <i className="bx bx-error-circle text-rose-500 text-xl" />
          <div>
            <h3 className="text-sm font-bold text-rose-800">
              No se pudo cargar la información
            </h3>
            <p className="text-xs text-rose-600 mt-1">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition"
              >
                <i className="bx bx-refresh" /> Reintentar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!data || !items.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center">
        <i className="bx bx-medal text-3xl text-slate-300 mb-2" />
        <p className="text-sm text-slate-500">
          Sin anuncios con datos para este período.
        </p>
      </div>
    );
  }

  const winnerIds = new Set(
    [...items]
      .filter((a) => Number(a.entregadas_estimadas || 0) > 0)
      .sort(
        (a, b) => Number(b.roas_estimado || 0) - Number(a.roas_estimado || 0),
      )
      .slice(0, 3)
      .map((a) => a.ad_id),
  );

  const isInitial = lowAttribution;
  const accent = isInitial
    ? {
        ring: "ring-amber-200",
        iconBg: "from-amber-400 to-orange-500",
        badge: "bg-amber-100 text-amber-800 ring-amber-200",
        badgeText: "Período inicial",
        pctTone: "amber",
      }
    : {
        ring: "ring-emerald-200",
        iconBg: "from-emerald-400 to-cyan-500",
        badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
        badgeText: "Activo",
        pctTone: "emerald",
      };

  return (
    <div className="space-y-4">
      {/* ─── Banner compacto en una sola fila ─── */}
      <div
        className={`rounded-xl bg-white ring-1 ${accent.ring} px-4 py-3 flex flex-wrap items-center justify-between gap-5`}
      >
        {/* Lado izquierdo */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accent.iconBg} grid place-items-center shrink-0`}
          >
            <i
              className={`bx ${isInitial ? "bx-trending-up" : "bx-check-shield"} text-white text-base`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Atribución por anuncio
              </h3>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ring-1 uppercase tracking-wider ${accent.badge}`}
              >
                {accent.badgeText}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isInitial
                ? "Está funcionalidad se implementó desde el 12 de mayo · Las ventas anteriores no se atribuirán, las nuevas sí"
                : "Cada venta vinculada con el anuncio que la generó"}
            </p>
          </div>
        </div>

        {/* Lado derecho — KPIs en línea */}
        <div className="flex items-center gap-5">
          <BannerKPI
            label="Conectadas"
            value={`${fmt(pctAtrib, 1)}%`}
            tone={accent.pctTone}
            primary
          />
          <div className="h-9 w-px bg-slate-200" />
          <BannerKPI label="Órdenes" value={fmt(totals.ordenes_dropi_total)} />
          <BannerKPI
            label="Revenue"
            value={fmtCurrency(totals.revenue_entregado_atribuido, currency)}
            tone="emerald"
          />
          <BannerKPI
            label="Inversión"
            value={fmtCurrency(totals.gasto_total, currency)}
          />
        </div>
      </div>

      {/* ─── Filtros ─── */}
      <div className="rounded-xl bg-white ring-1 ring-slate-200 px-4 py-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            ROAS mín.
          </span>
          <div className="flex gap-1">
            {[0, 1, 1.5, 2, 3].map((v) => (
              <button
                key={v}
                onClick={() => setMinRoas(v)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  minRoas === v
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {v === 0 ? "Todos" : `≥${v}x`}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyWithSales}
            onChange={(e) => setOnlyWithSales(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-xs font-semibold text-slate-700">
            Solo con ventas conectadas
          </span>
          <Tip text="Oculta anuncios sin ventas identificadas todavía.">
            <i className="bx bx-help-circle text-slate-400 cursor-help text-[11px]" />
          </Tip>
        </label>

        <div className="ml-auto text-[11px] text-slate-400">
          Mostrando {sortedItems.length} de {items.length} anuncios
        </div>
      </div>

      {/* ─── Tabla ─── */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3">#</th>
                <th className="py-3">Anuncio / Producto</th>
                <Th
                  sortKey="spend"
                  currentSort={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  tip="Lo que invertiste en este anuncio."
                  className="py-3 text-right"
                >
                  Gasto
                </Th>
                <Th
                  sortKey="msgs"
                  currentSort={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  tip="Conversaciones de WhatsApp que generó este anuncio."
                  className="py-3 text-right"
                >
                  Mensajes
                </Th>
                <Th
                  sortKey="ordenes_estimadas"
                  currentSort={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  tip="Órdenes Dropi conectadas con este anuncio."
                  className="py-3 text-right"
                >
                  Órdenes
                </Th>
                <Th
                  sortKey="entregadas_estimadas"
                  currentSort={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  tip="Órdenes que el cliente recibió y pagó."
                  className="py-3 text-right"
                >
                  Entreg.
                </Th>
                <Th
                  sortKey="revenue_estimado"
                  currentSort={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  tip="Total facturado por las órdenes entregadas."
                  className="py-3 text-right"
                >
                  Revenue
                </Th>
                <Th
                  sortKey="roas_estimado"
                  currentSort={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  tip="Por cada $1 invertido, cuántos $ regresaron. Más de 3x es excelente."
                  className="py-3 text-right"
                >
                  ROAS
                </Th>
                <Th
                  sortKey="cpa_orden_estimado"
                  currentSort={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  tip="Cuánto te costó cada orden generada."
                  className="py-3 text-right"
                >
                  CPA orden
                </Th>
                <th className="py-3 pr-4 text-center">
                  <Tip text="Ver las órdenes específicas que generó este anuncio.">
                    <span className="inline-flex items-center gap-1">
                      Detalle
                      <i className="bx bx-help-circle text-slate-300 cursor-help text-[11px]" />
                    </span>
                  </Tip>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((ad, idx) => {
                const isWinner = winnerIds.has(ad.ad_id);
                const isExpanded = expandedAdId === ad.ad_id;
                const hasSamples =
                  Array.isArray(ad.sample_orders) &&
                  ad.sample_orders.length > 0;
                const noAttribution = Number(ad.ordenes_estimadas || 0) === 0;

                return (
                  <React.Fragment key={ad.ad_id || idx}>
                    <tr
                      className={`border-b border-slate-50 hover:bg-indigo-50/30 transition ${
                        isWinner ? "bg-emerald-50/30" : ""
                      } ${noAttribution ? "opacity-60" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-400 tabular-nums w-5">
                            {idx + 1}
                          </span>
                          {isWinner && (
                            <Tip text="Top 3 anuncios más rentables con ventas confirmadas.">
                              <span className="px-1.5 py-0.5 rounded-md text-[8px] font-extrabold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white cursor-help">
                                WIN
                              </span>
                            </Tip>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <AdThumbnail ad={ad} />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 max-w-[220px] truncate">
                              {ad.ad_name || "(sin nombre)"}
                            </div>
                            {ad.product_attributed && (
                              <div className="text-[10px] text-indigo-600 font-medium max-w-[220px] truncate">
                                <i className="bx bx-link-alt text-[9px]" />{" "}
                                {ad.product_attributed}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 max-w-[220px] truncate">
                              {ad.campaign_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {fmtCurrency(ad.spend, currency)}
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {fmt(ad.msgs)}
                      </td>
                      <td
                        className={`py-3 text-right tabular-nums font-medium ${
                          noAttribution ? "text-slate-300" : "text-purple-700"
                        }`}
                      >
                        {fmt(ad.ordenes_estimadas)}
                      </td>
                      <td
                        className={`py-3 text-right tabular-nums font-medium ${
                          noAttribution ? "text-slate-300" : "text-emerald-600"
                        }`}
                      >
                        {fmt(ad.entregadas_estimadas)}
                      </td>
                      <td
                        className={`py-3 text-right tabular-nums font-bold ${
                          noAttribution ? "text-slate-300" : "text-emerald-700"
                        }`}
                      >
                        {fmtCurrency(ad.revenue_estimado, currency)}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${roasBadge(ad.roas_estimado)}`}
                        >
                          {fmt(ad.roas_estimado, 2)}x
                        </span>
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {Number(ad.cpa_orden_estimado) > 0
                          ? fmtCurrency(ad.cpa_orden_estimado, currency)
                          : "—"}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          {hasSamples && (
                            <button
                              onClick={() =>
                                setExpandedAdId(isExpanded ? null : ad.ad_id)
                              }
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                              title="Ver órdenes"
                            >
                              <i
                                className={`bx ${isExpanded ? "bx-chevron-up" : "bx-chevron-down"} text-sm`}
                              />
                            </button>
                          )}
                          {ad.post_id && (
                            <a
                              href={`https://www.facebook.com/${ad.post_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 ring-1 ring-blue-200 transition"
                              title="Abrir en Facebook"
                            >
                              <i className="bx bxl-facebook text-sm" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && hasSamples && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={10} className="px-6 py-3">
                          <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2 flex items-center gap-2">
                            <i className="bx bx-list-ul" />
                            Órdenes que generó este anuncio
                            <span className="text-slate-400 font-normal">
                              ({ad.sample_orders.length} muestra, máx 5)
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                            {ad.sample_orders.map((o, i) => (
                              <div
                                key={i}
                                className="rounded-lg bg-white ring-1 ring-slate-200 px-3 py-2"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-mono text-slate-400">
                                    #{o.dropi_order_id}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                      o.status === "entregada"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : o.status === "devolucion"
                                          ? "bg-amber-100 text-amber-700"
                                          : o.status === "cancelada"
                                            ? "bg-rose-100 text-rose-700"
                                            : "bg-blue-100 text-blue-700"
                                    }`}
                                  >
                                    {o.status}
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-slate-800 truncate">
                                  {o.client_name || "—"}
                                </div>
                                <div className="text-sm font-extrabold text-emerald-700">
                                  {fmtCurrency(o.total, currency)}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">
                                  msg → orden:{" "}
                                  <strong>{o.hours_msg_to_order}h</strong>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
