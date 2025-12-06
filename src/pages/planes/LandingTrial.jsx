import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import {
  FaWhatsapp,
  FaInstagram,
  FaFacebookMessenger,
  FaGraduationCap,
  FaCheckCircle,
  FaArrowRight,
  FaRobot,
  FaShieldAlt,
  FaBolt,
  FaLock,
  FaCreditCard,
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaClock,
  FaFileAlt,
  FaSyncAlt,
  FaGlobe,
  FaUserShield,
} from "react-icons/fa";

/* ---------- Helpers ---------- */
const CheckItem = ({ children }) => (
  <li className="flex items-start gap-2">
    <FaCheckCircle className="mt-1 flex-shrink-0" />
    <span className="text-slate-700">{children}</span>
  </li>
);

const Chip = ({ children, tone = "default" }) => (
  <span
    className={[
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1",
      tone === "brand"
        ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
        : "bg-slate-100 text-slate-700 ring-slate-200",
    ].join(" ")}
  >
    {children}
  </span>
);

/* ====== Globos externos con cola (se mantienen) ====== */
const BubbleIcon = ({
  children,
  direction = "right",
  leadLength = 120,
  stroke = 3,
  color = "#2563eb",
  className = "",
}) => {
  const toRight = direction === "right";
  const vbW = leadLength + 30;
  const y = 11;
  const startX = 16;
  const c1 = startX + leadLength * 0.38;
  const c2 = startX + leadLength * 0.72;

  return (
    <span
      className={[
        "relative inline-flex h-12 w-12 items-center justify-center overflow-visible",
        "rounded-full bg-white/95 ring-1 ring-slate-200 shadow-xl",
        "backdrop-blur supports-[backdrop-filter]:backdrop-blur-md",
        className,
      ].join(" ")}
    >
      {/* Cola detrás */}
      <svg
        aria-hidden
        width={vbW}
        height="24"
        viewBox={`0 0 ${vbW} 22`}
        className="pointer-events-none absolute top-1/2 -translate-y-1/2"
        style={
          toRight
            ? { right: `-${Math.round(leadLength * 0.86)}px`, zIndex: -1 }
            : {
                left: `-${Math.round(leadLength * 0.86)}px`,
                transform: "translateY(-50%) scaleX(-1)",
                zIndex: -1,
              }
        }
      >
        <path
          d={`M ${startX} ${y} C ${c1} 2, ${c2} 2, ${startX + leadLength} ${y}`}
          stroke="rgba(2,6,23,0.16)"
          strokeWidth={stroke + 6}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M ${startX} ${y} C ${c1} 2, ${c2} 2, ${startX + leadLength} ${y}`}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 1px 4px rgba(2,6,23,.12))" }}
        />
        <circle
          cx={startX + leadLength}
          cy={y}
          r={9}
          fill="rgba(2,6,23,0.10)"
        />
        <circle cx={startX + leadLength} cy={y} r={7} fill={color} />
        <circle
          cx={startX + leadLength - 2}
          cy={y - 2}
          r={2.2}
          fill="white"
          opacity="0.85"
        />
        <circle
          cx={startX + leadLength}
          cy={y}
          r={7.7}
          fill="none"
          stroke="white"
          strokeWidth="1.4"
          opacity="0.9"
        />
      </svg>

      {/* Cuerpo del globo */}
      <span className="pointer-events-none absolute inset-0 z-10 rounded-full bg-gradient-to-b from-white/70 to-slate-50" />
      <span className="pointer-events-none absolute -top-1 -left-1 z-10 h-6 w-6 rounded-full bg-white/50 blur-[6px]" />
      <span className="relative z-30">{children}</span>
    </span>
  );
};

/* ====== MsgBubble (SIN colas) ====== */
const MsgBubble = ({ side = "left", children, tone = "default" }) => {
  const isRight = side === "right";
  const palette =
    tone === "system"
      ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
      : tone === "note"
      ? "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200"
      : isRight
      ? "text-white bg-gradient-to-b from-blue-600 to-blue-500"
      : "text-slate-800 bg-white/95 ring-1 ring-slate-200";

  return (
    <div
      className={`relative ${
        isRight ? "ml-auto" : ""
      } max-w-[92%] sm:max-w-[86%] md:max-w-[82%]`}
    >
      <div
        className={[
          "relative shadow-md",
          "px-3.5 py-2.5 sm:px-4 sm:py-3",
          "rounded-2xl sm:rounded-2xl md:rounded-3xl",
          palette,
        ].join(" ")}
      >
        {isRight && (
          <span className="pointer-events-none absolute inset-x-0 -top-1 h-1/2 rounded-2xl bg-white/10" />
        )}
        {children}
      </div>
    </div>
  );
};

/* ---------- STRIPE TRUST PANEL (mejorado: features 2×2) ---------- */
const TrustItem = ({ icon: Icon, label }) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-700 ring-1 ring-slate-200 shadow-sm">
    <Icon className="text-slate-700" />
    {label}
  </span>
);

const StripeFeature = ({ icon: Icon, title, desc }) => (
  <div className="rounded-xl bg-white/90 p-3 ring-1 ring-slate-200 shadow-sm">
    <div className="flex items-start gap-3">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/5 ring-1 ring-slate-200">
        <Icon className="text-slate-700" />
      </span>
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <p className="text-[12px] text-slate-600">{desc}</p>
      </div>
    </div>
  </div>
);

const StripeTrustPanel = () => (
  <div className="mt-6 rounded-2xl p-[1px] bg-gradient-to-br from-slate-200/70 via-white/40 to-slate-100/60">
    <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white ring-1 ring-blue-500/30 shadow">
            <FaLock />
          </span>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Pagos seguros con{" "}
              <span className="bg-gradient-to-r from-indigo-500 to-blue-600 bg-clip-text text-transparent font-black tracking-tight">
                Stripe
              </span>
            </div>
            <p className="text-[12px] text-slate-600">
              Suscripción protegida con estándares bancarios.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <FaCcVisa className="text-2xl" />
          <FaCcMastercard className="text-2xl" />
          <FaCcAmex className="text-2xl" />
        </div>
      </div>

      {/* Chips de cumplimiento */}
      <div className="mt-3 flex flex-wrap gap-2">
        <TrustItem icon={FaShieldAlt} label="PCI DSS Nivel 1" />
        <TrustItem icon={FaCreditCard} label="Tokenización & 3DS2" />
        <TrustItem icon={FaClock} label="TLS 1.2+ en tránsito" />
      </div>

      {/* Features 2×2 (aprovecha mejor el espacio) */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StripeFeature
          icon={FaUserShield}
          title="Portal del cliente"
          desc="Actualizá tarjeta, descargá facturas y gestioná la suscripción."
        />
        <StripeFeature
          icon={FaFileAlt}
          title="Recibos e impuestos"
          desc="Comprobantes automáticos generados."
        />
        <StripeFeature
          icon={FaGlobe}
          title="Pagos internacionales"
          desc="Acepta tarjetas globales con conversión segura."
        />
        <StripeFeature
          icon={FaSyncAlt}
          title="Actualización inteligente"
          desc="Reintentos y actualización de tarjeta cuando cambia el plástico."
        />
      </div>

      {/* Footer pequeño */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>
            Prueba gratuita 100 conversaciones al mes • Cancelás cuando quieras
          </span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] ring-1 ring-slate-200">
          <span className="font-semibold">Powered by</span>
          <span className="font-black bg-gradient-to-r from-indigo-500 to-blue-600 bg-clip-text text-transparent">
            Stripe
          </span>
        </div>
      </div>
    </div>
  </div>
);

/* ---------- HERO: mock premium + globos externos ---------- */
const HeroShowcase = () => {
  const W = 660;
  const H = 520;

  return (
    <div className="relative mx-auto w-full max-w-[700px] sm:max-w-[660px]">
      {/* Fondo decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 30% 40%, rgba(16,185,129,.18) 0%, rgba(16,185,129,0) 60%), radial-gradient(55% 55% at 75% 35%, rgba(59,130,246,.14) 0%, rgba(59,130,246,0) 55%), linear-gradient(transparent 0, transparent 22px, rgba(2,6,23,.04) 23px), linear-gradient(90deg, transparent 0, transparent 22px, rgba(2,6,23,.04) 23px)",
          backgroundSize: "100% 100%, 100% 100%, 24px 24px, 24px 24px",
        }}
      />

      {/* Conectores curvos (detrás) */}
      <svg
        className="pointer-events-none absolute inset-0 z-0"
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <marker
            id="arrG"
            markerWidth="12"
            markerHeight="12"
            refX="9"
            refY="6"
            orient="auto"
          >
            <path d="M0,0 L12,6 L0,12 z" fill="rgba(16,185,129,.9)" />
          </marker>
          <marker
            id="arrI"
            markerWidth="12"
            markerHeight="12"
            refX="9"
            refY="6"
            orient="auto"
          >
            <path d="M0,0 L12,6 L0,12 z" fill="rgba(99,102,241,.9)" />
          </marker>
          <marker
            id="arrB"
            markerWidth="12"
            markerHeight="12"
            refX="9"
            refY="6"
            orient="auto"
          >
            <path d="M0,0 L12,6 L0,12 z" fill="rgba(37,99,235,.95)" />
          </marker>
          <linearGradient id="lgG" x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(2,6,23,.2)" />
            <stop offset="100%" stopColor="rgba(16,185,129,.9)" />
          </linearGradient>
          <linearGradient id="lgI" x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(2,6,23,.2)" />
            <stop offset="100%" stopColor="rgba(99,102,241,.9)" />
          </linearGradient>
          <linearGradient id="lgB" x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(2,6,23,.2)" />
            <stop offset="100%" stopColor="rgba(37,99,235,.95)" />
          </linearGradient>
        </defs>

        <path
          d={`M 72 115 C 180 105, 255 115, 340 150`}
          stroke="rgba(16,185,129,.15)"
          strokeWidth="10"
          fill="none"
        />
        <path
          d={`M 72 115 C 180 105, 255 115, 340 150`}
          stroke="url(#lgG)"
          strokeWidth="3.5"
          fill="none"
          markerEnd="url(#arrG)"
        />
        <path
          d={`M 72 190 C 200 185, 300 205, 460 220`}
          stroke="rgba(99,102,241,.14)"
          strokeWidth="10"
          fill="none"
        />
        <path
          d={`M 72 190 C 200 185, 300 205, 460 220`}
          stroke="url(#lgI)"
          strokeWidth="3.5"
          fill="none"
          markerEnd="url(#arrI)"
        />
        <path
          d={`M 72 270 C 210 275, 310 330, 490 352`}
          stroke="rgba(37,99,235,.16)"
          strokeWidth="10"
          fill="none"
        />
        <path
          d={`M 72 270 C 210 275, 310 330, 490 352`}
          stroke="url(#lgB)"
          strokeWidth="3.5"
          fill="none"
          markerEnd="url(#arrB)"
        />
      </svg>

      {/* Card con borde “glass” y pantalla */}
      <div className="relative z-10 ml-0 sm:ml-8 md:ml-14 lg:ml-20 rounded-[30px] p-[1px] bg-gradient-to-br from-slate-200/70 via-white/40 to-slate-100/60 shadow-[0_40px_90px_rgba(2,6,23,.18)]">
        <div className="rounded-[29px] bg-white/90 ring-1 ring-slate-200 backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl p-4 sm:p-5 md:p-6">
          {/* notch */}
          <div className="mx-auto mb-3 h-3 w-20 rounded-b-2xl bg-black/80 sm:h-4 sm:w-24" />

          {/* header del chat */}
          <div className="mb-3 flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 ring-1 ring-slate-200">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 ring-1 ring-emerald-200">
                <FaRobot className="text-emerald-600 text-[12px]" />
              </span>
              <div className="text-xs">
                <div className="font-semibold text-slate-700">Cliente</div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  en línea
                </div>
              </div>
            </div>
            <Chip tone="brand">Sesión segura</Chip>
          </div>

          {/* pantalla */}
          <div className="rounded-2xl bg-slate-50 p-4 sm:p-5 md:p-6 ring-1 ring-slate-200">
            <div className="space-y-5 sm:space-y-6">
              {/* Mensaje entrante */}
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-gradient-to-b from-slate-200 to-slate-300 shadow-inner ring-1 ring-slate-300/70" />
                <MsgBubble side="left">
                  <div className="h-3 w-40 sm:w-44 rounded bg-slate-300/85" />
                  <div className="mt-2 h-3 w-24 sm:w-28 rounded bg-slate-300/70" />
                  <div className="mt-2 text-[10px] text-slate-400">10:21</div>
                </MsgBubble>
              </div>

              {/* Mensaje saliente */}
              <MsgBubble side="right">
                <div className="h-3 w-36 sm:w-40 rounded bg-white/90" />
                <div className="mt-2 h-3 w-24 sm:w-28 rounded bg-white/80" />
                <div className="mt-2 text-[10px] opacity-80">
                  Entregado ✓✓ · 10:22
                </div>
              </MsgBubble>

              {/* Indicador escribiendo */}
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-gradient-to-b from-slate-200 to-slate-300 shadow-inner ring-1 ring-slate-300/70" />
                <MsgBubble tone="system">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 [animation-delay:300ms]" />
                    <span className="ml-2 text-[11px]">escribiendo…</span>
                  </div>
                </MsgBubble>
              </div>

              {/* Tarjeta neutral */}
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-gradient-to-b from-slate-200 to-slate-300 shadow-inner ring-1 ring-slate-300/70" />
                <div className="rounded-2xl bg-white p-3 sm:p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="h-14 sm:h-16 w-[220px] sm:w-[280px] rounded-md bg-white ring-1 ring-slate-200" />
                </div>
              </div>
            </div>

            {/* input + enviar */}
            <div className="mt-4 sm:mt-5 flex items-center gap-3 sm:gap-4">
              <div className="flex-1 rounded-xl bg-white/95 px-3.5 py-2.5 sm:px-4 sm:py-3 text-[12px] text-slate-500 shadow-sm ring-1 ring-slate-200">
                Escribe un mensaje…
              </div>
              <button
                className="inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-b from-blue-600 to-blue-500 shadow-md ring-1 ring-blue-500/30 hover:brightness-110 active:scale-[.98] transition"
                aria-label="Enviar"
              >
                <FaBolt className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Badge “+ IA” */}
      <div className="absolute right-2 top-1 z-20 select-none rounded-full bg-white px-3 py-1 text-[10px] sm:text-xs font-bold shadow-md ring-1 ring-slate-200">
        + IA
      </div>

      {/* Globos apps */}
      <div className="absolute -left-1 sm:left-1 top-10 sm:top-16 z-20 flex flex-col gap-4 sm:gap-6">
        <BubbleIcon color="#22c55e" leadLength={140} stroke={3.5}>
          <FaWhatsapp className="text-green-600" />
        </BubbleIcon>
        <BubbleIcon color="#6366f1" leadLength={130}>
          <FaInstagram className="text-indigo-600" />
        </BubbleIcon>
        <BubbleIcon color="#2563eb" leadLength={150}>
          <FaFacebookMessenger className="text-blue-600" />
        </BubbleIcon>
      </div>
    </div>
  );
};

const LandingTrial = () => {
  const [eligible, setEligible] = useState(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  const getAuth = () => {
    const token = localStorage.getItem("token");
    if (!token) return {};
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;
      const id_plataforma = localStorage.getItem("id_plataforma_free");
      return { token, id_usuario, id_plataforma };
    } catch {
      return {};
    }
  };

  // feedback Stripe cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("trial") === "cancel") {
      Swal.fire("Cancelado", "No se completó el proceso en Stripe.", "info");
      const url = new URL(window.location.href);
      url.searchParams.delete("trial");
      window.history.replaceState({}, document.title, url.pathname);
    }
  }, []);

  /* // elegibilidad
  useEffect(() => {
    (async () => {
      const { token, id_usuario } = getAuth();
      if (!token || !id_usuario) {
        setEligible(false);
        setChecking(false);
        return;
      }
      try {
        const { data } = await chatApi.post(
          "/stripe_plan/trialElegibilidad",
          { id_usuario },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEligible(Boolean(data?.elegible));
      } catch {
        setEligible(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []); */

  const navigate = useNavigate();

  const startFreeTrial = async () => {
    const { token, id_usuario, id_plataforma } = getAuth();
    if (!token || !id_usuario || !id_plataforma) {
      Swal.fire(
        "Inicia sesión",
        "Debes iniciar sesión para continuar.",
        "info"
      );
      return;
    }
    if (eligible === false) {
      Swal.fire("No disponible", "Ya usaste tu prueba gratuita.", "info");
      return;
    }
    try {
      setLoading(true);
      /* const base = window.location.origin;
      const payload = {
        id_usuario,
        id_plataforma,
        success_url: `${base}/miplan?trial=ok`,
        cancel_url: `${base}${window.location.pathname}?trial=cancel`,
        trial_days: 30,
      };
      const { data } = await chatApi.post(
        "/stripe_plan/crearSesionLiteFree",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      ); */

      const response = await chatApi.post("/planes/seleccionarPlan", {
        id_plan: 1,
        id_usuario,
        id_plataforma,
      });

      const data = response.data;

      // Verifica si la respuesta fue correcta
      if (response.status !== 200 || data.status !== "success") {
        throw new Error(data.message || "Error al actualizar el chat");
      }

      navigate("/conexiones");

      /* if (data?.url) window.location.href = data.url;
      else throw new Error("No se recibió URL de Stripe."); */
    } catch (e) {
      Swal.fire(
        "Error",
        e?.response?.data?.message ||
          e.message ||
          "No se pudo iniciar la prueba.",
        "error"
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <section className="relative">
        <div className="mx-auto grid w-full grid-cols-1 items-start gap-10 sm:gap-12 md:gap-14 px-4 sm:px-6 lg:px-10 py-10 sm:py-12 md:py-16 md:grid-cols-[minmax(0,1.15fr)_640px]">
          {/* Texto */}
          <div className="relative z-10 pt-1 sm:pt-2">
            {/* badge arriba */}
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] text-white">
                100
              </span>
              conversaciones gratis para alumnos al mes
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black leading-[1.08] md:leading-[1.02] tracking-tight text-slate-900">
              Centraliza tus conversaciones
              <br className="hidden md:block" /> en un solo lugar
            </h1>

            <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 text-slate-600">
              <span className="inline-flex items-center gap-2 text-sm sm:text-base">
                <FaWhatsapp className="text-green-500" />
                <FaInstagram />
                <FaFacebookMessenger className="text-blue-500" />
              </span>
              <span className="text-sm sm:text-base">además de</span>
              <Chip tone="brand">inteligencia artificial</Chip>
            </div>

            <p className="mt-4 sm:mt-5 max-w-xl text-[14px] sm:text-[15px] leading-7 text-slate-600">
              Integra WhatsApp, Instagram y Facebook para comunicarte en tiempo
              real con más de <b>3000 millones</b> de usuarios.
            </p>

            <div className="mt-5 sm:mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <p className="flex items-center gap-2 text-slate-900">
                <FaGraduationCap className="text-slate-800" />
                <b>Beneficio exclusivo para alumnos</b>
              </p>
              <p className="mt-2 text-[14px] sm:text-[15px] leading-6 text-slate-700">
                ¡Por ser alumno, accedés a{" "}
                <b>100 conversaciones totalmente gratis al mes</b> desde el día
                de tu inscripción! Solo debés activar tu cuenta registrando una
                tarjeta de crédito o débito.{" "}
                <span className="font-semibold">
                  No se te cobrará absolutamente nada.
                </span>
              </p>
            </div>

            <div className="mt-5 sm:mt-6">
              <button
                onClick={startFreeTrial}
                disabled={loading || eligible === false}
                className={`w-full sm:w-auto rounded-xl px-5 py-3 text-center text-sm font-semibold tracking-wide text-white shadow-md transition ring-1 ring-blue-500/30
                ${
                  loading || eligible === false
                    ? "bg-blue-500/60 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-[1px] active:translate-y-0"
                }`}
              >
                {loading
                  ? "Redirigiendo…"
                  : "ACTIVA 100 CONVERSACIONES X MES GRATIS"}{" "}
                <FaArrowRight className="ml-1 inline-block" />
              </button>
              {eligible === false && (
                <p className="mt-2 text-xs text-rose-600">
                  Ya usaste tu prueba gratuita.
                </p>
              )}
              <p className="mt-2 text-[11px] text-slate-500">
                Al finalizar el periodo de prueba se activará el plan y se
                realizará el cobro automático, salvo cancelación previa.
              </p>

              {/* Panel de confianza Stripe (features 2×2) */}
              <StripeTrustPanel />
            </div>
          </div>

          {/* Visual */}
          <div className="relative z-10 md:self-start">
            <HeroShowcase />

            <div className="mt-8 sm:mt-10 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                ¿Qué ofrecemos?
              </h3>
              <ul className="mt-4 sm:mt-5 space-y-3 text-sm">
                <CheckItem>
                  Sincronizá tu <b>WhatsApp Business</b> para gestionar chats en
                  tiempo real y aprovechar automatizaciones y plantillas.
                </CheckItem>
                <CheckItem>
                  Automatizá respuestas con <b>IA</b> (conversation AI):
                  responde al instante 24/7 y gestiona consultas.
                </CheckItem>
                <CheckItem>
                  Centralizá todo: bandejas, etiquetas, estadísticos básicos y
                  envíos masivos.
                </CheckItem>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingTrial;
