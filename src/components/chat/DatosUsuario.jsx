import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
const DatosUsuario = ({
  opciones,
  animateOut,
  facturasChatSeleccionado,
  socketRef,
  provincias,
}) => {
  const [facturaSeleccionada, setFacturaSeleccionada] = useState({});
  const [ciudades, setCiudades] = useState([]);
  const handleFacturaSeleccionada = (factura) => {
    setFacturaSeleccionada(factura);

    // obtener token de autenticación
    const token = localStorage.getItem("token");

    window.open(
      "https://new.imporsuitpro.com/acceso/jwt/" +
        token +
        "/" +
        factura.id_factura,
      "_blank"
    );
  };

  const handleCiudades = async (provincia) => {
    socketRef.current.emit("GET_CIUDADES", provincia);
    socketRef.current.on("DATA_CIUDADES_RESPONSE", (ciudades) => {
      setCiudades(ciudades);
    });
  };

  const ciudadRef = useRef(null);

  useEffect(() => {
    if (ciudadRef.current) {
      ciudadRef.current.addEventListener("change", (e) => {
        console.log(e.target.value);
      });
    }
  }, [ciudades]);

  return (
    <>
      {opciones && (
        <div
          className={`relative col-span-1 bg-[#171931] text-white  overflow-y-hidden  p-4 ${
            animateOut ? "animate-slide-out" : "animate-slide-in"
          }`}
        >
          <div className="flex justify-center overflow-y-auto h-[600px] ">
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th className="border px-2 md:px-4 text-[0.65rem] md:text-[0.75rem] py-2">
                    Número Factura
                  </th>
                  <th className="border px-2 md:px-4 text-[0.65rem] md:text-[0.75rem] py-2">
                    Nombre Cliente
                  </th>
                  <th className="border px-2 md:px-4 text-[0.65rem] md:text-[0.75rem] py-2">
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
                        className="bg-blue-500 text-white px-2 md:px-4 py-1 md:py-2 rounded text-[0.65rem] md:text-[0.75rem]"
                        onClick={() => handleFacturaSeleccionada(factura)}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* botonn generar nuevo pedido */}

            {/*     <button
              className="bg-green-500 text-white rounded px-2 md:px-4 py-1 md:py-2 absolute bottom-10 left-5"
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
            {/* {facturaSeleccionada.numero_factura && (
              <div className="absolute text-black left-0 bg-white h-full w-full ">
                <div className="flex justify-between items-center p-4">
                  <form className="grid items-center gap-2 my-4">
                    <div>
                      <label htmlFor="">Nombre Cliente</label>
                      <input
                        type="text"
                        placeholder="Nombre Cliente"
                        value={facturaSeleccionada.nombre}
                        className="p-2 border rounded"
                        readOnly
                      />
                    </div>
                    <div>
                      <label htmlFor="">Telefono</label>
                      <input
                        type="text"
                        placeholder="Telefono Cliente"
                        value={facturaSeleccionada.celular}
                        className="p-2 border rounded"
                        readOnly
                      />
                    </div>
                    <div>
                      <label htmlFor="">Provincia</label>
                      {provincias && (
                        <select
                          className="p-2 border rounded"
                          onChange={(e) => handleCiudades(e.target.value)}
                        >
                          <option value="">Seleccione una provincia</option>
                          {provincias.map((provincia, index) => (
                            <option
                              key={index}
                              value={provincia.codigo_provincia}
                              selected={
                                provincia.codigo_provincia ===
                                facturaSeleccionada.provincia
                              }
                            >
                              {provincia.provincia}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label htmlFor="">Ciudad</label>
                      {ciudades && (
                        <select className="p-2 border rounded" ref={ciudadRef}>
                          <option value="">Seleccione una ciudad</option>
                          {ciudades.map((ciudad, index) => (
                            <option key={index} value={ciudad.ciudad}>
                              {ciudad.ciudad}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label htmlFor="">Nombre Cliente</label>
                      <input
                        type="text"
                        placeholder="Nombre Cliente"
                        value={facturaSeleccionada.nombre}
                        className="p-2 border rounded"
                        readOnly
                      />
                    </div>
                    <div>
                      <label htmlFor="">Nombre Cliente</label>
                      <input
                        type="text"
                        placeholder="Nombre Cliente"
                        value={facturaSeleccionada.nombre}
                        className="p-2 border rounded"
                        readOnly
                      />
                    </div>
                  </form>
                </div>

                <button className="bg-red-500 text-white rounded px-2 md:px-4 py-1 absolute  bottom-10 left-5 md:py-2">
                  Cerrar
                </button>
              </div>
            )} */}
          </div>
        </div>
      )}
    </>
  );
};

export default DatosUsuario;
