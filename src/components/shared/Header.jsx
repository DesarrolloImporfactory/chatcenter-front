import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useState, useRef } from "react";
import "./styles/header.css";

const Logo = "https://tiendas.imporsuitpro.com/imgs/LOGOS-IMPORSUIT.png";

const Header = ({ menuButtonRef, onToggleSlider }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const { user } = useSelector((state) => state);

  const handleImageClick = () => setShowMenu((prev) => !prev);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // UseEffect para ocultar el banner después de un tiempo
  useEffect(() => {
    // Verificamos si ya está en localStorage
    const alertaServi = localStorage.getItem("alerta_Servi");

    // Si el valor en localStorage es "true", ocultamos el banner
    if (alertaServi === "true") {
      setShowBanner(false);
    } else {
      setShowBanner(true);
    }

    // Configuramos el timer para 50 segundos
    const timer = setTimeout(() => {
      localStorage.setItem("alerta_Servi", "true"); // Establecemos el valor en true
      setShowBanner(false); // Ocultamos el banner
    }, 50000); // 50000ms = 50 segundos

    // Limpiar el timer si el componente se desmonta antes de que termine el timeout
    return () => clearTimeout(timer);
  }, []); // Solo se ejecuta una vez cuando el componente se monta

  return (
    <header className="w-full fixed top-0 left-0 z-50">
      {showBanner && (
        <div className="w-full bg-yellow-500 text-white py-1">
          <div className="flex items-center justify-center">
            <div className="animate-marquee whitespace-nowrap px-10 text-lg font-semibold">
              🚨 AVISO IMPORTANTE: El día 26 de OCTUBRE de 8:00 AM a 10:00 PM se
              deshabilitará temporalmente la generación de guías de SERVIENTREGA
              por mantenimiento del sistema 🚨
            </div>
          </div>
        </div>
      )}
      <nav className="relative flex items-center h-16 px-5 bg-[#171931] text-white">
        {/* Botón “hamburger” */}
        <button
          data-tour="hamburger"
          ref={(el) => {
            menuButtonRef.current = el; // tu ref existente
            menuRef.current = el; // ref de la visita guiada
          }}
          onClick={onToggleSlider}
          className="text-2xl mr-2 hover:scale-110 transition-transform"
        >
          <i className="bx bx-menu"></i>
        </button>

        {/* Logo centrado */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <img src={Logo} alt="Logo de Imporsuit" className="h-8" />
        </div>

        {/* Usuario y menú a la derecha */}
        <div className="ml-auto flex items-center gap-4" ref={menuRef}>
          {user?.id ? (
            <>
              {/* Nombre + Rol */}
              <div className="hidden sm:flex flex-col text-end">
                <span className="text-sm font-semibold">
                  {user.nombre ?? "Usuario"}
                </span>
                <span className="text-xs">
                  {user.cargo === 1 ? "Administrador" : "Vendedor"}
                </span>
              </div>

              {/* Imagen de perfil */}
              <img
                src="https://new.imporsuitpro.com/public/img/img.png"
                className="rounded-full w-10 h-10 cursor-pointer"
                alt="Perfil de usuario"
                onClick={handleImageClick}
              />

              {/* Menú desplegable */}
              {showMenu && (
                <div className="absolute right-0 mt-28 w-40 bg-white rounded-md shadow-lg z-50">
                  <button
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-red-600 px-4 py-2 w-full whitespace-nowrap"
                    onClick={handleLogout}
                  >
                    <i className="bx bx-log-out text-base"></i>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </>
          ) : (
            <a className="text-white hover:underline"></a>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
