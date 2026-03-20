import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";

export default function useDropiOrders({
  socketRef,
  id_configuracion,
  selectedChat,
  isOpen,
}) {
  // ── phone normalizado ──
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

  // ── estado ──
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // filtros
  const [resultNumber] = useState(20);
  const [status] = useState("");

  // refs para evitar duplicados
  const onOkRef = useRef(null);
  const onErrRef = useRef(null);
  const onUpdOkRef = useRef(null);
  const onUpdErrRef = useRef(null);
  const onSetStatusOkRef = useRef(null);
  const onSetStatusErrRef = useRef(null);

  // ── emitters ──
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

      s.emit("GET_DROPI_ORDERS_BY_CLIENT", {
        id_configuracion: Number(id_configuracion),
        phone,
        result_number: Number(resultNumber) || 20,
        status: status || undefined,
        ...extra,
      });
    },
    [socketRef, id_configuracion, phone, resultNumber, status],
  );

  const emitUpdateOrder = useCallback(
    (orderId, body) => {
      const s = socketRef?.current;
      if (!s) return;
      if (!id_configuracion) {
        Swal.fire({ icon: "warning", title: "Falta id_configuracion" });
        return;
      }
      if (!orderId) {
        Swal.fire({ icon: "warning", title: "Falta orderId" });
        return;
      }
      s.emit("DROPI_UPDATE_ORDER", {
        id_configuracion: Number(id_configuracion),
        orderId: Number(orderId),
        body,
      });
    },
    [socketRef, id_configuracion],
  );

  const emitSetOrderStatus = useCallback(
    (orderId, statusValue) => {
      const s = socketRef?.current;
      if (!s) return;
      if (!id_configuracion) {
        Swal.fire({ icon: "warning", title: "Falta id_configuracion" });
        return;
      }
      if (!orderId) {
        Swal.fire({ icon: "warning", title: "Falta orderId" });
        return;
      }
      s.emit("DROPI_SET_ORDER_STATUS", {
        id_configuracion: Number(id_configuracion),
        orderId: Number(orderId),
        status: statusValue,
      });
    },
    [socketRef, id_configuracion],
  );

  // ── listeners de socket ──
  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;

    // limpiar anteriores
    if (onOkRef.current) s.off("DROPI_ORDERS_BY_CLIENT", onOkRef.current);
    if (onErrRef.current)
      s.off("DROPI_ORDERS_BY_CLIENT_ERROR", onErrRef.current);
    if (onUpdOkRef.current) s.off("DROPI_UPDATE_ORDER_OK", onUpdOkRef.current);
    if (onUpdErrRef.current)
      s.off("DROPI_UPDATE_ORDER_ERROR", onUpdErrRef.current);
    if (onSetStatusOkRef.current)
      s.off("DROPI_SET_ORDER_STATUS_OK", onSetStatusOkRef.current);
    if (onSetStatusErrRef.current)
      s.off("DROPI_SET_ORDER_STATUS_ERROR", onSetStatusErrRef.current);

    const onOk = (resp) => {
      setOrdersLoading(false);
      if (resp?.isSuccess && resp?.data?.isSuccess) {
        const list = resp?.data?.objects || [];
        setOrders(Array.isArray(list) ? list : []);
        return;
      }
      setOrdersError(
        resp?.data?.message || resp?.message || "Respuesta inválida",
      );
      setOrders([]);
    };

    const onErr = (resp) => {
      setOrdersLoading(false);
      setOrdersError(resp?.message || "Error consultando órdenes");
      setOrders([]);
    };

    const onUpdOk = () => {
      Swal.fire({
        icon: "success",
        title: "Orden actualizada",
        timer: 1300,
        showConfirmButton: false,
      });
      emitGetOrders();
      setSelectedOrder(null);
    };

    const onUpdErr = (resp) => {
      Swal.fire({
        icon: "error",
        title: "No se pudo actualizar",
        text: resp?.message || "Error actualizando orden",
      });
    };

    const onSetStatusOk = () => {
      Swal.fire({
        icon: "success",
        title: "Estado actualizado",
        timer: 1200,
        showConfirmButton: false,
      });
      emitGetOrders();
      setSelectedOrder(null);
    };

    const onSetStatusErr = (resp) => {
      Swal.fire({
        icon: "error",
        title: "No se pudo cambiar el estado",
        text: resp?.message || "Error cambiando estado",
      });
    };

    onOkRef.current = onOk;
    onErrRef.current = onErr;
    onUpdOkRef.current = onUpdOk;
    onUpdErrRef.current = onUpdErr;
    onSetStatusOkRef.current = onSetStatusOk;
    onSetStatusErrRef.current = onSetStatusErr;

    s.on("DROPI_ORDERS_BY_CLIENT", onOk);
    s.on("DROPI_ORDERS_BY_CLIENT_ERROR", onErr);
    s.on("DROPI_UPDATE_ORDER_OK", onUpdOk);
    s.on("DROPI_UPDATE_ORDER_ERROR", onUpdErr);
    s.on("DROPI_SET_ORDER_STATUS_OK", onSetStatusOk);
    s.on("DROPI_SET_ORDER_STATUS_ERROR", onSetStatusErr);

    return () => {
      s.off("DROPI_ORDERS_BY_CLIENT", onOk);
      s.off("DROPI_ORDERS_BY_CLIENT_ERROR", onErr);
      s.off("DROPI_UPDATE_ORDER_OK", onUpdOk);
      s.off("DROPI_UPDATE_ORDER_ERROR", onUpdErr);
      s.off("DROPI_SET_ORDER_STATUS_OK", onSetStatusOk);
      s.off("DROPI_SET_ORDER_STATUS_ERROR", onSetStatusErr);
    };
  }, [socketRef, emitGetOrders]);

  // ─────────────────────────────────────────────
  // ✅ FIX: UN SOLO useEffect para "cuándo consultar órdenes"
  //    - Cuando isOpen pasa a true  → consulta
  //    - Cuando cambia el chat con isOpen abierto → limpia + consulta
  //    Antes había DOS effects separados y ambos se disparaban al abrir.
  // ─────────────────────────────────────────────
  const prevChatKeyRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const chatKey = `${selectedChat?.id || ""}_${selectedChat?.psid || ""}`;
    const chatChanged = chatKey !== prevChatKeyRef.current;
    prevChatKeyRef.current = chatKey;

    if (chatChanged) {
      // cambió el chat mientras el panel estaba abierto → reset
      setOrders([]);
      setOrdersError(null);
      setSelectedOrder(null);
    }

    // consultar (una sola vez)
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
    emitUpdateOrder,
    emitSetOrderStatus,
  };
}
