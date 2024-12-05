import React from "react";
import { useState, useRef, useEffect } from "react";
import { set, useForm } from "react-hook-form";
import { addNumberThunk } from "../../store/slices/number.slice";
import { useDispatch } from "react-redux";
import EmojiPicker from "emoji-picker-react";
import { jwtDecode } from "jwt-decode";
import io from "socket.io-client";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { da, es } from "date-fns/locale"; // Importa el locale para español
import Cabecera from "../../components/chat/Cabecera";
import { Sidebar } from "../../components/chat/Sidebar";
import ChatPrincipal from "../../components/chat/ChatPrincipal";
import DatosUsuario from "../../components/chat/DatosUsuario";
import Modales from "../../components/chat/Modales";
import chatApi from "../../api/chatcenter";

const Chat = () => {
  const formatFecha = (fechaISO) => {
    const fecha = new Date(fechaISO);

    if (isToday(fecha)) {
      // Si es hoy, solo mostrar la hora
      return format(fecha, "HH:mm", { locale: es });
    } else if (isYesterday(fecha)) {
      // Si es ayer, mostrar "Ayer"
      return "Ayer";
    } else if (isThisWeek(fecha)) {
      // Si es esta semana, mostrar el nombre del día
      return format(fecha, "EEEE", { locale: es }); // Nombre del día (e.g., Lunes)
    } else {
      // Si es más de una semana, mostrar la fecha completa
      return format(fecha, "dd/MM/yyyy", { locale: es });
    }
  };

  const dispatch = useDispatch();

  const [provincias, setProvincias] = useState(null);
  const [facturasChatSeleccionado, setFacturasChatSeleccionado] =
    useState(null);

  const [seRecibioMensaje, setSeRecibioMensaje] = useState(false);

  const [dataAdmin, setDataAdmin] = useState(null);

  const [userData, setUserData] = useState(null);

  const [opciones, setOpciones] = React.useState(false);

  const [mostrarAudio, setMostrarAudio] = useState(false);

  const [chatTemporales, setChatTemporales] = useState(35);

  const [animateOut, setAnimateOut] = useState(false);

  const [numeroModal, setNumeroModal] = useState(false);

  const [filtro_chats, setFiltro_chats] = useState(false);

  const [mensaje, setMensaje] = useState("");

  const [emojiOpen, setEmojiOpen] = useState(false);

  const [file, setFile] = useState(null);

  const inputRef = useRef(null); // Referencia al input de mensaje

  const emojiPickerRef = useRef(null); // Referencia al contenedor del selector de emojis

  const [grabando, setGrabando] = useState(false); // Estado para grabación

  const [audioBlob, setAudioBlob] = useState(null); // Almacena la grabación

  const mediaRecorderRef = useRef(null);

  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const [mensajesAcumulados, setMensajesAcumulados] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [searchTermEtiqueta, setSearchTermEtiqueta] = useState("");

  const [selectedChat, setSelectedChat] = useState(null);

  const [chatMessages, setChatMessages] = useState([]);

  const [mensajesOrdenados, setMensajesOrdenados] = useState([]);

  const [isCommandActive, setIsCommandActive] = useState(false); // Estado para el cuadro de opciones

  const [isChatBlocked, setIsChatBlocked] = useState(false); // Estado para bloquear el chat

  const [menuSearchTerm, setMenuSearchTerm] = useState(""); // Estado para el término de búsqueda

  const [searchResults, setSearchResults] = useState([]); // Estado para almacenar los resultados de la búsqueda

  const [menuSearchTermNumeroCliente, setMenuSearchTermNumeroCliente] =
    useState(""); // Estado para el término de búsqueda numero Cliente

  const [searchResultsNumeroCliente, setSearchResultsNumeroCliente] = useState(
    []
  ); // Estado para almacenar los resultados de la búsqueda numero Cliente

  const inputRefNumeroTelefono = useRef(null); // Referencia al input de mensaje numero telefono

  const [seleccionado, setSeleccionado] = useState(false); // para la condicion del buscar numero Telefono

  const [templates, setTemplates] = useState([]);

  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState("");

  /* abrir modal crear etiquetas */
  const [isCrearEtiquetaModalOpen, setIsCrearEtiquetaModalOpen] =
    useState(false);

  const [etiquetasMenuOpen, setEtiquetasMenuOpen] = useState(false);

  const [tagList, setTagList] = useState([]);

  const toggleCrearEtiquetaModal = () => {
    fetchTags();
    setIsCrearEtiquetaModalOpen(!isCrearEtiquetaModalOpen);
    if (etiquetasMenuOpen) {
      setEtiquetasMenuOpen(!etiquetasMenuOpen);
    }
  };

  const handleChange = (selectedOptions) => {
    setSelectedEtiquetas(selectedOptions || []);
  };

  const fetchTags = async () => {
    try {
      // Crear un objeto FormData y agregar los datos necesarios
      const formData = new FormData();
      formData.append("id_plataforma", userData.plataforma);

      const response = await fetch(
        "https://new.imporsuitpro.com/Pedidos/obtener_etiquetas",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Error al obtener las etiquetas");
      }

      const data = await response.json();
      setTagList(data); // Suponiendo que `data` es un array de etiquetas
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  /* fin abrir modal crear etiquetas */

  /* abrir modal asignar etiquetas */
  const [tagListAsginadas, setTagListAsginadas] = useState([]);

  const [isAsignarEtiquetaModalOpen, setIsAsignarEtiquetaModalOpen] =
    useState(false);

  const toggleAsginarEtiquetaModal = () => {
    fetchTagsAsginadas();
    setIsAsignarEtiquetaModalOpen(!isAsignarEtiquetaModalOpen);
    if (etiquetasMenuOpen) {
      setEtiquetasMenuOpen(!etiquetasMenuOpen);
    }
  };

  const fetchTagsAsginadas = async () => {
    try {
      // Crear un objeto FormData y agregar los datos necesarios
      const formData = new FormData();
      formData.append("id_cliente_chat_center", selectedChat.id);

      const response = await fetch(
        "https://new.imporsuitpro.com/Pedidos/obtener_etiquetas_asignadas",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Error al obtener las etiquetas");
      }

      const data = await response.json();
      setTagListAsginadas(data); // Suponiendo que `data` es un array de etiquetas
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };
  /* fin abrir modal asignar etiquetas */

  /* modal de enviar archivos */
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modal_enviarArchivos, setModal_enviarArchivos] = useState(false);
  const [tipo_modalEnviarArchivo, setTipo_modalEnviarArchivo] = useState("");

  const agregar_mensaje_enviado = async (
    texto_mensaje,
    tipo_mensaje,
    ruta_archivo,
    telefono_recibe,
    mid_mensaje,
    id_recibe,
    id_plataforma,
    telefono_configuracion
  ) => {
    const formData = new FormData();
    formData.append("texto_mensaje", texto_mensaje);
    formData.append("tipo_mensaje", tipo_mensaje);
    formData.append("mid_mensaje", mid_mensaje);
    formData.append("id_recibe", id_recibe);
    formData.append("ruta_archivo", ruta_archivo);
    formData.append("telefono_recibe", telefono_recibe);
    formData.append("id_plataforma", id_plataforma);
    formData.append("telefono_configuracion", telefono_configuracion);

    try {
      const response = await fetch(
        "https://new.imporsuitpro.com/" + "pedidos/agregar_mensaje_enviado",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (response.ok) {
        console.log("Guardado:", result);
      } else {
        console.error("Error en la respuesta del servidor:", result);
        alert(
          `Error: ${
            result.message || "Ocurrió un error al guardar el mensaje."
          }`
        );
      }
    } catch (error) {
      console.error("Error en la solicitud de guardado:", error);
      alert("Ocurrió un error en la solicitud. Inténtalo de nuevo más tarde.");
    }
  };

  // Función para obtener el icono y color según la extensión del archivo
  const getFileIcon = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();

    switch (extension) {
      case "pdf":
        return { icon: "fas fa-file-pdf", color: "text-red-500" };
      case "doc":
      case "docx":
        return { icon: "fas fa-file-word", color: "text-blue-500" };
      case "xls":
      case "xlsx":
        return { icon: "fas fa-file-excel", color: "text-green-500" };
      case "csv":
        return { icon: "fa-solid fa-file-csv", color: "text-green-500" };
      case "ppt":
      case "pptx":
        return { icon: "fas fa-file-powerpoint", color: "text-orange-500" };
      case "txt":
        return { icon: "fas fa-file-alt", color: "text-gray-500" };
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return { icon: "fas fa-file-image", color: "text-yellow-500" };
      case "html":
      case "php":
      case "js":
      case "css":
      case "sql":
        return { icon: "fa-solid fa-file-code", color: "text-gray-500" };
      default:
        return { icon: "fas fa-file", color: "text-gray-500" };
    }
  };
  /* final modal de enviar arhivos */

  const handleMenuSearchChange = (e) => {
    setMenuSearchTerm(e.target.value);
  };

  const handleInputChange_numeroCliente = (e) => {
    setSeleccionado(false);
    setMenuSearchTermNumeroCliente(e.target.value);
  };

  // Manejar la selección del número de teléfono y activar la sección de templates
  const handleSelectPhoneNumber = (phoneNumber) => {
    setSelectedPhoneNumber(phoneNumber);
    setSeleccionado(true);
  };

  const getOrderedChats = () => {
    const todosLosMensajes = chatMessages.flatMap((chat) => chat.mensajes);
    return todosLosMensajes.sort((a, b) => {
      const fechaA = new Date(a.created_at);
      const fechaB = new Date(b.created_at);
      return fechaA - fechaB;
    });
  };

  const handleOptionSelect = (option) => {
    setMensaje(option); // Pon el texto seleccionado en el campo de entrada
    setIsCommandActive(false); // Cierra el cuadro de opciones
    setIsChatBlocked(false); // Desbloquea el chat

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus(); // Enfoca el input de mensaje
      }
    }, 100); // Asegurarse de que el input esté montado
  };

  const handleOptionSelectNumeroTelefono = (option) => {
    setSeleccionado(true); // Pon el texto seleccionado en el campo de entrada
    setMenuSearchTermNumeroCliente(option);

    setTimeout(() => {
      if (inputRefNumeroTelefono.current) {
        inputRefNumeroTelefono.current.focus(); // Enfoca el input de mensaje
      }
    }, 100); // Asegurarse de que el input esté montado
  };

  const endOfMessagesRef = useRef(null);

  // Función para desplazarse al final de los mensajes
  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleOpciones = () => {
    if (opciones) {
      // Activa la animación de salida antes de ocultar el componente
      setAnimateOut(true);
      setTimeout(() => {
        setOpciones(false);
        setAnimateOut(false); // Restablece el estado de animación
      }, 300); // Coincide con la duración de la animación
    } else {
      setOpciones(true);
    }
  };

  const handleNumeroModal = () => {
    setNumeroModal(!numeroModal);
    setSeleccionado(false);
  };

  const handleFiltro_chats = () => {
    setFiltro_chats(!filtro_chats);
  };

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();

  const handleSubmit_template = () => {};

  const handleNumeroModalForm = (data) => {
    dispatch(addNumberThunk(data));
    setNumeroModal(false);
    reset({
      numero: "",
    });
  };

  /* abrir y cerrar modal enviar archivo */
  const handleModal_enviarArchivos = (tipo) => {
    setModal_enviarArchivos(!modal_enviarArchivos);
    setTipo_modalEnviarArchivo(tipo);
    setIsMenuOpen(false);
  };
  /* fin abrir y cerrar modal enviar archivo */

  const handleEmojiClick = (emoji) => {
    const input = inputRef.current;
    const cursorPos = input.selectionStart; // Posición actual del cursor

    // Construir el nuevo mensaje con el emoji en la posición correcta
    const newText =
      mensaje.slice(0, cursorPos) + emoji.emoji + mensaje.slice(cursorPos);

    // Actualizar el estado del mensaje
    setMensaje(newText);

    // Esperar a que el estado se actualice para mover el cursor
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(
        cursorPos + emoji.emoji.length,
        cursorPos + emoji.emoji.length
      );
    }, 0);
  };

  const handleClickOutside = (event) => {
    if (
      emojiPickerRef.current &&
      !emojiPickerRef.current.contains(event.target)
    ) {
      setEmojiOpen(false);
    }
  };

  const acortarTexto = (texto, limiteMovil, limiteDesktop) => {
    // Determina el límite basado en el tamaño de la pantalla
    const limite = window.innerWidth <= 640 ? limiteMovil : limiteDesktop;
    return texto.length > limite ? texto.substring(0, limite) + "..." : texto;
  };

  const handleSendMessage = () => {
    console.log("Mensaje enviado:", mensaje, file);
    setMensaje("");
    setFile(null);

    // Enviar el mensaje al servidor de WebSockets
    socketRef.current.emit("SEND_MESSAGE", {
      mensaje,
      tipo_mensaje: file ? "document" : "text",
      to: selectedChat.celular_cliente,
      id_plataforma: userData.plataforma,
      file,
      dataAdmin,
    });

    socketRef.current.on("MESSAGE_RESPONSE", (data) => {
      console.log(data);
    });

    // Cleanup para evitar múltiples listeners

    return () => {
      socketRef.current.off("UPDATE_CHAT");
    };
  };

  const uploadAudio = (audioBlob) => {
    // Primero, enviamos el archivo para su conversión
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.ogg");

    chatApi.post("whatsapp/upload", formData).then((response) => {
      const base64Audio = response.data.file;

      // Convertir el audio base64 a un Blob
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blobNew = new Blob([byteArray], { type: "audio/ogg" });

      // Crear un nuevo FormData para la segunda solicitud
      const formData2 = new FormData();
      formData2.append("audio", blobNew, "audio.ogg"); // Nota: Cambié a formData2

      // Enviar el audio convertido a WhatsApp
      return fetch(
        "https://new.imporsuitpro.com/Pedidos/guardar_audio_Whatsapp",
        {
          method: "POST",
          body: formData2,
        }
      )
        .then((response) => response.json())
        .then(async (data) => {
          if (data.status === 200) {
            console.log("Audio subido a WhatsApp:", data.data);

            await enviarAudioWhatsApp(data.data); // Enviar el audio a WhatsApp

            return data.data; // Retorna la URL del audio subido
          } else {
            console.error("Error al subir el audio a WhatsApp:", data.message);
            throw new Error(data.message);
          }
        })
        .catch((error) => {
          console.error("Error en la solicitud a WhatsApp:", error);
        });
    });
  };

  // Función para enviar el audio a WhatsApp
  const enviarAudioWhatsApp = async (audioUrl) => {
    console.log("Estableciendo conexión con WhatsApp...");
    const fromPhoneNumberId = dataAdmin.id_telefono; // ID de WhatsApp
    const accessToken = dataAdmin.token; // Token de acceso
    const numeroDestino = selectedChat.celular_cliente; // Número de destino
    const apiUrl = `https://graph.facebook.com/v21.0/${fromPhoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: numeroDestino,
      type: "audio",
      audio: {
        link: "https://new.imporsuitpro.com/" + audioUrl, // URL completa del audio en el servidor
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
        console.error("Error al enviar el audio a WhatsApp:", result.error);
        alert(`Error: ${result.error.message}`);
        return;
      }

      console.log("Audio enviado con éxito a WhatsApp:", result);

      let id_recibe = selectedChat.id;
      let mid_mensaje = dataAdmin.id_telefono;
      let id_plataforma = userData.plataforma;
      let telefono_configuracion = dataAdmin.telefono;
      agregar_mensaje_enviado(
        "Archivo guardado en: " + audioUrl,
        "audio",
        audioUrl,
        numeroDestino,
        mid_mensaje,
        id_recibe,
        id_plataforma,
        telefono_configuracion
      );
    } catch (error) {
      console.error("Error en la solicitud de WhatsApp:", error);
      alert("Ocurrió un error al enviar el audio. Inténtalo más tarde.");
    }
  };

  // Función que maneja la subida y el envío del audio
  const handleSendAudio = async (blob) => {
    if (blob) {
      // Validación de tipo MIME
      const isOggMime = blob.type.includes("audio/ogg");

      // Validación de extensión (si tienes un nombre de archivo)
      const isCorrectExtension = blob.name ? blob.name.endsWith(".ogg") : true;

      if (!isOggMime || !isCorrectExtension) {
        alert("El archivo de audio debe ser en formato .ogg");
        return;
      }

      console.log(
        "El archivo es un .ogg válido basado en el tipo MIME y extensión."
      );

      try {
        // Subir el audio y obtener la URL
        let urlAudio = await uploadAudio(blob);
        // Enviar el audio a WhatsApp
        /*         if (urlAudio) {
          await enviarAudioWhatsApp(urlAudio);
        }
 */
        setAudioBlob(null); // Limpia el estado del blob de audio después de enviar
      } catch (error) {
        console.error("Error en el proceso de envío de audio:", error);
      }
    }
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    const chunks = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
      setAudioBlob(blob);
      handleSendAudio(blob); // Enviar el audio inmediatamente después de detener
    };

    mediaRecorderRef.current.start();
    setGrabando(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && grabando) {
      mediaRecorderRef.current.stop();
      setGrabando(false);

      // Detener y liberar el acceso al micrófono
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const handleSelectChat = (chat) => {
    // Establece el chat seleccionado y asegúrate de limpiar los mensajes anteriores
    setChatMessages([]); // Limpia los mensajes anteriores para evitar inconsistencias
    setSelectedChat(chat);
  };

  /* filtro */
  const [etiquetas_api, setEtiquetas_api] = useState([]);
  const [selectedEtiquetas, setSelectedEtiquetas] = useState([]);
  const [selectedEstado, setSelectedEstado] = useState([]);
  const [selectedTransportadora, setSelectedTransportadora] = useState(null);

  const etiquetasOptions = etiquetas_api.map((etiqueta) => ({
    value: etiqueta.id_etiqueta,
    label: etiqueta.nombre_etiqueta,
  }));
  /* fin filtro */

  const filteredChats = mensajesAcumulados
    .filter((mensaje) => {
      // Filtro por nombre o celular
      const nombreCliente = mensaje.nombre_cliente?.toLowerCase() || "";
      const celularCliente = mensaje.celular_cliente?.toLowerCase() || "";
      const term = searchTerm.toLowerCase();
      return (
        term === "" ||
        nombreCliente.includes(term) ||
        celularCliente.includes(term)
      );
    })
    .filter((mensaje) => {
      // Filtro por etiquetas seleccionadas
      let etiquetas = [];
      try {
        etiquetas = mensaje.etiquetas ? JSON.parse(mensaje.etiquetas) : [];
      } catch (error) {
        console.error("Error al parsear etiquetas JSON:", error);
      }

      const etiquetasSeleccionadas = selectedEtiquetas.map(
        (etiqueta) => etiqueta.value
      );

      return (
        etiquetasSeleccionadas.length === 0 ||
        etiquetasSeleccionadas.every((idEtiquetaSeleccionada) =>
          etiquetas.some(
            (etiqueta) =>
              etiqueta &&
              etiqueta.id &&
              etiqueta.id.toString() === idEtiquetaSeleccionada
          )
        )
      );
    })
    .filter((mensaje) => {
      // Filtro por transportadora
      const transportadoraFiltro = selectedTransportadora?.value || null;
      const transportadoraCliente = mensaje.transporte || "";
      return (
        !transportadoraFiltro ||
        transportadoraCliente.toLowerCase() ===
          transportadoraFiltro.toLowerCase()
      );
    })
    .filter((mensaje) => {
      // Filtro por estado y transportadora combinados
      const estadoFiltro = selectedEstado?.value || null;
      const transportadoraFiltro = selectedTransportadora?.value || null;
      const estadoFactura = mensaje.estado_factura || "";

      if (!estadoFiltro || !transportadoraFiltro) {
        return true; // No se aplica filtro si no hay estado o transportadora seleccionados
      }

      const estadoTransportadoraMap = {
        LAAR: {
          Generada: [1, 2],
          "En transito": [5, 11, 12, 6],
          Entregada: [7],
          Novedad: [14],
          Devolucion: [9],
        },
        SERVIENTREGA: {
          Generada: [100, 102, 103],
          "En transito": (estadoFactura) =>
            estadoFactura >= 300 && estadoFactura <= 317,
          Entregada: (estadoFactura) =>
            estadoFactura >= 400 && estadoFactura <= 403,
          Novedad: (estadoFactura) =>
            estadoFactura >= 320 && estadoFactura <= 351,
          Devolucion: (estadoFactura) =>
            estadoFactura >= 500 && estadoFactura <= 502,
        },
        GINTRACOM: {
          Generada: [1, 2, 3],
          "En transito": [5, 4],
          Entregada: [7],
          Novedad: [6],
          Devolucion: [8, 9, 13],
        },
        SPEED: {
          Generada: [2],
          "En transito": [3],
          Devolucion: [9],
        },
      };

      const estadosPermitidos =
        estadoTransportadoraMap[transportadoraFiltro][estadoFiltro];

      if (typeof estadosPermitidos === "function") {
        return estadosPermitidos(estadoFactura);
      } else if (Array.isArray(estadosPermitidos)) {
        return estadosPermitidos.includes(parseInt(estadoFactura));
      } else {
        return false;
      }
    });

  const socketRef = useRef(null);
  const inputSearchRef = useRef(null);
  const handleInputChange = (e) => {
    const value = e.target.value;
    setMensaje(value);

    // Detecta si el texto es solo "/" y no hay texto previo
    if (value === "/" && mensaje.length === 0) {
      setIsCommandActive(true);
      setIsChatBlocked(true); // Bloquea el chat

      // Enfocar directamente en el input de búsqueda del menú si está disponible
      setTimeout(() => {
        if (inputSearchRef.current) {
          inputSearchRef.current.focus();
        }
      }, 100); // Asegurarse de que el input esté montado
    } else {
      setIsCommandActive(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // hacer que si se ha escrito algo en el input de mensaje el boton de enviar cambie de micrófono a enviar
    if (mensaje.length > 0) {
      setMostrarAudio(true);
    } else {
      setMostrarAudio(false);
    }
  }, [mensaje]);

  useEffect(() => {
    const token = localStorage.getItem("token"); // Leemos el token
    if (token) {
      const decoded = jwtDecode(token); // Decodificamos con jwt-decode
      //verificamos si el token ha expirado
      if (decoded.exp < Date.now() / 1000) {
        localStorage.removeItem("token");
        // Si ha expirado, redirigimos al login
        window.location.href = "/login";
      }

      setUserData(decoded); // Guardamos los datos en el estado

      // Conectar al servidor de WebSockets
      const socket = io(import.meta.env.VITE_socket, {
        transports: ["websocket", "polling"],
        secure: true,
      });
      socket.on("connect", () => {
        console.log("Conectado al servidor de WebSockets");
        socketRef.current = socket;
        setIsSocketConnected(true);
      });
      socket.on("disconnect", () => {
        console.log("Desconectado del servidor de WebSockets");
        setIsSocketConnected(false);
      });
    }
  }, []);

  const cargarTemplates = async (data) => {
    console.log(data);
    const wabaId = data.id_whatsapp;
    const accessToken = data.token;

    try {
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${wabaId}/message_templates`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener templates: ${response.statusText}`);
      }

      const data = await response.json();
      setTemplates(data.data); // Guardamos los templates en el estado
    } catch (error) {
      console.error("Error al cargar los templates:", error);
    }
  };

  /* consumir api de etiquetas */
  useEffect(() => {
    const fetchEtiquetas = async () => {
      try {
        // Crear un objeto FormData y agregar los datos necesarios
        const formData = new FormData();
        formData.append("id_plataforma", userData.plataforma);

        const response = await fetch(
          "https://new.imporsuitpro.com/Pedidos/obtener_etiquetas",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Error al obtener las etiquetas");
        }

        const data = await response.json();
        setEtiquetas_api(data);
      } catch (error) {
        console.error("Error al cargar las etiquetas:", error);
      }
    };

    if (userData != null) {
      fetchEtiquetas();
    }
  }, [userData]);
  /* fin cosumir api de etiquetas */

  useEffect(() => {
    if (isSocketConnected && userData) {
      socketRef.current.emit("ADD_USER", userData);
      socketRef.current.emit("GET_CHATS", userData.plataforma);
      socketRef.current.on("USER_ADDED", (data) => {});

      socketRef.current.emit("GET_DATA_ADMIN", userData.plataforma);
      socketRef.current.on("DATA_ADMIN_RESPONSE", (data) => {
        setDataAdmin(data);

        /* funcion cargar templates */
        cargarTemplates(data); // Llamar a cargarTemplates cuando el socket esté conectado
      });
      socketRef.current.emit("GET_PROVINCIAS", userData.plataforma);
      socketRef.current.on("DATA_PROVINCIAS_RESPONSE", (data) => {
        setProvincias(data);
      });

      socketRef.current.on("RECEIVED_MESSAGE", (data) => {
        console.log("XD", data);
        setSeRecibioMensaje(true);
      });

      socketRef.current.on("DATA_FACTURA_RESPONSE", (data) => {
        setFacturasChatSeleccionado(data);
      });

      socketRef.current.on("CHATS", (data) => {
        setMensajesAcumulados(data);
      });
    }
  }, [isSocketConnected && userData]);

  useEffect(() => {
    if (seRecibioMensaje) {
      socketRef.current.emit("GET_CHATS", userData.plataforma);
      setSeRecibioMensaje(false);
    }
  }, [seRecibioMensaje]);

  useEffect(() => {
    if (selectedChat && userData && isSocketConnected) {
      console.log("Chat seleccionado:", selectedChat);
      fetchTags();
      fetchTagsAsginadas();
      // Emitir la solicitud para obtener los mensajes del chat seleccionado
      socketRef.current.emit("GET_CHATS_BOX", {
        chatId: selectedChat.id,
        plataforma: userData.plataforma,
      });

      // Función manejadora para actualizar los mensajes del chat
      const handleChatBoxResponse = (data) => {
        console.log("object", data);
        setChatMessages(data);
        selectedChat.mensajes_pendientes = 0;

        const orderedMessages = getOrderedChats();
        setMensajesOrdenados(orderedMessages);
      };
      socketRef.current.emit("GET_FACTURAS", {
        id_plataforma: userData.plataforma,
        telefono: selectedChat.celular_cliente,
      });
      // Escuchar la respuesta del socket
      socketRef.current.on("CHATS_BOX_RESPONSE", handleChatBoxResponse);

      // Limpieza para eliminar el listener cuando `selectedChat` cambie
      return () => {
        socketRef.current.off("CHATS_BOX_RESPONSE", handleChatBoxResponse);
      };
    } else {
      // Si no hay chat seleccionado, vaciar los mensajes
      setChatMessages([]);
      setMensajesOrdenados([]);
    }
  }, [selectedChat, userData, isSocketConnected]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      const orderedMessages = getOrderedChats();
      setMensajesOrdenados(orderedMessages);
      setTimeout(() => {
        scrollToBottom();
      }, 200);
    } else {
      setMensajesOrdenados([]); // Asegúrate de limpiar mensajesOrdenados si chatMessages está vacío
    }
  }, [chatMessages]);

  // useEffect para ejecutar la búsqueda cuando cambia el término de búsqueda
  useEffect(() => {
    if (menuSearchTerm.trim().length > 0) {
      // Si hay algo en el término de búsqueda, realiza la búsqueda en el socket
      socketRef.current.emit("GET_TEMPLATES", {
        id_plataforma: userData.plataforma,
        palabraClave: menuSearchTerm,
      });

      // Escuchar los resultados de la búsqueda del socket
      socketRef.current.on("TEMPLATES_RESPONSE", (data) => {
        setSearchResults(data); // Actualiza el estado con los resultados recibidos
      });

      // Limpieza para eliminar el listener cuando cambie el término de búsqueda
      return () => {
        socketRef.current.off("TEMPLATES_RESPONSE");
      };
    } else {
      // Si el campo de búsqueda está vacío, limpia los resultados
      setSearchResults([]);
    }
  }, [menuSearchTerm]);

  // useEffect para ejecutar la búsqueda cuando cambia el término de búsqueda telefono
  useEffect(() => {
    if (menuSearchTermNumeroCliente.length > 0) {
      // Emitir el evento al servidor
      socketRef.current.emit("GET_CELLPHONES", {
        id_plataforma: userData.plataforma,
        texto: menuSearchTermNumeroCliente,
      });

      // Escuchar los resultados de la búsqueda del socket
      const handleDataResponse = (data) => {
        setSearchResultsNumeroCliente(data);
      };

      socketRef.current.on("DATA_CELLPHONE_RESPONSE", handleDataResponse);

      // Limpieza para eliminar el listener
      return () => {
        socketRef.current.off("DATA_CELLPHONE_RESPONSE", handleDataResponse);
      };
    } else {
      setSearchResultsNumeroCliente([]);
    }
  }, [menuSearchTermNumeroCliente]);

  useEffect(() => {
    if (isSocketConnected && selectedChat) {
      // Escuchar el evento UPDATE_CHAT
      const handleUpdateChat = (data) => {
        const { chatId, message } = data;
        if (selectedChat && chatId === selectedChat.celular_cliente) {
          setMensajesOrdenados((prevMessages) => [
            ...prevMessages,
            message.mensajeNuevo,
          ]);
          setTimeout(() => {
            scrollToBottom();
          }, 200);
        }
      };

      // Añadir el listener
      socketRef.current.on("UPDATE_CHAT", handleUpdateChat);

      // Cleanup: remover el listener cuando el componente se desmonte o cambie el chat seleccionado
      return () => {
        socketRef.current.off("UPDATE_CHAT", handleUpdateChat);
      };
    }
  }, [isSocketConnected, selectedChat]);

  return (
    <div className="sm:grid grid-cols-4">
      {/* Cabecera */}
      <Cabecera
        userData={userData}
        chatMessages={chatMessages}
        opciones={opciones}
        setOpciones={setOpciones}
        handleOpciones={handleOpciones}
        selectedChat={selectedChat}
        setSelectedChat={setSelectedChat}
        animateOut={animateOut}
        toggleCrearEtiquetaModal={toggleCrearEtiquetaModal}
        setEtiquetasMenuOpen={setEtiquetasMenuOpen}
        etiquetasMenuOpen={etiquetasMenuOpen}
        toggleAsginarEtiquetaModal={toggleAsginarEtiquetaModal}
        tagListAsginadas={tagListAsginadas}
        tagList={tagList}
      />
      {/* Historial de chats */}
      <Sidebar
        filteredChats={filteredChats}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setNumeroModal={setNumeroModal}
        handleSelectChat={handleSelectChat}
        acortarTexto={acortarTexto}
        selectedChat={selectedChat}
        chatTemporales={chatTemporales}
        formatFecha={formatFecha}
        setFiltro_chats={setFiltro_chats}
        filtro_chats={filtro_chats}
        handleFiltro_chats={handleFiltro_chats}
        setSearchTermEtiqueta={setSearchTermEtiqueta}
        searchTermEtiqueta={searchTermEtiqueta}
        etiquetas_api={etiquetas_api}
        selectedEtiquetas={selectedEtiquetas}
        setSelectedEtiquetas={setSelectedEtiquetas}
        handleChange={handleChange}
        etiquetasOptions={etiquetasOptions}
        selectedEstado={selectedEstado}
        setSelectedEstado={setSelectedEstado}
        selectedTransportadora={selectedTransportadora}
        setSelectedTransportadora={setSelectedTransportadora}
      />
      {/* todos los mensajes */}
      <ChatPrincipal
        mensajesOrdenados={mensajesOrdenados}
        opciones={opciones}
        endOfMessagesRef={endOfMessagesRef}
        mensaje={mensaje}
        handleInputChange={handleInputChange}
        inputRef={inputRef}
        handleSendMessage={handleSendMessage}
        grabando={grabando}
        startRecording={startRecording}
        stopRecording={stopRecording}
        file={file}
        setEmojiOpen={setEmojiOpen}
        emojiOpen={emojiOpen}
        emojiPickerRef={emojiPickerRef}
        handleEmojiClick={handleEmojiClick}
        isChatBlocked={isChatBlocked}
        isCommandActive={isCommandActive}
        formatFecha={formatFecha}
        menuSearchTerm={menuSearchTerm}
        handleMenuSearchChange={handleMenuSearchChange}
        inputSearchRef={inputSearchRef}
        searchResults={searchResults}
        handleOptionSelect={handleOptionSelect}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        handleModal_enviarArchivos={handleModal_enviarArchivos}
        getFileIcon={getFileIcon}
        selectedChat={selectedChat}
      />
      {/* Opciones adicionales con animación */}
      <DatosUsuario
        opciones={opciones}
        animateOut={animateOut}
        facturasChatSeleccionado={facturasChatSeleccionado}
        provincias={provincias}
        socketRef={socketRef}
        userData={userData}
        setFacturasChatSeleccionado={setFacturasChatSeleccionado}
      />
      {/* MODALES */}
      <Modales
        numeroModal={numeroModal}
        handleSubmit={handleSubmit}
        handleSubmit_template={handleSubmit_template}
        register={register}
        handleNumeroModal={handleNumeroModal}
        seleccionado={seleccionado}
        menuSearchTermNumeroCliente={menuSearchTermNumeroCliente}
        searchResultsNumeroCliente={searchResultsNumeroCliente}
        handleInputChange_numeroCliente={handleInputChange_numeroCliente}
        handleNumeroModalForm={handleNumeroModalForm}
        handleOptionSelectNumeroTelefono={handleOptionSelectNumeroTelefono}
        templates={templates}
        dataAdmin={dataAdmin}
        handleSelectPhoneNumber={handleSelectPhoneNumber}
        selectedPhoneNumber={selectedPhoneNumber}
        userData={userData}
        tipo_modalEnviarArchivo={tipo_modalEnviarArchivo}
        modal_enviarArchivos={modal_enviarArchivos}
        handleModal_enviarArchivos={handleModal_enviarArchivos}
        selectedChat={selectedChat}
        agregar_mensaje_enviado={agregar_mensaje_enviado}
        getFileIcon={getFileIcon}
        toggleCrearEtiquetaModal={toggleCrearEtiquetaModal}
        isCrearEtiquetaModalOpen={isCrearEtiquetaModalOpen}
        tagList={tagList}
        setTagList={setTagList}
        fetchTags={fetchTags}
        isAsignarEtiquetaModalOpen={isAsignarEtiquetaModalOpen}
        toggleAsginarEtiquetaModal={toggleAsginarEtiquetaModal}
        tagListAsginadas={tagListAsginadas}
        setTagListAsginadas={setTagListAsginadas}
      />
    </div>
  );
};

export default Chat;
