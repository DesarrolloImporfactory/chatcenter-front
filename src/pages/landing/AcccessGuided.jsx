import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaUserPlus,
  FaSignInAlt,
  FaTimes,
  FaArrowLeft,
  FaArrowRight,
  FaPlayCircle,
  FaLock,
  FaCheckCircle,
} from "react-icons/fa";

/* =========================================================
   Utils
========================================================= */

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useEffect : () => {};

const useSpotlight = (targetRef, deps = []) => {
  const [rect, setRect] = useState(null);
  const update = useCallback(() => {
    if (!targetRef?.current || typeof window === "undefined") return;
    const r = targetRef.current.getBoundingClientRect();
    const margin = 10;
    setRect({
      top: Math.max(8, r.top - margin + window.scrollY),
      left: Math.max(8, r.left - margin + window.scrollX),
      width: r.width + margin * 2,
      height: r.height + margin * 2,
      centerX: r.left + r.width / 2 + window.scrollX,
      centerY: r.top + r.height / 2 + window.scrollY,
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

/* =========================================================
   Spotlight con transiciones
========================================================= */

const Spotlight = ({ rect }) => {
  if (!rect) return null;
  const haloPad = 28;
  return (
    <>
      {/* halo suave */}
      <div
        className="fixed z-[60] pointer-events-none transition-[top,left,width,height] duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{
          top: rect.top - haloPad,
          left: rect.left - haloPad,
          width: rect.width + haloPad * 2,
          height: rect.height + haloPad * 2,
          background:
            "radial-gradient(60% 60% at 50% 50%, rgba(147,197,253,.55) 0%, rgba(129,140,248,.35) 35%, rgba(255,255,255,0) 70%)",
          filter: "blur(6px)",
        }}
      />
      {/* anillo */}
      <div
        className="fixed z-[61] pointer-events-none rounded-xl ring-2 ring-offset-[3px] ring-offset-white transition-[top,left,width,height] duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          boxShadow:
            "0 12px 40px rgba(59,130,246,.28), inset 0 0 0 1px rgba(255,255,255,.9)",
          borderRadius: 14,
          border: "1px solid rgba(99,102,241,.35)",
        }}
      />
      {/* pulso */}
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

/* =========================================================
   Balloon / Sheet responsive con animaciones
========================================================= */

const Balloon = ({ rect, children, placement = "auto", offset = 16 }) => {
  if (!rect || typeof window === "undefined") return null;

  const isMobile = window.innerWidth < 640;

  if (isMobile) {
    // Bottom sheet en mobile
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

  // Desktop/tablet: globo con flecha y transición
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
    style.left = Math.min(rect.left, window.scrollX + rect.vw - 420);
    anchorX = rect.left + 24;
    anchorY = rect.top + rect.height;
  } else if (place === "top") {
    style.top = Math.max(8, rect.top - offset - 220);
    style.left = Math.min(rect.left, window.scrollX + rect.vw - 420);
    anchorX = rect.left + 24;
    anchorY = rect.top;
  } else if (place === "right") {
    style.top = Math.max(8, rect.top);
    style.left = rect.left + rect.width + offset;
    anchorX = rect.left + rect.width;
    anchorY = rect.top + 20;
  } else {
    style.top = Math.max(8, rect.top);
    style.left = Math.max(8, rect.left - offset - 400);
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
    tipX = balloonX + 400;
    tipY = balloonY + 22;
  }

  return (
    <>
      {/* Conector con animación de trazo */}
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

      {/* Globo */}
      <div
        className="fixed z-[71] max-w-[440px] rounded-2xl bg-white/95 p-4 text-sm text-slate-700 ring-1 ring-slate-200 shadow-[0_30px_80px_rgba(2,6,23,.25)] backdrop-blur animate-[floatUp_.22s_ease-out]"
        style={style}
        role="dialog"
        aria-live="polite"
      >
        {children}
      </div>
    </>
  );
};

/* =========================================================
   Gráfico de proceso premium (curva + milestones + partícula)
========================================================= */

const ProcessFlow = ({ steps = [], currentIndex = 0, innerRef }) => {
  const pathRef = useRef(null);
  const svgRef = useRef(null);
  const [len, setLen] = useState(1);
  const [points, setPoints] = useState([]);
  const [dot, setDot] = useState({ x: 0, y: 0 });

  const viewW = 800;
  const viewH = 220;

  // Curva (de izquierda a derecha con sutiles ondulaciones)
  const d = `M 40 ${viewH - 60}
             C ${viewW * 0.25} ${viewH - 20},
               ${viewW * 0.35} 60,
               ${viewW * 0.5} 80
             S ${viewW * 0.75} ${viewH - 20},
               ${viewW - 40} 60`;

  const pct =
    steps.length > 1 ? currentIndex / (steps.length - 1) : 0;

  // Calcular longitud y posiciones de milestones + partícula
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const L = path.getTotalLength();
    setLen(L);

    const pts = steps.map((_, i) => {
      const p = steps.length > 1 ? i / (steps.length - 1) : 0;
      const pt = path.getPointAtLength(L * p);
      return { x: pt.x, y: pt.y };
    });
    setPoints(pts);

    const active = path.getPointAtLength(L * pct);
    setDot({ x: active.x, y: active.y });
  }, [steps, pct]);

  // Recalcular en resize (por si cambia el tamaño del SVG)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      const path = pathRef.current;
      if (!path) return;
      const L = path.getTotalLength();
      setLen(L);
      const pts = steps.map((_, i) => {
        const p = steps.length > 1 ? i / (steps.length - 1) : 0;
        const pt = path.getPointAtLength(L * p);
        return { x: pt.x, y: pt.y };
      });
      setPoints(pts);
      const active = path.getPointAtLength(L * pct);
      setDot({ x: active.x, y: active.y });
    };
    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [steps, pct]);

  return (
    <div ref={innerRef} className="w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full h-[220px] md:h-[240px] lg:h-[260px]"
        role="img"
        aria-label="Proceso de registro"
      >
        <defs>
          <linearGradient id="pfTrack" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(203,213,225,.8)" />
            <stop offset="100%" stopColor="rgba(203,213,225,.4)" />
          </linearGradient>
          <linearGradient id="pfGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="pfGlow">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="rgba(99,102,241,.35)" />
          </filter>
        </defs>

        {/* Fondo sutil */}
        <rect
          x="0"
          y="0"
          width={viewW}
          height={viewH}
          fill="url(#bgGrid)"
          opacity="0.08"
        />
        <defs>
          <pattern id="bgGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(2,6,23,.55)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Path base */}
        <path
          d={d}
          fill="none"
          stroke="url(#pfTrack)"
          strokeWidth="7"
          strokeLinecap="round"
          filter="url(#pfGlow)"
        />

        {/* Path de progreso (animado) */}
        <path
          ref={pathRef}
          d={d}
          fill="none"
          stroke="url(#pfGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          pathLength={len || 1}
          style={{
            strokeDasharray: len,
            strokeDashoffset: (len || 1) * (1 - pct),
            transition: "stroke-dashoffset .6s cubic-bezier(.22,1,.36,1)",
            filter: "url(#pfGlow)",
          }}
        />

        {/* Milestones */}
        {points.map((p, i) => {
          const done = i <= currentIndex;
          return (
            <g key={i} transform={`translate(${p.x}, ${p.y})`}>
              <circle
                r={10}
                fill={done ? "url(#pfGrad)" : "white"}
                stroke={done ? "rgba(99,102,241,.7)" : "rgba(148,163,184,1)"}
                strokeWidth={done ? 2 : 1}
                filter="url(#pfGlow)"
              />
              <text
                y={-16}
                textAnchor="middle"
                className="fill-slate-700"
                style={{ fontSize: 11, fontWeight: 700 }}
              >
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* Partícula */}
        <g transform={`translate(${dot.x}, ${dot.y})`}>
          <circle r="5.5" fill="white" />
          <circle r="5.5" fill="url(#pfGrad)" opacity=".9">
            <animate
              attributeName="r"
              values="4;6;4"
              dur="1.6s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      </svg>

      {/* Leyendas */}
      <div className="mt-2 grid grid-cols-5 gap-2 text-[12px] text-slate-600">
        {steps.map((s) => (
          <div key={s.key} className="truncate text-center">{s.label}</div>
        ))}
      </div>
    </div>
  );
};

/* =========================================================
   BigChoiceCard (XL, empresarial)
========================================================= */

const BigChoiceCard = ({
  innerRef,
  tone = "primary",
  icon: Icon,
  title,
  subtitle,
  bullets = [],
  ctaLabel,
  onClick,
}) => {
  const isPrimary = tone === "primary";

  return (
    <div ref={innerRef} className="relative h-full">
      {/* Glow / borde */}
      <div
        aria-hidden
        className={[
          "absolute -inset-[1px] -z-10 rounded-3xl blur-[14px] opacity-90",
          isPrimary
            ? "bg-gradient-to-br from-sky-600 via-indigo-500 to-sky-600"
            : "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-200",
        ].join(" ")}
      />
      <div
        className={[
          "relative flex h-full min-h-[440px] md:min-h-[480px] 2xl:min-h-[520px] flex-col justify-between",
          "rounded-[28px] bg-white/95 p-7 sm:p-8 ring-1 ring-slate-200",
          "shadow-[0_30px_100px_rgba(2,6,23,.12)] backdrop-blur",
        ].join(" ")}
      >
        {/* Decor superior */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-44 w-56 opacity-90"
          style={{
            clipPath: "polygon(55% 0, 100% 0, 100% 100%, 10% 100%)",
            background:
              "radial-gradient(60% 80% at 70% 10%, rgba(59,130,246,.18) 0%, rgba(99,102,241,.07) 60%, transparent 85%)",
          }}
        />
        {/* Grid sutil */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[28px] opacity-[.12]"
          style={{
            background:
              "linear-gradient(transparent 0, transparent 22px, rgba(2,6,23,.6) 23px), linear-gradient(90deg, transparent 0, transparent 22px, rgba(2,6,23,.6) 23px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(120% 100% at 80% 0%, black 30%, transparent 70%)",
          }}
        />

        {/* Header */}
        <div className="flex items-start gap-4">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900/5 ring-1 ring-slate-200">
            <Icon className="text-slate-700 text-3xl" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[24px] sm:text-[26px] font-semibold tracking-tight text-slate-900">
                {title}
              </h3>
              {isPrimary && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Recomendado
                </span>
              )}
            </div>
            {subtitle && (
              <p className="mt-1 text-[14px] leading-6 text-slate-600">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Contenido */}
        {bullets.length > 0 && (
          <ul className="mt-5 space-y-3">
            {bullets.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[15px] text-slate-700"
              >
                <span className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        {/* CTA */}
        <div className="mt-8">
          <button
            onClick={onClick}
            className={[
              "group inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-semibold tracking-wide ring-1 transition",
              isPrimary
                ? "bg-gradient-to-b from-indigo-600 to-indigo-500 text-white ring-indigo-500/30 hover:brightness-110"
                : "bg-white text-slate-900 ring-slate-200 hover:bg-slate-50",
            ].join(" ")}
            aria-label={ctaLabel || title}
          >
            {ctaLabel || "Continuar"}
            <span className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   Vista principal
========================================================= */

const AccessGuided = ({
  onCreate,
  onLogin,
  createHref = "/registro",
  loginHref = "/login",
  brand = "Imporchat",
  tourOnFirstLoad = true,
  forceTour = false,
}) => {
  // refs para spotlight / tour
  const heroRef = useRef(null);
  const createRef = useRef(null);
  const loginRef = useRef(null);
  const processRef = useRef(null);

  const go = useCallback((href) => {
    if (href && typeof window !== "undefined") window.location.assign(href);
  }, []);

  // Pasos del proceso (para el gráfico)
  const processSteps = useMemo(
    () => [
      { key: "inicio", label: "Inicio" },
      { key: "registro", label: "Registro" },
      { key: "verificacion", label: "Verificación" },
      { key: "config", label: "Configuración" },
      { key: "listo", label: "Listo" },
    ],
    []
  );
  const [processIndex, setProcessIndex] = useState(0);

  const handleCreate = useCallback(() => {
    // Animá a "Registro" y navegá
    setProcessIndex(1);
    if (onCreate) return onCreate();
    setTimeout(() => go(createHref), 380);
  }, [onCreate, createHref, go]);

  const handleLogin = useCallback(() => {
    // Para login mostramos proceso completo
    setProcessIndex(processSteps.length - 1);
    if (onLogin) return onLogin();
    setTimeout(() => go(loginHref), 280);
  }, [onLogin, loginHref, go, processSteps.length]);

  /* ---------- TOUR ---------- */
  const [tourOpen, setTourOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const dismissed =
      typeof window !== "undefined" &&
      localStorage.getItem("access.tour.dismissed") === "1";
    if (forceTour) setTourOpen(true);
    else if (tourOnFirstLoad && !dismissed) setTourOpen(true);
  }, [tourOnFirstLoad, forceTour]);

  const tourSteps = useMemo(
    () => [
      {
        key: "hero",
        ref: heroRef,
        title: `Bienvenido a ${brand}`,
        body: "Elegí tu camino. La guía resalta los puntos clave y es 100% responsive.",
        placement: "auto",
      },
      {
        key: "create",
        ref: createRef,
        title: "Crear una nueva cuenta",
        body: "Empezá acá si es tu primera vez. Onboarding guiado, alta rápida y segura.",
        placement: "auto",
      },
      {
        key: "login",
        ref: loginRef,
        title: "Ya tengo una cuenta",
        body: "Si ya tenés credenciales o SSO, ingresá y continuá donde lo dejaste.",
        placement: "auto",
      },
      {
        key: "process",
        ref: processRef,
        title: "Progreso del proceso",
        body: "Esta curva muestra el avance del registro/verificación. Avanza cuando iniciás el alta.",
        placement: "auto",
      },
    ],
    [brand]
  );

  const currentRef = tourSteps[step]?.ref || null;
  const { rect } = useSpotlight(currentRef, [tourOpen, step, currentRef]);

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

  // Sync proceso según ruta
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = window.location.pathname || "";
    if (p.includes("/registro")) setProcessIndex(1);
    else if (p.includes("/login") || p.includes("/ingresar"))
      setProcessIndex(processSteps.length - 1);
    else setProcessIndex(0);
  }, [processSteps.length]);

  const handleSkip = useCallback(() => {
    if (dontShowAgain && typeof window !== "undefined")
      localStorage.setItem("access.tour.dismissed", "1");
    setTourOpen(false);
  }, [dontShowAgain]);

  const handleNext = useCallback(() => {
    setStep((s) => {
      if (s + 1 < tourSteps.length) return s + 1;
      if (dontShowAgain && typeof window !== "undefined")
        localStorage.setItem("access.tour.dismissed", "1");
      setTourOpen(false);
      return s;
    });
  }, [tourSteps.length, dontShowAgain]);

  const handlePrev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  const tourProgressPct = Math.round(
    ((step + (tourOpen ? 1 : 0)) / tourSteps.length) * 100
  );

  /* ---------- Layout ---------- */
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Fondo premium */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 40% at 20% 20%, rgba(99,102,241,.10) 0%, rgba(99,102,241,0) 60%), radial-gradient(50% 40% at 80% 10%, rgba(59,130,246,.10) 0%, rgba(59,130,246,0) 55%), linear-gradient(transparent 0, transparent 22px, rgba(2,6,23,.035) 23px), linear-gradient(90deg, transparent 0, transparent 22px, rgba(2,6,23,.035) 23px)",
          backgroundSize: "100% 100%, 100% 100%, 24px 24px, 24px 24px",
        }}
      />

      {/* ===== Hero (grande + ProcessFlow) ===== */}
      <header className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10 pt-8 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
              <FaPlayCircle className="text-indigo-600" />
              Inicio rápido
            </div>
            <h1
              ref={heroRef}
              className="mt-3 text-4xl sm:text-5xl md:text-6xl font-black leading-[1.02] tracking-tight text-slate-900"
            >
              Continuá en{" "}
              <span className="bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
                {brand}
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-slate-600">
              Elegí tu camino. Sin fricción. Con métricas y seguridad
              empresarial.
            </p>

            {/* chips confianza */}
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[12px] text-slate-700 ring-1 ring-slate-200 shadow-sm">
                <FaLock /> Cifrado TLS 1.2+
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[12px] text-slate-700 ring-1 ring-slate-200 shadow-sm">
                <FaCheckCircle /> OWASP Practices
              </span>
            </div>
          </div>

          {/* Gráfico de proceso (ocupa espacio) */}
          <div className="lg:col-span-7 flex items-start justify-end">
            <div className="w-full" ref={processRef}>
              <ProcessFlow
                steps={processSteps}
                currentIndex={processIndex}
              />
              <div className="mt-2 text-right text-[12px] text-slate-500">
                Cambiará a <strong>Registro</strong> al iniciar tu alta.
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== Principal ===== */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 sm:px-6 lg:px-10 pb-10 pt-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
          {/* Columna izquierda informativa */}
          <section className="xl:col-span-4">
            <div className="rounded-2xl bg-white/80 ring-1 ring-slate-200 p-6 backdrop-blur h-full">
              <h2 className="text-xl font-semibold text-slate-900">
                Elegí cómo querés continuar
              </h2>
              <p className="mt-3 text-[15px] leading-7 text-slate-600">
                Dos caminos, mismo objetivo: empezar a trabajar. Podés cambiar
                de opción cuando quieras. La <strong>visita guiada</strong> te
                acompaña paso a paso y es totalmente responsive.
              </p>

              {/* En mobile, repetimos proceso en versión compacta */}
              <div className="mt-6 grid grid-cols-1 gap-4 lg:hidden">
                <ProcessFlow steps={processSteps} currentIndex={processIndex} />
              </div>
            </div>
          </section>

          {/* Columna derecha con 2 cards XL */}
          <section className="xl:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              <BigChoiceCard
                innerRef={createRef}
                icon={FaUserPlus}
                title="Crear una nueva cuenta"
                subtitle="Onboarding guiado, activación en minutos y soporte prioritario."
                bullets={[
                  "Alta asistida y verificación segura",
                  "Configuración inicial en 2 minutos",
                  "Soporte prioritario en el alta",
                ]}
                tone="primary"
                ctaLabel="Crear cuenta"
                onClick={handleCreate}
              />
              <BigChoiceCard
                innerRef={loginRef}
                icon={FaSignInAlt}
                title="Ya tengo una cuenta"
                subtitle="Ingresá con tus credenciales o SSO para continuar donde lo dejaste."
                bullets={[
                  "Inicio rápido y seguro",
                  "Dispositivos confiables y recordatorio",
                  "Recuperación de acceso asistida",
                ]}
                tone="neutral"
                ctaLabel="Iniciar sesión"
                onClick={handleLogin}
              />
            </div>
          </section>
        </div>
      </main>

      {/* ===== Barra sticky mobile ===== */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto max-w-[1600px] px-4 py-3 grid grid-cols-2 gap-3">
          <button
            onClick={handleLogin}
            className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Ingresar
          </button>
          <button
            onClick={handleCreate}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-indigo-600 to-indigo-500 px-4 py-3 text-sm font-semibold text-white ring-1 ring-indigo-500/30 hover:brightness-110"
          >
            Crear cuenta
          </button>
        </div>
      </div>

      {/* ===== Visita guiada (responsive + animada) ===== */}
      {tourOpen && (
        <>
          <Spotlight rect={rect} />
          {rect && (
            <Balloon rect={rect} placement={tourSteps[step]?.placement || "auto"}>
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
                  <div className="rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                    {tourProgressPct}% completo
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">Atajos: ← → • Esc</div>
              </div>

              {/* Controles */}
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-800"
                  aria-label="Omitir guía"
                >
                  <FaTimes />
                  Omitir
                </button>

                <div className="flex items-center gap-2">
                  {step === tourSteps.length - 1 && (
                    <label className="mr-2 inline-flex items-center gap-2 text-[12px] text-slate-600">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-indigo-600"
                        checked={dontShowAgain}
                        onChange={(e) => setDontShowAgain(e.target.checked)}
                      />
                      No volver a mostrar
                    </label>
                  )}

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
                    <FaArrowLeft />
                    Atrás
                  </button>

                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-indigo-600 to-indigo-500 px-3 py-1.5 text-[12px] font-semibold text-white ring-1 ring-indigo-500/30 hover:brightness-110"
                    aria-label={step === tourSteps.length - 1 ? "Terminar" : "Siguiente"}
                    title="Siguiente (→)"
                  >
                    {step === tourSteps.length - 1 ? "Terminar" : "Siguiente"}
                    <FaArrowRight />
                  </button>
                </div>
              </div>
            </Balloon>
          )}
        </>
      )}
    </div>
  );
};

export default AccessGuided;
