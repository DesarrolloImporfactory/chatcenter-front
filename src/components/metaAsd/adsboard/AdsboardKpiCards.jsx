import React, { useState, useMemo } from "react";

/**
 * AdsboardKpiCards
 *
 * Panel visual profesional con métricas de Meta Ads.
 * Diseño limpio con tarjetas blancas, acentos sutiles y gauge de ROAS.
 *
 * Sección 1 — Hero KPIs: Gasto, Revenue, Compras + ROAS gauge
 * Sección 2 — Embudo: Impresiones → Clics → Leads → Compras
 * Sección 3 — Eficiencia: CPA, CTR, CPC, CPM con barras
 * Sección 4 — Conversiones: WhatsApp, Registros, Leads, Add to Cart
 */

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

/* ── Tooltip ── */
const Tip = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 w-60 px-3 py-2 rounded-lg bg-slate-900 text-white text-[11px] leading-relaxed shadow-lg">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 rotate-45 bg-slate-900" />
        </span>
      )}
    </span>
  );
};

/* ── Hero Stat Card (limpio, blanco, acento lateral) ── */
const HeroStat = ({ icon, label, value, sub, accentColor, tooltip }) => (
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
            <i className="bx bx-help-circle text-slate-400 cursor-help text-[12px]" />
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
    </div>
  </div>
);
/* ── ROAS Gauge ── */
const RoasGauge = ({ roas }) => {
  const r = Number(roas) || 0;
  const pct = Math.min((r / 5) * 100, 100);
  const color =
    r >= 3 ? "#059669" : r >= 2 ? "#2563eb" : r >= 1 ? "#f59e0b" : "#ef4444";
  const label =
    r >= 3 ? "Excelente" : r >= 2 ? "Rentable" : r >= 1 ? "Bajo" : "Crítico";
  const radius = 24;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ * 0.75;

  return (
    <div className="flex items-center gap-3">
      <svg width="58" height="40" viewBox="0 0 58 42">
        <path
          d="M 5 38 A 24 24 0 1 1 53 38"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M 5 38 A 24 24 0 1 1 53 38"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ * 0.75}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="flex flex-col">
        <span
          className="text-xl font-extrabold tracking-tight"
          style={{ color }}
        >
          {fmt(r, 2)}x
        </span>
        <span className="text-[10px] font-semibold" style={{ color }}>
          {label}
        </span>
      </div>
    </div>
  );
};
/* ── Funnel Step ── */
const FunnelStep = ({ label, value, pct, color, icon, tooltip }) => (
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-1.5 mb-1">
      <i className={`bx ${icon} text-sm`} style={{ color }} />
      <span className="text-[11px] text-slate-500 truncate">{label}</span>
      {tooltip && (
        <Tip text={tooltip}>
          <i className="bx bx-help-circle text-slate-400 cursor-help text-[11px]" />
        </Tip>
      )}
    </div>
    <div className="text-lg font-bold text-slate-900">{value}</div>
    <div className="mt-1.5 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(pct, 100)}%`, background: color }}
      />
    </div>
    <div className="text-[10px] text-slate-400 mt-0.5">{fmt(pct, 1)}%</div>
  </div>
);

/* ── Metric Row ── */
const MetricRow = ({ icon, label, value, bar, barColor, tooltip }) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
    <div
      className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
      style={{ background: `${barColor}15` }}
    >
      <i className={`bx ${icon} text-base`} style={{ color: barColor }} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        {tooltip && (
          <Tip text={tooltip}>
            <i className="bx bx-help-circle text-slate-400 cursor-help text-[11px]" />
          </Tip>
        )}
      </div>
      <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(bar, 100)}%`, background: barColor }}
        />
      </div>
    </div>
    <div className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
      {value}
    </div>
  </div>
);

/* ══════════════════════════════════════════════ */

export default function AdsboardKpiCards({ data, currency = "USD" }) {
  const d = data || {};

  const spend = Number(d.spend) || 0;
  const revenue = Number(d.purchase_value) || 0;
  const roas = Number(d.roas) || 0;
  const purchases = Number(d.purchases) || 0;
  const impressions = Number(d.impressions) || 0;
  const clicks = Number(d.clicks) || 0;
  const leads = Number(d.leads) || 0;
  const ctr = Number(d.ctr) || 0;

  const funnel = useMemo(() => {
    if (!impressions) return { clicks: 0, leads: 0, purchases: 0 };
    return {
      clicks: (clicks / impressions) * 100,
      leads: leads > 0 ? (leads / impressions) * 100 : 0,
      purchases: purchases > 0 ? (purchases / impressions) * 100 : 0,
    };
  }, [impressions, clicks, leads, purchases]);

  const profit = revenue - spend;

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════
          SECCIÓN 1: Hero KPIs
      ═══════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <HeroStat
          icon="bx-dollar-circle"
          label="Gasto total"
          value={fmtCurrency(spend, currency)}
          accentColor="#ef4444"
          tooltip="Total invertido en anuncios de Meta (Facebook + Instagram) durante el período seleccionado."
        />
        <HeroStat
          icon="bx-trending-up"
          label="Revenue"
          value={fmtCurrency(revenue, currency)}
          sub={
            profit >= 0
              ? `+${fmtCurrency(profit, currency)} neto`
              : `${fmtCurrency(profit, currency)} neto`
          }
          accentColor="#059669"
          tooltip="Valor total de las ventas atribuidas a tus anuncios, vía pixel o API de conversiones."
        />
        <HeroStat
          icon="bx-cart"
          label="Compras"
          value={fmt(purchases)}
          sub={
            purchases > 0
              ? `CPA: ${fmtCurrency(d.cpa_purchase, currency)}`
              : null
          }
          accentColor="#7c3aed"
          tooltip="Ventas completadas atribuidas a tus anuncios. El CPA indica cuánto cuesta cada venta."
        />
        <HeroStat
          icon="bx-show"
          label="Impresiones"
          value={fmtCompact(impressions)}
          sub={`${fmtCompact(clicks)} clics`}
          accentColor="#3b82f6"
          tooltip="Cuántas veces se mostraron tus anuncios en pantalla."
        />
        {/* ROAS */}
        <div className="relative rounded-xl bg-white ring-1 ring-slate-200 px-4 py-4 min-h-[100px] flex flex-col justify-center hover:shadow-sm transition">
          <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-indigo-500" />
          <div className="pl-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
              <div className="w-6 h-6 rounded-md grid place-items-center bg-indigo-500/10">
                <i className="bx bx-target-lock text-sm text-indigo-500" />
              </div>
              <span className="font-medium">ROAS</span>
              <Tip text="Return On Ad Spend — por cada $1 invertido en ads, cuántos dólares generas. ROAS 3x = $3 por cada $1.">
                <i className="bx bx-help-circle text-slate-400 cursor-help text-[12px]" />
              </Tip>
            </div>
            <RoasGauge roas={roas} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════
          SECCIÓN 2: Embudo de conversión
      ═══════════════════════════════════ */}
      <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <i className="bx bx-filter-alt text-indigo-600" />
          <span className="text-sm font-bold text-slate-800">
            Embudo de conversión
          </span>
          <Tip text="Visualiza cómo se reduce tu audiencia en cada paso: desde que ven el anuncio hasta que compran. Los porcentajes son relativos al total de impresiones.">
            <i className="bx bx-help-circle text-slate-400 cursor-help text-[13px]" />
          </Tip>
        </div>
        <div className="flex gap-3 items-end">
          <FunnelStep
            label="Impresiones"
            value={fmtCompact(impressions)}
            pct={100}
            color="#6366f1"
            icon="bx-show"
            tooltip="Cuántas veces se mostraron tus anuncios en pantalla."
          />
          <div className="shrink-0 text-slate-300 pb-6">
            <i className="bx bx-chevron-right" />
          </div>
          <FunnelStep
            label="Clics"
            value={fmtCompact(clicks)}
            pct={funnel.clicks}
            color="#3b82f6"
            icon="bx-pointer"
            tooltip="Personas que hicieron clic. El CTR indica qué tan atractivo es tu anuncio."
          />
          <div className="shrink-0 text-slate-300 pb-6">
            <i className="bx bx-chevron-right" />
          </div>
          <FunnelStep
            label="Leads"
            value={fmtCompact(leads)}
            pct={funnel.leads}
            color="#f59e0b"
            icon="bx-user-plus"
            tooltip="Contactos potenciales que dejaron datos. No todos llegan a comprar."
          />
          <div className="shrink-0 text-slate-300 pb-6">
            <i className="bx bx-chevron-right" />
          </div>
          <FunnelStep
            label="Compras"
            value={fmtCompact(purchases)}
            pct={funnel.purchases}
            color="#059669"
            icon="bx-cart"
            tooltip="Ventas completadas — tu objetivo principal."
          />
        </div>
      </div>

      {/* ═══════════════════════════════════
          SECCIÓN 3 + 4: Eficiencia + Conversiones
      ═══════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <i className="bx bx-tachometer text-indigo-600" />
            <span className="text-sm font-bold text-slate-800">
              Eficiencia publicitaria
            </span>
          </div>
          <MetricRow
            icon="bx-dollar"
            label="CPA (Costo por compra)"
            value={fmtCurrency(d.cpa_purchase, currency)}
            bar={Math.min(
              ((Number(d.cpa_purchase) || 0) / (spend || 1)) * 100,
              80,
            )}
            barColor="#f59e0b"
            tooltip="Cuánto cuesta conseguir una venta. Gasto ÷ Compras. Mientras más bajo, mejor."
          />
          <MetricRow
            icon="bx-pointer"
            label="CTR (Tasa de clics)"
            value={`${fmt(ctr, 2)}%`}
            bar={Math.min(ctr * 20, 100)}
            barColor="#3b82f6"
            tooltip="Porcentaje de personas que vieron tu anuncio y le dieron clic. Saludable: 1-3%."
          />
          <MetricRow
            icon="bx-mouse"
            label="CPC (Costo por clic)"
            value={fmtCurrency(d.cpc, currency)}
            bar={Math.min(((Number(d.cpc) || 0) / 2) * 100, 100)}
            barColor="#6366f1"
            tooltip="Cuánto pagas por cada clic. CPC bajo = tráfico más barato."
          />
          <MetricRow
            icon="bx-show"
            label="CPM (Costo por mil)"
            value={fmtCurrency(d.cpm, currency)}
            bar={Math.min(((Number(d.cpm) || 0) / 20) * 100, 100)}
            barColor="#8b5cf6"
            tooltip="Costo por cada 1,000 impresiones. Indica qué tan competitivo es tu nicho."
          />
        </div>

        <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <i className="bx bx-transfer text-indigo-600" />
            <span className="text-sm font-bold text-slate-800">
              Conversiones por tipo
            </span>
          </div>
          <MetricRow
            icon="bxl-whatsapp"
            label="Conversaciones WhatsApp"
            value={fmt(d.messaging_conversations)}
            bar={Math.min(
              ((Number(d.messaging_conversations) || 0) / Math.max(clicks, 1)) *
                100,
              100,
            )}
            barColor="#25D366"
            tooltip="Chats iniciados por botones Click-to-WhatsApp en tus anuncios."
          />
          <MetricRow
            icon="bx-user-check"
            label="Registros completados"
            value={fmt(d.complete_registrations)}
            bar={Math.min(
              ((Number(d.complete_registrations) || 0) / Math.max(clicks, 1)) *
                100,
              100,
            )}
            barColor="#2563eb"
            tooltip="Formularios de registro completados en tu sitio web."
          />
          <MetricRow
            icon="bx-user-plus"
            label="Leads generados"
            value={fmt(d.leads)}
            bar={Math.min(
              ((Number(d.leads) || 0) / Math.max(clicks, 1)) * 100,
              100,
            )}
            barColor="#f59e0b"
            tooltip="Contactos potenciales obtenidos vía formularios de lead."
          />
          <MetricRow
            icon="bx-cart-add"
            label="Agregados al carrito"
            value={fmt(d.add_to_cart)}
            bar={Math.min(
              ((Number(d.add_to_cart) || 0) / Math.max(clicks, 1)) * 100,
              100,
            )}
            barColor="#7c3aed"
            tooltip="Productos agregados al carrito aunque no completaron la compra."
          />
        </div>
      </div>
    </div>
  );
}
