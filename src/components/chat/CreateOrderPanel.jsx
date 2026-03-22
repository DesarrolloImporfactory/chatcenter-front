import React, { useMemo } from "react";

export default function CreateOrderPanel(props) {
  const {
    phoneInput,
    setPhoneInput,
    name,
    setName,
    surname,
    setSurname,
    dir,
    setDir,
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
    shippingQuotes,
    shippingQuotesLoading,
    shippingQuotesError,
    selectedShipping,
    setSelectedShipping,
    canShowShipping,
    onRecotizar,
    keywords,
    setKeywords,
    prodList,
    prodLoading,
    prodError,
    emitGetProducts,
    addProductToCart,
    productsCart,
    updateCartItem,
    removeProductFromCart,
    canSubmit,
    onClose,
    onSubmit,
  } = props;

  const topProducts = useMemo(() => (prodList || []).slice(0, 5), [prodList]);

  const NO_IMAGE = "https://app.dropi.ec/assets/utils/no-image.jpg";

  function resolveProductImage(p) {
    if (!p) return null;
    const direct =
      p?.imageUrl ||
      p?.image_url ||
      p?.image ||
      p?.url ||
      p?.photo ||
      p?.main_image ||
      null;
    if (direct && /^https?:\/\//i.test(String(direct))) return String(direct);
    const urlS3 = p?.urlS3 || p?.url_s3 || null;
    if (urlS3) {
      return `https://app.dropi.ec/storage/${String(urlS3).replace(/^\/+/, "")}`;
    }
    return null;
  }

  function getImageOrFallback(p) {
    return resolveProductImage(p) || NO_IMAGE;
  }

  // ── Clases reutilizables ──
  const inputCls =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-[7px] px-3 py-2 text-[12px] text-white outline-none transition-all focus:border-violet-400/50 focus:bg-white/[0.06] hover:border-white/15 placeholder:text-white/[0.18]";
  const selectCls =
    "w-full bg-[#151d38] border border-white/[0.08] rounded-[7px] px-3 py-2 text-[12px] text-white outline-none transition-all focus:border-violet-400/50 hover:border-white/15 disabled:opacity-35 disabled:cursor-not-allowed";
  const labelCls =
    "text-[9px] uppercase tracking-wider text-white/35 block mb-1";
  const sectionCls =
    "rounded-[10px] bg-[#0f1629] border border-white/[0.07] overflow-hidden";

  return (
    <div className="space-y-2">
      {/* ═══ Header ═══ */}
      <div
        className={`${sectionCls} flex items-center justify-between px-3.5 py-3`}
      >
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-white tracking-tight">
            Nueva orden
          </p>
          <p className="text-[10px] text-white/35 mt-0.5">
            Complete los datos para registrar en Dropi
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-[7px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-[10px] font-medium text-white/40 hover:text-white/70 flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <i className="bx bx-x text-sm" />
          Cerrar
        </button>
      </div>

      {/* ═══ Datos del cliente ═══ */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2">
          <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">
            Datos del cliente
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 px-3.5 pb-1.5">
          <div>
            <label className={labelCls}>Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Nombre"
            />
          </div>
          <div>
            <label className={labelCls}>Apellido</label>
            <input
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              className={inputCls}
              placeholder="Apellido"
            />
          </div>
        </div>

        <div className="px-3.5 pb-1.5">
          <label className={labelCls}>Teléfono</label>
          <input
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            className={inputCls}
            placeholder="Ej: 0962XXXXXX"
          />
        </div>

        <div className="px-3.5 pb-3">
          <label className={labelCls}>Dirección de entrega</label>
          <input
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            className={inputCls}
            placeholder="Calle, referencia, sector..."
          />
        </div>
      </div>

      {/* ═══ Ubicación y tipo de envío ═══ */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2">
          <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">
            Ubicación y tipo de envío
          </span>
        </div>

        <div className="px-3.5 pb-3">
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <div>
              <label className={labelCls}>Tipo de recaudo</label>
              <select
                value={rateType}
                onChange={(e) => setRateType(e.target.value)}
                className={selectCls}
              >
                <option value="CON RECAUDO">CON RECAUDO</option>
                <option value="SIN RECAUDO">SIN RECAUDO</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Provincia</label>
              <select
                value={selectedDepartmentId || ""}
                onChange={handleSelectDepartment}
                disabled={statesLoading}
                className={selectCls}
              >
                <option value="">
                  {statesLoading ? "Cargando..." : "Seleccione"}
                </option>
                {(states || []).map((d) => (
                  <option
                    key={d.id || d.department_id}
                    value={d.id || d.department_id}
                  >
                    {d.name || d.department || d.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Ciudad</label>
            {selectedDepartmentId ? (
              <select
                value={selectedCityId || ""}
                onChange={handleSelectCity}
                disabled={citiesLoading}
                className={selectCls}
              >
                <option value="">
                  {citiesLoading ? "Cargando..." : "Seleccione"}
                </option>
                {(cities || []).map((c) => (
                  <option key={c.id || c.city_id} value={c.id || c.city_id}>
                    {c.name || c.city || c.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-[7px] bg-white/[0.02] border border-dashed border-white/[0.08]">
                <i className="bx bx-lock-alt text-white/15 text-sm" />
                <span className="text-[10px] text-white/25">
                  Selecciona una{" "}
                  <span className="text-white/45 font-semibold">provincia</span>{" "}
                  primero
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Buscar productos ═══ */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2">
          <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">
            Buscar productos
          </span>
          <button
            type="button"
            onClick={() => emitGetProducts(true)}
            className="p-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/35 hover:text-white/70 transition-colors"
            title="Actualizar productos"
          >
            <i
              className={`bx bx-refresh text-sm ${prodLoading ? "bx-spin" : ""}`}
            />
          </button>
        </div>

        {/* Buscador */}
        <div className="flex gap-1.5 px-3.5 pb-2.5">
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") emitGetProducts(true);
            }}
            className={`${inputCls} flex-1`}
            placeholder="Nombre o SKU..."
          />
          <button
            type="button"
            onClick={() => emitGetProducts(true)}
            className="px-3.5 py-2 rounded-[7px] bg-violet-500/[0.12] hover:bg-violet-500/[0.22] border border-violet-400/[0.18] text-[10px] font-semibold text-violet-300 shrink-0 transition-colors"
          >
            Buscar
          </button>
        </div>

        {prodError && (
          <div className="mx-3.5 mb-2.5 text-[10px] text-red-300 bg-red-500/10 border border-red-400/20 rounded-md p-2">
            {prodError}
          </div>
        )}

        {/* Resultados */}
        <div className="px-3.5 pb-3">
          {prodLoading ? (
            <p className="text-[10px] text-white/35 py-2">
              Cargando productos…
            </p>
          ) : topProducts.length === 0 ? (
            <p className="text-[10px] text-white/35 py-2">No hay resultados.</p>
          ) : (
            <div className="space-y-1">
              {topProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 rounded-lg border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.1] p-2 transition-all"
                >
                  <img
                    src={getImageOrFallback(p)}
                    alt={p?.name || "Producto"}
                    className="h-[38px] w-[38px] rounded-[7px] object-cover bg-white/[0.04] border border-white/[0.06] shrink-0"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = NO_IMAGE;
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-white/[0.88] truncate">
                      {p?.name || "Producto"}
                    </p>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px] text-white/50">
                        Prov.{" "}
                        <span className="font-semibold text-white/75">
                          ${p?.sale_price || "—"}
                        </span>
                      </span>
                      <span className="text-[10px] text-white/50">
                        Sug.{" "}
                        <span className="font-semibold text-white/75">
                          ${p?.suggested_price || "—"}
                        </span>
                      </span>
                    </div>
                    <p className="text-[9px] text-white/25 mt-0.5">
                      SKU {p?.sku || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addProductToCart(p)}
                    className="px-3 py-1.5 rounded-[7px] bg-emerald-500/[0.12] hover:bg-emerald-500/[0.22] border border-emerald-400/[0.18] text-[10px] font-semibold text-emerald-300 shrink-0 transition-colors"
                  >
                    Agregar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Carrito ═══ */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2">
          <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">
            Carrito
          </span>
          {productsCart.length > 0 && (
            <span className="text-[9px] font-semibold bg-emerald-500/[0.12] text-emerald-300 px-2 py-0.5 rounded">
              {productsCart.length}{" "}
              {productsCart.length === 1 ? "producto" : "productos"}
            </span>
          )}
        </div>

        <div className="px-3.5 pb-3">
          {productsCart.length === 0 ? (
            <p className="text-[10px] text-white/25 py-1">
              Aún no agregas productos al carrito.
            </p>
          ) : (
            <div className="space-y-1.5">
              {productsCart.map((it) => (
                <div
                  key={it.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-2.5"
                >
                  {/* Producto info + quitar */}
                  <div className="flex items-center gap-2.5">
                    <img
                      src={getImageOrFallback(it?.__raw || it)}
                      alt={it?.name || "Producto"}
                      className="h-[38px] w-[38px] rounded-[7px] object-cover bg-white/[0.04] border border-white/[0.06] shrink-0"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = NO_IMAGE;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-white/[0.88] truncate">
                        {it.name}
                      </p>
                      <p className="text-[9px] text-white/30 mt-0.5">
                        Prov. ${it.sale_price || "—"} · Sug. $
                        {it.suggested_price || "—"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProductFromCart(it.id)}
                      className="px-2.5 py-1 rounded-md bg-rose-500/[0.08] hover:bg-rose-500/[0.18] border border-rose-400/[0.12] text-[9px] font-semibold text-rose-300/80 hover:text-rose-300 shrink-0 transition-colors"
                    >
                      Quitar
                    </button>
                  </div>

                  {/* Cantidad + Precio */}
                  <div className="mt-2 pt-2 border-t border-white/[0.05] grid grid-cols-2 gap-1.5">
                    <div>
                      <label className={labelCls}>Cantidad</label>
                      <input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) =>
                          updateCartItem(it.id, {
                            quantity: Number(e.target.value) || 1,
                          })
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Precio venta</label>
                      <input
                        type="number"
                        min={0}
                        value={it.price}
                        onChange={(e) =>
                          updateCartItem(it.id, {
                            price: Number(e.target.value) || 0,
                          })
                        }
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Transportadora ═══ */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2">
          <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">
            Transportadora
          </span>
          {canShowShipping && (
            <button
              type="button"
              onClick={onRecotizar}
              disabled={shippingQuotesLoading}
              className="p-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/35 hover:text-white/70 transition-colors"
              title="Recotizar"
            >
              <i
                className={`bx bx-refresh text-sm ${shippingQuotesLoading ? "bx-spin" : ""}`}
              />
            </button>
          )}
        </div>

        <div className="px-3.5 pb-3">
          {!canShowShipping && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-[7px] bg-white/[0.02] border border-dashed border-white/[0.08]">
              <i className="bx bx-lock-alt text-white/15 text-sm shrink-0" />
              <span className="text-[10px] text-white/25">
                Selecciona{" "}
                <span className="text-white/45 font-semibold">ciudad</span> y
                agrega al menos{" "}
                <span className="text-white/45 font-semibold">1 producto</span>{" "}
                al carrito
              </span>
            </div>
          )}

          {canShowShipping && shippingQuotesLoading && (
            <p className="text-[10px] text-white/35 py-1">
              Cotizando transportadoras…
            </p>
          )}

          {canShowShipping && shippingQuotesError && (
            <div className="text-[10px] text-rose-300 bg-rose-500/10 border border-rose-400/15 rounded-md p-2">
              {shippingQuotesError}
            </div>
          )}

          {canShowShipping &&
            !shippingQuotesLoading &&
            !shippingQuotesError && (
              <>
                {(shippingQuotes || []).length === 0 ? (
                  <p className="text-[10px] text-white/35 py-1">
                    No hay transportadoras disponibles.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {shippingQuotes.map((t, idx) => {
                      const hasPrice = Number(t?.objects?.precioEnvio) > 0;
                      const tName =
                        t?.transportadora ||
                        t?.distributionCompany?.name ||
                        "Transportadora";
                      const price = hasPrice
                        ? String(t?.objects?.precioEnvio)
                        : null;
                      const isSelected =
                        selectedShipping?.transportadora_id ===
                        t?.transportadora_id;

                      return (
                        <button
                          type="button"
                          key={(t?.transportadora_id || idx) + "_" + idx}
                          onClick={() => hasPrice && setSelectedShipping(t)}
                          disabled={!hasPrice}
                          className={`text-left rounded-lg border p-2.5 transition-all ${
                            isSelected
                              ? "border-emerald-400/[0.35] bg-emerald-500/[0.08]"
                              : "border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.12]"
                          } ${!hasPrice ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                          <p className="text-[11px] font-semibold text-white/85 truncate">
                            {tName}
                          </p>
                          <p className="text-[13px] font-bold text-white mt-1 tracking-tight">
                            {price ? (
                              <>
                                ${price}
                                {t?.objects?.overload_was_applied && (
                                  <span className="ml-1 text-[8px] font-medium text-amber-300/80">
                                    *Sobrecargo
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[10px] font-medium text-rose-300/60">
                                No disponible
                              </span>
                            )}
                          </p>
                          <p className="text-[9px] text-white/25 mt-1 truncate">
                            {t?.transportadora_service || "normal"} · ID{" "}
                            {t?.transportadora_id ?? "—"}
                          </p>
                          {t?.error && (
                            <p className="mt-1.5 text-[9px] text-rose-300 bg-rose-500/10 rounded p-1.5">
                              {t.error}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
        </div>
      </div>

      {/* ═══ Resumen ═══ */}
      {productsCart.length > 0 && (
        <div className={sectionCls}>
          <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2">
            <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">
              Resumen del pedido
            </span>
          </div>
          <div className="px-3.5 pb-3">
            {(() => {
              const subtotal = productsCart.reduce(
                (acc, it) =>
                  acc + Number(it.quantity || 0) * Number(it.price || 0),
                0,
              );
              const ship = Number(selectedShipping?.objects?.precioEnvio) || 0;
              const total = subtotal + ship;
              const carrierName = selectedShipping?.transportadora || null;

              return (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-white/45">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-white/45">
                    <span>Envío{carrierName ? ` (${carrierName})` : ""}</span>
                    <span>${ship.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[14px] font-bold text-white pt-2 mt-1 border-t border-white/[0.06] tracking-tight">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ═══ Submit ═══ */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={`w-full px-3.5 py-3 rounded-[10px] text-[12px] font-semibold flex items-center justify-center gap-2 border transition-colors ${
            canSubmit
              ? "bg-emerald-500/[0.12] hover:bg-emerald-500/[0.22] border-emerald-400/[0.22] text-emerald-300"
              : "bg-white/[0.02] border-white/[0.05] text-white/[0.18] cursor-not-allowed"
          }`}
        >
          <i className="bx bx-check-circle text-sm" />
          Crear orden
        </button>
        {!canSubmit && (
          <p className="text-[9px] text-white/20 text-center mt-1.5">
            Complete todos los campos y seleccione una transportadora
          </p>
        )}
      </div>
    </div>
  );
}
