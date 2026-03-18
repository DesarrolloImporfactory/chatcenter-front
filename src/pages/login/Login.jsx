import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { loginThunk } from "./../../store/slices/user.slice";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

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
      className="absolute w-[500px] h-[500px] rounded-full animate-[drift1_20s_ease-in-out_infinite]"
      style={{
        top: "-10%",
        right: "-5%",
        background:
          "radial-gradient(circle, rgba(0,191,255,0.12), transparent 65%)",
        filter: "blur(40px)",
      }}
    />
    <div
      className="absolute w-[600px] h-[600px] rounded-full animate-[drift2_25s_ease-in-out_infinite]"
      style={{
        bottom: "-15%",
        left: "-10%",
        background:
          "radial-gradient(circle, rgba(16,185,129,0.10), transparent 65%)",
        filter: "blur(50px)",
      }}
    />
    <div
      className="absolute w-[350px] h-[350px] rounded-full animate-[drift3_18s_ease-in-out_infinite]"
      style={{
        top: "30%",
        left: "30%",
        background:
          "radial-gradient(circle, rgba(99,102,241,0.06), transparent 65%)",
        filter: "blur(30px)",
      }}
    />
    <svg
      className="absolute top-[15%] right-[20%] w-8 h-8 text-cyan-300/20 animate-[spin_30s_linear_infinite]"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
    <svg
      className="absolute bottom-[25%] left-[15%] w-6 h-6 text-emerald-300/20 animate-[spin_25s_linear_infinite_reverse]"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
    <svg
      className="absolute top-[60%] right-[12%] w-5 h-5 text-indigo-300/15 animate-[spin_35s_linear_infinite]"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <polygon points="12 2 22 22 2 22" />
    </svg>
    <style>{`
      @keyframes drift1 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(-30px,20px)} 66%{transform:translate(20px,-15px)} }
      @keyframes drift2 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(25px,-20px)} 66%{transform:translate(-15px,25px)} }
      @keyframes drift3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(15px,15px)} }
    `}</style>
  </div>
);

const TypeWriter = ({ texts, speed = 80, pause = 2000 }) => {
  const [idx, setIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const text = texts[idx];
    if (!deleting && chars < text.length) {
      const t = setTimeout(() => setChars((c) => c + 1), speed);
      return () => clearTimeout(t);
    }
    if (!deleting && chars === text.length) {
      const t = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(t);
    }
    if (deleting && chars > 0) {
      const t = setTimeout(() => setChars((c) => c - 1), speed / 2);
      return () => clearTimeout(t);
    }
    if (deleting && chars === 0) {
      setDeleting(false);
      setIdx((i) => (i + 1) % texts.length);
    }
  }, [chars, deleting, idx, texts, speed, pause]);
  return (
    <span>
      {texts[idx].slice(0, chars)}
      <span className="animate-pulse">|</span>
    </span>
  );
};

const ChannelPill = ({ icon, name, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 backdrop-blur shadow-sm border border-slate-200/60"
  >
    {icon}
    <span className="text-[11px] font-semibold text-slate-700">{name}</span>
    <span
      className="w-1.5 h-1.5 rounded-full animate-pulse"
      style={{ background: color }}
    />
  </motion.div>
);

const EyeIcon = ({ show }) => (
  <svg
    className="w-[18px] h-[18px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    {show ? (
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
);

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({ mode: "onTouched" });

  const onSubmit = (data) => {
    return dispatch(loginThunk(data))
      .unwrap()
      .then((userData) => {
        reset();
        const role = localStorage.getItem("user_role");

        // Super admin → directo
        if (role === "super_administrador") {
          navigate("/administrador-conexiones");
          return;
        }

        const { estado, trial_end, id_plan, fecha_renovacion, permanente } =
          userData;
        const ahora = new Date();

        // Permanente → selector
        if (Number(permanente) === 1) {
          navigate("/selector");
          return;
        }

        // Suspendido/cancelado → planes
        if (estado === "suspendido" || estado === "cancelado") {
          navigate("/planes");
          return;
        }

        // Trial Stripe vigente → selector
        if (estado === "activo" && trial_end && ahora <= new Date(trial_end)) {
          navigate("/selector");
          return;
        }

        // Trial por uso (Insta Landing) → selector (tiene acceso limitado)
        if (estado === "trial_usage") {
          navigate("/selector");
          return;
        }

        // Promo usage (código promocional) → selector
        if (estado === "promo_usage") {
          navigate("/selector");
          return;
        }

        // Sin plan → planes
        if (!id_plan) {
          navigate("/planes");
          return;
        }

        // Plan vencido → planes
        if (fecha_renovacion && ahora > new Date(fecha_renovacion)) {
          navigate("/planes");
          return;
        }

        // Estado no activo → planes
        if (estado !== "activo") {
          navigate("/planes");
          return;
        }

        // Todo OK → selector
        navigate("/selector");
      })
      .catch((e) => {
        setError("root", {
          message: e?.message || "No se pudo iniciar sesion",
        });
      });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-14">
      <MeshBg />

      <div className="grid gap-8 lg:gap-12 md:grid-cols-[1.1fr_1fr] items-center w-full max-w-[1100px] z-10">
        {/* PANEL */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden md:flex flex-col"
        >
          <div
            className="rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            style={{
              background:
                "linear-gradient(145deg, #0B1426 0%, #132743 50%, #0d3330 100%)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div
              className="absolute top-0 right-0 w-[250px] h-[250px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(0,191,255,0.15), transparent 60%)",
              }}
            />
            <div
              className="absolute bottom-0 left-0 w-[200px] h-[200px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(16,185,129,0.12), transparent 60%)",
              }}
            />

            <div className="relative">
              <h1 className="text-2xl lg:text-[32px] font-extrabold text-white leading-tight tracking-[-0.02em]">
                <TypeWriter
                  texts={[
                    "Venda por WhatsApp con IA",
                    "Cree landings en segundos",
                    "Automatice su negocio",
                  ]}
                />
              </h1>
              <p className="mt-4 text-sm text-slate-400 leading-relaxed">
                Dos herramientas conectadas por inteligencia artificial para
                generar ventas 24/7.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className="rounded-xl p-3.5 cursor-default"
                  style={{
                    background: "rgba(0,191,255,0.06)",
                    border: "1px solid rgba(0,191,255,0.12)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl grid place-items-center mb-2"
                    style={{ background: "rgba(0,191,255,0.12)" }}
                  >
                    <svg
                      className="w-[18px] h-[18px]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#00BFFF"
                      strokeWidth="1.8"
                    >
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-white">ImporChat</p>
                  <p className="text-[10px] text-cyan-300/60 mt-0.5">
                    Agente AI WhatsApp
                  </p>
                  <div className="mt-2 flex gap-1">
                    {["24/7", "3 canales", "Meta Partner"].map((t, i) => (
                      <span
                        key={i}
                        className="text-[7px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{
                          color: "#00BFFF",
                          background: "rgba(0,191,255,0.08)",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className="rounded-xl p-3.5 cursor-default"
                  style={{
                    background: "rgba(16,185,129,0.06)",
                    border: "1px solid rgba(16,185,129,0.12)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl grid place-items-center mb-2"
                    style={{ background: "rgba(16,185,129,0.12)" }}
                  >
                    <svg
                      className="w-[18px] h-[18px]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="1.8"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-white">Insta Landing</p>
                  <p className="text-[10px] text-emerald-300/60 mt-0.5">
                    Generador AI contenido
                  </p>
                  <div className="mt-2 flex gap-1">
                    {["Designer Pro", "120+/mes", "10 secciones"].map(
                      (t, i) => (
                        <span
                          key={i}
                          className="text-[7px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{
                            color: "#10B981",
                            background: "rgba(16,185,129,0.08)",
                          }}
                        >
                          {t}
                        </span>
                      ),
                    )}
                  </div>
                </motion.div>
              </div>

              <div
                className="mt-6 flex items-center justify-between rounded-xl px-4 py-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {[
                  { v: "24/7", l: "Activo", c: "#00BFFF" },
                  { v: "0%", l: "Riesgo ban", c: "#10B981" },
                  { v: "$5", l: "Primer mes", c: "#F59E0B" },
                  { v: "10", l: "Secciones", c: "#8B5CF6" },
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <p
                      className="text-base font-extrabold"
                      style={{ color: s.c }}
                    >
                      {s.v}
                    </p>
                    <p className="text-[8px] text-slate-500">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 ml-2">
            <ChannelPill
              delay={0.3}
              name="WhatsApp"
              color="#25D366"
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              }
            />
            <ChannelPill
              delay={0.5}
              name="Instagram"
              color="#E4405F"
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#E4405F">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              }
            />
            <ChannelPill
              delay={0.7}
              name="Messenger"
              color="#1877F2"
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.908 1.442 5.503 3.7 7.2V22l3.3-1.813c.879.244 1.813.376 2.781.376h.238C17.523 20.563 22 16.418 22 11.243 22 6.145 17.523 2 12 2zm1.213 12.413l-2.8-2.987-5.467 2.987 6.013-6.387 2.867 2.987 5.4-2.987-6.013 6.387z" />
                </svg>
              }
            />
          </div>
        </motion.section>

        {/* FORM */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="w-full max-w-[420px] mx-auto"
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-3xl p-7 sm:p-9 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(11,20,38,0.08)] border border-white/80 ring-1 ring-slate-200/30"
          >
            <div className="mb-4">
              <label
                htmlFor="usuario"
                className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider"
              >
                Usuario o correo
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
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  id="usuario"
                  type="text"
                  placeholder="nombre@empresa.com"
                  {...register("usuario", {
                    required: "El usuario o email es obligatorio",
                  })}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-white text-[#0B1426] placeholder-slate-400 outline-none border-2 transition-all focus:border-[#0B1426] focus:shadow-[0_0_0_3px_rgba(11,20,38,0.06)] ${errors.usuario ? "border-rose-400" : "border-slate-200/80"}`}
                  autoComplete="username"
                />
              </div>
              {errors.usuario && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.usuario.message}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider"
              >
                Contrasena
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
                  id="password"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password", {
                    required: "La contrasena es obligatoria",
                  })}
                  className={`w-full pl-10 pr-12 py-3 rounded-xl text-sm bg-white text-[#0B1426] placeholder-slate-400 outline-none border-2 transition-all focus:border-[#0B1426] focus:shadow-[0_0_0_3px_rgba(11,20,38,0.06)] ${errors.password ? "border-rose-400" : "border-slate-200/80"}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  <EyeIcon show={showPwd} />
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center text-xs mb-6">
              <label className="flex items-center gap-2 text-slate-500 select-none cursor-pointer">
                <input
                  type="checkbox"
                  {...register("rememberMe")}
                  className="w-4 h-4 rounded border-slate-300 accent-[#0B1426]"
                />
                Recordarme
              </label>
            </div>

            {"root" in errors && errors.root?.message && (
              <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 border border-rose-200">
                {errors.root.message}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 shadow-lg hover:shadow-xl"
              style={{
                background: "linear-gradient(135deg, #0B1426, #1e293b)",
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
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
                  Verificando...
                </span>
              ) : (
                "Iniciar sesión"
              )}
            </motion.button>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] text-slate-400 font-medium">o</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={() => navigate("/register")}
              className="w-full py-3 rounded-xl text-sm font-semibold text-[#0B1426] bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all"
            >
              Crear cuenta nueva
            </button>

            <p className="mt-5 text-[10px] text-slate-400 text-center leading-relaxed">
              Al iniciar sesión acepta las{" "}
              <a
                href="/condiciones-servicio"
                className="underline hover:text-slate-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                Condiciones
              </a>{" "}
              y la{" "}
              <a
                href="/politica-privacidad"
                className="underline hover:text-slate-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacidad
              </a>
              .
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-slate-400">
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
              Protegido con encriptacion SSL
            </div>
          </form>
        </motion.div>
      </div>

      <footer className="absolute bottom-3 inset-x-0 text-center text-[10px] text-slate-400">
        <span>Imporfactory © {new Date().getFullYear()}</span>
        <span className="mx-2">·</span>
        <a
          href="/condiciones-servicio"
          className="hover:text-slate-600 transition"
        >
          Condiciones
        </a>
        <span className="mx-1">·</span>
        <a
          href="/politica-privacidad"
          className="hover:text-slate-600 transition"
        >
          Privacidad
        </a>
      </footer>
    </div>
  );
}
