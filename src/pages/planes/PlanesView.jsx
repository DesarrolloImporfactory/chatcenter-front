// src/views/PlanesView.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

// (opcional) si usas imágenes en otra parte
import basico from "../../assets/plan_basico_v2.png";
import conexion from "../../assets/plan_conexion_v2.png";
import premium from "../../assets/plan_premium_medal.png";

/* ============================
   COMPONENTE: Listón diagonal
   ============================
   - Se coloca DENTRO de la card (que es relative) y la card usa overflow-visible.
   - Queda pegado a la esquina superior derecha.
   - Texto centrado, sin recortes (whitespace-nowrap).
*/
const Liston = ({ texto, color = "recomendado" }) => {
  const colores = {
    popular: "bg-purple-600 text-white",
    recomendado: "bg-blue-600 text-white",
    vendido: "bg-yellow-400 text-black",
  };
  const colorClase = colores[color] || "bg-gray-800 text-white";

  return (
    // Cuadrado recortador pegado a la esquina (todo lo de adentro queda dentro de la card)
    <div className="pointer-events-none absolute top-0 right-0 w-32 h-32 overflow-hidden z-40">
      {/* Banda centrada y rotada, siempre visible y centrada dentro del cuadrado */}
      <div
        className={[
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "rotate-45", // diagonal esquina superior derecha
          colorClase,
          "shadow-md rounded-[2px] px-4 py-[6px]",
          "text-[11px] md:text-[12px] font-extrabold uppercase leading-none",
          "whitespace-nowrap text-center",
          "min-w-[180px]", // ancho suficiente para “RECOMENDADO”
        ].join(" ")}
      >
        {texto}
      </div>
    </div>
  );
};


const PlanesView = () => {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);

  // Precios Stripe
  const [stripeMap, setStripeMap] = useState({});

  // Plan actual
  const [currentPlanId, setCurrentPlanId] = useState(null);

  // Obtener planes
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

  // Precios de Stripe
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

  // Plan actual del usuario
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

    // ✅ Si el plan seleccionado es el Plan Free (id_plan === 1)
    if (planSeleccionado === 1) {
      const res = await chatApi.post(
        "planes/seleccionarPlan",
        {
          id_plan: 1,
          id_usuario,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.status === "success") {
        Swal.fire("Listo", "Tu plan gratuito fue activado correctamente.", "success").then(() => {
          window.location.href = "/miplan";
        });
      } else {
        throw new Error(res.data.message || "No se pudo activar el plan gratuito.");
      }

      return; // detener aquí, no pasar a Stripe
    }

    // 🟣 Planes de pago con Stripe
    const res = await chatApi.post(
      "stripe_plan/crearSesionPago",
      {
        id_plan: planSeleccionado,
        id_usuario,
        success_url: `${baseUrl}/miplan?addpm=1`,
        cancel_url: `${baseUrl}/planes_view`,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (res.data.url) {
      localStorage.setItem(
        "plan_activado",
        JSON.stringify({
          id_plan: planSeleccionado,
          nombre: planes.find((p) => p.id_plan === planSeleccionado)?.nombre_plan || "",
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
      error?.response?.data?.message ||
      "No se pudo procesar tu solicitud. Intenta nuevamente.";
    Swal.fire({ icon: "error", title: "Error", text: msg });
  } finally {
    setLoading(false);
  }
};


  // (opcional) utilidad de imágenes
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
    <div className="min-h-screen bg-white flex flex-col items-center px-6 py-12 mt-10">
      <div className="w-full max-w-6xl">
        {/* HEADER limpio (sin franja) */}
<div className="relative mb-10 mt-10">
  <h2 className="text-4xl text-center font-extrabold text-[#2f2b45]">
    Elige tu plan ideal y potencia tu empresa
  </h2>
  <p className="mt-3 text-sm text-center text-[#5a547a]">
    Planes claros, beneficios reales y un proceso de activación sencillo.
  </p>

  {/* BOTÓN FLOTANTE PREMIUM (arriba derecha) */}
  {currentPlanId && (
    <div className="absolute -top-2 right-0">
      <div className="relative inline-block group">
        {/* borde metálico sutil SOLO alrededor del botón */}
        <div className="inline-block p-[2px] rounded-full bg-gradient-to-r from-[#E9E4FF] via-[#CFC3FF] to-[#A792FF] shadow-lg shadow-purple-300/30">
          <button
            onClick={() => navigate("/miplan")}
            aria-label="Ir a Mi Plan"
            aria-describedby="tooltip-mi-plan"
            className="
              inline-flex items-center justify-center
              h-11 w-11 rounded-full
              bg-[#111321] backdrop-blur
              ring-1 ring-white/10
              transition-all duration-300
              hover:scale-[1.05] hover:shadow-2xl hover:shadow-purple-400/40
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-white
            "
          >
            {/* brillo sutil superior */}
            <span className="pointer-events-none absolute inset-x-1 top-0 h-1/3 rounded-t-full bg-white/10" />
            {/* icono corona */}
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white/90" aria-hidden="true">
              <path
                fill="currentColor"
                d="M5 19h14a1 1 0 0 0 1-1v-8.5l-3.4 2.55a1 1 0 0 1-1.41-.17L12 6.89l-3.19 5a1 1 0 0 1-1.41.29L4 9.5V18a1 1 0 0 0 1 1Zm-1 2a3 3 0 0 1-3-3V8a1 1 0 0 1 1.58-.81l3.68 2.76 3.07-4.81a1 1 0 0 1 1.7 0l3.08 4.8 3.67-2.75A1 1 0 0 1 23 8v10a3 3 0 0 1-3 3H4Z"
              />
            </svg>
          </button>
        </div>

        {/* Tooltip empresarial */}
        <div
          id="tooltip-mi-plan"
          role="tooltip"
          className="
            pointer-events-none
            absolute left-1/2 -translate-x-1/2 mt-3
            opacity-0 translate-y-1
            group-hover:opacity-100 group-hover:translate-y-0
            group-focus-within:opacity-100 group-focus-within:translate-y-0
            transition-all duration-200 ease-out
            z-50
          "
        >
          <div
            className="
              relative rounded-xl px-4 py-2
              text-[13px] font-medium tracking-wide
              text-white
              bg-[#171931]
              border border-[#2f2b45]/50
              shadow-[0_14px_40px_-14px_rgba(23,25,49,0.8)]
            "
          >
            Ir a Mi Plan
            <span
              className="
                absolute -top-1.5 left-1/2 -translate-x-1/2
                w-3 h-3 rotate-45
                bg-[#171931] border-r border-b border-[#2f2b45]/50
              "
            />
          </div>

        </div>
      </div>
    </div>
  )}
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
            const isCurrent = currentPlanId === plan.id_plan;

            const ribbon =
              plan.nombre_plan?.toLowerCase().includes("premium")
                ? "Popular"
                : plan.nombre_plan?.toLowerCase().includes("conexión") ||
                  plan.nombre_plan?.toLowerCase().includes("conexion")
                ? "Recomendado"
                : null;

            const esBasico =
              (plan.nombre_plan || "").toLowerCase().includes("básico") ||
              (plan.nombre_plan || "").toLowerCase().includes("basico");

            return (
              <div
                key={plan.id_plan}
                className="relative group rounded-2xl p-[1px] transition-all duration-300 ease-out hover:-translate-y-1"
              >
                {/* Card interna (overflow-visible para que el listón sobresalga) */}
                <div
                  className="
                    relative overflow-visible rounded-[calc(1rem-1px)]
                    bg-white/90 backdrop-blur border border-slate-200/60
                    shadow-md transition-shadow duration-300
                  "
                >
                  {/* === LISTÓN: PRIMER HIJO DE LA CARD === */}
                  {esBasico && <Liston texto="Más vendido" color="vendido" />}
                  {!esBasico && ribbon === "Recomendado" && (
                    <Liston texto="Recomendado" color="recomendado" />
                  )}
                  {!esBasico && ribbon === "Popular" && (
                    <Liston texto="Popular" color="popular" />
                  )}

                  {/* Contenido */}
                  <div className="px-6 pt-12 pb-6 md:px-7 md:pt-14 md:pb-7">
                    {/* Etiquetas superiores derechas */}
                    <div className="flex items-center justify-end">
                     
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

                    {/* Precio */}
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
                    </ul>

                    {/* Acción */}
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          if (isCurrent) return;
                          setPlanSeleccionado(plan.id_plan);
                        }}
                        disabled={isSelected || isCurrent}
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
                          ? "Tienes este plan actualmente"
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

        {/* CTA inferior */}
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
