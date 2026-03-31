import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import ModalTrialActivated from "./modales/ModalTrialActivated";
import ModalCodigoPromo from "./modales/ModalCodigoPromo";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const PLANES_VISIBLES = new Set([6, 2, 3, 4]);
const HIDDEN_PLANS = new Set([22]);
const SORT_ORDER = { 6: 1, 2: 2, 22: 2.5, 3: 3, 4: 4 };
const TRIAL_DAYS_PLAN_ID = 2;
const TRIAL_DAYS = 7;
const TRIAL_DAYS_COMUNIDAD = 5; // ✅ NUEVO
const TRIAL_USAGE_PLAN_ID = 6;
const TRIAL_USAGE_LIMIT = 10;
const PROMO_FIRST_MONTH = 5;
const PROMO_PLANS = new Set([6, 2, 3, 4, 22]); // ✅ añadido 22
const PLAN_COMUNIDAD_ID = 22; // ✅ NUEVO

const detectPlanType = (plan) => {
  const nombre = (plan?.nombre_plan || "").toLowerCase();
  if (nombre.includes("comunidad")) return "comunidad";
  const id = Number(plan?.id_plan || 0);
  if (id === 22) return "comunidad";
  const tools = (plan?.tools_access || "").toLowerCase().trim();
  if (tools === "insta_landing") return "insta_landing";
  if (tools === "imporchat") return "imporchat";
  if (tools === "both")
    return Number(plan?.precio_plan || 0) >= 90 ? "avanzado" : "pro";
  if (nombre.includes("insta landing") || nombre.includes("instalanding"))
    return "insta_landing";
  if (
    nombre.includes("imporchat") ||
    nombre.includes("conexión") ||
    nombre.includes("conexion")
  )
    return "imporchat";
  if (nombre.includes("avanzado") || nombre.includes("premium"))
    return "avanzado";
  if (
    nombre.includes("pro") ||
    nombre.includes("básico") ||
    nombre.includes("basico")
  )
    return "pro";
  if (id === 6 || id === 20) return "insta_landing";
  if (id === 2 || id === 16) return "imporchat";
  if (id === 4 || id === 18) return "avanzado";
  if (id === 3 || id === 17) return "pro";
  return "pro";
};

const PLAN_THEMES = {
  insta_landing: {
    accent: "#00BFFF",
    accentLight: "rgba(0,191,255,0.06)",
    accentBorder: "rgba(0,191,255,0.18)",
    gradient: "linear-gradient(135deg, #00BFFF 0%, #0090cc 100%)",
    badge: null,
    tagline: "HERRAMIENTA INDIVIDUAL",
  },
  imporchat: {
    accent: "#10B981",
    accentLight: "rgba(16,185,129,0.06)",
    accentBorder: "rgba(16,185,129,0.18)",
    gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    badge: null,
    tagline: "HERRAMIENTA INDIVIDUAL",
  },
  comunidad: {
    accent: "#F59E0B",
    accentLight: "rgba(245,158,11,0.06)",
    accentBorder: "rgba(245,158,11,0.18)",
    gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
    badge: "EXCLUSIVO ESTUDIANTES",
    tagline: "ECOSISTEMA COMPLETO — COMUNIDAD",
  },
  pro: {
    accent: "#6366F1",
    accentLight: "rgba(99,102,241,0.06)",
    accentBorder: "rgba(99,102,241,0.18)",
    gradient: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
    badge: "MÁS POPULAR",
    tagline: "LAS 2 HERRAMIENTAS CONECTADAS",
  },
  avanzado: {
    accent: "#F59E0B",
    accentLight: "rgba(245,158,11,0.06)",
    accentBorder: "rgba(245,158,11,0.18)",
    gradient: "linear-gradient(135deg, #0B1426 0%, #1e293b 100%)",
    badge: "MÁXIMA POTENCIA",
    tagline: "ECOSISTEMA COMPLETO + AGENCIA",
  },
};

const buildFeatures = (plan) => {
  const tipo = detectPlanType(plan);

  if (tipo === "comunidad") {
    return [
      {
        label: `${plan.max_banners_mes || 200} banners/mes`,
        enabled: true,
        section: "il",
      },
      {
        label: `${plan.max_angulos_ia || 100} ángulos AI`,
        enabled: true,
        section: "il",
      },
      {
        label: `${plan.max_secciones_landing || 5} secciones landing`,
        enabled: true,
        section: "il",
      },
      {
        label: `${plan.max_estilos_visuales || 3} estilos visuales`,
        enabled: true,
        section: "il",
      },
      {
        label: `Dropi (${plan.max_productos_dropi > 0 ? plan.max_productos_dropi : 20} productos)`,
        enabled: true,
        section: "il",
      },
      // ✅ NUEVO: Conexión Shopify en IL
      {
        label: "Conexión con Shopify",
        enabled: true,
        section: "il",
      },
      {
        label: `${plan.max_agentes_whatsapp || 1} agente WhatsApp AI`,
        enabled: true,
        section: "ic",
      },
      { label: "Conversaciones ILIMITADAS", enabled: true, section: "ic" },
      { label: "Respuestas auto 24/7", enabled: true, section: "ic" },
      { label: "Dropiboard — métricas Dropi", enabled: true, section: "db" },
      { label: "Utilidad real por orden", enabled: true, section: "db" },
      { label: "Dashboard básico", enabled: true, section: "extra" },
      { label: "Precio exclusivo comunidad", enabled: true, section: "extra" },
    ];
  }

  if (tipo === "insta_landing") {
    return [
      {
        label: `${plan.max_banners_mes || plan.max_imagenes_ia || 120} banners/mes`,
        enabled: true,
      },
      {
        label: `${plan.max_angulos_ia || 30} ángulos de venta AI`,
        enabled: true,
      },
      {
        label: `${plan.max_secciones_landing || 5} secciones landing`,
        enabled: true,
      },
      {
        label: `${plan.max_estilos_visuales || 3} estilos visuales`,
        enabled: true,
      },
      {
        label: `Dropi (${plan.max_productos_dropi > 0 ? plan.max_productos_dropi : 20} productos)`,
        enabled: true,
      },
      // ✅ NUEVO: Conexión Shopify
      { label: "Conexión con Shopify", enabled: true },
      { label: "+280 templates", enabled: true },
      { label: "Editor textos AI", enabled: true },
      { label: "Sin ImporChat", enabled: false },
      { label: "Sin Dropiboard", enabled: false },
    ];
  }

  if (tipo === "imporchat") {
    return [
      {
        label: `${plan.max_agentes_whatsapp || 1} agente WhatsApp AI`,
        enabled: true,
      },
      { label: "Conversaciones ILIMITADAS", enabled: true },
      { label: "Respuestas auto 24/7", enabled: true },
      { label: "Manejo objeciones AI", enabled: true },
      { label: "Seguimiento automático", enabled: true },
      { label: "1 número WhatsApp", enabled: true },
      { label: "Dashboard básico", enabled: true },
      { label: "Sin Insta Landing", enabled: false },
      { label: "Sin Dropiboard", enabled: false },
    ];
  }

  if (tipo === "pro") {
    return [
      {
        label: `${plan.max_banners_mes || 300} banners/mes`,
        enabled: true,
        section: "il",
      },
      {
        label: `${plan.max_angulos_ia || 75} ángulos AI`,
        enabled: true,
        section: "il",
      },
      {
        label: `${plan.max_secciones_landing || 10} secciones completas`,
        enabled: true,
        section: "il",
      },
      {
        label: `${plan.max_estilos_visuales || 5} estilos visuales`,
        enabled: true,
        section: "il",
      },
      { label: "Dropi ILIMITADO + sync", enabled: true, section: "il" },
      // ✅ NUEVO: Conexión Shopify en Pro
      { label: "Conexión con Shopify", enabled: true, section: "il" },
      { label: "A/B Testing visual", enabled: true, section: "il" },
      {
        label: `${plan.max_agentes_whatsapp || 1} agente WhatsApp AI`,
        enabled: true,
        section: "ic",
      },
      { label: "Conversaciones ILIMITADAS", enabled: true, section: "ic" },
      { label: "Dropiboard — métricas Dropi", enabled: true, section: "db" },
      { label: "Utilidad real por orden", enabled: true, section: "db" },
      {
        label: "Landing → WhatsApp auto-link",
        enabled: true,
        section: "extra",
      },
      { label: "Analytics unificado", enabled: true, section: "extra" },
    ];
  }

  // avanzado
  return [
    {
      label: `${plan.max_banners_mes || 500} banners/mes`,
      enabled: true,
      section: "il",
    },
    {
      label: `${plan.max_angulos_ia || 125} ángulos AI`,
      enabled: true,
      section: "il",
    },
    {
      label: `${plan.max_secciones_landing || 10} secciones + custom`,
      enabled: true,
      section: "il",
    },
    {
      label: `${plan.max_estilos_visuales || 5} estilos + personalizados`,
      enabled: true,
      section: "il",
    },
    { label: "Multi-tienda Dropi + API", enabled: true, section: "il" },
    // ✅ NUEVO: Conexión Shopify en Avanzado
    { label: "Conexión con Shopify", enabled: true, section: "il" },
    {
      label: `Bulk gen (${plan.bulk_gen_productos || 30} productos)`,
      enabled: true,
      section: "il",
    },
    {
      label: `${plan.max_agentes_whatsapp || 3} agentes WhatsApp AI`,
      enabled: true,
      section: "ic",
    },
    { label: "Conversaciones ILIMITADAS", enabled: true, section: "ic" },
    { label: "Multi-número WhatsApp", enabled: true, section: "ic" },
    { label: "Bot entrenado con catálogo", enabled: true, section: "ic" },
    { label: "Dropiboard — métricas Dropi", enabled: true, section: "db" },
    { label: "Utilidad real + profit", enabled: true, section: "db" },
    { label: "Analytics + heatmaps", enabled: true, section: "extra" },
    {
      label: `Sub-cuentas (${plan.max_subcuentas || 5})`,
      enabled: true,
      section: "extra",
    },
    { label: "Soporte VIP + onboarding", enabled: true, section: "extra" },
  ];
};

const IconCheck = ({ color = "#10B981" }) => (
  <svg className="w-[15px] h-[15px] shrink-0" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="10" fill={color} opacity="0.12" />
    <path
      d="M6.5 10.5l2.5 2.5 5-5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
const IconX = () => (
  <svg className="w-[15px] h-[15px] shrink-0" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="10" fill="#e2e8f0" opacity="0.5" />
    <path
      d="M7.5 7.5l5 5M12.5 7.5l-5 5"
      stroke="#94a3b8"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);
const IconSpinner = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
);
const PlanBadge = ({ text, gradient }) => (
  <div
    className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 px-5 py-1.5 rounded-full text-[10px] font-extrabold uppercase text-white shadow-lg whitespace-nowrap"
    style={{ background: gradient, letterSpacing: "0.08em" }}
  >
    {text}
  </div>
);
const SectionLabel = ({ label, color }) => (
  <div className="flex items-center gap-1.5 mt-3 mb-1.5">
    <div className="h-[1px] flex-1" style={{ background: `${color}22` }} />
    <span
      className="text-[9px] font-bold uppercase tracking-wider"
      style={{ color }}
    >
      {label}
    </span>
    <div className="h-[1px] flex-1" style={{ background: `${color}22` }} />
  </div>
);

const PlanesView = () => {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [currentPlanEstado, setCurrentPlanEstado] = useState(null);
  const [hasPlan, setHasPlan] = useState(false);
  const [actionPlanId, setActionPlanId] = useState(null);
  const [actionText, setActionText] = useState("");
  const [trialEligible, setTrialEligible] = useState(true);
  const [promoPlan2Eligible, setPromoPlan2Eligible] = useState(false);
  const [ilTrialUsed, setIlTrialUsed] = useState(false);
  const [isTrialUsageActive, setIsTrialUsageActive] = useState(false);
  const [isPromoUsageActive, setIsPromoUsageActive] = useState(false);
  const [showTrialActivated, setShowTrialActivated] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [unlockedPlans, setUnlockedPlans] = useState([]);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const getIdUsuario = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const decoded = JSON.parse(atob(token.split(".")[1]));
    return decoded.id_usuario || decoded.id_users;
  };

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
    const flags = data?.user_flags || {};
    setHasPlan(Boolean(plan?.id_plan));
    setTrialEligible(
      Boolean(plan?.trial_eligible ?? flags?.trial_eligible ?? true),
    );
    setPromoPlan2Eligible(
      Number(plan?.promo_plan2_used ?? flags?.promo_plan2_used ?? 1) === 0,
    );
    setIlTrialUsed(Boolean(flags?.il_trial_used));
    setCurrentPlanId(plan?.id_plan ?? null);
    setCurrentPlanEstado(plan?.estado ?? null);
    const estado = (plan?.estado || "").toLowerCase();
    const isTU = estado === "trial_usage";
    const isPU = estado === "promo_usage";
    setIsTrialUsageActive(isTU);
    setIsPromoUsageActive(isPU);
    const isActive =
      estado.includes("activo") || estado.includes("trial") || isTU || isPU;
    setHasActivePlan(Boolean(plan?.id_plan) && isActive);
    setUnlockedPlans(flags?.unlocked_plans || []);
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
    return (
      est.includes("activo") ||
      est.includes("trial") ||
      est === "trial_usage" ||
      est === "promo_usage"
    );
  }, [currentPlanEstado]);

  useEffect(() => {
    (async () => {
      try {
        const resPlanes = await chatApi.get("planes/listarPlanes");
        setPlanes(resPlanes.data?.data || []);
        const token = localStorage.getItem("token");
        if (!token) return;
        await refreshPlanActual();
      } catch (e) {
        console.warn("PlanesView init:", e?.response?.data || e.message);
      }
    })();
  }, []);

  const activarTrialIL = async () => {
    if (loading || actionPlanId) return;
    setLoading(true);
    setActionPlanId(TRIAL_USAGE_PLAN_ID);
    setActionText("Activando prueba...");
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
      const { data } = await chatApi.post(
        "stripe_plan/activarTrialUsage",
        { id_usuario },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (data?.success) {
        await refreshPlanActual();
        setShowTrialActivated(true);
      } else {
        await Swal.fire("Info", data?.message || "No se pudo activar.", "info");
      }
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || "Error al activar prueba.",
      });
    } finally {
      setLoading(false);
      setActionPlanId(null);
      setActionText("");
    }
  };

  const seleccionarPlan = async (idPlan) => {
    if (!idPlan || loading || actionPlanId) return;
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

      if (isTrialUsageActive || isPromoUsageActive) {
        setActionText("Redirigiendo al pago...");
        const res = await chatApi.post(
          "stripe_plan/crearSesionPago",
          { id_plan: idPlan, id_usuario },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.data?.url) {
          window.location.href = res.data.url;
          return;
        }
        await Swal.fire("Error", "No se recibió URL de pago.", "error");
        return;
      }

      if (Number(currentPlanId) === Number(idPlan) && isPlanActualActivo) {
        await Swal.fire("Listo", "Ya tiene este plan actualmente.", "info");
        return;
      }

      if (hasActivePlan) {
        setActionText("Cambiando plan...");
        const confirm = await Swal.fire({
          title: "Confirmar cambio de plan",
          html: `<div style="text-align:left;line-height:1.5;font-size:14px;"><p style="margin:0 0 10px"><b>Upgrade:</b> se cobra de inmediato.</p><p style="margin:0"><b>Downgrade:</b> se aplica en la próxima renovación.</p></div>`,
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
        if (res.data?.redirect_to_checkout) {
          const res2 = await chatApi.post(
            "stripe_plan/crearSesionPago",
            { id_plan: idPlan, id_usuario },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (res2.data?.url) {
            window.location.href = res2.data.url;
            return;
          }
        }
        if (res.data?.hosted_invoice_url) {
          const go = await Swal.fire({
            title: "Pago requerido",
            html: "<p>Complete el pago en Stripe para finalizar.</p>",
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "Ir al pago",
            cancelButtonText: "Cancelar",
          });
          if (go.isConfirmed)
            window.location.href = res.data.hosted_invoice_url;
          return;
        }
        if (
          res.data?.actionRequired &&
          res.data?.payment_intent_client_secret
        ) {
          const stripe = await stripePromise;
          if (!stripe) {
            await Swal.fire("Error", "Stripe.js no disponible.", "error");
            return;
          }
          await Swal.fire({
            title: "Verificación bancaria",
            text: "Su banco requiere confirmación.",
            icon: "info",
            confirmButtonText: "Continuar",
          });
          const result = await stripe.confirmCardPayment(
            res.data.payment_intent_client_secret,
          );
          if (result?.error) {
            await Swal.fire(
              "Pago no confirmado",
              result.error.message,
              "error",
            );
            return;
          }
          await Swal.fire("Confirmado", "Plan actualizado.", "success");
          await waitForWebhookSync({ expectedPlanId: idPlan });
          return;
        }
        await Swal.fire(
          "Listo",
          res.data?.message || "Cambio aplicado.",
          "success",
        );
        await waitForWebhookSync({ expectedPlanId: idPlan });
        return;
      }

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
      await Swal.fire("Error", "No se recibió URL de pago.", "error");
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || "No se pudo procesar.",
      });
    } finally {
      setLoading(false);
      setActionPlanId(null);
      setActionText("");
    }
  };

  const visiblePlans = useMemo(() => {
    const baseVisible = new Set(PLANES_VISIBLES);
    unlockedPlans.forEach((id) => baseVisible.add(Number(id)));
    if (currentPlanId && HIDDEN_PLANS.has(Number(currentPlanId)))
      baseVisible.add(Number(currentPlanId));
    return (planes || [])
      .filter((p) => baseVisible.has(Number(p.id_plan)))
      .sort(
        (a, b) =>
          (SORT_ORDER[Number(a.id_plan)] ?? 99) -
          (SORT_ORDER[Number(b.id_plan)] ?? 99),
      );
  }, [planes, unlockedPlans, currentPlanId]);

  return (
    <div className="min-h-screen bg-white">
      {/* ── HEADER ── */}
      <div className="relative px-4 sm:px-6 pt-3 pb-6">
        {hasPlan && (
          <div className="absolute left-4 sm:left-6 top-3">
            <button
              onClick={() => navigate("/plan")}
              className="group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-transparent hover:bg-slate-100/70 text-[#0B1426] transition"
            >
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#0B1426] text-white">
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
              Mi plan
            </button>
          </div>
        )}

        <div className="absolute right-4 sm:right-6 top-3">
          <button
            onClick={() => setShowPromoModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-amber-600 hover:bg-amber-50/60 transition-all duration-200"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            Código promo
          </button>
        </div>

        <div className="text-center pb-6 px-4">
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#0B1426] tracking-[-0.03em] leading-[1.15] mx-auto">
            Elija el plan ideal para{" "}
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              escalar sus ventas
            </span>{" "}
            con inteligencia artificial
          </h2>
        </div>

        {isTrialUsageActive && (
          <div
            className="mt-4 mx-auto max-w-lg flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,191,255,0.06), rgba(0,144,204,0.04))",
              border: "1px solid rgba(0,191,255,0.15)",
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700">
                Estás en la prueba gratuita de Insta Landing
              </p>
              <p className="text-[10px] text-slate-500">
                Suscríbete para desbloquear todas las imágenes.
              </p>
            </div>
            <span
              className="shrink-0 text-[10px] font-bold px-3 py-1 rounded-full"
              style={{ color: "#0090cc", background: "rgba(0,191,255,0.1)" }}
            >
              Prueba activa
            </span>
          </div>
        )}

        {isPromoUsageActive && (
          <div
            className="mt-4 mx-auto max-w-lg flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(249,115,22,0.04))",
              border: "1px solid rgba(245,158,11,0.15)",
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700">
                Estás usando un código promocional
              </p>
              <p className="text-[10px] text-slate-500">
                Suscríbete para acceso ilimitado cuando se agoten tus recursos.
              </p>
            </div>
            <span
              className="shrink-0 text-[10px] font-bold px-3 py-1 rounded-full"
              style={{ color: "#D97706", background: "rgba(245,158,11,0.1)" }}
            >
              Promo activa
            </span>
          </div>
        )}
      </div>

      {/* ── GRID ── */}
      <div className="px-3 sm:px-4 pb-16">
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch ${visiblePlans.length <= 4 ? "xl:grid-cols-4" : "xl:grid-cols-5"}`}
        >
          {planes.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-slate-50 border border-slate-200/60 animate-pulse h-[580px]"
              />
            ))}

          {visiblePlans.map((plan) => {
            const planId = Number(plan.id_plan);
            const tipo = detectPlanType(plan);
            const theme = PLAN_THEMES[tipo];
            const isBoth =
              tipo === "pro" || tipo === "avanzado" || tipo === "comunidad";
            const isCurrent = Number(currentPlanId) === planId;
            const isCurrentVencido = isCurrent && !isPlanActualActivo;
            const isAction = Number(actionPlanId) === planId;
            const isCurrentTrialUsage = isCurrent && isTrialUsageActive;
            const isCurrentPromoUsage = isCurrent && isPromoUsageActive;
            const isCurrentFreeUsage =
              isCurrentTrialUsage || isCurrentPromoUsage;
            const canTrialIL =
              planId === TRIAL_USAGE_PLAN_ID && !ilTrialUsed && !hasActivePlan;
            const canTrialDays =
              planId === TRIAL_DAYS_PLAN_ID && trialEligible && !hasActivePlan;

            // ✅ NUEVO: Trial 5 días para Plan Comunidad
            const isComunidad = planId === PLAN_COMUNIDAD_ID;
            const canTrialComunidad = isComunidad && !hasActivePlan;

            const promoEligible =
              promoPlan2Eligible &&
              (!hasActivePlan || isTrialUsageActive || isPromoUsageActive);
            const showPromo = PROMO_PLANS.has(planId) && promoEligible;
            const precioNormal = Number(plan?.precio_plan || 0).toFixed(2);
            const precioEntero = Number(plan?.precio_plan || 0).toFixed(0);
            const features = buildFeatures(plan);
            const isDisabled =
              loading ||
              (isCurrent && isPlanActualActivo && !isCurrentFreeUsage) ||
              !!actionPlanId;
            const ilLabel =
              tipo === "avanzado" ? "INSTA LANDING MAX" : "INSTA LANDING";
            const icLabel = tipo === "avanzado" ? "IMPORCHAT PRO" : "IMPORCHAT";

            const getCTAText = () => {
              if (isCurrentFreeUsage)
                return showPromo
                  ? `Suscribirse — $${PROMO_FIRST_MONTH} primer mes`
                  : "Suscribirse ahora";
              if (isCurrent && isPlanActualActivo) return "Tu plan actual";
              if (isCurrentVencido) return "Renovar plan";
              if (isAction)
                return (
                  <span className="inline-flex items-center gap-2">
                    <IconSpinner />
                    {actionText}
                  </span>
                );
              if (isTrialUsageActive || isPromoUsageActive)
                return "Cambiar a este plan";
              if (hasActivePlan) return "Cambiar a este plan";
              if (canTrialIL)
                return `Probar gratis (${TRIAL_USAGE_LIMIT} imágenes)`;
              // ✅ NUEVO: CTA para Comunidad con trial 5 días
              if (canTrialComunidad)
                return `${TRIAL_DAYS_COMUNIDAD} días gratis`;
              if (canTrialDays) return `${TRIAL_DAYS} días gratis`;
              return "Comenzar ahora";
            };

            const handleClick = () => {
              if (isCurrentFreeUsage) seleccionarPlan(planId);
              else if (canTrialIL && !hasActivePlan) activarTrialIL();
              // ✅ Comunidad va directo a checkout (Stripe maneja el trial)
              else seleccionarPlan(planId);
            };

            return (
              <div key={plan.id_plan} className="relative group">
                {theme.badge && (
                  <PlanBadge text={theme.badge} gradient={theme.gradient} />
                )}
                <div
                  className={`relative rounded-2xl bg-white overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${theme.badge ? "shadow-md" : "shadow-sm"}`}
                  style={{
                    border: theme.badge
                      ? `2px solid ${theme.accent}`
                      : "1px solid #e2e8f0",
                  }}
                >
                  <div
                    className="h-1 w-full"
                    style={{ background: theme.gradient }}
                  />
                  <div className="p-5 flex flex-col h-full">
                    <div className="text-center mb-4">
                      <span
                        className="inline-block text-[9px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded"
                        style={{
                          color: theme.accent,
                          background: theme.accentLight,
                        }}
                      >
                        {theme.tagline}
                      </span>
                    </div>
                    <div className="text-center mb-1">
                      <h3 className="text-xl font-extrabold text-[#0B1426] tracking-tight">
                        {plan.nombre_plan}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {plan.descripcion_plan}
                      </p>
                    </div>
                    <div className="text-center mt-4 mb-2">
                      {!showPromo ? (
                        <div className="inline-flex items-baseline gap-0.5">
                          <span className="text-sm text-slate-400">$</span>
                          <span className="text-[42px] font-extrabold text-[#0B1426] leading-none tracking-tight">
                            {precioEntero}
                          </span>
                          <span className="text-sm text-slate-400 ml-0.5">
                            /mes
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="inline-flex items-baseline gap-1">
                            <span className="text-sm text-slate-400 line-through">
                              ${precioNormal}
                            </span>
                            <span
                              className="text-sm font-medium"
                              style={{ color: theme.accent }}
                            >
                              $
                            </span>
                            <span
                              className="text-[42px] font-extrabold leading-none tracking-tight"
                              style={{ color: theme.accent }}
                            >
                              {PROMO_FIRST_MONTH}
                            </span>
                            <span className="text-sm text-slate-400 ml-0.5">
                              /mes
                            </span>
                          </div>
                          <span
                            className="mt-1.5 text-[10px] font-semibold px-3 py-0.5 rounded-full"
                            style={{
                              color: theme.accent,
                              background: theme.accentLight,
                              border: `1px solid ${theme.accentBorder}`,
                            }}
                          >
                            Promo: $5 el primer mes
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-h-[48px] flex flex-col items-center justify-center gap-1 mb-3">
                      {canTrialIL && !isTrialUsageActive && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold"
                          style={{
                            color: "#0284c7",
                            background: "rgba(2,132,199,0.06)",
                            border: "1px solid rgba(2,132,199,0.12)",
                          }}
                        >
                          {TRIAL_USAGE_LIMIT} imágenes gratis
                        </span>
                      )}
                      {isCurrentTrialUsage && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold"
                          style={{
                            color: "#0090cc",
                            background: "rgba(0,191,255,0.08)",
                            border: "1px solid rgba(0,191,255,0.15)",
                          }}
                        >
                          Prueba activa — suscríbete para continuar
                        </span>
                      )}
                      {isCurrentPromoUsage && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold"
                          style={{
                            color: "#D97706",
                            background: "rgba(245,158,11,0.08)",
                            border: "1px solid rgba(245,158,11,0.15)",
                          }}
                        >
                          Promo activa — suscríbete para acceso completo
                        </span>
                      )}
                      {/* ✅ NUEVO: Badge trial 5 días para Comunidad */}
                      {canTrialComunidad && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold"
                          style={{
                            color: "#D97706",
                            background: "rgba(245,158,11,0.06)",
                            border: "1px solid rgba(245,158,11,0.12)",
                          }}
                        >
                          {TRIAL_DAYS_COMUNIDAD} días gratis
                        </span>
                      )}
                      {canTrialDays && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold"
                          style={{
                            color: "#059669",
                            background: "rgba(5,150,105,0.06)",
                            border: "1px solid rgba(5,150,105,0.12)",
                          }}
                        >
                          {TRIAL_DAYS} días gratis
                        </span>
                      )}
                      <span className="text-[9px] text-slate-400 text-center leading-relaxed">
                        {isCurrentFreeUsage && showPromo ? (
                          <>
                            Paga solo <b>$5</b> tu primer mes. Luego $
                            {precioNormal}/mes.
                          </>
                        ) : isCurrentFreeUsage ? (
                          <>Suscríbete por ${precioNormal}/mes</>
                        ) : canTrialIL && showPromo ? (
                          <>Gratis → $5 primer mes → ${precioNormal}/mes</>
                        ) : canTrialComunidad && showPromo ? (
                          /* ✅ NUEVO: Texto para Comunidad */
                          <>
                            {TRIAL_DAYS_COMUNIDAD} días gratis → $5 primer mes →
                            ${precioNormal}/mes
                          </>
                        ) : canTrialDays && showPromo ? (
                          <>
                            {TRIAL_DAYS} días gratis → $5 primer mes → $
                            {precioNormal}/mes
                          </>
                        ) : canTrialComunidad ? (
                          /* ✅ Sin promo pero con trial comunidad */
                          <>
                            {TRIAL_DAYS_COMUNIDAD} días gratis. Luego $
                            {precioNormal}/mes.
                          </>
                        ) : canTrialDays ? (
                          <>Luego ${precioNormal}/mes. Cancele cuando quiera.</>
                        ) : showPromo ? (
                          <>Primer mes $5. Luego ${precioNormal}/mes.</>
                        ) : (
                          <>Facturación mensual. Cancele cuando quiera.</>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={handleClick}
                      disabled={isDisabled}
                      className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 mb-5 inline-flex items-center justify-center focus:outline-none
                        ${
                          isCurrent && isPlanActualActivo && !isCurrentFreeUsage
                            ? "bg-slate-50 text-slate-400 cursor-default border border-slate-200"
                            : isDisabled
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "text-white hover:shadow-lg hover:-translate-y-[1px] active:translate-y-0"
                        }`}
                      style={
                        !(
                          isCurrent &&
                          isPlanActualActivo &&
                          !isCurrentFreeUsage
                        ) && !isDisabled
                          ? { background: theme.gradient }
                          : {}
                      }
                    >
                      {getCTAText()}
                    </button>
                    <div className="flex-1">
                      {features.map((f, idx) => {
                        const prevSection =
                          idx > 0 ? features[idx - 1]?.section : null;
                        const showHeader =
                          isBoth && f.section && f.section !== prevSection;
                        return (
                          <React.Fragment key={idx}>
                            {showHeader && f.section === "il" && (
                              <SectionLabel label={ilLabel} color="#00BFFF" />
                            )}
                            {showHeader && f.section === "ic" && (
                              <SectionLabel label={icLabel} color="#10B981" />
                            )}
                            {showHeader && f.section === "db" && (
                              <SectionLabel
                                label="DROPIBOARD"
                                color="#EAB308"
                              />
                            )}
                            {showHeader && f.section === "extra" && (
                              <SectionLabel
                                label="Extras"
                                color={theme.accent}
                              />
                            )}
                            <div
                              className={`flex items-start gap-2 py-[3px] text-[11.5px] leading-relaxed ${f.enabled ? "text-slate-700" : "text-slate-300"}`}
                            >
                              <span className="mt-[1px]">
                                {f.enabled ? (
                                  <IconCheck color={theme.accent} />
                                ) : (
                                  <IconX />
                                )}
                              </span>
                              <span>{f.label}</span>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ModalTrialActivated
        open={showTrialActivated}
        limit={TRIAL_USAGE_LIMIT}
        promoPrice={PROMO_FIRST_MONTH}
        onStart={() => {
          setShowTrialActivated(false);
          navigate("/selector");
        }}
      />

      <ModalCodigoPromo
        open={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        onSuccess={async ({ imagenes, angulos, unlocked_plan_id }) => {
          await refreshPlanActual();
          if (!unlocked_plan_id) navigate("/selector");
        }}
        idUsuario={getIdUsuario()}
        chatApi={chatApi}
      />
    </div>
  );
};

export default PlanesView;
