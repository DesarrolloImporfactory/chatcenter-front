import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Swal from "sweetalert2";

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

  // listeners una sola vez por socketRef
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
  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;

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
      // Opcional: cerrar modal, resetear y refrescar órdenes
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
  }, [selectedChat?.id, selectedChat?.psid, phone]);

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

  // ===== Helpers de extracción (Dropi) =====
  const money = (n) => {
    const val = Number(n);
    if (!Number.isFinite(val)) return "—";
    return val.toLocaleString("es-CO");
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
  };

  const closeOrder = () => {
    setSelectedOrder(null);
  };

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

  const [createOrderOpen, setCreateOrderOpen] = useState(false);

  const [step, setStep] = useState(1);

  // productos
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState(null);
  const [prodList, setProdList] = useState([]);
  const [keywords, setKeywords] = useState("");
  const [startData, setStartData] = useState(0);
  const pageSize = 50;

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
  const [colonia, setColonia] = useState("");

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

  const emitGetCities = useCallback(() => {
    const s = socketRef?.current;
    if (!s) return;

    if (!selectedDepartmentId) return;

    setCitiesLoading(true);

    s.emit("GET_DROPI_CITIES", {
      id_configuracion: Number(id_configuracion),
      department_id: Number(selectedDepartmentId),
      rate_type: String(rateType || "CON RECAUDO"),
    });
  }, [socketRef, id_configuracion, selectedDepartmentId, rateType]);

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

    // cargar cities (usa department_id + rateType)
    if (depId) {
      // pequeño defer para asegurar state set
      setTimeout(() => emitGetCities(), 0);
    }
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

    // body final estilo Postman (mínimo)
    const body = {
      id_configuracion: Number(id_configuracion),

      type: "FINAL_ORDER",
      type_service: "normal",
      rate_type: String(rateType || "CON RECAUDO"),

      total_order: Number(price) * Number(quantity),
      shipping_amount: 11100, // por ahora manual/fijo o input
      payment_method_id: 1,

      notes: "",

      supplier_id: selectedProduct?.user_id, // o el que corresponda
      shop_id: selectedProduct?.shop_id, // ojo: puede venir en product o aparte
      warehouses_selected_id: selectedProduct?.warehouse_id, // igual: depende de respuesta real

      name,
      surname,
      phone, // su phone normalizado, pero ojo: Dropi a veces espera +57... como usted mostró

      country: "COLOMBIA",
      state: selectedDepartmentName,
      city: selectedCityName,

      dir,
      zip_code: null,
      colonia,

      distributionCompany: { id: 3, name: "INTERRAPIDISIMO" }, // por ahora fijo o seleccionable

      products: [
        {
          id: selectedProduct?.id,
          name: selectedProduct?.name,
          type: selectedProduct?.type || "SIMPLE",
          variation_id: null,
          variations: [],
          quantity: Number(quantity),
          price: Number(price),
          sale_price: selectedProduct?.sale_price
            ? String(selectedProduct.sale_price)
            : null,
          suggested_price: selectedProduct?.suggested_price
            ? String(selectedProduct.suggested_price)
            : null,
        },
      ],
    };

    s.emit("CREATE_DROPI_ORDER", body);
  }, [
    socketRef,
    id_configuracion,
    phone,
    selectedProduct,
    quantity,
    price,
    name,
    surname,
    selectedDepartmentName,
    selectedCityName,
    dir,
    rateType,
  ]);

  useEffect(() => {
    if (!createOrderOpen) return;
    if (!selectedDepartmentId) return;
    emitGetCities();
  }, [rateType, createOrderOpen, selectedDepartmentId, emitGetCities]);

  useEffect(() => {
    setName(selectedChat?.nombre_cliente || "");
    setSurname(selectedChat?.apellido_cliente || "");
  }, [selectedChat?.id, selectedChat?.psid]);

  function CreateOrderPanel(props) {
    const {
      phone,
      name,
      setName,
      surname,
      setSurname,
      dir,
      setDir,
      colonia,
      setColonia,

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

      keywords,
      setKeywords,
      prodList,
      prodLoading,
      prodError,
      selectedProduct,
      setSelectedProduct,
      emitGetProducts,

      quantity,
      setQuantity,
      price,
      setPrice,

      onClose,
      onSubmit,
    } = props;

    const canSubmit =
      !!phone &&
      !!name?.trim() &&
      !!surname?.trim() &&
      !!dir?.trim() &&
      !!selectedDepartmentId &&
      !!selectedCityId &&
      !!selectedProduct &&
      Number(quantity) > 0 &&
      Number(price) >= 0;

    return (
      <div className="mt-2 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              Crear orden (formulario rápido)
            </p>
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

          <div className="bg-black/20 border border-white/10 rounded-xl p-3 sm:col-span-2">
            <p className="text-[11px] text-white/60 mb-1">
              Teléfono (del chat)
            </p>
            <div className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80">
              {phone || "—"}
            </div>
          </div>
        </div>

        {/* Recaudo + Ubicación */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-black/20 border border-white/10 rounded-xl p-3">
            <p className="text-[11px] text-white/60 mb-1">Tipo</p>
            <select
              value={rateType}
              onChange={(e) => setRateType(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
            >
              <option value="CON RECAUDO">CON RECAUDO</option>
              <option value="SIN RECAUDO">SIN RECAUDO</option>
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
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60 disabled:opacity-60"
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

          <div className="bg-black/20 border border-white/10 rounded-xl p-3">
            <p className="text-[11px] text-white/60 mb-1">Ciudad</p>
            <select
              value={selectedCityId || ""}
              onChange={handleSelectCity}
              disabled={!selectedDepartmentId || citiesLoading}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60 disabled:opacity-60"
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
          </div>
        </div>

        {/* Dirección */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-black/20 border border-white/10 rounded-xl p-3 sm:col-span-2">
            <p className="text-[11px] text-white/60 mb-1">Dirección</p>
            <input
              value={dir}
              onChange={(e) => setDir(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
              placeholder="Ej: Calle 123 #45-67, apto 301"
            />
          </div>

          <div className="bg-black/20 border border-white/10 rounded-xl p-3 sm:col-span-2">
            <p className="text-[11px] text-white/60 mb-1">Colonia / Barrio</p>
            <input
              value={colonia}
              onChange={(e) => setColonia(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
              placeholder="Ej: Laureles, Centro, etc."
            />
          </div>
        </div>

        {/* Producto */}
        <div className="mt-4 rounded-xl bg-black/20 border border-white/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">Producto</p>
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
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
              placeholder="Buscar producto..."
            />
            <button
              type="button"
              onClick={() => emitGetProducts(true)}
              className="px-4 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/30 text-sm font-semibold"
            >
              Buscar
            </button>
          </div>

          {prodError && (
            <div className="mt-2 text-xs text-red-300 bg-red-500/10 border border-red-400/20 rounded-lg p-2">
              {prodError}
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-2 max-h-56 overflow-auto custom-scrollbar pr-1">
            {prodLoading ? (
              <div className="text-sm text-white/70">Cargando productos…</div>
            ) : (prodList || []).length === 0 ? (
              <div className="text-sm text-white/70">No hay productos.</div>
            ) : (
              prodList.map((p) => {
                const active = selectedProduct?.id === p?.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => {
                      setSelectedProduct(p);
                      // sugerencia: si viene suggested_price, ponerlo como price
                      const sug =
                        Number(p?.suggested_price) ||
                        Number(p?.sale_price) ||
                        Number(p?.price) ||
                        0;
                      setPrice(sug);
                    }}
                    className={`text-left w-full rounded-xl border p-3 transition ${
                      active
                        ? "bg-emerald-500/15 border-emerald-400/30"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <p className="text-sm font-semibold text-white truncate">
                      {p?.name || "Producto"}
                    </p>
                    <p className="text-xs text-white/60 truncate">
                      SKU: {p?.sku || "—"} • Sugerido:{" "}
                      {p?.suggested_price || p?.sale_price || "—"}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Cantidad / Precio */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-black/20 border border-white/10 rounded-xl p-3">
            <p className="text-[11px] text-white/60 mb-1">Cantidad</p>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
            />
          </div>

          <div className="bg-black/20 border border-white/10 rounded-xl p-3">
            <p className="text-[11px] text-white/60 mb-1">Precio</p>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
            />
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
              Complete: provincia, ciudad, producto, dirección, cantidad y
              precio.
            </div>
          )}
        </div>
      </div>
    );
  }

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
                            setColonia("");
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
                        // estado
                        phone={phone}
                        name={name}
                        setName={setName}
                        surname={surname}
                        setSurname={setSurname}
                        dir={dir}
                        setDir={setDir}
                        colonia={colonia}
                        setColonia={setColonia}
                        // recaudo
                        rateType={rateType}
                        setRateType={setRateType}
                        // departamentos / ciudades
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
                        selectedProduct={selectedProduct}
                        setSelectedProduct={setSelectedProduct}
                        emitGetProducts={emitGetProducts}
                        // qty/price
                        quantity={quantity}
                        setQuantity={setQuantity}
                        price={price}
                        setPrice={setPrice}
                        // acciones
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
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-start gap-3 bg-black/20 rounded-lg p-3 border border-white/10">
                            <i className="bx bx-cube text-xl text-violet-300" />
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

                          <div className="flex items-start gap-3 bg-black/20 rounded-lg p-3 border border-white/10">
                            <i className="bx bx-trip text-xl text-sky-300" />
                            <div className="min-w-0">
                              <p className="text-xs text-white/60">
                                Transportadora
                              </p>
                              <p className="text-sm font-semibold truncate">
                                {getTransportadora(o)}
                              </p>
                              <p className="text-xs text-white/60 truncate">
                                Total: ${money(getTotal(o))}
                              </p>
                            </div>
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
                    <button
                      type="button"
                      onClick={() => handleEditOrder(selectedOrder)}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/30 text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <i className="bx bx-edit" />
                      Editar orden
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenerateGuide(selectedOrder)}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <i className="bx bx-receipt" />
                      Generar guía
                    </button>
                  </div>

                  {/* Datos clave (detalle) */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Producto */}
                    <div className="flex items-start gap-3 bg-black/20 rounded-lg p-3 border border-white/10">
                      <i className="bx bx-cube text-xl text-violet-300" />
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
                        <p className="text-sm font-semibold truncate">
                          {getWarehouseName(selectedOrder)}
                        </p>
                        <p className="text-xs text-white/60 truncate">
                          Dropshipper:{" "}
                          {selectedOrder?.user?.role_user?.name || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Teléfono */}
                    <div className="flex items-start gap-3 bg-black/20 rounded-lg p-3 border border-white/10">
                      <i className="bx bx-phone text-xl text-yellow-300" />
                      <div className="min-w-0">
                        <p className="text-xs text-white/60">Teléfono</p>
                        <p className="text-sm font-semibold truncate">
                          {getPhone(selectedOrder)}
                        </p>
                        <p className="text-xs text-white/60 truncate">
                          Cliente: {selectedOrder?.name || "—"}{" "}
                          {selectedOrder?.surname
                            ? `(${selectedOrder.surname})`
                            : ""}
                        </p>
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
                          Envío: ${money(getShippingAmount(selectedOrder))}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Totales */}
                  <div className="mt-3 flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                    <p className="text-xs text-white/70">Total orden</p>
                    <p className="text-sm font-semibold text-white">
                      ${money(getTotal(selectedOrder))}
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
