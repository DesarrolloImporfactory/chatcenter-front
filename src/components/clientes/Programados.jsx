import React, { useState, useEffect, useCallback, useMemo } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

const LIMIT_DEFAULT = 10;

const Programados = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [pageSize, setPageSize] = useState(LIMIT_DEFAULT);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLotes, setTotalLotes] = useState(0);

  // ── Filtros ──
  const [searchQuery, setSearchQuery] = useState("");
  const [templateFiltro, setTemplateFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // ── Templates disponibles (para el select) ──
  const [templateOptions, setTemplateOptions] = useState([]);

  const idConfiguracion = localStorage.getItem("id_configuracion");

  /* ================= CARGAR TEMPLATES DISPONIBLES ================= */

  useEffect(() => {
    if (!idConfiguracion) return;
    chatApi
      .get("/whatsapp_managment/templates_programados", {
        params: { id_configuracion: idConfiguracion },
      })
      .then(({ data }) => {
        setTemplateOptions(data.ok ? data.templates || [] : []);
      })
      .catch(() => setTemplateOptions([]));
  }, [idConfiguracion]);

  /* ================= API LIST (SSR) ================= */

  const apiList = useCallback(
    async (pageToUse = page, sizeToUse = pageSize) => {
      if (!idConfiguracion) return;

      try {
        setLoading(true);

        const params = {
          id_configuracion: idConfiguracion,
          limit: sizeToUse,
          page: pageToUse,
        };

        if (searchQuery.trim()) params.q = searchQuery.trim();
        if (templateFiltro) params.nombre_template = templateFiltro;
        if (estadoFiltro) params.estado = estadoFiltro;
        if (fechaDesde) params.fecha_desde = fechaDesde;
        if (fechaHasta) params.fecha_hasta = fechaHasta;

        const { data } = await chatApi.get(
          "/whatsapp_managment/programados_por_config",
          { params },
        );

        if (!data.ok) throw new Error(data.msg);

        setItems(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalLotes(data.pagination?.totalLotes || 0);
        setPage(pageToUse);
      } catch (error) {
        Swal.fire(
          "Error",
          error.response?.data?.msg ||
            "No se pudieron cargar los mensajes programados",
          "error",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      idConfiguracion,
      pageSize,
      searchQuery,
      templateFiltro,
      estadoFiltro,
      fechaDesde,
      fechaHasta,
    ],
  );

  useEffect(() => {
    const timeout = setTimeout(
      () => apiList(1, pageSize),
      searchQuery ? 400 : 0,
    );
    return () => clearTimeout(timeout);
  }, [
    pageSize,
    searchQuery,
    templateFiltro,
    estadoFiltro,
    fechaDesde,
    fechaHasta,
  ]);

  /* ================= AGRUPAR POR LOTE ================= */

  const lotes = useMemo(() => {
    const grouped = {};
    items.forEach((item) => {
      if (!grouped[item.uuid_lote]) {
        grouped[item.uuid_lote] = {
          uuid_lote: item.uuid_lote,
          creado_en: item.creado_en,
          items: [],
        };
      }
      grouped[item.uuid_lote].items.push(item);
    });
    return Object.values(grouped);
  }, [items]);

  /* ================= HELPERS ================= */

  const badgeColor = (estado) => {
    switch (estado) {
      case "enviado":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "error":
        return "bg-red-50 text-red-700 border-red-200";
      case "procesando":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleString();
  };

  const getResumenLote = (lote) => {
    const total = lote.items.length;
    const enviados = lote.items.filter((i) => i.estado === "enviado").length;
    const errores = lote.items.filter((i) => i.estado === "error").length;
    const pendientes = lote.items.filter(
      (i) => i.estado === "pendiente",
    ).length;
    return { total, enviados, errores, pendientes };
  };

  const [expandedLotes, setExpandedLotes] = useState({});
  const [estadoFiltroLote, setEstadoFiltroLote] = useState({});

  const toggleExpand = (uuid) => {
    setExpandedLotes((prev) => ({ ...prev, [uuid]: !prev[uuid] }));
  };

  const setFiltroLote = (uuid, estado) => {
    setEstadoFiltroLote((prev) => ({ ...prev, [uuid]: estado }));
  };

  const copy = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Copiado",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch {
      Swal.fire("Error", "No se pudo copiar", "error");
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setTemplateFiltro("");
    setEstadoFiltro("");
    setFechaDesde("");
    setFechaHasta("");
  };

  const hasActiveFilters =
    searchQuery || templateFiltro || estadoFiltro || fechaDesde || fechaHasta;

  /* ================= PAGINACIÓN ================= */

  const getPageRange = () => {
    const maxVisible = 7;
    if (totalPages <= maxVisible)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);
    pages.push(1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ══════ BARRA DE FILTROS ══════ */}
      <div className="border-b border-slate-200 bg-white/70 backdrop-blur-sm shrink-0">
        {/* Fila 1: Búsqueda + Template + Estado */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="relative flex-1 min-w-[200px] max-w-[400px]">
            <i className="bx bx-search absolute left-3 top-2.5 text-slate-500" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-9 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60"
              placeholder="Buscar por ID lote, template o teléfono…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <i className="bx bx-x text-lg" />
              </button>
            )}
          </div>

          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60 min-w-[180px]"
            value={templateFiltro}
            onChange={(e) => setTemplateFiltro(e.target.value)}
          >
            <option value="">Todos los templates</option>
            {templateOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="enviado">Enviado</option>
            <option value="error">Error</option>
            <option value="procesando">Procesando</option>
          </select>
        </div>

        {/* Fila 2: Fechas + Shortcuts + Reset */}
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Desde:</span>
            <input
              type="date"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Hasta:</span>
            <input
              type="date"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200/60"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => {
                const t = new Date().toISOString().slice(0, 10);
                setFechaDesde(t);
                setFechaHasta(t);
              }}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 transition"
            >
              Hoy
            </button>
            <button
              onClick={() => {
                const t = new Date();
                const w = new Date(t.getTime() - 7 * 86400000);
                setFechaDesde(w.toISOString().slice(0, 10));
                setFechaHasta(t.toISOString().slice(0, 10));
              }}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 transition"
            >
              Última semana
            </button>
            <button
              onClick={() => {
                setFechaDesde(new Date().toISOString().slice(0, 10));
                setFechaHasta("");
                setEstadoFiltro("pendiente");
              }}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 hover:bg-indigo-100 transition"
            >
              Programados a futuro
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition"
            >
              <i className="bx bx-reset text-sm" /> Limpiar filtros
            </button>
          )}

          <span className="ml-auto text-slate-400">
            {totalLotes} lote{totalLotes !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ══════ CONTENIDO ══════ */}
      <div className="flex-1 overflow-auto space-y-4 p-4">
        {loading && items.length === 0 && (
          <div className="text-center py-20 text-slate-400 animate-pulse">
            Cargando…
          </div>
        )}

        {!loading && lotes.length === 0 && (
          <div className="text-center py-20">
            <i className="bx bx-calendar-x text-4xl text-slate-300" />
            <p className="mt-3 text-slate-400">
              {hasActiveFilters
                ? "No se encontraron lotes con esos filtros."
                : "No existen mensajes programados."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {lotes.map((lote) => {
          const resumen = getResumenLote(lote);
          const expanded = expandedLotes[lote.uuid_lote] || false;
          const filtroActivo = estadoFiltroLote[lote.uuid_lote] || "todos";
          const fechaProgramadaLote = lote.items?.[0]?.fecha_programada;
          const timezoneLote = lote.items?.[0]?.timezone;
          const templateLote = lote.items?.[0]?.nombre_template;

          let itemsFiltrados = lote.items;
          if (filtroActivo !== "todos") {
            itemsFiltrados = lote.items.filter(
              (i) => i.estado === filtroActivo,
            );
          }

          const esFuturo =
            fechaProgramadaLote && new Date(fechaProgramadaLote) > new Date();

          return (
            <div
              key={lote.uuid_lote}
              className="rounded-xl border border-blue-900/20 shadow-sm bg-white"
            >
              <div className="px-6 py-5 border-b bg-blue-50/40">
                <div className="flex justify-between items-start gap-6">
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-800">
                        Lote de envío
                      </h3>
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[300px]">
                        {lote.uuid_lote}
                      </span>
                      {esFuturo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                          <i className="bx bx-time-five text-xs" /> Programado a
                          futuro
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <i className="bx bx-calendar text-slate-400" />
                        <span>
                          <span className="font-medium text-slate-700">
                            Creado:
                          </span>{" "}
                          {formatDate(lote.creado_en)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="bx bx-time text-slate-400" />
                        <span>
                          <span className="font-medium text-slate-700">
                            Programado:
                          </span>{" "}
                          {formatDate(fechaProgramadaLote)}
                          {timezoneLote && ` · ${timezoneLote}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="bx bx-layout text-slate-400" />
                        <span>
                          <span className="font-medium text-slate-700">
                            Template:
                          </span>{" "}
                          <span className="font-mono text-slate-800">
                            {templateLote}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap shrink-0">
                    <StatBadge
                      label="Total"
                      value={resumen.total}
                      color="slate"
                    />
                    <StatBadge
                      label="Enviados"
                      value={resumen.enviados}
                      color="emerald"
                    />
                    <StatBadge
                      label="Errores"
                      value={resumen.errores}
                      color="red"
                    />
                    <StatBadge
                      label="Pendientes"
                      value={resumen.pendientes}
                      color="amber"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs">
                  {["todos", "enviado", "error", "pendiente"].map((est) => (
                    <button
                      key={est}
                      onClick={() => setFiltroLote(lote.uuid_lote, est)}
                      className={`px-3 py-1 rounded-full border transition ${filtroActivo === est ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                    >
                      {est}
                    </button>
                  ))}

                  <button
                    onClick={() => toggleExpand(lote.uuid_lote)}
                    className="ml-auto text-xs text-blue-700 font-medium hover:underline inline-flex items-center gap-1"
                  >
                    <i
                      className={`bx ${expanded ? "bx-chevron-up" : "bx-chevron-down"} text-base`}
                    />
                    {expanded
                      ? "Ocultar"
                      : `Ver ${itemsFiltrados.length} detalle(s)`}
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="divide-y max-h-[400px] overflow-auto">
                  {itemsFiltrados.length === 0 && (
                    <div className="px-6 py-8 text-center text-sm text-slate-400">
                      No hay mensajes con estado "{filtroActivo}" en este lote.
                    </div>
                  )}

                  {itemsFiltrados.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center px-6 py-4 text-xs hover:bg-slate-50 transition"
                    >
                      <div className="space-y-2 min-w-0">
                        <div className="font-medium text-slate-800 text-sm">
                          {item.nombre_cliente
                            ? `${item.nombre_cliente} ${item.apellido_cliente || ""}`
                            : "Cliente desconocido"}
                        </div>
                        <div className="flex flex-wrap gap-6 text-slate-500">
                          <div className="flex items-center gap-2">
                            <i className="bx bx-phone text-slate-400" />
                            <span>{item.telefono}</span>
                            <button
                              onClick={() => copy(item.telefono)}
                              className="text-slate-400 hover:text-blue-600"
                              title="Copiar"
                            >
                              <i className="bx bx-copy" />
                            </button>
                          </div>
                          {item.email_cliente && (
                            <div className="flex items-center gap-2">
                              <i className="bx bx-envelope text-slate-400" />
                              <span>{item.email_cliente}</span>
                            </div>
                          )}
                          {item.enviado_en && (
                            <div className="flex items-center gap-2">
                              <i className="bx bx-check text-emerald-500" />
                              <span>
                                Enviado: {formatDate(item.enviado_en)}
                              </span>
                            </div>
                          )}
                        </div>
                        {item.estado === "error" && item.error_message && (
                          <details className="mt-1">
                            <summary className="text-[11px] text-red-500 cursor-pointer hover:underline">
                              Ver error
                            </summary>
                            <pre className="mt-1 text-[10px] bg-red-50 border border-red-200 rounded p-2 overflow-x-auto max-w-[500px] text-red-700 whitespace-pre-wrap">
                              {item.error_message}
                            </pre>
                          </details>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.intentos > 0 && (
                          <span className="text-[10px] text-slate-400">
                            {item.intentos}/{item.max_intentos}
                          </span>
                        )}
                        <span
                          className={`px-3 py-1 rounded-full border text-[11px] font-semibold ${badgeColor(item.estado)}`}
                        >
                          {item.estado.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ══════ FOOTER ══════ */}
      <div className="border-t border-slate-200 bg-white px-4 py-3 text-xs flex items-center justify-between shrink-0">
        <span className="text-slate-600">
          {totalLotes} lotes · Página {page} de {totalPages}
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Lotes/pág</span>
            <select
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1 || loading}
              onClick={() => apiList(page - 1, pageSize)}
              className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
            >
              ‹
            </button>
            {getPageRange().map((p, idx) =>
              p === "..." ? (
                <span
                  key={`dots-${idx}`}
                  className="px-1 text-slate-400 select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  disabled={loading}
                  onClick={() => apiList(p, pageSize)}
                  className={`min-w-[28px] rounded-md border px-2 py-1 text-center transition ${p === page ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              disabled={page >= totalPages || loading}
              onClick={() => apiList(page + 1, pageSize)}
              className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatBadge = ({ label, value, color }) => {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <div
      className={`px-3 py-1 rounded-lg border text-xs font-medium ${colors[color]}`}
    >
      {value} {label}
    </div>
  );
};

export default Programados;
