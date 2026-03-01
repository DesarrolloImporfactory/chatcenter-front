import React, { useState } from "react";
import chatApi from "../../../api/chatcenter";
import Swal from "sweetalert2";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

// 3 pasos del flujo — sin mencionar modelos internos
const FLOW_STEPS = [
  {
    icon: "bx-layout",
    label: "Tu diseño\n+ tus fotos",
    color: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    icon: "bx-analyse",
    label: "La IA analiza\nel estilo",
    color: "bg-indigo-600 text-white border-indigo-600",
  },
  {
    icon: "bx-image",
    label: "Anuncio\nlisto",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
];

const CONNECT_STEPS = [
  {
    n: "01",
    icon: "bx-globe",
    title: "Abre Google AI Studio",
    desc: "Entra a",
    link: {
      label: "aistudio.google.com/apikey",
      url: "https://aistudio.google.com/apikey",
    },
  },
  {
    n: "02",
    icon: "bx-plus-circle",
    title: "Crea tu API Key",
    desc: 'Inicia sesión con tu cuenta de Google y haz clic en "Create API Key". Copia la clave generada.',
    link: null,
  },
  {
    n: "03",
    icon: "bx-wallet",
    title: "Recarga saldo a tu cuenta",
    desc: "La generación de imágenes consume créditos de tu cuenta de Google AI Studio. Recarga saldo en",
    link: {
      label: "aistudio.google.com/spend",
      url: "https://aistudio.google.com/spend",
    },
  },
];

const GeminiApiKeyModal = ({
  onClose,
  hasApiKey,
  onSaved,
  idConfiguracion,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const isValid = apiKey.trim().startsWith("AIza") && apiKey.trim().length > 20;

  const handleSave = async () => {
    if (!isValid) {
      Toast.fire({
        icon: "warning",
        title: "La clave debe empezar con AIza...",
      });
      return;
    }
    setSaving(true);
    try {
      await chatApi.post("gemini/guardar_api_key", {
        id_configuracion: idConfiguracion,
        api_key: apiKey.trim(),
      });
      Toast.fire({ icon: "success", title: "API Key guardada correctamente" });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al guardar la API Key",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* max-h-[90vh] + flex col para que header/footer sean fijos y el body haga scroll */}
      <div
        className="w-full max-w-xl flex flex-col max-h-[90vh] rounded-3xl overflow-hidden"
        style={{ border: "none" }}
      >
        {/* ── Header oscuro ── */}
        <div className="bg-[#171931] px-6 py-5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 grid place-items-center">
                <i className="bx bx-key text-lg text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base leading-tight">
                  {hasApiKey ? "Actualizar" : "Conectar"} API Key · Google AI
                </h2>
                <p className="text-white/50 text-[11px] mt-0.5">
                  Necesaria para que la IA genere tus imágenes
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 transition grid place-items-center"
            >
              <i className="bx bx-x text-white text-lg" />
            </button>
          </div>
        </div>

        {/* ── Cuerpo scrollable — fondo blanco limpio ── */}
        <div className="bg-white overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Estado activo */}
          {hasApiKey && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 grid place-items-center shrink-0">
                <i className="bx bx-check-shield text-sm text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-700">
                  Clave activa y cifrada
                </p>
                <p className="text-[11px] text-emerald-600 mt-0.5">
                  Tu API Key está guardada de forma segura en el servidor
                </p>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
                Activa
              </span>
            </div>
          )}

          {/* Input */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {hasApiKey ? "Nueva API Key" : "Tu API Key de Google AI Studio"}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-indigo-50 grid place-items-center">
                <i className="bx bx-key text-sm text-indigo-500" />
              </div>
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className={`w-full border rounded-2xl pl-12 pr-12 py-3 text-sm font-mono transition
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  ${
                    apiKey && !isValid
                      ? "border-rose-200 bg-rose-50"
                      : "border-gray-200 bg-gray-50 focus:bg-white"
                  }`}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg hover:bg-gray-200 transition grid place-items-center"
              >
                <i
                  className={`bx ${showKey ? "bx-hide" : "bx-show"} text-sm text-gray-400`}
                />
              </button>
            </div>
            {apiKey && (
              <p
                className={`flex items-center gap-1.5 mt-2 text-[11px] ${isValid ? "text-emerald-600" : "text-rose-500"}`}
              >
                <i
                  className={`bx ${isValid ? "bx-check-circle" : "bx-error-circle"} text-xs`}
                />
                {isValid
                  ? "Formato válido — se guardará de una forma cifrada"
                  : "Debe empezar con AIza... y tener más de 20 caracteres"}
              </p>
            )}
          </div>

          {/* ── Flujo en 3 pasos ── */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-1.5">
              <i className="bx bx-git-compare text-xs" />
              Cómo funciona
            </p>

            {/* Grid: paso · flecha · paso · flecha · paso */}
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-2">
              {FLOW_STEPS.map((s, i) => (
                <React.Fragment key={i}>
                  <div
                    className={`flex flex-col items-center justify-center gap-2 px-3 py-3 rounded-xl border ${s.color} text-center`}
                  >
                    <i className={`bx ${s.icon} text-xl`} />
                    <span className="text-[10px] font-semibold leading-snug whitespace-pre-line">
                      {s.label}
                    </span>
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <div className="flex items-center justify-center">
                      <i className="bx bx-chevron-right text-gray-300 text-xl" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">
              La IA analiza el estilo visual de tu banner, lo combina con las
              fotos de tu producto y genera una imagen publicitaria lista para
              publicar. Tu clave nunca se expone a terceros.
            </p>
          </div>

          {/* Cómo obtener la clave */}
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <i className="bx bx-list-ol text-xs" />
              Cómo obtener tu clave
            </p>
            <div className="space-y-2">
              {CONNECT_STEPS.map((s) => (
                <div
                  key={s.n}
                  className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-white"
                >
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-[10px] font-bold grid place-items-center shrink-0 mt-0.5">
                    {s.n}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-800">
                      {s.title}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                      {s.desc}{" "}
                      {s.link && (
                        <a
                          href={s.link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 font-semibold hover:text-indigo-800 underline underline-offset-2"
                        >
                          {s.link.label}
                        </a>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seguridad */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <i className="bx bx-shield-quarter text-sm text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Tu clave se guarda cifrada y nunca se muestra completa. No la
              compartas por WhatsApp ni capturas. Si sospechas que fue expuesta,
              regénérala desde AI Studio y actualízala aquí.
            </p>
          </div>
        </div>

        {/* ── Footer blanco con línea divisora gris ── */}
        <div className="bg-white border-t border-gray-200/70 px-6 py-4 flex items-center justify-between shrink-0">
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            <i className="bx bx-link-external text-sm" />
            Abrir Google AI Studio
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isValid}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition inline-flex items-center gap-2
                ${
                  saving || !isValid
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
            >
              {saving ? (
                <>
                  <svg
                    className="animate-spin w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <i className="bx bx-save text-sm" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeminiApiKeyModal;
