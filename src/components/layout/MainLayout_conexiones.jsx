import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../shared/Header";
import { Footer } from "../shared/Footer";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import ModalPlanBlock from "./modales/ModalPlanBlock";
import FloatingSupportChat from "./FloatingSupportChat";

function MainLayout({ children }) {
  const [sliderOpen, setSliderOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const sliderRef = useRef(null);
  const menuButtonRef = useRef(null);
  const [userData, setUserData] = useState(null);

  // Plan block modal (global)
  const [planBlock, setPlanBlock] = useState({
    open: false,
    code: null,
    message: null,
    trialInfo: null,
    promoInfo: null,
  });

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

  // ═══ Listener global: plan:blocked (disparado por chatApi interceptor) ═══
  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail || {};
      setPlanBlock({
        open: true,
        code: detail.code || "PLAN_REQUIRED",
        message: detail.message || null,
        trialInfo: detail.trialInfo || null,
        promoInfo: detail.promoInfo || null,
      });
    };
    window.addEventListener("plan:blocked", handler);
    return () => window.removeEventListener("plan:blocked", handler);
  }, []);

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

  const role = userData?.role || localStorage.getItem("user_role");
  const isSuperAdmin = role === "super_administrador";
  const isAdmin = role === "administrador" || role === "super_administrador";
  const conexionPath = isSuperAdmin
    ? "/administrador-conexiones"
    : "/conexiones";
  const instaLandingPath = isSuperAdmin
    ? "/insta_landing_admin"
    : "/insta_landing";
  const instaLandingLabel = isSuperAdmin
    ? "Insta Landing Admin"
    : "Insta Landing";
  const isActive = (path) => location.pathname === path;
  const toggleMenu = (key) => {
    setOpenMenu((prev) => (prev === key ? null : key));
  };

  useEffect(() => {
    if (location.pathname.startsWith("/insta_landing"))
      setOpenMenu("instaLanding");
  }, [location.pathname]);

  const NavBtn = ({ path, icon, label, onClick }) => {
    const active = isActive(path);
    return (
      <button
        onClick={onClick ?? (() => navigate(path))}
        className={`group flex items-center w-full px-5 py-4 text-left transition-colors rounded ${active ? "bg-gray-100 font-semibold" : "hover:bg-gray-100 text-gray-700"}`}
      >
        <i
          className={`bx ${icon} text-2xl mr-3 transition-colors ${active ? "text-blue-600" : "text-gray-600 group-hover:text-blue-600"}`}
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
        <div
          ref={sliderRef}
          className={`bg-white shadow-md fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] transition-[width] duration-300 ${sliderOpen ? "w-64 overflow-y-auto" : "w-0 overflow-hidden"}`}
          aria-hidden={!sliderOpen}
        >
          <div className="mt-6">
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

            <NavBtn
              path="/chatboard"
              icon="bx-message-rounded-dots"
              label="Chatboard"
            />

            {/* <NavBtn
              path="/adsboard"
              icon="bxs-bar-chart-alt-2"
              label="Adsboard"
            /> */}

            <NavBtn
              path="/dropiboard"
              icon="bx-store -chart-alt-2"
              label="Dropiboard"
            />

            <div>
              <button
                type="button"
                onClick={() => toggleMenu("instaLanding")}
                className={`group flex items-center justify-between w-full px-5 py-4 text-left hover:bg-gray-100 ${location.pathname.startsWith("/insta_landing") ? "bg-gray-200 font-semibold" : ""}`}
              >
                <span className="flex items-center">
                  <i
                    className={`bx bx-image-add text-2xl mr-3 transition-colors ${location.pathname.startsWith("/insta_landing") ? "text-blue-600" : "text-gray-600 group-hover:text-blue-600"}`}
                  />
                  <span
                    className={`text-lg transition-colors group-hover:text-blue-600 ${location.pathname.startsWith("/insta_landing") ? "text-blue-600" : "text-gray-700"}`}
                  >
                    {instaLandingLabel}
                  </span>
                </span>
                <i
                  className={`bx bx-chevron-down text-2xl text-gray-500 transition-transform duration-300 ${openMenu === "instaLanding" ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className="overflow-hidden transition-all duration-[600ms] ease-out"
                style={{
                  maxHeight: openMenu === "instaLanding" ? "220px" : "0px",
                }}
              >
                <div className="ml-10 flex flex-col py-2">
                  <button
                    className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${isActive(instaLandingPath) ? "font-semibold text-blue-600" : ""}`}
                    onClick={() => navigate(instaLandingPath)}
                  >
                    <i className="bx bx-palette text-xl text-gray-600 group-hover:text-blue-600" />
                    <span>Generador</span>
                  </button>
                  <button
                    className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${isActive("/insta_landing_historial") ? "font-semibold text-blue-600" : ""}`}
                    onClick={() => navigate("/insta_landing_historial")}
                  >
                    <i className="bx bx-history text-xl text-gray-600 group-hover:text-blue-600" />
                    <span>Historial</span>
                  </button>
                  <button
                    className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${isActive("/insta_landing_productos") ? "font-semibold text-blue-600" : ""}`}
                    onClick={() => navigate("/insta_landing_productos")}
                  >
                    <i className="bx bx-package text-xl text-gray-600 group-hover:text-blue-600" />
                    <span>Productos</span>
                  </button>

                  {isSuperAdmin && (
                    <>
                      <div className="h-px bg-slate-200 my-1.5 mx-2" />
                      <button
                        className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${isActive("/codigos_promocionales") ? "font-semibold text-blue-600" : ""}`}
                        onClick={() => navigate("/codigos_promocionales_admin")}
                      >
                        <i className="bx bx-purchase-tag text-xl text-gray-600 group-hover:text-blue-600" />
                        <span>Códigos Promo</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <NavBtn
              path={isSuperAdmin ? "/usuarios_admin" : "/usuarios"}
              icon={isSuperAdmin ? "bxs-shield-alt-2" : "bx-user"}
              label={isSuperAdmin ? "Panel de Usuarios" : "Usuarios"}
            />
            <NavBtn
              path="/departamentos"
              icon="bx-buildings"
              label="Departamentos"
            />
            {!isSuperAdmin && (
              <NavBtn
                path="/plan"
                icon="bxs-credit-card"
                label="Planes y Facturación"
              />
            )}
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

        <div
          className={`flex-1 min-h-screen transition-[margin] duration-300 pt-16 ${sliderOpen ? "ml-64" : "ml-0"}`}
        >
          <div className="p-2 bg-gray-100 min-h-[calc(100vh-4rem)] overflow-auto">
            {children}
          </div>
        </div>
      </div>

      {/* ═══ Modal global: Plan Block ═══ */}
      <ModalPlanBlock
        open={planBlock.open}
        blockCode={planBlock.code}
        blockMessage={planBlock.message}
        trialInfo={planBlock.trialInfo}
        promoInfo={planBlock.promoInfo}
        onClose={() =>
          setPlanBlock({
            open: false,
            code: null,
            message: null,
            trialInfo: null,
            promoInfo: null,
          })
        }
        onAction={(customRedirect) => {
          setPlanBlock({
            open: false,
            code: null,
            message: null,
            trialInfo: null,
            promoInfo: null,
          });
          navigate(customRedirect || "/planes");
        }}
      />

      <FloatingSupportChat />
    </div>
  );
}

export default MainLayout;
