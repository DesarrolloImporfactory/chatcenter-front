import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../shared/Header";
import { Footer } from "../shared/Footer";
import chatApi from "../../api/chatcenter";
import { jwtDecode } from "jwt-decode";
import io from "socket.io-client";
import Swal from "sweetalert2";

function MainLayout({ children }) {
  const [sliderOpen, setSliderOpen] = useState(false);

  const sliderRef = useRef(null);
  const menuButtonRef = useRef(null); // Para el botón "hamburger"

  //Aqui guardaremos las configuraciones automatizadas que vienen de tu API
  const [userData, setUserData] = useState(null);
  const [configuraciones, setConfiguraciones] = useState([]);
  const [estadoNumero, setEstadoNumero] = useState([]);

  const location = useLocation();
  const navigate = useNavigate();

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

  const handleLogout = () => {
    localStorage.clear(); // elimina todo
    window.location.href = "/login";
  };

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

          {/* Opciones del slider */}
          <div className="mt-6">
            {/* volver a conexiones */}
            {location.pathname !== "/conexiones" && (
              <a
                onClick={(e) => {
                  e.preventDefault();
                  localStorage.removeItem("id_configuracion");
                  localStorage.removeItem("id_plataforma_conf");
                  navigate("/conexiones");
                }}
                className="group flex items-center w-full px-5 py-4 text-left hover:bg-gray-100"
              >
                <i className="bx bx-log-in text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
                <span className="text-lg text-gray-700 group-hover:text-blue-600">
                  Volver a Conexiones
                </span>
              </a>
            )}


            {/* Usuarios */}
            <button
              onClick={() => navigate("/usuarios")}
              className={`group flex items-center w-full px-5 py-4 text-left transition-colors rounded ${
                location.pathname === "/usuarios"
                  ? "bg-gray-100 font-semibold"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <i
                className={`bx bx-user text-2xl mr-3 transition-colors ${
                  location.pathname === "/usuarios"
                    ? ""
                    : "text-gray-600 group-hover:text-blue-600"
                }`}
              ></i>
              <span className="text-lg group-hover:text-blue-600">
                Usuarios
              </span>
            </button>


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
