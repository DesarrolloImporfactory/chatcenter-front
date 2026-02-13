import { useState, useRef, useEffect } from "react";
import CustomAudioPlayer from "./CustomAudioPlayer";
import ImageWithModal from "./modales/ImageWithModal";
import EmojiPicker from "emoji-picker-react";
import chatApi from "../../api/chatcenter";

/* === Player estilo WhatsApp (sin autoplay) + velocidades 1x / 1.5x / 2x === */
function WaAudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  const SPEEDS = [1, 1.5, 2];
  const [speedIdx, setSpeedIdx] = useState(0);

  // normaliza ruta
  const realSrc = /^https?:\/\//.test(src)
    ? src
    : `https://new.imporsuitpro.com/${src}`;

  const fmt = (t) => {
    if (!isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    // aplicar velocidad inicial y al cambiar de src
    a.playbackRate = SPEEDS[speedIdx];

    const onLoaded = () => setDuration(a.duration || 0);
    const onTime = () => setCurrent(a.currentTime || 0);
    const onEnd = () => setPlaying(false);

    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]); // cuando cambia el audio

  // aplica la velocidad cuando el usuario la cambia
  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = SPEEDS[speedIdx];
  }, [speedIdx]);

  const progress = duration ? Math.min(100, (current / duration) * 100) : 0;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play()
        .then(() => setPlaying(true))
        .catch(() => {});
    }
  };

  const seek = (e) => {
    const bar = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - bar.left) / bar.width));
    const a = audioRef.current;
    if (!a || !duration) return;
    a.currentTime = ratio * duration;
    setCurrent(a.currentTime);
  };

  const cycleSpeed = () => setSpeedIdx((idx) => (idx + 1) % SPEEDS.length);

  // barra y knob centrados
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="inline-block">
      <div className="w-[260px] sm:w-[320px] rounded-2xl bg-white/95 p-3">
        <div className="flex items-center gap-3">
          {/* Botón circular play/pause */}
          <button
            type="button"
            onClick={toggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white shadow hover:brightness-95 transition active:scale-95"
            aria-label={playing ? "Pausar" : "Reproducir"}
          >
            {playing ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="5" width="4" height="14" rx="1"></rect>
                <rect x="14" y="5" width="4" height="14" rx="1"></rect>
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z"></path>
              </svg>
            )}
          </button>

          {/* Barra de progreso centrada */}
          <div className="flex-1 flex items-center">
            <div
              className="relative w-full h-2 rounded-full bg-slate-200 cursor-pointer"
              onClick={seek}
              title="Buscar"
            >
              <div
                className="absolute left-0 top-0 bottom-0 rounded-full bg-[#cfead8]"
                style={{ width: `${clampedProgress}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-[#25D366] shadow pointer-events-none"
                style={{ left: `${clampedProgress}%` }}
              />
            </div>
          </div>

          {/* Botón de velocidad */}
          <button
            type="button"
            onClick={cycleSpeed}
            className="ml-2 min-w-[44px] px-2 py-1 rounded-md bg-slate-100 text-slate-800 text-[12px] font-bold hover:bg-slate-200 active:scale-95 transition"
            title="Cambiar velocidad"
          >
            {SPEEDS[speedIdx]}x
          </button>
        </div>

        {/* Tiempos */}
        <div className="mt-2 flex items-center justify-between text-[12px] text-slate-600">
          <span>{fmt(current)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      <audio ref={audioRef} src={realSrc} preload="metadata" />
    </div>
  );
}

// Texto legible del canal para mensajes no soportados
function platformLabel(source) {
  if (source === "ms") return "Messenger";
  if (source === "ig") return "Instagram";
  return "WhatsApp";
}

/* ——— Video Player premium (contenedor 16:9, responsivo) ——— */
function PremiumVideoPlayer({ src }) {
  const realSrc = /^https?:\/\//.test(src)
    ? src
    : `https://new.imporsuitpro.com/${src}`;

  console.log("realSrc: " + realSrc);
  return (
    <div className="w-full max-w-[460px]">
      <div className="relative w-full rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/10 bg-black">
        {/* caja 16:9 */}
        <div className="pt-[56.25%]" />
        <video
          className="absolute inset-0 w-full h-full object-cover"
          controls
          preload="metadata"
          src={realSrc}
          playsInline
        />
      </div>
    </div>
  );
}

/* ——— divisor de fecha centrado, con más espacio ——— */
const DayDivider = ({ label }) => (
  <div className="relative my-6 md:my-8 select-none">
    <div className="h-px w-full bg-black/10" />
    <span
      className="
        absolute left-1/2 -translate-x-1/2 -top-3
        px-4 py-1 text-[11px] md:text-xs font-medium
        rounded-full bg-white/90 backdrop-blur
        ring-1 ring-black/10 shadow-sm
      "
    >
      {label}
    </span>
  </div>
);

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
  setNumeroModalPreset,
  isSocketConnected,
  commandAttachment,
  setCommandAttachment,
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
    id_wamid_mensaje,
  ) => {
    try {
      const response = await chatApi.post(
        "/clientes_chat_center/actualizarMensajeReenviado",
        {
          id_mensaje,
          new_wamid,
          id_wamid_mensaje,
        },
      );

      let respuesta = response.data;

      const fechaMySQL = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      if (respuesta.status !== 200) {
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
              : mensaje,
          ),
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
    id,
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
      audio: { link: "https://new.imporsuitpro.com/" + ruta_archivo },
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
    id,
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
    id,
  ) => {
    const fromPhoneNumberId = dataAdmin.id_telefono;
    const accessToken = dataAdmin.token;
    const numeroDestino = selectedChat.celular_cliente;
    const apiUrl = `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`;

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
      text: { body: texto_mensaje },
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
    ruta_archivo, // JSON string con body y url_0_1, url_1_1, etc.
    texto_mensaje, // texto BODY con {{1}}, {{2}}...
    id_wamid_mensaje,
    id,
  ) => {
    const fromPhoneNumberId = dataAdmin.id_telefono;
    const accessToken = dataAdmin.token;
    const numeroDestino = selectedChat.celular_cliente;
    const apiUrl = `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`;

    let datos = {};
    try {
      datos = JSON.parse(ruta_archivo || "{}");
    } catch (e) {
      console.error("ruta_archivo no es JSON válido:", e);
      datos = {};
    }

    // -------------------------
    // 1) BODY parameters ({{1}}, {{2}}...)
    // -------------------------
    const placeholdersBody = [
      ...String(texto_mensaje || "").matchAll(/{{(.*?)}}/g),
    ].map((m) => String(m[1]));

    const parametrosBody = placeholdersBody.map((clave) => ({
      type: "text",
      text: String(datos[clave] ?? ""), // aquí espera {"1":"asd","2":"42"}
    }));

    // -------------------------
    // 2) BUTTON URL parameters
    // -------------------------
    // Espera keys tipo: "url_0_1": "31"
    // (idx botón = 0, placeholder = 1)
    const urlEntries = Object.entries(datos).filter(([k]) =>
      /^url_\d+_\d+$/.test(k),
    );

    // Normaliza en estructuras por botón
    // { "0": [ {ph:"1", value:"31"} ], "1": [...] }
    const urlByButtonIndex = {};
    urlEntries.forEach(([k, v]) => {
      const [, idx, ph] = k.split("_"); // ["url","0","1"]
      if (!urlByButtonIndex[idx]) urlByButtonIndex[idx] = [];
      urlByButtonIndex[idx].push({ ph, value: String(v ?? "") });
    });

    // Para WhatsApp Cloud API: un componente por botón url:
    // { type:"button", sub_type:"url", index:"0", parameters:[{type:"text", text:"31"}] }
    const buttonComponents = Object.entries(urlByButtonIndex).map(
      ([idx, arr]) => {
        // normalmente 1 placeholder por botón URL; si hubiera varios, se mandan en orden
        const ordered = arr.sort((a, b) => Number(a.ph) - Number(b.ph));

        return {
          type: "button",
          sub_type: "url",
          index: String(idx),
          parameters: ordered.map((x) => ({
            type: "text",
            text: x.value,
          })),
        };
      },
    );

    // -------------------------
    // 3) Components finales
    // -------------------------
    const components = [];

    if (parametrosBody.length > 0) {
      components.push({
        type: "body",
        parameters: parametrosBody,
      });
    }

    if (buttonComponents.length > 0) {
      components.push(...buttonComponents);
    }

    const payload = {
      messaging_product: "whatsapp",
      to: numeroDestino,
      type: "template",
      template: {
        name: template_name,
        language: { code: language_code },
        components,
      },
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
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

  const linkify = (text = "") => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const nodes = [];

    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[0];
      const start = match.index;

      if (start > lastIndex) {
        nodes.push(<span key={key++}>{text.slice(lastIndex, start)}</span>);
      }

      // quita puntuación final común del link
      let cleanUrl = url;
      let trailing = "";
      while (/[).,!?:]$/.test(cleanUrl)) {
        trailing = cleanUrl.slice(-1) + trailing;
        cleanUrl = cleanUrl.slice(0, -1);
      }

      const href = cleanUrl.startsWith("http")
        ? cleanUrl
        : `https://${cleanUrl}`;

      nodes.push(
        <a
          key={key++}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800 hover:no-underline cursor-pointer"
        >
          {cleanUrl}
        </a>,
      );

      if (trailing) nodes.push(<span key={key++}>{trailing}</span>);

      lastIndex = start + url.length;
    }

    if (lastIndex < text.length) {
      nodes.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }

    return nodes;
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
            id,
          );
          break;
        case "video":
          await reenviarVideo(
            texto_mensaje,
            ruta_archivo,
            id_wamid_mensaje,
            id,
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
            id,
          );
          break;
        case "template":
          await reenviarTemplate(
            template_name,
            language_code,
            ruta_archivo,
            texto_mensaje,
            id_wamid_mensaje,
            id,
          );
          break;
        default:
          alert(`Tipo de mensaje no soportado: ${tipo_mensaje}`);
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
        (mensaje) => mensaje.rol_mensaje === 0,
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

  useEffect(() => {
    const el = inputRef?.current;
    if (!el) return;

    // Reinicia altura para medir correctamente
    el.style.height = "auto";

    // Calcula altura máxima de 4 líneas
    const computed = window.getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight || "20");
    const paddingTop = parseFloat(computed.paddingTop || "0");
    const paddingBottom = parseFloat(computed.paddingBottom || "0");
    const maxHeight = lineHeight * 4 + paddingTop + paddingBottom;

    // Ajusta altura al contenido pero con tope
    const newHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${newHeight}px`;

    // Scroll interno solo cuando excede 4 líneas
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [mensaje, inputRef]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const canSend =
        !isChatBlocked && (mensaje.trim() || file || commandAttachment);

      e.preventDefault();
      if (canSend) handleSendMessage();
    }
  };

  const canSend =
    !!(mensaje && mensaje.trim()) || !!file || !!commandAttachment;

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Si es un archivo (imagen o video)
      if (item.kind === "file") {
        e.preventDefault(); // Prevenir el pegado por defecto

        const file = item.getAsFile();
        if (!file) continue;

        const type = file.type;

        if (type.startsWith("image/")) {
          // Abrir el modal y dejar que el usuario suba la imagen manualmente
          handleModal_enviarArchivos("Imagen");

          // Simular el archivo en el input del modal después de un pequeño delay
          setTimeout(() => {
            const modalInput = document.querySelector(
              'input[type="file"][accept="image/*"][multiple]',
            );
            if (modalInput) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              modalInput.files = dataTransfer.files;
              const changeEvent = new Event("change", { bubbles: true });
              modalInput.dispatchEvent(changeEvent);
            }
          }, 100);
          return;
        } else if (type.startsWith("video/")) {
          handleModal_enviarArchivos("Video");

          setTimeout(() => {
            const modalInput = document.querySelector(
              'input[type="file"][accept="video/*"][multiple]',
            );
            if (modalInput) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              modalInput.files = dataTransfer.files;
              const changeEvent = new Event("change", { bubbles: true });
              modalInput.dispatchEvent(changeEvent);
            }
          }, 100);
          return;
        }
      }
    }
    // Si no es archivo, deja que se pegue el texto normalmente
  };

  const [hide24hBanner, setHide24hBanner] = useState(false);

  // ✅ Determina si WhatsApp está fuera de 24h y el banner está visible
  const isMetaDMLocal =
    selectedChat?.source === "ms" || selectedChat?.source === "ig";

  // ✅ Fecha referencia: WA usa SIEMPRE el último mensaje del cliente
  const refDateISO = !selectedChat
    ? null
    : isMetaDMLocal
      ? selectedChat.last_incoming_at || selectedChat.mensaje_created_at
      : ultimoMensaje?.created_at;

  const diffHrs = refDateISO
    ? (Date.now() - new Date(refDateISO).getTime()) / (1000 * 60 * 60)
    : 0;

  // ✅ SOLO WhatsApp + >24h + banner visible
  // ✅ SOLO WhatsApp + >24h + banner visible
  const waNeedsTemplate =
    !!selectedChat &&
    selectedChat?.source === "wa" &&
    !hide24hBanner &&
    diffHrs > 24;

  // cuando cambia el chat seleccionado, resetea
  useEffect(() => {
    setHide24hBanner(false);
  }, [selectedChat?.id, selectedChat?.source]);

  const isMessenger = selectedChat?.source === "ms";
  const isInstagram = selectedChat?.source === "ig";
  const isWhatsApp = !isMessenger && !isInstagram;

  const typingTimerRef = useRef(null);
  const wasTypingRef = useRef(false);
  const TYPING_IDLE_MS = 1500;

  const chatBgStyle =
    isMessenger || isInstagram
      ? { backgroundColor: "#FFFFFF" } // fondo blanco para Messenger
      : {
          backgroundColor: "#DAD3CC",
          backgroundImage:
            'url("https://imp-datas.s3.amazonaws.com/images/2026-01-05T17-28-02-060Z-fondo_chat_center.png")',
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
      },
    );
    const json = await resp.json();
    if (!json?.success) throw new Error("Error subiendo archivo");
    return json.data; // { url, fileName, size, mimeType, ... }
  }

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

  // Normaliza nombres tipo "EvelynCherrez", "Evelyn_Cherrez", "Evelyn-Cherrez"
  function prettyAgentName(raw) {
    if (!raw) return "";
    if (raw === "IA_logistica") return "IA Logística";
    if (raw === "IA_ventas") return "IA Ventas";
    if (["webook", "automatizador", "automatizador_wait"].includes(raw))
      return "Automatizador";
    return String(raw)
      .replace(/[_\-]+/g, " ") // underscores y guiones → espacio
      .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, "$1 $2") // inserta espacio en camel/pascal
      .replace(/\s+/g, " ")
      .trim();
  }

  const onChangeWithTyping = (e) => {
    handleInputChange(e);
  };

  /* === Hora HH:mm para mostrar en burbuja y fecha como tooltip === */
  const formatHora = (iso) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  /* === Formato de etiqueta de día para el divisor === */
  const formatDayLabel = (iso) =>
    new Date(iso).toLocaleDateString(undefined, {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  /* === Comparador de cambio de día === */
  const isNewDay = (prevISO, currISO) => {
    const a = new Date(prevISO);
    const b = new Date(currISO);
    return (
      a.getFullYear() !== b.getFullYear() ||
      a.getMonth() !== b.getMonth() ||
      a.getDate() !== b.getDate()
    );
  };

  const getTemplatePlaceholders = (valores) => {
    // En su nuevo formato vienen dentro de "placeholders"
    // pero por compatibilidad dejamos fallback al objeto raíz
    if (valores?.placeholders && typeof valores.placeholders === "object") {
      return valores.placeholders;
    }
    return valores || {};
  };

  const renderTemplateHeader = (header) => {
    if (!header || !header.format) return null;

    const format = String(header.format || "").toUpperCase();

    // Normaliza URL (si guardan relativas, aquí queda listo)
    const normalizeUrl = (u) =>
      !u
        ? ""
        : /^https?:\/\//i.test(String(u))
          ? String(u)
          : `https://new.imporsuitpro.com/${String(u).replace(/^\//, "")}`;

    // Resolver URL real del archivo (prioriza S3)
    const resolveMediaUrl = () => {
      // 1) Lo nuevo: S3
      if (header.fileUrl) return normalizeUrl(header.fileUrl);

      // 2) Si value es string (puede ser nombre o url)
      if (typeof header.value === "string") return normalizeUrl(header.value);

      // 3) Si value es objeto (por compatibilidad)
      if (header.value && typeof header.value === "object") {
        const maybe =
          header.value.fileUrl ||
          header.value.url ||
          header.value.link ||
          header.value.ruta;
        return normalizeUrl(maybe);
      }

      return "";
    };

    const src = resolveMediaUrl();

    if (format === "IMAGE") {
      if (!src) return null;

      return (
        <div className="mb-2">
          <img
            src={src}
            alt="Template header"
            className="w-full max-w-[420px] rounded-2xl shadow ring-1 ring-black/10 cursor-pointer"
            onClick={() => window.open(src, "_blank")}
          />
        </div>
      );
    }

    if (format === "VIDEO") {
      if (!src) return null;

      return (
        <div className="mb-2">
          <PremiumVideoPlayer src={src} />
        </div>
      );
    }

    if (format === "DOCUMENT") {
      // Normalizamos meta usando fileUrl + mime + size que usted ya guarda
      let meta = {
        url: src || "",
        nombre: "Documento",
        size: Number(header.size || 0),
        mimeType: header.mime || header.mimeType || "",
      };

      const value = header.value;

      // Compatibilidad: si value llega como string u objeto
      if (!meta.url) {
        if (typeof value === "string") meta.url = normalizeUrl(value);
        else if (value && typeof value === "object") {
          meta.url = normalizeUrl(value.url || value.link || value.ruta);
          meta.nombre = value.nombre || value.fileName || meta.nombre;
          meta.size = Number(value.size || meta.size || 0);
          meta.mimeType = value.mimeType || meta.mimeType || "";
        }
      }

      // nombre fallback: si value es string y parece filename
      if (typeof value === "string" && value && !/^https?:\/\//i.test(value)) {
        meta.nombre = value;
      }
      if (
        typeof header.value === "string" &&
        header.value &&
        meta.nombre === "Documento"
      ) {
        meta.nombre = header.value;
      }
      if (header.value && typeof header.value === "object") {
        meta.nombre =
          header.value.nombre || header.value.fileName || meta.nombre;
      }

      if (!meta.url) return null;

      const ext = (
        meta.url.split(".").pop() ||
        meta.mimeType.split("/").pop() ||
        ""
      )
        .toUpperCase()
        .trim();

      const iconInfo = getFileIcon((meta.url.split(".").pop() || "").trim());

      return (
        <div className="mb-2">
          <a
            href={meta.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl shadow hover:bg-gray-100 transition-colors"
          >
            <span className="text-2xl">
              <i className={`${iconInfo.icon} ${iconInfo.color}`}></i>
            </span>

            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-gray-800 truncate">
                {meta.nombre}
              </span>
              <div className="flex text-xs text-gray-500 space-x-1">
                {meta.size ? (
                  <>
                    <span>
                      {meta.size > 1024 * 1024
                        ? `${(meta.size / 1024 / 1024).toFixed(2)} MB`
                        : `${(meta.size / 1024).toFixed(2)} KB`}
                    </span>
                    <span>•</span>
                  </>
                ) : null}
                <span>{ext || "DOC"}</span>
              </div>
            </div>

            <span className="ml-auto text-2xl text-blue-500 hover:text-blue-700 transition-colors">
              <i className="bx bx-download"></i>
            </span>
          </a>
        </div>
      );
    }

    if (format === "LOCATION") {
      const value = header.value;

      let lat = null;
      let lng = null;

      try {
        const obj =
          typeof value === "string" ? JSON.parse(value) : (value ?? {});
        lat = obj.latitude ?? obj.lat ?? null;
        lng = obj.longitude ?? obj.lng ?? obj.longitud ?? null;
      } catch {
        if (typeof value === "string" && value.includes(",")) {
          const [a, b] = value.split(",").map((x) => x.trim());
          lat = a;
          lng = b;
        }
      }

      if (!lat || !lng) return null;

      return (
        <div className="mb-2">
          <div className="w-full h-56 rounded-2xl overflow-hidden ring-1 ring-black/10 shadow bg-white">
            <iframe
              title="Mapa de ubicación"
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyDGulcdBtz_Mydtmu432GtzJz82J_yb-rs&q=${lat},${lng}&zoom=15`}
              allowFullScreen
            />
          </div>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline text-sm inline-block mt-2"
          >
            Ver ubicación en Google Maps
          </a>
        </div>
      );
    }

    return null;
  };

  const getPostbackUI = (mensaje) => {
    const meta = safeParseJSON(mensaje?.meta_unificado);
    const raw = meta?.raw || meta || null;

    const title = raw?.title || "";
    const payload = raw?.payload || "";

    return { title, payload };
  };

  const safeParseJSON = (val) => {
    if (!val) return null;
    if (typeof val === "object") return val;
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  };

  const extractUnifiedAttachmentCards = (mensaje) => {
    // 1) Intenta meta_unificado
    const meta = safeParseJSON(mensaje?.meta_unificado);
    const raw1 = meta?.raw || meta || null;
    const raw = raw1?.raw || raw1;

    let attachments = Array.isArray(raw?.attachments) ? raw.attachments : [];

    // 2) Fallback: attachments_unificado (a veces llega como string JSON)
    if (!attachments.length && mensaje?.attachments_unificado) {
      const au = safeParseJSON(mensaje.attachments_unificado);
      if (Array.isArray(au)) attachments = au;
    }

    const cards = [];

    for (const att of attachments) {
      // -----------------------------
      // A) Formato Instagram (generic)
      // -----------------------------
      const elements = att?.payload?.generic?.elements || [];
      if (elements.length) {
        for (const el of elements) {
          cards.push({
            title: el?.title || "",
            subtitle: el?.subtitle || "",
            buttons: Array.isArray(el?.buttons)
              ? el.buttons.map((b) => ({
                  type: b?.type || "",
                  title: b?.title || "",
                  payload: b?.payload || null,
                  url: b?.url || null,
                  phone_number: b?.phone_number || null,
                }))
              : [],
          });
        }
        continue;
      }

      // -----------------------------------
      // B) Formato Messenger (title + buttons)
      // -----------------------------------
      // Messenger: att.title y att.payload.buttons
      const mTitle = att?.title || att?.payload?.title || "";
      const mButtons = Array.isArray(att?.payload?.buttons)
        ? att.payload.buttons
        : [];

      if (mTitle || mButtons.length) {
        cards.push({
          title: mTitle,
          subtitle: "", // Messenger no siempre trae subtitle
          buttons: mButtons.map((b) => ({
            type: b?.type || "",
            title: b?.title || "",
            payload: b?.payload || null,
            url: b?.url || null,
            phone_number: b?.phone_number || null,
          })),
        });
        continue;
      }
    }

    return cards;
  };

  const parseRutaArchivo = (ruta) => {
    try {
      return ruta ? JSON.parse(ruta) : {};
    } catch {
      return {};
    }
  };

  const getUrlFullItems = (valores) => {
    // Busca keys tipo: url_full_0_1, url_full_1_1, etc.
    const entries = Object.entries(valores || {}).filter(([k, v]) => {
      return /^url_full_\d+_\d+$/.test(k) && typeof v === "string" && v.trim();
    });

    // Normaliza para render: [{ label, url }]
    return entries.map(([k, url]) => {
      const parts = k.split("_"); // ["url","full","0","1"]
      const index = parts[2]; // "0"
      return {
        key: k,
        index,
        url,
        label: `Abrir enlace`, // si luego quiere el nombre del botón, lo mejoramos
      };
    });
  };

  const getFileTypeFromUrl = (url = "") => {
    const clean = url.split("?")[0].toLowerCase();
    if (clean.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return "image";
    if (clean.match(/\.(mp4|webm|ogg)$/)) return "video";
    if (clean.match(/\.(pdf)$/)) return "pdf";
    return "file";
  };

  const PreviewFile = ({ url }) => {
    if (!url) return null;

    const type = getFileTypeFromUrl(url);
    const stop = (e) => e.stopPropagation();

    if (type === "image") {
      return (
        <div className="mt-2">
          <img
            src={url}
            alt="Vista previa"
            className="w-full max-w-[260px] h-auto rounded-lg border border-gray-200"
            loading="lazy"
          />

          {/* ✅ Solo este link NO debe seleccionar el item */}
          <a
            onClick={stop}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-2 text-sm text-blue-600 hover:underline"
          >
            Abrir imagen en nueva pestaña
          </a>
        </div>
      );
    }

    if (type === "video") {
      return (
        <div className="mt-2">
          <video
            src={url}
            controls
            className="w-full max-w-[320px] rounded-lg border border-gray-200"
          />
          <a
            onClick={stop}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-2 text-sm text-blue-600 hover:underline"
          >
            Abrir video en nueva pestaña
          </a>
        </div>
      );
    }

    return (
      <div className="mt-2">
        <a
          onClick={stop}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          Abrir archivo
        </a>
      </div>
    );
  };

  const safeParseDocMeta = (raw) => {
    // raw puede ser: null, "", "null", objeto, JSON string, ruta string
    if (raw == null) {
      return { ruta: "", nombre: "Documento", size: 0, mimeType: "" };
    }

    // Si ya viene como objeto
    if (typeof raw === "object") {
      return {
        ruta: raw.ruta || raw.path || "",
        nombre: raw.nombre || raw.name || "Documento",
        size: Number(raw.size || 0),
        mimeType: raw.mimeType || raw.mimetype || "",
      };
    }

    // Si viene como string
    const s = String(raw).trim();

    // casos típicos: "null", "undefined", ""
    if (!s || s === "null" || s === "undefined") {
      return { ruta: "", nombre: "Documento", size: 0, mimeType: "" };
    }

    // Intentar parsear JSON
    try {
      const parsed = JSON.parse(s);

      // OJO: JSON.parse("null") => null
      if (!parsed || typeof parsed !== "object") {
        return { ruta: "", nombre: "Documento", size: 0, mimeType: "" };
      }

      return {
        ruta: parsed.ruta || parsed.path || "",
        nombre: parsed.nombre || parsed.name || "Documento",
        size: Number(parsed.size || 0),
        mimeType: parsed.mimeType || parsed.mimetype || "",
      };
    } catch {
      // Si no es JSON, asumimos que es una ruta directa
      return { ruta: s, nombre: "Documento", size: 0, mimeType: "" };
    }
  };

  const buildFileUrl = (ruta = "") => {
    if (!ruta) return "";
    const clean = String(ruta).trim();
    if (!clean) return "";
    if (/^https?:\/\//i.test(clean)) return clean;

    // normaliza slashes
    return `https://new.imporsuitpro.com/${clean.replace(/^\//, "")}`;
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
          <div className="flex flex-col h-[calc(100vh-140px)] relative">
            {/* 
              1) Contenedor principal del chat 
              (fondo intacto)
            */}
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="
                flex-1
                overflow-y-auto
                p-5
                pb-4
                space-y-5 md:space-y-6
              "
              style={chatBgStyle}
            >
              {/* === Render con divisores por fecha === */}
              {(() => {
                const items = [];
                for (let i = 0; i < mensajesActuales.length; i++) {
                  const mensaje = mensajesActuales[i];
                  const prev = mensajesActuales[i - 1];

                  // Si es el primero o cambió el día, insertamos divisor
                  if (!prev || isNewDay(prev.created_at, mensaje.created_at)) {
                    items.push(
                      <DayDivider
                        key={`day-${mensaje.created_at}-${i}`}
                        label={formatDayLabel(mensaje.created_at)}
                      />,
                    );
                  }

                  const key =
                    mensaje.id ??
                    mensaje.mid_mensaje ??
                    `${mensaje.created_at}-${(
                      mensaje.texto_mensaje || ""
                    ).slice(0, 16)}`;

                  // ✅ NUEVO: Render especial para notificaciones (centrado amarillo)
                  if (mensaje.tipo_mensaje === "notificacion") {
                    items.push(
                      <div key={key} className="flex justify-center px-4">
                        <div
                          className="
                            inline-flex items-center gap-2
                            rounded-full
                            bg-yellow-100/70
                            border border-yellow-200
                            px-4 py-2
                              text-[16px] text-yellow-900
                            shadow-sm
                          "
                          title={formatFecha(mensaje.created_at)}
                        >
                          <i className="bx bx-info-circle text-[21px] text-yellow-900/80" />
                          <span className="leading-snug">
                            {mensaje.texto_mensaje || "Notificación"}
                          </span>
                          <span className="ml-2 text-[14px] text-yellow-900/60">
                            {formatHora(mensaje.created_at)}
                          </span>
                        </div>
                      </div>,
                    );
                    continue;
                  }

                  const hasError = !!mensaje?.error_meta;
                  const errorText = hasError
                    ? mensaje.error_meta.mensaje_error ||
                      (mensaje.error_meta.codigo_error
                        ? `Error código ${mensaje.error_meta.codigo_error}`
                        : "Error al enviar este mensaje")
                    : "";

                  // paleta de burbuja segun canal y rol
                  let bubblePaletteClass = "bg-white";
                  if (mensaje.rol_mensaje === 1) {
                    if (isMessenger) {
                      bubblePaletteClass = "bg-[#0084FF] text-white";
                    } else if (isInstagram) {
                      bubblePaletteClass = "bg-[#7C3AED] text-white";
                    } else {
                      bubblePaletteClass = "bg-[#DCF8C6]";
                    }
                  } else {
                    if (isMessenger) {
                      bubblePaletteClass = "bg-gray-100 text-gray-900";
                    } else if (isInstagram) {
                      bubblePaletteClass = "bg-white text-gray-900";
                    } else {
                      bubblePaletteClass = "bg-white";
                    }
                  }

                  // color timestamp segun canal y rol
                  const timestampClass =
                    isMessenger || isInstagram
                      ? mensaje.rol_mensaje === 1
                        ? "text-white/90"
                        : "text-gray-500"
                      : mensaje.rol_mensaje === 1
                        ? "text-gray-700"
                        : "text-gray-500";

                  items.push(
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
                            self-center mr-3 px-2.5 py-1 text-xs rounded-full
                            border border-red-200 bg-red-50/80 hover:bg-red-100
                            text-red-600 flex items-center gap-1 transition-colors
                          "
                          title="Reintentar envío"
                        >
                          <i className="bx bx-redo text-xl" />
                          Reenviar
                        </button>
                      )}

                      {/* Burbuja SIN cola, más robusta */}
                      <div
                        className={`
                          relative px-4 py-3 md:px-5 md:py-3.5 rounded-2xl
                          min-w-[52%] sm:min-w-[38%] md:min-w-[32%]
                          max-w-[80%] md:max-w-[70%]
                          whitespace-pre-wrap break-words
                          shadow-[0_1px_6px_rgb(0_0_0_/_0.08)]
                          ring-1 ring-black/5
                          ${bubblePaletteClass}
                          ${hasError ? "ring-red-600/90" : ""}
                        `}
                        title={hasError ? errorText : undefined}
                      >
                        {/* Alerta interna si hubo error */}
                        {hasError && (
                          <div className="mb-2 -mt-1 -mx-1 px-1.5 py-0.5 text-[11px] leading-none flex items-center gap-1 text-red-600/90">
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
                                    mensaje.error_meta.codigo_error,
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
                            Enviado por {prettyAgentName(mensaje.responsable)}:
                          </div>
                        )}

                        {/* Contenido del mensaje (texto, audio, imagen, etc.) */}
                        <span className="text-[15px] md:text-sm pb-2 inline-block w-full">
                          {/* Tipo: TEXT / TEMPLATE */}
                          {mensaje.tipo_mensaje === "postback" ? (
                            (() => {
                              const pb = getPostbackUI(mensaje);

                              // Si hay title en meta_unificado, úselo. Si no, fallback al texto_mensaje.
                              const label =
                                pb.title || mensaje.texto_mensaje || "Postback";

                              return (
                                <div className="flex items-start gap-2">
                                  <span
                                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-white ${
                                      mensaje.rol_mensaje === 1
                                        ? "bg-white/30"
                                        : "bg-gray-400"
                                    }`}
                                    title="Postback"
                                  >
                                    <i className="bx bx-pointer text-sm" />
                                  </span>

                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold">
                                      Interacción
                                    </p>

                                    <p className="text-xs opacity-90 whitespace-pre-wrap break-words">
                                      {label}
                                    </p>

                                    {/* opcional: mostrar el payload en pequeño (o eliminarlo si no lo quiere) */}
                                    {pb.payload ? (
                                      <p className="text-[11px] mt-1 text-slate-500 break-words">
                                        {pb.payload}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })()
                          ) : mensaje.tipo_mensaje === "text" ||
                            mensaje.tipo_mensaje === "edit" ? (
                            //  Si es edit: solo texto plano
                            mensaje.tipo_mensaje === "edit" ? (
                              <p>
                                {linkify(
                                  (mensaje.texto_mensaje || "").replace(
                                    /^\*[^*]+\*\s*🎤:\s*\r?\n/,
                                    "",
                                  ),
                                )}
                              </p>
                            ) : // ✅ Si es text: mantiene tu lógica actual (templates si tiene {{ }} y ruta_archivo)
                            mensaje.texto_mensaje.includes("{{") &&
                              mensaje.ruta_archivo ? (
                              <p>
                                {mensaje.texto_mensaje.replace(
                                  /\{\{(.*?)\}\}/g,
                                  (match, key) => {
                                    const valores = JSON.parse(
                                      mensaje.ruta_archivo,
                                    );
                                    return valores[key.trim()] || match;
                                  },
                                )}
                              </p>
                            ) : (
                              <p>
                                {linkify(
                                  (mensaje.texto_mensaje || "").replace(
                                    /^\*[^*]+\*\s*🎤:\s*\r?\n/,
                                    "",
                                  ),
                                )}
                              </p>
                            )
                          ) : mensaje.tipo_mensaje === "revoke" ? (
                            <div className="flex justify-center">
                              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-gray-600">
                                <span>{mensaje.texto_mensaje}</span>
                              </span>{" "}
                            </div>
                          ) : mensaje.tipo_mensaje === "unsupported" ? (
                            <div className="flex items-start gap-2">
                              <span
                                className={`inline-flex items-center justify-center
                              h-6 w-6 rounded-full text-white
                               ${
                                 mensaje.rol_mensaje === 1
                                   ? "bg-white/30"
                                   : "bg-gray-400"
                               }`}
                                title="No soportado"
                              >
                                <i className="bx bx-block text-sm" />
                              </span>
                              <div>
                                <p className="text-sm font-semibold">
                                  Contenido no compatible en{" "}
                                  {platformLabel(selectedChat?.source)}
                                </p>
                                <p className="text-xs opacity-80">
                                  El adjunto que enviaron no puede mostrarse
                                  aquí. Revisa la conversación desde la app
                                  nativa.
                                </p>
                                {/* Si tu API mandó algún texto descriptivo, muéstralo como pista */}
                                {mensaje.texto_mensaje ? (
                                  <p className="text-xs mt-1 italic opacity-80">
                                    {mensaje.texto_mensaje}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ) : mensaje.tipo_mensaje === "template" ? (
                            (() => {
                              const valoresRaw = parseRutaArchivo(
                                mensaje.ruta_archivo,
                              );

                              const placeholders =
                                getTemplatePlaceholders(valoresRaw);

                              // Detecta header
                              const header = valoresRaw?.header;

                              //si hay header, lo muestra arriba
                              const headerNode = renderTemplateHeader(header);

                              // Texto con placeholders {{1}}, {{2}}...
                              const textoRender = (
                                mensaje.texto_mensaje || ""
                              ).replace(/\{\{(.*?)\}\}/g, (match, key) => {
                                const k = String(key).trim();
                                return (
                                  placeholders?.[k] ?? valoresRaw?.[k] ?? match
                                );
                              });

                              const urlFullItems = getUrlFullItems({
                                ...valoresRaw,
                                ...(typeof placeholders === "object"
                                  ? placeholders
                                  : {}),
                              });

                              return (
                                <div className="space-y-2">
                                  {/* ✅ HEADER (imagen/video/document/location) */}
                                  {headerNode}

                                  {/* ✅ BODY */}
                                  {textoRender ? <p>{textoRender}</p> : null}

                                  {/* ✅ LINKS FULL */}
                                  {urlFullItems.length > 0 && (
                                    <div className="mt-2 flex flex-col gap-2">
                                      {urlFullItems.map((it) => (
                                        <a
                                          key={it.key}
                                          href={it.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="
                                              inline-flex items-center justify-between gap-3
                                              rounded-xl border border-slate-200 bg-white/70
                                              px-3 py-2 text-sm
                                              hover:bg-slate-50 transition
                                              shadow-sm
                                            "
                                        >
                                          <span className="inline-flex items-center gap-2 text-slate-700 font-semibold">
                                            <i className="bx bx-link-external text-lg text-blue-600" />
                                            {it.label}
                                          </span>

                                          <span className="text-xs text-blue-600 font-semibold">
                                            Ver
                                            <i className="bx bx-chevron-right text-base align-middle ml-1" />
                                          </span>
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()
                          ) : mensaje.tipo_mensaje === "audio" ? (
                            <WaAudioPlayer src={mensaje.ruta_archivo} />
                          ) : mensaje.tipo_mensaje === "image" ? (
                            <ImageWithModal mensaje={mensaje} />
                          ) : mensaje.tipo_mensaje === "document" ? (
                            (() => {
                              const meta = safeParseDocMeta(
                                mensaje.ruta_archivo,
                              );

                              // link final a abrir
                              const link = buildFileUrl(meta.ruta);

                              // Si NO hay ruta (su caso actual), muestre fallback elegante
                              if (!link) {
                                return (
                                  <div className="p-2">
                                    <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-xl border border-yellow-200">
                                      <span className="text-2xl text-yellow-700">
                                        <i className="bx bx-file-blank" />
                                      </span>
                                      <div className="text-sm text-yellow-800">
                                        Documento no disponible (este mensaje
                                        llegó sin <b>ruta_archivo</b>).
                                      </div>
                                    </div>

                                    {mensaje.texto_mensaje ? (
                                      <p className="pt-2">
                                        {mensaje.texto_mensaje}
                                      </p>
                                    ) : null}
                                  </div>
                                );
                              }

                              const ext = (
                                meta.ruta?.split(".").pop() ||
                                meta.mimeType?.split("/").pop() ||
                                ""
                              ).toUpperCase();

                              const iconInfo = getFileIcon(
                                meta.ruta?.split(".").pop() || "",
                              );

                              return (
                                <div className="p-2">
                                  {/* ✅ Preview reutilizando su helper */}
                                  <PreviewFile url={link} />

                                  {/* ✅ Card de descarga como usted ya la tiene */}
                                  <a
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl shadow hover:bg-gray-100 transition-colors"
                                  >
                                    <span className="text-2xl">
                                      <i
                                        className={`${iconInfo.icon} ${iconInfo.color}`}
                                      ></i>
                                    </span>

                                    <div className="flex flex-col min-w-0">
                                      <span className="font-semibold text-sm text-gray-800 truncate">
                                        {meta.nombre || "Documento"}
                                      </span>

                                      <div className="flex text-xs text-gray-500 space-x-1">
                                        <span>
                                          {meta.size > 1024 * 1024
                                            ? `${(meta.size / 1024 / 1024).toFixed(2)} MB`
                                            : `${(meta.size / 1024).toFixed(2)} KB`}
                                        </span>
                                        <span>•</span>
                                        <span>{ext || "FILE"}</span>
                                      </div>
                                    </div>

                                    <span className="ml-auto text-2xl text-blue-500 hover:text-blue-700 transition-colors">
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
                            <div className="p-1">
                              <PremiumVideoPlayer src={mensaje.ruta_archivo} />
                            </div>
                          ) : mensaje.tipo_mensaje === "location" ? (
                            (() => {
                              try {
                                const locationData = JSON.parse(
                                  mensaje.texto_mensaje,
                                );

                                // Usamos 'longitude' si existe, si no, usamos 'longitud'
                                let { latitude, longitude, longitud } =
                                  locationData;

                                if (
                                  longitude === undefined &&
                                  longitud !== undefined
                                ) {
                                  longitude = longitud;
                                }

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
                                  error,
                                );
                                return <p>Error al mostrar la ubicación.</p>;
                              }
                            })()
                          ) : mensaje.tipo_mensaje === "attachment" ? (
                            (() => {
                              const cards =
                                extractUnifiedAttachmentCards(mensaje);

                              // Si no hay cards, muestre algo decente (y no "no reconocido")
                              if (!cards || cards.length === 0) {
                                return (
                                  <div className="text-sm opacity-80">
                                    Adjuntos (Instagram/Messenger) no
                                    disponibles para renderizar.
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-2">
                                  {cards.map((c, idx) => (
                                    <div
                                      key={idx}
                                      className="rounded-2xl border border-black/10 bg-white/70 p-3 shadow-sm"
                                    >
                                      {c.title ? (
                                        <div className="text-sm font-semibold text-slate-900 whitespace-pre-wrap">
                                          {c.title}
                                        </div>
                                      ) : null}

                                      {c.subtitle ? (
                                        <div className="mt-1 text-xs text-slate-700 whitespace-pre-wrap">
                                          {c.subtitle}
                                        </div>
                                      ) : null}

                                      {c.buttons && c.buttons.length > 0 ? (
                                        <div className="mt-2 flex flex-col gap-2">
                                          {c.buttons.map((b, bi) => {
                                            // URL button
                                            if (b.type === "web_url" && b.url) {
                                              return (
                                                <a
                                                  key={bi}
                                                  href={b.url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="
                                                    inline-flex items-center justify-between gap-3
                                                    rounded-xl border border-slate-200 bg-white/80
                                                    px-3 py-2 text-sm
                                                    hover:bg-slate-50 transition
                                                  "
                                                >
                                                  <span className="inline-flex items-center gap-2 text-slate-800 font-semibold">
                                                    <i className="bx bx-link-external text-lg text-blue-600" />
                                                    {b.title || "Abrir enlace"}
                                                  </span>
                                                  <span className="text-xs text-blue-600 font-semibold">
                                                    Ver
                                                    <i className="bx bx-chevron-right text-base align-middle ml-1" />
                                                  </span>
                                                </a>
                                              );
                                            }

                                            // Call button
                                            if (
                                              b.type === "phone_number" &&
                                              b.phone_number
                                            ) {
                                              const tel = String(
                                                b.phone_number,
                                              );
                                              return (
                                                <a
                                                  key={bi}
                                                  href={`tel:${tel}`}
                                                  className="
                                                    inline-flex items-center justify-between gap-3
                                                    rounded-xl border border-slate-200 bg-white/80
                                                    px-3 py-2 text-sm
                                                    hover:bg-slate-50 transition
                                                  "
                                                >
                                                  <span className="inline-flex items-center gap-2 text-slate-800 font-semibold">
                                                    <i className="bx bx-phone text-lg text-green-600" />
                                                    {b.title || "Llamar"}
                                                  </span>
                                                  <span className="text-xs text-slate-600 font-semibold">
                                                    {tel}
                                                  </span>
                                                </a>
                                              );
                                            }

                                            // Postback / quick_reply (no hay URL; mostramos “acción”)
                                            return (
                                              <div
                                                key={bi}
                                                className="
                                                    inline-flex items-center justify-between gap-3
                                                    rounded-xl border border-slate-200 bg-white/70
                                                    px-3 py-2 text-sm
                                                  "
                                                title={
                                                  b.payload
                                                    ? String(b.payload)
                                                    : "Acción"
                                                }
                                              >
                                                <span className="inline-flex items-center gap-2 text-slate-800 font-semibold">
                                                  <i className="bx bx-pointer text-lg text-purple-600" />
                                                  {b.title || "Acción"}
                                                </span>
                                                <span className="text-[11px] text-slate-500 font-semibold">
                                                  {b.type || "postback"}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()
                          ) : mensaje.tipo_mensaje === "button" ? (
                            mensaje.texto_mensaje
                          ) : mensaje.tipo_mensaje === "reaction" ? (
                            mensaje.texto_mensaje
                          ) : mensaje.tipo_mensaje === "sticker" ? (
                            <img
                              className="w-40 h-40"
                              src={
                                /^https?:\/\//.test(mensaje.ruta_archivo)
                                  ? mensaje.ruta_archivo
                                  : "https://new.imporsuitpro.com/" +
                                    mensaje.ruta_archivo
                              }
                              alt="Sticker"
                            />
                          ) : (
                            "Mensaje no reconocido"
                          )}
                        </span>

                        {/* Hora en la esquina; tooltip = fecha completa */}
                        <span
                          className={`absolute bottom-1 right-2 text-xs ${timestampClass}`}
                          title={formatFecha(mensaje.created_at)}
                        >
                          {formatHora(mensaje.created_at)}
                        </span>
                      </div>
                    </div>,
                  );
                }
                return items;
              })()}

              {/* Botón de scroll al final */}
              <ScrollToBottomButton containerRef={chatContainerRef} />
            </div>

            {/* Ventana de 24 horas (UI informativa por canal) */}
            {selectedChat &&
              !hide24hBanner &&
              (() => {
                const isMetaDMLocal =
                  selectedChat.source === "ms" || selectedChat.source === "ig";
                const refDateISO = isMetaDMLocal
                  ? selectedChat.last_incoming_at ||
                    selectedChat.mensaje_created_at
                  : ultimoMensaje?.created_at;

                if (!refDateISO) return null;

                const diffHrs =
                  (Date.now() - new Date(refDateISO).getTime()) /
                  (1000 * 60 * 60);

                if (diffHrs <= 24) return null;

                // WhatsApp
                if (!isMetaDMLocal) {
                  return (
                    <div className="bg-yellow-100 border-t border-yellow-500 shadow-lg p-4 w-full z-10 shrink-0">
                      <div className="flex items-start gap-3">
                        <p className="text-sm text-yellow-700 flex-1">
                          <strong>Atención:</strong> Pasaron más de 24 horas
                          desde el último mensaje. Por una regla de WhatsApp,
                          ahora solo podemos responder con una{" "}
                          <b>plantilla aprobada</b>. <br />
                          Para continuar, haz clic en{" "}
                          <b>“Responder con plantilla”</b> y elige una de la
                          lista.
                        </p>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-md shadow transition-all duration-200"
                          onClick={() => {
                            const phone = selectedChat?.celular_cliente || "";

                            setNumeroModalPreset({
                              step: "buscar",
                              phone,
                              lockPhone: true,
                              contextLabel:
                                "Responderá con plantilla al chat actual",
                              clienteNombre: selectedChat?.nombre_cliente || "",
                              idEncargado: selectedChat?.id_encargado || null,
                            });

                            setNumeroModal(true);
                          }}
                        >
                          Responder con plantilla
                        </button>
                      </div>
                    </div>
                  );
                }

                // Meta DM (Messenger/Instagram)
                return (
                  <div className="bg-blue-50 border-t border-blue-300 shadow-lg p-4 w-full z-10 shrink-0">
                    <div className="flex items-start gap-3">
                      <p className="text-sm text-blue-800 flex-1">
                        Han pasado más de 24 horas. Al enviar, usaré la etiqueta{" "}
                        <b>HUMAN_AGENT</b> o el mensaje fallará por políticas de
                        Meta
                        {selectedChat?.source === "ig"
                          ? " (Instagram)"
                          : " (Messenger)"}
                        .
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
            {!waNeedsTemplate && (
              <div className="flex items-center gap-2 p-4 w-full border-t bg-gray-100 shrink-0">
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
                  <div className="absolute bottom-[10%] left-[5%] bg-white border rounded shadow-lg p-2 w-32 z-10">
                    <ul className="flex flex-col space-y-2 text-sm">
                      <li
                        className="cursor-pointer hover:bg-gray-200 p-1 rounded"
                        onClick={() => {
                          handleModal_enviarArchivos("Imagen");
                        }}
                      >
                        Imagen
                      </li>
                      <li
                        className="cursor-pointer hover:bg-gray-200 p-1 rounded"
                        onClick={() => {
                          {
                            handleModal_enviarArchivos("Video");
                          }
                        }}
                      >
                        Video
                      </li>
                      <li
                        className="cursor-pointer hover:bg-gray-200 p-1 rounded"
                        onClick={() => {
                          handleModal_enviarArchivos("Documento");
                        }}
                      >
                        Documento
                      </li>
                      {selectedChat?.source === "wa" && (
                        <li
                          className="cursor-pointer hover:bg-gray-200 p-1 rounded"
                          onClick={() => {
                            const phone = selectedChat?.celular_cliente || "";

                            setNumeroModalPreset({
                              step: "buscar",
                              phone,
                              lockPhone: true,
                              contextLabel:
                                "Responderá con plantilla al chat actual",
                              clienteNombre: selectedChat?.nombre_cliente || "",
                              idEncargado: selectedChat?.id_encargado || null,
                            });

                            setNumeroModal(true);
                          }}
                        >
                          Enviar template
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Inputs ocultos para Messenger/IG */}
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

                {commandAttachment && (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl border bg-white shadow-sm max-w-[260px]">
                    {/* Thumbnail fijo (recorta lo que renderice PreviewFile) */}
                    <div
                      className="
                      h-10 w-10 rounded-lg overflow-hidden bg-gray-100 shrink-0
                      [&_img]:h-full [&_img]:w-full [&_img]:object-cover
                      [&_video]:h-full [&_video]:w-full [&_video]:object-cover
                      [&_iframe]:h-full [&_iframe]:w-full
                    "
                      title="Adjunto seleccionado desde atajo"
                    >
                      <PreviewFile url={commandAttachment} />
                    </div>

                    {/* Texto corto (no ocupa mucho) */}
                    <div className="min-w-0">
                      <div className="text-[11px] text-gray-500 leading-none">
                        Adjunto desde atajo
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCommandAttachment(null)}
                      className="ml-auto text-gray-500 hover:text-gray-800 px-2"
                      title="Quitar adjunto"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <textarea
                  value={mensaje}
                  onChange={onChangeWithTyping}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 p-2 border rounded resize-none overflow-y-auto leading-5"
                  ref={inputRef}
                  id="mensaje"
                  disabled={isChatBlocked}
                  rows={1}
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
                            key={result.id_template ?? index}
                            onClick={() =>
                              handleOptionSelect({
                                mensaje: result.mensaje,
                                ruta_archivo: result.ruta_archivo || null,
                              })
                            }
                            className="cursor-pointer hover:bg-gray-200 p-2 rounded"
                          >
                            <div>
                              <strong>Atajo:</strong> {result.atajo}
                            </div>

                            <div>
                              <strong>Mensaje:</strong> {result.mensaje}
                            </div>

                            {/* Vista previa del archivo si existe */}
                            {result.ruta_archivo && (
                              <PreviewFile url={result.ruta_archivo} />
                            )}
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500">No hay resultados</li>
                      )}
                    </ul>
                  </div>
                )}

                <button
                  title="Enviar mensaje"
                  onClick={
                    canSend
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
                  {canSend ? (
                    <i className="bx bx-send"></i>
                  ) : grabando ? (
                    <i className="bx bx-stop"></i>
                  ) : (
                    <i className="bx bx-microphone"></i>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ChatPrincipal;
