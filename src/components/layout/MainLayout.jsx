import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../shared/Header";
import { Footer } from "../shared/Footer";
import chatApi from "../../api/chatcenter";
import { jwtDecode } from "jwt-decode";
import io from "socket.io-client";
import Swal from "sweetalert2";
const PLANES_CALENDARIO = [1, 3, 4];

function MainLayout({ children }) {
  const [sliderOpen, setSliderOpen] = useState(false);
  const [openProductos, setOpenProductos] = useState(false);

  const [openContacto, setOpenContacto] = useState(false);

  const [openTools, setOpenTools] = useState(false);

  const [openMenu, setOpenMenu] = useState(null);

  const toggleMenu = (key) => {
    setOpenMenu((prev) => (prev === key ? null : key));
  };

  const sliderRef = useRef(null);
  const menuButtonRef = useRef(null); // Para el botón "hamburger"

  const tipo_configuracion = localStorage.getItem("tipo_configuracion");

  //Aqui guardaremos las configuraciones automatizadas que vienen de tu API
  const [userData, setUserData] = useState(null);
  const [configuraciones, setConfiguraciones] = useState([]);
  const [estadoNumero, setEstadoNumero] = useState([]);
  const [id_configuracion, setId_configuracion] = useState(null);
  const [id_plataforma_conf, setId_plataforma_conf] = useState(null);

  const [canAccessCalendar, setCanAccessCalendar] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => setId_plataforma_conf(e.detail.id ?? null);
    window.addEventListener("imporsuit:linked", handler);
    return () => window.removeEventListener("imporsuit:linked", handler);
  }, []);

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

      const validar_conexion_usuario = async (id_usuario, id_configuracion) => {
        try {
          const res = await chatApi.post(
            "configuraciones/validar_conexion_usuario",
            {
              id_usuario,
              id_configuracion,
            },
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

    if (idc) setId_configuracion(parseInt(idc));

    // Validación para el valor 'null' en id_plataforma_conf
    if (idp === "null") {
      setId_plataforma_conf(null);
    } else {
      setId_plataforma_conf(idp ? parseInt(idp) : null);
    }
  }, []);

  useEffect(() => {
    //Verificamos si hay token en localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      //Si no hay token => ir alogin
      window.location.href = "/login";
      return;
    }

    //Decodificamos el token
    const decoded = jwtDecode(token);

    //Verificamos si aun no expira
    if (decoded.exp < Date.now() / 1000) {
      //Expirado =?logout
      localStorage.clear(); // elimina todo
      window.location.href = "/login";
      return;
    }

    //Guardamos userData
    setUserData(decoded);
  }, []);

  // Cada vez que tengamos userData, cargamos las configuraciones
  useEffect(() => {
    if (userData) {
      fetchConfiguracionAutomatizada();
    }
  }, [userData]);

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

  // -------------------------------------------------------
  //  FUNC: Obtener configuraciones del endpoint
  // -------------------------------------------------------
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

  // -------------------------------------------------------
  // FUNC: Redirigir a la tabla de automatizadores
  // -------------------------------------------------------

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
      if (event.key === "Escape") {
        setSliderOpen(false);
      }
    }

    // En lugar de 'mousedown', usar 'click' (o 'touchstart')
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [sliderOpen]);

  const toggleSlider = () => {
    setSliderOpen(!sliderOpen);
  };

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
  }, [userData, canAccessCalendar, location.pathname]);

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
      setOpenMenu("contactos");
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
        if (r.isConfirmed) navigate("/Miplan");
      });
    }
  };

  // Funciones de navegación
  const handleReturnToImporsuit = () => {
    const token = localStorage.getItem("token");
    window.location.href =
      "https://new.imporsuitpro.com/acceso/jwt_home/" + token;
  };

  const handleLogout = () => {
    localStorage.clear(); // elimina todo
    window.location.href = "/login";
  };

  const irAChatCenter = () => {
    navigate("/chat");
  };

  const irAPlantillas = () => {
    navigate("/administrador-whatsapp");
  };

  const isCalendarBlocked = userData && canAccessCalendar === false;

  return (
    <div className="flex flex-col min-h-screen">
      {/* 
        HEADER 
        -> Le pasamos la referencia del botón y la función
           para que el Header dispare toggleSlider 
      */}
      <Header menuButtonRef={menuButtonRef} onToggleSlider={toggleSlider} />

      {/* CONTENIDO PRINCIPAL: Menú lateral + Sección principal */}
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
          {/* Encabezado del slider */}
          {/* <div className="h-[80px] px-5 flex items-center justify-between bg-[#171931] text-white">
            <h2 className="font-bold text-lg">Menú</h2>
            <button onClick={() => setSliderOpen(false)}>
              <i className="bx bx-x text-2xl"></i>
            </button>
          </div> */}

          {/* Opciones del slider */}
          <div className="mt-6">
            {/* Volver a Imporsuit */}
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

                localStorage.setItem("id_configuracion", id_configuracion);
                localStorage.setItem("id_plataforma_conf", id_plataforma_conf);

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
              </span> */}
            {/* </a> */}

            {/* Clientes contactos */}
            {/* Botón principal */}
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
                Contactos y Conexiones
              </span>

              <i
                className={`bx ml-auto transition-transform duration-300 ${
                  openContacto ? "bx-chevron-up" : "bx-chevron-down"
                }`}
              />
            </button>

            {/* Submenú animado */}
            <div
              className="overflow-hidden transition-all duration-[600ms] ease-out"
              style={{ maxHeight: openMenu === "contacto" ? "260px" : "0px" }}
            >
              <div className="ml-10 flex flex-col py-2">
                <button
                  className="group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600"
                  onClick={(e) => {
                    e.preventDefault();
                    localStorage.setItem("id_configuracion", id_configuracion);
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

                <button
                  className="group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600"
                  onClick={(e) => {
                    e.preventDefault();
                    localStorage.setItem("id_configuracion", id_configuracion);
                    localStorage.setItem(
                      "id_plataforma_conf",
                      id_plataforma_conf,
                    );
                    navigate("/contactos");
                  }}
                >
                  <i className="bx bx-book-content text-xl text-gray-600 group-hover:text-blue-600"></i>
                  <span>Lista de contactos</span>
                </button>

                <button
                  className="group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600"
                  onClick={(e) => {
                    e.preventDefault();
                    localStorage.setItem("id_configuracion", id_configuracion);
                    localStorage.setItem(
                      "id_plataforma_conf",
                      id_plataforma_conf,
                    );

                    if (tipo_configuracion === "ventas") {
                      navigate("/estados_contactos_ventas");
                    } else {
                      navigate("/estados_contactos");
                    }
                  }}
                >
                  <i className="bx bx-check-shield text-xl text-gray-600 group-hover:text-blue-600"></i>
                  <span>Estados de contactos</span>
                </button>
              </div>
            </div>

            {/* ====== Acordeón: Herramientas / Productividad ====== */}
            <div>
              {/* Header del acordeón */}
              <button
                type="button"
                onClick={() => toggleMenu("herramientas")}
                className={`group flex items-center justify-between w-full px-5 py-4 text-left hover:bg-gray-100 ${
                  // opcional: marcar activo si estás en alguna ruta de este grupo
                  ["/integraciones", "/calendario", "/asistentes"].includes(
                    location.pathname,
                  )
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
                    openTools ? "rotate-180" : ""
                  }`}
                ></i>
              </button>

              {/* Contenido del acordeón */}
              <div
                className="overflow-hidden transition-all duration-[600ms] ease-out"
                style={{
                  maxHeight: openMenu === "herramientas" ? "360px" : "0px",
                }}
              >
                <div className="ml-10 flex flex-col py-2">
                  {/* Integraciones */}
                  <button
                    className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                      location.pathname === "/integraciones"
                        ? "font-semibold"
                        : ""
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      goTo("/integraciones");
                    }}
                  >
                    <i className="bx bx-plug text-xl text-gray-600 group-hover:text-blue-600"></i>
                    <span>Integraciones</span>
                  </button>

                  {/* Automatizador (externo) */}
                  <a
                    className="group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600"
                    href={`https://automatizador.imporsuitpro.com/tabla_automatizadores.php?id_configuracion=${
                      id_configuracion ?? ""
                    }&id_plataforma_conf=${id_plataforma_conf ?? ""}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      localStorage.setItem(
                        "id_configuracion",
                        id_configuracion,
                      );
                      localStorage.setItem(
                        "id_plataforma_conf",
                        id_plataforma_conf,
                      );
                    }}
                  >
                    <i className="bx bxs-bot text-xl text-gray-600 group-hover:text-blue-600"></i>
                    <span>Automatizador</span>
                  </a>

                  {/* Calendario (manteniendo tu lógica) */}
                  <button
                    className={`group flex items-center gap-3 text-left px-4 py-2 ${
                      location.pathname === "/calendario" ? "font-semibold" : ""
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

                  {/* Asistentes */}
                  <button
                    className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${
                      location.pathname === "/asistentes" ? "font-semibold" : ""
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

            {/* Productos y categorias */}
            {/* Grupo de Productos */}
            {/* Grupo de Productos sin flecha y con animación */}
            <div>
              {/* Header del acordeón */}
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
                    Mis Productos
                  </span>
                </span>

                <i
                  className={`bx bx-chevron-down text-2xl text-gray-500 transition-transform duration-300 ${
                    openProductos ? "rotate-180" : ""
                  }`}
                ></i>
              </button>

              {/* Submenú */}
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

        {/* Sección principal a la derecha */}
        <div
          className={`flex-1 min-h-screen transition-[margin] duration-300
                      pt-16 ${sliderOpen ? "ml-64" : "ml-0"}`}
        >
          <div className="p-2 bg-gray-100 min-h-[calc(100vh-4rem)] overflow-auto">
            {children}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      {/* <Footer /> */}
    </div>
  );
}

export default MainLayout;
