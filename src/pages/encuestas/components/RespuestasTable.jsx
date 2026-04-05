import React from "react";
import { ScoreDisplay } from "./SharedComponents";
import { SOURCE_STYLES } from "../utils/encuestasConstants";

export default function RespuestasTable({
  enc,
  respuestas,
  loading,
  page,
  total,
  totalPages,
  onPageChange,
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
        <i className="bx bx-loader-alt bx-spin text-2xl mb-2 block" />
        Cargando respuestas...
      </div>
    );
  }

  if (respuestas.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <i className="bx bx-inbox text-4xl text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">Aún no hay respuestas</p>
        {enc.tipo === "webhook_lead" && (
          <p className="text-xs text-gray-300 mt-1">
            Configura tu formulario para enviar datos al webhook y las
            respuestas aparecerán aquí
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {respuestas.map((r) => {
              let respJson = {};
              try {
                respJson =
                  typeof r.respuestas === "string"
                    ? JSON.parse(r.respuestas)
                    : r.respuestas;
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

              return (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{nombre}</p>
                    {tel && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{tel}</p>
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
                  <td className="px-4 py-3 max-w-[280px]">
                    <div className="space-y-0.5">
                      {Object.entries(respJson)
                        .slice(0, 3)
                        .map(([k, v]) => (
                          <p key={k} className="text-gray-600 truncate">
                            <span className="text-gray-400 font-medium">
                              {k}:
                            </span>{" "}
                            {String(v)}
                          </p>
                        ))}
                      {Object.keys(respJson).length > 3 && (
                        <p className="text-gray-300 text-[10px]">
                          +{Object.keys(respJson).length - 3} más
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SOURCE_STYLES[r.source] || SOURCE_STYLES.manual}`}
                    >
                      {r.source}
                    </span>
                    {r.escalado === 1 && (
                      <span className="ml-1 text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">
                        Escalado
                      </span>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <span className="text-[10px] text-gray-400">{total} resultados</span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded text-xs bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              Ant.
            </button>
            <span className="px-2.5 py-1 text-xs text-gray-500">
              {page}/{totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-2.5 py-1 rounded text-xs bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              Sig.
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
