import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Swal from "sweetalert2";
import CreateOrderPanel from "./CreateOrderPanel";

export default function DropshipperClientPanel(props) {
  const {
    // socket
    socketRef,
    id_configuracion,

    // chat
    selectedChat,
    DEFAULT_AVATAR,

    // toggles superiores
    isOpen,
    setIsOpen,
    isOpenNovedades,
    setIsOpenNovedades,
    isOpenMiniCal,
    setIsOpenMiniCal,
    handleToggleCalendar,

    // cotizaciones
    activar_cotizacion,
    isCotizacionesOpen,
    handleToggleCotizaciones,
    loadingCotizaciones,
    cotizacionesData,
    Cotizador,

    // ... (todo lo demás)
    MiniCalendario,
  } = props;

  // ========= phone normalizado =========
  const phone = useMemo(() => {
    const raw =
      selectedChat?.celular_cliente ||
      selectedChat?.celular ||
      selectedChat?.phone ||
      null;

    if (!raw) return null;

    // deja solo dígitos
    const clean = String(raw).replace(/\D/g, "");

    // si su sistema guarda con +593, esto lo deja igual (sin +)
    // ajuste si necesita agregar prefijo.
    return clean || null;
  }, [selectedChat]);

  // ========= estado de órdenes =========
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  const [orders, setOrders] = useState([]);

  // filtros básicos (ajuste a su backend)
  const [resultNumber, setResultNumber] = useState(20);
  const [status, setStatus] = useState(""); // "" = todos

  // ========= UI: vista única (solo una orden abierta) =========
  const [selectedOrder, setSelectedOrder] = useState(null);

  // listeners refs para evitar duplicados
  const onOkRef = useRef(null);
  const onErrRef = useRef(null);

  // listeners refs (productos/estados/ciudades/crear orden) para evitar duplicados
  const onProdOkRef = useRef(null);
  const onProdErrRef = useRef(null);
  const onStatesOkRef = useRef(null);
  const onStatesErrRef = useRef(null);
  const onCitiesOkRef = useRef(null);
  const onCitiesErrRef = useRef(null);
  const onCreateOkRef = useRef(null);
  const onCreateErrRef = useRef(null);

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
        status: status || undefined, // si está vacío no lo mande
        // puede agregar otros filtros si su backend los soporta:
        // filter_date_by: "created_at",
        // from: "2026-01-01",
        // until: "2026-02-01",
        ...extra,
      });
    },
    [socketRef, id_configuracion, phone, resultNumber, status],
  );

  // listeners de órdenes (una sola vez por socketRef)
  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;

    // limpiar anteriores si existían
    if (onOkRef.current) s.off("DROPI_ORDERS_BY_CLIENT", onOkRef.current);
    if (onErrRef.current)
      s.off("DROPI_ORDERS_BY_CLIENT_ERROR", onErrRef.current);

    const onOk = (resp) => {
      setOrdersLoading(false);

      // resp = { isSuccess: true, data: { isSuccess:true, status:200, objects:[...] } }
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

    onOkRef.current = onOk;
    onErrRef.current = onErr;

    s.on("DROPI_ORDERS_BY_CLIENT", onOk);
    s.on("DROPI_ORDERS_BY_CLIENT_ERROR", onErr);

    return () => {
      s.off("DROPI_ORDERS_BY_CLIENT", onOk);
      s.off("DROPI_ORDERS_BY_CLIENT_ERROR", onErr);
    };
  }, [socketRef]);

  // cuando ABRE “Órdenes”, consulta
  useEffect(() => {
    if (!isOpen) return;
    emitGetOrders();
  }, [isOpen, emitGetOrders]);

  // ========= crear orden =========
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [step, setStep] = useState(1);

  // productos
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState(null);
  const [prodList, setProdList] = useState([]);
  const [keywords, setKeywords] = useState("");
  const [startData, setStartData] = useState(0);
  const pageSize = 5;

  const [phoneInput, setPhoneInput] = useState(phone || "");
  useEffect(() => setPhoneInput(phone || ""), [phone]); // default del chat

  const [productsCart, setProductsCart] = useState([]); // array final products[]
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);

  // states/cities
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  // Guardamos el DEPARTMENT (id + nombre) y la CITY (id + nombre)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [selectedDepartmentName, setSelectedDepartmentName] = useState("");

  const [selectedCityId, setSelectedCityId] = useState(null);
  const [selectedCityName, setSelectedCityName] = useState("");

  // rate_type se usa tanto para cities como para create order
  const [rateType, setRateType] = useState("CON RECAUDO");

  // por ahora default 1, luego se vuelve dinámico desde su integración por pais EC | CO |
  const [countryId, setCountryId] = useState(1);

  // datos cliente/dirección
  const [name, setName] = useState(selectedChat?.nombre_cliente || "");
  const [surname, setSurname] = useState(selectedChat?.apellido_cliente || "");
  const [dir, setDir] = useState("");

  const emitGetProducts = useCallback(
    (reset = false) => {
      const s = socketRef?.current;
      if (!s) return setProdError("Socket no disponible");

      setProdLoading(true);
      setProdError(null);

      const nextStart = reset ? 0 : startData;

      s.emit("GET_DROPI_PRODUCTS", {
        id_configuracion: Number(id_configuracion),
        pageSize,
        startData: nextStart,
        no_count: true,
        order_by: "id",
        order_type: "asc",
        keywords: keywords || "",
        favorite: false,
        privated_product: false,
      });
    },
    [socketRef, id_configuracion, pageSize, startData, keywords],
  );

  const emitGetStates = useCallback(() => {
    const s = socketRef?.current;
    if (!s) return;

    setStatesLoading(true);

    s.emit("GET_DROPI_STATES", {
      id_configuracion: Number(id_configuracion),
      country_id: Number(countryId) || 1, // ✅ requerido por su backend
    });
  }, [socketRef, id_configuracion, countryId]);

  // ✅ CORREGIDO: recibe departmentId opcional para evitar setTimeout/stale state
  const emitGetCities = useCallback(
    (departmentIdParam = null) => {
      const s = socketRef?.current;
      if (!s) return;

      const depId = Number(departmentIdParam ?? selectedDepartmentId) || null;
      if (!depId) return;

      setCitiesLoading(true);

      s.emit("GET_DROPI_CITIES", {
        id_configuracion: Number(id_configuracion),
        department_id: depId,
        rate_type: String(rateType || "CON RECAUDO"),
      });
    },
    [socketRef, id_configuracion, selectedDepartmentId, rateType],
  );

  const handleSelectDepartment = (e) => {
    const depId = Number(e.target.value) || null;

    setSelectedDepartmentId(depId);

    // buscar el nombre (dependiendo cómo venga el objeto)
    const dep =
      states.find((x) => Number(x.id) === depId) ||
      states.find((x) => Number(x.department_id) === depId) ||
      null;

    const depName = dep?.name || dep?.department || dep?.nombre || "";
    setSelectedDepartmentName(depName);

    // reset city
    setSelectedCityId(null);
    setSelectedCityName("");
    setCities([]);

    // ✅ CORREGIDO: sin setTimeout, se llama directo con el depId
    if (depId) emitGetCities(depId);
  };

  const handleSelectCity = (e) => {
    const cityId = Number(e.target.value) || null;
    setSelectedCityId(cityId);

    const c =
      cities.find((x) => Number(x.id) === cityId) ||
      cities.find((x) => Number(x.city_id) === cityId) ||
      null;

    const cityName = c?.name || c?.city || c?.nombre || "";
    setSelectedCityName(cityName);
  };

  const emitCreateOrder = useCallback(() => {
    const s = socketRef?.current;
    if (!s) return;

    const cleanPhone = String(phoneInput || "").replace(/\D/g, "");

    const products = productsCart.map((it) => ({
      id: it.id,
      name: it.name,
      type: it.type || "SIMPLE",
      variation_id: it.variation_id ?? null,
      variations: it.variations || [],
      quantity: Number(it.quantity) || 1,
      price: Number(it.price) || 0,
      sale_price: it.sale_price ?? null,
      suggested_price: it.suggested_price ?? null,
    }));

    const total_order = products.reduce(
      (acc, p) => acc + Number(p.quantity) * Number(p.price),
      0,
    );

    // Si necesita supplier/shop/warehouse, tome del primer producto (o defina reglas)
    const raw0 = productsCart?.[0]?.__raw;

    const body = {
      id_configuracion: Number(id_configuracion),
      type: "FINAL_ORDER",
      type_service: "normal",
      rate_type: String(rateType || "CON RECAUDO"),

      total_order,
      shipping_amount: 11100,
      payment_method_id: 1,
      notes: "",

      supplier_id: raw0?.user_id,
      shop_id: raw0?.shop_id,
      warehouses_selected_id: raw0?.warehouse_id,

      name,
      surname,
      phone: cleanPhone,

      country: "COLOMBIA",
      state: selectedDepartmentName,
      city: selectedCityName,

      dir,
      zip_code: null,

      distributionCompany: { id: 3, name: "INTERRAPIDISIMO" },

      products,
    };

    s.emit("CREATE_DROPI_ORDER", body);
  }, [
    socketRef,
    id_configuracion,
    phoneInput,
    productsCart,
    rateType,
    name,
    surname,
    selectedDepartmentName,
    selectedCityName,
    dir,
  ]);

  // ✅ si cambia el rateType con el modal abierto y hay departamento seleccionado, recarga cities
  useEffect(() => {
    if (!createOrderOpen) return;
    if (!selectedDepartmentId) return;
    emitGetCities(selectedDepartmentId);
  }, [rateType, createOrderOpen, selectedDepartmentId, emitGetCities]);

  useEffect(() => {
    setName(selectedChat?.nombre_cliente || "");
    setSurname(selectedChat?.apellido_cliente || "");
  }, [selectedChat?.id, selectedChat?.psid]);

  // listeners (productos/estados/ciudades/crear orden) SIN duplicarse
  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;

    // ===== limpiar anteriores si existían =====
    if (onProdOkRef.current) s.off("DROPI_PRODUCTS_OK", onProdOkRef.current);
    if (onProdErrRef.current)
      s.off("DROPI_PRODUCTS_ERROR", onProdErrRef.current);

    if (onStatesOkRef.current) s.off("DROPI_STATES_OK", onStatesOkRef.current);
    if (onStatesErrRef.current)
      s.off("DROPI_STATES_ERROR", onStatesErrRef.current);

    if (onCitiesOkRef.current) s.off("DROPI_CITIES_OK", onCitiesOkRef.current);
    if (onCitiesErrRef.current)
      s.off("DROPI_CITIES_ERROR", onCitiesErrRef.current);

    if (onCreateOkRef.current)
      s.off("CREATE_DROPI_ORDER_OK", onCreateOkRef.current);
    if (onCreateErrRef.current)
      s.off("CREATE_DROPI_ORDER_ERROR", onCreateErrRef.current);

    // ===== PRODUCTS =====
    const onProdOk = (resp) => {
      setProdLoading(false);

      // soporte flexible: resp puede venir {isSuccess,data:{objects}} o {objects}
      const list =
        resp?.data?.objects ||
        resp?.objects ||
        resp?.data?.data?.objects ||
        resp?.data?.products ||
        resp?.products ||
        [];

      setProdList(Array.isArray(list) ? list : []);
    };

    const onProdErr = (resp) => {
      setProdLoading(false);
      setProdError(
        resp?.message || resp?.data?.message || "Error obteniendo productos",
      );
      setProdList([]);
    };

    // ===== STATES (DEPARTMENTS) =====
    const onStatesOk = (resp) => {
      setStatesLoading(false);

      const list =
        resp?.data?.objects ||
        resp?.objects ||
        resp?.data?.data ||
        resp?.data ||
        resp?.departments ||
        [];

      setStates(Array.isArray(list) ? list : []);
    };

    const onStatesErr = (resp) => {
      setStatesLoading(false);
      Swal.fire({
        icon: "error",
        title: "Error cargando provincias/departamentos",
        text: resp?.message || resp?.data?.message || "No se pudo cargar",
      });
      setStates([]);
    };

    // ===== CITIES =====
    const onCitiesOk = (resp) => {
      setCitiesLoading(false);

      // ✅ Dropi: objects trae { cities: [...] }
      const list =
        resp?.data?.objects?.cities ||
        resp?.objects?.cities ||
        resp?.data?.data?.objects?.cities ||
        resp?.data?.cities ||
        resp?.cities ||
        [];

      setCities(Array.isArray(list) ? list : []);
    };

    const onCitiesErr = (resp) => {
      setCitiesLoading(false);
      Swal.fire({
        icon: "error",
        title: "Error cargando ciudades",
        text: resp?.message || resp?.data?.message || "No se pudo cargar",
      });
      setCities([]);
    };

    // ===== CREATE ORDER =====
    const onCreateOk = (resp) => {
      Swal.fire({
        icon: "success",
        title: "Orden creada",
        text: resp?.message || "La orden se creó correctamente",
        timer: 1800,
        showConfirmButton: false,
      });

      setCreateOrderOpen(false);
      setStep(1);

      // refrescar lista de órdenes
      emitGetOrders();
    };

    const onCreateErr = (resp) => {
      Swal.fire({
        icon: "error",
        title: "No se pudo crear la orden",
        text: resp?.message || resp?.data?.message || "Error creando orden",
      });
    };

    // guardar refs y registrar listeners
    onProdOkRef.current = onProdOk;
    onProdErrRef.current = onProdErr;
    onStatesOkRef.current = onStatesOk;
    onStatesErrRef.current = onStatesErr;
    onCitiesOkRef.current = onCitiesOk;
    onCitiesErrRef.current = onCitiesErr;
    onCreateOkRef.current = onCreateOk;
    onCreateErrRef.current = onCreateErr;

    s.on("DROPI_PRODUCTS_OK", onProdOk);
    s.on("DROPI_PRODUCTS_ERROR", onProdErr);

    s.on("DROPI_STATES_OK", onStatesOk);
    s.on("DROPI_STATES_ERROR", onStatesErr);

    s.on("DROPI_CITIES_OK", onCitiesOk);
    s.on("DROPI_CITIES_ERROR", onCitiesErr);

    s.on("CREATE_DROPI_ORDER_OK", onCreateOk);
    s.on("CREATE_DROPI_ORDER_ERROR", onCreateErr);

    return () => {
      s.off("DROPI_PRODUCTS_OK", onProdOk);
      s.off("DROPI_PRODUCTS_ERROR", onProdErr);

      s.off("DROPI_STATES_OK", onStatesOk);
      s.off("DROPI_STATES_ERROR", onStatesErr);

      s.off("DROPI_CITIES_OK", onCitiesOk);
      s.off("DROPI_CITIES_ERROR", onCitiesErr);

      s.off("CREATE_DROPI_ORDER_OK", onCreateOk);
      s.off("CREATE_DROPI_ORDER_ERROR", onCreateErr);
    };
  }, [socketRef, emitGetOrders]);

  // si cambia el chat y el panel de órdenes está abierto, refresca
  useEffect(() => {
    if (!isOpen) return;

    setOrders([]);
    setOrdersError(null);
    setSelectedOrder(null); // <- clave: al cambiar de chat, vuelva a lista

    // no spamear si todavía no hay phone
    if (phone) emitGetOrders();
  }, [selectedChat?.id, selectedChat?.psid, phone, isOpen, emitGetOrders]);

  const handleToggleOrders = () => {
    setIsOpen((prev) => !prev);
    setIsOpenNovedades(false);
    setIsOpenMiniCal(false);

    // al cerrar el panel de órdenes, resetea modo detalle
    if (isOpen) {
      setSelectedOrder(null);
    }
  };

  const handleRetryOrders = () => emitGetOrders();

  // ========= UI helpers =========
  const showOrderId = (o) =>
    o?.id || o?.order_id || o?.pedido_id || o?.numero_orden || "—";
  const showOrderStatus = (o) => o?.status || o?.estado || "Sin estado";
  const showOrderDate = (o) => o?.created_at || o?.createdAt || o?.fecha || "";

  const NO_IMAGE = "https://app.dropi.ec/assets/utils/no-image.jpg";

  const normalizeStatus = (st = "") =>
    String(st || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ")
      .replace(/_/g, " "); // por si viene PENDIENTE_CONFIRMACION

  const isCancelled = (o) =>
    normalizeStatus(showOrderStatus(o)) === "CANCELADO";

  //SOLO editable cuando está "PENDIENTE CONFIRMACION"
  const isPendingConfirm = (o) =>
    normalizeStatus(showOrderStatus(o)) === "PENDIENTE CONFIRMACION";

  const canEditOrder = (o) => isPendingConfirm(o); // solo "PENDIENTE CONFIRMACION"

  // Imagen del producto (con heurística)
  // Como no sabemos el dominio final de urlS3, lo intentamos y el <img onError> resuelve.
  const resolveProductImage = (p) => {
    if (!p) return null;

    // 1) si ya viene un url completo
    const direct =
      p?.imageUrl ||
      p?.image_url ||
      p?.image ||
      p?.url ||
      p?.photo ||
      p?.main_image ||
      null;

    if (direct && /^https?:\/\//i.test(String(direct))) return String(direct);

    // 2) si viene urlS3 como path (ej: colombia/products/...)
    const urlS3 = p?.urlS3 || p?.url_s3 || null;
    if (urlS3) {
      // Intento común (si Dropi sirve archivos desde /storage)
      return `https://app.dropi.ec/storage/${String(urlS3).replace(/^\/+/, "")}`;
    }

    return null;
  };

  const getProductImage = (o) => {
    const p = getProduct(o);
    return resolveProductImage(p) || NO_IMAGE;
  };

  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusStyle = (st = "") => {
    const s = String(st).toUpperCase();
    if (s === "ENTREGADO")
      return "bg-emerald-500/20 text-emerald-200 border-emerald-400/30";
    if (s === "PENDIENTE")
      return "bg-amber-500/20 text-amber-200 border-amber-400/30";
    if (s === "CONFIRMADO")
      return "bg-sky-500/20 text-sky-200 border-sky-400/30";
    if (s === "ENVIADO")
      return "bg-indigo-500/20 text-indigo-200 border-indigo-400/30";
    if (s === "CANCELADO")
      return "bg-rose-500/20 text-rose-200 border-rose-400/30";
    return "bg-white/10 text-white/80 border-white/10";
  };

  const getFirstDetail = (o) => o?.orderdetails?.[0] || null;
  const getProduct = (o) => getFirstDetail(o)?.product || null;

  const getProductName = (o) => getProduct(o)?.name || "—";
  const getProductSku = (o) => getProduct(o)?.sku || "—";

  const getWarehouseName = (o) => {
    const w =
      getFirstDetail(o)?.warehouse_product?.[0]?.warehouse?.[0]?.name ||
      o?.warehouse?.name ||
      "—";
    return w;
  };

  const getQty = (o) => getFirstDetail(o)?.quantity ?? "—";

  const getPhone = (o) =>
    o?.phone || selectedChat?.celular_cliente || selectedChat?.celular || "—";

  const getTransportadora = (o) =>
    o?.shipping_company ||
    o?.distribution_company?.name ||
    o?.shippingCompany ||
    "—";

  const getShippingAmount = (o) => o?.shipping_amount ?? "—";

  const getTotal = (o) =>
    o?.total_order ?? o?.total ?? o?.monto ?? o?.valor ?? "—";

  const getCityState = (o) => {
    const city = o?.city || o?.city_name || "";
    const st = o?.state || o?.state_name || "";
    return [city, st].filter(Boolean).join(", ") || "—";
  };

  // ========= acciones UI =========
  const openOrder = (order) => {
    setSelectedOrder(order);

    // si la orden ya trae teléfono, úselo; si no, el del chat
    const orderPhone = String(order?.phone || phone || "").replace(/\D/g, "");
    setPhoneInput(orderPhone);
  };

  const closeOrder = () => setSelectedOrder(null);

  // ========= placeholders (usted conecta la lógica luego) =========
  const handleEditOrder = (order) => {
    Swal.fire({
      icon: "info",
      title: "Editar (pendiente)",
      text: `Aquí conectará la edición de la orden #${showOrderId(order)}`,
      confirmButtonText: "OK",
    });
  };

  const handleGenerateGuide = (order) => {
    Swal.fire({
      icon: "info",
      title: "Generar guía (pendiente)",
      text: `Aquí conectará la generación de guía para la orden #${showOrderId(
        order,
      )}`,
      confirmButtonText: "OK",
    });
  };

  const pickSupplierId = (p) => Number(p?.user?.id || p?.user_id || 0) || null;

  const pickWarehouseId = (p) =>
    Number(
      p?.warehouse_product?.[0]?.warehouse_id ||
        p?.warehouse_product?.[0]?.warehouse?.id ||
        0,
    ) || null;

  const addProductToCart = (p) => {
    if (!p?.id) return;

    const newSupplierId = pickSupplierId(p);
    const newWarehouseId = pickWarehouseId(p);

    setProductsCart((prev) => {
      // si ya hay productos, validar que sea el mismo proveedor/bodega
      if (prev.length > 0) {
        const baseRaw = prev[0]?.__raw;
        const baseSupplierId = pickSupplierId(baseRaw);
        const baseWarehouseId = pickWarehouseId(baseRaw);

        const sameSupplier =
          !baseSupplierId || !newSupplierId || baseSupplierId === newSupplierId;
        const sameWarehouse =
          !baseWarehouseId ||
          !newWarehouseId ||
          baseWarehouseId === newWarehouseId;

        if (!sameSupplier || !sameWarehouse) {
          Swal.fire({
            icon: "warning",
            title: "No se puede mezclar proveedores/bodegas",
            text: "Dropi no permite crear una orden con productos de distintos proveedores o bodegas. Por favor, verifique los productos seleccionados.",
          });
          return prev;
        }
      }

      const exists = prev.find((x) => Number(x.id) === Number(p.id));
      if (exists) {
        return prev.map((x) =>
          Number(x.id) === Number(p.id)
            ? { ...x, quantity: Number(x.quantity || 1) + 1 }
            : x,
        );
      }

      // Precio sugerido (editable) por defecto
      const suggested =
        Number(p?.suggested_price) ||
        Number(p?.sale_price) ||
        Number(p?.price) ||
        0;

      return [
        ...prev,
        {
          id: p.id,
          name: p.name,
          type: p.type || "SIMPLE",
          variation_id: null,
          variations: [],
          quantity: 1,

          // este es el precio que el dropshipper puede editar (ganancia)
          price: suggested,

          //  mostramos costo/proveedor como referencia
          sale_price: p?.sale_price ? String(p.sale_price) : null,
          suggested_price: p?.suggested_price
            ? String(p.suggested_price)
            : null,

          __raw: p,
        },
      ];
    });
  };

  const removeProductFromCart = (id) => {
    setProductsCart((prev) => prev.filter((x) => Number(x.id) !== Number(id)));
  };

  const updateCartItem = (id, patch) => {
    setProductsCart((prev) =>
      prev.map((x) => (Number(x.id) === Number(id) ? { ...x, ...patch } : x)),
    );
  };

  return (
    <>
      <div className="flex items-start justify-center overflow-y-auto h-full pt-2 md:pt-4 custom-scrollbar">
        <div className="w-full max-w-3xl mx-auto">
          {/* ===== Header cliente (avatar+datos) ===== */}
          <div className="mb-8 px-6 py-6 bg-transparent text-white rounded-2xl shadow-xl border border-violet-500 neon-border opacity-0 animate-fadeInOnce delay-[100ms]">
            <div className="w-full bg-[#162c4a] rounded-xl shadow-lg px-6 py-5 flex flex-col gap-4 animate-fadeInOnce">
              <img
                key={selectedChat?.psid || selectedChat?.id}
                src={selectedChat?.imagePath || DEFAULT_AVATAR}
                alt="Avatar"
                className="h-12 w-12 rounded-full object-cover bg-white block mx-auto"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_AVATAR;
                }}
              />

              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6 text-white/90">
                <div className="flex items-center gap-3">
                  <i className="bx bx-id-card text-2xl text-violet-300"></i>
                  <div>
                    <p className="text-xs text-white/60">Nombre</p>
                    <p className="text-sm font-semibold">
                      {selectedChat?.nombre_cliente || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <i className="bx bx-phone-call text-2xl text-violet-300"></i>
                  <div>
                    <p className="text-xs text-white/60">Teléfono</p>
                    <p className="text-sm font-semibold">
                      {selectedChat?.celular_cliente ||
                        selectedChat?.celular ||
                        "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* aviso si falta phone */}
              {!phone && (
                <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-lg p-2">
                  No se detectó un teléfono válido en este chat. No se podrán
                  consultar órdenes.
                </div>
              )}
            </div>
          </div>

          {/* ===== Botonera superior (órdenes/novedades/calendario/cotizaciones) ===== */}
          <div className="grid grid-cols-2 gap-3 mb-4 opacity-0 animate-slideInRightOnce delay-[0ms]">
            {/* Órdenes */}
            <button
              className={`group w-full flex items-center justify-center gap-3 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                isOpen
                  ? "bg-[#1e3a5f] border-blue-400"
                  : "bg-[#162c4a] border-transparent hover:border-blue-300"
              }`}
              onClick={handleToggleOrders}
            >
              <i
                className={`bx bx-package text-xl ${
                  isOpen ? "glow-yellow" : "text-yellow-300"
                }`}
              />
              <span className="text-white">Órdenes</span>
            </button>

            {/* Novedades */}
            <button
              className={`group w-full flex items-center justify-center gap-3 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                isOpenNovedades
                  ? "bg-[#1e3a5f] border-blue-400"
                  : "bg-[#162c4a] border-transparent hover:border-blue-300"
              }`}
              onClick={() => {
                setIsOpenNovedades((prev) => !prev);
                setIsOpen(false);
                setIsOpenMiniCal(false);
                setSelectedOrder(null);
              }}
            >
              <i
                className={`bx bx-bell text-xl ${
                  isOpenNovedades ? "glow-yellow" : "text-yellow-300"
                }`}
              />
              <span className="text-white">Novedades</span>
            </button>

            {/* Calendario */}
            <button
              className={`group w-full flex items-center justify-center gap-3 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                isOpenMiniCal
                  ? "bg-[#1e3a5f] border-blue-400"
                  : "bg-[#162c4a] border-transparent hover:border-blue-300"
              } ${props.isCotizacionesOpen ? "" : "col-span-2"}`}
              onClick={() => {
                setSelectedOrder(null);
                handleToggleCalendar();
              }}
            >
              <i
                className={`bx bx-calendar text-xl ${
                  isOpenMiniCal ? "glow-yellow" : "text-yellow-300"
                }`}
              />
              <span className="text-white">Calendario</span>
            </button>

            {/* Cotizaciones */}
            {activar_cotizacion == 1 && (
              <button
                className={`group w-full flex items-center justify-center gap-3 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                  isCotizacionesOpen
                    ? "bg-[#1e3a5f] border-blue-400"
                    : "bg-[#162c4a] border-transparent hover:border-blue-300"
                }`}
                onClick={() => {
                  setSelectedOrder(null);
                  handleToggleCotizaciones();
                }}
              >
                <i
                  className={`bx bx-file-blank text-xl ${
                    isCotizacionesOpen ? "glow-yellow" : "text-green-300"
                  }`}
                />
                <span className="text-white">Cotizaciones</span>
              </button>
            )}
          </div>

          {/* ===== Panel Órdenes (Dropi) ===== */}
          <div
            className={`transition-all duration-300 ease-in-out transform origin-top ${
              isOpen
                ? "opacity-100 scale-100 max-h-[2000px] pointer-events-auto"
                : "opacity-0 scale-95 max-h-0 overflow-hidden pointer-events-none"
            } bg-[#12172e] rounded-lg shadow-md mb-4`}
          >
            <div className="p-4 text-white">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <i className="bx bx-package text-yellow-300 text-xl" />
                  <h3 className="font-semibold">
                    {selectedOrder
                      ? "Orden seleccionada"
                      : "Órdenes del cliente"}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Volver a lista (solo si hay una orden abierta) */}
                  {selectedOrder && (
                    <button
                      className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-xs flex items-center gap-2"
                      onClick={closeOrder}
                      title="Cerrar orden"
                    >
                      <i className="bx bx-x" />
                      Cerrar
                    </button>
                  )}

                  {/* refrescar (solo en modo lista) */}
                  {!selectedOrder && (
                    <button
                      className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-xs"
                      onClick={handleRetryOrders}
                      disabled={ordersLoading}
                      title="Actualizar"
                    >
                      <i
                        className={`bx bx-refresh ${
                          ordersLoading ? "bx-spin" : ""
                        }`}
                      />
                    </button>
                  )}
                </div>
              </div>

              {ordersError && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-lg p-3 mb-3">
                  {ordersError}
                </div>
              )}

              {ordersLoading && !selectedOrder && (
                <div className="text-sm text-white/70">Cargando órdenes…</div>
              )}

              {/* ====== MODO LISTA ====== */}
              {/* ====== NO HAY ÓRDENES ====== */}
              {!selectedOrder &&
                !ordersLoading &&
                !ordersError &&
                orders?.length === 0 && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    {!createOrderOpen ? (
                      <>
                        <p className="text-sm text-white/80">
                          No hay órdenes para este cliente.
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            setCreateOrderOpen(true);
                            setStep(1);

                            // limpiar selección
                            setSelectedProduct(null);
                            setSelectedDepartmentId(null);
                            setSelectedDepartmentName("");
                            setSelectedCityId(null);
                            setSelectedCityName("");
                            setCities([]);

                            // valores iniciales sugeridos
                            setQuantity(1);
                            setPrice(0);
                            setDir("");
                            setRateType("CON RECAUDO");

                            // cargar data inicial
                            emitGetProducts(true);
                            emitGetStates();
                          }}
                          className="mt-3 w-full px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-sm font-semibold flex items-center justify-center gap-2"
                          disabled={!phone}
                          title={
                            !phone
                              ? "Falta teléfono para crear orden"
                              : "Crear una nueva orden"
                          }
                        >
                          <i className="bx bx-plus-circle" />
                          Crear orden
                        </button>
                      </>
                    ) : (
                      <CreateOrderPanel
                        // cliente
                        phoneInput={phoneInput}
                        setPhoneInput={setPhoneInput}
                        name={name}
                        setName={setName}
                        surname={surname}
                        setSurname={setSurname}
                        dir={dir}
                        setDir={setDir}
                        // recaudo/ubicación
                        rateType={rateType}
                        setRateType={setRateType}
                        states={states}
                        statesLoading={statesLoading}
                        selectedDepartmentId={selectedDepartmentId}
                        handleSelectDepartment={handleSelectDepartment}
                        cities={cities}
                        citiesLoading={citiesLoading}
                        selectedCityId={selectedCityId}
                        handleSelectCity={handleSelectCity}
                        // productos
                        keywords={keywords}
                        setKeywords={setKeywords}
                        prodList={prodList}
                        prodLoading={prodLoading}
                        prodError={prodError}
                        emitGetProducts={emitGetProducts}
                        addProductToCart={addProductToCart}
                        // carrito
                        productsCart={productsCart}
                        updateCartItem={updateCartItem}
                        removeProductFromCart={removeProductFromCart}
                        // submit
                        canSubmit={
                          Boolean(name?.trim()) &&
                          Boolean(surname?.trim()) &&
                          Boolean(dir?.trim()) &&
                          Boolean(selectedDepartmentId) &&
                          Boolean(selectedCityId) &&
                          Array.isArray(productsCart) &&
                          productsCart.length > 0
                        }
                        onClose={() => setCreateOrderOpen(false)}
                        onSubmit={emitCreateOrder}
                      />
                    )}
                  </div>
                )}

              {!selectedOrder &&
                !ordersLoading &&
                !ordersError &&
                orders?.length > 0 && (
                  <div className="space-y-3">
                    {orders.map((o, idx) => (
                      <div
                        key={String(showOrderId(o)) + "_" + idx}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                      >
                        {/* Header: ID + Status + Fecha + Abrir */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              Orden #{showOrderId(o)}
                            </p>
                            <p className="text-xs text-white/60 truncate">
                              {fmtDate(showOrderDate(o))} • {getCityState(o)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[11px] px-2 py-1 rounded-full border ${statusStyle(
                                showOrderStatus(o),
                              )}`}
                            >
                              {showOrderStatus(o)}
                            </span>

                            <button
                              type="button"
                              onClick={() => openOrder(o)}
                              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs flex items-center gap-2"
                              title="Abrir orden"
                            >
                              <i className="bx bx-folder-open" />
                              Abrir
                            </button>
                          </div>
                        </div>

                        {/* Mini resumen (solo en lista) */}
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Imagen + Producto */}
                          <div className="flex items-center gap-3 bg-black/20 rounded-lg p-3 border border-white/10 sm:col-span-2">
                            <img
                              src={getProductImage(o)}
                              alt="Producto"
                              className="h-12 w-12 rounded-lg object-cover bg-white/5 border border-white/10 shrink-0"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = NO_IMAGE;
                              }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs text-white/60">Producto</p>
                              <p className="text-sm font-semibold truncate">
                                {getQty(o)} x {getProductName(o)}
                              </p>
                              <p className="text-xs text-white/60 truncate">
                                SKU: {getProductSku(o)}
                              </p>
                            </div>
                          </div>

                          {/* Totales + envío */}
                          <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                            <p className="text-xs text-white/60">Total</p>
                            <p className="text-sm font-semibold text-white">
                              ${getTotal(o)}
                            </p>
                            <p className="text-xs text-white/60 mt-1">
                              Envío: ${getShippingAmount(o)}
                            </p>
                          </div>

                          {/* Transportadora + Dirección */}
                          <div className="bg-black/20 rounded-lg p-3 border border-white/10 sm:col-span-3">
                            <p className="text-xs text-white/60">
                              Transportadora
                            </p>
                            <p className="text-sm font-semibold truncate">
                              {getTransportadora(o)}
                            </p>
                            <p className="text-xs text-white/60 truncate mt-1">
                              Dirección: {o?.dir || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {/* ====== MODO DETALLE (solo la orden) ====== */}
              {selectedOrder && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  {/* Header detalle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold truncate">
                        Orden #{showOrderId(selectedOrder)}
                      </p>
                      <p className="text-xs text-white/60 truncate">
                        {fmtDate(showOrderDate(selectedOrder))} •{" "}
                        {getCityState(selectedOrder)}
                      </p>
                    </div>

                    <span
                      className={`text-[11px] px-2 py-1 rounded-full border ${statusStyle(
                        showOrderStatus(selectedOrder),
                      )}`}
                    >
                      {showOrderStatus(selectedOrder)}
                    </span>
                  </div>

                  {/* Botones acción */}
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    {/* ✅ Solo si está Pendiente Confirmación */}
                    {isPendingConfirm(selectedOrder) && (
                      <button
                        type="button"
                        onClick={() => handleEditOrder(selectedOrder)}
                        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/30 text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <i className="bx bx-edit" />
                        Editar
                      </button>
                    )}

                    {/* Botón principal: Confirmar pedido (solo si está Pendiente Confirmación) */}
                    {isPendingConfirm(selectedOrder) && (
                      <button
                        type="button"
                        onClick={() => handleGenerateGuide(selectedOrder)} // aquí luego conectamos el socket real de "confirmar"
                        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <i className="bx bx-check-circle" />
                        Confirmar pedido
                      </button>
                    )}

                    {/* Si está CANCELADO, no mostramos nada editable/confirmable */}
                    {isCancelled(selectedOrder) && (
                      <div className="text-xs text-rose-200 bg-rose-500/10 border border-rose-400/20 rounded-lg p-2">
                        Esta orden está cancelada y no se puede modificar.
                      </div>
                    )}
                  </div>

                  {/* Datos clave (detalle) */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Producto */}
                    <div className="flex items-start gap-3 bg-black/20 rounded-lg p-3 border border-white/10">
                      <img
                        src={getProductImage(selectedOrder)}
                        alt="Producto"
                        className="h-12 w-12 rounded-lg object-cover bg-white/5 border border-white/10 shrink-0"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = NO_IMAGE;
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-white/60">Producto</p>
                        <p className="text-sm font-semibold truncate">
                          {getQty(selectedOrder)} x{" "}
                          {getProductName(selectedOrder)}
                        </p>
                        <p className="text-xs text-white/60 truncate">
                          SKU: {getProductSku(selectedOrder)}
                        </p>
                      </div>
                    </div>

                    {/* Bodega */}
                    <div className="flex items-start gap-3 bg-black/20 rounded-lg p-3 border border-white/10">
                      <i className="bx bx-store text-xl text-emerald-300" />
                      <div className="min-w-0">
                        <p className="text-xs text-white/60">Bodega</p>
                        <p className="text-xs text-white truncate">
                          {getWarehouseName(selectedOrder)}
                        </p>
                      </div>
                    </div>

                    {/* Teléfono */}
                    <div className="flex items-start gap-3 bg-black/20 rounded-lg p-3 border border-white/10">
                      <i className="bx bx-phone text-xl text-yellow-300" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-white/60 mb-1">
                          Teléfono
                        </p>
                        <input
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          disabled={!canEditOrder(selectedOrder)}
                          className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400/60
                            ${canEditOrder(selectedOrder) ? "text-white" : "text-white/40 cursor-not-allowed opacity-70"}
                          `}
                          placeholder="Ej: 57XXXXXXXXXX"
                        />
                      </div>
                    </div>

                    {/* Transportadora */}
                    <div className="flex items-start gap-3 bg-black/20 rounded-lg p-3 border border-white/10">
                      <i className="bx bx-trip text-xl text-sky-300" />
                      <div className="min-w-0">
                        <p className="text-xs text-white/60">Transportadora</p>
                        <p className="text-sm font-semibold truncate">
                          {getTransportadora(selectedOrder)}
                        </p>
                        <p className="text-xs text-white/60 truncate">
                          Envío: ${getShippingAmount(selectedOrder)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Totales */}
                  <div className="mt-3 flex items-c enter justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                    <p className="text-xs text-white/70">Total orden</p>
                    <p className="text-sm font-semibold text-white">
                      ${getTotal(selectedOrder)}
                    </p>
                  </div>

                  {/* Dirección */}
                  <div className="mt-2 text-xs text-white/60">
                    <span className="font-semibold text-white/70">
                      Dirección:
                    </span>{" "}
                    {selectedOrder?.dir || "—"}
                  </div>

                  {/* Placeholder para su formulario de edición */}
                  <div className="mt-3 text-xs text-white/50">
                    *Aquí puede montar su formulario de edición (inputs,
                    selects, validaciones, etc.). Ya queda la vista “limpia”
                    solo para una orden.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===== Panel Cotizaciones ===== */}
          <div
            className={`transition-all duration-300 ease-in-out transform origin-top ${
              isCotizacionesOpen
                ? "opacity-100 scale-100 max-h-[1000px] pointer-events-auto"
                : "opacity-0 scale-95 max-h-0 overflow-hidden pointer-events-none"
            } bg-[#12172e] rounded-lg shadow-md mb-4`}
          >
            <Cotizador
              loadingCotizaciones={loadingCotizaciones}
              cotizacionesData={cotizacionesData}
            />
          </div>

          {/* ===== Mini calendario ===== */}
          {isOpenMiniCal && (
            <div className="bg-transparent rounded-lg shadow-md">
              <div className="p-3">
                <div className="rounded-lg shadow-md bg-white text-slate-900">
                  <MiniCalendario />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
