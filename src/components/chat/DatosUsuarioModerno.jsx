import axios from "axios";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { set, useForm } from "react-hook-form";
import Swal from "sweetalert2";
import "./css/DataUsuarioCss.css";
import chatApi from "../../api/chatcenter";
import MiniCalendario from "../calendar/MiniCalendario";
import { useNavigate } from "react-router-dom";
import Cotizador from "../cotizador/Cotizador";
import { jwtDecode } from "jwt-decode";
import useNovedadesManager from "../../hooks/useNovedadesManager";
import ChatRightPanel from "./ChatRightPanel";

const PLANES_CALENDARIO = [1, 3, 4];

const DatosUsuarioModerno = ({
  opciones,
  animateOut,
  facturasChatSeleccionado,
  socketRef,
  provincias,
  setFacturasChatSeleccionado,
  userData,
  id_configuracion,
  guiasChatSeleccionado,
  setGuiasChatSeleccionado,
  novedades_gestionadas,
  novedades_noGestionadas,
  guiaSeleccionada,
  setGuiaSeleccionada,
  provinciaCiudad,
  setProvinciaCiudad,
  handleGuiaSeleccionada,
  selectedChat,
  obtenerEstadoGuia,
  disableAanular,
  disableGestionar,
  recargarDatosFactura,
  dataAdmin,
  buscar_id_recibe,
  agregar_mensaje_enviado,
  id_plataforma_conf,
  id_usuario_conf,
  monto_venta,
  setMonto_venta,
  costo,
  setCosto,
  precio_envio_directo,
  setPrecio_envio_directo,
  fulfillment,
  setFulfillment,
  total_directo,
  setTotal_directo,
  validar_generar,
  setValidar_generar,
  selectedImageId,
  setSelectedImageId,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    showModalNovedad,
    novedadSeleccionada,
    tipo_novedad,
    accion,
    datosNovedadExtra,

    handleDetalleNovedad,
    closeModalNovedad,
    handleVolverOfrecer,
    devolverRemitente,
    handleGestionSubmit,

    // LAAR
    tipoLaar,
    setTipoLaar,
    observacionLaar,
    setObservacionLaar,
    solucionLaar,
    setSolucionLaar,
    enviando,
    enviarLaarNovedad,

    // GINTRACOM
    tipoGintra,
    setTipoGintra,
    solucionGintra,
    setSolucionGintra,
    fechaGintra,
    setFechaGintra,
    valorRecaudar,
    setValorRecaudar,
    enviarGintracomNovedad,
    minDate,

    // SERVI
    observacionServi,
    setObservacionServi,
    enviarServiNovedad,
  } = useNovedadesManager({
    id_usuario_conf,
    id_plataforma_conf,
    recargarDatosFactura,
  });

  const [isPriceQuantity, setIsPriceQuantity] = useState(false);

  const [stats, setStats] = useState(null);
  const [nivel, setNivel] = useState(null);

  const [costo_general, setCosto_general] = useState(null);

  /* mostrar cotizaciones */
  const [isCotizacionesOpen, setIsCotizacionesOpen] = useState(false);
  const [loadingCotizaciones, setLoadingCotizaciones] = useState(false);
  const [cotizacionesData, setCotizacionesData] = useState([]);

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  const { register, handleSubmit, setValue, getValues, watch } = useForm({
    defaultValues: {
      nombreCliente: "",
      telefono: "",
      provincia: "",
      ciudad: "",
      callePrincipal: "",
      calleSecundaria: "",
      referencia: "",
      observacion: "",
      nombre_responsable: "",
      cod_entrega: 1,
    },
  });

  const onSubmit = (data) => {
    console.log(data);
  };

  const [generandoGuia, setGenerandoGuia] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState({});
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);
  const [total, setTotal] = useState(0);
  const [ciudades, setCiudades] = useState(null);
  const [tarifas, setTarifas] = useState(null);
  const [productosAdicionales, setProductosAdicionales] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [modal_google_maps, setModal_google_maps] = useState(false);
  const [idProductoVenta, setIdProductoVenta] = useState("");
  const [nombreBodega, setNombreBodega] = useState("");

  const productosPorPagina = 5; // Define cuántos productos mostrar por página
  const images = [
    {
      id: 1,
      src: "https://new.imporsuitpro.com/public/img/SERVIENTREGA.jpg",
      alt: "Imagen 1",
    },
    {
      id: 2,
      src: "https://new.imporsuitpro.com/public/img/LAAR.jpg",
      alt: "Imagen 2",
    },
    {
      id: 3,
      src: "https://new.imporsuitpro.com/public/img/SPEED.jpg",
      alt: "Imagen 3",
    },
    {
      id: 4,
      src: "https://new.imporsuitpro.com/public/img/GINTRACOM.jpg",
      alt: "Imagen 4",
    },
  ];

  const cargarProductosAdicionales = async (pagina = 1, searchTerm = "") => {
    try {
      const id_plataforma_usuario = parseInt(
        localStorage.getItem("id_plataforma_conf"),
        10,
      );

      const response = await axios.post(
        `${import.meta.env.VITE_socket}/api/v1/product/${
          facturaSeleccionada.productos[0].bodega
        }`,
        {
          page: pagina,
          limit: productosPorPagina,
          searchTerm: searchTerm.trim() || null, // Si está vacío, enviamos null
          id_producto: facturaSeleccionada.productos[0].id_producto,
          sku: facturaSeleccionada.productos[0].sku,
          id_plataforma_usuario,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setProductosAdicionales(response.data.products);
      setPaginaActual(response.data.page);
      setTotalPaginas(response.data.totalPages);
    } catch (error) {
      console.error("Error al cargar productos adicionales:", error);
    }
  };

  const agregarProducto = async (producto) => {
    try {
      // ⛔ Evitar duplicados (id_producto + sku)
      const yaExiste = (facturaSeleccionada?.productos || []).some(
        (p) =>
          String(p.id_producto) === String(producto.id_producto) &&
          String(p.sku) === String(producto.sku),
      );

      if (yaExiste) {
        await Swal.fire({
          icon: "info",
          title: "Producto ya agregado",
          text: "Este producto ya se encuentra en el pedido.",
          confirmButtonText: "Entendido",
        });
        return;
      }

      // ✅ Agregar
      const { data, status } = await chatApi.post("/product/agregarProducto", {
        id_factura: facturaSeleccionada.id_factura,
        id_producto: producto.id_producto,
        id_inventario: producto.id_inventario,
        sku: producto.sku,
        cantidad: 1,
        precio: producto.pvp,
      });

      // muchos back devuelven {status: 200, title, message} en data
      const ok =
        status === 200 && (data?.status === 200 || data?.status === "200");

      if (ok) {
        await Swal.fire({
          icon: "success",
          title: data?.title || "Éxito",
          text: data?.message || "Producto agregado correctamente",
          confirmButtonText: "Perfecto",
        });

        // 🧭 Actualiza estados locales
        setFacturaSeleccionada((prev) => ({
          ...prev,
          productos: [
            ...prev.productos,
            {
              id_detalle: data.id_detalle,
              numero_factura: facturaSeleccionada.numero_factura,
              id_factura: facturaSeleccionada.id_factura,
              cantidad: 1,
              precio_venta: producto.pvp,
              nombre_producto: producto.nombre_producto,
              sku: producto.sku,
              id_producto: producto.id_producto,
              id_inventario: producto.id_inventario,
              bodega: producto.bodega,
              envio_prioritario: producto.envio_prioritario,
              pcp: producto.pcp,
            },
          ],
          monto_factura: prev.monto_factura + producto.pvp * 1,
        }));

        setFacturasChatSeleccionado((prevChat) =>
          prevChat.map((factura) =>
            factura.id_factura === facturaSeleccionada.id_factura
              ? {
                  ...factura,
                  productos: [
                    ...factura.productos,
                    {
                      id_detalle: data.id_detalle,
                      numero_factura: facturaSeleccionada.numero_factura,
                      id_factura: facturaSeleccionada.id_factura,
                      cantidad: 1,
                      precio_venta: producto.pvp,
                      nombre_producto: producto.nombre_producto,
                      sku: producto.sku,
                      id_producto: producto.id_producto,
                      id_inventario: producto.id_inventario,
                      bodega: producto.bodega,
                      envio_prioritario: producto.envio_prioritario,
                      pcp: producto.pcp,
                    },
                  ],
                  monto_factura: factura.monto_factura + producto.pvp * 1,
                }
              : factura,
          ),
        );

        setSelectedImageId(null);
        setValidar_generar(false);

        setMonto_venta(null);
        setCosto(null);
        setPrecio_envio_directo(null);
        setFulfillment(null);
        setTotal_directo(null);

        return; // listo
      }

      // ⚠️ Respuesta no OK del backend (pero sin exception)
      await Swal.fire({
        icon: "warning",
        title: data?.title || "Atención",
        text: data?.message || "No se pudo agregar el producto",
        confirmButtonText: "Ok",
      });
    } catch (error) {
      // 🧯 Errores con response (ej: 409 si el back valida duplicado)
      const http = error?.response?.status;
      const msg =
        error?.response?.data?.message || error?.message || "Error desconocido";

      if (http === 409) {
        await Swal.fire({
          icon: "info",
          title: "Producto ya agregado",
          text: "Este producto ya está en el pedido.",
          confirmButtonText: "Entendido",
        });
        return;
      }

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
        confirmButtonText: "Cerrar",
      });

      console.error("Error al agregar el producto:", error);
    }
  };

  useEffect(() => {
    if (facturaSeleccionada.ciudad_cot) {
      setValue("ciudad", facturaSeleccionada.ciudad_cot);
    }
  }, [ciudades]);

  useEffect(() => {
    if (opciones) {
      if (!isPriceQuantity) {
        // Solo ejecuta el efecto si opciones es true
        if (selectedChat.celular_cliente !== facturaSeleccionada.telefono) {
          setFacturaSeleccionada({});
          if (facturasChatSeleccionado) {
            if (facturasChatSeleccionado.length === 1) {
              handleFacturaSeleccionada(facturasChatSeleccionado[0]);
            } else if (guiasChatSeleccionado.length === 1) {
              handleGuiaSeleccionada(guiasChatSeleccionado[0]);
            }
          }
        }
      }
      setIsPriceQuantity(false);
    }
  }, [facturasChatSeleccionado, opciones]);

  // Manejo de selección de factura
  const handleFacturaSeleccionada = useCallback((factura) => {
    setFacturaSeleccionada({
      ...factura,
      provincia: factura.provincia || "",
      ciudad_cot: factura.ciudad_cot || "",
    });

    // Actualiza los valores del formulario
    setValue("nombreCliente", factura.nombre || "");
    setValue("telefono", factura.celular || "");
    setValue("provincia", factura.provincia || "");
    setValue("ciudad", factura.ciudad_cot || "");
    setValue("callePrincipal", factura.c_principal || "");
    setValue("calleSecundaria", factura.c_secundaria || "");
    setValue("referencia", factura.referencia || "");
    setValue("observacion", factura.observacion || "");
    setValue("nombre_responsable", factura.nombre_responsable || "");
    setValue("cod_entrega", factura.cod_entrega || 1);

    setValue("numero_factura", factura.numero_factura || "");
    setValue("precio_envio", factura.precio_envio || 0);
    setValue("monto_factura", factura.monto_factura || 0);
    setValue("flete", factura.flete || 0);
    setValue("seguro", factura.seguro || 0);
    setValue("comision", factura.comision || 0);
    setValue("otros", factura.otros || 0);
    setValue("impuestos", factura.impuestos || 0);
    setValue("nombreO", factura.nombreO || "");
    setValue("ciudadO", factura.ciudadO || "");
    setValue("direccionO", factura.direccionO || "");
    setValue("celularO", factura.telefonoO || "");
    setValue("referenciaO", factura.referenciaO || "");
    setValue("provinciaO", factura.provinciaO || "");
  }, []);

  const [isOpen, setIsOpen] = useState(false); // Estado para controlar si el acordeón está abierto o cerrado
  const [isOpenNovedades, setIsOpenNovedades] = useState(false);
  const [isOpenMiniCal, setIsOpenMiniCal] = useState(false);
  const [activeTab, setActiveTab] = useState("pedidos"); // Estado para controlar la pestaña activa
  const [activeTabNovedad, setActiveTabNovedad] = useState("no_gestionadas");

  const toggleAcordeon = () => {
    setIsOpen(!isOpen);
  };

  const handleCantidadChange = (producto, increment) => {
    setIsPriceQuantity(true);

    const nextQty = Math.max(1, (producto.cantidad || 1) + increment);
    if (nextQty === producto.cantidad) return; // no cambiamos nada si ya está en 1

    // Actualiza facturaSeleccionada
    setFacturaSeleccionada((prev) => {
      if (!prev?.productos) return prev;

      const productosActualizados = prev.productos.map((p) =>
        p.id_detalle === producto.id_detalle ? { ...p, cantidad: nextQty } : p,
      );

      const delta =
        (nextQty - producto.cantidad) * (producto.precio_venta || 0);

      const updated = {
        ...prev,
        productos: productosActualizados,
        monto_factura: prev.monto_factura + delta,
      };

      return updated;
    });

    // Actualiza facturasChatSeleccionado
    setFacturasChatSeleccionado((prevChat) =>
      prevChat.map((factura) =>
        factura.id_factura === facturaSeleccionada.id_factura
          ? {
              ...factura,
              productos: factura.productos.map((p) =>
                p.id_detalle === producto.id_detalle
                  ? { ...p, cantidad: nextQty }
                  : p,
              ),
              monto_factura:
                factura.monto_factura +
                (nextQty - producto.cantidad) * (producto.precio_venta || 0),
            }
          : factura,
      ),
    );

    // Reseteos que ya hacías
    setSelectedImageId(null);
    setValidar_generar(false);
    setMonto_venta(null);
    setCosto(null);
    setPrecio_envio_directo(null);
    setFulfillment(null);
    setTotal_directo(null);

    // Avísale al backend
    handleCambioValores({ ...producto, cantidad: nextQty });
  };

  //handle por si el ususario escribe manualmente en el input de cantidad
  const handleCantidadInputChange = (producto, value) => {
    setIsPriceQuantity(true);

    const parsed = parseInt(value, 10);
    const qty = Math.max(1, isNaN(parsed) ? 1 : parsed);
    if (qty === producto.cantidad) return;

    // Reutilizamos la misma lógica del cambio
    const diff = qty - producto.cantidad;

    setFacturaSeleccionada((prev) => {
      if (!prev?.productos) return prev;

      const productosActualizados = prev.productos.map((p) =>
        p.id_detalle === producto.id_detalle ? { ...p, cantidad: qty } : p,
      );

      return {
        ...prev,
        productos: productosActualizados,
        monto_factura: prev.monto_factura + diff * (producto.precio_venta || 0),
      };
    });

    setFacturasChatSeleccionado((prevChat) =>
      prevChat.map((factura) =>
        factura.id_factura === facturaSeleccionada.id_factura
          ? {
              ...factura,
              productos: factura.productos.map((p) =>
                p.id_detalle === producto.id_detalle
                  ? { ...p, cantidad: qty }
                  : p,
              ),
              monto_factura:
                factura.monto_factura + diff * (producto.precio_venta || 0),
            }
          : factura,
      ),
    );

    setSelectedImageId(null);
    setValidar_generar(false);
    setMonto_venta(null);
    setCosto(null);
    setPrecio_envio_directo(null);
    setFulfillment(null);
    setTotal_directo(null);

    handleCambioValores({ ...producto, cantidad: qty });
  };

  const onTarifasRef = useRef(null);
  const onServiRef = useRef(null);

  const handleSetTarifas = useCallback(() => {
    const s = socketRef.current;
    if (!s) return;

    // limpiar anteriores
    if (onTarifasRef.current)
      s.off("DATA_TARIFAS_RESPONSE", onTarifasRef.current);
    if (onServiRef.current)
      s.off("DATA_SERVIENTREGA_RESPONSE", onServiRef.current);

    const onTarifas = (data) => {
      setTarifas(data);
    };
    const onServi = (data) => {
      setValue("precio_envio", data.precio_envio);
      setValue("flete", data.flete);
      setValue("seguro", data.seguro);
      setValue("comision", data.comision);
      setValue("otros", data.otros);
      setValue("impuestos", data.impuestos);
    };

    onTarifasRef.current = onTarifas;
    onServiRef.current = onServi;

    s.on("DATA_TARIFAS_RESPONSE", onTarifas);
    s.on("DATA_SERVIENTREGA_RESPONSE", onServi);

    s.emit("GET_TARIFAS", {
      ciudad: document.querySelector("#ciudad")?.value,
      provincia: facturaSeleccionada.provincia,
      id_plataforma: id_plataforma_conf,
      monto_factura:
        Number(document.querySelector("#total")?.textContent) || total,
      recaudo: document.querySelector("#cod_entrega")?.value,
    });

    s.emit("GET_SERVIENTREGA", {
      ciudadO: document.querySelector("#ciudadO")?.value,
      ciudadD: document.querySelector("#ciudad")?.value,
      provinciaD: facturaSeleccionada.provincia,
      monto_factura:
        Number(document.querySelector("#total")?.textContent) || total,
    });
  }, [
    socketRef,
    facturaSeleccionada.provincia,
    id_plataforma_conf,
    total,
    setValue,
  ]);

  // Manejo de cambio de precio
  const handlePrecioChange = (producto, nuevoPrecio) => {
    setIsPriceQuantity(true);
    setFacturaSeleccionada((prev) => {
      const productosActualizados = prev.productos.map((p) =>
        p.id_detalle === producto.id_detalle
          ? { ...p, precio_venta: parseFloat(nuevoPrecio) || 0 }
          : p,
      );

      // Actualizamos facturaSeleccionada
      const updatedFacturaSeleccionada = {
        ...prev,
        productos: productosActualizados,
        monto_factura: productosActualizados.reduce(
          (total, producto) =>
            total + producto.precio_venta * producto.cantidad,
          0,
        ),
      };

      setSelectedImageId(null);
      setValidar_generar(false);

      setMonto_venta(null);
      setCosto(null);
      setPrecio_envio_directo(null);
      setFulfillment(null);
      setTotal_directo(null);

      // Ahora, actualizamos facturaChatSeleccionado
      setFacturasChatSeleccionado((prevChat) => {
        const updatedFacturas = prevChat.map((factura) =>
          factura.id_factura === updatedFacturaSeleccionada.id_factura
            ? {
                ...factura,
                productos: productosActualizados,
                monto_factura: updatedFacturaSeleccionada.monto_factura,
              }
            : factura,
        );
        return updatedFacturas;
      });

      return updatedFacturaSeleccionada;
    });
  };

  const calcularGuiaDirecta = async (data_flete) => {
    try {
      const { data } = await chatApi.post("/product/calcularGuiaDirecta", {
        id_producto: facturaSeleccionada?.productos?.[0]?.id_producto,
        total, // ya es tu estado
        tarifa: data_flete,
        costo: costo_general,
        id_plataforma: id_plataforma_conf,
      });

      // ✅ comparar contra número, no string
      if (data?.status === 200) {
        const r = data.data || {};

        // El backend devuelve strings con 2 decimales.
        // Si luego harás cálculos, parsea a número:
        setMonto_venta(parseFloat(r.total ?? 0));
        setCosto(parseFloat(r.costo ?? 0));
        setPrecio_envio_directo(parseFloat(r.tarifa ?? 0));
        setFulfillment(parseFloat(r.full ?? 0));
        setTotal_directo(parseFloat(r.resultante ?? 0));
        setValidar_generar(r.generar > 0);
      } else {
        console.error(
          "Error al calcularGuiaDirecta (status lógico no OK):",
          data,
        );
      }
    } catch (error) {
      console.error("Error al calcularGuiaDirecta (catch):", error);
    }
  };

  const handleImageClick = (id) => {
    // Obtener el precio de flete
    const data_flete = document.getElementById("flete_" + id).innerText.trim();

    // Convertir el precio a número
    const precioEnvio = parseFloat(data_flete.replace("$", "")) || 0;

    // Mostrar alerta y detener la ejecución si la tarifa es 0
    if (precioEnvio === 0) {
      Swal.fire({
        icon: "warning",
        title: "Tarifa no disponible",
        text: "La transportadora seleccionada no tiene una tarifa válida.",
        confirmButtonText: "Aceptar",
      });
      return;
    }

    // Si la tarifa es válida, proceder con la selección
    setSelectedImageId(id);
    setValue("transportadora", id);
    setValue("precio_envio", data_flete);

    calcularGuiaDirecta(data_flete);

    if (id === 3) {
      setModal_google_maps(true);
    }
  };

  const resetSelection = () => {
    // Limpiar la imagen seleccionada
    setSelectedImageId(null);

    // Limpiar los valores del formulario
    setValue("transportadora", "");
    setValue("precio_envio", "");
  };

  // Actualización de valores en el servidor
  const handleCambioValores = useCallback(
    async (producto) => {
      if (!producto) return;

      const { id_detalle, cantidad, precio_venta } = producto;
      if (!id_detalle) return; // guard extra

      const id_pedido = facturaSeleccionada.id_factura;
      const precio = Number(precio_venta);
      const total = Number(cantidad) * Number(precio_venta);

      try {
        const response = await chatApi.post(
          "/detalle_fact_cot/actualizarDetallePedido",
          {
            id_detalle,
            id_pedido,
            cantidad,
            precio,
            total,
          },
        );
        setSelectedImageId(null);
        setValidar_generar(false);

        setMonto_venta(null);
        setCosto(null);
        setPrecio_envio_directo(null);
        setFulfillment(null);
        setTotal_directo(null);
      } catch (error) {
        console.error("Error updating values:", error);
      }
    },
    [facturaSeleccionada.id_factura],
  );

  // Manejo de ciudades por provincia
  useEffect(() => {
    if (facturaSeleccionada.provincia) {
      setCiudades([]);
      if (socketRef.current) {
        socketRef.current.emit("GET_CIUDADES", facturaSeleccionada.provincia);
        socketRef.current.on("DATA_CIUDADES_RESPONSE", setCiudades);

        return () =>
          socketRef.current.off("DATA_CIUDADES_RESPONSE", setCiudades);
      }
    }
  }, [facturaSeleccionada.provincia, socketRef]);

  // Cálculo de total
  useEffect(() => {
    const nuevoTotal =
      facturaSeleccionada.productos?.reduce(
        (acumulado, producto) =>
          acumulado + producto.precio_venta * producto.cantidad,
        0,
      ) || 0;
    setTotal(nuevoTotal);
  }, [facturaSeleccionada.productos]);

  useEffect(() => {
    const costo_general =
      facturaSeleccionada.productos?.reduce(
        (acumulado, producto) =>
          acumulado +
          (Number(producto.pcp) || 0) * (Number(producto.cantidad) || 0),
        0,
      ) || 0;

    setCosto_general(costo_general);
  }, [facturaSeleccionada.productos]);

  useEffect(() => {
    if (
      facturaSeleccionada.productos &&
      facturaSeleccionada.productos.length === 1 &&
      facturaSeleccionada.productos[0].envio_prioritario === 1
    ) {
      setValidar_generar(false);

      Swal.fire({
        icon: "warning",
        title: "¡El producto tiene activado el envío prioritario!",
        text: "Lo sentimos, este producto es logístico y no puede generarse guía si no está con otro producto no logístico.",
        timer: 2500,
        showConfirmButton: false,
      });
    }
  }, [facturaSeleccionada.productos]);

  // Buscar tarifas de envío
  useEffect(() => {
    if (ciudades != null && facturaSeleccionada.productos) {
      handleSetTarifas();
      // buscar servi
    }
  }, [ciudades, socketRef, facturaSeleccionada.productos]);

  useEffect(() => {
    // Buscar producto con envio_prioritario == "0"
    facturaSeleccionada.productos?.forEach((producto) => {
      if (producto.envio_prioritario === "0") {
        setIdProductoVenta(producto.id_producto);
      }
    });

    // Obtener nombre de bodega desde el primer producto
    const obtenerNombre = async () => {
      const bodegaId = facturaSeleccionada.productos?.[0]?.bodega;
      if (bodegaId) {
        const nombre = await nombre_bodega(bodegaId);
        setNombreBodega(nombre);
      }
    };

    obtenerNombre();
  }, [facturaSeleccionada]);

  const nombre_bodega = async (id_bodega) => {
    try {
      const response = await chatApi.post("/bodega/obtener_nombre_bodega", {
        id_bodega,
      });

      if (response.data?.status !== 200) {
        console.warn("No se encontró la bodega");
        return "";
      }

      return response.data.data?.nombre_bodega || "";
    } catch (error) {
      console.error("Error obteniendo nombre de bodega:", error);
      return "";
    }
  };

  const tracking_guia = () => {
    if (guiaSeleccionada.transporte === "SERVIENTREGA") {
      window.open(
        `https://www.servientrega.com.ec/Tracking/?guia=${guiaSeleccionada.numero_guia}&tipo=GUIA`,
        "_blank",
      );
    } else if (guiaSeleccionada.transporte === "LAAR") {
      window.open(
        `https://fenixoper.laarcourier.com/Tracking/Guiacompleta.aspx?guia=${guiaSeleccionada.numero_guia}`,
        "_blank",
      );
    } else if (guiaSeleccionada.transporte === "GINTRACOM") {
      window.open(
        `https://ec.gintracom.site/web/site/tracking?guia=${guiaSeleccionada.numero_guia}`,
        "_blank",
      );
    } else if (guiaSeleccionada.transporte === "SPEED") {
    } else {
      console.error("Transportadora desconocida");
    }
  };

  const eliminar = (id) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "¡No podrás revertir esto!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar",
    }).then((result) => {
      if (result.isConfirmed) {
        let id_detalle = id;
        chatApi
          .post("/product/eliminarProducto", { id_detalle })
          .then((response) => {
            // Eliminar producto de facturaSeleccionada
            setFacturaSeleccionada((prevState) => ({
              ...prevState,
              productos: prevState.productos.filter(
                (producto) => producto.id_detalle !== id,
              ),
            }));

            // Eliminar producto de facturasChatSeleccionado
            setFacturasChatSeleccionado((prevChat) =>
              prevChat.map((factura) =>
                factura.id_factura === facturaSeleccionada.id_factura
                  ? {
                      ...factura,
                      productos: factura.productos.filter(
                        (producto) => producto.id_detalle !== id,
                      ),
                    }
                  : factura,
              ),
            );

            setSelectedImageId(null);
            setValidar_generar(false);

            setMonto_venta(null);
            setCosto(null);
            setPrecio_envio_directo(null);
            setFulfillment(null);
            setTotal_directo(null);

            Swal.fire("Eliminado", "El producto ha sido eliminado.", "success");
          })
          .catch((error) => {
            console.error(error);
            Swal.fire(
              "Error",
              "Ocurrió un error al intentar eliminar el producto.",
              "error",
            );
          });
      }
    });
  };

  const obtener_plantilla = async (id_plataforma) => {
    try {
      const response = await chatApi.post(
        "/configuraciones/obtener_template_transportadora",
        {
          id_plataforma,
        },
      );

      const template = response.data?.data?.template;

      return template || "";
    } catch (error) {
      console.error("Error obteniendo template:", error);
      return "";
    }
  };

  const imprimir_guia = () => {
    if (guiaSeleccionada.transporte === "SERVIENTREGA") {
      window.open(
        `https://guias.imporsuitpro.com/Servientrega/guia/${guiaSeleccionada.numero_guia}`,
        "_blank",
      );
    } else if (guiaSeleccionada.transporte === "LAAR") {
      window.open(
        `https://api.laarcourier.com:9727/guias/pdfs/DescargarV2?guia=${guiaSeleccionada.numero_guia}`,
        "_blank",
      );
    } else if (guiaSeleccionada.transporte === "GINTRACOM") {
      window.open(
        `https://guias.imporsuitpro.com/Gintracom/label/${guiaSeleccionada.numero_guia}`,
        "_blank",
      );
    } else if (guiaSeleccionada.transporte === "SPEED") {
      window.open(
        `https://guias.imporsuitpro.com/Speed/descargar/${guiaSeleccionada.numero_guia}`,
        "_blank",
      );
    } else {
      console.error("Transportadora desconocida");
    }
  };

  const anular_guia = async (numero_guia, transportadora, accion) => {
    const formData = new FormData();
    if (accion == "guia") {
      formData.append("guia", numero_guia);
    } else if (accion == "pedido") {
      formData.append("guia", "MANUAL");
      formData.append("numero_factura", numero_guia);
    }

    try {
      const response = await fetch(
        `https://new.imporsuitpro.com/api/anularGuias`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (data.status === 500) {
        Toast.fire({
          title: "ERROR",
          icon: "error",
          text: "Error al anular guia.",
        });
      } else if (data.status === 200) {
        Toast.fire({
          title: "Éxito",
          icon: "success",
          text: "La Guía se anulo correctamente.",
        });
        setFacturaSeleccionada({});
        recargarPedido();
        setGuiaSeleccionada(false);

        let estado = 0;
        if (transportadora == "SERVIENTREGA") {
          estado = 101;
        } else if (transportadora == "LAAR") {
          estado = 8;
        } else if (transportadora == "GINTRACOM") {
          estado = 12;
        } else if (transportadora == "SPEED") {
          estado = 8;
        }

        // Cambiar el estado de `estado_guia_sistema`
        setGuiasChatSeleccionado((prevState) =>
          prevState.map((guia) =>
            guia.numero_guia === numero_guia
              ? { ...guia, estado_guia_sistema: estado }
              : guia,
          ),
        );
      }
    } catch (error) {
      console.error("Error al anular la guía de Laar:", error);
      alert(error.message);
    }
  };

  const recargarPedido = () => {
    socketRef.current.emit("GET_FACTURAS", {
      id_plataforma: id_plataforma_conf,
      telefono: selectedChat.celular_cliente,
    });
  };

  const [searchTerm, setSearchTerm] = useState("");

  const [mostrarAlerta, setMostrarAlerta] = useState(false);

  const telefono = watch("telefono");

  useEffect(() => {
    const clean = telefono?.replace(/\D/g, "");
    if (!clean || clean.length < 8) {
      // espera al menos 8 dígitos
      setStats(null); // ocultar tarjeta
      return;
    }

    // llamada al backend
    chatApi
      .post("/facturas_cot/info-cliente", {
        telefono: clean,
        id_plataforma: id_plataforma_conf,
      })
      .then(({ data }) => {
        if (data.status !== 200) throw new Error("Error de servidor");
        setStats(data.stats);
        setNivel(data.nivel);
      })
      .catch((err) => {
        console.error("Historial:", err.message);
        setStats(null);
      });
  }, [telefono]);

  function TarjetaHistorial({ stats, nivel }) {
    if (!stats || !nivel) return null;

    /* ─── helpers ───────────────────────────────────────── */
    const n = (k) => Number(stats?.[k] ?? 0);
    const ok = n("entregas");
    const ko = n("devoluciones");
    const tot = ok + ko;

    /* pluralizador rápido ------------------------------- */
    const pl = (num, base, suf = "s") => `${base}${num === 1 ? "" : suf}`;

    /* tipo de cliente ----------------------------------- */
    const buyer =
      n("ordenes_imporsuit") >= 4
        ? "Comprador frecuente"
        : n("ordenes_imporsuit") >= 1
          ? "Comprador ocasional"
          : "Nuevo";

    /* colores para marco / texto / icono (según riesgo) -- */
    const theme = {
      success: {
        ring: "ring-green-500",
        text: "text-green-500",
        icon: "bx-check-circle",
      },
      warning: {
        ring: "ring-amber-400",
        text: "text-amber-500",
        icon: "bx-error",
      },
      danger: {
        ring: "ring-red-500",
        text: "text-red-500",
        icon: "bx-x-circle",
      },
    }[nivel.color];

    /* tips ---------------------------------------------- */
    const tips = {
      success: [
        "Excelente historial.",
        "Despachar con confianza.",
        "Seguimiento normal.",
      ],
      warning: [
        "Buena probabilidad, vigile factores.",
        "Confirme los datos antes de enviar.",
        "Monitoree la entrega.",
      ],
      danger: [
        "Historial conflictivo.",
        "Considere pago anticipado.",
        "Verifique datos antes de despachar.",
      ],
    }[nivel.color];

    /* % barras ------------------------------------------ */
    const pctOk = tot ? (ok / tot) * 100 : 0;
    const pctKo = tot ? (ko / tot) * 100 : 0;

    return (
      <div id="card_historial" className="mt-3">
        <div
          className={`card bg-white shadow-sm ring-2 rounded-md ${theme.ring}`}
        >
          <div className="card-body p-4">
            {/* etiqueta comprador */}
            <span className="inline-block text-xs font-semibold text-gray-500 border border-gray-300 rounded-full px-2 py-[2px] mb-2">
              {buyer}
            </span>

            {/* título + icono */}
            <h6
              className={`flex items-center gap-1 font-semibold mb-2 ${theme.text}`}
            >
              <i className={`bx ${theme.icon} text-base`}></i>
              Probabilidad de entrega
            </h6>

            {/* tips */}
            <ul className="list-disc pl-5 text-xs text-gray-600 space-y-1 mb-3">
              {tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>

            <p className="text-xs text-gray-700 font-medium leading-5 mb-2">
              En tu tienda: {n("ordenes_tienda")}{" "}
              {pl(n("ordenes_tienda"), "ordén", "es")}
              <br />
              En Imporsuit:&nbsp;
              {n("ordenes_imporsuit")}{" "}
              {pl(n("ordenes_imporsuit"), "ordén", "es")} |{ok}{" "}
              {pl(ok, "entrega")} |{ko} {pl(ko, "devolución", "es")}
            </p>

            {/* barra progreso */}
            <div className="w-full h-1.5 bg-gray-200 rounded overflow-hidden flex">
              {/* entregas: SIEMPRE verde */}
              <div
                style={{ flexBasis: `${pctOk}%` }}
                className="bg-green-500 h-full shrink-0 transition-all duration-300"
              ></div>

              {/* devoluciones: SIEMPRE rojo */}
              <div
                style={{ flexBasis: `${pctKo}%` }}
                className="bg-red-500/80 h-full shrink-0 transition-all duration-300"
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function MetricCard({
    title,
    idHtml,
    value,
    color = "",
    ring,
    gradient = false,
    big = false,
  }) {
    return (
      <div
        className={[
          "w-24 shrink-0 rounded-lg border p-3 hover:shadow transition",
          gradient ? "bg-gradient-to-b from-amber-50 to-white" : "bg-white",
          ring ? `ring-1 ${ring}` : "",
        ].join(" ")}
      >
        <p className="text-xs text-gray-500">{title}</p>
        <div
          className={[
            "mt-1 font-semibold",
            color,
            big ? "text-xl" : "text-lg",
          ].join(" ")}
        >
          {/* El número JAMÁS se sale: hace scroll dentro de su cajita si es muy largo */}
          <span
            id={idHtml}
            className="block max-w-full overflow-x-auto whitespace-nowrap font-mono tabular-nums"
            style={{ scrollbarWidth: "thin" }}
          >
            {value ?? "—"}
          </span>
        </div>
      </div>
    );
  }

  const [canAccessCalendar, setCanAccessCalendar] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return setCanAccessCalendar(false);
      const payload = JSON.parse(atob(token.split(".")[1]));
      const planId = Number(payload?.id_plan);
      setCanAccessCalendar(PLANES_CALENDARIO.includes(planId));
    } catch {
      setCanAccessCalendar(false);
    }
  }, []);

  const handleToggleCalendar = () => {
    if (canAccessCalendar === false) {
      Swal.fire({
        icon: "info",
        title: "Sección bloqueada",
        html: "Su plan actual no incluye <b>Calendario</b>.",
        confirmButtonText: "Ver planes",
        showCancelButton: true,
        cancelButtonText: "Cerrar",
        allowOutsideClick: false,
      }).then((r) => {
        if (r.isConfirmed) navigate("/Miplan");
      });
      return;
    }
    setIsOpenMiniCal((prev) => !prev);
    setIsOpen(false);
    setIsOpenNovedades(false);
  };

  const handleToggleCotizaciones = async () => {
    if (isCotizacionesOpen) {
      setIsCotizacionesOpen(false);
    } else {
      setIsCotizacionesOpen(true);
      setIsOpen(false);
      setIsOpenNovedades(false);
      setIsOpenMiniCal(false);

      // Realizar la consulta para obtener cotizaciones
      setLoadingCotizaciones(true);
      try {
        const response = await chatApi.get(
          `/cotizaciones/${selectedChat?.id || selectedChat?.psid}`,
        );
        setCotizacionesData(response.data || []);
      } catch (error) {
        console.error("Error al cargar cotizaciones:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar las cotizaciones",
          timer: 2000,
          showConfirmButton: false,
        });
        setCotizacionesData([]);
      } finally {
        setLoadingCotizaciones(false);
      }
    }
  };

  const DEFAULT_AVATAR =
    "https://imp-datas.s3.amazonaws.com/images/2026-01-05T17-03-19-944Z-user.png";

  const token = localStorage.getItem("token");
  let decodedToken = null;

  const decoded = jwtDecode(token);
  decodedToken = decoded;
  const activar_cotizacion = decodedToken?.activar_cotizacion || 0;
  return (
    <>
      {opciones && (
        <div
          className={`relative col-span-1 h-[calc(100vh_-_130px)] overflow-y-auto custom-scrollbar text-white px-4 duration-700 transition-all ${
            animateOut ? "animate-slide-out" : "animate-slide-in"
          } ${facturaSeleccionada?.numero_factura ? "bg-white" : "bg-[#171931]"}`}
        >
          <ChatRightPanel
            // ====== Flags / UI ======
            opciones={opciones}
            animateOut={animateOut}
            activar_cotizacion={activar_cotizacion}
            // ====== Identidad / selección ======
            selectedChat={selectedChat}
            id_plataforma_conf={id_plataforma_conf}
            id_usuario_conf={id_usuario_conf}
            id_configuracion={id_configuracion}
            // ====== Socket / data base ======
            socketRef={socketRef}
            provincias={provincias}
            ciudades={ciudades}
            setCiudades={setCiudades}
            // ====== Listas (órdenes / guías / novedades) ======
            facturasChatSeleccionado={facturasChatSeleccionado}
            setFacturasChatSeleccionado={setFacturasChatSeleccionado}
            guiasChatSeleccionado={guiasChatSeleccionado}
            setGuiasChatSeleccionado={setGuiasChatSeleccionado}
            novedades_gestionadas={novedades_gestionadas}
            novedades_noGestionadas={novedades_noGestionadas}
            // ====== Acordeones / tabs ======
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            isOpenNovedades={isOpenNovedades}
            setIsOpenNovedades={setIsOpenNovedades}
            isOpenMiniCal={isOpenMiniCal}
            setIsOpenMiniCal={setIsOpenMiniCal}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activeTabNovedad={activeTabNovedad}
            setActiveTabNovedad={setActiveTabNovedad}
            // ====== Cotizaciones ======
            Cotizador={Cotizador}
            isCotizacionesOpen={isCotizacionesOpen}
            setIsCotizacionesOpen={setIsCotizacionesOpen}
            loadingCotizaciones={loadingCotizaciones}
            cotizacionesData={cotizacionesData}
            handleToggleCotizaciones={handleToggleCotizaciones}
            // ====== Calendario ======
            canAccessCalendar={canAccessCalendar}
            handleToggleCalendar={handleToggleCalendar}
            MiniCalendario={MiniCalendario}
            // ====== Factura/Guía seleccionada ======
            facturaSeleccionada={facturaSeleccionada}
            setFacturaSeleccionada={setFacturaSeleccionada}
            guiaSeleccionada={guiaSeleccionada}
            setGuiaSeleccionada={setGuiaSeleccionada}
            provinciaCiudad={provinciaCiudad}
            setProvinciaCiudad={setProvinciaCiudad}
            // ====== Acciones (selección/ver) ======
            handleFacturaSeleccionada={handleFacturaSeleccionada}
            handleGuiaSeleccionada={handleGuiaSeleccionada}
            obtenerEstadoGuia={obtenerEstadoGuia}
            // ====== Tracking/Impresión/Anulación ======
            tracking_guia={tracking_guia}
            imprimir_guia={imprimir_guia}
            anular_guia={anular_guia}
            disableAanular={disableAanular}
            disableGestionar={disableGestionar}
            // ====== Form (react-hook-form) ======
            register={register}
            handleSubmit={handleSubmit}
            setValue={setValue}
            getValues={getValues}
            watch={watch}
            onSubmit={onSubmit}
            // ====== Productos / tabla ======
            isAccordionOpen={isAccordionOpen}
            setIsAccordionOpen={setIsAccordionOpen}
            total={total}
            setTotal={setTotal}
            eliminar={eliminar}
            handleCantidadChange={handleCantidadChange}
            handleCantidadInputChange={handleCantidadInputChange}
            handlePrecioChange={handlePrecioChange}
            // ====== Tarifas / transportadoras ======
            images={images}
            tarifas={tarifas}
            selectedImageId={selectedImageId}
            setSelectedImageId={setSelectedImageId}
            handleImageClick={handleImageClick}
            modal_google_maps={modal_google_maps}
            setModal_google_maps={setModal_google_maps}
            handleSetTarifas={handleSetTarifas}
            // ====== Resumen / métricas ======
            monto_venta={monto_venta}
            setMonto_venta={setMonto_venta}
            costo={costo}
            setCosto={setCosto}
            precio_envio_directo={precio_envio_directo}
            setPrecio_envio_directo={setPrecio_envio_directo}
            fulfillment={fulfillment}
            setFulfillment={setFulfillment}
            total_directo={total_directo}
            setTotal_directo={setTotal_directo}
            validar_generar={validar_generar}
            setValidar_generar={setValidar_generar}
            // ====== Historial / scoring ======
            stats={stats}
            nivel={nivel}
            mostrarAlerta={mostrarAlerta}
            setMostrarAlerta={setMostrarAlerta}
            TarjetaHistorial={TarjetaHistorial}
            MetricCard={MetricCard}
            // ====== Generación de guía / loading ======
            generandoGuia={generandoGuia}
            setGenerandoGuia={setGenerandoGuia}
            // ====== Novedades manager (hook) ======
            showModalNovedad={showModalNovedad}
            novedadSeleccionada={novedadSeleccionada}
            tipo_novedad={tipo_novedad}
            accion={accion}
            datosNovedadExtra={datosNovedadExtra}
            handleDetalleNovedad={handleDetalleNovedad}
            closeModalNovedad={closeModalNovedad}
            handleVolverOfrecer={handleVolverOfrecer}
            devolverRemitente={devolverRemitente}
            handleGestionSubmit={handleGestionSubmit}
            tipoLaar={tipoLaar}
            setTipoLaar={setTipoLaar}
            observacionLaar={observacionLaar}
            setObservacionLaar={setObservacionLaar}
            solucionLaar={solucionLaar}
            setSolucionLaar={setSolucionLaar}
            enviando={enviando}
            enviarLaarNovedad={enviarLaarNovedad}
            tipoGintra={tipoGintra}
            setTipoGintra={setTipoGintra}
            solucionGintra={solucionGintra}
            setSolucionGintra={setSolucionGintra}
            fechaGintra={fechaGintra}
            setFechaGintra={setFechaGintra}
            valorRecaudar={valorRecaudar}
            setValorRecaudar={setValorRecaudar}
            enviarGintracomNovedad={enviarGintracomNovedad}
            minDate={minDate}
            observacionServi={observacionServi}
            setObservacionServi={setObservacionServi}
            enviarServiNovedad={enviarServiNovedad}
            // ====== Otros ======
            nombreBodega={nombreBodega}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            cargarProductosAdicionales={cargarProductosAdicionales}
            productosAdicionales={productosAdicionales}
            agregarProducto={agregarProducto}
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            Swal={Swal}
            DEFAULT_AVATAR={DEFAULT_AVATAR}
          />
        </div>
      )}
    </>
  );
};

export default DatosUsuarioModerno;
