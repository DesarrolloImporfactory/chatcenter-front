import React, { useState, useEffect } from "react";
import chatApi from "../../api/chatcenter";
import {
  showOrderId,
  showOrderStatus,
  showOrderDate,
  fmtDate,
  getCityState,
  statusStyle,
  getProductImage,
  getProductName,
  getProductSku,
  getQty,
  getTransportadora,
  getShippingAmount,
  getTotal,
  getWarehouseName,
  canEditOrder,
  isPendingConfirm,
  isCancelled,
  canCancelOrder,
  NO_IMAGE,
  hasGuide,
  getGuideUrl,
  getGuideNumber,
  getTrackingUrl,
} from "../../utils/orderHelper";

export default function OrderDetail({
  order,
  phoneInput,
  setPhoneInput,
  orderName,
  setOrderName,
  orderSurname,
  setOrderSurname,
  orderDir,
  setOrderDir,
  onClose,
  onEditOrder,
  onCancelOrder,
  onConfirmOrder,
  idConfiguracion,
}) {
  const editable = canEditOrder(order);
  const pendingConfirm = isPendingConfirm(order);
  const trackingUrl = order ? getTrackingUrl(order) : null;

  // ── Transportadora (cotizar + elegir sobre la orden existente) ──
  const [transps, setTransps] = useState([]);
  const [transpLoading, setTranspLoading] = useState(false);
  const [transpError, setTranspError] = useState(null);
  const [selectedTransp, setSelectedTransp] = useState(null);

  const orderId = order ? showOrderId(order) : null;

  // Preselecciona la transportadora que la orden ya trae de Dropi (si hay).
  useEffect(() => {
    const dc = order?.distributionCompany || order?.distribution_company || null;
    setSelectedTransp(
      dc?.id
        ? {
            id: Number(dc.id),
            name: dc.name || "",
            price: null,
            slug: String(dc.name || "").toLowerCase().trim(),
          }
        : null,
    );
    setTransps([]);
    setTranspError(null);
  }, [orderId]);

  const transpImg = (slug) =>
    `https://app.dropi.ec/assets/images/delivery/${slug || "default"}.png`;

  const cotizarTransportadoras = async () => {
    if (!idConfiguracion || !orderId) return;
    setTranspLoading(true);
    setTranspError(null);
    try {
      const { data } = await chatApi.post(
        "dropi_integrations/cotizar-transportadoras-orden",
        { id_configuracion: idConfiguracion, dropi_order_id: orderId },
      );
      const list = data?.data?.transportadoras || [];
      setTransps(list);
      if (!list.length) setTranspError("Sin transportadoras para esta ruta.");
      // si ya había una elegida, mantén; si no, la más barata
      setSelectedTransp((prev) => {
        if (prev?.id && list.some((t) => t.id === prev.id))
          return list.find((t) => t.id === prev.id);
        return list[0] || prev;
      });
    } catch (e) {
      setTranspError(
        e?.response?.data?.message || "No se pudo cotizar transportadoras.",
      );
    } finally {
      setTranspLoading(false);
    }
  };

  if (!order) return null;

  const inputCls =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-[7px] px-3 py-2 text-[12px] text-white outline-none transition-all focus:border-violet-400/50 focus:bg-white/[0.06] hover:border-white/15 placeholder:text-white/[0.18]";
  const readOnlyCls =
    "w-full bg-white/[0.02] border border-white/[0.05] rounded-[7px] px-3 py-2 text-[12px] text-white/60 outline-none cursor-default";
  const labelCls =
    "text-[9px] uppercase tracking-wider text-white/35 block mb-1";
  const sectionCls =
    "rounded-[10px] bg-[#0f1629] border border-white/[0.07] overflow-hidden";

  return (
    <div className="space-y-2">
      {/* ═══ Header con status ═══ */}
      <div className={sectionCls}>
        <div className="flex items-start justify-between gap-2 px-3.5 pt-3 pb-2.5">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-white tracking-tight">
              Orden #{showOrderId(order)}
            </p>
            <p className="text-[10px] text-white/40 mt-0.5">
              {fmtDate(showOrderDate(order))} · {getCityState(order)}
            </p>
          </div>
          <span
            className={`text-[9px] px-2.5 py-1 rounded font-bold tracking-wide uppercase shrink-0 ${statusStyle(
              showOrderStatus(order),
            )}`}
          >
            {showOrderStatus(order)}
          </span>
        </div>
      </div>

      {/* ═══ Producto ═══ */}
      <div className={sectionCls}>
        <div className="px-3.5 pt-2.5 pb-2">
          <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">
            Producto
          </span>
        </div>
        <div className="flex items-center gap-3 px-3.5 pb-3">
          <img
            src={getProductImage(order)}
            alt="Producto"
            className="h-[50px] w-[50px] rounded-lg object-cover bg-white/[0.04] border border-white/[0.08] shrink-0"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = NO_IMAGE;
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white/90 truncate">
              {getProductName(order)}
            </p>
            <p className="text-[10px] text-white/35 mt-0.5">
              SKU {getProductSku(order)}
            </p>
            <div className="flex gap-3 mt-1">
              <span className="text-[10px] text-white/50">
                Cant:{" "}
                <span className="font-semibold text-white/80">
                  {getQty(order)}
                </span>
              </span>
              <span className="text-[10px] text-white/50">
                Bodega:{" "}
                <span className="font-semibold text-white/80">
                  {getWarehouseName(order)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Resumen financiero ═══ */}
      <div className={sectionCls}>
        <div className="flex border-b border-white/[0.06]">
          <div className="flex-1 px-3.5 py-2.5 border-r border-white/[0.06]">
            <p className="text-[9px] uppercase tracking-wider text-white/40">
              Total
            </p>
            <p className="text-[14px] font-bold text-white mt-0.5">
              ${getTotal(order)}
            </p>
          </div>
          <div className="flex-1 px-3.5 py-2.5 border-r border-white/[0.06]">
            <p className="text-[9px] uppercase tracking-wider text-white/40">
              Envío
            </p>
            <p className="text-[12px] text-white/70 mt-0.5 font-medium">
              ${getShippingAmount(order)}
            </p>
          </div>
          <div className="flex-1 px-3.5 py-2.5">
            <p className="text-[9px] uppercase tracking-wider text-white/40">
              Transp.
            </p>
            <p className="text-[12px] text-white/70 mt-0.5 font-medium truncate">
              {getTransportadora(order)}
            </p>
          </div>
        </div>

        {/* Info agente / chat */}
        {(order?.agent_assigned || order?.has_chat !== undefined) && (
          <div className="flex border-b border-white/[0.06]">
            <div className="flex-1 px-3.5 py-2.5 border-r border-white/[0.06]">
              <p className="text-[9px] uppercase tracking-wider text-white/40">
                Agente
              </p>
              <p className="text-[11px] text-white/70 mt-0.5">
                {order?.agent_assigned || "Sin agente"}
              </p>
            </div>
            <div className="flex-1 px-3.5 py-2.5">
              <p className="text-[9px] uppercase tracking-wider text-white/40">
                Chat
              </p>
              <p className="text-[11px] text-white/70 mt-0.5">
                {order?.has_chat ? "Sí" : "No"}
              </p>
            </div>
          </div>
        )}

        {/* Guía de envío */}
        {order?.shipping_guide && (
          <div className="px-3.5 py-2.5">
            <p className="text-[9px] uppercase tracking-wider text-white/40 mb-1">
              Guía de envío
            </p>
            <p className="text-[12px] text-white/80 font-mono">
              {order.shipping_guide}
            </p>
          </div>
        )}
      </div>

      {/* ═══ Guía PDF + Rastreo (misma línea, mitad y mitad) ═══ */}
      {(hasGuide(order) || trackingUrl) && (
        <div className="flex gap-1.5">
          {hasGuide(order) && (
            <a
              href={getGuideUrl(order)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${sectionCls} flex-1 flex items-center justify-center gap-2 px-3 py-3 text-[12px] font-semibold text-blue-300 hover:text-blue-200 bg-blue-500/[0.06] hover:bg-blue-500/[0.12] border-blue-400/[0.15] hover:border-blue-400/[0.25] transition-all no-underline`}
            >
              <i className="bx bx-download text-base" />
              <span>Descargar guía</span>
            </a>
          )}
          {trackingUrl && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${sectionCls} flex-1 flex items-center justify-center gap-2 px-3 py-3 text-[12px] font-semibold text-cyan-300 hover:text-cyan-200 bg-cyan-500/[0.06] hover:bg-cyan-500/[0.12] border-cyan-400/[0.15] hover:border-cyan-400/[0.25] transition-all no-underline`}
            >
              <i className="bx bx-map-pin text-base" />
              <span>Rastrear envío</span>
            </a>
          )}
        </div>
      )}

      {/* ═══ Datos editables (solo si PENDIENTE CONFIRMACION) ═══ */}
      <div className={sectionCls}>
        <div className="px-3.5 pt-2.5 pb-2">
          <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">
            Datos del cliente
          </span>
          {!editable && (
            <span className="text-[8px] text-white/20 ml-2">
              (solo lectura)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5 px-3.5 pb-1.5">
          <div>
            <label className={labelCls}>Nombre</label>
            <input
              value={orderName}
              onChange={(e) => editable && setOrderName(e.target.value)}
              className={editable ? inputCls : readOnlyCls}
              readOnly={!editable}
            />
          </div>
          <div>
            <label className={labelCls}>Apellido</label>
            <input
              value={orderSurname}
              onChange={(e) => editable && setOrderSurname(e.target.value)}
              className={editable ? inputCls : readOnlyCls}
              readOnly={!editable}
            />
          </div>
        </div>

        <div className="px-3.5 pb-1.5">
          <label className={labelCls}>Teléfono</label>
          <input
            value={phoneInput}
            onChange={(e) => editable && setPhoneInput(e.target.value)}
            className={editable ? inputCls : readOnlyCls}
            readOnly={!editable}
          />
        </div>

        <div className="px-3.5 pb-3">
          <label className={labelCls}>Dirección</label>
          <input
            value={orderDir}
            onChange={(e) => editable && setOrderDir(e.target.value)}
            className={editable ? inputCls : readOnlyCls}
            readOnly={!editable}
          />
        </div>
      </div>

      {/* ═══ Notas ═══ */}
      {order?.notes && (
        <div className={sectionCls}>
          <div className="px-3.5 py-2.5">
            <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold block mb-1">
              Notas
            </span>
            <p className="text-[11px] text-white/60 whitespace-pre-wrap">
              {order.notes}
            </p>
          </div>
        </div>
      )}

      {/* ═══ Transportadora (solo PENDIENTE CONFIRMACION) ═══ */}
      {pendingConfirm && (
        <div className={sectionCls}>
          <div className="px-3.5 pt-2.5 pb-2">
            <span className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">
              Transportadora
            </span>
          </div>
          <div className="px-3.5 pb-3">
            {transpError && (
              <p className="text-[10px] text-amber-300/80 mb-1.5">
                {transpError}
              </p>
            )}

            {/* Sin lista aún: transportadora actual + botón para cambiar */}
            {transps.length === 0 && (
              <>
                {selectedTransp ? (
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={transpImg(selectedTransp.slug)}
                      alt=""
                      className="h-8 w-8 rounded-md object-contain bg-white/[0.06] border border-white/[0.06] shrink-0"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-[8px] uppercase tracking-wider text-white/30">
                        Transportadora actual
                      </p>
                      <p className="text-[12px] font-semibold text-white truncate">
                        {selectedTransp.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-white/30 mb-2">
                    Este pedido aún no tiene transportadora asignada.
                  </p>
                )}
                <button
                  type="button"
                  onClick={cotizarTransportadoras}
                  disabled={transpLoading}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-violet-500/[0.14] hover:bg-violet-500/[0.24] border border-violet-400/25 text-violet-200 text-[11px] font-semibold py-2 transition-colors disabled:opacity-50"
                >
                  <i
                    className={`bx ${transpLoading ? "bx-loader-alt bx-spin" : "bx-transfer-alt"} text-sm`}
                  />
                  {transpLoading ? "Cotizando…" : "Cambiar de transportadora"}
                </button>
              </>
            )}

            {transps.length > 0 && (
              <>
                <p className="text-[9px] text-white/30 mb-1.5">
                  Elige la transportadora y luego Guardar/Confirmar.
                </p>
                <div className="grid grid-cols-2 gap-1.5 max-h-[230px] overflow-y-auto">
                {transps.map((t) => {
                  const sel = selectedTransp?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTransp(t)}
                      className={`text-left rounded-lg border p-2 transition-all ${
                        sel
                          ? "border-emerald-400/40 bg-emerald-500/[0.10]"
                          : "border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.12]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={transpImg(t.slug)}
                          alt=""
                          className="h-7 w-7 rounded-md object-contain bg-white/[0.06] border border-white/[0.06] shrink-0"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <span
                          className={`text-[10px] font-semibold truncate ${sel ? "text-emerald-200" : "text-white/80"}`}
                        >
                          {t.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[12px] font-bold text-white">
                          ${t.price}
                        </span>
                        {sel && (
                          <i className="bx bx-check-circle text-emerald-400 text-sm" />
                        )}
                      </div>
                    </button>
                  );
                })}
                </div>
                <button
                  type="button"
                  onClick={cotizarTransportadoras}
                  disabled={transpLoading}
                  className="mt-1.5 text-[10px] text-white/40 hover:text-white/60 flex items-center gap-1 disabled:opacity-50"
                >
                  <i
                    className={`bx ${transpLoading ? "bx-loader-alt bx-spin" : "bx-refresh"}`}
                  />
                  Recotizar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ Acciones ═══ */}
      <div className="flex flex-col gap-1.5 pt-0.5">
        {/* Confirmar (solo PENDIENTE CONFIRMACION) */}
        {pendingConfirm && (
          <button
            type="button"
            onClick={() => onConfirmOrder(order, selectedTransp)}
            className="w-full px-3.5 py-3 rounded-[10px] bg-emerald-500/[0.12] hover:bg-emerald-500/[0.22] border border-emerald-400/[0.22] text-[12px] font-semibold text-emerald-300 flex items-center justify-center gap-2 transition-colors"
          >
            <i className="bx bx-check-double text-sm" />
            Confirmar pedido
          </button>
        )}

        {/* Guardar cambios (solo PENDIENTE CONFIRMACION) */}
        {editable && (
          <button
            type="button"
            onClick={() => onEditOrder(order, selectedTransp)}
            className="w-full px-3.5 py-2.5 rounded-[10px] bg-blue-500/[0.12] hover:bg-blue-500/[0.22] border border-blue-400/[0.22] text-[11px] font-semibold text-blue-300 flex items-center justify-center gap-2 transition-colors"
          >
            <i className="bx bx-save text-sm" />
            Guardar cambios
          </button>
        )}

        {/* Cancelar orden (si no está cancelada) */}
        {canCancelOrder(order) && (
          <button
            type="button"
            onClick={() => onCancelOrder(order)}
            className="w-full px-3.5 py-2.5 rounded-[10px] bg-rose-500/[0.06] hover:bg-rose-500/[0.14] border border-rose-400/[0.12] text-[11px] font-semibold text-rose-300/70 hover:text-rose-300 flex items-center justify-center gap-2 transition-colors"
          >
            <i className="bx bx-x-circle text-sm" />
            Cancelar orden
          </button>
        )}

        {/* Cerrar detalle */}
        <button
          type="button"
          onClick={onClose}
          className="w-full px-3.5 py-2 rounded-[10px] bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-[11px] font-medium text-white/40 hover:text-white/60 flex items-center justify-center gap-2 transition-colors"
        >
          <i className="bx bx-arrow-back text-sm" />
          Volver a la lista
        </button>
      </div>
    </div>
  );
}
