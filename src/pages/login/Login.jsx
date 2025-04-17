import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { loginThunk } from "./../../store/slices/user.slice";
import { useNavigate, Link } from "react-router-dom";
import AnimatedBackground from "./AnimatedBackground";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    handleSubmit,
    reset,
    register,
    formState: { errors },
  } = useForm();

  const submit = (data) => {
    dispatch(loginThunk(data));
    reset({
      email: "",
      con: "",
    });
  };

  return (
        <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-slate-950">
        <AnimatedBackground />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-6xl w-full items-center z-10">
        
        {/* Panel de bienvenida */}
        <div className="text-white p-8 rounded-2xl bg-[#1e293b] shadow-2xl">
          <div className="flex items-center justify-center gap-3 mb-4 text-xl font-semibold">
            <i className="bx bxs-message-dots text-3xl text-green-400"></i>
            CHATCENTER
          </div>
          <br />
          <h1 className="text-4xl font-bold mb-4">¡Bienvenido!</h1>
          <p className="text-lg mb-4">
            Gestiona tus mensajes de WhatsApp de forma rápida y eficiente,
            optimizando tus ventas y potenciando tu estrategia de marketing.
          </p>
          <p className="text-md">
            Ahorra tiempo, brinda una atención personalizada y mejora la
            fidelización de tus clientes. ¡Todo desde un solo lugar!
          </p>
        </div>

        {/* Formulario de login */}
        <form
          onSubmit={handleSubmit(submit)}
          className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md mx-auto"
        >
          <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">
            Inicia sesión con tus credenciales
          </h2>

          <input
            {...register("email", { required: "El email es obligatorio" })}
            type="email"
            placeholder="Correo electrónico"
            className="w-full p-3 mb-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mb-4">
              {errors.email.message}
            </p>
          )}

          <input
            {...register("con", { required: "La contraseña es obligatoria" })}
            type="password"
            placeholder="Contraseña"
            className="w-full p-3 mb-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.con && (
            <p className="text-red-500 text-sm mb-4">
              {errors.con.message}
            </p>
          )}

          <div className="flex items-center justify-between mb-4 text-sm">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                {...register("rememberMe")}
              />
              Recuérdame
            </label>
            <Link
              to="/recuperar-password"
              className="text-blue-500 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition duration-200"
          >
            Iniciar sesión
          </button>

          <div className="text-center mt-6 text-sm">
            ¿No tienes cuenta?{" "}
            <a
              href="https://new.imporsuitpro.com/registro"
              className="text-blue-500 hover:underline"
            >
              Regístrate aquí
            </a>
          </div>
        </form>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 text-center text-gray-400 text-xs w-full">
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
};

export default Login;
