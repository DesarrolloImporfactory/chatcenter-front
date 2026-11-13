import React from "react";
import ReactDOM from "react-dom";

/**
 * GuiaClaudeModal
 * Mismo modal que la guía de OpenAI (GuiaOpenAIModal), para Claude
 * (Anthropic): video tutorial con vista previa, pasos para generar la API Key
 * y para recargar saldo.
 *
 * Props:
 *   onClose  — función para cerrar el modal
 *   videoUrl — enlace de YouTube del tutorial (watch?v=… o youtu.be/…)
 */

const STEPS_APIKEY = [
  {
    icon: "bx bx-user-plus",
    title: "Crea o accede a tu cuenta de Claude Console",
    desc: "Ve a console.anthropic.com y regístrate con el correo de tu negocio. Es la consola para desarrolladores: no es lo mismo que la app de chat claude.ai.",
  },
  {
    icon: "bx bx-key",
    title: "Abre el panel de API Keys",
    desc: 'En la pantalla de inicio toca "Obtener clave de API", o entra directo a console.anthropic.com/settings/keys.',
  },
  {
    icon: "bx bx-plus-circle",
    title: "Crea una nueva llave (Create Key)",
    desc: 'Haz clic en "Create Key", ponle un nombre descriptivo como "Imporchat Bot" y confirma.',
  },
  {
    icon: "bx bx-copy",
    title: "Copia la llave completa",
    desc: 'Empieza con "sk-ant-". Anthropic solo la muestra una vez: cópiala en ese momento.',
  },
  {
    icon: "bx bxs-zap",
    title: "Pega la llave en el sistema",
    desc: 'Vuelve aquí, elige Claude en el paso 1, pega la llave completa sin espacios y guarda. La validamos al instante y el bot pasa a responder con Claude.',
  },
];

const STEPS_SALDO = [
  {
    icon: "bx bx-wallet",
    title: "Ve a Billing en Claude Console",
    desc: "Entra a console.anthropic.com/settings/billing. Ahí se ven los créditos de tu organización.",
  },
  {
    icon: "bx bx-credit-card",
    title: "Agrega un método de pago",
    desc: "Registra una tarjeta de crédito o débito válida.",
  },
  {
    icon: "bx bx-dollar-circle",
    title: "Agrega fondos",
    desc: 'Toca "Agregar fondos" (Buy credits) y elige el monto. Puedes empezar con $5–$10.',
  },
  {
    icon: "bx bx-refresh",
    title: "Activa la recarga automática (recomendado)",
    desc: "Con la recarga automática el saldo se repone solo al bajar de un mínimo y el bot nunca se queda sin responder.",
  },
];

/** Saca el id del video de un enlace de YouTube (watch?v=, youtu.be/, embed/). */
function idDeYoutube(url) {
  const m = String(url || "").match(
    /(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/,
  );
  return m ? m[1] : "";
}

const GuiaClaudeModal = ({ onClose, videoUrl }) => {
  const videoId = idDeYoutube(videoUrl);

  return ReactDOM.createPortal(
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[10000] bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: "clOverlayIn .2s ease" }}
      />

      {/* Contenedor centrado */}
      <div
        className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="w-full max-w-[640px] rounded-2xl bg-[#171931] shadow-[0_40px_100px_rgba(2,6,23,.40)] overflow-hidden"
          style={{
            pointerEvents: "auto",
            animation: "clSheetIn .25s ease-out",
            maxHeight: "92dvh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ── Header ── */}
          <div className="bg-[#171931] p-5 flex items-start justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/10 grid place-items-center ring-1 ring-white/20 flex-shrink-0">
                <i className="bx bx-brain text-2xl text-white" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">
                  Guía de configuración
                </div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  API Key y Saldo en Claude
                </h2>
                <p className="text-[12px] text-white/55 mt-0.5 max-w-sm">
                  Cómo generar tu llave de acceso en Claude Console y recargar
                  crédito para que el bot pueda responder mensajes.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
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
                  label: "API Key gratuita",
                  color: "bg-indigo-50 text-indigo-700 ring-indigo-200",
                },
                {
                  label: "Saldo desde $5",
                  color: "bg-emerald-50 text-emerald-700 ring-emerald-200",
                },
                {
                  label: "Pago por uso",
                  color: "bg-slate-50 text-slate-700 ring-slate-200",
                },
                {
                  label: "Recarga automática",
                  color: "bg-amber-50 text-amber-700 ring-amber-200",
                },
              ].map((b) => (
                <span
                  key={b.label}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${b.color}`}
                >
                  <i className="bx bx-check text-sm" />
                  {b.label}
                </span>
              ))}
            </div>

            {/* Video tutorial: vista previa dentro del modal + abrir en YouTube */}
            {videoId && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Video tutorial
                  </div>
                  <a
                    href={`https://www.youtube.com/watch?v=${videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    <i className="bx bxl-youtube text-base text-rose-600" />
                    Abrir el video en YouTube
                    <i className="bx bx-link-external" />
                  </a>
                </div>
                <div
                  className="rounded-xl overflow-hidden ring-1 ring-slate-200 bg-black"
                  style={{ aspectRatio: "16/9" }}
                >
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="Cómo generar la API Key y recargar saldo en Claude"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                    style={{ border: "none", display: "block" }}
                  />
                </div>
              </div>
            )}

            {/* Sección 1 — API Key */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 grid place-items-center flex-shrink-0">
                  <i className="bx bx-key text-white text-sm" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Parte 1 — Generar la API Key
                </div>
              </div>
              <div className="space-y-3">
                {STEPS_APIKEY.map((step, i) => (
                  <div key={step.title} className="flex gap-3 items-start">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-[#171931] grid place-items-center text-white text-xs font-bold mt-0.5">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <i className={`${step.icon} text-base text-indigo-600`} />
                        {step.title}
                      </div>
                      <p className="text-[13px] text-slate-500 leading-5 mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171931] hover:bg-[#22254f] text-white text-sm font-semibold transition"
              >
                <i className="bx bx-link-external" />
                Ir a generar mi API Key
              </a>
            </div>

            <div className="border-t border-slate-200" />

            {/* Sección 2 — Saldo */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 grid place-items-center flex-shrink-0">
                  <i className="bx bx-wallet text-white text-sm" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Parte 2 — Recargar saldo
                </div>
              </div>
              <div className="space-y-3">
                {STEPS_SALDO.map((step, i) => (
                  <div key={step.title} className="flex gap-3 items-start">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-600 grid place-items-center text-white text-xs font-bold mt-0.5">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <i className={`${step.icon} text-base text-emerald-600`} />
                        {step.title}
                      </div>
                      <p className="text-[13px] text-slate-500 leading-5 mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="https://console.anthropic.com/settings/billing"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition"
              >
                <i className="bx bx-link-external" />
                Ir a recargar saldo
              </a>
            </div>

            {/* Aviso importante */}
            <div className="flex gap-3 items-start p-3.5 rounded-xl bg-amber-50 ring-1 ring-amber-200">
              <i className="bx bx-error-circle text-xl text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-amber-800 mb-0.5">
                  Sin saldo el bot no responde
                </div>
                <p className="text-[13px] text-amber-700 leading-5">
                  Aunque la API Key esté bien configurada, si tu cuenta de
                  Claude <strong>no tiene crédito disponible</strong> el
                  asistente no puede responder. Recarga antes de activar el
                  bot.
                </p>
              </div>
            </div>

            {/* OpenAI sigue haciendo falta para audios */}
            <div className="flex gap-3 items-start p-3.5 rounded-xl bg-indigo-50 ring-1 ring-indigo-200">
              <i className="bx bx-microphone text-xl text-indigo-600 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-indigo-800 leading-5">
                <strong>Conserva también tu API Key de OpenAI:</strong> Claude
                no transcribe audios. Los audios de tus clientes y las imágenes
                de producto con IA siguen usando OpenAI.
              </p>
            </div>

            {/* Seguridad */}
            <div className="flex gap-3 items-start p-3 rounded-xl bg-rose-50 ring-1 ring-rose-200">
              <i className="bx bx-shield-x text-lg text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-rose-700 leading-5">
                <strong>Seguridad:</strong> Tu API Key es una credencial
                privada. No la compartas por WhatsApp, capturas de pantalla ni
                correo. Si sospechas que fue expuesta,{" "}
                <strong>elimínala y crea una nueva</strong> en Claude Console y
                actualízala aquí de inmediato.
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
              className="px-5 py-2 rounded-xl bg-[#171931] hover:bg-[#22254f] text-white font-semibold text-sm transition"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes clOverlayIn { from { opacity:0; } to { opacity:1; } }
        @keyframes clSheetIn  { from { opacity:0; transform:translateY(14px) scale(.98); } to { opacity:1; transform:none; } }
      `}</style>
    </>,
    document.body,
  );
};

export default GuiaClaudeModal;
