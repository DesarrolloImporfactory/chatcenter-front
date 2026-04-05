import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import axios from "axios";
import {
  pickSupplierId,
  pickWarehouseId,
  pickRemitCodDaneFromProduct,
  pickDistributionCompanyFromQuote,
  pickWarehouseCityId,
} from "../utils/orderHelper";

export default function useCreateOrder({
  socketRef,
  id_configuracion,
  phone,
  selectedChat,
  emitGetOrders,
  noProrateFlete = false,
}) {
  // ── panel abierto / step ──
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [step, setStep] = useState(1);

  // ── productos ──
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState(null);
  const [prodList, setProdList] = useState([]);
  const [keywords, setKeywords] = useState("");
  const [startData, setStartData] = useState(0);
  const pageSize = 5;

  // ── carrito ──
  const [productsCart, setProductsCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);

  // ── datos cliente ──
  const [phoneInput, setPhoneInput] = useState(phone || "");
  const [name, setName] = useState(selectedChat?.nombre_cliente || "");
  const [surname, setSurname] = useState(selectedChat?.apellido_cliente || "");
  const [dir, setDir] = useState("");
  const [notes, setNotes] = useState("");

  // sync phone del chat
  useEffect(() => setPhoneInput(phone || ""), [phone]);
  useEffect(() => {
    setName(selectedChat?.nombre_cliente || "");
    setSurname(selectedChat?.apellido_cliente || "");
  }, [selectedChat?.id, selectedChat?.psid]);

  // ── ubicación ──
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [selectedDepartmentName, setSelectedDepartmentName] = useState("");
  const [selectedCityId, setSelectedCityId] = useState(null);
  const [selectedCityName, setSelectedCityName] = useState("");
  const [selectedCityCodDane, setSelectedCityCodDane] = useState("");
  const [remitCodDane, setRemitCodDane] = useState("");

  const [rateType, setRateType] = useState("CON RECAUDO");
  const [countryId] = useState(1);

  // ── transportadoras ──
  const [shippingQuotesLoading, setShippingQuotesLoading] = useState(false);
  const [shippingQuotesError, setShippingQuotesError] = useState(null);
  const [shippingQuotes, setShippingQuotes] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);

  // ── historial del cliente ──
  const [customerHistory, setCustomerHistory] = useState(null);
  const [customerHistoryLoading, setCustomerHistoryLoading] = useState(false);

  // refs para listeners
  const onProdOkRef = useRef(null);
  const onProdErrRef = useRef(null);
  const onStatesOkRef = useRef(null);
  const onStatesErrRef = useRef(null);
  const onCitiesOkRef = useRef(null);
  const onCitiesErrRef = useRef(null);
  const onCreateOkRef = useRef(null);
  const onCreateErrRef = useRef(null);
  const onShipOkRef = useRef(null);
  const onShipErrRef = useRef(null);

  // ── reset completo ──
  const resetCreateOrderState = useCallback(() => {
    setCreateOrderOpen(false);
    setStep(1);
    setProdList([]);
    setProdError(null);
    setProdLoading(false);
    setKeywords("");
    setStartData(0);
    setSelectedProduct(null);
    setProductsCart([]);
    setSelectedDepartmentId(null);
    setSelectedDepartmentName("");
    setSelectedCityId(null);
    setSelectedCityName("");
    setSelectedCityCodDane("");
    setCities([]);
    setStates([]);
    setRateType("CON RECAUDO");
    setRemitCodDane("");
    setShippingQuotes([]);
    setShippingQuotesError(null);
    setShippingQuotesLoading(false);
    setSelectedShipping(null);
    setDir("");
    setNotes("");
    setCustomerHistory(null);
    setCustomerHistoryLoading(false);
  }, []);

  // ── emitters ──
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
        order_type: "desc",
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
      country_id: Number(countryId) || 1,
    });
  }, [socketRef, id_configuracion, countryId]);

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

  const emitCotizaTransportadoras = useCallback(() => {
    const s = socketRef?.current;
    if (!s) return;
    if (!id_configuracion || !selectedCityCodDane || !remitCodDane) return;

    setShippingQuotesLoading(true);
    setShippingQuotesError(null);
    setShippingQuotes([]);
    setSelectedShipping(null);

    const raw0 = productsCart[0]?.__raw || null;

    const fullCityDestino =
      cities.find(
        (c) => String(c.cod_dane || "") === String(selectedCityCodDane),
      ) || null;

    s.emit("GET_DROPI_COTIZA_ENVIO_V2", {
      id_configuracion: Number(id_configuracion),
      EnvioConCobro: rateType === "CON RECAUDO",
      ciudad_destino_cod_dane: String(selectedCityCodDane),
      ciudad_remitente_cod_dane: String(remitCodDane),
      ciudad_destino_full: fullCityDestino,
      warehouse_city_id: pickWarehouseCityId(raw0),
      products: productsCart.map((p) => ({
        id: Number(p.id),
        quantity: Number(p.quantity) || 1,
        type: p.type || "SIMPLE",
      })),
      amount: productsCart.reduce(
        (acc, p) => acc + (Number(p.price) || 0) * (Number(p.quantity) || 1),
        0,
      ),
    });
  }, [
    socketRef,
    id_configuracion,
    selectedCityCodDane,
    remitCodDane,
    rateType,
    productsCart,
    cities,
  ]);

  // ── handlers de selección ──
  const handleSelectDepartment = (e) => {
    const depId = Number(e.target.value) || null;
    setSelectedDepartmentId(depId);

    const dep =
      states.find((x) => Number(x.id) === depId) ||
      states.find((x) => Number(x.department_id) === depId) ||
      null;
    setSelectedDepartmentName(
      dep?.name || dep?.department || dep?.nombre || "",
    );

    setSelectedCityId(null);
    setSelectedCityName("");
    setCities([]);
  };

  const handleSelectCity = (e) => {
    const cityId = Number(e.target.value) || null;
    setSelectedCityId(cityId);

    const c =
      cities.find((x) => Number(x.id) === cityId) ||
      cities.find((x) => Number(x.city_id) === cityId) ||
      null;
    setSelectedCityName(c?.name || c?.city || c?.nombre || "");

    const codDane =
      c?.cod_dane || c?.codDane || c?.code_dane || c?.codigo_dane || "";
    setSelectedCityCodDane(String(codDane || ""));
  };

  // ── carrito ──
  const addProductToCart = (p) => {
    if (!p?.id) return;

    const newSupplierId = pickSupplierId(p);
    const newWarehouseId = pickWarehouseId(p);

    setProductsCart((prev) => {
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
            text: "Dropi no permite crear una orden con productos de distintos proveedores o bodegas.",
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
          price: suggested,
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

  // ── remitCodDane desde primer producto del carrito ──
  useEffect(() => {
    const raw0 = productsCart?.[0]?.__raw || null;
    setRemitCodDane(pickRemitCodDaneFromProduct(raw0));
  }, [productsCart]);

  // ── fingerprint del carrito (detecta cambios de precio, cantidad, productos) ──
  const cartFingerprint = useMemo(() => {
    if (!productsCart.length) return "";
    const ids = productsCart
      .map((p) => p.id)
      .sort()
      .join(",");
    const total = productsCart.reduce(
      (acc, p) => acc + (Number(p.price) || 0) * (Number(p.quantity) || 1),
      0,
    );
    return `${ids}_${total.toFixed(2)}`;
  }, [productsCart]);

  // ── invalidar shipping al cambiar carrito ──
  useEffect(() => {
    if (!cartFingerprint) return;
    setShippingQuotes([]);
    setSelectedShipping(null);
    setShippingQuotesError(null);
  }, [cartFingerprint]);

  // ── helper: quitar código de país ──
  function stripCountryCode(rawPhone) {
    const digits = String(rawPhone || "").replace(/\D/g, "");
    // Ecuador 593 (10 dígitos locales), Guatemala 502 (8 dígitos locales)
    if (digits.startsWith("593") && digits.length >= 12) return digits.slice(3);
    if (digits.startsWith("502") && digits.length >= 11) return digits.slice(3);
    // México 52 (10 dígitos locales), Colombia 57 (10 dígitos locales)
    if (digits.startsWith("57") && digits.length >= 12) return digits.slice(2);
    if (digits.startsWith("52") && digits.length >= 12) return digits.slice(2);
    // Si no matchea ningún patrón, devolver tal cual
    return digits;
  }

  // ── fetch historial del cliente cuando hay teléfono O se abre el panel ──
  useEffect(() => {
    // Solo correr si el panel está abierto
    if (!createOrderOpen) return;

    const raw = String(phoneInput || "").replace(/\D/g, "");
    const clean = stripCountryCode(raw);

    if (clean.length < 7) {
      setCustomerHistory(null);
      return;
    }

    let cancelled = false;
    setCustomerHistoryLoading(true);

    axios
      .get(`https://api-v2.dropi.ec/orders/customers/fingerprint`, {
        params: {
          phone: clean,
          userid: 1,
          productid: 0,
        },
      })
      .then((res) => {
        const data = res?.data?.data;

        if (!cancelled && data) {
          const total = data.total_orders || 0;
          const delivered = data.orders_delivered || 0;
          const canceled = data.orders_returned || 0;
          const rate = data.confiability || 0;

          let risk = "neutral";
          if (rate >= 0.8) risk = "success";
          else if (rate >= 0.5) risk = "warning";
          else risk = "danger";

          setCustomerHistory({
            stats: { total_orders: total, delivered, canceled },
            risk: { color: risk, delivery_rate: rate * 100 },
            raw: data,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setCustomerHistory(null);
      })
      .finally(() => {
        if (!cancelled) setCustomerHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [phoneInput, createOrderOpen]);

  // ── emitCreateOrder ──
  const emitCreateOrder = useCallback(() => {
    const s = socketRef?.current;
    if (!s) return;

    const cleanPhone = String(phoneInput || "").replace(/\D/g, "");
    if (!cleanPhone) {
      Swal.fire({ icon: "warning", title: "Teléfono inválido" });
      return;
    }
    if (!productsCart?.length) {
      Swal.fire({ icon: "warning", title: "Agregue al menos 1 producto" });
      return;
    }

    const distributionCompany =
      pickDistributionCompanyFromQuote(selectedShipping);
    if (!distributionCompany?.id) {
      Swal.fire({ icon: "warning", title: "Seleccione una transportadora" });
      return;
    }

    const rawSubtotal = productsCart.reduce(
      (acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.price) || 0),
      0,
    );

    if (rawSubtotal <= 0) {
      Swal.fire({ icon: "warning", title: "Revise los precios de productos" });
      return;
    }

    const shipping_amount_real =
      Number(selectedShipping?.objects?.precioEnvio) || 0;

    let products;

    if (noProrateFlete) {
      products = productsCart.map((it) => ({
        id: Number(it.id),
        name: String(it.name || ""),
        type: it.type || "SIMPLE",
        variation_id: it.variation_id ?? null,
        variations: Array.isArray(it.variations) ? it.variations : [],
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
        sale_price: it.sale_price ?? null,
        suggested_price: it.suggested_price ?? null,
      }));
    } else {
      products = productsCart.map((it) => {
        const qty = Number(it.quantity) || 1;
        const basePrice = Number(it.price) || 0;
        const lineTotal = qty * basePrice;
        const ratio =
          rawSubtotal > 0 ? lineTotal / rawSubtotal : 1 / productsCart.length;
        const shippingPerUnit = (shipping_amount_real * ratio) / qty;
        const finalPrice =
          Math.round((basePrice + shippingPerUnit) * 100) / 100;

        return {
          id: Number(it.id),
          name: String(it.name || ""),
          type: it.type || "SIMPLE",
          variation_id: it.variation_id ?? null,
          variations: Array.isArray(it.variations) ? it.variations : [],
          quantity: qty,
          price: finalPrice,
          sale_price: it.sale_price ?? null,
          suggested_price: it.suggested_price ?? null,
        };
      });
    }

    const total_order = products.reduce(
      (acc, p) => acc + p.quantity * p.price,
      0,
    );

    s.emit("DROPI_CREATE_ORDER", {
      id_configuracion: Number(id_configuracion),
      type: "FINAL_ORDER",
      type_service: "normal",
      rate_type: String(rateType || "CON RECAUDO"),
      total_order: Math.round(total_order * 100) / 100,
      shipping_amount: 0,
      payment_method_id: 1,
      notes: String(notes || "").trim(),
      name: String(name || "").trim(),
      surname: String(surname || "").trim(),
      phone: cleanPhone,
      client_email: "",
      country: "Ecuador",
      state: String(selectedDepartmentName || ""),
      city: String(selectedCityName || ""),
      dir: String(dir || "").trim(),
      zip_code: null,
      colonia: "",
      dni: "",
      dni_type: "",
      insurance: null,
      shalom_data: null,
      distributionCompany,
      products,
    });
  }, [
    socketRef,
    id_configuracion,
    phoneInput,
    productsCart,
    rateType,
    name,
    surname,
    notes,
    selectedDepartmentName,
    selectedCityName,
    dir,
    selectedShipping,
    noProrateFlete,
  ]);

  // ── recargar cities si cambia rateType ──
  useEffect(() => {
    if (!createOrderOpen || !selectedDepartmentId) return;
    emitGetCities(selectedDepartmentId);
  }, [rateType, createOrderOpen, selectedDepartmentId, emitGetCities]);

  // ── invalidar shipping al cambiar remitente o destino ──
  useEffect(() => {
    setShippingQuotes([]);
    setSelectedShipping(null);
    setShippingQuotesError(null);
  }, [remitCodDane]);

  useEffect(() => {
    setShippingQuotes([]);
    setSelectedShipping(null);
    setShippingQuotesError(null);
  }, [selectedCityCodDane]);

  // ── listeners de socket ──
  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;

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
      s.off("DROPI_CREATE_ORDER_OK", onCreateOkRef.current);
    if (onCreateErrRef.current)
      s.off("DROPI_CREATE_ORDER_ERROR", onCreateErrRef.current);
    if (onShipOkRef.current)
      s.off("DROPI_COTIZA_ENVIO_V2_OK", onShipOkRef.current);
    if (onShipErrRef.current)
      s.off("DROPI_COTIZA_ENVIO_V2_ERROR", onShipErrRef.current);

    const onProdOk = (resp) => {
      setProdLoading(false);
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

    const onCitiesOk = (resp) => {
      setCitiesLoading(false);
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
      emitGetOrders();
    };
    const onCreateErr = (resp) => {
      Swal.fire({
        icon: "error",
        title: "No se pudo crear la orden",
        text: resp?.message || resp?.data?.message || "Error creando orden",
      });
    };

    const onShipOk = (resp) => {
      setShippingQuotesLoading(false);
      const list =
        resp?.data?.objects || resp?.data?.data?.objects || resp?.objects || [];
      const arr = Array.isArray(list) ? list : [];
      setShippingQuotes(arr);
      setSelectedShipping((prev) => {
        if (!prev?.transportadora_id) return null;
        const stillExists = arr.find(
          (x) =>
            Number(x?.transportadora_id) === Number(prev.transportadora_id) &&
            Number(x?.objects?.precioEnvio) > 0,
        );
        return stillExists || null;
      });
    };
    const onShipErr = (resp) => {
      setShippingQuotesLoading(false);
      setShippingQuotesError(
        resp?.message || "Error cotizando transportadoras",
      );
      setShippingQuotes([]);
      setSelectedShipping(null);
    };

    onProdOkRef.current = onProdOk;
    onProdErrRef.current = onProdErr;
    onStatesOkRef.current = onStatesOk;
    onStatesErrRef.current = onStatesErr;
    onCitiesOkRef.current = onCitiesOk;
    onCitiesErrRef.current = onCitiesErr;
    onCreateOkRef.current = onCreateOk;
    onCreateErrRef.current = onCreateErr;
    onShipOkRef.current = onShipOk;
    onShipErrRef.current = onShipErr;

    s.on("DROPI_PRODUCTS_OK", onProdOk);
    s.on("DROPI_PRODUCTS_ERROR", onProdErr);
    s.on("DROPI_STATES_OK", onStatesOk);
    s.on("DROPI_STATES_ERROR", onStatesErr);
    s.on("DROPI_CITIES_OK", onCitiesOk);
    s.on("DROPI_CITIES_ERROR", onCitiesErr);
    s.on("DROPI_CREATE_ORDER_OK", onCreateOk);
    s.on("DROPI_CREATE_ORDER_ERROR", onCreateErr);
    s.on("DROPI_COTIZA_ENVIO_V2_OK", onShipOk);
    s.on("DROPI_COTIZA_ENVIO_V2_ERROR", onShipErr);

    return () => {
      s.off("DROPI_PRODUCTS_OK", onProdOk);
      s.off("DROPI_PRODUCTS_ERROR", onProdErr);
      s.off("DROPI_STATES_OK", onStatesOk);
      s.off("DROPI_STATES_ERROR", onStatesErr);
      s.off("DROPI_CITIES_OK", onCitiesOk);
      s.off("DROPI_CITIES_ERROR", onCitiesErr);
      s.off("DROPI_CREATE_ORDER_OK", onCreateOk);
      s.off("DROPI_CREATE_ORDER_ERROR", onCreateErr);
      s.off("DROPI_COTIZA_ENVIO_V2_OK", onShipOk);
      s.off("DROPI_COTIZA_ENVIO_V2_ERROR", onShipErr);
    };
  }, [socketRef, emitGetOrders]);

  return {
    // panel
    createOrderOpen,
    setCreateOrderOpen,
    step,
    setStep,
    resetCreateOrderState,

    // cliente
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

    // productos
    prodLoading,
    prodError,
    prodList,
    keywords,
    setKeywords,
    emitGetProducts,

    // carrito
    productsCart,
    addProductToCart,
    removeProductFromCart,
    updateCartItem,

    // ubicación
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
    emitGetStates,

    // shipping
    shippingQuotes,
    shippingQuotesLoading,
    shippingQuotesError,
    selectedShipping,
    setSelectedShipping,
    selectedCityCodDane,
    remitCodDane,
    emitCotizaTransportadoras,

    // historial cliente
    customerHistory,
    customerHistoryLoading,

    // submit
    emitCreateOrder,
    noProrateFlete,
  };
}
