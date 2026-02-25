import React, { useState, useEffect, useCallback, useMemo } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

const LIMIT_DEFAULT = 10;

const Programados = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [pageSize, setPageSize] = useState(LIMIT_DEFAULT);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const idConfiguracion = localStorage.getItem("id_configuracion");

  /* ================= API ================= */

  const apiList = useCallback(
    async (pageToUse = page, sizeToUse = pageSize) => {
      if (!idConfiguracion) return;

      try {
        setLoading(true);

        const { data } = await chatApi.get(
          "/whatsapp_managment/programados_por_config",
          {
            params: {
              id_configuracion: idConfiguracion,
              limit: sizeToUse,
              page: pageToUse,
            },
          },
        );

        if (!data.ok) throw new Error(data.msg);

        const resp = data.data || [];

        setItems(resp);
        setHasMore(resp.length === sizeToUse);
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
    [idConfiguracion, page, pageSize],
  );

  useEffect(() => {
    apiList(1, pageSize);
  }, [pageSize]);

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

    return {
      total,
      enviados,
      errores,
      pendientes,
    };
  };

  const [expandedLotes, setExpandedLotes] = useState({});
  const [estadoFiltro, setEstadoFiltro] = useState({});

  const toggleExpand = (uuid) => {
    setExpandedLotes((prev) => ({
      ...prev,
      [uuid]: !prev[uuid],
    }));
  };

  const setFiltro = (uuid, estado) => {
    setEstadoFiltro((prev) => ({
      ...prev,
      [uuid]: estado,
    }));
  };

  const copy = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Copiado exitosamente ",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch {
      Swal.fire("Error", "No se pudo copy", "error");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ================= CONTENIDO SCROLL ================= */}
      <div className="flex-1 overflow-auto">
        {loading && items.length === 0 && (
          <div className="text-center py-20 text-slate-400 animate-pulse">
            Cargando mensajes programados...
          </div>
        )}

        {!loading && lotes.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            No existen mensajes programados.
          </div>
        )}

        {lotes.map((lote) => {
          const resumen = getResumenLote(lote);
          const expanded = expandedLotes[lote.uuid_lote] || false;
          const filtroActivo = estadoFiltro[lote.uuid_lote] || "todos";
          const fechaProgramadaLote = lote.items?.[0]?.fecha_programada;
          const timezoneLote = lote.items?.[0]?.timezone;

          let itemsFiltrados = lote.items;
          if (filtroActivo !== "todos") {
            itemsFiltrados = lote.items.filter(
              (i) => i.estado === filtroActivo,
            );
          }

          return (
            <div
              key={lote.uuid_lote}
              className="rounded-xl border border-blue-900/20 shadow-sm bg-white"
            >
              {/* HEADER */}
              <div className="px-6 py-5 border-b bg-blue-50/40">
                <div className="flex justify-between items-start gap-6">
                  {/* IZQUIERDA */}
                  <div className="space-y-3">
                    {/* TÍTULO + ID */}
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-slate-800">
                        Lote de envío
                      </h3>

                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {lote.uuid_lote}
                      </span>
                    </div>

                    {/* INFO GRID */}
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
                          {formatDate(fechaProgramadaLote)} · {timezoneLote}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <i className="bx bx-layout text-slate-400" />
                        <span>
                          <span className="font-medium text-slate-700">
                            Template:
                          </span>{" "}
                          {lote.items?.[0]?.nombre_template}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DERECHA - STATS */}
                  <div className="flex gap-2 flex-wrap">
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

                {/* FILTROS */}
                <div className="mt-4 flex gap-2 text-xs">
                  {["todos", "enviado", "error", "pendiente"].map((estado) => (
                    <button
                      key={estado}
                      onClick={() => setFiltro(lote.uuid_lote, estado)}
                      className={`px-3 py-1 rounded-full border transition ${
                        filtroActivo === estado
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {estado}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => toggleExpand(lote.uuid_lote)}
                  className="mt-4 text-xs text-blue-700 font-medium hover:underline"
                >
                  {expanded ? "Ocultar detalles" : "Ver detalles"}
                </button>
              </div>

              {/* DETALLE */}
              {expanded && (
                <div className="divide-y">
                  {itemsFiltrados.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center px-6 py-4 text-xs hover:bg-slate-50 transition"
                    >
                      <div className="space-y-2">
                        {/* NOMBRE */}
                        <div className="font-medium text-slate-800 text-sm">
                          {item.nombre_cliente
                            ? `${item.nombre_cliente} ${item.apellido_cliente || ""}`
                            : "Cliente desconocido"}
                        </div>

                        {/* INFO */}
                        <div className="flex flex-wrap gap-6 text-slate-500">
                          {/* TELEFONO */}
                          <div className="flex items-center gap-2">
                            <i className="bx bx-phone text-slate-400" />
                            <span>{item.telefono}</span>
                            <button
                              onClick={() => copy(item.telefono)}
                              className="text-slate-400 hover:text-blue-600"
                              title="Copiar teléfono"
                            >
                              <i className="bx bx-copy" />
                            </button>
                          </div>

                          {/* EMAIL */}
                          {item.email_cliente && (
                            <div className="flex items-center gap-2">
                              <i className="bx bx-envelope text-slate-400" />
                              <span>{item.email_cliente}</span>
                              <button
                                onClick={() => copy(item.email_cliente)}
                                className="text-slate-400 hover:text-blue-600"
                                title="Copiar correo"
                              >
                                <i className="bx bx-copy" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ESTADO */}
                      <span
                        className={`px-3 py-1 rounded-full border text-[11px] font-semibold ${badgeColor(
                          item.estado,
                        )}`}
                      >
                        {item.estado.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ================= FOOTER FIJO ================= */}
      <div className="border-t border-slate-200 bg-white px-4 py-2 text-xs flex items-center justify-between">
        <span className="text-slate-600">
          Mostrando {items.length} registros · Página {page}
        </span>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Tamaño</span>
            <select
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 20, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="flex">
            <button
              disabled={page <= 1 || loading}
              onClick={() => apiList(page - 1, pageSize)}
              className="rounded-l-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
            >
              ‹
            </button>
            <button
              disabled={!hasMore || loading}
              onClick={() => apiList(page + 1, pageSize)}
              className="rounded-r-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================= BADGE COMPONENT ================= */

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
