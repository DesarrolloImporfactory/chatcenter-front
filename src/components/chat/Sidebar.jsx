import Select from "react-select";
import { useState, useRef, useEffect } from "react";

export const Sidebar = ({
  setSearchTerm,
  setNumeroModal,
  handleSelectChat,
  acortarTexto,
  filteredChats,
  searchTerm,
  selectedChat,
  chatTemporales,
  formatFecha,
  setFiltro_chats,
  filtro_chats,
  handleFiltro_chats,
  setSearchTermEtiqueta,
  searchTermEtiqueta,
  etiquetas_api,
  selectedEtiquetas,
  setSelectedEtiquetas,
  handleChange,
  etiquetasOptions,
  selectedEstado,
  setSelectedEstado,
  selectedTransportadora,
  setSelectedTransportadora,
  Loading,
}) => {
  function validar_estadoLaar(estado) {
    let color = "";
    let estado_guia = "";

    if (estado == 1) {
      color = "bg-purple-500";
      estado_guia = "Generado";
    } else if (estado == 2) {
      color = "bg-purple-500";
      estado_guia = "Por recolectar";
    } else if (estado == 3) {
      color = "bg-purple-500";
      estado_guia = "Recolectado";
    } else if (estado == 4) {
      color = "bg-purple-500";
      estado_guia = "En bodega";
    } else if (estado == 5) {
      color = "bg-yellow-500";
      estado_guia = "En transito";
    } else if (estado == 6) {
      color = "bg-yellow-500";
      estado_guia = "Zona de entrega";
    } else if (estado == 7) {
      color = "bg-green-500";
      estado_guia = "Entregado";
    } else if (estado == 8) {
      color = "bg-red-500";
      estado_guia = "Anulado";
    } else if (estado == 11 || estado == 12) {
      color = "bg-yellow-500";
      estado_guia = "En transito";
    } else if (estado == 14) {
      color = "bg-red-500";
      estado_guia = "Con novedad";
    } else if (estado == 9) {
      color = "bg-red-500";
      estado_guia = "Devuelto";
    }

    return {
      color,
      estado_guia,
    };
  }

  function validar_estadoServi(estado) {
    let color = "";
    let estado_guia = "";

    if (estado == 101) {
      color = "bg-red-500";
      estado_guia = "Anulado";
    } else if (estado == 100 || estado == 102 || estado == 103) {
      color = "bg-purple-500";
      estado_guia = "Generado";
    } else if (estado == 200 || estado == 201 || estado == 202) {
      color = "bg-purple-500";
      estado_guia = "Recolectado";
    } else if (estado >= 300 && estado <= 317) {
      color = "bg-yellow-500";
      estado_guia = "Procesamiento";
    } else if (estado >= 400 && estado <= 403) {
      color = "bg-green-500";
      estado_guia = "Entregado";
    } else if (estado >= 318 && estado <= 351) {
      color = "bg-red-500";
      estado_guia = "Con novedad";
    } else if (estado >= 500 && estado <= 502) {
      color = "bg-red-500";
      estado_guia = "Devuelto";
    }

    return {
      color,
      estado_guia,
    };
  }

  function validar_estadoGintracom(estado) {
    let color = "";
    let estado_guia = "";

    if (estado == 1) {
      color = "bg-purple-500";
      estado_guia = "Generada";
    } else if (estado == 2) {
      color = "bg-yellow-500";
      estado_guia = "Picking";
    } else if (estado == 3) {
      color = "bg-yellow-500";
      estado_guia = "Packing";
    } else if (estado == 4) {
      color = "bg-yellow-500";
      estado_guia = "En tránsito";
    } else if (estado == 5) {
      color = "bg-yellow-500";
      estado_guia = "En reparto";
    } else if (estado == 6) {
      color = "bg-purple-500";
      estado_guia = "Novedad";
    } else if (estado == 7) {
      color = "bg-green-500";
      estado_guia = "Entregada";
    } else if (estado == 8) {
      color = "bg-red-500";
      estado_guia = "Devolución";
    } else if (estado == 9) {
      color = "bg-red-500";
      estado_guia = "Devolución Entregada a Origen";
    } else if (estado == 10) {
      color = "bg-red-500";
      estado_guia = "Cancelada por transportadora";
    } else if (estado == 11) {
      color = "bg-red-500";
      estado_guia = "Indemnización";
    } else if (estado == 12) {
      color = "bg-red-500";
      estado_guia = "Anulada";
    } else if (estado == 13) {
      color = "bg-red-500";
      estado_guia = "Devolución en tránsito";
    }

    return {
      color,
      estado_guia,
    };
  }

  function validar_estadoSpeed(estado) {
    let color = "";
    let estado_guia = "";

    if (estado == 2) {
      color = "bg-purple-500";
      estado_guia = "Generado";
    } else if (estado == 3) {
      color = "bg-yellow-500";
      estado_guia = "En transito";
    } else if (estado == 7) {
      color = "bg-green-500";
      estado_guia = "Entregado";
    } else if (estado == 9) {
      color = "bg-red-500";
      estado_guia = "Devuelto";
    } else if (estado == 14) {
      color = "bg-purple-500";
      estado_guia = "Novedad";
    }

    return {
      color,
      estado_guia,
    };
  }

  return (
    <>
      {" "}
      <div
        className={`bg-white overflow-y-auto h-[calc(100vh_-_130px)] ${
          selectedChat ? "hidden sm:block" : "block"
        }`}
      >
        <div className="p-4">
          {/* Buscador */}
          <div className="flex flex-column items-center gap-2">
            <div className="flex w-full items-center gap-2">
              <input
                type="text"
                placeholder="Buscar"
                className="w-full p-2 border rounded"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i
                onClick={setNumeroModal}
                className="bg-blue-500 text-white rounded hover:cursor-pointer hover:bg-blue-400 text-2xl p-1 bx bx-plus-circle"
              ></i>
              <i
                onClick={handleFiltro_chats}
                className="text-gray-600 rounded hover:cursor-pointer hover:text-black text-2xl p-1 bx bx-filter"
              ></i>
            </div>
            {/* Div con animación */}
            <div
              className={`mt-4 transform transition-all duration-500 ${
                filtro_chats
                  ? "opacity-100 scale-100 max-h-screen w-full"
                  : "opacity-0 scale-95 max-h-0 w-full overflow-hidden"
              }`}
            >
              {/* Select para etiquetas */}
              <Select
                isMulti
                options={etiquetasOptions}
                value={selectedEtiquetas}
                onChange={handleChange}
                placeholder="Selecciona etiquetas"
                className="w-full mb-4"
                classNamePrefix="react-select"
                menuPortalTarget={document.body} // Renderiza el menú en el body para evitar problemas de scroll
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }), // Asegura que el menú esté encima de otros elementos
                }}
              />

              {/* Select para transportadora */}
              <Select
                isClearable
                options={[
                  { value: "LAAR", label: "Laar" },
                  { value: "SPEED", label: "Speed" },
                  { value: "SERVIENTREGA", label: "Servientrega" },
                  { value: "GINTRACOM", label: "Gintracom" },
                ]}
                value={selectedTransportadora} // Estado para el select de transportadora
                onChange={(selectedOption) =>
                  setSelectedTransportadora(selectedOption)
                }
                placeholder="Selecciona transportadora"
                className="w-full mb-4"
                classNamePrefix="react-select"
                menuPortalTarget={document.body} // Renderiza el menú en el body para evitar problemas de scroll
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }), // Asegura que el menú esté encima de otros elementos
                }}
              />

              {/* Select para estados (siempre oculto hasta que se seleccione transportadora) */}
              {selectedTransportadora ? (
                <div className="transition-all duration-500 opacity-100 scale-100 max-h-screen mb-4">
                  <Select
                    isClearable
                    options={[
                      { value: "Generada", label: "Generada / Por recolectar" },
                      {
                        value: "En transito",
                        label: "En transito / Procesamiento / En ruta",
                      },
                      { value: "Entregada", label: "Entregada" },
                      { value: "Novedad", label: "Novedad" },
                      { value: "Devolucion", label: "Devolución" },
                    ]}
                    value={selectedEstado} // Estado para el select de estado
                    onChange={(selectedOption) =>
                      setSelectedEstado(selectedOption)
                    }
                    placeholder="Selecciona estado"
                    className="w-full"
                    classNamePrefix="react-select"
                    menuPortalTarget={document.body} // Renderiza el menú en el body para evitar problemas de scroll
                    styles={{
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }), // Asegura que el menú esté encima de otros elementos
                    }}
                  />
                </div>
              ) : (
                <div className="hidden"></div>
              )}
            </div>
          </div>
          <ul className="">
            {/* Verificar si no hay mensajes */}
            {filteredChats.length === 0 ? (
              <div className="h-64 flex justify-center items-center">
                <Loading />
              </div>
            ) : (
              filteredChats.map((mensaje, index) => {
                // Función para validar el estado de la guía según la transportadora
                const obtenerEstadoGuia = (transporte, estadoFactura) => {
                  switch (transporte) {
                    case "LAAR":
                      return validar_estadoLaar(estadoFactura);
                    case "SERVIENTREGA":
                      return validar_estadoServi(estadoFactura);
                    case "GINTRACOM":
                      return validar_estadoGintracom(estadoFactura);
                    case "SPEED":
                      return validar_estadoSpeed(estadoFactura);
                    default:
                      return { color: "", estado_guia: "" }; // No mostrar nada si es desconocido
                  }
                };

                // Obtener el estado de la guía
                const { color, estado_guia } = obtenerEstadoGuia(
                  mensaje.transporte,
                  mensaje.estado_factura
                );

                return (
                  <li
                    key={mensaje.id}
                    className={`flex items-center justify-between p-2 hover:bg-gray-200 ${
                      selectedChat === mensaje ? "bg-gray-200" : ""
                    }`}
                    onClick={() => handleSelectChat(mensaje)}
                  >
                    <div className="flex items-center space-x-3 relative w-full sm:w-auto">
                      <img
                        className="rounded-full w-10 h-10 sm:w-12 sm:h-12"
                        src="https://tiendas.imporsuitpro.com/imgs/react/user.png"
                        alt="Profile"
                      />
                      <div className="flex-1 min-w-0">
                        {/* Nombre del cliente */}
                        <span className="block text-black font-medium truncate">
                          {acortarTexto(mensaje.nombre_cliente, 10, 25)}
                        </span>
                        {/* Número de teléfono */}
                        <span className="text-xs sm:text-sm text-black truncate">
                          {acortarTexto(mensaje.celular_cliente, 10, 15)}
                        </span>
                        {/* Texto del mensaje */}
                        <span className="block text-xs sm:text-sm text-gray-600 truncate">
                          {mensaje.texto_mensaje?.length > chatTemporales
                            ? mensaje.texto_mensaje.includes("{{") &&
                              mensaje.ruta_archivo
                              ? mensaje.texto_mensaje
                                  .replace(/\{\{(.*?)\}\}/g, (match, key) => {
                                    const valores = JSON.parse(
                                      mensaje.ruta_archivo
                                    );
                                    return valores[key.trim()] || match;
                                  })
                                  .substring(0, chatTemporales) + "..."
                              : mensaje.texto_mensaje.substring(
                                  0,
                                  chatTemporales
                                ) + "..."
                            : mensaje.texto_mensaje}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between ml-2 sm:ml-4">
                      {/* Estado de la guía (arriba a la derecha) */}
                      {estado_guia && (
                        <span
                          className={`text-xs sm:text-sm px-2 py-1 rounded-full text-white mb-1 ${color}`}
                        >
                          {estado_guia}
                        </span>
                      )}
                      {/* Hora del mensaje */}
                      <span className="text-xs sm:text-sm text-gray-600">
                        {formatFecha(mensaje.mensaje_created_at)}
                      </span>
                      {/* Mensajes acumulados */}
                      {mensaje.mensajes_pendientes > 0 && (
                        <span className="mt-1 w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                          {mensaje.mensajes_pendientes}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </>
  );
};
