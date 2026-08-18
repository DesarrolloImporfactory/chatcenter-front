import React, { useCallback, useMemo, useRef, useState } from "react";
import UbicacionPicker from "./UbicacionPicker";
import BuscadorDireccion from "./BuscadorDireccion";

/**
 * Formulario de creación de pedido contraentrega en Aliclik.
 *
 * Sigue las mismas convenciones visuales que CreateOrderPanel (el de Dropi) —
 * tarjeta de header, secciones en mayúsculas con tracking ancho, checklist de
 * requisitos, resumen y submit verde — para que el asesor no sienta que cambió
 * de producto al cambiar de proveedor.
 *
 * Lo único que se aparta a propósito es el ACENTO DE COLOR: cyan en vez del
 * violeta de Dropi. No es decorativo — el selector de plataforma usa el mismo
 * código de color, así que el formulario entero le dice al asesor en cuál está
 * operando. Crear un pedido peruano desde el panel equivocado es un error caro.
 *
 * Los pasos sí son distintos, porque Aliclik no tiene catálogo de ciudades:
 *   Dropi     cliente → provincia/ciudad → productos → cotiza → crear
 *   Aliclik   cliente → lat/lng          → productos → cotiza → crear
 *
 * Toda la lógica vive en useCreateAliclikOrder; acá solo hay presentación.
 */

const NO_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#1e293b"/><text x="50%" y="54%" font-size="9" fill="#64748b" text-anchor="middle" font-family="sans-serif">S/F</text></svg>`,
  );

const soles = (n) =>
  `S/ ${Number(n || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/* ── CheckItem (mismo componente visual que el panel de Dropi) ── */
function CheckItem({ done, label }) {
  return (
    <div className="flex items-center gap-2">
      <i
        className={`bx ${
          done ? "bx-check-circle text-emerald-400" : "bx-circle text-white/20"
        } text-sm`}
      />
      <span
        className={`text-[10px] ${done ? "text-emerald-300/80" : "text-white/30"}`}
      >
        {label}
      </span>
    </div>
  );
}

export default function CreateAliclikOrderPanel({ hook, onClose }) {
  const {
    prodList,
    prodLoading,
    prodError,
    keywords,
    setKeywords,
    emitGetProducts,
    productsCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    warehouseName,
    totalProductos,
    totalPedido,
    phoneInput,
    setPhoneInput,
    name,
    setName,
    surname,
    setSurname,
    dir,
    setDir,
    reference,
    setReference,
    notes,
    setNotes,
    lat,
    lng,
    coordsOrigen,
    ubicacionChat,
    ubicacionChatLoading,
    usarUbicacionDelChat,
    setCoordsDesdeMapa,
    setCoordsDesdeBusqueda,
    quotes,
    quotesLoading,
    quotesError,
    ubigeo,
    selectedCourier,
    seleccionarCourier,
    deliveryCharge,
    setDeliveryCharge,
    puedeCotizar,
    emitCotizar,
    creating,
    canSubmit,
    emitCreateOrder,
  } = hook;

  const [mostrarMapa, setMostrarMapa] = useState(false);

  /* Candado anti-doble-submit, igual que en el panel de Dropi. `creating` se
     apaga solo cuando responde el socket, así que sin este ref un doble clic
     rápido alcanza a emitir dos veces antes del re-render — y en fulfillment
     eso es un pedido duplicado de verdad. */
  const submitLockRef = useRef(false);
  const handleSafeSubmit = useCallback(() => {
    if (!canSubmit || submitLockRef.current) return;
    submitLockRef.current = true;
    emitCreateOrder();
    setTimeout(() => {
      submitLockRef.current = false;
    }, 4000);
  }, [canSubmit, emitCreateOrder]);

  // ── Clases (mismas que CreateOrderPanel, con el foco en cyan) ──
  const inputCls =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-[7px] px-3 py-2 text-[12px] text-white outline-none transition-all focus:border-cyan-400/50 focus:bg-white/[0.06] hover:border-white/15 placeholder:text-white/[0.18]";
  const labelCls =
    "text-[9px] uppercase tracking-wider text-white/35 block mb-1";
  const sectionCls =
    "rounded-[10px] bg-[#0f1629] border border-white/[0.07] overflow-hidden";
  const headerCls =
    "text-[10px] uppercase tracking-widest text-white/35 font-semibold";
  const requiredMark = <span className="text-rose-400 ml-0.5">*</span>;

  const eansEnCarrito = useMemo(
    () => new Set(productsCart.map((p) => p.ean)),
    [productsCart],
  );

  const hayUbicacion = Boolean(lat && lng);

  const buscar = (e) => {
    e?.preventDefault?.();
    emitGetProducts({ page: 1 });
  };

  return (
    <div className="space-y-2">
      {/* ═══ Header ═══ */}
      <div
        className={`${sectionCls} flex items-center justify-between px-3.5 py-3`}
      >
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-white tracking-tight">
            Nuevo pedido
          </p>
          <p className="text-[10px] text-white/35 mt-0.5">
            Complete los datos para registrar en Aliclik
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
          <span className={headerCls}>Datos del cliente</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 px-3.5 pb-1.5">
          <div>
            <label className={labelCls}>Nombre{requiredMark}</label>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Apellido</label>
            <input
              className={inputCls}
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
            />
          </div>
        </div>

        <div className="px-3.5 pb-1.5">
          <label className={labelCls}>Teléfono{requiredMark}</label>
          <input
            className={inputCls}
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="987654321"
          />
          {/* Aliclik acepta teléfono de cualquier país (lo que define la
              entrega son las coordenadas), pero un número extranjero sin
              código de país se leería como peruano y saldría mal. */}
          <p className="mt-0.5 text-[9px] text-white/25">
            Peruano: 9 dígitos. De otro país: con código (ej. 593980709288).
          </p>
        </div>

        <div className="px-3.5 pb-1.5">
          <label className={labelCls}>Dirección de entrega{requiredMark}</label>
          <input
            className={inputCls}
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            placeholder="Av. Arequipa 1234, Lince"
          />
        </div>

        <div className="px-3.5 pb-1.5">
          <label className={labelCls}>Referencia</label>
          <input
            className={inputCls}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Frente al parque, portón azul"
          />
        </div>

        <div className="px-3.5 pb-3">
          <label className={labelCls}>Nota para Aliclik</label>
          <textarea
            className={inputCls}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Indicaciones para el courier…"
          />
        </div>
      </div>

      {/* ═══ Ubicación ═══
          Ocupa el lugar que en Dropi tienen provincia y ciudad: Aliclik no
          tiene catálogo de ubigeo, lo resuelve desde las coordenadas. */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2">
          <span className={headerCls}>
            Ubicación del cliente{requiredMark}
          </span>
          {/* Con solo el icono nadie encontraba el mapa: va con texto. */}
          <button
            type="button"
            onClick={() => setMostrarMapa((v) => !v)}
            className="px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[9px] font-semibold text-white/45 hover:text-white/80 flex items-center gap-1 transition-colors"
          >
            <i className={`bx ${mostrarMapa ? "bx-x" : "bx-map"} text-sm`} />
            {mostrarMapa ? "Ocultar mapa" : "Marcar en el mapa"}
          </button>
        </div>

        <div className="px-3.5 pb-3 space-y-2">
          <button
            type="button"
            onClick={usarUbicacionDelChat}
            disabled={ubicacionChatLoading}
            className="w-full px-3.5 py-2.5 rounded-[7px] bg-cyan-500/[0.12] hover:bg-cyan-500/[0.22] border border-cyan-400/[0.22] text-[11px] font-semibold text-cyan-300 flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
          >
            <i
              className={`bx ${
                ubicacionChatLoading ? "bx-loader-alt bx-spin" : "bx-map-pin"
              } text-sm`}
            />
            Usar ubicación del chat
          </button>

          {/* Se dice explícitamente si hay o no ubicación compartida: es la
              diferencia entre confiar en el punto del cliente o en uno que
              puso el asesor a ojo. */}
          {ubicacionChat ? (
            <p className="text-[9px] text-emerald-300/70 flex items-center gap-1.5">
              <i className="bx bx-check-circle text-[11px]" />
              El cliente compartió su ubicación
              {ubicacionChat.compartida_en
                ? ` el ${new Date(ubicacionChat.compartida_en).toLocaleString("es-PE")}`
                : ""}
            </p>
          ) : (
            !ubicacionChatLoading && (
              <div className="flex items-start gap-2 px-2.5 py-2 rounded-[7px] bg-amber-500/[0.06] border border-amber-400/[0.15]">
                <i className="bx bx-info-circle text-amber-400/60 text-sm mt-0.5 shrink-0" />
                <p className="text-[9px] text-amber-300/70 leading-relaxed">
                  Este cliente no ha compartido su ubicación por WhatsApp.
                  Pídesela o marca el punto en el mapa.
                </p>
              </div>
            )
          )}

          {/* Tres niveles de confianza distintos, no dos: la ubicación que
              mandó el cliente es exacta; la del buscador acierta la calle pero
              no siempre el número. El asesor tiene que poder distinguirlas de
              un vistazo antes de crear el pedido. */}
          {hayUbicacion ? (
            <p className="text-[9px] text-white/45">
              <span className="text-white/25">Punto:</span> {lat}, {lng}{" "}
              <span
                className={
                  coordsOrigen === "chat"
                    ? "text-emerald-300/70"
                    : "text-amber-300/70"
                }
              >
                (
                {coordsOrigen === "chat"
                  ? "del cliente"
                  : coordsOrigen === "busqueda"
                    ? "aproximada por dirección"
                    : "marcado a mano"}
                )
              </span>
            </p>
          ) : (
            <p className="text-[9px] text-white/25">Sin punto definido</p>
          )}

          {mostrarMapa && (
            <div className="space-y-1.5">
              {/* Arranca con lo que el asesor ya escribió en "Dirección de
                  entrega": es lo que va a querer buscar el 90% de las veces. */}
              <BuscadorDireccion
                defaultQuery={dir}
                onSelect={setCoordsDesdeBusqueda}
              />
              <UbicacionPicker
                lat={lat}
                lng={lng}
                onChange={setCoordsDesdeMapa}
              />
            </div>
          )}
        </div>
      </div>

      {/* ═══ Buscar productos ═══ */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2">
          <span className={headerCls}>Buscar productos{requiredMark}</span>
          <div className="flex items-center gap-1.5">
            {warehouseName && (
              <span
                className="text-[9px] text-white/30 truncate max-w-[120px]"
                title={`Almacén del pedido: ${warehouseName}`}
              >
                <i className="bx bx-building-house text-[10px] mr-0.5" />
                {warehouseName}
              </span>
            )}
            <button
              type="button"
              onClick={buscar}
              className="p-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/35 hover:text-white/70 transition-colors"
              title="Actualizar productos"
            >
              <i
                className={`bx bx-refresh text-sm ${prodLoading ? "bx-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <form onSubmit={buscar} className="flex gap-1.5 px-3.5 pb-2.5">
          <input
            className={`${inputCls} flex-1`}
            placeholder="Nombre del producto..."
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
          <button
            type="submit"
            className="px-3.5 py-2 rounded-[7px] bg-cyan-500/[0.12] hover:bg-cyan-500/[0.22] border border-cyan-400/[0.18] text-[10px] font-semibold text-cyan-300 shrink-0 transition-colors"
          >
            Buscar
          </button>
        </form>

        <div className="px-3.5 pb-3 space-y-2">
          {prodError && (
            <p className="text-[10px] text-red-300 bg-red-500/10 border border-red-400/20 rounded-[7px] p-2">
              {prodError}
            </p>
          )}

          {/* Un renglón por SKU: Aliclik pide EAN, no id de producto. */}
          {!prodLoading && prodList?.length > 0 && (
            <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
              {prodList.map((sku) => {
                const yaEsta = eansEnCarrito.has(sku.ean);
                const sinStock = Number(sku.stock || 0) <= 0;
                return (
                  <button
                    key={sku.ean}
                    type="button"
                    disabled={yaEsta || sinStock}
                    onClick={() => addToCart(sku)}
                    className={`w-full flex items-center gap-2.5 rounded-lg border p-2 text-left transition-colors ${
                      yaEsta || sinStock
                        ? "border-white/[0.05] bg-white/[0.015] opacity-45 cursor-not-allowed"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-cyan-400/30 hover:bg-cyan-400/[0.05]"
                    }`}
                  >
                    <img
                      src={sku.image || NO_IMAGE}
                      alt=""
                      className="h-8 w-8 rounded-md object-cover bg-white/[0.06] shrink-0"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = NO_IMAGE;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      {/* El producto arriba y la variante debajo: dos SKUs del
                          mismo producto solo se distinguen por la variante, y
                          la variante sola no dice de qué producto es. */}
                      <p className="text-[10px] text-white/85 truncate">
                        {sku.product_name || sku.display_name}
                      </p>
                      {sku.sku_name && sku.sku_name !== sku.product_name && (
                        <p className="text-[9px] text-cyan-200/60 truncate">
                          {sku.sku_name}
                        </p>
                      )}
                      <p className="text-[9px] text-white/30 truncate">
                        {soles(sku.regular_price)} ·{" "}
                        {sinStock ? (
                          <span className="text-rose-300/80">sin stock</span>
                        ) : (
                          `stock ${sku.stock}`
                        )}{" "}
                        · {sku.warehouse_name}
                      </p>
                    </div>
                    <i
                      className={`bx ${yaEsta ? "bx-check" : "bx-plus"} text-sm shrink-0 ${
                        yaEsta ? "text-emerald-400" : "text-cyan-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {!prodLoading && !prodError && prodList?.length === 0 && (
            <p className="text-[10px] text-white/30">
              No hay productos para esa búsqueda.
            </p>
          )}

          {/* Carrito */}
          {productsCart.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-white/[0.06]">
              {productsCart.map((p) => (
                <div
                  key={p.ean}
                  className="flex items-center gap-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-white/85 truncate">
                      {p.name}
                    </p>
                    <p className="text-[9px] text-white/25">EAN {p.ean}</p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={p.quantity}
                    onChange={(e) =>
                      updateCartItem(p.ean, {
                        quantity: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="w-11 bg-white/[0.04] border border-white/[0.08] rounded-[6px] px-1 py-1 text-[11px] text-white text-center outline-none"
                    title="Cantidad"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={p.price}
                    onChange={(e) =>
                      updateCartItem(p.ean, {
                        price: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-16 bg-white/[0.04] border border-white/[0.08] rounded-[6px] px-1 py-1 text-[11px] text-white text-center outline-none"
                    title="Precio de venta"
                  />
                  <button
                    type="button"
                    onClick={() => removeFromCart(p.ean)}
                    className="shrink-0 p-1 rounded-[6px] bg-rose-500/[0.08] hover:bg-rose-500/[0.18] border border-rose-400/[0.18] transition-colors"
                    title="Quitar"
                  >
                    <i className="bx bx-trash text-[11px] text-rose-300/80" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Checklist visual pre-cotización ═══
          Mismo patrón que Dropi: la cotización depende de varias cosas y sin
          esto el asesor no sabe cuál le falta. */}
      <div className={sectionCls}>
        <div className="px-3.5 py-2.5">
          <span className={`${headerCls} block mb-2`}>
            Requisitos para cotizar envío
          </span>

          <div className="space-y-1">
            <CheckItem done={Boolean(name?.trim())} label="Nombre del cliente" />
            <CheckItem
              done={Boolean(String(phoneInput || "").replace(/\D/g, ""))}
              label="Teléfono"
            />
            <CheckItem done={Boolean(dir?.trim())} label="Dirección de entrega" />
            <CheckItem done={hayUbicacion} label="Ubicación en el mapa" />
            <CheckItem
              done={productsCart.length > 0}
              label="Al menos 1 producto en carrito"
            />
            <CheckItem
              done={Boolean(selectedCourier?.transportId)}
              label="Transportadora seleccionada"
            />
          </div>
        </div>
      </div>

      {/* ═══ Transportadora ═══ */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2">
          <span className={headerCls}>Transportadora{requiredMark}</span>
          {puedeCotizar && quotes?.length > 0 && (
            <button
              type="button"
              onClick={emitCotizar}
              disabled={quotesLoading}
              className="p-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/35 hover:text-white/70 transition-colors"
              title="Recotizar"
            >
              <i
                className={`bx bx-refresh text-sm ${quotesLoading ? "bx-spin" : ""}`}
              />
            </button>
          )}
        </div>

        <div className="px-3.5 pb-3 space-y-2">
          {!puedeCotizar && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[7px] bg-amber-500/[0.04] border border-dashed border-amber-400/20">
              <i className="bx bx-error-circle text-amber-400/50 text-sm shrink-0" />
              <span className="text-[10px] text-amber-300/50">
                Revisa el checklist de arriba. Necesitas la ubicación del cliente
                y al menos 1 producto para consultar transportadoras.
              </span>
            </div>
          )}

          {puedeCotizar && !quotes?.length && !quotesLoading && (
            <button
              type="button"
              onClick={emitCotizar}
              className="w-full px-3.5 py-3 rounded-[7px] bg-blue-500/[0.12] hover:bg-blue-500/[0.22] border border-blue-400/[0.22] text-[11px] font-semibold text-blue-300 flex items-center justify-center gap-2 transition-colors"
            >
              <i className="bx bx-search-alt text-sm" />
              Consultar transportadoras
            </button>
          )}

          {quotesLoading && (
            <div className="space-y-1.5">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-2.5 animate-pulse"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-md bg-white/[0.06]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-24 rounded bg-white/[0.06]" />
                      <div className="h-2 w-16 rounded bg-white/[0.06]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {quotesError && (
            <div className="flex items-start gap-2 px-2.5 py-2 rounded-[7px] bg-amber-500/[0.06] border border-amber-400/[0.15]">
              <i className="bx bx-info-circle text-amber-400/60 text-sm mt-0.5 shrink-0" />
              <p className="text-[9px] text-amber-300/70 leading-relaxed">
                {quotesError}
              </p>
            </div>
          )}

          {/* El ubigeo lo resuelve Aliclik desde las coordenadas: es la única
              confirmación visual de que el punto cayó donde el asesor cree. */}
          {ubigeo && (
            <p className="text-[9px] text-white/35">
              <i className="bx bx-map text-[10px] mr-0.5" />
              {[
                ubigeo?.department?.name,
                ubigeo?.province?.name,
                ubigeo?.district?.name,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {quotes?.length > 0 && (
            <div className="space-y-1.5">
              {quotes.map((c) => {
                const activo =
                  selectedCourier?.transportId === c.transportId &&
                  selectedCourier?.deliveryCost === c.deliveryCost;
                return (
                  <button
                    key={`${c.transportId}_${c.deliveryCost}_${c.addDays}`}
                    type="button"
                    onClick={() => seleccionarCourier(c)}
                    className={`w-full flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                      activo
                        ? "border-cyan-400/50 bg-cyan-400/[0.08]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-cyan-400/25"
                    }`}
                  >
                    {c.transportUrlImage && (
                      <img
                        src={c.transportUrlImage}
                        alt=""
                        className="h-8 w-8 rounded-md object-contain bg-white/[0.06] shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-white/85 truncate">
                        {c.transportName || `Transporte ${c.transportId}`}
                        {c.flagDeliveryExpress && (
                          <span className="ml-1.5 text-[8px] px-1 py-px rounded bg-amber-400/20 text-amber-200 align-middle">
                            EXPRESS
                          </span>
                        )}
                      </p>
                      <p className="text-[9px] text-white/30">
                        entrega en {c.addDays} día(s)
                        {c.schedule ? ` · ${c.schedule}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-white/70 shrink-0">
                      {soles(c.deliveryCost)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedCourier && (
            <div className="pt-1">
              <label className={labelCls}>Envío que paga el cliente</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputCls}
                value={deliveryCharge ?? 0}
                onChange={(e) =>
                  setDeliveryCharge(Math.max(0, Number(e.target.value) || 0))
                }
              />
              <p className="mt-0.5 text-[9px] text-white/25">
                Costo del courier: {soles(selectedCourier.deliveryCost)}. Ponlo
                en 0 si el envío va gratis.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Resumen del pedido ═══ */}
      {productsCart.length > 0 && (
        <div className={sectionCls}>
          <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2">
            <span className={headerCls}>Resumen del pedido</span>
          </div>
          <div className="px-3.5 pb-3 space-y-1">
            {productsCart.map((p) => (
              <div
                key={p.ean}
                className="flex justify-between text-[10px] text-white/45"
              >
                <span className="truncate max-w-[65%]">
                  {p.quantity}× {p.name}
                </span>
                <span>{soles(Number(p.price) * Number(p.quantity || 1))}</span>
              </div>
            ))}

            <div className="flex justify-between text-[11px] text-white/45 pt-1.5 border-t border-white/[0.06]">
              <span>Productos</span>
              <span>{soles(totalProductos)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-white/45">
              <span>
                Envío
                {selectedCourier?.transportName
                  ? ` · ${selectedCourier.transportName}`
                  : ""}
              </span>
              <span>{soles(deliveryCharge)}</span>
            </div>

            <div className="flex justify-between text-[14px] font-bold text-white pt-2 mt-1 border-t border-white/[0.06] tracking-tight">
              <span>Total a cobrar al cliente</span>
              <span>{soles(totalPedido)}</span>
            </div>

            {notes?.trim() && (
              <div className="flex justify-between text-[10px] text-white/35 pt-1">
                <span>Nota</span>
                <span className="text-right max-w-[60%] truncate">
                  {notes.trim()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Submit ═══ */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={handleSafeSubmit}
          disabled={!canSubmit}
          className={`w-full px-3.5 py-3 rounded-[10px] text-[12px] font-semibold flex items-center justify-center gap-2 border transition-colors ${
            canSubmit
              ? "bg-emerald-500/[0.12] hover:bg-emerald-500/[0.22] border-emerald-400/[0.22] text-emerald-300"
              : "bg-white/[0.02] border-white/[0.05] text-white/[0.18] cursor-not-allowed"
          }`}
        >
          {creating ? (
            <>
              <i className="bx bx-loader-alt bx-spin text-sm" />
              Creando pedido…
            </>
          ) : (
            <>
              <i className="bx bx-check-circle text-sm" />
              Crear pedido
            </>
          )}
        </button>
        {!canSubmit && !creating && (
          <p className="text-[9px] text-white/20 text-center mt-1.5">
            Complete todos los campos obligatorios y seleccione una
            transportadora
          </p>
        )}
      </div>
    </div>
  );
}
