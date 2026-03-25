import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import { useNavigate } from "react-router-dom";

const RESULT_NUMBER_OPTIONS = [10, 50, 100, 200, 500, 1000];

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

const OrdenesDropi = () => {
  const [id_configuracion, setId_configuracion] = useState(null);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [totalResults, setTotalResults] = useState(0);

  // =========================
  // PAGINACIÓN (Dropi: start + result_number)
  // =========================
  const [page, setPage] = useState(1);
  const [resultNumber, setResultNumber] = useState(10);

  const start = useMemo(() => (page - 1) * resultNumber, [page, resultNumber]);

  const totalPages = useMemo(() => {
    const t = Number(totalResults) || 0;
    return Math.max(1, Math.ceil(t / resultNumber));
  }, [totalResults, resultNumber]);

  // =========================
  // FILTROS
  // =========================
  const [textToSearch, setTextToSearch] = useState("");
  const [filterDateBy, setFilterDateBy] = useState("FECHA DE CREADO");
  const [dateFrom, setDateFrom] = useState("");
  const [dateUntil, setDateUntil] = useState("");
  const [status, setStatus] = useState("");

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
  // INIT id_configuracion
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
  // DEBOUNCE SOLO PARA SEARCH
  // =========================
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(textToSearch), 400);
    return () => clearTimeout(t);
  }, [textToSearch]);

  // =========================
  // MAPPER: respuesta Dropi -> fila UI
  // =========================
  const mapOrderToRow = useCallback((o) => {
    const details = Array.isArray(o?.orderdetails) ? o.orderdetails : [];
    const firstProduct = details[0]?.product || null;

    const productName =
      details
        .map((d) => d?.product?.name)
        .filter(Boolean)
        .join(" + ") || "-";

    return {
      id: o?.id,
      name: o?.name ?? "",
      surname: o?.surname ?? "",
      phone: o?.phone ?? "",
      email: o?.client_email ?? o?.email ?? "",

      has_chat: !!o?.has_chat,
      tray: o?.tray ?? "",
      agent_assigned: o?.agent_assigned ?? "",

      chat_id_cliente: o?.chat_id_cliente ?? null,
      id_cliente_chat_center: o?.id_cliente_chat_center ?? null,

      product_name: productName,
      sku: firstProduct?.sku ?? "",

      created_at: o?.created_at ?? null,
      status: o?.status ?? "",

      guia: o?.shipping_guide ?? "",
      shipping_company: o?.shipping_company ?? "",
      distribution_company: o?.distribution_company?.name ?? "",
      total_order: o?.total_order ?? 0,
    };
  }, []);

  // =========================
  // QUERY (una sola fuente de verdad)
  // =========================
  const query = useMemo(() => {
    if (!id_configuracion) return null;

    if ((dateFrom && !dateUntil) || (!dateFrom && dateUntil)) {
      return { invalidDate: true };
    }

    return {
      id_configuracion,
      result_number: resultNumber,
      start,

      filter_date_by:
        dateFrom && dateUntil ? String(filterDateBy || "").trim() : undefined,
      from: dateFrom && dateUntil ? dateFrom : undefined,
      until: dateFrom && dateUntil ? dateUntil : undefined,

      status: String(status || "").trim() || undefined,

      textToSearch: String(debouncedSearch || "").trim() || undefined,
    };
  }, [
    id_configuracion,
    resultNumber,
    start,
    filterDateBy,
    dateFrom,
    dateUntil,
    status,
    debouncedSearch,
  ]);

  // =========================
  // FETCH (anti-duplicados)
  // =========================
  const inFlightRef = useRef(false);
  const lastKeyRef = useRef("");

  const fetchOrders = useCallback(
    async (body) => {
      setOrdersLoading(true);
      try {
        const res = await chatApi.post(
          "dropi_integrations/orders/myorders/list",
          body,
        );

        const objects = res?.data?.data?.objects ?? [];
        const total =
          res?.data?.data?.total ?? res?.data?.data?.total_results ?? 0;

        const mapped = (Array.isArray(objects) ? objects : []).map(
          mapOrderToRow,
        );

        setOrders(mapped);
        setTotalResults(Number(total) || 0);
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
      }
    },
    [mapOrderToRow],
  );

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

  // =========================
  // UI HELPERS
  // =========================
  const handleSearchClick = () => {
    setPage(1);
    lastKeyRef.current = "";
  };

  const handleClear = () => {
    const { from, until } = getDefaultRange();
    setTextToSearch("");
    setStatus("");
    setDateFrom(from);
    setDateUntil(until);
    setPage(1);
  };

  const navigate = useNavigate();

  const CHAT_ROUTE = "/chat";
  const openChatById = useCallback(
    (cOrId) => {
      const chatId =
        typeof cOrId === "object"
          ? (cOrId?.id_cliente_chat_center ??
            cOrId?.chat_id_cliente ??
            cOrId?.id)
          : cOrId;

      if (!chatId) return;

      navigate(`${CHAT_ROUTE}/${chatId}`, {
        state: {
          id_configuracion: Number(localStorage.getItem("id_configuracion")),
        },
      });
    },
    [navigate],
  );

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
  // BADGE COLOR POR ESTADO (agrupado por categoría)
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

  // =========================
  // Rango de resultados que se muestran
  // =========================
  const showingFrom = totalResults > 0 ? start + 1 : 0;
  const showingTo = Math.min(start + resultNumber, totalResults);

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
              Consulte y filtre los pedidos de Dropi para hacer seguimiento del
              chat con su cliente.
            </p>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
          {/* Buscar cliente */}
          <div className="flex flex-col h-full">
            <label className="text-sm font-semibold text-gray-700">
              Buscar cliente
            </label>
            <input
              type="text"
              placeholder="Escriba para buscar..."
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

          {/* Status — select nativo con scroll del navegador */}
          <div className="flex flex-col h-full">
            <label className="text-sm font-semibold text-gray-700">
              Status
            </label>
            <select
              className="mt-1 w-full px-4 py-2 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#171931]"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              {STATUS_OPTIONS.map((s, idx) => (
                <option key={`${s.id}-${idx}`} value={s.id}>
                  {s.name}
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

        {/* TABLA */}
        <div className="mt-6 overflow-auto rounded-xl border border-gray-100">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold"># Orden</th>
                <th className="text-left px-4 py-3 font-semibold">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold">Bandeja</th>
                <th className="text-left px-4 py-3 font-semibold">
                  Agente Asignado
                </th>
                <th className="text-left px-4 py-3 font-semibold">Producto</th>
                <th className="text-left px-4 py-3 font-semibold">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold text-center">Chat</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {ordersLoading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={8}>
                    Cargando órdenes...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={8}>
                    No se encontraron órdenes con esos filtros.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const fullName =
                    `${o?.name ?? ""} ${o?.surname ?? ""}`.trim() ||
                    "Sin nombre";
                  const email = o?.email ? o.email : "Sin email";
                  const phone = o?.phone
                    ? `Tel: ${o.phone}`
                    : "Tel: Sin teléfono";
                  const bandeja = o?.tray || "Sin conversación";
                  const agente = o?.agent_assigned
                    ? o.agent_assigned
                    : "Sin agente";
                  const producto = o?.product_name ?? "-";
                  const fecha = fmtDateTime(o?.created_at);
                  const estado = o?.status ?? "-";

                  return (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        #{o.id}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        <div className="font-semibold text-gray-900">
                          {fullName}
                        </div>
                        <div className="text-xs text-gray-500">{email}</div>
                        <div className="text-xs text-gray-500">{phone}</div>
                        <div className="text-xs text-gray-500">
                          Guía: {o?.guia || "Sin guía"}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700">{bandeja}</td>
                      <td className="px-4 py-3 text-gray-700">{agente}</td>

                      <td className="px-4 py-3 text-gray-700">
                        <div className="line-clamp-2">{producto}</div>
                      </td>

                      <td className="px-4 py-3 text-gray-600">{fecha}</td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                            estado,
                          )}`}
                        >
                          <span className="h-2 w-2 rounded-full bg-current opacity-60" />
                          {estado}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <ChatButton
                          disabled={
                            !o?.has_chat ||
                            !(o?.id_cliente_chat_center || o?.chat_id_cliente)
                          }
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

        {/* ══════════════════════════════════════════════
            FOOTER: Mostrar X | info | ‹ Anterior  Página X  Siguiente ›
           ══════════════════════════════════════════════ */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm">
          {/* Izquierda: Mostrar + info */}
          <div className="flex items-center gap-4 flex-wrap">
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

            {totalResults > 0 && (
              <span className="text-gray-500">
                {showingFrom}–{showingTo} de{" "}
                <span className="font-semibold text-gray-800">
                  {totalResults.toLocaleString()}
                </span>{" "}
                resultados
              </span>
            )}
          </div>

          {/* Derecha: Paginación estilo Dropi */}
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

            <span className="px-3 py-1.5 rounded-lg bg-[#171931] text-white text-sm font-semibold min-w-[80px] text-center">
              Página {page}
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
    </div>
  );
};

export default OrdenesDropi;
