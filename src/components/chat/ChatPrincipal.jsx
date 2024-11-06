import { useState, useRef, useEffect } from "react";
import CustomAudioPlayer from "./CustomAudioPlayer";

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
}) => {
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !isChatBlocked && mensaje.trim()) {
      e.preventDefault(); // Evita el salto de línea en el input
      handleSendMessage(); // Llama a la función de envío de mensaje
    }
  };
  return (
    <>
      <div
        className={` ${
          opciones ? "col-span-2" : "col-span-3"
        } bg-gray-100 relative `}
      >
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
                              const valores = JSON.parse(mensaje.ruta_archivo);
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
                          "https://new.imporsuitpro.com/" + mensaje.ruta_archivo
                        }
                      />
                    ) : mensaje.tipo_mensaje === "image" ? (
                      <img
                        className="w-40 h-40"
                        src={
                          "https://new.imporsuitpro.com/" + mensaje.ruta_archivo
                        }
                        alt="Imagen"
                      />
                    ) : mensaje.tipo_mensaje === "document" ? (
                      <div className="p-2">
                        <a
                          href={`https://new.imporsuitpro.com/${
                            JSON.parse(mensaje.ruta_archivo).ruta
                          }`} // Ajusta la URL base a tu dominio
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-600 grid grid-cols-[auto_1fr_auto] items-center justify-end gap-1"
                        >
                          <span className="text-xl">
                            <i className="bx bx-file"></i>
                          </span>
                          <span className="truncate">
                            {JSON.parse(mensaje.ruta_archivo).nombre}
                          </span>
                          <span className="truncate text-2xl">
                            <i className="bx bx-download"></i>
                          </span>
                          <span className="text-sm text-gray-500">
                            {(
                              JSON.parse(mensaje.ruta_archivo).size / 1024
                            ).toFixed(2) > 1024 // Convertir a KB o MB
                              ? (
                                  JSON.parse(mensaje.ruta_archivo).size /
                                  1024 /
                                  1024
                                ).toFixed(2) + " MB"
                              : (
                                  JSON.parse(mensaje.ruta_archivo).size / 1024
                                ).toFixed(2) + " KB"}
                          </span>

                          <span className="text-sm text-gray-500 ">
                            {" • " +
                              JSON.parse(mensaje.ruta_archivo).nombre.split(
                                "."
                              )[
                                JSON.parse(mensaje.ruta_archivo).nombre.split(
                                  "."
                                ).length - 1
                              ]}
                          </span>
                        </a>
                      </div>
                    ) : mensaje.tipo_mensaje === "video" ? (
                      <video
                        className="w-40 h-40"
                        controls
                        src={
                          "https://new.imporsuitpro.com/" + mensaje.ruta_archivo
                        }
                      ></video>
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
                          "https://new.imporsuitpro.com/" + mensaje.ruta_archivo
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
                      mensaje.rol_mensaje === 1 ? "text-white" : "text-gray-500"
                    } right-2 text-xs`}
                  >
                    {formatFecha(mensaje.created_at)}
                  </span>
                </div>
              </div>
            ))}
            <div ref={endOfMessagesRef}></div>
          </div>

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
              <div className="absolute bottom-[70%] left-[5%] bg-white border rounded shadow-lg p-2 w-32 z-50">
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
      </div>
    </>
  );
};

export default ChatPrincipal;
