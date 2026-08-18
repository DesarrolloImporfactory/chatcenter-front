import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";

/**
 * Pedidos de Aliclik del cliente abierto en el chat.
 *
 * Espeja la interfaz de useDropiOrders (phone, orders, ordersLoading,
 * ordersError, selectedOrder, emitGetOrders) para que el panel pueda cambiar
 * de proveedor sin cambiar de forma.
 *
 * Lo que NO tiene, porque la API de Aliclik no lo ofrece:
 *  · editar el pedido → no existe endpoint de update;
 *  · cambiar de transportadora → se elige al cotizar y ya no se toca;
 *  · guía / PDF → no lo exponen en ninguna parte.
 * Lo único que se puede hacer sobre un pedido existente es cancelarlo.
 */
export default function useAliclikOrders({
  socketRef,
  id_configuracion,
  selectedChat,
  isOpen,
}) {
  // ── phone normalizado (mismo criterio que Dropi) ──
  const phone = useMemo(() => {
    const raw =
      selectedChat?.celular_cliente ||
      selectedChat?.celular ||
      selectedChat?.phone ||
      null;
    if (!raw) return null;
    const clean = String(raw).replace(/\D/g, "");
    return clean || null;
  }, [selectedChat]);

  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [resultNumber] = useState(20);

  const emitGetOrders = useCallback(
    (extra = {}) => {
      const s = socketRef?.current;
      if (!s) {
        setOrdersError("Socket no está disponible");
        return;
      }
      if (!id_configuracion) {
        setOrdersError("Falta id_configuracion");
        return;
      }
      if (!phone) {
        setOrdersError("Falta teléfono del cliente");
        return;
      }

      setOrdersLoading(true);
      setOrdersError(null);

      s.emit("GET_ALICLIK_ORDERS_BY_CLIENT", {
        id_configuracion: Number(id_configuracion),
        phone,
        result_number: Number(resultNumber) || 20,
        ...extra,
      });
    },
    [socketRef, id_configuracion, phone, resultNumber],
  );

  const emitCancelOrder = useCallback(
    (orderNumber) => {
      const s = socketRef?.current;
      if (!s) return;
      if (!id_configuracion || !orderNumber) return;

      s.emit("ALICLIK_CANCEL_ORDER", {
        id_configuracion: Number(id_configuracion),
        orderNumber: String(orderNumber),
      });
    },
    [socketRef, id_configuracion],
  );

  // Se guarda emitGetOrders en un ref para que el efecto de listeners no se
  // vuelva a montar cada vez que cambia la callback (cada remontaje perdería
  // eventos en vuelo).
  const emitGetOrdersRef = useRef(emitGetOrders);
  useEffect(() => {
    emitGetOrdersRef.current = emitGetOrders;
  }, [emitGetOrders]);

  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;

    const onOk = (resp) => {
      setOrdersLoading(false);
      if (resp?.isSuccess && resp?.data?.isSuccess) {
        setOrders(
          Array.isArray(resp?.data?.objects) ? resp.data.objects : [],
        );
        return;
      }
      setOrdersError(
        resp?.data?.message || resp?.message || "Respuesta inválida",
      );
      setOrders([]);
    };

    const onErr = (resp) => {
      setOrdersLoading(false);
      setOrdersError(resp?.message || "Error consultando pedidos de Aliclik");
      setOrders([]);
    };

    const onCancelOk = (resp) => {
      // Aliclik responde OK en dos casos distintos: si el pedido todavía no
      // está confirmado NO lo cancela, solo le deja una nota. El backend lo
      // distingue en `cancelado` y acá se le dice la verdad al asesor.
      const cancelado = resp?.data?.cancelado === true;
      Swal.fire({
        icon: cancelado ? "success" : "info",
        title: cancelado ? "Pedido cancelado" : "El pedido no se canceló",
        text: cancelado
          ? undefined
          : resp?.data?.message ||
            "Aliclik solo registró una nota porque el pedido aún no está confirmado. Vuelve a intentarlo cuando lo confirmen.",
        timer: cancelado ? 1600 : undefined,
        showConfirmButton: !cancelado,
      });
      emitGetOrdersRef.current?.();
      setSelectedOrder(null);
    };

    const onCancelErr = (resp) => {
      Swal.fire({
        icon: "error",
        title: "No se pudo cancelar",
        text: resp?.message || "Error cancelando el pedido en Aliclik",
      });
    };

    s.on("ALICLIK_ORDERS_BY_CLIENT", onOk);
    s.on("ALICLIK_ORDERS_BY_CLIENT_ERROR", onErr);
    s.on("ALICLIK_CANCEL_ORDER_OK", onCancelOk);
    s.on("ALICLIK_CANCEL_ORDER_ERROR", onCancelErr);

    return () => {
      s.off("ALICLIK_ORDERS_BY_CLIENT", onOk);
      s.off("ALICLIK_ORDERS_BY_CLIENT_ERROR", onErr);
      s.off("ALICLIK_CANCEL_ORDER_OK", onCancelOk);
      s.off("ALICLIK_CANCEL_ORDER_ERROR", onCancelErr);
    };
  }, [socketRef]);

  const prevChatKeyRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const chatKey = `${selectedChat?.id || ""}_${selectedChat?.psid || ""}`;
    const chatChanged = chatKey !== prevChatKeyRef.current;
    prevChatKeyRef.current = chatKey;

    if (chatChanged) {
      setOrders([]);
      setOrdersError(null);
      setSelectedOrder(null);
    }

    if (phone) emitGetOrders();
  }, [isOpen, selectedChat?.id, selectedChat?.psid, phone, emitGetOrders]);

  return {
    phone,
    orders,
    ordersLoading,
    ordersError,
    selectedOrder,
    setSelectedOrder,
    setOrders,
    setOrdersError,
    emitGetOrders,
    emitCancelOrder,
  };
}
