import { useState, useRef, useEffect } from "react";
import CustomAudioPlayer from "./CustomAudioPlayer";
import ImageWithModal from "./modales/ImageWithModal";
import EmojiPicker from "emoji-picker-react";
import chatApi from "../../api/chatcenter";

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
  chatContainerRef,
  mensajesMostrados,
  setMensajesMostrados,
  scrollOffset,
  setScrollOffset,
  mensajesActuales,
  handleScroll,
  ScrollToBottomButton,
  handleCloseModal,
  dataAdmin,
  setMensajesOrdenados,
}) => {
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const [ultimoMensaje, setUltimoMensaje] = useState(null);

  // fuera del render (o en un utils):
  const ERROR_MAP = {
    131042: "Error con método de pago",
    131026: "Mensaje no entregado",
    131047: "Fuera de la ventana de 24h. Requiere plantilla",
    131048: "Límite alcanzado por spam",
    131049: "Límite alcanzado por spam",
    131051: "Tipo de mensaje no soportado",
  };

  const actualizar_mensaje_reenviado = async (
    id_mensaje,
    new_wamid,
    id_wamid_mensaje
  ) => {
    try {
      const response = await chatApi.post(
        "/clientes_chat_center/actualizarMensajeReenviado",
        {
          id_mensaje,
          new_wamid,
          id_wamid_mensaje,
        }
      );

      let respuesta = response.data;

      const fechaMySQL = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      if (respuesta.status != 200) {
        console.log("Error en la respuesta del servidor: " + respuesta);
      } else {
        /* Mensajes seccion derecha */
        setMensajesOrdenados((prev) =>
          prev.map((mensaje) =>
            String(mensaje.id) === String(id_mensaje)
              ? {
                  ...mensaje,
                  id_wamid_mensaje: new_wamid,
                  error_meta: null,
                }
              : mensaje
          )
        );
        /* Mensajes seccion derecha */
      }
    } catch (error) {
      console.error("Error al guardar el mensaje:", error);
      alert("Ocurrió un error al guardar el mensaje. Inténtalo de nuevo.");
    }
  };

  const reenviarImage = async (
    texto_mensaje,
    ruta_archivo,
    id_wamid_mensaje,
    id
  ) => {
    const fromPhoneNumberId = dataAdmin.id_telefono;
    const accessToken = dataAdmin.token;
    const numeroDestino = selectedChat.celular_cliente;
    const apiUrl = `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: numeroDestino,
      type: "image",
      image: {
        link: "https://new.imporsuitpro.com/" + ruta_archivo,
        caption: texto_mensaje,
      },
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.error) {
        console.error("Error al enviar la imagen a WhatsApp:", result.error);
        alert(`Error: ${result.error.message}`);
        return;
      }

      console.log("Imagen enviada con éxito a WhatsApp:", result);

      // Extraer wamid de la respuesta
      const new_wamid = result?.messages?.[0]?.id || null;

      actualizar_mensaje_reenviado(id, new_wamid, id_wamid_mensaje);
    } catch (error) {
      console.error("Error en la solicitud de WhatsApp:", error);
      alert("Ocurrió un error al enviar la imagen. Inténtalo más tarde.");
    }
  };

  const reenviarAudio = async (ruta_archivo, id_wamid_mensaje, id) => {
    const fromPhoneNumberId = dataAdmin.id_telefono;
    const accessToken = dataAdmin.token;
    const numeroDestino = selectedChat.celular_cliente;
    const apiUrl = `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: numeroDestino,
      type: "audio",
      audio: {
        link: "https://new.imporsuitpro.com/" + ruta_archivo,
      },
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.error) {
        console.error("Error al enviar audio:", result.error);
        alert(`Error: ${result.error.message}`);
        return;
      }

      const new_wamid = result?.messages?.[0]?.id || null;
      actualizar_mensaje_reenviado(id, new_wamid, id_wamid_mensaje);
    } catch (error) {
      console.error("Error al reenviar audio:", error);
      alert("Ocurrió un error al reenviar el audio.");
    }
  };

  const reenviarVideo = async (
    texto_mensaje,
    ruta_archivo,
    id_wamid_mensaje,
    id
  ) => {
    const fromPhoneNumberId = dataAdmin.id_telefono;
    const accessToken = dataAdmin.token;
    const numeroDestino = selectedChat.celular_cliente;
    const apiUrl = `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: numeroDestino,
      type: "video",
      video: {
        link: "https://new.imporsuitpro.com/" + ruta_archivo,
        caption: texto_mensaje,
      },
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.error) {
        console.error("Error al enviar video:", result.error);
        alert(`Error: ${result.error.message}`);
        return;
      }

      const new_wamid = result?.messages?.[0]?.id || null;
      actualizar_mensaje_reenviado(id, new_wamid, id_wamid_mensaje);
    } catch (error) {
      console.error("Error al reenviar video:", error);
      alert("Ocurrió un error al reenviar el video.");
    }
  };

  const reenviarDocumento = async (
    ruta_archivo,
    texto_mensaje,
    id_wamid_mensaje,
    id
  ) => {
    const fromPhoneNumberId = dataAdmin.id_telefono;
    const accessToken = dataAdmin.token;
    const numeroDestino = selectedChat.celular_cliente;
    const apiUrl = `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`;

    // Extraer ruta desde JSON
    let rutaReal;
    try {
      const jsonDoc = JSON.parse(ruta_archivo);
      rutaReal = jsonDoc.ruta;
    } catch (err) {
      console.error("Error al parsear ruta_archivo del documento:", err);
      alert("No se pudo reenviar el documento: ruta inválida.");
      return;
    }

    const link = `https://new.imporsuitpro.com/${rutaReal}`;

    const payload = {
      messaging_product: "whatsapp",
      to: numeroDestino,
      type: "document",
      document: {
        link,
        caption: texto_mensaje,
      },
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.error) {
        console.error("Error al enviar documento:", result.error);
        alert(`Error: ${result.error.message}`);
        return;
      }

      const new_wamid = result?.messages?.[0]?.id || null;
      actualizar_mensaje_reenviado(id, new_wamid, id_wamid_mensaje);
    } catch (error) {
      console.error("Error al reenviar documento:", error);
      alert("Ocurrió un error al reenviar el documento.");
    }
  };

  const reenviarTexto = async (texto_mensaje, id_wamid_mensaje, id) => {
    const fromPhoneNumberId = dataAdmin.id_telefono;
    const accessToken = dataAdmin.token;
    const numeroDestino = selectedChat.celular_cliente;
    const apiUrl = `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: numeroDestino,
      type: "text",
      text: {
        body: texto_mensaje,
      },
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.error) {
        console.error("Error al reenviar texto:", result.error);
        alert(`Error: ${result.error.message}`);
        return;
      }

      const new_wamid = result?.messages?.[0]?.id || null;
      actualizar_mensaje_reenviado(id, new_wamid, id_wamid_mensaje);
    } catch (error) {
      console.error("Error en texto:", error);
      alert("Ocurrió un error al reenviar el mensaje de texto.");
    }
  };

  const reenviarTemplate = async (
    template_name,
    language_code,
    ruta_archivo, // contiene todos los datos del cliente
    texto_mensaje, // contiene los placeholders usados
    id_wamid_mensaje,
    id
  ) => {
    const fromPhoneNumberId = dataAdmin.id_telefono;
    const accessToken = dataAdmin.token;
    const numeroDestino = selectedChat.celular_cliente;
    const apiUrl = `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`;

    // Convertir los datos completos del usuario en objeto
    const datos = JSON.parse(ruta_archivo);

    // Extraer placeholders utilizados en el texto
    const placeholders = [...texto_mensaje.matchAll(/{{(.*?)}}/g)].map(
      (m) => m[1]
    );

    // Armar parámetros en orden de aparición
    const parametros = placeholders.map((clave) => ({
      type: "text",
      text: datos[clave] ?? "",
    }));

    const payload = {
      messaging_product: "whatsapp",
      to: numeroDestino,
      type: "template",
      template: {
        name: template_name,
        language: {
          code: language_code,
        },
        components: [
          {
            type: "body",
            parameters: parametros,
          },
        ],
      },
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.error) {
        console.error("❌ Error al reenviar template:", result.error);
        alert(`Error: ${result.error.message}`);
        return;
      }

      const new_wamid = result?.messages?.[0]?.id || null;
      actualizar_mensaje_reenviado(id, new_wamid, id_wamid_mensaje);
    } catch (error) {
      console.error("❌ Error al reenviar plantilla:", error);
      alert("Ocurrió un error al reenviar el mensaje de plantilla.");
    }
  };

  const onReenviar = async (mensaje) => {
    const {
      tipo_mensaje,
      texto_mensaje,
      ruta_archivo,
      id_wamid_mensaje,
      template_name,
      language_code,
      id,
    } = mensaje;

    try {
      switch (tipo_mensaje) {
        case "text":
          await reenviarTexto(texto_mensaje, id_wamid_mensaje, id);
          break;

        case "document":
          await reenviarDocumento(
            ruta_archivo,
            texto_mensaje,
            id_wamid_mensaje,
            id
          );
          break;

        case "video":
          await reenviarVideo(
            texto_mensaje,
            ruta_archivo,
            id_wamid_mensaje,
            id
          );
          break;

        case "audio":
          await reenviarAudio(ruta_archivo, id_wamid_mensaje, id);
          break;

        case "image":
          await reenviarImage(
            texto_mensaje,
            ruta_archivo,
            id_wamid_mensaje,
            id
          );
          break;

        case "template":
          await reenviarTemplate(
            template_name,
            language_code,
            ruta_archivo,
            texto_mensaje,
            id_wamid_mensaje,
            id
          );
          break;

        default:
          alert(`Tipo de mensaje no soportado: ${tipo}`);
          return;
      }

      console.log("Mensaje reenviado correctamente");
    } catch (error) {
      console.error("Error al reenviar el mensaje:", error);
      alert("Error al reenviar el mensaje. Intenta más tarde.");
    }
  };

  useEffect(() => {
    if (mensajesOrdenados && mensajesOrdenados.length > 0) {
      // Filtrar los mensajes que tengan rol_mensaje === 0 (cliente)
      const mensajesCliente = mensajesOrdenados.filter(
        (mensaje) => mensaje.rol_mensaje === 0
      );

      if (mensajesCliente.length > 0) {
        setUltimoMensaje(mensajesCliente[mensajesCliente.length - 1]);
      } else {
        setUltimoMensaje(null);
      }
    } else {
      setUltimoMensaje(null);
    }
  }, [mensajesOrdenados]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !isChatBlocked && mensaje.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <div
        className={`
          ${opciones ? "col-span-2" : "col-span-3"}
          relative
          ${
            selectedChat === null || (opciones && window.innerWidth <= 640)
              ? "hidden sm:block"
              : "block"
          }
        `}
        // Quita el bg-gray-100 y aplicaremos fondo custom adentro
      >
        {/* Si no hay chat seleccionado */}
        {selectedChat === null ? (
          <div className="flex justify-center items-center h-[calc(80vh_-_110px)]">
            <img
              src="https://new.imporsuitpro.com/public/img/banner_chat_center.gif"
              alt="Sin chat seleccionado"
              className="w-[38em]"
            />
          </div>
        ) : (
          <div className="flex flex-col h-[calc(100vh_-_110px)] relative">
            {/* 
              1) Contenedor principal del chat, 
                 con fondo color + imagen, 
                 estilo "WhatsApp".
            */}
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="
                flex
                flex-col
                flex-grow
                space-y-5
                max-h-[calc(100vh_-_180px)]
                overflow-y-auto
                p-4
                pb-12
              "
              style={{
                backgroundColor: "#DAD3CC",
                backgroundImage:
                  'url("https://new.imporsuitpro.com/public/img/fondo_chat_center.png")',
                backgroundSize: "contain",
                backgroundRepeat: "repeat",
                backgroundPosition: "center",
                backgroundBlendMode: "overlay",
                opacity: 0.9, // Ajusta si quieres
              }}
            >
              {/* Mapeo de mensajes */}
              <>
                {mensajesActuales.map((mensaje) => {
                  const hasError = !!mensaje?.error_meta;
                  const errorText = hasError
                    ? mensaje.error_meta.mensaje_error ||
                      (mensaje.error_meta.codigo_error
                        ? `Error código ${mensaje.error_meta.codigo_error}`
                        : "Error al enviar este mensaje")
                    : "";

                  return (
                    <div
                      key={mensaje.id} // evita Math.random() para claves estables
                      className={`flex ${
                        mensaje.rol_mensaje === 1
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {/* Botón a la IZQUIERDA cuando hay error */}
                      {hasError && (
                        <button
                          onClick={() => onReenviar(mensaje)}
                          className="
                            self-center mr-2 px-2 py-1 text-xs rounded-full
                            border border-red-200 bg-red-50/80 hover:bg-red-100
                            text-red-600 flex items-center gap-1
                            transition-colors
                          "
                          title="Reintentar envío"
                        >
                          <i className="bx bx-redo text-xl" />
                          Reenviar
                        </button>
                      )}

                      {/* Burbuja */}
                      <div
                        className={`
                          relative p-3 rounded-lg min-w-[20%] max-w-[70%]
                          whitespace-pre-wrap break-words shadow-md
                          ${
                            mensaje.rol_mensaje === 1
                              ? "bg-[#DCF8C6]"
                              : "bg-white"
                          }
                          ${hasError ? "ring-1 ring-red-600/90" : ""}
                        `}
                        title={hasError ? errorText : undefined}
                      >
                        {/* Alerta interna si hubo error */}
                        {hasError && (
                          <div
                            className="mb-2 -mt-1 -mx-1 px-1.5 py-0.5 text-[11px] leading-none
                              flex items-center gap-1
                              text-red-600/90"
                          >
                            <span className="inline-block h-3 w-[3px] rounded bg-red-600/90" />
                            <i
                              className="bx bx-error-circle text-xs"
                              aria-hidden="true"
                            />
                            <span>Error al enviar: </span>
                            {mensaje.error_meta?.codigo_error && (
                              <span className="opacity-90">
                                {mensaje.error_meta?.codigo_error &&
                                  (() => {
                                    const code = String(
                                      mensaje.error_meta.codigo_error
                                    );
                                    const label = ERROR_MAP[code];
                                    return (
                                      <span className="opacity-90">
                                        {label ? `${label}` : `(${code})`}
                                      </span>
                                    );
                                  })()}
                              </span>
                            )}
                          </div>
                        )}

                        {mensaje.responsable && (
                          <div className="text-[13px] font-bold text-gray-800 mb-1 leading-none">
                            Enviado por{" "}
                            {mensaje.responsable === "IA_logistica"
                              ? "IA Logística"
                              : mensaje.responsable === "IA_ventas"
                              ? "IA Ventas"
                              : [
                                  "webook",
                                  "automatizador",
                                  "automatizador_wait",
                                ].includes(mensaje.responsable)
                              ? "Automatizador"
                              : mensaje.responsable}
                            :
                          </div>
                        )}

                        {/* Contenido del mensaje (texto, audio, imagen, etc.) */}
                        <span className="text-sm pb-2 inline-block">
                          {/* Tipo: TEXT */}
                          {mensaje.tipo_mensaje === "text" ? (
                            mensaje.texto_mensaje.includes("{{") &&
                            mensaje.ruta_archivo ? (
                              <p>
                                {mensaje.texto_mensaje.replace(
                                  /\{\{(.*?)\}\}/g,
                                  (match, key) => {
                                    const valores = JSON.parse(
                                      mensaje.ruta_archivo
                                    );
                                    return valores[key.trim()] || match;
                                  }
                                )}
                              </p>
                            ) : (
                              <p>{mensaje.texto_mensaje}</p>
                            )
                          ) : mensaje.tipo_mensaje === "template" ? (
                            <p>
                              {mensaje.texto_mensaje.replace(
                                /\{\{(.*?)\}\}/g,
                                (match, key) => {
                                  const valores = JSON.parse(
                                    mensaje.ruta_archivo
                                  );
                                  return valores[key.trim()] || match;
                                }
                              )}
                            </p>
                          ) : mensaje.tipo_mensaje === "audio" ? (
                            /* Tipo: AUDIO */
                            <CustomAudioPlayer
                              src={
                                "https://new.imporsuitpro.com/" +
                                mensaje.ruta_archivo
                              }
                            />
                          ) : mensaje.tipo_mensaje === "image" ? (
                            /* Tipo: IMAGEN */
                            <ImageWithModal mensaje={mensaje} />
                          ) : mensaje.tipo_mensaje === "document" ? (
                            /* Tipo: DOCUMENT */
                            <div className="p-2">
                              <a
                                href={`https://new.imporsuitpro.com/${
                                  JSON.parse(mensaje.ruta_archivo).ruta
                                }`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg shadow-md hover:bg-gray-100 transition-colors"
                              >
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
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm text-gray-800 truncate">
                                    {JSON.parse(mensaje.ruta_archivo).nombre}
                                  </span>
                                  <div className="flex text-xs text-gray-500 space-x-1">
                                    <span>
                                      {JSON.parse(mensaje.ruta_archivo).size >
                                      1024 * 1024
                                        ? `${(
                                            JSON.parse(mensaje.ruta_archivo)
                                              .size /
                                            1024 /
                                            1024
                                          ).toFixed(2)} MB`
                                        : `${(
                                            JSON.parse(mensaje.ruta_archivo)
                                              .size / 1024
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
                                <span className="text-2xl text-blue-500 hover:text-blue-700 transition-colors">
                                  <i className="bx bx-download"></i>
                                </span>
                              </a>
                              <p className="pt-2">{mensaje.texto_mensaje}</p>
                            </div>
                          ) : mensaje.tipo_mensaje === "video" ? (
                            /* Tipo: VIDEO */
                            <div className="p-2">
                              <div className="relative w-52 h-52 bg-black rounded-lg overflow-hidden shadow-lg">
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
                            /* Tipo: UBICACIÓN */
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
                            /* Tipo: BOTÓN */
                            mensaje.texto_mensaje
                          ) : mensaje.tipo_mensaje === "reaction" ? (
                            /* Tipo: REACTION */
                            mensaje.texto_mensaje
                          ) : mensaje.tipo_mensaje === "sticker" ? (
                            /* Tipo: STICKER */
                            <img
                              className="w-40 h-40"
                              src={
                                "https://new.imporsuitpro.com/" +
                                mensaje.ruta_archivo
                              }
                              alt="Sticker"
                            />
                          ) : (
                            "Mensaje no reconocido"
                          )}
                        </span>

                        {/* Fecha/hora en la esquina */}
                        <span
                          className={`
                          absolute bottom-1 right-2 text-xs
                          ${
                            mensaje.rol_mensaje === 1
                              ? "text-gray-700"
                              : "text-gray-500"
                          }
                        `}
                        >
                          {formatFecha(mensaje.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>

              {/* Botón de scroll al final */}
              <ScrollToBottomButton containerRef={chatContainerRef} />
            </div>

            {/* ALTO: Lógica de 24 horas */}
            {ultimoMensaje &&
              (() => {
                const fechaUltimoMensaje = new Date(ultimoMensaje.created_at);
                const fechaActual = new Date();
                const diferenciaHoras =
                  (fechaActual - fechaUltimoMensaje) / (1000 * 60 * 60);

                if (diferenciaHoras > 24) {
                  return (
                    <div className="absolute bottom-[0%] bg-yellow-100 border border-yellow-500 rounded shadow-lg p-4 w-full z-10">
                      <p className="text-sm text-yellow-700">
                        <strong>Atención: </strong>Han pasado más de 24 horas
                        desde la última interacción con el cliente, para empezar
                        la conversación en Whatsapp API se requiere una
                        plantilla de Facebook.
                      </p>
                      <button
                        className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-md shadow transition-all duration-200"
                        onClick={() => {
                          handleSelectPhoneNumber(selectedChat.celular_cliente);
                          setNumeroModal(true);
                        }}
                      >
                        Click para responder con plantilla
                      </button>
                    </div>
                  );
                }
                return null;
              })()}

            {/* Campo para enviar mensajes */}
            <div className="flex items-center gap-2 p-4 w-full border-t bg-gray-100 absolute bottom-0 left-0">
              <button
                onClick={() => setEmojiOpen(!emojiOpen)}
                className="border rounded-full p-2"
                disabled={isChatBlocked}
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
                disabled={isChatBlocked}
              />

              {/* Menú de comandos */}
              {isCommandActive && (
                <div className="absolute bottom-20 left-0 bg-white border rounded shadow-lg p-4 z-50 w-full max-w-md">
                  <button
                    onClick={handleCloseModal}
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>

                  <input
                    type="text"
                    value={menuSearchTerm}
                    onChange={handleMenuSearchChange}
                    placeholder="Buscar opciones..."
                    className="w-full p-2 mb-4 border rounded"
                    ref={inputSearchRef}
                  />
                  <ul className="space-y-2">
                    {searchResults.length > 0 ? (
                      searchResults.map((result, index) => (
                        <li
                          key={index}
                          onClick={() => handleOptionSelect(result.mensaje)}
                          className="cursor-pointer hover:bg-gray-200 p-2 rounded"
                        >
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
                disabled={isChatBlocked}
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
