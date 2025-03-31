import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { loginThunk } from "./../../store/slices/user.slice";
import { useNavigate, Link } from "react-router-dom";
import "./login.css";

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
    <div className="relative min-h-screen flex flex-col justify-center">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-5 items-center flex-grow">
        {/* Sección del mensaje de bienvenida */}
        <div className="bg-[#171931] text-center text-white p-8 rounded-md">
          <span className="flex justify-center items-center gap-2 mb-2">
            CHATCENTER <i className="bx bxl-whatsapp text-5xl"></i>
          </span>
          <hr />
          <h1 className="text-4xl font-bold my-2">¡Bienvenido!</h1>

          <p className="text-lg mb-4">
            Gestiona tus mensajes de WhatsApp de forma rápida y eficiente,
            optimizando tus ventas y potenciando tu estrategia de marketing.
          </p>
          <p className="text-md">
            Ahorra tiempo, brinda una atención personalizada y mejora la
            fidelización de tus clientes. ¡Todo desde un solo lugar!
          </p>
        </div>

        {/* Imagen decorativa visible en tablets y pantallas grandes */}
        <div className="hidden lg:flex justify-center">
          <img
            src="https://tiendas.imporsuitpro.com/imgs/react/3112024.png"
            alt="Decoración"
            className="max-w-full h-auto rounded"
          />
        </div>

        {/* Formulario de login */}
        <div>
          <form
            onSubmit={handleSubmit(submit)}
            className="bg-white p-8 rounded shadow-lg max-w-md mx-auto"
          >
            <h2 className="text-2xl font-semibold mb-6 text-center">
              Inicia sesión con tus credenciales
            </h2>

            <input
              {...register("email", { required: "El email es obligatorio" })}
              type="email"
              placeholder="Correo electrónico"
              className="block w-full p-3 mb-2 border rounded focus:border-blue-500"
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
              className="block w-full p-3 mb-2 border rounded focus:border-blue-500"
            />
            {errors.con && (
              <p className="text-red-500 text-sm mb-4">
                {errors.con.message}
              </p>
            )}

            <div className="flex items-center justify-between mb-4">
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
                className="text-blue-500 hover:underline text-sm"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
              Iniciar sesión
            </button>

            <div className="text-center mt-4">
              <p className="text-sm">
                ¿No tienes cuenta?{" "}
                <a
                  href="https://new.imporsuitpro.com/registro"
                  className="text-blue-500 hover:underline"
                >
                  Regístrate aquí
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm py-4">
        Desarrollado por{" "}
        <a
          href="https://new.imporsuitpro.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          Imporsuit
        </a>{" "}
        © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Login;
