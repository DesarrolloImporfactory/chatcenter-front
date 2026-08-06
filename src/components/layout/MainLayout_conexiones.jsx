import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../shared/Header";
import { Footer } from "../shared/Footer";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import ModalPlanBlock from "./modales/ModalPlanBlock";
import FloatingSupportChat from "./FloatingSupportChat";
import { globalLogout } from "../../utils/globalLogout";
import chatApi from "../../api/chatcenter";

// Rutas que siguen disponibles aunque el plan no esté activo: sin ellas el
// usuario quedaría encerrado, sin forma de pagar ni de pedir ayuda.
// `/referidos` entra aquí a propósito: ahí vive dinero que el usuario YA ganó.
// Bloquearle el acceso por tener el plan vencido sería quedarse con su saldo.
const RUTAS_SIN_PLAN = new Set([
  "/planes",
  "/plan",
  "/tutoriales",
  "/referidos",
]);

function MainLayout({ children }) {
  const [sliderOpen, setSliderOpen] = useState(false);
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

  // ═══ Estado del plan: apaga el menú cuando no hay nada activo ═══
  //
  // El backend ya bloquea esas rutas (checkPlanActivo → 402 → modal), pero
  // dejar los botones vivos hacía que el usuario cayera una y otra vez en el
  // mismo modal. Apagarlos vuelve obvio que primero hay que elegir plan.
  //
  // Arranca en `true`: mientras no se sepa, se deja pasar. Un fallo de red no
  // puede dejar el menú muerto, y el backend sigue siendo el que manda.
  const [planActivo, setPlanActivo] = useState(true);

  useEffect(() => {
    // Los roles administrativos no tienen plan propio; no se les gatea nada.
    if (!userData || isSuperAdmin || isGestorClientes) return;

    let cancelado = false;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const id_usuario = userData.id_usuario || userData.id_users;
        if (!id_usuario) return;

        const { data } = await chatApi.post(
          "stripe_plan/obtenerSuscripcionActiva",
          { id_usuario },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const plan = data?.plan || null;
        const estado = (plan?.estado || "").toLowerCase();
        // Mismo criterio que usa PlanesView para `hasActivePlan`.
        const activo =
          Boolean(plan?.id_plan) &&
          (estado.includes("activo") ||
            estado.includes("trial") ||
            estado === "promo_usage");

        if (!cancelado) setPlanActivo(activo);
      } catch (e) {
        // Se deja el menú abierto a propósito.
        console.warn("[layout] no se pudo leer el plan:", e?.message);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [userData, isSuperAdmin, isGestorClientes]);

  const conexionPath = isSuperAdmin
    ? "/administrador-conexiones"
    : "/conexiones";
  const isActive = (path) => location.pathname === path;

  // NavBtn ahora es un <a href> real => habilita click derecho "abrir en
  // pestaña nueva".
  // - newTab=true (default): renderiza href={path} y respeta los modificadores.
  // - newTab=false: sin href (ej. Conexiones, que limpia el localStorage y
  //   NO debe abrirse en otra pestaña). Solo corre su onClick en click normal.
  // `activeWhen` permite que un ítem se marque activo en varias rutas: Planes y
  // facturación es una sola entrada que cubre /planes y /plan.
  const NavBtn = ({
    path,
    icon,
    label,
    onClick,
    newTab = true,
    activeWhen,
  }) => {
    const rutas = activeWhen || [path];
    const active = rutas.some((r) => isActive(r));
    const bloqueado = !planActivo && !rutas.some((r) => RUTAS_SIN_PLAN.has(r));

    const handleClick = (e) => {
      if (bloqueado) {
        e.preventDefault();
        navigate("/planes");
        return;
      }
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

    if (bloqueado) {
      return (
        <button
          type="button"
          onClick={handleClick}
          title="Elige un plan para desbloquear esta sección"
          className="group flex items-center justify-between w-full px-5 py-4 text-left rounded cursor-not-allowed"
        >
          <span className="flex items-center min-w-0">
            <i className={`bx ${icon} text-2xl mr-3 text-gray-300`} />
            <span className="text-lg text-gray-300 truncate">{label}</span>
          </span>
          <i className="bx bx-lock-alt text-lg text-gray-300 shrink-0" />
        </button>
      );
    }

    return (
      <a
        href={newTab ? path : undefined}
        onClick={handleClick}
        data-tour={path === "/tutoriales" ? "tutoriales" : undefined}
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
          data-tour="sidebar"
          className={`bg-white shadow-md fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] transition-[width] duration-300 ${sliderOpen ? "w-64 overflow-y-auto" : "w-0 overflow-hidden"}`}
          aria-hidden={!sliderOpen}
        >
          <div className="mt-6">
            {/* Dashboard general (/dashboard) RETIRADO del menú: el dashboard
                por conexión ahora se abre desde la vista de Conexiones ("Ver
                dashboard completo"). Solo el super admin conserva su dashboard. */}
            {isSuperAdmin && (
              <NavBtn
                path="/dashboard_admin"
                icon="bxs-bar-chart-alt-2"
                label="Dashboard Admin"
              />
            )}

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

            {/* El submenú de Insta Landing se retiró: la herramienta ya no se
                ofrece. "Códigos Promo" colgaba de ahí y sí sigue en uso (es lo
                que desbloquea el Plan Comunidad), así que subió a primer nivel.
                Las rutas /insta_landing* también quedaron comentadas en
                App.jsx, así que ya no se llega ni por URL directa. */}
            {isSuperAdmin && (
              <NavBtn
                path="/codigos_promocionales_admin"
                icon="bx-purchase-tag"
                label="Códigos Promo"
              />
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

            {/* Solicitudes de referidos: solo super_administrador. Es la otra
                cara de /referidos — ahí se pide el dinero, aquí se paga. */}
            {isSuperAdmin && (
              <NavBtn
                path="/referidos_admin"
                icon="bx-money-withdraw"
                label="Cobros de Referidos"
              />
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

            {/* UNA sola entrada para /planes y /plan: son la misma cosa vista
                desde dos lados, y dos ítems para lo mismo confundía. Entra por
                /planes —que además es a donde Stripe devuelve tras pagar— y
                desde ahí se alterna con las pestañas de la propia vista. */}
            {!isSuperAdmin && !isGestorClientes && (
              <NavBtn
                path="/planes"
                icon="bxs-credit-card"
                label="Planes y facturación"
                activeWhen={["/planes", "/plan"]}
              />
            )}

            {/* Referidos — va pegado a facturación porque es lo mismo visto
                desde el otro lado: ahí se paga, aquí se cobra. */}
            {!isSuperAdmin && !isGestorClientes && (
              <NavBtn path="/referidos" icon="bx-gift" label="Referidos" />
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
