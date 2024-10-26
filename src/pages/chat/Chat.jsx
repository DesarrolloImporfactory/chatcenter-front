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
      const socket = io("http://localhost:3000", {
        transports: ["websocket"],
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

      socketRef.current.on("CHATS", (data) => {
        setMensajesAcumulados(data);
      });
    }
  }, [isSocketConnected && userData]);

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
      <div className="flex items-center justify-between p-4 bg-blue-500">
        {/* Botón de opciones */}
        <div className="grid place-content-center">
          <button>
            <i className="bx text-2xl bx-dots-vertical-rounded text-white"></i>
          </button>
        </div>
        {/* Imagen y Nombre */}
        <div className="flex items-center space-x-3">
          <div className="text-end">
            <span className="block text-white font-medium">
              {" "}
              {userData?.nombre ?? "Tony Plaza"}
            </span>
            <span className="text-sm text-white ">
              {" "}
              {userData?.cargo == 1 ? "Administrador" : "Vendedor"}
            </span>
          </div>
          <img
            className="rounded-full w-12 h-12 bg-white"
            src="https://new.imporsuitpro.com/public/img/img.png"
            alt="Profile"
          />
        </div>
      </div>

      {/* Chat titulo */}
      <div
        className={`${
          opciones == true ? "col-span-2 bg-white" : "col-span-3 bg-white"
        }`}
      >
        <div className="flex justify-between items-center space-x-3 p-4">
          <div className="flex gap-2">
            <img
              className="rounded-full w-12 h-12"
              src="https://tiendas.imporsuitpro.com/imgs/react/user.png"
              alt="Profile"
            />
            <div>
              <span className="block text-black font-medium">
                {chatMessages.length > 0 && selectedChat
                  ? chatMessages.find((chat) => chat.id === selectedChat.id)
                      ?.nombre_cliente
                  : "SELECCIONE UN CHAT"}
              </span>
              <span className="text-sm text-black ">
                {chatMessages.length > 0 && selectedChat
                  ? "+" +
                    chatMessages.find((chat) => chat.id === selectedChat.id)
                      ?.celular_cliente
                  : "-------"}
              </span>
            </div>
          </div>
          {/* opciones */}
          <div className="flex items-center justify-between text-xl gap-4 p-4">
            <button>
              <i className="bx bx-phone"></i>
            </button>
            <button>
              <i className="bx bx-video"></i>
            </button>
            <button onClick={handleOpciones}>
              <i className="bx bx-info-circle"></i>
            </button>
          </div>
        </div>
      </div>
      {/* datos del chat */}
      {opciones && (
        <div
          className={`col-span-1 bg-[#171931] text-white animate-slide-in ${
            animateOut ? "animate-slide-out" : "animate-slide-in"
          }`}
        >
          <div className="flex justify-center p-4">
            <div className="flex text-center justify-center">
              <span>Datos del Usuario</span>
            </div>
          </div>
        </div>
      )}

      {/* Historial de chats */}
      <div className=" bg-white overflow-y-auto h-[calc(100vh_-_130px)]">
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
                <div className="flex items-center space-x-3 relative">
                  <img
                    className="rounded-full w-12 h-12"
                    src="https://tiendas.imporsuitpro.com/imgs/react/user.png"
                    alt="Profile"
                  />
                  <div className="">
                    <span className="block text-black font-medium">
                      {mensaje.nombre_cliente}
                    </span>
                    <span className="text-sm text-black ">
                      {mensaje.celular_cliente}
                    </span>
                    <span className="block text-sm text-gray-600">
                      {mensaje.texto_mensaje?.length > chatTemporales
                        ? mensaje.texto_mensaje.substring(0, chatTemporales) +
                          "..."
                        : mensaje.texto_mensaje}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  {/* Hora del mensaje */}
                  <span className="text-sm text-gray-600">
                    {formatFecha(mensaje.mensaje_created_at)}
                  </span>

                  {/* Mensajes acumulados */}
                  {mensaje.mensajes_pendientes > 0 && (
                    <span className="mt-1 w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                      {mensaje.mensajes_pendientes}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* todos los mensajes */}
      {/* Área del Chat */}
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
                      <audio
                        controls
                        src={
                          "https://new.imporsuitpro.com/" + mensaje.ruta_archivo
                        }
                      ></audio>
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
            <input
              type="text"
              value={mensaje}
              onChange={handleInputChange}
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

            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={isChatBlocked} // Desactiva si el chat está bloqueado
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <i className="bx bx-upload text-2xl"></i>
            </label>
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

      {/* Opciones adicionales con animación */}
      {opciones && (
        <div
          className={`col-span-1 bg-[#171931] text-white p-4 ${
            animateOut ? "animate-slide-out" : "animate-slide-in"
          }`}
        >
          <h2 className="font-medium mb-4">Opciones</h2>
          <p>Detalles adicionales sobre el chat o usuario.</p>
        </div>
      )}

      {/* MODALES */}

      {/* Modal de numero */}
      {numeroModal && (
        <div className="fixed inset-0 z-10 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">
            <h2 className="text-xl font-medium">Agregar número</h2>
            <form
              className="grid items-center gap-2 my-4"
              onSubmit={handleSubmit(handleNumeroModalForm)}
            >
              <input
                type="text"
                placeholder="Número de teléfono"
                className="p-2 border rounded"
                {...register("numero", {
                  required: "El número es obligatorio",
                })}
              />
            </form>
            <div className="flex  gap-3">
              <button className="bg-blue-500 text-white px-4 py-2 rounded">
                Agregar
              </button>
              <button
                onClick={handleNumeroModal}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
