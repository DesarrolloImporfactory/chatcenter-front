import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import { FaFilePdf, FaSyncAlt, FaArrowRight, FaExclamationCircle } from "react-icons/fa";

const MiPlan = () => {
  const [plan, setPlan] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cargandoFacturas, setCargandoFacturas] = useState(false);

  

  const obtenerFacturas = async () => {
  try {
    setCargandoFacturas(true); // mostrar overlay
    const token = localStorage.getItem("token");
    const decoded = JSON.parse(atob(token.split(".")[1]));
    const id_usuario = decoded.id_usuario || decoded.id_users;

    const res = await chatApi.post("/stripe_plan/facturasUsuario", { id_usuario }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setFacturas(res.data.data || []);
  } catch (error) {
    console.error("Error al cargar facturas:", error);
    Swal.fire("Error", "No se pudieron cargar las facturas", "error");
  } finally {
    setCargandoFacturas(false); // ocultar overlay
  }
};


  const obtenerPlanActivo = async () => {
    try {
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_usuario = decoded.id_usuario || decoded.id_users;

      const res = await chatApi.post("/stripe_plan/obtenerSuscripcionActiva", { id_usuario }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data && res.data.plan) {
        setPlan(res.data.plan);
      } else {
        setPlan(null);
      }
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

      const res = await chatApi.post("/stripe_plan/cancelarSuscripcion", { id_usuario }, {
        headers: { Authorization: `Bearer ${token}` }
      });

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

  {cargandoFacturas && (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white text-black px-6 py-4 rounded-xl shadow-xl text-lg font-semibold animate-pulse">
        Cargando facturas...
      </div>
    </div>
  )}


  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 text-white">
      <div className="w-full max-w-5xl bg-[#20223e] rounded-3xl shadow-2xl p-6 sm:p-8 mt-8 animate-fade-in">
        <h2 className="text-3xl sm:text-4xl font-bold mb-8 text-center text-yellow-400">Tu Plan Actual</h2>

        {plan ? (
          <div className="relative bg-[#2d2f54] rounded-2xl border border-yellow-500 p-6 mb-8 shadow-xl">
            <div
              className="absolute top-0 right-0 bg-yellow-400 text-[#1b1e3b] text-xs font-bold px-4 py-1"
              style={{
                borderTopRightRadius: "0.75rem",
                borderBottomLeftRadius: "1rem",
                borderTopLeftRadius: 0
              }}
            >
              Activo
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold mb-1">{plan.nombre_plan}</h3>
            <p className="text-sm text-gray-300 mb-2">{plan.descripcion_plan || "Plan premium activo"}</p>

            {/* culminacion del plan y color en base a cuanto tiempo quede del plan */}
            {(() => {
              const diasRestantes = Math.ceil((new Date(plan.fecha_renovacion) - new Date()) / (1000 * 60 * 60 * 24));
              let color = "text-green-400";
              if (diasRestantes <= 5) color = "text-red-400";
              else if (diasRestantes <= 15) color = "text-yellow-400";

              return (
                <>
                  <p className={`text-sm font-medium mb-1 ${color}`}>
                    El plan culmina: {new Date(plan.fecha_renovacion).toLocaleDateString()} ({diasRestantes} días restantes)
                  </p>
                  <p className={`text-sm font-medium mb-3 ${color}`}>
                    Renovación: {new Date(plan.fecha_renovacion).toLocaleDateString()}
                  </p>
                </>
              );
            })()}
            {/* mensaje de muestra cuando ya caduca el plan */}
            {plan.estado === 'inactivo' && (
              <div className="mt-2 mb-4 p-3 rounded-md bg-red-500 bg-opacity-20 text-red-300 font-semibold text-sm border border-red-400">
                Este plan ha caducado y ya no está activo.
              </div>
            )}




            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => window.location.href = "/planes_view"}
                className="flex items-center justify-center gap-2 bg-yellow-400 text-[#1b1e3b] font-semibold px-5 py-2 rounded-full hover:bg-yellow-300 transition w-full sm:w-auto"
              >
                Cambiar plan <FaArrowRight />
              </button>

              <button
                onClick={cancelarSuscripcion}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2 rounded-full transition disabled:opacity-50 w-full sm:w-auto"
              >
                <FaExclamationCircle /> {loading ? "Cancelando..." : "Cancelar suscripción"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-300 text-center mb-6">No tienes un plan activo.</p>
        )}

        <div className="flex justify-center mb-6">
          <button
            onClick={obtenerFacturas}
            disabled={cargandoFacturas}
            className={`flex items-center gap-2 font-semibold px-5 py-2 rounded-md transition 
              ${cargandoFacturas ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            <FaSyncAlt className={cargandoFacturas ? "animate-spin" : ""} />
            {cargandoFacturas ? "Actualizando..." : "Actualizar historial de facturas"}
          </button>

        </div>

        {facturas.length > 0 && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-3 text-yellow-400">Facturas recientes</h4>
            <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {facturas.map((f) => (
                <div key={f.id} className="bg-[#1f213c] p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="mb-2 sm:mb-0">
                    <p className="text-sm">{new Date(f.created * 1000).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400">USD ${(f.amount_paid / 100).toFixed(2)}</p>
                  </div>
                  <a
                    href={f.hosted_invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 hover:underline flex items-center gap-2 text-sm"
                  >
                    <FaFilePdf /> Ver PDF
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MiPlan;
