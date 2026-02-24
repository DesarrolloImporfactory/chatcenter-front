/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CONEXIONES — ConexionesShell (orquestador)       ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Reemplaza Conexiones.jsx / Conexionespruebas.jsx         ║
 * ║  como componente de composición. <100 líneas.             ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import React, { useState } from "react";
import ConexionCard from "./ConexionCard";
import { useConexiones } from "../hooks/useConexiones";
import { confirm } from "../../../shared/ui/Toast";

export default function ConexionesShell() {
  const { conexiones, loading, error, create, remove } = useConexiones();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleDelete = async (conexion) => {
    const id = conexion.id || conexion.id_configuracion;
    const { isConfirmed } = await confirm(
      "¿Eliminar conexión?",
      `Se eliminará "${conexion.nombre_configuracion || "esta conexión"}" permanentemente.`
    );
    if (isConfirmed) await remove(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        <i className="bx bx-error-circle text-4xl mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Conexiones</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona tus canales de comunicación
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition"
        >
          <i className="bx bx-plus mr-1" />
          Nueva conexión
        </button>
      </div>

      {/* Grid de conexiones */}
      {conexiones.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <i className="bx bx-plug text-6xl mb-3" />
          <p className="text-lg font-medium">Sin conexiones</p>
          <p className="text-sm">Crea tu primera conexión para empezar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {conexiones.map((c) => (
            <ConexionCard
              key={c.id || c.id_configuracion}
              conexion={c}
              onEdit={() => {/* TODO: abrir modal edición */}}
              onDelete={() => handleDelete(c)}
              onConnect={() => {/* TODO: flujo de conexión */}}
            />
          ))}
        </div>
      )}

      {/* TODO: Modal de creación — importar cuando exista */}
      {/* {showCreateModal && <CrearConexionModal ... />} */}
    </div>
  );
}
