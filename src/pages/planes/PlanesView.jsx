import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

const PlanesView = () => {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    const obtenerPlanes = async () => {
      try {
        const res = await chatApi.get("planes/listarPlanes");
        setPlanes(res.data.data);
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar los planes.",
        });
      }
    };
    obtenerPlanes();
  }, []);

  useEffect(() => {
    if (!autoPlay || planes.length === 0) return;
    let index = 0;
    const intervalo = setInterval(() => {
      setPlanSeleccionado(planes[index].id_plan);
      index++;
      if (index >= planes.length) {
        clearInterval(intervalo);
        setAutoPlay(false);
      }
    }, 1000);
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
          id_usuario,
          success_url: `${baseUrl}/conexiones`,
          cancel_url: `${baseUrl}/planes_view`,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
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
        throw new Error("No se recibió URL de pago");
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error?.response?.data?.message ===
          "Ya tienes un plan activo. No puedes crear una nueva sesión de pago hasta que expire."
            ? "Ya tienes un plan activo. Espera que expire antes de seleccionar otro."
            : "No se pudo redirigir al pago. Intenta nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const cerrarSesion = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9fafb] to-[#e5e7eb] flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-6xl">
        <div className="flex justify-end mb-4">
          <button
            onClick={cerrarSesion}
            className="text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md shadow transition"
          >
            Cerrar sesión
          </button>
        </div>

        <h2 className="text-4xl font-extrabold text-center mb-10 text-[#171931]">
          Elige tu plan ideal y potencia tu empresa
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {planes.map((plan) => {
            const isSelected = planSeleccionado === plan.id_plan;
            let imagen = "pviewb.png";
            if (plan.nombre_plan.includes("Conexión")) imagen = "pviewc.png";
            if (plan.nombre_plan.includes("Premium")) imagen = "pviewp.png";

            return (
              <div
                key={plan.id_plan}
                className={`relative bg-white rounded-3xl overflow-hidden shadow-lg transition-transform duration-300 transform ${
                  isSelected ? "ring-4 ring-green-400 scale-105" : "hover:scale-[1.02]"
                }`}
              >
                <button
                  onClick={() =>
                    setPlanSeleccionado(isSelected ? null : plan.id_plan)
                  }
                  className="w-full text-left focus:outline-none"
                >
                  {/* Imagen superior más pequeña */}
                  {!isSelected && (
                    <div className="h-28 overflow-hidden">
                      <img
                        src={`src/assets/${imagen}`}
                        alt={plan.nombre_plan}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Contenido visual premium */}
                  <div className="px-6 py-6 bg-gradient-to-br from-white to-gray-50">
                    <div className="mb-4">
                      <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
                        {plan.nombre_plan}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {plan.descripcion_plan}
                      </p>
                    </div>

                    <div className="text-right mb-4">
                      <span className="text-3xl font-bold text-gray-800">
                        ${parseFloat(plan.precio_plan).toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">/mes</span>
                    </div>

                    {isSelected && (
                      <ul className="mt-2 space-y-3 text-sm text-gray-700">
                        <li>👥 {plan.max_subusuarios} subusuarios incluidos</li>
                        <li>📲 Código QR personalizado</li>
                        <li>🤖 Integración con Meta</li>
                        {plan.ahorro > 0 && (
                          <li className="text-green-600">
                            💰 Ahorro anual de ${plan.ahorro}
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

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
