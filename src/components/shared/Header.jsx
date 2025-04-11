import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useState, useRef } from "react";
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

  return (
    <header className="w-full">
      <nav className="relative flex items-center h-16 px-5 bg-[#171931] text-white">
        {/* Botón “hamburger” */}
        <button
          ref={menuButtonRef}
          onClick={onToggleSlider}
          className="text-2xl mr-2 hover:scale-110 transition-transform"
        >
          <i className="bx bx-menu"></i>
        </button>

        {/* Logo centrado */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <img
            src={Logo}
            alt="Logo de Imporsuit"
            className="h-8"
          />
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
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-50">
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
            <a
              href="https://new.imporsuitpro.com/registro"
              className="text-white hover:underline"
            >
              Registrarse
            </a>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
