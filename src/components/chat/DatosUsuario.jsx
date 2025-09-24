import axios from "axios";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { set, useForm } from "react-hook-form";
import Swal from "sweetalert2";
import "./css/DataUsuarioCss.css";
import chatApi from "../../api/chatcenter";
import MiniCalendario from "../calendar/MiniCalendario";
import { useNavigate } from "react-router-dom";

const PLANES_CALENDARIO = [1, 3, 4];

const DatosUsuario = ({
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

  const [showModalNovedad, setShowModalNovedad] = useState(false);
  const [novedadSeleccionada, setNovedadSeleccionada] = useState(null);
  const [gestionando, setGestionando] = useState(false);
  const [accion, setAccion] = useState(null);
  const [datosNovedadExtra, setDatosNovedadExtra] = useState(null);
  const [tipo_novedad, setTipo_novedad] = useState(null);
  const [isPriceQuantity, setIsPriceQuantity] = useState(false);

  const [stats, setStats] = useState(null);
  const [nivel, setNivel] = useState(null);

  const [costo_general, setCosto_general] = useState(null);

  /* Laar */
  const [tipoLaar, setTipoLaar] = useState("");
  const [observacionLaar, setObservacionLaar] = useState("");
  const [solucionLaar, setSolucionLaar] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviarLaarNovedad = async () => {
    try {
      setEnviando(true);

      // Obtener valores directamente del DOM (solo si no estás usando useState para ellos)
      const nombre =
        document.getElementById("nombre_novedadesServi")?.value || "";
      const telefono =
        document.getElementById("telefono_novedadesServi")?.value || "";

      const callePrincipal_novedadesServi =
        document.getElementById("callePrincipal_novedadesServi")?.value || "";

      const calleSecundaria_novedadesServi =
        document.getElementById("calleSecundaria_novedadesServi")?.value || "";

      const formData = new FormData();
      formData.append("guia", novedadSeleccionada.guia_novedad);
      formData.append("id_novedad", novedadSeleccionada.id_novedad);
      formData.append("ciudad", datosNovedadExtra?.factura?.[0]?.ciudad);
      formData.append("nombre", nombre);
      formData.append("callePrincipal", callePrincipal_novedadesServi || "");
      formData.append("calleSecundaria", calleSecundaria_novedadesServi || "");
      formData.append("numeracion", "00");
      formData.append(
        "referencia",
        datosNovedadExtra?.factura?.[0]?.referencia
      );
      formData.append("telefono", telefono);
      formData.append("celular", datosNovedadExtra.factura[0].telefono);
      formData.append("observacion", observacionLaar || "");
      formData.append("observacionA", solucionLaar || "");
      formData.append("id", id_usuario_conf ? id_usuario_conf : 0); // id_usuario de la talba users de imporsuit
      formData.append("id_plataforma", id_plataforma_conf);

      const res = await fetch(
        `https://new.imporsuitpro.com/novedades/solventarNovedadLaar`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Novedad enviada CORRECTAMENTE",
          timer: 2000,
          showConfirmButton: false,
        });
        setShowModalNovedad(false);

        recargarDatosFactura();
      } else {
        throw new Error(data.message || "Error en envío LAAR");
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message,
      });
    } finally {
      setEnviando(false);
    }
  };

  /* Laar */

  /* gintracom */
  const [tipoGintra, setTipoGintra] = useState("");
  const [solucionGintra, setSolucionGintra] = useState("");
  const [fechaGintra, setFechaGintra] = useState("");
  const [valorRecaudar, setValorRecaudar] = useState("");

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const enviarGintracomNovedad = async () => {
    if (tipoGintra !== "rechazar" && !fechaGintra) {
      Swal.fire({
        icon: "warning",
        title: "Fecha requerida",
        text: "Por favor, selecciona una fecha válida.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("guia", novedadSeleccionada.guia_novedad);
    formData.append("observacion", solucionGintra || "");
    formData.append("id_novedad", novedadSeleccionada.id_novedad);
    formData.append("tipo", tipoGintra);
    formData.append("recaudo", tipoGintra === "recaudo" ? valorRecaudar : "");
    formData.append("fecha", tipoGintra !== "rechazar" ? fechaGintra : "");
    formData.append("guia", novedadSeleccionada.guia_novedad);
    formData.append("id", id_usuario_conf ? id_usuario_conf : 0);
    formData.append("id_plataforma", id_plataforma_conf);

    try {
      const response = await fetch(
        "https://new.imporsuitpro.com/novedades/solventarNovedadGintracom",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.error === false) {
        Swal.fire({
          icon: "success",
          title: "Éxito",
          text: data.message || "Novedad solventada correctamente",
        });
        setShowModalNovedad(false);
        setAccion(null);
        recargarDatosFactura();
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Hubo un error al solventar la novedad",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrió un error inesperado al enviar la solicitud.",
      });
    }
  };

  /* fin gintracom */

  /* speed */
  const [observacionSpeed, setObservacionSpeed] = useState("");
  /* fin speed */

  /* servientrega */
  const [observacionServi, setObservacionServi] = useState("");

  const enviarServiNovedad = async () => {
    try {
      const formData = new FormData();
      formData.append("guia", novedadSeleccionada?.guia_novedad);
      formData.append("observacion", observacionServi);
      formData.append("id_novedad", novedadSeleccionada?.id_novedad);
      formData.append("id", id_usuario_conf ? id_usuario_conf : 0);
      formData.append("id_plataforma", id_plataforma_conf);

      const res = await fetch(
        "https://new.imporsuitpro.com/novedades/solventarNovedadServientrega",
        {
          method: "POST",
          body: formData,
        }
      );

      if (res.ok) {
        Swal.fire({
          title: "Éxito",
          text: "Novedad enviada correctamente.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        setShowModalNovedad(false); // cerrar modal
        setObservacionServi(""); // limpiar campo si deseas
        recargarDatosFactura();
      } else {
        throw new Error("Fallo al enviar la novedad");
      }
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error.message || "Error al enviar la novedad",
        icon: "error",
      });
    }
  };

  /* fin servientrega */

  const handleDetalleNovedad = (novedad, tipo) => {
    setTipo_novedad(tipo);
    setNovedadSeleccionada(novedad);
    setGestionando(false);
    setShowModalNovedad(true);
  };

  const devolverRemitente = async () => {
    try {
      const res = await fetch(
        `https://new.imporsuitpro.com/Pedidos/devolver_novedad/${novedadSeleccionada.guia_novedad}`,
        {
          method: "POST",
        }
      );

      const data = await res.json();

      if (data.status === 200) {
        Swal.fire({
          title: "Pedido devuelto",
          text: "El pedido ha sido devuelto correctamente al remitente.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        // Cierra modal o refresca si aplica
        setShowModalNovedad(false);
        recargarDatosFactura();
      } else {
        throw new Error(data.message || "Error al devolver");
      }
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Hubo un problema al devolver el pedido.",
        icon: "error",
      });
    }
  };

  const handleGestionSubmit = (e) => {
    e.preventDefault();

    // Aquí podrías enviar una solicitud al backend más adelante
    Swal.fire({
      title: "Éxito",
      text: "La novedad ha sido gestionada como 'Volver a ofrecer'.",
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
    });

    // Cerrar modal y resetear estados
    setShowModalNovedad(false);
    setAccion(null);
  };

  const handleVolverOfrecer = async () => {
    try {
      const res = await fetch(
        `https://new.imporsuitpro.com/novedades/datos/${novedadSeleccionada.guia_novedad}`
      );
      const data = await res.json();
      setDatosNovedadExtra(data); // guarda todo, puedes extraer luego lo necesario
      setAccion("ofrecer");
    } catch (error) {
      console.error("Error al obtener detalles para volver a ofrecer:", error);
      Swal.fire(
        "Error",
        "No se pudo obtener los datos para gestionar la novedad",
        "error"
      );
    }
  };

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

  const handleGenerarGuia = async () => {
    if (
      !facturaSeleccionada?.productos ||
      facturaSeleccionada.productos.length === 0
    ) {
      console.warn("No hay productos seleccionados para generar la guía.");
      // Podés también lanzar un toast o alerta aquí si usás alguna librería (ej: toast.error("..."))
      return;
    }

    const lista_productos = facturaSeleccionada.productos.map((producto) => ({
      id_inventario: producto.id_inventario, // o producto.id_detalle
      cantidad: producto.cantidad,
    }));

    const transportadora = getValues("transportadora");

    if (!transportadora) {
      Toast.fire({
        title: "ERROR",
        icon: "error",
        text: "Por favor selecciona una transportadora.",
      });
      return;
    }

    // 🔐 VALIDACIÓN PREVIA
    try {
      await chatApi.post("/pedidos/validar_productos_guia", {
        lista: lista_productos,
        id_plataforma: id_plataforma_conf,
      });
    } catch (err) {
      const rsp = err?.response?.data || err;

      const html = `
      <div class="validador-wrap">
        <p class="validador-intro">
          Revise los siguientes ítems. Puede ajustar cantidades, quitar productos o reemplazarlos.
        </p>
        <div class="validador-list">
          ${(rsp?.invalidos || [])
            .map(
              (it) => `
            <div class="validador-item">
              <div class="validador-name"> <strong> -${
                it.nombre
              } </strong> </div>
              <div class="validador-chips">
                ${it.motivos
                  .map((m) => `<span class="chip">${m}</span>`)
                  .join("")}
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;

      Swal.fire({
        icon: "error",
        title: rsp?.title || "Producto con problemas",
        html,
      });

      setGenerandoGuia(false);
      return;
    }

    setGenerandoGuia(true);

    const costoFlete = getValues("precio_envio");

    if (
      !costoFlete ||
      String(costoFlete).trim() === "" ||
      Number(costoFlete) === 0
    ) {
      Swal.fire({
        icon: "warning",
        title: "Costo de flete no asignado",
        text: "Por favor, vuelva a seleccionar la transportadora deseada.",
      });
      resetSelection();
      setGenerandoGuia(false);
      return;
    }

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
    formulario.append("costo_flete", getValues("precio_envio"));
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
    formulario.append("id", id_usuario_conf ? id_usuario_conf : 0);
    formulario.append("id_plataforma", id_plataforma_conf);
    formulario.append("productos", JSON.stringify(lista_productos));

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
        const numFactura = facturaSeleccionada.numero_factura;

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
        resetSelection();
        setGenerandoGuia(false);
        try {
          await chatApi.post("/facturas_cot/marcar_chat_center", {
            numero_factura: numFactura,
          });
        } catch (err) {
          console.error("No se pudo marcar chat_center:", err.message);
        }
      } else if (data.status === "501" || data.status === 501) {
        Toast.fire({
          title: "ERROR",
          icon: "error",
          text: "Un producto no cuenta con stock y no se puede generar la guia.",
        });
        resetSelection();
        setGenerandoGuia(false);
      } else {
        resetSelection();
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
  const [isClosing, setIsClosing] = useState(false);
  const [isClosingNovedades, setIsClosingNovedades] = useState(false); // animacion para botones en historial de pedidos

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
        10
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
      // ⛔ Evitar duplicados (id_producto + sku)
      const yaExiste = (facturaSeleccionada?.productos || []).some(
        (p) =>
          String(p.id_producto) === String(producto.id_producto) &&
          String(p.sku) === String(producto.sku)
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
              : factura
          )
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

  const toggleAcordeonNovedades = () => {
    setIsOpenNovedades(!isOpenNovedades);
  };
  /* animacion para botones ordenes y novedades - historial de pedidos */
  const handleToggleOrdenes = () => {
    if (isOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, 300); // Tiempo de animación de salida
    } else {
      setIsOpen(true);
      setIsOpenNovedades(false);
      setIsClosing(false);
      setIsClosingNovedades(false);
    }
  };

  const handleToggleNovedades = () => {
    if (isOpenNovedades) {
      setIsClosingNovedades(true);
      setTimeout(() => {
        setIsOpenNovedades(false);
        setIsClosingNovedades(false);
      }, 300);
    } else {
      setIsOpenNovedades(true);
      setIsOpen(false);
      setIsClosing(false);
      setIsClosingNovedades(false);
    }
  };

  // Manejo de cambio de cantidad
  // const handleCantidadChange = (producto, increment) => {
  //   setIsPriceQuantity(true);
  //   setFacturaSeleccionada((prev) => {
  //     const productosActualizados = prev.productos.map((p) =>
  //       p.id_detalle === producto.id_detalle
  //         ? {
  //             ...p,
  //             cantidad: p.cantidad + increment,
  //           }
  //         : p
  //     );

  //     // Actualizamos facturaSeleccionada
  //     const updatedFacturaSeleccionada = {
  //       ...prev,
  //       productos: productosActualizados,
  //       monto_factura: prev.monto_factura + producto.precio_venta * increment,
  //     };

  //     setSelectedImageId(null);
  //     setValidar_generar(false);

  //     setMonto_venta(null);
  //     setCosto(null);
  //     setPrecio_envio_directo(null);
  //     setFulfillment(null);
  //     setTotal_directo(null);

  //     // Ahora, actualizamos facturaChatSeleccionado
  //     setFacturasChatSeleccionado((prevChat) => {
  //       // Encontrar la factura correspondiente en facturaChatSeleccionado
  //       const updatedFacturas = prevChat.map((factura) =>
  //         factura.id_factura === updatedFacturaSeleccionada.id_factura
  //           ? {
  //               ...factura,
  //               productos: productosActualizados,
  //               monto_factura: updatedFacturaSeleccionada.monto_factura,
  //             }
  //           : factura
  //       );
  //       return updatedFacturas;
  //     });

  //     return updatedFacturaSeleccionada;
  //   });
  // };
  const handleCantidadChange = (producto, increment) => {
    setIsPriceQuantity(true);

    const nextQty = Math.max(1, (producto.cantidad || 1) + increment);
    if (nextQty === producto.cantidad) return; // no cambiamos nada si ya está en 1

    // Actualiza facturaSeleccionada
    setFacturaSeleccionada((prev) => {
      if (!prev?.productos) return prev;

      const productosActualizados = prev.productos.map((p) =>
        p.id_detalle === producto.id_detalle ? { ...p, cantidad: nextQty } : p
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
                  : p
              ),
              monto_factura:
                factura.monto_factura +
                (nextQty - producto.cantidad) * (producto.precio_venta || 0),
            }
          : factura
      )
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
        p.id_detalle === producto.id_detalle ? { ...p, cantidad: qty } : p
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
                  : p
              ),
              monto_factura:
                factura.monto_factura + diff * (producto.precio_venta || 0),
            }
          : factura
      )
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

  const handleSetTarifas = () => {
    // actualizar las tarifas
    setTimeout(() => {
      socketRef.current.emit("GET_TARIFAS", {
        ciudad: document.querySelector("#ciudad").value,
        provincia: facturaSeleccionada.provincia,
        id_plataforma: id_plataforma_conf,
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
    setIsPriceQuantity(true);
    setFacturaSeleccionada((prev) => {
      const productosActualizados = prev.productos.map((p) =>
        p.id_detalle === producto.id_detalle
          ? { ...p, precio_venta: parseFloat(nuevoPrecio) || 0 }
          : p
      );

      // Actualizamos facturaSeleccionada
      const updatedFacturaSeleccionada = {
        ...prev,
        productos: productosActualizados,
        monto_factura: productosActualizados.reduce(
          (total, producto) =>
            total + producto.precio_venta * producto.cantidad,
          0
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
            : factura
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
          data
        );
      }
    } catch (error) {
      console.error("Error al calcularGuiaDirecta (catch):", error);
    }
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

    /* setTarifa_precio(data_flete); */
    calcularGuiaDirecta(data_flete);

    if (id == 3) {
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
          }
        );
        setSelectedImageId(null);
        setValidar_generar(false);

        setMonto_venta(null);
        setCosto(null);
        setPrecio_envio_directo(null);
        setFulfillment(null);
        setTotal_directo(null);

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

  useEffect(() => {
    const costo_general =
      facturaSeleccionada.productos?.reduce(
        (acumulado, producto) =>
          acumulado +
          (Number(producto.pcp) || 0) * (Number(producto.cantidad) || 0),
        0
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
    })
  }
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

  const ranRef = useRef(false);

  useEffect(() => {
    if (facturaSeleccionada.productos) {
      if (!facturaSeleccionada?.productos) return;

      if (ranRef.current) return; // evita segunda ejecución en StrictMode
      ranRef.current = true;

      facturaSeleccionada.productos.forEach((producto) => {
        handleCambioValores(producto);
      });
      setProductosAdicionales;
    }
  }, [facturaSeleccionada?.productos, handleCambioValores]);

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
          .post("/product/eliminarProducto", { id_detalle })
          .then((response) => {
            // Eliminar producto de facturaSeleccionada
            setFacturaSeleccionada((prevState) => ({
              ...prevState,
              productos: prevState.productos.filter(
                (producto) => producto.id_detalle !== id
              ),
            }));

            // Eliminar producto de facturasChatSeleccionado
            setFacturasChatSeleccionado((prevChat) =>
              prevChat.map((factura) =>
                factura.id_factura === facturaSeleccionada.id_factura
                  ? {
                      ...factura,
                      productos: factura.productos.filter(
                        (producto) => producto.id_detalle !== id
                      ),
                    }
                  : factura
              )
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

      // Extraer wamid del mensaje de plantilla
      const wamid = data?.messages?.[0]?.id || null;

      // Llamar a la función para guardar el mensaje en la BD
      let telefono_configuracion = dataAdmin.telefono;

      let id_recibe = await buscar_id_recibe(numeroDestino, id_configuracion);

      agregar_mensaje_enviado(
        templateText, // Texto con {{1}}, {{2}} etc.
        "text", // Tipo de mensaje
        JSON.stringify(ruta_archivo), // Guardamos en JSON las variables reales
        numeroDestino,
        dataAdmin.id_telefono,
        id_recibe,
        id_configuracion,
        telefono_configuracion,
        wamid,
        "",
        ""
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
              : guia
          )
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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    cargarProductosAdicionales(1, e.target.value); // Buscar desde la página 1 con el filtro
  };

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

  const DEFAULT_AVATAR = "https://tiendas.imporsuitpro.com/imgs/react/user.png";

  return (
    <>
      {opciones && (
        <div
          className={`relative col-span-1 h-[calc(100vh_-_130px)] overflow-y-auto custom-scrollbar text-white px-4 duration-700 transition-all ${
            animateOut ? "animate-slide-out" : "animate-slide-in"
          } ${
            facturaSeleccionada.numero_factura ? "bg-white" : "bg-[#171931]"
          }`}
        >
          {id_plataforma_conf !== null ? (
            <>
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
                              <td className="p-2">
                                {producto.nombre_producto}
                              </td>
                              <td className="p-2 text-center">
                                {producto.saldo_stock > 0
                                  ? producto.saldo_stock
                                  : "Sin Stock"}
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  id={
                                    `cantidad_adicional` +
                                    producto.id_inventario
                                  }
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
                        onClick={() =>
                          cargarProductosAdicionales(paginaActual - 1)
                        }
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
                        let endPage = Math.min(
                          totalPaginas - 1,
                          paginaActual + 2
                        );

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
                          onClick={() =>
                            cargarProductosAdicionales(totalPaginas)
                          }
                        >
                          {totalPaginas}
                        </button>
                      )}

                      {/* Botón Siguiente */}
                      <button
                        className="px-3 py-1 rounded-md bg-transparent hover:text-blue-500 transition flex items-center"
                        onClick={() =>
                          cargarProductosAdicionales(paginaActual + 1)
                        }
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

              <div className="flex items-start justify-center overflow-y-auto h-full pt-2 md:pt-4 custom-scrollbar">
                <div className="w-full max-w-3xl mx-auto">
                  {/* Información del cliente vinculado a Imporsuit */}
                  <div className="mb-8 px-6 py-6 bg-transparent text-white rounded-2xl shadow-xl border border-violet-500 neon-border opacity-0 animate-fadeInOnce delay-[100ms]">
                    <div className="w-full bg-[#162c4a] rounded-xl shadow-lg px-6 py-5 flex flex-col gap-4 animate-fadeInOnce">
                      {/* Avatar + contenido original... */}

                      <img
                        key={selectedChat?.psid || selectedChat?.id} // fuerza refresco al cambiar de chat
                        src={selectedChat?.profile_pic_url || DEFAULT_AVATAR}
                        alt="Avatar"
                        className="h-12 w-12 rounded-full object-cover bg-white block mx-auto"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_AVATAR;
                        }}
                      />

                      {/* Datos */}
                      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6 text-white/90">
                        <div className="flex items-center gap-3">
                          <i className="bx bx-id-card text-2xl text-violet-300 group-hover:glow-cart transition-all duration-300"></i>
                          <div>
                            <p className="text-xs text-white/60">Nombre</p>
                            <p className="text-sm font-semibold">
                              {selectedChat?.nombre_cliente || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <i className="bx bx-phone-call text-2xl text-violet-300 group-hover:glow-cart transition-all duration-300"></i>
                          <div>
                            <p className="text-xs text-white/60">Teléfono</p>
                            <p className="text-sm font-semibold">
                              {selectedChat?.celular_cliente || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 opacity-0 animate-slideInRightOnce delay-[0ms]">
                    {/* Órdenes */}
                    <button
                      className={`group w-full flex items-center justify-center gap-3 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                        isOpen
                          ? "bg-[#1e3a5f] border-blue-400"
                          : "bg-[#162c4a] border-transparent hover:border-blue-300"
                      }`}
                      onClick={() => {
                        setIsOpen((prev) => !prev);
                        setIsOpenNovedades(false);
                        setIsOpenMiniCal(false);
                      }}
                    >
                      <i
                        className={`bx bx-package text-xl transition-all duration-300 ${
                          isOpen
                            ? "glow-yellow"
                            : "text-yellow-300 group-hover:text-yellow-200"
                        }`}
                      ></i>
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
                      }}
                    >
                      <i
                        className={`bx bx-bell text-xl transition-all duration-300 ${
                          isOpenNovedades
                            ? "glow-yellow"
                            : "text-yellow-300 group-hover:text-yellow-200"
                        }`}
                      ></i>
                      <span className="text-white">Novedades</span>
                    </button>

                    <button
                      className={`group col-span-2 w-full flex items-center justify-center gap-3 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                        isOpenMiniCal
                          ? "bg-[#1e3a5f] border-blue-400"
                          : "bg-[#162c4a] border-transparent hover:border-blue-300"
                      }`}
                      onClick={handleToggleCalendar} // ← antes se hacía el toggle directo
                    >
                      <i
                        className={`bx bx-calendar text-xl ${
                          isOpenMiniCal
                            ? "glow-yellow"
                            : "text-yellow-300 group-hover:text-yellow-200"
                        }`}
                      ></i>
                      <span className="text-white">Calendario</span>
                    </button>
                  </div>

                  {isOpen && (
                    <div
                      className={`transition-all duration-300 ease-in-out transform origin-top ${
                        isOpen
                          ? "opacity-100 scale-100 max-h-[1000px] pointer-events-auto"
                          : "opacity-0 scale-95 max-h-0 overflow-hidden pointer-events-none"
                      } bg-[#12172e] rounded-lg shadow-md`}
                    >
                      {/* Botones de Pedidos y Guias */}
                      <div className="flex flex-row py-3 gap-4 animate-fadeInBtn">
                        <button
                          className={`group flex items-center justify-center gap-3 flex-1 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                            activeTab === "pedidos"
                              ? "bg-[#1f1b2e] border-violet-400"
                              : "bg-[#15121f] border-transparent hover:border-violet-300"
                          }`}
                          onClick={() => setActiveTab("pedidos")}
                        >
                          <i
                            className={`bx bx-cart text-xl transition-all duration-300 ${
                              activeTab === "pedidos"
                                ? "glow-cart"
                                : "text-violet-300 group-hover:text-violet-200"
                            }`}
                          ></i>
                          <span className="text-white">Pedidos</span>
                        </button>

                        <button
                          className={`group flex items-center justify-center gap-3 flex-1 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                            activeTab === "guias"
                              ? "bg-[#1a2b27] border-emerald-400"
                              : "bg-[#101f1d] border-transparent hover:border-emerald-300"
                          }`}
                          onClick={() => setActiveTab("guias")}
                        >
                          <i
                            className={`bx bx-send text-xl transition-all duration-300 ${
                              activeTab === "guias"
                                ? "glow-guias"
                                : "text-emerald-300 group-hover:text-emerald-200"
                            }`}
                          ></i>
                          <span className="text-white">Guías</span>
                        </button>
                      </div>

                      {/* Tabla dinámica */}
                      <div className="w-full overflow-x-auto overflow-y-auto min-h-12 max-h-80 transition-all duration-500 ease-out transform animate-fadeTable custom-scrollbar">
                        <table className="w-full table-auto border-separate border-spacing-y-2">
                          <thead className="bg-gradient-to-r from-blue-800 to-blue-700 text-white text-sm">
                            <tr>
                              {activeTab === "pedidos" ? (
                                <>
                                  <th className="px-4 py-2 text-left rounded-tl-md">
                                    Número Factura
                                  </th>
                                  <th className="px-4 py-2 text-left">
                                    Nombre Cliente
                                  </th>
                                  <th className="px-4 py-2 text-center rounded-tr-md">
                                    Acción
                                  </th>
                                </>
                              ) : (
                                <>
                                  <th className="px-4 py-2 text-left rounded-tl-md">
                                    Número Guía
                                  </th>
                                  <th className="px-4 py-2 text-left">
                                    Estado
                                  </th>
                                  <th className="px-4 py-2 text-center rounded-tr-md">
                                    Acción
                                  </th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {activeTab === "pedidos"
                              ? facturasChatSeleccionado?.map(
                                  (factura, index) => (
                                    <tr
                                      key={index}
                                      className="bg-[#1f2937] text-white hover:shadow-lg hover:ring-1 hover:ring-blue-400 rounded-md transition-all"
                                    >
                                      <td className="px-4 py-3 rounded-l-md">
                                        {factura.numero_factura}
                                      </td>
                                      <td className="px-4 py-3">
                                        {factura.nombre}
                                      </td>
                                      <td className="px-4 py-3 text-center rounded-r-md">
                                        <button
                                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-4 py-2 rounded-md transition duration-200"
                                          onClick={() => {
                                            setIsOpen(false);
                                            setIsOpenNovedades(false);
                                            setIsOpenMiniCal(false);
                                            handleFacturaSeleccionada(factura);
                                          }}
                                        >
                                          Ver
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                )
                              : guiasChatSeleccionado?.map((guia, index) => {
                                  const { color, estado_guia } =
                                    obtenerEstadoGuia(
                                      guia.transporte,
                                      guia.estado_guia_sistema
                                    );

                                  return (
                                    <tr
                                      key={index}
                                      className="bg-[#1f2937] text-white hover:shadow-lg hover:ring-1 hover:ring-blue-400 rounded-md transition-all"
                                    >
                                      <td className="px-4 py-3 rounded-l-md">
                                        {guia.numero_guia}
                                      </td>
                                      <td className="px-4 py-3">
                                        <span
                                          className={`text-xs px-3 py-1 rounded-full ${color}`}
                                        >
                                          {estado_guia}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center rounded-r-md">
                                        <button
                                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-4 py-2 rounded-md transition duration-200"
                                          onClick={() => {
                                            setIsOpen(false);
                                            setIsOpenNovedades(false);
                                            setIsOpenMiniCal(false);
                                            handleGuiaSeleccionada(guia);
                                          }}
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
                  )}

                  {isOpenNovedades && (
                    <div
                      className={`transition-all duration-300 ease-in-out transform origin-top ${
                        isOpenNovedades
                          ? "opacity-100 scale-100 max-h-[1000px] pointer-events-auto"
                          : "opacity-0 scale-95 max-h-0 overflow-hidden pointer-events-none"
                      } bg-[#12172e] rounded-lg shadow-md`}
                    >
                      <div className="flex flex-row py-2 gap-3 animate-fadeInBtn">
                        <button
                          className={`group flex items-center justify-center gap-2 flex-1 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                            activeTabNovedad === "gestionadas"
                              ? "bg-[#2d1b3f] border-violet-400"
                              : "bg-[#20152d] border-transparent hover:border-violet-300"
                          }`}
                          onClick={() => setActiveTabNovedad("gestionadas")}
                        >
                          <i
                            className={`bx bx-check-circle text-xl transition-all duration-300 ${
                              activeTabNovedad === "gestionadas"
                                ? "glow-cart"
                                : "text-violet-300 group-hover:text-violet-200"
                            }`}
                          ></i>
                          <span className="text-white">Gestionadas</span>
                        </button>

                        <button
                          className={`group flex items-center justify-center gap-2 flex-1 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                            activeTabNovedad === "no_gestionadas"
                              ? "bg-[#2d1b3f] border-violet-400"
                              : "bg-[#20152d] border-transparent hover:border-violet-300"
                          }`}
                          onClick={() => setActiveTabNovedad("no_gestionadas")}
                        >
                          <i
                            className={`bx bx-error-circle text-xl transition-all duration-300 ${
                              activeTabNovedad === "no_gestionadas"
                                ? "glow-cart"
                                : "text-violet-300 group-hover:text-violet-200"
                            }`}
                          ></i>
                          <span className="text-white">No gestionadas</span>
                        </button>
                      </div>

                      <div className="w-full overflow-x-auto overflow-y-auto min-h-12 max-h-80 transition-all duration-500 ease-out transform animate-fadeTable custom-scrollbar">
                        <table className="w-full table-auto border-separate border-spacing-y-2">
                          <thead className="bg-gradient-to-r from-blue-800 to-blue-700 text-white text-sm">
                            <tr>
                              <th className="px-4 py-2 text-left rounded-tl-md">
                                Número Guía
                              </th>
                              <th className="px-4 py-2 text-left">
                                Nombre Cliente
                              </th>
                              <th className="px-4 py-2 text-center rounded-tr-md">
                                Detalle
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(activeTabNovedad === "gestionadas"
                              ? novedades_gestionadas
                              : novedades_noGestionadas
                            )?.map((novedades, index) => (
                              <tr
                                key={index}
                                className="bg-[#1f2937] text-white hover:shadow-lg hover:ring-1 hover:ring-blue-400 rounded-md transition-all"
                              >
                                <td className="px-4 py-3 rounded-l-md">
                                  {novedades.guia_novedad}
                                </td>
                                <td className="px-4 py-3">
                                  {novedades.cliente_novedad}
                                </td>
                                <td className="px-4 py-3 text-center rounded-r-md">
                                  <button
                                    className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-4 py-2 rounded-md transition duration-200"
                                    onClick={() =>
                                      handleDetalleNovedad(
                                        novedades,
                                        activeTabNovedad === "gestionadas"
                                          ? "gestionada"
                                          : "no_gestionada"
                                      )
                                    }
                                  >
                                    Ver
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {isOpenMiniCal && (
                    <div
                      className={`transition-all duration-300 ease-in-out transform origin-top ${
                        isOpenMiniCal
                          ? "opacity-100 scale-100 max-h-[1000px] pointer-events-auto"
                          : "opacity-0 scale-95 max-h-0 overflow-hidden pointer-events-none"
                      } bg-transparent rounded-lg shadow-md`}
                    >
                      <div className="p-3">
                        {/* Card propia del calendario con color de texto neutro */}
                        <div className="rounded-lg shadow-md bg-white text-slate-900">
                          <MiniCalendario />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* acordeon 2 */}

                  {/* Modal de detalle novedad */}
                  {showModalNovedad && novedadSeleccionada && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                      <div className="relative bg-white w-11/12 max-w-2xl p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold mb-4">
                          Detalle de Novedad
                        </h2>
                        <div className="flex gap-6">
                          {/* Izquierda */}
                          <div className="flex-1 dividing-lines text-gray-900">
                            {[
                              ["ID", novedadSeleccionada.id_novedad],
                              ["Guía", novedadSeleccionada.guia_novedad],
                              ["Cliente", novedadSeleccionada.cliente_novedad],
                              ["Estado", novedadSeleccionada.estado_novedad],
                              ["Transportadora", "---"],
                              ["Novedad", novedadSeleccionada.novedad],
                              [
                                "Tracking",
                                <a
                                  key="track"
                                  href={novedadSeleccionada.tracking}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  Ver tracking
                                </a>,
                              ],
                            ].map(([label, value]) => (
                              <div
                                className="py-2 border-b text-sm"
                                key={label}
                              >
                                <span className="font-semibold">{label}:</span>{" "}
                                {value}
                              </div>
                            ))}
                          </div>

                          {/* Derecha */}
                          <div className="flex-1">
                            {accion === null &&
                            tipo_novedad == "no_gestionada" ? (
                              <div className="flex flex-col space-y-4">
                                <button
                                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                                  onClick={handleVolverOfrecer}
                                >
                                  Volver a ofrecer
                                </button>
                                <button
                                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                                  onClick={devolverRemitente}
                                >
                                  Devolver al remitente
                                </button>
                              </div>
                            ) : accion === "ofrecer" ? (
                              <form
                                onSubmit={handleGestionSubmit}
                                className="space-y-4"
                              >
                                {/* Secciones por transportadora */}
                                {novedadSeleccionada.guia_novedad.startsWith(
                                  "IMP"
                                ) ||
                                novedadSeleccionada.guia_novedad.startsWith(
                                  "MKP"
                                ) ? (
                                  /* Sección LAAR */
                                  <div
                                    className="text-black space-y-4 mt-4 overflow-y-auto"
                                    style={{ maxHeight: "70vh" }}
                                  >
                                    <p className="font-semibold">
                                      Sección LAAR
                                    </p>

                                    {/* Selector de tipo */}
                                    <div>
                                      <label
                                        className="block text-sm font-medium"
                                        htmlFor="tipo_laar"
                                      >
                                        Tipo:
                                      </label>
                                      <select
                                        id="tipo_laar"
                                        value={tipoLaar}
                                        onChange={(e) =>
                                          setTipoLaar(e.target.value)
                                        }
                                        className="form-select w-full border rounded px-2 py-1"
                                      >
                                        <option value="">
                                          -- Selecciona --
                                        </option>
                                        <option value="NI">
                                          Número incorrecto
                                        </option>
                                        <option value="DI">
                                          Dirección Incorrecta
                                        </option>
                                        <option value="OG">Otra gestión</option>
                                      </select>
                                    </div>

                                    {/* Común: nombre, referencia, celular (puedes mostrar siempre o según necesidad) */}
                                    <div>
                                      <label
                                        className="block text-sm font-medium"
                                        htmlFor="nombre_novedadesServi"
                                      >
                                        Nombre:
                                      </label>
                                      <input
                                        type="text"
                                        id="nombre_novedadesServi"
                                        defaultValue={
                                          datosNovedadExtra?.factura?.[0]
                                            ?.nombre
                                        }
                                        className="form-input w-full border rounded px-2 py-1"
                                      />
                                    </div>

                                    {/* Condicionales */}
                                    {tipoLaar === "NI" && (
                                      <>
                                        <div>
                                          <label
                                            className="block text-sm font-medium"
                                            htmlFor="telefono_novedadesServi"
                                          >
                                            Teléfono:
                                          </label>
                                          <input
                                            type="text"
                                            id="telefono_novedadesServi"
                                            defaultValue={
                                              datosNovedadExtra?.factura?.[0]
                                                ?.telefono
                                            }
                                            className="form-input w-full border rounded px-2 py-1"
                                          />
                                        </div>
                                      </>
                                    )}

                                    {tipoLaar === "DI" && (
                                      <>
                                        <div>
                                          <label
                                            className="block text-sm font-medium"
                                            htmlFor="callePrincipal_novedadesServi"
                                          >
                                            Calle Principal:
                                          </label>
                                          <input
                                            type="text"
                                            id="callePrincipal_novedadesServi"
                                            maxLength={100}
                                            defaultValue={
                                              datosNovedadExtra?.factura?.[0]
                                                ?.c_principal
                                            }
                                            className="form-input w-full border rounded px-2 py-1"
                                          />
                                        </div>
                                        <div>
                                          <label
                                            className="block text-sm font-medium"
                                            htmlFor="calleSecundaria_novedadesServi"
                                          >
                                            Calle Secundaria:
                                          </label>
                                          <input
                                            type="text"
                                            id="calleSecundaria_novedadesServi"
                                            maxLength={100}
                                            defaultValue={
                                              datosNovedadExtra?.factura?.[0]
                                                ?.c_secundaria
                                            }
                                            className="form-input w-full border rounded px-2 py-1"
                                          />
                                        </div>
                                      </>
                                    )}

                                    {tipoLaar === "OG" && (
                                      <div>
                                        <label
                                          className="block text-sm font-medium"
                                          htmlFor="observacion_novedadesServi"
                                        >
                                          Observación:
                                        </label>
                                        <input
                                          type="text"
                                          id="observacion_novedadesServi"
                                          value={observacionLaar}
                                          onChange={(e) =>
                                            setObservacionLaar(e.target.value)
                                          }
                                          className="form-input w-full border rounded px-2 py-1"
                                        />
                                      </div>
                                    )}

                                    {/* Solución: común para todos los tipos */}
                                    {tipoLaar && (
                                      <div>
                                        <label
                                          className="block text-sm font-medium"
                                          htmlFor="observacionA"
                                        >
                                          Solución a la Novedad:
                                        </label>
                                        <input
                                          type="text"
                                          id="observacionA"
                                          maxLength={200}
                                          value={solucionLaar}
                                          onChange={(e) =>
                                            setSolucionLaar(e.target.value)
                                          }
                                          className="form-input w-full border rounded px-2 py-1"
                                        />
                                      </div>
                                    )}

                                    <button
                                      type="button"
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                                      onClick={enviarLaarNovedad}
                                      disabled={enviando}
                                    >
                                      {enviando ? "Enviando..." : "Enviar"}
                                    </button>
                                  </div>
                                ) : /* fin laar */
                                novedadSeleccionada.guia_novedad.startsWith(
                                    "I"
                                  ) ? (
                                  /* Gintracom */
                                  <div
                                    className="text-black space-y-4 mt-4 overflow-y-auto"
                                    style={{ maxHeight: "70vh" }}
                                  >
                                    <p className="font-semibold">
                                      Sección Gintracom
                                    </p>

                                    {/* Tipo */}
                                    <div>
                                      <label
                                        className="block text-sm font-medium"
                                        htmlFor="tipo_gintracom"
                                      >
                                        Tipo:
                                      </label>
                                      <select
                                        id="tipo_gintracom"
                                        value={tipoGintra}
                                        onChange={(e) =>
                                          setTipoGintra(e.target.value)
                                        }
                                        className="form-select w-full border rounded px-2 py-1"
                                      >
                                        <option value="">
                                          -- Selecciona --
                                        </option>
                                        <option value="ofrecer">
                                          Volver a ofrecer al cliente
                                        </option>
                                        <option value="rechazar">
                                          Efectuar devolución
                                        </option>
                                        <option value="recaudo">
                                          Ajustar recaudo
                                        </option>
                                      </select>
                                    </div>

                                    {/* Solución a novedad */}
                                    <div>
                                      <label
                                        className="block text-sm font-medium"
                                        htmlFor="Solucion_novedad"
                                      >
                                        Solución a novedad:
                                      </label>
                                      <input
                                        type="text"
                                        id="Solucion_novedad"
                                        maxLength={50}
                                        value={solucionGintra}
                                        onChange={(e) =>
                                          setSolucionGintra(e.target.value)
                                        }
                                        className="form-input w-full border rounded px-2 py-1"
                                      />
                                    </div>

                                    {/* Fecha para gestionar novedad */}
                                    {tipoGintra !== "rechazar" && (
                                      <div>
                                        <label
                                          className="block text-sm font-medium"
                                          htmlFor="fecha_gintra"
                                        >
                                          Fecha para gestionar novedad:
                                        </label>
                                        <input
                                          type="date"
                                          id="fecha_gintra"
                                          value={fechaGintra}
                                          onChange={(e) => {
                                            const selected = e.target.value;
                                            const selectedDate = new Date(
                                              selected
                                            );
                                            const day = selectedDate.getDay();
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);

                                            // Rechazar fines de semana y días pasados o hoy
                                            if (
                                              day !== 0 && // domingo
                                              day !== 6 && // sábado
                                              selectedDate > today
                                            ) {
                                              setFechaGintra(selected);
                                            } else {
                                              Swal.fire({
                                                title: "Fecha inválida",
                                                text: "Seleccione un día hábil posterior al día actual (lunes a viernes).",
                                                icon: "warning",
                                              });
                                              e.target.value = "";
                                              setFechaGintra("");
                                            }
                                          }}
                                          className="form-input w-full border rounded px-2 py-1"
                                          min={minDate}
                                        />
                                      </div>
                                    )}

                                    <div className="bg-yellow-100 text-yellow-800 p-2 rounded text-sm">
                                      <strong>Atención:</strong> Gintracom no
                                      recibe novedades los días domingo.
                                    </div>

                                    {/* Valor a recaudar solo si seleccionan recaudo */}
                                    {tipoGintra === "recaudo" && (
                                      <div>
                                        <label
                                          className="block text-sm font-medium"
                                          htmlFor="Valor_recaudar"
                                        >
                                          Valor a recaudar:
                                        </label>
                                        <input
                                          type="text"
                                          id="Valor_recaudar"
                                          value={valorRecaudar}
                                          onChange={(e) =>
                                            setValorRecaudar(e.target.value)
                                          }
                                          className="form-input w-full border rounded px-2 py-1"
                                        />
                                      </div>
                                    )}

                                    <button
                                      type="button"
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                                      onClick={enviarGintracomNovedad}
                                    >
                                      Enviar
                                    </button>
                                  </div>
                                ) : /* Fin Gintracom */
                                novedadSeleccionada.guia_novedad.startsWith(
                                    "SPD"
                                  ) ? (
                                  /* speed */
                                  <div
                                    className="text-black space-y-4 mt-4 overflow-y-auto"
                                    style={{ maxHeight: "70vh" }}
                                  >
                                    <p className="font-semibold">
                                      Sección Speed
                                    </p>

                                    {/* Observación */}
                                    <div>
                                      <label
                                        className="block text-sm font-medium"
                                        htmlFor="observacion_usuario_speed"
                                      >
                                        Observación:
                                      </label>
                                      <input
                                        type="text"
                                        id="observacion_usuario_speed"
                                        value={observacionSpeed}
                                        onChange={(e) =>
                                          setObservacionSpeed(e.target.value)
                                        }
                                        className="form-input w-full border rounded px-2 py-1"
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                                      onClick={() => {
                                        // Aquí llamas a la función que manejará la lógica de envío para SPEED
                                        console.log(
                                          "Enviar SPEED (implementa la función)",
                                          observacionSpeed
                                        );
                                      }}
                                    >
                                      Enviar
                                    </button>
                                  </div>
                                ) : (
                                  /* fin speed */
                                  /* servientrega */
                                  <div
                                    className="text-black space-y-4 mt-4 overflow-y-auto"
                                    style={{ maxHeight: "70vh" }}
                                  >
                                    <p className="font-semibold">
                                      Sección Servientrega
                                    </p>

                                    {/* Observación */}
                                    <div>
                                      <label
                                        className="block text-sm font-medium"
                                        htmlFor="observacion_nov"
                                      >
                                        Observación:
                                      </label>
                                      <input
                                        type="text"
                                        id="observacion_nov"
                                        value={observacionServi}
                                        onChange={(e) =>
                                          setObservacionServi(e.target.value)
                                        }
                                        className="form-input w-full border rounded px-2 py-1"
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                                      onClick={enviarServiNovedad}
                                    >
                                      Enviar
                                    </button>
                                  </div>

                                  /* fin servientrega */
                                )}

                                <button
                                  type="button"
                                  className="text-gray-600 underline"
                                  onClick={() => setAccion(null)}
                                >
                                  Cancelar
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </div>

                        {/* Cerrar */}
                        <button
                          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
                          onClick={() => setShowModalNovedad(false)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Modal de detalle novedad */}

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
                          {new Date(
                            guiaSeleccionada.fecha_guia
                          ).toLocaleDateString("es-EC", {
                            year: "numeric",
                            month: "numeric",
                            day: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                          }) || "Sin Fecha"}
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
                            $
                            {guiaSeleccionada.monto_factura?.toFixed(2) ||
                              "0.00"}
                          </span>
                        </div>

                        {/* Costo de Envío */}
                        <div className="flex justify-between text-gray-700 text-sm mt-2">
                          <span>Costo de Envío:</span>
                          <span>
                            $
                            {guiaSeleccionada.costo_flete?.toFixed(2) || "0.00"}
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
                            anular_guia(
                              guiaSeleccionada.numero_guia,
                              guiaSeleccionada.transporte,
                              "guia"
                            )
                          }
                          disabled={!disableAanular} // Si disableAanular es false, se deshabilita
                        >
                          Anular
                        </button>

                        {/* Botón Gestionar Novedad */}
                        {disableGestionar && (
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault(); // evitar navegación inmediata
                              const novedad = novedades_noGestionadas.find(
                                (n) =>
                                  n.guia_novedad ===
                                  guiaSeleccionada.numero_guia
                              );
                              if (novedad) {
                                handleDetalleNovedad(novedad, "no_gestionada");
                              } else {
                                Swal.fire({
                                  icon: "warning",
                                  title: "Sin novedad",
                                  text: "No se encontró una novedad no gestionada para esta guía.",
                                });
                              }
                            }}
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
                  <div className="absolute inset-0 z-20 bg-white text-black">
                    <div className="h-full overflow-y-auto">
                      <div className="max-w-5xl mx-auto p-4">
                        {generandoGuia == true ? (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                            <div className="bg-white p-6 rounded-lg shadow-lg text-black text-center">
                              <h1 className="text-2xl font-semibold mb-4">
                                Generando Guía
                              </h1>
                              <div className="flex flex-col items-center space-y-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                                <span className="text-lg">
                                  Espere por favor...
                                </span>
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
                          <input
                            type="hidden"
                            id="flete"
                            {...register("flete")}
                          />
                          <input
                            type="hidden"
                            id="seguro"
                            {...register("seguro")}
                          />
                          <input
                            type="hidden"
                            id="comision"
                            {...register("comision")}
                          />
                          <input
                            type="hidden"
                            id="otros"
                            {...register("otros")}
                          />
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
                            <label
                              htmlFor="telefono"
                              className="text-sm font-medium"
                            >
                              Teléfono
                            </label>
                            <input
                              type="text"
                              placeholder="Teléfono Cliente"
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
                                <option value="">
                                  Seleccione una provincia
                                </option>
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
                                  <option
                                    key={index}
                                    value={ciudad.id_cotizacion}
                                  >
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
                              maxLength="100"
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
                              maxLength="100"
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
                              maxLength="200"
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
                              maxLength="200"
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

                            <TarjetaHistorial stats={stats} nivel={nivel} />

                            {mostrarAlerta && (
                              <div
                                className="bg-yellow-100 text-yellow-800 text-sm px-4 py-3 rounded border border-yellow-300 mt-2"
                                role="alert"
                              >
                                El cliente registra 1 o más devoluciones en
                                nuestro sistema.
                              </div>
                            )}
                          </div>

                          <div className="col-span-2">
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 justify-center items-center gap-4">
                              {images.map((image) => (
                                <div
                                  key={image.id}
                                  className="grid justify-center"
                                >
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
                                          (image.id === 2 &&
                                            tarifas.laar > 0) ||
                                          (image.id === 3 &&
                                            tarifas.speed > 0) ||
                                          (image.id === 4 &&
                                            tarifas.gintracom > 0)
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
                                      onClick={() =>
                                        setModal_google_maps(false)
                                      } // Cierra el modal sin guardar
                                      className="px-4 py-2 bg-gray-300 text-black text-sm rounded-md hover:bg-gray-400"
                                    >
                                      Cancelar
                                    </button>
                                    {/* Botón Guardar */}
                                    <button
                                      onClick={() =>
                                        setModal_google_maps(false)
                                      }
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
                                                  min={1}
                                                  value={producto.cantidad}
                                                  className="no-spinners p-1 text-sm border border-gray-200 w-12 text-center text-[0.65rem] md:text-[0.75rem]"
                                                  id={`cantidad${producto.id_detalle}`}
                                                  onChange={(e) =>
                                                    handleCantidadInputChange(
                                                      producto,
                                                      e.target.value
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
                                                    className="inline-flex justify-center items-center text-sm font-medium bg-gray-50 text-gray-800 hover:bg-gray-100 p-1 rounded-l border border-gray-200 disabled:opacity-50"
                                                    aria-label="Decrease"
                                                    onClick={() => {
                                                      handleCantidadChange(
                                                        producto,
                                                        -1
                                                      );
                                                    }}
                                                    disabled={
                                                      producto.cantidad <= 1
                                                    } // ← clave
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
                                                type="number"
                                                value={producto.precio_venta}
                                                className="no-spinners py-2 px-3 border rounded w-16 text-[0.65rem] md:text-[0.75rem] "
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

                                <div className="flex items-center justify-between gap-3">
                                  {/* Botón para añadir producto */}
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setIsModalOpen(true);
                                    }}
                                    className="group inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold
                                 bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 active:scale-[.98]
                                 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition mt-3"
                                    title="Añadir un producto al pedido"
                                  >
                                    <i className="bx bx-plus text-base"></i>
                                    Añadir producto
                                  </button>

                                  {/* Bodega */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">
                                      Bodega
                                    </span>
                                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border">
                                      {nombreBodega || "—"}
                                    </span>
                                  </div>
                                </div>

                                {/* ===== Resumen del pedido (con scroll horizontal) ===== */}
                                <div className="mt-3 rounded-xl border bg-white shadow-sm">
                                  <div className="px-4 py-3 border-b flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-gray-800">
                                      Resumen del pedido
                                    </h4>
                                    <span className="text-[11px] text-gray-500">
                                      Actualiza al cambiar cantidades/precios
                                    </span>
                                  </div>

                                  {/* Wrapper con scroll horizontal */}
                                  <div className="px-4 py-3 overflow-x-auto">
                                    {/* Fila “ancha” que solo crece a lo ancho y permite scroll */}
                                    <div className="inline-flex gap-3 min-w-max">
                                      <MetricCard
                                        title="Monto de Venta"
                                        idHtml="monto_venta"
                                        value={monto_venta}
                                        color="text-emerald-600"
                                      />
                                      <MetricCard
                                        title="Costo Producto"
                                        idHtml="costo"
                                        value={costo}
                                        color="text-rose-600"
                                      />
                                      <MetricCard
                                        title="Precio de envío"
                                        idHtml="precio_envio_directo"
                                        value={precio_envio_directo}
                                        color="text-sky-600"
                                      />
                                      <MetricCard
                                        title="Aplica Fulfillment"
                                        idHtml="fulfillment"
                                        value={fulfillment}
                                        color="text-indigo-600"
                                      />
                                      <MetricCard
                                        title="Ganancia Final"
                                        idHtml="total"
                                        value={total_directo}
                                        color="text-amber-700"
                                        ring="ring-amber-200"
                                        gradient
                                        big
                                      />
                                    </div>
                                  </div>

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
                      <div className="flex flex-wrap items-center gap-3 mx-4 mt-4">
                        {/* Generar guía */}
                        <button
                          onClick={handleGenerarGuia}
                          disabled={!validar_generar}
                          className={`group inline-flex items-center justify-center gap-2 px-4 h-11 rounded-lg text-sm font-semibold shadow-sm transition
                      ${
                        validar_generar
                          ? "bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                          title="Generar la guía con los datos actuales"
                        >
                          <i className="bx bx-rocket text-base"></i>
                          Generar Guía
                        </button>

                        {/* Cancelar pedido */}
                        <button
                          className="group inline-flex items-center justify-center gap-2 px-4 h-11 rounded-lg text-sm font-semibold
                        bg-amber-500 text-white shadow-sm hover:bg-amber-600 active:scale-[.98]
                        focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                          onClick={() =>
                            anular_guia(
                              facturaSeleccionada.numero_factura,
                              facturaSeleccionada.transporte,
                              "pedido"
                            )
                          }
                          title="Anular el pedido"
                        >
                          <i className="bx bx-block text-base"></i>
                          Cancelar Pedido
                        </button>

                        {/* Cerrar panel */}
                        <button
                          className="group inline-flex items-center justify-center gap-2 px-4 h-11 rounded-lg text-sm font-semibold
                        bg-rose-500 text-white shadow-sm hover:bg-rose-600 active:scale-[.98]
                        focus:outline-none focus:ring-2 focus:ring-rose-400 transition"
                          onClick={() => {
                            setSelectedImageId(null);
                            setValidar_generar(false);
                            setMonto_venta(null);
                            setCosto(null);
                            setPrecio_envio_directo(null);
                            setFulfillment(null);
                            setTotal_directo(null);
                            setFacturaSeleccionada({});
                          }}
                          title="Cerrar y limpiar selección"
                        >
                          <i className="bx bx-x text-base"></i>
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-start justify-center overflow-y-auto h-full md:h-[750px] pt-2 md:pt-4 custom-scrollbar">
              <div className="w-full max-w-3xl mx-auto">
                {/* Información del cliente*/}
                <div className="mb-8 px-6 py-6 bg-transparent text-white rounded-2xl shadow-xl border border-violet-500 neon-border opacity-0 animate-fadeInOnce delay-[100ms]">
                  <div className="w-full bg-[#162c4a] rounded-xl shadow-lg px-6 py-5 flex flex-col gap-4 animate-fadeInOnce">
                    {/* Avatar + contenido original... */}

                    <img
                      key={selectedChat?.psid || selectedChat?.id} // fuerza refresco al cambiar de chat
                      src={selectedChat?.profile_pic_url || DEFAULT_AVATAR}
                      alt="Avatar"
                      className="h-12 w-12 rounded-full object-cover bg-white block mx-auto"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_AVATAR;
                      }}
                    />

                    {/* Datos */}
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6 text-white/90">
                      <div className="flex items-center gap-3">
                        <i className="bx bx-id-card text-2xl text-violet-300 group-hover:glow-cart transition-all duration-300"></i>
                        <div>
                          <p className="text-xs text-white/60">Nombre</p>
                          <p className="text-sm font-semibold">
                            {selectedChat?.nombre_cliente || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <i className="bx bx-phone-call text-2xl text-violet-300 group-hover:glow-cart transition-all duration-300"></i>
                        <div>
                          <p className="text-xs text-white/60">Teléfono</p>
                          <p className="text-sm font-semibold">
                            {selectedChat?.celular_cliente || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 opacity-0 animate-slideInRightOnce delay-[0ms]">
                  <button
                    className={`group col-span-2 w-full flex items-center justify-center gap-3 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 border-2 ${
                      isOpenMiniCal
                        ? "bg-[#1e3a5f] border-blue-400"
                        : "bg-[#162c4a] border-transparent hover:border-blue-300"
                    }`}
                    onClick={handleToggleCalendar} // ← antes se hacía el toggle directo
                  >
                    <i
                      className={`bx bx-calendar text-xl ${
                        isOpenMiniCal
                          ? "glow-yellow"
                          : "text-yellow-300 group-hover:text-yellow-200"
                      }`}
                    ></i>
                    <span className="text-white">Calendario</span>
                  </button>
                </div>
                {isOpenMiniCal && (
                  <div
                    className={`transition-all duration-300 ease-in-out transform origin-top ${
                      isOpenMiniCal
                        ? "opacity-100 scale-100 max-h-[1000px] pointer-events-auto"
                        : "opacity-0 scale-95 max-h-0 overflow-hidden pointer-events-none"
                    } bg-transparent rounded-lg shadow-md`}
                  >
                    <div className="p-3">
                      <div className="rounded-lg shadow-md bg-white text-slate-900">
                        <MiniCalendario />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default DatosUsuario;
