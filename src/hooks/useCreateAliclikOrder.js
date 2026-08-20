import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../api/chatcenter";

/**
 * Creación de pedidos contraentrega en Aliclik desde el chat.
 *
 * ── En qué se diferencia de useCreateOrder (Dropi) ──────────────────────────
 * Aliclik NO tiene catálogo de provincias/ciudades: resuelve el ubigeo del
 * lado de ellos a partir de las coordenadas. Eso cambia el paso 2 entero:
 *
 *   Dropi     producto(id) → provincia → ciudad → cotiza(cod_dane) → crear
 *   Aliclik   producto(EAN del SKU)    → lat/lng → cotiza(almacén+coords) → crear
 *
 * Las coordenadas salen, en orden de preferencia:
 *   1. de la última ubicación que el cliente compartió por WhatsApp (el
 *      webhook de Meta ya las guarda), que es el camino normal en Perú;
 *   2. del mapa, si no compartió o si el asesor necesita corregirla.
 *
 * Además, el almacén no lo elige el asesor: sale del SKU. Aliclik exige que
 * todos los productos del pedido salgan del mismo, así que el carrito se ancla
 * al almacén del primer SKU agregado.
 */

/** "51987654321" → "987654321". Ver la nota de stripCountryCode en Dropi: si
 *  el asesor ve el número con prefijo tiende a "arreglarlo" comiéndose un
 *  dígito, y el pedido sale con teléfono mocho. */
function stripCountryCodePE(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length > 9 && d.startsWith("51")) return d.slice(2);
  return d;
}

const money = (n) => Number(n || 0);

export default function useCreateAliclikOrder({
  socketRef,
  id_configuracion,
  phone,
  selectedChat,
  emitGetOrders,
}) {
  // ── panel abierto / paso ──
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [step, setStep] = useState(1);

  // ── catálogo ──
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState(null);
  const [prodList, setProdList] = useState([]);
  const [keywords, setKeywords] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // ── carrito ──
  const [productsCart, setProductsCart] = useState([]);

  // ── datos del cliente ──
  const [phoneInput, setPhoneInput] = useState(stripCountryCodePE(phone || ""));
  const [name, setName] = useState(selectedChat?.nombre_cliente || "");
  const [surname, setSurname] = useState(selectedChat?.apellido_cliente || "");
  const [dir, setDir] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  // ── ubicación ──
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  // De dónde salieron las coordenadas actuales: 'chat' | 'mapa' | null.
  // Se muestra en la UI para que el asesor sepa si está confiando en la
  // ubicación real del cliente o en un punto que marcó él.
  const [coordsOrigen, setCoordsOrigen] = useState(null);
  const [ubicacionChat, setUbicacionChat] = useState(null);
  const [ubicacionChatLoading, setUbicacionChatLoading] = useState(false);

  // ── cotización ──
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [ubigeo, setUbigeo] = useState(null);
  const [selectedCourier, setSelectedCourier] = useState(null);
  // Lo que se le cobra al cliente por el envío. Arranca igual al costo del
  // courier, pero el asesor puede ponerlo en 0 (envío gratis) o negociarlo.
  const [deliveryCharge, setDeliveryCharge] = useState(null);

  const [creating, setCreating] = useState(false);

  // sync phone del chat
  useEffect(() => setPhoneInput(stripCountryCodePE(phone || "")), [phone]);

  const resetTodo = useCallback(() => {
    setCreateOrderOpen(false);
    setStep(1);
    setProdList([]);
    setProdError(null);
    setProdLoading(false);
    setKeywords("");
    setPage(1);
    setProductsCart([]);
    setDir("");
    setReference("");
    setNotes("");
    setLat(null);
    setLng(null);
    setCoordsOrigen(null);
    setUbicacionChat(null);
    setQuotes([]);
    setQuotesError(null);
    setQuotesLoading(false);
    setSelectedCourier(null);
    setDeliveryCharge(null);
    setCreating(false);
  }, []);

  // Cambió el chat → limpiar todo
  useEffect(() => {
    resetTodo();
    setName(selectedChat?.nombre_cliente || "");
    setSurname(selectedChat?.apellido_cliente || "");
  }, [selectedChat?.id, selectedChat?.psid, resetTodo]);

  /* ═══════════════════════════════════════════════════════════
     Almacén del carrito
     ═══════════════════════════════════════════════════════════ */

  // Aliclik exige un solo almacén por pedido. El primero que entra manda; los
  // demás SKUs se filtran contra este en addToCart.
  const warehouseId = useMemo(
    () => productsCart[0]?.warehouse_id ?? null,
    [productsCart],
  );
  const warehouseName = useMemo(
    () => productsCart[0]?.warehouse_name || "",
    [productsCart],
  );

  const totalProductos = useMemo(
    () =>
      productsCart.reduce(
        (acc, p) => acc + money(p.price) * Number(p.quantity || 1),
        0,
      ),
    [productsCart],
  );

  const totalPedido = useMemo(
    () => totalProductos + money(deliveryCharge),
    [totalProductos, deliveryCharge],
  );

  /**
   * Costo del proveedor y utilidad, igual que en el resumen de Dropi.
   *
   * `drop_price` es lo que Aliclik le cobra al dropshipper por el producto; la
   * diferencia con el precio de venta es la ganancia, menos el flete que el
   * asesor decida absorber (si le cobra el envío completo al cliente,
   * deliveryCharge = deliveryCost y el flete no le resta nada).
   */
  const totalCostoProveedor = useMemo(
    () =>
      productsCart.reduce(
        (acc, p) => acc + money(p.drop_price) * Number(p.quantity || 1),
        0,
      ),
    [productsCart],
  );

  const fleteAsumido = useMemo(
    () => money(selectedCourier?.deliveryCost) - money(deliveryCharge),
    [selectedCourier, deliveryCharge],
  );

  // null cuando no hay con qué calcularla (sin costo de proveedor conocido):
  // así el resumen la oculta en vez de mostrar una utilidad falsa.
  const utilidad = useMemo(() => {
    if (!productsCart.length) return null;
    if (totalCostoProveedor <= 0) return null;
    return totalProductos - totalCostoProveedor - Math.max(0, fleteAsumido);
  }, [productsCart, totalProductos, totalCostoProveedor, fleteAsumido]);

  /* ═══════════════════════════════════════════════════════════
     Catálogo
     ═══════════════════════════════════════════════════════════ */

  const emitGetProducts = useCallback(
    (extra = {}) => {
      const s = socketRef?.current;
      if (!s) {
        setProdError("Socket no está disponible");
        return;
      }
      if (!id_configuracion) {
        setProdError("Falta id_configuracion");
        return;
      }
      setProdLoading(true);
      setProdError(null);
      s.emit("GET_ALICLIK_PRODUCTS", {
        id_configuracion: Number(id_configuracion),
        page,
        limit: pageSize,
        search: keywords || undefined,
        ...extra,
      });
    },
    [socketRef, id_configuracion, page, keywords],
  );

  const addToCart = useCallback(
    (sku, cantidad = 1, precio = null) => {
      if (!sku?.ean) return;

      // Regla de Aliclik: un solo almacén por pedido. Se avisa acá en vez de
      // dejar que su API conteste un 400 genérico al final del formulario.
      if (warehouseId && Number(sku.warehouse_id) !== Number(warehouseId)) {
        Swal.fire({
          icon: "warning",
          title: "Otro almacén",
          html: `El pedido ya tiene productos de <b>${warehouseName}</b>. Aliclik no permite mezclar almacenes en un mismo pedido.`,
        });
        return;
      }

      setProductsCart((prev) => {
        const idx = prev.findIndex((p) => p.ean === sku.ean);
        if (idx >= 0) {
          const copia = [...prev];
          copia[idx] = {
            ...copia[idx],
            quantity: Number(copia[idx].quantity || 1) + Number(cantidad || 1),
          };
          return copia;
        }
        return [
          ...prev,
          {
            ean: sku.ean,
            sku: sku.sku,
            // display_name = "producto — variante" (lo arma el backend):
            // dos SKUs del mismo producto solo se distinguen por la variante.
            name: sku.display_name || sku.sku_name || sku.product_name,
            image: sku.image || null,
            stock: sku.stock,
            warehouse_id: sku.warehouse_id,
            warehouse_name: sku.warehouse_name,
            quantity: Math.max(1, Number(cantidad) || 1),
            price:
              precio !== null && precio !== undefined
                ? money(precio)
                : money(sku.regular_price),
            // Lo que le cuesta el producto al dropshipper. Es el equivalente
            // del `sale_price` de Dropi y lo que permite calcular la utilidad
            // en el resumen.
            drop_price: money(sku.drop_price),
          },
        ];
      });
    },
    [warehouseId, warehouseName],
  );

  const updateCartItem = useCallback((ean, patch) => {
    setProductsCart((prev) =>
      prev.map((p) => (p.ean === ean ? { ...p, ...patch } : p)),
    );
  }, []);

  const removeFromCart = useCallback((ean) => {
    setProductsCart((prev) => prev.filter((p) => p.ean !== ean));
  }, []);

  /* ═══════════════════════════════════════════════════════════
     Ubicación
     ═══════════════════════════════════════════════════════════ */

  /** Última ubicación que el cliente compartió por WhatsApp. */
  const cargarUbicacionDelChat = useCallback(
    async ({ silencioso = false } = {}) => {
      if (!selectedChat?.id || !id_configuracion) return null;
      setUbicacionChatLoading(true);
      try {
        const { data } = await chatApi.get(
          "clientes_chat_center/ultima_ubicacion",
          {
            params: {
              id_cliente: selectedChat.id,
              id_configuracion,
            },
            silentError: true,
          },
        );
        const u = data?.data || null;
        setUbicacionChat(u);
        return u;
      } catch (_) {
        setUbicacionChat(null);
        if (!silencioso) {
          Swal.fire({
            icon: "error",
            title: "No se pudo leer la ubicación del chat",
          });
        }
        return null;
      } finally {
        setUbicacionChatLoading(false);
      }
    },
    [selectedChat?.id, id_configuracion],
  );

  const usarUbicacionDelChat = useCallback(async () => {
    const u = ubicacionChat || (await cargarUbicacionDelChat());
    if (!u) {
      Swal.fire({
        icon: "info",
        title: "Sin ubicación compartida",
        text: "Este cliente no ha compartido su ubicación por WhatsApp. Pídesela o marca el punto en el mapa.",
      });
      return;
    }
    setLat(u.lat);
    setLng(u.lng);
    setCoordsOrigen("chat");
  }, [ubicacionChat, cargarUbicacionDelChat]);

  const setCoordsDesdeMapa = useCallback((nextLat, nextLng) => {
    setLat(nextLat);
    setLng(nextLng);
    setCoordsOrigen("mapa");
  }, []);

  /**
   * Punto elegido en el buscador de direcciones.
   *
   * Se distingue de 'mapa' porque la confianza es distinta: Nominatim acierta
   * la calle pero muchas veces no el número, así que la UI lo muestra como
   * "aproximada" para que el asesor sepa que todavía tiene que ajustarlo.
   */
  const setCoordsDesdeBusqueda = useCallback((nextLat, nextLng) => {
    setLat(nextLat);
    setLng(nextLng);
    setCoordsOrigen("busqueda");
  }, []);

  // Al abrir el panel se busca la ubicación en segundo plano, para que el
  // botón ya sepa si hay algo que ofrecer en vez de prometerlo y fallar.
  useEffect(() => {
    if (!createOrderOpen) return;
    cargarUbicacionDelChat({ silencioso: true });
  }, [createOrderOpen, cargarUbicacionDelChat]);

  // Cambió el destino o el almacén → la cotización anterior ya no vale.
  useEffect(() => {
    setQuotes([]);
    setSelectedCourier(null);
    setQuotesError(null);
  }, [lat, lng, warehouseId]);

  /* ═══════════════════════════════════════════════════════════
     Cotización
     ═══════════════════════════════════════════════════════════ */

  const puedeCotizar = Boolean(warehouseId && lat && lng);

  const emitCotizar = useCallback(() => {
    const s = socketRef?.current;
    if (!s) {
      setQuotesError("Socket no está disponible");
      return;
    }
    if (!puedeCotizar) {
      setQuotesError(
        "Agrega al menos un producto y define la ubicación del cliente.",
      );
      return;
    }
    setQuotesLoading(true);
    setQuotesError(null);
    s.emit("GET_ALICLIK_SHIPPING_COST", {
      id_configuracion: Number(id_configuracion),
      warehouseId: Number(warehouseId),
      lat,
      lng,
    });
  }, [socketRef, id_configuracion, warehouseId, lat, lng, puedeCotizar]);

  const seleccionarCourier = useCallback((courier) => {
    setSelectedCourier(courier);
    // El cobro arranca igual al costo del courier; el asesor lo puede bajar.
    setDeliveryCharge(money(courier?.deliveryCost));
  }, []);

  /* ═══════════════════════════════════════════════════════════
     Crear
     ═══════════════════════════════════════════════════════════ */

  const canSubmit = useMemo(
    () =>
      Boolean(name?.trim()) &&
      Boolean(String(phoneInput || "").replace(/\D/g, "")) &&
      Boolean(dir?.trim()) &&
      Boolean(lat) &&
      Boolean(lng) &&
      productsCart.length > 0 &&
      Boolean(selectedCourier?.transportId) &&
      !creating,
    [name, phoneInput, dir, lat, lng, productsCart, selectedCourier, creating],
  );

  const emitCreateOrder = useCallback(() => {
    const s = socketRef?.current;
    if (!s || !canSubmit) return;

    setCreating(true);

    s.emit("ALICLIK_CREATE_ORDER", {
      id_configuracion: Number(id_configuracion),

      name: name.trim(),
      surname: (surname || "").trim(),
      phone: String(phoneInput || "").replace(/\D/g, ""),
      client_email: selectedChat?.email_cliente || "",

      dir: dir.trim(),
      reference: (reference || "").trim(),
      lat,
      lng,

      notes: (notes || "").trim(),
      channel: "chatcenter",

      delivery: money(deliveryCharge),
      courier: selectedCourier,

      products: productsCart.map((p) => ({
        ean: p.ean,
        quantity: Number(p.quantity || 1),
        price: money(p.price),
        warehouse_id: p.warehouse_id,
      })),
    });
  }, [
    socketRef,
    canSubmit,
    id_configuracion,
    name,
    surname,
    phoneInput,
    selectedChat?.email_cliente,
    dir,
    reference,
    lat,
    lng,
    notes,
    deliveryCharge,
    selectedCourier,
    productsCart,
  ]);

  /* ═══════════════════════════════════════════════════════════
     Listeners
     ═══════════════════════════════════════════════════════════ */

  // Igual que en useAliclikOrders: por ref, para que el efecto no se remonte
  // en cada render y pierda eventos en vuelo.
  const emitGetOrdersRef = useRef(emitGetOrders);
  useEffect(() => {
    emitGetOrdersRef.current = emitGetOrders;
  }, [emitGetOrders]);

  const resetRef = useRef(resetTodo);
  useEffect(() => {
    resetRef.current = resetTodo;
  }, [resetTodo]);

  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;

    const onProdOk = (resp) => {
      setProdLoading(false);
      if (resp?.isSuccess && resp?.data?.isSuccess) {
        setProdList(
          Array.isArray(resp?.data?.objects) ? resp.data.objects : [],
        );
        return;
      }
      setProdError(resp?.data?.message || "No se pudo cargar el catálogo");
      setProdList([]);
    };

    const onProdErr = (resp) => {
      setProdLoading(false);
      setProdError(resp?.message || "Error obteniendo productos de Aliclik");
      setProdList([]);
    };

    const onShipOk = (resp) => {
      setQuotesLoading(false);
      if (resp?.isSuccess && resp?.data?.isSuccess) {
        const couriers = Array.isArray(resp?.data?.objects)
          ? resp.data.objects
          : [];
        setQuotes(couriers);
        setUbigeo(resp?.data?.ubigeo || null);
        if (!couriers.length) {
          setQuotesError(
            "Aliclik no tiene cobertura para esa ubicación desde este almacén.",
          );
        }
        return;
      }
      setQuotesError(resp?.data?.message || "No se pudo cotizar el envío");
      setQuotes([]);
    };

    const onShipErr = (resp) => {
      setQuotesLoading(false);
      setQuotesError(resp?.message || "Error cotizando el envío en Aliclik");
      setQuotes([]);
    };

    const onCreateOk = (resp) => {
      setCreating(false);
      const num = resp?.data?.orderNumber || "";
      Swal.fire({
        icon: "success",
        title: "Pedido creado en Aliclik",
        html: num
          ? `<div style="font-size:.9rem;color:#475569">Número de pedido: <b>${num}</b></div>`
          : undefined,
        timer: 2600,
        showConfirmButton: false,
      });
      resetRef.current?.();
      emitGetOrdersRef.current?.();
    };

    const onCreateErr = (resp) => {
      setCreating(false);
      Swal.fire({
        icon: "error",
        title: "No se pudo crear el pedido",
        text: resp?.message || "Error creando el pedido en Aliclik",
      });
    };

    s.on("ALICLIK_PRODUCTS_OK", onProdOk);
    s.on("ALICLIK_PRODUCTS_ERROR", onProdErr);
    s.on("ALICLIK_SHIPPING_COST_OK", onShipOk);
    s.on("ALICLIK_SHIPPING_COST_ERROR", onShipErr);
    s.on("ALICLIK_CREATE_ORDER_OK", onCreateOk);
    s.on("ALICLIK_CREATE_ORDER_ERROR", onCreateErr);

    return () => {
      s.off("ALICLIK_PRODUCTS_OK", onProdOk);
      s.off("ALICLIK_PRODUCTS_ERROR", onProdErr);
      s.off("ALICLIK_SHIPPING_COST_OK", onShipOk);
      s.off("ALICLIK_SHIPPING_COST_ERROR", onShipErr);
      s.off("ALICLIK_CREATE_ORDER_OK", onCreateOk);
      s.off("ALICLIK_CREATE_ORDER_ERROR", onCreateErr);
    };
  }, [socketRef]);

  // Al abrir el panel, cargar el catálogo una vez.
  useEffect(() => {
    if (!createOrderOpen) return;
    emitGetProducts();
    // Solo al abrir: las búsquedas siguientes las dispara el propio panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOrderOpen]);

  return {
    // panel
    createOrderOpen,
    setCreateOrderOpen,
    step,
    setStep,

    // catálogo
    prodList,
    prodLoading,
    prodError,
    keywords,
    setKeywords,
    page,
    setPage,
    emitGetProducts,

    // carrito
    productsCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    warehouseId,
    warehouseName,
    totalProductos,
    totalPedido,
    totalCostoProveedor,
    fleteAsumido,
    utilidad,

    // cliente
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

    // ubicación
    lat,
    lng,
    coordsOrigen,
    ubicacionChat,
    ubicacionChatLoading,
    usarUbicacionDelChat,
    setCoordsDesdeMapa,
    setCoordsDesdeBusqueda,

    // cotización
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

    // crear
    creating,
    canSubmit,
    emitCreateOrder,
    resetTodo,
  };
}
