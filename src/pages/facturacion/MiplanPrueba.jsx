// src/views/Miplan.jsx
import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import {
  FaFilePdf,
  FaSyncAlt,
  FaArrowRight,
  FaArrowLeft,
  FaExclamationCircle,
} from "react-icons/fa";
import { BackExpandArrow } from "../../components/icons/PremiumBackIcons";

// Imágenes usadas por las cards de planes (como en PlanesView.jsx)
import basico from "../../assets/plan_basico_v2.png";
import conexion from "../../assets/plan_conexion_v2.png";
import premium from "../../assets/plan_premium_medal.png";

/* ========= Listón diagonal (de PlanesView) ========= */
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

/* ========= Iconos de features (de PlanesView) ========= */
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

const MiPlan = () => {
  // ====== Estados originales de MiPlan ======
  const [plan, setPlan] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cargandoFacturas, setCargandoFacturas] = useState(false);

  // Overlays SOLO para gestionar/agregar (original)
  const [loadingGestion, setLoadingGestion] = useState(false);
  const [loadingAgregar, setLoadingAgregar] = useState(false);

  // ====== Estados añadidos para integrar PlanesView SIN cambiar de ruta ======
  const [mostrarPlanes, setMostrarPlanes] = useState(false); // controla el slide
  const [planes, setPlanes] = useState([]);
  const [stripeMap, setStripeMap] = useState({});
  const [currentPlanId, setCurrentPlanId] = useState(null);

  // NUEVO: loading por plan al seleccionar (flujo 1 paso)
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  // NUEVO: ¿todavía puede usar el free trial?
  const [trialElegible, setTrialElegible] = useState(true);

  // ====== Funciones originales ======
  const obtenerFacturas = async () => {
    try {
      setCargandoFacturas(true);
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;

      const res = await chatApi.post(
        "/stripe_plan/facturasUsuario",
        { id_usuario },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFacturas(res.data.data || []);
    } catch (error) {
      console.error("Error al cargar facturas:", error);
      Swal.fire("Error", "No se pudieron cargar las facturas", "error");
    } finally {
      setCargandoFacturas(false);
    }
  };

  const obtenerPlanActivo = async () => {
    try {
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;

      const res = await chatApi.post(
        "/stripe_plan/obtenerSuscripcionActiva",
        { id_usuario },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data && res.data.plan) {
        setPlan(res.data.plan);
        setCurrentPlanId(res.data.plan.id_plan ?? null); // importante para la vista de planes
      } else {
        setPlan(null);
        setCurrentPlanId(null);
      }
    } catch (error) {
      console.error("Error al obtener plan activo:", error);
      setPlan(null);
      setCurrentPlanId(null);
    }
  };

  const cancelarSuscripcion = async () => {
    const confirm = await Swal.fire({
      title: "¿Cancelar suscripción?",
      text: "Tu plan seguirá activo hasta el final del periodo.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, cancelar",
    });
    if (!confirm.isConfirmed) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;

      const res = await chatApi.post(
        "/stripe_plan/cancelarSuscripcion",
        { id_usuario },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire("Cancelado", res.data.message, "success");
      obtenerPlanActivo();
    } catch (error) {
      console.error("Error al cancelar:", error);
      Swal.fire("Error", "No se pudo cancelar la suscripción", "error");
    } finally {
      setLoading(false);
    }
  };

  // ====== Efectos originales ======
  useEffect(() => {
    obtenerPlanActivo();
    obtenerFacturas();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const { id_usuario, id_users } = JSON.parse(atob(token.split(".")[1]));
        const { data } = await chatApi.post(
          "/stripe_plan/trialElegibilidad",
          { id_usuario: id_usuario || id_users },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setTrialElegible(Boolean(data?.elegible));
      } catch (e) {
        console.warn("trialElegibilidad:", e?.response?.data || e.message);
      }
    })();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pmSaved = params.get("pm_saved");
    const setupOk = params.get("setup");

    if (pmSaved === "1" || setupOk === "ok") {
      Swal.fire("Listo", "Tarjeta guardada correctamente.", "success");
      const url = new URL(window.location.href);
      url.searchParams.delete("pm_saved");
      url.searchParams.delete("setup");
      window.history.replaceState({}, document.title, url.pathname);
      obtenerFacturas();
      obtenerPlanActivo();
    }
  }, []);

  // Texto dinámico del overlay (solo gestionar/agregar) — original
  const overlayTexto = loadingGestion
    ? "Abriendo portal de métodos..."
    : "Preparando flujo para agregar tarjeta...";

  // ====== Funciones y efectos añadidos (de PlanesView) ======
  const obtenerPlanes = async () => {
    try {
      const res = await chatApi.get("planes/listarPlanes");
      setPlanes(res.data.data || []);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar los planes.",
      });
    }
  };

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
      console.warn(
        "No se pudo sincronizar precios desde Stripe:",
        e?.response?.data || e.message
      );
    }
  };

  useEffect(() => {
    // Traer catálogo de planes y precios Stripe (solo 1 vez)
    obtenerPlanes();
    syncStripePrices();
  }, []);

  // ====== NUEVO: selección directa (1 solo paso) ======
  const handleSeleccionarPlan = async (idPlan) => {
    if (currentPlanId === idPlan) return; // ya tienes este plan
    setLoadingPlanId(idPlan);
    try {
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;
      const baseUrl = window.location.origin;

      // Caso plan gratuito (id 1)
      /* if (idPlan === 1) {
        const res = await chatApi.post(
          "planes/seleccionarPlan",
          { id_plan: 1, id_usuario },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.status === "success") {
          await Swal.fire("Listo", "Tu plan gratuito fue activado correctamente.", "success");
          setMostrarPlanes(false);
          obtenerPlanActivo();
        } else {
          throw new Error(res.data.message || "No se pudo activar el plan gratuito.");
        }
        return;
      } */

      if (idPlan === 1) {
        if (!trialElegible) {
          await Swal.fire(
            "No disponible",
            "Ya usaste tu plan gratuito.",
            "info"
          );
          return;
        }
        const { data } = await chatApi.post(
          "/stripe_plan/crearFreeTrial",
          {
            id_usuario,
            success_url: `${baseUrl}/miplan?trial=ok`,
            cancel_url: `${baseUrl}/miplan?trial=cancel`,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data?.url) window.location.href = data.url;
        return;
      }

      // Caso planes de pago -> crear sesión y redirigir
      const res = await chatApi.post(
        "stripe_plan/crearSesionPago",
        {
          id_plan: idPlan,
          id_usuario,
          success_url: `${baseUrl}/miplan?addpm=1`,
          cancel_url: `${baseUrl}/miplan`,
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
        window.location.href = res.data.url; // redirección directa a Stripe
      } else {
        await Swal.fire(
          "Listo",
          "Tu plan fue actualizado correctamente.",
          "success"
        );
        setMostrarPlanes(false);
        obtenerPlanActivo();
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        "No se pudo procesar tu solicitud. Intenta nuevamente.";
      Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setLoadingPlanId(null);
    }
  };

  const getImagenPlan = (nombre = "") => {
    const n = (nombre || "").toLowerCase();
    if (n.includes("premium")) return premium;
    if (n.includes("conexión") || n.includes("conexion")) return conexion;
    return basico;
  };

  const getPrecioMostrar = (pl) => {
    const s = stripeMap[pl.id_plan];
    if (s && typeof s.stripe_price === "number")
      return (s.stripe_price / 100).toFixed(2);
    return parseFloat(pl.precio_plan).toFixed(2);
  };

  const getIntervalo = (pl) => {
    const s = stripeMap[pl.id_plan];
    if (s?.stripe_interval) return s.stripe_interval === "year" ? "año" : "mes";
    return "mes";
  };

  const buildFeatures = (pl) => {
    const nombre = (pl?.nombre_plan || "").toLowerCase();
    const esFree = nombre.includes("free") || nombre.includes("gratuito");
    const esConexion =
      nombre.includes("conexión") || nombre.includes("conexion");
    const desactivaCitas = esFree || esConexion;

    return [
      { label: `${pl.n_conexiones} Conexiones`, enabled: true },
      { label: `${pl.max_subusuarios} subusuarios incluidos`, enabled: true },
      { label: "Código QR personalizado", enabled: true },
      { label: "Integración con Meta", enabled: true },
      { label: "Contactos ilimitados", enabled: true },
      { label: "Conversaciones ilimitadas", enabled: true },
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
    <div className="min-h-screen w-full px-4 sm:px-6 lg:px-10 py-8 md:py-10 text-black bg-white [padding-bottom:env(safe-area-inset-bottom)]">
      {/* Overlay SOLO para gestionar/agregar (original) */}
      {(loadingGestion || loadingAgregar) && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div
            className="rounded-2xl px-6 py-5 text-white shadow-2xl border border-[#c4bde4]/30"
            style={{
              background:
                "linear-gradient(180deg, #4b3f72 0%, #322b4f 60%, #1f1a33 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <FaSyncAlt className="animate-spin" />
              <span className="text-sm sm:text-base font-semibold">
                {overlayTexto}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ====== CONTENEDOR DESLIZANTE (UNIFICACIÓN) ====== */}
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out w-[200%]"
          style={{
            transform: mostrarPlanes ? "translateX(-50%)" : "translateX(0%)",
          }}
        >
          {/* ========= PANE 1: Tu plan actual (contenido original SIN cambios visuales) ========= */}
          <section className="w-1/2 mt-10">
            <div className="mx-auto w-full mt-10">
              {/* encabezado */}
              <div className="mb-6 md:mb-8 px-1 mt-10">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#3b3560]">
                  Tu Plan Actual
                </h2>
                <p className="mt-2 text-[#5a547a] text-xs sm:text-sm">
                  Administra tu suscripción y consulta tu historial de
                  facturación.
                </p>
              </div>

              {/* grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
                {/* card del plan */}
                <div className="xl:col-span-2">
                  <div className="relative rounded-3xl p-5 sm:p-7 md:p-9 bg-gradient-to-b from-[#4b3f72] via-[#322b4f] to-[#1f1a33] text-white backdrop-blur-xl border border-[#c4bde4]/30 shadow-lg shadow-[#c4bde4]/10 hover:shadow-[0_0_25px_rgba(196,189,228,0.25)] transition-shadow duration-300">
                    {/* cinta de estado */}
                    <div className="absolute -top-3 right-4 sm:right-6 mt-5">
                      <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] sm:text-xs font-semibold text-emerald-200 bg-emerald-600/20 ring-1 ring-emerald-400/30">
                        ● Activo
                      </span>
                    </div>

                    {plan ? (
                      <>
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 sm:gap-6">
                          <div className="min-w-0">
                            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white break-words">
                              {plan.nombre_plan}
                            </h3>
                            <p className="mt-2 text-xs sm:text-sm text-[#e0dcf3] max-w-prose">
                              {plan.descripcion_plan || "Plan premium activo"}
                            </p>
                          </div>

                          {/* botones */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            {/* ESTE botón se cambió: ahora abre el panel deslizante */}
                            <button
                              onClick={() => setMostrarPlanes(true)}
                              className="inline-flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-sm font-semibold bg-[#6d5cbf] hover:bg-[#5a4aa5] active:bg-[#4a3e88] transition focus:outline-none focus:ring-2 focus:ring-[#c4bde4]/50"
                            >
                              Cambiar plan <FaArrowRight />
                            </button>

                            <button
                              onClick={cancelarSuscripcion}
                              disabled={loading}
                              className="inline-flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-60 transition focus:outline-none focus:ring-2 focus:ring-red-500/60"
                            >
                              <FaExclamationCircle />
                              {loading ? "Cancelando..." : "Cancelar"}
                            </button>

                            {/* GESTIONAR MÉTODOS - con overlay */}
                            <button
                              onClick={async () => {
                                if (loadingAgregar) return;
                                setLoadingGestion(true);
                                try {
                                  const token = localStorage.getItem("token");
                                  const { id_usuario, id_users } = JSON.parse(
                                    atob(token.split(".")[1])
                                  );
                                  const res = await chatApi.post(
                                    "/stripe_plan/portalGestionMetodos",
                                    { id_usuario: id_usuario || id_users },
                                    {
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                    }
                                  );
                                  window.location.href = res.data.url;
                                } catch (e) {
                                  console.error(e);
                                  Swal.fire(
                                    "Error",
                                    "No se pudo abrir el portal de métodos.",
                                    "error"
                                  );
                                  setLoadingGestion(false);
                                }
                              }}
                              disabled={loadingGestion || loadingAgregar}
                              className={`inline-flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-sm font-semibold border border-[#c4bde4]/40 text-white transition focus:outline-none focus:ring-2 focus:ring-[#c4bde4]/50
                                ${
                                  loadingGestion || loadingAgregar
                                    ? "opacity-60 cursor-not-allowed"
                                    : "hover:bg-[#c4bde4]/10"
                                }`}
                            >
                              {loadingGestion ? (
                                <FaSyncAlt className="animate-spin" />
                              ) : null}
                              Gestionar métodos de pago
                            </button>

                            {/* AGREGAR MÉTODO - con overlay */}
                            <button
                              onClick={async () => {
                                if (loadingGestion) return;
                                setLoadingAgregar(true);
                                try {
                                  const token = localStorage.getItem("token");
                                  const { id_usuario, id_users } = JSON.parse(
                                    atob(token.split(".")[1])
                                  );
                                  const res = await chatApi.post(
                                    "/stripe_plan/portalAddPaymentMethod",
                                    { id_usuario: id_usuario || id_users },
                                    {
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                    }
                                  );
                                  window.location.href = res.data.url;
                                } catch (e) {
                                  console.error(e);
                                  Swal.fire(
                                    "Error",
                                    "No se pudo iniciar el flujo para agregar tarjeta.",
                                    "error"
                                  );
                                  setLoadingAgregar(false);
                                }
                              }}
                              disabled={loadingGestion || loadingAgregar}
                              className={`inline-flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-sm font-semibold text-emerald-300 transition focus:outline-none focus:ring-2 focus:ring-emerald-400/40
                                ${
                                  loadingGestion || loadingAgregar
                                    ? "opacity-60 cursor-not-allowed"
                                    : "hover:text-emerald-200 hover:bg-emerald-600/10"
                                }`}
                            >
                              {loadingAgregar ? (
                                <FaSyncAlt className="animate-spin" />
                              ) : null}
                              Agregar método de pago
                            </button>
                          </div>
                        </div>

                        {/* info fechas */}
                        <div className="mt-6 sm:mt-8">
                          {(() => {
                            const hoy = new Date();
                            const fin = new Date(plan.fecha_renovacion);
                            const diasRestantes = Math.ceil(
                              (fin - hoy) / (1000 * 60 * 60 * 24)
                            );
                            let color = "text-emerald-400";
                            if (diasRestantes <= 5) color = "text-red-400";
                            else if (diasRestantes <= 15)
                              color = "text-orange-400";

                            const inicioPeriodo = new Date(fin);
                            inicioPeriodo.setMonth(
                              inicioPeriodo.getMonth() - 1
                            );
                            const totalMs = fin - inicioPeriodo;
                            const transcurridoMs = Math.min(
                              Math.max(hoy - inicioPeriodo, 0),
                              totalMs
                            );
                            const porcentaje = Math.max(
                              0,
                              Math.min(
                                100,
                                Math.round((transcurridoMs / totalMs) * 100)
                              )
                            );

                            return (
                              <>
                                <p
                                  className={`text-xs sm:text-sm font-medium ${color}`}
                                >
                                  El plan culmina: {fin.toLocaleDateString()} (
                                  {diasRestantes} días restantes)
                                </p>
                                <p
                                  className={`text-xs sm:text-sm font-medium mt-1 ${color}`}
                                >
                                  Renovación: {fin.toLocaleDateString()}
                                </p>

                                <div className="mt-3 sm:mt-4">
                                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-[#c4bde4] via-gray-400 to-emerald-400"
                                      style={{ width: `${porcentaje}%` }}
                                    />
                                  </div>
                                  <div className="mt-1 text-[10px] sm:text-xs text-[#e0dcf3]">
                                    {porcentaje}% del periodo transcurrido
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {plan.estado === "inactivo" && (
                          <div className="mt-6 p-4 rounded-xl bg-red-500/15 text-red-300 font-semibold text-sm border border-red-400/30">
                            Este plan ha caducado y ya no está activo.
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-[#e0dcf3]">
                        No tienes un plan activo.
                      </div>
                    )}
                  </div>
                </div>

                {/* panel facturas */}
                <div className="xl:col-span-1">
                  <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-b from-[#4b3f72] via-[#322b4f] to-[#1f1a33] text-white backdrop-blur-xl border border-[#c4bde4]/30 shadow-lg shadow-[#c4bde4]/10 hover:shadow-[0_0_25px_rgba(196,189,228,0.25)] transition-shadow duration-300 h-full xl:sticky xl:top-6">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h4 className="text-base sm:text-lg font-semibold text-white">
                        Facturas
                      </h4>
                      <button
                        onClick={obtenerFacturas}
                        disabled={cargandoFacturas}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#c4bde4]/50
                          ${
                            cargandoFacturas
                              ? "bg-[#c4bde4]/40 cursor-not-allowed text-white"
                              : "bg-[#6d5cbf] hover:bg-[#5a4aa5] text-white"
                          }`}
                      >
                        <FaSyncAlt
                          className={cargandoFacturas ? "animate-spin" : ""}
                        />
                        {cargandoFacturas ? "Actualizando" : "Actualizar"}
                      </button>
                    </div>

                    {facturas.length > 0 ? (
                      <div className="max-h-[50vh] md:max-h-[60vh] xl:max-h-[460px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {facturas.map((f) => (
                          <div
                            key={f.id}
                            className="group rounded-2xl p-4 bg-[#322b4f]/70 border border-[#c4bde4]/30 hover:border-[#c4bde4]/50 transition shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-sm text-white">
                                  {new Date(
                                    f.created * 1000
                                  ).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-[#e0dcf3] truncate">
                                  USD {(f.amount_paid / 100).toFixed(2)}
                                </p>
                              </div>
                              <a
                                href={f.hosted_invoice_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 inline-flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-gray-200"
                              >
                                <FaFilePdf /> Ver PDF
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#e0dcf3]">
                        Aún no hay facturas para mostrar.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ========= PANE 2: Cards de planes (lo que antes era PlanesView) ========= */}
          <section className="w-1/2">
            <div className="min-h-screen bg-white flex flex-col items-center px-6 py-12">
              <div className="w-full max-w-8xl">
                {/* HEADER de planes */}
                <div className="relative mb-10 mt-10 pl-12 sm:pl-0">
                  <h2 className="text-4xl text-center font-extrabold text-[#2f2b45]">
                    Elige tu plan ideal y potencia tu empresa
                  </h2>
                  <p className="mt-3 text-sm text-center text-[#5a547a]">
                    Planes claros, beneficios reales y un proceso de activación
                    sencillo.
                  </p>

                  {currentPlanId && (
                    <div className="absolute top-2 left-3 sm:top-3 sm:left-6 md:-top-3 md:left-10 z-50">
                      <div className="inline-flex items-center gap-2 [transform-origin:left_top] scale-90 sm:scale-100">
                        <BackExpandArrow
                          onClick={() => setMostrarPlanes(false)}
                          diameter={48}
                          expandedWidth={160}
                          iconSize={45}
                          labelSize={18}
                          baseColor="#171931"
                          hoverColor="#171931"
                          /* en móvil solo ícono, desde sm aparece el texto */
                          labelClassName="font-bold hidden sm:inline"
                          aria-label="Volver"
                          title="Volver"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* GRID de cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
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

                  {planes.map((pl) => {
                    const isCurrent = currentPlanId === pl.id_plan;
                    const ribbon = pl.nombre_plan
                      ?.toLowerCase()
                      .includes("premium")
                      ? "Popular"
                      : pl.nombre_plan?.toLowerCase().includes("conexión") ||
                        pl.nombre_plan?.toLowerCase().includes("conexion")
                      ? "Recomendado"
                      : null;

                    const esBasico =
                      (pl.nombre_plan || "").toLowerCase().includes("básico") ||
                      (pl.nombre_plan || "").toLowerCase().includes("basico");

                    const features = buildFeatures(pl);

                    return (
                      <div
                        key={pl.id_plan}
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
                          {esBasico && (
                            <Liston texto="Más vendido" color="vendido" />
                          )}
                          {!esBasico && ribbon === "Recomendado" && (
                            <Liston texto="Recomendado" color="recomendado" />
                          )}
                          {!esBasico && ribbon === "Popular" && (
                            <Liston texto="Popular" color="popular" />
                          )}

                          {/* Contenido */}
                          <div className="px-6 pt-16 pb-6 md:px-7 md:pt-20 md:pb-7 flex flex-col h-full">
                            {/* Título y descripción */}
                            <div className="text-center min-h-[92px]">
                              <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#171931]">
                                {pl.nombre_plan}
                              </h3>
                              <p className="text-sm leading-relaxed text-slate-600 mt-1">
                                {pl.descripcion_plan}
                              </p>
                            </div>

                            {/* Precio */}
                            <div className="mt-5 text-center min-h-[52px] flex items-end justify-center">
                              <div className="inline-flex items-end gap-1">
                                <span className="text-3xl md:text-[34px] font-extrabold tracking-tight text-[#171931]">
                                  ${getPrecioMostrar(pl)}
                                </span>
                                <span className="text-sm text-slate-500 mb-1">
                                  /{getIntervalo(pl)}
                                </span>
                              </div>
                            </div>

                            {/* Beneficios */}
                            <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-y-3 md:gap-x-3 text-sm flex-1 md:w-[100%] mx-auto">
                              {features.map((f, idx) => (
                                <li
                                  key={idx}
                                  className={
                                    f.enabled
                                      ? "text-slate-700"
                                      : "text-slate-400"
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

                            {/* Botón: flujo de 1 paso */}
                            <div className="mt-6">
                              <button
                                onClick={() =>
                                  handleSeleccionarPlan(pl.id_plan)
                                }
                                disabled={
                                  loadingPlanId === pl.id_plan ||
                                  isCurrent ||
                                  (pl.id_plan === 1 && !trialElegible) // <-- bloquea Free si ya usó el trial
                                }
                                className={`
                                  w-full inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold
                                  transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                                  ${
                                    isCurrent
                                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                      : loadingPlanId === pl.id_plan
                                      ? "bg-emerald-600 text-white cursor-wait"
                                      : pl.id_plan === 1 && !trialElegible
                                      ? "bg-slate-200 text-slate-500 cursor-not-allowed" // estiliza card Free bloqueada
                                      : "bg-[#171931] text-white hover:-translate-y-[2px] hover:shadow-lg active:translate-y-0"
                                  }
                                `}
                              >
                                {isCurrent
                                  ? "Tienes este plan actualmente"
                                  : loadingPlanId === pl.id_plan
                                  ? "Procesando..."
                                  : pl.id_plan === 1 && !trialElegible
                                  ? "No disponible"
                                  : "Seleccionar"}
                              </button>

                              {pl.id_plan === 1 && !trialElegible && (
                                <p className="mt-2 text-xs text-red-600">
                                  Ya usaste tu plan gratuito.
                                </p>
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
          </section>
        </div>
      </div>
    </div>
  );
};

export default MiPlan;
