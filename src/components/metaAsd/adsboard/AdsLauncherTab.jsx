import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";
import LauncherWizardModal from "./LauncherWizardModal";
import ReglasAutomaticas from "../../../pages/campanias/ReglasAutomaticas";

/**
 * AdsLauncherTab
 *
 * Tab "Lanzador" del Adsboard: el cliente guarda plantillas de campaña
 * (producto, presupuesto, alcance, creativo, mensaje) y las lanza con un
 * click en su cuenta publicitaria conectada. Cada lanzamiento crea el
 * paquete completo campaña + conjunto + creativo + anuncio CTWA.
 */

const GENERO_LABEL = { all: "Todos", male: "Hombres", female: "Mujeres" };

// Iconos SVG (trazo Lucide) para los botones de SweetAlert2, que acepta HTML
// en el texto de sus botones. Se usan en vez de emojis: se ven igual en todos
// los sistemas y no desentonan con los iconos del resto de la vista.
const swalIcon = (paths) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true"
        style="display:inline-block;vertical-align:-3px;margin-right:7px">${paths}</svg>`;
const ICON_ROCKET = swalIcon(
  '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>' +
    '<path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>' +
    '<path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>' +
    '<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
);
const ICON_PAUSE = swalIcon(
  '<rect x="14" y="4" width="4" height="16" rx="1"/>' +
    '<rect x="6" y="4" width="4" height="16" rx="1"/>',
);

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
  const [reglasOpen, setReglasOpen] = useState(false);

  // La moneda real de la cuenta publicitaria manda; el prop es el fallback
  // (accountData puede venir vacío si el período no tiene insights).
  const currency = contexto?.currency || currencyProp;

  // Las listas viven en la BD y cargan al instante; el contexto (páginas,
  // productos, moneda) pega a Meta y va aparte para no bloquear la vista.
  const [contextoCargando, setContextoCargando] = useState(true);

  const fetchTodo = useCallback(async () => {
    if (!id_configuracion) return;
    setLoading(true);
    try {
      const [plaRes, lanRes] = await Promise.all([
        chatApi.get("/meta_ads/launcher/plantillas", {
          params: { id_configuracion },
        }),
        chatApi.get("/meta_ads/launcher/lanzamientos", {
          params: { id_configuracion },
        }),
      ]);
      setPlantillas(plaRes.data?.success ? plaRes.data.data || [] : []);
      setLanzamientos(lanRes.data?.success ? lanRes.data.data || [] : []);
    } catch (err) {
      console.error("Launcher fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [id_configuracion]);

  const fetchContexto = useCallback(async () => {
    if (!id_configuracion) return;
    setContextoCargando(true);
    try {
      const { data } = await chatApi.get("/meta_ads/launcher/contexto", {
        params: { id_configuracion },
        silentError: true,
      });
      setContexto(data?.success ? data.data : null);
    } catch (err) {
      console.error("Launcher contexto error:", err);
    } finally {
      setContextoCargando(false);
    }
  }, [id_configuracion]);

  useEffect(() => {
    fetchTodo();
    fetchContexto();
  }, [fetchTodo, fetchContexto]);

  // El wizard necesita el contexto (páginas/productos); si aún viene en
  // camino se avisa en vez de abrir un modal a medias.
  const abrirWizard = (plantilla) => {
    if (!contexto) {
      if (contextoCargando) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "info",
          title: "Cargando datos de tu cuenta publicitaria...",
          showConfirmButton: false,
          timer: 1800,
        });
      } else {
        fetchContexto();
      }
      return;
    }
    setWizard({ plantilla });
  };

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
        if (r.isConfirmed) abrirWizard(p);
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
      confirmButtonText: `${ICON_ROCKET}Lanzar activa`,
      denyButtonText: `${ICON_PAUSE}Lanzar en pausa`,
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
    abrirWizard({ ...p, id: null, nombre: `${p.nombre} (copia)` });
  };

  // Activar/pausar la campaña completa de un lanzamiento (el porqué del
  // "en pausa": revisar en el Ads Manager sin gastar y prenderla desde aquí).
  const [togglingLanzamiento, setTogglingLanzamiento] = useState(null);
  const handleToggleCampania = async (l, status) => {
    setTogglingLanzamiento(l.id);
    try {
      const { data } = await chatApi.post("/meta_ads/campaigns/toggle", {
        id_configuracion,
        campaign_id: l.campaign_id,
        status,
      });
      if (data?.success) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title:
            status === "ACTIVE" ? "Campaña activada" : "Campaña pausada",
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Meta rechazó el cambio",
          text: data?.message || "Inténtalo de nuevo.",
          customClass: { popup: "rounded-2xl" },
        });
      }
    } catch (err) {
      console.error("Toggle campaña error:", err);
    } finally {
      setTogglingLanzamiento(null);
    }
  };

  // ── Estados de carga / sin conexión ──
  // Sin plantillas todavía no sabemos si toca el lanzador o el "conecta tu
  // cuenta" (eso lo dice el contexto, que tarda más): se sostiene el
  // skeleton para que no parpadee una pantalla y luego la otra.
  if (loading || (contextoCargando && plantillas.length === 0)) {
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
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {/* Hero navy con la línea de la marca */}
        <div className="relative overflow-hidden bg-[#171931] px-8 py-10 text-center">
          <div
            className="absolute inset-0 opacity-60"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(600px circle at 0% 0%, rgba(79,70,229,0.30), transparent 45%), radial-gradient(500px circle at 100% 120%, rgba(99,102,241,0.22), transparent 40%)",
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 ring-1 ring-white/15">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Campañas · Meta Ads
            </span>
            <h3 className="mt-3 text-2xl font-extrabold text-white tracking-tight">
              Lanza tus campañas{" "}
              <span className="bg-gradient-to-r from-indigo-300 to-blue-200 bg-clip-text text-transparent">
                sin salir de aquí
              </span>
            </h3>
            <p className="mt-2 text-sm text-white/60 max-w-lg mx-auto leading-relaxed">
              Campaña, segmentación, creativos y anuncio directo a tu WhatsApp
              — todo con un click, con reglas automáticas cuidando cada dólar.
            </p>
            <a
              href="/conexiones"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#171931] bg-white hover:bg-indigo-50 shadow-lg shadow-black/20 hover:-translate-y-0.5 transition-all"
            >
              <i className="bx bx-link text-lg text-[#4f46e5]" />
              Conectar mi cuenta publicitaria
            </a>
            <p className="mt-2.5 text-[10px] text-white/40">
              Se hace una sola vez, desde Conexiones · tarda menos de un minuto
            </p>
          </div>
        </div>

        {/* Qué desbloquea */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {[
            [
              "bx-rocket",
              "Lanza en minutos",
              "Plantillas listas: producto, presupuesto, zonas y hasta 6 creativos por campaña.",
            ],
            [
              "bx-shield-quarter",
              "Presupuesto protegido",
              "Reglas que apagan el anuncio que gasta sin vender y escalan el que sí.",
            ],
            [
              "bx-target-lock",
              "Atribución real",
              "Cada anuncio queda vinculado a tu producto: el bot sabe qué vendes desde el primer clic.",
            ],
          ].map(([icon, t, d]) => (
            <div key={t} className="px-6 py-5 text-center sm:text-left">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 ring-1 ring-indigo-100 grid place-items-center mx-auto sm:mx-0 mb-2.5">
                <i className={`bx ${icon} text-indigo-600 text-lg`} />
              </div>
              <p className="text-xs font-extrabold text-slate-800">{t}</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {d}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HEADER DEL TAB */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-blue-500" />
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
              onClick={() => setReglasOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 hover:bg-indigo-100 transition"
            >
              <i className="bx bx-shield-quarter text-sm" />
              Reglas automáticas
            </button>
            <button
              onClick={() => setShowHistorial((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
            >
              <i className="bx bx-history text-sm" />
              Historial ({lanzamientos.length})
            </button>
            <button
              onClick={() => abrirWizard(null)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow transition"
            >
              <i
                className={`bx ${contextoCargando ? "bx-loader-alt animate-spin" : "bx-plus"} text-sm`}
              />
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
                    <th className="px-3 py-2 font-semibold">Anuncios</th>
                    <th className="px-3 py-2 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lanzamientos.map((l) => {
                    let nAds = l.ad_id ? 1 : 0;
                    try {
                      const arr = l.ads_json ? JSON.parse(l.ads_json) : null;
                      if (Array.isArray(arr) && arr.length) nAds = arr.length;
                    } catch {
                      /* un solo anuncio como fallback */
                    }
                    return (
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
                        {nAds > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold">
                            {nAds} {nAds === 1 ? "anuncio" : "anuncios"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {l.resultado === "ok" && l.campaign_id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleCampania(l, "ACTIVE")}
                              disabled={togglingLanzamiento === l.id}
                              title="Activar campaña"
                              className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 ring-1 ring-emerald-100 hover:bg-emerald-100 transition disabled:opacity-50"
                            >
                              <i
                                className={`bx ${togglingLanzamiento === l.id ? "bx-loader-alt animate-spin" : "bx-play"}`}
                              />
                            </button>
                            <button
                              onClick={() => handleToggleCampania(l, "PAUSED")}
                              disabled={togglingLanzamiento === l.id}
                              title="Pausar campaña"
                              className="p-1.5 rounded-lg text-amber-600 bg-amber-50 ring-1 ring-amber-100 hover:bg-amber-100 transition disabled:opacity-50"
                            >
                              <i className="bx bx-pause" />
                            </button>
                            <a
                              href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=${l.campaign_id}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Ver en el Ads Manager"
                              className="p-1.5 rounded-lg text-slate-500 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
                            >
                              <i className="bx bx-link-external" />
                            </a>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                    );
                  })}
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
            onClick={() => abrirWizard(null)}
            className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition"
          >
            <i className="bx bx-plus text-lg" />
            Crear mi primera plantilla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plantillas.map((p) => {
            const incompleta = (p.faltantes || []).length > 0;
            let geoLabel = p.paises;
            try {
              const g = p.geo_json ? JSON.parse(p.geo_json) : null;
              if (g?.modo === "especifico" && g.lugares?.length) {
                geoLabel = `${g.lugares.length} zona${g.lugares.length > 1 ? "s" : ""} · ${(g.paises || []).join(",")}`;
              }
            } catch {
              /* CSV de países como fallback */
            }
            let nCreativos = p.imagen_hash ? 1 : 0;
            try {
              const imgs = p.imagenes_json ? JSON.parse(p.imagenes_json) : null;
              if (Array.isArray(imgs) && imgs.length) nCreativos = imgs.length;
            } catch {
              /* una sola imagen como fallback */
            }
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
                      {geoLabel}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-50 ring-1 ring-slate-200 text-slate-600">
                      {p.edad_min}-{p.edad_max} · {GENERO_LABEL[p.genero] || "Todos"}
                    </span>
                    {nCreativos > 1 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 ring-1 ring-blue-200 text-blue-600">
                        {nCreativos} creativos
                      </span>
                    )}
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
                    onClick={() => abrirWizard(p)}
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

      {/* REGLAS AUTOMÁTICAS (modal) */}
      {reglasOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3">
          <div className="w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl bg-slate-50 shadow-2xl overflow-hidden">
            <div className="bg-[#171931] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/15 grid place-items-center">
                  <i className="bx bx-shield-quarter" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold leading-tight">
                    Reglas automáticas
                  </h3>
                  <p className="text-[10px] text-white/60">
                    Corta lo que no vende y escala lo que sí — solo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReglasOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition"
              >
                <i className="bx bx-x text-xl" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
              <ReglasAutomaticas id_configuracion={id_configuracion} />
            </div>
          </div>
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
