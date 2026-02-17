// src/views/PlanesView.jsx
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import { useNavigate } from "react-router-dom";
import CardPlanPersonalizado from "../../pages/planes/CardPlanPersonalizado";

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
  const [loading, setLoading] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null);

  //  NUEVO: saber si tiene plan activo (para mostrar botón regresar)
  const [hasActivePlan, setHasActivePlan] = useState(false);

  // ✅ Trial solo en Conexión
  const TRIAL_PLAN_ID = 2;
  const TRIAL_DAYS = 15;

  /* ===== Cargar planes + plan actual ===== */
  useEffect(() => {
    (async () => {
      try {
        const resPlanes = await chatApi.get("planes/listarPlanes");
        setPlanes(resPlanes.data?.data || []);

        const token = localStorage.getItem("token");
        if (!token) return;

        const decoded = JSON.parse(atob(token.split(".")[1]));
        const id_usuario = decoded.id_usuario || decoded.id_users;

        const { data } = await chatApi.post(
          "stripe_plan/obtenerSuscripcionActiva",
          { id_usuario },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const plan = data?.plan || null;
        setCurrentPlanId(plan?.id_plan ?? null);

        const estado = (plan?.estado || "").toLowerCase();
        const isActive = estado.includes("activo") || estado.includes("trial");
        setHasActivePlan(Boolean(plan?.id_plan) && isActive);
      } catch (e) {
        console.warn("PlanesView init:", e?.response?.data || e.message);
      }
    })();
  }, []);

  /* ===== Seleccionar plan (Checkout) ===== */
  const seleccionarPlan = async (idPlan) => {
    if (!idPlan) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire("Sesión requerida", "Inicie sesión para continuar.", "info");
        return;
      }

      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;

      const res = await chatApi.post(
        "stripe_plan/crearSesionPago",
        { id_plan: idPlan, id_usuario },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }

      Swal.fire("Error", "No se recibió URL de Stripe.", "error");
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        "No se pudo procesar tu solicitud. Intenta nuevamente.";
      Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  const getPrecioMostrar = (plan) => Number(plan?.precio_plan || 0).toFixed(2);
  const getIntervalo = () => "mes";

  /* ===== Iconos ===== */
  const IconoCheck = () => (
    <svg
      className="w-4 h-4 shrink-0 mt-[2px]"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7.629 13.233l-3.2-3.2 1.414-1.414 1.786 1.786 5.657-5.657 1.414 1.414-7.071 7.071z" />
    </svg>
  );

  const IconoX = () => (
    <svg
      className="w-4 h-4 shrink-0 mt-[2px]"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        d="M6 6l8 8M14 6l-8 8"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );

  /* ===== Beneficios ===== */
  const buildFeatures = (plan) => {
    const nombre = (plan?.nombre_plan || "").toLowerCase();
    const esConexion =
      nombre.includes("conexión") || nombre.includes("conexion");
    const desactivaCitas = esConexion;

    return [
      { label: `${plan.n_conexiones} Conexiones`, enabled: true },
      { label: `${plan.max_subusuarios} subusuarios incluidos`, enabled: true },
      { label: "Código QR personalizado", enabled: true },
      { label: "Integración con Meta", enabled: true },
      { label: "Contactos ilimitados", enabled: true },
      { label: "Whatsapp coexistencia", enabled: true },
      { label: "Inteligencia artificial", enabled: true },
      { label: "Área de productos y servicios", enabled: true },
      { label: "Automatizador", enabled: true },
      { label: "IA de agendamiento de citas", enabled: !desactivaCitas },
      {
        label: "Calendario de programación de citas",
        enabled: !desactivaCitas,
      },
    ];
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6">
      <div className="w-full max-w-8xl">
        {/* HEADER */}
        <div className="relative mb-10 mt-10">
          {/* BOTÓN REGRESAR (solo si tiene plan activo) */}
          {hasActivePlan && (
            <div className="absolute left-0 top-0">
              <button
                onClick={() => navigate(-1)}
                className="group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-[#171931] shadow-sm transition"
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#171931] text-white group-hover:opacity-95 transition">
                  {/* Flecha profesional */}
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </span>
                Regresar
              </button>
            </div>
          )}

          <h2 className="text-4xl text-center font-extrabold text-[#2f2b45]">
            Elige tu plan ideal y potencia tu empresa
          </h2>
          <p className="mt-3 text-sm text-center text-[#5a547a]">
            Planes claros, beneficios reales y un proceso de activación
            sencillo.
          </p>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {planes.length === 0 && (
            <>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-3xl p-6 bg-[#f5f4fb] border border-[#c4bde4]/40 animate-pulse h-[520px]"
                />
              ))}
            </>
          )}

          {planes
            .filter((p) => Number(p.id_plan) !== 1) // ✅ ocultar Plan Free
            .map((plan) => {
              const isCurrent = currentPlanId === plan.id_plan;
              const isTrialPlan = Number(plan.id_plan) === TRIAL_PLAN_ID;

              const ribbon = (plan.nombre_plan || "")
                .toLowerCase()
                .includes("premium")
                ? "Popular"
                : (plan.nombre_plan || "").toLowerCase().includes("conexión") ||
                    (plan.nombre_plan || "").toLowerCase().includes("conexion")
                  ? "Recomendado"
                  : null;

              const esBasico =
                (plan.nombre_plan || "").toLowerCase().includes("básico") ||
                (plan.nombre_plan || "").toLowerCase().includes("basico");

              const features = buildFeatures(plan);

              if (Number(plan.id_plan) === 5) {
                return (
                  <CardPlanPersonalizado
                    key={plan.id_plan}
                    plan={plan}
                    currentPlanId={currentPlanId}
                  />
                );
              }

              return (
                <div
                  key={plan.id_plan}
                  className="relative group rounded-2xl p-[1px] transition-all duration-300 ease-out hover:-translate-y-1 h-full"
                >
                  <div className="relative overflow-visible rounded-[calc(1rem-1px)] bg-white/90 backdrop-blur border border-slate-200/60 shadow-md transition-shadow duration-300 h-full flex flex-col">
                    {/* Listones */}
                    {esBasico && <Liston texto="Más vendido" color="vendido" />}
                    {!esBasico && ribbon === "Recomendado" && (
                      <Liston texto="Recomendado" color="recomendado" />
                    )}
                    {!esBasico && ribbon === "Popular" && (
                      <Liston texto="Popular" color="popular" />
                    )}

                    <div className="px-6 pt-16 pb-6 md:px-7 md:pt-20 md:pb-7 flex flex-col h-full">
                      <div className="text-center min-h-[92px]">
                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#171931]">
                          {plan.nombre_plan}
                        </h3>
                        <p className="text-sm leading-relaxed text-slate-600 mt-1">
                          {plan.descripcion_plan}
                        </p>
                      </div>

                      <div className="mt-5 text-center min-h-[52px] flex items-end justify-center">
                        <div className="inline-flex items-end gap-1">
                          <span className="text-3xl md:text-[34px] font-extrabold tracking-tight text-[#171931]">
                            ${getPrecioMostrar(plan)}
                          </span>
                          <span className="text-sm text-slate-500 mb-1">
                            /{getIntervalo()}
                          </span>
                        </div>
                      </div>

                      {/* ✅ Mensaje SaaS: trial solo en Conexión */}
                      {isTrialPlan && (
                        <div className="mt-3 flex justify-center">
                          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-blue-600/10 text-blue-700 font-semibold text-sm border border-blue-600/20">
                            🎁 {TRIAL_DAYS} días gratis en este plan
                          </span>
                        </div>
                      )}

                      <p className="mt-2 text-xs text-center text-slate-500">
                        {isTrialPlan
                          ? `Se le cobrará automáticamente $${getPrecioMostrar(plan)}/mes cuando termine la prueba. Puede cancelar en cualquier momento.`
                          : `Facturación mensual. Puede cancelar en cualquier momento.`}
                      </p>

                      <div className="mt-3 flex justify-center">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 text-emerald-500 font-semibold text-sm shadow-[0_0_12px_rgba(16,185,129,0.25)] border border-emerald-400/30 backdrop-blur-md">
                          <svg
                            className="w-4 h-4 text-emerald-400"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path d="M7 8h10M7 12h6M5 20l2-4h10l2 4H5z" />
                          </svg>
                          {plan.n_conversaciones} conversaciones incluidas
                        </span>
                      </div>

                      <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-y-3 md:gap-x-3 text-sm flex-1 md:w-[100%] mx-auto">
                        {features.map((f, idx) => (
                          <li
                            key={idx}
                            className={
                              f.enabled ? "text-slate-700" : "text-slate-400"
                            }
                          >
                            <div className="grid grid-cols-[12px_1fr] items-start gap-2">
                              <span className="inline-flex h-4 w-4 items-center justify-center mt-[2px]">
                                {f.enabled ? <IconoCheck /> : <IconoX />}
                              </span>
                              <span className="leading-relaxed text-left">
                                {f.label}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-6">
                        <button
                          onClick={() => seleccionarPlan(plan.id_plan)}
                          disabled={loading || isCurrent}
                          className={`
                            w-full inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold
                            transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                            ${
                              isCurrent
                                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                : "bg-[#171931] text-white hover:-translate-y-[2px] hover:shadow-lg active:translate-y-0"
                            }
                          `}
                        >
                          {isCurrent
                            ? "Tienes este plan actualmente"
                            : isTrialPlan
                              ? `Iniciar prueba de ${TRIAL_DAYS} días`
                              : "Seleccionar"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default PlanesView;
