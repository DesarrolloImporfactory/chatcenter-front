import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { registerThunk } from "../../store/slices/user.slice";
import { useNavigate } from "react-router-dom";
import {
  FaUserPlus,
  FaTimes,
  FaArrowLeft,
  FaArrowRight,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaPlayCircle,
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
      <div className="fixed inset-x-0 bottom-2 z-[73] px-3" role="dialog" aria-live="polite">
        <div className="mx-auto max-w-md rounded-2xl bg-white/95 p-4 text-sm text-slate-700 ring-1 ring-slate-200 shadow-[0_20px_60px_rgba(2,6,23,.35)] backdrop-blur animate-[sheetIn_.24s_ease-out]">
          {children}
        </div>
      </div>
    );
  }

  // Desktop/tablet: globo con flecha y transición
  const spaceBelow = rect.top + rect.height + offset + 240 < window.scrollY + rect.vh;
  const spaceAbove = rect.top - offset - 240 > window.scrollY;
  const spaceRight = rect.left + rect.width + offset + 400 < window.scrollX + rect.vw;
  let place = placement;
  if (placement === "auto") {
    if (spaceRight) place = "right";
    else if (spaceBelow) place = "bottom";
    else if (spaceAbove) place = "top";
    else place = "left";
  }

  const style = { transition: "top .28s cubic-bezier(.22,1,.36,1), left .28s cubic-bezier(.22,1,.36,1)" };
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
  if (place === "bottom") { tipX = balloonX + 22; tipY = balloonY; }
  else if (place === "top") { tipX = balloonX + 22; tipY = balloonY + 220; }
  else if (place === "right") { tipX = balloonX; tipY = balloonY + 22; }
  else if (place === "left") { tipX = balloonX + 400; tipY = balloonY + 22; }

  return (
    <>
      {/* Conector con animación de trazo */}
      <svg className="fixed z-[72] pointer-events-none" width="0" height="0" style={{ inset: 0 }}
           viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`} preserveAspectRatio="none">
        <defs>
          <marker id="arrowhead" markerWidth="14" markerHeight="14" refX="10" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="url(#grad)" />
          </marker>
          <linearGradient id="grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="glow">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="rgba(99,102,241,.6)" />
          </filter>
        </defs>
        <path
          d={`M ${tipX} ${tipY} Q ${(tipX + anchorX) / 2} ${(tipY + anchorY) / 2 - 20}, ${anchorX} ${anchorY}`}
          stroke="url(#grad)" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" filter="url(#glow)"
          pathLength="100" style={{ strokeDasharray: 100, strokeDashoffset: 0, animation: "dashDraw .35s ease-out both" }}
        />
      </svg>

      {/* Globo */}
      <div
        className="fixed z-[71] max-w-[440px] rounded-2xl bg-white/95 p-4 text-sm text-slate-700 ring-1 ring-slate-200 shadow-[0_30px_80px_rgba(2,6,23,.25)] backdrop-blur animate-[floatUp_.22s_ease-out]"
        style={style} role="dialog" aria-live="polite"
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

  // Curva (de izquierda a derecha con ondulaciones suaves)
  const d = `M 40 ${viewH - 60}
             C ${viewW * 0.25} ${viewH - 20},
               ${viewW * 0.35} 60,
               ${viewW * 0.5} 80
             S ${viewW * 0.75} ${viewH - 20},
               ${viewW - 40} 60`;

  const pct = steps.length > 1 ? currentIndex / (steps.length - 1) : 0;

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

        {/* Path base */}
        <path d={d} fill="none" stroke="url(#pfTrack)" strokeWidth="7" strokeLinecap="round" filter="url(#pfGlow)" />

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
              <text y={-16} textAnchor="middle" className="fill-slate-700" style={{ fontSize: 11, fontWeight: 700 }}>
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* Partícula */}
        <g transform={`translate(${dot.x}, ${dot.y})`}>
          <circle r="5.5" fill="white" />
          <circle r="5.5" fill="url(#pfGrad)" opacity=".9">
            <animate attributeName="r" values="4;6;4" dur="1.6s" repeatCount="indefinite" />
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
   Input + Helpers
========================================================= */

const Field = ({ label, error, children }) => (
  <label className="block">
    <span className="text-sm font-medium text-slate-800">{label}</span>
    <div className="mt-1">{children}</div>
    {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
  </label>
);

/* =========================================================
   Vista principal (Registro guiado)
========================================================= */

const RegisterGuided = ({
  brand = "Imporchat",
  tourOnFirstLoad = true,
  forceTour = false,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // refs para spotlight / tour
  const heroRef = useRef(null);
  const formRef = useRef(null);
  const pwdRef = useRef(null);
  const submitRef = useRef(null);
  const processRef = useRef(null);

  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  // Timeline (sincronizada con el flujo)
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
  // Esta vista inicia en "Registro"
  const [processIndex, setProcessIndex] = useState(1);

  // Form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setError,
    reset,
  } = useForm({ mode: "onTouched" });

  const pwd = watch("password");

  const onSubmit = async (values) => {
    try {
      setProcessIndex(2); // → Verificación (antes de enviar)
      const result = await dispatch(registerThunk(values));
      // Si tu thunk devuelve error, maneja aquí:
      if (result?.error) {
        setProcessIndex(1);
        setError("root", { message: result.error?.message || "No se pudo registrar" });
        return;
      }
      // Simula config y listo
      setProcessIndex(3); // Configuración
      setTimeout(() => {
        setProcessIndex(4); // Listo
        setTimeout(() => navigate("/login"), 380);
      }, 380);
    } catch (e) {
      setProcessIndex(1);
      setError("root", { message: "Ocurrió un error inesperado" });
    }
  };

  /* ---------- TOUR ---------- */
  const [tourOpen, setTourOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const dismissed =
      typeof window !== "undefined" &&
      localStorage.getItem("register.tour.dismissed") === "1";
    if (forceTour) setTourOpen(true);
    else if (tourOnFirstLoad && !dismissed) setTourOpen(true);
  }, [tourOnFirstLoad, forceTour]);

  const tourSteps = useMemo(
    () => [
      {
        key: "hero",
        ref: heroRef,
        title: `Crea tu cuenta en ${brand}`,
        body: "Completa el formulario. La línea de tiempo te muestra el avance del proceso.",
        placement: "auto",
      },
      {
        key: "form",
        ref: formRef,
        title: "Datos principales",
        body: "Ingresa nombre, usuario, email y responsable. Validamos cada campo al instante.",
        placement: "auto",
      },
      {
        key: "pwd",
        ref: pwdRef,
        title: "Seguridad de la cuenta",
        body: "Crea una contraseña segura. Debe coincidir con la confirmación.",
        placement: "auto",
      },
      {
        key: "submit",
        ref: submitRef,
        title: "Crear cuenta",
        body: "Al enviar, el proceso avanza a Verificación y luego a Listo.",
        placement: "auto",
      },
      {
        key: "process",
        ref: processRef,
        title: "Seguimiento visual",
        body: "La curva muestra tu progreso: Registro → Verificación → Configuración → Listo.",
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

  const handleSkip = useCallback(() => {
    if (dontShowAgain && typeof window !== "undefined")
      localStorage.setItem("register.tour.dismissed", "1");
    setTourOpen(false);
  }, [dontShowAgain]);

  const handleNext = useCallback(() => {
    setStep((s) => {
      if (s + 1 < tourSteps.length) return s + 1;
      if (dontShowAgain && typeof window !== "undefined")
        localStorage.setItem("register.tour.dismissed", "1");
      setTourOpen(false);
      return s;
    });
  }, [tourSteps.length, dontShowAgain]);

  const handlePrev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);
  const tourProgressPct = Math.round(((step + (tourOpen ? 1 : 0)) / tourSteps.length) * 100);

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

      {/* ===== Hero + Process ===== */}
      <header className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10 pt-8 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
              <FaPlayCircle className="text-indigo-600" />
              Registro
            </div>
            <h1
              ref={heroRef}
              className="mt-3 text-4xl sm:text-5xl md:text-6xl font-black leading-[1.02] tracking-tight text-slate-900"
            >
              Crea tu cuenta en{" "}
              <span className="bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
                {brand}
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-slate-600">
              Completa tus datos y avanzá. La línea de tiempo te guía en cada paso.
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

          {/* Gráfico de proceso */}
          <div className="lg:col-span-7 flex items-start justify-end">
            <div className="w-full" ref={processRef}>
              <ProcessFlow steps={processSteps} currentIndex={processIndex} />
              <div className="mt-2 text-right text-[12px] text-slate-500">
                Te encontramos en <strong>Registro</strong>.
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== Contenido principal (Formulario) ===== */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 sm:px-6 lg:px-10 pb-10 pt-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
          {/* Columna izquierda (texto) */}
          <section className="xl:col-span-4">
            <div className="rounded-2xl bg-white/80 ring-1 ring-slate-200 p-6 backdrop-blur h-full">
              <h2 className="text-xl font-semibold text-slate-900">
                Completa tu información
              </h2>
              <p className="mt-3 text-[15px] leading-7 text-slate-600">
                Usamos validaciones en tiempo real para evitar errores y acelerar tu alta.
                Tus datos se guardan de forma segura.
              </p>
            </div>
          </section>

          {/* Columna derecha (formulario) */}
          <section className="xl:col-span-8" ref={formRef}>
            <div className="relative">
              {/* Glow borde */}
              <div
                aria-hidden
                className="absolute -inset-[1px] -z-10 rounded-3xl blur-[14px] opacity-90 bg-gradient-to-br from-sky-600 via-indigo-500 to-sky-600"
              />
              <div className="rounded-[28px] bg-white/95 p-7 sm:p-8 ring-1 ring-slate-200 shadow-[0_30px_100px_rgba(2,6,23,.12)] backdrop-blur">
                <header className="mb-6 flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/5 ring-1 ring-slate-200">
                    <FaUserPlus className="text-slate-700 text-2xl" />
                  </span>
                  <div>
                    <h3 className="text-[24px] sm:text-[26px] font-semibold tracking-tight text-slate-900">
                      Datos de registro
                    </h3>
                    <p className="text-sm text-slate-600">
                      Sólo tomará unos minutos.
                    </p>
                  </div>
                </header>

                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Nombre" error={errors?.nombre?.message}>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="Maria Jose Guango"
                      {...register("nombre", { required: "Este campo es obligatorio" })}
                    />
                  </Field>

                  <Field label="Usuario" error={errors?.usuario?.message}>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="Mjg1816"
                      {...register("usuario", { required: "Este campo es obligatorio" })}
                    />
                  </Field>

                  <Field label="Email" error={errors?.email?.message}>
                    <input
                      type="email"
                      className="w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="123@correo.com"
                      {...register("email", {
                        required: "Este campo es obligatorio",
                        pattern: { value: /\S+@\S+\.\S+/, message: "Email inválido" },
                      })}
                    />
                  </Field>

                  <Field label="Nombre de la empresa" error={errors?.nombre_encargado?.message}>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="Starbucks Shop"
                      {...register("nombre_encargado", { required: "Este campo es obligatorio" })}
                    />
                  </Field>

                  {/* Password */}
                  <div className="md:col-span-2" ref={pwdRef}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field label="Contraseña" error={errors?.password?.message}>
                        <div className="relative">
                          <input
                            type={showPwd ? "text" : "password"}
                            className="w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 pr-12 text-[15px] outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="Mín. 8 caracteres"
                            {...register("password", {
                              required: "Este campo es obligatorio",
                              minLength: { value: 8, message: "Mínimo 8 caracteres" },
                            })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPwd((v) => !v)}
                            className="absolute inset-y-0 right-0 mr-3 inline-flex items-center text-slate-500 hover:text-slate-700"
                            tabIndex={-1}
                            aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showPwd ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </Field>

                      <Field label="Confirmar contraseña" error={errors?.password2?.message}>
                        <div className="relative">
                          <input
                            type={showPwd2 ? "text" : "password"}
                            className="w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 pr-12 text-[15px] outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="Repite tu contraseña"
                            {...register("password2", {
                              required: "Este campo es obligatorio",
                              validate: (v) => v === pwd || "Las contraseñas no coinciden",
                            })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPwd2((v) => !v)}
                            className="absolute inset-y-0 right-0 mr-3 inline-flex items-center text-slate-500 hover:text-slate-700"
                            tabIndex={-1}
                            aria-label={showPwd2 ? "Ocultar confirmación" : "Mostrar confirmación"}
                          >
                            {showPwd2 ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </Field>
                    </div>
                  </div>

                  {/* Error raíz */}
                  {errors?.root?.message && (
                    <div className="md:col-span-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
                      {errors.root.message}
                    </div>
                  )}

                  {/* Submit */}
                  <div className="md:col-span-2" ref={submitRef}>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={[
                        "group inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-semibold tracking-wide ring-1 transition",
                        "bg-gradient-to-b from-indigo-600 to-indigo-500 text-white ring-indigo-500/30 hover:brightness-110 disabled:opacity-60",
                      ].join(" ")}
                    >
                      {isSubmitting ? "Enviando..." : "Crear cuenta"}
                      <span className="transition-transform group-hover:translate-x-0.5">→</span>
                    </button>
                    <p className="mt-2 text-center text-xs text-slate-500">
                      Al continuar aceptas los Términos y la Política de Privacidad.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </section>
        </div>
      </main>

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

export default RegisterGuided;
