import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import chatApi from "../../api/chatcenter";

const MeshBg = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 30%, #e8eef6 60%, #f1f5f9 100%)",
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(rgba(11,20,38,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(11,20,38,0.04) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }}
    />
    <div
      className="absolute w-[500px] h-[500px] rounded-full"
      style={{
        top: "-10%",
        right: "-5%",
        background:
          "radial-gradient(circle, rgba(0,191,255,0.12), transparent 65%)",
        filter: "blur(40px)",
      }}
    />
    <div
      className="absolute w-[600px] h-[600px] rounded-full"
      style={{
        bottom: "-15%",
        left: "-10%",
        background:
          "radial-gradient(circle, rgba(16,185,129,0.10), transparent 65%)",
        filter: "blur(50px)",
      }}
    />
  </div>
);

const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
      strokeDasharray="32"
      strokeLinecap="round"
    />
  </svg>
);

// ─── Input de 6 dígitos ───
const CodeInput = ({ value, onChange }) => {
  const inputs = useRef([]);

  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val && e.nativeEvent.inputType !== "deleteContentBackward") return;
    const newCode = value.split("");
    newCode[i] = val.slice(-1);
    onChange(newCode.join(""));
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className="w-11 h-13 rounded-xl text-center text-xl font-bold bg-white text-[#0B1426] border-2 border-slate-200/80 outline-none transition-all focus:border-[#0B1426] focus:shadow-[0_0_0_3px_rgba(11,20,38,0.06)]"
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [countdown, setCountdown] = useState(0);
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ─── PASO 1: Solicitar código ───
  const handleSolicitar = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await chatApi.post(
        "/auth/password-reset/request",
        {
          email: email.trim().toLowerCase(),
        },
        { silentError: true },
      );

      setSuccess(data.message);
      setStep(2);
      setCountdown(60);
    } catch (err) {
      setError(err.response?.data?.message || "Error al enviar el código");
    } finally {
      setLoading(false);
    }
  };

  // ─── PASO 2: Verificar código ───
  const handleVerificar = async (e) => {
    e?.preventDefault();
    if (codigo.length < 6) {
      setError("Ingresa el código completo");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { data } = await chatApi.post(
        "/auth/password-reset/verify",
        {
          email: email.trim().toLowerCase(),
          codigo,
        },
        { silentError: true },
      );
      setResetToken(data.resetToken);
      setStep(3);
      setSuccess("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  // ─── PASO 3: Cambiar contraseña ───
  const handleCambiar = async (e) => {
    e?.preventDefault();
    if (newPwd.length < 6) {
      setError("Mínimo 6 caracteres");
      return;
    }
    if (newPwd !== confirmPwd) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await chatApi.post(
        "/auth/password-reset/change",
        {
          email: email.trim().toLowerCase(),
          resetToken,
          nuevaPassword: newPwd,
        },
        { silentError: true },
      );
      setSuccess("¡Contraseña actualizada! Redirigiendo al login...");
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Error al cambiar contraseña");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { n: 1, label: "Correo" },
    { n: 2, label: "Código" },
    { n: 3, label: "Nueva contraseña" },
  ];

  const inputClass =
    "w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-white text-[#0B1426] placeholder-slate-400 outline-none border-2 border-slate-200/80 transition-all focus:border-[#0B1426] focus:shadow-[0_0_0_3px_rgba(11,20,38,0.06)]";
  const btnClass =
    "w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 shadow-lg hover:shadow-xl";

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-14">
      <MeshBg />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[440px] z-10"
      >
        <div className="rounded-3xl p-7 sm:p-9 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(11,20,38,0.08)] border border-white/80 ring-1 ring-slate-200/30">
          {/* Botón atrás */}
          <button
            onClick={() =>
              step === 1
                ? navigate("/login")
                : (setStep((s) => s - 1), setError(""))
            }
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition mb-5"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {step === 1 ? "Volver al login" : "Atrás"}
          </button>

          <h2 className="text-xl font-extrabold text-[#0B1426] mb-1">
            Recuperar contraseña
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            {step === 1 && "Ingresa el correo vinculado a tu cuenta."}
            {step === 2 && "Ingresa el código que enviamos a tu correo."}
            {step === 3 && "Crea tu nueva contraseña."}
          </p>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-6">
            {steps.map((s, i) => (
              <React.Fragment key={s.n}>
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${step >= s.n ? "bg-[#0B1426] text-white" : "bg-slate-100 text-slate-400"}`}
                >
                  {step > s.n ? (
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    s.n
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded transition-all ${step > s.n ? "bg-[#0B1426]" : "bg-slate-200"}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Mensajes */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 border border-rose-200"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600 border border-emerald-200"
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════ PASO 1: EMAIL ══════ */}
          {step === 1 && (
            <form onSubmit={handleSolicitar}>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                Correo registrado
              </label>
              <div className="relative mb-5">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="3" />
                    <path d="M22 7l-10 7L2 7" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@empresa.com"
                  required
                  autoFocus
                  className={inputClass}
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading || !email}
                className={btnClass}
                style={{
                  background: "linear-gradient(135deg, #0B1426, #1e293b)",
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner /> Buscando...
                  </span>
                ) : (
                  "Enviar código"
                )}
              </motion.button>
            </form>
          )}

          {/* ══════ PASO 2: CÓDIGO ══════ */}
          {step === 2 && (
            <form onSubmit={handleVerificar}>
              <p className="text-xs text-slate-500 mb-4 text-center">
                Enviado a{" "}
                <span className="font-semibold text-[#0B1426]">{email}</span>
              </p>
              <div className="mb-5">
                <CodeInput value={codigo} onChange={setCodigo} />
              </div>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading || codigo.length < 6}
                className={btnClass}
                style={{
                  background: "linear-gradient(135deg, #0B1426, #1e293b)",
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner /> Verificando...
                  </span>
                ) : (
                  "Verificar código"
                )}
              </motion.button>
              <div className="text-center mt-4">
                {countdown > 0 ? (
                  <span className="text-xs text-slate-400">
                    Reenviar en {countdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCodigo("");
                      handleSolicitar();
                    }}
                    className="text-xs text-[#00BFFF] hover:underline font-semibold"
                  >
                    Reenviar código
                  </button>
                )}
              </div>
            </form>
          )}

          {/* ══════ PASO 3: NUEVA CONTRASEÑA ══════ */}
          {step === 3 && (
            <form onSubmit={handleCambiar}>
              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </div>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    autoFocus
                    className={`${inputClass} !pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    <svg
                      className="w-[18px] h-[18px]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      {showPwd ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              <div className="mb-5">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="Repite tu contraseña"
                    required
                    className={inputClass}
                  />
                </div>
                {newPwd && confirmPwd && newPwd !== confirmPwd && (
                  <p className="text-rose-500 text-xs mt-1">
                    Las contraseñas no coinciden
                  </p>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading || !newPwd || !confirmPwd}
                className={btnClass}
                style={{
                  background: "linear-gradient(135deg, #0B1426, #1e293b)",
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner /> Actualizando...
                  </span>
                ) : (
                  "Cambiar contraseña"
                )}
              </motion.button>
            </form>
          )}

          {/* Footer */}
          <div className="flex items-center justify-center gap-1.5 mt-5 text-[10px] text-slate-400">
            <svg
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Protegido con encriptación SSL
          </div>
        </div>
      </motion.div>

      <footer className="absolute bottom-3 inset-x-0 text-center text-[10px] text-slate-400">
        <span>Imporfactory © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
