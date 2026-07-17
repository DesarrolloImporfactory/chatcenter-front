import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../shared/Header";
import { Footer } from "../shared/Footer";
import chatApi from "../../api/chatcenter";
import { jwtDecode } from "jwt-decode";
import io from "socket.io-client";

import Swal from "sweetalert2";
import usePresenceRegister from "../../hooks/usePresenceRegister";
import { usePresence } from "../../context/PresenceProvider";
import FloatingSupportChat from "./FloatingSupportChat";
import { globalLogout } from "../../utils/globalLogout";
import { checkOpenAIStatus } from "../../utils/checkOpenAIStatus";
import { checkWhatsappStatus } from "../../utils/checkWhatsappStatus";

const PLANES_CALENDARIO = [1, 3, 4];

function MainLayout({ children }) {
  usePresenceRegister();

  const { getPresence } = usePresence();

  const token = localStorage.getItem("token");
  const decoded = token ? jwtDecode(token) : null;
  const id_sub_usuario = decoded?.id_sub_usuario;

  const p = getPresence(id_sub_usuario);

  const [sliderOpen, setSliderOpen] = useState(false);
  const [openProductos, setOpenProductos] = useState(false);
  const [openContacto, setOpenContacto] = useState(false);
  const [openTools, setOpenTools] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const toggleMenu = (key) => {
    setOpenMenu((prev) => (prev === key ? null : key));
  };

  const sliderRef = useRef(null);
  const menuButtonRef = useRef(null);

  const tipo_configuracion = localStorage.getItem("tipo_configuracion");

  // Estado base
  const [userData, setUserData] = useState(null);
  const [configuraciones, setConfiguraciones] = useState([]);
  const [estadoNumero, setEstadoNumero] = useState([]);
  const [id_configuracion, setId_configuracion] = useState(null);
  const [id_plataforma_conf, setId_plataforma_conf] = useState(null);
  const [canAccessCalendar, setCanAccessCalendar] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  // =========================================================
  // Bootstrap: leer id_configuracion / validar pertenencia
  // =========================================================
  useEffect(() => {
    const idp = localStorage.getItem("id_plataforma_conf");
    const idc = localStorage.getItem("id_configuracion");

    if (!idc) {
      localStorage.removeItem("id_configuracion");
      localStorage.removeItem("tipo_configuracion");
      localStorage.removeItem("id_plataforma_conf");
      navigate("/conexiones");
      return;
    }

    const token = localStorage.getItem("token");

    if (token) {
      const decoded = jwtDecode(token);
      const usuario = decoded.id_usuario;

      const validar_conexion_usuario = async (
        id_usuario,
        id_configuracion_,
      ) => {
        try {
          const res = await chatApi.post(
            "configuraciones/validar_conexion_usuario",
            { id_usuario, id_configuracion: id_configuracion_ },
          );

          if (res.status === 200) {
            const coincidencia = res.data.coincidencia;

            if (!coincidencia) {
              await Swal.fire({
                icon: "error",
                title: "Sin permisos a la configuración",
                text: "Esta configuración no pertenece a tu usuario",
                allowOutsideClick: false,
                allowEscapeKey: false,
                allowEnterKey: true,
                confirmButtonText: "OK",
              });

              localStorage.removeItem("id_configuracion");
              localStorage.removeItem("tipo_configuracion");
              localStorage.removeItem("id_plataforma_conf");
              navigate("/conexiones");
            }
          } else {
            console.error("Error al validar conexión:", res.data);
          }
        } catch (error) {
          console.error("Error en la validación:", error);

          await Swal.fire({
            icon: "error",
            title: "Sin permisos a la configuración",
            text: "Esta configuración no pertenece a tu usuario",
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: true,
            confirmButtonText: "OK",
          });

          localStorage.removeItem("id_configuracion");
          localStorage.removeItem("tipo_configuracion");
          localStorage.removeItem("id_plataforma_conf");
          navigate("/conexiones");
        }
      };

      validar_conexion_usuario(usuario, idc);
    } else {
      localStorage.removeItem("id_configuracion");
      localStorage.removeItem("tipo_configuracion");
      localStorage.removeItem("id_plataforma_conf");
      navigate("/conexiones");
      return;
    }

    if (idc) setId_configuracion(parseInt(idc, 10));

    if (idp === "null") setId_plataforma_conf(null);
    else setId_plataforma_conf(idp ? parseInt(idp, 10) : null);
  }, [navigate]);

  // =========================================================
  // Validar token y setUserData
  // =========================================================
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const decoded = jwtDecode(token);

    if (decoded.exp < Date.now() / 1000) {
      localStorage.clear();
      window.location.href = "/login";
      return;
    }

    setUserData(decoded);

    checkOpenAIStatus();
    checkWhatsappStatus();
  }, []);

  // =========================================================
  // Cargar configuraciones del usuario
  // =========================================================
  useEffect(() => {
    if (userData) fetchConfiguracionAutomatizada();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  const fetchConfiguracionAutomatizada = async () => {
    try {
      const response = await chatApi.post(
        "configuraciones/listar_conexiones_sub_user",
        {
          id_usuario: userData.id_usuario,
          id_sub_usuario: userData.id_sub_usuario,
        },
      );

      setConfiguraciones(response.data || []);
    } catch (error) {
      if (error.response?.status === 403) {
        Swal.fire({
          icon: "error",
          title: error.response?.data?.message,
          text: "",
          allowOutsideClick: false,
          allowEscapeKey: false,
          allowEnterKey: true,
          confirmButtonText: "OK",
        }).then(() => {
          navigate("/planes");
        });
      } else {
        console.error("Error al cargar la configuración automatizada.", error);
        setConfiguraciones([]);
      }
    }
  };

  // =========================================================
  // Banned status
  // =========================================================
  useEffect(() => {
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
      }).then(() => handleLogout());
    }
  }, [estadoNumero]);

  // =========================================================
  // Click outside / escape para cerrar slider
  // =========================================================
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

    function handleEscape(event) {
      if (event.key === "Escape") setSliderOpen(false);
    }

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [sliderOpen]);

  const toggleSlider = () => setSliderOpen((v) => !v);

  // =========================================================
  // Calendario (permisos)
  // =========================================================
  useEffect(() => {
    if (userData) {
      const permitido = PLANES_CALENDARIO.includes(Number(userData.id_plan));
      setCanAccessCalendar(permitido);
    }
  }, [userData]);

  useEffect(() => {
    if (
      userData &&
      location.pathname === "/calendario" &&
      canAccessCalendar === false
    ) {
      Swal.fire({
        icon: "info",
        title: "Sección bloqueada",
        html: "Su plan actual no incluye <b>Calendario</b>.",
        confirmButtonText: "Ver planes",
        showCancelButton: true,
        cancelButtonText: "Cerrar",
        allowOutsideClick: false,
      }).then((r) => {
        if (r.isConfirmed) navigate("plan");
        else navigate("/conexiones");
      });
    }
  }, [userData, canAccessCalendar, location.pathname, navigate]);

  // =========================================================
  // Auto abrir menús por ruta
  // =========================================================
  useEffect(() => {
    if (["/productos", "/categorias"].includes(location.pathname)) {
      setOpenMenu("productos");
    } else if (
      location.pathname.startsWith("/pedidos") ||
      location.pathname.startsWith("/shopify/abandonados")
    ) {
      setOpenMenu("ventas");
    } else if (["/calendario"].includes(location.pathname)) {
      setOpenMenu("agentes");
    } else if (
      ["/canal-conexiones", "/dropi", "/asistentes", "/shopify"].some((p) =>
        location.pathname.startsWith(p),
      )
    ) {
      setOpenMenu("integraciones");
    } else if (
      [
        "/canal-conexiones",
        "/contactos",
        "/estados_contactos",
        "/estados_contactos_ventas",
        "/estados_contactos_imporshop",
        "/estados_contactos_eventos",
        "/valoraciones",
      ].includes(location.pathname)
    ) {
      setOpenMenu("contacto");
    }
  }, [location.pathname]);

  // =========================================================
  // Navegación helper
  // =========================================================
  const goTo = (path) => {
    localStorage.setItem("id_configuracion", id_configuracion);
    localStorage.setItem("id_plataforma_conf", id_plataforma_conf);
    navigate(path);
  };

  // ─────────────────────────────────────────────────────────────
  const handleNavClick = (e, path) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) {
      setSliderOpen(false);
      return;
    }
    e.preventDefault();
    goTo(path);
    setSliderOpen(false);
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
        if (r.isConfirmed) navigate("plan");
      });
    }
  };

  const handleKanbanConfigClick = (e) => {
    e.preventDefault();

    localStorage.setItem("id_configuracion", id_configuracion);
    localStorage.setItem("id_plataforma_conf", id_plataforma_conf);

    navigate("/kanban_config");
  };

  const handleKanbanConfigV2Click = (e) => {
    e.preventDefault();
    localStorage.setItem("id_configuracion", id_configuracion);
    localStorage.setItem("id_plataforma_conf", id_plataforma_conf);
    navigate("/kanban_config_v2");
  };

  const handleLogout = () => globalLogout();

  const isCalendarBlocked = userData && canAccessCalendar === false;

  return (
    <div className="flex flex-col min-h-screen">
      <Header menuButtonRef={menuButtonRef} onToggleSlider={toggleSlider} />

      <div className="flex flex-1">
        {/* Menú Lateral (slider) */}
        <div
          ref={sliderRef}
          className={`
          bg-white shadow-md
          fixed top-16 left-0 z-40
          h-[calc(100vh-4rem)]
          transition-[width] duration-300
          ${sliderOpen ? "w-64 overflow-y-auto" : "w-0 overflow-hidden"}
        `}
          aria-hidden={!sliderOpen}
        >
          <div className="mt-6">
            {/* Conexiones — SIN href a propósito: NO debe abrirse en pestaña
                nueva porque borra el localStorage (id_configuracion, etc.) */}
            <a
              onClick={(e) => {
                e.preventDefault();
                localStorage.removeItem("id_configuracion");
                localStorage.removeItem("tipo_configuracion");
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

            {/* Dashboard de conexión */}
            <a
              href="/conexion-dashboard"
              className={`group flex items-center w-full px-5 py-4 text-left hover:bg-gray-100 ${
                location.pathname === "/conexion-dashboard"
                  ? "bg-gray-200 font-semibold"
                  : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                goTo("/conexion-dashboard");
              }}
            >
              <i className="bx bx-bar-chart-alt-2 text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
              <span className="text-lg text-gray-700 group-hover:text-blue-600">
                Dashboard
              </span>
            </a>

            {/* Chat Center — se deja igual (no se habilita pestaña nueva) */}
            <a
              href="/chat"
              className={`group flex items-center w-full px-5 py-4 text-left hover:bg-gray-100 ${
                location.pathname === "/chat" ? "bg-gray-200 font-semibold" : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                goTo("/chat");
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
                location.pathname.startsWith("/contactos")
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
                <a
                  href="/contactos"
                  onClick={(e) => handleNavClick(e, "/contactos")}
                  className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                    location.pathname === "/contactos"
                      ? "font-semibold text-blue-600"
                      : ""
                  }`}
                >
                  <i className="bx bx-book-content text-xl text-gray-600 group-hover:text-blue-600"></i>
                  <span>Lista de contactos</span>
                </a>

                <a
                  href={rutaEstados}
                  onClick={(e) => handleNavClick(e, rutaEstados)}
                  className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                    location.pathname === rutaEstados
                      ? "font-semibold text-blue-600"
                      : ""
                  }`}
                >
                  <i className="bx bx-check-shield text-xl text-gray-600 group-hover:text-blue-600"></i>
                  <span>Estado de contactos</span>
                </a>

                <a
                  href="/valoraciones"
                  onClick={(e) => handleNavClick(e, "/valoraciones")}
                  className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                    location.pathname === "/valoraciones"
                      ? "font-semibold text-blue-600"
                      : ""
                  }`}
                >
                  <i className="bx bx-bar-chart-alt-2 text-xl text-gray-600 group-hover:text-blue-600"></i>
                  <span>Valoraciones</span>
                </a>
              </div>
            </div>

            {/* ====== Gestión de Pedidos (pedidos hoy; carritos
                abandonados, seguimientos y más a futuro). Siempre
                visible: vende el módulo aunque no haya Dropi. ====== */}
            <div>
              <button
                type="button"
                onClick={() => toggleMenu("ventas")}
                className={`group flex items-center justify-between w-full px-5 py-4 text-left hover:bg-gray-100 ${
                  location.pathname.startsWith("/pedidos") ||
                  location.pathname.startsWith("/transportadoras") ||
                  location.pathname.startsWith("/shopify/abandonados")
                    ? "bg-gray-200 font-semibold"
                    : ""
                }`}
              >
                <span className="flex items-center">
                  <i className="bx bx-shopping-bag text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
                  <span className="text-lg text-gray-700 group-hover:text-blue-600">
                    Ventas
                  </span>
                </span>
                <i
                  className={`bx bx-chevron-down text-2xl text-gray-500 transition-transform duration-300 ${
                    openMenu === "ventas" ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className="overflow-hidden transition-all duration-[600ms] ease-out"
                style={{
                  maxHeight: openMenu === "ventas" ? "300px" : "0px",
                }}
              >
                <div className="ml-10 flex flex-col py-2">
                  <a
                    href="/pedidos"
                    onClick={(e) => handleNavClick(e, "/pedidos")}
                    className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                      location.pathname.startsWith("/pedidos")
                        ? "font-semibold text-blue-600"
                        : ""
                    }`}
                  >
                    <i className="bx bx-package text-xl text-gray-600 group-hover:text-blue-600"></i>
                    <span>Pedidos</span>
                  </a>

                  <a
                    href="/transportadoras"
                    onClick={(e) => handleNavClick(e, "/transportadoras")}
                    className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                      location.pathname.startsWith("/transportadoras")
                        ? "font-semibold text-blue-600"
                        : ""
                    }`}
                  >
                    <i className="bx bx-trip text-xl text-gray-600 group-hover:text-blue-600"></i>
                    <span>Transportadoras</span>
                  </a>

                  <a
                    href="/shopify/abandonados"
                    onClick={(e) => handleNavClick(e, "/shopify/abandonados")}
                    className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                      location.pathname.startsWith("/shopify/abandonados")
                        ? "font-semibold text-blue-600"
                        : ""
                    }`}
                  >
                    <i className="bx bx-cart text-xl text-gray-600 group-hover:text-blue-600"></i>
                    <span>Carritos abandonados</span>
                  </a>
                </div>
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
                  <a
                    href="/canal-conexiones"
                    onClick={(e) => handleNavClick(e, "/canal-conexiones")}
                    className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                      location.pathname === "/canal-conexiones"
                        ? "font-semibold text-blue-600"
                        : ""
                    }`}
                  >
                    <i className="bx bx-network-chart text-xl text-gray-600 group-hover:text-blue-600"></i>
                    <span>Canal de Conexiones</span>
                  </a>

                  <a
                    href="/asistentes"
                    onClick={(e) => handleNavClick(e, "/asistentes")}
                    className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                      location.pathname === "/asistentes"
                        ? "font-semibold text-blue-600"
                        : ""
                    }`}
                  >
                    <i className="bx bxs-bolt text-xl text-gray-600 group-hover:text-blue-600"></i>
                    <span>Asistentes AI</span>
                  </a>

                  {/* ===== Dropi (directo a configuración) ===== */}
                  <a
                    href="/dropi"
                    onClick={(e) => handleNavClick(e, "/dropi")}
                    className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                      location.pathname.startsWith("/dropi")
                        ? "font-semibold text-blue-600"
                        : ""
                    }`}
                  >
                    <i className="bx bx-store text-xl text-gray-600 group-hover:text-blue-600"></i>
                    <span>Dropi</span>
                  </a>

                  {/* ===== Shopify (directo a configuración) ===== */}
                  <a
                    href="/shopify"
                    onClick={(e) => handleNavClick(e, "/shopify")}
                    className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                      location.pathname.startsWith("/shopify")
                        ? "font-semibold text-blue-600"
                        : ""
                    }`}
                  >
                    <i className="bx bxl-shopify text-xl text-gray-600 group-hover:text-blue-600"></i>
                    <span>Shopify</span>
                  </a>
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
                  {/* Calendario: href solo si tiene acceso (si está bloqueado no se
                      abre en pestaña nueva y el click normal muestra el aviso) */}
                  <a
                    href={canAccessCalendar ? "/calendario" : undefined}
                    onClick={(e) => {
                      // pestaña nueva solo si tiene acceso
                      if (
                        canAccessCalendar &&
                        (e.metaKey ||
                          e.ctrlKey ||
                          e.shiftKey ||
                          e.altKey ||
                          e.button === 1)
                      ) {
                        setSliderOpen(false);
                        return;
                      }
                      handleCalendarioClick(e); // preventDefault + lógica de bloqueo
                      setSliderOpen(false);
                    }}
                    className={`group flex items-center gap-3 text-left px-4 py-2 cursor-pointer ${
                      location.pathname === "/calendario"
                        ? "font-semibold text-blue-600"
                        : ""
                    } ${
                      isCalendarBlocked
                        ? "text-gray-700 hover:text-red-600"
                        : "hover:text-blue-600"
                    }`}
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
                  </a>
                </div>

                {tipo_configuracion === "kanban" && (
                  <div className="ml-10 flex flex-col py-2">
                    <a
                      href="/kanban_config"
                      onClick={(e) => {
                        if (
                          e.metaKey ||
                          e.ctrlKey ||
                          e.shiftKey ||
                          e.altKey ||
                          e.button === 1
                        ) {
                          setSliderOpen(false);
                          return;
                        }
                        handleKanbanConfigClick(e); // preventDefault + setItem + navigate
                        setSliderOpen(false);
                      }}
                      className={`group flex items-center gap-3 text-left px-4 py-2 cursor-pointer ${
                        location.pathname === "/kanban_config"
                          ? "font-semibold text-blue-600"
                          : ""
                      }`}
                    >
                      <i
                        className={`bx text-xl ${"bx-bot text-gray-600 group-hover:text-blue-600"}`}
                      ></i>

                      <span className="flex items-center gap-2">
                        Configurar agentes
                      </span>
                    </a>
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
                style={{
                  maxHeight: openMenu === "productos" ? "220px" : "0px",
                }}
              >
                <div className="ml-10 flex flex-col py-2">
                  <a
                    href="/productos"
                    onClick={(e) => handleNavClick(e, "/productos")}
                    className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                      location.pathname === "/productos"
                        ? "font-semibold text-blue-600"
                        : ""
                    }`}
                  >
                    <i className="bx bx-list-ul text-xl text-gray-600 group-hover:text-blue-600"></i>
                    <span>Listado</span>
                  </a>

                  <a
                    href="/categorias"
                    onClick={(e) => handleNavClick(e, "/categorias")}
                    className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                      location.pathname === "/categorias"
                        ? "font-semibold text-blue-600"
                        : ""
                    }`}
                  >
                    <i className="bx bx-grid-alt text-xl text-gray-600 group-hover:text-blue-600"></i>
                    <span>Categorías</span>
                  </a>

                  <a
                    href="/catalogos"
                    onClick={(e) => handleNavClick(e, "/catalogos")}
                    className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                      location.pathname === "/catalogos"
                        ? "font-semibold text-blue-600"
                        : ""
                    }`}
                  >
                    <i className="bx bx-collection text-xl text-gray-600 group-hover:text-blue-600"></i>
                    <span>Catálogos</span>
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

        {/* Sección principal — min-w-0: con el menú abierto el contenido
            se encoge para caber, en vez de desbordar hacia la derecha */}
        <div
          className={`flex-1 min-w-0 min-h-screen transition-[margin] duration-300 pt-16 ${
            sliderOpen ? "ml-64" : "ml-0"
          }`}
        >
          <div className="p-2 bg-gray-100 min-h-[calc(100vh-4rem)] overflow-x-hidden overflow-y-auto">
            {children}
          </div>
        </div>
      </div>

      {/* <FloatingSupportChat /> */}
      {/* <Footer /> */}
    </div>
  );
}

export default MainLayout;
