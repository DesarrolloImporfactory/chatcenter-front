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

   Tres salidas, guardadas por CUENTA (no por navegador):
     · Agendar          → abre Calendly con nombre y correo prellenados y no
                          vuelve a salir.
     · No por ahora     → vuelve a salir a los 3 días.
     · No volver a mostrar → nunca más.
   Cerrar con Escape o clic afuera equivale a «No por ahora».
   ═══════════════════════════════════════════════════════════════════════ */

const PASOS = [
  {
    icon: "bx-mobile-alt",
    titulo: "Conectamos tu número de WhatsApp",
    detalle: "Con la API oficial de Meta, en vivo contigo, sin que tengas que pelear con la configuración.",
  },
  {
    icon: "bx-bot",
    titulo: "Dejamos tu asistente respondiendo",
    detalle: "Cargamos tu catálogo o tus servicios y afinamos cómo saluda, cotiza y cierra ventas.",
  },
  {
    icon: "bx-rocket",
    titulo: "Sales vendiendo el mismo día",
    detalle: "Te mostramos el flujo completo con un chat real y resolvemos todas tus dudas.",
  },
];

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

export default function ModalAgendarImplementacion({ datos, onCerrar }) {
  const [enviando, setEnviando] = useState(null);

  // Se registra que se mostró (métrica: cuántos lo ven vs cuántos agendan).
  useEffect(() => {
    chatApi.post("onboarding/implementacion/mostrado").catch(() => {});
  }, []);

  const responder = async (accion) => {
    if (enviando) return;
    setEnviando(accion);
    if (accion === "agendo") {
      // Primero la pestaña: si se abre después del await, el navegador la
      // bloquea como popup.
      window.open(urlCalendly(datos?.calendly_url, datos?.dueno), "_blank", "noopener");
    }
    try {
      await chatApi.post("onboarding/implementacion/respuesta", { accion });
    } catch (_) {
      /* si falla el registro igual se cierra: no se puede dejar al usuario
         atrapado en un modal por un error de red */
    }
    setEnviando(null);
    onCerrar?.(accion);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") responder("no_por_ahora");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enviando]);

  const nombre = (datos?.dueno?.nombre || "").trim().split(/\s+/)[0];

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99990] flex items-center justify-center px-4 py-6"
        style={{ background: "rgba(11,20,38,0.62)", backdropFilter: "blur(6px)" }}
        onClick={() => responder("no_por_ahora")}
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
          className="relative w-full max-w-[880px] overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(11,20,38,0.55)]"
        >
          <button
            type="button"
            onClick={() => responder("no_por_ahora")}
            className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/80 text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-white hover:text-slate-800"
            title="Cerrar (te lo recordamos en unos días)"
            aria-label="Cerrar"
          >
            <i className="bx bx-x text-2xl" />
          </button>

          <div className="grid md:grid-cols-[1.05fr_1fr]">
            {/* Lado izquierdo: la promesa */}
            <div
              className="relative overflow-hidden px-7 py-8 text-white md:px-9 md:py-10"
              style={{
                background:
                  "radial-gradient(120% 120% at 0% 0%, #0ea5e9 0%, #0B1426 55%, #0B1426 100%)",
              }}
            >
              <div
                className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-30"
                style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 70%)" }}
              />
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-200 ring-1 ring-white/15">
                <i className="bx bx-calendar-check" /> Implementación guiada · 30 min · sin costo
              </div>
              <h2 id="impl-titulo" className="mt-4 text-[26px] font-extrabold leading-[1.15] tracking-tight md:text-[30px]">
                {nombre ? `${nombre}, dejemos` : "Dejemos"} tu ImporChat
                <span className="block text-cyan-300">vendiendo hoy mismo.</span>
              </h2>
              <p className="mt-3 text-[14px] leading-6 text-slate-200/90">
                Vemos que todavía no conectaste tu primer número. Un especialista de
                nuestro equipo lo hace contigo en una videollamada y te deja el
                asistente respondiendo a tus clientes.
              </p>

              <ul className="mt-6 space-y-3.5">
                {PASOS.map((p, i) => (
                  <li key={p.titulo} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
                      <i className={`bx ${p.icon} text-xl text-cyan-200`} />
                    </span>
                    <div>
                      <div className="text-[14px] font-bold leading-5">
                        <span className="mr-1.5 text-cyan-300/90">{i + 1}.</span>
                        {p.titulo}
                      </div>
                      <div className="text-[12.5px] leading-5 text-slate-300/90">{p.detalle}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Lado derecho: la acción */}
            <div className="flex flex-col justify-center px-7 py-8 md:px-9 md:py-10">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["CM", "JG", "AQ"].map((ini) => (
                    <span
                      key={ini}
                      className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-cyan-500 to-sky-700 text-[11px] font-bold text-white ring-2 ring-white"
                    >
                      {ini}
                    </span>
                  ))}
                </div>
                <div className="text-[12.5px] leading-5 text-slate-600">
                  <span className="font-bold text-slate-900">Equipo comercial ImporChat</span>
                  <br />
                  Elige el horario que mejor te quede.
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-slate-500">
                  <i className="bx bx-time-five text-base text-sky-600" /> Qué necesitas tener a mano
                </div>
                <ul className="mt-2 space-y-1.5 text-[13px] leading-5 text-slate-700">
                  <li className="flex gap-2"><i className="bx bx-check text-lg text-emerald-600" /> El celular con el número que vas a conectar</li>
                  <li className="flex gap-2"><i className="bx bx-check text-lg text-emerald-600" /> Acceso a tu Facebook Business (o lo creamos juntos)</li>
                  <li className="flex gap-2"><i className="bx bx-check text-lg text-emerald-600" /> Tu lista de productos o servicios</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => responder("agendo")}
                disabled={!!enviando}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
                style={{ background: "linear-gradient(90deg, #0284c7 0%, #0ea5e9 100%)" }}
              >
                <i className="bx bx-calendar-plus text-xl" />
                Agendar mi implementación
                <i className="bx bx-right-arrow-alt text-xl" />
              </button>
              <p className="mt-2 text-center text-[11.5px] text-slate-500">
                Se abre nuestra agenda (Calendly) en una pestaña nueva.
              </p>

              <div className="mt-5 flex items-center justify-center gap-4 text-[12.5px]">
                <button
                  type="button"
                  onClick={() => responder("no_por_ahora")}
                  disabled={!!enviando}
                  className="font-semibold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline disabled:opacity-60"
                >
                  No por ahora
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => responder("no_mostrar")}
                  disabled={!!enviando}
                  className="text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline disabled:opacity-60"
                >
                  No volver a mostrar
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
