import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

const PlanesView = () => {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true); // Para controlar animación automática

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
          text: "No se pudieron cargar los planes.",
        });
      }
    };

    obtenerPlanes();
  }, []);

  // Auto despliegue de las cards una por una
  useEffect(() => {
    if (!autoPlay || planes.length === 0) return;

    let index = 0;
    const intervalo = setInterval(() => {
      setPlanSeleccionado(planes[index].id_plan);
      index++;

      if (index >= planes.length) {
        clearInterval(intervalo);
        setAutoPlay(false); // se detiene después de recorrer todos
      }
    }, 1000); // tiempo entre cada despliegue

    return () => clearInterval(intervalo);
  }, [planes, autoPlay]);

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
        localStorage.setItem(
          "plan_activado",
          JSON.stringify({
            id_plan: planSeleccionado,
            nombre:
              planes.find((p) => p.id_plan === planSeleccionado)?.nombre_plan || "",
          })
        );

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
    <div className="min-h-screen bg-gradient-to-b from-[#f9fafb] to-[#e5e7eb] flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-6xl relative">
        {/* Cerrar sesión */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
  {planes.map((plan) => {
  const isSelected = planSeleccionado === plan.id_plan;

  // Asigna imagen según nombre_plan
  let imagen = "pviewb.png"; // default
  if (plan.nombre_plan.includes("Conexión")) imagen = "pviewc.png";
  if (plan.nombre_plan.includes("Premium")) imagen = "pviewp.png";

  return (
    <div
      key={plan.id_plan}
      className={`relative bg-white border rounded-2xl overflow-hidden transition-all duration-300 ease-in-out 
        ${isSelected ? "ring-2 ring-green-500 scale-[1.01]" : "hover:shadow-lg"}
      `}
    >
      {/* Encabezado */}
      <button
        onClick={() =>
          setPlanSeleccionado(isSelected ? null : plan.id_plan)
        }
        className="w-full text-left px-6 py-5 flex justify-between items-center"
      >
        <div>
          <h3 className="text-xl font-bold text-gray-900">{plan.nombre_plan}</h3>
          <p className="text-sm text-gray-500">{plan.descripcion_plan}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-extrabold text-gray-800">
            ${parseFloat(plan.precio_plan).toFixed(2)}
          </span>
          <span className="text-sm font-normal text-gray-500">/mes</span>
          <svg
            className={`w-5 h-5 transform transition-transform duration-300 ${
              isSelected ? "rotate-180" : "rotate-0"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Imagen si no está seleccionada */}
      {!isSelected && (
        <img
          src={`src/assets/${imagen}`}
          alt={`Vista previa ${plan.nombre_plan}`}
          className="w-full h-48 object-cover"
        />
      )}

      {/* Características si está seleccionada */}
      {isSelected && (
        <div className="px-6 pb-6 animate-fade-in">
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            <li>👥 {plan.max_subusuarios} subusuarios incluidos</li>
            <li>📲 Código QR personalizado</li>
            <li>🤖 Integración con Meta</li>
            {plan.ahorro && Number(plan.ahorro) > 0 && (
              <li>💰 Ahorro mensual de ${plan.ahorro}</li>
            )}
          </ul>

          
        </div>
      )}
    </div>
  );
})}

</div>




        <div className="py-10" />

        {/* Botón acción final */}
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
