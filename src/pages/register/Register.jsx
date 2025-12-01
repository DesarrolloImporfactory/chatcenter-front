import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { registerThunk } from "../../store/slices/user.slice";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AnimatedBackground from "../login/AnimatedBackground";
import { useState } from "react";

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [active, setActive] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const acepta = watch("acepta", false);

  const onSubmit = (data) => {
    dispatch(registerThunk(data))
      .unwrap()
      .then(() => {
        reset();
        navigate("/login"); // o /  si quieres loguear directamente
      });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden p-4">
      <AnimatedBackground />

      <div className="grid gap-10 md:grid-cols-2 items-start w-full max-w-6xl z-10 text-justify">
        {/* ---------- Panel Inspiracional ---------- */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="order-2 md:order-1 p-8 rounded-2xl bg-slate-800/90 backdrop-blur-xl shadow-[0_8px_24px_-6px_rgba(0,0,0,0.6)] text-white"
        >
          <header className="flex items-center gap-3 mb-6">
            <i className="bx bxs-user-plus text-3xl text-green-400" />
            <span className="text-xl font-semibold tracking-wide">
              ¡Únete a ImporChat!
            </span>
          </header>
          <h1 className="text-3xl font-extrabold mb-4 leading-tight">
            Crea tu cuenta en minutos
          </h1>
          <p className="text-base mb-3">
            Gestiona tus conversaciones de WhatsApp, acelera ventas y escala tu
            negocio desde una sola plataforma.
          </p>
        </motion.section>

        {/* ---------- Formulario Registro ---------- */}
        <motion.form
          onSubmit={handleSubmit(onSubmit)}
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          className="order-1 md:order-2 w-full max-w-md mx-auto bg-white/90 backdrop-blur-lg p-8 rounded-2xl shadow-lg"
        >
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
            Regístrate
          </h2>

          {/* Nombre */}
          <div className="mb-4">
            <label htmlFor="nombre" className="sr-only">
              Nombre completo
            </label>
            <input
              id="nombre"
              type="text"
              placeholder="Nombre empresa"
              {...register("nombre", {
                required: "El nombre es obligatorio",
                minLength: { value: 3, message: "Mínimo 3 caracteres" },
              })}
              className={`w-full p-3 rounded border focus:outline-none focus:ring-2 ${
                errors.nombre
                  ? "border-red-500 focus:ring-red-400"
                  : "border-gray-300 focus:ring-green-500"
              }`}
            />
            {errors.nombre && (
              <p role="alert" className="text-red-600 text-xs mt-1">
                {errors.nombre.message}
              </p>
            )}
          </div>

          {/* Usuario */}
          <div className="mb-4">
            <label htmlFor="usuario" className="sr-only">
              Usuario
            </label>
            <input
              id="usuario"
              type="text"
              placeholder="Nombre de usuario"
              {...register("usuario", {
                required: "Requerido",
                pattern: {
                  value: /^[a-zA-Z0-9_]{3,16}$/,
                  message: "3-16 letras, números o guión bajo",
                },
              })}
              className={`w-full p-3 rounded border focus:outline-none focus:ring-2 ${
                errors.usuario
                  ? "border-red-500 focus:ring-red-400"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              autoComplete="username"
            />
            {errors.usuario && (
              <p role="alert" className="text-red-600 text-xs mt-1">
                {errors.usuario.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="mb-4">
            <label htmlFor="email" className="sr-only">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              placeholder="Correo electrónico"
              {...register("email", {
                required: "Requerido",
                pattern: {
                  value: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
                  message: "Formato no válido",
                },
              })}
              className={`w-full p-3 rounded border focus:outline-none focus:ring-2 ${
                errors.email
                  ? "border-red-500 focus:ring-red-400"
                  : "border-gray-300 focus:ring-green-500"
              }`}
            />
            {errors.email && (
              <p role="alert" className="text-red-600 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>
          {/* Encargado */}
          <div className="mb-4">
            <label htmlFor="nombre_encargado" className="sr-only">
              Subusuario
            </label>
            <input
              id="nombre_encargado"
              type="text"
              placeholder="Nombre completo"
              {...register("nombre_encargado", {
                required: "Requerido",
              })}
              className={`w-full p-3 rounded border focus:outline-none focus:ring-2 ${
                errors.nombre_encargado
                  ? "border-red-500 focus:ring-red-400"
                  : "border-gray-300 focus:ring-green-500"
              }`}
            />
            {errors.nombre_encargado && (
              <p role="alert" className="text-red-600 text-xs mt-1">
                {errors.nombre_encargado.message}
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
                required: "Requerida",
                minLength: { value: 6, message: "Mínimo 6 caracteres" },
              })}
              className={`w-full p-3 rounded border focus:outline-none focus:ring-2 ${
                errors.password
                  ? "border-red-500 focus:ring-red-400"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd((prev) => !prev)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 focus:outline-none"
              aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <i className={`bx ${showPwd ? "bx-hide" : "bx-show"} text-xl`} />
            </button>
            {errors.password && (
              <p role="alert" className="text-red-600 text-xs mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirmación */}
          <div className="mb-6">
            <label htmlFor="password2" className="sr-only">
              Confirmar contraseña
            </label>
            <input
              id="password2"
              type={showPwd ? "text" : "password"}
              placeholder="Confirmar contraseña"
              {...register("password2", {
                validate: (val) =>
                  val === watch("password") || "Las contraseñas no coinciden",
              })}
              className={`w-full p-3 rounded border focus:outline-none focus:ring-2 ${
                errors.password2
                  ? "border-red-500 focus:ring-red-400"
                  : "border-gray-300 focus:ring-green-500"
              }`}
            />
            {errors.password2 && (
              <p role="alert" className="text-red-600 text-xs mt-1">
                {errors.password2.message}
              </p>
            )}
          </div>

          {/* Aceptación de Términos y Privacidad */}
          <div className="mb-4 text-xs text-gray-600">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                {...register("acepta", {
                  required:
                    "Debe aceptar las Condiciones y la Política de Privacidad",
                })}
                className="mt-1 accent-green-600"
              />
              <span>
                He leído y acepto las{" "}
                <a
                  href="/condiciones-servicio"
                  className="underline text-blue-600"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Condiciones del Servicio
                </a>{" "}
                y la{" "}
                <a
                  href="/politica-privacidad"
                  className="underline text-blue-600"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Política de Privacidad
                </a>
              </span>
            </label>
            {errors.acepta && (
              <p role="alert" className="text-red-600 text-xs mt-1">
                {errors.acepta.message}
              </p>
            )}
          </div>

          {/* Botón registrar */}
          <button
            type="submit"
            disabled={!acepta || isSubmitting}
            className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Creando cuenta..." : "Crear Cuenta"}
          </button>

          {/* Ir a login */}
          <p className="mt-6 text-center text-xs text-gray-600">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="text-blue-600 hover:underline">
              Inicia sesión
            </Link>
          </p>
          {/* <p className="mt-4 text-[11px] text-gray-400 leading-tight text-center">
              Al registrarte aceptas nuestros
              <Link to="/terminos" className="underline ml-1">
                Términos y Condiciones
              </Link>
              .
            </p> */}
        </motion.form>
      </div>

      {/* ---------- Footer ---------- */}
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
