import React, { useState, useMemo, useCallback, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════
   DropiDevolucionPanel — v3
   ─────────────────────────────────────────────────────────
   Panel exclusivo para proveedores.
   Paginación frontend con "Cargar más" para evitar DOM bloat.
   Summary usa valores del backend (SQL), no cuenta del array.
   ═══════════════════════════════════════════════════════════ */

const ALERT_CONFIG = {
  critical: {
    label: "Sin escaneo",
    badge: "bg-red-100 text-red-700 border-red-200",
    icon: (
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  unverifiable: {
    label: "Sin verificar",
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    icon: (
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  ok: {
    label: "Escaneada",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: (
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  pending: {
    label: "En tránsito",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    icon: (
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
};

const FILTER_TABS = [
  { key: "all", label: "Todas" },
  { key: "critical", label: "Sin escaneo" },
  { key: "unverifiable", label: "Sin verificar" },
  { key: "ok", label: "Escaneadas" },
  { key: "pending", label: "En tránsito" },
];

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, "0");
  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  return `${day} ${months[d.getMonth()]} · ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function movementClass(nom) {
  const upper = String(nom || "").toUpperCase();
  if (upper.includes("DEV CONFIRMADA POR BODEGA") || upper.includes("ENTREGAD"))
    return "success";
  if (
    upper.includes("DEVOLUCION") ||
    upper.includes("DEVOLUCIÓN") ||
    upper.includes("DEVUELTO")
  )
    return "alert";
  if (upper.includes("NOVEDAD") && !upper.includes("SOLUCIONADA"))
    return "warning";
  return "normal";
}

function calcDaysInDevolution(order) {
  const now = new Date();
  const movements = order.movements || [];
  const devMovement = movements.find((m) => {
    const u = String(m.nom_mov || "").toUpperCase();
    return u.includes("DEVOLU") || u.includes("DEVUELTO");
  });
  const refDate = devMovement
    ? new Date(devMovement.created_at)
    : new Date(order.created_at);
  return Math.max(0, Math.floor((now - refDate) / (1000 * 60 * 60 * 24)));
}

function getTrackingUrl(shippingCompany, guide) {
  if (!guide) return null;
  const comp = String(shippingCompany || "").toUpperCase();
  const g = String(guide).trim();
  if (
    comp.includes("LAAR") ||
    g.startsWith("LC") ||
    g.startsWith("IMP") ||
    g.startsWith("MKP")
  )
    return `https://fenixoper.laarcourier.com/Tracking/Guiacompleta.aspx?guia=${encodeURIComponent(g)}`;
  if (comp.includes("GINTRACOM") || g.startsWith("D0") || g.startsWith("I0"))
    return `https://ec.gintracom.site/web/site/tracking?guia=${encodeURIComponent(g)}`;
  if (comp.includes("VELOCES") || g.startsWith("V"))
    return `https://tracking.veloces.app/tracking-client/${encodeURIComponent(g)}`;
  if (comp.includes("URBANO") || g.startsWith("WYB"))
    return `https://app.urbano.com.ec/plugin/etracking/etracking/?guia=${encodeURIComponent(g)}`;
  if (comp.includes("SERVIENTREGA"))
    return `https://www.servientrega.com.ec/Tracking/?guia=${encodeURIComponent(g)}&tipo=GUIA`;
  return null;
}

function hasTrackingAvailable(sc) {
  const c = String(sc || "").toUpperCase();
  return !(c.includes("SPD") || c.includes("SPEED"));
}

function downloadCSV(orders) {
  const headers = [
    "Orden",
    "Cliente",
    "Teléfono",
    "Ciudad",
    "Provincia",
    "Transportadora",
    "Guía",
    "Total",
    "Fecha creación",
    "Días en devolución",
    "Estado escaneo",
    "Productos",
    "Novedad/Motivo",
  ];
  const rows = orders.map((o) => {
    const alertLabels = {
      ok: "Escaneada OK",
      critical: "SIN ESCANEO BODEGA",
      unverifiable: "SIN VERIFICAR",
      pending: "En tránsito",
    };
    const productStr = (o.products || [])
      .map((p) => `${p.quantity}x ${p.name}`)
      .join(" | ");
    const novedadMov = (o.movements || []).find((m) => {
      const u = String(m.nom_mov || "").toUpperCase();
      return (
        u.includes("DESTINATARIO") ||
        u.includes("TITULAR") ||
        u.includes("MERCANCIA") ||
        u.includes("DESCONFIANZA")
      );
    });
    return [
      o.id,
      `${o.name} ${o.surname}`.trim(),
      o.phone,
      o.city,
      o.state,
      o.shipping_company,
      o.shipping_guide,
      o.total_order?.toFixed(2),
      o.created_at,
      calcDaysInDevolution(o),
      alertLabels[o.alertLevel] || o.alertLevel,
      productStr,
      novedadMov?.nom_mov || novedadMov?.novedad || "",
    ];
  });
  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte_devoluciones_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const CopyGuideButton = ({ guide }) => {
  const [copied, setCopied] = useState(false);
  if (!guide) return null;
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(guide).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors ${copied ? "text-emerald-600 bg-emerald-50 border border-emerald-200" : "text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-100"}`}
      title={`Copiar guía ${guide}`}
    >
      {copied ? (
        <>
          <svg
            className="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copiado
        </>
      ) : (
        <>
          <svg
            className="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copiar
        </>
      )}
    </button>
  );
};

const TrackingButton = ({ shippingCompany, guide }) => {
  const url = getTrackingUrl(shippingCompany, guide);
  if (!guide) return null;
  if (!url || !hasTrackingAvailable(shippingCompany))
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-slate-400 bg-slate-100 cursor-not-allowed">
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
        N/D
      </span>
    );
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
    >
      <svg
        className="w-3 h-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
      Tracking
    </a>
  );
};

const DaysBadge = ({ days }) => {
  let color = "text-slate-500 bg-slate-100";
  if (days >= 7) color = "text-red-700 bg-red-100";
  else if (days >= 4) color = "text-amber-700 bg-amber-100";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}
    >
      {days}d
    </span>
  );
};

const TimelineRow = ({ order }) => {
  const movements = order.movements || [];
  const trackingUrl = getTrackingUrl(
    order.shipping_company,
    order.shipping_guide,
  );
  const timelineSource = order.timelineSource || "none";
  return (
    <tr>
      <td colSpan={8} className="px-0 py-0">
        <div className="bg-slate-50 border-t border-b border-slate-200 px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Detalle de la orden
              </h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex gap-2">
                  <span className="text-slate-400 w-28 shrink-0">Cliente:</span>
                  <span className="text-slate-700 font-medium">
                    {order.name} {order.surname}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-400 w-28 shrink-0">
                    Teléfono:
                  </span>
                  <span className="text-slate-700">{order.phone || "—"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-400 w-28 shrink-0">Ciudad:</span>
                  <span className="text-slate-700">
                    {order.city}
                    {order.state ? ` (${order.state})` : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-400 w-28 shrink-0">
                    Transportadora:
                  </span>
                  <span className="text-slate-700">
                    {order.shipping_company || "—"}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-slate-400 w-28 shrink-0">Guía:</span>
                  <span className="text-slate-700 font-mono text-xs">
                    {order.shipping_guide || "Sin guía"}
                  </span>
                  <CopyGuideButton guide={order.shipping_guide} />
                  {trackingUrl && (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors ml-1"
                    >
                      <svg
                        className="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      Ver tracking
                    </a>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-slate-400 w-28 shrink-0">
                    Días en devolución:
                  </span>
                  <DaysBadge days={order._days} />
                </div>
                {order.products?.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-28 shrink-0">
                      Productos:
                    </span>
                    <div className="text-slate-700">
                      {order.products.map((p, i) => (
                        <div key={i} className="text-xs">
                          {p.quantity}x {p.name}
                          {p.sale_price > 0 && (
                            <span className="text-slate-400 ml-1">
                              (${p.sale_price})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4">
                {order.alertLevel === "ok" ? (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
                    <strong>Proceso completo.</strong> Tiene "DEV CONFIRMADA POR
                    BODEGA". Producto escaneado correctamente.
                  </div>
                ) : order.alertLevel === "critical" ? (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                    <strong>ALERTA.</strong> Pasó a "DEVOLUCIÓN AL REMITENTE"
                    sin escaneo de bodega. Candidata a reclamo de indemnización.
                  </div>
                ) : order.alertLevel === "unverifiable" ? (
                  <div className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-2 text-xs text-violet-700">
                    <strong>Sin verificar.</strong> La devolución fue procesada
                    sin pasar por el sistema de escaneo de Dropi.
                    {timelineSource === "dropi_history" &&
                      " Se muestra el historial interno de Dropi como referencia."}
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                    <strong>En proceso.</strong> La devolución aún no ha llegado
                    a bodega. Pendiente de seguimiento.
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {timelineSource === "carrier"
                    ? `Movimientos carrier (${movements.length})`
                    : timelineSource === "dropi_history"
                      ? `Historial Dropi (${movements.length})`
                      : `Historial (${movements.length})`}
                </h4>
                {timelineSource === "dropi_history" && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-violet-600 bg-violet-50 border border-violet-200">
                    Historial Dropi
                  </span>
                )}
              </div>
              {movements.length === 0 ? (
                <div className="text-xs text-slate-400 italic">
                  <p>Sin movimientos registrados</p>
                  <p className="mt-1 text-[10px]">
                    Se sincronizarán en la próxima consulta.
                  </p>
                </div>
              ) : (
                <div className="relative ml-3 pl-5 border-l-2 border-slate-200 space-y-0 max-h-[350px] overflow-y-auto">
                  {movements.map((m, i) => {
                    const cls = movementClass(m.nom_mov);
                    const dotColor =
                      cls === "success"
                        ? "bg-emerald-500"
                        : cls === "alert"
                          ? "bg-red-400"
                          : cls === "warning"
                            ? "bg-amber-400"
                            : "bg-slate-300";
                    const textColor =
                      cls === "success"
                        ? "text-emerald-700 font-semibold"
                        : cls === "alert"
                          ? "text-red-600 font-semibold"
                          : cls === "warning"
                            ? "text-amber-600 font-medium"
                            : "text-slate-600";
                    return (
                      <div key={i} className="relative pb-3 last:pb-0">
                        <div
                          className={`absolute -left-[25px] top-[5px] w-2.5 h-2.5 rounded-full ${dotColor} ring-2 ring-white`}
                        />
                        <p className={`text-xs leading-tight ${textColor}`}>
                          {m.nom_mov}
                        </p>
                        {m.novedad && (
                          <p className="text-[10px] text-amber-500 mt-0.5">
                            Novedad: {m.novedad}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {fmtDate(m.created_at)}
                        </p>
                      </div>
                    );
                  })}
                  {order.alertLevel === "critical" && (
                    <div className="relative pb-0">
                      <div className="absolute -left-[25px] top-[5px] w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                      <div className="bg-red-50 border border-red-200 rounded px-2 py-1.5">
                        <p className="text-xs text-red-600 font-bold">
                          ⚠ Falta: "DEV CONFIRMADA POR BODEGA"
                        </p>
                        <p className="text-[10px] text-red-400">
                          No hay registro de escaneo en bodega
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};

/* ═══════════════════ Main ═══════════════════ */
const DropiDevolucionPanel = ({ devolucionAnalysis }) => {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    setVisibleCount(50);
  }, [filter, searchText]);

  if (!devolucionAnalysis || !devolucionAnalysis.isSupplierView) return null;
  const { summary, orders } = devolucionAnalysis;
  const PRIORITY = { critical: 4, unverifiable: 3, pending: 2, ok: 1 };

  const filteredOrders = useMemo(() => {
    let result = (orders || []).map((o) => ({
      ...o,
      _days: calcDaysInDevolution(o),
    }));
    if (filter !== "all")
      result = result.filter((o) => o.alertLevel === filter);
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(
        (o) =>
          String(o.id).includes(q) ||
          (o.name || "").toLowerCase().includes(q) ||
          (o.surname || "").toLowerCase().includes(q) ||
          (o.phone || "").includes(q) ||
          (o.shipping_guide || "").toLowerCase().includes(q) ||
          (o.city || "").toLowerCase().includes(q),
      );
    }
    result.sort((a, b) => {
      const pA = PRIORITY[a.alertLevel] || 0;
      const pB = PRIORITY[b.alertLevel] || 0;
      if (pB !== pA) return pB - pA;
      return b._days - a._days;
    });
    return result;
  }, [orders, filter, searchText]);

  const visibleOrders = filteredOrders.slice(0, visibleCount);
  const hasMore = filteredOrders.length > visibleCount;

  const toggleExpand = (id) =>
    setExpandedId((prev) => (prev === id ? null : id));
  const handleDownloadCSV = useCallback(
    () => downloadCSV(filteredOrders),
    [filteredOrders],
  );
  const alertCount = (summary.withoutScan || 0) + (summary.unverifiable || 0);

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white overflow-hidden mb-6">
      <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-orange-400 px-5 py-4">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                Control de Devoluciones
              </h2>
              <p className="text-[11px] text-white/70">
                Verificación de escaneo en bodega · Vista proveedor
              </p>
            </div>
          </div>
          {alertCount > 0 && (
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-1.5 animate-pulse">
              <svg
                className="w-3.5 h-3.5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-[11px] text-white font-bold">
                {alertCount} alerta{alertCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Total devoluciones
            </p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">
              {summary.totalDevolutions}
            </p>
          </div>
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">
              Sin escaneo bodega
            </p>
            <p className="text-2xl font-extrabold text-red-600 mt-1">
              {summary.withoutScan}
            </p>
          </div>
          <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
              Sin verificar
            </p>
            <p className="text-2xl font-extrabold text-violet-600 mt-1">
              {summary.unverifiable || 0}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
              Escaneadas OK
            </p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              {summary.withScan}
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
              En tránsito
            </p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">
              {summary.pendingReturn}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5 flex-wrap">
            {FILTER_TABS.map((tab) => {
              const SUMMARY_MAP = {
                all: summary.totalDevolutions,
                critical: summary.withoutScan,
                unverifiable: summary.unverifiable || 0,
                ok: summary.withScan,
                pending: summary.pendingReturn,
              };
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filter === tab.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-[10px] text-slate-400">
                    {SUMMARY_MAP[tab.key] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Buscar ID, nombre, guía..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-all"
              />
            </div>
            <button
              onClick={handleDownloadCSV}
              disabled={filteredOrders.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="Descargar CSV"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              CSV
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <svg
              className="w-10 h-10 mx-auto mb-2 opacity-40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="text-sm font-medium">
              No se encontraron órdenes con este filtro
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[480px] rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-8"></th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Orden
                  </th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                    Guía
                  </th>
                  <th className="text-right px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Días
                  </th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Escaneo
                  </th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                    Tracking
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => {
                  const alertCfg =
                    ALERT_CONFIG[order.alertLevel] || ALERT_CONFIG.pending;
                  const isExpanded = expandedId === order.id;
                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        onClick={() => toggleExpand(order.id)}
                        className={`border-b border-slate-100 cursor-pointer transition-colors ${isExpanded ? "bg-slate-50" : order.alertLevel === "critical" ? "hover:bg-red-50/50" : order.alertLevel === "unverifiable" ? "hover:bg-violet-50/50" : "hover:bg-slate-50/70"}`}
                      >
                        <td className="px-3 py-2.5 text-slate-400">
                          <svg
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-xs font-bold text-slate-700">
                            #{order.id}
                          </span>
                          {order.products?.[0]?.name && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                              {order.products[0].name}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="text-xs font-medium text-slate-700 truncate max-w-[120px]">
                            {order.name} {order.surname}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {order.city}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {order.shipping_company || "—"}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {order.shipping_guide || "Sin guía"}
                            </span>
                            <CopyGuideButton guide={order.shipping_guide} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="text-xs font-bold text-slate-700">
                            ${order.total_order?.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <DaysBadge days={order._days} />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${alertCfg.badge}`}
                          >
                            {alertCfg.icon}
                            {alertCfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center hidden md:table-cell">
                          <TrackingButton
                            shippingCompany={order.shipping_company}
                            guide={order.shipping_guide}
                          />
                        </td>
                      </tr>
                      {isExpanded && <TimelineRow order={order} />}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center py-3">
            <button
              onClick={() => setVisibleCount((prev) => prev + 50)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              Cargar más ({filteredOrders.length - visibleCount} restantes)
            </button>
          </div>
        )}

        {filteredOrders.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
            <span>
              Mostrando {visibleOrders.length} de {summary.totalDevolutions}{" "}
              devoluciones
              {hasMore &&
                ` (${filteredOrders.length - visibleCount} más disponibles)`}
            </span>
            {alertCount > 0 && (
              <span className="text-red-400 font-semibold">
                {summary.withoutScan > 0 &&
                  `${summary.withoutScan} sin escaneo`}
                {summary.withoutScan > 0 &&
                  (summary.unverifiable || 0) > 0 &&
                  " · "}
                {(summary.unverifiable || 0) > 0 &&
                  `${summary.unverifiable} sin verificar`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DropiDevolucionPanel;
