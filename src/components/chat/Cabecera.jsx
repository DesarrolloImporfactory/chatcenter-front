import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom"; // al inicio
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import { useDropi } from "../../context/DropiContext";

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
  tipo_configuracion,
  dataPlanes,
  toggleTagAssignment,
}) => {
  const [openContacto, setOpenContacto] = useState(false);
  const [openTools, setOpenTools] = useState(false);

  const [openMenu, setOpenMenu] = useState(null);
  const [openSubMenu, setOpenSubMenu] = useState(null);

  const toggleMenu = (key) => {
    setOpenMenu((prev) => {
      const next = prev === key ? null : key;
      // si sale de integraciones, cierre submenú
      if (next !== "integraciones") setOpenSubMenu(null);
      return next;
    });
  };

  const toggleSubMenu = (key) => {
    setOpenSubMenu((prev) => (prev === key ? null : key));
  };

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

  useEffect(() => {
    if (["/productos", "/categorias"].includes(location.pathname)) {
      setOpenMenu("productos");
    } else if (
      ["/integraciones", "/calendario", "/asistentes"].includes(
        location.pathname,
      )
    ) {
      setOpenMenu("herramientas");
    } else if (
      [
        "/canal-conexiones",
        "/contactos",
        "/estados_contactos",
        "/estados_contactos_ventas",
      ].includes(location.pathname)
    ) {
      setOpenMenu("contacto");
    }
  }, [location.pathname]);

  // helper (opcional) para no repetir localStorage + navigate
  const goTo = (path) => {
    localStorage.setItem("id_configuracion", id_configuracion);
    localStorage.setItem("id_plataforma_conf", id_plataforma_conf);
    navigate(path);
  };

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

  // =========================================================
  // DROPi (estado global en layout)
  // =========================================================
  const [isDropiLinked, setIsDropiLinked] = useState(false);
  const [loadingDropiLinked, setLoadingDropiLinked] = useState(false);

  const fetchDropiLinked = useCallback(async () => {
    if (!id_configuracion) return;

    setLoadingDropiLinked(true);
    try {
      const res = await chatApi.get("dropi_integrations", {
        params: { id_configuracion },
      });

      const list = res?.data?.data ?? [];
      setIsDropiLinked(list.length > 0);
    } catch (e) {
      // Si falla la consulta, por seguridad marcamos desconectado
      setIsDropiLinked(false);
    } finally {
      setLoadingDropiLinked(false);
    }
  }, [id_configuracion]);

  // =========================================================
  // Listener DROPi linked-changed => refetch
  // =========================================================
  useEffect(() => {
    const handler = () => {
      // cuando Integraciones.jsx crea/edita/elimina, esto actualiza el layout
      fetchDropiLinked();
    };

    window.addEventListener("dropi:linked-changed", handler);
    return () => window.removeEventListener("dropi:linked-changed", handler);
  }, [fetchDropiLinked]);

  // =========================================================
  // Cargar Dropi linked cuando ya tengo id_configuracion
  // =========================================================
  useEffect(() => {
    if (id_configuracion) fetchDropiLinked();
  }, [id_configuracion, fetchDropiLinked]);

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
        },
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
        prev.filter((chat) => chat.id !== selectedChat.id),
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
        },
      );

      const data = await response.data;

      if (data.status === "200") {
        // actualizar localmente
        setSelectedChat((prev) => ({
          ...prev,
          bot_openia: nuevoEstado,
        }));

        setMensajesAcumulados((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? { ...chat, bot_openia: nuevoEstado } // 🔥 actualiza SOLO el campo bot_openia
              : chat,
          ),
        );
      } else {
        console.error("Error al actualizar el bot:", data);
      }
    } catch (error) {
      console.error("Error al actualizar bot_openia:", error);
    }
  };

  const navigate = useNavigate();

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
          <div className="text-end leading-tight">
            <span className="block text-white font-semibold text-lg">
              {localStorage.getItem("nombre_configuracion") ?? "Tony Plaza"}
            </span>

            {/* Encargado - destacado */}
            <span className="inline-flex items-center justify-end mt-1">
              <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-white/15 text-white/95 text-sm font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                {userData?.nombre_encargado}
              </span>
            </span>

            {/* Rol - secundario */}
            <span className="block mt-1 text-xs text-white/70 tracking-wide">
              {userData?.rol}
            </span>
          </div>

          <img
            className="rounded-full w-12 h-12 bg-white object-cover"
            src="https://new.imporsuitpro.com/public/img/img.png"
            alt="Profile"
          />
        </div>
      </div>

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
        <div className="mt-6">
          {/* Conexiones */}
          <a
            onClick={(e) => {
              e.preventDefault();
              localStorage.removeItem("id_configuracion");
              localStorage.removeItem("tipo_configuracion");
              localStorage.removeItem("id_plataforma_conf");
              navigate("/conexiones");
              setSliderOpen(false);
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
              goTo("/chat");
              setSliderOpen(false);
            }}
          >
            <i className="bx bx-chat text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
            <span className="text-lg text-gray-700 group-hover:text-blue-600">
              Chat Center
            </span>
          </a>

          {/* ====== Contactos ====== */}
          <button
            className={`group flex items-center w-full px-5 py-4 text-left hover:bg-gray-100 ${
              location.pathname.startsWith("/contactos") ||
              ["/estados_contactos", "/estados_contactos_ventas"].includes(
                location.pathname,
              )
                ? "bg-gray-200 font-semibold"
                : ""
            }`}
            onClick={() => toggleMenu("contacto")}
          >
            <i className="bx bxs-contact text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
            <span className="text-lg text-gray-700 group-hover:text-blue-600">
              Contactos
            </span>
            <i
              className={`bx ml-auto transition-transform duration-300 ${
                openMenu === "contacto" ? "bx-chevron-up" : "bx-chevron-down"
              }`}
            />
          </button>

          <div
            className="overflow-hidden transition-all duration-[600ms] ease-out"
            style={{ maxHeight: openMenu === "contacto" ? "260px" : "0px" }}
          >
            <div className="ml-10 flex flex-col py-2">
              <button
                className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                  location.pathname === "/contactos"
                    ? "font-semibold text-blue-600"
                    : ""
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  goTo("/contactos");
                  setSliderOpen(false);
                }}
              >
                <i className="bx bx-book-content text-xl text-gray-600 group-hover:text-blue-600"></i>
                <span>Lista de contactos</span>
              </button>

              <button
                className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                  (tipo_configuracion === "ventas" &&
                    location.pathname === "/estados_contactos_ventas") ||
                  (tipo_configuracion !== "ventas" &&
                    location.pathname === "/estados_contactos")
                    ? "font-semibold text-blue-600"
                    : ""
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  if (tipo_configuracion === "ventas") {
                    goTo("/estados_contactos_ventas");
                  } else {
                    goTo("/estados_contactos");
                  }
                  setSliderOpen(false);
                }}
              >
                <i className="bx bx-check-shield text-xl text-gray-600 group-hover:text-blue-600"></i>
                <span>Estado de contactos</span>
              </button>
            </div>
          </div>

          {/* ====== Integraciones ====== */}
          <div>
            <button
              type="button"
              onClick={() => toggleMenu("integraciones")}
              className={`group flex items-center justify-between w-full px-5 py-4 text-left hover:bg-gray-100 ${
                ["/canal-conexiones", "/dropi"].some((p) =>
                  location.pathname.startsWith(p),
                )
                  ? "bg-gray-200 font-semibold"
                  : ""
              }`}
            >
              <span className="flex items-center">
                <i className="bx bx-plug text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
                <span className="text-lg text-gray-700 group-hover:text-blue-600">
                  Integraciones
                </span>
              </span>

              <i
                className={`bx bx-chevron-down text-2xl text-gray-500 transition-transform duration-300 ${
                  openMenu === "integraciones" ? "rotate-180" : ""
                }`}
              />
            </button>

            <div
              className="overflow-hidden transition-all duration-[600ms] ease-out"
              style={{
                maxHeight: openMenu === "integraciones" ? "520px" : "0px",
              }}
            >
              <div className="ml-10 flex flex-col py-2">
                <button
                  className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                    location.pathname === "/canal-conexiones"
                      ? "font-semibold text-blue-600"
                      : ""
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    goTo("/canal-conexiones");
                    setSliderOpen(false);
                  }}
                >
                  <i className="bx bx-network-chart text-xl text-gray-600 group-hover:text-blue-600"></i>
                  <span>Canal de Conexiones</span>
                </button>

                {/* ===== Dropi (submenu) ===== */}
                <div className="mt-1">
                  <button
                    type="button"
                    className={`group flex items-center justify-between w-full text-left px-4 py-2 hover:text-blue-600 ${
                      location.pathname.startsWith("/dropi")
                        ? "font-semibold text-blue-600"
                        : ""
                    }`}
                    onClick={() => toggleSubMenu("dropi")}
                  >
                    <span className="flex items-center gap-3">
                      <i className="bx bx-store text-xl text-gray-600 group-hover:text-blue-600"></i>
                      <span>Dropi</span>
                    </span>

                    <i
                      className={`bx bx-chevron-down text-xl text-gray-500 transition-transform duration-300 ${
                        openSubMenu === "dropi" ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className="overflow-hidden transition-all duration-[600ms] ease-out"
                    style={{
                      maxHeight: openSubMenu === "dropi" ? "220px" : "0px",
                    }}
                  >
                    <div className="ml-6 flex flex-col py-2">
                      <button
                        className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                          location.pathname === "/dropi"
                            ? "font-semibold text-blue-600"
                            : ""
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          goTo("/dropi");
                          setSliderOpen(false);
                        }}
                      >
                        <i className="bx bx-cog text-lg text-gray-600 group-hover:text-blue-600"></i>
                        <span>Configuración</span>
                      </button>

                      {isDropiLinked && (
                        <button
                          className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                            location.pathname.startsWith("/dropi/pedidos")
                              ? "font-semibold text-blue-600"
                              : ""
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            goTo("/dropi/pedidos");
                            setSliderOpen(false);
                          }}
                        >
                          <i className="bx bx-package text-lg text-gray-600 group-hover:text-blue-600"></i>
                          <span>Pedidos</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ====== Herramientas ====== */}
          <div>
            <button
              type="button"
              onClick={() => toggleMenu("herramientas")}
              className={`group flex items-center justify-between w-full px-5 py-4 text-left hover:bg-gray-100 ${
                ["/calendario", "/asistentes"].includes(location.pathname)
                  ? "bg-gray-200 font-semibold"
                  : ""
              }`}
            >
              <span className="flex items-center">
                <i className="bx bx-cog text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
                <span className="text-lg text-gray-700 group-hover:text-blue-600">
                  Herramientas
                </span>
              </span>

              <i
                className={`bx bx-chevron-down text-2xl text-gray-500 transition-transform duration-300 ${
                  openMenu === "herramientas" ? "rotate-180" : ""
                }`}
              />
            </button>

            <div
              className="overflow-hidden transition-all duration-[600ms] ease-out"
              style={{
                maxHeight: openMenu === "herramientas" ? "360px" : "0px",
              }}
            >
              <div className="ml-10 flex flex-col py-2">
                <button
                  className={`group flex items-center gap-3 text-left px-4 py-2 ${
                    location.pathname === "/calendario"
                      ? "font-semibold text-blue-600"
                      : ""
                  } ${
                    isCalendarBlocked
                      ? "text-gray-700 hover:text-red-600"
                      : "hover:text-blue-600"
                  }`}
                  onClick={(e) => {
                    handleCalendarioClick(e);
                    setSliderOpen(false);
                  }}
                >
                  <i
                    className={`bx text-xl ${
                      isCalendarBlocked
                        ? "bx-lock-alt text-gray-700 group-hover:text-red-600"
                        : "bx-calendar text-gray-600 group-hover:text-blue-600"
                    }`}
                  ></i>

                  <span className="flex items-center gap-2">
                    Calendario
                    <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-gray-200">
                      {isCalendarBlocked ? "Bloqueado" : "Beta"}
                    </span>
                  </span>
                </button>

                <button
                  className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                    location.pathname === "/asistentes"
                      ? "font-semibold text-blue-600"
                      : ""
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    goTo("/asistentes");
                    setSliderOpen(false);
                  }}
                >
                  <i className="bx bx-support text-xl text-gray-600 group-hover:text-blue-600"></i>
                  <span>Asistentes</span>
                </button>
              </div>
            </div>
          </div>

          {/* ====== Productos ====== */}
          <div>
            <button
              type="button"
              onClick={() => toggleMenu("productos")}
              className={`group flex items-center justify-between w-full px-5 py-4 text-left hover:bg-gray-100 ${
                location.pathname === "/productos" ||
                location.pathname === "/categorias"
                  ? "bg-gray-200 font-semibold"
                  : ""
              }`}
            >
              <span className="flex items-center">
                <i className="bx bxs-store text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
                <span className="text-lg text-gray-700 group-hover:text-blue-600">
                  Productos
                </span>
              </span>

              <i
                className={`bx bx-chevron-down text-2xl text-gray-500 transition-transform duration-300 ${
                  openMenu === "productos" ? "rotate-180" : ""
                }`}
              />
            </button>

            <div
              className="overflow-hidden transition-all duration-[600ms] ease-out"
              style={{ maxHeight: openMenu === "productos" ? "220px" : "0px" }}
            >
              <div className="ml-10 flex flex-col py-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    goTo("/productos");
                    setSliderOpen(false);
                  }}
                  className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                    location.pathname === "/productos"
                      ? "font-semibold text-blue-600"
                      : ""
                  }`}
                >
                  <i className="bx bx-list-ul text-xl text-gray-600 group-hover:text-blue-600"></i>
                  <span>Listado</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    goTo("/categorias");
                    setSliderOpen(false);
                  }}
                  className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                    location.pathname === "/categorias"
                      ? "font-semibold text-blue-600"
                      : ""
                  }`}
                >
                  <i className="bx bx-grid-alt text-xl text-gray-600 group-hover:text-blue-600"></i>
                  <span>Categorías</span>
                </button>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b p-4">
            {/* Botón para volver en móvil + imagen de usuario + nombre/teléfono */}
            <div className="flex gap-3 items-center min-w-0">
              <button
                className="p-1 text-[25px] block sm:hidden hover:scale-110 transition-transform"
                onClick={volver_seccion_principal}
              >
                <i className="bx bx-arrow-back"></i>
              </button>
              <img
                src={
                  selectedChat?.imagePath
                    ? selectedChat.imagePath
                    : "https://imp-datas.s3.amazonaws.com/images/2026-01-05T17-03-19-944Z-user.png"
                }
                alt="Avatar"
                className="h-12 w-12 rounded-full object-cover bg-white"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    "https://imp-datas.s3.amazonaws.com/images/2026-01-05T17-03-19-944Z-user.png";
                }}
              />
              <div className="min-w-0">
                <div className="flex">
                  <span className="block text-black font-semibold text-lg truncate">
                    {selectedChat
                      ? selectedChat.nombre_cliente
                      : "SELECCIONE UN CHAT"}
                  </span>
                  <div className="flex flex-wrap gap-1 ml-2">
                    {dataPlanes &&
                      typeof dataPlanes === "object" &&
                      Object.keys(dataPlanes).length > 0 &&
                      Object.entries(dataPlanes)
                        .filter(([key, value]) => value === 1)
                        .map(([planName]) => (
                          <span
                            key={planName}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {planName
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                        ))}
                  </div>
                </div>
                <span className="block text-sm text-gray-600 truncate">
                  {selectedChat
                    ? selectedChat.source === "wa"
                      ? selectedChat.celular_cliente
                        ? `+${selectedChat.celular_cliente}`
                        : "—"
                      : selectedChat.source === "ms"
                        ? selectedChat.external_id
                          ? `MS • ${selectedChat.external_id}`
                          : "MS • —"
                        : selectedChat.source === "ig"
                          ? selectedChat.external_id
                            ? `IG • ${selectedChat.external_id}`
                            : "IG • —"
                          : selectedChat.external_id ||
                            selectedChat.celular_cliente ||
                            "—"
                    : "—"}
                </span>
              </div>
            </div>

            {/* Botones de acciones en la esquina derecha */}
            <div className="flex items-center gap-4 justify-end sm:justify-start shrink-0">
              {/* Apagar/Ecender bot */}
              <SwitchBot
                botActivo={selectedChat.bot_openia === 1}
                onToggle={() =>
                  handleChangeChatBotOpenia(
                    selectedChat.bot_openia === 1 ? 0 : 1,
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
                          selectedChat.chat_cerrado === 0 ? 1 : 0,
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
                  tagListAsginadas?.some(
                    (assignedTag) =>
                      assignedTag.id_etiqueta === tag.id_etiqueta,
                  ),
                )
                .map((tag) => {
                  const color = tag.color_etiqueta || "#64748b";

                  return (
                    <div
                      key={tag.id_etiqueta}
                      className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5
                               shadow-sm transition hover:border-slate-300 hover:shadow max-w-full"
                      title={tag.nombre_etiqueta}
                    >
                      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                        <span
                          className="absolute inset-0 rounded-full"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                        <span
                          className="absolute inset-[-2px] rounded-full ring-2 ring-white"
                          aria-hidden="true"
                        />
                        <span
                          className="absolute inset-[-3px] rounded-full ring-1 ring-slate-200"
                          aria-hidden="true"
                        />
                      </span>

                      <span className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">
                        {tag.nombre_etiqueta}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleTagAssignment(tag.id_etiqueta, selectedChat.id);
                        }}
                        className="ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full
                                 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        aria-label={`Quitar etiqueta ${tag.nombre_etiqueta}`}
                        title="Quitar"
                      >
                        <i className="bx bx-x text-base" />
                      </button>
                    </div>
                  );
                })
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
