import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

// IMPORTA CON EXTENSIÓN (ajusta si tus archivos son .webp/.jpg)
import basico from "../../assets/plan_basico_v2.png";
import conexion from "../../assets/plan_conexion_v2.png";
import premium from "../../assets/plan_premium_medal.png";

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
          success_url: `${baseUrl}/miplan?addpm=1`,
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

  // 🔎 Helper para elegir la imagen según el nombre del plan
  const getImagenPlan = (nombre = "") => {
    const n = nombre.toLowerCase();
    if (n.includes("premium")) return premium;
    if (n.includes("conexión") || n.includes("conexion")) return conexion; // con y sin tilde
    return basico;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-6xl">
        {/* top bar */}
        <div className="flex justify-end mb-4">
          <button
            onClick={cerrarSesion}
            className="text-sm bg-[#6d5cbf] hover:bg-[#5a4aa5] text-white px-4 py-2 rounded-md shadow transition"
          >
            Cerrar sesión
          </button>
        </div>

        {/* header */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold text-[#2f2b45]">
            Elige tu plan ideal y potencia tu empresa
          </h2>
          <p className="mt-3 text-sm text-[#5a547a]">
            Planes claros, beneficios reales y un proceso de activación sencillo.
          </p>
        </div>

        {/* grid de planes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {planes.length === 0 && (
            <>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-3xl p-6 bg-[#f5f4fb] border border-[#c4bde4]/40 animate-pulse h-72"
                />
              ))}
            </>
          )}

          {planes.map((plan) => {
            const isSelected = planSeleccionado === plan.id_plan;

            // ✅ Usa la variable importada directamente
            const imagen = getImagenPlan(plan.nombre_plan);

            // cintas UI (no afectan lógica)
            const ribbon =
              plan.nombre_plan?.toLowerCase().includes("premium")
                ? "Popular"
                : plan.nombre_plan?.toLowerCase().includes("conexión") ||
                  plan.nombre_plan?.toLowerCase().includes("conexion")
                ? "Recomendado"
                : null;

            return (
              <div
                key={plan.id_plan}
                className={`
                  relative group rounded-3xl overflow-hidden border 
                  ${isSelected ? "border-emerald-400 ring-4 ring-emerald-300/40" : "border-[#c4bde4]/30"}
                  bg-gradient-to-b from-white to-[#f9f9fd] shadow-lg hover:shadow-xl transition-all duration-300 
                  ${isSelected ? "scale-[1.02]" : "hover:scale-[1.01]"}
                `}
              >
                {/* imagen superior (solo si NO está seleccionado) con ribbon encima */}
                {!isSelected && (
                  <div className="relative h-28 overflow-hidden">
                    {ribbon && (
                      <span className="absolute z-20 left-2 top-2 rounded-full bg-[#322b4f] text-white text-xs font-semibold px-3 py-1 shadow">
                        {ribbon}
                      </span>
                    )}
                    <img
                      src={imagen}               
                      alt={plan.nombre_plan}
                      className="absolute inset-0 w-full h-full object-cover z-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent opacity-80 z-10" />
                  </div>
                )}

                {/* Si está seleccionado (no hay imagen), mostramos el ribbon en la esquina del card */}
                {isSelected && ribbon && (
                  <div className="absolute left-0 top-4 z-20">
                    <span className="rounded-r-full bg-[#322b4f] text-white text-xs font-semibold px-3 py-1 shadow">
                      {ribbon}
                    </span>
                  </div>
                )}

                {/* contenido */}
                <button
                  onClick={() => setPlanSeleccionado(isSelected ? null : plan.id_plan)}
                  className="w-full text-left focus:outline-none"
                >
                  <div className="px-6 py-6">
                    {/* título y descripción */}
                    <div className="mb-5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold text-[#2f2b45] tracking-tight">
                          {plan.nombre_plan}
                        </h3>

                        {isSelected && (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#676189] mt-1">
                        {plan.descripcion_plan}
                      </p>
                    </div>

                    {/* precio */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-right">
                        <span className="text-3xl font-extrabold text-[#30294a]">
                          ${parseFloat(plan.precio_plan).toFixed(2)}
                        </span>
                        <span className="text-sm text-[#7a7499] ml-1">/mes</span>
                      </div>

                      <span className="rounded-full border border-[#c4bde4]/50 bg-[#f3f1fb] text-[#4b3f72] text-xs font-semibold px-3 py-1">
                        Suscripción
                      </span>
                    </div>

                    {/* beneficios */}
                    {isSelected ? (
                      <ul className="mt-2 grid grid-cols-1 gap-2 text-sm text-[#3b3560]">
                        <li>👥 {plan.max_subusuarios} subusuarios incluidos</li>
                        <li>📲 Código QR personalizado</li>
                        <li>🤖 Integración con Meta</li>
                        {plan.ahorro > 0 && (
                          <li className="text-emerald-600 font-medium">
                            💰 Ahorro anual de ${plan.ahorro}
                          </li>
                        )}
                      </ul>
                    ) : (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#5e5882]">
                        <div className="rounded-lg bg-[#f5f4fb] border border-[#c4bde4]/40 px-2 py-1.5">
                          {plan.max_subusuarios} subusuarios
                        </div>
                        <div className="rounded-lg bg-[#f5f4fb] border border-[#c4bde4]/40 px-2 py-1.5">
                          QR personalizado
                        </div>
                      </div>
                    )}
                  </div>
                </button>

                {/* halo inferior decorativo */}
                <div className="pointer-events-none absolute inset-x-0 -bottom-16 h-24 bg-gradient-to-t from-[#c4bde4]/30 to-transparent blur-2xl opacity-60" />
              </div>
            );
          })}
        </div>

        {/* CTA inferior */}
        {planSeleccionado && (
          <div className="flex flex-col items-center gap-3 mt-10">
            <div className="text-sm text-[#5a547a]">
              Plan seleccionado:{" "}
              <span className="font-semibold text-[#2f2b45]">
                {planes.find((p) => p.id_plan === planSeleccionado)?.nombre_plan}
              </span>
            </div>
            <button
              onClick={seleccionarPlan}
              disabled={loading}
              className="bg-gradient-to-r from-[#6d5cbf] to-[#5a4aa5] hover:from-[#5f51ac] hover:to-[#4a3e88] text-white font-semibold py-3 px-10 rounded-full shadow-lg transition transform hover:scale-[1.03] disabled:opacity-50"
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
