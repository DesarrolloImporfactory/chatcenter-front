import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Header from "../shared/Header";
import Swal from "sweetalert2";

function MainLayoutPlanes({ children }) {
  const [sliderOpen, setSliderOpen] = useState(false);
  const sliderRef = useRef(null);
  const menuButtonRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const decoded = jwtDecode(token);
    if (decoded.exp < Date.now() / 1000) {
      localStorage.clear();
      navigate("/login");
      return;
    }
  }, [navigate]);

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
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header menuButtonRef={menuButtonRef} onToggleSlider={toggleSlider} />

      <div className="flex flex-1">
        {/* Menú lateral */}
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
          <div className="mt-6">
            

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

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto bg-gray-100 p-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default MainLayoutPlanes;
