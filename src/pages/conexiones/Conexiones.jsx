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

const HeaderStat = ({ label, value, icon, accent = "text-white" }) => (
  <div className="group relative overflow-hidden rounded-xl bg-white/[0.07] ring-1 ring-white/10 backdrop-blur-xl px-3.5 py-2.5 transition-all duration-300 hover:bg-white/[0.11] hover:ring-white/20">
    <div
      aria-hidden
      className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
    />
    <div className="relative flex items-center justify-between">
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10 ${accent}`}
      >
        <i className={`${icon} text-base`} />
      </span>
      <span className="text-2xl font-extrabold tracking-tight text-white tabular-nums leading-none">
        {value}
      </span>
    </div>
    <div className="relative mt-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/55">
      {label}
    </div>
  </div>
);

const pill = (classes, text) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${classes}`}
  >
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

/**
 * Popover en position: fixed.
 */
const HoverPopover = ({
  open,
  triggerRect,
  onMouseEnter,
  onMouseLeave,
  children,
}) => {
  if (!open || !triggerRect || typeof window === "undefined") return null;

  const POPOVER_W = 340;
  const POPOVER_MAX_H = 260;
  const GAP = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const spaceRight = vw - (triggerRect.right + GAP);
  const spaceLeft = triggerRect.left - GAP;
  const spaceBelow = vh - (triggerRect.bottom + GAP);

  let side = "right";
  if (spaceRight < POPOVER_W + 12) {
    if (spaceLeft >= POPOVER_W + 12) side = "left";
    else side = "bottom";
  }

  let top, left;
  if (side === "right") {
    left = triggerRect.right + GAP;
    top = triggerRect.top;
  } else if (side === "left") {
    left = triggerRect.left - GAP - POPOVER_W;
    top = triggerRect.top;
  } else {
    left = Math.min(Math.max(8, triggerRect.left), vw - POPOVER_W - 8);
    top = triggerRect.bottom + GAP;
  }

  if (top + POPOVER_MAX_H > vh - 8) {
    top = Math.max(8, vh - POPOVER_MAX_H - 8);
  }
  if (top < 8) top = 8;

  const arrowStyle = {
    position: "fixed",
    width: 10,
    height: 10,
    background: "white",
    border: "1px solid rgb(226, 232, 240)",
    transform: "rotate(45deg)",
    zIndex: 81,
  };
  if (side === "right") {
    arrowStyle.left = triggerRect.right + GAP - 5;
    arrowStyle.top = triggerRect.top + 14;
  } else if (side === "left") {
    arrowStyle.left = triggerRect.left - GAP - 5;
    arrowStyle.top = triggerRect.top + 14;
  } else {
    arrowStyle.left = triggerRect.left + 14;
    arrowStyle.top = triggerRect.bottom + GAP - 5;
  }

  return (
    <>
      <div aria-hidden style={arrowStyle} />
      <div
        id="detalles-popover"
        data-popover="detalles"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        role="dialog"
        aria-live="polite"
        style={{
          position: "fixed",
          top,
          left,
          width: POPOVER_W,
          maxHeight: POPOVER_MAX_H,
          overflowY: "auto",
          overscrollBehavior: "contain",
          zIndex: 80,
        }}
        className="rounded-xl bg-white p-3 ring-1 ring-slate-200 shadow-[0_20px_60px_rgba(2,6,23,.20)]"
      >
        {children}
      </div>
    </>
  );
};

/**
 * Bloque hero de WhatsApp (verde de marca WhatsApp).
 */
const WaHero = ({
  conectado,
  yaSincronizo,
  telefono,
  onConectarApi,
  onConectarManual,
  onSync,
  onCopiar,
  syncing,
}) => {
  const tieneTelefono = telefono && String(telefono).trim();

  return (
    <div className="mt-3 p-3.5 rounded-xl bg-emerald-50 ring-1 ring-emerald-200">
      <div className="flex items-center gap-3">
        {/* Icono WhatsApp */}
        <div className="shrink-0 w-10 h-10 rounded-full bg-white grid place-items-center ring-1 ring-emerald-100">
          <i className="bx bxl-whatsapp text-[22px] text-emerald-600" />
        </div>

        {/* Texto (izquierda) */}
        <div className="flex-1 min-w-0">
          {!conectado ? (
            <>
              <div className="text-[10.5px] font-semibold text-emerald-700 uppercase tracking-wider leading-none">
                canal principal
              </div>
              <div className="text-[14px] font-semibold text-emerald-800 leading-tight mt-1 truncate">
                {tieneTelefono ? telefono : "Conecta tu WhatsApp"}
              </div>
            </>
          ) : (
            <>
              <div className="text-[15px] font-semibold text-emerald-800 tracking-tight truncate">
                {telefono}
              </div>
              <div className="text-[11px] text-emerald-700 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {yaSincronizo ? "Conectado · chats sincronizados" : "Conectado"}
              </div>
            </>
          )}
        </div>

        {/* Acciones (derecha) */}
        {conectado ? (
          <div className="shrink-0 flex items-center gap-1">
            {!yaSincronizo && (
              <button
                type="button"
                onClick={onSync}
                disabled={syncing}
                className={[
                  "w-8 h-8 rounded-lg grid place-items-center text-emerald-600 hover:bg-emerald-100 transition relative",
                  syncing ? "opacity-60 cursor-wait" : "",
                ].join(" ")}
                title={
                  syncing
                    ? "Sincronizando…"
                    : "Sincronizar chats existentes (solo Coexistencia)"
                }
                aria-label="Sincronizar chats"
              >
                <i
                  className={`bx bx-refresh text-base ${syncing ? "animate-spin" : ""}`}
                />
                {!syncing && (
                  <span
                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-50"
                    aria-hidden
                  />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onCopiar}
              className="w-8 h-8 rounded-lg grid place-items-center text-emerald-600 hover:bg-emerald-100 transition"
              title="Copiar número"
              aria-label="Copiar número"
            >
              <i className="bx bx-copy text-base" />
            </button>
          </div>
        ) : (
          <div className="shrink-0 flex flex-col items-stretch gap-1">
            <button
              type="button"
              onClick={onConectarApi}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold transition shadow-sm whitespace-nowrap"
            >
              <i className="bx bx-rocket text-sm" />
              Conectar
            </button>
            <button
              type="button"
              onClick={onConectarManual}
              className="text-[10.5px] font-medium text-emerald-700 hover:text-emerald-900 underline decoration-emerald-300 underline-offset-2 transition whitespace-nowrap text-center"
            >
              Conexión manual
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Tile compacto de canal secundario (Messenger / Instagram / Meta Ads).
 */
const ChannelChip = ({
  icon,
  label,
  active,
  brandColor = "slate",
  onClick,
  title,
  busy = false,
  stateLabel,
}) => {
  const brandText = {
    blue: "text-blue-600",
    pink: "text-pink-600",
    orange: "text-orange-600",
    slate: "text-slate-600",
  }[brandColor];

  const cls = [
    "group relative px-2.5 py-2.5 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 select-none",
    active
      ? "bg-slate-50 border-slate-200 hover:border-slate-300"
      : "bg-white border-slate-200 hover:border-indigo-300 hover:-translate-y-px hover:shadow-sm cursor-pointer",
    busy ? "opacity-60 cursor-wait" : "",
  ].join(" ");

  return (
    <button
      type="button"
      onClick={busy ? undefined : onClick}
      disabled={busy}
      title={title}
      className={cls}
    >
      <i
        className={[
          icon,
          "text-[20px] leading-none",
          active ? brandText : "text-slate-400",
          busy ? "animate-pulse" : "",
        ].join(" ")}
      />
      <span
        className={[
          "text-[11px] font-semibold leading-none",
          active ? "text-slate-800" : "text-slate-700",
        ].join(" ")}
      >
        {label}
      </span>
      <span className="flex items-center gap-1 text-[10px] text-slate-500 leading-none">
        <span
          className={[
            "w-1.5 h-1.5 rounded-full",
            active ? "bg-emerald-500" : "bg-slate-300",
          ].join(" ")}
        />
        {stateLabel || (active ? "Activo" : "Conectar")}
      </span>
    </button>
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

  // --- Popover "Ver detalles" ---
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredRect, setHoveredRect] = useState(null);
  const closeTimerRef = useRef(null);
  const triggerElRef = useRef(null);

  const openPopover = (id, btnEl) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (btnEl && typeof btnEl.getBoundingClientRect === "function") {
      triggerElRef.current = btnEl;
      setHoveredRect(btnEl.getBoundingClientRect());
    }
    setHoveredId(id);
  };
  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setHoveredId(null);
      setHoveredRect(null);
      triggerElRef.current = null;
    }, 120);
  };

  useEffect(() => {
    if (!hoveredId) return;

    const reposition = (e) => {
      if (
        e &&
        e.target &&
        typeof e.target.closest === "function" &&
        e.target.closest('[data-popover="detalles"]')
      ) {
        return;
      }
      const el = triggerElRef.current;
      if (!el || !document.body.contains(el)) {
        setHoveredId(null);
        setHoveredRect(null);
        triggerElRef.current = null;
        return;
      }
      const r = el.getBoundingClientRect();
      const fueraVertical = r.bottom < 0 || r.top > window.innerHeight;
      const fueraHorizontal = r.right < 0 || r.left > window.innerWidth;
      if (fueraVertical || fueraHorizontal) {
        setHoveredId(null);
        setHoveredRect(null);
        triggerElRef.current = null;
        return;
      }
      setHoveredRect(r);
    };

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [hoveredId]);

  // --- Menu (3 puntitos) por card ---
  const [menuOpenId, setMenuOpenId] = useState(null);
  useEffect(() => {
    if (!menuOpenId) return;
    const onDown = (e) => {
      if (!e.target.closest("[data-card-menu]")) setMenuOpenId(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpenId]);

  const [syncingId, setSyncingId] = useState(null);
  const [guideModal, setGuideModal] = useState(null);

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

              let selectedId;
              if (accounts.length === 1) {
                selectedId = accounts[0].ad_account_id;
              } else {
                const inputOptions = {};
                for (const a of accounts)
                  inputOptions[a.ad_account_id] =
                    `${a.name} (${a.currency}) — ${a.ad_account_id}`;
                const result = await Swal.fire({
                  title: "Selecciona tu cuenta de Ads",
                  input: "select",
                  inputOptions,
                  inputPlaceholder: "Elige una cuenta publicitaria",
                  showCancelButton: true,
                  confirmButtonText: "Conectar",
                  confirmButtonColor: "#4f46e5",
                });
                selectedId = result.value;
              }
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
                await fetchConfiguracionAutomatizada();
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
          config_id: "4254210594844123",
          response_type: "code",
          override_default_response_type: true,
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
      await fetchConfiguracionAutomatizada();
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
      await chatApi.post(
        "configuraciones/toggle_suspension",
        {
          id_configuracion: config.id,
          id_usuario: userData.id_usuario,
          suspendido: true,
        },
        { silentError: true },
      );
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
        { silentError: true },
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

  const hoveredConfig = useMemo(
    () => listaFiltrada.find((c) => c.id === hoveredId) || null,
    [listaFiltrada, hoveredId],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-3 pr-8">
      <div className="mx-auto w-[100%] m-3 md:m-6 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 min-h-[82vh] overflow-hidden">
        <header className="relative isolate overflow-hidden rounded-t-2xl">
          {/* Fondo navy de marca + capas de profundidad */}
          <div className="absolute inset-0 bg-[#171931]" aria-hidden />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.6]"
            style={{
              backgroundImage:
                "radial-gradient(600px circle at 0% 0%, rgba(79,70,229,0.25), transparent 45%), radial-gradient(500px circle at 100% 120%, rgba(99,102,241,0.18), transparent 40%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative px-5 py-4 md:px-7 md:py-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 ring-1 ring-white/15">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  ImporChat · Conexiones
                </span>
                <h1 className="mt-2 text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
                  Tus conexiones,{" "}
                  <span className="bg-gradient-to-r from-indigo-300 to-violet-200 bg-clip-text text-transparent">
                    en un solo lugar
                  </span>
                </h1>
                <p className="mt-0.5 text-white/55 text-[13px] leading-snug truncate">
                  WhatsApp, Messenger, Instagram y Meta Ads de cada negocio en
                  un mismo panel.
                </p>
              </div>

              <button
                onClick={handleAbrirConfiguracionAutomatizada}
                className="group shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-white text-[#171931] rounded-xl font-semibold text-sm shadow-lg shadow-black/20 ring-1 ring-white/40 hover:shadow-xl hover:shadow-indigo-900/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <i className="bx bx-plus text-xl text-[#4f46e5] transition-transform duration-200 group-hover:rotate-90" />
                Nuevo negocio
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              <HeaderStat
                label="Total conexiones"
                value={stats.total}
                icon="bx bx-layer"
                accent="text-indigo-300"
              />
              <HeaderStat
                label="Conectados"
                value={stats.conectados}
                icon="bx bx-check-circle"
                accent="text-emerald-300"
              />
              <HeaderStat
                label="Pendientes"
                value={stats.pendientes}
                icon="bx bx-time-five"
                accent="text-amber-300"
              />
              <HeaderStat
                label="Pagos activos"
                value={stats.pagosActivos}
                icon="bx bx-credit-card-front"
                accent="text-sky-300"
              />
            </div>
          </div>
        </header>

        {/* ===================== TOOLBAR ===================== */}
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="max-w-8xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative w-full lg:w-1/2">
              <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none transition"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <select
                className="w-full sm:w-44 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 outline-none transition"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="conectado">Conectado</option>
                <option value="pendiente">Pendiente</option>
              </select>
              <select
                className="w-full sm:w-44 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 outline-none transition"
                value={filtroPago}
                onChange={(e) => setFiltroPago(e.target.value)}
              >
                <option value="">Todos los pagos</option>
                <option value="activo">Pago activo</option>
                <option value="inactivo">Pago inactivo</option>
              </select>
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#171931] bg-white ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 transition whitespace-nowrap"
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

        {/* ===================== GRID ===================== */}
        <div className="p-6">
          <div className="max-w-8xl mx-auto">
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
                  className="mt-4 inline-flex items-center gap-2 bg-[#4f46e5] text-white hover:bg-[#4338ca] px-4 py-2.5 rounded-lg shadow-sm transition font-semibold"
                >
                  <i className="bx bx-plus text-xl" />
                  Nuevo negocio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                {listaFiltrada.map((config, idx) => {
                  const conectado = isConectado(config);
                  const pagoActivo = Number(config.metodo_pago) === 1;
                  const msgConectado = isMessengerConectado(config);
                  const igConectado = isInstagramConectado(config);
                  const yaSincronizo =
                    Number(config?.sincronizo_coexistencia) === 1;
                  const adsConectado = Number(config.meta_ads_conectado) === 1;
                  const adsAccountName = config.meta_ads_account_name || null;

                  const topBarBg = conectado
                    ? "rgb(16, 185, 129)"
                    : "rgb(226, 232, 240)";

                  const copiarNumero = async () => {
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
                  };

                  return (
                    <div
                      key={config.id}
                      className="relative bg-white rounded-2xl shadow-sm hover:shadow-md ring-1 ring-slate-200 hover:ring-slate-300 p-4 transition hover:-translate-y-0.5 animate-card-in overflow-hidden flex flex-col"
                      style={{
                        animationDelay: `${Math.min(idx, 8) * 50}ms`,
                      }}
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-[3px]"
                        style={{ background: topBarBg }}
                        aria-hidden
                      />

                      {/* Header card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-semibold text-slate-900 truncate leading-tight">
                            {config.nombre_configuracion}
                          </h3>
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            {pill(
                              conectado
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
                              <>
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${conectado ? "bg-emerald-500" : "bg-slate-400"}`}
                                />
                                {conectado ? "Activo" : "Pendiente"}
                              </>,
                            )}
                            {pill(
                              pagoActivo
                                ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                                : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
                              pagoActivo ? "Pago activo" : "Pago inactivo",
                            )}
                          </div>
                        </div>

                        {/* Menu 3 puntitos */}
                        <div className="relative" data-card-menu>
                          <button
                            type="button"
                            onClick={() =>
                              setMenuOpenId(
                                menuOpenId === config.id ? null : config.id,
                              )
                            }
                            className="shrink-0 w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            aria-label="Más opciones"
                            aria-haspopup="menu"
                            aria-expanded={menuOpenId === config.id}
                          >
                            <i className="bx bx-dots-vertical-rounded text-xl" />
                          </button>
                          {menuOpenId === config.id && (
                            <div
                              role="menu"
                              className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl ring-1 ring-slate-200 py-1.5 z-20"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  copiarNumero();
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                              >
                                <i className="bx bx-copy text-base text-slate-500" />
                                Copiar número
                              </button>
                              <div className="my-1 h-px bg-slate-100" />
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  confirmarEliminar(config);
                                }}
                                disabled={suspendiendoId === config.id}
                                className="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition disabled:opacity-50"
                              >
                                <i className="bx bx-trash text-base" />
                                Eliminar conexión
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hero WhatsApp */}
                      <WaHero
                        conectado={conectado}
                        yaSincronizo={yaSincronizo}
                        telefono={config.telefono}
                        onConectarApi={() =>
                          handleConectarMetaDeveloper(config)
                        }
                        onConectarManual={() => {
                          setIdConfiguracion(config.id);
                          setNombreConfiguracion(config.nombre_configuracion);
                          setTelefono(config.telefono);
                          setModalConfiguracionWhatsappBusiness(true);
                        }}
                        onSync={() => handleSyncCoexistencia(config)}
                        onCopiar={copiarNumero}
                        syncing={syncingId === config.id}
                      />

                      {/* 3 canales secundarios */}
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <ChannelChip
                          icon="bx bxl-messenger"
                          label="Messenger"
                          brandColor="blue"
                          active={msgConectado}
                          title={
                            msgConectado
                              ? "Inbox de Messenger conectado"
                              : "Conectar Inbox de Messenger"
                          }
                          onClick={
                            msgConectado
                              ? undefined
                              : () => handleConectarFacebookInbox(config)
                          }
                        />
                        <ChannelChip
                          icon="bx bxl-instagram"
                          label="Instagram"
                          brandColor="pink"
                          active={igConectado}
                          title={
                            igConectado
                              ? "Inbox de Instagram conectado"
                              : "Conectar Inbox de Instagram"
                          }
                          onClick={
                            igConectado
                              ? undefined
                              : () => handleConectarInstagramInbox(config)
                          }
                        />
                        <ChannelChip
                          icon="bx bxs-bar-chart-alt-2"
                          label="Meta Ads"
                          brandColor="orange"
                          active={adsConectado}
                          busy={adsConnectingId === config.id}
                          stateLabel={
                            adsConnectingId === config.id
                              ? "Conectando…"
                              : adsConectado
                                ? "Desconectar"
                                : "Conectar"
                          }
                          title={
                            adsConnectingId === config.id
                              ? "Conectando…"
                              : adsConectado
                                ? `Ads: ${adsAccountName || "conectado"} (click para desconectar)`
                                : "Conectar Meta Ads"
                          }
                          onClick={
                            adsConnectingId === config.id
                              ? undefined
                              : adsConectado
                                ? () => handleDesconectarMetaAds(config)
                                : () => handleConectarMetaAds(config)
                          }
                        />
                      </div>

                      {/* Footer */}
                      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onMouseEnter={(e) =>
                              openPopover(config.id, e.currentTarget)
                            }
                            onMouseLeave={scheduleClose}
                            onFocus={(e) =>
                              openPopover(config.id, e.currentTarget)
                            }
                            onBlur={scheduleClose}
                            onClick={(e) =>
                              openPopover(config.id, e.currentTarget)
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition"
                            aria-label="Ver detalles"
                          >
                            <i className="bx bx-info-circle text-base" />
                            Detalles
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveConfig(config);
                              navigate("/canal-conexiones");
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition"
                            title="Configuración del canal"
                          >
                            <i className="bx bx-cog text-base" />
                            Ajustes
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!conectado) {
                              Swal.fire({
                                toast: true,
                                position: "top-end",
                                icon: "info",
                                title: "Conecta WhatsApp primero",
                                showConfirmButton: false,
                                timer: 1800,
                              });
                              return;
                            }
                            setActiveConfig(config);
                            navigate("/chat");
                          }}
                          className={[
                            "inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition",
                            conectado
                              ? "text-white bg-[#0e0958] hover:bg-[#01011d] shadow-sm"
                              : "text-slate-400 bg-slate-100 cursor-not-allowed",
                          ].join(" ")}
                          title={
                            conectado
                              ? "Ir al chat"
                              : "Disponible al conectar WhatsApp"
                          }
                        >
                          <i className="bx bx-message-rounded-dots text-base" />
                          Ir al Chat
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Popover único (position fixed) */}
      {hoveredConfig && (
        <HoverPopover
          open={true}
          triggerRect={hoveredRect}
          onMouseEnter={() => openPopover(hoveredConfig.id, null)}
          onMouseLeave={scheduleClose}
        >
          {(() => {
            const conectado = isConectado(hoveredConfig);
            const yaSincronizo =
              Number(hoveredConfig?.sincronizo_coexistencia) === 1;
            const adsConectado = Number(hoveredConfig.meta_ads_conectado) === 1;
            const adsAccountName = hoveredConfig.meta_ads_account_name || null;
            return (
              <div className="space-y-3 pr-1">
                <ActionDetailRow
                  icon={<i className="bx bx-cog" />}
                  title="Canal de conexiones"
                  desc="Administra plantillas, perfiles, etc."
                />
                <ActionDetailRow
                  icon={<i className="bx bxl-messenger" />}
                  title={`Messenger ${isMessengerConectado(hoveredConfig) ? "(conectado)" : "(pendiente)"}`}
                  tone={
                    isMessengerConectado(hoveredConfig) ? "success" : "neutral"
                  }
                  desc={
                    isMessengerConectado(hoveredConfig)
                      ? "Página conectada al inbox."
                      : "Conecta tu Página de Facebook."
                  }
                />
                <ActionDetailRow
                  icon={<i className="bx bxl-instagram" />}
                  title={`Instagram ${isInstagramConectado(hoveredConfig) ? "(conectado)" : "(pendiente)"}`}
                  tone={
                    isInstagramConectado(hoveredConfig) ? "success" : "neutral"
                  }
                  desc={
                    isInstagramConectado(hoveredConfig)
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
                  icon={<i className="bx bxs-bar-chart-alt-2" />}
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
            );
          })()}
        </HoverPopover>
      )}

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

      {metaConnecting && (
        <>
          <div className="fixed inset-0 z-[999] bg-slate-950/60 backdrop-blur-sm" />
          <div className="fixed inset-0 z-[1000] grid place-items-center px-4">
            <div className="w-full max-w-md rounded-2xl bg-white/95 p-5 ring-1 ring-slate-200 shadow-[0_30px_80px_rgba(2,6,23,.35)]">
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
                <div className="h-2 w-1/2 bg-indigo-600 animate-[progressBar_1.1s_ease-in-out_infinite]" />
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

      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(10px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-card-in {
          animation: cardIn .42s cubic-bezier(.22,1,.36,1) both;
        }
      `}</style>
    </div>
  );
};

export default Conexiones;
