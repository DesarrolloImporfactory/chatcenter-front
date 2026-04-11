import React, { useState, useMemo } from "react";
import { ScoreDisplay } from "./SharedComponents";
import { SOURCE_STYLES } from "../utils/encuestasConstants";
import chatApi from "../../../api/chatcenter";
import Swal from "sweetalert2";

const CHAT_ROUTE = "/chat";

export default function RespuestasTable({
  enc,
  respuestas,
  loading,
  page,
  total,
  totalPages,
  onPageChange,
  busqueda,
  onBusqueda,
  onRefresh, // ← nuevo prop para refrescar después de resolver
}) {
  const [expandedId, setExpandedId] = useState(null);

  const openChat = (r) => {
    const chatId = r.id_cliente_chat_center;
    if (!chatId) return;
    if (r.id_configuracion) {
      localStorage.setItem("id_configuracion", String(r.id_configuracion));
    }
    window.open(
      `${window.location.origin}${CHAT_ROUTE}/${chatId}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleResolver = async (r) => {
    // Si ya está resuelto, solo mostrar info
    if (r.escalado_resuelto) {
      Swal.fire({
        icon: "info",
        title: "Caso resuelto",
        html: `<p class="text-sm text-gray-600 mb-2">${r.resolucion_comentario}</p>
               <p class="text-xs text-gray-400">${new Date(r.resolucion_fecha).toLocaleString("es-EC")}</p>`,
      });
      return;
    }

    const { value: comentario } = await Swal.fire({
      title: "Resolver caso escalado",
      html: `<p class="text-sm text-gray-500 mb-2">Cliente: <b>${r.nombre || "—"}</b></p>`,
      input: "textarea",
      inputPlaceholder: "Describe cómo se resolvió el caso...",
      inputAttributes: { style: "font-size:13px" },
      showCancelButton: true,
      confirmButtonText: "Resolver",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#10b981",
      inputValidator: (v) => !v?.trim() && "Escribe un comentario",
    });

    if (!comentario) return;

    try {
      await chatApi.patch(`encuestas/respuesta/${r.id}/resolver`, {
        comentario,
      });
      Swal.fire({
        icon: "success",
        title: "Caso resuelto",
        timer: 1500,
        showConfirmButton: false,
      });
      onRefresh?.();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || err.message,
      });
    }
  };

  const parsed = useMemo(() => {
    return respuestas.map((r) => {
      let respJson = {};
      try {
        respJson =
          typeof r.respuestas === "string"
            ? JSON.parse(r.respuestas)
            : r.respuestas || {};
      } catch (_) {}
      let contactoJson = {};
      try {
        contactoJson =
          typeof r.datos_contacto === "string"
            ? JSON.parse(r.datos_contacto)
            : r.datos_contacto || {};
      } catch (_) {}
      const nombre = r.nombre_cliente || contactoJson?.nombre || "—";
      const tel = r.celular_cliente || contactoJson?.telefono || "";
      return { ...r, respJson, nombre, tel };
    });
  }, [respuestas]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
        <i className="bx bx-loader-alt bx-spin text-2xl mb-2 block" />
        Cargando respuestas...
      </div>
    );
  }

  if (respuestas.length === 0 && !busqueda) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <i className="bx bx-inbox text-4xl text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">Aún no hay respuestas</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Buscador */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {busqueda && (
            <button
              onClick={() => onBusqueda("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <i className="bx bx-x text-sm" />
            </button>
          )}
        </div>
        <span className="text-[10px] text-gray-400 shrink-0">
          {total} resultados
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">
                Cliente
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">
                Encargado
              </th>
              {enc.tipo === "satisfaccion" && (
                <th className="text-center px-4 py-2.5 font-medium text-gray-500">
                  Score
                </th>
              )}
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">
                Respuestas
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">
                Fuente
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">
                Fecha
              </th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-500 w-14">
                Chat
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {parsed.length === 0 ? (
              <tr>
                <td
                  colSpan={enc.tipo === "satisfaccion" ? 7 : 6}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  <i className="bx bx-search-alt text-2xl mb-1 block" />
                  No se encontraron resultados
                </td>
              </tr>
            ) : (
              parsed.map((r) => {
                const isExpanded = expandedId === r.id;
                const entries = Object.entries(r.respJson);

                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{r.nombre}</p>
                      {r.tel && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {r.tel}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.nombre_encargado}
                    </td>
                    {enc.tipo === "satisfaccion" && (
                      <td className="px-4 py-3 text-center">
                        <ScoreDisplay score={r.score} />
                      </td>
                    )}
                    <td className="px-4 py-3 max-w-[320px]">
                      <div className="space-y-0.5">
                        {(isExpanded ? entries : entries.slice(0, 3)).map(
                          ([k, v]) => (
                            <p key={k} className="text-gray-600">
                              <span className="text-gray-400 font-medium">
                                {k}:
                              </span>{" "}
                              {String(v)}
                            </p>
                          ),
                        )}
                      </div>
                      {entries.length > 3 && (
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : r.id)
                          }
                          className="text-blue-500 hover:text-blue-700 text-[10px] mt-1 font-medium"
                        >
                          {isExpanded
                            ? "Ver menos"
                            : `+${entries.length - 3} más`}
                        </button>
                      )}
                      {/* ── Resolución visible si ya fue resuelta ── */}
                      {r.escalado === 1 && r.escalado_resuelto === 1 && (
                        <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                          <p className="text-[10px] font-bold text-emerald-700 mb-0.5">
                            <i className="bx bx-check-circle mr-1" />
                            Resuelto
                          </p>
                          <p className="text-[10px] text-emerald-600">
                            {r.resolucion_comentario}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SOURCE_STYLES[r.source] || SOURCE_STYLES.manual}`}
                      >
                        {r.source}
                      </span>
                      {r.escalado === 1 && (
                        <button
                          onClick={() => handleResolver(r)}
                          className={`ml-1 text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                            r.escalado_resuelto
                              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                        >
                          <i
                            className={`bx ${r.escalado_resuelto ? "bx-check-circle" : "bx-error"} mr-0.5`}
                          />
                          {r.escalado_resuelto
                            ? "Resuelto"
                            : "Escalado — Resolver"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("es-EC", {
                        day: "2-digit",
                        month: "short",
                      })}
                      <br />
                      <span className="text-[10px]">
                        {new Date(r.created_at).toLocaleTimeString("es-EC", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openChat(r)}
                        disabled={!r.id_cliente_chat_center}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        title="Abrir chat"
                      >
                        <i className="bx bxs-chat text-[15px]" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <span className="text-[10px] text-gray-400">{total} resultados</span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded text-xs bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
            >
              Ant.
            </button>
            <span className="px-2.5 py-1 text-xs text-gray-500">
              {page}/{totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-2.5 py-1 rounded text-xs bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
            >
              Sig.
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
