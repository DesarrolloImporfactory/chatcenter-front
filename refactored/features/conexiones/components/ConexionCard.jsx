/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CONEXIONES — ConexionCard                        ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Extrae el renderizado de cada tarjeta de conexión que    ║
 * ║  estaba inline en Conexiones.jsx / Conexionespruebas.jsx  ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import React from "react";

const STATUS_STYLES = {
  connected: { label: "Conectado", dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700" },
  disconnected: { label: "Desconectado", dot: "bg-red-500", bg: "bg-red-50 text-red-700" },
  pending: { label: "Pendiente", dot: "bg-amber-500", bg: "bg-amber-50 text-amber-700" },
};

/**
 * @param {object}   props
 * @param {object}   props.conexion   - Datos de la conexión
 * @param {Function} props.onEdit     - Callback para editar
 * @param {Function} props.onDelete   - Callback para eliminar
 * @param {Function} props.onConnect  - Callback para conectar/reconectar
 */
export default function ConexionCard({ conexion, onEdit, onDelete, onConnect }) {
  const status = conexion.estado || "disconnected";
  const style = STATUS_STYLES[status] || STATUS_STYLES.disconnected;
  const nombre = conexion.nombre_configuracion || conexion.nombre || "Sin nombre";
  const tipo = conexion.tipo_configuracion || "whatsapp";
  const telefono = conexion.numero || conexion.telefono || "";

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Ícono del canal */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center
              ${tipo === "whatsapp" ? "bg-green-50" : tipo === "messenger" ? "bg-blue-50" : "bg-pink-50"}`}
          >
            <i
              className={`text-xl
                ${tipo === "whatsapp" ? "bx bxl-whatsapp text-green-600"
                  : tipo === "messenger" ? "bx bxl-messenger text-blue-600"
                  : "bx bxl-instagram text-pink-600"}`}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800">{nombre}</h3>
            {telefono && (
              <p className="text-xs text-slate-500">{telefono}</p>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${style.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
        {onConnect && status !== "connected" && (
          <button
            onClick={() => onConnect(conexion)}
            className="flex-1 py-2 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
          >
            <i className="bx bx-link mr-1" />
            Conectar
          </button>
        )}

        {onEdit && (
          <button
            onClick={() => onEdit(conexion)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition"
            aria-label="Editar"
          >
            <i className="bx bx-edit-alt" />
          </button>
        )}

        {onDelete && (
          <button
            onClick={() => onDelete(conexion)}
            className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition"
            aria-label="Eliminar"
          >
            <i className="bx bx-trash" />
          </button>
        )}
      </div>
    </div>
  );
}
