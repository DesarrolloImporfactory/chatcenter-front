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
  onSendMsAttachment,
  onSendIgAttachment,
  setNumeroModalPreset,
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

  const [hide24hBanner, setHide24hBanner] = useState(false);

  // cuando cambia el chat seleccionado, resetea
  useEffect(() => {
    setHide24hBanner(false);
  }, [selectedChat?.id, selectedChat?.source]);

  const isMessenger = selectedChat?.source === "ms";
  const chatBgStyle = isMessenger
    ? { backgroundColor: "#FFFFFF" } // fondo blanco para Messenger
    : {
        backgroundColor: "#DAD3CC",
        backgroundImage:
          'url("https://new.imporsuitpro.com/public/img/fondo_chat_center.png")',
        backgroundSize: "contain",
        backgroundRepeat: "repeat",
        backgroundPosition: "center",
        backgroundBlendMode: "overlay",
        opacity: 0.9,
      };

  // refs para file inputs
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // helper: subir a tu uploader S3
  async function uploadToS3(file) {
    const form = new FormData();
    form.append("file", file); // nombre del campo esperado por tu uploader

    const resp = await fetch(
      "https://uploader.imporfactory.app/api/files/upload",
      {
        method: "POST",
        body: form,
      }
    );
    const json = await resp.json();
    if (!json?.success) throw new Error("Error subiendo archivo");
    return json.data; // { url, fileName, size, mimeType, ... }
  }

  // Refs existentes: imageInputRef, videoInputRef, fileInputRef

  async function handleFilePicked(kind, file) {
    if (!file || !selectedChat) return;

    try {
      const up = await uploadToS3(file);
      const clientTmpId =
        "tmp-file-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      const created = new Date().toISOString();

      const tipo =
        kind === "image" ? "image" : kind === "video" ? "video" : "document";

      const ruta_archivo =
        tipo === "document"
          ? JSON.stringify({
              ruta: up.url,
              nombre: up.fileName,
              size: up.size,
              mimeType: up.mimeType,
            })
          : up.url;

      // mensaje optimista
      setMensajesOrdenados((prev) => [
        ...prev,
        {
          id: clientTmpId,
          rol_mensaje: 1,
          texto_mensaje: "",
          tipo_mensaje: tipo,
          ruta_archivo,
          mid_mensaje: null,
          visto: 0,
          created_at: created,
          responsable: dataAdmin?.nombre_encargado || "",
          client_tmp_id: clientTmpId,
        },
      ]);

      // enviar según canal
      if (selectedChat.source === "ms") {
        onSendMsAttachment({
          kind,
          url: up.url,
          name: up.fileName,
          mimeType: up.mimeType,
          size: up.size,
          clientTmpId,
        });
      } else if (selectedChat.source === "ig") {
        onSendIgAttachment({
          kind,
          url: up.url,
          name: up.fileName,
          mimeType: up.mimeType,
          size: up.size,
          clientTmpId,
        });
      }

      setIsMenuOpen(false);
    } catch (err) {
      console.error("Attach error:", err);
      alert("No se pudo subir/enviar el archivo.");
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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
          <div className="flex h-[calc(80vh_-_110px)] items-center justify-center">
            <i className="bx bx-chat text-4xl text-slate-500 m-3" />

            <p className="text-5x1 text-slate-500 -mt-1 ">
              Seleccione una conversación para empezar a chatear
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-[calc(100vh_-_110px)] relative">
            {/* 
            1) Contenedor principal del chat, 
               con fondo color + imagen (WhatsApp) o blanco (Messenger)
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
              style={chatBgStyle}
            >
              {/* Mapeo de mensajes */}
              <>
                {mensajesActuales.map((mensaje) => {
                  const key =
                    mensaje.id ??
                    mensaje.mid_mensaje ??
                    `${mensaje.created_at}-${(
                      mensaje.texto_mensaje || ""
                    ).slice(0, 16)}`;

                  const hasError = !!mensaje?.error_meta;
                  const errorText = hasError
                    ? mensaje.error_meta.mensaje_error ||
                      (mensaje.error_meta.codigo_error
                        ? `Error código ${mensaje.error_meta.codigo_error}`
                        : "Error al enviar este mensaje")
                    : "";

                  // paleta de burbuja segun canal y rol
                  const bubblePaletteClass =
                    mensaje.rol_mensaje === 1
                      ? isMessenger
                        ? "bg-[#0084FF] text-white" // Enviado en Messenger
                        : "bg-[#DCF8C6]" // Enviado en WhatsApp
                      : isMessenger
                      ? "bg-gray-100 text-gray-900" // Recibido en Messenger
                      : "bg-white"; // Recibido en WhatsApp

                  // color timestamp segun canal y rol
                  const timestampClass = isMessenger
                    ? mensaje.rol_mensaje === 1
                      ? "text-white/90"
                      : "text-gray-500"
                    : mensaje.rol_mensaje === 1
                    ? "text-gray-700"
                    : "text-gray-500";

                  return (
                    <div
                      key={key}
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
                        ${bubblePaletteClass}
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
                                {(() => {
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
                            <CustomAudioPlayer src={mensaje.ruta_archivo} />
                          ) : mensaje.tipo_mensaje === "image" ? (
                            /* Tipo: IMAGEN (WA y MS con el mismo componente) */
                            <ImageWithModal mensaje={mensaje} />
                          ) : mensaje.tipo_mensaje === "document" ? (
                            /* Tipo: DOCUMENT */
                            (() => {
                              let meta = {
                                ruta: "",
                                nombre: "",
                                size: 0,
                                mimeType: "",
                              };
                              try {
                                meta = JSON.parse(mensaje.ruta_archivo);
                              } catch (e) {
                                // si viniera plain string, lo adaptamos
                                meta = {
                                  ruta: mensaje.ruta_archivo,
                                  nombre: "archivo",
                                  size: 0,
                                  mimeType: "",
                                };
                              }
                              const link = /^https?:\/\//.test(meta.ruta)
                                ? meta.ruta
                                : `https://new.imporsuitpro.com/${meta.ruta}`;
                              const ext = (
                                meta.ruta?.split(".").pop() ||
                                meta.mimeType?.split("/").pop() ||
                                ""
                              )?.toUpperCase();

                              const iconInfo = getFileIcon(
                                meta.ruta?.split(".").pop() || ""
                              );

                              return (
                                <div className="p-2">
                                  <a
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg shadow-md hover:bg-gray-100 transition-colors"
                                  >
                                    <span className="text-2xl">
                                      <i
                                        className={`${iconInfo.icon} ${iconInfo.color}`}
                                      ></i>
                                    </span>
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-sm text-gray-800 truncate">
                                        {meta.nombre || "Documento"}
                                      </span>
                                      <div className="flex text-xs text-gray-500 space-x-1">
                                        <span>
                                          {meta.size > 1024 * 1024
                                            ? `${(
                                                meta.size /
                                                1024 /
                                                1024
                                              ).toFixed(2)} MB`
                                            : `${(meta.size / 1024).toFixed(
                                                2
                                              )} KB`}
                                        </span>
                                        <span>•</span>
                                        <span>{ext}</span>
                                      </div>
                                    </div>
                                    <span className="text-2xl text-blue-500 hover:text-blue-700 transition-colors">
                                      <i className="bx bx-download"></i>
                                    </span>
                                  </a>
                                  {mensaje.texto_mensaje ? (
                                    <p className="pt-2">
                                      {mensaje.texto_mensaje}
                                    </p>
                                  ) : null}
                                </div>
                              );
                            })()
                          ) : mensaje.tipo_mensaje === "video" ? (
                            /* Tipo: VIDEO */
                            <div className="p-2">
                              <div className="relative w-52 h-52 bg-black rounded-lg overflow-hidden shadow-lg">
                                <video
                                  className="w-full h-full object-cover rounded-lg"
                                  controls
                                  src={
                                    /^https?:\/\//.test(mensaje.ruta_archivo)
                                      ? mensaje.ruta_archivo
                                      : "https://new.imporsuitpro.com/" +
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
                                const { latitude, longitude } = locationData;

                                return (
                                  <div className="w-full h-64">
                                    <iframe
                                      title="Mapa de ubicación"
                                      width="100%"
                                      height="100%"
                                      frameBorder="0"
                                      style={{ border: 0 }}
                                      src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyDGulcdBtz_Mydtmu432GtzJz82J_yb-rs&q=${latitude},${longitude}&zoom=15`}
                                      allowFullScreen
                                    ></iframe>
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
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
                          ${timestampClass}
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

            {/* Ventana de 24 horas (UI informativa por canal) */}
            {selectedChat &&
              !hide24hBanner &&
              (() => {
                const isMessengerLocal = selectedChat.source === "ms";
                const refDateISO = isMessengerLocal
                  ? selectedChat.last_incoming_at ||
                    selectedChat.mensaje_created_at
                  : ultimoMensaje?.created_at;

                if (!refDateISO) return null;

                const diffHrs =
                  (Date.now() - new Date(refDateISO).getTime()) /
                  (1000 * 60 * 60);

                if (diffHrs <= 24) return null;

                // WhatsApp
                if (!isMessengerLocal) {
                  return (
                    <div className="absolute bottom-[0%] bg-yellow-100 border border-yellow-500 rounded shadow-lg p-4 w-full z-10">
                      <div className="flex items-start gap-3">
                        <p className="text-sm text-yellow-700 flex-1">
                          <strong>Atención: </strong>Han pasado más de 24 horas.
                          En WhatsApp API necesitas responder con una{" "}
                          <b>plantilla</b>.
                        </p>
                        <button
                          className="text-yellow-700/70 hover:text-yellow-900"
                          onClick={() => setHide24hBanner(true)}
                          title="Cerrar"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-md shadow transition-all duration-200"
                          onClick={() => {
                            const phone = selectedChat?.celular_cliente || "";

                            handleSelectPhoneNumber(phone);

                            setNumeroModalPreset({
                              step: "buscar",
                              phone,
                              lockPhone: true,
                              contextLabel:
                                "Responderá con plantilla al chat actual",
                              clienteNombre: selectedChat?.nombre_cliente || "",
                            });

                            setNumeroModal(true);
                          }}
                        >
                          Responder con plantilla
                        </button>
                        <button
                          className="px-3 py-2 rounded-md border border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                          onClick={() => setHide24hBanner(true)}
                        >
                          Entendido
                        </button>
                      </div>
                    </div>
                  );
                }

                // Messenger
                return (
                  <div className="absolute bottom-[0%] bg-blue-50 border border-blue-300 rounded shadow-lg p-4 w-full z-10">
                    <div className="flex items-start gap-3">
                      <p className="text-sm text-blue-800 flex-1">
                        Han pasado más de 24 horas. Al enviar, usaré la etiqueta{" "}
                        <b>HUMAN_AGENT</b> o el mensaje fallará por políticas de
                        Meta.
                      </p>
                      <button
                        className="text-blue-700/70 hover:text-blue-900"
                        onClick={() => setHide24hBanner(true)}
                        title="Cerrar"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="mt-3">
                      <button
                        className="px-3 py-2 rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50"
                        onClick={() => setHide24hBanner(true)}
                      >
                        Entendido
                      </button>
                    </div>
                  </div>
                );
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
                      onClick={() => {
                        if (selectedChat?.source === "ms") {
                          setIsMenuOpen(false);
                          imageInputRef.current?.click();
                        } else {
                          handleModal_enviarArchivos("Imagen"); // WhatsApp
                        }
                      }}
                    >
                      Imagen
                    </li>
                    <li
                      className="cursor-pointer hover:bg-gray-200 p-1 rounded"
                      onClick={() => {
                        if (selectedChat?.source === "ms") {
                          setIsMenuOpen(false);
                          videoInputRef.current?.click();
                        } else {
                          handleModal_enviarArchivos("Video"); // WhatsApp
                        }
                      }}
                    >
                      Video
                    </li>
                    <li
                      className="cursor-pointer hover:bg-gray-200 p-1 rounded"
                      onClick={() => {
                        if (selectedChat?.source === "ms") {
                          setIsMenuOpen(false);
                          fileInputRef.current?.click();
                        } else {
                          handleModal_enviarArchivos("Documento"); // WhatsApp
                        }
                      }}
                    >
                      Documento
                    </li>
                  </ul>
                </div>
              )}

              {/* Inputs ocultos para Messenger */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  handleFilePicked("image", e.target.files[0])
                }
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  handleFilePicked("video", e.target.files[0])
                }
              />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  handleFilePicked("document", e.target.files[0])
                }
              />

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
