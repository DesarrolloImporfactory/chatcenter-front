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

  const sliderRef = useRef(null);
  const menuButtonRef = useRef(null); // Para el botón "hamburger"

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
            }
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
          localStorage.removeItem("id_plataforma_conf");
          navigate("/conexiones");
        }
      };

      validar_conexion_usuario(usuario, idc);
    } else {
      localStorage.removeItem("id_configuracion");
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
      const response = await chatApi.post("configuraciones/listar_conexiones", {
        id_usuario: userData.id_usuario,
      });

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
            bg-white mt-16 shadow-md transition-all duration-300
            overflow-y-auto
            absolute md:relative top-0 left-0 z-40
            h-full md:h-auto
            ${sliderOpen ? "w-64" : "w-0"}
          `}
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
            <a
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

            {/* Enlace Automatizador */}
            <a
              href={`https://automatizador.imporsuitpro.com/tabla_automatizadores.php?id_configuracion=${
                id_configuracion ??
                "" + "&id_plataforma_conf=" + id_plataforma_conf
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
                {isCalendarBlocked && (
                  <span className="ml-2 inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-gray-200">
                    Bloqueado
                  </span>
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

        {/* Sección principal a la derecha */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto bg-gray-100 p-2">{children}</div>
        </div>
      </div>

      {/* FOOTER */}
      {/* <Footer /> */}
    </div>
  );
}

export default MainLayout;
