import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom"; // al inicio
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

const PLANES_CALENDARIO = [1, 3, 4];

const Cabecera = ({
  userData,
  id_configuracion,
  chatMessages,
  opciones,
  setOpciones,
  handleOpciones,
  selectedChat,
  setSelectedChat,
  animateOut,
  toggleCrearEtiquetaModal,
  toggleTransferirChatModal,
  opcionesMenuOpen,
  setOpcionesMenuOpen,
  toggleAsignarEtiquetaModal,
  tagListAsginadas,
  tagList,
  cargar_socket,
  SwitchBot,
  setMensajesAcumulados,
  id_plataforma_conf,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sliderOpen, setSliderOpen] = useState(false);
  const [openProductos, setOpenProductos] = useState(false);
  //Manejo de referencias
  const sliderRef = useRef(null);
  const menuButtonRef = useRef(null);

  const menuOpcionesRef = useRef(null);

  //Permitir acceso a location.pathname
  const location = useLocation();

  const toggleOpcionesMenu = () => {
    setOpcionesMenuOpen(!opcionesMenuOpen);
  };

  const [configuraciones, setConfiguraciones] = useState([]);
  const [estadoNumero, setEstadoNumero] = useState([]);

  const volver_seccion_principal = () => {
    setOpciones(false);
    setSelectedChat(null);
  };

  const handleLogout = () => {
    localStorage.clear(); // elimina todo
    window.location.href = "/login"; // redirige al login
  };

  const [canAccessCalendar, setCanAccessCalendar] = useState(null);

  useEffect(() => {
    if (userData) {
      const permitido = PLANES_CALENDARIO.includes(Number(userData.id_plan));
      setCanAccessCalendar(permitido);
    }
  }, [userData]);

  const handleCalendarioClick = (e) => {
    e.preventDefault();

    // Mantiene sus setItems actuales
    localStorage.setItem("id_configuracion", id_configuracion);
    localStorage.setItem("id_plataforma_conf", id_plataforma_conf);

    if (canAccessCalendar) {
      navigate("/calendario");
    } else {
      Swal.fire({
        icon: "info",
        title: "Función bloqueada",
        html: "Su plan actual no incluye <b>Calendario</b>. Actualice su plan para desbloquear esta sección.",
        confirmButtonText: "Ver planes",
        showCancelButton: true,
        cancelButtonText: "Cerrar",
        allowOutsideClick: false,
      }).then((r) => {
        if (r.isConfirmed) navigate("/planes_view");
      });
    }
  };

  const handleReturnToImporsuit = () => {
    localStorage.getItem("token");
    window.location.href =
      "https://new.imporsuitpro.com/acceso/jwt_home/" +
      localStorage.getItem("token");
  };

  useEffect(() => {
    const fetchEstadoNumero = async () => {
      if (!id_configuracion) return;
      try {
        const resp = await chatApi.post("/whatsapp_managment/ObtenerNumeros", {
          id_configuracion: id_configuracion,
        });
        setEstadoNumero(resp.data.data || []);
      } catch (error) {
        console.error("Error al obtener phone_numbers:", error);
      }
    };

    fetchEstadoNumero();
  }, [id_configuracion]);

  useEffect(() => {
    const checkBannedStatus = () => {
      const isBanned = estadoNumero.some((num) => num.status === "BANNED");
      if (isBanned) {
        Swal.fire({
          icon: "error",
          title: "Cuenta bloqueada",
          text: "Tu número de WhatsApp ha sido bloqueado. Se cerrará tu sesión.",
          allowOutsideClick: false,
          allowEscapeKey: false,
          allowEnterKey: true,
          confirmButtonText: "OK",
        }).then(() => {
          handleLogout();
        });
      }
    };

    checkBannedStatus();
  }, [estadoNumero]);

  // (2) useEffect para detectar clic fuera y cerrar
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        sliderOpen &&
        sliderRef.current &&
        !sliderRef.current.contains(event.target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target)
      ) {
        setSliderOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sliderOpen]);

  // toggle del slider
  const toggleSlider = () => {
    setSliderOpen(!sliderOpen);
  };

  const [isHovering, setIsHovering] = useState(false);

  const handleChangeChatStatus = async (newStatus) => {
    try {
      await actualizar_cerrado(selectedChat.id, newStatus);
    } catch (error) {
      console.error("Error al cambiar el estado del chat:", error);
    }
  };

  const actualizar_cerrado = async (chatId, nuevoEstado) => {
    let bot_openia = 0;
    if (nuevoEstado == 1) {
      bot_openia = 1;
    }

    try {
      const response = await chatApi.post(
        "/clientes_chat_center/actualizar_cerrado",
        {
          chatId,
          nuevoEstado,
          bot_openia,
        }
      );

      const data = response.data;

      // Verifica si la respuesta fue correcta
      if (data.status !== "200") {
        throw new Error(data.message || "Error al actualizar el chat");
      }

      // Actualizar localmente el estado del chat seleccionado
      setSelectedChat((prev) => ({
        ...prev,
        chat_cerrado: nuevoEstado,
      }));

      setMensajesAcumulados((prev) =>
        prev.filter((chat) => chat.id !== selectedChat.id)
      );
    } catch (error) {
      console.error("Error al actualizar el chat:", error);
    }
  };

  const handleChangeChatBotOpenia = async (newStatus) => {
    try {
      await actualizarBotOpenia(selectedChat.id, newStatus);
    } catch (error) {
      console.error("Error al cambiar el estado del bot openia:", error);
    }
  };

  const actualizarBotOpenia = async (chatId, nuevoEstado) => {
    try {
      const response = await chatApi.post(
        "/clientes_chat_center/actualizar_bot_openia",
        {
          chatId,
          nuevoEstado,
        }
      );

      const data = await response.data;

      if (data.status === "200") {
        // actualizar localmente
        setSelectedChat((prev) => ({
          ...prev,
          bot_openia: nuevoEstado,
        }));
      } else {
        console.error("Error al actualizar el bot:", data);
      }
    } catch (error) {
      console.error("Error al actualizar bot_openia:", error);
    }
  };

  const toggleTagAssignment = (tagId, chatId) => {
    console.log("Desasignar etiqueta con ID:", tagId, "del chat:", chatId);
  };

  const navigate = useNavigate();
  const irAPlantillas = () => {
    navigate("/administrador-whatsapp");
  };

  const navigater = useNavigate();
  const irAChatCenter = () => {
    navigater("/chat");
  };

  const isCalendarBlocked = userData && canAccessCalendar === false;

  /* menu de opciones */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuOpcionesRef.current &&
        !menuOpcionesRef.current.contains(event.target)
      ) {
        setOpcionesMenuOpen(false);
      }
    };

    if (opcionesMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [opcionesMenuOpen]);
  /* fin menu de opciones */

  /* useEffect(() => {
      // Verificamos si ya está en localStorage
      const alertaServi = localStorage.getItem("alerta_Servi");
  
      // Si el valor en localStorage es "true", ocultamos el banner
      if (alertaServi != "true") {
        localStorage.setItem("alerta_Servi", "true");
  
        Swal.fire({
          icon: "warning",
          title: "🚨 Aviso Importante 🚨",
          html:
            `El <strong>26 de octubre</strong> habrá mantenimiento programado en nuestros sistemas:<br><br>` +
            `<strong>1. Servientrega:</strong> De 8:00 AM a 10:00 PM, se suspenderá temporalmente la generación de guías.<br>` +
            `Agradecemos tu comprensión.`,
          confirmButtonText: "OK",
        });
      }
    }, []); */

  return (
    <>
      {/* Cabecera principal (mobile visible si no hay chat seleccionado, desktop siempre) */}
      <div
        className={`items-center justify-between p-4 bg-[#171931] ${
          selectedChat ? "hidden sm:flex" : "flex"
        }`}
      >
        {/* Botón “hamburger” para abrir slider */}
        <div>
          <button
            onClick={toggleSlider}
            className="text-white text-2xl focus:outline-none hover:scale-110 transition-transform"
          >
            <i className="bx bx-menu"></i>
          </button>
        </div>

        {/* Nombre de usuario y foto */}
        <div className="flex items-center space-x-3">
          <div className="text-end">
            <span className="block text-white font-semibold text-lg">
              {userData?.nombre ?? "Tony Plaza"}
            </span>
            <span className="text-sm text-white">{userData?.rol}</span>
          </div>
          <img
            className="rounded-full w-12 h-12 bg-white object-cover"
            src="https://new.imporsuitpro.com/public/img/img.png"
            alt="Profile"
          />
        </div>
      </div>

      {/* Slider lateral (Menú) */}
      <div
        ref={sliderRef}
        className={`fixed top-0 left-0 h-screen w-64 bg-white shadow-xl transform transition-transform duration-300 z-50 ${
          sliderOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Encabezado del slider */}
        <div className="h-[110px] px-5 flex items-center justify-between bg-[#171931] text-white">
          <h2 className="font-bold text-lg">Menú</h2>
          <button
            ref={menuButtonRef}
            onClick={toggleSlider}
            className="hover:scale-110 transition-transform"
          >
            <i className="bx bx-x text-2xl"></i>
          </button>
        </div>

        {/* Opciones dentro del slider */}
        <div className="mt-6">
          {/* Volver a Imporsuit */}
          <a
            onClick={(e) => {
              e.preventDefault();
              localStorage.removeItem("id_configuracion");
              localStorage.removeItem("id_plataforma_conf");

              navigate("/conexiones");
            }}
            className="group flex items-center w-full px-5 py-4 text-left hover:bg-gray-100 cursor-pointer"
          >
            <i className="bx bx-log-in text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
            <span className="text-lg text-gray-700 group-hover:text-blue-600">
              Conexiones
            </span>
          </a>
          {/* Chat Center */}
          <a
            href="/chat"
            className={`group flex items-center w-full px-5 py-4 text-left hover:bg-gray-100 ${
              location.pathname === "/chat" ? "bg-gray-200 font-semibold" : ""
            }`}
            onClick={(e) => {
              e.preventDefault();
              navigate("/chat");
            }}
          >
            <i className="bx bx-chat text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
            <span className="text-lg text-gray-700 group-hover:text-blue-600">
              Chat Center
            </span>
          </a>
          {/* WhatsApp */}
          {/* <a
            href="/administrador-whatsapp"
            className={`group flex items-center w-full px-5 py-4 text-left hover:bg-gray-100 ${
              location.pathname === "/administrador-whatsapp"
                ? "bg-gray-200 font-semibold"
                : ""
            }`}
            onClick={(e) => {
              e.preventDefault();

              localStorage.setItem("id_configuracion", id_configuracion);
              localStorage.setItem("id_plataforma_conf", id_plataforma_conf);

              navigate("/administrador-whatsapp");
            }}
          >
            <i className="bx bxl-whatsapp text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
            <span className="text-lg text-gray-700 group-hover:text-blue-600">
              WhatsApp
            </span>
          </a> */}

          {/* Administrador de Canales */}
          <a
            href="/canal-conexiones"
            className={`group flex items-center w-full px-5 py-4 text-left hover:bg-gray-100 ${
              location.pathname === "/canal-conexiones"
                ? "bg-gray-200 font-semibold"
                : ""
            }`}
            onClick={(e) => {
              e.preventDefault();
              localStorage.setItem("id_configuracion", id_configuracion);
              localStorage.setItem("id_plataforma_conf", id_plataforma_conf);
              navigate("/canal-conexiones");
            }}
          >
            <i className="bx bx-network-chart text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
            <span className="text-lg text-gray-700 group-hover:text-blue-600">
              Canal de Conexiones
            </span>
          </a>

          {/* Asistentes */}
          <a
            href="/asistentes"
            className={`group flex items-center w-full px-5 py-4 text-left hover:bg-gray-100 ${
              location.pathname === "/asistentes"
                ? "bg-gray-200 font-semibold"
                : ""
            }`}
            onClick={(e) => {
              e.preventDefault();

              localStorage.setItem("id_configuracion", id_configuracion);
              localStorage.setItem("id_plataforma_conf", id_plataforma_conf);

              navigate("/asistentes");
            }}
          >
            <i className="bx bx-support text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
            <span className="text-lg text-gray-700 group-hover:text-blue-600">
              Asistentes
            </span>
          </a>

          {/* integraciones */}
          <a
            href="/integraciones"
            className={`group flex items-center w-full px-5 py-4 text-left hover:bg-gray-100 ${
              location.pathname === "/integraciones"
                ? "bg-gray-200 font-semibold"
                : ""
            }`}
            onClick={(e) => {
              e.preventDefault();

              localStorage.setItem("id_configuracion", id_configuracion);
              localStorage.setItem("id_plataforma_conf", id_plataforma_conf);

              navigate("/integraciones");
            }}
          >
            <i className="bx bx-plug text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
            <span className="text-lg text-gray-700 group-hover:text-blue-600">
              Integraciones
            </span>
          </a>

          <a
            /* href={
              (userData?.data?.id_matriz ?? 1) === 1
                ? `https://automatizador.imporsuitpro.com/tabla_automatizadores.php?id_configuracion=${
                    configuraciones[0]?.id ?? ""
                  }`
                : (userData?.data?.id_matriz ?? 1) === 2
                ? `https://automatizador.merkapro.ec/tabla_automatizadores.php?id_configuracion=${
                    configuraciones[0]?.id ?? ""
                  }`
                : "#"
            } */

            href={`https://automatizador.imporsuitpro.com/tabla_automatizadores.php?id_configuracion=${
              id_configuracion ?? ""
            }`}
            className="group flex items-center w-full px-5 py-4 text-left hover:bg-gray-100"
          >
            <i className="bx bxs-bot mr-3 text-gray-600 group-hover:text-blue-600"></i>
            <span className="text-lg text-gray-700 group-hover:text-blue-600">
              Automatizador
            </span>
          </a>

          <a
            href="/calendario"
            className={`group flex items-center w-full px-5 py-4 text-left transition
                ${
                  location.pathname === "/calendario"
                    ? "bg-gray-200 font-semibold"
                    : "hover:bg-gray-100"
                }
                ${isCalendarBlocked ? "opacity-100" : ""}
              `}
            onClick={handleCalendarioClick}
          >
            {/* Icono (candado si no tiene acceso) */}
            <span className="relative mr-3">
              <i
                className={`text-2xl bx
                    ${
                      isCalendarBlocked
                        ? "bx-lock-alt text-gray-700 group-hover:text-red-600"
                        : "bx-calendar text-gray-600 group-hover:text-blue-600"
                    }
                  `}
              ></i>
            </span>

            {/* Texto + chip “Bloqueado” */}
            <span
              className={`text-lg
                  ${
                    isCalendarBlocked
                      ? "text-lg text-gray-700 group-hover:text-red-600"
                      : "text-lg text-gray-700 group-hover:text-blue-600"
                  }
                `}
            >
              Calendario
              {isCalendarBlocked ? (
                <span className="ml-2 inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-gray-200">
                  Bloqueado
                </span>
              ) : (
                canAccessCalendar === true && (
                  <span className="ml-2 inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-gray-200">
                    Beta
                  </span>
                )
              )}
            </span>
          </a>

          {/* Productos y categorias */}
          {/* Grupo de Productos */}
          {/* Grupo de Productos sin flecha y con animación */}
          <div>
            {/* Botón principal sin ícono de flecha */}
            <button
              onClick={() => setOpenProductos(!openProductos)}
              className={`group flex items-center w-full px-5 py-4 text-left rounded ${
                location.pathname === "/productos" ||
                location.pathname === "/categorias"
                  ? "bg-gray-200 font-semibold"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <i
                className={`bx bxs-store text-2xl mr-3 transition-colors ${
                  location.pathname === "/productos" ||
                  location.pathname === "/categorias"
                }`}
              ></i>
              <span className="text-lg group-hover:text-blue-600">
                Mis Productos
              </span>
            </button>

            {/* Submenú con animación suave */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                openProductos
                  ? "max-h-[500px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="ml-10 mt-1 flex flex-col cursor-pointer">
                <a
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/productos");
                  }}
                  className={`cursor-pointer group flex items-center px-4 py-2 text-sm rounded transition-all duration-200 ${
                    location.pathname === "/productos"
                      ? "text-green-600 font-semibold bg-gray-100 shadow-md"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <i className="bx bx-list-ul text-base mr-2"></i>
                  Listado
                </a>

                <a
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/categorias");
                  }}
                  className={`cursor-pointer group flex items-center px-4 py-2 text-sm rounded transition-all duration-200 ${
                    location.pathname === "/categorias"
                      ? "text-green-600 font-semibold bg-gray-100 shadow-md"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <i className="bx bx-grid-alt text-base mr-2"></i>
                  Categorías
                </a>
              </div>
            </div>
          </div>

          {/* Cerrar sesión */}
          <button
            onClick={handleLogout}
            className="group flex items-center w-full px-5 py-4 text-left transition-colors hover:bg-gray-100"
          >
            <i className="bx bx-door-open text-2xl mr-3 text-gray-600 group-hover:text-blue-600 transition-colors"></i>
            <span className="text-lg text-gray-700 group-hover:text-blue-600 transition-colors">
              Cerrar sesión
            </span>
          </button>
        </div>
      </div>

      {/* Sección principal cuando el chat está seleccionado */}
      {selectedChat === null ? (
        <div
          className={`${
            opciones ? "col-span-2 bg-gray-100" : "col-span-3 bg-gray-100"
          } py-[55px] ${selectedChat === null ? "hidden sm:block" : "block"}`}
        ></div>
      ) : (
        <div
          className={`${
            opciones ? "col-span-2 bg-white" : "col-span-3 bg-white"
          } ${selectedChat === null ? "hidden sm:block" : "block"}`}
        >
          {/* Encabezado del chat seleccionado */}
          <div className="flex justify-between items-center space-x-3 border-b p-4">
            {/* Botón para volver en móvil + imagen de usuario + nombre/teléfono */}
            <div className="flex gap-3 items-center">
              <button
                className="p-1 text-[25px] block sm:hidden hover:scale-110 transition-transform"
                onClick={volver_seccion_principal}
              >
                <i className="bx bx-arrow-back"></i>
              </button>
              <img
                src={
                  selectedChat?.profile_pic_url
                    ? selectedChat.profile_pic_url
                    : "https://tiendas.imporsuitpro.com/imgs/react/user.png"
                }
                alt="Avatar"
                className="h-12 w-12 rounded-full object-cover bg-white"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    "https://tiendas.imporsuitpro.com/imgs/react/user.png";
                }}
              />
              <div>
                <span className="block text-black font-semibold text-lg">
                  {chatMessages.length > 0 && selectedChat
                    ? selectedChat.nombre_cliente
                    : "SELECCIONE UN CHAT"}
                </span>
                <span className="text-sm text-gray-600">
                  {chatMessages.length > 0 && selectedChat
                    ? "+" + selectedChat.celular_cliente
                    : "-------"}
                </span>
              </div>
            </div>

            {/* Botones de acciones en la esquina derecha */}
            <div className="flex items-center gap-4">
              {/* Apagar/Ecender bot */}
              <SwitchBot
                botActivo={selectedChat.bot_openia === 1}
                onToggle={() =>
                  handleChangeChatBotOpenia(
                    selectedChat.bot_openia === 1 ? 0 : 1
                  )
                }
              />
              <div
                className="relative inline-block text-left"
                ref={menuOpcionesRef}
              >
                {/* Botón principal con flecha */}
                <button
                  id="menu-opciones-boton"
                  onClick={toggleOpcionesMenu}
                  aria-haspopup="menu"
                  aria-expanded={opcionesMenuOpen}
                  aria-controls="menu-opciones"
                  className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-blue-500 to-blue-600
                             text-white font-semibold rounded-md shadow-sm hover:shadow-md transition-all duration-200
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                >
                  <span>Opciones</span>
                  <i
                    className={`bx bx-chevron-down text-xl transition-transform duration-200 ${
                      opcionesMenuOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  ></i>
                </button>

                {/* Menú desplegable */}
                {opcionesMenuOpen && (
                  <div
                    id="menu-opciones"
                    role="menu"
                    aria-labelledby="menu-opciones-boton"
                    className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-slate-200/60
                               bg-white/80 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 p-2 z-50"
                  >
                    {/* caret */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-1.5 right-6 h-3 w-3 rotate-45
                                 bg-white border-t border-l border-slate-200/60"
                    />

                    {/* Opción: Abrir/Cerrar chat */}
                    <button
                      role="menuitem"
                      onClick={() =>
                        handleChangeChatStatus(
                          selectedChat.chat_cerrado === 0 ? 1 : 0
                        )
                      }
                      className={`flex items-center w-full gap-3 px-3 py-2.5 text-left text-sm rounded-lg transition-colors
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                        ${
                          selectedChat.chat_cerrado === 0
                            ? "text-red-700 hover:bg-red-50"
                            : "text-emerald-700 hover:bg-emerald-50"
                        }`}
                    >
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-md
                          ${
                            selectedChat.chat_cerrado === 0
                              ? "bg-red-100"
                              : "bg-emerald-100"
                          }`}
                        aria-hidden="true"
                      >
                        <i
                          className={`bx bx-power-off text-base ${
                            selectedChat.chat_cerrado === 0
                              ? "text-red-700"
                              : "text-emerald-700"
                          }`}
                        ></i>
                      </span>
                      <span className="flex-1 truncate">
                        {selectedChat.chat_cerrado === 0
                          ? "Cerrar chat"
                          : "Abrir chat"}
                      </span>
                    </button>

                    <hr className="my-2 border-slate-200/70" />

                    <button
                      role="menuitem"
                      onClick={toggleTransferirChatModal}
                      className="flex items-center w-full gap-3 px-3 py-2.5 text-left text-sm
                                 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100"
                        aria-hidden="true"
                      >
                        <i className="bx bx-transfer-alt text-base text-slate-700"></i>
                      </span>
                      <span className="flex-1 truncate">Transferir chat</span>
                    </button>

                    <hr className="my-2 border-slate-200/70" />

                    {/* Opción: Etiquetas */}
                    <button
                      role="menuitem"
                      onClick={toggleAsignarEtiquetaModal}
                      className="flex items-center w-full gap-3 px-3 py-2.5 text-left text-sm
                                 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100"
                        aria-hidden="true"
                      >
                        <i className="bx bxs-purchase-tag text-base text-slate-700"></i>
                      </span>
                      <span className="flex-1 truncate">Asignar etiquetas</span>
                    </button>

                    <button
                      role="menuitem"
                      onClick={toggleCrearEtiquetaModal}
                      className="mt-1 flex items-center w-full gap-3 px-3 py-2.5 text-left text-sm
                                 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100"
                        aria-hidden="true"
                      >
                        <i className="bx bx-plus text-base text-slate-700"></i>
                      </span>
                      <span className="flex-1 truncate">Crear etiqueta</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Botón de información (opciones) */}
              <button
                onClick={handleOpciones}
                className="hover:scale-110 transition-transform"
              >
                <i className="bx bx-info-circle text-xl"></i>
              </button>
            </div>
          </div>

          {/* Sección de etiquetas asignadas debajo del encabezado */}
          <div className="flex flex-wrap gap-2 px-4 py-3 border-b bg-gray-50">
            {tagList && tagList.length > 0 ? (
              tagList
                .filter((tag) =>
                  tagListAsginadas.some(
                    (assignedTag) => assignedTag.id_etiqueta === tag.id_etiqueta
                  )
                )
                .map((tag) => (
                  <div
                    key={tag.id_etiqueta}
                    className="bg-gray-800 text-white text-xs font-semibold py-1 px-3 rounded-full flex items-center gap-2"
                  >
                    <span>{tag.nombre_etiqueta}</span>
                    <button
                      onClick={() =>
                        toggleTagAssignment(tag.id_etiqueta, selectedChat.id)
                      }
                      className="text-gray-400 hover:text-gray-200"
                    >
                      <i className="bx bx-x text-xs"></i>
                    </button>
                  </div>
                ))
            ) : (
              <p className="text-gray-500 text-sm">
                No hay etiquetas asignadas.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Sección de detalle (Historial, etc) */}
      {opciones && (
        <div
          className={`relative col-span-1 bg-[#171931] text-white animate-slide-in ${
            animateOut ? "animate-slide-out" : "animate-slide-in"
          }`}
        >
          <>
            <div className="flex justify-center p-4 border-b border-white/10">
              <h2 className="text-white text-lg font-bold tracking-wide uppercase">
                Información del cliente
              </h2>
            </div>

            {/* Cerrar la sección (opciones) */}
            <div className="absolute top-3 right-4">
              <button
                onClick={handleOpciones}
                className="hover:scale-110 transition-transform"
              >
                <i className="bx bx-x text-white text-3xl"></i>
              </button>
            </div>
          </>
        </div>
      )}
    </>
  );
};

export default Cabecera;
