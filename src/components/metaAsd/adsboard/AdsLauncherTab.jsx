import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";
import LauncherWizardModal, { AdPreview } from "./LauncherWizardModal";
import MediaLightbox from "./MediaLightbox";
import { creativosDePlantilla } from "./adsMedia";
import ReglasAutomaticas from "../../../pages/campanias/ReglasAutomaticas";
import CampaniasCuenta, {
  EstadoBadge,
  fmtMoney,
  fmtNum,
} from "./CampaniasCuenta";

/**
 * AdsLauncherTab — centro de campañas de /anuncios.
 *
 * Tres capas en una sola pantalla, sin tabs:
 *  1. Resumen del período (activas, gasto, mensajes, costo por mensaje).
 *  2. Plantillas: cada card refleja el estado REAL de lo que generó (en vivo,
 *     pausada, nunca lanzada) en vez de ofrecer "Lanzar" a ciegas.
 *  3. Campañas en la cuenta: todo lo vivo en Meta (creadas aquí o en el Ads
 *     Manager) con métricas, pausar/activar y detalle de anuncios. Es lo que
 *     las reglas automáticas pueden cuidar.
 * La bitácora de lanzamientos (incluidos los fallidos) se abre en un modal
 * desde la barra superior, sin bajar hasta el final de la página.
 */

const GENERO_LABEL = { all: "Todos", male: "Hombres", female: "Mujeres" };

// Mismos presets y MISMO cálculo de fechas que conexion-dashboard?view=ads
// (AdsboardFilters): desde hace N días hasta hoy, hoy incluido. Así el gasto
// de las dos vistas cuadra al centavo.
const PERIODOS = [
  { id: "hoy", label: "Hoy", dias: 0, texto: "hoy" },
  { id: "7d", label: "7 días", dias: 7, texto: "últimos 7 días" },
  { id: "15d", label: "15 días", dias: 15, texto: "últimos 15 días" },
  { id: "30d", label: "30 días", dias: 30, texto: "últimos 30 días" },
];
const PERIODO_LABEL = Object.fromEntries(PERIODOS.map((p) => [p.id, p.texto]));
const PERIODO_KEY = "anuncios_periodo";

const fechaISO = (diasAtras = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const rangoDePeriodo = (id) => {
  const p = PERIODOS.find((x) => x.id === id) || PERIODOS[1];
  return { since: fechaISO(p.dias), until: fechaISO(0) };
};

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
  const [bitacoraOpen, setBitacoraOpen] = useState(false);
  const [reglasOpen, setReglasOpen] = useState(false);

  // Campañas reales de la cuenta (Meta) para el período elegido.
  const [periodo, setPeriodo] = useState(() => {
    try {
      const v = localStorage.getItem(PERIODO_KEY);
      return PERIODOS.some((p) => p.id === v) ? v : "7d";
    } catch {
      return "7d";
    }
  });
  const [cuenta, setCuenta] = useState(null); // { campanias, resumen, ... }
  const [cuentaCargando, setCuentaCargando] = useState(true);
  const [cuentaError, setCuentaError] = useState(null);
  const [filtroPlantilla, setFiltroPlantilla] = useState(null);
  const campaniasRef = useRef(null);
  const plantillasRef = useRef(null);

  // La moneda real de la cuenta publicitaria manda; el prop es el fallback
  // (accountData puede venir vacío si el período no tiene insights).
  const currency = cuenta?.currency || contexto?.currency || currencyProp;

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

  const fetchCuenta = useCallback(
    async (per = periodo) => {
      if (!id_configuracion) return;
      setCuentaCargando(true);
      setCuentaError(null);
      try {
        const { data } = await chatApi.get("/meta_ads/launcher/campanias", {
          params: { id_configuracion, ...rangoDePeriodo(per) },
          silentError: true,
        });
        if (data?.success) setCuenta(data.data);
        else setCuentaError(data?.message || "Meta no respondió.");
      } catch (err) {
        setCuentaError(
          err?.response?.data?.message || "No se pudieron leer las campañas.",
        );
      } finally {
        setCuentaCargando(false);
      }
    },
    [id_configuracion, periodo],
  );

  useEffect(() => {
    fetchTodo();
    fetchContexto();
  }, [fetchTodo, fetchContexto]);

  useEffect(() => {
    fetchCuenta(periodo);
  }, [fetchCuenta, periodo]);

  const cambiarPeriodo = (p) => {
    setPeriodo(p);
    try {
      localStorage.setItem(PERIODO_KEY, p);
    } catch {
      /* sin persistencia */
    }
  };

  // Campañas vivas agrupadas por plantilla: es lo que decide qué muestra
  // cada card (en vivo / pausada / nunca lanzada).
  const campaniasPorPlantilla = useMemo(() => {
    const m = new Map();
    for (const c of cuenta?.campanias || []) {
      if (!c.plantilla?.id) continue;
      if (!m.has(c.plantilla.id)) m.set(c.plantilla.id, []);
      m.get(c.plantilla.id).push(c);
    }
    return m;
  }, [cuenta]);

  // Campañas lanzadas desde aquí que Meta ya no lista (archivadas o
  // eliminadas en el Ads Manager), por plantilla y por campaign_id: el card
  // y la bitácora dicen el estado real en vez de "ya no está".
  const idasPorPlantilla = useMemo(() => {
    const m = new Map();
    for (const d of cuenta?.desaparecidas || []) {
      if (!d.plantilla?.id) continue;
      if (!m.has(d.plantilla.id)) m.set(d.plantilla.id, []);
      m.get(d.plantilla.id).push(d);
    }
    return m;
  }, [cuenta]);
  const estadoIdas = useMemo(() => {
    const m = new Map();
    for (const d of cuenta?.desaparecidas || [])
      m.set(String(d.campaign_id), d.estado_meta || "DELETED");
    return m;
  }, [cuenta]);

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

    const vivas = campaniasPorPlantilla.get(p.id) || [];
    const activas = vivas.filter((c) => c.effective_status === "ACTIVE");
    const aviso = activas.length
      ? `<div style="margin-top:10px;padding:10px 12px;border-radius:12px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:12px;text-align:left">
           <strong>Ojo:</strong> esta plantilla ya tiene ${activas.length} campaña${activas.length > 1 ? "s" : ""} activa${activas.length > 1 ? "s" : ""}.
           Lanzar otra vez crea una campaña NUEVA que competirá por la misma audiencia.
         </div>`
      : "";

    const r = await Swal.fire({
      title: activas.length ? `¿Lanzar otra vez "${p.nombre}"?` : `¿Lanzar "${p.nombre}"?`,
      html: `Se creará en tu cuenta publicitaria la campaña completa
        (campaña + conjunto + anuncio) con presupuesto de
        <strong>${fmtMoney(p.presupuesto_diario, currency)}/día</strong>.${aviso}`,
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
        fetchCuenta();
      } else {
        Swal.fire({
          icon: "error",
          title: "Meta rechazó el lanzamiento",
          text: data?.message || "Inténtalo de nuevo.",
          customClass: { popup: "rounded-2xl" },
        });
        fetchTodo(); // la bitácora registra el intento fallido
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
    const vivas = campaniasPorPlantilla.get(p.id) || [];
    const r = await Swal.fire({
      title: `¿Eliminar "${p.nombre}"?`,
      text: vivas.length
        ? `Sus ${vivas.length} campaña${vivas.length > 1 ? "s" : ""} en Meta siguen corriendo igual; solo se borra la plantilla.`
        : "Solo se borra la plantilla; nada cambia en tu cuenta publicitaria.",
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

  // Activar/pausar una campaña (de la tabla, del detalle o del card). El
  // estado se refleja en memoria al instante y Meta confirma por detrás.
  const [togglingId, setTogglingId] = useState(null);
  const handleToggleCampania = async (c, status) => {
    setTogglingId(c.id);
    try {
      const { data } = await chatApi.post("/meta_ads/campaigns/toggle", {
        id_configuracion,
        campaign_id: c.id,
        status,
      });
      if (data?.success) {
        setCuenta((prev) => {
          if (!prev) return prev;
          const campanias = prev.campanias.map((x) =>
            x.id === c.id ? { ...x, status, effective_status: status } : x,
          );
          const activas = campanias.filter((x) => x.effective_status === "ACTIVE");
          return {
            ...prev,
            campanias,
            resumen: prev.resumen
              ? {
                  ...prev.resumen,
                  activas: activas.length,
                  presupuesto_diario_activo: +activas
                    .reduce((a, x) => a + (x.daily_budget || 0), 0)
                    .toFixed(2),
                }
              : prev.resumen,
          };
        });
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: status === "ACTIVE" ? "Campaña activada" : "Campaña pausada",
          showConfirmButton: false,
          timer: 2000,
        });
        return true;
      }
      Swal.fire({
        icon: "error",
        title: "Meta rechazó el cambio",
        text: data?.message || "Inténtalo de nuevo.",
        customClass: { popup: "rounded-2xl" },
      });
      return false;
    } catch (err) {
      console.error("Toggle campaña error:", err);
      return false;
    } finally {
      setTogglingId(null);
    }
  };

  const verCampaniasDePlantilla = (p) => {
    setFiltroPlantilla({ id: p.id, nombre: p.nombre });
    setTimeout(
      () => campaniasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  };

  const [plantillaResaltada, setPlantillaResaltada] = useState(null);
  const verPlantilla = (id_plantilla) => {
    setPlantillaResaltada(id_plantilla);
    plantillasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => setPlantillaResaltada(null), 2500);
  };

  // Vista previa de una plantilla ya creada (sin abrir el editor): el anuncio
  // como se verá en Facebook + WhatsApp, con todos sus creativos, y un
  // lightbox para ver la imagen completa o reproducir el video.
  const [previa, setPrevia] = useState(null); // { plantilla, idx }
  const [lightbox, setLightbox] = useState(null);

  // ── Estados de carga / sin conexión ──
  // Sin plantillas todavía no sabemos si toca el lanzador o el "conecta tu
  // cuenta" (eso lo dice el contexto, que tarda más): se sostiene el
  // skeleton para que no parpadee una pantalla y luego la otra.
  // Skeleton con la MISMA silueta de la vista (barra, KPIs, cards, tabla):
  // el cliente ve la estructura de una vez y nada salta cuando llega la data.
  if (loading || (contextoCargando && plantillas.length === 0)) {
    const bloque = "bg-slate-100 rounded animate-pulse";
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="h-1 bg-slate-100" />
          <div className="px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bloque}`} />
              <div className="space-y-2">
                <div className={`h-3.5 w-40 ${bloque}`} />
                <div className={`h-2.5 w-72 ${bloque}`} />
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <div className={`h-8 w-56 rounded-xl ${bloque}`} />
              <div className={`h-8 w-32 rounded-xl ${bloque}`} />
              <div className={`h-8 w-28 rounded-xl ${bloque}`} />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${bloque}`} />
                <div className="space-y-2 flex-1">
                  <div className={`h-2.5 w-24 ${bloque}`} />
                  <div className={`h-5 w-16 ${bloque}`} />
                  <div className={`h-2 w-32 ${bloque}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2.5 px-1 space-y-2">
            <div className={`h-3.5 w-32 ${bloque}`} />
            <div className={`h-2.5 w-64 ${bloque}`} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
              >
                <div className={`h-36 ${bloque} rounded-none`} />
                <div className="px-4 py-3 space-y-2.5">
                  <div className={`h-3.5 w-3/4 ${bloque}`} />
                  <div className={`h-2.5 w-1/2 ${bloque}`} />
                  <div className="flex gap-1.5">
                    <div className={`h-5 w-16 rounded-full ${bloque}`} />
                    <div className={`h-5 w-12 rounded-full ${bloque}`} />
                    <div className={`h-5 w-20 rounded-full ${bloque}`} />
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
                  <div className={`h-8 flex-1 rounded-xl ${bloque}`} />
                  <div className={`h-8 w-8 rounded-xl ${bloque}`} />
                  <div className={`h-8 w-8 rounded-xl ${bloque}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 space-y-3">
            <div className={`h-3.5 w-44 ${bloque}`} />
            <div className="flex gap-2">
              <div className={`h-7 w-20 rounded-full ${bloque}`} />
              <div className={`h-7 w-28 rounded-full ${bloque}`} />
              <div className={`h-7 w-28 rounded-full ${bloque}`} />
            </div>
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="px-5 py-3.5 flex items-center gap-3 border-b border-slate-50"
            >
              <div className={`w-12 h-12 rounded-xl ${bloque}`} />
              <div className="flex-1 space-y-2">
                <div className={`h-3 w-2/3 ${bloque}`} />
                <div className={`h-2.5 w-1/3 ${bloque}`} />
              </div>
              <div className={`h-6 w-16 rounded-full ${bloque}`} />
              <div className={`h-3 w-14 ${bloque}`} />
              <div className={`h-3 w-10 ${bloque}`} />
            </div>
          ))}
        </div>
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
              "Plantillas listas: producto, presupuesto, zonas y hasta 10 creativos por campaña.",
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

  const resumen = cuenta?.resumen || null;
  const fallidos = lanzamientos.filter((l) => l.resultado !== "ok").length;

  return (
    <div className="space-y-5">
      {/* BARRA SUPERIOR */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-blue-500" />
        <div className="px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 ring-1 ring-indigo-200 grid place-items-center shrink-0">
              <i className="bx bx-rocket text-xl text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-slate-800">
                Centro de campañas
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                {cuenta?.ad_account_name || contexto?.ad_account_name
                  ? `Cuenta ${cuenta?.ad_account_name || contexto?.ad_account_name} · `
                  : ""}
                lanza plantillas, vigila lo que corre y deja que las reglas
                cuiden el presupuesto.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Período de las métricas */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 ring-1 ring-slate-200">
              {PERIODOS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => cambiarPeriodo(p.id)}
                  className={`px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition ${
                    periodo === p.id
                      ? "bg-white text-[#171931] shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchCuenta()}
              disabled={cuentaCargando}
              title="Actualizar desde Meta"
              className="p-2 rounded-xl text-slate-500 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition disabled:opacity-50"
            >
              <i className={`bx bx-refresh text-lg ${cuentaCargando ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setReglasOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 hover:bg-indigo-100 transition"
            >
              <i className="bx bx-shield-quarter text-sm" />
              Reglas automáticas
            </button>
            <button
              onClick={() => setBitacoraOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
              title="Historial de lanzamientos hechos desde aquí"
            >
              <i className="bx bx-history text-sm" />
              Bitácora
              {fallidos > 0 && (
                <span className="ml-0.5 px-1.5 py-px rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">
                  {fallidos}
                </span>
              )}
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

        {/* KPIs del período */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-slate-100 border-t border-slate-100">
          {[
            {
              icon: "bx-broadcast",
              tone: "text-emerald-600 bg-emerald-50 ring-emerald-100",
              label: "Campañas activas",
              valor: resumen ? `${fmtNum(resumen.activas)}` : "—",
              sub: resumen
                ? `de ${resumen.total} en tu cuenta${
                    resumen.presupuesto_diario_activo > 0
                      ? ` · ${fmtMoney(resumen.presupuesto_diario_activo, currency, 0)} al día en presupuesto`
                      : ""
                  }`
                : "",
            },
            {
              icon: "bx-wallet",
              tone: "text-indigo-600 bg-indigo-50 ring-indigo-100",
              label: `Gasto ${PERIODO_LABEL[periodo]}`,
              valor: resumen ? fmtMoney(resumen.spend, currency) : "—",
              sub: "lo que Meta cobró en toda tu cuenta publicitaria",
            },
            {
              icon: "bx-message-rounded-dots",
              tone: "text-blue-600 bg-blue-50 ring-blue-100",
              label: "Mensajes iniciados",
              valor: resumen ? fmtNum(resumen.msgs) : "—",
              sub: "personas que te escribieron desde un anuncio",
            },
            {
              icon: "bx-target-lock",
              tone:
                resumen?.cpa_msg == null
                  ? "text-slate-500 bg-slate-50 ring-slate-100"
                  : resumen.cpa_msg <= 0.25
                    ? "text-emerald-600 bg-emerald-50 ring-emerald-100"
                    : resumen.cpa_msg > 0.5
                      ? "text-rose-600 bg-rose-50 ring-rose-100"
                      : "text-amber-600 bg-amber-50 ring-amber-100",
              label: "Costo promedio por mensaje",
              valor:
                resumen?.cpa_msg != null ? fmtMoney(resumen.cpa_msg, currency) : "—",
              sub:
                resumen?.cpa_msg == null
                  ? "gasto ÷ mensajes · aún sin mensajes"
                  : resumen.cpa_msg <= 0.25
                    ? "gasto ÷ mensajes · excelente (ideal $0.25)"
                    : resumen.cpa_msg > 0.5
                      ? "gasto ÷ mensajes · alto, ideal $0.25"
                      : "gasto ÷ mensajes · aceptable (ideal $0.25)",
            },
          ].map((k) => (
            <div key={k.label} className="px-5 py-3.5 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ring-1 grid place-items-center shrink-0 ${k.tone}`}>
                <i className={`bx ${k.icon} text-lg`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 truncate">
                  {k.label}
                </p>
                <p className="text-lg font-extrabold text-slate-800 leading-tight">
                  {cuentaCargando && !resumen ? (
                    <span className="inline-block w-14 h-5 bg-slate-100 rounded animate-pulse" />
                  ) : (
                    k.valor
                  )}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PLANTILLAS */}
      <div ref={plantillasRef} className="scroll-mt-4">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <i className="bx bx-layout text-indigo-600 text-lg" />
              Tus plantillas
              <span className="text-[11px] font-semibold text-slate-400">
                {plantillas.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Cada card muestra lo que esa plantilla tiene corriendo ahora mismo en Meta.
            </p>
          </div>
        </div>

        {plantillas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 px-8 py-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-white ring-1 ring-indigo-200 grid place-items-center mb-4">
              <i className="bx bx-rocket text-2xl text-indigo-600" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800 mb-1.5">
              Lanza tu primera campaña en minutos
            </h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
              Una plantilla guarda producto, presupuesto, alcance y creativos.
              La lanzas con un click y la atribución al producto queda
              conectada sola.
            </p>
            <button
              onClick={() => abrirWizard(null)}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition"
            >
              <i className="bx bx-plus text-lg" />
              Crear mi primera plantilla
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {plantillas.map((p) => {
              const incompleta = (p.faltantes || []).length > 0;
              const vivas = campaniasPorPlantilla.get(p.id) || [];
              const idas = idasPorPlantilla.get(p.id) || [];
              const activas = vivas.filter((c) => c.effective_status === "ACTIVE");
              const enVivo = activas.length > 0;
              const lanzadaAlguna = vivas.length > 0 || Number(p.veces_lanzada) > 0;
              const gasto = vivas.reduce((a, c) => a + (c.spend || 0), 0);
              const msgs = vivas.reduce((a, c) => a + (c.msgs || 0), 0);
              const cpa = msgs > 0 ? gasto / msgs : null;

              let geoLabel = p.paises;
              try {
                const g = p.geo_json ? JSON.parse(p.geo_json) : null;
                if (g?.modo === "especifico" && g.lugares?.length) {
                  geoLabel = `${g.lugares.length} zona${g.lugares.length > 1 ? "s" : ""} · ${(g.paises || []).join(",")}`;
                }
                if (Array.isArray(g?.excluir) && g.excluir.length) {
                  geoLabel += ` · −${g.excluir.length} excl.`;
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

              // Estado que manda en el card
              const estado = incompleta
                ? { label: "Incompleta", cls: "bg-amber-100 text-amber-700", dot: "bg-amber-500" }
                : enVivo
                  ? {
                      label: `En vivo · ${activas.length} activa${activas.length > 1 ? "s" : ""}`,
                      cls: "bg-emerald-600 text-white",
                      dot: "bg-white animate-pulse",
                    }
                  : vivas.length
                    ? { label: `Pausada · ${vivas.length}`, cls: "bg-amber-500 text-white", dot: "bg-white" }
                    : idas.length
                      ? {
                          label: `${idas.length} archivada${idas.length > 1 ? "s" : ""} en Meta`,
                          cls: "bg-slate-700 text-white",
                          dot: "bg-slate-300",
                        }
                      : lanzadaAlguna
                        ? { label: "Sin campañas vivas", cls: "bg-slate-700 text-white", dot: "bg-slate-300" }
                        : { label: "Lista para lanzar", cls: "bg-white/90 text-emerald-700", dot: "bg-emerald-500" };

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border bg-white overflow-hidden flex flex-col transition ${
                    plantillaResaltada === p.id
                      ? "border-indigo-400 ring-2 ring-indigo-200"
                      : enVivo
                        ? "border-emerald-200"
                        : "border-slate-200"
                  }`}
                >
                  {/* Imagen: abre la vista previa completa de la plantilla */}
                  <div
                    className={`h-36 bg-slate-100 relative group ${nCreativos > 0 ? "cursor-pointer" : ""}`}
                    onClick={() =>
                      nCreativos > 0 && setPrevia({ plantilla: p, idx: 0 })
                    }
                    title={nCreativos > 0 ? "Ver vista previa del anuncio" : undefined}
                  >
                    {p.imagen_url ? (
                      <img
                        src={p.imagen_url}
                        alt={p.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : nCreativos > 0 ? (
                      <div className="w-full h-full bg-slate-800 grid place-items-center text-white/70">
                        <i className="bx bx-video text-4xl" />
                      </div>
                    ) : (
                      <div className="w-full h-full grid place-items-center text-slate-300">
                        <i className="bx bx-image text-4xl" />
                      </div>
                    )}
                    {nCreativos > 0 && (
                      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 group-hover:bg-indigo-600 text-white text-[10px] font-bold transition">
                        <i className="bx bx-show" />
                        Vista previa
                      </span>
                    )}
                    <span
                      className={`absolute top-2 right-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold shadow ${estado.cls}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${estado.dot}`} />
                      {estado.label}
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
                        {fmtMoney(p.presupuesto_diario, currency)}/día
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

                    {/* Lo que está corriendo de esta plantilla */}
                    {vivas.length > 0 ? (
                      <div className="mt-3 rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
                          <span className="font-bold uppercase tracking-wide">
                            {PERIODO_LABEL[periodo]}
                          </span>
                          <span>
                            {vivas.length} campaña{vivas.length > 1 ? "s" : ""} en Meta
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-xs font-extrabold text-slate-800">
                              {fmtMoney(gasto, currency)}
                            </p>
                            <p className="text-[9px] text-slate-400">gasto</p>
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-800">
                              {fmtNum(msgs)}
                            </p>
                            <p className="text-[9px] text-slate-400">mensajes</p>
                          </div>
                          <div>
                            <p
                              className={`text-xs font-extrabold ${
                                cpa == null
                                  ? "text-slate-400"
                                  : cpa <= 0.25
                                    ? "text-emerald-600"
                                    : cpa > 0.5
                                      ? "text-rose-600"
                                      : "text-slate-800"
                              }`}
                            >
                              {cpa != null ? fmtMoney(cpa, currency) : "—"}
                            </p>
                            <p className="text-[9px] text-slate-400">por msg</p>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1">
                          {vivas.slice(0, 2).map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between gap-2 text-[10px]"
                            >
                              <span className="truncate text-slate-600" title={c.name}>
                                {c.name}
                              </span>
                              <EstadoBadge status={c.effective_status} />
                            </div>
                          ))}
                          {vivas.length > 2 && (
                            <p className="text-[10px] text-slate-400">
                              y {vivas.length - 2} más...
                            </p>
                          )}
                        </div>
                      </div>
                    ) : idas.length > 0 ? (
                      <div className="mt-3 rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2">
                        <p className="text-[10px] text-slate-500 leading-snug">
                          <i className="bx bx-archive mr-1 text-slate-400" />
                          Lanzada {p.veces_lanzada}{" "}
                          {Number(p.veces_lanzada) === 1 ? "vez" : "veces"}; la
                          última {fmtFecha(p.ultimo_lanzamiento_at)}. Sus campañas
                          fueron <strong>archivadas o eliminadas en el Ads Manager</strong>,
                          por eso no aparecen abajo ni suman gasto.
                        </p>
                        <div className="mt-1.5 space-y-1">
                          {idas.slice(0, 2).map((d) => (
                            <div
                              key={d.campaign_id}
                              className="flex items-center justify-between gap-2 text-[10px]"
                            >
                              <span className="truncate text-slate-500">
                                {fmtFecha(d.lanzado_at)}
                              </span>
                              <EstadoBadge status={d.estado_meta || "DELETED"} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      Number(p.veces_lanzada) > 0 && (
                        <p className="text-[10px] text-slate-400 mt-2.5">
                          Lanzada {p.veces_lanzada}{" "}
                          {Number(p.veces_lanzada) === 1 ? "vez" : "veces"} · última{" "}
                          {fmtFecha(p.ultimo_lanzamiento_at)} · ya no hay campañas
                          vivas de esta plantilla
                        </p>
                      )
                    )}
                  </div>

                  {/* Acciones: la principal depende del estado real */}
                  <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2">
                    {vivas.length > 0 ? (
                      <>
                        <button
                          onClick={() => verCampaniasDePlantilla(p)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-[#171931] hover:bg-[#23264a] transition"
                        >
                          <i className="bx bx-bar-chart-alt-2" />
                          Ver campaña{vivas.length > 1 ? "s" : ""}
                        </button>
                        <button
                          onClick={() => handleLanzar(p)}
                          disabled={lanzandoId === p.id}
                          title="Crear otra campaña nueva con esta plantilla"
                          className="p-2 rounded-xl text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 hover:bg-emerald-100 transition disabled:opacity-60"
                        >
                          <i
                            className={`bx ${lanzandoId === p.id ? "bx-loader-alt animate-spin" : "bx-rocket"}`}
                          />
                        </button>
                      </>
                    ) : (
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
                        ) : incompleta ? (
                          <>
                            <i className="bx bx-edit-alt" />
                            Completar
                          </>
                        ) : (
                          <>
                            <i className="bx bx-rocket" />
                            {lanzadaAlguna ? "Lanzar de nuevo" : "Lanzar"}
                          </>
                        )}
                      </button>
                    )}
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
                      title="Eliminar plantilla"
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
      </div>

      {/* CAMPAÑAS EN LA CUENTA */}
      <div ref={campaniasRef} className="scroll-mt-4">
        <CampaniasCuenta
          id_configuracion={id_configuracion}
          cuenta={cuenta}
          cargando={cuentaCargando}
          error={cuentaError}
          onReintentar={() => fetchCuenta()}
          onToggleCampania={handleToggleCampania}
          togglingId={togglingId}
          filtroPlantilla={filtroPlantilla}
          onQuitarFiltroPlantilla={() => setFiltroPlantilla(null)}
          onVerPlantilla={verPlantilla}
          periodoLabel={PERIODO_LABEL[periodo]}
        />
      </div>

      {/* BITÁCORA DE LANZAMIENTOS (modal desde la barra superior: nada de
          bajar hasta el final de la página para encontrarla) */}
      {bitacoraOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3"
          onClick={() => setBitacoraOpen(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#171931] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/15 grid place-items-center">
                  <i className="bx bx-history" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold leading-tight">
                    Bitácora de lanzamientos
                  </h3>
                  <p className="text-[10px] text-white/60">
                    Cada intento hecho desde aquí, con lo que Meta respondió y
                    el estado actual de la campaña
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBitacoraOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition"
              >
                <i className="bx bx-x text-xl" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {lanzamientos.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-50 ring-1 ring-slate-200 grid place-items-center mb-3">
                    <i className="bx bx-rocket text-2xl text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    Todavía no has lanzado ninguna campaña desde aquí
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Cuando lances una plantilla, cada intento queda registrado en esta lista.
                  </p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                      <th className="px-5 py-2.5 font-bold">Fecha</th>
                      <th className="px-3 py-2.5 font-bold">Plantilla</th>
                      <th className="px-3 py-2.5 font-bold">Resultado</th>
                      <th className="px-3 py-2.5 font-bold">Lanzada</th>
                      <th className="px-3 py-2.5 font-bold">Presupuesto</th>
                      <th className="px-3 py-2.5 font-bold">Anuncios</th>
                      <th className="px-5 py-2.5 font-bold">Hoy en Meta</th>
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
                      const viva = (cuenta?.campanias || []).find(
                        (c) => c.id === String(l.campaign_id),
                      );
                      const estadoIda = estadoIdas.get(String(l.campaign_id));
                      let errorLegible = "";
                      if (l.resultado !== "ok" && l.error_meta) {
                        try {
                          const e = JSON.parse(l.error_meta);
                          errorLegible =
                            (typeof e === "string" ? e : e?.error_user_msg || e?.message) ||
                            String(l.error_meta);
                        } catch {
                          errorLegible = String(l.error_meta);
                        }
                      }
                      return (
                        <tr key={l.id} className="border-b border-slate-50 align-top">
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
                              <div className="max-w-[260px]">
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold">
                                  Error
                                </span>
                                {errorLegible && (
                                  <p
                                    className="mt-1 text-[10px] text-rose-600/80 leading-snug line-clamp-2"
                                    title={errorLegible}
                                  >
                                    {errorLegible}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                            {l.estado_inicial === "PAUSED" ? "en pausa" : "activa"}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                            {l.presupuesto_diario
                              ? `${fmtMoney(l.presupuesto_diario, currency)}/día`
                              : "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            {nAds > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold whitespace-nowrap">
                                {nAds} {nAds === 1 ? "anuncio" : "anuncios"}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-5 py-2.5">
                            {l.resultado === "ok" && l.campaign_id ? (
                              viva ? (
                                <EstadoBadge status={viva.effective_status} />
                              ) : (
                                <EstadoBadge status={estadoIda || "DELETED"} />
                              )
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
              <p className="text-[11px] text-slate-500 leading-snug">
                <i className="bx bx-info-circle text-indigo-500 mr-1" />
                {lanzamientos.length} intento{lanzamientos.length !== 1 ? "s" : ""}
                {fallidos > 0 ? ` · ${fallidos} con error de Meta` : ""} · las
                campañas archivadas o eliminadas en el Ads Manager ya no cuentan en
                los totales.
              </p>
              <button
                type="button"
                onClick={() => setBitacoraOpen(false)}
                className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
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
            <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
              <p className="text-[11px] text-slate-500 leading-snug">
                <i className="bx bx-check-shield text-emerald-600 mr-1" />
                Cada regla se guarda al instante y actúa según su ámbito: las
                campañas creadas aquí, las del Ads Manager, todas o las que
                elijas.
              </p>
              <button
                type="button"
                onClick={() => setReglasOpen(false)}
                className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow transition"
              >
                <i className="bx bx-check" />
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA PREVIA de una plantilla (sin abrir el editor) */}
      {previa &&
        (() => {
          const p = previa.plantilla;
          const creativos = creativosDePlantilla(p);
          const formPrevia = {
            texto_principal: p.texto_principal || "",
            descripcion: p.descripcion || "",
            mensaje_bienvenida: p.mensaje_bienvenida || "",
            imagenes: creativos,
          };
          const titulo = p.producto_nombre || p.titulo || "";
          const vivas = campaniasPorPlantilla.get(p.id) || [];
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3"
              onClick={() => setPrevia(null)}
            >
              <div
                className="w-full max-w-md max-h-[94vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-[#171931] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold leading-tight truncate">
                      {p.nombre}
                    </h3>
                    <p className="text-[10px] text-white/60">
                      Vista previa · {creativos.length} creativo
                      {creativos.length !== 1 ? "s" : ""} · toca la imagen
                      para verla completa
                    </p>
                  </div>
                  <button
                    onClick={() => setPrevia(null)}
                    className="p-2 rounded-lg hover:bg-white/10 transition"
                  >
                    <i className="bx bx-x text-xl" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50">
                  <AdPreview
                    form={formPrevia}
                    paginaNombre={p.page_name || null}
                    tituloEfectivo={titulo}
                    creativoIdx={previa.idx}
                    onCambiarCreativo={(idx) =>
                      setPrevia((v) => ({ ...v, idx }))
                    }
                    onVerMedia={setLightbox}
                  />
                </div>
                <div className="px-4 py-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setPrevia(null);
                      abrirWizard(p);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
                  >
                    <i className="bx bx-edit-alt" />
                    Editar
                  </button>
                  {vivas.length > 0 ? (
                    <button
                      onClick={() => {
                        setPrevia(null);
                        verCampaniasDePlantilla(p);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-[#171931] hover:bg-[#23264a] transition"
                    >
                      <i className="bx bx-bar-chart-alt-2" />
                      Ver campaña{vivas.length > 1 ? "s" : ""}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setPrevia(null);
                        handleLanzar(p);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition"
                    >
                      <i className="bx bx-rocket" />
                      Lanzar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {lightbox && (
        <MediaLightbox
          item={lightbox}
          id_configuracion={id_configuracion}
          titulo={previa?.plantilla?.nombre}
          onClose={() => setLightbox(null)}
        />
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
