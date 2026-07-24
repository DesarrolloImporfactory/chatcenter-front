import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import chatApi from "../../api/chatcenter";
import Adsboard from "../../components/metaAsd/Adsboard";
import Dropiboard from "../dropi/Dropiboard";
import Chatboard from "../../components/dashboard/Dashboard";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ─── config ───
   Base de las imágenes de producto de Dropi.
   El back devuelve la ruta relativa (ej: "ecuador/products/132831/xxx.png"). */
const DROPI_IMG_BASE = "https://d39ru7awumhhs2.cloudfront.net/";

function productImg(image) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image; // ya viene completa
  return `${DROPI_IMG_BASE}${image.replace(/^\/+/, "")}`;
}

/* ─── helpers ─── */

function toYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toYMD(d);
}

// Ecuador = USD.
function fmt$(v) {
  return Number(v || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtNum(v) {
  return Number(v || 0).toLocaleString("en-US");
}

function fmtPct(v) {
  if (v == null) return "—"; // null = el back no pudo medir el embudo
  return `${Number(v || 0).toFixed(1)}%`;
}

/* ─── Tooltips ───
   Tip: tooltip absoluto (para KPIs del hero, fuera de contenedores
   con overflow). InfoDot: icono "i" con tooltip position:fixed, se
   usa dentro de la tabla (el overflow del contenedor no lo recorta). */

function TipFormula({ formula }) {
  if (!formula) return null;
  return (
    <span className="block mt-1.5 pt-1.5 border-t border-white/10 font-mono text-[10px] text-emerald-300">
      {formula}
    </span>
  );
}

function Tip({ text, formula, children, align = "center", dir = "up" }) {
  const [show, setShow] = useState(false);
  const posClass =
    align === "left"
      ? "left-0"
      : align === "right"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";
  const isDown = dir === "down";
  return (
    <span
      className="relative inline-flex w-full min-w-0"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          className={`absolute ${isDown ? "top-full mt-3" : "bottom-full mb-3"} ${posClass} px-4 py-2.5 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-[11px] text-white/90 font-normal shadow-2xl shadow-black/25 z-[9999] pointer-events-none w-max max-w-[min(90vw,380px)] whitespace-normal leading-relaxed border border-white/[0.06] backdrop-blur-sm normal-case tracking-normal text-left`}
        >
          {text}
          <TipFormula formula={formula} />
        </span>
      )}
    </span>
  );
}

function InfoDot({ text, formula }) {
  const [pos, setPos] = useState(null);
  return (
    <span
      className="inline-flex"
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = Math.min(
          Math.max(r.left + r.width / 2, 140),
          window.innerWidth - 140,
        );
        setPos({ x, y: r.bottom + 8 });
      }}
      onMouseLeave={() => setPos(null)}
      onClick={(e) => e.stopPropagation()}
    >
      <i className="bx bx-info-circle text-[13px] text-slate-300 hover:text-indigo-500 cursor-help transition" />
      {pos && (
        <span
          className="fixed z-[9999] w-[250px] -translate-x-1/2 px-3.5 py-2.5 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-[11px] text-white/90 font-normal shadow-2xl shadow-black/30 leading-relaxed pointer-events-none normal-case tracking-normal text-left whitespace-normal"
          style={{ left: pos.x, top: pos.y }}
        >
          {text}
          <TipFormula formula={formula} />
        </span>
      )}
    </span>
  );
}

/* ─── constants ─── */

const DATE_PRESETS = [
  { label: "Hoy", days: 0 },
  { label: "7 días", days: 7 },
  { label: "15 días", days: 15 },
  { label: "30 días", days: 30 },
];

const CHANNELS = [
  { key: "todos", label: "Todos", icon: "bx-layer" },
  { key: "wa", label: "WhatsApp", icon: "bxl-whatsapp" },
  { key: "shopify", label: "Shopify", icon: "bxl-shopify" },
];

const STATUS_LABELS = {
  entregada: "Entregadas",
  en_transito: "En tránsito",
  pendiente: "Pendientes",
  devolucion: "Devoluciones",
  cancelada: "Canceladas",
  en_reparto: "En reparto",
  guia_generada: "Guía generada",
  novedad: "Novedad",
  retiro_agencia: "Retiro agencia",
  indemnizada: "Indemnizada",
  otro: "Otro",
};

const STATUS_COLORS = {
  entregada: "#10B981",
  en_transito: "#3B82F6",
  pendiente: "#F59E0B",
  devolucion: "#EF4444",
  cancelada: "#6B7280",
  en_reparto: "#8B5CF6",
  guia_generada: "#06B6D4",
  novedad: "#F97316",
  retiro_agencia: "#EC4899",
  indemnizada: "#0EA5E9",
  otro: "#94A3B8",
};

/* ─── Tabs del centro de control por conexión ───
   Mismo patrón que ControlCenter (?view= + localStorage) para que a
   futuro esta ruta reemplace a la antigua. */

const TABS = [
  {
    id: "resumen",
    label: "Resumen",
    shortLabel: "Resumen",
    icon: "bx-home-alt",
    color: "#6366f1",
  },
  {
    id: "dropi",
    label: "Operación Dropi",
    shortLabel: "Dropi",
    icon: "bx-package",
    color: "#FF6B35",
  },
  {
    id: "ads",
    label: "Anuncios Meta",
    shortLabel: "Ads",
    icon: "bxl-meta",
    color: "#3b82f6",
  },
  {
    id: "mensajes",
    label: "Dashboard de mensajes",
    shortLabel: "Mensajes",
    icon: "bx-message-rounded-dots",
    color: "#059669",
  },
];

/* Siempre se entra en Resumen, salvo que la URL traiga ?view= explícito
   (así al volver al dashboard desde otra vista no se abre otro tab). */
function getInitialTab() {
  if (typeof window === "undefined") return "resumen";
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("view");
  if (fromUrl && TABS.find((t) => t.id === fromUrl)) return fromUrl;
  return "resumen";
}

function updateUrlParam(tabId) {
  const url = new URL(window.location.href);
  url.searchParams.set("view", tabId);
  window.history.replaceState({}, "", url.toString());
}

/* ─── vista por canal (alimenta los KPIs del hero) ───
   Para WA/Shopify las conversaciones son las de clientes vinculados
   por teléfono a pedidos de ese canal (viene del back). */

function channelView(data, canal) {
  if (!data) return null;
  const base = {
    conversaciones: data.totalConversaciones,
    mensajes: data.totalMensajes,
  };
  if (canal === "wa" || canal === "shopify") {
    const c = data.canales[canal];
    return {
      ...base,
      ...c,
      conversaciones: c.conversaciones ?? data.totalConversaciones,
    };
  }
  return {
    pedidos: data.totalPedidos,
    facturado: data.totalFacturado,
    ganancia: data.totalGanancia,
    entregadas: data.entregadas,
    tasaEntrega: data.tasaEntrega,
    pctConfirmacion: data.pctConfirmacion,
    conversacionesConPedido: data.conversacionesConPedido,
    ...base,
  };
}

/* ─── KPIs del hero por canal ───
   Cada vista arma sus propias 6 cards con los números de ESE canal
   (Shopify ≠ WhatsApp): pedidos, tasa de entrega y confirmación salen de
   los pedidos del canal, no del total. "Todos" muestra la foto global.
   Tooltips: cortos y sin jerga; la fórmula (línea verde) es opcional. */

const cardFacturado = (view, sub) => ({
  key: "facturado",
  label: "Facturado",
  tip: "Cuánto vendiste en este canal durante el periodo.",
  sub,
  icon: "bx-dollar-circle",
  color: "#34d399",
  bg: "rgba(52,211,153,0.1)",
  value: fmt$(view.facturado),
  highlight: "emerald",
});

const cardUtilidad = (view) => ({
  key: "ganancia",
  label: "Utilidad",
  tip: "Lo que ganarías si se entregaran todos los pedidos del periodo.",
  formula: "venta − costo proveedor − envío",
  sub:
    view.facturado > 0
      ? `${((view.ganancia / view.facturado) * 100).toFixed(1)}% del facturado`
      : "—",
  icon: "bx-wallet",
  color: "#a78bfa",
  bg: "rgba(167,139,250,0.1)",
  value: fmt$(view.ganancia),
  highlight: "violet",
});

// Pedidos Dropi VIVOS del canal (sin cancelados).
const cardPedidosDropi = (view, { label, color }) => ({
  key: "pedidosDropi",
  label,
  tip: "Pedidos que ya pasaron a Dropi, sin contar los cancelados.",
  formula: "pedidos Dropi − cancelados",
  sub: `${fmtNum(view.canceladas)} cancelados`,
  icon: "bx-package",
  color,
  bg: color === "#60a5fa" ? "rgba(96,165,250,0.1)" : "rgba(244,114,182,0.1)",
  value: fmtNum(view.pedidosNeto),
});

// Tasa de entrega real del canal: sobre pedidos Dropi sin cancelados.
const cardTasaEntregaReal = (view) => ({
  key: "tasaEntrega",
  label: "Tasa entrega",
  tip: "De los pedidos que ya están en Dropi (sin los cancelados), cuántos llegaron al cliente.",
  formula: "entregados ÷ pedidos Dropi × 100",
  sub: `${fmtNum(view.entregadas)} entregados`,
  icon: "bx-check-double",
  color: "#22d3ee",
  bg: "rgba(34,211,238,0.1)",
  value: fmtPct(view.tasaEntregaReal),
});

function buildHeroKpis(canal, data, view) {
  if (canal === "shopify") {
    return [
      cardFacturado(view, `${fmtNum(view.pedidosNeto)} pedidos dropi`),
      cardUtilidad(view),
      {
        key: "pedidosShopify",
        label: "Pedidos",
        tip: "Pedidos que hicieron tus clientes en la tienda Shopify.",
        formula: "checkouts Shopify + órdenes tipo Shopify",
        sub: "checkouts de la tienda",
        icon: "bx-cart",
        color: "#60a5fa",
        bg: "rgba(96,165,250,0.1)",
        value: fmtNum(data.shopifyLeads),
      },
      cardPedidosDropi(view, { label: "Pedidos Dropi", color: "#f472b6" }),
      {
        key: "pctConfirmacion",
        label: "Confirmación",
        tip: "De todos tus pedidos Shopify que llegaron a Dropi, cuántos ya se confirmaron (superaron «pendiente confirmación»). El resto se reparte entre los que faltan por confirmar y los que el cliente canceló.",
        formula: "confirmados ÷ pedidos Shopify en Dropi × 100",
        sub: `${fmtNum(view.confirmadas)} de ${fmtNum(view.pedidos)}`,
        icon: "bx-check-shield",
        color: "#fbbf24",
        bg: "rgba(251,191,36,0.1)",
        value: fmtPct(view.pctConfirmacion),
        // Trazabilidad: qué frena la confirmación (equipo sin confirmar vs
        // producto que el cliente cancela). Suma exacta con confirmados:
        // confirmados + por confirmar + cancelados = pedidos en Dropi.
        breakdown: [
          {
            label: "por confirmar",
            value: Math.max(0, (view.pedidosNeto || 0) - (view.confirmadas || 0)),
            color: "#fbbf24",
          },
          { label: "cancelados", value: view.canceladas || 0, color: "#fb7185" },
        ],
      },
      cardTasaEntregaReal(view),
    ];
  }

  if (canal === "wa") {
    return [
      cardFacturado(view, `${fmtNum(view.pedidosNeto)} pedidos`),
      cardUtilidad(view),
      {
        key: "conversaciones",
        label: "Conversaciones",
        tip: "Personas distintas que te escribieron al chat en este periodo.",
        sub: `${fmtNum(data.totalMensajes)} mensajes`,
        icon: "bx-message-dots",
        color: "#f472b6",
        bg: "rgba(244,114,182,0.1)",
        value: fmtNum(data.totalConversaciones),
      },
      cardPedidosDropi(view, { label: "Pedidos", color: "#60a5fa" }),
      {
        key: "pctConfirmacion",
        label: "Confirmación",
        // Mismo par que se ve en pantalla: pedidos ÷ conversaciones. Antes
        // usábamos compradores globales (incluían ventas Shopify) y no
        // cuadraba con los pedidos WhatsApp de al lado.
        tip: data.totalConversaciones
          ? "De las conversaciones que entraron, qué porcentaje terminó en pedido por WhatsApp."
          : "Aún no se puede medir: en este periodo nadie escribió al chat.",
        formula: "pedidos ÷ conversaciones × 100",
        sub: `${fmtNum(view.pedidosNeto)} de ${fmtNum(data.totalConversaciones)}`,
        icon: "bx-check-shield",
        color: "#fbbf24",
        bg: "rgba(251,191,36,0.1)",
        value: fmtPct(
          data.totalConversaciones
            ? (view.pedidosNeto / data.totalConversaciones) * 100
            : null,
        ),
      },
      cardTasaEntregaReal(view),
    ];
  }

  // "Todos": suma de los canales, misma lógica que ellos. Pedidos netos
  // (sin cancelados) para que WhatsApp + Shopify cuadre con este total.
  const netoTodos = Math.max(0, view.pedidos - data.canceladas);
  return [
    cardFacturado(view, `${fmtNum(netoTodos)} pedidos`),
    cardUtilidad(view),
    {
      key: "pedidos",
      label: "Pedidos",
      tip: "Pedidos del periodo de todos los canales, sin contar los cancelados.",
      formula: "pedidos Dropi − cancelados",
      sub: `${fmtNum(data.canceladas)} cancelados`,
      icon: "bx-package",
      color: "#60a5fa",
      bg: "rgba(96,165,250,0.1)",
      value: fmtNum(netoTodos),
    },
    {
      key: "conversaciones",
      label: "Conversaciones",
      tip: "Personas distintas que te escribieron al chat en este periodo.",
      sub: `${fmtNum(view.mensajes)} mensajes`,
      icon: "bx-message-dots",
      color: "#f472b6",
      bg: "rgba(244,114,182,0.1)",
      value: fmtNum(view.conversaciones),
    },
    {
      key: "pctConfirmacion",
      label: "Confirmación",
      tip: view.conversaciones
        ? "De las conversaciones que entraron, qué porcentaje terminó en pedido (todos los canales)."
        : "Aún no se puede medir: en este periodo nadie escribió al chat.",
      formula: "pedidos ÷ conversaciones × 100",
      sub: `${fmtNum(netoTodos)} de ${fmtNum(view.conversaciones)}`,
      icon: "bx-check-shield",
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.1)",
      value: fmtPct(
        view.conversaciones ? (netoTodos / view.conversaciones) * 100 : null,
      ),
    },
    {
      key: "tasaEntrega",
      label: "Tasa entrega",
      tip: "De los pedidos (sin cancelados), cuántos llegaron al cliente.",
      formula: "entregados ÷ pedidos × 100",
      sub: `${fmtNum(view.entregadas)} entregados`,
      icon: "bx-check-double",
      color: "#22d3ee",
      bg: "rgba(34,211,238,0.1)",
      value: fmtPct(
        netoTodos > 0 ? (view.entregadas / netoTodos) * 100 : null,
      ),
    },
  ];
}

/* KPIs destacados del hero (números "para la foto") */
const KPI_HIGHLIGHTS = {
  emerald: {
    box: "bg-emerald-400/[0.07] border-emerald-300/[0.15] hover:bg-emerald-400/[0.12]",
    text: "text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200",
  },
  violet: {
    box: "bg-violet-400/[0.07] border-violet-300/[0.15] hover:bg-violet-400/[0.12]",
    text: "text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-200",
  },
};

/* ─── chart tooltip ─── */

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  // Dedupe por dataKey: conversaciones tiene línea + área (mismo dato),
  // no debe salir dos veces en el tooltip.
  const seen = new Set();
  const items = payload.filter((p) => {
    if (seen.has(p.dataKey)) return false;
    seen.add(p.dataKey);
    return true;
  });
  return (
    <div className="rounded-xl bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl px-4 py-3 text-xs">
      <p className="font-bold text-slate-800 mb-2 text-[13px]">{label}</p>
      {items.map((p) => {
        const isMoney = ["facturado", "ganancia"].includes(p.dataKey);
        return (
          <div key={p.dataKey} className="flex items-center gap-2.5 py-0.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: p.color }}
            />
            <span className="text-slate-500">{p.name}</span>
            <span className="font-bold text-slate-900 ml-auto">
              {isMoney ? fmt$(p.value) : fmtNum(p.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ═════════════════════════════════════════════════
   Shell con tabs (Resumen / Dropi / Ads / Mensajes)
   Este dashboard vive DENTRO de una conexión: los
   boards internos van bloqueados a esa conexión.
   ═════════════════════════════════════════════════ */

/**
 * adminMode: true cuando se monta en la ruta /dashboard (menú externo,
 * MainLayout_conexiones) — permite cambiar de conexión y los boards
 * quedan libres. false en /conexion-dashboard (dentro de una conexión,
 * MainLayout interno) — todo fijado a la conexión activa.
 */
export default function ConnectionDashboard({ adminMode = false }) {
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Cache por tab: cada board se monta la primera vez que se visita y
  // luego solo se oculta con CSS. Así al volver a un tab NO se vuelve
  // a consultar el back (los datos y filtros quedan vivos en memoria).
  const [visitedTabs, setVisitedTabs] = useState(
    () => new Set([getInitialTab()]),
  );

  // Modo selector: en /dashboard (adminMode) el usuario puede cambiar de
  // conexión. En /conexion-dashboard (dentro de una conexión) queda FIJA.
  const allowSwitch = adminMode;

  const [conexion, setConexion] = useState(() => ({
    id: Number(localStorage.getItem("id_configuracion")) || null,
    nombre: localStorage.getItem("nombre_configuracion") || "Conexión",
  }));
  const [conexiones, setConexiones] = useState([]);

  // En modo selector: cargar las conexiones del usuario y, si no hay una
  // activa (o ya no existe), arrancar con la primera registrada.
  useEffect(() => {
    if (!allowSwitch) return;
    (async () => {
      try {
        const t = localStorage.getItem("token");
        const u = t ? jwtDecode(t) : null;
        if (!u?.id_usuario) return;
        const { data } = await chatApi.post(
          "configuraciones/listar_conexiones_sub_user",
          { id_usuario: u.id_usuario, id_sub_usuario: u.id_sub_usuario },
        );
        const rows = data?.data || [];
        setConexiones(rows);
        setConexion((prev) => {
          if (prev.id && rows.some((r) => r.id === prev.id)) return prev;
          const first = rows[0];
          if (!first) return prev;
          localStorage.setItem("id_configuracion", String(first.id));
          localStorage.setItem(
            "nombre_configuracion",
            first.nombre_configuracion || "",
          );
          window.dispatchEvent(new Event("dropi:config-changed"));
          return {
            id: first.id,
            nombre: first.nombre_configuracion || "Conexión",
          };
        });
      } catch (e) {
        console.error("Error cargando conexiones:", e);
      }
    })();
  }, [allowSwitch]);

  const handleChangeConexion = useCallback(
    (id) => {
      const row = conexiones.find((r) => r.id === Number(id));
      if (!row || row.id === conexion.id) return;
      localStorage.setItem("id_configuracion", String(row.id));
      localStorage.setItem(
        "nombre_configuracion",
        row.nombre_configuracion || "",
      );
      window.dispatchEvent(new Event("dropi:config-changed"));
      setConexion({
        id: row.id,
        nombre: row.nombre_configuracion || "Conexión",
      });
      // Cambió la conexión → se invalida el caché de tabs (remontan por key)
      setVisitedTabs(new Set([activeTab]));
    },
    [conexiones, conexion.id, activeTab],
  );

  const handleTabChange = useCallback(
    (tabId) => {
      if (tabId === activeTab) return;
      setActiveTab(tabId);
      setVisitedTabs((prev) => {
        if (prev.has(tabId)) return prev;
        const next = new Set(prev);
        next.add(tabId);
        return next;
      });
      updateUrlParam(tabId);
    },
    [activeTab],
  );

  // El scroll de la lista de conexiones se conserva al navegar, así que el
  // dashboard abría a mitad de página: al montar siempre arrancamos arriba.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document
      .querySelectorAll(".overflow-y-auto")
      .forEach((el) => (el.scrollTop = 0));
  }, []);

  // Los charts (Recharts/Apex) montados dentro de un tab oculto
  // (display:none) conservan el ancho viejo y estiran la página al
  // volver a mostrarse. Al cambiar de tab forzamos un recálculo.
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event("resize")), 60);
    return () => clearTimeout(t);
  }, [activeTab]);

  const activeMeta = TABS.find((t) => t.id === activeTab) || TABS[0];

  // En /dashboard (adminMode) los boards quedan LIBRES con sus
  // propios selectores — se puede auditar todo, como en la ruta original.
  // Dentro de una conexión van fijados a ella (sin selector).
  const boardLockId = allowSwitch ? null : conexion.id;

  return (
    // overflow-x-hidden: ningún tab (Resumen, Dropi, Ads, Mensajes) debe
    // expandir la página hacia la derecha; lo ancho scrollea en su contenedor
    <div className="w-full max-w-full min-h-screen bg-[#f0f2f5] overflow-x-hidden">
      {/* ── Barra de tabs sticky (única con el nombre de la tienda) ── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="flex items-center justify-between gap-3 px-3 sm:px-6 h-[52px]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="shrink-0 w-8 h-8 rounded-lg grid place-items-center transition-colors"
              style={{ background: `${activeMeta.color}15` }}
            >
              <i
                className={`bx ${activeMeta.icon} text-lg`}
                style={{ color: activeMeta.color }}
              />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-[13px] font-extrabold text-slate-900 truncate">
                {conexion.nombre}
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate hidden sm:block">
                {activeMeta.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <i
                    className={`bx ${tab.icon} text-base`}
                    style={{ color: isActive ? tab.color : undefined }}
                  />
                  <span className="hidden md:inline">{tab.shortLabel}</span>
                  {isActive && (
                    <span
                      className="absolute -bottom-[9px] left-2 right-2 h-[2.5px] rounded-full"
                      style={{ background: tab.color }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div
          className="h-[2px] transition-colors duration-300"
          style={{ background: activeMeta.color }}
        />
      </div>

      {/* keep-alive: montado una vez, oculto con CSS al cambiar de tab.
          En modo fijo la key por conexión remonta todo si esta cambia;
          en picker la key es estable (los boards manejan su selector). */}
      <div key={allowSwitch ? "admin" : conexion.id || "sin-conexion"}>
        {visitedTabs.has("resumen") && (
          <div className={activeTab === "resumen" ? "" : "hidden"}>
            <ResumenView
              configId={conexion.id}
              configNombre={conexion.nombre}
              allowSwitch={allowSwitch}
              conexiones={conexiones}
              onChangeConexion={handleChangeConexion}
            />
          </div>
        )}
        {visitedTabs.has("dropi") && (
          <div className={activeTab === "dropi" ? "" : "hidden"}>
            <Dropiboard lockedConfigId={boardLockId} autoFetch />
          </div>
        )}
        {visitedTabs.has("ads") && (
          <div className={activeTab === "ads" ? "" : "hidden"}>
            <Adsboard lockedConfigId={boardLockId} autoFetch />
          </div>
        )}
        {visitedTabs.has("mensajes") && (
          <div className={activeTab === "mensajes" ? "" : "hidden"}>
            <Chatboard lockedConfigId={boardLockId} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Skeleton de carga del resumen ───
   Primera carga (sin data previa): réplica en gris con shimmer de
   podio + tabla de productos + charts, para que debajo del hero no
   quede la página en blanco. En los refetch se conserva el contenido
   anterior (solo el KPI grid del hero muestra su propio skeleton). */

function SkBox({ className = "", style }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-slate-100 ${className}`}
      style={style}
    >
      <div className="absolute inset-0 animate-[skSweep_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
    </div>
  );
}

const SK_BAR_HEIGHTS = [42, 68, 35, 80, 55, 72, 47, 90, 62, 38, 76, 52, 66, 44];

function ResumenSkeleton() {
  return (
    <>
      <style>{`@keyframes skSweep{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>

      {/* podio de anuncios */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4"
          >
            <SkBox className="h-4 w-14 mb-3" />
            <SkBox className="h-3.5 w-3/4 mb-2" />
            <SkBox className="h-3 w-1/2 mb-4" />
            <div className="flex gap-2">
              <SkBox className="h-9 flex-1" />
              <SkBox className="h-9 flex-1" />
              <SkBox className="h-9 flex-1" />
            </div>
          </div>
        ))}
      </div>

      {/* tabla de productos */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
          <SkBox className="h-4 w-64 max-w-full mb-2" />
          <SkBox className="h-3 w-96 max-w-full" />
        </div>
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center gap-4 overflow-hidden">
          {[24, 96, 56, 48, 48, 44, 40, 40, 56, 56].map((w, i) => (
            <SkBox key={i} className="h-2.5 shrink-0" style={{ width: w }} />
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 sm:px-5 py-3 flex items-center gap-3">
              <SkBox className="w-9 h-9 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <SkBox className="h-3.5 w-40 max-w-[60%] mb-1.5" />
                <SkBox className="h-2.5 w-16" />
              </div>
              <SkBox className="h-5 w-12 hidden sm:block" />
              <SkBox className="h-5 w-12 hidden sm:block" />
              <SkBox className="h-5 w-14 hidden md:block" />
              <SkBox className="h-5 w-12 hidden md:block" />
              <SkBox className="h-5 w-16 hidden lg:block" />
              <SkBox className="h-5 w-16 hidden lg:block" />
            </div>
          ))}
        </div>
      </div>

      {/* charts: barras + donut */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <SkBox className="h-4 w-52 mb-2" />
          <SkBox className="h-3 w-72 max-w-full mb-5" />
          <div className="h-[240px] flex items-end gap-2">
            {SK_BAR_HEIGHTS.map((h, i) => (
              <SkBox
                key={i}
                className="flex-1 rounded-t-md rounded-b-none"
                // altura variada para simular la serie diaria
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        <div className="min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <SkBox className="h-4 w-36 mb-2" />
          <SkBox className="h-3 w-44 mb-5" />
          <div className="grid place-items-center mb-5">
            <div className="w-[136px] h-[136px] rounded-full border-[16px] border-slate-100 animate-pulse" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <SkBox className="w-2 h-2 rounded-full shrink-0" />
                <SkBox className="h-3 flex-1" />
                <SkBox className="h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═════════════════════════════════════════════════
   Tab Resumen — el dashboard de la conexión
   ═════════════════════════════════════════════════ */

function ResumenView({
  configId,
  configNombre,
  allowSwitch,
  conexiones,
  onChangeConexion,
}) {
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState(() => {
    const today = toYMD(new Date());
    return { from: daysAgo(7), to: today };
  });
  const [activePreset, setActivePreset] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [canal, setCanal] = useState("todos");

  // Anuncios ganadores (solo si la conexión tiene Meta Ads)
  const [winnerAds, setWinnerAds] = useState(null);

  // Tabla productos (ordena por pedidos Dropi por defecto)
  const [prodSort, setProdSort] = useState({
    key: "ordenes",
    dir: "desc",
  });

  const todayStr = toYMD(new Date());

  const fetchSummary = useCallback(
    async (fromDate, toDate) => {
      if (!configId) return null;
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await chatApi.post(
          "dropi_integrations/dashboard/connection-summary",
          { id_configuracion: configId, from: fromDate, until: toDate },
        );
        const d = res?.data?.data || null;
        setData(d);
        return d;
      } catch (err) {
        setErrorMsg(err?.response?.data?.message || "Error al consultar datos");
        setData(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [configId],
  );

  // Anuncios ganadores desde marketing-control (igual que Adsboard).
  // silentError → sin toast global feo si algo falla; la sección se oculta.
  const fetchWinners = useCallback(
    async (fromDate, toDate) => {
      if (!configId) return;
      try {
        const { data: mc } = await chatApi.get("/marketing-control/dashboard", {
          params: {
            id_configuracion: configId,
            since: fromDate,
            until: toDate,
            limit: 30,
          },
          silentError: true,
        });
        const items = mc?.attribution?.items || [];
        const winners = items
          .filter((a) => Number(a.entregadas_estimadas || 0) > 0)
          .sort(
            (a, b) => Number(b.roi_estimado || 0) - Number(a.roi_estimado || 0),
          )
          .slice(0, 3);
        setWinnerAds(winners);
      } catch (_) {
        setWinnerAds(null); // no conectado / error → sección oculta
      }
    },
    [configId],
  );

  // Solo consultamos marketing-control si la conexión tiene Meta Ads.
  const loadAll = useCallback(
    async (fromDate, toDate) => {
      const d = await fetchSummary(fromDate, toDate);
      if (d?.metaAds?.conectado) {
        fetchWinners(fromDate, toDate);
      } else {
        setWinnerAds(null);
      }
    },
    [fetchSummary, fetchWinners],
  );

  const handlePreset = (idx) => {
    setActivePreset(idx);
    const p = DATE_PRESETS[idx];
    const today = toYMD(new Date());
    const from = p.days === 0 ? today : daysAgo(p.days);
    setDateRange({ from, to: today });
    loadAll(from, today);
  };

  useEffect(() => {
    const today = toYMD(new Date());
    loadAll(daysAgo(7), today);
  }, [loadAll]);

  const view = useMemo(() => channelView(data, canal), [data, canal]);

  // ¿La conexión vende por Shopify? Solo entonces mostramos las pestañas
  // Todos/Shopify; si no, la vista es 100% WhatsApp (una sola pestaña).
  const vendeShopify =
    data?.shopifyConectado === true ||
    (data?.canales?.shopify?.pedidos || 0) > 0;
  const availableChannels = useMemo(
    () =>
      vendeShopify ? CHANNELS : CHANNELS.filter((c) => c.key === "wa"),
    [vendeShopify],
  );
  // Si no vende por Shopify, el canal siempre es WhatsApp.
  useEffect(() => {
    if (!vendeShopify && canal !== "wa") setCanal("wa");
  }, [vendeShopify, canal]);

  // Estados con % visible (usa pct del back; si no viene, lo calcula)
  const statusList = useMemo(() => {
    if (!data?.statusBreakdown?.length) return [];
    const total = data.statusBreakdown.reduce((s, x) => s + x.count, 0) || 1;
    return [...data.statusBreakdown]
      .sort((a, b) => b.count - a.count)
      .map((s) => ({
        key: s.status,
        name: STATUS_LABELS[s.status] || s.status,
        value: s.count,
        pct: s.pct != null ? Number(s.pct) : (s.count / total) * 100,
        fill: STATUS_COLORS[s.status] || "#94A3B8",
      }));
  }, [data]);

  // Aplana cada producto al canal activo (la tabla sigue la pestaña) y
  // luego ordena. Todo sale de Dropi: la confirmación es pedidos ya
  // confirmados ÷ pedidos Dropi. Oculta productos sin actividad en el canal.
  const sortedProducts = useMemo(() => {
    if (!data?.productos?.length) return [];
    const rows = data.productos
      .map((p) => {
        const c = p.canal?.[canal] || p.canal?.todos || {};
        const ordenes = c.ordenes ?? 0;
        const confirmadas = c.confirmadas ?? 0;
        const pctConfirmacion =
          ordenes > 0
            ? Math.round((confirmadas / ordenes) * 10000) / 100
            : null;
        return {
          product_id: p.product_id,
          name: p.name,
          sku: p.sku,
          image: p.image,
          confirmadas,
          ordenes,
          canceladas: c.canceladas ?? 0,
          entregadas: c.entregadas ?? 0,
          devoluciones: c.devoluciones ?? 0,
          tasaEntrega: c.tasaEntrega ?? null,
          pctConfirmacion,
        };
      })
      .filter((r) => r.ordenes > 0 || r.canceladas > 0);
    const { key, dir } = prodSort;
    return rows.sort((a, b) => {
      const va = a[key] == null ? -Infinity : a[key];
      const vb = b[key] == null ? -Infinity : b[key];
      return dir === "desc" ? vb - va : va - vb;
    });
  }, [data, prodSort, canal]);

  const handleProdSort = (key) =>
    setProdSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" },
    );

  const hasCharts = data?.dailyChart?.length > 1;
  const adsConectado = data?.metaAds?.conectado === true;
  const adsNoConectado = data?.metaAds?.conectado === false;

  const HERO_KPIS = view ? buildHeroKpis(canal, data, view) : [];

  // ── Tabla de productos (sigue la pestaña; datos de Dropi) ──
  const canalMeta = CHANNELS.find((c) => c.key === canal) || CHANNELS[0];
  const col2Tip =
    "Pedidos de este producto que el bot ya confirmó (dejaron de estar en «pendiente confirmación»).";
  const confTip =
    "De los pedidos de este producto que YA están en Dropi, cuántos confirmó el bot. Ojo: es otra etapa que el % del resumen de arriba (ese mide checkouts → Dropi).";
  const confFormula = "confirmadas ÷ pedidos Dropi × 100";
  const confColor = (v) => {
    if (v >= 70) return "bg-emerald-50 text-emerald-700";
    if (v >= 40) return "bg-amber-50 text-amber-700";
    return "bg-rose-50 text-rose-700";
  };

  // Gráfico diario: guías (pedidos Dropi) y entregas siguen el canal;
  // la línea de conversaciones es la actividad del chat (no se separa).
  const guiasKey =
    canal === "wa"
      ? "pedidos_wa"
      : canal === "shopify"
        ? "pedidos_shopify"
        : "pedidos";
  const entregasKey =
    canal === "wa"
      ? "entregadas_wa"
      : canal === "shopify"
        ? "entregadas_shopify"
        : "entregadas";
  // Título del gráfico: en WhatsApp no hay "tienda" (checkouts), así que
  // usamos el descriptivo directo. En Shopify/Todos sí aplica el embudo.
  const chartTitle =
    canal === "wa"
      ? "Conversaciones, guías y entregas por día"
      : "Pedidos: tienda vs Dropi vs entrega";
  const chartSubtitle =
    canal === "wa"
      ? "Cuántos te escriben, cuántos pedidos generas y cuántos se entregan"
      : "Conversaciones, guías y entregas por día";

  return (
    <>
      {/* ══════════════════════ HERO ══════════════════════ */}
      <div className="relative bg-gradient-to-br from-[#070b14] via-[#0f172a] to-[#1e1b4b]">
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden
        >
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div
            className="absolute -right-32 -top-32 w-[450px] h-[450px] opacity-[0.07]"
            style={{
              background: "radial-gradient(circle, #818cf8, transparent 60%)",
            }}
          />
          <div
            className="absolute -left-16 -bottom-16 w-[350px] h-[350px] opacity-[0.05]"
            style={{
              background: "radial-gradient(circle, #34d399, transparent 60%)",
            }}
          />
        </div>

        <div className="relative px-4 sm:px-8 pt-4 pb-5">
          {/* ── Top row: label + channel switch ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Rendimiento del periodo
            </p>

            {/* El switch solo aparece si hay más de un canal (vende por
                Shopify). Si es 100% WhatsApp, no tiene sentido elegir. */}
            {availableChannels.length > 1 && (
              <div className="flex items-center gap-1 bg-white/[0.06] border border-white/[0.08] rounded-xl p-1">
                {availableChannels.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setCanal(c.key)}
                    className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      canal === c.key
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <i className={`bx ${c.icon} text-sm`} />
                    <span className="hidden sm:inline">{c.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── KPI Grid ── */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white/[0.05] border border-white/[0.07] px-3.5 py-3 animate-pulse"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-5 h-5 rounded-md bg-white/[0.08]" />
                    <div className="h-2 w-14 rounded bg-white/[0.08]" />
                  </div>
                  <div className="h-5 w-20 rounded bg-white/[0.1] mb-1.5" />
                  <div className="h-2 w-16 rounded bg-white/[0.06]" />
                </div>
              ))}
            </div>
          ) : view ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {HERO_KPIS.map((kpi, idx) => {
                  const align =
                    idx === 0
                      ? "left"
                      : idx === HERO_KPIS.length - 1
                        ? "right"
                        : "center";
                  const hl = KPI_HIGHLIGHTS[kpi.highlight];
                  return (
                    <Tip
                      key={kpi.key}
                      text={kpi.tip}
                      formula={kpi.formula}
                      align={align}
                      dir="down"
                    >
                      <div
                        className={`w-full rounded-xl border backdrop-blur-sm px-3.5 py-3 transition cursor-help ${
                          hl
                            ? hl.box
                            : "bg-white/[0.05] border-white/[0.07] hover:bg-white/[0.09]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div
                            className="w-5 h-5 rounded-md grid place-items-center"
                            style={{ background: kpi.bg }}
                          >
                            <i
                              className={`bx ${kpi.icon} text-[11px]`}
                              style={{ color: kpi.color }}
                            />
                          </div>
                          <span className="text-[9px] uppercase tracking-widest text-white/35 font-semibold">
                            {kpi.label}
                          </span>
                        </div>
                        <p
                          className={`text-xl sm:text-2xl font-extrabold tracking-tight leading-none mb-0.5 ${
                            hl ? hl.text : "text-white"
                          }`}
                        >
                          {kpi.value}
                        </p>
                        <p
                          className="text-[10px] font-medium leading-tight"
                          style={{ color: kpi.color }}
                        >
                          {kpi.sub}
                        </p>
                        {kpi.breakdown && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {kpi.breakdown.map((b) => (
                              <span
                                key={b.label}
                                className="inline-flex items-center gap-1 text-[9px] font-semibold whitespace-nowrap"
                                style={{ color: b.color }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ background: b.color }}
                                />
                                {fmtNum(b.value)} {b.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Tip>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* ══════════════════════ CONTENT ══════════════════════ */}
      <div className="px-3 sm:px-6 py-4 space-y-4">
        {/* ── Filtro de período (mismo estilo que Dropi/Ads) ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            {/* ── Conexión: fija dentro de una conexión, seleccionable
                   cuando se entra por /dashboard (adminMode) ── */}
            <div className="min-w-[210px]">
              <div className="mb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Conexión
              </div>
              {allowSwitch ? (
                <select
                  className="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                  value={configId || ""}
                  onChange={(e) => onChangeConexion(e.target.value)}
                >
                  {conexiones.length === 0 && (
                    <option value="">Cargando conexiones…</option>
                  )}
                  {conexiones.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre_configuracion ||
                        c.telefono ||
                        `Config #${c.id}`}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 flex items-center gap-2 overflow-hidden">
                  <i className="bx bx-link shrink-0 text-indigo-500" />
                  <span className="truncate font-medium">{configNombre}</span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="mb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Período
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
                  {DATE_PRESETS.map((p, idx) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handlePreset(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                        activePreset === idx
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="date"
                    className="h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                    value={dateRange.from}
                    max={dateRange.to || todayStr}
                    onChange={(e) => {
                      setActivePreset(-1);
                      setDateRange((r) => ({ ...r, from: e.target.value }));
                    }}
                  />
                  <span className="text-slate-300 text-xs">→</span>
                  <input
                    type="date"
                    className="h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                    value={dateRange.to}
                    max={todayStr}
                    min={dateRange.from}
                    onChange={(e) => {
                      setActivePreset(-1);
                      setDateRange((r) => ({ ...r, to: e.target.value }));
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadAll(dateRange.from, dateRange.to)}
              disabled={loading}
              className="h-[42px] shrink-0 rounded-xl px-6 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50 bg-gradient-to-r from-indigo-600 to-indigo-700"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <i className="bx bx-loader-alt animate-spin" /> Cargando...
                </span>
              ) : (
                "Consultar"
              )}
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
            <i className="bx bx-error-circle text-lg" />
            {errorMsg}
          </div>
        )}

        {loading && !data && <ResumenSkeleton />}

        {data && (
          <>
            {/* ── Anuncios ganadores / CTA Meta Ads ── */}
            {adsConectado && winnerAds?.length > 0 && (
              <WinnerAdsPodium ads={winnerAds} />
            )}
            {adsNoConectado && (
              <ConnectAdsCTA onConnect={() => navigate("/conexiones")} />
            )}

            {/* ── PRODUCTOS ── */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[15px] font-bold text-slate-900">
                      Productos vendidos en el periodo
                    </h2>
                    {/* Deja claro que la tabla está filtrada por la pestaña
                        de arriba: en tiendas de un solo canal el otro se ve
                        "vacío" y sin esto parece un error. */}
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                      <i className={`bx ${canalMeta.icon} text-[13px]`} />
                      {canalMeta.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Pedidos en Dropi por producto (sin cancelados) → cuántos
                    confirmó el bot → cuántos se entregaron. Solo del canal{" "}
                    <b>{canalMeta.label}</b> — cámbialo en las pestañas de
                    arriba. Toca la{" "}
                    <i className="bx bx-info-circle align-middle text-slate-300" />{" "}
                    de cada columna para ver su fórmula.
                  </p>
                </div>
                {data.productos?.length > 0 && (
                  <span className="shrink-0 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                    {data.productos.length} productos
                  </span>
                )}
              </div>

              {sortedProducts.length > 0 ? (
                <div className="max-h-[360px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-sm min-w-[760px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                        <th className="px-3 py-3 w-8">#</th>
                        <th className="px-3 py-3">Producto</th>
                        <SortTh
                          label="Pedidos Dropi"
                          k="ordenes"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="Pedidos de este producto que llegaron a Dropi en el periodo, sin contar los cancelados."
                        />
                        <SortTh
                          label="Confirmadas"
                          k="confirmadas"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip={col2Tip}
                        />
                        <SortTh
                          label="Canceladas"
                          k="canceladas"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="Pedidos de este producto que se cancelaron."
                        />
                        <SortTh
                          label="% Conf."
                          k="pctConfirmacion"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip={confTip}
                          formula={confFormula}
                        />
                        <SortTh
                          label="Entregadas"
                          k="entregadas"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="Pedidos de este producto que ya llegaron a manos del cliente."
                        />
                        <SortTh
                          label="Devoluciones"
                          k="devoluciones"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="Pedidos que el cliente no recibió y regresaron. El envío se paga igual, así que restan ganancia."
                        />
                        <SortTh
                          label="% Entrega"
                          k="tasaEntrega"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="De los pedidos que salieron en camino al cliente (sin contar cancelados), qué porcentaje se entregó."
                          formula="entregados ÷ enviados × 100"
                        />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedProducts.map((p, i) => {
                        const img = productImg(p.image);
                        return (
                          <tr
                            key={p.product_id || p.name}
                            className="hover:bg-indigo-50/30 transition"
                          >
                            <td className="px-3 py-2.5 text-[11px] font-bold text-slate-400 tabular-nums">
                              {i + 1}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2.5">
                                {img ? (
                                  <img
                                    src={img}
                                    alt=""
                                    loading="lazy"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      if (e.currentTarget.nextSibling)
                                        e.currentTarget.nextSibling.style.display =
                                          "grid";
                                    }}
                                    className="w-9 h-9 rounded-lg object-cover ring-1 ring-slate-200 shrink-0 bg-slate-50"
                                  />
                                ) : null}
                                <div
                                  className="w-9 h-9 rounded-lg bg-slate-100 place-items-center shrink-0"
                                  style={{ display: img ? "none" : "grid" }}
                                >
                                  <i className="bx bx-image text-slate-300 text-lg" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-800 max-w-[200px] truncate">
                                    {p.name}
                                  </div>
                                  {p.sku && (
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {p.sku}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">
                                {p.ordenes}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums">
                              <span className="inline-flex items-center justify-center gap-1 min-w-[28px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">
                                <i className="bx bx-check text-[13px]" />
                                {fmtNum(p.confirmadas)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums">
                              {p.canceladas > 0 ? (
                                <span className="text-rose-500 font-medium">
                                  {fmtNum(p.canceladas)}
                                </span>
                              ) : (
                                <span className="text-slate-300">0</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {p.pctConfirmacion == null ? (
                                <span className="text-slate-300">—</span>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${confColor(
                                    p.pctConfirmacion,
                                  )}`}
                                >
                                  {fmtPct(p.pctConfirmacion)}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-emerald-600 font-medium">
                              {p.entregadas}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-rose-500 font-medium">
                              {p.devoluciones}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {p.tasaEntrega == null ? (
                                <span className="text-slate-300">—</span>
                              ) : (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    p.tasaEntrega >= 60
                                      ? "bg-emerald-50 text-emerald-700"
                                      : p.tasaEntrega >= 40
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-rose-50 text-rose-700"
                                  }`}
                                >
                                  {fmtPct(p.tasaEntrega)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-14 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 grid place-items-center mb-3">
                    <i className="bx bx-package text-2xl text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium">
                    Sin datos de productos para este rango
                  </p>
                </div>
              )}
            </div>

            {/* ── Charts row: pedidos/mensajes por día + estado de pedidos ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col xl:h-[320px]">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-[15px] font-bold text-slate-900">
                        {chartTitle}
                      </h2>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                        <i className={`bx ${canalMeta.icon} text-[13px]`} />
                        {canalMeta.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {chartSubtitle}
                    </p>
                  </div>
                  {/* Leyenda arriba para que se lea antes del gráfico */}
                  <div className="flex items-center gap-4 text-[11px] flex-wrap">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <span className="w-3.5 h-[3px] rounded-full bg-blue-500" />
                      Conversaciones
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <span className="w-3 h-3 rounded bg-emerald-500" />
                      Guías
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <span className="w-3 h-3 rounded bg-orange-500" />
                      Entregas
                    </span>
                  </div>
                </div>
                {hasCharts ? (
                  // flex-1: el gráfico llena el alto de la card para emparejar
                  // con "Estado de pedidos" y no dejar espacio en blanco.
                  <div className="flex-1 min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={data.dailyChart}
                        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                        barGap={4}
                        barCategoryGap="22%"
                      >
                        <defs>
                          <linearGradient id="gGuias" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#10B981" stopOpacity={0.5} />
                          </linearGradient>
                          <linearGradient id="gEntregas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F97316" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#F97316" stopOpacity={0.5} />
                          </linearGradient>
                          <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(148,163,184,0.14)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="day"
                          tickFormatter={(v) => String(v).slice(5)}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        {/* Un solo eje (antes había dos escalas y confundía) */}
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                          width={30}
                          allowDecimals={false}
                        />
                        <Tooltip
                          content={<ChartTooltip />}
                          cursor={{ fill: "rgba(148,163,184,0.08)" }}
                        />
                        {/* Conversaciones = línea azul con área suave (contexto
                            del volumen de chat detrás de las barras) */}
                        <Area
                          type="monotone"
                          dataKey="conversaciones"
                          name="Conversaciones"
                          stroke="#3B82F6"
                          strokeWidth={2.5}
                          fill="url(#gConv)"
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                        <Bar
                          dataKey={guiasKey}
                          name="Guías"
                          fill="url(#gGuias)"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={18}
                        />
                        <Bar
                          dataKey={entregasKey}
                          name="Entregas"
                          fill="url(#gEntregas)"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={18}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 min-h-[220px] grid place-items-center">
                    <EmptyChart
                      icon="bx-bar-chart-alt-2"
                      text="Selecciona un rango mayor a 1 día para ver la tendencia"
                    />
                  </div>
                )}
              </div>

              {/* Estado de pedidos: donut + % visibles sin hover */}
              <div className="min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col xl:h-[320px]">
                <div className="mb-3">
                  <h2 className="text-[15px] font-bold text-slate-900">
                    Estado de pedidos
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Distribución por estado actual
                  </p>
                </div>
                {statusList.length > 0 ? (
                  // Pastel a la izquierda + estados a la derecha: usa el alto
                  // completo de la tarjeta, así entran sin scroll.
                  <div className="flex-1 min-h-0 flex items-center gap-3 sm:gap-4">
                    <div className="relative w-[130px] h-[130px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusList}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {statusList.map((entry) => (
                              <Cell key={entry.key} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => [
                              `${value} pedidos`,
                              name,
                            ]}
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #e2e8f0",
                              fontSize: 12,
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 grid place-items-center pointer-events-none">
                        <div className="text-center leading-none">
                          <p className="text-lg font-extrabold text-slate-900 tabular-nums">
                            {fmtNum(data.totalPedidos)}
                          </p>
                          <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mt-0.5">
                            pedidos
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 max-h-full overflow-y-auto space-y-1.5 pr-1">
                      {statusList.map((s) => (
                        <div
                          key={s.key}
                          className="flex items-center gap-2 text-[11px]"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: s.fill }}
                          />
                          <span className="text-slate-600 font-medium truncate">
                            {s.name}
                          </span>
                          <span className="ml-auto tabular-nums text-slate-400">
                            {fmtNum(s.value)}
                          </span>
                          <span className="w-9 text-right tabular-nums font-extrabold text-slate-800">
                            {fmtPct(s.pct)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyChart
                    icon="bx-pie-chart-alt-2"
                    text="Sin pedidos en este rango"
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ─── subcomponentes ─── */

/* Anuncios ganadores en formato podio (TOP 1/2/3).
   Sin thumbnail (se ve pixelado): solo la info clave y el enlace
   directo al anuncio cuando existe post_id. La card completa es clic. */

const PODIUM_STYLES = [
  {
    ring: "ring-2 ring-amber-300",
    badge: "bg-gradient-to-r from-amber-400 to-orange-500",
    tag: "TOP 1",
  },
  {
    ring: "ring-1 ring-slate-300",
    badge: "bg-gradient-to-r from-slate-400 to-slate-500",
    tag: "TOP 2",
  },
  {
    ring: "ring-1 ring-orange-200",
    badge: "bg-gradient-to-r from-orange-300 to-amber-400",
    tag: "TOP 3",
  },
];

function WinnerAdsPodium({ ads }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <i className="bx bx-trophy text-amber-500 text-base" />
        <p className="text-[12px] font-bold text-slate-700">
          Anuncios que están generando estas ventas
        </p>
        <span className="text-[10px] text-slate-400 hidden sm:inline">
          · ordenados por lo que ganan frente a lo que gastan
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ads.map((ad, i) => {
          const st = PODIUM_STYLES[i] || PODIUM_STYLES[2];
          const fbUrl = ad.post_id
            ? `https://www.facebook.com/${ad.post_id}`
            : null;
          const roi = Number(ad.roi_estimado || 0);
          const Card = fbUrl ? "a" : "div";
          return (
            <Card
              key={ad.ad_id || i}
              {...(fbUrl
                ? {
                    href: fbUrl,
                    target: "_blank",
                    rel: "noreferrer",
                    title: "Ver anuncio en Facebook",
                  }
                : {})}
              className={`relative block bg-white rounded-2xl border border-slate-200 shadow-sm p-4 transition ${st.ring} ${
                fbUrl ? "hover:shadow-md hover:-translate-y-0.5" : ""
              }`}
            >
              <span
                className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-wide text-white shadow ${st.badge}`}
              >
                {st.tag}
              </span>

              <div className="flex items-center gap-3">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-blue-50 grid place-items-center">
                  <i className="bx bxl-meta text-2xl text-blue-500" />
                </div>
                <div className="min-w-0 flex-1 pr-12">
                  <p className="text-[13px] font-bold text-slate-800 truncate">
                    {ad.ad_name || "(sin nombre)"}
                  </p>
                  {ad.product_attributed && (
                    <p className="text-[10px] text-slate-400 truncate">
                      {ad.product_attributed}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-end justify-between mt-3">
                <div>
                  <p
                    className={`text-lg font-extrabold tabular-nums leading-none ${
                      roi >= 1 ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {roi.toFixed(2)}x
                    <span className="text-[10px] font-semibold text-slate-400 ml-1">
                      retorno
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {fmt$(ad.utilidad_estimada)} utilidad ·{" "}
                    {fmtNum(ad.entregadas_estimadas)} entregadas
                  </p>
                </div>
                {fbUrl && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                    Ver anuncio
                    <i className="bx bx-link-external text-sm" />
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* CTA para vincular Meta Ads cuando la conexión no la tiene */

function ConnectAdsCTA({ onConnect }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1426] via-[#1a1040] to-[#4f46e5] text-white shadow-lg">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-start md:items-center gap-5 px-5 sm:px-6 py-6">
        <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/10 border border-white/15 grid place-items-center">
          <i className="bx bxl-meta text-2xl text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight leading-tight">
            Descubre qué anuncios te hacen ganar dinero
          </h2>
          <p className="text-[12px] text-white/60 mt-1 max-w-xl leading-relaxed">
            Vincula tu cuenta publicitaria de Meta desde la vista de Conexiones
            y verás aquí cuánto vende y cuánto te deja cada anuncio, conectado
            uno a uno con tus entregas reales.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              "Cuánto gana cada anuncio",
              "Tu anuncio ganador",
              "Cada venta conectada a su anuncio",
            ].map((f) => (
              <span
                key={f}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/10 border border-white/15 text-white/80"
              >
                <i className="bx bx-check text-emerald-300 mr-1" />
                {f}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={onConnect}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-slate-900 bg-white hover:bg-blue-50 shadow-lg transition"
        >
          <i className="bx bx-link text-lg text-blue-600" />
          Vincular cuenta publicitaria
        </button>
      </div>
    </div>
  );
}

function SortTh({ label, k, sort, onSort, tip, formula }) {
  const active = sort.key === k;
  return (
    <th
      className="px-3 py-3 text-center cursor-pointer hover:text-indigo-600 transition select-none"
      onClick={() => onSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {tip && <InfoDot text={tip} formula={formula} />}
        <i
          className={`bx text-sm ${
            active
              ? sort.dir === "desc"
                ? "bx-sort-down text-indigo-600"
                : "bx-sort-up text-indigo-600"
              : "bx-sort-alt-2 text-slate-300"
          }`}
        />
      </span>
    </th>
  );
}

function EmptyChart({ icon, text }) {
  return (
    <div className="h-[260px] flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 grid place-items-center mb-3">
          <i className={`bx ${icon} text-2xl text-slate-300`} />
        </div>
        <p className="text-sm text-slate-400 font-medium max-w-[220px]">
          {text}
        </p>
      </div>
    </div>
  );
}
