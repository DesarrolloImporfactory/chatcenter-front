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
}) => {
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
          <div className="flex items-center gap-2">
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
            </div>
          </div>
          <ul className="">
            {/* Todos los mensajes filtrados */}
            {filteredChats.map((mensaje, index) => (
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
                    {/* Acortar el nombre del cliente */}
                    <span className="block text-black font-medium truncate">
                      {acortarTexto(mensaje.nombre_cliente, 10, 25)}
                    </span>
                    {/* Acortar el número de teléfono */}
                    <span className="text-xs sm:text-sm text-black truncate">
                      {acortarTexto(mensaje.celular_cliente, 10, 15)}
                    </span>
                    {/* Acortar el texto del mensaje */}
                    <span className="block text-xs sm:text-sm text-gray-600 truncate">
                      {mensaje.texto_mensaje?.length > chatTemporales
                        ? mensaje.texto_mensaje.includes("{{") &&
                          mensaje.ruta_archivo
                          ? mensaje.texto_mensaje
                              .replace(/\{\{(.*?)\}\}/g, (match, key) => {
                                // Parsear la ruta_archivo que contiene el JSON con los valores
                                const valores = JSON.parse(
                                  mensaje.ruta_archivo
                                );
                                // Retornar el valor si existe, de lo contrario dejar el placeholder
                                return valores[key.trim()] || match;
                              })
                              .substring(0, chatTemporales) + "..."
                          : mensaje.texto_mensaje.substring(0, chatTemporales) +
                            "..."
                        : mensaje.texto_mensaje}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between ml-2 sm:ml-4">
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
            ))}
          </ul>
        </div>
      </div>
    </>
  );
};
