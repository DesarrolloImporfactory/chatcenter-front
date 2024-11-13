import axios from "axios";
import React, { useEffect, useState, useCallback } from "react";

const DatosUsuario = ({
  opciones,
  animateOut,
  facturasChatSeleccionado,
  socketRef,
  provincias,
  userData,
}) => {
  const [facturaSeleccionada, setFacturaSeleccionada] = useState({});
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [ciudades, setCiudades] = useState(null);
  const [tarifas, setTarifas] = useState(null);
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
  const handleAccordionToggle = () => {
    setIsAccordionOpen(!isAccordionOpen);
  };
  // Manejo de selección de factura
  const handleFacturaSeleccionada = useCallback((factura) => {
    setFacturaSeleccionada({
      ...factura,
      provincia: factura.provincia || "",
      ciudad_cot: factura.ciudad_cot || "",
    });
  }, []);

  // Manejo de cambio de cantidad
  const handleCantidadChange = (producto, increment) => {
    setFacturaSeleccionada((prev) => {
      const productosActualizados = prev.productos.map((p) =>
        p.id_detalle === producto.id_detalle
          ? { ...p, cantidad: p.cantidad + increment }
          : p
      );
      return { ...prev, productos: productosActualizados };
    });
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
        console.log("Response:", response);
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
    if (ciudades != null) {
      socketRef.current.emit("GET_TARIFAS", {
        ciudad: facturaSeleccionada.ciudad_cot,
        provincia: facturaSeleccionada.provincia,
        id_plataforma: userData.plataforma,
        monto_factura: facturaSeleccionada.monto_factura,
        recaudo: facturaSeleccionada.cod,
      });
      socketRef.current.on("DATA_TARIFAS_RESPONSE", (data) => {
        console.log(data);
      });
      return () => socketRef.current.off("DATA_TARIFAS_RESPONSE");
    }
  }, [ciudades, socketRef]);

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
                  {facturasChatSeleccionado.map((factura, index) => (
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
            </button>
            {facturaSeleccionada.numero_factura && (
              <div className="absolute text-black left-0 bg-white h-full w-full ">
                <div className="flex justify-between items-center p-4">
                  <form className="flex flex-col gap-2 w-full md:grid md:grid-cols-2">
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
                        value={facturaSeleccionada.nombre}
                        className="p-2 border rounded w-full"
                        readOnly
                      />
                    </div>
                    <div>
                      <label htmlFor="" className="text-sm font-medium">
                        Telefono
                      </label>
                      <input
                        type="text"
                        placeholder="Telefono Cliente"
                        value={facturaSeleccionada.celular}
                        className="p-2 border rounded w-full"
                        readOnly
                      />
                    </div>
                    <div>
                      <label htmlFor="" className="text-sm font-medium">
                        Provincia
                      </label>
                      {provincias && (
                        <select
                          className="p-2 border rounded w-full"
                          value={facturaSeleccionada.provincia || ""}
                          onChange={(e) => {
                            const nuevaProvincia = e.target.value;
                            setFacturaSeleccionada((prev) => ({
                              ...prev,
                              provincia: nuevaProvincia,
                              ciudad_cot: "", // Resetear la ciudad cuando cambia la provincia
                            }));
                            handleCiudades(nuevaProvincia);
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
                          className="p-2 border rounded w-full"
                          value={facturaSeleccionada.ciudad_cot || ""}
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
                        value={facturaSeleccionada.c_principal}
                        className="p-2 border rounded w-full"
                        readOnly
                      />
                    </div>
                    <div>
                      <label htmlFor="" className="text-sm font-medium">
                        Calle secundaria
                      </label>
                      <input
                        type="text"
                        placeholder="Calle secundaria"
                        value={facturaSeleccionada.c_secundaria}
                        className="p-2 border rounded w-full"
                        readOnly
                      />
                    </div>
                    <div>
                      <label htmlFor="" className="text-sm font-medium">
                        Referencia
                      </label>
                      <input
                        type="text"
                        placeholder="Calle secundaria"
                        value={facturaSeleccionada.referencia}
                        className="p-2 border rounded w-full"
                        readOnly
                      />
                    </div>
                    <div>
                      <label htmlFor="" className="text-sm font-medium">
                        Observación
                      </label>
                      <input
                        type="text"
                        placeholder="Calle secundaria"
                        value={facturaSeleccionada.observacion}
                        className="p-2 border rounded w-full"
                        readOnly
                      />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="" className="text-sm font-medium">
                        Tipo de Entrega
                      </label>
                      <select
                        name=""
                        id=""
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
                            {/* precio de flete */}
                            <div className="text-center bg-black/90 text-white rounded-b-md">
                              <p className="text-xs">50.00</p>
                            </div>
                          </div>
                        ))}
                      </div>
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
                        <div className="p-2 border border-gray-200 rounded-b-lg bg-white">
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
                                                className="p-2 border border-b border-gray-200 w-16 text-[0.65rem] md:text-[0.75rem] text-center"
                                                readOnly
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
                                                  onClick={() =>
                                                    handleIncrementarCantidad(
                                                      producto
                                                    )
                                                  }
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
                                                  onClick={() =>
                                                    handleDecrementarCantidad(
                                                      producto
                                                    )
                                                  }
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
                                              className="py-2 px-3 border rounded w-20    text-[0.65rem] md:text-[0.75rem]"
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
                                              className="py-2 px-3 border rounded w-20    text-[0.65rem] md:text-[0.75rem]"
                                              readOnly
                                              id={`total${producto.id_detalle}`}
                                            />
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                    <div className="flex justify-between mt-3">
                                      <p className="text-lg font-semibold">
                                        Total Final:
                                      </p>
                                      <span>${total.toFixed(2)}</span>
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
                <div className="text-end mx-4">
                  <button
                    className="bg-red-500 text-white rounded px-4 py-2 mt-4 w-full md:w-auto md:mt-0"
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
