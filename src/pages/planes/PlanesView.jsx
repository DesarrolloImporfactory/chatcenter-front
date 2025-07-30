import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import i_meta from "../../assets/icon_me_ta.png";
import Swal from "sweetalert2";

/* actualizacion */

const PlanesView = () => {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const obtenerPlanes = async () => {
      try {
        const res = await chatApi.get("planes/listarPlanes");
        setPlanes(res.data.data);
      } catch (error) {
        console.error("Error al obtener planes:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar los planes."
        });
      }
    };

    obtenerPlanes();
  }, []);

  const seleccionarPlan = async () => {
    if (!planSeleccionado) return;
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;
      const baseUrl = window.location.origin;

      const res = await chatApi.post(
        "stripe_plan/crearSesionPago",
        {
          id_plan: planSeleccionado,
          id_usuario: id_usuario,
          success_url: `${baseUrl}/conexiones`,
          cancel_url: `${baseUrl}/planes_view`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.url) {
        localStorage.setItem("plan_activado", JSON.stringify({
          id_plan: planSeleccionado,
          nombre: planes.find(p => p.id_plan === planSeleccionado)?.nombre_plan || ''
        }));

        window.location.href = res.data.url;
      } else {
        throw new Error("No se recibió la URL de Stripe");
      }
    } catch (error) {
      console.error("Error al crear sesión de Stripe:", error);

      const mensajeError =
        error?.response?.data?.message ===
        "Ya tienes un plan activo. No puedes crear una nueva sesión de pago hasta que expire."
          ? "Ya tienes un plan activo. Espera a que expire antes de seleccionar uno nuevo."
          : "No se pudo redirigir al pago. Intenta nuevamente.";

      Swal.fire({
        icon: "error",
        title: "Error",
        text: mensajeError,
      });
    } finally {
      setLoading(false);
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  

  return (
    <div className="min-h-screen bg-[#F4F5F9] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-6xl relative">
        {/* Botón de cerrar sesión */}
        <div className="flex justify-end mb-4">
          <button
            onClick={cerrarSesion}
            className="text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md shadow transition"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="py-10" />

        

        <h2 className="text-4xl font-extrabold text-center mb-10 text-[#171931]">
          Elige tu plan ideal y potencia tu empresa
        </h2>

        <div className="py-10" />

        {/* Cards de planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 justify-center items-stretch">

          {planes.map((plan) => {
            const isSelected = planSeleccionado === plan.id_plan;
            return (
              <div
                key={plan.id_plan}
                onClick={() => setPlanSeleccionado(plan.id_plan)}
                className={`cursor-pointer rounded-2xl p-6 transition-all duration-300 transform shadow-lg border hover:scale-[1.03] relative group overflow-hidden
                  ${isSelected
                    ? "bg-gradient-to-br from-green-500 to-green-600 border-green-300"
                    : "bg-[#171931] border-[#2a2d47] hover:border-green-500"
                  }`}
              >
                {/* Precios y descripción */}
                <div className="mb-6">
                  <p className="text-4xl font-extrabold text-white mb-3">
                    US${parseFloat(plan.precio_plan).toFixed(2)}
                    <span className="text-base font-medium text-gray-300"> /mes</span>
                  </p>
                
                  <p className={`mb-6 text-sm leading-relaxed ${isSelected ? "text-white" : "text-gray-300"}`}>
                    {plan.descripcion_plan}
                  </p>
                </div>
                
                {/* Separador de la card */}
                <div className={`h-px w-full mb-4 ${isSelected ? "bg-white/20" : "bg-white/10"}`} />
                
                {/* Lista de características del plan */}
                <ul className={`space-y-3 text-sm ${isSelected ? "text-white" : "text-gray-300"}`}>
                  <li className="flex items-center gap-2">
                    <svg width={24} height={24} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87" />
                      <path d="M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    {plan.max_subusuarios} subusuarios
                  </li>
                
                  <li className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} fill={"currentColor"} viewBox="0 0 24 24">
                      <path d="M3 4.5v5c0 .83.67 1.5 1.5 1.5h5c.83 0 1.5-.67 1.5-1.5v-5c0-.83-.67-1.5-1.5-1.5h-5C3.67 3 3 3.67 3 4.5M5 5h4v4H5zM3 19.5c0 .83.67 1.5 1.5 1.5h5c.83 0 1.5-.67 1.5-1.5v-5c0-.83-.67-1.5-1.5-1.5h-5c-.83 0-1.5.67-1.5 1.5zM5 15h4v4H5zM19.5 3h-5c-.83 0-1.5.67-1.5 1.5v5c0 .83.67 1.5 1.5 1.5h5c.83 0 1.5-.67 1.5-1.5v-5c0-.83-.67-1.5-1.5-1.5M19 9h-4V5h4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM17 17h2v2h-2zM19 19h2v2h-2zM15 19h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2z"></path>
                    </svg>
                    QR incluido
                  </li>
                
                  <li className="flex items-center gap-2">
                    <img src={i_meta} alt="Meta Icon" className="w-5 h-5 brightness-0 invert opacity-80" />
                    Meta habilitado
                  </li>
                </ul>
                
                {/* Indicador de card seleccionada */}
                {isSelected && (
                  <div className="absolute top-0 right-0 bg-white text-green-600 font-bold text-xs px-3 py-1 rounded-bl-lg shadow-md">
                    Seleccionado
                  </div>
                )}
              </div>


            );
          })}
        </div>


        <div className="py-10" />

        {/* Botón de acción */}
        {planSeleccionado && (
          <div className="flex justify-center mt-10">
            <button
              onClick={seleccionarPlan}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-10 rounded-full shadow-lg transition transform hover:scale-105 disabled:opacity-50"
            >
              {loading ? "Procesando..." : "Elegir este plan"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanesView;
