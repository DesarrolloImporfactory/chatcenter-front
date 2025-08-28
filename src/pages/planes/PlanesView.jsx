// src/views/PlanesView.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

import basico from "../../assets/plan_basico_v2.png";
import conexion from "../../assets/plan_conexion_v2.png";
import premium from "../../assets/plan_premium_medal.png";

/* ===== Listón diagonal ===== */
const Liston = ({ texto, color = "recomendado" }) => {
  const colores = {
    popular: "bg-purple-600 text-white",
    recomendado: "bg-blue-600 text-white",
    vendido: "bg-yellow-400 text-black",
  };
  const colorClase = colores[color] || "bg-gray-800 text-white";

  // Reemplaza el return del componente Liston por este:
return (
  <div className="pointer-events-none absolute top-2 right-2 w-28 h-28 overflow-hidden z-40">
    <div
      className={[
        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        "rotate-45",
        colorClase,
        "shadow-md rounded-[2px] px-3 py-[5px]",
        "text-[10px] md:text-[11px] font-extrabold uppercase leading-none",
        "whitespace-nowrap text-center",
        "min-w-[150px]",
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
  const [stripeMap, setStripeMap] = useState({});
  const [currentPlanId, setCurrentPlanId] = useState(null);
  // ¿El usuario todavía puede usar el free trial?
  const [trialElegible, setTrialElegible] = useState(true);

  /* ===== Datos ===== */
  useEffect(() => {
    const obtenerPlanes = async () => {
      try {
        const res = await chatApi.get("planes/listarPlanes");
        setPlanes(res.data.data);
      } catch {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudieron cargar los planes." });
      }
    };
    obtenerPlanes();
  }, []);

  // Verifica elegibilidad del trial al cargar
useEffect(() => {
  (async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;

      const { data } = await chatApi.post(
        "stripe_plan/trialElegibilidad",
        { id_usuario },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTrialElegible(Boolean(data?.elegible));
    } catch (e) {
      console.warn("trialElegibilidad:", e?.response?.data || e.message);
    }
  })();
}, []);

  useEffect(() => {
    const syncStripePrices = async () => {
      try {
        const res = await chatApi.get("stripe_plan/stripe");
        const map = {};
        (res.data?.data || []).forEach((p) => {
          map[p.id_plan] = {
            stripe_price: p.stripe_price,
            stripe_interval: p.stripe_interval,
            stripe_price_id: p.stripe_price_id,
          };
        });
        setStripeMap(map);
      } catch (e) {
        console.warn("No se pudo sincronizar precios desde Stripe:", e?.response?.data || e.message);
      }
    };
    syncStripePrices();
  }, []);

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


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("setup") === "ok") {
      activarPlanFree();
    }
  }, []);

  const activarPlanFree = async () => {
    try {
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;

      const res = await chatApi.post(
        "planes/seleccionarPlan",
        { id_plan: 1, id_usuario },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.status === "success") {
        Swal.fire("Listo", "Tu plan gratuito fue activado correctamente. Se cobrará automáticamente al finalizar.", "success").then(() => {
          window.location.href = "/miplan";
        });
      } else {
        throw new Error(res.data.message);
      }
    } catch (error) {
      const msg = error?.response?.data?.message || "No se pudo activar el plan gratuito.";
      Swal.fire("Error", msg, "error");
    }
  };


  // Antes: const seleccionarPlan = async () => { ... usa planSeleccionado ... }

  const seleccionarPlan = async (idPlan) => {
    if (!idPlan) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;
      const baseUrl = window.location.origin;


      /* if (planSeleccionado === 1) {
        if (!trialElegible) {
          Swal.fire("No disponible", "Ya usaste tu plan gratuito.", "info");
          return;
        }
        const { data } = await chatApi.post(
          "stripe_plan/crearFreeTrial",
          {
            id_usuario,
            success_url: `${baseUrl}/miplan?trial=ok`,
            cancel_url: `${baseUrl}/planes_view?trial=cancel`,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data?.url) window.location.href = data.url; // Redirige a Stripe Checkout (pide tarjeta)
        return;
      } */


      // FREE (id 1) → Setup de tarjeta (misma lógica que ya tenías)
      if (idPlan === 1) {
        if (!trialElegible) {
          Swal.fire("No disponible", "Ya usaste tu plan gratuito.", "info");
          return;
        }
        const { data } = await chatApi.post(
          "stripe_plan/crearSesionFreeSetup",
          { id_usuario },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data?.url) {
          window.location.href = data.url;
          return;
        } else {
          throw new Error("No se pudo crear la sesión de setup para el plan gratuito.");
        }
      }

      // Plan de pago → Checkout (suscripción o delta)
      const res = await chatApi.post(
        "stripe_plan/crearSesionPago",
        {
          id_plan: idPlan,
          id_usuario,
          success_url: `${baseUrl}/miplan?addpm=1`,
          cancel_url: `${baseUrl}/planes_view`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.url) {
        localStorage.setItem(
          "plan_activado",
          JSON.stringify({
            id_plan: idPlan,
            nombre: planes.find((p) => p.id_plan === idPlan)?.nombre_plan || "",
          })
        );
        window.location.href = res.data.url;
      } else {
        Swal.fire("Listo", "Tu plan fue actualizado correctamente.", "success").then(() => {
          window.location.href = "/miplan";
        });
      }
    } catch (error) {
      const msg = error?.response?.data?.message || "No se pudo procesar tu solicitud. Intenta nuevamente.";
      Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setLoading(false);
    }
  };


  const getImagenPlan = (nombre = "") => {
    const n = nombre.toLowerCase();
    if (n.includes("premium")) return premium;
    if (n.includes("conexión") || n.includes("conexion")) return conexion;
    return basico;
  };

  const getPrecioMostrar = (plan) => {
    const s = stripeMap[plan.id_plan];
    if (s && typeof s.stripe_price === "number") return (s.stripe_price / 100).toFixed(2);
    return parseFloat(plan.precio_plan).toFixed(2);
  };

  const getIntervalo = (plan) => {
    const s = stripeMap[plan.id_plan];
    if (s?.stripe_interval) return s.stripe_interval === "year" ? "año" : "mes";
    return "mes";
  };

  /* ===== Iconos ===== */
  const IconoCheck = () => (
    <svg className="w-4 h-4 shrink-0 mt-[2px]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M7.629 13.233l-3.2-3.2 1.414-1.414 1.786 1.786 5.657-5.657 1.414 1.414-7.071 7.071z" />
    </svg>
  );
  const IconoX = () => (
    <svg className="w-4 h-4 shrink-0 mt-[2px]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );

  /* ===== Beneficios en matriz (mismo orden y cantidad) ===== */
  const buildFeatures = (plan) => {
    const nombre = (plan?.nombre_plan || "").toLowerCase();
    const esFree = nombre.includes("free") || nombre.includes("gratuito");
    const esConexion = nombre.includes("conexión") || nombre.includes("conexion");
    const desactivaCitas = esFree || esConexion;

    return [
      { label: `${plan.n_conexiones} Conexiones`, enabled: true },
      { label: `${plan.max_subusuarios} subusuarios incluidos`, enabled: true },
      { label: "Código QR personalizado", enabled: true },
      { label: "Integración con Meta", enabled: true },
      { label: "Contactos ilimitados", enabled: true },
      { label: "Conversaciones ilimitadas", enabled: true },
      { label: "Whatsapp coexistencia", enabled: true },
      { label: "Inteligencia artificial", enabled: true },
      { label: "Área de productos y servicios", enabled: true },
      { label: "Automatizador", enabled: true },
      { label: "IA de agendamiento de citas", enabled: !desactivaCitas },
      { label: "Calendario de programación de citas", enabled: !desactivaCitas },
    ];
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 py-12 mt-10">
      <div className="w-full max-w-8xl">
        {/* HEADER */}
        <div className="relative mb-10 mt-10">
          <h2 className="text-4xl text-center font-extrabold text-[#2f2b45]">Elige tu plan ideal y potencia tu empresa</h2>
          <p className="mt-3 text-sm text-center text-[#5a547a]">Planes claros, beneficios reales y un proceso de activación sencillo.</p>

          {currentPlanId && (
            <div className="absolute -top-2 right-0">
              <div className="relative inline-block group">
                <div className="inline-block p-[2px] rounded-full bg-gradient-to-r from-[#E9E4FF] via-[#CFC3FF] to-[#A792FF] shadow-lg shadow-purple-300/30">
                  
                </div>
                <div
                  id="tooltip-mi-plan"
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-3 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out z-50"
                >
                  <div className="relative rounded-xl px-4 py-2 text-[13px] font-medium tracking-wide text-white bg-[#171931] border border-[#2f2b45]/50 shadow-[0_14px_40px_-14px_rgba(23,25,49,0.8)]">
                    Ir a Mi Plan
                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#171931] border-r border-b border-[#2f2b45]/50" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* GRID de cards (todas estiran la misma altura) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
          {planes.length === 0 && (
            <>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-3xl p-6 bg-[#f5f4fb] border border-[#c4bde4]/40 animate-pulse h-[520px]" />
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

            const features = buildFeatures(plan);

            return (
              <div
                key={plan.id_plan}
                className="relative group rounded-2xl p-[1px] transition-all duration-300 ease-out hover:-translate-y-1 h-full"
              >
                <div
                  className="
                    relative overflow-visible rounded-[calc(1rem-1px)]
                    bg-white/90 backdrop-blur border border-slate-200/60
                    shadow-md transition-shadow duration-300
                    h-full flex flex-col
                  "
                >
                  {/* Listones */}
                  {esBasico && <Liston texto="Más vendido" color="vendido" />}
                  {!esBasico && ribbon === "Recomendado" && <Liston texto="Recomendado" color="recomendado" />}
                  {!esBasico && ribbon === "Popular" && <Liston texto="Popular" color="popular" />}

                  {/* Contenido */}
                  <div className="px-6 pt-16 pb-6 md:px-7 md:pt-20 md:pb-7 flex flex-col h-full">
                    {/* Título y descripción (misma altura en todas) */}
                    <div className="text-center min-h-[92px]">
                      <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#171931]">{plan.nombre_plan}</h3>
                      <p className="text-sm leading-relaxed text-slate-600 mt-1">{plan.descripcion_plan}</p>
                    </div>

                    {/* Precio (misma altura) */}
                    <div className="mt-5 text-center min-h-[52px] flex items-end justify-center">
                      <div className="inline-flex items-end gap-1">
                        <span className="text-3xl md:text-[34px] font-extrabold tracking-tight text-[#171931]">
                          ${getPrecioMostrar(plan)}
                        </span>
                        <span className="text-sm text-slate-500 mb-1">/{getIntervalo(plan)}</span>
                      </div>
                    </div>

                    {/* Beneficios: misma cantidad y orden para todas */}
                    {/* Beneficios (centrados en 2 columnas) */}
                    <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-y-3 md:gap-x-3 text-sm flex-1 md:w-[100%] mx-auto">
                      {features.map((f, idx) => (
                        <li key={idx} className={f.enabled ? "text-slate-700" : "text-slate-400"}>
                          {/* mini-grid: [icono | texto] para alinear perfecto */}
                          <div className="grid grid-cols-[12px_1fr] items-start gap-2">
                            <span className="inline-flex h-4 w-4 items-center justify-center mt-[2px]">
                              {f.enabled ? <IconoCheck /> : <IconoX />}
                            </span>
                            <span className="leading-relaxed text-left">{f.label}</span>
                          </div>
                        </li>
                      ))}
                    </ul>




                    {/* Botón siempre al mismo nivel */}
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          if (isCurrent) return;
                          if (plan.id_plan === 1 && !trialElegible) {
                            Swal.fire("No disponible", "Ya usaste tu plan gratuito.", "info");
                            return;
                          }
                          seleccionarPlan(plan.id_plan); // ← ahora ejecuta el flujo directamente
                        }}
                        disabled={loading || isCurrent || (plan.id_plan === 1 && !trialElegible)}
                        className={`
                          w-full inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold
                          transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                          ${
                            isCurrent
                              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                              : isSelected
                              ? "bg-emerald-600 text-white cursor-default"
                              : (plan.id_plan === 1 && !trialElegible)
                              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                              : "bg-[#171931] text-white hover:-translate-y-[2px] hover:shadow-lg active:translate-y-0"
                          }
                        `}
                      >
                        {isCurrent
                          ? "Tienes este plan actualmente"
                          : isSelected
                          ? "Seleccionado"
                          : (plan.id_plan === 1 && !trialElegible)
                          ? "No disponible"
                          : "Seleccionar"}
                      </button>
                        
                      {plan.id_plan === 1 && !trialElegible && (
                        <p className="mt-2 text-xs text-red-600">Ya usaste tu plan gratuito.</p>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA inferior */}
        {/* {planSeleccionado && planSeleccionado !== currentPlanId && (
          <div className="flex flex-col items-center gap-3 mt-10">
            <div className="text-sm text-[#5a547a]">
              Plan seleccionado:{" "}
              <span className="font-semibold text-[#2f2b45]">
                {planes.find((p) => p.id_plan === planSeleccionado)?.nombre_plan}
              </span>
            </div>
            <button
              onClick={seleccionarPlan}
              disabled={loading || (planSeleccionado === 1 && !trialElegible)}
              className="bg-gradient-to-r from-[#6d5cbf] to-[#5a4aa5] hover:from-[#5f51ac] hover:to-[#4a3e88] text-white font-semibold py-3 px-10 rounded-full shadow-lg transition transform hover:scale-[1.03] disabled:opacity-50"
            >
              {loading ? "Procesando..." : "Elegir este plan"}
            </button>
                    
            {planSeleccionado === 1 && !trialElegible && (
              <div className="mt-2 text-xs text-red-600">Ya usaste tu plan gratuito.</div>
            )}

          </div>
        )} */}
      </div>
    </div>
  );
};

export default PlanesView;
