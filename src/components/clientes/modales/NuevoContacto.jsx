import React from "react";

const NuevoContacto = ({
  isOpen,
  closeModal,
  nuevoTelefonoContacto,
  setNuevoTelefonoContacto,
  nuevoNombreContacto,
  setNuevoNombreContacto,
  nuevoApellidoContacto,
  setNuevoApellidoContacto,
  guardarNuevoContacto,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-h-[80vh] w-full max-w-xl overflow-hidden ring-1 ring-slate-900/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Agregar nuevo contacto
            </h2>
            <p className="text-xs text-slate-500">
              Completa los datos del nuevo contacto
            </p>
          </div>
          <button
            onClick={closeModal}
            className="rounded p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <i className="bx bx-x text-xl text-slate-600" />
          </button>
        </div>

        {/* Formulario */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <form className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            {/* Teléfono */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={nuevoTelefonoContacto}
                onChange={(e) => setNuevoTelefonoContacto(e.target.value)}
                placeholder="Ej: 593 99 999 9999"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={nuevoNombreContacto}
                onChange={(e) => setNuevoNombreContacto(e.target.value)}
                placeholder="Ej: Juan"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* Apellido */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Apellido
              </label>
              <input
                type="text"
                value={nuevoApellidoContacto}
                onChange={(e) => setNuevoApellidoContacto(e.target.value)}
                placeholder="Ej: Pérez"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={guardarNuevoContacto}
                disabled={
                  !nuevoTelefonoContacto.trim() ||
                  !nuevoNombreContacto.trim() ||
                  !nuevoApellidoContacto.trim()
                }
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-4 ${nuevoTelefonoContacto.trim() && nuevoNombreContacto.trim() && nuevoApellidoContacto.trim() ? "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-200" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
              >
                <i className="bx bx-user-plus" />
                Guardar contacto
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NuevoContacto;
