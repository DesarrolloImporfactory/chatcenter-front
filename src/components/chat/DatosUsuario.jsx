import axios from "axios";
import React, { useEffect, useState, useCallback } from "react";
import { set, useForm } from "react-hook-form";
import Swal from "sweetalert2";
import "./css/DataUsuarioCss.css";
import chatApi from "../../api/chatcenter";
const DatosUsuario = ({
  opciones,
  animateOut,
  facturasChatSeleccionado,
  socketRef,
  provincias,
  setFacturasChatSeleccionado,
  userData,
  setGuiasChatSeleccionado,
  guiasChatSeleccionado,
  validar_estadoLaar,
  validar_estadoServi,
  validar_estadoGintracom,
  validar_estadoSpeed,
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
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
  const { register, handleSubmit, setValue, getValues } = useForm({
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

  const handleGenerarGuia = async () => {
    const transportadora = getValues("transportadora");

    if (!transportadora) {
      Toast.fire({
        title: "ERROR",
        icon: "error",
        text: "Por favor selecciona una transportadora.",
      });
      return;
    }

    setGenerandoGuia(true);

    const formulario = new FormData();
    formulario.append("procedencia", "1");
    formulario.append("id_pedido", facturaSeleccionada.id_factura || "");
    formulario.append("nombreO", getValues("nombreO") || "");
    formulario.append("ciudadO", getValues("ciudadO") || "");
    formulario.append("direccionO", getValues("direccionO") || "");
    formulario.append("celularO", getValues("celularO") || "");
    formulario.append("referenciaO", getValues("referenciaO") || "");
    formulario.append("nombre", getValues("nombreCliente") || "");
    formulario.append("telefono", getValues("telefono") || "");
    formulario.append("provincia", getValues("provincia") || "");
    formulario.append("ciudad", getValues("ciudad") || "");
    formulario.append("calle_principal", getValues("callePrincipal") || "");
    formulario.append("calle_secundaria", getValues("calleSecundaria") || "");
    formulario.append("referencia", getValues("referencia") || "");
    formulario.append("observacion", getValues("observacion") || "");
    formulario.append("id_producto_venta", idProductoVenta);
    formulario.append(
      "nombre_responsable",
      getValues("nombre_responsable") || ""
    );
    formulario.append("recaudo", getValues("cod_entrega") || "");
    formulario.append(
      "numero_factura",
      facturaSeleccionada.numero_factura || ""
    );
    formulario.append("total_venta", total || 0);
    formulario.append("transportadora", transportadora);
    formulario.append("costo_flete", getValues("precio_envio") || 0);
    formulario.append("provinciaO", getValues("provinciaO") || "");
    formulario.append(
      "url_google_speed_pedido",
      getValues("url_google_speed_pedido") || ""
    );

    if (transportadora === 4) {
      formulario.append(
        "contiene",
        facturaSeleccionada.productos
          .map((p) => `${p.nombre_producto} X${p.cantidad}`)
          .join(" ")
      );
    } else {
      formulario.append(
        "contiene",
        facturaSeleccionada.productos
          .map((p) => `${p.cantidad} x ${p.nombre_producto}`)
          .join(", ")
      );
    }
    if (transportadora === 1) {
      formulario.append("flete", getValues("flete") || 0);
      formulario.append("seguro", getValues("seguro") || 0);
      formulario.append("comision", getValues("comision") || 0);
      formulario.append("otros", getValues("otros") || 0);
      formulario.append("impuestos", getValues("impuestos") || 0);
    }
    formulario.append("id", userData ? userData.data?.id : 0);
    formulario.append("id_plataforma", userData.data?.id_plataforma);

    console.log("transportadora", transportadora);
    try {
      const endpoint =
        transportadora === 1
          ? "https://new.imporsuitpro.com/Guias/generarServientrega"
          : transportadora === 2
          ? "https://new.imporsuitpro.com/Guias/generarLaar"
          : transportadora === 3
          ? "https://new.imporsuitpro.com/Guias/generarSpeed"
          : "https://new.imporsuitpro.com/Guias/generarGintracom";

      const response = await fetch(endpoint, {
        method: "POST",
        body: formulario,
      });

      const data = await response.json();
      if (data.status === "200" || data.status === 200) {
        let guia = "";

        if (transportadora == 1) {
          guia = data.id;
        } else {
          guia = data.guia;
        }

        await enviar_guia_plantilla(guia, formulario);

        setFacturasChatSeleccionado((prevFacturas) =>
          prevFacturas.filter(
            (factura) =>
              factura.numero_factura !== facturaSeleccionada.numero_factura
          )
        );

        // Limpia la factura seleccionada
        setFacturaSeleccionada({});

        Toast.fire({
          title: "Éxito",
          icon: "success",
          text: "La Guía se generó correctamente.",
        });
        recargarPedido();
        setGenerandoGuia(false);
      } else if (data.status === "501" || data.status === 501) {
        Toast.fire({
          title: "ERROR",
          icon: "error",
          text: "Un producto no cuenta con stock y no se puede generar la guia.",
        });
        setGenerandoGuia(false);
      } else {
        setGenerandoGuia(false);
        alert("Error al generar la guía.");
      }
    } catch (error) {
      console.error("Error al generar la guía:", error);
      alert("Error de red al intentar generar la guía.");
    }
  };
  const [generandoGuia, setGenerandoGuia] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState({});
  const [selectedImageId, setSelectedImageId] = useState(null);
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
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
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
      const response = await chatApi.post("/product/agregarProducto", {
        id_factura: facturaSeleccionada.id_factura,
        id_producto: producto.id_producto,
        id_inventario: producto.id_inventario,
        sku: producto.sku,
        cantidad: 1,
        precio: producto.pvp,
      });

      console.log(response.data);

      // Actualizar el estado del componente
      setFacturaSeleccionada((prevState) => ({
        ...prevState,
        productos: [
          ...prevState.productos,
          {
            ...producto,
            cantidad: 1,
            precio_venta: producto.pvp,
            total: producto.pvp * 1,
          },
        ],
      }));

      recargarDatosFactura();
      handleFacturaSeleccionada(facturasChatSeleccionado[0]);
    } catch (error) {
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
      // Solo ejecuta el efecto si opciones es true
      setFacturaSeleccionada({});
      if (facturasChatSeleccionado) {
        if (facturasChatSeleccionado.length === 1) {
          handleFacturaSeleccionada(facturasChatSeleccionado[0]);
        } else if (guiasChatSeleccionado.length === 1) {
          handleGuiaSeleccionada(guiasChatSeleccionado[0]);
        }
      }
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
  const [activeTab, setActiveTab] = useState("pedidos"); // Estado para controlar la pestaña activa

  const toggleAcordeon = () => {
    setIsOpen(!isOpen);
  };

  // Manejo de cambio de cantidad
  const handleCantidadChange = (producto, increment) => {
    setFacturaSeleccionada((prev) => {
      const productosActualizados = prev.productos.map((p) =>
        p.id_detalle === producto.id_detalle
          ? {
              ...p,
              cantidad: p.cantidad + increment,
            }
          : p
      );
      return {
        ...prev,
        productos: productosActualizados,
        monto_factura: prev.monto_factura + producto.precio_venta * increment,
      };
    });
  };

  const handleSetTarifas = () => {
    // actualizar las tarifas
    setTimeout(() => {
      socketRef.current.emit("GET_TARIFAS", {
        ciudad: document.querySelector("#ciudad").value,
        provincia: facturaSeleccionada.provincia,
        id_plataforma: userData.data?.id_plataforma,
        monto_factura:
          Number(document.querySelector("#total")?.textContent) || total,
        recaudo: document.querySelector("#cod_entrega").value,
      });
      socketRef.current.on("DATA_TARIFAS_RESPONSE", (data) => {
        setTarifas(data);
        console.log(tarifas);
      });
      socketRef.current.emit("GET_SERVIENTREGA", {
        ciudadO: document.querySelector("#ciudadO").value,
        ciudadD: document.querySelector("#ciudad").value,
        provinciaD: facturaSeleccionada.provincia,
        monto_factura:
          Number(document.querySelector("#total")?.textContent) || total,
      });
      socketRef.current.on("DATA_SERVIENTREGA_RESPONSE", (data) => {
        console.log(data);
        setValue("precio_envio", data.precio_envio);
        setValue("flete", data.flete);
        setValue("seguro", data.seguro);
        setValue("comision", data.comision);
        setValue("otros", data.otros);
        setValue("impuestos", data.impuestos);
      });
    }, 50);
  };

  // Manejo de cambio de precio
  const handlePrecioChange = (producto, nuevoPrecio) => {
    setFacturaSeleccionada((prev) => {
      const productosActualizados = prev.productos.map((p) =>
        p.id_detalle === producto.id_detalle
          ? { ...p, precio_venta: parseFloat(nuevoPrecio) || 0 }
          : p
      );
      return { ...prev, productos: productosActualizados };
    });
  };

  const handleImageClick = (id) => {
    // Obtener el precio de flete
    const data_flete = document.getElementById("flete_" + id).innerText.trim(); // .trim() para evitar espacios innecesarios

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
      return; // Detener la función aquí para que no seleccione la transportadora
    }

    // Si la tarifa es válida, proceder con la selección
    setSelectedImageId(id);
    setValue("transportadora", id);
    setValue("precio_envio", data_flete);

    if (id == 3) {
      setModal_google_maps(true);
    }
  };

  // Actualización de valores en el servidor
  const handleCambioValores = useCallback(
    async (producto) => {
      const { id_detalle, cantidad, precio_venta } = producto;

      let id_pedido = facturaSeleccionada.id_factura;
      let precio = precio_venta;
      let total = cantidad * precio_venta;
      try {
        const response = await chatApi.post(
          "/detalle_fact_cot/actualizarDetallePedido",
          {
            id_detalle,
            id_pedido,
            cantidad,
            precio,
            total,
          }
        );
        return () => socketRef.current.off("DATA_TARIFAS_RESPONSE");
      } catch (error) {
        console.error("Error updating values:", error);
      }
    },
    [facturaSeleccionada.id_factura]
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
        0
      ) || 0;
    setTotal(nuevoTotal);
  }, [facturaSeleccionada.productos]);

  // Buscar tarifas de envío
  useEffect(() => {
    if (ciudades != null && facturaSeleccionada.productos) {
      handleSetTarifas();
      // buscar productos adicionales
      cargarProductosAdicionales();
      // buscar servi
    }
  }, [ciudades, socketRef, facturaSeleccionada.productos]);

  useEffect(() => {
    if (facturaSeleccionada.productos) {
      facturaSeleccionada.productos.forEach((producto) => {
        handleCambioValores(producto);
      });
      setProductosAdicionales;
    }
  }, [facturaSeleccionada.productos]);

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
        "_blank"
      );
    } else if (guiaSeleccionada.transporte === "LAAR") {
      window.open(
        `https://fenixoper.laarcourier.com/Tracking/Guiacompleta.aspx?guia=${guiaSeleccionada.numero_guia}`,
        "_blank"
      );
    } else if (guiaSeleccionada.transporte === "GINTRACOM") {
      window.open(
        `https://ec.gintracom.site/web/site/tracking?guia=${guiaSeleccionada.numero_guia}`,
        "_blank"
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
          .post("/product/eliminarProducto", {
            id_detalle,
          })
          .then((response) => {
            // Actualizar estado para reflejar el cambio
            setFacturaSeleccionada((prevState) => ({
              ...prevState,
              productos: prevState.productos.filter(
                (producto) => producto.id_detalle !== id
              ),
            }));
            Swal.fire("Eliminado", "El producto ha sido eliminado.", "success");
          })
          .catch((error) => {
            console.error(error);
            Swal.fire(
              "Error",
              "Ocurrió un error al intentar eliminar el producto.",
              "error"
            );
          });
      }
    });
  };

  const obtenerTextoPlantilla = async (templateName) => {
    try {
      const ACCESS_TOKEN = dataAdmin.token;

      const response = await fetch(
        `https://graph.facebook.com/v17.0/${dataAdmin.id_whatsapp}/message_templates`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
          },
        }
      );

      const data = await response.json();

      if (!data.data) {
        console.error("No se encontraron plantillas en la API.");
        return { text: null, language: null };
      }

      // Buscar la plantilla por nombre
      const plantilla = data.data.find((tpl) => tpl.name === templateName);

      if (!plantilla) {
        console.error(
          `No se encontró la plantilla con nombre: ${templateName}`
        );
        return { text: null, language: null };
      }

      // Extraer el texto del body de la plantilla
      const body = plantilla.components.find((comp) => comp.type === "BODY");

      if (!body || !body.text) {
        console.error("La plantilla no tiene un cuerpo de texto.");
        return { text: null, language: null };
      }

      // Extraer el idioma de la plantilla
      const languageCode = plantilla.language || "es"; // Si no tiene, por defecto "es"

      return { text: body.text, language: languageCode };
    } catch (error) {
      console.error("Error al obtener la plantilla:", error);
      return { text: null, language: null };
    }
  };

  const obtener_plantilla = async (id_plataforma) => {
    try {
      const response = await chatApi.post(
        "/configuraciones/obtener_template_transportadora",
        {
          id_plataforma,
        }
      );

      const template = response.data?.data?.template;

      return template || "";
    } catch (error) {
      console.error("Error obteniendo template:", error);
      return "";
    }
  };

  const enviar_guia_plantilla = async (guia, formulario) => {
    try {
      let TEMPLATE_NAME = await obtener_plantilla(
        formulario.get("id_plataforma")
      );

      if (!TEMPLATE_NAME) {
        console.error("No se pudo obtener el nombre de la plantilla.");
        return { success: false, error: "No se encontró la plantilla" };
      }

      // Obtener el texto y el idioma de la plantilla
      const { text: templateText, language: LANGUAGE_CODE } =
        await obtenerTextoPlantilla(TEMPLATE_NAME);

      if (!templateText) {
        console.error("No se pudo obtener el texto de la plantilla.");
        return {
          success: false,
          error: "No se encontró el contenido de la plantilla",
        };
      }

      // Extraer datos del formulario
      let nombreCliente = formulario.get("nombre");
      const numeroDestino = selectedChat.celular_cliente;

      // Datos de autenticación en la API de WhatsApp Cloud
      const ACCESS_TOKEN = dataAdmin.token;
      const PHONE_NUMBER_ID = dataAdmin.id_telefono;

      // Construcción del objeto para guardar en BD
      let ruta_archivo = {
        1: nombreCliente,
        2: guia,
      };

      // Crear el payload para enviar el mensaje de plantilla
      const mensaje = {
        messaging_product: "whatsapp",
        to: numeroDestino,
        type: "template",
        template: {
          name: TEMPLATE_NAME,
          language: { code: LANGUAGE_CODE },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: nombreCliente }, // Variable 1
                { type: "text", text: guia }, // Variable 2
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0", // Primer botón dinámico
              parameters: [{ type: "text", text: guia }],
            },
            {
              type: "button",
              sub_type: "url",
              index: "1", // Segundo botón dinámico
              parameters: [{ type: "text", text: guia }],
            },
          ],
        },
      };

      // Enviar solicitud a la API de WhatsApp
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ACCESS_TOKEN}`,
          },
          body: JSON.stringify(mensaje),
        }
      );

      const data = await response.json();

      // Validar respuesta
      if (data.error) {
        console.error("Error al enviar mensaje:", data.error);
        return { success: false, error: data.error };
      }

      console.log("Mensaje enviado con éxito:", data);

      // Llamar a la función para guardar el mensaje en la BD
      let telefono_configuracion = dataAdmin.telefono;

      let id_recibe = await buscar_id_recibe(
        numeroDestino,
        formulario.get("id_plataforma")
      );

      agregar_mensaje_enviado(
        templateText, // Texto con {{1}}, {{2}} etc.
        "text", // Tipo de mensaje
        JSON.stringify(ruta_archivo), // Guardamos en JSON las variables reales
        numeroDestino,
        dataAdmin.id_telefono,
        id_recibe,
        formulario.get("id_plataforma"),
        telefono_configuracion
      );

      return { success: true, data };
    } catch (error) {
      console.error("Error en enviar_guia_plantilla:", error);
      return { success: false, error };
    }
  };

  const imprimir_guia = () => {
    if (guiaSeleccionada.transporte === "SERVIENTREGA") {
      window.open(
        `https://guias.imporsuitpro.com/Servientrega/guia/${guiaSeleccionada.numero_guia}`,
        "_blank"
      );
    } else if (guiaSeleccionada.transporte === "LAAR") {
      window.open(
        `https://api.laarcourier.com:9727/guias/pdfs/DescargarV2?guia=${guiaSeleccionada.numero_guia}`,
        "_blank"
      );
    } else if (guiaSeleccionada.transporte === "GINTRACOM") {
      window.open(
        `https://guias.imporsuitpro.com/Gintracom/label/${guiaSeleccionada.numero_guia}`,
        "_blank"
      );
    } else if (guiaSeleccionada.transporte === "SPEED") {
      window.open(
        `https://guias.imporsuitpro.com/Speed/descargar/${guiaSeleccionada.numero_guia}`,
        "_blank"
      );
    } else {
      console.error("Transportadora desconocida");
    }
  };

  const anular_guia = async (numero_guia, accion) => {
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
        }
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
      }
    } catch (error) {
      console.error("Error al anular la guía de Laar:", error);
      alert(error.message);
    }
  };

  const recargarPedido = () => {
    socketRef.current.emit("GET_FACTURAS", {
      id_plataforma: userData.data?.id_plataforma,
      telefono: selectedChat.celular_cliente,
    });
  };

  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    cargarProductosAdicionales(1, e.target.value); // Buscar desde la página 1 con el filtro
  };
  return (
    <>
      {opciones && (
        <div
          className={`relative col-span-1 h-[calc(100vh_-_130px)] text-white overflow-y-auto px-4  duration-700 transition-all ${
            animateOut ? "animate-slide-out" : "animate-slide-in"
          }
            ${
              facturaSeleccionada.numero_factura ? "bg-white" : "bg-[#171931]"
            }  
          `}
        >
          {isModalOpen && (
            <div className="h-screen w-full bg-black/40 fixed inset-0 z-10 flex justify-center items-center">
              <div className="bg-white p-5 rounded-lg shadow-md text-black w-[90%] max-w-3xl">
                <h1 className="text-center text-xl font-semibold mb-4 text-gray-700">
                  Productos Adicionales
                </h1>
                <div className="overflow-auto">
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    className="w-full p-2 border rounded"
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                  <table className="w-full table-auto border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600">
                        <th className="p-2">Imagen</th>
                        <th className="p-2">Nombre</th>
                        <th className="p-2">Stock</th>
                        <th className="p-2">Cantidad</th>
                        <th className="p-2">Precio</th>
                        <th className="p-2">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosAdicionales.map((producto) => (
                        <tr
                          key={producto.id_inventario}
                          className="hover:bg-gray-50 transition"
                        >
                          <td className="p-2 text-center">
                            <img
                              src={
                                producto.image_path
                                  ? `https://new.imporsuitpro.com/${producto.image_path}`
                                  : "https://via.placeholder.com/40x40?text=No+Img"
                              }
                              alt={producto.nombre_producto}
                              className="w-12 h-12 object-cover rounded"
                            />
                          </td>
                          <td className="p-2">{producto.nombre_producto}</td>
                          <td className="p-2 text-center">
                            {producto.saldo_stock > 0
                              ? producto.saldo_stock
                              : "Sin Stock"}
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              id={`cantidad_adicional` + producto.id_inventario}
                              className="w-12 px-2 py-1 border rounded text-center text-sm"
                              defaultValue={1}
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="text"
                              className="w-14 px-3 py-1 border rounded text-center text-sm"
                              defaultValue={producto.pvp || 0}
                              onChange={(e) => {
                                producto.pvp = e.target.value;
                              }}
                            />
                          </td>
                          <td className="p-2 text-center">
                            {producto.saldo_stock > 0 ? (
                              <button
                                className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 text-sm transition"
                                onClick={() => agregarProducto(producto)}
                              >
                                Agregar
                              </button>
                            ) : (
                              <button
                                className="bg-red-400 text-white px-3 py-1 rounded-md text-sm"
                                disabled
                              >
                                Sin Stock
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginación con Diseño Mejorado */}
                <div className="flex justify-center items-center mt-4 space-x-2 text-gray-600 text-sm">
                  {/* Botón Anterior */}
                  <button
                    className="px-3 py-1 rounded-md bg-transparent hover:text-blue-500 transition flex items-center"
                    onClick={() => cargarProductosAdicionales(paginaActual - 1)}
                    disabled={paginaActual === 1}
                  >
                    <i className="bx bx-chevron-left text-lg"></i>
                  </button>

                  {/* Primera página */}
                  <button
                    className={`px-3 py-1 rounded-md ${
                      paginaActual === 1
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-200"
                    } transition`}
                    onClick={() => cargarProductosAdicionales(1)}
                  >
                    1
                  </button>

                  {/* ... si hay más de 5 páginas y no estás en las primeras */}
                  {paginaActual > 4 && totalPaginas > 5 && (
                    <span className="px-2">...</span>
                  )}

                  {/* Números de página en grupos de 5 */}
                  {(() => {
                    const pages = [];
                    let startPage = Math.max(2, paginaActual - 2);
                    let endPage = Math.min(totalPaginas - 1, paginaActual + 2);

                    if (paginaActual <= 3) {
                      endPage = Math.min(6, totalPaginas - 1);
                    } else if (paginaActual >= totalPaginas - 2) {
                      startPage = Math.max(2, totalPaginas - 5);
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          className={`px-3 py-1 rounded-md ${
                            paginaActual === i
                              ? "bg-blue-500 text-white"
                              : "hover:bg-gray-200"
                          } transition`}
                          onClick={() => cargarProductosAdicionales(i)}
                        >
                          {i}
                        </button>
                      );
                    }

                    return pages;
                  })()}

                  {/* ... si hay más páginas después */}
                  {paginaActual < totalPaginas - 3 && totalPaginas > 5 && (
                    <span className="px-2">...</span>
                  )}

                  {/* Última página */}
                  {totalPaginas > 1 && (
                    <button
                      className={`px-3 py-1 rounded-md ${
                        paginaActual === totalPaginas
                          ? "bg-blue-500 text-white"
                          : "hover:bg-gray-200"
                      } transition`}
                      onClick={() => cargarProductosAdicionales(totalPaginas)}
                    >
                      {totalPaginas}
                    </button>
                  )}

                  {/* Botón Siguiente */}
                  <button
                    className="px-3 py-1 rounded-md bg-transparent hover:text-blue-500 transition flex items-center"
                    onClick={() => cargarProductosAdicionales(paginaActual + 1)}
                    disabled={paginaActual === totalPaginas}
                  >
                    <i className="bx bx-chevron-right text-lg"></i>
                  </button>
                </div>

                {/* Botón Cerrar */}
                <div className="text-center mt-4">
                  <button
                    className="bg-red-500 text-white px-5 py-2 rounded-md text-sm hover:bg-red-600 transition"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center overflow-y-auto h-full md:h-[750px]">
            <div className="w-full max-w-3xl mx-auto">
              {/* Botón del acordeón */}
              <div
                className="cursor-pointer bg-blue-600 text-white px-6 py-3 flex justify-between items-center rounded-t-lg shadow-md"
                onClick={toggleAcordeon}
              >
                <span className="text-base font-semibold">Ordenes</span>
                <i
                  className={`bx ${
                    isOpen ? "bx-chevron-up" : "bx-chevron-down"
                  } text-xl transition-transform duration-300`}
                ></i>
              </div>

              {/* Contenido del acordeón */}
              <div
                className={`overflow-hidden bg-[#12172e] rounded-b-lg shadow-md transition-all duration-500 ${
                  isOpen ? "max-h-96" : "max-h-0"
                }`}
              >
                {/* Botones para alternar entre "Pedidos" y "Guias" */}
                <div className="flex flex-row py-3 gap-3">
                  <button
                    className={`flex-1 px-6 py-3 ${
                      activeTab === "pedidos"
                        ? "bg-purple-600"
                        : "bg-purple-500 hover:bg-purple-400"
                    } text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-transform transform hover:scale-105`}
                    onClick={() => setActiveTab("pedidos")}
                  >
                    Pedidos
                  </button>
                  <button
                    className={`flex-1 px-6 py-3 ${
                      activeTab === "guias"
                        ? "bg-purple-600"
                        : "bg-purple-500 hover:bg-purple-400"
                    } text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-transform transform hover:scale-105`}
                    onClick={() => setActiveTab("guias")}
                  >
                    Guias
                  </button>
                </div>

                {/* Contenido dinámico de la tabla */}
                <div className="w-full overflow-x-auto overflow-y-auto min-h-12 max-h-80">
                  <table className="table-auto w-full border-collapse border border-gray-700">
                    <thead className="bg-blue-700 text-white">
                      <tr>
                        {activeTab === "pedidos" ? (
                          <>
                            <th className="border px-4 py-2 text-sm">
                              Número Factura
                            </th>
                            <th className="border px-4 py-2 text-sm">
                              Nombre Cliente
                            </th>
                            <th className="border px-4 py-2 text-sm">Acción</th>
                          </>
                        ) : (
                          <>
                            <th className="border px-4 py-2 text-sm">
                              Número Guía
                            </th>
                            <th className="border px-4 py-2 text-sm">Estado</th>
                            <th className="border px-4 py-2 text-sm">Acción</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {activeTab === "pedidos"
                        ? facturasChatSeleccionado?.map((factura, index) => (
                            <tr
                              key={index}
                              className="hover:bg-blue-800 text-white text-sm"
                            >
                              <td className="border px-4 py-2">
                                {factura.numero_factura}
                              </td>
                              <td className="border px-4 py-2">
                                {factura.nombre}
                              </td>
                              <td className="border px-4 py-2">
                                <button
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                                  onClick={() =>
                                    handleFacturaSeleccionada(factura)
                                  }
                                >
                                  Ver
                                </button>
                              </td>
                            </tr>
                          ))
                        : guiasChatSeleccionado?.map((guia, index) => {
                            // Llamar a la función con los parámetros correctos
                            const { color, estado_guia } = obtenerEstadoGuia(
                              guia.transporte, // El sistema (LAAR, SERVIENTREGA, etc.)
                              guia.estado_guia_sistema // El estado numérico
                            );

                            return (
                              <tr
                                key={index}
                                className="hover:bg-blue-800 text-white text-sm"
                              >
                                <td className="border px-4 py-2">
                                  {guia.numero_guia}
                                </td>
                                <td className="border px-4 py-2">
                                  {/* Mostrar el estado dinámico con estilo */}
                                  <span
                                    className={`text-xs sm:text-sm px-2 py-1 rounded-full ${color}`}
                                  >
                                    {estado_guia}
                                  </span>
                                </td>
                                <td className="border px-4 py-2">
                                  <button
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                                    onClick={() => handleGuiaSeleccionada(guia)}
                                  >
                                    Ver
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Sección de detalles de la guía */}
              {guiaSeleccionada && (
                <div className="mt-4 bg-white shadow-md rounded-lg p-6 overflow-y-auto max-h-screen">
                  <div className="relative flex flex-col justify-between items-start mb-4">
                    {/* Botones de Acciones */}
                    <div className="flex flex-col gap-2 absolute right-1 top-1">
                      {/* Botón de Tracking */}
                      <button
                        className="flex items-center gap-2 px-3 py-1 border border-blue-500 text-blue-500 text-xs rounded-md transition-all hover:bg-blue-500 hover:text-white"
                        onClick={tracking_guia}
                      >
                        <i className="bx bx-file-find text-xl"></i>
                      </button>

                      {/* Botón de Ver */}
                      <button
                        className="flex items-center gap-2 px-3 py-1 border border-blue-500 text-blue-500 text-xs rounded-md transition-all hover:bg-blue-500 hover:text-white"
                        onClick={imprimir_guia}
                      >
                        <i className="bx bx-printer text-xl"></i>
                      </button>
                    </div>

                    {/* Información de la Orden */}
                    <h2 className="text-lg font-bold text-gray-700 my-2">
                      Orden: #{guiaSeleccionada.numero_factura}
                    </h2>

                    {/* Estado Dinámico */}
                    {(() => {
                      const { color, estado_guia } = obtenerEstadoGuia(
                        guiaSeleccionada.transporte,
                        guiaSeleccionada.estado_guia_sistema
                      );
                      return (
                        <span
                          className={`text-sm px-2 py-1 rounded-full ${color}`}
                        >
                          {estado_guia}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-500 text-sm">
                      <strong>Fecha de la Guia:</strong>{" "}
                      {new Date(guiaSeleccionada.fecha_guia).toLocaleDateString(
                        "es-EC",
                        {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                        }
                      ) || "Sin Fecha"}
                    </p>
                    <p className="text-gray-500 text-sm">
                      <strong>Transportadora:</strong>{" "}
                      {guiaSeleccionada.transporte || "Sin Transporte"}
                    </p>
                    <p className="text-gray-500 text-sm">
                      <strong>Numero de guia:</strong>{" "}
                      {guiaSeleccionada.numero_guia || "Sin Transporte"}
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-gray-600 font-semibold text-sm">
                      Productos ({guiaSeleccionada.productos?.length || 0})
                    </h3>
                    {guiaSeleccionada.productos?.map((producto, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center text-gray-700 text-sm mt-2"
                      >
                        {/* Cantidad x Nombre del Producto */}
                        <span className="flex-1">
                          {producto.cantidad} x {producto.nombre_producto}
                        </span>

                        {/* Precio */}
                        <span className="font-semibold">
                          ${producto.precio_venta.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-gray-600 font-semibold text-sm">
                      Totales
                    </h3>

                    {/* Subtotal */}
                    <div className="flex justify-between text-gray-700 text-sm mt-2">
                      <span>Precio venta:</span>
                      <span>
                        ${guiaSeleccionada.monto_factura?.toFixed(2) || "0.00"}
                      </span>
                    </div>

                    {/* Costo de Envío */}
                    <div className="flex justify-between text-gray-700 text-sm mt-2">
                      <span>Costo de Envío:</span>
                      <span>
                        ${guiaSeleccionada.costo_flete?.toFixed(2) || "0.00"}
                      </span>
                    </div>

                    {/* Total */}
                    {/* <div className="flex justify-between text-gray-700 text-sm mt-2 font-bold">
                      <span>Total:</span>
                      <span>
                        $
                        {(
                          (guiaSeleccionada.monto_factura || 0) -
                          (guiaSeleccionada.costo_flete || 0)
                        ).toFixed(2)}
                      </span>
                    </div> */}
                  </div>

                  <div className="border-t pt-4 pb-3">
                    <h3 className="text-gray-600 font-semibold text-sm">
                      Dirección
                    </h3>
                    <p className="text-gray-700 text-sm mt-2">
                      {(guiaSeleccionada.c_principal || "") +
                        ", " +
                        (guiaSeleccionada.c_secundaria || "") +
                        ", " +
                        provinciaCiudad.provincia +
                        " - " +
                        provinciaCiudad.ciudad}
                    </p>
                  </div>

                  <div className="flex gap-4">
                    {/* Botón Anular */}
                    <button
                      className={`rounded w-28 h-12 flex items-center justify-center ${
                        disableAanular
                          ? "bg-red-500 text-white"
                          : "bg-gray-400 text-gray-700 cursor-not-allowed"
                      }`}
                      onClick={() =>
                        anular_guia(guiaSeleccionada.numero_guia, "guia")
                      }
                      disabled={!disableAanular} // Si disableAanular es false, se deshabilita
                    >
                      Anular
                    </button>

                    {/* Botón Gestionar Novedad */}
                    {disableGestionar && (
                      <a
                        href="https://new.imporsuitpro.com/pedidos/novedades_2" // Reemplaza con el enlace deseado
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded w-48 h-12 flex items-center justify-center bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                      >
                        Gestionar Novedad
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* botonn generar nuevo pedido */}
            {/* 
            <button
              className="bg-green-500 text-white rounded px-4 py-2 mt-4 md:absolute md:bottom-10 md:left-5"
              onClick={() => {
                window.open(
                  "https://new.imporsuitpro.com/acceso/jwt/" +
                    localStorage.getItem("token") +
                    "/nuevo",
                  "_blank"
                );
              }}
            >
              Nuevo Pedido
            </button> */}
            {facturaSeleccionada.numero_factura && (
              <div className="absolute text-black left-0 bg-white h-full w-full ">
                <div className="flex justify-between items-center p-4">
                  {generandoGuia == true ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                      <div className="bg-white p-6 rounded-lg shadow-lg text-black text-center">
                        <h1 className="text-2xl font-semibold mb-4">
                          Generando Guía
                        </h1>
                        <div className="flex flex-col items-center space-y-4">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                          <span className="text-lg">Espere por favor...</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    ""
                  )}
                  <form
                    className="flex flex-col gap-2 w-full md:grid md:grid-cols-2"
                    onSubmit={handleSubmit(onSubmit)}
                  >
                    {/* hiddens */}
                    <input
                      type="hidden"
                      id="nombreO"
                      {...register("nombreO")}
                    />
                    <input
                      type="hidden"
                      id="provinciaO"
                      {...register("provinciaO")}
                    />
                    <input
                      type="hidden"
                      id="ciudadO"
                      {...register("ciudadO")}
                    />
                    <input
                      type="hidden"
                      id="direccionO"
                      {...register("direccionO")}
                    />
                    <input
                      type="hidden"
                      id="celularO"
                      {...register("celularO")}
                    />
                    <input
                      type="hidden"
                      id="referenciaO"
                      {...register("referenciaO")}
                    />
                    <input
                      type="hidden"
                      id="numero_factura"
                      {...register("numero_factura")}
                    />
                    <input
                      type="hidden"
                      id="precio_envio"
                      {...register("precio_envio")}
                    />
                    <input
                      type="hidden"
                      id="monto_factura"
                      {...register("monto_factura")}
                    />
                    <input type="hidden" id="flete" {...register("flete")} />
                    <input type="hidden" id="seguro" {...register("seguro")} />
                    <input
                      type="hidden"
                      id="comision"
                      {...register("comision")}
                    />
                    <input type="hidden" id="otros" {...register("otros")} />
                    <input
                      type="hidden"
                      id="transportadora"
                      {...register("transportadora")}
                    />
                    <input
                      type="hidden"
                      id="impuestos"
                      {...register("impuestos")}
                    />

                    <div>
                      <label
                        htmlFor="nombreCliente"
                        className="text-sm font-medium"
                      >
                        Nombre Cliente
                      </label>
                      <input
                        type="text"
                        placeholder="Nombre Cliente"
                        {...register("nombreCliente")}
                        className="p-2 border rounded w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="" className="text-sm font-medium">
                        Telefono
                      </label>
                      <input
                        type="text"
                        placeholder="Telefono Cliente"
                        {...register("telefono")}
                        className="p-2 border rounded w-full"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor=""
                        id="provincia"
                        className="text-sm font-medium"
                      >
                        Provincia
                      </label>
                      {provincias && (
                        <select
                          className="p-2 border rounded w-full"
                          {...register("provincia")}
                          onChange={(e) => {
                            const nuevaProvincia = e.target.value;
                            setFacturaSeleccionada((prev) => ({
                              ...prev,
                              provincia: nuevaProvincia,
                              ciudad_cot: "", // Resetear la ciudad cuando cambia la provincia
                            }));
                          }}
                        >
                          <option value="">Seleccione una provincia</option>
                          {provincias.map((provincia, index) => (
                            <option
                              key={index}
                              value={provincia.codigo_provincia}
                            >
                              {provincia.provincia}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label htmlFor="" className="text-sm font-medium">
                        Ciudad
                      </label>
                      {ciudades && (
                        <select
                          id="ciudad"
                          className="p-2 border rounded w-full"
                          {...register("ciudad")}
                          onChange={(e) => {
                            const nuevaCiudad = e.target.value;
                            setFacturaSeleccionada((prev) => ({
                              ...prev,
                              ciudad_cot: nuevaCiudad,
                            }));
                            handleSetTarifas();
                          }}
                        >
                          <option value="">Seleccione una ciudad</option>
                          {ciudades.map((ciudad, index) => (
                            <option key={index} value={ciudad.id_cotizacion}>
                              {ciudad.ciudad}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label htmlFor="" className="text-sm font-medium">
                        Calle principal
                      </label>
                      <input
                        type="text"
                        placeholder="Calle principal"
                        {...register("callePrincipal")}
                        className="p-2 border rounded w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="" className="text-sm font-medium">
                        Calle secundaria
                      </label>
                      <input
                        type="text"
                        placeholder="Calle secundaria"
                        {...register("calleSecundaria")}
                        className="p-2 border rounded w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="" className="text-sm font-medium">
                        Referencia
                      </label>
                      <input
                        type="text"
                        placeholder="Referencia"
                        {...register("referencia")}
                        className="p-2 border rounded w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="" className="text-sm font-medium">
                        Observación
                      </label>
                      <input
                        type="text"
                        placeholder="Observación"
                        {...register("observacion")}
                        className="p-2 border rounded w-full"
                      />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="" className="text-sm font-medium">
                        Nombre responsable
                      </label>
                      <input
                        type="text"
                        placeholder="Nombre responsable (Opcional)"
                        {...register("nombre_responsable")}
                        className="p-2 border rounded w-full"
                      />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="" className="text-sm font-medium">
                        Tipo de Entrega
                      </label>
                      <select
                        name="cod"
                        {...register("cod_entrega")}
                        id="cod_entrega"
                        className="p-2 border rounded w-full"
                      >
                        <option value="1">Con recaudo</option>
                        <option value="2">SIn recaudo</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 justify-center items-center gap-4">
                        {images.map((image) => (
                          <div key={image.id} className="grid justify-center">
                            <img
                              src={image.src}
                              alt={image.alt}
                              className={`w-20 cursor-pointer transform transition duration-300 ${
                                selectedImageId === image.id
                                  ? "filter-none shadow-lg border-2 border-blue-500"
                                  : "filter grayscale"
                              } hover:scale-105 hover:shadow-lg hover:grayscale-0 rounded-t-md`}
                              onClick={() => handleImageClick(image.id)}
                            />
                            {/* Precio de Flete */}
                            <div className="text-center bg-black/90 text-white rounded-b-md">
                              {tarifas ? (
                                <span
                                  className={`text-sm ${
                                    (image.id === 1 &&
                                      tarifas.servientrega > 0) ||
                                    (image.id === 2 && tarifas.laar > 0) ||
                                    (image.id === 3 && tarifas.speed > 0) ||
                                    (image.id === 4 && tarifas.gintracom > 0)
                                      ? "text-green-400"
                                      : "text-red-500"
                                  }`}
                                >
                                  $
                                  <p id={`flete_${image.id}`}>
                                    {image.id === 1
                                      ? tarifas.servientrega
                                      : image.id === 2
                                      ? tarifas.laar
                                      : image.id === 3
                                      ? tarifas.speed
                                      : image.id === 4
                                      ? tarifas.gintracom
                                      : 0}
                                  </p>
                                </span>
                              ) : (
                                <span className="text-sm">0</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Modal Google Maps */}
                      {modal_google_maps && (
                        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                            <h2 className="text-lg font-bold text-gray-800 mb-4">
                              Google Maps Link
                            </h2>
                            <div>
                              {/* Input para el link */}
                              <input
                                type="text"
                                placeholder="Pega el link de Google Maps aquí"
                                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                                {...register("url_google_speed_pedido")}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              {/* Botón Cancelar */}
                              <button
                                onClick={() => setModal_google_maps(false)} // Cierra el modal sin guardar
                                className="px-4 py-2 bg-gray-300 text-black text-sm rounded-md hover:bg-gray-400"
                              >
                                Cancelar
                              </button>
                              {/* Botón Guardar */}
                              <button
                                onClick={() => setModal_google_maps(false)}
                                className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600"
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Acordeon de productos */}
                    <div className="col-span-2 ">
                      <button
                        className="flex justify-between w-full text-left py-3 px-3 bg-[#171931] text-white rounded-t-lg"
                        type="button"
                      >
                        <h3 className="font-medium">Productos</h3>
                        <span>{isAccordionOpen ? "▲" : "▼"}</span>
                      </button>
                      {isAccordionOpen && (
                        <div className="p-1 text-sm border border-gray-200 rounded-b-lg bg-white">
                          {/* Estructura de la tabla */}
                          <div className="overflow-x-auto">
                            <table className="table-auto w-full">
                              <thead>
                                <tr>
                                  <th className="border px-2 py-2 text-xs md:px-4 w-full md:text-sm">
                                    Nombre
                                  </th>
                                  <th className="border px-2 py-2 text-xs md:px-4 md:text-sm">
                                    Cantidad
                                  </th>
                                  <th className="border px-2 py-2 text-xs md:px-4 md:text-sm">
                                    Precio
                                  </th>
                                  <th className="border px-2 py-2 text-xs md:px-4 md:text-sm">
                                    Total
                                  </th>
                                  <th className="border px-2 py-2 text-xs md:px-4 md:text-sm">
                                    Borrar
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {/* Mapeo para las filas de productos */}
                                {facturaSeleccionada.productos?.map(
                                  (producto, index) => (
                                    <tr key={index}>
                                      <td className="border px-2 md:px-4 py-2 text-[0.65rem] w-full md:text-[0.75rem]">
                                        {producto.nombre_producto}
                                      </td>
                                      <td className="border px-1 md:px-4 py-2 text-[0.65rem] md:text-[0.75rem]">
                                        <div className="flex items-center space-x-1">
                                          {/* Input de Cantidad */}
                                          <input
                                            type="number"
                                            value={producto.cantidad}
                                            className="p-1 text-sm border border-gray-200 w-12 text-center text-[0.65rem] md:text-[0.75rem]"
                                            id={`cantidad${producto.id_detalle}`}
                                            onChange={() =>
                                              handleCambioValores(
                                                producto.id_detalle
                                              )
                                            }
                                          />
                                          <div className="grid">
                                            {/* Botón de Incremento */}
                                            <button
                                              type="button"
                                              className="inline-flex justify-center items-center text-sm font-medium bg-gray-50 text-gray-800 hover:bg-gray-100 p-1 rounded-r border border-gray-200"
                                              aria-label="Increase"
                                              onClick={() => {
                                                handleCantidadChange(
                                                  producto,
                                                  1
                                                );
                                                handleSetTarifas();
                                              }}
                                            >
                                              <svg
                                                className="w-4 h-4"
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="24"
                                                height="24"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              >
                                                <path d="M5 12h14"></path>
                                                <path d="M12 5v14"></path>
                                              </svg>
                                            </button>
                                            {/* Botón de Decremento */}
                                            <button
                                              type="button"
                                              className="inline-flex justify-center items-center text-sm font-medium bg-gray-50 text-gray-800 hover:bg-gray-100 p-1 rounded-l border border-gray-200"
                                              aria-label="Decrease"
                                              onClick={() => {
                                                handleCantidadChange(
                                                  producto,
                                                  -1
                                                );
                                                handleSetTarifas();
                                              }}
                                            >
                                              <svg
                                                className="w-4 h-4"
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="24"
                                                height="24"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              >
                                                <path d="M5 12h14"></path>
                                              </svg>
                                            </button>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="border px-1 md:px-4 py-2 text-[0.65rem] md:text-[0.75rem]">
                                        <input
                                          type="text"
                                          value={producto.precio_venta}
                                          className="py-2 px-3 border rounded w-16 text-[0.65rem] md:text-[0.75rem]"
                                          id={`precio${producto.id_detalle}`}
                                          onChange={(e) =>
                                            handlePrecioChange(
                                              producto,
                                              e.target.value
                                            )
                                          }
                                        />
                                      </td>
                                      <td className="border px-1 md:px-4 py-2 text-[0.65rem] md:text-[0.75rem]">
                                        <input
                                          type="text"
                                          value={
                                            producto.precio_venta *
                                            producto.cantidad
                                          }
                                          className="py-2 px-3 border rounded w-16 text-[0.65rem] md:text-[0.75rem]"
                                          readOnly
                                          id={`total${producto.id_detalle}`}
                                        />
                                      </td>
                                      <td className="border px-2 md:px-4 py-2 text-center">
                                        <button
                                          className="bg-red-500 text-white rounded p-1 w-full md:w-auto"
                                          onClick={() =>
                                            eliminar(producto.id_detalle)
                                          }
                                        >
                                          <i className="bx bx-trash"></i>
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Botón para añadir producto */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setIsModalOpen(true);
                            }}
                            className="bg-green-500 text-white text-xs rounded px-4 py-2 mt-2 w-full md:w-auto"
                          >
                            Añadir Producto
                          </button>

                          {/* Nombre bodega */}
                          <div className="flex justify-between mt-3">
                            <p className="text-lg font-semibold">
                              Nombre bodega:
                            </p>
                            <span>{nombreBodega}</span>
                          </div>

                          {/* Total final */}
                          <div className="flex justify-between mt-3">
                            <p className="text-lg font-semibold">
                              Total Final:
                            </p>
                            <span id="total">{total.toFixed(2)}</span>
                            <input
                              type="hidden"
                              id="factura"
                              value={facturaSeleccionada.id_factura}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </form>
                </div>
                <div className="flex gap-3 mx-4">
                  <button
                    className="bg-green-500 text-white rounded w-28 h-12 flex items-center justify-center"
                    onClick={handleGenerarGuia}
                  >
                    Generar Guía
                  </button>
                  <button
                    className="bg-orange-500 text-white rounded w-28 h-12 flex items-center justify-center"
                    onClick={() =>
                      anular_guia(facturaSeleccionada.numero_factura, "pedido")
                    }
                  >
                    Cancelar Pedido
                  </button>
                  <button
                    className="bg-red-500 text-white rounded w-28 h-12 flex items-center justify-center"
                    onClick={() => setFacturaSeleccionada({})}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DatosUsuario;
