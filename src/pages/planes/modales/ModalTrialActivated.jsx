import React from "react";

/**
 * ModalTrialActivated — Se muestra al activar la prueba gratuita de Insta Landing.
 *
 * Props:
 *   open       — boolean
 *   onStart    — fn (navega a /insta_landing)
 *   limit      — number (ej: 10)
 *   promoPrice — number (ej: 5)
 */
const ModalTrialActivated = ({ open, onStart, limit = 10, promoPrice = 5 }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden bg-white border"
        style={{ borderColor: "rgba(11,20,38,0.1)" }}
      >
        {/* Accent line */}
        <div
          className="h-1.5 w-full"
          style={{
            background: "linear-gradient(135deg, #0B1426 0%, #1e293b 100%)",
          }}
        />

        <div className="px-7 pt-7 pb-6">
          {/* Icon — check circle */}
          <div
            className="mx-auto w-14 h-14 rounded-2xl grid place-items-center mb-5"
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.15)",
            }}
          >
            <svg
              className="w-7 h-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#10B981"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-center text-lg font-extrabold text-[#0B1426] tracking-tight">
            Prueba gratuita activada
          </h3>

          {/* Limit highlight */}
          <div className="mt-4 flex items-center justify-center">
            <div
              className="px-5 py-2.5 rounded-xl text-center"
              style={{
                background: "rgba(11,20,38,0.03)",
                border: "1px solid rgba(11,20,38,0.08)",
              }}
            >
              <span className="text-3xl font-extrabold text-[#0B1426]">
                {limit}
              </span>
              <span className="text-sm font-semibold text-slate-500 ml-1.5">
                imágenes gratis
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-center text-[13px] text-slate-500 mt-4 leading-relaxed">
            Genera banners y landings con IA ahora mismo.
            <br />
            Al terminar, suscríbete desde{" "}
            <b className="text-[#0B1426]">${promoPrice}/mes</b>.
          </p>

          {/* Action */}
          <div className="mt-6">
            <button
              onClick={onStart}
              className="w-full rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:-translate-y-[1px] active:translate-y-0"
              style={{
                background: "linear-gradient(135deg, #0B1426 0%, #1e293b 100%)",
              }}
            >
              Empezar a crear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalTrialActivated;
