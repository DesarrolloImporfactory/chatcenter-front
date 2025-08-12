import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import { FaFilePdf, FaSyncAlt, FaArrowRight, FaExclamationCircle } from "react-icons/fa";

const MiPlan = () => {
  const [plan, setPlan] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cargandoFacturas, setCargandoFacturas] = useState(false);

  // Overlays SOLO para gestionar/agregar
  const [loadingGestion, setLoadingGestion] = useState(false);
  const [loadingAgregar, setLoadingAgregar] = useState(false);

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

      if (res.data && res.data.plan) setPlan(res.data.plan);
      else setPlan(null);
    } catch (error) {
      console.error("Error al obtener plan activo:", error);
      setPlan(null);
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

  useEffect(() => {
    obtenerPlanActivo();
    obtenerFacturas();
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

  // Texto dinámico del overlay (solo gestionar/agregar)
  const overlayTexto = loadingGestion
    ? "Abriendo portal de métodos..."
    : "Preparando flujo para agregar tarjeta...";

  return (
    <div className="min-h-screen w-full px-4 sm:px-6 lg:px-10 py-8 md:py-10 text-black bg-white [padding-bottom:env(safe-area-inset-bottom)]">
      {/* Overlay SOLO para gestionar/agregar */}
      {(loadingGestion || loadingAgregar) && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div
            className="rounded-2xl px-6 py-5 text-white shadow-2xl border border-[#c4bde4]/30"
            style={{ background: "linear-gradient(180deg, #4b3f72 0%, #322b4f 60%, #1f1a33 100%)" }}
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

      <div className="mx-auto w-full max-w-screen-2xl">
        {/* encabezado */}
        <div className="mb-6 md:mb-8 px-1 mt-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#3b3560]">
            Tu Plan Actual
          </h2>
          <p className="mt-2 text-[#5a547a] text-xs sm:text-sm">
            Administra tu suscripción y consulta tu historial de facturación.
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
                      <button
                        onClick={() => (window.location.href = "/planes_view")}
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
                            const { id_usuario, id_users } = JSON.parse(atob(token.split(".")[1]));
                            const res = await chatApi.post(
                              "/stripe_plan/portalGestionMetodos",
                              { id_usuario: id_usuario || id_users },
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                            window.location.href = res.data.url;
                          } catch (e) {
                            console.error(e);
                            Swal.fire("Error", "No se pudo abrir el portal de métodos.", "error");
                            setLoadingGestion(false);
                          }
                        }}
                        disabled={loadingGestion || loadingAgregar}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-sm font-semibold border border-[#c4bde4]/40 text-white transition focus:outline-none focus:ring-2 focus:ring-[#c4bde4]/50
                          ${loadingGestion || loadingAgregar ? "opacity-60 cursor-not-allowed" : "hover:bg-[#c4bde4]/10"}`}
                      >
                        {loadingGestion ? <FaSyncAlt className="animate-spin" /> : null}
                        Gestionar métodos de pago
                      </button>

                      {/* AGREGAR MÉTODO - con overlay */}
                      <button
                        onClick={async () => {
                          if (loadingGestion) return;
                          setLoadingAgregar(true);
                          try {
                            const token = localStorage.getItem("token");
                            const { id_usuario, id_users } = JSON.parse(atob(token.split(".")[1]));
                            const res = await chatApi.post(
                              "/stripe_plan/portalAddPaymentMethod",
                              { id_usuario: id_usuario || id_users },
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                            window.location.href = res.data.url;
                          } catch (e) {
                            console.error(e);
                            Swal.fire("Error", "No se pudo iniciar el flujo para agregar tarjeta.", "error");
                            setLoadingAgregar(false);
                          }
                        }}
                        disabled={loadingGestion || loadingAgregar}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-sm font-semibold text-emerald-300 transition focus:outline-none focus:ring-2 focus:ring-emerald-400/40
                          ${loadingGestion || loadingAgregar ? "opacity-60 cursor-not-allowed" : "hover:text-emerald-200 hover:bg-emerald-600/10"}`}
                      >
                        {loadingAgregar ? <FaSyncAlt className="animate-spin" /> : null}
                        Agregar método de pago
                      </button>
                    </div>
                  </div>

                  {/* info fechas */}
                  <div className="mt-6 sm:mt-8">
                    {(() => {
                      const hoy = new Date();
                      const fin = new Date(plan.fecha_renovacion);
                      const diasRestantes = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
                      let color = "text-emerald-400";
                      if (diasRestantes <= 5) color = "text-red-400";
                      else if (diasRestantes <= 15) color = "text-orange-400";

                      const inicioPeriodo = new Date(fin);
                      inicioPeriodo.setMonth(inicioPeriodo.getMonth() - 1);
                      const totalMs = fin - inicioPeriodo;
                      const transcurridoMs = Math.min(Math.max(hoy - inicioPeriodo, 0), totalMs);
                      const porcentaje = Math.max(0, Math.min(100, Math.round((transcurridoMs / totalMs) * 100)));

                      return (
                        <>
                          <p className={`text-xs sm:text-sm font-medium ${color}`}>
                            El plan culmina: {fin.toLocaleDateString()} ({diasRestantes} días restantes)
                          </p>
                          <p className={`text-xs sm:text-sm font-medium mt-1 ${color}`}>
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
                <div className="text-[#e0dcf3]">No tienes un plan activo.</div>
              )}
            </div>
          </div>

          {/* panel facturas */}
          <div className="xl:col-span-1">
            <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-b from-[#4b3f72] via-[#322b4f] to-[#1f1a33] text-white backdrop-blur-xl border border-[#c4bde4]/30 shadow-lg shadow-[#c4bde4]/10 hover:shadow-[0_0_25px_rgba(196,189,228,0.25)] transition-shadow duration-300 h-full xl:sticky xl:top-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h4 className="text-base sm:text-lg font-semibold text-white">Facturas</h4>
                <button
                  onClick={obtenerFacturas}
                  disabled={cargandoFacturas} // NO depende de loadingGestion/loadingAgregar
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#c4bde4]/50
                    ${cargandoFacturas
                      ? "bg-[#c4bde4]/40 cursor-not-allowed text-white"
                      : "bg-[#6d5cbf] hover:bg-[#5a4aa5] text-white"}`}
                >
                  <FaSyncAlt className={cargandoFacturas ? "animate-spin" : ""} />
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
                            {new Date(f.created * 1000).toLocaleDateString()}
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
                <p className="text-sm text-[#e0dcf3]">Aún no hay facturas para mostrar.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiPlan;
