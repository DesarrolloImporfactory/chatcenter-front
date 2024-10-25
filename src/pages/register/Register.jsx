import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { registerThunk } from "./../../store/slices/user.slice";
import { useState } from "react";
import { useNavigate } from "react-router";
import "./register.css";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();
  const [file, setFile] = useState([]);

  const submit = (data) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("profileImgUrl", file[0]);
    formData.append("description", data.description);

    reset({
      name: "",
      email: "",
      password: "",
      profileImgUrl: "",
      description: "",
    });

    dispatch(registerThunk(formData));
    navigate("/");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 items-center min-h-screen">
      {/* Sección de Bienvenida */}
      <div className="bg-[#171931] text-center text-white p-8 rounded-md">
        <span className="flex justify-center items-center gap-2 mb-2">
          CHATCENTER <i className="bx bxl-whatsapp text-5xl"></i>
        </span>
        <hr />
        <h1 className="text-4xl font-bold my-2">¡Únete a nosotros!</h1>
        <p className="text-lg mb-4">
          Regístrate para acceder a una plataforma de mensajería optimizada que
          te ayudará a gestionar tus mensajes de forma eficiente.
        </p>
        <p className="text-md">
          Disfruta de herramientas avanzadas para mejorar la fidelización de
          clientes y potenciar tus estrategias de marketing.
        </p>
      </div>

      {/* Formulario de Registro */}
      <div>
        <form
          className="bg-white p-8 rounded shadow-lg max-w-md mx-auto"
          onSubmit={handleSubmit(submit)}
        >
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Crea tu cuenta
          </h2>

          <div className="mb-4">
            <label htmlFor="name" className="block mb-2 font-medium">
              Nombre
            </label>
            <input
              {...register("name", { required: "El nombre es obligatorio" })}
              type="text"
              id="name"
              className="block w-full p-3 border rounded focus:border-blue-500"
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block mb-2 font-medium">
              Correo Electrónico
            </label>
            <input
              {...register("email", { required: "El email es obligatorio" })}
              type="email"
              id="email"
              className="block w-full p-3 border rounded focus:border-blue-500"
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block mb-2 font-medium">
              Contraseña
            </label>
            <input
              {...register("password", {
                required: "La contraseña es obligatoria",
              })}
              type="password"
              id="password"
              className="block w-full p-3 border rounded focus:border-blue-500"
            />
            {errors.password && (
              <p className="text-red-500 text-sm">{errors.password.message}</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block mb-2 font-medium">
              Descripción
            </label>
            <input
              {...register("description")}
              type="text"
              id="description"
              className="block w-full p-3 border rounded focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Registrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
