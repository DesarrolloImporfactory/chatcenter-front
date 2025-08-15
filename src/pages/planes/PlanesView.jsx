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

  // Info de Stripe para mostrar precios reales (si la tienes)
  const [stripeMap, setStripeMap] = useState({});

  // NUEVO: id del plan ACTUAL del usuario
  const [currentPlanId, setCurrentPlanId] = useState(null);

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

  // Precios de Stripe (opcional, ya lo tenías)
  useEffect(() => {
    const syncStripePrices = async () => {
      try {
        const res = await chatApi.get("stripe_plan/stripe");
        const map = {};
        (res.data?.data || []).forEach((p) => {
          map[p.id_plan] = {
            stripe_price: p.stripe_price,       // centavos
            stripe_interval: p.stripe_interval, // 'month' | 'year'
            stripe_price_id: p.stripe_price_id, // price_xxx
          };
        });
        setStripeMap(map);
      } catch (e) {
        console.warn("No se pudo sincronizar precios desde Stripe:", e?.response?.data || e.message);
      }
    };
    syncStripePrices();
  }, []);

  // NUEVO: obtener el plan actual del usuario
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const decoded = JSON.parse(atob(token.split(".")[1]));
        const id_usuario = decoded.id_usuario || decoded.id_users;

        const { data } = await chatApi.post(
          "stripe_plan/obtenerSuscripcionActiva",
          { id_usuario },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setCurrentPlanId(data?.plan?.id_plan ?? null);
      } catch (err) {
        console.warn("No se pudo obtener el plan actual:", err?.response?.data || err.message);
      }
    })();
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
        Swal.fire("Listo", "Tu plan fue actualizado correctamente.", "success").then(() => {
          window.location.href = "/miplan";
        });
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message ===
        "Ya tienes un plan activo. No puedes crear una nueva sesión de pago hasta que expire."
          ? "Ya tienes un plan activo. Espera que expire antes de seleccionar otro."
          : (error?.response?.data?.message || "No se pudo redirigir al pago. Intenta nuevamente.");
      Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  const cerrarSesion = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const getImagenPlan = (nombre = "") => {
    const n = nombre.toLowerCase();
    if (n.includes("premium")) return premium;
    if (n.includes("conexión") || n.includes("conexion")) return conexion;
    return basico;
  };

  const getPrecioMostrar = (plan) => {
    const s = stripeMap[plan.id_plan];
    if (s && typeof s.stripe_price === "number") {
      return (s.stripe_price / 100).toFixed(2);
    }
    return parseFloat(plan.precio_plan).toFixed(2);
  };

  const getIntervalo = (plan) => {
    const s = stripeMap[plan.id_plan];
    if (s?.stripe_interval) return s.stripe_interval === "year" ? "año" : "mes";
    return "mes";
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
            const isCurrent = currentPlanId === plan.id_plan; // ✅ NUEVO
            const imagen = getImagenPlan(plan.nombre_plan);

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
                  relative group rounded-2xl p-[1px]
                  ${isSelected ? "bg-gradient-to-r from-emerald-400/80 via-emerald-300/40 to-emerald-200/10" : ""}
                  transition-all duration-300 ease-out hover:-translate-y-1 will-change-transform
                `}
              >
                {/* Card interna */}
                <div
                  className={`
                    relative overflow-hidden rounded-[calc(1rem-1px)]
                    bg-white/90 backdrop-blur border border-slate-200/60
                    shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_10px_30px_-12px_rgba(23,25,49,0.28)]
                    transition-shadow duration-300
                    ${isSelected ? "ring-2 ring-emerald-300/70 shadow-2xl" : ""}
                  `}
                >
                  {/* Medallón */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 h-16 w-16 rounded-2xl ring-2 ring-white shadow-lg overflow-hidden">
                    <div className="h-full w-full" style={{ backgroundColor: "#171931" }} />
                  </div>

                  {/* Contenido */}
                  <div className="px-6 pt-12 pb-6 md:px-7 md:pt-14 md:pb-7">
                    {/* Etiquetas superiores */}
                    <div className="flex items-center justify-between">
                      {ribbon ? (
                        <span className="rounded-full bg-[#171931] text-white text-[11px] font-semibold px-3 py-1 shadow">
                          {ribbon}
                        </span>
                      ) : <span />}

                      {/* ✅ NUEVO: badge cuando es el plan actual */}
                      {isCurrent && (
                        <span className="rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold px-3 py-1 border border-indigo-200">
                          Tu plan actual
                        </span>
                      )}

                      {isSelected && !isCurrent && (
                        <span className="rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-3 py-1 border border-emerald-200">
                          Seleccionado
                        </span>
                      )}
                    </div>

                    {/* Título y descripción */}
                    <div className="mt-3 text-center">
                      <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#171931]">
                        {plan.nombre_plan}
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-600 mt-1">
                        {plan.descripcion_plan}
                      </p>
                    </div>

                    {/* Precio centrado */}
                    <div className="mt-5 text-center">
                      <div className="inline-flex items-end gap-1">
                        <span className="text-3xl md:text-[34px] font-extrabold tracking-tight text-[#171931]">
                          ${getPrecioMostrar(plan)}
                        </span>
                        <span className="text-sm text-slate-500 mb-1">/{getIntervalo(plan)}</span>
                      </div>
                    </div>

                    {/* Beneficios */}
                    <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M7.629 13.233l-3.2-3.2 1.414-1.414 1.786 1.786 5.657-5.657 1.414 1.414-7.071 7.071z"/></svg>
                        {plan.max_subusuarios} subusuarios incluidos
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M7.629 13.233l-3.2-3.2 1.414-1.414 1.786 1.786 5.657-5.657 1.414 1.414-7.071 7.071z"/></svg>
                        Código QR personalizado
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M7.629 13.233l-3.2-3.2 1.414-1.414 1.786 1.786 5.657-5.657 1.414 1.414-7.071 7.071z"/></svg>
                        Integración con Meta
                      </li>
                      {plan.ahorro > 0 && (
                        <li className="flex items-center gap-2 text-emerald-600 font-medium">
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M7.629 13.233l-3.2-3.2 1.414-1.414 1.786 1.786 5.657-5.657 1.414 1.414-7.071 7.071z"/></svg>
                          Ahorro anual de ${plan.ahorro}
                        </li>
                      )}
                    </ul>

                    {/* Acción */}
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          if (isCurrent) return;            // ✅ no permitir seleccionar el actual
                          setPlanSeleccionado(plan.id_plan);
                        }}
                        disabled={isSelected || isCurrent}   // ✅ deshabilitado si es actual
                        className={`
                          w-full inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold
                          transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                          ${isCurrent
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : isSelected
                              ? "bg-emerald-600 text-white cursor-default"
                              : "bg-[#171931] text-white hover:-translate-y-[2px] hover:shadow-lg active:translate-y-0"}
                        `}
                      >
                        {isCurrent
                          ? "Tienes este plan actualmente"   // ✅ texto solicitado
                          : isSelected
                            ? "Seleccionado"
                            : "Seleccionar"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA inferior (ocúltalo si, por algún motivo, el seleccionado coincide con el actual) */}
        {planSeleccionado && planSeleccionado !== currentPlanId && (
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
