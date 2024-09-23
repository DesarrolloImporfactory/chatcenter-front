import { Link } from "react-router-dom";
import "./styles/header.css";
import Logo from "./../../assets/logo.png";
import { useSelector } from "react-redux";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const { user } = useSelector((state) => state);

  function handleImageClick() {
    setShowMenu(!showMenu);
  }

  function handleLogout() {
    localStorage.clear();
    navigate("/");
    window.location.reload();
  }

  // Cerrar el menú al hacer clic fuera de él
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="w-full ">
      <nav className="flex justify-between items-center px-5">
        <div className="w-16">
          <img src={Logo} alt="" className="header__logo" />
        </div>

        <ul className="flex gap-5 items-center">
          {user?.id ? (
            <>
              <li className="">
                <div className="relative" ref={menuRef}>
                  <img
                    src="https://new.imporsuitpro.com/public/img/img.png"
                    className="rounded-full w-10 h-10 cursor-pointer"
                    alt="Profile"
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
                </div>
              </li>
            </>
          ) : (
            <>
              <li className="hover:bg-black/10 py-3 px-2">
                <Link to="/register">Register</Link>
              </li>
              <li className="hover:bg-black/10 py-3 px-2">
                <Link to="/login">Login</Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;
