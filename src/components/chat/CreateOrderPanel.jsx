import React, { useMemo } from "react";

export default function CreateOrderPanel(props) {
  const {
    // cliente
    phoneInput,
    setPhoneInput,
    name,
    setName,
    surname,
    setSurname,
    dir,
    setDir,

    // recaudo/ubicación
    rateType,
    setRateType,
    states,
    statesLoading,
    selectedDepartmentId,
    handleSelectDepartment,
    cities,
    citiesLoading,
    selectedCityId,
    handleSelectCity,

    // productos
    keywords,
    setKeywords,
    prodList,
    prodLoading,
    prodError,
    emitGetProducts,
    addProductToCart,

    // carrito
    productsCart,
    updateCartItem,
    removeProductFromCart,

    // submit
    canSubmit,
    onClose,
    onSubmit,
  } = props;

  const topProducts = useMemo(() => (prodList || []).slice(0, 5), [prodList]);

  return (
    <div className="mt-2 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Crear orden</p>
          <p className="text-xs text-white/60">
            Complete los datos mínimos para registrar la orden en Dropi.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs flex items-center gap-2 shrink-0"
          title="Cerrar"
        >
          <i className="bx bx-x" />
          Cerrar
        </button>
      </div>

      {/* Cliente */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-black/20 border border-white/10 rounded-xl p-3">
          <p className="text-[11px] text-white/60 mb-1">Nombre</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
            placeholder="Nombre"
          />
        </div>

        <div className="bg-black/20 border border-white/10 rounded-xl p-3">
          <p className="text-[11px] text-white/60 mb-1">Apellido</p>
          <input
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
            placeholder="Apellido"
          />
        </div>

        {/*  Teléfono editable */}
        <div className="bg-black/20 border border-white/10 rounded-xl p-3 sm:col-span-2">
          <p className="text-[11px] text-white/60 mb-1">Teléfono</p>
          <input
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
            placeholder="Ej: 0962XXXXXX"
          />
        </div>
      </div>

      {/* Recaudo + Ubicación */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-black/20 border border-white/10 rounded-xl p-3">
          <p className="text-[11px] text-white/60 mb-1">Tipo</p>
          <select
            value={rateType}
            onChange={(e) => setRateType(e.target.value)}
            className="w-full bg-[#41444e] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400/60"
          >
            <option
              value="CON RECAUDO"
              style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
            >
              CON RECAUDO
            </option>
            <option
              value="SIN RECAUDO"
              style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
            >
              SIN RECAUDO
            </option>
          </select>
        </div>

        <div className="bg-black/20 border border-white/10 rounded-xl p-3">
          <p className="text-[11px] text-white/60 mb-1">
            Provincia/Departamento
          </p>
          <select
            value={selectedDepartmentId || ""}
            onChange={handleSelectDepartment}
            disabled={statesLoading}
            className="w-full bg-[#41444e] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400/60 disabled:opacity-60"
          >
            <option
              value=""
              style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
            >
              {statesLoading ? "Cargando..." : "Seleccione"}
            </option>

            {(states || []).map((d) => (
              <option
                key={d.id || d.department_id}
                value={d.id || d.department_id}
                style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
              >
                {d.name || d.department || d.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-black/20 border border-white/10 rounded-xl p-3">
          <p className="text-[11px] text-white/60 mb-1">Ciudad</p>
          <select
            value={selectedCityId || ""}
            onChange={handleSelectCity}
            disabled={!selectedDepartmentId || citiesLoading}
            className="w-full bg-[#41444e] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400/60 disabled:opacity-60"
          >
            <option
              value=""
              style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
            >
              {citiesLoading ? "Cargando..." : "Seleccione"}
            </option>
            {(cities || []).map((c) => (
              <option
                key={c.id || c.city_id}
                value={c.id || c.city_id}
                style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
              >
                {c.name || c.city || c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dirección */}
      <div className="mt-3 grid grid-cols-1 gap-3">
        <div className="bg-black/20 border border-white/10 rounded-xl p-3">
          <p className="text-[11px] text-white/60 mb-1">Dirección</p>
          <input
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
            placeholder="Ej: Calle 123 #45-67, apto 301"
          />
        </div>
      </div>

      {/* Producto */}
      <div className="mt-4 rounded-xl bg-black/20 border border-white/10 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-white">Productos</p>
          <button
            type="button"
            onClick={() => emitGetProducts(true)}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs"
            title="Actualizar productos"
          >
            <i className={`bx bx-refresh ${prodLoading ? "bx-spin" : ""}`} />
          </button>
        </div>

        <div className="mt-2 flex gap-2">
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") emitGetProducts(true);
            }}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
            placeholder="Buscar por nombre o SKU..."
          />
          <button
            type="button"
            onClick={() => emitGetProducts(true)}
            className="px-4 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/30 text-sm font-semibold"
          >
            Buscar
          </button>
        </div>

        <p className="mt-2 text-[10px] text-white/45">
          Para buscar, presione <b>Enter</b> o haga clic en <b>Buscar</b>.
        </p>

        {prodError && (
          <div className="mt-2 text-xs text-red-300 bg-red-500/10 border border-red-400/20 rounded-lg p-2">
            {prodError}
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 gap-2">
          {prodLoading ? (
            <div className="text-sm text-white/70">Cargando productos…</div>
          ) : topProducts.length === 0 ? (
            <div className="text-sm text-white/70">No hay resultados.</div>
          ) : (
            topProducts.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {p?.name || "Producto"}
                  </p>
                  <p className="text-xs text-white/60 truncate">
                    ID: {p?.id || "—"} • SKU: {p?.sku} • Precio proveedor: $
                    {p?.sale_price || "—"} • Precio sugerido: $
                    {p?.suggested_price || "—"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => addProductToCart(p)}
                  className="px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-xs font-semibold shrink-0"
                >
                  <i className="bx bx-plus" /> Agregar
                </button>
              </div>
            ))
          )}
        </div>

        {/* Carrito */}
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-xs text-white/60 mb-2">Productos agregados:</p>

          {productsCart.length === 0 ? (
            <div className="text-sm text-white/60">
              Aún no agrega productos.
            </div>
          ) : (
            <div className="space-y-2">
              {productsCart.map((it) => (
                <div
                  key={it.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {it.name}
                      </p>
                      <p className="text-xs text-white/60 truncate">
                        ID: {it?.id || "—"} • Precio proveedor:{" "}
                        {it.sale_price || "—"} • Sugerido:{" "}
                        {it.suggested_price || "—"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeProductFromCart(it.id)}
                      className="px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-xs shrink-0"
                    >
                      <i className="bx bx-trash" /> Quitar
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[11px] text-white/60 mb-1">Cantidad</p>
                      <input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) =>
                          updateCartItem(it.id, {
                            quantity: Number(e.target.value) || 1,
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
                      />
                    </div>

                    <div>
                      <p className="text-[11px] text-white/60 mb-1">
                        Precio sugerido
                      </p>
                      <input
                        type="number"
                        min={0}
                        value={it.price}
                        onChange={(e) =>
                          updateCartItem(it.id, {
                            price: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={`w-full px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border transition ${
            canSubmit
              ? "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/30"
              : "bg-white/5 border-white/10 text-white/40 cursor-not-allowed"
          }`}
        >
          <i className="bx bx-check-circle" />
          Crear orden
        </button>

        {!canSubmit && (
          <div className="text-xs text-white/50 sm:self-center">
            Complete: provincia, ciudad, producto(s), dirección, nombre y
            apellido.
          </div>
        )}
      </div>
    </div>
  );
}
