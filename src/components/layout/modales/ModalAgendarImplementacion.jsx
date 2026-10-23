import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import chatApi from "../../../api/chatcenter";

/* ═══════════════════════════════════════════════════════════════════════
   Invitación a agendar la implementación (pedido 2026-10-22).

   Sale a quien NO ha empezado: una conexión como máximo y ninguna conectada
   (lo decide el back en GET /onboarding/implementacion, misma definición de
   «conectado» que la vista de Conexiones). Quien ya tiene dos conexiones no
   lo ve aunque una esté sin conectar: ya pagó la segunda y maneja el sistema.

   Salidas:
     · Agendar             → abre Calendly con nombre y correo prellenados y
                             no vuelve a salir (guardado por cuenta).
     · No por ahora        → vuelve a salir a los 3 días (por cuenta).
     · No volver a mostrar → nunca más (por cuenta).
     · X / Escape / clic afuera → solo cierra: no toca la base. Se recuerda
       en sessionStorage para no repetirlo en cada recarga de la misma
       sesión, y vuelve a salir en la siguiente (nuevo login o pestaña).

   Diseño (referencia: landing de Funnelchat): tarjeta oscura completa,
   titular grande en líneas cortas, verde WhatsApp para todo lo que es
   automatización y cian para la marca. La automatización se muestra con
   íconos y una luz que recorre la línea —nada de texto chico que no se lee—
   y cabe sin scroll en un portátil.
   ═══════════════════════════════════════════════════════════════════════ */

const PASOS = [
  {
    icon: "bxl-whatsapp",
    titulo: "Conectamos tu número de WhatsApp",
    detalle: "Con la API oficial de Meta, en vivo contigo.",
  },
  {
    icon: "bx-bot",
    titulo: "Activamos tu agente de IA listo para vender",
    detalle:
      "Entrenado para tu tipo de negocio: catálogo, dropshipping, servicios o citas. Si tu operación es distinta, la automatizamos contigo a tu medida.",
  },
  {
    icon: "bx-trending-up",
    titulo: "Sales vendiendo el mismo día",
    detalle: "Lo probamos con un chat real y te vas con todo funcionando.",
  },
];

const VERDE = "#25D366";

function urlCalendly(base, dueno) {
  try {
    const u = new URL(base);
    if (dueno?.nombre) u.searchParams.set("name", dueno.nombre);
    if (dueno?.email) u.searchParams.set("email", dueno.email);
    u.searchParams.set("utm_source", "imporchat");
    u.searchParams.set("utm_medium", "modal_implementacion");
    return u.toString();
  } catch (_) {
    return base;
  }
}

// El nombre llega como lo escribió el cliente, a veces con entidades HTML
// («Mar&iacute;a»): se limpia para el saludo y para Calendly.
function limpiarNombre(n) {
  const t = document.createElement("textarea");
  t.innerHTML = String(n || "");
  return t.value.trim();
}

/* La automatización sin palabras: WhatsApp → IA → venta, con una luz que
   recorre la línea y cada nodo encendiéndose al pasar. */
function FlujoAutomatico() {
  const nodos = [
    { icon: "bxl-whatsapp", color: VERDE },
    { icon: "bx-bot", color: "#38bdf8" },
    { icon: "bx-check-double", color: VERDE },
  ];
  return (
    <div className="relative mt-7 flex items-center justify-between px-1">
      {/* línea base + luz viajera */}
      <div className="absolute left-7 right-7 top-1/2 h-px -translate-y-1/2 bg-white/15" />
      <motion.div
        className="absolute top-1/2 h-[3px] w-20 -translate-y-1/2 rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${VERDE}, #38bdf8, transparent)`, filter: "blur(0.5px)" }}
        animate={{ left: ["6%", "80%"], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
      />
      {nodos.map((n, i) => (
        <motion.div
          key={n.icon}
          className="relative z-10 grid h-14 w-14 place-items-center rounded-2xl border border-white/15 bg-[#0f1b33]"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(0,0,0,0)",
              `0 0 0 8px ${n.color}22, 0 0 32px ${n.color}66`,
              "0 0 0 0 rgba(0,0,0,0)",
            ],
            borderColor: ["rgba(255,255,255,0.15)", n.color, "rgba(255,255,255,0.15)"],
          }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.3 + i * 0.95, ease: "easeInOut" }}
        >
          <i className={`bx ${n.icon} text-[28px]`} style={{ color: n.color }} />
        </motion.div>
      ))}
    </div>
  );
}

export default function ModalAgendarImplementacion({ datos, claveSesion, onCerrar }) {
  const [enviando, setEnviando] = useState(null);
  const dueno = { ...(datos?.dueno || {}), nombre: limpiarNombre(datos?.dueno?.nombre) };
  const nombre = dueno.nombre.split(/\s+/)[0] || "";

  // Se registra que se mostró (métrica: cuántos lo ven vs cuántos agendan).
  useEffect(() => {
    chatApi.post("onboarding/implementacion/mostrado").catch(() => {});
  }, []);

  const responder = async (accion) => {
    if (enviando) return;
    // Cerrar sin responder: nada en la base, solo no repetir en esta sesión.
    if (accion === "cerrar") {
      try {
        if (claveSesion) sessionStorage.setItem(claveSesion, "1");
      } catch (_) {
        /* sin storage */
      }
      onCerrar?.(accion);
      return;
    }
    setEnviando(accion);
    if (accion === "agendo") {
      // Primero la pestaña: si se abre después del await, el navegador la
      // bloquea como popup.
      window.open(urlCalendly(datos?.calendly_url, dueno), "_blank", "noopener");
    }
    try {
      await chatApi.post("onboarding/implementacion/respuesta", { accion });
    } catch (_) {
      /* si falla el registro igual se cierra: no se deja al usuario atrapado
         en un modal por un error de red */
    }
    setEnviando(null);
    onCerrar?.(accion);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") responder("cerrar");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enviando]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99990] flex items-center justify-center px-3 py-4 sm:px-4"
        style={{ background: "rgba(3,7,18,0.78)", backdropFilter: "blur(10px)" }}
        onClick={() => responder("cerrar")}
      >
        <motion.div
          key="card"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="impl-titulo"
          className="relative w-full max-w-[920px] max-h-[94vh] overflow-y-auto md:overflow-hidden rounded-[26px] text-white shadow-[0_50px_140px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
          style={{
            background:
              "radial-gradient(110% 80% at 0% 0%, rgba(14,165,233,0.35) 0%, rgba(11,20,38,0) 55%), radial-gradient(70% 60% at 100% 100%, rgba(37,211,102,0.18) 0%, rgba(11,20,38,0) 60%), linear-gradient(180deg, #0B1426 0%, #0a1222 100%)",
          }}
        >
          {/* trama de puntos */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          <button
            type="button"
            onClick={() => responder("cerrar")}
            className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-slate-300 ring-1 ring-white/15 transition hover:bg-white/20 hover:text-white"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <i className="bx bx-x text-2xl" />
          </button>

          <div className="relative grid md:grid-cols-[1.05fr_1fr]">
            {/* ─── Izquierda: la promesa ─── */}
            <div className="px-6 py-7 sm:px-8 md:px-10 md:py-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: VERDE }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: VERDE }} />
                </span>
                Implementación guiada · 30 min · gratis
              </div>

              <h2 id="impl-titulo" className="mt-5 text-[30px] font-extrabold leading-[1.05] tracking-tight sm:text-[36px]">
                {nombre ? `${nombre}, tu` : "Tu"} WhatsApp
                <span className="block">vendiendo</span>
                <span
                  className="block bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(90deg, ${VERDE} 0%, #38bdf8 100%)` }}
                >
                  en automático.
                </span>
              </h2>
              {datos?.motivo === "agendo_sin_avanzar" ? (
                /* Abrió la agenda hace una semana y sigue sin conectar nada:
                   quizá no alcanzó a reservar. Se le ofrece de nuevo sin
                   regañar. */
                <p className="mt-4 max-w-[40ch] text-[14px] leading-6 text-slate-300">
                  Abriste nuestra agenda hace unos días y todavía no conectaste tu número.
                  Si no alcanzaste a reservar, aquí tienes tu espacio otra vez: un especialista
                  lo hace contigo en una videollamada.
                </p>
              ) : (
                <p className="mt-4 max-w-[38ch] text-[14px] leading-6 text-slate-300">
                  Todavía no conectaste tu primer número. Un especialista lo hace contigo en una
                  videollamada y te deja un agente de IA atendiendo y cerrando ventas por ti.
                </p>
              )}

              <FlujoAutomatico />

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <i className="bx bx-shield-quarter text-base" style={{ color: VERDE }} /> API oficial de WhatsApp Business
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="bx bx-time-five text-base" style={{ color: VERDE }} /> Atiende 24/7
                </span>
              </div>
            </div>

            {/* ─── Derecha: los 3 pasos + la acción ─── */}
            <div className="flex flex-col border-t border-white/10 bg-white/[0.04] px-6 py-7 backdrop-blur-sm sm:px-8 md:border-l md:border-t-0 md:px-9 md:py-10">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-300">
                Qué hacemos en la llamada
              </div>

              <ol className="relative mt-4 space-y-4">
                <span className="absolute bottom-4 left-[19px] top-4 w-px bg-gradient-to-b from-sky-400/50 via-white/10 to-transparent" aria-hidden="true" />
                {PASOS.map((p, i) => (
                  <motion.li
                    key={p.titulo}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.12 }}
                    className="relative flex items-start gap-3.5"
                  >
                    <span
                      className="relative z-10 grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl text-white ring-1 ring-white/15"
                      style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.9) 0%, rgba(3,105,161,0.9) 100%)" }}
                    >
                      <i className={`bx ${p.icon} text-[19px]`} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[14.5px] font-extrabold leading-5">
                        <span className="mr-1 text-sky-300">{i + 1}.</span>
                        {p.titulo}
                      </div>
                      <div className="mt-0.5 text-[12.5px] leading-5 text-slate-300/90">{p.detalle}</div>
                    </div>
                  </motion.li>
                ))}
              </ol>

              <div className="mt-auto pt-7">
                {/* Sobre el fondo oscuro el verde se perdía: el botón va en
                    blanco con texto azul marino (máximo contraste), un halo
                    cian que respira detrás y el brillo que lo recorre. */}
                <div className="relative">
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-1 rounded-[20px]"
                    style={{ background: "linear-gradient(90deg, #22d3ee, #38bdf8, #22d3ee)", filter: "blur(14px)" }}
                    animate={{ opacity: [0.35, 0.7, 0.35] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.button
                    type="button"
                    onClick={() => responder("agendo")}
                    disabled={!!enviando}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-white px-5 py-4 text-[14px] font-extrabold uppercase tracking-[0.14em] text-[#0B1426] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] disabled:opacity-60"
                  >
                    <span
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-sky-200/60 to-transparent"
                      style={{ animation: "impl-shine 2.8s ease-in-out 1.2s infinite" }}
                    />
                    Agendar mi implementación gratis
                  </motion.button>
                </div>
                <style>{`@keyframes impl-shine { 0% { transform: translateX(-100%);} 60% { transform: translateX(100%);} 100% { transform: translateX(100%);} }`}</style>
                <p className="mt-2.5 text-center text-[12px] text-slate-400">
                  Eliges el día y la hora que mejor te quede.
                </p>

                <div className="mt-5 flex items-center justify-center gap-4 text-[12.5px]">
                  <button
                    type="button"
                    onClick={() => responder("no_por_ahora")}
                    disabled={!!enviando}
                    className="font-semibold text-slate-300 underline-offset-2 hover:text-white hover:underline disabled:opacity-60"
                  >
                    No por ahora
                  </button>
                  <span className="text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => responder("no_mostrar")}
                    disabled={!!enviando}
                    className="text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline disabled:opacity-60"
                  >
                    No volver a mostrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
