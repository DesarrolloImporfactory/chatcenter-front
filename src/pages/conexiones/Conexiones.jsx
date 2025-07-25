import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import chatApi from "../../api/chatcenter";
import botImage from "../../assets/bot.png";
import "./conexiones.css";

const Conexiones = () => {
  const [configuracionAutomatizada, setConfiguracionAutomatizada] = useState(
    []
  );
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  const [mostrarErrorBot, setMostrarErrorBot] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");

    const decoded = jwtDecode(token);
    if (decoded.exp < Date.now() / 1000) {
      localStorage.removeItem("token");
      return navigate("/login");
    }

    setUserData(decoded);
  }, []);

  useEffect(() => {
    if (!userData) return;

    const fetchConfiguracionAutomatizada = async () => {
      try {
        const response = await chatApi.post(
          "configuraciones/listar_conexiones",
          {
            id_usuario: userData.id_usuario,
          }
        );
        setConfiguracionAutomatizada(response.data.data || []);
      } catch (error) {
        if (error.response?.status === 403) {
          Swal.fire({
            icon: "error",
            title: error.response?.data?.message,
            confirmButtonText: "OK",
          }).then(() => navigate("/planes_view"));
        } else if (error.response?.status === 400) {
          setMostrarErrorBot(true);
        } else {
          console.error("Error al cargar configuración:", error);
        }
      }
    };

    fetchConfiguracionAutomatizada();
  }, [userData]);

  return (
    <div className="relative p-6 min-h-screen bg-gray-50 pt-[5%]">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Conexiones Configuradas
      </h2>

      <div className="flex justify-end pb-6">
        <button
          onClick={() => {
            /* tu lógica aquí */
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-all duration-300"
        >
          <i className="bx bx-plus text-xl"></i>
          <span>Agregar configuración</span>
        </button>
      </div>

      {mostrarErrorBot ? (
        <div className="flex flex-col items-center justify-center text-center mt-12">
          <img
            src={botImage}
            alt="Robot"
            className="w-40 h-40 animate-bounce-slow"
          />
          <p className="mt-4 text-gray-500 text-sm md:text-base max-w-md">
            ¡Ups! Aún no tienes ninguna conexión configurada. <br />
            Crea tu primera conexión y empieza a interactuar con tus clientes al
            instante 🚀
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {configuracionAutomatizada.map((config, idx) => (
            <div
              key={idx}
              className=" relative bg-white border rounded-lg shadow-md p-5 max-w-sm w-full hover:shadow-xl transition-all"
            >
              {/* Título */}
              <div className="flex items-center gap-2 mb-2">
                <i className="bx bx-layer text-2xl text-blue-600"></i>
                <h3 className="text-lg font-bold text-gray-800 tracking-wide">
                  {config.nombre_configuracion}
                </h3>
              </div>

              {/* Teléfono */}
              <div className="flex items-center gap-2 text-base text-gray-700 mb-4">
                <i className="bx bx-phone-call text-xl text-green-600"></i>
                <span>{config.telefono}</span>
              </div>

              {/* Método de pago */}
              <div>
                <span
                  className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    config.metodo_pago === 1
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  Método de pago:{" "}
                  {config.metodo_pago === 1 ? "Activo" : "Inactivo"}
                </span>
              </div>

              {/* Iconos persistentes con tooltip individual */}
              <div className="absolute top-3 right-3 flex gap-3">
                {/* Configuración */}
                <div
                  className="relative group cursor-pointer text-gray-500 hover:text-blue-700 transition transform hover:scale-110"
                  onClick={() => navigate("/administrador-whatsapp")}
                >
                  <i className="bx bx-cog text-2xl"></i>
                  <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    Ir a configuración
                  </span>
                </div>

                {/* Chat */}
                <div
                  className="relative group cursor-pointer text-gray-500 hover:text-green-700 transition transform hover:scale-110"
                  onClick={() =>
                    navigate("/chat?id_configuracion=" + config.id)
                  }
                >
                  <i className="bx bx-chat text-2xl"></i>
                  <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    Ir al chat
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Conexiones;
