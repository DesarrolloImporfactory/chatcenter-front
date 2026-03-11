import React from "react";

const TIPO_ICONS = {
  ventas: "bx-store",
  imporfactory: "bx-package",
  imporshop: "bx-cart",
  eventos: "bx-calendar-event",
  kanban: "bx-layout",
  imporshop_proveedor: "bx-buildings",
};

const Spin = () => (
  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

/**
 * Props:
 *   open, onClose,
 *   producto,
 *   negocios, negociosLoading,
 *   selectedNegocio, onSelectNegocio,
 *   loading, onConfirm
 */
const ModalAlimentarNegocio = ({
  open,
  onClose,
  producto,
  negocios,
  negociosLoading,
  selectedNegocio,
  onSelectNegocio,
  loading,
  onConfirm,
}) => {
  if (!open || !producto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,17,41,0.6)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "white",
          boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid #f1f5f9" }}
        >
          <div>
            <h2 className="text-sm font-bold text-gray-800">
              Alimentar negocio con IA
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[240px]">
              {producto.nombre}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg grid place-items-center hover:bg-gray-100 transition"
          >
            <i className="bx bx-x text-lg text-gray-400" />
          </button>
        </div>

        <div className="p-5">
          {/* Preview producto */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl mb-4"
            style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
          >
            {producto.imagen_portada ? (
              <img
                src={producto.imagen_portada}
                alt={producto.nombre}
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-lg grid place-items-center shrink-0"
                style={{ background: "rgba(99,102,241,0.08)" }}
              >
                <i
                  className="bx bx-package text-xl"
                  style={{ color: "#a5b4fc" }}
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {producto.nombre}
              </p>
              {producto.precio_unitario && (
                <p className="text-xs font-bold" style={{ color: "#6366f1" }}>
                  {producto.moneda === "USD" ? "$" : producto.moneda}{" "}
                  {producto.precio_unitario}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs font-semibold text-gray-500 mb-3">
            ¿A qué negocio deseas exportar?
          </p>

          {negociosLoading ? (
            <div className="flex justify-center py-8">
              <svg
                className="animate-spin w-5 h-5 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            </div>
          ) : negocios.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">
                No tienes negocios disponibles
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {negocios.map((n) => {
                const sel = selectedNegocio?.id === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => onSelectNegocio(n)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.98]"
                    style={{
                      border: `1px solid ${sel ? "#6366f1" : "#e2e8f0"}`,
                      background: sel ? "rgba(99,102,241,0.04)" : "#f8fafc",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
                      style={{
                        background: sel
                          ? "rgba(99,102,241,0.12)"
                          : "rgba(99,102,241,0.06)",
                      }}
                    >
                      <i
                        className={`bx ${TIPO_ICONS[n.tipo_configuracion] || "bx-store"} text-sm`}
                        style={{ color: "#6366f1" }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-700 truncate">
                        {n.nombre_configuracion || `Negocio #${n.id}`}
                      </p>
                      {n.telefono && (
                        <p className="text-[11px] text-gray-400">
                          {n.telefono}
                        </p>
                      )}
                    </div>
                    {sel && (
                      <div
                        className="w-5 h-5 rounded-full grid place-items-center shrink-0"
                        style={{ background: "#6366f1" }}
                      >
                        <i className="bx bx-check text-xs text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedNegocio && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl mt-3"
              style={{
                background: "rgba(99,102,241,0.05)",
                border: "1px solid rgba(99,102,241,0.12)",
              }}
            >
              <i
                className="bx bx-info-circle text-sm mt-0.5"
                style={{ color: "#6366f1" }}
              />
              <p className="text-[11px] text-gray-500 leading-relaxed">
                El producto se añadirá al catálogo de{" "}
                <strong>{selectedNegocio.nombre_configuracion}</strong>. Tu
                asistente de WhatsApp podrá presentarlo y venderlo
                automáticamente.
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition hover:bg-gray-50"
              style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={!selectedNegocio || loading}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-[0.97] disabled:opacity-40 inline-flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              }}
            >
              {loading ? <Spin /> : <i className="bx bx-transfer text-sm" />}
              Exportar al negocio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalAlimentarNegocio;
