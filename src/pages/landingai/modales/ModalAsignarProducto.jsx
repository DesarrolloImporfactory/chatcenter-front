import React from "react";

const ModalAsignarProducto = ({
  open,
  onClose,
  productos,
  loadingProductos,
  onAssign,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(15,17,41,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "white" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl grid place-items-center"
                style={{ background: "rgba(99,102,241,0.06)" }}
              >
                <i
                  className="bx bx-package text-lg"
                  style={{ color: "#6366f1" }}
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  Asignar a producto
                </h3>
                <p className="text-[10px] text-gray-400">
                  Selecciona el producto destino
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg grid place-items-center hover:bg-gray-100 transition"
            >
              <i className="bx bx-x text-lg text-gray-400" />
            </button>
          </div>

          {loadingProductos ? (
            <div className="flex items-center justify-center py-12">
              <svg
                className="animate-spin w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#6366f1"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="#6366f1"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            </div>
          ) : productos.length === 0 ? (
            <div className="text-center py-10">
              <i className="bx bx-package text-3xl text-gray-300 mb-2" />
              <p className="text-sm text-gray-500 font-medium">
                No tienes productos
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Crea uno primero en el catálogo
              </p>
            </div>
          ) : (
            <div
              className="space-y-2 max-h-80 overflow-y-auto"
              style={{ scrollbarWidth: "thin" }}
            >
              {productos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onAssign(p.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition hover:bg-gray-50 text-left"
                  style={{ border: "1px solid #e2e8f0" }}
                >
                  {p.imagen_portada ? (
                    <img
                      src={p.imagen_portada}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-lg grid place-items-center shrink-0"
                      style={{ background: "#f1f5f9" }}
                    >
                      <i className="bx bx-package text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">
                      {p.nombre}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.marca && (
                        <span className="text-[10px] text-gray-400">
                          {p.marca}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-300">
                        {p.total_generaciones || 0} imgs
                      </span>
                    </div>
                  </div>
                  <i
                    className="bx bx-right-arrow-alt text-lg shrink-0"
                    style={{ color: "#6366f1" }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalAsignarProducto;
