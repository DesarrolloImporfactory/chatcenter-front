import React from "react";

/**
 * Importador del catálogo de Aliclik.
 *
 * Espeja a ImportarProductosDropi, con dos diferencias que vienen de la API:
 *
 *  · Aliclik agrupa por producto y cuelga los SKUs debajo. El SKU es el que
 *    tiene el EAN, el precio y el almacén, así que se listan: el usuario tiene
 *    que ver qué variantes está trayendo antes de importar.
 *  · Su catálogo pagina de verdad (~2.300 productos) y solo se puede buscar
 *    por nombre, así que acá sí hay controles de página — el modal de Dropi
 *    no los tiene.
 */
const ImportarProductosAliclik = ({
  open,
  onClose,

  search,
  setSearch,
  onSearch,

  loading,
  products,

  page,
  onPrevPage,
  onNextPage,
  hasNextPage,

  onImport,
}) => {
  if (!open) return null;

  const soles = (n) =>
    Number(n || 0).toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  /* Con varios almacenes el mismo producto puede tener precios distintos por
     SKU; mostrar un solo número escondería esa diferencia. */
  const precioTexto = (p) =>
    p.precio_min === p.precio_max
      ? `S/ ${soles(p.precio_min)}`
      : `S/ ${soles(p.precio_min)} – ${soles(p.precio_max)}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-3 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-semibold">Importar desde Aliclik</h2>
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch(true)}
            placeholder="Buscar en Aliclik por nombre del producto…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-sky-200 focus:border-sky-300 outline-none"
          />

          <button
            onClick={() => onSearch(true)}
            className="inline-flex items-center justify-center gap-2 bg-sky-600 text-white hover:bg-sky-700 px-4 py-2.5 rounded-lg font-semibold whitespace-nowrap"
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
              {products.map((p) => (
                <div
                  key={p.id}
                  className="border border-slate-200 rounded-xl p-4 flex gap-4"
                >
                  <div className="w-20 h-20 shrink-0 rounded-lg bg-slate-100 overflow-hidden ring-1 ring-slate-200 flex items-center justify-center">
                    {p.imagen ? (
                      <img
                        src={p.imagen}
                        alt={p.nombre}
                        className="w-20 h-20 object-cover"
                      />
                    ) : (
                      <span className="text-slate-400 text-xs">Sin imagen</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 line-clamp-2">
                      {p.nombre}
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      ID: {p.id}
                      {p.categoria ? ` • ${p.categoria}` : ""} • Stock:{" "}
                      {p.stock_total}
                    </div>

                    <div className="text-sm text-slate-700 mt-1">
                      Precio sugerido: <b>{precioTexto(p)}</b>
                      {p.skus.length > 1 && (
                        <span className="ml-1 text-xs text-amber-500 font-medium">
                          ({p.skus.length} variantes)
                        </span>
                      )}
                    </div>

                    {/* Las variantes se muestran porque el almacén viaja con
                        cada SKU y Aliclik exige un solo almacén por pedido:
                        un producto repartido en dos almacenes es algo que
                        conviene ver antes de importarlo, no después. */}
                    {p.skus.length > 1 && (
                      <ul className="mt-2 space-y-0.5">
                        {p.skus.slice(0, 4).map((s) => (
                          <li
                            key={s.ean}
                            className="text-xs text-slate-500 truncate"
                          >
                            • {s.nombre || "Única"} — S/ {soles(s.precio_sugerido)}{" "}
                            · {s.stock} u. · {s.warehouse_name}
                          </li>
                        ))}
                        {p.skus.length > 4 && (
                          <li className="text-xs text-slate-400">
                            y {p.skus.length - 4} más…
                          </li>
                        )}
                      </ul>
                    )}

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => onImport(p)}
                        className="inline-flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-2 rounded-lg font-semibold text-sm"
                      >
                        <i className="bx bx-download" />
                        Importar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevPage}
              disabled={loading || page <= 1}
              className="border border-slate-200 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
            >
              ← Anterior
            </button>
            <span className="text-sm text-slate-500">Página {page}</span>
            <button
              onClick={onNextPage}
              disabled={loading || !hasNextPage}
              className="border border-slate-200 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
            >
              Siguiente →
            </button>
          </div>

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

export default ImportarProductosAliclik;
