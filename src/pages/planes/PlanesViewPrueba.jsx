import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import { useNavigate } from "react-router-dom";
import CardPlanPersonalizado from "../../pages/planes/CardPlanPersonalizado";
import { loadStripe } from "@stripe/stripe-js";

import basico from "../../assets/plan_basico_v2.png";
import conexion from "../../assets/plan_conexion_v2.png";
import premium from "../../assets/plan_premium_medal.png";

const PLAN_IMAGES = {
  basico,
  conexion,
  premium,
};

const getPlanImage = (plan) => {
  const nombre = (plan?.nombre_plan || "").toLowerCase();

  if (nombre.includes("básico") || nombre.includes("basico"))
    return PLAN_IMAGES.basico;
  if (nombre.includes("conexión") || nombre.includes("conexion"))
    return PLAN_IMAGES.conexion;
  if (nombre.includes("premium")) return PLAN_IMAGES.premium;

  return null;
};

/* ===== Listón diagonal ===== */
const Liston = ({ texto, color = "recomendado" }) => {
  const colores = {
    popular: "bg-purple-600 text-white",
    recomendado: "bg-blue-600 text-white",
    vendido: "bg-yellow-400 text-black",
    promo: "bg-emerald-600 text-white",
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

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const PlanesViewPrueba = () => {
  const navigate = useNavigate();

  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [currentPlanEstado, setCurrentPlanEstado] = useState(null);

  const [hasPlan, setHasPlan] = useState(false); // tiene un plan asi sea vencido

  // ✅ bloquear múltiples clicks y mostrar estado por plan
  const [actionPlanId, setActionPlanId] = useState(null);
  const [actionText, setActionText] = useState("");

  // ✅ flags para UI (vienen del backend)
  const [trialEligible, setTrialEligible] = useState(true);
  const [promoPlan2Eligible, setPromoPlan2Eligible] = useState(false);

  // Trial solo en Conexión
  const TRIAL_PLAN_ID = 16;
  const TRIAL_DAYS = 15;

  // Promo $5 el primer mes (planes 2,3,4) - solo en Checkout (no en cambiar plan)
  const PROMO_FIRST_MONTH_PRICE = 5; // primer mes queda en $5 (por cupón en Stripe)
  const PROMO_PLANS = new Set([16, 17, 18]);

  // Solo mostrar estos planes en esta vista (producción)
  const PLANES_VISIBLES = new Set([16, 17, 18]);

  /* ===== Helpers ===== */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const refreshPlanActual = async () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const decoded = JSON.parse(atob(token.split(".")[1]));
    const id_usuario = decoded.id_usuario || decoded.id_users;

    const { data } = await chatApi.post(
      "stripe_plan/obtenerSuscripcionActiva",
      { id_usuario },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const plan = data?.plan || null;

    // ✅ NUEVO: tiene plan asignado aunque esté vencido
    const has_plan = Boolean(plan?.id_plan);
    setHasPlan(has_plan);

    // ✅ flags (compatibles: dentro de plan o dentro de user_flags)
    const trial_eligible =
      plan?.trial_eligible ?? data?.user_flags?.trial_eligible ?? true;

    const promo_plan2_used =
      plan?.promo_plan2_used ?? data?.user_flags?.promo_plan2_used ?? 1;

    setTrialEligible(Boolean(trial_eligible));
    setPromoPlan2Eligible(Number(promo_plan2_used) === 0);

    setCurrentPlanId(plan?.id_plan ?? null);
    setCurrentPlanEstado(plan?.estado ?? null);

    const estado = (plan?.estado || "").toLowerCase();
    const isActive = estado.includes("activo") || estado.includes("trial");
    setHasActivePlan(Boolean(plan?.id_plan) && isActive);

    return plan;
  };

  const waitForWebhookSync = async ({
    expectedPlanId,
    attempts = 6,
    intervalMs = 1500,
  } = {}) => {
    for (let i = 0; i < attempts; i++) {
      const plan = await refreshPlanActual();
      if (expectedPlanId && Number(plan?.id_plan) === Number(expectedPlanId))
        return true;
      await sleep(intervalMs);
    }
    return false;
  };

  const isPlanActualActivo = useMemo(() => {
    const est = (currentPlanEstado || "").toLowerCase();
    return est.includes("activo") || est.includes("trial");
  }, [currentPlanEstado]);

  /* ===== Cargar planes + plan actual ===== */
  useEffect(() => {
    (async () => {
      try {
        const resPlanes = await chatApi.get("planes/listarPlanes");
        setPlanes(resPlanes.data?.data || []);

        const token = localStorage.getItem("token");
        if (!token) return;

        await refreshPlanActual();
      } catch (e) {
        console.warn("PlanesViewPrueba init:", e?.response?.data || e.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Seleccionar plan (Checkout)/ Cambiar Plan ===== */
  const seleccionarPlan = async (idPlan) => {
    if (!idPlan) return;

    // ✅ Anti doble click global
    if (loading || actionPlanId) return;

    setLoading(true);
    setActionPlanId(idPlan);
    setActionText("Procesando...");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        await Swal.fire(
          "Sesión requerida",
          "Inicie sesión para continuar.",
          "info",
        );
        return;
      }

      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;

      // Si es el mismo plan y está activo/trial, no hacer nada
      if (Number(currentPlanId) === Number(idPlan) && isPlanActualActivo) {
        await Swal.fire("Listo", "Ya tiene este plan actualmente.", "info");
        return;
      }

      // Si TIENE plan activo => cambiar plan (upgrade/downgrade)
      if (hasActivePlan) {
        setActionText("Cambiando plan...");

        const confirm = await Swal.fire({
          title: "Confirmar cambio de plan",
          html: `
            <div style="text-align:left; line-height:1.45; font-size:14px;">
              <p style="margin:0 0 10px 0;">Su cambio de plan se aplicará automáticamente:</p>
              <ul style="margin:0; padding-left:18px;">
                <li style="margin:0 0 6px 0;">
                  <b>Si sube de plan:</b> se cobrará de inmediato para activar mayores beneficios.
                </li>
                <li style="margin:0;">
                  <b>Si baja de plan:</b> conserva beneficios hasta su próxima renovación y luego se aplicará el nuevo plan.
                </li>
              </ul>
              <p style="margin:12px 0 0 0; opacity:.8;">Puede cancelar esta acción si aún no desea aplicarla.</p>
            </div>
          `,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Sí, cambiar",
          cancelButtonText: "Cancelar",
          focusCancel: true,
        });

        if (!confirm.isConfirmed) return;

        const res = await chatApi.post(
          "stripe_plan/cambiarPlan",
          { id_usuario, id_plan_nuevo: idPlan },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        // Caso A: hosted_invoice_url (fallback)
        if (res.data?.hosted_invoice_url) {
          const go = await Swal.fire({
            title: "Pago requerido",
            html: `
              <div style="text-align:left; line-height:1.45; font-size:14px;">
                <p style="margin:0 0 10px 0;">
                  Para completar el <b>upgrade</b>, es necesario finalizar el pago en Stripe.
                </p>
                <p style="margin:0; opacity:.85;">
                  Se abrirá una página segura. Al finalizar, su plan se actualizará automáticamente.
                </p>
              </div>
            `,
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "Continuar al pago",
            cancelButtonText: "Cancelar",
          });

          if (go.isConfirmed)
            window.location.href = res.data.hosted_invoice_url;
          return;
        }

        // Caso B: requiere 3DS/SCA
        if (
          res.data?.actionRequired &&
          res.data?.payment_intent_client_secret
        ) {
          const stripe = await stripePromise;
          if (!stripe) {
            await Swal.fire(
              "Error",
              "Stripe.js no se pudo inicializar.",
              "error",
            );
            return;
          }

          await Swal.fire({
            title: "Verificación requerida",
            text: "Su banco requiere confirmación adicional para completar el upgrade.",
            icon: "info",
            confirmButtonText: "Continuar",
          });

          const result = await stripe.confirmCardPayment(
            res.data.payment_intent_client_secret,
          );

          if (result?.error) {
            await Swal.fire(
              "Pago no confirmado",
              result.error.message || "No se pudo confirmar el pago.",
              "error",
            );
            return;
          }

          await Swal.fire(
            "Confirmado",
            "Pago confirmado. Su plan se actualizará en segundos.",
            "success",
          );
          await waitForWebhookSync({ expectedPlanId: idPlan });
          return;
        }

        // Caso C: downgrade o upgrade sin challenge
        await Swal.fire(
          "Cambio solicitado",
          res.data?.message ||
            "El cambio fue solicitado. Se reflejará en breve.",
          "success",
        );

        await waitForWebhookSync({ expectedPlanId: idPlan });
        return;
      }

      // Si NO TIENE plan activo => Checkout normal
      setActionText("Redirigiendo...");

      const res = await chatApi.post(
        "stripe_plan/crearSesionPago",
        { id_plan: idPlan, id_usuario },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }

      await Swal.fire("Error", "No se recibió URL de Stripe.", "error");
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        "No se pudo procesar su solicitud. Intente nuevamente.";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setLoading(false);
      setActionPlanId(null);
      setActionText("");
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

    // su lógica anterior
    const desactivaCitas = esConexion;

    return [
      { label: `${plan.n_conexiones} conexiones activas`, enabled: true },
      { label: `${plan.max_subusuarios} subusuarios incluidos`, enabled: true },

      // ✅ Integraciones “vendibles” en todas las cards
      { label: "WhatsApp (Coexistencia) integrado", enabled: true },
      { label: "Facebook Messenger integrado", enabled: true },
      { label: "Instagram Inbox (DM) integrado", enabled: true },

      { label: "Código QR personalizado", enabled: true },
      { label: "Contactos ilimitados", enabled: true },
      { label: "Inteligencia Artificial", enabled: true },
      { label: "Área de productos y servicios", enabled: true },
      { label: "Automatizador de respuestas y flujos", enabled: true },

      { label: "IA de agendamiento de citas", enabled: !desactivaCitas },
      {
        label: "Calendario de programación de citas",
        enabled: !desactivaCitas,
      },
    ];
  };

  const visiblePlans = useMemo(() => {
    return (planes || []).filter((p) => PLANES_VISIBLES.has(Number(p.id_plan)));
  }, [planes]);

  const skeletonCount = visiblePlans.length > 0 ? visiblePlans.length : 3;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6">
      <div className="w-full max-w-8xl">
        {/* HEADER */}
        <div className="relative mb-10 mt-10">
          {hasPlan && (
            <div className="absolute left-0 top-0">
              <button
                onClick={() => navigate("/plan")}
                className="group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-transparent hover:bg-slate-100/70 text-[#171931] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#171931]/20"
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#171931] text-white group-hover:opacity-95 transition">
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
            Elija su plan ideal y potencie su empresa
          </h2>
          <p className="mt-3 text-sm text-center text-[#5a547a]">
            Beneficios claros, activación sencilla y control total de su canal
            de atención.
          </p>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {planes.length === 0 && (
            <>
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-3xl p-6 bg-[#f5f4fb] border border-[#c4bde4]/40 animate-pulse h-[520px]"
                />
              ))}
            </>
          )}

          {visiblePlans.map((plan) => {
            const isCurrent = Number(currentPlanId) === Number(plan.id_plan);
            const isCurrentVencido = isCurrent && !isPlanActualActivo;

            const planIdNum = Number(plan.id_plan);

            // Trial solo plan 2 y solo si es elegible (y solo para Checkout)
            const showTrial =
              planIdNum === TRIAL_PLAN_ID &&
              Boolean(trialEligible) &&
              !hasActivePlan;

            // Promo $5 OFF primer mes: planes 2/3/4, solo si el usuario aún no la ha usado (y solo Checkout)
            const promoEligible = Boolean(promoPlan2Eligible) && !hasActivePlan;
            const showPromo = PROMO_PLANS.has(planIdNum) && promoEligible;

            // Caso combinado: plan 2 con trial + descuento primer mes
            const showTrialAndPromo = showTrial && showPromo;

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

            const isAction = Number(actionPlanId) === Number(plan.id_plan);

            const isDisabled =
              loading ||
              (isCurrent && isPlanActualActivo) || // solo deshabilita si está realmente activo
              !!actionPlanId;

            if (Number(plan.id_plan) === 5) {
              return (
                <CardPlanPersonalizado
                  key={plan.id_plan}
                  plan={plan}
                  currentPlanId={currentPlanId}
                />
              );
            }

            const precioNormalNum = Number(plan?.precio_plan || 0);
            const precioNormal = precioNormalNum.toFixed(2);

            const firstMonthPrice = Number(PROMO_FIRST_MONTH_PRICE).toFixed(2); // "5.00"

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

                  {/* Listón Promo si aplica */}
                  {showPromo && (
                    <Liston
                      texto={`Primer mes $${PROMO_FIRST_MONTH_PRICE}`}
                      color="promo"
                    />
                  )}

                  <div className="px-6 pt-16 pb-6 md:px-7 md:pt-20 md:pb-7 flex flex-col h-full">
                    <div className="text-center min-h-[92px]">
                      <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#171931]">
                        {plan.nombre_plan}
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-600 mt-1 break-words">
                        {plan.descripcion_plan}
                      </p>
                    </div>

                    {/* ✅ Precio: si hay promo, tachar y mostrar $5 */}
                    <div className="mt-5 text-center min-h-[60px] flex items-end justify-center">
                      {!showPromo ? (
                        <div className="inline-flex items-end gap-1">
                          <span className="text-3xl md:text-[34px] font-extrabold tracking-tight text-[#171931]">
                            ${precioNormal}
                          </span>
                          <span className="text-sm text-slate-500 mb-1">
                            /{getIntervalo()}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <div className="inline-flex items-end gap-2">
                            <span className="text-sm md:text-base text-slate-500 line-through">
                              ${precioNormal}
                            </span>

                            <span className="text-3xl md:text-[36px] font-extrabold tracking-tight text-emerald-600">
                              ${firstMonthPrice}
                            </span>

                            <span className="text-sm text-slate-500 mb-1">
                              /{getIntervalo()}
                            </span>
                          </div>

                          <div className="text-[11px] md:text-xs text-emerald-700 bg-emerald-600/10 border border-emerald-600/20 rounded-xl px-3 py-1">
                            Primer mes a ${firstMonthPrice}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ✅ Badge: Trial / Promo / Ambos */}
                    {showTrialAndPromo ? (
                      <div className="mt-3 flex justify-center">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-indigo-600/10 text-indigo-700 font-semibold text-sm border border-indigo-600/20">
                          🎁 {TRIAL_DAYS} días gratis + primer mes a $
                          {firstMonthPrice}
                        </span>
                      </div>
                    ) : (
                      <>
                        {showTrial && (
                          <div className="mt-3 flex justify-center">
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-blue-600/10 text-blue-700 font-semibold text-sm border border-blue-600/20">
                              🎁 {TRIAL_DAYS} días gratis en este plan
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* ✅ Texto: FIX para que cuando hay Trial+Promo NO diga que cobra $29 al terminar trial */}
                    <div className="mt-2 text-xs text-center text-slate-500 break-words leading-relaxed px-1">
                      {showTrialAndPromo ? (
                        <span>
                          Al finalizar la prueba, el <b>primer mes</b> se
                          cobrará <b>${firstMonthPrice}</b>. Luego se cobrará{" "}
                          <b>
                            ${precioNormal}/{getIntervalo()}
                          </b>
                          . Puede cancelar en cualquier momento.
                        </span>
                      ) : showTrial ? (
                        <span>
                          Al finalizar la prueba, se cobrará automáticamente{" "}
                          <b>
                            ${precioNormal}/{getIntervalo()}
                          </b>
                          . Puede cancelar en cualquier momento.
                        </span>
                      ) : showPromo ? (
                        <span>
                          Promoción disponible:{" "}
                          <b>primer mes ${firstMonthPrice}</b>. A partir del
                          segundo mes se cobrará{" "}
                          <b>
                            ${precioNormal}/{getIntervalo()}
                          </b>
                          . Puede cancelar en cualquier momento.
                        </span>
                      ) : (
                        <span>
                          Facturación mensual. Puede cancelar en cualquier
                          momento.
                        </span>
                      )}
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
                            <span className="leading-relaxed text-left break-words">
                              {f.label}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6">
                      <button
                        onClick={() => seleccionarPlan(plan.id_plan)}
                        disabled={isDisabled}
                        className={`
                            w-full inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold
                            transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                            ${
                              isDisabled
                                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                : "bg-[#171931] text-white hover:-translate-y-[2px] hover:shadow-lg active:translate-y-0"
                            }
                          `}
                      >
                        {isCurrent && isPlanActualActivo ? (
                          "Tiene este plan actualmente"
                        ) : isCurrentVencido ? (
                          "Plan vencido — Renovar"
                        ) : isAction ? (
                          <span className="inline-flex items-center gap-2">
                            <svg
                              className="w-4 h-4 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                cx="12"
                                cy="12"
                                r="9"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                opacity="0.25"
                              />
                              <path
                                d="M21 12a9 9 0 0 0-9-9"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                            </svg>
                            {actionText || "Procesando..."}
                          </span>
                        ) : hasActivePlan ? (
                          "Cambiar a este plan"
                        ) : showTrial ? (
                          `Iniciar prueba de ${TRIAL_DAYS} días`
                        ) : (
                          "Seleccionar"
                        )}
                      </button>

                      {/* ✅ Mensaje adicional (solo visual) si hay promo + trial */}
                      {showTrialAndPromo && !hasActivePlan && (
                        <div className="mt-3 text-[11px] text-center text-slate-500 leading-relaxed break-words">
                          Oferta disponible solo para cuentas nuevas: incluye{" "}
                          <b>{TRIAL_DAYS} días gratis</b> y{" "}
                          <b>primer mes a ${firstMonthPrice}</b>.
                        </div>
                      )}
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

export default PlanesViewPrueba;
