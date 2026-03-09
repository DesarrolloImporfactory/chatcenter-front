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
  const menuButtonRef = useRef(null);

  const [userData, setUserData] = useState(null);
  const [configuraciones, setConfiguraciones] = useState([]);
  const [estadoNumero, setEstadoNumero] = useState([]);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const decoded = jwtDecode(token);
    if (decoded.exp < Date.now() / 1000) {
      localStorage.clear();
      window.location.href = "/login";
      return;
    }

    setUserData({
      ...decoded,
      role: decoded.rol || localStorage.getItem("user_role"),
    });
  }, []);

  useEffect(() => {
    if (userData) fetchConfiguracionAutomatizada();
  }, [userData]);

  useEffect(() => {
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
      }).then(() => handleLogout());
    }
  }, [estadoNumero]);

  const fetchConfiguracionAutomatizada = async () => {
    if (!userData) return;
    try {
      const isSuperAdmin =
        userData.role === "super_administrador" ||
        localStorage.getItem("user_role") === "super_administrador";

      const endpoint = isSuperAdmin
        ? "configuraciones/listar_admin_conexiones"
        : "configuraciones/listar_conexiones_sub_user";

      const body = isSuperAdmin
        ? {}
        : {
            id_usuario: userData.id_usuario,
            id_sub_usuario: userData.id_sub_usuario,
          };

      const response = await chatApi.post(endpoint, body);
      setConfiguraciones(response.data || []);
    } catch (error) {
      if (error.response?.status === 403) {
        Swal.fire({
          icon: "error",
          title: error.response?.data?.message,
          allowOutsideClick: false,
          confirmButtonText: "OK",
        }).then(() => navigate("/planes"));
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
        window.dispatchEvent(new Event("layout:changed"));
        setTimeout(
          () => window.dispatchEvent(new Event("layout:changed")),
          320,
        );
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape" && sliderOpen) {
        setSliderOpen(false);
        window.dispatchEvent(new Event("layout:changed"));
        setTimeout(
          () => window.dispatchEvent(new Event("layout:changed")),
          320,
        );
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
    setSliderOpen((prev) => {
      window.dispatchEvent(new Event("layout:changed"));
      setTimeout(() => window.dispatchEvent(new Event("layout:changed")), 320);
      return !prev;
    });
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  /* ── Role helpers ── */
  const role = userData?.role || localStorage.getItem("user_role");
  const isSuperAdmin = role === "super_administrador";
  const isAdmin = role === "administrador" || role === "super_administrador";

  /* ── Nav item config ── */
  const conexionPath = isSuperAdmin
    ? "/administrador-conexiones"
    : "/conexiones";
  const instaLandingPath = isSuperAdmin
    ? "/insta_landing_admin"
    : "/insta_landing";
  const instaLandingLabel = isSuperAdmin
    ? "Insta Landing Admin"
    : "Insta Landing";

  /* ── Active check helper ── */
  const isActive = (path) => location.pathname === path;

  /* ── Reusable nav button ── */
  const NavBtn = ({ path, icon, label, onClick }) => {
    const active = isActive(path);
    return (
      <button
        onClick={onClick ?? (() => navigate(path))}
        className={`group flex items-center w-full px-5 py-4 text-left transition-colors rounded ${
          active
            ? "bg-gray-100 font-semibold"
            : "hover:bg-gray-100 text-gray-700"
        }`}
      >
        <i
          className={`bx ${icon} text-2xl mr-3 transition-colors ${
            active ? "text-blue-600" : "text-gray-600 group-hover:text-blue-600"
          }`}
        />
        <span
          className={`text-lg transition-colors group-hover:text-blue-600 ${active ? "text-blue-600" : ""}`}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header menuButtonRef={menuButtonRef} onToggleSlider={toggleSlider} />

      <div className="flex flex-1">
        {/* Menú lateral */}
        <div
          ref={sliderRef}
          className={`bg-white shadow-md fixed top-16 left-0 z-40 h-[calc(100vh-4rem)]
            transition-[width] duration-300
            ${sliderOpen ? "w-64 overflow-y-auto" : "w-0 overflow-hidden"}`}
          aria-hidden={!sliderOpen}
        >
          <div className="mt-6">
            {/* Conexiones */}
            <NavBtn
              path={conexionPath}
              icon="bx-network-chart"
              label={isSuperAdmin ? "Conexiones Admin" : "Conexiones"}
              onClick={() => {
                localStorage.removeItem("id_configuracion");
                localStorage.removeItem("tipo_configuracion");
                localStorage.removeItem("id_plataforma_conf");
                navigate(conexionPath);
              }}
            />

            {isAdmin && (
              <NavBtn
                path="/dashboard"
                icon="bx-bar-chart-alt-2"
                label="Dashboard"
              />
            )}

            {/* Insta Landing */}
            <NavBtn
              path={instaLandingPath}
              icon="bx-image-add"
              label={instaLandingLabel}
            />

            {/* Usuarios */}
            <NavBtn path="/usuarios" icon="bx-user" label="Usuarios" />

            {/* Departamentos */}
            <NavBtn
              path="/departamentos"
              icon="bx-buildings"
              label="Departamentos"
            />

            {/* Planes y Facturación — solo usuarios normales */}
            {!isSuperAdmin && (
              <NavBtn
                path="/plan"
                icon="bxs-credit-card"
                label="Planes y Facturación"
              />
            )}

            {/* Cerrar sesión */}
            <button
              onClick={handleLogout}
              className="group flex items-center w-full px-5 py-4 text-left transition-colors hover:bg-gray-100"
            >
              <i className="bx bx-door-open text-2xl mr-3 text-gray-600 group-hover:text-blue-600 transition-colors" />
              <span className="text-lg text-gray-700 group-hover:text-blue-600 transition-colors">
                Cerrar sesión
              </span>
            </button>
          </div>
        </div>

        {/* Contenido principal */}
        <div
          className={`flex-1 min-h-screen transition-[margin] duration-300 pt-16 ${sliderOpen ? "ml-64" : "ml-0"}`}
        >
          <div className="p-2 bg-gray-100 min-h-[calc(100vh-4rem)] overflow-auto">
            {children}
          </div>
        </div>
      </div>

      {/* <Footer /> */}
    </div>
  );
}

export default MainLayout;
