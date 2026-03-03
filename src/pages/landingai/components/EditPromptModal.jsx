import React, { useState, useEffect } from "react";

const EditPromptModal = ({ open, onClose, result, onRegenerate, loading }) => {
  const [promptExtra, setPromptExtra] = useState("");

  useEffect(() => {
    if (open) {
      setPromptExtra("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => e.key === "Escape" && !loading && onClose();
    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose, loading]);

  if (!open || !result) return null;

  const imgSrc =
    result.image_url || `data:image/png;base64,${result.image_base64}`;

  const handleSubmit = () => {
    if (!promptExtra.trim()) return;
    onRegenerate(result, promptExtra.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={() => !loading && onClose()}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-3xl mx-4 bg-white rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center">
              <i className="bx bx-edit text-white text-base" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Editar sección: {result.etapa?.nombre}
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Indica qué cambios quieres y se regenerará esta imagen
              </p>
            </div>
          </div>
          {!loading && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 grid place-items-center transition"
            >
              <i className="bx bx-x text-gray-400 text-lg" />
            </button>
          )}
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Current image */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                Imagen actual
              </p>
              <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                <img
                  src={imgSrc}
                  alt={result.etapa?.nombre}
                  className="w-full object-contain"
                  style={{ maxHeight: "280px" }}
                />
              </div>
            </div>

            {/* Edit form */}
            <div className="flex flex-col">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                ¿Qué quieres cambiar?
              </p>
              <textarea
                value={promptExtra}
                onChange={(e) => setPromptExtra(e.target.value)}
                rows={6}
                disabled={loading}
                autoFocus
                placeholder={`Ej:\n- Cambia el color de fondo a azul oscuro\n- Agrega el texto "ENVÍO GRATIS" en la parte superior\n- Haz que el producto se vea más grande\n- Quita el precio y deja solo la foto\n- Pon el logo más arriba...`}
                className="flex-1 border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none text-gray-800 placeholder-gray-300 bg-gray-50 focus:bg-white transition disabled:opacity-50"
              />

              {/* Quick suggestions */}
              <div className="mt-3">
                <p className="text-[10px] text-gray-400 font-semibold mb-1.5">
                  Sugerencias rápidas:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Producto más grande",
                    "Cambiar colores del fondo",
                    "Agregar texto promocional",
                    "Quitar los precios",
                    "Más espacio en blanco",
                    "Más profesional/premium",
                  ].map((s) => (
                    <button
                      key={s}
                      disabled={loading}
                      onClick={() =>
                        setPromptExtra((prev) => (prev ? `${prev}. ${s}` : s))
                      }
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-amber-50 border border-gray-200 hover:border-amber-200 text-[10px] font-medium text-gray-500 hover:text-amber-700 transition disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <i className="bx bx-info-circle" />
            Esto consumirá 1 generación adicional
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!promptExtra.trim() || loading}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition ${
                promptExtra.trim() && !loading
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 shadow-md shadow-orange-500/20"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-3.5 h-3.5"
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
                  Regenerando...
                </>
              ) : (
                <>
                  <i className="bx bx-refresh text-sm" /> Regenerar sección
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPromptModal;
