import React, { useEffect, useState, useCallback } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

import EncuestaCard from "./components/EncuestaCard";
import EncuestaDetalle from "./components/EncuestaDetalle";
import CrearEncuestaModal from "./modales/CrearEncuestaModal";

export default function EncuestasView() {
  const [encuestas, setEncuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const idConfig = localStorage.getItem("id_configuracion");

  const fetchEncuestas = useCallback(async () => {
    if (!idConfig) return;
    setLoading(true);
    try {
      const res = await chatApi.get(
        `encuestas/listar?id_configuracion=${idConfig}`,
      );
      setEncuestas(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [idConfig]);

  useEffect(() => {
    fetchEncuestas();
  }, [fetchEncuestas]);

  const handleToggle = async (id) => {
    try {
      await chatApi.patch(`encuestas/${id}/toggle`);
      fetchEncuestas();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    }
  };

  if (!idConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Selecciona una conexión primero</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      {!selected && (
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <i className="bx bx-bar-chart-alt-2 text-blue-500" />
              Encuestas
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Configura encuestas para captar leads por webhook o medir la
              satisfacción de tus clientes tras cada atención
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <i className="bx bx-plus text-sm" />
            Nueva encuesta
          </button>
        </div>
      )}

      {/* Content */}
      {selected ? (
        <EncuestaDetalle
          enc={selected}
          idConfig={idConfig}
          onBack={() => {
            setSelected(null);
            fetchEncuestas();
          }}
        />
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"
            >
              <div className="h-5 w-40 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-56 bg-gray-100 rounded mb-4" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-14 bg-gray-100 rounded-lg" />
                <div className="h-14 bg-gray-100 rounded-lg" />
                <div className="h-14 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : encuestas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-14 text-center">
          <i className="bx bx-bar-chart-alt-2 text-5xl text-gray-300 mb-3" />
          <h3 className="font-semibold text-gray-700 text-lg mb-1">
            Sin encuestas configuradas
          </h3>
          <p className="text-sm text-gray-400 mb-5 max-w-md mx-auto">
            Crea tu primera encuesta para recibir respuestas de formularios
            externos o medir la satisfacción de tus clientes después de cada
            atención.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm"
          >
            Crear mi primera encuesta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {encuestas.map((enc) => (
            <EncuestaCard
              key={enc.id}
              enc={enc}
              onSelect={setSelected}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CrearEncuestaModal
          idConfig={idConfig}
          onCreated={() => {
            setShowCreate(false);
            fetchEncuestas();
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
