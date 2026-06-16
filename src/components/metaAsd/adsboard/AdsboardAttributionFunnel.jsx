import React, { useState, useRef, useCallback } from "react";
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

const fmtCompact = (n) => {
  if (n == null || isNaN(n)) return "—";
  const num = Number(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return fmt(n);
};

const fmtPct = (n) => `${fmt(n, 2)}%`;

const Tip = ({ text, children, width = 260 }) => {
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

const TipIcon = () => (
  <i className="bx bx-help-circle text-slate-300 hover:text-slate-500 cursor-help text-[12px] transition" />
);

const HeroStat = ({ icon, label, value, sub, accentColor, hint, tooltip }) => (
  <div className="relative rounded-xl bg-white ring-1 ring-slate-200 px-4 py-4 min-h-[100px] flex flex-col justify-center hover:shadow-sm transition">
    <div
      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
      style={{ background: accentColor }}
    />
    <div className="pl-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
        <div
          className="w-6 h-6 rounded-md grid place-items-center"
          style={{ background: `${accentColor}12` }}
        >
          <i className={`bx ${icon} text-sm`} style={{ color: accentColor }} />
        </div>
        <span className="font-medium">{label}</span>
        {tooltip && (
          <Tip text={tooltip}>
            <TipIcon />
          </Tip>
        )}
      </div>
      <div className="text-xl font-extrabold text-slate-900 tracking-tight">
        {value}
      </div>
      {sub && (
        <div
          className="text-[10px] mt-0.5 font-medium"
          style={{ color: accentColor }}
        >
          {sub}
        </div>
      )}
      {hint && <div className="text-[10px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  </div>
);

const FunnelRow = ({
  label,
  sub,
  value,
  pctOfTop,
  conversionFromPrev,
  color,
  tooltip,
}) => (
  <div className="flex items-center gap-3 py-2.5">
    <div className="w-48 shrink-0">
      <div className="text-xs font-semibold text-slate-700 inline-flex items-center gap-1">
        {label}
        {tooltip && (
          <Tip text={tooltip}>
            <TipIcon />
          </Tip>
        )}
      </div>
      <div className="text-[10px] text-slate-400">{sub}</div>
    </div>
    <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden relative">
      <div
        className="h-full rounded-md transition-all duration-700 flex items-center px-2"
        style={{
          width: `${Math.max(2, Math.min(100, pctOfTop))}%`,
          background: color,
        }}
      >
        <span className="text-[10px] font-bold text-white whitespace-nowrap">
          {pctOfTop.toFixed(1)}% del top
        </span>
      </div>
    </div>
    <div className="w-24 text-right">
      <div className="text-sm font-extrabold text-slate-900 tabular-nums">
        {fmtCompact(value)}
      </div>
      {conversionFromPrev != null && (
        <div className="text-[10px] text-slate-500">
          {conversionFromPrev.toFixed(1)}% conv.
        </div>
      )}
    </div>
  </div>
);

const StatusCard = ({ icon, label, value, total, color, tooltip }) => {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="rounded-xl bg-white ring-1 ring-slate-200 px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-7 h-7 rounded-md grid place-items-center"
          style={{ background: `${color}15` }}
        >
          <i className={`bx ${icon} text-sm`} style={{ color }} />
        </div>
        <span className="text-[11px] font-medium text-slate-500 inline-flex items-center gap-1">
          {label}
          {tooltip && (
            <Tip text={tooltip}>
              <TipIcon />
            </Tip>
          )}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-extrabold text-slate-900">
          {fmt(value)}
        </span>
        <span className="text-[10px] text-slate-400 font-medium">
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
};

export default function AdsboardAttributionFunnel({
  data,
  loading,
  error,
  currency = "USD",
  onRetry,
}) {
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
          Cruzando Meta Ads + Dropi...
        </p>
        <p className="text-xs text-slate-400 mt-1.5">
          Atribuyendo cada orden a su anuncio original
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
              No se pudo cargar el cruce con Dropi
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

  if (!data) return null;

  const e = data.funnel?.embudo || {};
  const m = data.funnel?.dinero || {};
  const t = data.funnel?.tasas_pct || {};
  const cacheInfo = data.cache || {};

  // Utilidad: si el back ya manda utilidad_entregada usa eso, sino fallback a revenue_entregado
  const utilidad = Number(m.utilidad_entregada ?? 0);
  const ticketUtilidad = Number(
    m.ticket_promedio_utilidad ??
      (e.entregadas > 0 ? utilidad / e.entregadas : 0),
  );
  const gastoAds = Number(m.gasto_ads || 0);
  const roi = Number(m.roi_real ?? (gastoAds > 0 ? utilidad / gastoAds : 0));
  const gananciaNeta = utilidad - gastoAds;

  const totalEstados =
    (e.entregadas || 0) +
    (e.en_camino || 0) +
    (e.devueltas || 0) +
    (e.canceladas || 0);
  const topFunnel = e.impresiones || 1;

  const roiColor =
    roi >= 2
      ? "#059669"
      : roi >= 1.5
        ? "#2563eb"
        : roi >= 1
          ? "#f59e0b"
          : "#ef4444";
  const roiLabel =
    roi >= 2
      ? "Excelente"
      : roi >= 1.5
        ? "Muy bueno"
        : roi >= 1
          ? "Punto de equilibrio"
          : "Pérdida";

  return (
    <div className="space-y-6">
      {/* ─── KPIs principales ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <HeroStat
          icon="bx-dollar-circle"
          label="Gasto Meta Ads"
          value={fmtCurrency(gastoAds, currency)}
          accentColor="#ef4444"
          hint={`${fmt(e.clicks)} clics · CPM ${fmtCurrency((gastoAds * 1000) / Math.max(e.impresiones, 1), currency)}`}
          tooltip="Total invertido en anuncios de Meta (Facebook + Instagram) durante el período seleccionado."
        />
        <HeroStat
          icon="bx-package"
          label="Órdenes Dropi"
          value={fmt(e.ordenes_dropi)}
          accentColor="#7c3aed"
          sub={`${fmt(e.entregadas)} entregadas`}
          hint={`CPA orden: ${fmtCurrency(m.cpa_orden, currency)}`}
          tooltip="Órdenes creadas en Dropi durante el período. Incluye todos los estados: entregadas, en camino, devueltas y canceladas."
        />
        <HeroStat
          icon="bx-wallet"
          label="Utilidad entregada"
          value={fmtCurrency(utilidad, currency)}
          accentColor="#059669"
          sub={`Promedio: ${fmtCurrency(ticketUtilidad, currency)} por entrega`}
          hint={`Facturación bruta: ${fmtCurrency(m.revenue_entregado, currency)}`}
          tooltip="Lo que REALMENTE te queda de las órdenes entregadas (ya descontado costo del producto y flete COD por Dropi). Es tu ganancia antes de pagar publicidad."
        />
        <HeroStat
          icon="bx-target-lock"
          label="ROI REAL"
          value={`${fmt(roi, 2)}x`}
          accentColor={roiColor}
          sub={roiLabel}
          hint="Utilidad entregada ÷ Gasto ads"
          tooltip="Por cada $1 invertido en ads, cuántos $ de utilidad neta generaste. ROI 2x = duplicaste tu inversión. Es la métrica que IMPORTA, no el ROAS de Meta (que cuenta facturación bruta sin descontar costos)."
        />
        <HeroStat
          icon="bxl-whatsapp"
          label="Mensajes WA"
          value={fmtCompact(e.msgs_wa)}
          accentColor="#25D366"
          sub={`CPA msg: ${fmtCurrency(m.cpa_mensaje, currency)}`}
          hint={`${fmtPct(t.msg_to_orden)} → orden`}
          tooltip="Conversaciones iniciadas por click-to-WhatsApp en los anuncios. Cada uno es un cliente potencial que entró a tu chat."
        />
      </div>

      {/* ─── Funnel vertical ─── */}
      <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-2">
          <i className="bx bx-filter-alt text-indigo-600" />
          <span className="text-sm font-bold text-slate-800">
            Embudo completo: ad → venta entregada
          </span>
          <Tip
            width={300}
            text="Visualiza cómo se reduce tu audiencia paso a paso. Cada barra muestra el % respecto a las impresiones totales. El '% conv.' a la derecha es la tasa desde el paso anterior — ahí está tu cuello de botella."
          >
            <TipIcon />
          </Tip>
        </div>
        <p className="text-[11px] text-slate-500 mb-4">
          Cada etapa muestra cuántos llegaron y la tasa de conversión desde la
          etapa anterior.
        </p>

        <FunnelRow
          label="Impresiones"
          sub="anuncios mostrados en feeds"
          value={e.impresiones}
          pctOfTop={100}
          color="#6366f1"
          tooltip="Cuántas veces se mostraron tus anuncios en pantalla. Una persona puede ver el mismo ad varias veces — cada visualización cuenta como una impresión."
        />
        <FunnelRow
          label="Clicks"
          sub="personas que hicieron clic"
          value={e.clicks}
          pctOfTop={(e.clicks / topFunnel) * 100}
          conversionFromPrev={t.ctr}
          color="#3b82f6"
          tooltip="Clicks totales en tus anuncios. CTR saludable entre 1-3% (más de 3% es muy bueno; menos de 1% indica que el creativo o público no engancha)."
        />
        <FunnelRow
          label="Mensajes WhatsApp"
          sub="conversaciones iniciadas"
          value={e.msgs_wa}
          pctOfTop={(e.msgs_wa / topFunnel) * 100}
          conversionFromPrev={t.click_to_msg}
          color="#06b6d4"
          tooltip="Personas que hicieron click y SÍ enviaron el mensaje a WhatsApp. Saludable: >30%. Si está bajo, el copy del template o el flujo asusta al cliente."
        />
        <FunnelRow
          label="Órdenes Dropi"
          sub="venta confirmada en sistema"
          value={e.ordenes_dropi}
          pctOfTop={(e.ordenes_dropi / topFunnel) * 100}
          conversionFromPrev={t.msg_to_orden}
          color="#7c3aed"
          tooltip="Órdenes generadas en Dropi a partir de mensajes WhatsApp. Saludable: >15%. Si está bajo, el agente no cierra o el producto/precio no convence."
        />
        <FunnelRow
          label="Entregadas"
          sub="cliente recibió y pagó"
          value={e.entregadas}
          pctOfTop={(e.entregadas / topFunnel) * 100}
          conversionFromPrev={t.orden_to_entrega}
          color="#059669"
          tooltip="Órdenes que el cliente recibió y pagó (COD entregado). Saludable: >60%. Si está bajo: problema de logística, validación, precio o producto."
        />

        <div className="mt-4 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
          <i className="bx bx-bulb text-amber-600 text-sm mt-0.5" />
          <p className="text-[11px] text-amber-800 leading-relaxed">
            <strong>Cuello de botella:</strong> el paso con la tasa de
            conversión más baja es donde estás perdiendo más clientes.
            Identifícalo y trabaja ahí primero.
          </p>
        </div>
      </div>

      {/* ─── Estados de órdenes ─── */}
      {totalEstados > 0 && (
        <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <i className="bx bx-package text-indigo-600" />
            <span className="text-sm font-bold text-slate-800">
              Estado de las {fmt(totalEstados)} órdenes generadas
            </span>
            <Tip text="Distribución actual de todas las órdenes generadas en este período. Muchas en camino = retraso logístico; muchas devueltas = problema de producto o validación; muchas canceladas = filtro inicial muy permisivo.">
              <TipIcon />
            </Tip>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatusCard
              icon="bx-check-circle"
              label="Entregadas"
              value={e.entregadas}
              total={totalEstados}
              color="#059669"
              tooltip="Cliente recibió el producto y pagó. Es el resultado final exitoso."
            />
            <StatusCard
              icon="bx-time-five"
              label="En camino"
              value={e.en_camino}
              total={totalEstados}
              color="#3b82f6"
              tooltip="Órdenes en proceso logístico: pendientes de confirmación, guías generadas, en tránsito, en reparto, con novedades, o esperando retiro en agencia."
            />
            <StatusCard
              icon="bx-undo"
              label="Devueltas"
              value={e.devueltas}
              total={totalEstados}
              color="#f59e0b"
              tooltip="Cliente rechazó la entrega o no estuvo disponible. El producto vuelve a bodega. >15% es señal de alerta."
            />
            <StatusCard
              icon="bx-x-circle"
              label="Canceladas"
              value={e.canceladas}
              total={totalEstados}
              color="#ef4444"
              tooltip="Órdenes que nunca llegaron a salir a courier. Generalmente por filtro de fraude, cliente arrepentido antes del despacho, o datos inválidos."
            />
          </div>
        </div>
      )}

      {/* ─── Tasas + CPAs ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <i className="bx bx-trending-up text-indigo-600" />
            <span className="text-sm font-bold text-slate-800">
              Tasas de conversión
            </span>
          </div>
          <div className="space-y-2">
            {[
              {
                lbl: "CTR (clicks ÷ impresiones)",
                v: t.ctr,
                hint: "Saludable: 1-3%",
                tip: "Click-Through Rate. % de personas que vieron el ad y dieron clic. Si está <1%, tu creativo no llama la atención.",
              },
              {
                lbl: "Click → Mensaje WA",
                v: t.click_to_msg,
                hint: "Saludable: >30%",
                tip: "% de personas que hicieron click y SÍ escribieron al WhatsApp. Si <30%, hay fricción en el botón o el cliente no quiere escribir.",
              },
              {
                lbl: "Mensaje → Orden Dropi",
                v: t.msg_to_orden,
                hint: "Saludable: >15%",
                tip: "% de chats que terminaron en orden creada en Dropi. Si <15%, tus agentes no cierran o el flujo de cierre no funciona.",
              },
              {
                lbl: "Orden → Entrega",
                v: t.orden_to_entrega,
                hint: "Saludable: >60%",
                tip: "% de órdenes que llegaron a entregarse. Si <60%, problema de validación, logística, producto o precio.",
              },
            ].map((r) => (
              <div
                key={r.lbl}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
              >
                <div>
                  <div className="text-xs font-medium text-slate-700 inline-flex items-center gap-1">
                    {r.lbl}
                    <Tip text={r.tip}>
                      <TipIcon />
                    </Tip>
                  </div>
                  <div className="text-[10px] text-slate-400">{r.hint}</div>
                </div>
                <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                  {fmtPct(r.v)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <i className="bx bx-dollar text-indigo-600" />
            <span className="text-sm font-bold text-slate-800">
              Costos reales por evento
            </span>
          </div>
          <div className="space-y-2">
            {[
              {
                lbl: "CPA por mensaje",
                v: m.cpa_mensaje,
                color: "#06b6d4",
                tip: "Gasto Meta ÷ Mensajes WhatsApp. Cuánto te cuesta cada chat iniciado. En Ecuador COD un buen CPA mensaje está entre $0.10-$0.30.",
              },
              {
                lbl: "CPA por orden",
                v: m.cpa_orden,
                color: "#7c3aed",
                tip: "Gasto Meta ÷ Órdenes Dropi (todas, incluye canceladas). Cuánto te cuesta cada orden creada — antes de saber si se va a entregar.",
              },
              {
                lbl: "CPA por entrega",
                v: m.cpa_entrega,
                color: "#059669",
                tip: "Gasto Meta ÷ Órdenes ENTREGADAS. El costo de cada venta REAL. Si tu CPA entrega supera tu utilidad por orden, estás perdiendo plata.",
              },
            ].map((r) => (
              <div
                key={r.lbl}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-6 rounded-full"
                    style={{ background: r.color }}
                  />
                  <span className="text-xs font-medium text-slate-700 inline-flex items-center gap-1">
                    {r.lbl}
                    <Tip text={r.tip}>
                      <TipIcon />
                    </Tip>
                  </span>
                </div>
                <span
                  className="text-sm font-extrabold tabular-nums"
                  style={{ color: r.color }}
                >
                  {fmtCurrency(r.v, currency)}
                </span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 inline-flex items-center gap-1">
                Ganancia neta (utilidad − gasto ads)
                <Tip text="Lo que te queda LIMPIO después de pagar publicidad. Si es positivo, ganas; si es negativo, pierdes dinero.">
                  <TipIcon />
                </Tip>
              </span>
              <span
                className={`text-base font-extrabold tabular-nums ${gananciaNeta >= 0 ? "text-emerald-600" : "text-rose-600"}`}
              >
                {fmtCurrency(gananciaNeta, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
