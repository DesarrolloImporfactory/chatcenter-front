import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
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

  const handleImageClick = (id) => {
    setSelectedImageId(id);
  };

  const [ciudades, setCiudades] = useState([]);
  const handleFacturaSeleccionada = (factura) => {
    console.log("Factura seleccionada:", factura);

    setFacturaSeleccionada({
      ...factura,
      provincia: factura.provincia || "", // Asegúrate de que no es undefined
      ciudad_cot: factura.ciudad_cot || "",
    });
  };

  const handleCiudades = (provincia) => {
    console.log("Solicitando ciudades para la provincia:", provincia);

    setCiudades([]); // Limpia las ciudades antes de cargar las nuevas
    if (socketRef && socketRef.current) {
      socketRef.current.emit("GET_CIUDADES", provincia);
    }
  };

  useEffect(() => {
    if (socketRef && socketRef.current) {
      const handleDataCiudadesResponse = (ciudadesRecibidas) => {
        console.log("Ciudades recibidas:", ciudadesRecibidas);
        setCiudades(ciudadesRecibidas);
      };

      socketRef.current.on(
        "DATA_CIUDADES_RESPONSE",
        handleDataCiudadesResponse
      );
      // obtener tarifas
      // obtener ciudad seleccionada
      const selectedCiudad = ciudades.find(
        (ciudad) => ciudad.id_cotizacion === facturaSeleccionada.ciudad_cot
      );
      socketRef.current.emit("GET_TARIFAS", {
        ciudad: selectedCiudad,
        provincia: facturaSeleccionada.provincia,
        id_plataforma: userData.plataforma,
      });

      return () => {
        socketRef.current.off(
          "DATA_CIUDADES_RESPONSE",
          handleDataCiudadesResponse
        );
      };
    } else {
      console.warn(
        "socketRef o socketRef.current no está disponible en useEffect"
      );
    }
  }, [socketRef, socketRef.current]);

  // Llama a handleCiudades cuando facturaSeleccionada.provincia cambie
  useEffect(() => {
    if (facturaSeleccionada.provincia) {
      console.log("Provincia seleccionada:", facturaSeleccionada.provincia);

      handleCiudades(facturaSeleccionada.provincia);
    }
  }, [facturaSeleccionada.provincia]);

  return (
    <>
      {opciones && (
        <div
          className={`relative col-span-1 bg-[#171931] text-white overflow-y-hidden p-4 ${
            animateOut ? "animate-slide-out" : "animate-slide-in"
          }`}
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
                      <div className="grid sm:grid-cols-2 md:grid-cols-4 justify-center items-center gap-4">
                        {images.map((image) => (
                          <div key={image.id} className="flex justify-center">
                            <img
                              src={image.src}
                              alt={image.alt}
                              className={`w-20 cursor-pointer transform transition duration-300 ${
                                selectedImageId === image.id
                                  ? "filter-none shadow-lg border-2 border-blue-500"
                                  : "filter grayscale"
                              } hover:scale-105 hover:shadow-lg hover:grayscale-0`}
                              onClick={() => handleImageClick(image.id)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </form>
                </div>

                <button
                  className="bg-red-500 text-white rounded px-4 py-2 absolute bottom-4 left-4 md:bottom-10 md:left-5"
                  onClick={() => setFacturaSeleccionada({})}
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DatosUsuario;
