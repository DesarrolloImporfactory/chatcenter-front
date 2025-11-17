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
          text: data.message,
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
      });
    }
  }, [facturaSeleccionada.productos]);

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
            "bg-[#171931]"
          }`}
        >
          {id_plataforma_conf !== null ? (
            <>
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
                </div>
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
