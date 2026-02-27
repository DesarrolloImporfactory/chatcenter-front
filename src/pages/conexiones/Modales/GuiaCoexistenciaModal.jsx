import React from "react";
import ReactDOM from "react-dom";

/**
 * ModalGuiaCoexistencia
 * Explica cómo conectar WhatsApp manteniendo el celular activo
 * y automatizando mensajes desde el sistema web al mismo tiempo.
 *
 * Props:
 *   onClose — función para cerrar el modal
 */

const STEPS = [
  {
    icon: "bx bxl-whatsapp",
    title: "Tu número en WhatsApp Business App",
    desc: "El número debe estar activo en la app de WhatsApp Business en tu celular. No necesitas migrar ni dejar de usarlo.",
  },
  {
    icon: "bx bxl-meta",
    title: "Conéctalo con Meta Business Manager",
    desc: "Selecciona el botón Meta Business Manager, agrega tu número y sigue el proceso de Embedded Signup. Esto crea el puente entre el celular y la API.",
  },
  {
    icon: "bx bx-link",
    title: "Activa la Coexistencia",
    desc: "Con Coexistencia activada, los mensajes llegan tanto al celular como al sistema web. El bot responde desde el sistema sin interrumpir tu uso normal del celular.",
  },
  {
    icon: "bx bx-refresh",
    title: "Sincroniza tus chats históricos",
    desc: "Usa el botón de sincronización ↻ en la tarjeta de tu conexión para importar conversaciones existentes al sistema web.",
  },
  {
    icon: "bx bxs-zap",
    title: "¡Listo para automatizar!",
    desc: "Configura tu bot, flujos automáticos y respuestas inteligentes. Todo mientras sigues recibiendo y enviando mensajes normalmente desde tu celular.",
  },
];

const GuiaCoexistenciaModal = ({ onClose }) => {
  return ReactDOM.createPortal(
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[10000] bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: "cgOverlayIn .2s ease" }}
      />

      {/* Contenedor centrado */}
      <div
        className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="w-full max-w-[600px] rounded-2xl bg-[#171931] shadow-[0_40px_100px_rgba(2,6,23,.35)] overflow-hidden"
          style={{
            pointerEvents: "auto",
            animation: "cgSheetIn .25s ease-out",
            maxHeight: "92dvh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ── Header ── */}
          <div className="bg-[#171931] p-5 flex items-start justify-between gap-4 flex-shrink-0 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/10 grid place-items-center ring-1 ring-white/20">
                <i className="bx bx-mobile-alt text-2xl text-white" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">
                  Guía de conexión
                </div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  Coexistencia — Celular + Web
                </h2>
                <p className="text-[12px] text-white/55 mt-0.5 max-w-xs">
                  Automatiza desde el sistema y sigue usando WhatsApp en tu
                  celular al mismo tiempo.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 grid place-items-center text-white/60 hover:text-white transition flex-shrink-0 mt-0.5"
            >
              <i className="bx bx-x text-xl" />
            </button>
          </div>

          {/* ── Body scrollable ── */}
          <div className="overflow-y-auto flex-1 p-5 space-y-5 bg-white">
            {/* Badges de diferenciadores */}
            <div className="flex flex-wrap gap-2">
              {[
                {
                  icon: "bx bx-check",
                  label: "Celular activo",
                  color: "bg-emerald-50 text-emerald-700 ring-emerald-200",
                },
                {
                  icon: "bx bx-check",
                  label: "Bot en la web",
                  color: "bg-indigo-50 text-indigo-700 ring-indigo-200",
                },
                {
                  icon: "bx bx-check",
                  label: "Sin migrar el número",
                  color: "bg-slate-50 text-slate-700 ring-slate-200",
                },
                {
                  icon: "bx bx-check",
                  label: "Historial sincronizable",
                  color: "bg-amber-50 text-amber-700 ring-amber-200",
                },
              ].map((b, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${b.color}`}
                >
                  <i className={`${b.icon} text-sm`} />
                  {b.label}
                </span>
              ))}
            </div>

            {/* Video embed */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Video tutorial
              </div>
              <div
                className="rounded-xl overflow-hidden ring-1 ring-slate-200 bg-black"
                style={{ aspectRatio: "16/9" }}
              >
                <iframe
                  src="https://www.youtube.com/embed/MhSVx2oxoVo"
                  title="Cómo conectar WhatsApp con Coexistencia"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                  style={{ border: "none", display: "block" }}
                />
              </div>
            </div>

            {/* Pasos */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Pasos para activar la Coexistencia
              </div>
              <div className="space-y-3">
                {STEPS.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    {/* Número */}
                    <div className="shrink-0 w-7 h-7 rounded-full bg-[#171931] grid place-items-center text-white text-xs font-bold mt-0.5">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <i
                          className={`${step.icon} text-base text-indigo-600`}
                        />
                        {step.title}
                      </div>
                      <p className="text-[13px] text-slate-500 leading-5 mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nota importante */}
            <div className="flex gap-3 items-start p-3.5 rounded-xl bg-indigo-50 ring-1 ring-indigo-200">
              <i className="bx bx-info-circle text-xl text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-indigo-800 mb-0.5">
                  ¿Qué pasa con los mensajes?
                </div>
                <p className="text-[13px] text-indigo-700 leading-5">
                  Con Coexistencia,{" "}
                  <strong>todos los mensajes entran al sistema web</strong>. El
                  bot responde automáticamente. Si un agente toma el chat, puede
                  responder desde la web o desde el celular. Los dos canales
                  conviven sin conflicto.
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="flex gap-3 items-start p-3 rounded-xl bg-amber-50 ring-1 ring-amber-200">
              <i className="bx bx-error-circle text-lg text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-amber-700 leading-5">
                <strong>Importante:</strong> La Coexistencia requiere que el
                número esté registrado en la{" "}
                <strong>app de WhatsApp Business.</strong> Si usas WhatsApp
                personal, primero migra a Business.
              </p>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between p-4 border-t border-slate-300 flex-shrink-0 bg-white">
            <span className="text-[11px] text-slate-400">
              ¿Dudas? Contáctanos por soporte.
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#171931] hover:bg-[#22254f] text-white font-semibold text-sm transition"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cgOverlayIn { from { opacity:0; } to { opacity:1; } }
        @keyframes cgSheetIn  { from { opacity:0; transform:translateY(14px) scale(.98); } to { opacity:1; transform:none; } }
      `}</style>
    </>,
    document.body,
  );
};

export default GuiaCoexistenciaModal;
