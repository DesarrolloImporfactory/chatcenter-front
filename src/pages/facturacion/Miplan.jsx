// src/views/plan.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import {
  FaFilePdf,
  FaSyncAlt,
  FaExclamationCircle,
  FaCreditCard,
  FaExternalLinkAlt,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaCogs,
} from "react-icons/fa";

const MiPlan = () => {
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [cargandoFacturas, setCargandoFacturas] = useState(false);

  // overlay para portales
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingGestion, setLoadingGestion] = useState(false);
  const [loadingAgregar, setLoadingAgregar] = useState(false);

  const token = useMemo(() => localStorage.getItem("token"), []);

  const getIdUsuarioFromToken = useCallback(() => {
    if (!token) return null;
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      return decoded.id_usuario || decoded.id_users || null;
    } catch {
      return null;
    }
  }, [token]);

  const overlayTexto = loadingPortal
    ? "Abriendo portal de suscripción..."
    : loadingGestion
      ? "Abriendo portal de métodos..."
      : "Preparando flujo para agregar tarjeta...";

  const fmtMoney = (cents) => `USD ${(Number(cents || 0) / 100).toFixed(2)}`;

  const obtenerPlanActivo = useCallback(async () => {
    try {
      setLoadingPlan(true);
      const id_usuario = getIdUsuarioFromToken();
      if (!id_usuario) {
        setPlan(null);
        return;
      }

      const res = await chatApi.post(
        "/stripe_plan/obtenerSuscripcionActiva",
        { id_usuario },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setPlan(res.data?.plan || null);
    } catch (error) {
      console.error("Error al obtener plan activo:", error);
      setPlan(null);
    } finally {
      setLoadingPlan(false);
    }
  }, [getIdUsuarioFromToken, token]);

  const obtenerFacturas = useCallback(async () => {
    try {
      setCargandoFacturas(true);
      const id_usuario = getIdUsuarioFromToken();
      if (!id_usuario) {
        setFacturas([]);
        return;
      }

      const res = await chatApi.post(
        "/stripe_plan/facturasUsuario",
        { id_usuario },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setFacturas(res.data?.data || []);
    } catch (error) {
      console.error("Error al cargar facturas:", error);
      Swal.fire("Error", "No se pudieron cargar las facturas", "error");
    } finally {
      setCargandoFacturas(false);
    }
  }, [getIdUsuarioFromToken, token]);

  const abrirPortalCliente = async () => {
    if (!token) {
      Swal.fire("Sesión requerida", "Inicie sesión para continuar.", "info");
      return;
    }
    try {
      setLoadingPortal(true);
      const id_usuario = getIdUsuarioFromToken();
      const return_url = `${window.location.origin}/plan`;

      const res = await chatApi.post(
        "/stripe_plan/portalCliente",
        { id_usuario, return_url },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      throw new Error("No se recibió URL del portal.");
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo abrir el portal de suscripción.", "error");
      setLoadingPortal(false);
    }
  };

  /**
   *  Cancelar suscripción
   * Regla: si ya está programada la cancelación (cancel_at_period_end === 1), NO permitir cancelar otra vez.
   */
  const cancelarSuscripcion = async () => {
    const cancelProgramada =
      Number(plan?.cancel_at_period_end || 0) === 1 ||
      Boolean(plan?.cancel_at_period_end);

    if (cancelProgramada) {
      Swal.fire({
        icon: "info",
        title: "Cancelación ya programada",
        text: "Su suscripción ya tiene cancelación programada. Seguirá activa hasta el final del periodo actual.",
        confirmButtonText: "Entendido",
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "¿Cancelar suscripción?",
      text: "Su plan seguirá activo hasta el final del periodo actual.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "Volver",
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;

    try {
      const id_usuario = getIdUsuarioFromToken();
      if (!id_usuario) return;

      const res = await chatApi.post(
        "/stripe_plan/cancelarSuscripcion",
        { id_usuario },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      Swal.fire(
        "Cancelado",
        res.data?.message || "Suscripción cancelada.",
        "success",
      );
      await obtenerPlanActivo();
      await obtenerFacturas();
    } catch (error) {
      console.error("Error al cancelar:", error);
      Swal.fire("Error", "No se pudo cancelar la suscripción", "error");
    }
  };

  const abrirPortalGestionMetodos = async () => {
    if (!token) return;
    if (loadingAgregar) return;

    try {
      setLoadingGestion(true);
      const id_usuario = getIdUsuarioFromToken();

      const res = await chatApi.post(
        "/stripe_plan/portalGestionMetodos",
        { id_usuario },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      throw new Error("No se recibió URL de gestión.");
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo abrir el portal de métodos.", "error");
      setLoadingGestion(false);
    }
  };

  const abrirPortalAddPaymentMethod = async () => {
    if (!token) return;
    if (loadingGestion) return;

    try {
      setLoadingAgregar(true);
      const id_usuario = getIdUsuarioFromToken();

      const res = await chatApi.post(
        "/stripe_plan/portalAddPaymentMethod",
        { id_usuario },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      throw new Error("No se recibió URL de agregar método.");
    } catch (e) {
      console.error(e);
      Swal.fire(
        "Error",
        "No se pudo iniciar el flujo para agregar tarjeta.",
        "error",
      );
      setLoadingAgregar(false);
    }
  };

  // Manejo de retornos
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const addpm = params.get("addpm");
    const pmSaved = params.get("pm_saved");
    const setupOk = params.get("setup");

    const limpiar = (keys) => {
      const url = new URL(window.location.href);
      keys.forEach((k) => url.searchParams.delete(k));
      window.history.replaceState(
        {},
        document.title,
        url.pathname + (url.search || ""),
      );
    };

    if (pmSaved === "1" || setupOk === "ok") {
      Swal.fire("Listo", "Tarjeta guardada correctamente.", "success");
      limpiar(["pm_saved", "setup"]);
    }

    if (addpm === "1") {
      Swal.fire(
        "Listo",
        "Su suscripción fue procesada. Sincronizando datos…",
        "success",
      );
      limpiar(["addpm"]);
    }
  }, []);

  useEffect(() => {
    obtenerPlanActivo();
    obtenerFacturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estadoChip = useMemo(() => {
    const est = (plan?.estado || "").toLowerCase();
    if (!plan)
      return {
        text: "Sin plan",
        dot: "bg-slate-600",
        cls: "bg-slate-100 text-slate-700 border-slate-200",
      };
    if (est.includes("activo"))
      return {
        text: "Activo",
        dot: "bg-emerald-600",
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    if (est.includes("trial"))
      return {
        text: "Prueba activa",
        dot: "bg-sky-600",
        cls: "bg-sky-50 text-sky-700 border-sky-200",
      };
    if (est.includes("cancel"))
      return {
        text: "Cancelado",
        dot: "bg-slate-700",
        cls: "bg-slate-100 text-slate-700 border-slate-200",
      };
    if (est.includes("suspend"))
      return {
        text: "Suspendido",
        dot: "bg-amber-600",
        cls: "bg-amber-50 text-amber-700 border-amber-200",
      };
    if (est.includes("inactivo"))
      return {
        text: "Inactivo",
        dot: "bg-red-600",
        cls: "bg-red-50 text-red-700 border-red-200",
      };
    return {
      text: plan.estado || "Estado",
      dot: "bg-slate-600",
      cls: "bg-slate-100 text-slate-700 border-slate-200",
    };
  }, [plan]);

  const infoPeriodo = useMemo(() => {
    if (!plan?.fecha_renovacion) return null;

    const hoy = new Date();
    const fin = new Date(plan.fecha_renovacion);

    const diasRestantesRaw = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
    const diasRestantes = Math.max(0, diasRestantesRaw);

    let tone = "text-emerald-700";
    if (diasRestantes === 0) tone = "text-red-700";
    else if (diasRestantes <= 5) tone = "text-red-700";
    else if (diasRestantes <= 15) tone = "text-amber-700";

    const inicioPeriodo = new Date(fin);
    inicioPeriodo.setMonth(inicioPeriodo.getMonth() - 1);

    const totalMs = fin - inicioPeriodo;

    // Si ya venció, mostramos 100%
    if (fin <= hoy) {
      return { fin, diasRestantes, tone, porcentaje: 100, vencido: true };
    }

    const transcurridoMs = Math.min(Math.max(hoy - inicioPeriodo, 0), totalMs);
    const porcentaje =
      fin <= hoy
        ? 100
        : Math.max(
            0,
            Math.min(100, Math.round((transcurridoMs / totalMs) * 100)),
          );

    return { fin, diasRestantes, tone, porcentaje };
  }, [plan]);

  const cancelProgramada = useMemo(() => {
    return (
      Number(plan?.cancel_at_period_end || 0) === 1 ||
      !!plan?.cancel_at_period_end
    );
  }, [plan]);

  const fechaCancelProgramada = useMemo(() => {
    // Preferimos renovar/period end como fecha final del servicio
    if (!cancelProgramada) return null;
    if (plan?.fecha_renovacion) return new Date(plan.fecha_renovacion);
    if (plan?.cancel_at) return new Date(plan.cancel_at);
    return null;
  }, [cancelProgramada, plan]);

  const puedeCancelar = useMemo(() => {
    if (!plan) return false;
    if (cancelProgramada) return false;
    const est = (plan?.estado || "").toLowerCase();
    // si ya está cancelado definitivamente, tampoco
    if (est.includes("cancel")) return false;
    return true;
  }, [plan, cancelProgramada]);

  const requierePago = useMemo(() => {
    const est = (plan?.estado || "").toLowerCase();
    return (
      Boolean(plan?.id_plan) &&
      (est.includes("vencido") || est.includes("inactivo"))
    );
  }, [plan]);

  const renovarMismoPlan = async () => {
    if (!token) {
      Swal.fire("Sesión requerida", "Inicie sesión para continuar.", "info");
      return;
    }

    try {
      const id_usuario = getIdUsuarioFromToken();
      const id_plan = plan?.id_plan;

      if (!id_usuario || !id_plan) {
        Swal.fire("Error", "No se pudo detectar su plan actual.", "error");
        return;
      }

      const confirm = await Swal.fire({
        title: "Renovar plan",
        html: `
                <div style="text-align:left; line-height:1.4;">
                  <p style="margin:0 0 10px 0;">
                    Para continuar, se abrirá una página segura de pago y podrá renovar su plan.
                  </p>
                  <p style="margin:0;">
                    Si desea cambiarlo, vaya a <b>Administrar planes</b>.
                  </p>
                </div>
              `,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Continuar",
        cancelButtonText: "Cancelar",
        focusCancel: true,
      });

      if (!confirm.isConfirmed) return;

      const res = await chatApi.post(
        "/stripe_plan/crearSesionPago",
        { id_usuario, id_plan },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }

      throw new Error("No se recibió URL de pago.");
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo iniciar la renovación.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-3 md:px-6">
      {/* Overlay */}
      {(loadingPortal || loadingGestion || loadingAgregar) && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-2xl px-6 py-5 text-white shadow-2xl border border-white/10 bg-[#171931]">
            <div className="flex items-center gap-3">
              <FaSyncAlt className="animate-spin" />
              <span className="text-sm sm:text-base font-semibold">
                {overlayTexto}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor tipo "Departamentos" */}
      <div className="mx-auto w-[98%] xl:w-[97%] 2xl:w-[96%] m-3 md:m-6 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 flex flex-col min-h-[82vh] overflow-hidden">
        {/* Header */}
        <header className="relative isolate overflow-hidden">
          <div className="bg-[#171931] p-6 md:p-7 flex flex-col gap-5 rounded-t-2xl border-b border-white/10 shadow-[0_20px_60px_-40px_rgba(23,25,49,0.55)]">
            {/* Top row: título + acciones */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Planes y Facturación
                </h1>
                <p className="text-white/80 text-sm max-w-3xl">
                  Administre su suscripción, métodos de pago y consulte su
                  historial de facturación.
                </p>

                {/* Estado chip */}
                <div className="mt-3">
                  <span
                    className={[
                      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold border",
                      estadoChip.cls,
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "inline-block w-2 h-2 rounded-full",
                        estadoChip.dot,
                      ].join(" ")}
                    />
                    {estadoChip.text}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => navigate("/planes")}
                  className="inline-flex items-center gap-2 bg-white text-[#171931] hover:bg-white/90 active:bg-white/80 px-4 py-2.5 rounded-lg font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                >
                  <FaCogs />
                  Administrar planes
                </button>

                {requierePago && (
                  <button
                    onClick={renovarMismoPlan}
                    className="inline-flex items-center gap-2 bg-emerald-700 text-white hover:bg-emerald-600 px-4 py-2.5 rounded-lg font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-300"
                  >
                    <FaCreditCard />
                    Renovar plan
                  </button>
                )}

                <button
                  onClick={() => {
                    obtenerPlanActivo();
                    obtenerFacturas();
                  }}
                  className="inline-flex items-center gap-2 bg-white/10 text-white hover:bg-white/15 active:bg-white/20 px-4 py-2.5 rounded-lg font-semibold shadow-sm transition border border-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                >
                  <FaSyncAlt
                    className={
                      loadingPlan || cargandoFacturas ? "animate-spin" : ""
                    }
                  />
                  Refrescar
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="px-4 py-3 rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/15 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-white/70">
                  Plan actual
                </div>
                <div className="text-lg font-semibold text-white">
                  {loadingPlan ? "Cargando…" : plan?.nombre_plan || "Sin plan"}
                </div>
              </div>

              <div className="px-4 py-3 rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/15 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-white/70">
                  Renovación
                </div>
                <div className="text-lg font-semibold text-white">
                  {infoPeriodo?.fin
                    ? infoPeriodo.fin.toLocaleDateString()
                    : "—"}
                </div>
              </div>

              <div className="px-4 py-3 rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/15 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-white/70">
                  Días restantes
                </div>
                <div className="text-lg font-semibold text-white">
                  {infoPeriodo?.fin ? infoPeriodo.diasRestantes : "—"}
                </div>
              </div>

              <div className="px-4 py-3 rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/15 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-white/70">
                  Facturas
                </div>
                <div className="text-lg font-semibold text-white">
                  {cargandoFacturas
                    ? "Actualizando…"
                    : `${facturas?.length || 0}`}
                </div>
              </div>
            </div>

            {/* Aviso cancelación programada */}
            {cancelProgramada && (
              <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 text-amber-100 px-4 py-3 text-sm flex items-start gap-2">
                <FaExclamationCircle className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">Cancelación programada</p>
                  <p className="text-amber-100/80">
                    Su servicio seguirá activo hasta{" "}
                    <span className="font-semibold">
                      {fechaCancelProgramada
                        ? fechaCancelProgramada.toLocaleDateString()
                        : "el final del periodo"}
                    </span>
                    .
                  </p>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* CONTENIDO con padding interno (esto es lo que le faltaba) */}
        <div className="flex-1 min-h-0 p-4 md:p-6">
          {/* Grid principal */}
          <div className="grid grid-cols-1 2xl:grid-cols-[1.3fr_.7fr] gap-6">
            {/* Izquierda */}
            <div className="space-y-6 min-w-0">
              {/* Card Suscripción */}
              <div className="rounded-3xl border border-[#171931]/15 bg-[#171931] text-white shadow-[0_20px_60px_-40px_rgba(23,25,49,0.55)] overflow-hidden">
                <div className="px-6 sm:px-8 py-6 border-b border-white/10">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-white/80">
                        <FaCalendarAlt />
                        <span className="text-xs">Panel de suscripción</span>
                      </div>

                      <h2 className="mt-2 text-xl sm:text-2xl md:text-3xl font-black tracking-tight break-words">
                        {loadingPlan
                          ? "Cargando…"
                          : plan?.nombre_plan || "Sin plan activo"}
                      </h2>

                      <p className="mt-2 text-xs sm:text-sm text-white/70 max-w-3xl">
                        {plan?.descripcion_plan ||
                          "Seleccione un plan para activar su cuenta."}
                      </p>

                      {cancelProgramada && (
                        <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-amber-100 bg-amber-500/10 border border-amber-300/20 px-3 py-2 rounded-2xl">
                          <FaExclamationCircle />
                          <span>
                            Ya existe una cancelación programada. El servicio
                            seguirá activo hasta el final del periodo.
                          </span>
                        </div>
                      )}
                    </div>

                    <div
                      className="
                        flex flex-col sm:flex-row
                        sm:flex-nowrap
                        items-stretch sm:items-center
                        gap-2
                        w-full sm:w-auto
                      "
                    >
                      <button
                        onClick={abrirPortalCliente}
                        disabled={loadingPortal || !plan}
                        className={[
                          "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition border",
                          "w-full sm:w-auto", // ✅ en mobile ocupa ancho completo, en desktop no
                          !plan
                            ? "bg-white/10 text-white/60 border-white/10 cursor-not-allowed"
                            : "bg-white text-[#171931] border-white/10 hover:opacity-95",
                        ].join(" ")}
                      >
                        <FaExternalLinkAlt />
                        <span className="whitespace-nowrap">
                          Administrar suscripción
                        </span>
                      </button>

                      <button
                        onClick={cancelarSuscripcion}
                        disabled={!plan || !puedeCancelar}
                        title={
                          !plan
                            ? "No hay un plan activo."
                            : !puedeCancelar
                              ? "La cancelación ya está programada o el plan ya está cancelado."
                              : "Cancelar suscripción"
                        }
                        className={[
                          "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition border",
                          "w-full sm:w-auto", // ✅ mobile full, desktop auto
                          "min-w-[210px]", // ✅ evita que el botón se “encoga” y salte
                          !plan || !puedeCancelar
                            ? "bg-white/10 text-white/50 border-white/10 cursor-not-allowed"
                            : "bg-transparent text-white border-white/20 hover:bg-white/10",
                        ].join(" ")}
                      >
                        <FaExclamationCircle />
                        <span className="whitespace-nowrap">
                          {cancelProgramada
                            ? "Cancelación programada"
                            : "Cancelar"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-6 sm:px-8 py-6">
                  {/* Progreso */}
                  <div className="rounded-2xl border border-white/10 bg-white text-[#171931] p-5">
                    {infoPeriodo ? (
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                        <div>
                          <p className="text-[11px] text-[#171931]/60">
                            Renovación
                          </p>
                          <p className="mt-1 text-sm sm:text-base font-bold">
                            {infoPeriodo.fin.toLocaleDateString()}
                          </p>
                          <p
                            className={[
                              "mt-1 text-xs sm:text-sm font-semibold",
                              infoPeriodo.tone,
                            ].join(" ")}
                          >
                            {infoPeriodo.diasRestantes} días restantes
                          </p>
                        </div>

                        <div className="w-full lg:w-[420px]">
                          <div className="flex items-center justify-between text-[11px] text-[#171931]/60 mb-2">
                            <span>Progreso del periodo</span>
                            <span>{infoPeriodo.porcentaje}%</span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-[#171931]/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#171931]"
                              style={{
                                width: `${infoPeriodo.porcentaje}%`,
                                opacity: 0.95,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#171931]/70">
                        No hay información de renovación disponible todavía.
                      </p>
                    )}

                    <div className="mt-4 text-xs text-[#171931]/60">
                      Use{" "}
                      <span className="text-[#171931] font-semibold">
                        Administrar suscripción
                      </span>{" "}
                      para: cancelación, tarjetas, facturas y cambios de plan.
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={abrirPortalGestionMetodos}
                      disabled={!plan || loadingGestion || loadingAgregar}
                      className={[
                        "w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold border transition",
                        !plan
                          ? "bg-white/10 text-white/60 border-white/10 cursor-not-allowed"
                          : "bg-white text-[#171931] border-white/10 hover:opacity-95",
                      ].join(" ")}
                    >
                      <FaCreditCard />
                      Gestionar métodos de pago
                    </button>

                    <button
                      onClick={abrirPortalAddPaymentMethod}
                      disabled={!plan || loadingGestion || loadingAgregar}
                      className={[
                        "w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold border transition",
                        !plan
                          ? "bg-white/10 text-white/60 border-white/10 cursor-not-allowed"
                          : "bg-white text-[#171931] border-white/10 hover:opacity-95",
                      ].join(" ")}
                    >
                      <FaCreditCard />
                      Agregar método de pago
                    </button>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => navigate("/planes")}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold bg-white/10 hover:bg-white/15 border border-white/10 transition"
                    >
                      <FaCogs />
                      Ver / Administrar planes
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#171931]/10 bg-white/70 backdrop-blur px-5 py-4">
                <p className="text-xs text-[#171931]/70">
                  Para mayor control (cancelación, tarjetas, facturas y
                  cambios), utilice{" "}
                  <span className="text-[#171931] font-semibold">
                    Administrar suscripción
                  </span>
                  .
                </p>
              </div>
            </div>

            {/* Derecha */}
            <div className="min-w-0 rounded-3xl border border-[#171931]/15 bg-[#171931] text-white shadow-[0_20px_60px_-40px_rgba(23,25,49,0.55)] overflow-hidden">
              <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold">Facturación</h3>
                </div>

                <button
                  onClick={obtenerFacturas}
                  disabled={cargandoFacturas}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold border transition",
                    cargandoFacturas
                      ? "bg-white/10 text-white/60 border-white/10 cursor-not-allowed"
                      : "bg-white text-[#171931] border-white/10 hover:opacity-95",
                  ].join(" ")}
                >
                  <FaSyncAlt
                    className={cargandoFacturas ? "animate-spin" : ""}
                  />
                  {cargandoFacturas ? "Actualizando" : "Actualizar"}
                </button>
              </div>

              <div className="p-6">
                {facturas?.length ? (
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
                    {facturas.map((f) => {
                      const paid = Boolean(f.paid);
                      return (
                        <div
                          key={f.id}
                          className="rounded-2xl border border-white/10 bg-white/10 p-4 hover:bg-white/15 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold">
                                {new Date(
                                  (f.created || 0) * 1000,
                                ).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-white/70">
                                {fmtMoney(f.amount_paid)}
                              </p>

                              <div className="mt-2 inline-flex items-center gap-2 text-xs font-semibold">
                                {paid ? (
                                  <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-emerald-400/10 text-emerald-200 border border-emerald-400/20">
                                    <FaCheckCircle />
                                    Pagada
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-red-400/10 text-red-200 border border-red-400/20">
                                    <FaTimesCircle />
                                    Pendiente
                                  </span>
                                )}
                              </div>
                            </div>

                            {f.hosted_invoice_url ? (
                              <a
                                href={f.hosted_invoice_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold bg-white text-[#171931] hover:opacity-95 transition"
                              >
                                <FaFilePdf />
                                Ver factura
                              </a>
                            ) : (
                              <span className="text-xs text-white/50">
                                Sin enlace
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-6 grid place-items-center min-h-[260px]">
                    <p className="text-sm text-white/85">
                      Aún no hay facturas para mostrar.
                    </p>
                  </div>
                )}

                <button
                  onClick={abrirPortalCliente}
                  disabled={!plan}
                  className={[
                    "mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold border transition",
                    !plan
                      ? "bg-white/10 text-white/60 border-white/10 cursor-not-allowed"
                      : "bg-white text-[#171931] border-white/10 hover:opacity-95",
                  ].join(" ")}
                >
                  <FaExternalLinkAlt />
                  Ver todo en el portal
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiPlan;
