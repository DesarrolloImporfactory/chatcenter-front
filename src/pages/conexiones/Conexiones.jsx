// ConexionesGuiada.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import chatApi from "../../api/chatcenter";
import botImage from "../../assets/bot.png";
import "./conexiones.css";

/* === MODALES (sin cambios) === */
import CrearConfiguracionModal from "../admintemplates/CrearConfiguracionModal";
import CrearConfiguracionModalWhatsappBusiness from "../admintemplates/CrearConfiguracionModalWhatsappBusiness";

/* ===========================
   Utilidades de la guía
=========================== */

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useEffect : () => {};

// ❌ ANTES: sumaba window.scrollY / window.scrollX
// ✅ AHORA: coordenadas en viewport (perfecto para overlays fixed)
const useSpotlight = (targetRef, deps = []) => {
  const [rect, setRect] = useState(null);

  const update = useCallback(() => {
    if (!targetRef?.current || typeof window === "undefined") return;
    const r = targetRef.current.getBoundingClientRect();
    const margin = 10;
    setRect({
      top: Math.max(8, r.top - margin),
      left: Math.max(8, r.left - margin),
      width: r.width + margin * 2,
      height: r.height + margin * 2,
      centerX: r.left + r.width / 2,
      centerY: r.top + r.height / 2,
      vw: window.innerWidth,
      vh: window.innerHeight,
    });
  }, [targetRef]);

  useIsomorphicLayoutEffect(() => {
    update();
    const onResize = () => update();
    const onScroll = () => update();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { rect, update };
};

const Spotlight = ({ rect }) => {
  if (!rect) return null;
  const haloPad = 28;
  return (
    <>
      {/* Halo con transición */}
      <div
        className="fixed z-[60] pointer-events-none transition-[top,left,width,height] duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{
          top: rect.top - haloPad,
          left: rect.left - haloPad,
          width: rect.width + haloPad * 2,
          height: rect.height + haloPad * 2,
          filter: "blur(6px)",
        }}
      />
      {/* Anillo principal */}
      <div
        className="fixed z-[61] pointer-events-none rounded-xl ring-2 ring-offset-[3px] ring-offset-white transition-[top,left,width,height] duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: 14,
          border: "1px solid rgba(99,102,241,.35)",
          boxShadow:
            "0 12px 40px rgba(59,130,246,.28), inset 0 0 0 1px rgba(255,255,255,.9)",
        }}
      />
      {/* Pulso sutil */}
      <div
        className="fixed z-[59] pointer-events-none"
        style={{
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          borderRadius: 16,
          boxShadow: "0 0 0 0 rgba(99,102,241,.35)",
          animation: "pulseGlow 2s ease-out infinite",
        }}
      />
      <style>{`
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(99,102,241,.35); }
          70% { box-shadow: 0 0 0 12px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        @keyframes floatUp {
          from { transform: translateY(6px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes sheetIn {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes dashDraw {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </>
  );
};

const Balloon = ({ rect, children, placement = "auto", offset = 16 }) => {
  if (!rect || typeof window === "undefined") return null;
  const isMobile = window.innerWidth < 640;

  if (isMobile) {
    // Bottom sheet para móviles
    return (
      <div
        className="fixed inset-x-0 bottom-2 z-[73] px-3"
        role="dialog"
        aria-live="polite"
      >
        <div className="mx-auto max-w-md rounded-2xl bg-white/95 p-4 text-sm text-slate-700 ring-1 ring-slate-200 shadow-[0_20px_60px_rgba(2,6,23,.35)] backdrop-blur animate-[sheetIn_.24s_ease-out]">
          {children}
        </div>
      </div>
    );
  }

  // Desktop/tablet
  const spaceBelow =
    rect.top + rect.height + offset + 240 < window.scrollY + rect.vh;
  const spaceAbove = rect.top - offset - 240 > window.scrollY;
  const spaceRight =
    rect.left + rect.width + offset + 400 < window.scrollX + rect.vw;
  let place = placement;
  if (placement === "auto") {
    if (spaceRight) place = "right";
    else if (spaceBelow) place = "bottom";
    else if (spaceAbove) place = "top";
    else place = "left";
  }

  const style = {
    transition:
      "top .28s cubic-bezier(.22,1,.36,1), left .28s cubic-bezier(.22,1,.36,1)",
  };
  let anchorX = rect.left + rect.width / 2;
  let anchorY = rect.top + rect.height / 2;

  if (place === "bottom") {
    style.top = rect.top + rect.height + offset;
    style.left = Math.min(rect.left, window.scrollX + rect.vw - 400);
    anchorX = rect.left + 24;
    anchorY = rect.top + rect.height;
  } else if (place === "top") {
    style.top = Math.max(8, rect.top - offset - 220);
    style.left = Math.min(rect.left, window.scrollX + rect.vw - 400);
    anchorX = rect.left + 24;
    anchorY = rect.top;
  } else if (place === "right") {
    style.top = Math.max(8, rect.top);
    style.left = rect.left + rect.width + offset;
    anchorX = rect.left + rect.width;
    anchorY = rect.top + 20;
  } else {
    style.top = Math.max(8, rect.top);
    style.left = Math.max(8, rect.left - offset - 380);
    anchorX = rect.left;
    anchorY = rect.top + 20;
  }

  const balloonX = style.left ?? 0;
  const balloonY = style.top ?? 0;

  let tipX = balloonX + 22;
  let tipY = balloonY - 6;
  if (place === "bottom") {
    tipX = balloonX + 22;
    tipY = balloonY;
  } else if (place === "top") {
    tipX = balloonX + 22;
    tipY = balloonY + 220;
  } else if (place === "right") {
    tipX = balloonX;
    tipY = balloonY + 22;
  } else if (place === "left") {
    tipX = balloonX + 380;
    tipY = balloonY + 22;
  }

  return (
    <>
      <svg
        className="fixed z-[72] pointer-events-none"
        width="0"
        height="0"
        style={{ inset: 0 }}
        viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
        preserveAspectRatio="none"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="14"
            markerHeight="14"
            refX="10"
            refY="5"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 Z" fill="url(#grad)" />
          </marker>
          <linearGradient id="grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="glow">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="3"
              floodColor="rgba(99,102,241,.6)"
            />
          </filter>
        </defs>
        <path
          d={`M ${tipX} ${tipY} Q ${(tipX + anchorX) / 2} ${
            (tipY + anchorY) / 2 - 20
          }, ${anchorX} ${anchorY}`}
          stroke="url(#grad)"
          strokeWidth="3"
          fill="none"
          markerEnd="url(#arrowhead)"
          filter="url(#glow)"
          pathLength="100"
          style={{
            strokeDasharray: 100,
            strokeDashoffset: 0,
            animation: "dashDraw .35s ease-out both",
          }}
        />
      </svg>

      <div
        className="fixed z-[71] max-w-[380px] rounded-2xl bg-white/95 p-4 text-sm text-slate-700 ring-1 ring-slate-200 shadow-[0_30px_80px_rgba(2,6,23,.25)] backdrop-blur animate-[floatUp_.22s_ease-out]"
        style={style}
        role="dialog"
        aria-live="polite"
      >
        {children}
      </div>
    </>
  );
};

/* ===========================
   Helpers UI originales
=========================== */

const HeaderStat = ({ label, value }) => (
  <div className="px-4 py-3 rounded-xl bg-white/30 backdrop-blur ring-1 ring-white/50 shadow-sm">
    <div className="text-xs uppercase tracking-wide text-white/80">{label}</div>
    <div className="text-lg font-semibold text-white">{value}</div>
  </div>
);

const pill = (classes, text) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${classes}`}>
    {text}
  </span>
);

/* =========================================================
   NUEVO: Descripciones detalladas (para popover)
========================================================= */

const ActionDetailRow = ({ icon, title, desc, tone = "neutral" }) => {
  const toneCls =
    tone === "primary"
      ? "text-indigo-700 bg-indigo-50 ring-indigo-200"
      : tone === "success"
      ? "text-emerald-700 bg-emerald-50 ring-emerald-200"
      : tone === "warning"
      ? "text-amber-700 bg-amber-50 ring-amber-200"
      : "text-slate-700 bg-slate-50 ring-slate-200";

  return (
    <div className="flex gap-3 items-start">
      <div
        className={`shrink-0 w-8 h-8 grid place-items-center rounded-lg ring-1 ${toneCls}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-[13px] leading-5 text-slate-600">{desc}</div>
      </div>
    </div>
  );
};

/* =========================================================
   NUEVO: Popover de hover con scroll propio
========================================================= */

const HoverPopover = ({
  open,
  onMouseEnter,
  onMouseLeave,
  children,
  side = "right",
}) => {
  if (!open) return null;

  const sideStyles =
    side === "right"
      ? "left-full top-0 ml-2"
      : side === "left"
      ? "right-full top-0 mr-2"
      : side === "top"
      ? "left-1/2 -translate-x-1/2 bottom-full mb-2"
      : "left-1/2 -translate-x-1/2 top-full mt-2";

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`absolute z-30 ${sideStyles}`}
      role="dialog"
      aria-live="polite"
    >
      <div className="relative">
        {/* flecha */}
        <div
          aria-hidden
          className={`absolute ${
            side === "right"
              ? "-left-1 top-3"
              : side === "left"
              ? "-right-1 top-3"
              : side === "top"
              ? "left-1/2 -translate-x-1/2 -bottom-1"
              : "left-1/2 -translate-x-1/2 -top-1"
          } w-3 h-3 rotate-45 bg-white ring-1 ring-slate-200`}
        />
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 shadow-[0_20px_60px_rgba(2,6,23,.20)] backdrop-blur w-[340px] max-h-[240px] overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

/* ===========================
   Vista principal con guía
=========================== */

const ConexionesGuiada = () => {
  const [configuracionAutomatizada, setConfiguracionAutomatizada] = useState(
    []
  );
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  const [mostrarErrorBot, setMostrarErrorBot] = useState(false);
  const [ModalConfiguracionAutomatizada, setModalConfiguracionAutomatizada] =
    useState(false);
  const [
    ModalConfiguracionWhatsappBusiness,
    setModalConfiguracionWhatsappBusiness,
  ] = useState(false);

  const [statusMessage, setStatusMessage] = useState(null);
  const [idConfiguracion, setIdConfiguracion] = useState(null);
  const [NombreConfiguracion, setNombreConfiguracion] = useState(null);
  const [telefono, setTelefono] = useState(null);
  const [loading, setLoading] = useState(true);

  // Controles de vista
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroPago, setFiltroPago] = useState("");
  const [suspendiendoId, setSuspendiendoId] = useState(null);

  // NUEVO: control de popover por card (hover)
  const [hoveredId, setHoveredId] = useState(null);
  const closeTimerRef = useRef(null);
  const openPopover = (id) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setHoveredId(id);
  };
  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setHoveredId(null), 120);
  };

  // ==== REFS para guía ====
  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const newBtnRef = useRef(null);
  const searchRef = useRef(null);
  const filtersRef = useRef(null);
  const gridRef = useRef(null);
  const firstCardRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuRef.current && typeof document !== "undefined") {
      menuRef.current = document.querySelector('[data-tour="hamburger"]');
    }
  }, []);

  // ==== TOUR STATE ====
  const [tourOpen, setTourOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [loadingTourPref, setLoadingTourPref] = useState(true); // evita parpadeo

  // === Nueva lógica: leer preferencia desde backend (sin localStorage) ===
  useEffect(() => {
    const loadPref = async () => {
      if (!userData?.id_usuario) return;
      try {
        const { data } = await chatApi.post(
          "usuarios_chat_center/tour-conexiones/get",
          {
            id_usuario: userData.id_usuario,
          }
        );
        const dismissed = Number(data?.tour_conexiones_dismissed) === 1;
        setDontShowAgain(dismissed);
        setTourOpen(!dismissed);
      } catch (e) {
        // Si falla, mostramos la guía por defecto sin romper sesión
        console.error("No se pudo leer preferencia de tour:", e);
        setDontShowAgain(false);
        setTourOpen(true);
      } finally {
        setLoadingTourPref(false);
      }
    };
    loadPref();
  }, [userData?.id_usuario]);

  // Guardar preferencia en backend

  const persistTourPref = useCallback(
    async (value) => {
      if (!userData?.id_usuario) return; // evita request inválida
      try {
        await chatApi.post("usuarios_chat_center/tour-conexiones/set", {
          id_usuario: userData.id_usuario,
          tour_conexiones_dismissed: value ? 1 : 0,
        });
      } catch (e) {
        console.error("No se pudo guardar preferencia de tour:", e);
      }
    },
    [userData?.id_usuario]
  );

  // Derivados/estadísticas
  const isConectado = (c) => {
    if (typeof c?.status_whatsapp === "string")
      return c.status_whatsapp.toUpperCase() === "CONNECTED";
    return Boolean(
      String(c?.id_telefono || "").trim() && String(c?.id_whatsapp || "").trim()
    );
  };

  const isMessengerConectado = (c) => Number(c?.messenger_conectado) === 1;

  const stats = useMemo(() => {
    const total = configuracionAutomatizada.length;
    const conectados = configuracionAutomatizada.filter(isConectado).length;
    const pagosActivos = configuracionAutomatizada.filter(
      (c) => Number(c.metodo_pago) === 1
    ).length;
    const messengerCon = configuracionAutomatizada.filter(
      (c) => Number(c.messenger_conectado) === 1
    ).length;
    return {
      total,
      conectados,
      pendientes: total - conectados,
      pagosActivos,
      messengerCon,
    };
  }, [configuracionAutomatizada]);

  const listaFiltrada = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = [...configuracionAutomatizada];
    if (q) {
      data = data.filter(
        (c) =>
          c?.nombre_configuracion?.toLowerCase().includes(q) ||
          c?.telefono?.toLowerCase().includes(q)
      );
    }
    if (filtroEstado) {
      const objetivo = filtroEstado === "conectado";
      data = data.filter((c) => isConectado(c) === objetivo);
    }
    if (filtroPago) {
      const objetivo = filtroPago === "activo" ? 1 : 0;
      data = data.filter((c) => Number(c.metodo_pago) === objetivo);
    }
    return data;
  }, [configuracionAutomatizada, search, filtroEstado, filtroPago]);

  // ====== Pasos del tour ======
  const hasCards = listaFiltrada.length > 0;
  const tourSteps = useMemo(() => {
    const base = [
      {
        key: "header",
        ref: headerRef,
        title: "Panel de conexiones",
        body: "Aquí gestionás todos tus canales. Esta guía te resalta las zonas clave y es 100% responsive.",
        placement: "auto",
      },
      {
        key: "new",
        ref: newBtnRef,
        title: "Crear nueva configuración",
        body: "Usá este botón para iniciar el asistente y conectar un nuevo número o canal.",
        placement: "auto",
      },
      {
        key: "search",
        ref: searchRef,
        title: "Búsqueda instantánea",
        body: "Filtrá por nombre o teléfono para encontrar una conexión rápidamente.",
        placement: "auto",
      },
      {
        key: "filters",
        ref: filtersRef,
        title: "Filtros por estado y pagos",
        body: "Acotás la vista por conexiones conectadas/pendientes y pagos activos/inactivos.",
        placement: "auto",
      },
      {
        key: "stats",
        ref: statsRef,
        title: "KPI de cabecera",
        body: "Visión general: totales, conectados, pendientes y pagos activos.",
        placement: "auto",
      },
    ];
    if (hasCards) {
      base.push({
        key: "card",
        ref: firstCardRef,
        title: "Tarjeta de conexión",
        body: "Pasá el mouse por “Detalles” para ver un globo con todas las acciones explicadas, sin abrir la tarjeta.",
        placement: "auto",
      });
      base.push({
        key: "menu",
        ref: menuRef,
        title: "Menú principal (☰)",
        body: "Desde aquí puedes acceder a todo lo importante: tu Plan y facturación, gestión de Usuarios y Departamentos, y Cerrar sesión. Si te pierdes, abre este menú: es tu centro de control.",
        placement: "auto",
      });
    }
    return base;
  }, [hasCards]);

  const currentRef = tourSteps[step]?.ref || null;
  const { rect } = useSpotlight(currentRef, [
    tourOpen,
    step,
    currentRef,
    listaFiltrada.length,
  ]);

  // Scroll al objetivo
  useEffect(() => {
    if (!tourOpen) return;
    const el = currentRef?.current;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [tourOpen, step, currentRef]);

  // Atajos
  useEffect(() => {
    if (!tourOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") handleSkip();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tourOpen, step]);

  // == NUEVO: sin localStorage; al cerrar/terminar persistimos en BD ==
  const handleSkip = useCallback(async () => {
    await persistTourPref(dontShowAgain);
    setTourOpen(false);
  }, [dontShowAgain, persistTourPref]);

  const handleNext = useCallback(async () => {
    setStep((s) => {
      if (s + 1 < tourSteps.length) return s + 1;
      (async () => {
        await persistTourPref(dontShowAgain);
        setTourOpen(false);
      })();
      return s;
    });
  }, [tourSteps.length, dontShowAgain, persistTourPref]);

  const handlePrev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  /* ===========================
     Lógica original (sin romper)
  =========================== */

  const handleAbrirConfiguracionAutomatizada = () =>
    setModalConfiguracionAutomatizada(true);

  const [idConfiguracionFB, setIdConfiguracionFB] = useState(null);

  const confirmarEliminar = async (config) => {
    if (!userData) return;
    const res = await Swal.fire({
      title: "Eliminar conexión",
      text: "Se eliminará esta conexión y no se podrá recuperar. ¿Deseas continuar?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      reverseButtons: true,
    });
    if (!res.isConfirmed) return;

    try {
      setSuspendiendoId(config.id);
      await chatApi.post("configuraciones/toggle_suspension", {
        id_configuracion: config.id,
        id_usuario: userData.id_usuario,
        suspendido: true,
      });
      setConfiguracionAutomatizada((prev) =>
        prev.filter((c) => c.id !== config.id)
      );
      setStatusMessage({ type: "success", text: "Conexión eliminada." });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text:
          err?.response?.data?.message || "No se pudo suspender la conexión.",
      });
    } finally {
      setSuspendiendoId(null);
    }
  };

  /* SDK Facebook e integraciones (sin cambios de lógica) */
  useEffect(() => {
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
    window.fbAsyncInit = () => {
      window.FB.init({
        appId: "1211546113231811",
        autoLogAppEvents: true,
        xfbml: true,
        version: "v22.0",
      });
    };
  }, []);

  const handleConectarMetaDeveloper = (config) => {
    if (!window.FB) {
      setStatusMessage({
        type: "error",
        text: "El SDK de Facebook aún no está listo.",
      });
      return;
    }
    window.FB.login(
      (response) => {
        (async () => {
          const code = response?.authResponse?.code;
          if (!code) {
            setStatusMessage({
              type: "error",
              text: "No se recibió el código de autorización.",
            });
            return;
          }
          const redirectUri = window.location.origin + window.location.pathname;
          try {
            const { data } = await chatApi.post(
              "/whatsapp_managment/embeddedSignupComplete",
              {
                code,
                id_usuario: userData.id_usuario,
                redirect_uri: redirectUri,
                id_configuracion: config?.id,
              }
            );
            if (data.success) {
              setStatusMessage({
                type: "success",
                text: "✅ Número conectado correctamente.",
              });
              await fetchConfiguracionAutomatizada();
            } else {
              throw new Error(data.message || "Error inesperado.");
            }
          } catch (err) {
            const mensaje =
              err?.response?.data?.message || "Error al activar el número.";
            const linkWhatsApp = err?.response?.data?.contacto;
            setStatusMessage({
              type: "error",
              text: linkWhatsApp
                ? `${mensaje} 👉 Haz clic para contactarnos por WhatsApp`
                : mensaje,
              extra: linkWhatsApp || null,
            });
          }
        })();
      },
      {
        config_id: "2295613834169297",
        response_type: "code",
        override_default_response_type: true,
        scope: "whatsapp_business_management,whatsapp_business_messaging",
        extras: {
          featureType: "whatsapp_business_app_onboarding",
          setup: {},
          sessionInfoVersion: "3",
        },
      }
    );
  };

  const FB_FBL_CONFIG_ID_MESSENGER = "1106951720999970";
  const handleConectarFacebookInbox = async (config) => {
    try {
      localStorage.setItem("id_configuracion_fb", String(config.id));
      setIdConfiguracionFB(String(config.id));
      const { data } = await chatApi.get("/messenger/facebook/login-url", {
        params: {
          id_configuracion: config.id,
          redirect_uri: window.location.origin + "/conexiones",
          config_id: FB_FBL_CONFIG_ID_MESSENGER,
        },
      });
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      Swal.fire(
        "Error",
        "No se pudo iniciar la conexión con Facebook.",
        "error"
      );
    }
  };

  const pickPageWithSwal = async (pages) => {
    const inputOptions = pages.reduce((acc, p) => {
      acc[p.id] = `${p.name} (ID: ${p.id})`;
      return acc;
    }, {});
    const { value: pageId } = await Swal.fire({
      title: "Selecciona la página a conectar",
      input: "select",
      inputOptions,
      inputPlaceholder: "Página de Facebook",
      showCancelButton: true,
      confirmButtonText: "Conectar",
      cancelButtonText: "Cancelar",
    });
    return pageId;
  };

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");
      if (!code || error) return;

      const provider = localStorage.getItem("oauth_provider");

      try {
        if (provider === "instagram") {
          const id_configuracion =
            localStorage.getItem("id_configuracion_ig") ||
            localStorage.getItem("id_configuracion") ||
            "";
          if (!id_configuracion)
            throw new Error("Falta id_configuracion (IG).");

          const { data: ex } = await chatApi.post(
            "/instagram/facebook/oauth/exchange",
            {
              code,
              id_configuracion,
              redirect_uri: window.location.origin + "/conexiones",
            }
          );
          const { data: pagesRes } = await chatApi.get(
            "/instagram/facebook/pages",
            { params: { oauth_session_id: ex.oauth_session_id } }
          );

          if (
            (!pagesRes?.pages_with_ig || pagesRes.pages_with_ig.length === 0) &&
            (pagesRes?.pages_without_ig || []).length > 0
          ) {
            await Swal.fire({
              icon: "info",
              title: "No hay páginas con Instagram vinculado",
              html: `
                <div style="text-align:left">
                  <p>Encontramos <b>${pagesRes.pages_without_ig.length}</b> página(s), pero ninguna tiene una cuenta de Instagram conectada.</p>
                  <ol>
                    <li>Convierte tu cuenta de IG a Profesional (Business/Creator).</li>
                    <li>Vincúlala a la Página desde la app de Instagram o en <i>Meta Business Suite → Configuración → Cuentas vinculadas</i>.</li>
                    <li>Vuelve a ejecutar este flujo.</li>
                  </ol>
                </div>`,
              confirmButtonText: "Entendido",
            });
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, "", cleanUrl);
            return;
          }

          const selectable = (pagesRes.pages_with_ig || []).map((p) => ({
            id: p.page_id,
            name: `${p.page_name} — @${p.ig_username}`,
          }));
          if (!selectable.length)
            throw new Error("No hay páginas con IG conectado.");

          const pageId = await pickPageWithSwal(selectable);
          if (!pageId) {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, "", cleanUrl);
            return;
          }

          await chatApi.post("/instagram/facebook/connect", {
            oauth_session_id: ex.oauth_session_id,
            id_configuracion,
            page_id: pageId,
          });

          Swal.fire("¡Listo!", "Cuenta de Instagram conectada ✅", "success");
          await fetchConfiguracionAutomatizada();
        } else {
          const id_configuracion =
            localStorage.getItem("id_configuracion_fb") ||
            localStorage.getItem("id_configuracion") ||
            idConfiguracionFB ||
            "";
          if (!id_configuracion)
            throw new Error("Falta id_configuracion (FB).");

          const { data: ex } = await chatApi.post(
            "/messenger/facebook/oauth/exchange",
            {
              code,
              id_configuracion,
              redirect_uri: window.location.origin + "/conexiones",
            }
          );
          const { data: pagesRes } = await chatApi.get(
            "/messenger/facebook/pages",
            { params: { oauth_session_id: ex.oauth_session_id } }
          );
          if (!pagesRes?.pages?.length)
            throw new Error("No se encontraron páginas.");

          const pageId = await pickPageWithSwal(pagesRes.pages);
          if (!pageId) {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, "", cleanUrl);
            return;
          }

          await chatApi.post("/messenger/facebook/connect", {
            oauth_session_id: ex.oauth_session_id,
            id_configuracion,
            page_id: pageId,
          });

          Swal.fire("¡Listo!", "Página conectada y suscrita ✅", "success");
          await fetchConfiguracionAutomatizada();
        }
      } catch (e) {
        console.error(e);
        Swal.fire(
          "Error",
          e?.message || "No fue posible completar la conexión",
          "error"
        );
      } finally {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);
        localStorage.removeItem("oauth_provider");
        localStorage.removeItem("id_configuracion_ig");
        localStorage.removeItem("id_configuracion_fb");
      }
    };
    run();
  }, [idConfiguracionFB]);

  const IG_FBL_CONFIG_ID = "754174810774119";
  const handleConectarInstagramInbox = async (config) => {
    try {
      localStorage.setItem("oauth_provider", "instagram");
      localStorage.setItem("id_configuracion_ig", String(config.id));
      const { data } = await chatApi.get("/instagram/facebook/login-url", {
        params: {
          id_configuracion: config.id,
          redirect_uri: window.location.origin + "/conexiones",
          config_id: IG_FBL_CONFIG_ID,
        },
      });
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      Swal.fire(
        "Error",
        "No se puede iniciar la conexión con Instagram",
        "error"
      );
    }
  };

  const fetchConfiguracionAutomatizada = useCallback(async () => {
    if (!userData) return;
    try {
      setLoading(true);
      const response = await chatApi.post("configuraciones/listar_conexiones", {
        id_usuario: userData.id_usuario,
      });
      setConfiguracionAutomatizada(response.data.data || []);
      setMostrarErrorBot(false);
    } catch (error) {
      if (error.response?.status === 403) {
        Swal.fire({
          icon: "error",
          title: error.response?.data?.message,
          confirmButtonText: "OK",
        }).then(() => navigate("/planes_view"));
      } else if (error.response?.status === 402) {
        Swal.fire({
          icon: "error",
          title: error.response?.data?.message,
          confirmButtonText: "OK",
        }).then(() => navigate("/miplan"));
      } else if (error.response?.status === 400) {
        setMostrarErrorBot(true);
      } else {
        console.error("Error al cargar configuración:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [userData, navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");
    const decoded = jwtDecode(token);
    if (decoded.exp < Date.now() / 1000) {
      localStorage.clear();
      return navigate("/login");
    }
    setUserData(decoded);
  }, [navigate]);

  useEffect(() => {
    if (userData) fetchConfiguracionAutomatizada();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  // Aviso usuario específico (se conserva)
  useEffect(() => {
    if (!userData) return;
    const TARGET_ID = 46;
    if (Number(userData.id_usuario) !== TARGET_ID) return;
    const KEY = `conn_price_notice_v1_user_${TARGET_ID}`;
    if (localStorage.getItem(KEY) === "1") return;

    (async () => {
      const { value: dontShow } = await Swal.fire({
        title: "Actualización de precio – Plan Conexión",
        icon: "info",
        html: `
          <div style="text-align:left; line-height:1.55">
            <p style="margin:0 0 8px">
              Te informamos que el <b>Plan Conexión</b> tendrá un ajuste de precio.
            </p>
            <div style="
              display:flex; align-items:center; gap:10px; 
              padding:10px 12px; border-radius:10px; 
              background:#F1F5F9; border:1px solid #E2E8F0; margin:8px 0 12px;">
              <span style="font-weight:600; color:#0F172A;">Antes:</span>
              <span style="text-decoration:line-through; color:#64748B">$29</span>
              <span style="font-weight:600; color:#0F172A;">Ahora:</span>
              <span style="font-weight:800; color:#16A34A">$35</span>
              <span style="color:#64748B; font-size:12px">(por mes)</span>
            </div>
            <ul style="margin:0 0 10px 18px; padding:0; color:#334155">
              <li>El cambio aplica a tus próximas renovaciones del plan.</li>
              <li>No afecta tus conversaciones ni tus configuraciones actuales.</li>
              <li>Mantenemos la misma calidad de servicio y soporte.</li>
            </ul>
            <p style="margin:8px 0 0; color:#475569">
              Gracias por seguir con nosotros 💙
            </p>
          </div>
        `,
        confirmButtonText: "Entendido",
        showCancelButton: true,
        cancelButtonText: "Recordármelo luego",
        focusConfirm: false,
        input: "checkbox",
        inputPlaceholder: "No volver a mostrar este aviso",
        inputValue: 0,
        customClass: { popup: "swal2-premium-modal" },
      });
      if (dontShow) localStorage.setItem(KEY, "1");
    })();
  }, [userData]);

  /* ===========================
     UI
  =========================== */

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pt-24 px-3 md:px-6">
      <div className="mx-auto w-[98%] xl:w-[97%] 2xl:w-[96%] m-3 md:m-6 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 min-h-[82vh] overflow-hidden">
        {/* Header premium */}
        <header className="relative isolate overflow-hidden">
          <div
            ref={headerRef}
            className="bg-[#171931] p-6 md:p-7 flex flex-col gap-5 rounded-t-2xl"
          >
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Conexiones configuradas
                </h1>
                <p className="text-white/80 text-sm">
                  Administra tus números y canales de WhatsApp Business y
                  Messenger.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  ref={newBtnRef}
                  onClick={handleAbrirConfiguracionAutomatizada}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 rounded-lg font-semibold shadow-sm transition group relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                >
                  <i className="bx bx-plus text-2xl transition-all duration-300 group-hover:brightness-125"></i>
                  <span className="tooltip">Nueva configuración</span>
                </button>

                {/* Reabrir guía */}
                <button
                  onClick={() => {
                    setTourOpen(true);
                    setStep(0);
                  }}
                  className="px-3 py-2 rounded-lg bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30 ring-1 ring-indigo-300/30"
                  title="Mostrar visita guiada"
                >
                  <i className="bx bx-help-circle text-xl align-middle" />{" "}
                  <span className="hidden sm:inline">¿Cómo funciona?</span>
                </button>
              </div>
            </div>

            <div
              ref={statsRef}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              <HeaderStat label="Total conexiones" value={stats.total} />
              <HeaderStat label="Conectados" value={stats.conectados} />
              <HeaderStat label="Pendientes" value={stats.pendientes} />
              <HeaderStat label="Pagos activos" value={stats.pagosActivos} />
            </div>
          </div>
        </header>

        {/* Barra de controles */}
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="max-w-8xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar por nombre o teléfono…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full lg:w-1/2 px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
            />

            <div ref={filtersRef} className="flex gap-3 w-full lg:w-auto">
              <select
                className="w-full lg:w-56 border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="conectado">Conectado</option>
                <option value="pendiente">Pendiente</option>
              </select>

              <select
                className="w-full lg:w-56 border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                value={filtroPago}
                onChange={(e) => setFiltroPago(e.target.value)}
              >
                <option value="">Todos los pagos</option>
                <option value="activo">Pago activo</option>
                <option value="inactivo">Pago inactivo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Toast de estado */}
        {statusMessage && (
          <div className="mx-auto mt-4 mb-0 w-[98%] max-w-7xl px-4">
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                  : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
              }`}
            >
              {statusMessage.text}{" "}
              {statusMessage.extra && (
                <a
                  href={statusMessage.extra}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold"
                >
                  Abrir WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        {/* Contenido */}
        <div className="p-6">
          <div ref={gridRef} className="max-w-8xl mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="h-48 rounded-xl bg-slate-100 animate-pulse"
                  />
                ))}
              </div>
            ) : mostrarErrorBot || listaFiltrada.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center mt-12">
                <img
                  src={botImage}
                  alt="Robot"
                  className="w-40 h-40 animate-bounce-slow"
                />
                <h3 className="mt-4 text-lg font-semibold text-slate-800">
                  Aún no tienes conexiones
                </h3>
                <p className="mt-1 text-slate-500 text-sm md:text-base max-w-md">
                  Crea tu primera conexión y empieza a interactuar con tus
                  clientes al instante.
                </p>
                <button
                  onClick={handleAbrirConfiguracionAutomatizada}
                  className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-lg shadow-sm transition group relative"
                >
                  <i className="bx bx-plus text-2xl"></i>
                  <span className="tooltip">Agregar configuración</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {listaFiltrada.map((config, idx) => {
                  const conectado = isConectado(config);
                  const pagoActivo = Number(config.metodo_pago) === 1;
                  const isOpen = hoveredId === config.id;

                  return (
                    <div
                      key={config.id}
                      ref={idx === 0 ? firstCardRef : null}
                      className="relative bg-white rounded-2xl shadow-md ring-1 ring-slate-200 p-5 transition hover:shadow-lg hover:-translate-y-0.5 card-hover"
                    >
                      {/* Header card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-slate-800 truncate">
                            {config.nombre_configuracion}
                          </h3>
                          <div className="mt-2 flex items-center gap-2">
                            {pill(
                              conectado
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
                              conectado ? "Conectado" : "Pendiente"
                            )}
                            {pill(
                              pagoActivo
                                ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                                : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
                              pagoActivo ? "Pago activo" : "Pago inactivo"
                            )}
                          </div>
                        </div>

                        {/* eliminar */}
                        <button
                          type="button"
                          onClick={() => confirmarEliminar(config)}
                          disabled={suspendiendoId === config.id}
                          className={[
                            "shrink-0 w-10 h-10 rounded-xl grid place-items-center ring-1 transition",
                            "bg-rose-50 ring-rose-200 text-rose-600",
                            suspendiendoId === config.id
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:scale-105 hover:bg-rose-100",
                          ].join(" ")}
                          title="Eliminar conexión"
                          aria-label="Eliminar conexión"
                        >
                          <i className="bx bx-trash text-xl"></i>
                        </button>
                      </div>

                      {/* Teléfono */}
                      <div className="mt-4 flex items-center gap-2 text-sm text-slate-700">
                        <i className="bx bx-phone-call text-xl text-green-600 hover:sacudir"></i>
                        <span className="font-medium">{config.telefono}</span>
                      </div>

                      {/* Acciones */}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <div
                          className="relative group cursor-pointer text-gray-500 hover:text-blue-600 transition transform hover:scale-110"
                          onClick={() => {
                            localStorage.setItem("id_configuracion", config.id);
                            localStorage.setItem(
                              "id_plataforma_conf",
                              config.id_plataforma
                            );
                            localStorage.setItem(
                              "nombre_configuracion",
                              config.nombre_configuracion
                            );
                            navigate("/administrador-whatsapp");
                          }}
                          title="Ir a configuración"
                        >
                          <i className="bx bx-cog text-2xl text-blue-600"></i>
                          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                            Ir a configuración
                          </span>
                        </div>

                        {/* Facebook Inbox (Messenger) */}
                        {!isMessengerConectado(config) ? (
                          <button
                            type="button"
                            onClick={() => handleConectarFacebookInbox(config)}
                            className="relative group cursor-pointer text-gray-500 hover:text-blue-600 transition transform hover:scale-110"
                            title="Conectar Inbox de Messenger"
                            aria-label="Conectar Inbox de Messenger"
                          >
                            <i className="bx bxl-messenger text-2xl"></i>
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                              Conectar Inbox de Messenger
                            </span>
                          </button>
                        ) : (
                          <div
                            className="relative group text-blue-600"
                            title="Inbox de Messenger conectado"
                          >
                            <i className="bx bxl-messenger text-2xl"></i>
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-blue-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                              Inbox de Messenger conectado
                            </span>
                          </div>
                        )}

                        {/* Instagram Inbox —*/}
                        {/* Instagram Inbox*/}
                        <div
                          className="relative group cursor-pointer text-gray-500 hover:text-blue-600 transition transform hover:scale-110"
                          onClick={() => handleConectarInstagramInbox(config)}
                          title="Conectar Inbox de Instagram"
                        >
                          {/* usa el icono que prefieras. Si tienes boxicons: bxl-messenger / bxl-facebook */}
                          <i className="bx bxl-instagram text-2xl"></i>
                          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                            Conectar Inbox de Instagram
                          </span>
                        </div>

                        {/* Meta Developer */}
                        {!conectado ? (
                          <div
                            className="relative group cursor-pointer text-gray-500 hover:text-blue-700 transition transform hover:scale-110"
                            onClick={() => handleConectarMetaDeveloper(config)}
                            title="Conectar Bussines Manager"
                          >
                            <i className="bx bxl-meta text-2xl"></i>
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                              Conectar Bussines Manager
                            </span>
                          </div>
                        ) : (
                          <div
                            className="relative group text-blue-600"
                            title="Meta Business conectado"
                          >
                            <i className="bx bxl-meta text-2xl"></i>
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-blue-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                              Meta Business conectado
                            </span>
                          </div>
                        )}

                        {!conectado ? (
                          <div
                            className="relative group cursor-pointer text-gray-500 hover:text-green-700 transition transform hover:scale-110"
                            onClick={() => {
                              setIdConfiguracion(config.id);
                              setNombreConfiguracion(
                                config.nombre_configuracion
                              );
                              setTelefono(config.telefono);
                              setModalConfiguracionWhatsappBusiness(true);
                            }}
                            title="Conectar WhatsApp Business"
                          >
                            <i className="bx bxl-whatsapp text-2xl"></i>
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                              Conectar WhatsApp Business
                            </span>
                          </div>
                        ) : (
                          <div
                            className="relative group text-green-600"
                            title="WhatsApp vinculado"
                          >
                            <i className="bx bxl-whatsapp text-2xl"></i>
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-green-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                              WhatsApp vinculado
                            </span>
                          </div>
                        )}

                        <div
                          className="relative group cursor-pointer text-gray-500 hover:text-green-700 transition transform hover:scale-110"
                          onClick={() => {
                            localStorage.setItem("id_configuracion", config.id);
                            localStorage.setItem(
                              "id_plataforma_conf",
                              config.id_plataforma
                            );
                            localStorage.setItem(
                              "nombre_configuracion",
                              config.nombre_configuracion
                            );
                            navigate("/chat");
                          }}
                          title="Ir al chat"
                        >
                          <i className="bx bx-chat text-2xl text-green-600"></i>
                          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                            Ir al chat
                          </span>
                        </div>

                        {/* Hotspot de detalles (hover) */}
                        <div
                          className="relative"
                          onMouseEnter={() => openPopover(config.id)}
                          onMouseLeave={scheduleClose}
                          onFocus={() => openPopover(config.id)}
                          onBlur={() => setHoveredId(null)}
                        >
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-semibold ring-1 ring-indigo-200 bg-indigo-50 text-indigo-700 cursor-default select-none">
                            <i className="bx bx-info-circle text-base" />{" "}
                            Detalles
                          </span>

                          <HoverPopover
                            open={isOpen}
                            onMouseEnter={() => openPopover(config.id)}
                            onMouseLeave={scheduleClose}
                            side="right"
                          >
                            <div className="space-y-3 pr-1">
                              <ActionDetailRow
                                icon={<i className="bx bx-cog" />}
                                title="Configuración"
                                desc="Abrí el panel completo de ajustes: plantillas, webhooks, etiquetas y permisos."
                              />
                              <ActionDetailRow
                                icon={<i className="bx bxl-messenger" />}
                                title="Messenger Inbox"
                                desc="Conecta tu Página de Facebook para recibir y responder mensajes directo en el inbox."
                              />
                              <ActionDetailRow
                                icon={<i className="bx bxl-instagram" />}
                                title="Instagram (próximo)"
                                desc="Integración nativa al inbox. Requiere que tu cuenta de IG esté vinculada a una Página en Meta Business."
                              />
                              <ActionDetailRow
                                icon={<i className="bx bxl-meta" />}
                                title="Meta Business (requerido para WhatsApp)"
                                tone="warning"
                                desc="Para empezar una integración con WhatsApp Business debes iniciar la configuración en el Business Manager de tu empresa (Embedded Signup). Desde aquí finalizas el alta."
                              />
                              <ActionDetailRow
                                icon={<i className="bx bxl-whatsapp" />}
                                title={`WhatsApp Business ${
                                  conectado ? "(conectado)" : "(pendiente)"
                                }`}
                                tone={conectado ? "success" : "neutral"}
                                desc={
                                  conectado
                                    ? "Tu número está activo y listo para enviar/recibir mensajes."
                                    : "Inicia la activación en Business Manager y completa el proceso aquí para vincular tu número."
                                }
                              />
                              <ActionDetailRow
                                icon={<i className="bx bx-chat" />}
                                title="Chat"
                                desc="Abre la bandeja omnicanal para conversar con tus clientes y ver el historial."
                              />
                            </div>
                          </HoverPopover>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === MODALES (como estaban) === */}
      {ModalConfiguracionAutomatizada && (
        <CrearConfiguracionModal
          onClose={() => setModalConfiguracionAutomatizada(false)}
          fetchConfiguraciones={fetchConfiguracionAutomatizada}
          setStatusMessage={setStatusMessage}
        />
      )}

      {ModalConfiguracionWhatsappBusiness && (
        <CrearConfiguracionModalWhatsappBusiness
          onClose={() => setModalConfiguracionWhatsappBusiness(false)}
          fetchConfiguraciones={fetchConfiguracionAutomatizada}
          setStatusMessage={setStatusMessage}
          idConfiguracion={idConfiguracion}
          nombre_configuracion={NombreConfiguracion}
          telefono={telefono}
        />
      )}

      {/* ==== VISITA GUIADA ==== */}
      {tourOpen && !loadingTourPref && (
        <>
          <Spotlight rect={rect} />
          {rect && (
            <Balloon
              rect={rect}
              placement={tourSteps[step]?.placement || "auto"}
            >
              <div className="text-slate-900 font-semibold text-[15px]">
                {tourSteps[step].title}
              </div>
              <p className="mt-1 text-[13px] leading-5 text-slate-600">
                {tourSteps[step].body}
              </p>

              {/* HUD de progreso */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-700 ring-1 ring-slate-200">
                    Paso {step + 1} / {tourSteps.length}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">
                  Atajos: ← → • Esc
                </div>
              </div>

              {/* Controles */}
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-800"
                  aria-label="Omitir guía"
                >
                  <i className="bx bx-x" /> Omitir
                </button>

                <div className="flex items-center gap-2">
                  {/* Checkbox SIEMPRE visible; la preferencia se guarda al cerrar o terminar */}
                  <label className="mr-2 inline-flex items-center gap-2 text-[12px] text-slate-600">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-indigo-600"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                    />
                    No volver a mostrar
                  </label>

                  <button
                    onClick={handlePrev}
                    disabled={step === 0}
                    className={[
                      "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-semibold ring-1 transition",
                      step === 0
                        ? "text-slate-400 ring-slate-200 cursor-not-allowed"
                        : "text-slate-700 ring-slate-200 hover:bg-slate-50",
                    ].join(" ")}
                    aria-label="Anterior"
                    title="Anterior (←)"
                  >
                    <i className="bx bx-left-arrow-alt" /> Atrás
                  </button>

                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-indigo-600 to-indigo-500 px-3 py-1.5 text-[12px] font-semibold text-white ring-1 ring-indigo-500/30 hover:brightness-110"
                    aria-label={
                      step === tourSteps.length - 1 ? "Terminar" : "Siguiente"
                    }
                    title="Siguiente (→)"
                  >
                    {step === tourSteps.length - 1 ? "Terminar" : "Siguiente"}
                    <i className="bx bx-right-arrow-alt" />
                  </button>
                </div>
              </div>
            </Balloon>
          )}
        </>
      )}

      {/* Evita parpadeo mientras se consulta la preferencia */}
      {loadingTourPref && null}
    </div>
  );
};

export default ConexionesGuiada;
