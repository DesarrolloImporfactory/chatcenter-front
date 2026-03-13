import React from "react";

const ModalNuevoProducto = ({
  open,
  onClose,
  newProductName,
  setNewProductName,
  creatingProduct,
  onCreateAndAssign,
  marca,
  description,
  moneda,
  pricing,
  successCount,
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
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl grid place-items-center"
                style={{ background: "rgba(16,185,129,0.08)" }}
              >
                <i
                  className="bx bx-plus-circle text-lg"
                  style={{ color: "#10b981" }}
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  Crear nuevo producto
                </h3>
                <p className="text-[10px] text-gray-400">
                  Se asignarán las imágenes generadas
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

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-gray-600 mb-1 block">
                Nombre del producto *
              </label>
              <input
                type="text"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="Ej: Auriculares Bluetooth Pro"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-emerald-200"
                style={{ border: "1.5px solid #e2e8f0" }}
                autoFocus
              />
            </div>

            <div
              className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
              style={{
                background: "rgba(99,102,241,0.04)",
                border: "1px solid rgba(99,102,241,0.1)",
              }}
            >
              <i
                className="bx bx-info-circle text-sm mt-0.5 shrink-0"
                style={{ color: "#6366f1" }}
              />
              <div className="text-[11px] text-gray-500 space-y-0.5">
                <p>Se incluirá automáticamente:</p>
                {marca && (
                  <p>
                    Marca/nombre:{" "}
                    <span className="font-bold text-gray-700">{marca}</span>
                  </p>
                )}
                {description && (
                  <p className="truncate max-w-[300px]">
                    Descripción:{" "}
                    <span className="font-semibold text-gray-600">
                      {description.slice(0, 60)}
                      {description.length > 60 ? "…" : ""}
                    </span>
                  </p>
                )}
                {pricing?.precio_unitario && (
                  <p>
                    Precio:{" "}
                    <span className="font-bold text-gray-700">
                      {moneda === "USD" ? "$" : moneda}{" "}
                      {pricing.precio_unitario}
                    </span>
                  </p>
                )}
                <p>
                  <span className="font-bold text-emerald-600">
                    {successCount} imagen
                    {successCount !== 1 ? "es" : ""}
                  </span>{" "}
                  se asignarán
                </p>
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-end gap-2 mt-5 pt-4"
            style={{ borderTop: "1px solid #f1f5f9" }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold transition hover:bg-gray-50"
              style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
            >
              Cancelar
            </button>
            <button
              onClick={onCreateAndAssign}
              disabled={!newProductName.trim() || creatingProduct}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: newProductName.trim() ? "#10b981" : "#e2e8f0",
                color: newProductName.trim() ? "white" : "#94a3b8",
              }}
            >
              {creatingProduct ? (
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
                  Creando…
                </>
              ) : (
                <>
                  <i className="bx bx-check text-sm" /> Crear y asignar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalNuevoProducto;
