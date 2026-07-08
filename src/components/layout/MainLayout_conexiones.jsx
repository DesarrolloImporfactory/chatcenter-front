import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../shared/Header";
import { Footer } from "../shared/Footer";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import ModalPlanBlock from "./modales/ModalPlanBlock";
import FloatingSupportChat from "./FloatingSupportChat";
import { globalLogout } from "../../utils/globalLogout";

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
  const handleLogout = () => globalLogout();

  const role = userData?.role || localStorage.getItem("user_role");
  const isSuperAdmin = role === "super_administrador";
  const isGestorClientes = role === "gestor_clientes";
  const puedePanelUsuarios = isSuperAdmin || isGestorClientes;

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

  // ─────────────────────────────────────────────────────────────
  const handleNavLink = (e, path) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) {
      return;
    }
    e.preventDefault();
    navigate(path);
  };

  // NavBtn ahora es un <a href> real => habilita click derecho "abrir en
  // pestaña nueva".
  // - newTab=true (default): renderiza href={path} y respeta los modificadores.
  // - newTab=false: sin href (ej. Conexiones, que limpia el localStorage y
  //   NO debe abrirse en otra pestaña). Solo corre su onClick en click normal.
  const NavBtn = ({ path, icon, label, onClick, newTab = true }) => {
    const active = isActive(path);

    const handleClick = (e) => {
      if (
        newTab &&
        (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1)
      ) {
        return; // el href abre la nueva pestaña
      }
      e.preventDefault();
      if (onClick) onClick();
      else navigate(path);
    };

    return (
      <a
        href={newTab ? path : undefined}
        onClick={handleClick}
        className={`group flex items-center w-full px-5 py-4 text-left transition-colors rounded cursor-pointer ${active ? "bg-gray-100 font-semibold" : "hover:bg-gray-100 text-gray-700"}`}
      >
        <i
          className={`bx ${icon} text-2xl mr-3 transition-colors ${active ? "text-blue-600" : "text-gray-600 group-hover:text-blue-600"}`}
        />
        <span
          className={`text-lg transition-colors group-hover:text-blue-600 ${active ? "text-blue-600" : ""}`}
        >
          {label}
        </span>
      </a>
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
            {/* Dashboard — primer item. Fuera de una conexión abre el
                centro de control general (/dashboard): permite elegir
                cualquier conexión registrada. */}
            {isSuperAdmin ? (
              <NavBtn
                path="/dashboard_admin"
                icon="bxs-bar-chart-alt-2"
                label="Dashboard Admin"
              />
            ) : !isGestorClientes ? (
              <NavBtn
                path="/dashboard"
                icon="bxs-bar-chart-alt-2"
                label="Dashboard"
              />
            ) : null}

            {/* Conexiones — newTab=false: limpia el localStorage, NO debe
                abrirse en pestaña nueva */}
            {!isGestorClientes && (
              <NavBtn
                path={conexionPath}
                icon="bx-network-chart"
                label={isSuperAdmin ? "Conexiones Admin" : "Conexiones"}
                newTab={false}
                onClick={() => {
                  localStorage.removeItem("id_configuracion");
                  localStorage.removeItem("tipo_configuracion");
                  localStorage.removeItem("id_plataforma_conf");
                  navigate(conexionPath);
                }}
              />
            )}

            {/* InstaLanding */}
            {!isGestorClientes && (
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
                    <a
                      href={instaLandingPath}
                      onClick={(e) => handleNavLink(e, instaLandingPath)}
                      className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${isActive(instaLandingPath) ? "font-semibold text-blue-600" : ""}`}
                    >
                      <i className="bx bx-palette text-xl text-gray-600 group-hover:text-blue-600" />
                      <span>Generador</span>
                    </a>
                    <a
                      href="/insta_landing_historial"
                      onClick={(e) =>
                        handleNavLink(e, "/insta_landing_historial")
                      }
                      className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${isActive("/insta_landing_historial") ? "font-semibold text-blue-600" : ""}`}
                    >
                      <i className="bx bx-history text-xl text-gray-600 group-hover:text-blue-600" />
                      <span>Historial</span>
                    </a>
                    <a
                      href="/insta_landing_productos"
                      onClick={(e) =>
                        handleNavLink(e, "/insta_landing_productos")
                      }
                      className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${isActive("/insta_landing_productos") ? "font-semibold text-blue-600" : ""}`}
                    >
                      <i className="bx bx-package text-xl text-gray-600 group-hover:text-blue-600" />
                      <span>Productos</span>
                    </a>
                    {isSuperAdmin && (
                      <>
                        <div className="h-px bg-slate-200 my-1.5 mx-2" />
                        <a
                          href="/codigos_promocionales_admin"
                          onClick={(e) =>
                            handleNavLink(e, "/codigos_promocionales_admin")
                          }
                          className={`group flex items-center gap-3 text-left px-4 py-2 hover:text-blue-600 ${isActive("/codigos_promocionales") ? "font-semibold text-blue-600" : ""}`}
                        >
                          <i className="bx bx-purchase-tag text-xl text-gray-600 group-hover:text-blue-600" />
                          <span>Códigos Promo</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tutoriales: visible para todos los usuarios */}
            <NavBtn
              path="/tutoriales"
              icon="bx-play-circle"
              label="Tutoriales"
            />

            {/* Panel de Usuarios: super_administrador + gestor_clientes */}
            {puedePanelUsuarios && (
              <NavBtn
                path="/usuarios_admin"
                icon="bxs-shield-alt-2"
                label={
                  isGestorClientes ? "Panel de Clientes" : "Panel de Usuarios"
                }
              />
            )}

            {/* Auditoría de Cartera: solo super_administrador */}
            {isSuperAdmin && (
              <NavBtn
                path="/auditoria-cartera"
                icon="bx-receipt"
                label="Auditoría de Cartera"
              />
            )}

            {/* Mis Subusuarios: solo super_administrador */}
            {isSuperAdmin && (
              <NavBtn
                path="/usuarios"
                icon="bx-user-plus"
                label="Mis Subusuarios"
              />
            )}

            {/* Usuarios*/}
            {!isSuperAdmin && !isGestorClientes && (
              <NavBtn path="/usuarios" icon="bx-user" label="Usuarios" />
            )}

            {/* Plantillas Kanban Globales: solo super_administrador */}
            {isSuperAdmin && (
              <NavBtn
                path="/plantillas_globales_admin"
                icon="bxs-grid-alt"
                label="Plantillas Kanban Globales"
              />
            )}

            {/* Departamentos */}
            {!isSuperAdmin && !isGestorClientes && (
              <NavBtn
                path="/departamentos"
                icon="bx-buildings"
                label="Departamentos"
              />
            )}

            {/* Planes*/}
            {!isSuperAdmin && !isGestorClientes && (
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

        {/* min-w-0: con el menú abierto el contenido se encoge para
            caber, en vez de desbordar hacia la derecha */}
        <div
          className={`flex-1 min-w-0 min-h-screen transition-[margin] duration-300 pt-16 ${sliderOpen ? "ml-64" : "ml-0"}`}
        >
          <div className="p-2 bg-gray-100 min-h-[calc(100vh-4rem)] overflow-x-hidden overflow-y-auto">
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

      {/* <FloatingSupportChat /> */}
    </div>
  );
}

export default MainLayout;
