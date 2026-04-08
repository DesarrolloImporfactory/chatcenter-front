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
  const [estadosKanban, setEstadosKanban] = useState([]);
  const [loadingEstado, setLoadingEstado] = useState(false);
  const [estadoDropdownOpen, setEstadoDropdownOpen] = useState(false);
  const estadoDropdownRef = useRef(null);

  // ─── 2) FETCH DE COLUMNAS KANBAN ─────────────────────────────────────────────
  useEffect(() => {
    if (!id_configuracion) return;
    chatApi
      .post("/kanban_columnas/listar", { id_configuracion })
      .then(({ data }) => setEstadosKanban(data?.data || data || []))
      .catch(console.error);
  }, [id_configuracion]);

  // ─── 3) CERRAR DROPDOWN AL HACER CLICK FUERA ─────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (
        estadoDropdownRef.current &&
        !estadoDropdownRef.current.contains(e.target)
      )
        setEstadoDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── 4) HANDLER PARA CAMBIAR ESTADO ──────────────────────────────────────────
  const handleChangeEstadoContacto = async (columna) => {
    if (!selectedChat?.id) return;
    setEstadoDropdownOpen(false);
    setLoadingEstado(true);
    try {
      await chatApi.post("/clientes_chat_center/actualizar_estado_dinamico", {
        id_cliente: selectedChat.id,
        nuevo_estado: columna.estado_db,
        id_configuracion,
      });

      // Actualizar selectedChat local
      setSelectedChat((prev) => ({
        ...prev,
        nombre_estado: columna.nombre,
        color_fondo_estado: columna.color_texto || columna.color || null,
        estado_contacto: columna.estado_db,
      }));

      // Actualizar en la lista izquierda también
      setMensajesAcumulados((prev) =>
        prev.map((c) =>
          String(c.id) === String(selectedChat.id)
            ? {
                ...c,
                nombre_estado: columna.nombre,
                color_fondo_estado:
                  columna.color_texto || columna.color || null,
                estado_contacto: columna.estado_db,
              }
            : c,
        ),
      );
    } catch (e) {
      console.error("Error al cambiar estado:", e);
    } finally {
      setLoadingEstado(false);
    }
  };

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
    } else if (["/calendario"].includes(location.pathname)) {
      setOpenMenu("agentes");
    } else if (
      ["/canal-conexiones", "/dropi", "/asistentes"].includes(location.pathname)
    ) {
      setOpenMenu("integraciones");
    } else if (
      [
        "/canal-conexiones",
        "/contactos",
        "/estados_contactos",
        "/estados_contactos_ventas",
        "/valoraciones",
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

  const rutaEstados =
    tipo_configuracion === "ventas"
      ? "/estados_contactos_ventas"
      : tipo_configuracion === "eventos"
        ? "/estados_contactos_eventos"
        : tipo_configuracion === "imporshop"
          ? "/estados_contactos_imporshop"
          : tipo_configuracion === "kanban"
            ? "/estados_contactos_dinamico"
            : tipo_configuracion === "imporshop_proveedor"
              ? "/estados_contactos_imporshop_proveedor"
              : "/estados_contactos";

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
        if (r.isConfirmed) navigate("/planes");
      });
    }
  };

  const handleKanbanConfigClick = (e) => {
    e.preventDefault();

    localStorage.setItem("id_configuracion", id_configuracion);
    localStorage.setItem("id_plataforma_conf", id_plataforma_conf);

    navigate("/kanban_config");
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

  // useEffect(() => {
  //   const fetchEstadoNumero = async () => {
  //     if (!id_configuracion) return;
  //     try {
  //       const resp = await chatApi.post("/whatsapp_managment/ObtenerNumeros", {
  //         id_configuracion: id_configuracion,
  //       });
  //       setEstadoNumero(resp.data.data || []);
  //     } catch (error) {
  //       console.error("Error al obtener phone_numbers:", error);
  //     }
  //   };

  //   fetchEstadoNumero();
  // }, [id_configuracion]);

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
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Calcular tiempo restante hasta el vencimiento (1 año desde fecha_suscripcion)
  useEffect(() => {
    if (!dataPlanes?.fecha_suscripcion) {
      setTimeRemaining(null);
      return;
    }

    const calculateTimeRemaining = () => {
      const subscriptionDate = new Date(dataPlanes.fecha_suscripcion);
      const expirationDate = new Date(subscriptionDate);
      expirationDate.setFullYear(expirationDate.getFullYear() + 1); // 1 año de validez

      const now = new Date();
      const diff = expirationDate - now;

      if (diff <= 0) {
        setTimeRemaining({ expired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds, expired: false });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [dataPlanes?.fecha_suscripcion]);

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

  // Etiquetas custom (Asesor / Ciclo)
  const [customLabels, setCustomLabels] = useState(null);

  useEffect(() => {
    if (!selectedChat?.id) {
      setCustomLabels(null);
      return;
    }

    chatApi
      .get(`/etiquetas_custom_chat_center/cliente/${selectedChat.id}`)
      .then(({ data }) => setCustomLabels(data?.data || null))
      .catch(() => setCustomLabels(null));
  }, [selectedChat?.id]);

  return (
    <>
      {/* Cabecera principal (mobile visible si no hay chat seleccionado, desktop siempre) */}
      <div
        className={`items-center justify-between px-4 py-3 bg-[#171931] border-b border-white/10 ${
          selectedChat ? "hidden sm:flex" : "flex"
        }`}
      >
        {/* Botón “hamburger” para abrir slider */}
        <div>
          <button
            onClick={toggleSlider}
            className="
            inline-flex items-center justify-center
            w-10 h-10 rounded-xl
            text-white/90
            hover:bg-white/10 hover:text-white
            transition
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20
          "
            aria-label="Abrir menú"
            title="Menú"
          >
            <i className="bx bx-menu text-2xl" />
          </button>
        </div>

        {/* Nombre de usuario y foto */}
        <div className="flex items-center gap-3">
          <div className="text-end leading-tight">
            <span className="block text-white font-semibold text-[15px]">
              {localStorage.getItem("nombre_configuracion") ?? "Tony Plaza"}
            </span>

            {/* Encargado - destacado */}
            <span className="inline-flex items-center justify-end mt-1">
              <span
                className="
                inline-flex items-center gap-2 px-2.5 py-1 rounded-full
                bg-white/10 border border-white/10
                text-white/90 text-xs font-semibold
              "
              >
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                {userData?.nombre_encargado}
              </span>
            </span>

            {/* Rol - secundario */}
            <span className="block mt-1 text-[11px] text-white/60 tracking-wide">
              {userData?.rol}
            </span>
          </div>

          <img
            className="rounded-full w-11 h-11 bg-white object-cover ring-2 ring-white/10"
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
        <div className="h-[139px] px-5 flex items-center justify-between bg-[#171931] text-white border-b border-white/10">
          <h2 className="font-bold text-lg">Menú</h2>
          <button
            ref={menuButtonRef}
            onClick={toggleSlider}
            className="
            inline-flex items-center justify-center
            w-10 h-10 rounded-xl
            hover:bg-white/10 transition
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20
          "
            aria-label="Cerrar menú"
            title="Cerrar"
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
              [
                "/estados_contactos",
                "/estados_contactos_ventas",
                "/estados_contactos_eventos",
                "/estados_contactos_imporshop",
              ].includes(location.pathname)
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
                  location.pathname === rutaEstados
                    ? "font-semibold text-blue-600"
                    : ""
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(rutaEstados);
                  setSliderOpen(false);
                }}
              >
                <i className="bx bx-check-shield text-xl text-gray-600 group-hover:text-blue-600"></i>
                <span>Estado de contactos</span>
              </button>

              <button
                className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                  location.pathname === "/valoraciones"
                    ? "font-semibold text-blue-600"
                    : ""
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  goTo("/valoraciones");
                  setSliderOpen(false);
                }}
              >
                <i className="bx bx-bar-chart-alt-2 text-xl text-gray-600 group-hover:text-blue-600"></i>
                <span>Valoraciones</span>
              </button>
            </div>
          </div>

          {/* ====== Integraciones ====== */}
          <div>
            <button
              type="button"
              onClick={() => toggleMenu("integraciones")}
              className={`group flex items-center justify-between w-full px-5 py-4 text-left hover:bg-gray-100 ${
                ["/canal-conexiones", "/dropi", "/asistentes"].some((p) =>
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

          {/* ====== Agentes ====== */}
          <div>
            <button
              type="button"
              onClick={() => toggleMenu("agentes")}
              className={`group flex items-center justify-between w-full px-5 py-4 text-left hover:bg-gray-100 ${
                ["/calendario"].includes(location.pathname)
                  ? "bg-gray-200 font-semibold"
                  : ""
              }`}
            >
              <span className="flex items-center">
                <i className="bx bx-cog text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
                <span className="text-lg text-gray-700 group-hover:text-blue-600">
                  Agentes
                </span>
              </span>

              <i
                className={`bx bx-chevron-down text-2xl text-gray-500 transition-transform duration-300 ${
                  openMenu === "agentes" ? "rotate-180" : ""
                }`}
              />
            </button>

            <div
              className="overflow-hidden transition-all duration-[600ms] ease-out"
              style={{
                maxHeight: openMenu === "agentes" ? "360px" : "0px",
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
              </div>

              {tipo_configuracion === "kanban" && (
                <div className="ml-10 flex flex-col py-2">
                  <button
                    className={`group flex items-center gap-3 text-left px-4 py-2 ${
                      location.pathname === "/kanban_config"
                        ? "font-semibold text-blue-600"
                        : ""
                    }`}
                    onClick={(e) => {
                      handleKanbanConfigClick(e);
                      setSliderOpen(false);
                    }}
                  >
                    <i
                      className={`bx text-xl ${"bx-bot text-gray-600 group-hover:text-blue-600"}`}
                    ></i>

                    <span className="flex items-center gap-2">
                      Configurar agentes
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ====== Productos ====== */}
          <div>
            <button
              type="button"
              onClick={() => toggleMenu("productos")}
              className={`group flex items-center justify-between w-full px-5 py-4 text-left hover:bg-gray-100 ${
                location.pathname === "/productos" ||
                location.pathname === "/categorias" ||
                location.pathname === "/catalogos"
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

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/catalogos");
                  }}
                  className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                    location.pathname === "/catalogos"
                      ? "font-semibold text-blue-600"
                      : ""
                  }`}
                >
                  <i className="bx bx-collection text-xl text-gray-600 group-hover:text-blue-600"></i>
                  <span>Catálogos</span>
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
          <div className="border-b border-slate-200/70 bg-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center px-4 py-3">
              {/* Botón para volver en móvil + imagen de usuario + nombre/teléfono */}
              <div className="flex gap-3 items-center min-w-0">
                <button
                  className="
                  inline-flex items-center justify-center
                  w-10 h-10 rounded-xl
                  text-slate-700
                  hover:bg-slate-100 hover:text-slate-900
                  transition
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300
                  block sm:hidden
                "
                  onClick={volver_seccion_principal}
                  aria-label="Volver"
                  title="Volver"
                >
                  <i className="bx bx-arrow-back text-[22px]" />
                </button>

                <img
                  src={
                    selectedChat?.imagePath
                      ? selectedChat.imagePath
                      : "https://imp-datas.s3.amazonaws.com/images/2026-01-05T17-03-19-944Z-user.png"
                  }
                  alt="Avatar"
                  className="h-11 w-11 rounded-full object-cover bg-white ring-2 ring-slate-200"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://imp-datas.s3.amazonaws.com/images/2026-01-05T17-03-19-944Z-user.png";
                  }}
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="block text-slate-900 font-semibold text-[15px] truncate">
                      {selectedChat
                        ? selectedChat.nombre_cliente
                        : "SELECCIONE UN CHAT"}
                    </span>

                    <div className="flex flex-wrap gap-1">
                      {dataPlanes &&
                        typeof dataPlanes === "object" &&
                        Object.keys(dataPlanes).length > 0 &&
                        Object.entries(dataPlanes)
                          .filter(
                            ([key, value]) =>
                              value === 1 && key !== "fecha_suscripcion",
                          )
                          .map(([planName]) => (
                            <span
                              key={planName}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100"
                            >
                              {planName
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </span>
                          ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="block text-[12px] text-slate-500 truncate">
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

                    {/* Contador de tiempo restante */}
                    {timeRemaining && dataPlanes?.fecha_suscripcion && (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold border ${
                          timeRemaining.expired
                            ? "bg-red-50 text-red-700 border-red-100"
                            : timeRemaining.days === 0
                              ? "bg-orange-50 text-orange-700 border-orange-100"
                              : timeRemaining.days <= 5
                                ? "bg-yellow-50 text-yellow-700 border-yellow-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        }`}
                      >
                        <i
                          className={`bx ${timeRemaining.expired ? "bx-x-circle" : "bx-time-five"}`}
                        />
                        {timeRemaining.expired
                          ? "Suscripción vencida"
                          : timeRemaining.days === 0
                            ? "Vence hoy"
                            : `${timeRemaining.days} ${timeRemaining.days === 1 ? "día" : "días"}`}
                      </span>
                    )}

                    {/* ─── PILL ESTADO CONTACTO ─────────────────────────────────────── */}
                    <div className="relative mt-1.5" ref={estadoDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setEstadoDropdownOpen((p) => !p)}
                        disabled={loadingEstado}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
                        title="Cambiar estado del contacto"
                      >
                        {loadingEstado ? (
                          <i className="bx bx-loader-alt animate-spin text-[12px] text-slate-400" />
                        ) : selectedChat?.nombre_estado ? (
                          <>
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  selectedChat.color_fondo_estado || "#94a3b8",
                              }}
                            />
                            <span
                              style={{
                                color:
                                  selectedChat.color_fondo_estado || "#475569",
                              }}
                            >
                              {selectedChat.nombre_estado}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                            <span className="text-slate-400">Sin estado</span>
                          </>
                        )}
                        <i
                          className={`bx bx-chevron-down text-[11px] text-slate-400 transition-transform ${estadoDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Dropdown de estados */}
                      {estadoDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[180px] max-w-[240px] rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_-8px_rgba(2,6,23,0.28)] ring-1 ring-black/5 p-1.5 overflow-hidden">
                          {/* caret */}
                          <span className="pointer-events-none absolute -top-1.5 left-4 h-3 w-3 rotate-45 bg-white border-t border-l border-slate-200/70" />

                          {estadosKanban.length === 0 ? (
                            <div className="px-3 py-2 text-[11px] text-slate-400">
                              Sin estados configurados
                            </div>
                          ) : (
                            estadosKanban.map((col) => {
                              const color =
                                col.color_texto || col.color || "#94a3b8";
                              const isActive =
                                selectedChat?.estado_contacto === col.estado_db;
                              return (
                                <button
                                  key={col.id || col.estado_db}
                                  type="button"
                                  onClick={() =>
                                    handleChangeEstadoContacto(col)
                                  }
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium text-left transition-colors ${
                                    isActive
                                      ? "bg-slate-100 text-slate-900"
                                      : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span
                                    className="truncate"
                                    style={{
                                      color: isActive ? color : undefined,
                                    }}
                                  >
                                    {col.nombre}
                                  </span>
                                  {isActive && (
                                    <i
                                      className="bx bx-check ml-auto text-[14px]"
                                      style={{ color }}
                                    />
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acciones en la esquina derecha */}
              <div className="flex items-center gap-3 justify-end sm:justify-start shrink-0">
                {/* Apagar/Encender bot */}
                <div className="rounded-xl border border-slate-200/70 bg-white px-2 py-1 shadow-sm">
                  <SwitchBot
                    botActivo={selectedChat.bot_openia === 1}
                    onToggle={() =>
                      handleChangeChatBotOpenia(
                        selectedChat.bot_openia === 1 ? 0 : 1,
                      )
                    }
                  />
                </div>

                <div
                  className="relative inline-block text-left"
                  ref={menuOpcionesRef}
                >
                  <button
                    id="menu-opciones-boton"
                    onClick={toggleOpcionesMenu}
                    aria-haspopup="menu"
                    aria-expanded={opcionesMenuOpen}
                    aria-controls="menu-opciones"
                    className="
                    group inline-flex items-center justify-center
                    w-10 h-10
                    rounded-xl
                    text-white/90
                    shadow-sm
                    hover:bg-white/10 hover:shadow-md
                    transition-all duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20
                    !bg-[#171931]
                  "
                    title="Menú"
                    aria-label="Menú"
                  >
                    <i
                      className={`bx bx-chevron-down text-2xl transition-transform duration-200 ${
                        opcionesMenuOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  {/* Menú desplegable */}
                  {opcionesMenuOpen && (
                    <div
                      id="menu-opciones"
                      role="menu"
                      aria-labelledby="menu-opciones-boton"
                      className="
                      absolute right-0 mt-2 w-56 origin-top-right
                      rounded-2xl border border-slate-200/70
                      bg-white/90 backdrop-blur-xl
                      shadow-[0_18px_60px_-20px_rgba(0,0,0,0.35)]
                      ring-1 ring-black/5 p-2 z-50
                    "
                    >
                      {/* caret */}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-1.5 right-6 h-3 w-3 rotate-45 bg-white border-t border-l border-slate-200/70"
                      />

                      {/* Opción: Abrir/Cerrar chat */}
                      <button
                        role="menuitem"
                        onClick={() =>
                          handleChangeChatStatus(
                            selectedChat.chat_cerrado === 0 ? 1 : 0,
                          )
                        }
                        className={`flex items-center w-full gap-3 px-3 py-2.5 text-left text-sm rounded-xl transition-colors
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                        ${
                          selectedChat.chat_cerrado === 0
                            ? "text-red-700 hover:bg-red-50"
                            : "text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-xl
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
                          />
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
                        className="
                        flex items-center w-full gap-3 px-3 py-2.5 text-left text-sm
                        text-slate-700 hover:bg-slate-100 rounded-xl transition-colors
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                      "
                      >
                        <span
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100"
                          aria-hidden="true"
                        >
                          <i className="bx bx-transfer-alt text-base text-slate-700" />
                        </span>
                        <span className="flex-1 truncate">Transferir chat</span>
                      </button>

                      <hr className="my-2 border-slate-200/70" />

                      {/* Opción: Etiquetas */}
                      <button
                        role="menuitem"
                        onClick={toggleAsignarEtiquetaModal}
                        className="
                        flex items-center w-full gap-3 px-3 py-2.5 text-left text-sm
                        text-slate-700 hover:bg-slate-100 rounded-xl transition-colors
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                      "
                      >
                        <span
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100"
                          aria-hidden="true"
                        >
                          <i className="bx bxs-purchase-tag text-base text-slate-700" />
                        </span>
                        <span className="flex-1 truncate">
                          Asignar etiquetas
                        </span>
                      </button>

                      <button
                        role="menuitem"
                        onClick={toggleCrearEtiquetaModal}
                        className="
                        mt-1 flex items-center w-full gap-3 px-3 py-2.5 text-left text-sm
                        text-slate-700 hover:bg-slate-100 rounded-xl transition-colors
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                      "
                      >
                        <span
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100"
                          aria-hidden="true"
                        >
                          <i className="bx bx-plus text-base text-slate-700" />
                        </span>
                        <span className="flex-1 truncate">Crear etiqueta</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Botón de información (opciones) */}
                <button
                  onClick={handleOpciones}
                  className="
                  inline-flex items-center justify-center
                  w-10 h-10 rounded-xl
                  border border-slate-200/70 bg-white
                  text-slate-700 shadow-sm
                  hover:bg-slate-50 hover:shadow
                  transition
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300
                "
                  title="Información"
                  aria-label="Información"
                >
                  <i className="bx bx-info-circle text-xl" />
                </button>
              </div>
            </div>

            {/* Sección de etiquetas asignadas debajo del encabezado */}
            <div className="flex flex-wrap gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200/70">
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
                        className="
                        group inline-flex items-center gap-2
                        rounded-full border border-slate-200 bg-white
                        px-3 py-1.5 shadow-sm
                        transition hover:border-slate-300 hover:shadow
                        max-w-full
                      "
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
                            toggleTagAssignment(
                              tag.id_etiqueta,
                              selectedChat.id,
                            );
                          }}
                          className="
                          ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full
                          text-slate-400 hover:text-slate-700 hover:bg-slate-100
                          transition
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                        "
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

              {/* Etiquetas custom: Asesor y Ciclo */}
              {customLabels?.nombre_asesor && (
                <div
                  className="group inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 shadow-sm max-w-full"
                  title={`Asesor: ${customLabels.nombre_asesor}`}
                >
                  <i className="bx bx-user-voice text-sm text-sky-600" />
                  <span className="text-xs font-semibold text-sky-800 truncate max-w-[180px]">
                    {customLabels.nombre_asesor}
                  </span>
                  <span className="text-[10px] text-sky-500 font-medium uppercase">
                    Asesor
                  </span>
                </div>
              )}

              {customLabels?.nombre_ciclo && (
                <div
                  className="group inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 shadow-sm max-w-full"
                  title={`Ciclo: ${customLabels.nombre_ciclo}`}
                >
                  <i className="bx bx-revision text-sm text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-800 truncate max-w-[180px]">
                    {customLabels.nombre_ciclo}
                  </span>
                  <span className="text-[10px] text-emerald-500 font-medium uppercase">
                    Ciclo
                  </span>
                </div>
              )}
            </div>
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
                className="
                inline-flex items-center justify-center
                w-10 h-10 rounded-xl
                hover:bg-white/10 transition
                focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20
              "
                aria-label="Cerrar panel"
                title="Cerrar"
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
