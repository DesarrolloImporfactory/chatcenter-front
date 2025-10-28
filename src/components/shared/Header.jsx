import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";
import "./styles/header.css";

const Logo = "https://tiendas.imporsuitpro.com/imgs/LOGOS-IMPORSUIT.png";

const Header = ({ menuButtonRef, onToggleSlider }) => {
  const [showMenu, setShowMenu] = useState(false);
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
    <header className="w-full fixed top-0 left-0 z-50">
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
