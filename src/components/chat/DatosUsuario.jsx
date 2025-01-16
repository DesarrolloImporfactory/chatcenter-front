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
    if (transportadora === 4) {
      formulario.append(
        "contiene",
        facturaSeleccionada.productos
          .map((p) => `${p.nombre_producto} X${p.cantidad}`)
          .join(" ")
      );
      formulario.append("provinciaO", getValues("provinciaO") || "");
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
          `http://localhost:3000/api/v1/product/${facturaSeleccionada.productos[0].bodega}`,
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
    setFacturaSeleccionada((prev) => ({
      ...prev,
      productos: [
        ...prev.productos,
        { ...producto, cantidad: 1, total: producto.precio },
      ],
    }));
  };

  useEffect(() => {
    if (facturaSeleccionada.ciudad_cot) {
      setValue("ciudad", facturaSeleccionada.ciudad_cot);
    }
  }, [ciudades]);

  useEffect(() => {
    setFacturaSeleccionada({});
    if (facturasChatSeleccionado) {
      if (facturasChatSeleccionado.length === 1) {
        handleFacturaSeleccionada(facturasChatSeleccionado[0]);
      }
    }
  }, [facturasChatSeleccionado]);

  // Manejo de selección de factura
  const handleFacturaSeleccionada = useCallback((factura) => {
    console.log(factura);
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
    setValue("ciudadO", factura.ciudad_cot || "");
    setValue("direccionO", factura.direccionO || "");
    setValue("celularO", factura.telefonoO || "");
    setValue("referenciaO", factura.referenciaO || "");
    setValue("provinciaO", factura.provinciaO || "");
  }, []);

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

          <div className="flex justify-center overflow-y-auto h-full md:h-[600px]">
            <div className="w-full overflow-x-auto">
              <table className="table-auto w-full">
                <thead>
                  <tr>
                    <th className="border px-2 py-2 text-xs md:px-4 md:text-sm">
                      Número Factura
                    </th>
                    <th className="border px-2 py-2 text-xs md:px-4 md:text-sm">
                      Nombre Cliente
                    </th>
                    <th className="border px-2 py-2 text-xs md:px-4 md:text-sm">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {facturasChatSeleccionado &&
                    facturasChatSeleccionado.map((factura, index) => (
                      <tr key={index}>
                        <td className="border px-2 md:px-4 py-2 text-[0.65rem] md:text-[0.75rem]">
                          {factura.numero_factura}
                        </td>
                        <td className="border px-2 md:px-4 py-2 text-[0.65rem] md:text-[0.75rem]">
                          {factura.nombre}
                        </td>
                        <td className="border px-2 md:px-4 py-2">
                          <button
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs md:px-4 md:py-2 md:text-sm"
                            onClick={() => handleFacturaSeleccionada(factura)}
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
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
                        className="p-1 text-sm border rounded w-full"
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
                        className="p-1 text-sm border rounded w-full"
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
                          className="p-1 text-sm border rounded w-full"
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
                          className="p-1 text-sm border rounded w-full"
                          {...register("ciudad")}
                          onChange={(e) => {
                            const nuevaCiudad = e.target.value;
                            setFacturaSeleccionada((prev) => ({
                              ...prev,
                              ciudad_cot: nuevaCiudad,
                            }));
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
                        className="p-1 text-sm border rounded w-full"
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
                        className="p-1 text-sm border rounded w-full"
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
                        className="p-1 text-sm border rounded w-full"
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
                        className="p-1 text-sm border rounded w-full"
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
                        className="p-1 text-sm border rounded w-full"
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
                            {/* precio de flete */}
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
                                  {image.id === 1
                                    ? tarifas.servientrega
                                    : image.id === 2
                                    ? tarifas.laar
                                    : image.id === 3
                                    ? tarifas.speed
                                    : image.id === 4
                                    ? tarifas.gintracom
                                    : 0}
                                </span>
                              ) : (
                                <span className="text-sm">0</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Acordeon de productos */}
                    <div className="col-span-2 ">
                      <button
                        className="flex justify-between w-full text-left py-2 px-2 bg-[#171931] text-white rounded-t-lg"
                        onClick={handleAccordionToggle}
                        type="button"
                      >
                        <h3 className="font-medium">Productos</h3>
                        <span>{isAccordionOpen ? "▲" : "▼"}</span>
                      </button>
                      {isAccordionOpen && (
                        <div className="p-1 text-sm border border-gray-200 rounded-b-lg bg-white">
                          <ul>
                            {/* Mapea los productos de tu factura seleccionada */}
                            {facturaSeleccionada.productos?.map(
                              (producto, index) => (
                                <li
                                  key={index}
                                  className="flex justify-between border-b"
                                >
                                  <input
                                    type="hidden"
                                    id={`producto${producto.id_detalle}`}
                                    value={producto.id_detalle}
                                  />
                                  <input
                                    type="hidden"
                                    id={`sku${producto.id_detalle}`}
                                    value={producto.sku}
                                  />
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
                                        <tr className="">
                                          <td className="border px-2 md:px-4 py-2 text-[0.65rem] w-full md:text-[0.75rem]">
                                            {producto.nombre_producto}
                                          </td>
                                          <td className="border px-1 md:px-4 py-2 text-[0.65rem] md:text-[0.75rem]">
                                            <div className="flex items-center space-x-1">
                                              {/* Input de Cantidad */}
                                              <input
                                                type="number"
                                                value={producto.cantidad}
                                                className="p-1 text-sm border border-b border-gray-200 w-12 text-[0.65rem] md:text-[0.75rem] text-center"
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

                                          <td className="border relative px-1 md:px-4 py-2 text-[0.65rem] md:text-[0.75rem]">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                              <span className="text-gray-500 sm:text-sm">
                                                $
                                              </span>
                                            </div>
                                            <input
                                              type="text"
                                              value={producto.precio_venta}
                                              className="py-2 px-3 border rounded w-16   text-[0.65rem] md:text-[0.75rem]"
                                              id={`precio${producto.id_detalle}`}
                                              onChange={(e) =>
                                                handlePrecioChange(
                                                  producto,
                                                  e.target.value
                                                )
                                              }
                                            />
                                          </td>

                                          <td className="border relative px-1 md:px-4 py-2 text-[0.65rem] md:text-[0.75rem]">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                              <span className="text-gray-500 sm:text-sm">
                                                $
                                              </span>
                                            </div>
                                            <input
                                              type="text"
                                              value={
                                                producto.precio_venta *
                                                producto.cantidad
                                              }
                                              className="py-2 px-3 border rounded w-16    text-[0.65rem] md:text-[0.75rem]"
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
                                      </tbody>
                                    </table>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setIsModalOpen(true);
                                      }}
                                      className="bg-green-500 text-white text-xs rounded px-4 py-2 mt-2 w-full md:w-auto "
                                    >
                                      Añadir Producto
                                    </button>
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
                                      <input
                                        type="hidden"
                                        id="factura"
                                        value={facturaSeleccionada.id_factura}
                                      />
                                    </div>
                                  </div>
                                </li>
                              )
                            )}
                          </ul>
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
