import React from "react";

const TIPO_ICONS = {
  ventas: "bx-store",
  imporfactory: "bx-package",
  imporshop: "bx-cart",
  eventos: "bx-calendar-event",
  kanban: "bx-layout",
  imporshop_proveedor: "bx-buildings",
};

const Spin = ({ sm }) => (
  <svg
    className={`animate-spin ${sm ? "w-3.5 h-3.5" : "w-6 h-6"}`}
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
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

const CLOUDFRONT = "https://d39ru7awumhhs2.cloudfront.net";

const getDropiImg = (prod) => {
  const imgs = [...(prod?.photos || []), ...(prod?.gallery || [])];
  const m = imgs.find((g) => g.main) || imgs[0];
  if (!m) return null;
  const raw = m.url || m.urlS3;
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${CLOUDFRONT}/${String(raw).replace(/^\/+/, "")}`;
};

/**
 * Props:
 *   open, onClose,
 *   dropiStep, setDropiStep,
 *   selectedNegocio,
 *   negocios, negociosLoading,
 *   dropiProductos, dropiLoading,
 *   dropiSearch, setDropiSearch,
 *   selectedDropiProduct,
 *   dropiImporting,
 *   dropiIntegration,
 *   onSelectNegocio, onSearch, onSelectProduct, onConfirmImport
 */
const ModalImportarDropi = ({
  open,
  onClose,
  dropiStep,
  setDropiStep,
  selectedNegocio,
  negocios,
  negociosLoading,
  dropiProductos,
  dropiLoading,
  dropiSearch,
  setDropiSearch,
  selectedDropiProduct,
  dropiImporting,
  dropiIntegration,
  onSelectNegocio,
  onSearch,
  onSelectProduct,
  onConfirmImport,
}) => {
  if (!open) return null;

  const minStep = dropiIntegration ? 2 : 1;
  const totalSteps = dropiIntegration ? 2 : 3;
  const displayStep = dropiStep - minStep + 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,17,41,0.6)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "white",
          boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
          maxHeight: "85vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="px-5 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: "1px solid #f1f5f9" }}
        >
          <div className="flex items-center gap-3">
            {dropiStep > minStep && (
              <button
                onClick={() => setDropiStep(dropiStep - 1)}
                className="w-7 h-7 rounded-lg grid place-items-center hover:bg-gray-100 transition"
              >
                <i className="bx bx-chevron-left text-base text-gray-500" />
              </button>
            )}
            <div>
              <h2 className="text-sm font-bold text-gray-800">
                {dropiStep === 1 && "Importar desde Dropi"}
                {dropiStep === 2 &&
                  (selectedNegocio?.nombre_configuracion ||
                    dropiIntegration?.store_name ||
                    "Productos Dropi")}
                {dropiStep === 3 && "Confirmar importación"}
              </h2>
              {/* Step pills — naranja */}
              <div className="flex items-center gap-1 mt-0.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{
                      width: i + 1 <= displayStep ? "20px" : "6px",
                      background: i + 1 <= displayStep ? "#f97316" : "#e2e8f0",
                    }}
                  />
                ))}
                <span className="text-[10px] text-gray-400 ml-1">
                  Paso {displayStep}/{totalSteps}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg grid place-items-center hover:bg-gray-100 transition"
          >
            <i className="bx bx-x text-lg text-gray-400" />
          </button>
        </div>

        {/* ── Step 1: seleccionar negocio (solo sin integración directa) ── */}
        {dropiStep === 1 && (
          <div className="p-5 overflow-y-auto flex-1">
            <p className="text-xs text-gray-500 mb-4">
              Selecciona el negocio con integración Dropi activa:
            </p>
            {negociosLoading ? (
              <div
                className="flex justify-center py-10"
                style={{ color: "#f97316" }}
              >
                <Spin />
              </div>
            ) : negocios.length === 0 ? (
              <div className="text-center py-10">
                <i className="bx bx-store-alt text-3xl text-gray-200 block mb-2" />
                <p className="text-sm text-gray-400">
                  No tienes negocios disponibles
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {negocios.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => onSelectNegocio(n)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.98]"
                    style={{
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#f97316";
                      e.currentTarget.style.background =
                        "rgba(249,115,22,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.background = "#f8fafc";
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                      style={{ background: "rgba(249,115,22,0.08)" }}
                    >
                      <i
                        className={`bx ${TIPO_ICONS[n.tipo_configuracion] || "bx-store"} text-base`}
                        style={{ color: "#f97316" }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {n.nombre_configuracion || `Negocio #${n.id}`}
                      </p>
                      {n.telefono && (
                        <p className="text-[11px] text-gray-400">
                          {n.telefono}
                        </p>
                      )}
                    </div>
                    <i className="bx bx-chevron-right text-gray-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: grid productos ── */}
        {dropiStep === 2 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div
              className="px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid #f1f5f9" }}
            >
              <form onSubmit={onSearch} className="flex gap-2">
                <input
                  type="text"
                  value={dropiSearch}
                  onChange={(e) => setDropiSearch(e.target.value)}
                  placeholder="Buscar producto en Dropi…"
                  className="flex-1 px-3.5 py-2 rounded-xl text-sm outline-none"
                  style={{ border: "1px solid #e2e8f0", background: "#f8fafc" }}
                  onFocus={(e) => (e.target.style.borderColor = "#f97316")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white transition active:scale-95"
                  style={{ background: "#0f1129" }}
                >
                  <i className="bx bx-search" />
                </button>
              </form>
            </div>

            <div className="overflow-y-auto flex-1 p-3">
              {dropiLoading ? (
                <div
                  className="flex flex-col items-center justify-center py-14 gap-3"
                  style={{ color: "#f97316" }}
                >
                  <Spin />{" "}
                  <p className="text-xs text-gray-400">Cargando desde Dropi…</p>
                </div>
              ) : dropiProductos.length === 0 ? (
                <div className="text-center py-12">
                  <i className="bx bx-package text-3xl text-gray-200 block mb-2" />
                  <p className="text-sm text-gray-400">
                    No se encontraron productos
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {dropiProductos.map((prod) => {
                    const img = getDropiImg(prod);
                    return (
                      <button
                        key={prod.id}
                        onClick={() => onSelectProduct(prod)}
                        className="rounded-xl overflow-hidden text-left transition-all active:scale-[0.97]"
                        style={{
                          border: "1px solid #e2e8f0",
                          background: "white",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.boxShadow =
                            "0 4px 12px rgba(249,115,22,0.12)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.boxShadow = "none")
                        }
                      >
                        <div
                          className="h-24 overflow-hidden"
                          style={{ background: "#f8fafc" }}
                        >
                          {img ? (
                            <img
                              src={img}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <i className="bx bx-image text-2xl text-gray-200" />
                            </div>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold text-gray-700 line-clamp-2 leading-tight">
                            {prod.name}
                          </p>
                          {prod.suggested_price > 0 && (
                            <p
                              className="text-[11px] font-bold mt-1"
                              style={{ color: "#f97316" }}
                            >
                              ${prod.suggested_price}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: confirmar ── */}
        {dropiStep === 3 && selectedDropiProduct && (
          <div className="p-5">
            <div
              className="rounded-xl overflow-hidden mb-4"
              style={{ border: "1px solid #e2e8f0" }}
            >
              {getDropiImg(selectedDropiProduct) && (
                <div className="h-36 overflow-hidden">
                  <img
                    src={getDropiImg(selectedDropiProduct)}
                    alt={selectedDropiProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-3.5">
                <p className="text-sm font-bold text-gray-800">
                  {selectedDropiProduct.name}
                </p>
                {selectedDropiProduct.suggested_price > 0 && (
                  <p
                    className="text-xs font-semibold mt-0.5"
                    style={{ color: "#f97316" }}
                  >
                    Precio sugerido: ${selectedDropiProduct.suggested_price}
                  </p>
                )}
              </div>
            </div>

            <div
              className="flex items-start gap-2.5 p-3 rounded-xl mb-5"
              style={{
                background: "rgba(249,115,22,0.04)",
                border: "1px solid rgba(249,115,22,0.15)",
              }}
            >
              <i
                className="bx bx-info-circle text-sm mt-0.5"
                style={{ color: "#f97316" }}
              />
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Se importará a tu catálogo de InstaLanding. Podrás generar
                banners con IA y luego exportarlo a tus negocios.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDropiStep(2)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition hover:bg-gray-50"
                style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
              >
                Atrás
              </button>
              <button
                onClick={onConfirmImport}
                disabled={dropiImporting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-[0.97] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #f97316, #ea580c)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.filter = "brightness(1.08)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.filter = "brightness(1)")
                }
              >
                {dropiImporting ? (
                  <Spin sm />
                ) : (
                  <i className="bx bx-import text-sm" />
                )}
                Importar producto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalImportarDropi;
