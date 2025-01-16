import { useState, useRef, useEffect } from "react";
import CustomAudioPlayer from "./CustomAudioPlayer";
import ImageWithModal from "./modales/ImageWithModal";
import EmojiPicker from "emoji-picker-react";

const ChatPrincipal = ({
  mensajesOrdenados,
  opciones,
  endOfMessagesRef,
  mensaje,
  handleInputChange,
  inputRef,
  handleSendMessage,
  grabando,
  startRecording,
  stopRecording,
  file,
  setEmojiOpen,
  emojiOpen,
  emojiPickerRef,
  handleEmojiClick,
  isChatBlocked,
  isCommandActive,
  formatFecha,
  menuSearchTerm,
  handleMenuSearchChange,
  inputSearchRef,
  searchResults,
  handleOptionSelect,
  isMenuOpen,
  setIsMenuOpen,
  handleModal_enviarArchivos,
  getFileIcon,
  selectedChat,
  setNumeroModal,
  handleSelectPhoneNumber,
}) => {
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const [ultimoMensaje, setUltimoMensaje] = useState(null);

  useEffect(() => {
    if (mensajesOrdenados && mensajesOrdenados.length > 0) {
      setUltimoMensaje(mensajesOrdenados[mensajesOrdenados.length - 1]);
    } else {
      setUltimoMensaje(null); // Si no hay mensajes, limpia el último mensaje
    }
  }, [mensajesOrdenados]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !isChatBlocked && mensaje.trim()) {
      e.preventDefault(); // Evita el salto de línea en el input
      handleSendMessage(); // Llama a la función de envío de mensaje
    }
  };
  return (
    <>
      <div
        className={`${
          opciones ? "col-span-2" : "col-span-3"
        } bg-gray-100 relative ${
          selectedChat === null || (opciones && window.innerWidth <= 640)
            ? "hidden sm:block"
            : "block"
        }`}
      >
        {/* Mostrar un div vacío si selectedChat es null */}
        {selectedChat === null ? (
          <div className="flex justify-center items-center h-full">
            {/* Aquí puedes agregar una imagen o contenido más adelante */}
            {/* Ejemplo: */}
            {/* <img
              src="https://via.placeholder.com/150"
              alt="Sin chat seleccionado"
              className="w-40 h-40"
            /> */}
          </div>
        ) : (
          <div className="flex flex-col h-[calc(100vh_-_130px)] relative">
            {/* Mensajes */}
            <div className="flex flex-col flex-grow p-4 space-y-5 max-h-[calc(100vh_-_200px)]  overflow-y-auto">
              {mensajesOrdenados.map((mensaje) => (
                <div
                  key={mensaje.id + Math.random()}
                  className={`flex ${
                    mensaje.rol_mensaje === 1 ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`p-4 ${
                      mensaje.rol_mensaje === 1
                        ? "bg-blue-500 text-white"
                        : "bg-white"
                    } rounded-lg min-w-[20%] shadow-md max-w-[70%] relative`}
                  >
                    <span className="text-sm">
                      {mensaje.tipo_mensaje === "text" ? (
                        mensaje.texto_mensaje.includes("{{") &&
                        mensaje.ruta_archivo ? (
                          <p>
                            {mensaje.texto_mensaje.replace(
                              /\{\{(.*?)\}\}/g,
                              (match, key) => {
                                // Parsear la ruta_archivo que contiene el JSON con los valores
                                const valores = JSON.parse(
                                  mensaje.ruta_archivo
                                );
                                // Retornar el valor si existe, de lo contrario dejar el placeholder
                                return valores[key.trim()] || match;
                              }
                            )}
                          </p>
                        ) : (
                          <p>{mensaje.texto_mensaje}</p>
                        )
                      ) : mensaje.tipo_mensaje === "audio" ? (
                        <CustomAudioPlayer
                          src={
                            "https://new.imporsuitpro.com/" +
                            mensaje.ruta_archivo
                          }
                        />
                      ) : mensaje.tipo_mensaje === "image" ? (
                        <ImageWithModal mensaje={mensaje} />
                      ) : mensaje.tipo_mensaje === "document" ? (
                        <div className="p-2">
                          <a
                            href={`https://new.imporsuitpro.com/${
                              JSON.parse(mensaje.ruta_archivo).ruta
                            }`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg shadow-md hover:bg-gray-100 transition-colors"
                          >
                            {/* Icono del archivo */}
                            <span className="text-2xl">
                              <i
                                className={`${
                                  getFileIcon(
                                    JSON.parse(mensaje.ruta_archivo)
                                      .ruta.split(".")
                                      .pop()
                                  ).icon
                                } ${
                                  getFileIcon(
                                    JSON.parse(mensaje.ruta_archivo)
                                      .ruta.split(".")
                                      .pop()
                                  ).color
                                }`}
                              ></i>
                            </span>

                            {/* Nombre y detalles del archivo */}
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm text-gray-800 truncate">
                                {JSON.parse(mensaje.ruta_archivo).nombre}
                              </span>
                              <div className="flex text-xs text-gray-500 space-x-1">
                                <span>
                                  {JSON.parse(mensaje.ruta_archivo).size >
                                  1024 * 1024
                                    ? `${(
                                        JSON.parse(mensaje.ruta_archivo).size /
                                        1024 /
                                        1024
                                      ).toFixed(2)} MB`
                                    : `${(
                                        JSON.parse(mensaje.ruta_archivo).size /
                                        1024
                                      ).toFixed(2)} KB`}
                                </span>
                                <span>•</span>
                                <span>
                                  {JSON.parse(mensaje.ruta_archivo)
                                    .ruta.split(".")
                                    .pop()
                                    .toUpperCase()}
                                </span>
                              </div>
                            </div>

                            {/* Icono de descarga */}
                            <span className="text-2xl text-blue-500 hover:text-blue-700 transition-colors">
                              <i className="bx bx-download"></i>
                            </span>
                          </a>
                        </div>
                      ) : mensaje.tipo_mensaje === "video" ? (
                        <div className="p-2">
                          <div className="relative w-52 h-52 bg-black rounded-lg overflow-hidden shadow-lg">
                            {/* Video con diseño responsivo */}
                            <video
                              className="w-full h-full object-cover rounded-lg"
                              controls
                              src={
                                "https://new.imporsuitpro.com/" +
                                mensaje.ruta_archivo
                              }
                            />
                          </div>
                        </div>
                      ) : mensaje.tipo_mensaje === "location" ? (
                        (() => {
                          try {
                            const locationData = JSON.parse(
                              mensaje.texto_mensaje
                            );
                            const { latitude, longitud } = locationData;

                            return (
                              <div className="w-full h-64">
                                <iframe
                                  title="Mapa de ubicación"
                                  width="100%"
                                  height="100%"
                                  frameBorder="0"
                                  style={{ border: 0 }}
                                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyDGulcdBtz_Mydtmu432GtzJz82J_yb-rs&q=${latitude},${longitud}&zoom=15`}
                                  allowFullScreen
                                ></iframe>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitud}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-500 underline"
                                >
                                  Ver ubicación en Google Maps
                                </a>
                              </div>
                            );
                          } catch (error) {
                            console.error(
                              "Error al parsear la ubicación:",
                              error
                            );
                            return <p>Error al mostrar la ubicación.</p>;
                          }
                        })()
                      ) : mensaje.tipo_mensaje === "button" ? (
                        mensaje.texto_mensaje
                      ) : mensaje.tipo_mensaje === "reaction" ? (
                        mensaje.texto_mensaje
                      ) : mensaje.tipo_mensaje === "sticker" ? (
                        <img
                          className="w-40 h-40"
                          src={
                            "https://new.imporsuitpro.com/" +
                            mensaje.ruta_archivo
                          }
                          alt="Sticker"
                          loop
                        />
                      ) : (
                        "Mensaje no reconocido" + mensaje.tipo_mensaje + " 1"
                      )}
                    </span>
                    <span
                      className={`absolute bottom-1 ${
                        mensaje.rol_mensaje === 1
                          ? "text-white"
                          : "text-gray-500"
                      } right-2 text-xs`}
                    >
                      {formatFecha(mensaje.created_at)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={endOfMessagesRef}></div>
            </div>

            {ultimoMensaje &&
              (() => {
                // Convertir la fecha del último mensaje y la fecha actual a objetos de fecha
                const fechaUltimoMensaje = new Date(ultimoMensaje.created_at);
                const fechaActual = new Date();

                // Calcular la diferencia en horas
                const diferenciaHoras =
                  (fechaActual - fechaUltimoMensaje) / (1000 * 60 * 60); // Diferencia en milisegundos, convertida a horas

                // Mostrar la alerta si han pasado más de 24 horas
                if (diferenciaHoras > 24) {
                  return (
                    <div className="absolute bottom-[0%] bg-yellow-100 border border-yellow-500 rounded shadow-lg p-4 w-[100%] z-10">
                      <p className="text-sm text-yellow-700">
                        <strong>Atención: </strong>Han pasado más de 24 horas
                        desde la última interacción con el cliente, para empezar
                        la conversación en Whatsapp API se requiere una
                        plantilla de Facebook.
                      </p>
                      <button
                        className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-md shadow transition-all duration-200 "
                        onClick={() => {
                          handleSelectPhoneNumber(selectedChat.celular_cliente); // Llama a la función handleSelectPhoneNumber
                          setNumeroModal(true); // Ajusta el valor según corresponda
                        }}
                      >
                        Click para responder con plantilla
                      </button>
                    </div>
                  );
                }

                return null; // Si no han pasado 24 horas, no muestra nada
              })()}

            {/* Campo para enviar mensajes */}
            <div className="flex items-center gap-2 p-4 w-full border-t bg-white absolute bottom-0 left-0">
              <button
                onClick={() => setEmojiOpen(!emojiOpen)}
                className="border rounded-full p-2"
                disabled={isChatBlocked} // Desactiva si el chat está bloqueado
              >
                😊
              </button>
              {emojiOpen && (
                <div className="absolute bottom-16" ref={emojiPickerRef}>
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}

              {isMenuOpen && (
                <div className="absolute bottom-[70%] left-[5%] bg-white border rounded shadow-lg p-2 w-32 z-10">
                  <ul className="flex flex-col space-y-2 text-sm">
                    <li
                      className="cursor-pointer hover:bg-gray-200 p-1 rounded"
                      onClick={() => handleModal_enviarArchivos("Video")}
                    >
                      Video
                    </li>
                    <li
                      className="cursor-pointer hover:bg-gray-200 p-1 rounded"
                      onClick={() => handleModal_enviarArchivos("Imagen")}
                    >
                      Imagen
                    </li>
                    <li
                      className="cursor-pointer hover:bg-gray-200 p-1 rounded"
                      onClick={() => handleModal_enviarArchivos("Documento")}
                    >
                      Documento
                    </li>
                  </ul>
                </div>
              )}

              <label
                htmlFor="file-upload"
                className="cursor-pointer"
                onClick={toggleMenu}
              >
                <i className="bx bx-plus text-2xl"></i>
              </label>

              <input
                type="text"
                value={mensaje}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje..."
                className="flex-1 p-2 border rounded"
                ref={inputRef}
                id="mensaje"
                disabled={isChatBlocked} // Desactiva si el chat está bloqueado
              />

              {/* Mostrar el cuadro de opciones si se ha activado el comando */}
              {isCommandActive && (
                <div className="absolute bottom-20 left-0 bg-white border rounded shadow-lg p-4 z-50 w-full max-w-md">
                  {/* Buscador */}
                  <input
                    type="text"
                    value={menuSearchTerm}
                    onChange={handleMenuSearchChange}
                    placeholder="Buscar opciones..."
                    className="w-full p-2 mb-4 border rounded"
                    ref={inputSearchRef}
                  />

                  {/* Resultados de la búsqueda */}
                  <ul className="space-y-2">
                    {searchResults.length > 0 ? (
                      searchResults.map((result, index) => (
                        <li
                          key={index}
                          onClick={() => handleOptionSelect(result.mensaje)}
                          className="cursor-pointer hover:bg-gray-200 p-2 rounded"
                        >
                          {/* Aquí accedes a propiedades específicas del objeto */}
                          <div>
                            <strong>Atajo:</strong> {result.atajo}
                          </div>
                          <div>
                            <strong>Mensaje:</strong> {result.mensaje}
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-500">No hay resultados</li>
                    )}
                  </ul>
                </div>
              )}

              <button
                onClick={
                  mensaje || file
                    ? handleSendMessage
                    : grabando
                    ? stopRecording
                    : startRecording
                }
                className={`${
                  grabando ? "bg-red-500" : "bg-blue-500"
                } text-white px-4 py-2 rounded`}
                disabled={isChatBlocked} // Desactiva si el chat está bloqueado
              >
                {mensaje || file ? (
                  <i className="bx bx-send"></i>
                ) : grabando ? (
                  <i className="bx bx-stop"></i>
                ) : (
                  <i className="bx bx-microphone"></i>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatPrincipal;
