import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useState, useRef } from "react";
import "./styles/header.css";

const Logo = "https://tiendas.imporsuitpro.com/imgs/LOGOS-IMPORSUIT.png";

const Header = () => {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const { user } = useSelector((state) => state);

  const handleImageClick = () => setShowMenu((prev) => !prev);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Cerrar el menú al hacer clic fuera de él
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
      <nav className="flex justify-between items-center px-5 bg-[#171931] text-white py-3">
        <div className="w-16">
          <Link to="/">
            <img src={Logo} alt="Logo de Imporsuit" className="header__logo" />
          </Link>
        </div>

        <ul className="flex gap-5 items-center">
          {user?.id ? (
            <li className="relative" ref={menuRef}>
              <img
                src="https://new.imporsuitpro.com/public/img/img.png"
                className="rounded-full w-10 h-10 cursor-pointer"
                alt="Perfil de usuario"
                onClick={handleImageClick}
              />
              {showMenu && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-50">
                  <button
                    className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                    onClick={handleLogout}
                  >
                    Salir
                  </button>
                </div>
              )}
            </li>
          ) : (
            <li>
              <a
                href="https://new.imporsuitpro.com/registro"
                className="text-white hover:underline"
              >
                Registrarse
              </a>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;
