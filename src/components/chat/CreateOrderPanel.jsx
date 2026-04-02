import React, { useMemo, useState, useCallback, useRef } from "react";
import Select from "react-select";
import { resolveProductImage, NO_IMAGE } from "../../utils/orderHelper";

/* ── estilos react-select para dark theme ── */
const reactSelectStyles = {
  control: (base, state) => ({
    ...base,
    background: "rgba(255,255,255,0.04)",
    borderColor: state.isFocused
      ? "rgba(167,139,250,0.5)"
      : "rgba(255,255,255,0.08)",
    borderRadius: 7,
    minHeight: 34,
    fontSize: 12,
    color: "#fff",
    boxShadow: "none",
    "&:hover": { borderColor: "rgba(255,255,255,0.15)" },
  }),
  menu: (base) => ({
    ...base,
    background: "#151d38",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 7,
    zIndex: 50,
    fontSize: 12,
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: 180,
    padding: 2,
  }),
  option: (base, state) => ({
    ...base,
    background: state.isFocused
      ? "rgba(167,139,250,0.15)"
      : state.isSelected
        ? "rgba(167,139,250,0.25)"
        : "transparent",
    color: "#fff",
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 5,
    cursor: "pointer",
    "&:active": { background: "rgba(167,139,250,0.3)" },
  }),
  singleValue: (base) => ({ ...base, color: "#fff", fontSize: 12 }),
  input: (base) => ({ ...base, color: "#fff", fontSize: 12 }),
  placeholder: (base) => ({
    ...base,
    color: "rgba(255,255,255,0.18)",
    fontSize: 12,
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "rgba(255,255,255,0.25)",
    padding: "0 6px",
    "&:hover": { color: "rgba(255,255,255,0.5)" },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: "rgba(255,255,255,0.25)",
    padding: "0 4px",
    "&:hover": { color: "rgba(255,255,255,0.5)" },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
  }),
  loadingMessage: (base) => ({
    ...base,
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
  }),
};

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
    notes,
    setNotes,
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
    /* ─── NUEVAS PROPS para checklist preciso ─── */
    selectedCityCodDane,
    remitCodDane,
  } = props;

  // ── Protección anti-doble-submit ──
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const handleSafeSubmit = useCallback(() => {
    if (submitLockRef.current) return;
    if (isSubmitting) return;
    if (!canSubmit) return;

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      onSubmit();
    } catch (_) {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }

    // Safety net: desbloquear después de 4s
    setTimeout(() => {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }, 4000);
  }, [canSubmit, isSubmitting, onSubmit]);

  const topProducts = useMemo(() => (prodList || []).slice(0, 5), [prodList]);

  const getImageOrFallback = (p) => resolveProductImage(p) || NO_IMAGE;

  // ── Clases reutilizables ──
  const inputCls =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-[7px] px-3 py-2 text-[12px] text-white outline-none transition-all focus:border-violet-400/50 focus:bg-white/[0.06] hover:border-white/15 placeholder:text-white/[0.18]";
  const selectCls =
    "w-full bg-[#151d38] border border-white/[0.08] rounded-[7px] px-3 py-2 text-[12px] text-white outline-none transition-all focus:border-violet-400/50 hover:border-white/15 disabled:opacity-35 disabled:cursor-not-allowed";
  const labelCls =
    "text-[9px] uppercase tracking-wider text-white/35 block mb-1";
  const sectionCls =
    "rounded-[10px] bg-[#0f1629] border border-white/[0.07] overflow-hidden";
  const requiredMark = <span className="text-rose-400 ml-0.5">*</span>;

  // ── ¿Ya se consultaron transportadoras al menos una vez? ──
  const hasQuoted =
    shippingQuotes.length > 0 || shippingQuotesError || shippingQuotesLoading;

  /* ── opciones react-select para Provincia ── */
  const stateOptions = useMemo(
    () =>
      (states || []).map((d) => ({
        value: Number(d.id || d.department_id),
        label: d.name || d.department || d.nombre || "",
        __raw: d,
      })),
    [states],
  );
  const selectedStateOption = useMemo(
    () =>
      stateOptions.find((o) => o.value === Number(selectedDepartmentId)) ||
      null,
    [stateOptions, selectedDepartmentId],
  );

  /* ── opciones react-select para Ciudad ── */
  const cityOptions = useMemo(
    () =>
      (cities || []).map((c) => ({
        value: Number(c.id || c.city_id),
        label: c.name || c.city || c.nombre || "",
        __raw: c,
      })),
    [cities],
  );
  const selectedCityOption = useMemo(
    () => cityOptions.find((o) => o.value === Number(selectedCityId)) || null,
    [cityOptions, selectedCityId],
  );

  /* ── handlers para react-select → bridge al mismo handleSelectDepartment/City ── */
  const onStateChange = useCallback(
    (opt) => {
      // Simular el mismo evento que espera handleSelectDepartment
      handleSelectDepartment({
        target: { value: opt ? String(opt.value) : "" },
      });
    },
    [handleSelectDepartment],
  );

  const onCityChange = useCallback(
    (opt) => {
      handleSelectCity({
        target: { value: opt ? String(opt.value) : "" },
      });
    },
    [handleSelectCity],
  );

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
            <label className={labelCls}>Nombre{requiredMark}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Nombre"
            />
          </div>
          <div>
            <label className={labelCls}>Apellido{requiredMark}</label>
            <input
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              className={inputCls}
              placeholder="Apellido"
            />
          </div>
        </div>

        <div className="px-3.5 pb-1.5">
          <label className={labelCls}>Teléfono{requiredMark}</label>
          <input
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            className={inputCls}
            placeholder="Ej: 0962XXXXXX"
          />
        </div>

        <div className="px-3.5 pb-1.5">
          <label className={labelCls}>Dirección de entrega{requiredMark}</label>
          <input
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            className={inputCls}
            placeholder="Calle, referencia, sector..."
          />
        </div>

        <div className="px-3.5 pb-3">
          <label className={labelCls}>
            Notas para la orden{" "}
            <span className="text-white/15 normal-case">(opcional)</span>
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputCls}
            placeholder="Nota para el rótulo de la orden..."
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

            {/* ── Provincia: react-select buscable ── */}
            <div>
              <label className={labelCls}>Provincia{requiredMark}</label>
              <Select
                options={stateOptions}
                value={selectedStateOption}
                onChange={onStateChange}
                isLoading={statesLoading}
                isDisabled={statesLoading}
                isClearable
                placeholder={
                  statesLoading ? "Cargando..." : "Buscar provincia..."
                }
                noOptionsMessage={() => "Sin resultados"}
                loadingMessage={() => "Cargando..."}
                styles={reactSelectStyles}
                menuPlacement="auto"
              />
            </div>
          </div>

          {/* ── Ciudad: react-select buscable ── */}
          <div>
            <label className={labelCls}>Ciudad{requiredMark}</label>
            {selectedDepartmentId ? (
              <Select
                options={cityOptions}
                value={selectedCityOption}
                onChange={onCityChange}
                isLoading={citiesLoading}
                isDisabled={citiesLoading}
                isClearable
                placeholder={citiesLoading ? "Cargando..." : "Buscar ciudad..."}
                noOptionsMessage={() => "Sin resultados"}
                loadingMessage={() => "Cargando..."}
                styles={reactSelectStyles}
                menuPlacement="auto"
              />
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-[7px] bg-white/[0.02] border border-dashed border-amber-400/20">
                <i className="bx bx-lock-alt text-amber-400/40 text-sm" />
                <span className="text-[10px] text-amber-300/40">
                  Selecciona una{" "}
                  <span className="text-amber-300/70 font-semibold">
                    provincia
                  </span>{" "}
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
            Buscar productos{requiredMark}
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

        <div className="flex gap-1.5 px-3.5 pb-2.5">
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") emitGetProducts(true);
            }}
            className={`${inputCls} flex-1`}
            placeholder="Nombre, ID o SKU..."
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
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[7px] bg-amber-500/[0.04] border border-dashed border-amber-400/15">
              <i className="bx bx-cart text-amber-400/40 text-sm" />
              <span className="text-[10px] text-amber-300/45">
                Agrega al menos{" "}
                <span className="text-amber-300/70 font-semibold">
                  1 producto
                </span>{" "}
                para continuar
              </span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {productsCart.map((it) => (
                <div
                  key={it.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-2.5"
                >
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

      {/* ═══ Checklist visual pre-cotización ═══ */}
      <div className={sectionCls}>
        <div className="px-3.5 py-2.5">
          <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold block mb-2">
            Requisitos para cotizar envío
          </span>
          <div className="space-y-1">
            <CheckItem
              done={Boolean(name?.trim())}
              label="Nombre del cliente"
            />
            <CheckItem
              done={Boolean(surname?.trim())}
              label="Apellido del cliente"
            />
            <CheckItem
              done={Boolean(phoneInput?.replace(/\D/g, ""))}
              label="Teléfono"
            />
            <CheckItem
              done={Boolean(dir?.trim())}
              label="Dirección de entrega"
            />
            <CheckItem
              done={Boolean(selectedDepartmentId)}
              label="Provincia seleccionada"
            />
            <CheckItem
              done={Boolean(selectedCityId)}
              label="Ciudad seleccionada"
            />
            <CheckItem
              done={productsCart.length > 0}
              label="Al menos 1 producto en carrito"
            />

            {/* ── Checks REALES que determinan canShowShipping ── */}
            <CheckItem
              done={Boolean(selectedCityCodDane)}
              label="Ciudad con código DANE"
              warn={Boolean(selectedCityId) && !selectedCityCodDane}
              warnText="La ciudad seleccionada no tiene cod_dane"
            />
            <CheckItem
              done={Boolean(remitCodDane)}
              label="Bodega remitente con código DANE"
              warn={productsCart.length > 0 && !remitCodDane}
              warnText="El producto no tiene bodega con cod_dane"
            />
          </div>
        </div>
      </div>

      {/* ═══ Transportadora ═══ */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2">
          <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">
            Transportadora{requiredMark}
          </span>
          {canShowShipping && hasQuoted && (
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
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[7px] bg-amber-500/[0.04] border border-dashed border-amber-400/20">
              <i className="bx bx-error-circle text-amber-400/50 text-sm shrink-0" />
              <span className="text-[10px] text-amber-300/50">
                {/* Mensaje más específico según lo que falta */}
                {!selectedCityCodDane && !remitCodDane
                  ? "La ciudad no tiene código DANE y el producto no tiene bodega con código DANE. Revisa el checklist."
                  : !selectedCityCodDane
                    ? "La ciudad seleccionada no tiene código DANE (cod_dane). Intenta seleccionar otra ciudad."
                    : !remitCodDane
                      ? "El producto del carrito no tiene una bodega con código DANE asignado. Verifica el producto en Dropi."
                      : "Revisa el checklist de arriba. Necesitas provincia, ciudad y al menos 1 producto para consultar transportadoras."}
              </span>
            </div>
          )}

          {canShowShipping && !hasQuoted && (
            <button
              type="button"
              onClick={onRecotizar}
              disabled={shippingQuotesLoading}
              className="w-full px-3.5 py-3 rounded-[7px] bg-blue-500/[0.12] hover:bg-blue-500/[0.22] border border-blue-400/[0.22] text-[11px] font-semibold text-blue-300 flex items-center justify-center gap-2 transition-colors"
            >
              <i className="bx bx-search-alt text-sm" />
              Consultar transportadoras
            </button>
          )}

          {canShowShipping && shippingQuotesLoading && (
            <div className="grid grid-cols-2 gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-2.5 animate-pulse"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-md bg-white/[0.06]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-20 rounded bg-white/[0.06]" />
                    </div>
                  </div>
                  <div className="h-4 w-14 rounded bg-white/[0.06] mt-2" />
                </div>
              ))}
            </div>
          )}

          {canShowShipping && shippingQuotesError && !shippingQuotesLoading && (
            <div className="text-[10px] text-rose-300 bg-rose-500/10 border border-rose-400/15 rounded-md p-2">
              {shippingQuotesError}
            </div>
          )}

          {canShowShipping &&
            !shippingQuotesLoading &&
            !shippingQuotesError &&
            hasQuoted && (
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
                        ? Number(t?.objects?.precioEnvio).toFixed(2)
                        : null;
                      const isSelected =
                        selectedShipping?.transportadora_id ===
                        t?.transportadora_id;
                      const hasSobrecargo =
                        t?.objects?.overload_was_applied === true;

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
                          <div className="flex items-center gap-2.5">
                            <img
                              src={`https://app.dropi.ec/assets/images/delivery/${t?.transportadora_minuscula || "default"}.png`}
                              alt={tName}
                              className="h-8 w-8 rounded-md object-contain bg-white/[0.06] border border-white/[0.06] shrink-0"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.style.display = "none";
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold text-white/85 truncate">
                                {tName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-baseline gap-1.5 mt-2">
                            {price ? (
                              <>
                                <span className="text-[13px] font-bold text-white tracking-tight">
                                  ${price}
                                </span>
                                {hasSobrecargo && (
                                  <span className="text-[8px] font-medium text-amber-300/80 bg-amber-400/10 px-1.5 py-0.5 rounded">
                                    +Sobrecargo
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[10px] font-medium text-rose-300/60">
                                No disponible
                              </span>
                            )}
                          </div>
                          {t?.error && (
                            <p className="mt-1.5 text-[9px] text-rose-300 bg-rose-500/10 rounded p-1.5 line-clamp-2">
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

      {/* ═══ Resumen del pedido (con flete absorbido) ═══ */}
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

              const costoProveedor = productsCart.reduce(
                (acc, it) =>
                  acc + Number(it.quantity || 0) * (Number(it.sale_price) || 0),
                0,
              );
              const utilidadEstimada =
                costoProveedor > 0 ? total - costoProveedor - ship : null;

              return (
                <div className="space-y-1">
                  {productsCart.map((it) => {
                    const lineTotal =
                      Number(it.quantity || 0) * Number(it.price || 0);
                    return (
                      <div
                        key={it.id}
                        className="flex justify-between text-[10px] text-white/40"
                      >
                        <span className="truncate max-w-[60%]">
                          {it.name} ×{it.quantity}
                        </span>
                        <span>${lineTotal.toFixed(2)}</span>
                      </div>
                    );
                  })}

                  <div className="flex justify-between text-[11px] text-white/50 pt-1 mt-1 border-t border-white/[0.04]">
                    <span>Subtotal productos</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-[11px] text-white/50">
                    <span>
                      Envío
                      {carrierName ? ` (${carrierName})` : ""}
                    </span>
                    <span>${ship.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-[14px] font-bold text-white pt-2 mt-1 border-t border-white/[0.06] tracking-tight">
                    <span>Total a cobrar</span>
                    <span>${total.toFixed(2)}</span>
                  </div>

                  {ship > 0 && (
                    <div className="mt-2 px-2.5 py-2 rounded-[7px] bg-blue-500/[0.06] border border-blue-400/[0.12]">
                      <div className="flex items-start gap-2">
                        <i className="bx bx-info-circle text-blue-400/60 text-sm mt-0.5 shrink-0" />
                        <p className="text-[9px] text-blue-300/70 leading-relaxed">
                          El costo del envío (
                          <span className="font-semibold text-blue-300">
                            ${ship.toFixed(2)}
                          </span>
                          ) se incluirá dentro del precio del producto al crear
                          la orden en Dropi. Esto asegura que el courier recaude
                          el monto correcto.
                        </p>
                      </div>
                    </div>
                  )}

                  {notes?.trim() && (
                    <div className="flex justify-between text-[10px] text-white/35 pt-1">
                      <span>Nota</span>
                      <span className="text-right max-w-[60%] truncate">
                        {notes.trim()}
                      </span>
                    </div>
                  )}
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
          onClick={handleSafeSubmit}
          disabled={!canSubmit || isSubmitting}
          className={`w-full px-3.5 py-3 rounded-[10px] text-[12px] font-semibold flex items-center justify-center gap-2 border transition-colors ${
            canSubmit && !isSubmitting
              ? "bg-emerald-500/[0.12] hover:bg-emerald-500/[0.22] border-emerald-400/[0.22] text-emerald-300"
              : "bg-white/[0.02] border-white/[0.05] text-white/[0.18] cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <>
              <i className="bx bx-loader-alt bx-spin text-sm" />
              Creando orden…
            </>
          ) : (
            <>
              <i className="bx bx-check-circle text-sm" />
              Crear orden
            </>
          )}
        </button>
        {!canSubmit && !isSubmitting && (
          <p className="text-[9px] text-white/20 text-center mt-1.5">
            Complete todos los campos obligatorios y seleccione una
            transportadora
          </p>
        )}
      </div>
    </div>
  );
}

function CheckItem({ done, label, warn = false, warnText = "" }) {
  return (
    <div className="flex items-center gap-2">
      <i
        className={`bx ${
          done
            ? "bx-check-circle text-emerald-400"
            : warn
              ? "bx-error-circle text-amber-400"
              : "bx-circle text-white/20"
        } text-sm`}
      />
      <span
        className={`text-[10px] ${
          done
            ? "text-emerald-300/80"
            : warn
              ? "text-amber-300/80"
              : "text-white/30"
        }`}
      >
        {label}
        {warn && warnText && (
          <span className="text-[8px] text-amber-300/60 ml-1">
            — {warnText}
          </span>
        )}
      </span>
    </div>
  );
}
