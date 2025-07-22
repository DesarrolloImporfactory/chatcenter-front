import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

const PlanesView = () => {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);

  useEffect(() => {
    const obtenerPlanes = async () => {
      try {
        const res = await chatApi.get("planes/listarPlanes");
        setPlanes(res.data.data);
      } catch (error) {
        console.error("Error al obtener planes:", error);
      }
    };

    obtenerPlanes();
  }, []);

  const seleccionarPlan = async () => {
    if (!planSeleccionado) return;

    try {
      await chatApi.post(
        "planes/seleccionarPlan",
        { id_plan: planSeleccionado },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Notificación con Swal
      await Swal.fire({
        icon: "success",
        title: "¡Plan seleccionado correctamente!",
        showConfirmButton: false,
        timer: 1500,
      });

      // Redirección
      navigate("/administrador-whatsapp");
    } catch (error) {
      console.error("Error al seleccionar el plan:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo seleccionar el plan. Intenta nuevamente.",
      });
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-6xl relative">
        {/* Botón cerrar sesión */}
        <div className="flex justify-end mb-4">
          <button
            onClick={cerrarSesion}
            className="text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md shadow transition"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="py-10"></div>

        {/* Barra de progreso superior */}
        <div className="w-full bg-gray-300 h-2 mb-6">
          <div className="bg-green-500 h-2 w-1/3 transition-all duration-300 ease-in-out"></div>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
          Selecciona un plan y acelera tu crecimiento
        </h2>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-center items-center">
          {planes.map((plan) => (
            <div
              key={plan.id_plan}
              onClick={() => setPlanSeleccionado(plan.id_plan)}
              className={`cursor-pointer border rounded-lg p-6 shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
                planSeleccionado === plan.id_plan
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <h3 className="text-xl font-semibold mb-2">{plan.nombre_plan}</h3>
              <p className="text-2xl font-bold text-gray-800 mb-2">
                US${parseFloat(plan.precio_plan).toFixed(2)}{" "}
                <span className="text-sm font-normal">/mes</span>
              </p>
              <p className="text-gray-600 mb-1">{plan.descripcion_plan}</p>
              <p className="text-gray-500 text-sm">
                {plan.max_subusuarios} subusuarios • QR • Meta
              </p>
            </div>
          ))}
        </div>

        {/* Botón global */}
        {planSeleccionado && (
          <div className="flex justify-center mt-10">
            <button
              onClick={seleccionarPlan}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-10 rounded-full shadow-md transition transform hover:scale-105"
            >
              Elegir este plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanesView;
