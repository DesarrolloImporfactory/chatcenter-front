import axios from "axios";
import React, { useEffect, useState, useCallback } from "react";
import { set, useForm } from "react-hook-form";
import Swal from "sweetalert2";
import "./css/DataUsuarioCss.css";
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
      cod_entrega: 1,
    },
  });

  const onSubmit = (data) => {
    console.log(data);
  };

  const handleGenerarGuia = async () => {
    setGenerandoGuia(true);
    const transportadora = getValues("transportadora");

    if (!transportadora) {
      alert("Por favor selecciona una transportadora.");
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
    formulario.append("recaudo", getValues("cod_entrega") || "");
    formulario.append(
      "numero_factura",
      facturaSeleccionada.numero_factura || ""
    );
    formulario.append("total_venta", facturaSeleccionada.monto_factura || 0);
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
    formulario.append("id", userData ? userData.id : 0);
    formulario.append("id_plataforma", userData.plataforma);

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
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [ciudades, setCiudades] = useState(null);
  const [tarifas, setTarifas] = useState(null);
  const [productosAdicionales, setProductosAdicionales] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [modal_google_maps, setModal_google_maps] = useState(false);

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
  const cargarProductosAdicionales = async (pagina = 1) => {
    try {
      const response = await axios
        .post(
          `${import.meta.env.VITE_socket}/api/v1/product/${
            facturaSeleccionada.productos[0].bodega
          }`,
          {
            page: pagina, // Parámetros enviados en el cuerpo
            limit: productosPorPagina, // Parámetros enviados en el cuerpo
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        )
        .then((response) => {
          setProductosAdicionales(response.data.products);
          setPaginaActual(response.data.page);
          setTotalPaginas(response.data.totalPages);
        });
    } catch (error) {
      console.error("Error al cargar productos adicionales:", error);
    }
  };

  const handleAccordionToggle = () => {
    setIsAccordionOpen(!isAccordionOpen);
  };
  const agregarProducto = (producto) => {
    const formData1 = new FormData();
    formData1.append("id_factura", facturaSeleccionada.id_factura);
    formData1.append("id_producto", producto.id_producto);
    formData1.append("id_inventario", producto.id_inventario);
    formData1.append("sku", producto.sku);
    formData1.append("cantidad", 1);
    formData1.append("precio", producto.pvp);

    axios
      .post("https://new.imporsuitpro.com/api/agregarProducto", formData1)
      .then((response) => {
        console.log(response);

        // Actualizar estado para reflejar el cambio
        setFacturaSeleccionada((prevState) => ({
          ...prevState,
          productos: [
            ...prevState.productos,
            {
              ...producto,
              cantidad: 1, // Cantidad inicial
              precio_venta: producto.pvp, // Usar el precio del producto
              total: producto.pvp * 1, // Total inicial
            },
          ],
        }));
      })
      .catch((error) => {
        console.error(error);
      });
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
        id_plataforma: userData.plataforma,
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
    setSelectedImageId(id);
    setValue("transportadora", id);

    if (id == 3) {
      setModal_google_maps(true);
    }
    const data_flete = document.getElementById("flete_" + id).innerHTML;

    setValue("precio_envio", data_flete);
  };

  // Actualización de valores en el servidor
  const handleCambioValores = useCallback(
    async (producto) => {
      const { id_detalle, cantidad, precio_venta } = producto;
      const form = new FormData();
      form.append("id_detalle", id_detalle);
      form.append("id_pedido", facturaSeleccionada.id_factura);
      form.append("precio", precio_venta);
      form.append("cantidad", cantidad);
      form.append("total", cantidad * precio_venta);
      try {
        const response = await axios.post(
          "https://new.imporsuitpro.com/pedidos/actualizarDetallePedido",
          form,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
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
      window.open(`https://ec.gintracom.site/web/site/tracking`, "_blank");
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
        let formData = new FormData();
        formData.append("id_detalle", id);
        axios
          .post("https://new.imporsuitpro.com/api/eliminarProducto", formData)
          .then((response) => {
            console.log(response);
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
      id_plataforma: userData.plataforma,
      telefono: selectedChat.celular_cliente,
    });
  };
  return (
    <>
      {opciones && (
        <div
          className={`relative col-span-1  text-white overflow-y-auto px-4  duration-700 transition-all ${
            animateOut ? "animate-slide-out" : "animate-slide-in"
          }
            ${
              facturaSeleccionada.numero_factura ? "bg-white" : "bg-[#171931]"
            }  
          `}
        >
          {isModalOpen && (
            <div className="h-screen w-full bg-black/40 fixed inset-0 z-10 flex justify-center items-center">
              <div className="bg-white p-4 rounded shadow-lg text-black">
                <h1 className="text-center text-2xl font-semibold">
                  Productos Adicionales
                </h1>
                <div className="overflow-auto mt-4">
                  <table className="w-full table-auto border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-200 text-left">
                        <th className="border p-2">Imagen</th>
                        <th className="border p-2">Nombre</th>
                        <th className="border p-2">Stock</th>
                        <th className="border p-2">Cantidad</th>
                        <th className="border p-2">Precio</th>
                        <th className="border p-2">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosAdicionales.map((producto) => (
                        <tr key={producto.id_inventario}>
                          {/* Imagen */}
                          <td className="border p-2 text-center">
                            <img
                              src={
                                producto.image_path
                                  ? `https://new.imporsuitpro.com/${producto.image_path}`
                                  : "https://via.placeholder.com/50x50?text=No+Imagen"
                              }
                              alt={producto.nombre_producto}
                              className="w-16 h-16 object-cover rounded"
                            />
                          </td>
                          {/* Nombre */}
                          <td className="border px-4 py-2">
                            {producto.nombre_producto}
                          </td>
                          {/* Cantidad */}
                          <td className="border px-4 py-2 text-sm text-center">
                            {producto.saldo_stock > 0
                              ? producto.saldo_stock
                              : "Sin Stock"}
                          </td>
                          {/* Cantidad */}
                          <td className="border px-4 py-2 text-center">
                            <input
                              type="number"
                              id={`cantidad_adicional` + producto.id_inventario}
                              className="w-16 px-2 py-1 border rounded"
                              defaultValue={1}
                            />
                          </td>

                          {/* Precio */}
                          <td className="border relative px-4 py-2 items-center gap-2">
                            <span className="absolute text-gray-400 top-1/2 -translate-y-1/2 left-8 text-sm">
                              $
                            </span>
                            <input
                              type="text"
                              className="w-16 px-3 py-1 border rounded"
                              defaultValue={producto.pvp || 0}
                              onChange={(e) => {
                                producto.pvp = e.target.value;
                              }}
                            />
                          </td>

                          {/* Botón de Agregar */}
                          <td className="border px-4 py-2 text-center">
                            {producto.saldo_stock > 0 ? (
                              <button
                                className="bg-green-500 text-white px-3 py-1 rounded"
                                onClick={() => agregarProducto(producto)}
                                disabled={producto.saldo_stock <= 0}
                              >
                                Agregar
                              </button>
                            ) : (
                              <button
                                className="bg-red-500 text-white px-3 py-1 rounded"
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
                <div className="flex justify-between items-center mt-4">
                  {/* Botón Anterior */}
                  <button
                    className="bg-gray-300 px-3 py-1 rounded"
                    onClick={() => cargarProductosAdicionales(paginaActual - 1)}
                    disabled={paginaActual === 1}
                  >
                    Anterior
                  </button>
                  {/* Paginación */}
                  <span>
                    Página {paginaActual} de {totalPaginas}
                  </span>
                  {/* Botón Siguiente */}
                  <button
                    className="bg-gray-300 px-3 py-1 rounded"
                    onClick={() => cargarProductosAdicionales(paginaActual + 1)}
                    disabled={paginaActual === totalPaginas}
                  >
                    Siguiente
                  </button>
                </div>
                {/* Botón Cerrar */}
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded mt-4"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cerrar
                </button>
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
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
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
                        placeholder="Calle secundaria"
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
                        placeholder="Calle secundaria"
                        {...register("observacion")}
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
                        onClick={handleAccordionToggle}
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
