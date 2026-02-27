import React from "react";
import ReactDOM from "react-dom";

/**
 * ModalGuiaWhatsappApi
 * Explica cómo conectar un número exclusivamente via WhatsApp Business API.
 * El número deja de funcionar en el celular y queda 100% en el sistema.
 *
 * Props:
 *   onClose — función para cerrar el modal
 */

const STEPS = [
  {
    icon: "bx bx-phone",
    title: "Elige o prepara el número",
    desc: "Puede ser un número nuevo (SIM sin usar y estar asociado a WhatsApp), o uno existente de WhatsApp normal que quieras migrar. Al migrar, ese número dejará de funcionar en el celular.",
  },
  {
    icon: "bx bxl-meta",
    title: "Conéctalo con Meta Business Manager",
    desc: "Selecciona el botón Meta Business Manager, agrega tu número y sigue el proceso de Embedded Signup. Esto crea el puente entre el número y la API.",
  },
  {
    icon: "bx bxs-zap",
    title: "Configura tu automatización",
    desc: "Con el número activo, configura el bot, flujos de atención y respuestas automáticas. Todos los mensajes pasan exclusivamente por el sistema web.",
  },
];

const GuiaWhatsappApiModal = ({ onClose }) => {
  return ReactDOM.createPortal(
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[10000] bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: "waOverlayIn .2s ease" }}
      />

      {/* Contenedor centrado */}
      <div
        className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="w-full max-w-[600px] rounded-2xl bg-[#064e3b] shadow-[0_40px_100px_rgba(2,6,23,.35)] overflow-hidden"
          style={{
            pointerEvents: "auto",
            animation: "waSheetIn .25s ease-out",
            maxHeight: "92dvh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ── Header ── */}
          <div
            className="p-5 flex items-start justify-between gap-4 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/10 grid place-items-center ring-1 ring-white/20">
                <i className="bx bxl-whatsapp text-2xl text-white" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">
                  Guía de conexión
                </div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  Solo WhatsApp API
                </h2>
                <p className="text-[12px] text-white/55 mt-0.5 max-w-xs">
                  Número exclusivo del sistema. Sin app de celular, 100%
                  automatizado vía API.
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
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {[
                {
                  icon: "bx bx-check",
                  label: "100% automatizado",
                  color: "bg-emerald-50 text-emerald-700 ring-emerald-200",
                },
                {
                  icon: "bx bx-check",
                  label: "Sin app de celular",
                  color: "bg-slate-50 text-slate-700 ring-slate-200",
                },
                {
                  icon: "bx bx-check",
                  label: "Alta velocidad de envío",
                  color: "bg-indigo-50 text-indigo-700 ring-indigo-200",
                },
                {
                  icon: "bx bx-check",
                  label: "Número nuevo o migrado",
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
                  src="https://www.youtube.com/embed/NUbSI7nU3Bs?start=224"
                  title="Cómo conectar solo con WhatsApp Business API"
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
                Pasos para conectar por WhatsApp API
              </div>
              <div className="space-y-3">
                {STEPS.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div
                      className="shrink-0 w-7 h-7 rounded-full grid place-items-center text-white text-xs font-bold mt-0.5"
                      style={{ background: "#065f46" }}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <i
                          className={`${step.icon} text-base text-emerald-600`}
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

            {/* Diferencia clave vs Coexistencia */}
            <div className="flex gap-3 items-start p-3.5 rounded-xl bg-emerald-50 ring-1 ring-emerald-200">
              <i className="bx bx-transfer-alt text-xl text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-emerald-800 mb-1">
                  ¿En qué se diferencia de Coexistencia?
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
                  <div>
                    <span className="font-semibold text-slate-700">
                      Solo API
                    </span>
                    <ul className="mt-1 space-y-0.5 text-slate-500 list-none">
                      <li>✅ Número exclusivo del sistema</li>
                      <li>✅ Mayor velocidad de envío masivo</li>
                      <li>❌ No funciona en celular</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">
                      Coexistencia
                    </span>
                    <ul className="mt-1 space-y-0.5 text-slate-500 list-none">
                      <li>✅ Celular + sistema web</li>
                      <li>✅ Sin cambios en tu uso diario</li>
                      <li>⚠️ Requiere WhatsApp Business App</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning migración */}
            <div className="flex gap-3 items-start p-3 rounded-xl bg-rose-50 ring-1 ring-rose-200">
              <i className="bx bx-error text-lg text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-rose-700 leading-5">
                <strong>Atención al migrar:</strong> Si el número ya tiene
                WhatsApp activo, deberás{" "}
                <strong>
                  eliminar la cuenta de WhatsApp de ese número antes de
                  continuar.
                </strong>{" "}
                Esto libera el número para usarlo exclusivamente en el sistema
                web. Si no quieres perder el acceso desde tu celular, considera
                usar la opción de Coexistencia.
              </p>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between p-4 border-t border-slate-200 flex-shrink-0 bg-white">
            <span className="text-[11px] text-slate-400">
              ¿Dudas? Contáctanos por soporte.
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl font-semibold text-sm text-white transition hover:brightness-110"
              style={{ background: "#065f46" }}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes waOverlayIn { from { opacity:0; } to { opacity:1; } }
        @keyframes waSheetIn  { from { opacity:0; transform:translateY(14px) scale(.98); } to { opacity:1; transform:none; } }
      `}</style>
    </>,
    document.body,
  );
};

export default GuiaWhatsappApiModal;
