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
  const [idPlanBasePersonalizado, setIdPlanBasePersonalizado] = useState(null);
  const [tieneConfigGuardada, setTieneConfigGuardada] = useState(false);
  const [esEstaCardActual, setEsEstaCardActual] = useState(false);

  const MAX_CONEXIONES = 10;
  const MAX_SUBUSUARIOS = 10;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      // Sin token no podemos pedir la config → mostramos 0 pero no null
      setNConexiones(0);
      setMaxSubusuarios(0);
      setIdPlanBasePersonalizado(null);
      setEsEstaCardActual(Number(currentPlanId) === Number(plan.id_plan));
      return;
    }

    // util: decodifica el jwt local para obtener id_usuario/id_users
    const getUserIdFromToken = () => {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload?.id_usuario ?? payload?.id_users ?? null;
      } catch {
        return null;
      }
    };

    const parseRow = (raw) => {
      if (!raw) return null;
      const row = Array.isArray(raw) ? raw[0] : raw;
      return {
        id_plan_base: Number(
          row?.id_plan_base ?? row?.id_plan ?? row?.plan_base ?? NaN
        ),
        n_conexiones: Number(row?.n_conexiones ?? row?.conexiones ?? 0),
        max_subusuarios: Number(row?.max_subusuarios ?? row?.subusuarios ?? 0),
      };
    };

    const fetchPersonalizado = async () => {
      try {
        const id_usuario = getUserIdFromToken();
        if (!id_usuario) {
          throw new Error("Token sin id_usuario/id_users");
        }

        // ⚠️ IMPORTANTE: sin “/” inicial y MANDANDO id_usuario en el body
        const resp = await chatApi.post(
          "stripe_plan/obtenerPlanPersonalizadoUsuario",
          { id_usuario },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // La respuesta puede venir en distintas formas
        const payload =
          resp?.data?.data ??
          resp?.data?.plan_personalizado ??
          resp?.data ??
          null;

        const row = parseRow(payload);

        if (row?.id_plan_base) {
          const nConn = clamp(row.n_conexiones, 0, MAX_CONEXIONES);
          const nSubs = clamp(row.max_subusuarios, 0, MAX_SUBUSUARIOS);

          setNConexiones(nConn);
          setMaxSubusuarios(nSubs);
          setIdPlanBasePersonalizado(row.id_plan_base);
          setTieneConfigGuardada(true);

          // 👇 Solo se marca como ACTUAL si el plan activo coincide.
          // La config guardada NO implica plan activo (puede estar pendiente de pago).
          const esActual = Number(currentPlanId) === Number(plan.id_plan);
          setEsEstaCardActual(Boolean(esActual));
        } else {
          // No hay config guardada para este usuario
          setNConexiones(0);
          setMaxSubusuarios(0);
          setIdPlanBasePersonalizado(null);
          setTieneConfigGuardada(false);
          setEsEstaCardActual(Number(currentPlanId) === Number(plan.id_plan));
        }
      } catch (e) {
        console.error(
          "❌ obtenerPlanPersonalizadoUsuario:",
          e?.response?.data || e.message
        );
        // Fallback seguro
        setNConexiones(0);
        setMaxSubusuarios(0);
        setIdPlanBasePersonalizado(null);
        setEsEstaCardActual(Number(currentPlanId) === Number(plan.id_plan));
      }
    };

    fetchPersonalizado();
  }, [plan?.id_plan, currentPlanId]);

  // ====== Precios ======
  const s = stripeMap?.[plan.id_plan];
  const baseCents = useMemo(() => {
    if (s && typeof s.stripe_price === "number") return s.stripe_price;
    return Math.round(Number(plan.precio_plan || 0) * 100);
  }, [s, plan]);

  const intervalo = useMemo(() => {
    const iv = s?.stripe_interval === "year" ? "año" : "mes";
    return iv || "mes";
  }, [s?.stripe_interval]);

  // Si existen addons específicos de personalizado, se usan; si no, los generales
  const connCents = useMemo(() => {
    return Number(
      addons?.personalizado?.conexion?.unit_amount ??
        addons?.conexion?.unit_amount ??
        0
    );
  }, [addons]);

  const subCents = useMemo(() => {
    return Number(
      addons?.personalizado?.subusuario?.unit_amount ??
        addons?.subusuario?.unit_amount ??
        0
    );
  }, [addons]);

  const totalCents = useMemo(() => {
    const n = Number(nConexiones || 0);
    const sbs = Number(maxSubusuarios || 0);
    return Number(baseCents || 0) + n * connCents + sbs * subCents;
  }, [baseCents, nConexiones, maxSubusuarios, connCents, subCents]);

  const totalFmt = (totalCents / 100).toFixed(2);

  // ====== UI / Controles ======
  const disabledPorCantidades =
    Number(nConexiones) === 0 && Number(maxSubusuarios) === 0;

  const incCon = () => {
    if (esEstaCardActual) return;
    if (nConexiones < MAX_CONEXIONES) setNConexiones(nConexiones + 1);
  };
  const decCon = () => {
    if (esEstaCardActual) return;
    if (nConexiones > 0) setNConexiones(nConexiones - 1);
  };
  const incSub = () => {
    if (esEstaCardActual) return;
    if (maxSubusuarios < MAX_SUBUSUARIOS)
      setMaxSubusuarios(maxSubusuarios + 1);
  };
  const decSub = () => {
    if (esEstaCardActual) return;
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

  const botonDeshabilitado = esEstaCardActual || disabledPorCantidades;
  const textoBoton = esEstaCardActual
   ? "Tienes este plan actualmente"
   : (tieneConfigGuardada ? "Pagar configuración guardada" : "Seleccionar");

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
        <div className="px-6 pt-16 pb-6 md:px-7 md:pt-20 md:pb-7 flex flex-col h-full">
          {/* Título */}
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
                  disabled={esEstaCardActual}
                  title={esEstaCardActual ? "Este es tu plan activo" : ""}
                >
                  -
                </button>
                <div className="w-10 text-center font-semibold">
                  {nConexiones}
                </div>
                <button
                  className="px-2 py-1 border border-slate-300 rounded-md"
                  onClick={incCon}
                  disabled={esEstaCardActual}
                  title={esEstaCardActual ? "Este es tu plan activo" : ""}
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
                  disabled={esEstaCardActual}
                  title={esEstaCardActual ? "Este es tu plan activo" : ""}
                >
                  -
                </button>
                <div className="w-10 text-center font-semibold">
                  {maxSubusuarios}
                </div>
                <button
                  className="px-2 py-1 border border-slate-300 rounded-md"
                  onClick={incSub}
                  disabled={esEstaCardActual}
                  title={esEstaCardActual ? "Este es tu plan activo" : ""}
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
              disabled={botonDeshabilitado}
              className={`w-full inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                esEstaCardActual
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : disabledPorCantidades
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "bg-[#171931] text-white hover:-translate-y-[2px] hover:shadow-lg active:translate-y-0"
              }`}
            >
              {textoBoton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function clamp(n, min, max) {
  const x = Number.isFinite(n) ? n : min;
  return Math.max(min, Math.min(max, x));
}
