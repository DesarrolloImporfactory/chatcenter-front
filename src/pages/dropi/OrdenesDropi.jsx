import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import AutoOrdenesFallidas from "./AutoOrdenesFallidas";

const RESULT_NUMBER_OPTIONS = [10, 20, 40, 60, 80, 99];

/* Imágenes de producto Dropi vienen relativas al CDN */
const DROPI_IMG_BASE = "https://d39ru7awumhhs2.cloudfront.net/";
function productImg(image) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  return `${DROPI_IMG_BASE}${String(image).replace(/^\/+/, "")}`;
}

const STATUS_OPTIONS = [
  { id: "", name: "Todos" },
  // ── Estados Dropi internos ──
  { id: "PENDIENTE CONFIRMACION", name: "Pendiente confirmación" },
  { id: "PENDIENTE", name: "Pendiente" },
  { id: "GUIA_GENERADA", name: "Guía generada" },
  { id: "GUIA_ANULADA", name: "Guía anulada" },
  { id: "CANCELADO", name: "Cancelado" },
  { id: "RECHAZADO", name: "Rechazado" },
  { id: "ENTREGADO", name: "Entregado" },
  { id: "DEVOLUCION", name: "Devolución" },
  { id: "NOVEDAD SOLUCIONADA", name: "Novedad solucionada" },
  {
    id: "PREPARADO PARA TRANSPORTADORA",
    name: "Preparado para transportadora",
  },
  { id: "INDEMNIZADA POR DROPI", name: "Indemnizada por Dropi" },
  { id: "DEVOLUCION EN TRANSITO", name: "Devolución en tránsito" },
  { id: "ENTREGADO A TRANSPORTADORA", name: "Entregado a transportadora" },
  { id: "EN BODEGA DROPI", name: "En bodega Dropi" },
  { id: "RECOGIDO POR DROPI", name: "Recogido por Dropi" },
  { id: "RECIBIDO PAU", name: "Recibido PAU" },
  { id: "RECIBIDO POR DROPI", name: "Recibido por Dropi" },
  { id: "FINALIZADO POR RETENCION", name: "Finalizado por retención" },
  { id: "PROCESO FINALIZADO", name: "Proceso finalizado" },
  { id: "POR RECOLECTAR", name: "Por recolectar" },
  // ── Estados transportadora ──
  { id: "EN BODEGA", name: "En bodega" },
  { id: "ZONA DE ENTREGA", name: "Zona de entrega" },
  { id: "ZONA DE ENTREGA DEVOLUCIÓN", name: "Zona de entrega devolución" },
  { id: "EN TRÁNSITO", name: "En tránsito" },
  { id: "CON NOVEDAD", name: "Con novedad" },
  { id: "DEVOLUCIÓN / ENTREGA", name: "Devolución / Entrega" },
  { id: "ENVÍO LISTO EN OFICINA", name: "Envío listo en oficina" },
  { id: "NOVEDAD", name: "Novedad" },
  { id: "ASIGNADO", name: "Asignado" },
  {
    id: "CERTIFICACION DE PRUEBA DE ENTREGA",
    name: "Certificación prueba de entrega",
  },
  {
    id: "CERTIFICACION DEVOLUCION AL REMITENTE",
    name: "Certificación devolución al remitente",
  },
  { id: "DESAPLICADO", name: "Desaplicado" },
  { id: "DEVUELTO", name: "Devuelto" },
  { id: "EMBARCANDO", name: "Embarcando" },
  { id: "EN DISTRIBUCION A CLIENTE", name: "En distribución a cliente" },
  {
    id: "EN DISTRIBUCION PARA ENTREGA EN AGENCIA",
    name: "En distribución entrega en agencia",
  },
  { id: "EN RUTA", name: "En ruta" },
  { id: "ENTREGA DIGITALIZADA", name: "Entrega digitalizada" },
  { id: "GENERADO CLIENTE CORPORATIVO", name: "Generado cliente corporativo" },
  { id: "INGRESANDO", name: "Ingresando" },
  { id: "INGRESO A CONFIRMACION", name: "Ingreso a confirmación" },
  {
    id: "INVENTARIO EN CENTRO LOGISTICO",
    name: "Inventario en centro logístico",
  },
  { id: "RECOLECTADO", name: "Recolectado" },
  { id: "REPORTADO ENTREGADO", name: "Reportado entregado" },
  { id: "TRASLADO A CENTRO LOGISTICO", name: "Traslado a centro logístico" },
  { id: "DESTINATARIO FALLECIDO", name: "Destinatario fallecido" },
  {
    id: "EN ESPERA DE FIRMA DE DOCUMENTOS TC",
    name: "En espera firma documentos TC",
  },
  {
    id: "DEVOLUCION DE DISTRIBUCION CLIENTE SOLICITA RETIRAR EN CS",
    name: "Devolución distribución — retiro en CS",
  },
  {
    id: "PARA RETIRO EN AGENCIA SERVIENTREGA",
    name: "Retiro en agencia Servientrega",
  },
  { id: "GENERADO", name: "Generado" },
  { id: "PROCESAMIENTO", name: "Procesamiento" },
  { id: "DEVOLUCION AL REMITENTE", name: "Devolución al remitente" },
  { id: "GENERADA", name: "Generada" },
  { id: "PICKING", name: "Picking" },
  { id: "PACKING", name: "Packing" },
  { id: "EN REPARTO", name: "En reparto" },
  { id: "ENTREGADA GINTRACOM", name: "Entregada Gintracom" },
  { id: "DEVOLUCIÓN", name: "Devolución" },
  {
    id: "DEVOLUCIÓN ENTREGADA A ORIGEN",
    name: "Devolución entregada a origen",
  },
  { id: "CANCELADA POR TRANSPORTADORA", name: "Cancelada por transportadora" },
  { id: "INDEMNIZACIÓN", name: "Indemnización" },
  { id: "ANULADA", name: "Anulada" },
  { id: "NOVEDAD EN GESTION", name: "Novedad en gestión" },
  {
    id: "DESTINATARIO RE-PROGRAMA FECHA DE ENTREGA",
    name: "Destinatario reprograma fecha",
  },
  {
    id: "DESTINATARIO SOLICITA CAMBIO DE DIRECCIÓN",
    name: "Destinatario cambio dirección",
  },
  {
    id: "FUERA DE COBERTURA, NO COINCIDE LA CIUDAD REAL DESTINO CON LA CIUDAD INGRESADA",
    name: "Fuera de cobertura",
  },
  {
    id: "MERCANCÍA CON AVERÍA EN REPARTO. INDEMNIZACIÓN",
    name: "Mercancía avería — indemnización",
  },
  {
    id: "MERCANCIA HURTADA EN REPARTO. INDEMNIZACIÓN",
    name: "Mercancía hurtada — indemnización",
  },
  { id: "OBSTRUCCIÓN EN LA VÍA PÚBLICA", name: "Obstrucción en vía pública" },
  { id: "PROBLEMAS DE ORDEN PÚBLICO", name: "Problemas de orden público" },
  {
    id: "SE REALIZA VISITA A DESTINATARIO RE-PROGRAMA FECHA DE ENTREGA",
    name: "Visita destinatario — reprograma",
  },
  { id: "ACCIDENTE EN CARRETERA", name: "Accidente en carretera" },
  { id: "SOLUCION APROBADA", name: "Solución aprobada" },
  { id: "SOLUCION INCORRECTA", name: "Solución incorrecta" },
  { id: "EN BODEGA ORIGEN", name: "En bodega origen" },
  { id: "EN CAMINO", name: "En camino" },
  { id: "RECOLECCION", name: "Recolección" },
  { id: "RECOGIDO", name: "Recogido" },
  { id: "EN TRANSITO", name: "En tránsito" },
  { id: "BODEGA DESTINO", name: "Bodega destino" },
  { id: "SINIESTRO", name: "Siniestro" },
  { id: "INCAUTADO", name: "Incautado" },
  { id: "EN PROCESO DE DEVOLUCION", name: "En proceso de devolución" },
  { id: "RECIBIDO PUNTO DE VENTA", name: "Recibido punto de venta" },
  {
    id: "TRANSITO A DEVOLUCION PROVEEDOR",
    name: "Tránsito devolución proveedor",
  },
  { id: "NOVEDAD DEVOLUCION", name: "Novedad devolución" },
  { id: "DEVOLUCION EN BODEGA", name: "Devolución en bodega" },
  { id: "DEVOLUCION EN RUTA", name: "Devolución en ruta" },
];

const ORIGEN_OPTIONS = [
  { id: "", name: "Todos" },
  { id: "imporsuit", name: "WhatsApp (ImporChat)" },
  { id: "shopify", name: "Shopify" },
  { id: "otros", name: "Otros sistemas" },
];

const StatusDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return STATUS_OPTIONS;
    const s = search.toLowerCase();
    return STATUS_OPTIONS.filter(
      (o) => o.name.toLowerCase().includes(s) || o.id.toLowerCase().includes(s),
    );
  }, [search]);

  const selected = STATUS_OPTIONS.find((o) => o.id === value);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex flex-col h-full" ref={ref}>
      <label className="text-sm font-semibold text-gray-700">
        Estado del envío
      </label>

      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setSearch("");
        }}
        className="mt-1 w-full px-4 py-2 border rounded-xl bg-white text-left text-sm focus:outline-none focus:ring-2 focus:ring-[#171931] flex items-center justify-between gap-2"
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {selected?.name || "Todos"}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div className="mt-1 text-xs opacity-0 select-none">.</div>

      {open && (
        <div className="relative z-50">
          <div className="absolute top-0 left-0 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar estado..."
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#171931] transition"
              />
            </div>

            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-400 text-center">
                  Sin resultados
                </div>
              ) : (
                filtered.map((o, idx) => {
                  const isActive = o.id === value;
                  return (
                    <button
                      key={`${o.id}-${idx}`}
                      type="button"
                      onClick={() => {
                        onChange(o.id);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition ${
                        isActive
                          ? "bg-[#171931] text-white"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {o.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── celdas auxiliares ─── */

function OrigenBadge({ shopType, shopName }) {
  const st = String(shopType || "").toUpperCase();
  if (st === "IMPORSUIT") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <i className="bx bxl-whatsapp text-sm" />
        WhatsApp
      </span>
    );
  }
  if (st === "SHOPIFY") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
        <i className="bx bxl-shopify text-sm" />
        Shopify
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200"
      title={shopName || undefined}
    >
      <i className="bx bx-store-alt text-sm" />
      {st ? st.charAt(0) + st.slice(1).toLowerCase() : "Otro"}
    </span>
  );
}

function EstadoPedidoBadge({ estado, porBot }) {
  const confirmado = estado === "confirmado";
  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border ${
          confirmado
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-amber-50 text-amber-700 border-amber-200"
        }`}
      >
        <i className={`bx ${confirmado ? "bx-check-shield" : "bx-time-five"} text-sm`} />
        {confirmado ? "Confirmado" : "Pend. confirmación"}
      </span>
      {porBot && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100">
          <i className="bx bx-bot text-xs" />
          creado por el bot
        </span>
      )}
    </div>
  );
}

/* Estado del contacto (columna kanban del chat) en formato legible */
function prettyContacto(tray) {
  const t = String(tray || "").trim();
  if (!t || t === "No hay conversación") return null;
  return t
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

const OrdenesDropi = () => {
  const navigate = useNavigate();
  const [id_configuracion, setId_configuracion] = useState(null);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [syncInfo, setSyncInfo] = useState(null);
  const [sinIntegracion, setSinIntegracion] = useState(false);

  // =========================
  // PAGINACIÓN
  // =========================
  const [page, setPage] = useState(1);
  const [resultNumber, setResultNumber] = useState(10);

  // =========================
  // FILTROS
  // =========================
  const [textToSearch, setTextToSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateUntil, setDateUntil] = useState("");
  const [status, setStatus] = useState("");
  const [origen, setOrigen] = useState("");

  // =========================
  // HELPERS FECHA (YYYY-MM-DD)
  // =========================
  const toYMD = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDefaultRange = useCallback(() => {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 8);
    return { from: toYMD(from), until: toYMD(today) };
  }, []);

  const fmtDateTime = (val) => {
    if (!val) return "";
    if (typeof val === "string" && val.includes("/")) return val;
    const d = new Date(val);
    if (!isFinite(d.getTime())) return String(val);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} - ${hh}:${min}`;
  };

  // =========================
  // INIT
  // =========================
  useEffect(() => {
    const idc = localStorage.getItem("id_configuracion");
    if (idc) setId_configuracion(parseInt(idc, 10));
  }, []);

  useEffect(() => {
    const { from, until } = getDefaultRange();
    setDateFrom(from);
    setDateUntil(until);
  }, [getDefaultRange]);

  // =========================
  // DEBOUNCE SEARCH
  // =========================
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(textToSearch), 400);
    return () => clearTimeout(t);
  }, [textToSearch]);

  // =========================
  // QUERY (cache local del back — NO golpea la API de Dropi)
  // =========================
  const query = useMemo(() => {
    if (!id_configuracion) return null;
    if ((dateFrom && !dateUntil) || (!dateFrom && dateUntil)) {
      return { invalidDate: true };
    }
    return {
      id_configuracion,
      page,
      page_size: resultNumber,
      from: dateFrom && dateUntil ? dateFrom : undefined,
      until: dateFrom && dateUntil ? dateUntil : undefined,
      status: String(status || "").trim() || undefined,
      origen: String(origen || "").trim() || undefined,
      textToSearch: String(debouncedSearch || "").trim() || undefined,
    };
  }, [
    id_configuracion,
    page,
    resultNumber,
    dateFrom,
    dateUntil,
    status,
    origen,
    debouncedSearch,
  ]);

  // =========================
  // FETCH (anti-duplicados)
  // =========================
  const inFlightRef = useRef(false);
  const lastKeyRef = useRef("");

  const fetchOrders = useCallback(async (body, { asRefresh = false } = {}) => {
    if (asRefresh) setRefreshing(true);
    else setOrdersLoading(true);
    try {
      const res = await chatApi.post(
        "dropi_integrations/orders/cache/list",
        body,
      );
      const data = res?.data?.data || {};
      setOrders(Array.isArray(data.rows) ? data.rows : []);
      setTotal(Number(data.total || 0));
      setTotalPages(Number(data.total_pages || 1));
      setSyncInfo(data.sync || null);
      setSinIntegracion(data.sin_integracion === true);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "No se pudieron cargar las órdenes.";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
        confirmButtonColor: "#d33",
      });
    } finally {
      setOrdersLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!query) return;

    if (query.invalidDate) {
      Swal.fire({
        icon: "warning",
        title: "Rango de fechas incompleto",
        text: "Seleccione fecha desde y hasta para aplicar el filtro.",
        confirmButtonColor: "#171931",
      });
      return;
    }

    const key = JSON.stringify(query);
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    fetchOrders(query).finally(() => {
      inFlightRef.current = false;
    });
  }, [query, fetchOrders]);

  // Botón Actualizar: fuerza sync contra Dropi (protegido en el back por
  // locks + skip de 10 min, imposible tumbar la API) y recarga.
  const handleRefresh = useCallback(() => {
    if (!query || query.invalidDate || refreshing) return;
    fetchOrders({ ...query, force_sync: true }, { asRefresh: true });
  }, [query, refreshing, fetchOrders]);

  // =========================
  // UI HELPERS
  // =========================
  const handleSearchClick = () => {
    setPage(1);
    lastKeyRef.current = "";
    if (query && !query.invalidDate) fetchOrders({ ...query, page: 1 });
  };

  const handleClear = () => {
    const { from, until } = getDefaultRange();
    setTextToSearch("");
    setStatus("");
    setOrigen("");
    setDateFrom(from);
    setDateUntil(until);
    setPage(1);
  };

  // Abrir chat en pestaña NUEVA con el id del cliente en la URL
  // (misma lógica que Contactos/TablaContactos).
  const CHAT_ROUTE = "/chat";
  const openChatById = useCallback((cOrId) => {
    const chatId =
      typeof cOrId === "object"
        ? (cOrId?.id_cliente_chat_center ?? cOrId?.chat_id_cliente ?? cOrId?.id)
        : cOrId;

    if (!chatId) return;

    window.open(`${CHAT_ROUTE}/${chatId}`, "_blank", "noopener,noreferrer");
  }, []);

  const ChatButton = ({ onClick, disabled = false }) => (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
      inline-flex h-9 w-9 items-center justify-center
      rounded-full shadow-sm transition
      focus:outline-none focus:ring-4 focus:ring-emerald-200
      ${
        disabled
          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : "bg-emerald-600 text-white hover:bg-emerald-700"
      }
    `}
      title={disabled ? "No hay conversación" : "Abrir chat"}
      aria-label={disabled ? "No hay conversación" : "Abrir chat"}
    >
      <i className="bx bxs-chat text-[18px]" />
    </button>
  );

  // =========================
  // BADGE COLOR POR ESTADO DE ENVÍO
  // =========================
  const getStatusBadgeClass = useCallback((s) => {
    const st = String(s || "")
      .trim()
      .toUpperCase();

    if (st.includes("ENTREGADO") || st.includes("ENTREGADA"))
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (
      st.includes("DEVOLUCION") ||
      st.includes("DEVOLUCIÓN") ||
      st.includes("DEVUELTO")
    )
      return "bg-orange-50 text-orange-700 border border-orange-200";
    if (
      st.includes("CANCELAD") ||
      st.includes("ANULADA") ||
      st.includes("RECHAZADO")
    )
      return "bg-rose-50 text-rose-700 border border-rose-200";
    if (st.includes("NOVEDAD") || st.includes("SOLUCION"))
      return "bg-purple-50 text-purple-700 border border-purple-200";
    if (st.includes("PENDIENTE"))
      return "bg-amber-50 text-amber-700 border border-amber-200";
    if (st.includes("GUIA"))
      return "bg-blue-50 text-blue-700 border border-blue-200";
    if (
      st.includes("TRANSITO") ||
      st.includes("TRÁNSITO") ||
      st.includes("RUTA") ||
      st.includes("CAMINO") ||
      st.includes("REPARTO")
    )
      return "bg-sky-50 text-sky-700 border border-sky-200";
    if (
      st.includes("BODEGA") ||
      st.includes("INVENTARIO") ||
      st.includes("RECOLECT") ||
      st.includes("RECOGIDO") ||
      st.includes("RECIBIDO")
    )
      return "bg-indigo-50 text-indigo-700 border border-indigo-200";
    if (
      st.includes("INDEMNIZ") ||
      st.includes("SINIESTRO") ||
      st.includes("HURTAD") ||
      st.includes("AVERÍA") ||
      st.includes("INCAUTADO")
    )
      return "bg-red-50 text-red-700 border border-red-200";
    if (
      st.includes("PREPARADO") ||
      st.includes("PICKING") ||
      st.includes("PACKING") ||
      st.includes("EMBARCANDO") ||
      st.includes("GENERADO") ||
      st.includes("GENERADA") ||
      st.includes("ASIGNADO")
    )
      return "bg-cyan-50 text-cyan-700 border border-cyan-200";

    return "bg-slate-50 text-slate-700 border border-slate-200";
  }, []);

  return (
    <div className="p-5">
      {/* HEADER */}
      <div className="mb-6 rounded-2xl bg-[#171931] text-white p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Gestión de Pedidos
            </h1>
            <p className="opacity-90 mt-1 text-sm">
              Todos tus pedidos con su conversación, producto, estado y origen.
            </p>
            {syncInfo && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-white/60">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    syncInfo.syncing
                      ? "bg-amber-400 animate-pulse"
                      : "bg-emerald-400"
                  }`}
                />
                {syncInfo.syncing
                  ? "Sincronizando con Dropi en segundo plano…"
                  : syncInfo.ageMinutes != null
                    ? `Datos actualizados hace ${syncInfo.ageMinutes} min`
                    : "Datos del cache local"}
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing || ordersLoading}
                  className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/80 hover:bg-white/20 transition disabled:opacity-50"
                >
                  <i
                    className={`bx bx-refresh text-sm ${refreshing ? "animate-spin" : ""}`}
                  />
                  Actualizar
                </button>
              </div>
            )}
          </div>
          {!sinIntegracion && (
            <AutoOrdenesFallidas
              id_configuracion={id_configuracion}
              onOrderCreated={() => {
                lastKeyRef.current = "";
                setPage(1);
              }}
            />
          )}
        </div>
      </div>

      {/* Sin plataforma conectada: vista de invitación (no error) */}
      {sinIntegracion ? (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#FF6B35] via-amber-400 to-violet-500" />
          <div className="px-8 py-14 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 grid place-items-center mb-4">
              <i className="bx bx-package text-3xl text-slate-400" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-2">
              Conecta tu plataforma de pedidos
            </h3>
            <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
              Aquí verás todos tus pedidos con su conversación, producto,
              estado del envío y origen — todo en un solo lugar. Vincula una
              plataforma para empezar.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
              {/* Dropi */}
              <div className="rounded-2xl border border-slate-200 p-5 text-left hover:shadow-md transition">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-xl grid place-items-center bg-orange-50">
                    <i className="bx bx-store text-xl text-[#FF6B35]" />
                  </div>
                  <span className="font-bold text-slate-800">Dropi</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Sincroniza tus órdenes, guías y estados de envío
                  automáticamente.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/dropi")}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition active:scale-[0.98]"
                  style={{
                    background:
                      "linear-gradient(135deg, #FF6B35 0%, #e5551f 100%)",
                  }}
                >
                  Vincular Dropi
                </button>
              </div>

              {/* Shopify */}
              <div className="rounded-2xl border border-slate-200 p-5 text-left hover:shadow-md transition">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-xl grid place-items-center bg-violet-50">
                    <i className="bx bxl-shopify text-xl text-violet-600" />
                  </div>
                  <span className="font-bold text-slate-800">Shopify</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Recibe los pedidos de tu tienda y recupera carritos
                  abandonados por WhatsApp.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/shopify")}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 transition active:scale-[0.98]"
                >
                  Conectar Shopify
                </button>
              </div>
            </div>

            <p className="mt-6 text-[11px] text-slate-400">
              Muy pronto: más plataformas conectadas a este mismo módulo.
            </p>
          </div>
        </div>
      ) : (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="mt-4 grid grid-cols-1 md:grid-cols-7 gap-3 items-start">
          {/* Buscar cliente */}
          <div className="flex flex-col h-full">
            <label className="text-sm font-semibold text-gray-700">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Cliente, teléfono, guía, producto…"
              className="mt-1 w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#171931]"
              value={textToSearch}
              onChange={(e) => {
                setPage(1);
                setTextToSearch(e.target.value);
              }}
            />
            <p className="text-xs text-gray-400 mt-1">
              Busca automáticamente mientras escribe.
            </p>
          </div>

          {/* Desde */}
          <div className="flex flex-col h-full">
            <label className="text-sm font-semibold text-gray-700">Desde</label>
            <input
              type="date"
              className="mt-1 w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#171931]"
              value={dateFrom}
              onChange={(e) => {
                setPage(1);
                setDateFrom(e.target.value);
              }}
            />
            <div className="mt-1 text-xs opacity-0 select-none">.</div>
          </div>

          {/* Hasta */}
          <div className="flex flex-col h-full">
            <label className="text-sm font-semibold text-gray-700">Hasta</label>
            <input
              type="date"
              className="mt-1 w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#171931]"
              value={dateUntil}
              onChange={(e) => {
                setPage(1);
                setDateUntil(e.target.value);
              }}
            />
            <div className="mt-1 text-xs opacity-0 select-none">.</div>
          </div>

          {/* Estado del envío */}
          <StatusDropdown
            value={status}
            onChange={(val) => {
              setPage(1);
              setStatus(val);
            }}
          />

          {/* Origen */}
          <div className="flex flex-col h-full">
            <label className="text-sm font-semibold text-gray-700">
              Origen
            </label>
            <select
              className="mt-1 w-full px-4 py-2 border rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#171931]"
              value={origen}
              onChange={(e) => {
                setPage(1);
                setOrigen(e.target.value);
              }}
            >
              {ORIGEN_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs opacity-0 select-none">.</div>
          </div>

          {/* Botón Buscar */}
          <div className="flex flex-col h-full">
            <label className="text-sm font-semibold text-gray-700 opacity-0 select-none">
              Buscar
            </label>
            <button
              onClick={handleSearchClick}
              className="mt-1 bg-[#171931] text-white hover:opacity-95 transition px-4 py-2 rounded-xl text-sm font-semibold shadow w-full"
              disabled={ordersLoading}
            >
              {ordersLoading ? "Cargando..." : "Buscar"}
            </button>
            <div className="mt-1 text-xs opacity-0 select-none">.</div>
          </div>

          {/* Botón Limpiar */}
          <div className="flex flex-col h-full">
            <label className="text-sm font-semibold text-gray-700 opacity-0 select-none">
              Limpiar
            </label>
            <button
              onClick={handleClear}
              className="mt-1 bg-gray-200 text-gray-800 hover:bg-gray-300 transition px-4 py-2 rounded-xl text-sm font-semibold shadow w-full"
              disabled={ordersLoading}
            >
              Limpiar
            </button>
            <div className="mt-1 text-xs opacity-0 select-none">.</div>
          </div>
        </div>

        {/* Alerta: teléfonos incompletos en esta página */}
        {!ordersLoading && orders.some((o) => o?.telefono_incompleto) && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <i className="bx bxs-error text-lg shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">
                {orders.filter((o) => o?.telefono_incompleto).length} pedido(s)
                con teléfono incompleto.
              </span>{" "}
              La transportadora no podrá contactar a esos clientes. El número
              correcto aparece debajo de cada teléfono marcado en rojo —
              corrígelo en Dropi para evitar novedades y devoluciones.
            </div>
          </div>
        )}

        {/* TABLA */}
        <div className="mt-6 overflow-auto rounded-xl border border-gray-100">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold"># Orden</th>
                <th className="text-left px-4 py-3 font-semibold">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold">
                  Estado del contacto
                </th>
                <th className="text-left px-4 py-3 font-semibold">Agente</th>
                <th className="text-left px-4 py-3 font-semibold">Producto</th>
                <th className="text-left px-4 py-3 font-semibold">
                  Estado del pedido
                </th>
                <th className="text-left px-4 py-3 font-semibold">
                  Estado del envío
                </th>
                <th className="text-left px-4 py-3 font-semibold">Origen</th>
                <th className="px-4 py-3 font-semibold text-center">Chat</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {ordersLoading ? (
                /* skeleton */
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-3 rounded bg-gray-100 w-full max-w-[140px]" />
                        {j === 1 && (
                          <div className="h-2 mt-2 rounded bg-gray-100 w-24" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={9}>
                    No se encontraron órdenes con esos filtros.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const fullName =
                    `${o?.name ?? ""} ${o?.surname ?? ""}`.trim() ||
                    "Sin nombre";
                  const contacto = prettyContacto(o?.tray);
                  const hasAgent =
                    o?.agent_assigned && o.agent_assigned !== "Sin agente";
                  const prods = Array.isArray(o?.productos) ? o.productos : [];
                  const p0 = prods[0] || null;
                  const img =
                    p0?.imagen_catalogo || productImg(p0?.image) || null;
                  const prodNames =
                    prods.map((p) => p.name).filter(Boolean).join(" + ") || "-";

                  return (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        #{o.id}
                      </td>

                      {/* Cliente + fecha (columna compacta) */}
                      <td className="px-4 py-3 text-gray-700">
                        <div className="font-semibold text-gray-900">
                          {fullName}
                        </div>
                        <div
                          className={`text-xs ${
                            o?.telefono_incompleto
                              ? "text-red-600 font-semibold"
                              : "text-gray-500"
                          }`}
                        >
                          {o?.phone ? `Tel: ${o.phone}` : "Tel: Sin teléfono"}
                          {o?.telefono_incompleto && (
                            <i
                              className="bx bxs-error align-middle ml-1"
                              title="A este teléfono le faltan dígitos: la transportadora no podrá contactar al cliente."
                            />
                          )}
                        </div>
                        {o?.telefono_incompleto && (
                          <div className="text-xs mt-0.5">
                            {o?.telefono_sugerido ? (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold"
                                title={
                                  o?.telefono_sugerido_fuente === "contacto"
                                    ? "Número completo tomado del chat de WhatsApp de este cliente"
                                    : "Número completo tomado de la orden original de este pedido"
                                }
                              >
                                <i className="bx bx-phone-call text-sm" />
                                Correcto: {o.telefono_sugerido}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-semibold">
                                <i className="bx bx-error-circle text-sm" />
                                Teléfono incompleto
                              </span>
                            )}
                          </div>
                        )}
                        {o?.email ? (
                          <div className="text-xs text-gray-500">{o.email}</div>
                        ) : null}
                        <div className="text-xs text-gray-500">
                          Guía: {o?.shipping_guide || "Sin guía"}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          <i className="bx bx-calendar align-middle mr-0.5" />
                          Creado: {fmtDateTime(o?.order_created_at)}
                        </div>
                      </td>

                      {/* Estado del contacto */}
                      <td className="px-4 py-3">
                        {contacto ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <i className="bx bx-columns text-sm" />
                            {contacto}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Sin conversación
                          </span>
                        )}
                      </td>

                      {/* Agente (sin asignar + hay chat → Bot).
                          max-w + break-words: el nombre largo hace salto de
                          línea en vez de estirar la columna. */}
                      <td className="px-4 py-3 text-gray-700">
                        {hasAgent ? (
                          <span className="inline-flex items-start gap-1.5 max-w-[120px]">
                            <i className="bx bx-user-circle text-base text-gray-400 shrink-0 mt-0.5" />
                            <span className="whitespace-normal break-words leading-tight text-xs">
                              {o.agent_assigned}
                            </span>
                          </span>
                        ) : o?.has_chat ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <i className="bx bx-bot text-sm" />
                            Bot
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Producto con imagen */}
                      <td className="px-4 py-3 text-gray-700">
                        <div className="flex items-center gap-2.5">
                          {img ? (
                            <img
                              src={img}
                              alt=""
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                              className="w-10 h-10 rounded-lg object-cover ring-1 ring-gray-200 shrink-0 bg-gray-50"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 grid place-items-center shrink-0">
                              <i className="bx bx-package text-gray-300 text-lg" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="line-clamp-2 max-w-[200px]">
                              {prodNames}
                            </div>
                            {p0?.sku ? (
                              <div className="text-[10px] text-gray-400 font-mono">
                                {p0.sku}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Estado del pedido */}
                      <td className="px-4 py-3">
                        <EstadoPedidoBadge
                          estado={o?.estado_pedido}
                          porBot={!!o?.creado_por_bot}
                        />
                      </td>

                      {/* Estado del envío */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                            o?.status,
                          )}`}
                        >
                          <span className="h-2 w-2 rounded-full bg-current opacity-60" />
                          {o?.status || "-"}
                        </span>
                      </td>

                      {/* Origen */}
                      <td className="px-4 py-3">
                        <OrigenBadge
                          shopType={o?.shop_type}
                          shopName={o?.shop_name}
                        />
                      </td>

                      <td className="px-4 py-3 text-center">
                        <ChatButton
                          disabled={!o?.has_chat || !o?.chat_id_cliente}
                          onClick={() => openChatById(o)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER: total real + paginación */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Mostrar</span>
              <select
                className="px-3 py-1.5 border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#171931]"
                value={resultNumber}
                onChange={(e) => {
                  setPage(1);
                  setResultNumber(Number(e.target.value));
                }}
                disabled={ordersLoading}
              >
                {RESULT_NUMBER_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-gray-400 text-xs">
              {total.toLocaleString()} pedidos encontrados
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                page <= 1 || ordersLoading
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              disabled={ordersLoading || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹ Anterior
            </button>

            <span className="px-3 py-1.5 rounded-lg bg-[#171931] text-white text-sm font-semibold min-w-[110px] text-center">
              Página {page} de {totalPages}
            </span>

            <button
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                page >= totalPages || ordersLoading
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              disabled={ordersLoading || page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente ›
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default OrdenesDropi;
