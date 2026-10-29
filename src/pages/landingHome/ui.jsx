import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  FiMessageCircle,
  FiCpu,
  FiColumns,
  FiCalendar,
  FiShoppingCart,
  FiSend,
  FiUsers,
  FiStar,
  FiBarChart2,
  FiCheck,
  FiX,
  FiShield,
  FiZap,
  FiGlobe,
  FiLink,
  FiPlus,
  FiMinus,
  FiLock,
  FiLayers,
  FiClock,
  FiDatabase,
  FiFileText,
} from "react-icons/fi";
import {
  FaWhatsapp,
  FaInstagram,
  FaFacebookMessenger,
  FaTiktok,
  FaShopify,
  FaGoogle,
  FaStripe,
  FaMeta,
} from "react-icons/fa6";

/* Paleta de marca (ver skill marca-imporfactory). La landing es oscura de
 * punta a punta: el fondo base es más profundo que el navy de marca para que
 * las tarjetas navy floten sobre él. */
export const NAVY = "#0B1426";
export const MID = "#162A4A";
export const CYAN = "#00BFFF";
export const FONDO = "#060b16";
/* Tinte apenas más claro para alternar secciones y que el scroll respire. */
export const FONDO2 = "#0a1326";

/* Aparece al entrar en pantalla. `once` evita que parpadee al hacer scroll. */
export const Reveal = ({ children, delay = 0, y = 24, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

/* Palabra que gira en el titular. Se dibuja en bloque para que el cambio de
 * ancho no mueva el resto del título. */
export const PalabraGiratoria = ({ palabras, intervalo = 2300, className = "" }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % palabras.length), intervalo);
    return () => clearInterval(t);
  }, [palabras.length, intervalo]);
  return (
    <span className={`block relative h-[1.3em] -mb-[0.12em] overflow-hidden whitespace-nowrap ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={palabras[i]}
          initial={{ y: "70%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-70%", opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="block pb-[0.15em] leading-[1.15] bg-gradient-to-r from-cyan-200 via-[#00BFFF] to-sky-400 bg-clip-text text-transparent"
        >
          {palabras[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

/* Contador que sube desde cero cuando entra en pantalla. */
export const Contador = ({ hasta, prefijo = "", sufijo = "", duracion = 1600, className = "" }) => {
  const ref = useRef(null);
  const visible = useInView(ref, { once: true, margin: "-40px" });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let raf;
    const t0 = performance.now();
    const paso = (t) => {
      const p = Math.min(1, (t - t0) / duracion);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(hasta * e));
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [visible, hasta, duracion]);
  return (
    <span ref={ref} className={className}>
      {prefijo}
      {v.toLocaleString("es-EC")}
      {sufijo}
    </span>
  );
};

export const Etiqueta = ({ children }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
    style={{ color: CYAN, background: "rgba(0,191,255,0.08)", border: "1px solid rgba(0,191,255,0.25)" }}
  >
    {children}
  </span>
);

export const TituloSeccion = ({ etiqueta, titulo, sub, alinear = "center", className = "" }) => (
  <Reveal className={`max-w-3xl ${alinear === "center" ? "mx-auto text-center" : ""} mb-14 sm:mb-16 ${className}`}>
    {etiqueta && (
      <div className="mb-5">
        <Etiqueta>{etiqueta}</Etiqueta>
      </div>
    )}
    <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold tracking-[-0.03em] leading-[1.25] text-white">
      {titulo}
    </h2>
    {sub && <p className="mt-5 text-base sm:text-lg leading-relaxed text-slate-400">{sub}</p>}
  </Reveal>
);

/* Texto con degradado cyan, para resaltar una parte del titular. */
export const Resalte = ({ children }) => (
  <span className="bg-gradient-to-r from-cyan-200 via-[#00BFFF] to-sky-400 bg-clip-text text-transparent">{children}</span>
);

export const BotonPrimario = ({ children, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`group relative inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold text-[#06111f] transition-all duration-300 hover:-translate-y-0.5 ${className}`}
    style={{
      background: `linear-gradient(135deg, #67e8f9, ${CYAN} 55%, #0ea5e9)`,
      boxShadow: "0 0 0 1px rgba(0,191,255,0.35), 0 12px 40px rgba(0,191,255,0.35)",
    }}
  >
    {children}
    <span className="transition-transform group-hover:translate-x-0.5">→</span>
  </button>
);

export const BotonSecundario = ({ children, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold text-white transition-all duration-300 hover:bg-white/10 ${className}`}
    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(12px)" }}
  >
    {children}
  </button>
);

/* Sello de Meta Business Partner: píldora negra con el logo de Meta, como
 * la muestran los partners en sus webs. */
export const SelloMeta = ({ compacto = false, className = "" }) => (
  <div
    className={`inline-flex items-center gap-2 rounded-full ${compacto ? "px-3 py-1.5" : "px-4 py-2.5"} ${className}`}
    style={{
      background: "rgba(6,11,22,0.85)",
      border: "1px solid rgba(255,255,255,0.14)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
      backdropFilter: "blur(14px)",
    }}
  >
    <FaMeta size={compacto ? 16 : 20} color="#4FA3FF" />
    <span className={`${compacto ? "text-[11px]" : "text-[13px]"} font-bold text-white whitespace-nowrap`}>
      Meta Business Partner
    </span>
  </div>
);

/* Tarjeta de vidrio oscuro, el bloque base de toda la landing. */
export const Vidrio = ({ children, className = "", brillo = false, style }) => (
  <div
    className={`relative rounded-3xl overflow-hidden ${className}`}
    style={{
      background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
      border: `1px solid ${brillo ? "rgba(0,191,255,0.35)" : "rgba(255,255,255,0.08)"}`,
      boxShadow: brillo ? "0 0 60px rgba(0,191,255,0.12), inset 0 1px 0 rgba(255,255,255,0.08)" : "inset 0 1px 0 rgba(255,255,255,0.05)",
      ...style,
    }}
  >
    {children}
  </div>
);

/* Icono dentro de un cuadrado con brillo cyan. */
export const Cubo = ({ k, size = 44, icono = 20 }) => (
  <div
    className="grid place-items-center rounded-2xl shrink-0"
    style={{
      width: size,
      height: size,
      background: "linear-gradient(180deg, rgba(0,191,255,0.18), rgba(0,191,255,0.05))",
      border: "1px solid rgba(0,191,255,0.3)",
      boxShadow: "0 0 24px rgba(0,191,255,0.18), inset 0 1px 0 rgba(255,255,255,0.1)",
    }}
  >
    <Icono k={k} size={icono} />
  </div>
);

/* Franja que corre en horizontal. El contenido se duplica para que el bucle
 * no muestre un hueco. */
export const Marquesina = ({ items, render, duracion = 40, reverso = false, gap = "gap-4" }) => (
  <div className="relative overflow-hidden w-full [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
    <div className={`flex w-max ${gap}`} style={{ animation: `lh-marquee ${duracion}s linear infinite${reverso ? " reverse" : ""}` }}>
      {[...items, ...items].map((it, i) => (
        <React.Fragment key={i}>{render(it, i)}</React.Fragment>
      ))}
    </div>
  </div>
);

/* Iconos de capacidades e integraciones por clave. */
const ICONOS = {
  chat: FiMessageCircle,
  robot: FiCpu,
  kanban: FiColumns,
  calendar: FiCalendar,
  cart: FiShoppingCart,
  send: FiSend,
  users: FiUsers,
  star: FiStar,
  chart: FiBarChart2,
  shield: FiShield,
  bolt: FiZap,
  globe: FiGlobe,
  link: FiLink,
  check: FiCheck,
  x: FiX,
  plus: FiPlus,
  minus: FiMinus,
  lock: FiLock,
  layers: FiLayers,
  clock: FiClock,
  db: FiDatabase,
  file: FiFileText,
};

export const Icono = ({ k, size = 20, color = CYAN, className = "" }) => {
  const C = ICONOS[k] || FiZap;
  return <C size={size} color={color} className={className} />;
};

/* Marcas de integraciones. Las que no tienen icono de marca usan una letra. */
const MARCAS = {
  whatsapp: { I: FaWhatsapp, c: "#25D366" },
  instagram: { I: FaInstagram, c: "#E4405F" },
  messenger: { I: FaFacebookMessenger, c: "#0084FF" },
  tiktok: { I: FaTiktok, c: "#ffffff" },
  shopify: { I: FaShopify, c: "#95BF47" },
  google: { I: FaGoogle, c: "#4285F4" },
  stripe: { I: FaStripe, c: "#8b86ff" },
  meta: { I: FaMeta, c: "#4FA3FF" },
};

export const Marca = ({ k, nombre, size = 18 }) => {
  const m = MARCAS[k];
  if (m) {
    const C = m.I;
    return <C size={size} color={m.c} />;
  }
  return (
    <span
      className="grid place-items-center rounded-md font-extrabold text-white"
      style={{ width: size, height: size, fontSize: size * 0.6, background: "rgba(0,191,255,0.18)" }}
    >
      {nombre.charAt(0)}
    </span>
  );
};

/* Halo de luz para colocar detrás de un bloque. */
export const Halo = ({ className = "", color = "rgba(0,191,255,0.22)", size = 700 }) => (
  <div
    className={`absolute pointer-events-none ${className}`}
    style={{ width: size, height: size, background: `radial-gradient(circle, ${color}, transparent 62%)`, filter: "blur(20px)" }}
  />
);

export const Estilos = () => (
  <style>{`
    @keyframes lh-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    @keyframes lh-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    @keyframes lh-pulse-ring { 0% { transform: scale(0.9); opacity: 0.7; } 100% { transform: scale(1.6); opacity: 0; } }
    @keyframes lh-orbita { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes lh-contra { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
    @keyframes lh-brillo { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
    @keyframes lh-kenburns { 0% { transform: scale(1) translate(0, 0); } 100% { transform: scale(1.1) translate(-1.5%, -2%); } }
    @keyframes lh-scan { 0% { top: -20%; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { top: 110%; opacity: 0; } }
    @keyframes lh-parpadeo { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
    @keyframes lh-barra { 0%,100% { height: 3px; } 50% { height: 12px; } }
    .lh-barra { height: 3px; animation: lh-barra 0.9s ease-in-out infinite; }
    .lh-float { animation: lh-float 4s ease-in-out infinite; }
    .lh-kenburns { animation: lh-kenburns 14s ease-in-out infinite alternate; }
    .lh-scan { animation: lh-scan 6s linear infinite; }
    .lh-parpadeo { animation: lh-parpadeo 1.6s ease-in-out infinite; }
    .lh-ring::after { content: ""; position: absolute; inset: 0; border-radius: inherit; border: 1px solid rgba(0,191,255,0.6); animation: lh-pulse-ring 2.4s ease-out infinite; }
    .lh-orbita { animation: lh-orbita 40s linear infinite; }
    .lh-contra { animation: lh-contra 40s linear infinite; }
    .lh-brillo { animation: lh-brillo 3s ease-in-out infinite; }
    .lh-grano { opacity: 0.07; mix-blend-mode: overlay; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>"); background-size: 160px 160px; }
    .lh-grid { background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px); background-size: 56px 56px; }
    @media (prefers-reduced-motion: reduce) {
      .lh-float, .lh-orbita, .lh-contra, .lh-brillo, .lh-kenburns, .lh-scan, .lh-parpadeo, .lh-barra { animation: none; }
    }
  `}</style>
);
