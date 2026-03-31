import React, { useState, useRef, useEffect } from "react";

const ModalCodigoPromo = ({ open, onClose, onSuccess, idUsuario, chatApi }) => {
  const [codigo, setCodigo] = useState("");
  const [step, setStep] = useState("input"); // input | validating | valid | redeeming | success | error
  const [message, setMessage] = useState("");
  const [imagenesRegalo, setImagenesRegalo] = useState(0);
  const [angulosRegalo, setAngulosRegalo] = useState(0);
  const [unlockPlanId, setUnlockPlanId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setCodigo("");
      setStep("input");
      setMessage("");
      setImagenesRegalo(0);
      setAngulosRegalo(0);
      setUnlockPlanId(null);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const isUnlockCode = Boolean(unlockPlanId);
  const hasResources = imagenesRegalo > 0 || angulosRegalo > 0;

  const handleValidate = async () => {
    if (!codigo.trim()) return;
    setStep("validating");
    setMessage("");
    try {
      const { data } = await chatApi.post(
        "stripe_plan/validarCodigoPromo",
        { id_usuario: idUsuario, codigo: codigo.trim() },
        { headers },
      );
      if (data?.success && data?.valid) {
        setStep("valid");
        setImagenesRegalo(data.imagenes_regalo || 0);
        setAngulosRegalo(data.angulos_regalo || 0);
        setUnlockPlanId(data.unlock_plan_id || null);
        setMessage(data.message || "Código válido.");
      } else {
        setStep("error");
        setMessage(data?.message || "Código no válido.");
      }
    } catch (err) {
      setStep("error");
      setMessage(err?.response?.data?.message || "Error al validar el código.");
    }
  };

  const handleRedeem = async () => {
    setStep("redeeming");
    try {
      const { data } = await chatApi.post(
        "stripe_plan/canjearCodigoPromo",
        { id_usuario: idUsuario, codigo: codigo.trim() },
        { headers },
      );
      if (data?.success) {
        setStep("success");
        setImagenesRegalo(data.imagenes_otorgadas || 0);
        setAngulosRegalo(data.angulos_otorgados || 0);
        setUnlockPlanId(data.unlocked_plan_id || null);
        setMessage(data.message || "¡Código canjeado!");
      } else {
        setStep("error");
        setMessage(data?.message || "No se pudo canjear.");
      }
    } catch (err) {
      setStep("error");
      setMessage(err?.response?.data?.message || "Error al canjear el código.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && step === "input" && codigo.trim()) {
      handleValidate();
    }
  };

  // Helper: construir texto de regalo
  const giftSummary = () => {
    if (isUnlockCode && !hasResources) return "Plan exclusivo desbloqueado";
    const parts = [];
    if (imagenesRegalo > 0) parts.push(`${imagenesRegalo} imágenes`);
    if (angulosRegalo > 0) parts.push(`${angulosRegalo} ángulos AI`);
    if (isUnlockCode) parts.push("+ plan exclusivo");
    return parts.join(" + ") || "recursos gratis";
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-[90%] max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "promoSlideUp 0.25s ease-out" }}
      >
        {/* Top accent line */}
        <div
          className="h-1 w-full"
          style={{
            background:
              "linear-gradient(90deg, #F59E0B 0%, #F97316 50%, #EF4444 100%)",
          }}
        />

        <div className="p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background:
                  step === "success"
                    ? "rgba(16,185,129,0.1)"
                    : "rgba(245,158,11,0.1)",
              }}
            >
              {step === "success" ? (
                <svg
                  className="w-6 h-6 text-emerald-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-amber-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-center text-[#0B1426] mb-1">
            {step === "success" ? "¡Código activado!" : "Código promocional"}
          </h3>
          <p className="text-xs text-slate-500 text-center mb-5">
            {step === "success"
              ? giftSummary()
              : "Ingresa tu código para obtener recursos gratis"}
          </p>

          {/* ── INPUT STEP ── */}
          {(step === "input" || step === "validating" || step === "error") && (
            <>
              <div className="relative mb-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={codigo}
                  onChange={(e) => {
                    setCodigo(e.target.value.toUpperCase());
                    if (step === "error") setStep("input");
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ej: LANZA25"
                  maxLength={30}
                  disabled={step === "validating"}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-semibold text-center tracking-widest uppercase border-2 transition-all duration-200 outline-none
                    ${
                      step === "error"
                        ? "border-red-300 bg-red-50/50 text-red-700 placeholder-red-300"
                        : "border-slate-200 bg-slate-50/50 text-[#0B1426] placeholder-slate-300 focus:border-amber-400 focus:bg-white"
                    }`}
                />
                {step === "validating" && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      className="w-5 h-5 animate-spin text-amber-500"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        opacity="0.25"
                      />
                      <path
                        d="M21 12a9 9 0 0 0-9-9"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {step === "error" && message && (
                <p className="text-xs text-red-500 text-center mb-3">
                  {message}
                </p>
              )}

              <button
                onClick={handleValidate}
                disabled={!codigo.trim() || step === "validating"}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-200
                  ${
                    !codigo.trim() || step === "validating"
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-[#0B1426] text-white hover:bg-[#1a2744] hover:shadow-lg active:scale-[0.98]"
                  }`}
              >
                {step === "validating" ? "Verificando..." : "Aplicar código"}
              </button>
            </>
          )}

          {/* ── VALID STEP (confirmar canje) ── */}
          {step === "valid" && (
            <>
              <div
                className="mb-4 px-4 py-3 rounded-xl text-center"
                style={{
                  background: "rgba(245,158,11,0.06)",
                  border: "1px solid rgba(245,158,11,0.15)",
                }}
              >
                <p className="text-sm font-bold text-amber-700 mb-2">
                  {codigo}
                </p>

                {/* Mostrar recursos si los hay */}
                {hasResources && (
                  <div className="flex items-center justify-center gap-4 mb-2">
                    {imagenesRegalo > 0 && (
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-extrabold text-amber-600">
                          {imagenesRegalo}
                        </span>
                        <span className="text-[10px] text-amber-600/70 font-medium">
                          imágenes
                        </span>
                      </div>
                    )}
                    {imagenesRegalo > 0 && angulosRegalo > 0 && (
                      <span className="text-amber-300 text-lg font-light">
                        +
                      </span>
                    )}
                    {angulosRegalo > 0 && (
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-extrabold text-amber-600">
                          {angulosRegalo}
                        </span>
                        <span className="text-[10px] text-amber-600/70 font-medium">
                          ángulos AI
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Mostrar badge de desbloqueo de plan */}
                {isUnlockCode && (
                  <div
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg mt-1"
                    style={{
                      background: "rgba(245,158,11,0.1)",
                      border: "1px solid rgba(245,158,11,0.2)",
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>🎓</span>
                    <span className="text-xs font-bold text-amber-700">
                      Desbloquea Plan Comunidad — $29/mes
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStep("input");
                    setMessage("");
                    setUnlockPlanId(null);
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                >
                  Cambiar
                </button>
                <button
                  onClick={handleRedeem}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg active:scale-[0.98]"
                  style={{
                    background:
                      "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
                  }}
                >
                  Activar ahora
                </button>
              </div>
            </>
          )}

          {/* ── REDEEMING ── */}
          {step === "redeeming" && (
            <div className="flex flex-col items-center py-4">
              <svg
                className="w-8 h-8 animate-spin text-amber-500 mb-3"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  opacity="0.25"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
              <p className="text-sm text-slate-500">Activando tu código...</p>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === "success" && (
            <>
              <div
                className="mb-4 px-4 py-4 rounded-xl"
                style={{
                  background: isUnlockCode
                    ? "rgba(245,158,11,0.06)"
                    : "rgba(16,185,129,0.06)",
                  border: isUnlockCode
                    ? "1px solid rgba(245,158,11,0.15)"
                    : "1px solid rgba(16,185,129,0.15)",
                }}
              >
                {/* Recursos regalados */}
                {hasResources && (
                  <div className="flex items-center justify-center gap-5 mb-2">
                    {imagenesRegalo > 0 && (
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-extrabold text-emerald-600">
                          {imagenesRegalo}
                        </span>
                        <span className="text-[10px] text-emerald-600/70 font-medium">
                          imágenes
                        </span>
                      </div>
                    )}
                    {imagenesRegalo > 0 && angulosRegalo > 0 && (
                      <span className="text-emerald-300 text-lg font-light">
                        +
                      </span>
                    )}
                    {angulosRegalo > 0 && (
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-extrabold text-emerald-600">
                          {angulosRegalo}
                        </span>
                        <span className="text-[10px] text-emerald-600/70 font-medium">
                          ángulos AI
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Plan desbloqueado */}
                {isUnlockCode && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <span style={{ fontSize: "24px" }}>🎓</span>
                    <div className="text-center">
                      <p className="text-sm font-bold text-amber-700">
                        Plan Comunidad desbloqueado
                      </p>
                      <p className="text-[10px] text-amber-600/70">
                        Ecosistema completo a $29/mes
                      </p>
                    </div>
                  </div>
                )}

                {!isUnlockCode && (
                  <p className="text-[10px] text-emerald-600/60 text-center mt-2">
                    disponibles en tu cuenta
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  onClose();
                  if (onSuccess)
                    onSuccess({
                      imagenes: imagenesRegalo,
                      angulos: angulosRegalo,
                      unlocked_plan_id: unlockPlanId,
                    });
                }}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg active:scale-[0.98]"
                style={{
                  background: isUnlockCode
                    ? "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
                    : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                }}
              >
                {isUnlockCode ? "Ver planes" : "Empezar a crear"}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes promoSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ModalCodigoPromo;
