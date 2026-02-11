import React from "react";

const ImportarProductosDropi = ({
  open,
  onClose,

  dropiKeywords,
  setDropiKeywords,
  onSearch,

  loading,
  products,

  onImport,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-3 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-semibold">Importar desde Dropi</h2>
            <p className="text-sm text-slate-500">
              Busque y seleccione un producto para importarlo a su catálogo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-3">
          <input
            value={dropiKeywords}
            onChange={(e) => setDropiKeywords(e.target.value)}
            placeholder="Buscar en Dropi (nombre, sku, id...)"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-sky-200 focus:border-sky-300 outline-none"
          />

          <button
            onClick={() => onSearch(true)}
            className="inline-flex items-center justify-center gap-2 bg-sky-600 text-white hover:bg-sky-700 px-4 py-2.5 rounded-lg font-semibold"
          >
            Buscar
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-md" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center text-slate-600 py-12">
              No hay productos para mostrar.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((p) => {
                const main = Array.isArray(p.gallery)
                  ? p.gallery.find((g) => g.main) || p.gallery[0]
                  : null;

                // 👇 ojo: urlS3 puede NO ser URL completa; si le falla imagen, lo resolvemos en backend
                const img = main?.url || main?.urlS3 || null;

                return (
                  <div
                    key={p.id}
                    className="border border-slate-200 rounded-xl p-4 flex gap-4"
                  >
                    <div className="w-20 h-20 rounded-lg bg-slate-100 overflow-hidden ring-1 ring-slate-200 flex items-center justify-center">
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          className="w-20 h-20 object-cover"
                        />
                      ) : (
                        <span className="text-slate-400 text-sm">
                          Sin imagen
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 truncate">
                        {p.name}
                      </div>

                      <div className="text-xs text-slate-500">
                        ID: {p.id} • SKU: {p.sku || "—"}
                      </div>

                      <div className="text-sm text-slate-700 mt-1">
                        Precio Proveedor: <b>{p.sale_price}</b> • Precio
                        Sugerido: {p.suggested_price}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => onImport(p.id)}
                          className="inline-flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-2 rounded-lg font-semibold"
                        >
                          <i className="bx bx-download"></i>
                          Importar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="border border-slate-200 px-4 py-2.5 rounded-lg hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportarProductosDropi;
