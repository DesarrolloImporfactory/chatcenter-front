import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";
import LauncherWizardModal from "./LauncherWizardModal";

/**
 * AdsLauncherTab
 *
 * Tab "Lanzador" del Adsboard: el cliente guarda plantillas de campaña
 * (producto, presupuesto, alcance, creativo, mensaje) y las lanza con un
 * click en su cuenta publicitaria conectada. Cada lanzamiento crea el
 * paquete completo campaña + conjunto + creativo + anuncio CTWA.
 */

const GENERO_LABEL = { all: "Todos", male: "Hombres", female: "Mujeres" };

const fmtFecha = (v) => {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("es-EC", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(v);
  }
};

const AdsLauncherTab = ({ id_configuracion, currency: currencyProp = "USD" }) => {
  const [contexto, setContexto] = useState(null);
  const [plantillas, setPlantillas] = useState([]);
  const [lanzamientos, setLanzamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lanzandoId, setLanzandoId] = useState(null);
  const [wizard, setWizard] = useState(null); // null | { plantilla: obj|null }
  const [showHistorial, setShowHistorial] = useState(false);

  // La moneda real de la cuenta publicitaria manda; el prop es el fallback
  // (accountData puede venir vacío si el período no tiene insights).
  const currency = contexto?.currency || currencyProp;

  const fetchTodo = useCallback(async () => {
    if (!id_configuracion) return;
    setLoading(true);
    try {
      const [ctxRes, plaRes, lanRes] = await Promise.all([
        chatApi.get("/meta_ads/launcher/contexto", {
          params: { id_configuracion },
        }),
        chatApi.get("/meta_ads/launcher/plantillas", {
          params: { id_configuracion },
        }),
        chatApi.get("/meta_ads/launcher/lanzamientos", {
          params: { id_configuracion },
        }),
      ]);
      setContexto(ctxRes.data?.success ? ctxRes.data.data : null);
      setPlantillas(plaRes.data?.success ? plaRes.data.data || [] : []);
      setLanzamientos(lanRes.data?.success ? lanRes.data.data || [] : []);
    } catch (err) {
      console.error("Launcher fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [id_configuracion]);

  useEffect(() => {
    fetchTodo();
  }, [fetchTodo]);

  const handleLanzar = async (p) => {
    if (p.faltantes?.length) {
      Swal.fire({
        icon: "warning",
        title: "Plantilla incompleta",
        html: `Antes de lanzar completa: <strong>${p.faltantes.join(", ")}</strong>.`,
        confirmButtonText: "Editar plantilla",
        showCancelButton: true,
        cancelButtonText: "Cerrar",
        customClass: { popup: "rounded-2xl" },
      }).then((r) => {
        if (r.isConfirmed) setWizard({ plantilla: p });
      });
      return;
    }

    const r = await Swal.fire({
      title: `¿Lanzar "${p.nombre}"?`,
      html: `Se creará en tu cuenta publicitaria la campaña completa
        (campaña + conjunto + anuncio) con presupuesto de
        <strong>${Number(p.presupuesto_diario).toFixed(2)} ${currency}/día</strong>.`,
      icon: "question",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "🚀 Lanzar activa",
      denyButtonText: "Lanzar en pausa",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#059669",
      denyButtonColor: "#f59e0b",
      customClass: { popup: "rounded-2xl" },
    });
    if (r.isDismissed) return;

    const estado = r.isConfirmed ? "ACTIVE" : "PAUSED";
    setLanzandoId(p.id);
    try {
      const { data } = await chatApi.post("/meta_ads/launcher/lanzar", {
        id_configuracion,
        id_plantilla: p.id,
        estado,
      });
      if (data?.success) {
        await Swal.fire({
          icon: "success",
          title: estado === "ACTIVE" ? "¡Campaña lanzada!" : "Campaña creada en pausa",
          html: `Anuncio creado con ID <code>${data.data.ad_id}</code>.<br/>
            <a href="${data.data.ads_manager_url}" target="_blank" rel="noreferrer"
               style="color:#4f46e5;font-weight:600;">Verla en el Ads Manager →</a>`,
          confirmButtonText: "Listo",
          customClass: { popup: "rounded-2xl" },
        });
        fetchTodo();
      } else {
        Swal.fire({
          icon: "error",
          title: "Meta rechazó el lanzamiento",
          text: data?.message || "Inténtalo de nuevo.",
          customClass: { popup: "rounded-2xl" },
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          err?.response?.data?.message ||
          "No se pudo lanzar la campaña. Inténtalo de nuevo.",
        customClass: { popup: "rounded-2xl" },
      });
    } finally {
      setLanzandoId(null);
    }
  };

  const handleEliminar = async (p) => {
    const r = await Swal.fire({
      title: `¿Eliminar "${p.nombre}"?`,
      text: "Las campañas ya lanzadas en Meta no se tocan; solo se borra la plantilla.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      customClass: { popup: "rounded-2xl" },
    });
    if (!r.isConfirmed) return;
    try {
      await chatApi.post("/meta_ads/launcher/plantillas/eliminar", {
        id: p.id,
        id_configuracion,
      });
      fetchTodo();
    } catch (err) {
      console.error("Eliminar plantilla error:", err);
    }
  };

  const handleDuplicar = (p) => {
    setWizard({
      plantilla: { ...p, id: null, nombre: `${p.nombre} (copia)` },
    });
  };

  // ── Estados de carga / sin conexión ──
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center">
        <div className="flex justify-center gap-1 mb-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-600"
              style={{ animation: `pulse 1.2s infinite ${i * 0.2}s` }}
            />
          ))}
        </div>
        <p className="text-sm font-semibold text-slate-700">
          Cargando tus plantillas de campaña...
        </p>
        <style>{`@keyframes pulse { 0%,100% { opacity:0.2; transform:scale(0.8); } 50% { opacity:1; transform:scale(1.2); } }`}</style>
      </div>
    );
  }

  if (contexto && !contexto.conectado) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-8 py-14 text-center">
        <i className="bx bx-plug text-4xl text-slate-300 mb-3" />
        <h3 className="text-sm font-bold text-slate-600 mb-1">
          Conecta tu cuenta publicitaria
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Para lanzar campañas con un click necesitas conectar Meta Ads en la
          sección Conexiones.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HEADER DEL TAB */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-violet-500" />
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 ring-1 ring-indigo-200 grid place-items-center">
              <i className="bx bx-rocket text-xl text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">
                Lanzador de campañas
              </h3>
              <p className="text-[11px] text-slate-500">
                Configura una vez, lanza con un click: campaña + conjunto +
                anuncio directo a tu WhatsApp.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistorial((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
            >
              <i className="bx bx-history text-sm" />
              Historial ({lanzamientos.length})
            </button>
            <button
              onClick={() => setWizard({ plantilla: null })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow transition"
            >
              <i className="bx bx-plus text-sm" />
              Nueva plantilla
            </button>
          </div>
        </div>
      </div>

      {/* HISTORIAL */}
      {showHistorial && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 text-xs font-bold text-slate-700">
            Últimos lanzamientos
          </div>
          {lanzamientos.length === 0 ? (
            <p className="px-5 py-6 text-xs text-slate-400 text-center">
              Todavía no has lanzado ninguna campaña desde aquí.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="px-5 py-2 font-semibold">Fecha</th>
                    <th className="px-3 py-2 font-semibold">Plantilla</th>
                    <th className="px-3 py-2 font-semibold">Resultado</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                    <th className="px-3 py-2 font-semibold">Presupuesto</th>
                    <th className="px-3 py-2 font-semibold">Anuncio</th>
                  </tr>
                </thead>
                <tbody>
                  {lanzamientos.map((l) => (
                    <tr key={l.id} className="border-b border-slate-50">
                      <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">
                        {fmtFecha(l.created_at)}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-700">
                        {l.plantilla_nombre || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {l.resultado === "ok" ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                            OK
                          </span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold cursor-help"
                            title={l.error_meta || ""}
                          >
                            Error
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {l.estado_inicial}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                        {l.presupuesto_diario
                          ? `${Number(l.presupuesto_diario).toFixed(2)} ${currency}/día`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {l.ad_id ? (
                          <span className="font-mono text-slate-600">
                            {l.ad_id}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PLANTILLAS */}
      {plantillas.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-14 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 ring-1 ring-indigo-200 grid place-items-center mb-5">
            <i className="bx bx-rocket text-3xl text-indigo-600" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-800 mb-2">
            Lanza tu primera campaña en minutos
          </h3>
          <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Crea una plantilla con tu producto, presupuesto, alcance y creativo.
            Después la lanzas cuantas veces quieras con un solo click, y la
            atribución al producto queda conectada automáticamente.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {[
              "Presupuesto y países",
              "Imagen + copy del anuncio",
              "Mensaje de WhatsApp",
              "Atribución automática",
            ].map((f) => (
              <span
                key={f}
                className="px-3 py-1 rounded-full text-[11px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200"
              >
                {f}
              </span>
            ))}
          </div>
          <button
            onClick={() => setWizard({ plantilla: null })}
            className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg transition"
          >
            <i className="bx bx-plus text-lg" />
            Crear mi primera plantilla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plantillas.map((p) => {
            const incompleta = (p.faltantes || []).length > 0;
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col"
              >
                {/* Imagen */}
                <div className="h-36 bg-slate-100 relative">
                  {p.imagen_url ? (
                    <img
                      src={p.imagen_url}
                      alt={p.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-slate-300">
                      <i className="bx bx-image text-4xl" />
                    </div>
                  )}
                  <span
                    className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      incompleta
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {incompleta ? "Incompleta" : "Lista para lanzar"}
                  </span>
                </div>

                {/* Cuerpo */}
                <div className="px-4 py-3 flex-1">
                  <h4 className="text-sm font-extrabold text-slate-800 truncate">
                    {p.nombre}
                  </h4>
                  {p.producto_nombre && (
                    <p className="text-[11px] text-indigo-600 font-semibold truncate mt-0.5">
                      <i className="bx bx-box mr-1" />
                      {p.producto_nombre}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2.5 text-[10px] font-semibold">
                    <span className="px-2 py-0.5 rounded-full bg-slate-50 ring-1 ring-slate-200 text-slate-600">
                      {Number(p.presupuesto_diario).toFixed(2)} {currency}/día
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-50 ring-1 ring-slate-200 text-slate-600">
                      {p.paises}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-50 ring-1 ring-slate-200 text-slate-600">
                      {p.edad_min}-{p.edad_max} · {GENERO_LABEL[p.genero] || "Todos"}
                    </span>
                  </div>
                  {Number(p.veces_lanzada) > 0 && (
                    <p className="text-[10px] text-slate-400 mt-2">
                      Lanzada {p.veces_lanzada}{" "}
                      {Number(p.veces_lanzada) === 1 ? "vez" : "veces"} · última{" "}
                      {fmtFecha(p.ultimo_lanzamiento_at)}
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => handleLanzar(p)}
                    disabled={lanzandoId === p.id}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-60 ${
                      incompleta
                        ? "bg-slate-400"
                        : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                    }`}
                  >
                    {lanzandoId === p.id ? (
                      <>
                        <i className="bx bx-loader-alt animate-spin" />
                        Lanzando...
                      </>
                    ) : (
                      <>
                        <i className="bx bx-rocket" />
                        Lanzar
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setWizard({ plantilla: p })}
                    title="Editar"
                    className="p-2 rounded-xl text-slate-500 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
                  >
                    <i className="bx bx-edit-alt" />
                  </button>
                  <button
                    onClick={() => handleDuplicar(p)}
                    title="Duplicar"
                    className="p-2 rounded-xl text-slate-500 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
                  >
                    <i className="bx bx-copy" />
                  </button>
                  <button
                    onClick={() => handleEliminar(p)}
                    title="Eliminar"
                    className="p-2 rounded-xl text-rose-500 bg-rose-50 ring-1 ring-rose-100 hover:bg-rose-100 transition"
                  >
                    <i className="bx bx-trash" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WIZARD */}
      {wizard && (
        <LauncherWizardModal
          id_configuracion={id_configuracion}
          contexto={contexto}
          currency={currency}
          plantilla={wizard.plantilla}
          onClose={(refrescar) => {
            setWizard(null);
            if (refrescar) fetchTodo();
          }}
        />
      )}
    </div>
  );
};

export default AdsLauncherTab;
