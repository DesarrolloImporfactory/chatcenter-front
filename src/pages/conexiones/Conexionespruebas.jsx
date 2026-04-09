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

import CrearConfiguracionModal from "../admintemplates/CrearConfiguracionModal";
import CrearConfiguracionModalWhatsappBusiness from "../admintemplates/CrearConfiguracionModalWhatsappBusiness";
import GuiaCoexistenciaModal from "./Modales/GuiaCoexistenciaModal";
import GuiaWhatsappApiModal from "./Modales/GuiaWhatsappApiModal";
import ExportarMensajesModal from "./Modales/ExportarMensajesModal";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useEffect : () => {};

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
  }, deps);
  return { rect, update };
};

const Spotlight = ({ rect }) => {
  if (!rect) return null;
  const haloPad = 28;
  return (
    <>
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
      <style>{`@keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(99,102,241,.35); } 70% { box-shadow: 0 0 0 12px rgba(99,102,241,0); } 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); } } @keyframes floatUp { from { transform: translateY(6px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } @keyframes sheetIn { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } @keyframes dashDraw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }`}</style>
    </>
  );
};

const Balloon = ({ rect, children, placement = "auto", offset = 16 }) => {
  if (!rect || typeof window === "undefined") return null;
  const isMobile = window.innerWidth < 640;
  if (isMobile)
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
  let anchorX = rect.left + rect.width / 2,
    anchorY = rect.top + rect.height / 2;
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
  const balloonX = style.left ?? 0,
    balloonY = style.top ?? 0;
  let tipX = balloonX + 22,
    tipY = balloonY - 6;
  if (place === "bottom") {
    tipX = balloonX + 22;
    tipY = balloonY;
  } else if (place === "top") {
    tipX = balloonX + 22;
    tipY = balloonY + 220;
  } else if (place === "right") {
    tipX = balloonX;
    tipY = balloonY + 22;
  } else {
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
          d={`M ${tipX} ${tipY} Q ${(tipX + anchorX) / 2} ${(tipY + anchorY) / 2 - 20}, ${anchorX} ${anchorY}`}
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
        <div
          aria-hidden
          className={`absolute ${side === "right" ? "-left-1 top-3" : side === "left" ? "-right-1 top-3" : side === "top" ? "left-1/2 -translate-x-1/2 -bottom-1" : "left-1/2 -translate-x-1/2 -top-1"} w-3 h-3 rotate-45 bg-white ring-1 ring-slate-200`}
        />
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 shadow-[0_20px_60px_rgba(2,6,23,.20)] backdrop-blur w-[340px] max-h-[240px] overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const Conexiones = () => {
  const [configuracionAutomatizada, setConfiguracionAutomatizada] = useState(
    [],
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
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroPago, setFiltroPago] = useState("");
  const [suspendiendoId, setSuspendiendoId] = useState(null);
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
  const [syncingId, setSyncingId] = useState(null);
  const [guideModal, setGuideModal] = useState(null);

  // Meta Ads — solo tracking del id que está conectando (no N+1)
  const [adsConnectingId, setAdsConnectingId] = useState(null);

  // Conectar Meta Ads
  const handleConectarMetaAds = useCallback(
    (config) => {
      if (!window.FB) {
        setStatusMessage({
          type: "error",
          text: "El SDK de Facebook aún no está listo.",
        });
        return;
      }
      setAdsConnectingId(config.id);
      window.FB.login(
        (response) => {
          (async () => {
            try {
              const code = response?.authResponse?.code;
              if (!code) {
                setAdsConnectingId(null);
                return;
              }
              const { data } = await chatApi.post("/meta_ads/conectar", {
                code,
                id_configuracion: config.id,
                id_usuario: userData?.id_usuario,
                redirect_uri: window.location.origin + "/conexiones",
              });
              if (!data.success && data.step !== "select_account") {
                setAdsConnectingId(null);
                return Swal.fire("Error", data.message, "error");
              }
              const accounts = data.accounts || [];
              if (!accounts.length) {
                setAdsConnectingId(null);
                return Swal.fire(
                  "Sin cuentas",
                  "No se encontraron cuentas publicitarias.",
                  "info",
                );
              }
              const inputOptions = {};
              for (const a of accounts)
                inputOptions[a.ad_account_id] =
                  `${a.name} (${a.currency}) — ${a.ad_account_id}`;
              const { value: selectedId } = await Swal.fire({
                title: "Selecciona tu cuenta de Ads",
                input: "select",
                inputOptions,
                inputPlaceholder: "Elige una cuenta publicitaria",
                showCancelButton: true,
                confirmButtonText: "Conectar",
                confirmButtonColor: "#4f46e5",
              });
              if (!selectedId) {
                setAdsConnectingId(null);
                return;
              }
              const { data: confirmData } = await chatApi.post(
                "/meta_ads/conectar",
                {
                  id_configuracion: config.id,
                  id_usuario: userData?.id_usuario,
                  ad_account_id: selectedId,
                  access_token: data._token,
                },
              );
              if (confirmData.success) {
                await fetchConfiguracionAutomatizada(); // refresca todo con 1 sola petición
                Swal.fire(
                  "¡Conectado!",
                  `Cuenta ${confirmData.ad_account_name} vinculada.`,
                  "success",
                );
              } else {
                Swal.fire("Error", confirmData.message, "error");
              }
            } catch (err) {
              Swal.fire(
                "Error",
                err?.response?.data?.message || err.message,
                "error",
              );
            } finally {
              setAdsConnectingId(null);
            }
          })();
        },
        {
          scope: "ads_read",
          response_type: "code",
          override_default_response_type: true,
          redirect_uri: window.location.origin + "/conexiones",
        },
      );
    },
    [userData?.id_usuario],
  );

  // Desconectar Meta Ads
  const handleDesconectarMetaAds = useCallback(async (config) => {
    const ask = await Swal.fire({
      title: "Desconectar Meta Ads",
      text: "Ya no se mostrarán las métricas de esta cuenta.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Desconectar",
      confirmButtonColor: "#ef4444",
      reverseButtons: true,
    });
    if (!ask.isConfirmed) return;
    try {
      await chatApi.post("/meta_ads/desconectar", {
        id_configuracion: config.id,
      });
      await fetchConfiguracionAutomatizada(); // refresca todo con 1 sola petición
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Meta Ads desconectado",
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (err) {
      Swal.fire("Error", "No se pudo desconectar.", "error");
    }
  }, []);

  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const newBtnRef = useRef(null);
  const searchRef = useRef(null);
  const filtersRef = useRef(null);
  const gridRef = useRef(null);
  const firstCardRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuRef.current && typeof document !== "undefined")
      menuRef.current = document.querySelector('[data-tour="hamburger"]');
  }, []);

  const [tourOpen, setTourOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [loadingTourPref, setLoadingTourPref] = useState(true);

  useEffect(() => {
    const loadPref = async () => {
      if (!userData?.id_usuario) return;
      try {
        const { data } = await chatApi.post(
          "usuarios_chat_center/tour-conexiones/get",
          { id_usuario: userData.id_usuario },
        );
        const dismissed = Number(data?.tour_conexiones_dismissed) === 1;
        setDontShowAgain(dismissed);
        setTourOpen(!dismissed);
      } catch (e) {
        setDontShowAgain(false);
        setTourOpen(true);
      } finally {
        setLoadingTourPref(false);
      }
    };
    loadPref();
  }, [userData?.id_usuario]);

  const persistTourPref = useCallback(
    async (value) => {
      if (!userData?.id_usuario) return;
      try {
        await chatApi.post("usuarios_chat_center/tour-conexiones/set", {
          id_usuario: userData.id_usuario,
          tour_conexiones_dismissed: value ? 1 : 0,
        });
      } catch {}
    },
    [userData?.id_usuario],
  );

  const isConectado = (c) => {
    if (typeof c?.status_whatsapp === "string")
      return c.status_whatsapp.toUpperCase() === "CONNECTED";
    return Boolean(
      String(c?.id_telefono || "").trim() &&
      String(c?.id_whatsapp || "").trim(),
    );
  };
  const isMessengerConectado = (c) => Number(c?.messenger_conectado) === 1;
  const isInstagramConectado = (c) => Number(c?.instagram_conectado) === 1;

  const [metaConnecting, setMetaConnecting] = useState(false);
  const [metaConnectText, setMetaConnectText] = useState(
    "Conectando con Meta…",
  );

  const stats = useMemo(() => {
    const total = configuracionAutomatizada.length;
    const conectados = configuracionAutomatizada.filter(isConectado).length;
    const pagosActivos = configuracionAutomatizada.filter(
      (c) => Number(c.metodo_pago) === 1,
    ).length;
    return { total, conectados, pendientes: total - conectados, pagosActivos };
  }, [configuracionAutomatizada]);

  const listaFiltrada = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = [...configuracionAutomatizada];
    if (q)
      data = data.filter(
        (c) =>
          c?.nombre_configuracion?.toLowerCase().includes(q) ||
          c?.telefono?.toLowerCase().includes(q),
      );
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

  const hasCards = listaFiltrada.length > 0;
  const tourSteps = useMemo(() => {
    const base = [
      {
        key: "header",
        ref: headerRef,
        title: "Panel de conexiones",
        body: "Aquí gestionás todos tus canales.",
        placement: "auto",
      },
      {
        key: "new",
        ref: newBtnRef,
        title: "Crear nueva configuración",
        body: "Usá este botón para iniciar el asistente y conectar un negocio con sus respectivos canales.",
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
        body: "Filtra tus negocios por estado conectado/pendiente y con pagos activos/inactivos.",
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
        body: 'Pasá el mouse por "Ver detalles" para conocer todas las acciones disponibles.',
        placement: "auto",
      });
      base.push({
        key: "menu",
        ref: menuRef,
        title: "Menú principal (☰)",
        body: "Plan y facturación, Usuarios, Departamentos y Cerrar sesión.",
        placement: "auto",
      });
    }
    return base;
  }, [hasCards]);

  const currentRef = tourSteps[step]?.ref || null;
  const { rect, update } = useSpotlight(currentRef, [
    tourOpen,
    step,
    currentRef,
    listaFiltrada.length,
  ]);

  useEffect(() => {
    if (!tourOpen) return;
    const onLayoutChanged = () => {
      update?.();
      setTimeout(() => update?.(), 320);
    };
    window.addEventListener("layout:changed", onLayoutChanged);
    return () => window.removeEventListener("layout:changed", onLayoutChanged);
  }, [tourOpen, update]);
  useEffect(() => {
    if (!tourOpen) return;
    const el = currentRef?.current;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [tourOpen, step, currentRef]);
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
        prev.filter((c) => c.id !== config.id),
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
    setMetaConnectText("Abriendo conexión con Meta…");
    setMetaConnecting(true);
    window.FB.login(
      (response) => {
        (async () => {
          try {
            const code = response?.authResponse?.code;
            if (!code) {
              setMetaConnecting(false);
              setStatusMessage({
                type: "warning",
                text: "Conexión cancelada.",
              });
              return;
            }
            setMetaConnectText("Activando y sincronizando tu número…");
            const { data } = await chatApi.post(
              "/whatsapp_managment/embeddedSignupComplete",
              {
                code,
                id_usuario: userData.id_usuario,
                redirect_uri: "https://chatcenter.imporfactory.app/conexiones",
                id_configuracion: config?.id,
                display_number_onboarding: String(
                  config?.telefono || "",
                ).trim(),
              },
            );
            if (data?.success) {
              setMetaConnectText("¡Listo! Actualizando conexiones…");
              await fetchConfiguracionAutomatizada();
              setMetaConnecting(false);
              setStatusMessage({
                type: "success",
                text: "Número conectado correctamente.",
              });
              return;
            }
            if (data?.partial) {
              setMetaConnecting(false);
              setStatusMessage({
                type: "warning",
                text: data.message,
                extra: data.soporte,
              });
              return;
            }
            setMetaConnecting(false);
            setStatusMessage({
              type: "error",
              text: data?.message || "Error al activar el número.",
              extra: data?.contacto || null,
            });
          } catch (err) {
            const data = err?.response?.data;
            if (data?.partial) {
              setMetaConnecting(false);
              setStatusMessage({
                type: "warning",
                text: data.message,
                extra: data.soporte,
              });
              return;
            }
            const mensaje = data?.message || "Error al activar el número.";
            const linkWhatsApp = data?.contacto;
            setMetaConnecting(false);
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
        redirect_uri: "https://chatcenter.imporfactory.app/conexiones",
        scope: "whatsapp_business_management,whatsapp_business_messaging",
        extras: {
          featureType: "whatsapp_business_app_onboarding",
          setup: {},
          sessionInfoVersion: "3",
        },
      },
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
      Swal.fire(
        "Error",
        "No se pudo iniciar la conexión con Facebook.",
        "error",
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
            },
          );
          const { data: pagesRes } = await chatApi.get(
            "/instagram/facebook/pages",
            { params: { oauth_session_id: ex.oauth_session_id } },
          );
          if (
            (!pagesRes?.pages_with_ig || pagesRes.pages_with_ig.length === 0) &&
            (pagesRes?.pages_without_ig || []).length > 0
          ) {
            await Swal.fire({
              icon: "info",
              title: "No hay páginas con Instagram vinculado",
              html: `<div style="text-align:left"><p>Encontramos <b>${pagesRes.pages_without_ig.length}</b> página(s), pero ninguna tiene Instagram conectada.</p></div>`,
              confirmButtonText: "Entendido",
            });
            window.history.replaceState(
              {},
              "",
              window.location.origin + window.location.pathname,
            );
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
            window.history.replaceState(
              {},
              "",
              window.location.origin + window.location.pathname,
            );
            return;
          }
          await chatApi.post("/instagram/facebook/connect", {
            oauth_session_id: ex.oauth_session_id,
            id_configuracion,
            page_id: pageId,
          });
          Swal.fire("¡Listo!", "Cuenta de Instagram conectada", "success");
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
            },
          );
          const { data: pagesRes } = await chatApi.get(
            "/messenger/facebook/pages",
            { params: { oauth_session_id: ex.oauth_session_id } },
          );
          if (!pagesRes?.pages?.length)
            throw new Error("No se encontraron páginas.");
          const pageId = await pickPageWithSwal(pagesRes.pages);
          if (!pageId) {
            window.history.replaceState(
              {},
              "",
              window.location.origin + window.location.pathname,
            );
            return;
          }
          await chatApi.post("/messenger/facebook/connect", {
            oauth_session_id: ex.oauth_session_id,
            id_configuracion,
            page_id: pageId,
          });
          Swal.fire("¡Listo!", "Página conectada y suscrita", "success");
          await fetchConfiguracionAutomatizada();
        }
      } catch (e) {
        Swal.fire(
          "Error",
          e?.message || "No fue posible completar la conexión",
          "error",
        );
      } finally {
        window.history.replaceState(
          {},
          "",
          window.location.origin + window.location.pathname,
        );
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
      Swal.fire(
        "Error",
        "No se puede iniciar la conexión con Instagram",
        "error",
      );
    }
  };

  const getUserIdSafe = () => {
    try {
      const t = localStorage.getItem("token");
      if (!t) return null;
      return jwtDecode(t)?.id_usuario ?? null;
    } catch {
      return null;
    }
  };

  const fetchConfiguracionAutomatizada = useCallback(
    async (overrideUserId) => {
      const uid = overrideUserId ?? userData?.id_usuario ?? getUserIdSafe();
      const uid_sub = userData?.id_sub_usuario;
      if (!uid) return;
      try {
        setLoading(true);
        const response = await chatApi.post(
          "configuraciones/listar_conexiones_sub_user",
          { id_usuario: uid, id_sub_usuario: uid_sub },
        );
        setConfiguracionAutomatizada(response.data.data || []);
        setMostrarErrorBot(false);
        // ✅ meta_ads_conectado ya viene del SQL — 0 peticiones extra
      } catch (error) {
        if (error._handledByInterceptor) return;
        if (error.response?.status === 403) {
          Swal.fire({
            icon: "error",
            title: error.response?.data?.message,
            confirmButtonText: "OK",
          }).then(() =>
            navigate(error?.response?.data?.redirectTo || "/planes"),
          );
        } else if (error.response?.status === 400) {
          setMostrarErrorBot(true);
        } else {
          console.error("Error al cargar configuración:", error);
        }
      } finally {
        setLoading(false);
      }
    },
    [userData?.id_usuario, navigate],
  );

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
  }, [userData]);

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
        html: `<div style="text-align:left; line-height:1.55"><p style="margin:0 0 8px">Te informamos que el <b>Plan Conexión</b> tendrá un ajuste de precio.</p><div style="display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; background:#F1F5F9; border:1px solid #E2E8F0; margin:8px 0 12px;"><span style="font-weight:600; color:#0F172A;">Antes:</span><span style="text-decoration:line-through; color:#64748B">$29</span><span style="font-weight:600; color:#0F172A;">Ahora:</span><span style="font-weight:800; color:#16A34A">$35</span><span style="color:#64748B; font-size:12px">(por mes)</span></div><ul style="margin:0 0 10px 18px; padding:0; color:#334155"><li>El cambio aplica a tus próximas renovaciones.</li><li>No afecta tus conversaciones ni configuraciones actuales.</li></ul></div>`,
        confirmButtonText: "Entendido",
        showCancelButton: true,
        cancelButtonText: "Recordármelo luego",
        input: "checkbox",
        inputPlaceholder: "No volver a mostrar",
        inputValue: 0,
      });
      if (dontShow) localStorage.setItem(KEY, "1");
    })();
  }, [userData]);

  const handleSyncCoexistencia = async (config) => {
    if (!config?.id) return;
    if (!isConectado(config))
      return Swal.fire(
        "Aún no se puede sincronizar",
        "Primero conecte WhatsApp Business.",
        "info",
      );
    if (Number(config.sincronizo_coexistencia) === 1)
      return Swal.fire(
        "Ya sincronizado",
        "Este número ya realizó la sincronización.",
        "success",
      );
    const ask = await Swal.fire({
      title: "Sincronizar Chats",
      html: '<div style="text-align:left; line-height:1.5"><p>Esta opción <b>solo aplica</b> si vinculó una cuenta de WhatsApp Business existente.</p></div>',
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Entendido, sincronizar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#4f46e5",
      reverseButtons: true,
    });
    if (!ask.isConfirmed) return;
    try {
      setSyncingId(config.id);
      const { data } = await chatApi.post(
        "/whatsapp_managment/coexistencia/sync",
        { id_configuracion: config.id },
      );
      if (data?.success) {
        setConfiguracionAutomatizada((prev) =>
          prev.map((c) =>
            c.id === config.id ? { ...c, sincronizo_coexistencia: 1 } : c,
          ),
        );
        Swal.fire(
          "Listo",
          data?.status === "synced"
            ? "Sincronización realizada."
            : "Ya sincronizado.",
          "success",
        );
        return;
      }
      const status = data?.status;
      if (status === "not_coexistence_number")
        return Swal.fire(
          "No aplica",
          data?.mensaje || "No compatible con Coexistencia.",
          "info",
        );
      if (status === "missing_data")
        return Swal.fire(
          "Faltan datos",
          data?.mensaje || "Falta info.",
          "error",
        );
      if (status === "already_synced" || status === "already_done_by_meta") {
        setConfiguracionAutomatizada((prev) =>
          prev.map((c) =>
            c.id === config.id ? { ...c, sincronizo_coexistencia: 1 } : c,
          ),
        );
        return Swal.fire(
          "Ya sincronizado",
          data?.mensaje || "Ya sincronizado.",
          "success",
        );
      }
      return Swal.fire(
        "No se pudo sincronizar",
        data?.mensaje || "Error.",
        "info",
      );
    } catch (err) {
      const data = err?.response?.data;
      if (data?.status === "not_coexistence_number")
        return Swal.fire(
          "No aplica",
          data?.mensaje || "No compatible.",
          "info",
        );
      if (data?.status === "missing_data")
        return Swal.fire(
          "Faltan datos",
          data?.mensaje || "Falta info.",
          "error",
        );
      return Swal.fire(
        "Error",
        data?.mensaje || "Error al sincronizar.",
        "error",
      );
    } finally {
      setSyncingId(null);
    }
  };

  const setActiveConfig = useCallback((config) => {
    if (!config?.id) return;
    localStorage.setItem("id_configuracion", String(config.id));
    localStorage.setItem(
      "id_plataforma_conf",
      String(config.id_plataforma || ""),
    );
    localStorage.setItem(
      "tipo_configuracion",
      String(config.tipo_configuracion || ""),
    );
    localStorage.setItem(
      "nombre_configuracion",
      String(config.nombre_configuracion || ""),
    );
    localStorage.setItem("telefono", String(config.telefono || ""));
    window.dispatchEvent(new Event("dropi:config-changed"));
  }, []);

  const [showExportModal, setShowExportModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-3 pr-8">
      <div className="mx-auto w-[100%] m-3 md:m-6 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 min-h-[82vh] overflow-hidden">
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
                  Administra tus números y canales de WhatsApp Business,
                  Messenger, Instagram y Meta Ads.
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
                className="w-full lg:w-56 border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-200 outline-none"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="conectado">Conectado</option>
                <option value="pendiente">Pendiente</option>
              </select>
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#171931] bg-white ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 transition whitespace-nowrap"
              >
                <i className="bx bx-download text-lg" />
                Exportar mensajes
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
              ¿Cómo conectar?
            </span>
            <button
              type="button"
              onClick={() => setGuideModal("coexistencia")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 hover:bg-indigo-100 transition-all"
            >
              <i className="bx bx-mobile-alt text-sm" />
              Coexistencia
              <span className="text-[10px] text-indigo-400 font-medium">
                celular + web
              </span>
              <i className="bx bx-play-circle text-sm text-indigo-400" />
            </button>
            <button
              type="button"
              onClick={() => setGuideModal("api")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 hover:bg-emerald-100 transition-all"
            >
              <i className="bx bx-code-alt text-sm" />
              Solo WhatsApp API
              <span className="text-[10px] text-emerald-400 font-medium">
                sin celular
              </span>
              <i className="bx bx-play-circle text-sm text-emerald-400" />
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="mx-auto mt-4 mb-0 w-[98%] max-w-7xl px-4">
            <div
              className={`rounded-lg px-4 py-3 text-sm ${statusMessage.type === "success" ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : statusMessage.type === "warning" ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200" : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"}`}
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
                  clientes.
                </p>
                <button
                  onClick={handleAbrirConfiguracionAutomatizada}
                  className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-lg shadow-sm transition"
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
                  const yaSincronizo =
                    Number(config?.sincronizo_coexistencia) === 1;
                  // ✅ Directo del SQL — 0 peticiones extra
                  const adsConectado = Number(config.meta_ads_conectado) === 1;
                  const adsAccountName = config.meta_ads_account_name || null;

                  return (
                    <div
                      key={config.id}
                      ref={idx === 0 ? firstCardRef : null}
                      className="relative bg-white rounded-2xl shadow-md ring-1 ring-slate-200 p-6 transition hover:shadow-lg hover:-translate-y-0.5 card-hover"
                    >
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
                              conectado ? "Conectado" : "Pendiente",
                            )}
                            {pill(
                              pagoActivo
                                ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                                : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
                              pagoActivo ? "Pago activo" : "Pago inactivo",
                            )}
                          </div>
                        </div>
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
                        >
                          <i className="bx bx-trash text-xl"></i>
                        </button>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-2 text-sm text-slate-700">
                        <div className="flex items-center gap-2 min-w-0">
                          <i className="bx bx-phone-call text-xl text-green-600"></i>
                          <span className="font-medium truncate">
                            {config.telefono}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                String(config.telefono || "").trim(),
                              );
                              Swal.fire({
                                toast: true,
                                position: "top-end",
                                icon: "success",
                                title: "Número copiado",
                                showConfirmButton: false,
                                timer: 1400,
                              });
                            } catch {
                              Swal.fire("Error", "No se pudo copiar.", "error");
                            }
                          }}
                          className="shrink-0 w-9 h-9 rounded-xl grid place-items-center ring-1 ring-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition"
                          title="Copiar número"
                        >
                          <i className="bx bx-copy text-lg" />
                        </button>
                      </div>

                      <div className="mt-6 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div
                            className="relative group cursor-pointer text-gray-500 hover:text-blue-600 transition transform hover:scale-110"
                            onClick={() => {
                              setActiveConfig(config);
                              navigate("/canal-conexiones");
                            }}
                            title="Ir al canal de conexiones"
                          >
                            <i className="bx bx-cog text-2xl text-blue-600"></i>
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                              Ir al canal de conexiones
                            </span>
                          </div>

                          {!isMessengerConectado(config) ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleConectarFacebookInbox(config)
                              }
                              className="relative group cursor-pointer text-gray-500 hover:text-blue-600 transition transform hover:scale-110"
                              title="Conectar Messenger"
                            >
                              <i className="bx bxl-messenger text-2xl"></i>
                              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                Conectar Inbox de Messenger
                              </span>
                            </button>
                          ) : (
                            <div
                              className="relative group text-blue-600"
                              title="Messenger conectado"
                            >
                              <i className="bx bxl-messenger text-2xl"></i>
                              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-blue-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                Inbox de Messenger conectado
                              </span>
                            </div>
                          )}

                          {!isInstagramConectado(config) ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleConectarInstagramInbox(config)
                              }
                              className="relative group cursor-pointer text-gray-500 hover:text-pink-600 transition transform hover:scale-110"
                              title="Conectar Instagram"
                            >
                              <i className="bx bxl-instagram text-2xl"></i>
                              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                Conectar Inbox de Instagram
                              </span>
                            </button>
                          ) : (
                            <div
                              className="relative group text-pink-600"
                              title="Instagram conectado"
                            >
                              <i className="bx bxl-instagram text-2xl"></i>
                              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-pink-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                Inbox de Instagram conectado
                              </span>
                            </div>
                          )}

                          {!conectado ? (
                            <div
                              className="relative group cursor-pointer text-gray-500 hover:text-blue-700 transition transform hover:scale-110"
                              onClick={() =>
                                handleConectarMetaDeveloper(config)
                              }
                              title="Conectar Business Manager"
                            >
                              <i className="bx bxl-meta text-2xl"></i>
                              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                Conectar Business Manager
                              </span>
                            </div>
                          ) : (
                            <div
                              className="relative group text-blue-600"
                              title="Meta Business conectado"
                            >
                              <i className="bx bxl-meta text-2xl"></i>
                              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-blue-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
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
                                  config.nombre_configuracion,
                                );
                                setTelefono(config.telefono);
                                setModalConfiguracionWhatsappBusiness(true);
                              }}
                              title="Conectar WhatsApp Business"
                            >
                              <i className="bx bxl-whatsapp text-2xl"></i>
                              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                Conectar WhatsApp Business
                              </span>
                            </div>
                          ) : (
                            <div
                              className="relative group text-green-600"
                              title="WhatsApp vinculado"
                            >
                              <i className="bx bxl-whatsapp text-2xl"></i>
                              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-green-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                WhatsApp vinculado
                              </span>
                            </div>
                          )}

                          {!conectado ? (
                            <div
                              className="relative group text-slate-400"
                              title="Disponible al conectar WhatsApp"
                            >
                              <i className="bx bx-refresh text-2xl"></i>
                              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                Disponible al conectar WhatsApp
                              </span>
                            </div>
                          ) : yaSincronizo ? (
                            <div
                              className="relative group text-emerald-600"
                              title="Chats sincronizados"
                            >
                              <i className="bx bx-check-circle text-2xl"></i>
                              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-emerald-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                Chats sincronizados
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSyncCoexistencia(config)}
                              disabled={syncingId === config.id}
                              className={[
                                "relative group cursor-pointer transition transform hover:scale-110",
                                "text-indigo-600 hover:text-indigo-700",
                                syncingId === config.id
                                  ? "opacity-60 cursor-not-allowed"
                                  : "",
                              ].join(" ")}
                              title="Sincronizar"
                            >
                              <i
                                className={`bx bx-refresh text-2xl ${syncingId === config.id ? "animate-spin" : ""}`}
                              />
                              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-indigo-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                {syncingId === config.id
                                  ? "Procesando..."
                                  : "Sincronizar chats"}
                              </span>
                            </button>
                          )}

                          {/* META ADS */}
                          {!adsConectado ? (
                            <button
                              type="button"
                              onClick={() => handleConectarMetaAds(config)}
                              disabled={adsConnectingId === config.id}
                              className={[
                                "relative group cursor-pointer transition transform hover:scale-110",
                                "text-gray-500 hover:text-orange-600",
                                adsConnectingId === config.id
                                  ? "opacity-60 cursor-not-allowed"
                                  : "",
                              ].join(" ")}
                              title="Conectar Meta Ads"
                            >
                              <i
                                className={`bx bxs-bar-chart-alt-2 text-2xl ${adsConnectingId === config.id ? "animate-pulse" : ""}`}
                              />
                              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                {adsConnectingId === config.id
                                  ? "Conectando…"
                                  : "Conectar Meta Ads"}
                              </span>
                            </button>
                          ) : (
                            <div
                              className="relative group text-orange-600 cursor-pointer"
                              title={`Meta Ads: ${adsAccountName || "conectado"}`}
                              onClick={() => handleDesconectarMetaAds(config)}
                            >
                              <i className="bx bxs-bar-chart-alt-2 text-2xl"></i>
                              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-orange-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                Ads: {adsAccountName || "conectado"} (click para
                                desconectar)
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-2 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                          <div
                            className="relative"
                            onMouseEnter={() => openPopover(config.id)}
                            onMouseLeave={scheduleClose}
                            onFocus={() => openPopover(config.id)}
                            onBlur={() => setHoveredId(null)}
                          >
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold text-slate-700 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
                              aria-label="Ver detalles"
                            >
                              <i className="bx bx-info-circle text-base text-indigo-600" />
                              Ver detalles
                            </button>
                            <HoverPopover
                              open={hoveredId === config.id}
                              onMouseEnter={() => openPopover(config.id)}
                              onMouseLeave={scheduleClose}
                              side="right"
                            >
                              <div className="space-y-3 pr-1">
                                <ActionDetailRow
                                  icon={<i className="bx bx-cog" />}
                                  title="Canal de conexiones"
                                  desc="Administra plantillas, perfiles, etc."
                                />
                                <ActionDetailRow
                                  icon={<i className="bx bxl-messenger" />}
                                  title={`Messenger ${isMessengerConectado(config) ? "(conectado)" : "(pendiente)"}`}
                                  tone={
                                    isMessengerConectado(config)
                                      ? "success"
                                      : "neutral"
                                  }
                                  desc={
                                    isMessengerConectado(config)
                                      ? "Página conectada al inbox."
                                      : "Conecta tu Página de Facebook."
                                  }
                                />
                                <ActionDetailRow
                                  icon={<i className="bx bxl-instagram" />}
                                  title={`Instagram ${isInstagramConectado(config) ? "(conectado)" : "(pendiente)"}`}
                                  tone={
                                    isInstagramConectado(config)
                                      ? "success"
                                      : "neutral"
                                  }
                                  desc={
                                    isInstagramConectado(config)
                                      ? "Instagram conectado al inbox."
                                      : "Requiere IG vinculado a una Página."
                                  }
                                />
                                <ActionDetailRow
                                  icon={<i className="bx bxl-meta" />}
                                  title={`Meta Business ${conectado ? "(conectado)" : "(requerido)"}`}
                                  tone={conectado ? "success" : "warning"}
                                  desc={
                                    conectado
                                      ? "Integración operativa para WhatsApp Business."
                                      : "Primero configura el Business Manager."
                                  }
                                />
                                <ActionDetailRow
                                  icon={<i className="bx bxl-whatsapp" />}
                                  title={`WhatsApp ${conectado ? "(conectado)" : "(pendiente)"}`}
                                  tone={conectado ? "success" : "neutral"}
                                  desc={
                                    conectado
                                      ? "Número activo y listo."
                                      : "Vincula tu número desde Business Manager."
                                  }
                                />
                                <ActionDetailRow
                                  icon={<i className="bx bx-refresh" />}
                                  title="Coexistencia"
                                  tone={
                                    !conectado
                                      ? "neutral"
                                      : yaSincronizo
                                        ? "success"
                                        : "warning"
                                  }
                                  desc={
                                    !conectado
                                      ? "Disponible al conectar WhatsApp."
                                      : yaSincronizo
                                        ? "Ya sincronizado."
                                        : "Ejecuta una vez para traer mensajes existentes."
                                  }
                                />
                                <ActionDetailRow
                                  icon={
                                    <i className="bx bxs-bar-chart-alt-2" />
                                  }
                                  title={`Meta Ads ${adsConectado ? "(conectado)" : "(pendiente)"}`}
                                  tone={adsConectado ? "success" : "neutral"}
                                  desc={
                                    adsConectado
                                      ? `Cuenta ${adsAccountName || ""} vinculada. Métricas en el dashboard.`
                                      : "Conecta tu cuenta publicitaria de Meta."
                                  }
                                />
                                <ActionDetailRow
                                  icon={<i className="bx bx-chat" />}
                                  title="Chat"
                                  desc="Bandeja omnicanal para conversar con clientes."
                                />
                              </div>
                            </HoverPopover>
                          </div>
                          <div className="flex items-center gap-2">
                            {adsConectado && (
                              <button
                                type="button"
                                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-orange-700 bg-orange-50 ring-1 ring-orange-200 hover:bg-orange-100 transition"
                                onClick={() => {
                                  setActiveConfig(config);
                                  navigate("/meta_ads_dashboard");
                                }}
                                title="Ver dashboard de Ads"
                              >
                                <i className="bx bxs-bar-chart-alt-2 text-lg" />
                                Ads
                              </button>
                            )}
                            <button
                              type="button"
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-emerald-700 to-emerald-500 ring-1 ring-emerald-500/30 hover:brightness-110 transition"
                              onClick={() => {
                                setActiveConfig(config);
                                navigate("/chat");
                              }}
                              title="Ir al chat"
                            >
                              <i className="bx bx-message-rounded-dots text-lg" />
                              Ir al Chat
                            </button>
                          </div>
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
              <div className="mt-3 flex items-center justify-between">
                <div className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-700 ring-1 ring-slate-200">
                  Paso {step + 1} / {tourSteps.length}
                </div>
                <div className="text-[11px] text-slate-500">← → • Esc</div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-800"
                >
                  <i className="bx bx-x" /> Omitir
                </button>
                <div className="flex items-center gap-2">
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
                  >
                    <i className="bx bx-left-arrow-alt" /> Atrás
                  </button>
                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-indigo-600 to-indigo-500 px-3 py-1.5 text-[12px] font-semibold text-white ring-1 ring-indigo-500/30 hover:brightness-110"
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

      {metaConnecting && (
        <>
          <div className="fixed inset-0 z-[999] bg-slate-950/60 backdrop-blur-sm" />
          <div className="fixed inset-0 z-[1000] grid place-items-center px-4">
            <div className="w-full max-w-md rounded-2xl bg-white/95 p-5 ring-1 ring-slate-200 shadow-[0_30px_80px_rgba(2,6,23,.35)] animate-[sheetIn_.22s_ease-out]">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-2xl grid place-items-center bg-indigo-50 ring-1 ring-indigo-200">
                  <i className="bx bx-loader-alt text-3xl text-indigo-600 animate-spin" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-bold text-slate-900">
                    Procesando conexión
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {metaConnectText}
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <i className="bx bx-shield-quarter text-base text-emerald-600" />
                      Seguro
                    </span>
                    <span className="opacity-60">•</span>
                    <span className="inline-flex items-center gap-1">
                      <i className="bx bx-time-five text-base text-indigo-600" />
                      Puede tardar unos segundos
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-2 w-1/2 bg-indigo-500 animate-[progressBar_1.1s_ease-in-out_infinite]" />
              </div>
              <style>{`@keyframes progressBar { 0% { transform: translateX(-80%); } 50% { transform: translateX(40%); } 100% { transform: translateX(180%); } }`}</style>
            </div>
          </div>
        </>
      )}

      {guideModal === "coexistencia" && (
        <GuiaCoexistenciaModal onClose={() => setGuideModal(null)} />
      )}
      {guideModal === "api" && (
        <GuiaWhatsappApiModal onClose={() => setGuideModal(null)} />
      )}
      {showExportModal && (
        <ExportarMensajesModal
          conexiones={configuracionAutomatizada}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};

export default Conexiones;
