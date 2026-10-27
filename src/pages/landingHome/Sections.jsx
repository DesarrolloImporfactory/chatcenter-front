import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu, FiX, FiCheck, FiPlus, FiMinus, FiArrowRight } from "react-icons/fi";
import { FaWhatsapp, FaMeta } from "react-icons/fa6";
import heroFondo from "../../assets/landing/hero-fondo.webp";
import agenteRetrato from "../../assets/landing/agente-retrato.webp";
import metaInfinito from "../../assets/landing/meta-infinito.webp";
import redAutomatizacion from "../../assets/landing/red-automatizacion.webp";
import {
  LOGO_BLANCO,
  PALABRAS_HERO,
  FRANJA,
  PERSONAS,
  SIN_CON,
  CAPACIDADES,
  AGENTE_IA,
  INDUSTRIAS,
  PASOS,
  META_BENEFICIOS,
  INTEGRACIONES,
  PLANES,
  FAQ,
  WHATSAPP_VENTAS,
  CALENDLY_DEMO,
} from "./data";
import {
  NAVY,
  CYAN,
  FONDO,
  FONDO2,
  Reveal,
  PalabraGiratoria,
  Etiqueta,
  TituloSeccion,
  Resalte,
  BotonPrimario,
  BotonSecundario,
  SelloMeta,
  Vidrio,
  Cubo,
  Marquesina,
  Icono,
  Marca,
  Halo,
} from "./ui";
import { Telefono, ChatAnimado, ChatEstatico } from "./HeroPhone";

const ir = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
const agendarDemo = () => window.open(CALENDLY_DEMO, "_blank", "noopener");

const ENLACES = [
  { id: "producto", t: "Producto" },
  { id: "agente", t: "Agente IA" },
  { id: "industrias", t: "Industrias" },
  { id: "planes", t: "Planes" },
  { id: "faq", t: "Preguntas" },
];

/* Sección base: mucho aire arriba y abajo, fondo alternado y, opcional, una
 * cuadrícula sutil que se desvanece hacia los bordes. Las secciones ponen
 * sus halos como hijos directos (la sección es `relative`). */
const Seccion = ({ id, children, className = "", tinte = false, grid = false }) => (
  <section id={id} className={`relative overflow-hidden py-24 sm:py-32 ${className}`} style={{ background: tinte ? FONDO2 : FONDO }}>
    {grid && (
      <div className="absolute inset-0 lh-grid pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]" />
    )}
    {children}
  </section>
);

/* ═══ NAV: isla flotante ═══ */
export const Nav = ({ onLogin, onRegistro }) => {
  const [abierto, setAbierto] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 24);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 px-3 sm:px-5 pt-3 sm:pt-4 pointer-events-none">
        <div
          className="pointer-events-auto mx-auto max-w-6xl rounded-full transition-all duration-500"
          style={{
            background: scrolled ? "rgba(6,11,22,0.82)" : "rgba(6,11,22,0.55)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: scrolled ? "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)" : "inset 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter: "blur(22px) saturate(160%)",
          }}
        >
          <div className="h-[60px] sm:h-16 pl-5 pr-2.5 sm:pl-7 sm:pr-3 flex items-center justify-between gap-6">
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center shrink-0">
              <img src={LOGO_BLANCO} alt="ImporChat" className="h-11 w-auto" />
            </button>

            <nav className="hidden lg:flex items-center gap-0.5">
              {ENLACES.map((e) => (
                <button
                  key={e.id}
                  onClick={() => ir(e.id)}
                  className="px-3.5 py-2 rounded-full text-[13px] font-semibold text-slate-300 hover:text-white hover:bg-white/[0.07] transition"
                >
                  {e.t}
                </button>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-1.5">
              <button onClick={onLogin} className="px-4 py-2 rounded-full text-[13px] font-semibold text-slate-200 hover:text-white hover:bg-white/[0.07] transition">
                Iniciar sesión
              </button>
              <button
                onClick={onRegistro}
                className="px-5 py-2.5 rounded-full text-[13px] font-bold text-[#06111f] transition hover:-translate-y-px"
                style={{ background: `linear-gradient(135deg, #67e8f9, ${CYAN} 55%, #0ea5e9)`, boxShadow: "0 8px 24px rgba(0,191,255,0.35)" }}
              >
                Comenzar gratis
              </button>
            </div>

            <button onClick={() => setAbierto((v) => !v)} className="lg:hidden p-2.5 text-white rounded-full hover:bg-white/10" aria-label="Menú">
              {abierto ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>

          <AnimatePresence>
            {abierto && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="lg:hidden overflow-hidden"
              >
                <div className="px-5 pb-5 pt-1 flex flex-col gap-1 border-t border-white/10">
                  {ENLACES.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        setAbierto(false);
                        ir(e.id);
                      }}
                      className="text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
                    >
                      {e.t}
                    </button>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <button onClick={onLogin} className="flex-1 py-2.5 rounded-full text-sm font-bold text-white border border-white/20">
                      Iniciar sesión
                    </button>
                    <button onClick={onRegistro} className="flex-1 py-2.5 rounded-full text-sm font-bold text-[#06111f]" style={{ background: CYAN }}>
                      Comenzar gratis
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Sello fijo bajo la isla, como lo llevan los partners de Meta. */}
      <div className="hidden md:block fixed top-[92px] right-5 z-40">
        <SelloMeta compacto />
      </div>
    </>
  );
};

/* ═══ HERO ═══ */
const Flotante = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.8 + delay, duration: 0.5 }}
    className={`absolute z-20 lh-float ${className}`}
    style={{ animationDelay: `${delay * 1000}ms` }}
  >
    {children}
  </motion.div>
);

const Tarjeta = ({ children, oscura = false }) => (
  <div
    className="rounded-2xl px-4 py-3"
    style={{
      background: oscura ? "rgba(11,20,38,0.9)" : "rgba(255,255,255,0.97)",
      border: `1px solid ${oscura ? "rgba(0,191,255,0.3)" : "rgba(255,255,255,0.6)"}`,
      boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      backdropFilter: "blur(10px)",
    }}
  >
    {children}
  </div>
);

/* Pedestal bajo el teléfono. Es un objeto con volumen (cara superior de
 * vidrio, canto con grosor, sombra de contacto) sobre un piso con
 * cuadrícula en perspectiva, no un dibujo de anillos flotando. Todo
 * vectorial, por eso no se pixela como el render de fondo. */
const Plataforma = () => (
  <div className="absolute left-1/2 -translate-x-1/2 bottom-[-110px] w-[760px] h-[280px] pointer-events-none" aria-hidden>
    {/* Piso: cuadrícula en perspectiva que se pierde hacia el horizonte */}
    <div
      className="absolute left-1/2 -translate-x-1/2 bottom-[-40px] w-[1400px] h-[420px]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,191,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(0,191,255,0.16) 1px, transparent 1px)",
        backgroundSize: "70px 70px",
        transform: "perspective(520px) rotateX(72deg)",
        transformOrigin: "50% 100%",
        maskImage: "radial-gradient(ellipse 55% 85% at 50% 100%, #000 20%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 55% 85% at 50% 100%, #000 20%, transparent 100%)",
      }}
    />
    {/* Resplandor del piso alrededor del pedestal */}
    <div
      className="absolute left-1/2 -translate-x-1/2 top-[70px] w-[900px] h-[220px] rounded-[50%]"
      style={{ background: "radial-gradient(ellipse at center, rgba(0,191,255,0.38), rgba(0,191,255,0.1) 45%, transparent 70%)", filter: "blur(16px)" }}
    />
    {/* Haz de luz que baja sobre el teléfono */}
    <div
      className="absolute left-1/2 -translate-x-1/2 bottom-[120px] w-[420px] h-[760px] lh-brillo"
      style={{
        background: "linear-gradient(180deg, transparent 0%, rgba(0,191,255,0.05) 45%, rgba(0,191,255,0.22) 100%)",
        clipPath: "polygon(36% 0, 64% 0, 100% 100%, 0 100%)",
        filter: "blur(18px)",
      }}
    />
    {/* Canto del pedestal (grosor) */}
    <div
      className="absolute left-[70px] top-[100px] w-[620px] h-[150px] rounded-[50%]"
      style={{
        background: "linear-gradient(180deg, #0f2240 0%, #081426 55%, #050c18 100%)",
        boxShadow: "0 3px 0 rgba(0,191,255,0.55), 0 0 22px rgba(0,191,255,0.45), 0 26px 40px rgba(0,0,0,0.65)",
      }}
    />
    {/* Cara superior de vidrio */}
    <div
      className="absolute left-[70px] top-[80px] w-[620px] h-[150px] rounded-[50%]"
      style={{
        background:
          "radial-gradient(ellipse at 50% 38%, rgba(0,191,255,0.42) 0%, rgba(14,36,66,0.96) 48%, rgba(9,20,40,0.98) 100%)",
        border: "1px solid rgba(150,235,255,0.75)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), inset 0 0 60px rgba(0,191,255,0.28), 0 0 30px rgba(0,191,255,0.35)",
      }}
    />
    {/* Anillo grabado en la cara superior */}
    <div className="absolute left-[150px] top-[100px] w-[460px] h-[110px] rounded-[50%]" style={{ border: "1px solid rgba(125,230,255,0.45)", boxShadow: "0 0 12px rgba(0,191,255,0.4)" }} />
    {/* Reflejo de luz en el borde frontal */}
    <div
      className="absolute left-[200px] top-[192px] w-[360px] h-[34px] rounded-[50%]"
      style={{ background: "radial-gradient(ellipse at center, rgba(180,240,255,0.5), transparent 70%)", filter: "blur(6px)" }}
    />
    {/* Sombra de contacto del teléfono sobre la cara */}
    <div
      className="absolute left-1/2 -translate-x-1/2 top-[132px] w-[320px] h-[46px] rounded-[50%]"
      style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.7), rgba(0,0,0,0.25) 55%, transparent 75%)", filter: "blur(7px)" }}
    />
  </div>
);

export const Hero = ({ onRegistro }) => (
  <section className="relative overflow-hidden" style={{ background: FONDO }}>
    {/* Fondo en dos capas. El render de IA no tiene resolución para verse
        nítido a pantalla completa, así que va desenfocado a propósito, como
        profundidad de campo. Lo nítido (plataforma, haz de luz, reflejo) se
        dibuja con CSS bajo el teléfono y se ve HD en cualquier pantalla. */}
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ background: `radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,191,255,0.14), transparent 70%), ${FONDO}` }}>
      <div className="absolute inset-x-0 bottom-0 h-[62vw] min-h-[720px] max-h-[1100px] overflow-hidden">
        <img
          src={heroFondo}
          alt=""
          className="w-full h-full object-cover object-top"
          style={{ filter: "blur(7px) saturate(1.15)", transform: "scale(1.06)", opacity: 0.85 }}
        />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${FONDO} 0%, rgba(6,11,22,0.45) 28%, rgba(6,11,22,0.2) 60%, rgba(6,11,22,0.4) 85%, ${FONDO} 100%)` }} />
        <div className="absolute inset-0 lh-grano" />
      </div>
    </div>

    <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-32 sm:pt-40 pb-28 sm:pb-36 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Etiqueta>
          <FaMeta size={13} /> Meta Business Partner oficial
        </Etiqueta>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mt-7 mx-auto max-w-4xl text-[2.1rem] sm:text-5xl lg:text-[68px] font-extrabold text-white tracking-[-0.035em] leading-[1.2]"
      >
        Un agente IA que
        <PalabraGiratoria palabras={PALABRAS_HERO} />
        por WhatsApp, 24/7.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-7 mx-auto max-w-xl text-base sm:text-lg text-slate-300 leading-relaxed"
      >
        WhatsApp, Instagram y Messenger en una sola bandeja, con un agente entrenado con tu negocio. Tú decides cuándo entra una persona.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
      >
        <BotonPrimario onClick={onRegistro} className="uppercase tracking-[0.08em] px-8">
          Comenzar gratis
        </BotonPrimario>
        <BotonSecundario onClick={agendarDemo} className="uppercase tracking-[0.08em] px-8">
          Agendar demo
        </BotonSecundario>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-slate-400"
      >
        {["Sin tarjeta para probar", "Activo en 5 minutos", "Cancela cuando quieras"].map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <FiCheck size={14} color={CYAN} /> {t}
          </span>
        ))}
      </motion.div>

      {/* Teléfono sobre la plataforma + tarjetas flotantes */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.4 }}
        className="relative mt-14 sm:mt-20 flex justify-center"
      >
        <div className="relative">
          <Plataforma />

          <Flotante className="hidden sm:block sm:-left-44 lg:-left-64 top-8" delay={0}>
            <Tarjeta>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: NAVY }}>
                  <Icono k="robot" size={18} color="#38bdf8" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-extrabold text-[#0B1426]">Agente IA activo</p>
                  <p className="text-[9px] text-slate-500">Entrenado con tu catálogo</p>
                </div>
              </div>
            </Tarjeta>
          </Flotante>

          <Flotante className="hidden sm:block sm:-right-44 lg:-right-64 top-36" delay={0.4}>
            <Tarjeta>
              <div className="text-left">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Pedido creado</p>
                <p className="text-[13px] font-extrabold text-[#0B1426] mt-0.5">#48213 · $89,99</p>
                <p className="text-[9px] text-emerald-600 font-semibold">Contra entrega · Dropi</p>
              </div>
            </Tarjeta>
          </Flotante>

          <Flotante className="hidden sm:block sm:-left-48 lg:-left-72 bottom-40" delay={0.8}>
            <Tarjeta oscura>
              <div className="text-left">
                <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-400">Cita agendada</p>
                <p className="text-[12px] font-bold text-white mt-0.5">Jue 15:30 · Dra. Paz</p>
                <p className="text-[9px] text-slate-400">Recordatorio programado</p>
              </div>
            </Tarjeta>
          </Flotante>

          <Flotante className="hidden sm:block sm:-right-40 lg:-right-60 bottom-16" delay={1.2}>
            <Tarjeta>
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 rounded-xl grid place-items-center lh-ring" style={{ background: NAVY }}>
                  <Icono k="bolt" size={16} color="#38bdf8" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-extrabold text-[#0B1426]">Respuesta en 3 s</p>
                  <p className="text-[9px] text-slate-500">A las 2:14 a. m.</p>
                </div>
              </div>
            </Tarjeta>
          </Flotante>

          {/* El reflejo lo hace el navegador (Chrome, Edge, Safari); en
              Firefox simplemente no aparece. */}
          <div className="relative z-10" style={{ WebkitBoxReflect: "below 10px linear-gradient(transparent 70%, rgba(0,0,0,0.32))" }}>
            <Telefono>
              <ChatAnimado />
            </Telefono>
          </div>
        </div>
      </motion.div>
    </div>

    {/* Franja que corre */}
    <div className="relative border-t border-white/[0.06] py-4" style={{ background: "rgba(6,11,22,0.7)", backdropFilter: "blur(10px)" }}>
      <Marquesina
        items={FRANJA}
        duracion={45}
        render={(t, i) => (
          <span key={i} className="inline-flex items-center gap-3 px-5 text-[13px] font-semibold text-slate-300 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: CYAN, boxShadow: `0 0 8px ${CYAN}` }} />
            {t}
          </span>
        )}
      />
    </div>
  </section>
);

/* ═══ PERSONAS / INDUSTRIAS EN FOTOS ═══ */
export const Personas = () => (
  <Seccion tinte>
    <Halo className="left-1/2 -translate-x-1/2 -top-56" size={900} color="rgba(0,191,255,0.1)" />
    <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
      <TituloSeccion
        etiqueta="Hecho para quien vende"
        titulo={
          <>
            Negocios de todo tamaño, atendidos como si <Resalte>tuvieran un equipo de diez</Resalte>
          </>
        }
        sub="Si tus clientes te escriben por WhatsApp, ImporChat les responde."
      />
    </div>
    <Marquesina
      items={PERSONAS}
      duracion={55}
      gap="gap-6"
      render={(p, i) => (
        <div key={i} className="relative w-[220px] sm:w-[250px] h-[320px] rounded-3xl overflow-hidden shrink-0 group border border-white/10">
          <img src={p.img} alt={p.rubro} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(6,11,22,0.95) 100%)" }} />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">{p.rubro}</p>
            <p className="text-sm font-semibold text-white leading-snug mt-1">{p.logro}</p>
          </div>
        </div>
      )}
    />
  </Seccion>
);

/* ═══ SIN / CON ═══ */
export const SinCon = () => (
  <Seccion id="producto" grid>
    <Halo className="left-1/2 -translate-x-1/2 -top-40" size={900} color="rgba(0,191,255,0.14)" />
    <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
      <TituloSeccion
        etiqueta="El problema"
        titulo={
          <>
            WhatsApp ya es donde te compran. <Resalte>Falta el sistema detrás.</Resalte>
          </>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
        <Reveal>
          <Vidrio className="h-full p-8 sm:p-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Sin ImporChat</p>
            <ul className="mt-6 space-y-5">
              {SIN_CON.sin.map((t) => (
                <li key={t} className="flex items-start gap-3.5 text-[15px] sm:text-base text-slate-400 leading-relaxed">
                  <span className="mt-1 w-5 h-5 rounded-full grid place-items-center shrink-0" style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.3)" }}>
                    <FiX size={12} color="#fb7185" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </Vidrio>
        </Reveal>
        <Reveal delay={0.12}>
          <Vidrio brillo className="h-full p-8 sm:p-10">
            <Halo className="-top-24 -right-24" size={320} color="rgba(0,191,255,0.3)" />
            <p className="relative text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-300">Con ImporChat</p>
            <ul className="mt-6 space-y-5 relative">
              {SIN_CON.con.map((t) => (
                <li key={t} className="flex items-start gap-3.5 text-[15px] sm:text-base text-slate-100 leading-relaxed">
                  <span className="mt-1 w-5 h-5 rounded-full grid place-items-center shrink-0" style={{ background: "rgba(0,191,255,0.18)", border: "1px solid rgba(0,191,255,0.45)" }}>
                    <FiCheck size={12} color={CYAN} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </Vidrio>
        </Reveal>
      </div>
    </div>
  </Seccion>
);

/* ═══ CAPACIDADES ═══ */
export const Capacidades = () => (
  <Seccion tinte>
    <Halo className="-right-40 top-10" size={800} color="rgba(0,191,255,0.1)" />
    <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
      <TituloSeccion
        etiqueta="Todo en una plataforma"
        titulo={
          <>
            Ventas, agenda y equipo. <Resalte>Sin pegar cinco herramientas.</Resalte>
          </>
        }
      />
      <Reveal>
        <Vidrio brillo className="min-h-[340px] sm:min-h-[420px]">
          <img src={redAutomatizacion} alt="Red de automatización de ImporChat" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(6,11,22,0.92) 0%, rgba(6,11,22,0.55) 50%, rgba(6,11,22,0.1) 100%)" }} />
          <div className="relative h-full min-h-[340px] sm:min-h-[420px] flex flex-col justify-center p-8 sm:p-12 max-w-xl">
            <Etiqueta>Automatización inteligente</Etiqueta>
            <h3 className="mt-5 text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-[1.25]">
              Cada mensaje entra, se entiende y se convierte en una acción
            </h3>
            <p className="mt-4 text-[15px] sm:text-base text-slate-300 leading-relaxed">
              Respuesta, pedido, cita o traspaso a un asesor. El agente decide y el CRM lo registra.
            </p>
          </div>
        </Vidrio>
      </Reveal>
      <div className="mt-6 lg:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {CAPACIDADES.map((c, i) => (
          <Reveal key={c.title} delay={(i % 3) * 0.06}>
            <Vidrio className="group h-full p-7 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40">
              <div className="mb-6 transition-transform group-hover:scale-110 inline-block">
                <Cubo k={c.icon} size={52} icono={22} />
              </div>
              <h3 className="text-lg font-extrabold text-white tracking-tight">{c.title}</h3>
              <p className="mt-2.5 text-[15px] text-slate-400 leading-relaxed">{c.desc}</p>
            </Vidrio>
          </Reveal>
        ))}
      </div>
    </div>
  </Seccion>
);

/* ═══ AGENTE IA ═══ */
/* Holograma que flota sobre el retrato. */
const Holo = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 14, scale: 0.94 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true }}
    transition={{ delay: 0.4 + delay, duration: 0.6 }}
    className={`absolute z-20 lh-float ${className}`}
    style={{ animationDelay: `${delay * 1000}ms` }}
  >
    <div
      className="rounded-2xl px-3.5 py-2.5 text-left"
      style={{
        background: "rgba(6,11,22,0.5)",
        border: "1px solid rgba(0,191,255,0.5)",
        boxShadow: "0 0 30px rgba(0,191,255,0.25), inset 0 0 24px rgba(0,191,255,0.08)",
        backdropFilter: "blur(10px)",
      }}
    >
      {children}
    </div>
  </motion.div>
);

/* Retrato "en vivo": zoom lento, luz que barre y hologramas, para que se lea
 * como video sin cargar un MP4. */
const RetratoVivo = () => (
  <div className="relative mx-auto w-full max-w-[460px]">
    <Halo className="inset-0 m-auto" size={620} color="rgba(0,191,255,0.32)" />
    <div
      className="relative aspect-[3/4] rounded-[36px] overflow-hidden border border-cyan-400/30"
      style={{ boxShadow: "0 50px 120px rgba(0,0,0,0.65), 0 0 90px rgba(0,191,255,0.18)" }}
    >
      <img src={agenteRetrato} alt="Agente IA de ImporChat" className="absolute inset-0 w-full h-full object-cover lh-kenburns" />
      <div className="absolute inset-0 lh-grid opacity-30 [mask-image:linear-gradient(180deg,transparent_30%,black)]" />
      <div className="absolute inset-x-0 h-28 lh-scan pointer-events-none" style={{ background: "linear-gradient(180deg, transparent, rgba(0,191,255,0.22), transparent)" }} />

      <div className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white" style={{ background: "rgba(6,11,22,0.6)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
        <span className="w-2 h-2 rounded-full bg-red-500 lh-parpadeo" /> Agente IA · en vivo
      </div>
      {/* Señal de que responde una IA: barras de "voz" animadas. */}
      <div className="absolute top-4 right-4 z-20 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold text-cyan-200" style={{ background: "rgba(0,191,255,0.12)", border: "1px solid rgba(0,191,255,0.45)", backdropFilter: "blur(8px)" }}>
        <span className="flex items-end gap-[2px] h-3">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="w-[3px] rounded-full bg-cyan-300 lh-barra" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </span>
        IA respondiendo
      </div>

      <Holo className="left-4 top-[11%] max-w-[170px]" delay={0}>
        <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-300">Cliente · 2:14 a. m.</p>
        <p className="text-[12px] text-white leading-snug mt-0.5">¿Tienen stock en talla M?</p>
      </Holo>
      <Holo className="right-4 top-[40%]" delay={0.5}>
        <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-300">Pedido creado</p>
        <p className="text-[13px] font-extrabold text-white mt-0.5">#48213 · $89,99</p>
      </Holo>
      <Holo className="left-5 bottom-[24%]" delay={1}>
        <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-300">Cita confirmada</p>
        <p className="text-[12px] font-bold text-white mt-0.5">Jue 15:30 · Dra. Paz</p>
      </Holo>
      <Holo className="right-4 bottom-[33%]" delay={1.4}>
        <div className="flex items-center gap-2.5">
          <span className="flex -space-x-1.5">
            {["#67e8f9", "#38bdf8", "#0ea5e9"].map((c) => (
              <span key={c} className="w-5 h-5 rounded-full border-2 border-[#0b1426]" style={{ background: c }} />
            ))}
          </span>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-300">Al mismo tiempo</p>
            <p className="text-[12px] font-bold text-white">3 chats atendidos</p>
          </div>
        </div>
      </Holo>

      <div className="absolute inset-x-0 bottom-0 p-6" style={{ background: "linear-gradient(180deg, transparent, rgba(6,11,22,0.96))" }}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Agente IA automatizado</p>
            <p className="text-lg font-extrabold text-white leading-tight">Vende como tu mejor asesor</p>
            <p className="text-[11px] text-slate-400 mt-1">Responde, cotiza, agenda y cierra sin que nadie intervenga.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-emerald-300 shrink-0" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> En línea
          </span>
        </div>
      </div>
    </div>
  </div>
);

export const AgenteIA = ({ onRegistro }) => (
  <Seccion id="agente" grid>
    <Halo className="-left-40 top-20" size={800} color="rgba(0,191,255,0.16)" />
    <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        <Reveal>
          <RetratoVivo />
        </Reveal>

        <div>
          <TituloSeccion
            alinear="left"
            etiqueta="Inteligencia automatizada"
            titulo={
              <>
                Un asistente que <Resalte>conoce tu negocio</Resalte> y vende como tú.
              </>
            }
            sub="No elige opciones de un menú. Conversa, entiende y resuelve."
          />
          <div className="space-y-6">
            {AGENTE_IA.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <Vidrio className="p-6 sm:p-7 flex gap-5 hover:border-cyan-400/30 transition">
                  <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0 text-sm font-extrabold text-[#06111f]" style={{ background: CYAN, boxShadow: `0 0 20px rgba(0,191,255,0.5)` }}>
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white tracking-tight">{p.title}</h3>
                    <p className="mt-2 text-[15px] text-slate-400 leading-relaxed">{p.desc}</p>
                  </div>
                </Vidrio>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.3} className="mt-10">
            <BotonPrimario onClick={onRegistro}>Crear mi agente</BotonPrimario>
          </Reveal>
        </div>
      </div>
    </div>
  </Seccion>
);

/* ═══ INDUSTRIAS (pestañas) ═══ */
export const Industrias = () => {
  const [k, setK] = useState(INDUSTRIAS[0].k);
  const ind = INDUSTRIAS.find((x) => x.k === k);
  return (
    <Seccion id="industrias" tinte>
      <Halo className="right-0 -top-40" size={700} color="rgba(0,191,255,0.1)" />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <TituloSeccion
          etiqueta="Ejemplos reales"
          titulo={
            <>
              Personalizado para tu rubro <Resalte>desde el primer día</Resalte>
            </>
          }
          sub="Elige tu industria y mira cómo conversa."
        />

        <Reveal className="flex flex-wrap justify-center gap-2.5 mb-12">
          {INDUSTRIAS.map((i) => (
            <button
              key={i.k}
              onClick={() => setK(i.k)}
              className={`px-5 py-2.5 rounded-full text-[13px] font-bold transition-all ${i.k === k ? "text-[#06111f]" : "text-slate-300 hover:text-white"}`}
              style={
                i.k === k
                  ? { background: CYAN, boxShadow: "0 8px 24px rgba(0,191,255,0.35)" }
                  : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }
              }
            >
              {i.label}
            </button>
          ))}
        </Reveal>

        <AnimatePresence mode="wait">
          <motion.div
            key={ind.k}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr_0.9fr] gap-6 lg:gap-8 items-stretch"
          >
            <div className="relative rounded-3xl overflow-hidden min-h-[300px] border border-white/10">
              <img src={ind.img} alt={ind.label} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 50%, rgba(6,11,22,0.95) 100%)" }} />
              <p className="absolute bottom-6 left-6 text-white font-extrabold text-lg">{ind.label}</p>
            </div>

            <Vidrio className="p-8 sm:p-10 flex flex-col justify-center">
              <h3 className="text-2xl sm:text-[28px] font-extrabold text-white tracking-tight leading-[1.25]">{ind.title}</h3>
              <ul className="mt-7 space-y-4">
                {ind.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-[15px] text-slate-200">
                    <span className="mt-0.5 w-5 h-5 rounded-full grid place-items-center shrink-0" style={{ background: "rgba(0,191,255,0.15)" }}>
                      <FiCheck size={12} color={CYAN} />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </Vidrio>

            <div className="flex items-center">
              <div className="w-full">
                <ChatEstatico mensajes={ind.chat} />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </Seccion>
  );
};

/* ═══ CÓMO FUNCIONA ═══ */
export const ComoFunciona = ({ onRegistro }) => (
  <Seccion id="como-funciona" grid>
    <Halo className="left-1/2 -translate-x-1/2 top-0" size={900} color="rgba(0,191,255,0.1)" />
    <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
      <TituloSeccion
        etiqueta="Cómo funciona"
        titulo={
          <>
            Activo en menos de 5 minutos. <Resalte>Sin código.</Resalte>
          </>
        }
      />
      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        <div className="hidden lg:block absolute top-[60px] left-[12%] right-[12%] h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,191,255,0.6), transparent)" }} />
        {PASOS.map((p, i) => (
          <Reveal key={p.n} delay={i * 0.1}>
            <Vidrio className="relative p-7 sm:p-8 h-full">
              <div
                className="w-14 h-14 rounded-2xl grid place-items-center text-[#06111f] text-lg font-extrabold mb-6"
                style={{ background: `linear-gradient(135deg, #67e8f9, ${CYAN})`, boxShadow: "0 0 30px rgba(0,191,255,0.4)" }}
              >
                {p.n}
              </div>
              <h3 className="text-lg font-extrabold text-white tracking-tight">{p.title}</h3>
              <p className="mt-2.5 text-[15px] text-slate-400 leading-relaxed">{p.desc}</p>
            </Vidrio>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.3} className="text-center mt-14">
        <BotonPrimario onClick={onRegistro}>Empezar ahora</BotonPrimario>
      </Reveal>
    </div>
  </Seccion>
);

/* ═══ META BUSINESS PARTNER ═══ */
/* Dos degradados (horizontal y vertical) intersectados: los bordes se
 * funden en un tramo ancho y el centro queda intacto. La imagen es mucho
 * más grande que la columna, así que el fundido cae fuera de los iconos. */
const MASCARA_BORDES =
  "linear-gradient(90deg, transparent 0%, #000 26%, #000 74%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 24%, #000 72%, transparent 100%)";

export const MetaPartner = () => (
  <Seccion tinte>
    <Halo className="-right-60 top-0" size={900} color="rgba(8,102,255,0.18)" />
    <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-10 lg:gap-16 items-center">
        {/* El infinito con las redes es parte del fondo de la sección, no
            una tarjeta: la imagen se desborda de su columna (la sección
            recorta), va con mezcla "screen" sobre el navy y se funde por
            los bordes. Sin píldora ni texto debajo: la imagen habla sola. */}
        <div className="relative min-h-[460px] sm:min-h-[600px] lg:min-h-[680px]">
          <Halo className="inset-0 m-auto" size={800} color="rgba(8,102,255,0.28)" />
          {/* El centrado va en un div aparte: la animación lh-float escribe
              `transform` y pisaría el translate(-50%,-50%). */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[118%] sm:w-[125%] lg:w-[150%] max-w-none">
            <div className="lh-float">
              <img
                src={metaInfinito}
                alt="Meta Business Partner: WhatsApp, Instagram, Messenger y Facebook"
                className="w-full h-auto lh-brillo"
                style={{
                  mixBlendMode: "screen",
                  maskImage: MASCARA_BORDES,
                  WebkitMaskImage: MASCARA_BORDES,
                  maskComposite: "intersect",
                  WebkitMaskComposite: "source-in",
                }}
              />
            </div>
          </div>
        </div>

        <div>
          <TituloSeccion
            alinear="left"
            etiqueta="Confianza"
            titulo={
              <>
                Por qué importa que tu proveedor sea <Resalte>partner de Meta</Resalte>
              </>
            }
            sub="Las apps no oficiales funcionan hasta que Meta bloquea el número. Con la API oficial, eso no pasa."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {META_BENEFICIOS.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.08}>
                <Vidrio className="h-full p-6 sm:p-7 hover:border-blue-400/40 transition">
                  <div className="mb-4">
                    <Cubo k={["shield", "file", "bolt", "lock"][i]} size={44} icono={19} />
                  </div>
                  <h3 className="text-base font-extrabold text-white">{b.title}</h3>
                  <p className="mt-2 text-[14px] text-slate-400 leading-relaxed">{b.desc}</p>
                </Vidrio>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  </Seccion>
);

/* ═══ INTEGRACIONES ═══ */
export const Integraciones = () => {
  const mitad = Math.ceil(INTEGRACIONES.length / 2);
  const fila = (items, reverso) => (
    <Marquesina
      items={items}
      duracion={34}
      reverso={reverso}
      gap="gap-5"
      render={(it, i) => (
        <div key={i} className="flex items-center gap-3 px-7 py-4 rounded-2xl shrink-0 whitespace-nowrap" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <Marca k={it.k} nombre={it.n} size={22} />
          <span className="text-sm font-bold text-white">{it.n}</span>
        </div>
      )}
    />
  );
  return (
    <Seccion className="!py-20 sm:!py-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <TituloSeccion
          etiqueta="Ecosistema"
          titulo={
            <>
              Conectado con <Resalte>lo que ya usas</Resalte>
            </>
          }
        />
      </div>
      <div className="space-y-5">
        {fila(INTEGRACIONES.slice(0, mitad), false)}
        {fila(INTEGRACIONES.slice(mitad), true)}
      </div>
    </Seccion>
  );
};

/* ═══ PLANES ═══ */
export const Planes = ({ onRegistro, onVerPlanes }) => (
  <Seccion id="planes" tinte grid>
    <Halo className="left-1/2 -translate-x-1/2 top-0" size={1000} color="rgba(0,191,255,0.12)" />
    <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
      <TituloSeccion
        etiqueta="Planes"
        titulo={
          <>
            Un precio claro. <Resalte>Todo incluido.</Resalte>
          </>
        }
        sub="7 días gratis. Primer mes a $5. Después, el plan que elijas."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto items-stretch">
        {PLANES.map((p, i) => (
          <Reveal key={p.k} delay={i * 0.1}>
            <Vidrio brillo={p.destacado} className={`relative h-full p-8 flex flex-col ${p.destacado ? "md:-translate-y-3" : ""}`}>
              {p.destacado && (
                <span className="absolute top-5 right-5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-[#06111f]" style={{ background: CYAN }}>
                  Más elegido
                </span>
              )}
              <p className="text-sm font-extrabold" style={{ color: p.destacado ? "#7dd3fc" : "#cbd5e1" }}>
                {p.n}
              </p>
              <p className="mt-1.5 text-[13px] text-slate-400">{p.desc}</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-5xl font-extrabold tracking-tight text-white">${p.p}</span>
                <span className="mb-2 text-sm text-slate-400">/mes</span>
              </div>
              <ul className="mt-7 space-y-3 flex-1">
                {p.lim.map((l) => (
                  <li key={l} className="flex items-center gap-2.5 text-sm text-slate-200">
                    <FiCheck size={15} color={CYAN} /> {l}
                  </li>
                ))}
                <li className="flex items-center gap-2.5 text-sm text-slate-200">
                  <FiCheck size={15} color={CYAN} /> Agente IA, CRM y todos los módulos
                </li>
              </ul>
              <button
                onClick={onRegistro}
                className={`mt-8 w-full py-3.5 rounded-full text-sm font-bold transition-all hover:-translate-y-0.5 ${p.destacado ? "text-[#06111f]" : "text-white"}`}
                style={
                  p.destacado
                    ? { background: `linear-gradient(135deg, #67e8f9, ${CYAN} 55%, #0ea5e9)`, boxShadow: "0 10px 30px rgba(0,191,255,0.35)" }
                    : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)" }
                }
              >
                Probar 7 días gratis
              </button>
            </Vidrio>
          </Reveal>
        ))}
      </div>

      <Reveal className="text-center mt-12">
        <button onClick={onVerPlanes} className="inline-flex items-center gap-1.5 text-sm font-bold text-cyan-300 hover:text-white transition">
          Comparar planes, períodos y límites <FiArrowRight />
        </button>
      </Reveal>
    </div>
  </Seccion>
);

/* ═══ FAQ ═══ */
export const Preguntas = () => {
  const [abierta, setAbierta] = useState(0);
  return (
    <Seccion id="faq">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <TituloSeccion etiqueta="Preguntas frecuentes" titulo="Lo que todos preguntan antes de empezar" />
        <div className="space-y-4">
          {FAQ.map((f, i) => {
            const open = abierta === i;
            return (
              <Vidrio key={f.q} brillo={open} className="px-6 sm:px-7">
                <button onClick={() => setAbierta(open ? -1 : i)} className="w-full flex items-center justify-between gap-4 py-5 sm:py-6 text-left">
                  <span className="text-[15px] sm:text-base font-bold text-white">{f.q}</span>
                  <span className="w-8 h-8 rounded-full grid place-items-center shrink-0 transition" style={{ background: open ? CYAN : "rgba(0,191,255,0.12)" }}>
                    {open ? <FiMinus size={14} color="#06111f" /> : <FiPlus size={14} color={CYAN} />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28 }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 text-[15px] text-slate-400 leading-relaxed">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Vidrio>
            );
          })}
        </div>
      </div>
    </Seccion>
  );
};

/* ═══ CTA FINAL ═══ */
export const CtaFinal = ({ onRegistro }) => (
  <section className="relative overflow-hidden" style={{ background: FONDO }}>
    <div className="absolute inset-0 pointer-events-none">
      <img src={heroFondo} alt="" className="w-full h-full object-cover object-bottom opacity-70" />
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${FONDO} 0%, rgba(6,11,22,0.3) 50%, ${FONDO} 100%)` }} />
    </div>
    <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-28 sm:py-40 text-center">
      <Reveal>
        <h2 className="text-3xl sm:text-5xl lg:text-[56px] font-extrabold text-white tracking-[-0.03em] leading-[1.25] max-w-3xl mx-auto">
          Tu próximo cliente escribe esta noche. <Resalte>¿Quién le responde?</Resalte>
        </h2>
        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-xl mx-auto">
          Activa tu agente IA hoy. 7 días gratis, cancelas cuando quieras.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <BotonPrimario onClick={onRegistro} className="uppercase tracking-[0.08em] px-8">
            Comenzar gratis
          </BotonPrimario>
          <BotonSecundario onClick={agendarDemo} className="uppercase tracking-[0.08em] px-8">
            Agendar demo
          </BotonSecundario>
        </div>
        <div className="mt-12 flex justify-center">
          <SelloMeta />
        </div>
      </Reveal>
    </div>
  </section>
);

/* ═══ FOOTER ═══ */
export const Pie = () => (
  <footer className="text-slate-400 border-t border-white/[0.06]" style={{ background: "#040812" }}>
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-12">
      <div>
        <img src={LOGO_BLANCO} alt="ImporChat" className="h-12 w-auto" />
        <p className="mt-5 text-sm leading-relaxed max-w-sm">
          Mensajería, agente IA y CRM para negocios que venden por WhatsApp, Instagram y Messenger. Un producto de Imporfactory.
        </p>
        <div className="mt-6">
          <SelloMeta compacto />
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Producto</p>
        <ul className="mt-5 space-y-3 text-sm">
          {ENLACES.map((e) => (
            <li key={e.id}>
              <button onClick={() => ir(e.id)} className="hover:text-white transition">
                {e.t}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Legal</p>
        <ul className="mt-5 space-y-3 text-sm">
          <li><a href="/politica-privacidad" className="hover:text-white transition">Política de privacidad</a></li>
          <li><a href="/condiciones-servicio" className="hover:text-white transition">Condiciones del servicio</a></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-white/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <span>© {new Date().getFullYear()} Imporfactory. Todos los derechos reservados.</span>
        <span>Hecho en Ecuador para toda Latinoamérica.</span>
      </div>
    </div>
  </footer>
);

/* ═══ BOTÓN FLOTANTE DE WHATSAPP ═══ Solo aparece si hay número configurado. */
export const BotonWhatsApp = () => {
  if (!WHATSAPP_VENTAS) return null;
  return (
    <a
      href={`https://wa.me/${WHATSAPP_VENTAS}?text=${encodeURIComponent("Hola, quiero saber más de ImporChat")}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full grid place-items-center transition hover:scale-105"
      style={{ background: "#25D366", boxShadow: "0 12px 30px rgba(37,211,102,0.45)" }}
      aria-label="Hablar con ventas por WhatsApp"
    >
      <FaWhatsapp size={28} color="white" />
    </a>
  );
};
