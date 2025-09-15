// src/pages/planes/CardPlanPersonalizado.jsx
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

export default function CardPlanPersonalizado({
  plan,
  stripeMap,
  currentPlanId,
  addons,
}) {
  const [nConexiones, setNConexiones] = useState(null);
  const [maxSubusuarios, setMaxSubusuarios] = useState(null);

  // Datos opcionales que puede devolver el nuevo endpoint
  const [totalDesdeAPI, setTotalDesdeAPI] = useState(null); // { base_cents, conn_addon_cents, sub_addon_cents, total_cents, intervalo }
  const [idPlanBasePersonalizado, setIdPlanBasePersonalizado] = useState(null);
  const [esPlanPersonalizado, setEsPlanPersonalizado] = useState(false);

  // Cargar la configuración actual del plan personalizado
  useEffect(() => {
    const token = localStorage.getItem("token");

    const fetchFromMiPlanPersonalizado = async () => {
      // Nuevo endpoint agregado en backend: GET /api/v1/stripe_plan/miPlanPersonalizado
      const resp = await chatApi.get("/stripe_plan/miPlanPersonalizado", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = resp?.data?.data || null;
      if (!payload) return false;

      const per = payload.personalizado || null; // { id_plan_base, n_conexiones, max_subusuarios }
      const base = payload.base_plan || null;    // { id_plan, nombre_plan, ... }
      const s    = payload.stripe || null;       // { base_cents, conn_addon_cents, sub_addon_cents, total_cents, intervalo }
      const esActual = Boolean(payload.es_actual);

      if (per) {
        const nConn = clamp(Number(per.n_conexiones ?? 0), 0, 10);
        const nSubs = clamp(Number(per.max_subusuarios ?? 0), 0, 10);
        setNConexiones(nConn);
        setMaxSubusuarios(nSubs);
        setIdPlanBasePersonalizado(Number(per.id_plan_base ?? base?.id_plan ?? 5));
        setTotalDesdeAPI(s || null);

        // Esta card es la actual si el backend dice es_actual y el plan base coincide con la card
        const esEstaCard = esActual && Number(base?.id_plan ?? per?.id_plan_base) === Number(plan.id_plan);
        setEsPlanPersonalizado(esEstaCard);
      } else {
        // No hay personalizado
        setNConexiones(0);
        setMaxSubusuarios(0);
        setIdPlanBasePersonalizado(null);
        setTotalDesdeAPI(null);
        setEsPlanPersonalizado(false);
      }

      return true;
    };

    const fetchFromObtenerPersonalizado = async () => {
      // Fallback al endpoint existente: POST /api/v1/stripe_plan/obtenerPlanPersonalizadoUsuario
      const resp = await chatApi.post(
        "/stripe_plan/obtenerPlanPersonalizadoUsuario",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Este endpoint suele devolver la fila en data.data
      const row = resp?.data?.data || resp?.data?.plan_personalizado || null;

      if (row) {
        const nConn = clamp(Number(row.n_conexiones ?? 0), 0, 10);
        const nSubs = clamp(Number(row.max_subusuarios ?? 0), 0, 10);
        const planBase = Number(row.id_plan_base ?? row.id_plan ?? 5);

        setNConexiones(nConn);
        setMaxSubusuarios(nSubs);
        setIdPlanBasePersonalizado(planBase);

        // No tenemos bandera es_actual desde este endpoint, así que
        // marcamos como actual si al menos coincide con esta card
        setEsPlanPersonalizado(planBase === plan.id_plan);
        setTotalDesdeAPI(null);
      } else {
        setNConexiones(0);
        setMaxSubusuarios(0);
        setIdPlanBasePersonalizado(null);
        setEsPlanPersonalizado(false);
        setTotalDesdeAPI(null);
      }
    };

    (async () => {
      try {
        // 1) Intentar con el nuevo endpoint
        const ok = await fetchFromMiPlanPersonalizado();
        if (!ok) {
          // 2) Si no existe o devuelve vacío, intentar con el endpoint anterior
          await fetchFromObtenerPersonalizado();
        }
      } catch (e) {
        // 3) Último fallback: endpoint anterior
        try {
          await fetchFromObtenerPersonalizado();
        } catch (err) {
          console.error("❌ No se pudo cargar el plan personalizado:", err?.message || err);
          setNConexiones(0);
          setMaxSubusuarios(0);
          setIdPlanBasePersonalizado(null);
          setEsPlanPersonalizado(false);
          setTotalDesdeAPI(null);
        }
      }
    })();
  }, [plan?.id_plan]);

  const MAX_CONEXIONES = 10;
  const MAX_SUBUSUARIOS = 10;

  // Precio base desde Stripe/BD (fallback local)
  const s = stripeMap?.[plan.id_plan];
  const baseCentsFallback = useMemo(() => {
    if (s && typeof s.stripe_price === "number") return s.stripe_price;
    return Math.round(Number(plan.precio_plan || 0) * 100);
  }, [s, plan]);

  // Intervalo mostrado
  const intervalo = useMemo(() => {
    const i =
      totalDesdeAPI?.intervalo ||
      (s?.stripe_interval ? s.stripe_interval : "month");
    return i === "year" ? "año" : "mes";
  }, [totalDesdeAPI?.intervalo, s?.stripe_interval]);

  // Addons (fallback local)
  const connCentsFallback = Number(addons?.conexion?.unit_amount || 0);
  const subCentsFallback = Number(addons?.subusuario?.unit_amount || 0);

  // Total mostrado (prioriza lo calculado por backend)
  const totalCents = useMemo(() => {
    if (typeof totalDesdeAPI?.total_cents === "number") {
      return totalDesdeAPI.total_cents;
    }
    // Fallback al cálculo en el front
    return (
      Number(baseCentsFallback || 0) +
      Number(nConexiones || 0) * connCentsFallback +
      Number(maxSubusuarios || 0) * subCentsFallback
    );
  }, [
    totalDesdeAPI?.total_cents,
    baseCentsFallback,
    nConexiones,
    maxSubusuarios,
    connCentsFallback,
    subCentsFallback,
  ]);

  const totalFmt = (totalCents / 100).toFixed(2);

  // Deshabilitar checkout si no hay cantidades o si esta card ya es la actual
  const esEstaCardLaActual =
    esPlanPersonalizado || Number(currentPlanId) === Number(plan.id_plan);
  const disabledPorCantidades =
    Number(nConexiones) === 0 && Number(maxSubusuarios) === 0;

  const incCon = () => {
    if (nConexiones < MAX_CONEXIONES) setNConexiones(nConexiones + 1);
  };
  const decCon = () => {
    if (nConexiones > 0) setNConexiones(nConexiones - 1);
  };
  const incSub = () => {
    if (maxSubusuarios < MAX_SUBUSUARIOS)
      setMaxSubusuarios(maxSubusuarios + 1);
  };
  const decSub = () => {
    if (maxSubusuarios > 0) setMaxSubusuarios(maxSubusuarios - 1);
  };

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

  const handleCheckout = async () => {
    try {
      if (disabledPorCantidades) {
        return Swal.fire(
          "Ups",
          "Selecciona al menos 1 conexión o 1 subusuario.",
          "info"
        );
      }
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;
      const baseUrl = window.location.origin;

      const { data } = await chatApi.post(
        "stripe_plan/crearSesionPlanPersonalizado",
        {
          id_usuario,
          n_conexiones: nConexiones,
          max_subusuarios: maxSubusuarios,
          success_url: `${baseUrl}/miplan?addpm=1`,
          cancel_url: `${baseUrl}/planes_view`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data?.url) window.location.href = data.url;
      else Swal.fire("Listo", "Tu plan fue procesado.", "success");
    } catch (e) {
      const msg = e?.response?.data?.message || e.message;
      Swal.fire("Error", msg, "error");
    }
  };

  if (nConexiones === null || maxSubusuarios === null) {
    return <div>Cargando plan personalizado...</div>;
  }

  return (
    <div className="relative group rounded-2xl p-[1px] transition-all duration-300 ease-out hover:-translate-y-1 h-full">
      <div
        className="
          relative overflow-visible rounded-[calc(1rem-1px)]
          bg-white/90 backdrop-blur border border-slate-200/60
          shadow-md transition-shadow duration-300
          h-full flex flex-col
        "
      >
        {/* Contenido */}
        <div className="px-6 pt-16 pb-6 md:px-7 md:pt-20 md:pb-7 flex flex-col h-full">
          {/* Título y descripción */}
          <div className="text-center min-h-[92px]">
            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#171931]">
              {plan?.nombre_plan || "Plan Personalizado"}
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 mt-1">
              {plan?.descripcion_plan || "Plan Personalizado"}
            </p>
          </div>

          {/* Precio */}
          <div className="mt-5 text-center min-h-[52px] flex items-end justify-center">
            <div className="inline-flex items-end gap-1">
              <span className="text-3xl md:text-[34px] font-extrabold tracking-tight text-[#171931]">
                ${totalFmt}
              </span>
              <span className="text-sm text-slate-500 mb-1">/{intervalo}</span>
            </div>
          </div>

          {/* Controles */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200/60 bg-white px-3 py-3">
              <div className="text-sm font-semibold mb-2 text-[#171931]">
                Conexiones
              </div>
              <div className="flex items-center justify-between">
                <button
                  className="px-2 py-1 border border-slate-300 rounded-md"
                  onClick={decCon}
                  disabled={esEstaCardLaActual}
                  title={esEstaCardLaActual ? "Este es tu plan activo" : ""}
                >
                  -
                </button>
                <div className="w-10 text-center font-semibold">
                  {nConexiones}
                </div>
                <button
                  className="px-2 py-1 border border-slate-300 rounded-md"
                  onClick={incCon}
                  disabled={esEstaCardLaActual}
                  title={esEstaCardLaActual ? "Este es tu plan activo" : ""}
                >
                  +
                </button>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                0 – {MAX_CONEXIONES}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200/60 bg-white px-3 py-3">
              <div className="text-sm font-semibold mb-2 text-[#171931]">
                Subusuarios
              </div>
              <div className="flex items-center justify-between">
                <button
                  className="px-2 py-1 border border-slate-300 rounded-md"
                  onClick={decSub}
                  disabled={esEstaCardLaActual}
                  title={esEstaCardLaActual ? "Este es tu plan activo" : ""}
                >
                  -
                </button>
                <div className="w-10 text-center font-semibold">
                  {maxSubusuarios}
                </div>
                <button
                  className="px-2 py-1 border border-slate-300 rounded-md"
                  onClick={incSub}
                  disabled={esEstaCardLaActual}
                  title={esEstaCardLaActual ? "Este es tu plan activo" : ""}
                >
                  +
                </button>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                0 – {MAX_SUBUSUARIOS}
              </div>
            </div>
          </div>

          {/* Beneficios */}
          <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-y-3 md:gap-x-3 text-sm flex-1 md:w-[100%] mx-auto">
            {[
              `${nConexiones} Conexiones`,
              `${maxSubusuarios} subusuarios incluidos`,
              "Código QR personalizado",
              "Integración con Meta",
              "Contactos ilimitados",
              "Conversaciones ilimitadas",
              "Whatsapp coexistencia",
              "Inteligencia artificial",
              "Área de productos y servicios",
              "Automatizador",
              "IA de agendamiento de citas",
              "Calendario de programación de citas",
            ].map((label, idx) => (
              <li key={idx} className="text-slate-700">
                <div className="grid grid-cols-[12px_1fr] items-start gap-2">
                  <span className="inline-flex h-4 w-4 items-center justify-center mt-[2px]">
                    <IconoCheck />
                  </span>
                  <span className="leading-relaxed text-left">{label}</span>
                </div>
              </li>
            ))}
          </ul>

          {/* Botón */}
          <div className="mt-6">
            <button
              onClick={handleCheckout}
              disabled={disabledPorCantidades || esEstaCardLaActual}
              className={`w-full inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                esEstaCardLaActual
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : disabledPorCantidades
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "bg-[#171931] text-white hover:-translate-y-[2px] hover:shadow-lg active:translate-y-0"
              }`}
            >
              {esEstaCardLaActual ? "Tienes este plan actualmente" : "Seleccionar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* utils */
function clamp(n, min, max) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
