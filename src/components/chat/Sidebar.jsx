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
  setSelectedNovedad,
  selectedNovedad,
  Loading,
  validar_estadoLaar,
  validar_estadoServi,
  validar_estadoGintracom,
  validar_estadoSpeed,
  selectedTab,
  setSelectedTab,
  mensajesAcumulados,
  mensajesVisibles,
  setMensajesVisibles,
  scrollRef,
  handleScrollMensajes,
}) => {
  return (
    <>
      {" "}
      <div
        ref={scrollRef}
        onScroll={handleScrollMensajes}
        className={`bg-white overflow-y-auto overflow-x-hidden h-[calc(100vh_-_130px)] ${
          selectedChat ? "hidden sm:block" : "block"
        }`}
      >
        <div className="p-4">
          {/* Buscador */}
          <div className="flex flex-col items-center gap-2">
            {/* Pestañas de filtro */}
            <div className="flex w-full justify-between border-b border-gray-500">
              <button
                className={`flex-1 text-center py-2 font-semibold transition ${
                  selectedTab === "abierto"
                    ? "border-b-2 border-blue-500 text-blue-500"
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => setSelectedTab("abierto")}
              >
                <i className="bx bx-download pr-2"></i> ABIERTO
              </button>
              <button
                className={`flex-1 text-center py-2 font-semibold transition ${
                  selectedTab === "resueltos"
                    ? "border-b-2 border-blue-500 text-blue-500"
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => setSelectedTab("resueltos")}
              >
                <i className="bx bx-check pr-2"></i> RESUELTOS
              </button>
            </div>
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

              {/* Select para etiquetas */}
              <Select
                isClearable
                options={[
                  { value: "gestionadas", label: "Gestionadas" },
                  { value: "no_gestionadas", label: "No Gestionadas" },
                ]}
                value={selectedNovedad} // Estado para el select de transportadora
                onChange={(selectedOption) =>
                  setSelectedNovedad(selectedOption)
                }
                placeholder="Selecciona novedad"
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
                onChange={(selectedOption) => {
                  setSelectedTransportadora(selectedOption);
                  if (!selectedOption) {
                    setSelectedEstado([]); // Limpia el estado si se borra la transportadora
                  }
                }}
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
              mensajesAcumulados.length === 0 ? (
                // Aún no llegan los mensajes, mostrar loader
                <div className="h-64 flex justify-center items-center">
                  <Loading />
                </div>
              ) : (
                // Ya llegaron pero no hay coincidencias
                <div className="h-64 flex justify-center items-center text-gray-500">
                  No se encontraron chats.
                </div>
              )
            ) : (
              filteredChats.slice(0, mensajesVisibles).map((mensaje, index) => {
                // Función para validar el estado de la guía según la transportadora
                const obtenerEstadoGuia = (
                  transporte,
                  estadoFactura,
                  novedadInfo
                ) => {
                  let estado_guia = { color: "", estado_guia: "" };

                  switch (transporte) {
                    case "LAAR":
                      estado_guia = validar_estadoLaar(estadoFactura);
                      break;
                    case "SERVIENTREGA":
                      estado_guia = validar_estadoServi(estadoFactura);
                      break;
                    case "GINTRACOM":
                      estado_guia = validar_estadoGintracom(estadoFactura);
                      break;
                    case "SPEED":
                      estado_guia = validar_estadoSpeed(estadoFactura);
                      break;
                    default:
                      estado_guia = { color: "", estado_guia: "" }; // No mostrar nada si es desconocido
                      break;
                  }

                  // Validar si el estado de la guía es "Novedad"
                  if (estado_guia.estado_guia === "Novedad") {
                    try {
                      // Parsear novedad_info si es string, o usar directamente si es un objeto
                      const parsedNovedadInfo =
                        typeof novedadInfo === "string"
                          ? JSON.parse(novedadInfo)
                          : novedadInfo;

                      // Verificar si "terminado" o "solucionada" es igual a 1
                      if (
                        parsedNovedadInfo?.terminado === 1 ||
                        parsedNovedadInfo?.solucionada === 1
                      ) {
                        // Si es resuelta, cambiar estado_guia y color
                        estado_guia.estado_guia = "Novedad resuelta";
                        estado_guia.color = "bg-yellow-500";
                      }
                    } catch (error) {
                      console.error("Error al parsear novedad_info:", error);
                    }
                  }

                  return estado_guia; // Devuelve el objeto completo con estado_guia y color
                };

                // Obtener el estado de la guía
                const { color, estado_guia } = obtenerEstadoGuia(
                  mensaje.transporte,
                  mensaje.estado_factura,
                  mensaje.novedad_info // Pasar novedad_info al obtenerEstadoGuia
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
            {mensajesVisibles < filteredChats.length && (
              <div className="flex justify-center py-4">
                <span className="text-sm text-gray-500 animate-pulse">
                  Cargando más chats...
                </span>
              </div>
            )}
          </ul>
        </div>
      </div>
    </>
  );
};
