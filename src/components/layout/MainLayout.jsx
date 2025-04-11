// MainLayout.jsx

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../shared/Header";
import { Footer } from "../shared/Footer";

function MainLayout({ children }) {
  const [sliderOpen, setSliderOpen] = useState(false);

  const sliderRef = useRef(null);
  const menuButtonRef = useRef(null); // Para el botón "hamburger"

  const location = useLocation();
  const navigate = useNavigate();

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

  // Funciones de navegación
  const handleReturnToImporsuit = () => {
    const token = localStorage.getItem("token");
    window.location.href =
      "https://new.imporsuitpro.com/acceso/jwt_home/" + token;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const irAChatCenter = () => {
    navigate("/chat");
  };

  const irAPlantillas = () => {
    navigate("/administrador-whatsapp");
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 
        HEADER 
        -> Le pasamos la referencia del botón y la función
           para que el Header dispare toggleSlider 
      */}
      <Header
        menuButtonRef={menuButtonRef}
        onToggleSlider={toggleSlider}
      />

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
              href={`https://new.imporsuitpro.com/acceso/jwt_home/${localStorage.getItem("token")}`}
              className="group flex items-center w-full px-5 py-4 text-left hover:bg-gray-100"
            >
              <i className="bx bx-log-in text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
              <span className="text-lg text-gray-700 group-hover:text-blue-600">
                Volver a Imporsuit
              </span>
            </a>

            {/* Chat Center */}
            <a
              href="/chat"
              className={`group flex items-center w-full px-5 py-4 text-left hover:bg-gray-100 ${
                location.pathname === "/chat" ? "bg-gray-200" : ""
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
            <a
              href="/administrador-whatsapp"
              className={`group flex items-center w-full px-5 py-4 text-left hover:bg-gray-100 ${
                location.pathname === "/administrador-whatsapp" ? "bg-gray-200" : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                navigate("/administrador-whatsapp");
              }}
            >
              <i className="bx bxl-whatsapp text-2xl mr-3 text-gray-600 group-hover:text-blue-600"></i>
              <span className="text-lg text-gray-700 group-hover:text-blue-600">
                WhatsApp
              </span>
            </a>

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
          <div className="flex-1 overflow-auto bg-gray-100 p-2">
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
