import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";

/**
 * CampaniasCuenta — lista principal de /anuncios.
 *
 * Muestra TODAS las campañas vivas de la cuenta publicitaria (las creadas
 * desde Imporchat y las del Ads Manager) con sus métricas del rango, y un
 * detalle por campaña con sus anuncios. Antes la vista solo listaba
 * plantillas + historial y el cliente no veía las campañas que ya tenía.
 */

export const fmtMoney = (n, currency = "USD", decimals = 2) => {
  if (n == null || isNaN(n)) return "—";
  try {
    return Number(n).toLocaleString("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch {
    return `${Number(n).toFixed(decimals)} ${currency}`;
  }
};

export const fmtNum = (n) =>
  n == null || isNaN(n) ? "—" : Number(n).toLocaleString("en-US");

export const fmtFechaCorta = (v) => {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return String(v);
  }
};

/* Estado efectivo de Meta → etiqueta y color. `effective_status` ya
   incorpora el estado de los padres (CAMPAIGN_PAUSED, ADSET_PAUSED). */
export const ESTADO = {
  ACTIVE: { label: "Activa", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  PAUSED: { label: "Pausada", cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  CAMPAIGN_PAUSED: { label: "Pausada", cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  ADSET_PAUSED: { label: "Conjunto pausado", cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  PENDING_REVIEW: { label: "En revisión", cls: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  IN_PROCESS: { label: "Procesando", cls: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  PREAPPROVED: { label: "Preaprobada", cls: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  DISAPPROVED: { label: "Rechazada", cls: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  WITH_ISSUES: { label: "Con errores", cls: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  PENDING_BILLING_INFO: { label: "Falta pago", cls: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  ARCHIVED: { label: "Archivada", cls: "bg-slate-100 text-slate-500 ring-slate-200", dot: "bg-slate-400" },
  DELETED: { label: "Eliminada", cls: "bg-slate-100 text-slate-500 ring-slate-200", dot: "bg-slate-400" },
};
const estadoDe = (s) =>
  ESTADO[String(s || "").toUpperCase()] || {
    label: s || "—",
    cls: "bg-slate-50 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  };

export const EstadoBadge = ({ status, size = "xs" }) => {
  const e = estadoDe(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 font-bold whitespace-nowrap ${e.cls} ${
        size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${e.dot}`} />
      {e.label}
    </span>
  );
};

const OrigenBadge = ({ es_sistema }) =>
  es_sistema ? (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 text-[10px] font-bold whitespace-nowrap">
      <i className="bx bx-rocket" />
      Creada aquí
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-500 ring-1 ring-slate-200 text-[10px] font-bold whitespace-nowrap">
      <i className="bxl bx-meta" />
      Ads Manager
    </span>
  );

const adsManagerUrl = (ad_account_id, campaign_id) =>
  `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${String(
    ad_account_id || "",
  ).replace("act_", "")}${campaign_id ? `&selected_campaign_ids=${campaign_id}` : ""}`;

const esActiva = (c) => c.effective_status === "ACTIVE";
const esPausable = (c) =>
  ["ACTIVE", "PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED"].includes(
    c.effective_status,
  );

const cpaCls = (cpa) =>
  cpa == null
    ? "text-slate-300"
    : cpa <= 0.25
      ? "text-emerald-600"
      : cpa > 0.5
        ? "text-rose-600"
        : "text-slate-700";

/* Miniatura de la campaña: imagen de la plantilla o creativo de Meta. */
const Thumb = ({ src, es_sistema, onClick, size = "w-12 h-12" }) => (
  <button
    onClick={onClick}
    className={`${size} rounded-xl bg-slate-100 overflow-hidden shrink-0 ring-1 ring-slate-200 grid place-items-center hover:ring-indigo-400 hover:shadow transition`}
    title="Ver anuncios de la campaña"
  >
    {src ? (
      <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
    ) : (
      <i
        className={`bx ${es_sistema ? "bx-rocket text-indigo-400" : "bxs-megaphone text-slate-400"} text-xl`}
      />
    )}
  </button>
);

/* ─────────────────────────────────────────────
   Paginación: 10 por página, Anterior / Siguiente + números
   ───────────────────────────────────────────── */
const POR_PAGINA = 10;

const Paginador = ({ pagina, total, onCambiar }) => {
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  if (paginas <= 1) return null;
  // Números visibles: primera, última y una ventana de ±2 alrededor
  const nums = [];
  for (let i = 1; i <= paginas; i++) {
    if (i === 1 || i === paginas || Math.abs(i - pagina) <= 2) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  const btn =
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold ring-1 transition disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onCambiar(pagina - 1)}
        disabled={pagina <= 1}
        className={`${btn} bg-white text-slate-600 ring-slate-200 hover:bg-slate-50`}
      >
        <i className="bx bx-chevron-left" />
        Anterior
      </button>
      <div className="hidden sm:flex items-center gap-1">
        {nums.map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`} className="px-1 text-slate-400 text-xs">
              …
            </span>
          ) : (
            <button
              key={n}
              onClick={() => onCambiar(n)}
              className={`w-8 h-8 rounded-lg text-[11px] font-bold ring-1 transition ${
                n === pagina
                  ? "bg-[#171931] text-white ring-[#171931]"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {n}
            </button>
          ),
        )}
      </div>
      <span className="sm:hidden text-[11px] text-slate-500 px-2">
        {pagina} / {paginas}
      </span>
      <button
        onClick={() => onCambiar(pagina + 1)}
        disabled={pagina >= paginas}
        className={`${btn} bg-white text-slate-600 ring-slate-200 hover:bg-slate-50`}
      >
        Siguiente
        <i className="bx bx-chevron-right" />
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Tabla de campañas
   ───────────────────────────────────────────── */
const CampaniasCuenta = ({
  id_configuracion,
  cuenta, // { campanias, resumen, currency, ad_account_id, rango }
  cargando,
  error,
  onReintentar,
  onToggleCampania, // (campania, status) => Promise<boolean>
  togglingId,
  filtroPlantilla, // { id, nombre } | null
  onQuitarFiltroPlantilla,
  onVerPlantilla, // (id_plantilla) => void
  periodoLabel,
}) => {
  const [origen, setOrigen] = useState("todas"); // todas | sistema | externas
  const [estado, setEstado] = useState("todas"); // todas | activas | pausadas
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [detalle, setDetalle] = useState(null); // campaña abierta

  const currency = cuenta?.currency || "USD";
  const campanias = cuenta?.campanias || [];

  // Al filtrar por plantilla desde el card se limpian los demás filtros para
  // que la campaña buscada no quede escondida.
  useEffect(() => {
    if (filtroPlantilla) {
      setOrigen("todas");
      setEstado("todas");
      setBusqueda("");
    }
    setPagina(1);
  }, [filtroPlantilla]);

  const conteos = useMemo(
    () => ({
      todas: campanias.length,
      sistema: campanias.filter((c) => c.es_sistema).length,
      externas: campanias.filter((c) => !c.es_sistema).length,
      activas: campanias.filter(esActiva).length,
    }),
    [campanias],
  );

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = campanias.filter((c) => {
      if (filtroPlantilla && c.plantilla?.id !== filtroPlantilla.id)
        return false;
      if (origen === "sistema" && !c.es_sistema) return false;
      if (origen === "externas" && c.es_sistema) return false;
      if (estado === "activas" && !esActiva(c)) return false;
      if (estado === "pausadas" && esActiva(c)) return false;
      if (
        q &&
        !`${c.name} ${c.plantilla?.nombre || ""} ${c.plantilla?.producto_nombre || ""}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
    // Activas primero, luego por gasto del rango; a igual gasto, la más
    // reciente arriba.
    return lista.sort((a, b) => {
      const ea = esActiva(a) ? 1 : 0;
      const eb = esActiva(b) ? 1 : 0;
      if (ea !== eb) return eb - ea;
      if ((b.spend || 0) !== (a.spend || 0)) return (b.spend || 0) - (a.spend || 0);
      return String(b.created_time || "").localeCompare(String(a.created_time || ""));
    });
  }, [campanias, origen, estado, busqueda, filtroPlantilla]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice(
    (paginaSegura - 1) * POR_PAGINA,
    paginaSegura * POR_PAGINA,
  );

  const cambiarPagina = (n) => {
    setPagina(Math.min(Math.max(1, n), totalPaginas));
    // La tabla es larga: al cambiar de página se vuelve a su cabecera.
    document
      .getElementById("campanias-cuenta-top")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const setFiltro = (fn) => {
    fn();
    setPagina(1);
  };

  const chipCls = (activo) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold ring-1 transition whitespace-nowrap ${
      activo
        ? "bg-[#171931] text-white ring-[#171931]"
        : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
    }`;

  return (
    <div
      id="campanias-cuenta-top"
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden scroll-mt-4"
    >
      {/* Encabezado + filtros */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <i className="bx bx-list-ul text-indigo-600 text-lg" />
              Campañas en tu cuenta
              {cuenta?.ad_account_name && (
                <span className="hidden sm:inline text-[11px] font-semibold text-slate-400 truncate">
                  · {cuenta.ad_account_name}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Todo lo que está vivo en Meta, lo hayas creado aquí o en el Ads
              Manager. Métricas de <strong>{periodoLabel}</strong>.
            </p>
          </div>
          <div className="relative w-full lg:w-64">
            <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setFiltro(() => setBusqueda(e.target.value))}
              placeholder="Buscar campaña o producto..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className={chipCls(origen === "todas")} onClick={() => setFiltro(() => setOrigen("todas"))}>
            Todas
            <span className="opacity-70">{conteos.todas}</span>
          </button>
          <button className={chipCls(origen === "sistema")} onClick={() => setFiltro(() => setOrigen("sistema"))}>
            <i className="bx bx-rocket" />
            Creadas aquí
            <span className="opacity-70">{conteos.sistema}</span>
          </button>
          <button className={chipCls(origen === "externas")} onClick={() => setFiltro(() => setOrigen("externas"))}>
            Ads Manager
            <span className="opacity-70">{conteos.externas}</span>
          </button>
          <span className="hidden sm:block w-px h-5 bg-slate-200 mx-1" />
          <select
            value={estado}
            onChange={(e) => setFiltro(() => setEstado(e.target.value))}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold ring-1 ring-slate-200 bg-white text-slate-600 focus:outline-none"
          >
            <option value="todas">Cualquier estado</option>
            <option value="activas">Solo activas ({conteos.activas})</option>
            <option value="pausadas">Pausadas y otras</option>
          </select>
          {filtroPlantilla && (
            <button
              onClick={onQuitarFiltroPlantilla}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition"
              title="Quitar filtro"
            >
              <i className="bx bx-filter-alt" />
              Plantilla: {filtroPlantilla.nombre}
              <i className="bx bx-x text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* Cuerpo */}
      {cargando && campanias.length === 0 ? (
        <div className="divide-y divide-slate-50">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-2/3" />
                <div className="h-2.5 bg-slate-100 rounded w-1/3" />
              </div>
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="px-6 py-10 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 ring-1 ring-rose-200 grid place-items-center mb-3">
            <i className="bx bx-error text-2xl text-rose-500" />
          </div>
          <p className="text-sm font-bold text-slate-700">
            No pudimos leer tus campañas
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">{error}</p>
          <button
            onClick={onReintentar}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
          >
            <i className="bx bx-refresh" />
            Reintentar
          </button>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-50 ring-1 ring-slate-200 grid place-items-center mb-3">
            <i className="bx bx-search-alt text-2xl text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-700">
            {campanias.length === 0
              ? "Tu cuenta no tiene campañas activas ni pausadas"
              : "Ninguna campaña coincide con el filtro"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {campanias.length === 0
              ? "Crea una plantilla arriba y lánzala: aparecerá aquí al instante."
              : filtroPlantilla
                ? "Las campañas de esta plantilla ya no están vivas en Meta (archivadas o eliminadas)."
                : "Prueba con otro origen, estado o texto de búsqueda."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[860px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-2.5 font-bold">Campaña</th>
                  <th className="px-3 py-2.5 font-bold">Estado</th>
                  <th className="px-3 py-2.5 font-bold text-right">Presup./día</th>
                  <th className="px-3 py-2.5 font-bold text-right">Gasto</th>
                  <th className="px-3 py-2.5 font-bold text-right">Mensajes</th>
                  <th className="px-3 py-2.5 font-bold text-right">Costo/msg</th>
                  <th className="px-5 py-2.5 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => {
                  const activa = esActiva(c);
                  const toggling = togglingId === c.id;
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-slate-50 hover:bg-indigo-50/30 transition ${
                        filtroPlantilla ? "bg-indigo-50/20" : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Thumb
                            src={c.thumbnail_url}
                            es_sistema={c.es_sistema}
                            onClick={() => setDetalle(c)}
                          />
                          <div className="min-w-0">
                            <button
                              onClick={() => setDetalle(c)}
                              className="block max-w-[380px] text-left font-bold text-slate-800 truncate hover:text-indigo-700 transition"
                              title={c.name}
                            >
                              {c.name}
                            </button>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <OrigenBadge es_sistema={c.es_sistema} />
                              {c.plantilla?.producto_nombre && (
                                <span className="text-[10px] text-indigo-600 font-semibold truncate max-w-[200px]">
                                  <i className="bx bx-box mr-0.5" />
                                  {c.plantilla.producto_nombre}
                                </span>
                              )}
                              {c.es_sistema && c.lanzado_at && (
                                <span className="text-[10px] text-slate-400">
                                  lanzada {fmtFechaCorta(c.lanzado_at)}
                                  {c.n_ads > 1 ? ` · ${c.n_ads} anuncios` : ""}
                                </span>
                              )}
                              {!c.es_sistema && c.created_time && (
                                <span className="text-[10px] text-slate-400">
                                  creada {fmtFechaCorta(c.created_time)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <EstadoBadge status={c.effective_status} />
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700 font-semibold whitespace-nowrap">
                        {c.daily_budget != null ? (
                          fmtMoney(c.daily_budget, currency)
                        ) : c.lifetime_budget != null ? (
                          <span title="Presupuesto total de la campaña">
                            {fmtMoney(c.lifetime_budget, currency)}
                            <span className="text-[9px] text-slate-400 ml-0.5">tot.</span>
                          </span>
                        ) : (
                          <span
                            className="text-slate-400 font-normal"
                            title="El presupuesto está en los conjuntos de anuncios"
                          >
                            en conjuntos
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-800 font-bold whitespace-nowrap">
                        {c.spend > 0 ? fmtMoney(c.spend, currency) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700 font-semibold">
                        {c.msgs > 0 ? fmtNum(c.msgs) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className={`px-3 py-3 text-right font-bold whitespace-nowrap ${cpaCls(c.cpa_msg)}`}>
                        {c.cpa_msg != null ? fmtMoney(c.cpa_msg, currency) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {esPausable(c) && (
                            <button
                              onClick={() =>
                                onToggleCampania(c, activa ? "PAUSED" : "ACTIVE")
                              }
                              disabled={toggling}
                              title={activa ? "Pausar campaña" : "Activar campaña"}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold ring-1 transition disabled:opacity-50 ${
                                activa
                                  ? "text-amber-700 bg-amber-50 ring-amber-200 hover:bg-amber-100"
                                  : "text-emerald-700 bg-emerald-50 ring-emerald-200 hover:bg-emerald-100"
                              }`}
                            >
                              <i
                                className={`bx ${
                                  toggling
                                    ? "bx-loader-alt animate-spin"
                                    : activa
                                      ? "bx-pause"
                                      : "bx-play"
                                }`}
                              />
                              {activa ? "Pausar" : "Activar"}
                            </button>
                          )}
                          <button
                            onClick={() => setDetalle(c)}
                            title="Ver anuncios de la campaña"
                            className="p-1.5 rounded-lg text-indigo-600 bg-indigo-50 ring-1 ring-indigo-100 hover:bg-indigo-100 transition"
                          >
                            <i className="bx bx-images" />
                          </button>
                          {c.plantilla?.id && !c.plantilla.eliminada && (
                            <button
                              onClick={() => onVerPlantilla(c.plantilla.id)}
                              title="Ver la plantilla que la creó"
                              className="p-1.5 rounded-lg text-slate-500 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
                            >
                              <i className="bx bx-layout" />
                            </button>
                          )}
                          <a
                            href={adsManagerUrl(cuenta?.ad_account_id, c.id)}
                            target="_blank"
                            rel="noreferrer"
                            title="Abrir en el Ads Manager"
                            className="p-1.5 rounded-lg text-slate-500 bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 transition"
                          >
                            <i className="bx bx-link-external" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>
              {(paginaSegura - 1) * POR_PAGINA + 1}–
              {Math.min(paginaSegura * POR_PAGINA, filtradas.length)} de{" "}
              {filtradas.length} campaña{filtradas.length !== 1 ? "s" : ""}
              {cargando && (
                <span className="ml-2 text-indigo-500">
                  <i className="bx bx-loader-alt animate-spin mr-1" />
                  actualizando...
                </span>
              )}
            </span>
            <Paginador
              pagina={paginaSegura}
              total={filtradas.length}
              onCambiar={cambiarPagina}
            />
          </div>
        </>
      )}

      {detalle && (
        <DetalleCampania
          id_configuracion={id_configuracion}
          campania={campanias.find((c) => c.id === detalle.id) || detalle}
          currency={currency}
          rango={cuenta?.rango || null}
          periodoLabel={periodoLabel}
          ad_account_id={cuenta?.ad_account_id}
          onToggleCampania={onToggleCampania}
          togglingId={togglingId}
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Detalle: anuncios de una campaña
   ───────────────────────────────────────────── */
const DetalleCampania = ({
  id_configuracion,
  campania,
  currency,
  rango,
  periodoLabel,
  ad_account_id,
  onToggleCampania,
  togglingId,
  onClose,
}) => {
  const [anuncios, setAnuncios] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [togglingAd, setTogglingAd] = useState(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await chatApi.get("/meta_ads/launcher/campanias/anuncios", {
        params: {
          id_configuracion,
          campaign_id: campania.id,
          since: rango?.since,
          until: rango?.until,
        },
        silentError: true,
      });
      if (data?.success) setAnuncios(data.data.anuncios || []);
      else setError(data?.message || "Meta no respondió.");
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudieron leer los anuncios.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campania.id, rango?.since, rango?.until]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleAd = async (a, status) => {
    setTogglingAd(a.id);
    try {
      const { data } = await chatApi.post("/meta_ads/ads/toggle", {
        id_configuracion,
        ad_id: a.id,
        status,
      });
      if (data?.success) {
        setAnuncios((prev) =>
          (prev || []).map((x) =>
            x.id === a.id ? { ...x, status, effective_status: status } : x,
          ),
        );
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: status === "ACTIVE" ? "Anuncio activado" : "Anuncio pausado",
          showConfirmButton: false,
          timer: 1800,
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
      console.error("toggle ad:", err);
    } finally {
      setTogglingAd(null);
    }
  };

  const activa = esActiva(campania);
  const total = (anuncios || []).reduce(
    (acc, a) => ({ spend: acc.spend + (a.spend || 0), msgs: acc.msgs + (a.msgs || 0) }),
    { spend: 0, msgs: 0 },
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#171931] text-white px-5 py-4 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-white/10 overflow-hidden shrink-0 grid place-items-center">
              {campania.thumbnail_url ? (
                <img src={campania.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <i className="bx bxs-megaphone text-2xl text-white/50" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <OrigenBadge es_sistema={campania.es_sistema} />
                <EstadoBadge status={campania.effective_status} />
              </div>
              <h3 className="text-sm font-extrabold leading-tight truncate">
                {campania.name}
              </h3>
              <p className="text-[11px] text-white/60 mt-1">
                {campania.plantilla?.producto_nombre
                  ? `${campania.plantilla.producto_nombre} · `
                  : ""}
                {campania.daily_budget != null
                  ? `${fmtMoney(campania.daily_budget, currency)}/día · `
                  : ""}
                {periodoLabel}: {fmtMoney(campania.spend, currency)} gastados ·{" "}
                {fmtNum(campania.msgs)} mensajes
                {campania.cpa_msg != null
                  ? ` · ${fmtMoney(campania.cpa_msg, currency)} por mensaje`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {esPausable(campania) && (
              <button
                onClick={() =>
                  onToggleCampania(campania, activa ? "PAUSED" : "ACTIVE")
                }
                disabled={togglingId === campania.id}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition disabled:opacity-50 ${
                  activa
                    ? "bg-amber-400 text-[#171931] hover:bg-amber-300"
                    : "bg-emerald-400 text-[#171931] hover:bg-emerald-300"
                }`}
              >
                <i
                  className={`bx ${
                    togglingId === campania.id
                      ? "bx-loader-alt animate-spin"
                      : activa
                        ? "bx-pause"
                        : "bx-play"
                  }`}
                />
                {activa ? "Pausar campaña" : "Activar campaña"}
              </button>
            )}
            <a
              href={adsManagerUrl(ad_account_id, campania.id)}
              target="_blank"
              rel="noreferrer"
              title="Abrir en el Ads Manager"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
            >
              <i className="bx bx-link-external" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition"
            >
              <i className="bx bx-x text-xl" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          {cargando ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl bg-white ring-1 ring-slate-200 p-3 flex gap-3 animate-pulse">
                  <div className="w-16 h-16 rounded-lg bg-slate-100" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-bold text-slate-700">No pudimos leer los anuncios</p>
              <p className="text-xs text-slate-400 mt-1">{error}</p>
              <button
                onClick={cargar}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Reintentar
              </button>
            </div>
          ) : (anuncios || []).length === 0 ? (
            <p className="px-6 py-10 text-center text-xs text-slate-400">
              Esta campaña no tiene anuncios vivos.
            </p>
          ) : (
            <div className="p-4 space-y-2">
              {(anuncios || [])
                .slice()
                .sort((a, b) => (b.spend || 0) - (a.spend || 0))
                .map((a) => {
                  const adActivo = a.effective_status === "ACTIVE";
                  const pausable = ["ACTIVE", "PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED"].includes(a.effective_status);
                  const parte = total.spend > 0 ? (a.spend / total.spend) * 100 : 0;
                  return (
                    <div
                      key={a.id}
                      className="rounded-xl bg-white ring-1 ring-slate-200 p-3 flex gap-3 items-center"
                    >
                      <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 grid place-items-center">
                        {a.thumbnail_url ? (
                          <img src={a.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <i className="bx bx-image text-2xl text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{a.name}</p>
                          <EstadoBadge status={a.effective_status} />
                        </div>
                        {a.titulo && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{a.titulo}</p>
                        )}
                        <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                          <span className="text-slate-700 font-bold">{fmtMoney(a.spend, currency)}</span>
                          <span className="text-slate-500">{fmtNum(a.msgs)} msgs</span>
                          <span className={`font-bold ${cpaCls(a.cpa_msg)}`}>
                            {a.cpa_msg != null ? `${fmtMoney(a.cpa_msg, currency)}/msg` : "sin msgs"}
                          </span>
                          {parte > 0 && (
                            <span className="hidden sm:flex items-center gap-1.5 text-slate-400 ml-auto">
                              <span className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <span
                                  className="block h-full bg-indigo-500"
                                  style={{ width: `${Math.max(4, parte)}%` }}
                                />
                              </span>
                              {parte.toFixed(0)}% del gasto
                            </span>
                          )}
                        </div>
                      </div>
                      {pausable && (
                        <button
                          onClick={() => toggleAd(a, adActivo ? "PAUSED" : "ACTIVE")}
                          disabled={togglingAd === a.id}
                          title={adActivo ? "Pausar anuncio" : "Activar anuncio"}
                          className={`p-2 rounded-lg ring-1 transition disabled:opacity-50 shrink-0 ${
                            adActivo
                              ? "text-amber-700 bg-amber-50 ring-amber-200 hover:bg-amber-100"
                              : "text-emerald-700 bg-emerald-50 ring-emerald-200 hover:bg-emerald-100"
                          }`}
                        >
                          <i
                            className={`bx ${
                              togglingAd === a.id
                                ? "bx-loader-alt animate-spin"
                                : adActivo
                                  ? "bx-pause"
                                  : "bx-play"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500">
            <i className="bx bx-info-circle mr-1 text-indigo-500" />
            {(anuncios || []).length} anuncio{(anuncios || []).length !== 1 ? "s" : ""} ·
            pausar uno deja al resto aprendiendo; las reglas automáticas hacen esto solas.
          </p>
          <button
            onClick={onClose}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaniasCuenta;
