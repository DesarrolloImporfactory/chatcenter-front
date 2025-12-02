import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { loginThunk, newLoginThunk } from "./../../store/slices/user.slice";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import AnimatedBackground from "./AnimatedBackground";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
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
      .then(() => {
        reset();
        const role = localStorage.getItem("user_role");
        if (role === "super_administrador") {
          navigate("/administrador-conexiones");
        } else {
          navigate("/conexiones");
        }
      })
      .catch((e) => {
        setError("root", {
          message: e?.message || "No se pudo iniciar sesión",
        });
      });
  };

  /* ===== Login por URL (mantiene tu flujo) ===== */
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get("token");
    const tienda = query.get("tienda");
    const phone = query.get("phone");
    const tipo = query.get("tipo");

    if (token && tienda) {
      localStorage.removeItem("token");
      dispatch(newLoginThunk({ token, tienda, tipo }))
        .unwrap()
        .then((data) => {
          if (tipo == "call_center") {
            if (phone) {
              navigate(`/chat?phone=${encodeURIComponent(phone)}`);
            } else {
              navigate("/chat");
            }
          } else if (tipo == "cursos_imporsuit") {
            const estado_creacion = data.estado_creacion;
            if (estado_creacion == "completo") {
              navigate(`/conexiones`);
            } else if (estado_creacion == "incompleto") {
              localStorage.setItem("id_plataforma_free",data.id_plataforma_free)
              navigate(`/landing`);
            }
          } else {
            navigate("/conexiones");
          }
        })
        .catch(() => {
          // silencioso como tu código original
        });
    }
  }, [location.search, dispatch, navigate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-white overflow-hidden p-4">
      {/* Fondo con bolitas azules */}
      <AnimatedBackground />

      {/* Contenedor principal */}
      <div className="grid gap-10 md:grid-cols-2 items-start w-full max-w-6xl z-10">
        {/* ====== Panel Bienvenida (FONDO #171931) ====== */}
        <div className="relative order-2 md:order-1">
          {/* Glow degradado exterior (conservado) */}
          <div
            aria-hidden
            className="absolute -inset-[1px] -z-10 rounded-3xl blur-[14px] opacity-90 bg-gradient-to-br from-sky-600 via-indigo-500 to-sky-600"
          />
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={[
              "p-8 rounded-2xl ring-1 backdrop-blur-xl",
              "shadow-[0_8px_24px_-6px_rgba(2,6,23,.20)]",
              "bg-[#171931] ring-white/10 text-slate-100",
            ].join(" ")}
          >
            <header className="flex items-center gap-3 mb-6">
              <i
                className="bx bxs-message-dots text-3xl text-blue-400"
                aria-hidden="true"
              />
              <span className="text-xl font-semibold tracking-wide text-white">
                ImporChat
              </span>
            </header>

            <h1 className="text-3xl font-extrabold mb-4 leading-tight text-white">
              ¡Bienvenido!
            </h1>
            <p className="text-base mb-3 text-slate-200">
              Centraliza tus conversaciones de WhatsApp, acelera ventas y
              potencia tu marketing en un solo sitio.
            </p>
            <p className="text-sm text-slate-300">
              Ahorra tiempo, brinda atención personalizada y fideliza a tus
              clientes con flujos automáticos.
            </p>

            <ul className="space-y-2 text-sm mt-6 text-slate-200">
              <li className="flex gap-2">
                <i className="bx bx-check text-blue-400 mt-[2px]" />
                Responde hasta el 80 % de las consultas frecuentes con flujos
                automáticos.
              </li>
              <li className="flex gap-2">
                <i className="bx bx-check text-blue-400 mt-[2px]" />
                Integración con Imporsuit y Business Manager.
              </li>
            </ul>

            <div className="grid grid-cols-2 gap-4 mt-8 text-center">
              <div>
                <p className="text-3xl font-extrabold text-white">+12 000</p>
                <p className="text-xs text-slate-400">
                  chats diarios gestionados
                </p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-white">98 %</p>
                <p className="text-xs text-slate-400">de satisfacción</p>
              </div>
            </div>
          </motion.section>
        </div>

        {/* ====== Formulario (FONDO #171931) ====== */}
        <div className="relative order-1 md:order-2 w-full max-w-md mx-auto">
          {/* Glow degradado exterior (conservado) */}
          <div
            aria-hidden
            className="absolute -inset-[1px] -z-10 rounded-3xl blur-[14px] opacity-90 bg-gradient-to-br from-sky-600 via-indigo-500 to-sky-600"
          />
          <motion.form
            onSubmit={handleSubmit(onSubmit)}
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className={[
              "w-full p-8 rounded-2xl ring-1 backdrop-blur-lg",
              "shadow-[0_8px_24px_-6px_rgba(2,6,23,.20)]",
              "bg-[#171931] ring-white/10 text-slate-100",
            ].join(" ")}
          >
            <h2 className="text-2xl font-semibold text-center text-white mb-6">
              Inicia sesión
            </h2>

            {/* Usuario / correo */}
            <div className="mb-4">
              <label htmlFor="usuario" className="sr-only">
                Usuario o correo electrónico
              </label>
              <input
                id="usuario"
                type="text"
                placeholder="usuario o correo electrónico"
                {...register("usuario", {
                  required: "El usuario o email es obligatorio",
                })}
                className={`w-full p-3 rounded-xl border bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.usuario ? "border-rose-500" : "border-slate-200"
                }`}
                autoComplete="username"
              />
              {errors.usuario && (
                <p className="text-rose-400 text-xs mt-1" role="alert">
                  {errors.usuario.message}
                </p>
              )}
            </div>

            {/* Contraseña */}
            <div className="relative mb-4">
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                type={showPwd ? "text" : "password"}
                placeholder="Contraseña"
                {...register("password", {
                  required: "La contraseña es obligatoria",
                })}
                className={`w-full p-3 pr-12 rounded-xl border bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password ? "border-rose-500" : "border-slate-200"
                }`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700 focus:outline-none"
                aria-label={
                  showPwd ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                <i
                  className={`bx ${showPwd ? "bx-hide" : "bx-show"} text-xl`}
                />
              </button>
              {errors.password && (
                <p className="text-rose-400 text-xs mt-1" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Recordarme / Olvidé */}
            <div className="flex items-center justify-between text-xs mb-6">
              <label className="flex items-center gap-2 select-none text-slate-200">
                <input
                  type="checkbox"
                  {...register("rememberMe")}
                  className="accent-blue-500"
                />
                Recuérdame
              </label>
              {/* <Link to="/recuperar-password" className="text-blue-400 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link> */}
            </div>

            {/* Error raíz */}
            {"root" in errors && errors.root?.message && (
              <div className="mb-4 rounded-lg bg-rose-100/90 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-300">
                {errors.root.message}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold tracking-wide transition-colors disabled:opacity-60"
            >
              {isSubmitting ? "Verificando..." : "Iniciar sesión"}
            </button>

            {/* Registro */}
            <p className="mt-6 text-center text-xs text-slate-300">
              ¿No tienes cuenta?{" "}
              <span
                onClick={() => navigate("/registro")}
                className="text-blue-400 hover:underline cursor-pointer"
              >
                Regístrate aquí
              </span>
            </p>

            <p className="mt-4 text-[12px] text-slate-300 leading-tight text-center">
              Al iniciar sesión aceptas nuestras{" "}
              <a
                href="/condiciones-servicio"
                className="underline text-blue-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Condiciones de servicio
              </a>{" "}
              y la{" "}
              <a
                href="/politica-privacidad"
                className="underline text-blue-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Política de privacidad
              </a>
              .
            </p>

            <div className="flex items-center justify-center gap-1 mt-7 text-[13px] text-slate-300">
              <i className="bx bx-lock" />
              Conexión segura
            </div>
          </motion.form>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 inset-x-0 text-center text-gray-400 text-[10px]">
        <nav className="space-x-3">
          <a
            href="/condiciones-servicio"
            className="hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Condiciones de servicio
          </a>
          <span>•</span>
          <a
            href="/politica-privacidad"
            className="hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de privacidad
          </a>
        </nav>
        <div className="mt-1">
          Desarrollado por{" "}
          <a
            href="https://new.imporsuitpro.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Imporsuit
          </a>{" "}
          © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
