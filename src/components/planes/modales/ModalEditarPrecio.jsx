import React from "react";

const ModalEditarPrecio = ({ open, onClose, data, setData, onSubmit }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
          <h2 className="text-xl font-bold text-white">
            Editar precio del plan
          </h2>
          
          <button
            className="text-white/80 hover:text-white text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Nuevo precio */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Nuevo precio
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 19.99"
              className="border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={data.new_amount}
              onChange={(e) => setData({ ...data, new_amount: e.target.value })}
            />
            <p className="text-xs text-gray-400">
              El monto debe estar en la misma moneda configurada en Stripe.
            </p>
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
              <option value="">Seleccione una opción</option>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
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
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEditarPrecio;
