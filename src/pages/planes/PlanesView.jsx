import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import ModalTrialActivated from "./modales/ModalTrialActivated";
import ModalCodigoPromo from "./modales/ModalCodigoPromo";
import ModalSeleccionConexiones from "./modales/ModalSeleccionConexiones";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ⚠️ Estos valores YA NO se deciden aquí.
//
// Antes este archivo tenía quemados los IDs de plan, qué planes se muestran, en
// qué orden y con qué trial. Cambiar el catálogo obligaba a tocar código y
// redesplegar el SPA, y la elegibilidad quedaba del lado del cliente (editable
// por cualquiera desde el navegador).
//
// Ahora `GET planes/listarPlanes` devuelve, por plan, `visible` / `tipo_ui` /
// `trial_dias` / `promo_aplicable` / `sort_order`, más un bloque `config` con
// las constantes. Lo de abajo es solo el respaldo por si el backend todavía no
// tiene el cambio desplegado: son los valores que regían hasta hoy.
const PLAN_CONFIG_FALLBACK = {
  plan_imporchat_id: 2,
  plan_insta_landing_id: 6,
  plan_comunidad_id: 22,
  plan_method_id: 21,
  trial_dias: 7,
  trial_dias_comunidad: 5,
  il_trial_imagenes: 10,
  promo_primer_mes_precio: 5,
};

// Respaldo de visibilidad/orden mientras `visible_publico` no exista en la BD.
// Insta Landing (6) NO está: la herramienta se retiró, y este respaldo era el
// que la seguía mostrando cuando el backend todavía no respondía `visible`.
const PLANES_VISIBLES = new Set([2, 3, 4]);
const HIDDEN_PLANS = new Set([22]);
const SORT_ORDER = { 2: 2, 22: 2.5, 3: 3, 4: 4 };
const PROMO_PLANS = new Set([2, 3, 4, 22]);

// El grid tiene que armar TANTAS columnas como planes haya. Antes estaba fijo
// en 4: al quedar 3 planes visibles, las tarjetas se apretaban en tres cuartos
// del ancho y sobraba una columna vacía a la derecha.
// Clases completas y estáticas porque Tailwind no compila nombres construidos
// en runtime.
// Los topes son altos a propósito. Con `max-w-[1320px]` la página dejaba de
// crecer al hacer zoom out (Ctrl -): el viewport se ensancha en píxeles CSS,
// el grid se quedaba clavado y aparecían dos franjas vacías a los lados. Con
// estos valores el contenido acompaña la pantalla y solo frena en monitores
// muy anchos, donde estirar más volvería las tarjetas incómodas de leer.
const GRID_POR_CANTIDAD = {
  1: "max-w-md",
  2: "sm:grid-cols-2 max-w-4xl",
  3: "sm:grid-cols-2 lg:grid-cols-3 max-w-[1700px]",
  4: "sm:grid-cols-2 xl:grid-cols-4 max-w-[2000px]",
  5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 max-w-[2200px]",
};

const detectPlanType = (plan) => {
  // El backend ya resuelve el tipo (config/planes.config.js → tipoPlanUI).
  if (plan?.tipo_ui) return plan.tipo_ui;

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

// ✅ Fuente de verdad alineada al backend:
//   - Nº de conexiones -> limiteConexiones.middleware.js usa (n_conexiones ?? max_conexiones)
//   - Subusuarios      -> limiteSub_usuarios.middleware.js usa max_subusuarios
// (max_agentes_whatsapp y max_subcuentas NO se usan para estos límites)
const getConexiones = (plan) =>
  Number((plan?.n_conexiones ?? plan?.max_conexiones) || 0);

const getSubusuarios = (plan) => Number(plan?.max_subusuarios || 0);

// UN COLOR PROPIO POR PLAN, no una escala de un solo tono.
//
// Se probaron las dos escalas monocromas (azul y verde) y ninguna funcionó: el
// azul se fundía con el header y el menú, y el verde parecido entre tarjetas
// hacía ver la página como consultorio. Con identidad propia cada plan se
// reconoce de lejos y el nivel se lee por la profundidad del tono, no por
// buscar diferencias entre grises del mismo color.
//
// El título va aparte, en fuego (ámbar → rojo): es el gancho comercial y no
// compite con ninguna tarjeta porque ningún plan usa ese degradado.
const ICONOS_PLAN = {
  // Rayo: energía, respuesta instantánea. El robot se leía apagado y además
  // ponía el foco en la máquina; el rayo lo pone en lo que hace.
  rayo: ["M13.6 2 4.4 13.6h6.2L9.4 22l9.2-11.6h-6.2L13.6 2Z"],
  // Flecha al alza: escalar.
  crecer: ["M3 17.5 9.5 11l4 4L21 7.5", "M15.5 7.5H21v5.5"],
  // Edificios: varias marcas o sedes.
  agencia: [
    "M3 21h18",
    "M5 21V7.5L11 4v17",
    "M11 10h8v11",
    "M14.5 14h.01",
    "M14.5 17.5h.01",
  ],
  // Birrete: beneficio de los cursos.
  cursos: [
    "M12 3.5 2.5 8 12 12.5 21.5 8 12 3.5Z",
    "M6 10.2V16c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-5.8",
  ],
  // Plan retirado.
  archivado: [
    "M3 7h18v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z",
    "M2 3.5h20V7H2z",
    "M10 11h4",
  ],
};

const PLAN_THEMES = {
  // Insta Landing ya no se ofrece. El tema se conserva solo para que la tarjeta
  // no reviente en las cuentas que todavía lo tienen asignado y lo ven como
  // "tu plan actual". Va en gris: es un plan muerto, no debe atraer.
  insta_landing: {
    accent: "#94A3B8",
    accentLight: "rgba(148,163,184,0.08)",
    accentBorder: "rgba(148,163,184,0.22)",
    gradient: "linear-gradient(135deg, #94A3B8 0%, #64748B 100%)",
    badge: null,
    tagline: "PLAN DESCONTINUADO",
    icono: ICONOS_PLAN.archivado,
  },
  imporchat: {
    accent: "#0891B2",
    accentLight: "rgba(8,145,178,0.07)",
    accentBorder: "rgba(8,145,178,0.22)",
    gradient: "linear-gradient(135deg, #22D3EE 0%, #0E7490 100%)",
    badge: null,
    tagline: "PARA EMPEZAR",
    icono: ICONOS_PLAN.rayo,
  },
  comunidad: {
    accent: "#B45309",
    accentLight: "rgba(180,83,9,0.07)",
    accentBorder: "rgba(180,83,9,0.22)",
    gradient: "linear-gradient(135deg, #F59E0B 0%, #B45309 100%)",
    badge: "EXCLUSIVO ESTUDIANTES",
    tagline: "COMUNIDAD",
    icono: ICONOS_PLAN.cursos,
  },
  // Plan Method Ecommerce: nunca se ofrecía en el catálogo, pero ahora el
  // backend lo devuelve visible a quien ya lo tiene (es_plan_actual). Sin tema
  // propio, PLAN_THEMES[tipo] quedaba undefined y la tarjeta reventaba.
  method_ecommerce: {
    accent: "#B45309",
    accentLight: "rgba(180,83,9,0.07)",
    accentBorder: "rgba(180,83,9,0.22)",
    gradient: "linear-gradient(135deg, #F59E0B 0%, #B45309 100%)",
    badge: "BENEFICIO EXCLUSIVO CURSOS",
    tagline: "COMUNIDAD IMPORFACTORY",
    icono: ICONOS_PLAN.cursos,
  },
  pro: {
    accent: "#7C3AED",
    accentLight: "rgba(124,58,237,0.07)",
    accentBorder: "rgba(124,58,237,0.22)",
    gradient: "linear-gradient(135deg, #A78BFA 0%, #6D28D9 100%)",
    badge: "MÁS ELEGIDO",
    tagline: "PARA ESCALAR",
    icono: ICONOS_PLAN.crecer,
  },
  avanzado: {
    accent: "#0F172A",
    accentLight: "rgba(15,23,42,0.05)",
    accentBorder: "rgba(15,23,42,0.18)",
    gradient: "linear-gradient(135deg, #334155 0%, #020617 100%)",
    badge: "MÁXIMA CAPACIDAD",
    tagline: "PARA AGENCIAS",
    icono: ICONOS_PLAN.agencia,
  },
};

// Lo ÚNICO que el backend limita de verdad por plan es la capacidad:
//   - conexiones  -> limiteConexiones.middleware.js  (n_conexiones ?? max_conexiones)
//   - subusuarios -> limiteSub_usuarios.middleware.js (max_subusuarios)
// Las demás columnas del catálogo (bot_entrenado, multi_numero_whatsapp,
// analytics_nivel, soporte_nivel, bulk_gen_productos, max_productos_dropi) solo
// aparecen en el SELECT de getPlanById: NINGÚN middleware las verifica. Anunciar
// features por tier basadas en ellas era prometer un límite que no existe.
//
// Por eso la tarjeta muestra capacidad + lo que incluye, y nada más.
//
// QUÉ ES UNA CONEXIÓN (no confundir con un canal)
// Una tarjeta de conexión = una fila en `configuraciones`, y esa fila amarra
// UNA cuenta publicitaria + WhatsApp + Messenger + Instagram. O sea: un negocio
// completo, con su bot y su lógica propia. Con una sola tarjeta el cliente hace
// TODO para ese negocio. Sube de plan (o compra una conexión adicional) cuando
// necesita OTRA tienda/marca con otra lógica, no cuando necesita otro canal.
// Decir "1 canal de venta" hacía creer que el plan de entrada solo servía para
// WhatsApp; es justo al revés.
const buildCapacidad = (plan) => {
  const negocios = getConexiones(plan);
  const equipo = getSubusuarios(plan);
  return [
    {
      valor: negocios,
      label: negocios === 1 ? "negocio conectado" : "negocios conectados",
      ayuda: "WhatsApp, Messenger, Instagram y Ads",
    },
    {
      valor: equipo,
      label: equipo === 1 ? "usuario del equipo" : "usuarios del equipo",
      ayuda: "Cada uno con su propio acceso",
    },
  ];
};

// Iconos de línea, sin emojis: el emoji cambia de forma según el sistema y
// abarata la tarjeta.
const IconoTrazo = ({ d, color, className = "w-[17px] h-[17px]" }) => (
  <svg
    className={`${className} shrink-0`}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d.map((p) => (
      <path key={p} d={p} />
    ))}
  </svg>
);

// Idéntico en todos los planes a propósito: lo que se compra es capacidad, no
// funciones. Verlo repetido en cada tarjeta refuerza justamente eso.
const INCLUYE = [
  {
    label: "Bot IA propio, con la lógica de ese negocio",
    d: [
      "M12 2v3",
      "M5.5 8h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z",
      "M9 13v1",
      "M15 13v1",
    ],
  },
  {
    label: "Responde, cotiza y cierra 24/7",
    d: [
      "M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 20.5l1.5-4.2A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z",
    ],
  },
  {
    label: "Agenda citas, sucursales y servicios",
    d: [
      "M7 3v3",
      "M17 3v3",
      "M4 8h16",
      "M4 5.5h16a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z",
      "M9 13h2",
      "M9 17h6",
    ],
  },
  {
    label: "Catálogo, pedidos y Dropi sincronizado",
    d: [
      "M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z",
      "M3 12l9 4.5 9-4.5",
      "M3 16.5 12 21l9-4.5",
    ],
  },
  {
    label: "Embudo de ventas visual y métricas",
    d: ["M4 4h5v16H4z", "M10.5 4h5v10h-5z", "M17 4h3v6h-3z"],
  },
];

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
  const [pendingPlanId, setPendingPlanId] = useState(null);
  const [pendingChange, setPendingChange] = useState(null);
  const [planConfig, setPlanConfig] = useState(PLAN_CONFIG_FALLBACK);

  // Alias con los nombres de siempre para no reescribir las ~20 referencias de
  // más abajo. La única diferencia es de dónde salen los números.
  const TRIAL_DAYS_PLAN_ID = planConfig.plan_imporchat_id;
  const TRIAL_USAGE_PLAN_ID = planConfig.plan_insta_landing_id;
  const PLAN_COMUNIDAD_ID = planConfig.plan_comunidad_id;
  const TRIAL_DAYS = planConfig.trial_dias;
  const TRIAL_DAYS_COMUNIDAD = planConfig.trial_dias_comunidad;
  const TRIAL_USAGE_LIMIT = planConfig.il_trial_imagenes;
  const PROMO_FIRST_MONTH = planConfig.promo_primer_mes_precio;
  const [pendingEffectiveAt, setPendingEffectiveAt] = useState(null);
  const [addonConexiones, setAddonConexiones] = useState(0);
  const [addonSubusuarios, setAddonSubusuarios] = useState(0);
  const [modalSusp, setModalSusp] = useState({
    open: false,
    idPlan: null,
    planNombre: "",
    conexiones: [],
    limiteConexiones: 0,
    subusuarios: [],
    limiteSubusuarios: 0,
  });
  const [modalSuspLoading, setModalSuspLoading] = useState(false);
  const cerrarModalSusp = () =>
    setModalSusp({
      open: false,
      idPlan: null,
      planNombre: "",
      conexiones: [],
      limiteConexiones: 0,
      subusuarios: [],
      limiteSubusuarios: 0,
    });

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
    setPendingPlanId(plan?.pending_plan_id ?? null);
    setPendingChange(plan?.pending_change ?? null);
    setPendingEffectiveAt(plan?.pending_effective_at ?? null);
    setAddonConexiones(Number(plan?.conexiones_adicionales || 0));
    setAddonSubusuarios(Number(plan?.subusuarios_adicionales || 0));
    return plan;
  };

  // Subusuarios ACTIVOS elegibles (excluye al admin principal, que nunca se suspende)
  const fetchSubusuariosActivos = async () => {
    const token = localStorage.getItem("token");
    const decoded = JSON.parse(atob(token.split(".")[1]));
    const id_usuario = decoded.id_usuario || decoded.id_users;
    let lista = [];
    try {
      const res = await chatApi.post(
        "usuarios_chat_center/listarUsuarios",
        { id_usuario },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      lista = res?.data?.data || [];
    } catch {
      lista = []; // listarUsuarios responde 400 si no hay subusuarios
    }
    // Solo activos
    const activos = lista.filter((s) => Number(s.suspendido || 0) === 0);
    // Admin principal = el más antiguo con rol 'administrador'
    const admins = activos
      .filter((s) => String(s.rol || "").toLowerCase() === "administrador")
      .sort((a, b) => Number(a.id_sub_usuario) - Number(b.id_sub_usuario));
    const adminPrincipalId = admins[0]?.id_sub_usuario ?? null;
    // Elegibles a suspender = activos menos el admin principal
    return activos.filter((s) => s.id_sub_usuario !== adminPrincipalId);
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
        // El backend viejo no manda `config`; ahí se queda el fallback.
        if (resPlanes.data?.config) {
          setPlanConfig({ ...PLAN_CONFIG_FALLBACK, ...resPlanes.data.config });
        }
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

  // Conexiones ACTIVAS del usuario (suspendido = 0)
  const fetchConexionesActivas = async () => {
    const token = localStorage.getItem("token");
    const decoded = JSON.parse(atob(token.split(".")[1]));
    const id_usuario = decoded.id_usuario || decoded.id_users;
    const res = await chatApi.post(
      "configuraciones/listar_conexiones",
      { id_usuario },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return res?.data?.data || [];
  };

  // Envoltura: si un downgrade reduce el cupo de conexiones, primero hace elegir cuáles desactivar
  const iniciarCambioPlan = async (idPlan) => {
    // Solo intercepta cambios de plan reales (cliente con plan de pago activo).
    // Trial/promo usage o sin plan → checkout normal.
    const esCambioReal =
      hasActivePlan && !isTrialUsageActive && !isPromoUsageActive;

    if (esCambioReal) {
      const planDestino =
        (planes || []).find((p) => Number(p.id_plan) === Number(idPlan)) ||
        null;
      const precioActual = Number(
        (planes || []).find((p) => Number(p.id_plan) === Number(currentPlanId))
          ?.precio_plan || 0,
      );
      const precioDestino = Number(planDestino?.precio_plan || 0);
      const esDowngrade = precioActual > 0 && precioDestino < precioActual;

      if (esDowngrade) {
        // Límite de conexiones del plan destino (plan + addon)
        const limiteConexiones =
          getConexiones(planDestino) + Number(addonConexiones || 0);
        // Límite de subusuarios elegibles (max + addon − 1; el admin principal siempre se queda)
        const limiteSubusuarios = Math.max(
          0,
          getSubusuarios(planDestino) + Number(addonSubusuarios || 0) - 1,
        );

        let conexiones = [];
        let subusuarios = [];
        try {
          [conexiones, subusuarios] = await Promise.all([
            fetchConexionesActivas(),
            fetchSubusuariosActivos(),
          ]);
        } catch {
          conexiones = conexiones || [];
          subusuarios = subusuarios || [];
        }

        const sobrantesConex = conexiones.length - limiteConexiones;
        const sobrantesSub = subusuarios.length - limiteSubusuarios;

        // Abrir el modal si CUALQUIERA de los dos recursos se excede
        if (sobrantesConex > 0 || sobrantesSub > 0) {
          setModalSusp({
            open: true,
            idPlan: Number(idPlan),
            planNombre: planDestino?.nombre_plan || "",
            conexiones,
            limiteConexiones,
            subusuarios,
            limiteSubusuarios,
          });
          return;
        }
      }
    }

    // Flujo normal (upgrade / downgrade sin sobrantes / mismo precio / checkout)
    return seleccionarPlan(idPlan);
  };

  // Confirmar el downgrade enviando conexiones Y subusuarios a desactivar al corte
  const confirmarDowngradeConSuspension = async ({
    conexionesSuspender = [],
    subusuariosSuspender = [],
  } = {}) => {
    setModalSuspLoading(true);
    try {
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;
      const res = await chatApi.post(
        "stripe_plan/cambiarPlan",
        {
          id_usuario,
          id_plan_nuevo: modalSusp.idPlan,
          conexiones_suspender: conexionesSuspender,
          subusuarios_suspender: subusuariosSuspender,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      cerrarModalSusp();
      await Swal.fire(
        "Cambio programado",
        res.data?.message || "Tu plan bajará en el próximo corte.",
        "success",
      );
      await refreshPlanActual();
    } catch (e) {
      await Swal.fire(
        "Error",
        e?.response?.data?.message || "No se pudo programar el cambio.",
        "error",
      );
    } finally {
      setModalSuspLoading(false);
    }
  };

  const cancelarDowngrade = async () => {
    const confirm = await Swal.fire({
      title: "¿Cancelar el cambio programado?",
      text: "Seguirás en tu plan actual y no se aplicará la bajada.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, cancelar cambio",
      cancelButtonText: "No",
      focusCancel: true,
    });
    if (!confirm.isConfirmed) return;
    try {
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;
      const res = await chatApi.post(
        "stripe_plan/cancelarDowngrade",
        { id_usuario },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await Swal.fire(
        "Listo",
        res.data?.message || "Cambio cancelado.",
        "success",
      );
      await refreshPlanActual();
    } catch (e) {
      await Swal.fire(
        "Error",
        e?.response?.data?.message || "No se pudo cancelar el cambio.",
        "error",
      );
    }
  };

  const visiblePlans = useMemo(() => {
    const lista = planes || [];

    // El backend ya resolvió visibilidad y orden (visible_publico +
    // unlocked_plans + plan actual). Se confía en eso.
    const backendDecide = lista.some((p) => p.visible !== undefined);

    if (backendDecide) {
      return lista
        .filter((p) => p.visible)
        .sort(
          (a, b) => Number(a.sort_order ?? 99) - Number(b.sort_order ?? 99),
        );
    }

    // Respaldo: backend sin desplegar → se decide como antes.
    const baseVisible = new Set(PLANES_VISIBLES);
    unlockedPlans.forEach((id) => baseVisible.add(Number(id)));
    if (currentPlanId && HIDDEN_PLANS.has(Number(currentPlanId)))
      baseVisible.add(Number(currentPlanId));
    return lista
      .filter((p) => baseVisible.has(Number(p.id_plan)))
      .sort(
        (a, b) =>
          (SORT_ORDER[Number(a.id_plan)] ?? 99) -
          (SORT_ORDER[Number(b.id_plan)] ?? 99),
      );
  }, [planes, unlockedPlans, currentPlanId]);

  const gridCols =
    GRID_POR_CANTIDAD[Math.min(visiblePlans.length || 1, 5)] ||
    GRID_POR_CANTIDAD[4];

  const fmtFecha = (d) =>
    d
      ? new Date(d).toLocaleDateString("es-EC", {
          day: "numeric",
          month: "long",
        })
      : "";

  const hayDowngradePendiente =
    pendingChange === "downgrade" && !!pendingPlanId;

  const downgradePlan = useMemo(
    () =>
      (planes || []).find((p) => Number(p.id_plan) === Number(pendingPlanId)) ||
      null,
    [planes, pendingPlanId],
  );

  return (
    <div className="min-h-screen bg-slate-50/70">
      {/* Animaciones locales de la vista. Van inline y no como plugin de Tailwind
          para no tocar la config global por una sola pantalla.
          `prefers-reduced-motion` las apaga: el contenido debe quedar visible
          igual, por eso el estado final es opacity:1 y no al revés. */}
      <style>{`
        @keyframes ccRise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ccShimmer {
          0%   { background-position: -160% 0; }
          100% { background-position: 260% 0; }
        }
        @keyframes ccPulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--cc-glow); }
          50%      { box-shadow: 0 0 0 7px transparent; }
        }
        .cc-rise {
          opacity: 0;
          animation: ccRise .5s cubic-bezier(.22,1,.36,1) forwards;
        }
        .cc-shimmer {
          background-image: linear-gradient(
            100deg,
            transparent 20%,
            rgba(255,255,255,.75) 50%,
            transparent 80%
          );
          background-size: 200% 100%;
          animation: ccShimmer 2.8s ease-in-out infinite;
        }
        .cc-pulse { animation: ccPulse 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cc-rise, .cc-shimmer, .cc-pulse {
            animation: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
      {/* El botón "Mi plan" se retiró: la navegación ya la encapsula el menú
          lateral del layout. */}
      <div className="px-6 sm:px-10 lg:px-14 pt-3 pb-6">
        {/* Switch, título y promo comparten UNA sola fila en pantallas anchas.
            Antes cada uno ocupaba su propia línea y entre las tres se iban
            ~110px de alto, que es lo que empujaba las características del plan
            fuera de la pantalla.
            Las columnas laterales son `minmax(0,1fr)` iguales: así el título
            queda centrado respecto a la página, no respecto al espacio que
            sobra. Debajo de `lg` todo se apila y el título vuelve al centro. */}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div className="flex justify-center lg:justify-start">
            <div className="inline-flex p-1 rounded-xl bg-slate-100/80 border border-slate-200/70">
              <span className="px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold bg-white text-[#0B1426] shadow-sm">
                Elegir plan
              </span>
              <button
                onClick={() => navigate("/plan")}
                className="px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold text-slate-500 hover:text-[#0B1426] transition-colors"
              >
                Mi plan y facturación
              </button>
            </div>
          </div>

          <div className="text-center">
            {/* El degradado cae solo sobre "crecer tu negocio": es el
                beneficio, y resaltar la frase completa anularía el énfasis.
                `leading-[1.28]` + `pb-1`: con el interlineado apretado el
                `bg-clip-text` recorta las descendentes (la "g" de "negocio"). */}
            <h2 className="font-extrabold text-[#0B1426] tracking-[-0.035em] leading-[1.28] pb-1 text-[clamp(1.5rem,3vw,2.4rem)] text-balance">
              Elige el plan que hará{" "}
              <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                crecer tu negocio
              </span>
            </h2>

            {/* Ancho acotado a ~65 caracteres: a todo lo ancho la bajada se lee
                como banner y el ojo la salta. */}
            <p className="mt-2 mx-auto max-w-2xl text-[14.5px] sm:text-[15.5px] text-slate-500 leading-relaxed text-balance">
              Vende más, automatiza tu atención y responde 24/7 con IA desde una
              sola plataforma.
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <button
              onClick={() => setShowPromoModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-orange-600 hover:bg-orange-50/60 transition-all duration-200"
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
                Estás en una prueba gratuita
              </p>
              <p className="text-[10px] text-slate-500">
                Elige un plan para activar tu agente de ventas IA.
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
        {hayDowngradePendiente && (
          <div
            className="mt-4 mx-auto max-w-lg px-5 py-3 rounded-2xl"
            style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.18)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700">
                  Cambio de plan programado
                </p>
                <p className="text-[11px] text-slate-500">
                  Bajarás al plan{" "}
                  <b>{downgradePlan?.nombre_plan || "seleccionado"}</b> el{" "}
                  <b>{fmtFecha(pendingEffectiveAt)}</b>. Hasta entonces
                  conservas tu plan actual y todos sus beneficios.
                </p>
              </div>
              <span
                className="shrink-0 text-[10px] font-bold px-3 py-1 rounded-full"
                style={{ color: "#D97706", background: "rgba(245,158,11,0.1)" }}
              >
                Programado
              </span>
            </div>
            <button
              onClick={cancelarDowngrade}
              className="mt-2 text-[11px] font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2"
            >
              Cancelar cambio y quedarme en mi plan
            </button>
          </div>
        )}
      </div>

      <div className="px-6 sm:px-10 lg:px-14 pb-10">
        <div
          className={`grid grid-cols-1 gap-5 items-stretch mx-auto ${gridCols}`}
        >
          {planes.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-slate-50 border border-slate-200/60 animate-pulse h-[520px]"
              />
            ))}

          {visiblePlans.map((plan, planIdx) => {
            const planId = Number(plan.id_plan);
            const tipo = detectPlanType(plan);
            // Un tipo nuevo del backend sin tema definido no puede tumbar la
            // vista: se cae a "pro", que es el tema neutro.
            const theme = PLAN_THEMES[tipo] || PLAN_THEMES.pro;
            const isCurrent = Number(currentPlanId) === planId;
            const isCurrentVencido = isCurrent && !isPlanActualActivo;
            const isAction = Number(actionPlanId) === planId;
            const isCurrentTrialUsage = isCurrent && isTrialUsageActive;
            const isCurrentPromoUsage = isCurrent && isPromoUsageActive;
            const isCurrentFreeUsage =
              isCurrentTrialUsage || isCurrentPromoUsage;
            const isDowngradeTarget =
              hayDowngradePendiente && Number(pendingPlanId) === planId;
            const canTrialIL =
              planId === TRIAL_USAGE_PLAN_ID && !ilTrialUsed && !hasActivePlan;
            const canTrialDays =
              planId === TRIAL_DAYS_PLAN_ID && trialEligible && !hasActivePlan;
            const isComunidad = planId === PLAN_COMUNIDAD_ID;
            const canTrialComunidad = isComunidad && !hasActivePlan;
            const promoEligible =
              promoPlan2Eligible &&
              (!hasActivePlan || isTrialUsageActive || isPromoUsageActive);
            // `promo_aplicable` lo calcula el backend (cupón configurado +
            // promo_plan2_used). Si no viene, se usa el Set de respaldo.
            const planAceptaPromo =
              plan.promo_aplicable !== undefined
                ? !!plan.promo_aplicable
                : PROMO_PLANS.has(planId);
            const showPromo = planAceptaPromo && promoEligible;
            const precioNormal = Number(plan?.precio_plan || 0).toFixed(2);
            const precioEntero = Number(plan?.precio_plan || 0).toFixed(0);
            const capacidad = buildCapacidad(plan);
            const isDisabled =
              loading ||
              (isCurrent && isPlanActualActivo && !isCurrentFreeUsage) ||
              isDowngradeTarget ||
              !!actionPlanId;
            const getCTAText = () => {
              if (isDowngradeTarget)
                return `Se activa el ${fmtFecha(pendingEffectiveAt)}`;
              if (isCurrentFreeUsage)
                return showPromo
                  ? `Suscribirse — $${PROMO_FIRST_MONTH} primer mes`
                  : "Suscribirse ahora";
              if (isCurrent && isPlanActualActivo)
                return hayDowngradePendiente
                  ? `Plan actual · hasta ${fmtFecha(pendingEffectiveAt)}`
                  : "Tu plan actual";
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
              if (canTrialComunidad)
                return `${TRIAL_DAYS_COMUNIDAD} días gratis`;
              if (canTrialDays) return `${TRIAL_DAYS} días gratis`;
              return "Comenzar ahora";
            };

            const handleClick = () => {
              if (isCurrentFreeUsage) seleccionarPlan(planId);
              else if (canTrialIL && !hasActivePlan) activarTrialIL();
              else iniciarCambioPlan(planId); // ← antes: seleccionarPlan(planId)
            };

            return (
              <div
                key={plan.id_plan}
                className="cc-rise relative group"
                style={{ animationDelay: `${planIdx * 90}ms` }}
              >
                {theme.badge && (
                  <PlanBadge text={theme.badge} gradient={theme.gradient} />
                )}
                <div
                  className={`relative rounded-2xl bg-white overflow-hidden h-full flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                    theme.badge
                      ? "shadow-xl shadow-slate-300/40 cc-pulse hover:shadow-2xl"
                      : "shadow-sm hover:shadow-lg"
                  }`}
                  style={{
                    border: theme.badge
                      ? `2px solid ${theme.accent}`
                      : "1px solid #e2e8f0",
                    "--cc-glow": theme.accentBorder,
                  }}
                >
                  {/* Barra superior. En el plan destacado le pasa un brillo para
                      que el ojo caiga ahí primero. */}
                  <div
                    className="relative h-1 w-full overflow-hidden"
                    style={{ background: theme.gradient }}
                  >
                    {theme.badge && (
                      <span className="cc-shimmer absolute inset-0 block" />
                    )}
                  </div>
                  <div className="p-4 sm:p-5 flex flex-col h-full">
                    <div className="text-center mb-2">
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

                    {/* Icono sobre el nombre: da un ancla visual a cada plan y
                        se entiende de un vistazo qué es cada uno sin leer. */}
                    <div className="flex justify-center mb-2">
                      <span
                        className="inline-flex items-center justify-center w-11 h-11 rounded-2xl"
                        style={{
                          background: theme.accentLight,
                          border: `1px solid ${theme.accentBorder}`,
                        }}
                      >
                        <IconoTrazo
                          d={theme.icono}
                          color={theme.accent}
                          className="w-[26px] h-[26px]"
                        />
                      </span>
                    </div>

                    <div className="text-center mb-1">
                      <h3 className="text-[19px] font-extrabold text-[#0B1426] tracking-tight">
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
                          <span className="text-[40px] font-extrabold text-[#0B1426] leading-none tracking-tight">
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
                              className="text-[40px] font-extrabold leading-none tracking-tight"
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
                      {isCurrent && addonConexiones > 0 && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold"
                          style={{
                            color: "#4F46E5",
                            background: "rgba(99,102,241,0.08)",
                            border: "1px solid rgba(99,102,241,0.15)",
                          }}
                        >
                          + {addonConexiones} conexión
                          {addonConexiones === 1 ? "" : "es"} adicional
                          {addonConexiones === 1 ? "" : "es"}
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
                      {/* Capacidad: lo único que realmente cambia entre planes */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {capacidad.map((c, i) => (
                          <div
                            key={c.label}
                            className="cc-rise rounded-xl px-2 py-1.5 text-center"
                            style={{
                              background: theme.accentLight,
                              border: `1px solid ${theme.accentBorder}`,
                              animationDelay: `${120 + i * 90}ms`,
                            }}
                          >
                            <div
                              className="text-[22px] font-extrabold leading-none tracking-tight tabular-nums"
                              style={{ color: theme.accent }}
                            >
                              {c.valor}
                            </div>
                            <div className="mt-1 text-[10px] font-bold text-slate-700 leading-tight">
                              {c.label}
                            </div>
                            <div className="text-[8.5px] text-slate-400 leading-tight mt-0.5">
                              {c.ayuda}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        className="cc-rise text-[8.5px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-1.5"
                        style={{ animationDelay: "280ms" }}
                      >
                        Incluye
                      </div>

                      {INCLUYE.map((f, idx) => (
                        <div
                          key={f.label}
                          className="cc-rise flex items-start gap-2 py-[2.5px] text-[11px] leading-snug text-slate-600"
                          style={{ animationDelay: `${320 + idx * 70}ms` }}
                        >
                          <IconoTrazo d={f.d} color={theme.accent} />
                          <span>{f.label}</span>
                        </div>
                      ))}
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

      <ModalSeleccionConexiones
        open={modalSusp.open}
        onClose={() => !modalSuspLoading && cerrarModalSusp()}
        planNombre={modalSusp.planNombre}
        fechaEfectiva={null}
        loading={modalSuspLoading}
        conexiones={modalSusp.conexiones}
        limiteConexiones={modalSusp.limiteConexiones}
        addonConexiones={addonConexiones}
        subusuarios={modalSusp.subusuarios}
        limiteSubusuarios={modalSusp.limiteSubusuarios}
        onConfirm={confirmarDowngradeConSuspension}
      />
    </div>
  );
};

export default PlanesView;
