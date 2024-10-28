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

  const [seRecibioMensaje, setSeRecibioMensaje] = useState(false);

  const [dataAdmin, setDataAdmin] = useState(null);

  const [userData, setUserData] = useState(null);

  const [opciones, setOpciones] = React.useState(false);

  const [mostrarAudio, setMostrarAudio] = useState(false);

  const [chatTemporales, setChatTemporales] = useState(35);

  const [animateOut, setAnimateOut] = useState(false);

  const [numeroModal, setNumeroModal] = useState(false);

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

  const [selectedChat, setSelectedChat] = useState(null);

  const [chatMessages, setChatMessages] = useState([]);

  const [mensajesOrdenados, setMensajesOrdenados] = useState([]);

  const [isCommandActive, setIsCommandActive] = useState(false); // Estado para el cuadro de opciones

  const [isChatBlocked, setIsChatBlocked] = useState(false); // Estado para bloquear el chat

  const [menuSearchTerm, setMenuSearchTerm] = useState(""); // Estado para el término de búsqueda

  const [searchResults, setSearchResults] = useState([]); // Estado para almacenar los resultados de la búsqueda

  const handleMenuSearchChange = (e) => {
    setMenuSearchTerm(e.target.value);
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

  const handleNumeroModal = () => setNumeroModal(!numeroModal);

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();

  const handleNumeroModalForm = (data) => {
    dispatch(addNumberThunk(data));
    setNumeroModal(false);
    reset({
      numero: "",
    });
  };

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

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
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

  const handleSendAudio = (blob) => {
    if (blob) {
      console.log("Audio enviado:", blob);
      setAudioBlob(null);
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
    socketRef.current.on("SEEN_MESSAGE", (data) => {
      setSeRecibioMensaje(true);
    });
  };

  const filteredChats = mensajesAcumulados.filter((mensaje) => {
    const nombreCliente = mensaje.nombre_cliente.toLowerCase();
    const celularCliente = mensaje.celular_cliente.toLowerCase();
    const term = searchTerm.toLowerCase();

    // Filtra por coincidencia en nombre o número
    return nombreCliente.includes(term) || celularCliente.includes(term);
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

  const handleInputChange_numeroCliente = (e) => {
    const value = e.target.value;
    setMensaje(value);
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

  useEffect(() => {
    if (isSocketConnected && userData) {
      socketRef.current.emit("ADD_USER", userData);
      socketRef.current.emit("GET_CHATS", userData.plataforma);
      socketRef.current.on("USER_ADDED", (data) => {});

      socketRef.current.emit("GET_DATA_ADMIN", userData.plataforma);
      socketRef.current.on("DATA_ADMIN_RESPONSE", (data) => {
        setDataAdmin(data);
      });

      socketRef.current.on("RECEIVED_MESSAGE", (data) => {
        console.log("XD", data);
        setSeRecibioMensaje(true);
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
      // Emitir la solicitud para obtener los mensajes del chat seleccionado
      socketRef.current.emit("GET_CHATS_BOX", {
        chatId: selectedChat.id,
        plataforma: userData.plataforma,
      });

      // Función manejadora para actualizar los mensajes del chat
      const handleChatBoxResponse = (data) => {
        console.log("object", data);
        setChatMessages(data);
        const orderedMessages = getOrderedChats();
        setMensajesOrdenados(orderedMessages);
      };

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
    <div className="grid sm:grid-cols-4">
      {/* Cabecera */}
      <Cabecera
        userData={userData}
        chatMessages={chatMessages}
        opciones={opciones}
        handleOpciones={handleOpciones}
        selectedChat={selectedChat}
        animateOut={animateOut}
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
        handleFileChange={handleFileChange}
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
      />

      {/* Opciones adicionales con animación */}
      <DatosUsuario opciones={opciones} animateOut={animateOut} />

      {/* MODALES */}
      <Modales
        numeroModal={numeroModal}
        handleSubmit={handleSubmit}
        register={register}
        handleNumeroModal={handleNumeroModal}
        handleInputChange_numeroCliente={handleInputChange_numeroCliente}
        handleNumeroModalForm={handleNumeroModalForm}
      />
    </div>
  );
};

export default Chat;
