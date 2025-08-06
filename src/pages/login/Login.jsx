import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { loginThunk } from "./../../store/slices/user.slice";
import { newLoginThunk } from "./../../store/slices/user.slice";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import AnimatedBackground from "./AnimatedBackground";
import { useState, useEffect } from "react";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const onSubmit = (data) => {
    dispatch(loginThunk(data))
      .unwrap()
      .then(() => {
        reset();
        navigate("/conexiones");
      });
  };

  /* login por url */
  const location = useLocation();

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get("token");
    const tienda = query.get("tienda");
    const phone = query.get("phone");

    if (token && tienda) {
      localStorage.removeItem("token");

      dispatch(newLoginThunk({ token, tienda }))
        .unwrap()
        .then(() => {
          console.log("Login automático exitoso");
          if (phone) {
            navigate(`/chat?phone=${encodeURIComponent(phone)}`);
          } else {
            navigate("/chat");
          }
        })
        .catch((err) => {
          console.error("Error en login automático:", err);
        });
    }
  }, [location.search]);
  /* login por url */

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden p-4">
      <AnimatedBackground />

      {/* ---- Contenedor principal ---- */}
      <div className="grid gap-10 md:grid-cols-2 items-start w-full max-w-6xl z-10 text-justify">
        {/* ---- Panel Bienvenida ---- */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="order-2 md:order-1 p-8 rounded-2xl bg-slate-800/90 backdrop-blur-xl shadow-[0_8px_24px_-6px_rgba(0,0,0,0.6)] text-white"
        >
          <header className="flex items-center gap-3 mb-6">
            {/* Sustituya por su SVG de marca */}
            <i
              className="bx bxs-message-dots text-3xl text-green-400"
              aria-hidden="true"
            />
            <span className="text-xl font-semibold tracking-wide">
              ChatCenter
            </span>
          </header>
          <h1 className="text-3xl font-extrabold mb-4 leading-tight">
            ¡Bienvenido!
          </h1>
          <p className="text-base mb-3">
            Centraliza tus conversaciones de WhatsApp, acelera ventas y potencia
            tu marketing en un solo sitio.
          </p>
          <p className="text-sm text-slate-300">
            Ahorra tiempo, brinda atención personalizada y fideliza a tus
            clientes con flujos automáticos.
          </p>
          <ul className="space-y-2 text-sm mt-6">
            <li className="flex gap-2">
              <i className="bx bx-check text-green-400 mt-[2px]" />
              Responde hasta el 80 % de las consultas frecuentes con flujos
              automáticos.
            </li>
            <li className="flex gap-2">
              <i className="bx bx-check text-green-400 mt-[2px]" />
              Integración con Imporsuit y Business Manager.
            </li>
          </ul>
          <div className="grid grid-cols-2 gap-4 mt-8 text-center">
            <div>
              <p className="text-3xl font-extrabold">+12 000</p>
              <p className="text-xs text-slate-400">
                chats diarios gestionados
              </p>
            </div>
            <div>
              <p className="text-3xl font-extrabold">98 %</p>
              <p className="text-xs text-slate-400">de satisfacción</p>
            </div>
          </div>
        </motion.section>
        {/* ---- Formulario ---- */}
        <motion.form
          onSubmit={handleSubmit(onSubmit)}
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          className="order-1 md:order-2 w-full max-w-md mx-auto bg-white/90 backdrop-blur-lg p-8 rounded-2xl shadow-lg"
        >
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
            Inicia sesión
          </h2>

          {/* Email */}
          <div className="mb-4">
            <label htmlFor="text" className="sr-only">
              Correo electrónico
            </label>
            <input
              id="text"
              type="text"
              placeholder="usuario o correo electrónico"
              {...register("usuario", { required: "El usuario o email son obligatorios" })}
              className={`w-full p-3 rounded border focus:outline-none focus:ring-2 ${
                errors.email
                  ? "border-red-500 focus:ring-red-400"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              autoComplete="username"
            />
            {errors.email && (
              <p
                role="alert"
                className="text-red-600 text-xs mt-1"
                aria-live="assertive"
              >
                {errors.email.message}
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
              className={`w-full p-3 rounded border focus:outline-none focus:ring-2 ${
                errors.con
                  ? "border-red-500 focus:ring-red-400"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd((prev) => !prev)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 focus:outline-none"
              aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <i className={`bx ${showPwd ? "bx-hide" : "bx-show"} text-xl`} />
            </button>
            {errors.con && (
              <p
                role="alert"
                className="text-red-600 text-xs mt-1"
                aria-live="assertive"
              >
                {errors.con.message}
              </p>
            )}
          </div>

          {/* Recordarme / Olvidé */}
          <div className="flex items-center justify-between text-xs mb-6">
            <label className="flex items-center gap-2 select-none">
              <input
                type="checkbox"
                {...register("rememberMe")}
                className="accent-green-500"
              />
              Recuérdame
            </label>
            <Link
              to="/recuperar-password"
              className="text-blue-600 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Botón */}
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50"
          >
            Iniciar sesión
          </button>

          {/* Registro */}
          <p className="mt-6 text-center text-xs text-gray-600">
            ¿No tienes cuenta?{" "}
            <span
              onClick={() => navigate("/registro")}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              Regístrate aquí
            </span>
          </p>
          <p className="mt-4 text-[11px] text-gray-400 leading-tight text-center">
            Al iniciar sesión aceptas nuestros
            <Link to="/terminos" className="underline ml-1">
              Términos y Condiciones
            </Link>
            .
          </p>
          <div className="flex items-center justify-center gap-1 mt-7 text-[13px] text-gray-500">
            <i className="bx bx-lock" />
            Conexión segura
          </div>
        </motion.form>
      </div>

      {/* ---- Footer ---- */}
      <footer className="absolute bottom-4 inset-x-0 text-center text-gray-400 text-[10px]">
        Desarrollado por{" "}
        <a
          href="https://new.imporsuitpro.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          Imporsuit
        </a>{" "}
        © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
