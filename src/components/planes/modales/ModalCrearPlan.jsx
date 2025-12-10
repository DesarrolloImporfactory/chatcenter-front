import React from "react";

const ModalCrearPlan = ({ open, onClose, onSubmit, data, setData }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
          <h2 className="text-xl font-bold text-white">Crear nuevo plan</h2>
          <button
            className="text-white/80 hover:text-white text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Nombre */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Nombre del plan
            </label>
            <input
              type="text"
              placeholder="Ej: Plan Premium"
              className="border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={data.nombre}
              onChange={(e) => setData({ ...data, nombre: e.target.value })}
            />
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Descripción
            </label>
            <textarea
              placeholder="Describe brevemente el plan..."
              className="border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
              value={data.descripcion}
              onChange={(e) =>
                setData({ ...data, descripcion: e.target.value })
              }
            />
          </div>

          {/* Precio */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Precio
            </label>
            <input
              type="number"
              placeholder="Ej: 19.99"
              step="0.01"
              min="0"
              className="border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={data.precio}
              onChange={(e) => setData({ ...data, precio: e.target.value })}
            />
          </div>

          {/* Tipo de membresía */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Tipo de membresía
            </label>
            <select
              className="border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={data.tipo_membresia}
              onChange={(e) =>
                setData({ ...data, tipo_membresia: e.target.value })
              }
            >
              <option value="">Selecciona una opción</option>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
          </div>

          {/* N° Conversaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">
                N° de conversaciones
              </label>
              <input
                type="number"
                min="0"
                placeholder="Ej: 50"
                className="border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={data.n_conversaciones}
                onChange={(e) =>
                  setData({ ...data, n_conversaciones: e.target.value })
                }
              />
            </div>

            {/* N° Conexiones */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">
                N° de conexiones
              </label>
              <input
                type="number"
                min="0"
                placeholder="Ej: 10"
                className="border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={data.n_conexiones}
                onChange={(e) =>
                  setData({ ...data, n_conexiones: e.target.value })
                }
              />
            </div>
          </div>

          {/* Máx subusuarios / Máx conexiones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">
                Máx. subusuarios
              </label>
              <input
                type="number"
                min="0"
                placeholder="Ej: 5"
                className="border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={data.max_subusuarios}
                onChange={(e) =>
                  setData({ ...data, max_subusuarios: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">
                Máx. conexiones
              </label>
              <input
                type="number"
                min="0"
                placeholder="Ej: 20"
                className="border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={data.max_conexiones}
                onChange={(e) =>
                  setData({ ...data, max_conexiones: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
          <button
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 hover:shadow-md active:scale-95 transition"
            onClick={onSubmit}
          >
            Crear plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalCrearPlan;
