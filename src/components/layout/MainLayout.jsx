import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../shared/Header";
import { Footer } from "../shared/Footer";
import chatApi from "../../api/chatcenter";
import { jwtDecode } from "jwt-decode";
import io from "socket.io-client";

import Swal from "sweetalert2";
import { useDropi } from "../../context/DropiContext";
import usePresenceRegister from "../../hooks/usePresenceRegister";
import { usePresence } from "../../context/PresenceProvider";

const PLANES_CALENDARIO = [1, 3, 4];

function MainLayout({ children }) {
  usePresenceRegister();

  const { getPresence } = usePresence();

  const token = localStorage.getItem("token");
  const decoded = token ? jwtDecode(token) : null;
  const id_sub_usuario = decoded?.id_sub_usuario;

  const p = getPresence(id_sub_usuario);

  console.log("[MAINLAYOUT] id_sub_usuario:", id_sub_usuario);
  console.log("[MAINLAYOUT] presence:", p);

  const [sliderOpen, setSliderOpen] = useState(false);
  const [openProductos, setOpenProductos] = useState(false);
  const [openContacto, setOpenContacto] = useState(false);
  const [openTools, setOpenTools] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [openSubMenu, setOpenSubMenu] = useState(null);

  const toggleSubMenu = (key) => {
    setOpenSubMenu((prev) => (prev === key ? null : key));
  };

  const toggleMenu = (key) => {
    setOpenMenu((prev) => {
      const next = prev === key ? null : key;
      // si sale de integraciones, cierre submenú
      if (next !== "integraciones") setOpenSubMenu(null);
      return next;
    });
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
          navigate("/planes_view");
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
        if (r.isConfirmed) navigate("/Miplan");
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
    } else if (["/calendario", "/asistentes"].includes(location.pathname)) {
      setOpenMenu("herramientas");
    } else if (["/canal-conexiones", "/dropi"].includes(location.pathname)) {
      setOpenMenu("integraciones");
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

  // =========================================================
  // Navegación helper
  // =========================================================
  const goTo = (path) => {
    localStorage.setItem("id_configuracion", id_configuracion);
    localStorage.setItem("id_plataforma_conf", id_plataforma_conf);
    navigate(path);
  };

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
        if (r.isConfirmed) navigate("/Miplan");
      });
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const isCalendarBlocked = userData && canAccessCalendar === false;
  
  const { isDropiLinked, loadingDropiLinked } = useDropi();

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
            {/* Conexiones */}
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

            {/* Chat Center */}
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
                <button
                  className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                    location.pathname === "/contactos"
                      ? "font-semibold text-blue-600"
                      : ""
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    goTo("/contactos");
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
                      localStorage.setItem(
                        "id_configuracion",
                        id_configuracion,
                      );
                      localStorage.setItem(
                        "id_plataforma_conf",
                        id_plataforma_conf,
                      );
                      navigate("/canal-conexiones");
                    }}
                  >
                    <i className="bx bx-network-chart text-xl text-gray-600 group-hover:text-blue-600"></i>
                    <span>Canal de Conexiones</span>
                  </button>

                  {/* ===== Dropi (submenu) ===== */}
                  <div className="mt-1">
                    {/* Padre Dropi */}
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

                    {/* Submenú Dropi */}
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
                    onClick={handleCalendarioClick}
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
                style={{
                  maxHeight: openMenu === "productos" ? "220px" : "0px",
                }}
              >
                <div className="ml-10 flex flex-col py-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/productos");
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
                      navigate("/categorias");
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

        {/* Sección principal */}
        <div
          className={`flex-1 min-h-screen transition-[margin] duration-300 pt-16 ${
            sliderOpen ? "ml-64" : "ml-0"
          }`}
        >
          <div className="p-2 bg-gray-100 min-h-[calc(100vh-4rem)] overflow-auto">
            {children}
          </div>
        </div>
      </div>

      {/* <Footer /> */}
    </div>
  );
}

export default MainLayout;
