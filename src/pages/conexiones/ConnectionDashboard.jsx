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
          className={`absolute ${isDown ? "top-full mt-3" : "bottom-full mb-3"} ${posClass} px-4 py-2.5 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-[11px] text-white/90 font-normal shadow-2xl shadow-black/25 z-[9999] pointer-events-none max-w-[280px] whitespace-normal leading-relaxed border border-white/[0.06] backdrop-blur-sm normal-case tracking-normal text-left`}
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
    ...base,
  };
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
  return (
    <div className="rounded-xl bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl px-4 py-3 text-xs">
      <p className="font-bold text-slate-800 mb-2 text-[13px]">{label}</p>
      {payload.map((p) => {
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

  // Tabla productos
  const [prodSort, setProdSort] = useState({
    key: "gananciaNeta",
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

  const sortedProducts = useMemo(() => {
    if (!data?.productos?.length) return [];
    const { key, dir } = prodSort;
    return [...data.productos].sort((a, b) => {
      const va = a[key] == null ? -Infinity : a[key];
      const vb = b[key] == null ? -Infinity : b[key];
      return dir === "desc" ? vb - va : va - vb;
    });
  }, [data, prodSort]);

  const handleProdSort = (key) =>
    setProdSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" },
    );

  const hasCharts = data?.dailyChart?.length > 1;
  const adsConectado = data?.metaAds?.conectado === true;
  const adsNoConectado = data?.metaAds?.conectado === false;

  const HERO_KPIS = view
    ? [
        {
          key: "facturado",
          label: "Facturado",
          tip: "Suma del valor total de los pedidos del canal seleccionado en este periodo.",
          formula: "suma del valor de todos los pedidos",
          sub: `${fmtNum(view.pedidos)} pedidos`,
          icon: "bx-dollar-circle",
          color: "#34d399",
          bg: "rgba(52,211,153,0.1)",
          value: fmt$(view.facturado),
          highlight: "emerald",
        },
        {
          key: "ganancia",
          label: "Utilidad",
          tip: "Lo que ganarías si todos los pedidos del periodo se entregaran.",
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
        },
        {
          key: "pedidos",
          label: "Pedidos",
          tip: "Total de pedidos creados en este periodo para el canal seleccionado.",
          sub: `${fmtNum(view.entregadas)} entregadas`,
          icon: "bx-package",
          color: "#60a5fa",
          bg: "rgba(96,165,250,0.1)",
          value: fmtNum(view.pedidos),
        },
        {
          key: "conversaciones",
          label: "Conversaciones",
          tip:
            canal === "todos"
              ? "Clientes nuevos que escribieron a tu chat en este periodo (todos los canales)."
              : "Personas distintas detrás de los pedidos de este canal (se cruza el teléfono del pedido con tu chat). Puede no coincidir con el número de pedidos: una misma persona puede hacer varios pedidos, y hay pedidos de personas que nunca escribieron al chat.",
          sub:
            canal === "todos"
              ? `${fmtNum(view.mensajes)} mensajes`
              : "clientes únicos con pedido",
          icon: "bx-message-dots",
          color: "#f472b6",
          bg: "rgba(244,114,182,0.1)",
          value: fmtNum(view.conversaciones),
        },
        {
          key: "pctConfirmacion",
          label: "Confirmación",
          tip:
            canal === "shopify"
              ? "De todos los pedidos de Shopify, cuántos ya fueron confirmados por el cliente (dejaron de estar en «pendiente confirmación»)."
              : "De cada 100 conversaciones, cuántas terminaron en un pedido.",
          formula:
            canal === "shopify"
              ? "confirmados ÷ pedidos Shopify × 100"
              : "pedidos ÷ conversaciones × 100",
          sub:
            canal === "shopify"
              ? `${fmtNum(data.canales.shopify.confirmados)} confirmados`
              : `${fmtNum(view.pedidos)} ventas`,
          icon: "bx-check-shield",
          color: "#fbbf24",
          bg: "rgba(251,191,36,0.1)",
          value: fmtPct(view.pctConfirmacion),
        },
        {
          key: "tasaEntrega",
          label: "Tasa entrega",
          tip: "De todos los pedidos del periodo, qué porcentaje ya llegó a manos del cliente.",
          formula: "entregados ÷ pedidos × 100",
          sub: `${fmtNum(view.entregadas)} entregados`,
          icon: "bx-check-double",
          color: "#22d3ee",
          bg: "rgba(34,211,238,0.1)",
          value: fmtPct(view.tasaEntrega),
        },
      ]
    : [];

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

            <div className="flex items-center gap-1 bg-white/[0.06] border border-white/[0.08] rounded-xl p-1">
              {CHANNELS.map((c) => (
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
                  <h2 className="text-[15px] font-bold text-slate-900">
                    Productos vendidos en el periodo
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ingreso y utilidad = solo órdenes{" "}
                    <span className="font-semibold text-emerald-600">
                      entregadas
                    </span>{" "}
                    · toca la{" "}
                    <i className="bx bx-info-circle align-middle text-slate-300" />{" "}
                    de cada columna para ver su fórmula
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
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                        <th className="px-3 py-3 w-8">#</th>
                        <th className="px-3 py-3">Producto</th>
                        <SortTh
                          label="Órdenes"
                          k="ordenes"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="Pedidos del periodo que incluyen este producto, sin importar en qué estado estén."
                        />
                        <SortTh
                          label="Entreg."
                          k="entregadas"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="Pedidos de este producto que ya llegaron a manos del cliente."
                        />
                        <SortTh
                          label="Devol."
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
                        <SortTh
                          label="Convers."
                          k="conversaciones"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="Personas distintas que preguntaron o pidieron este producto en el chat."
                        />
                        <SortTh
                          label="Ingreso"
                          k="ingresoBruto"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="Dinero de las ventas YA ENTREGADAS de este producto. Lo que sigue en camino todavía no cuenta aquí."
                          formula="venta entregada del producto"
                        />
                        <SortTh
                          label="Utilidad"
                          k="gananciaNeta"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="Lo que te queda de las entregas de este producto. Ojo: los envíos incluyen también pedidos en camino y devueltos, porque se pagan aunque no se entreguen."
                          formula="venta − costo proveedor − envíos"
                        />
                        <SortTh
                          label="Margen"
                          k="margenPct"
                          sort={prodSort}
                          onSort={handleProdSort}
                          tip="De cada $100 que vendes entregados, cuántos te quedan de ganancia."
                          formula="utilidad ÷ ingreso × 100"
                        />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedProducts.map((p, i) => {
                        const maxG = sortedProducts[0]?.gananciaNeta || 1;
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
                            <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">
                              {p.conversaciones == null
                                ? "—"
                                : fmtNum(p.conversaciones)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                              {fmt$(p.ingresoBruto)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden hidden lg:block">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                                    style={{
                                      width: `${Math.max(0, Math.min(100, (p.gananciaNeta / maxG) * 100))}%`,
                                    }}
                                  />
                                </div>
                                <span
                                  className={`font-extrabold text-[13px] tabular-nums ${
                                    p.gananciaNeta >= 0
                                      ? "text-emerald-700"
                                      : "text-rose-600"
                                  }`}
                                >
                                  {fmt$(p.gananciaNeta)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                              {p.margenPct == null ? "—" : fmtPct(p.margenPct)}
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
              <div className="xl:col-span-2 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-900">
                      Pedidos y mensajes por día
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Órdenes creadas por canal vs mensajes recibidos cada día
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-500" />
                      WhatsApp
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-violet-500" />
                      Shopify
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-1 rounded-full bg-pink-500" />
                      Mensajes
                    </span>
                  </div>
                </div>
                {hasCharts ? (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={data.dailyChart}
                        margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
                        barGap={2}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(148,163,184,0.12)"
                        />
                        <XAxis
                          dataKey="day"
                          tickFormatter={(v) => String(v).slice(5)}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                          width={30}
                          allowDecimals={false}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 11, fill: "#ec4899" }}
                          axisLine={false}
                          tickLine={false}
                          width={30}
                          allowDecimals={false}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar
                          yAxisId="left"
                          dataKey="pedidos_wa"
                          name="WhatsApp"
                          stackId="ped"
                          fill="#10B981"
                          radius={[0, 0, 0, 0]}
                          maxBarSize={34}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="pedidos_shopify"
                          name="Shopify"
                          stackId="ped"
                          fill="#8B5CF6"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={34}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="mensajes"
                          name="Mensajes"
                          stroke="#ec4899"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart
                    icon="bx-bar-chart-alt-2"
                    text="Selecciona un rango mayor a 1 día para ver la tendencia"
                  />
                )}
              </div>

              {/* Estado de pedidos: donut + % visibles sin hover */}
              <div className="min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
                <div className="mb-3">
                  <h2 className="text-[15px] font-bold text-slate-900">
                    Estado de pedidos
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Distribución por estado actual
                  </p>
                </div>
                {statusList.length > 0 ? (
                  <>
                    <div className="relative h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusList}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={68}
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
                          <p className="text-xl font-extrabold text-slate-900 tabular-nums">
                            {fmtNum(data.totalPedidos)}
                          </p>
                          <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mt-1">
                            pedidos
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2 max-h-[190px] overflow-y-auto pr-1">
                      {statusList.map((s) => (
                        <div key={s.key}>
                          <div className="flex items-center gap-2 text-[11px]">
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
                            <span className="w-11 text-right tabular-nums font-extrabold text-slate-800">
                              {fmtPct(s.pct)}
                            </span>
                          </div>
                          <div className="mt-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, s.pct)}%`,
                                background: s.fill,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
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
