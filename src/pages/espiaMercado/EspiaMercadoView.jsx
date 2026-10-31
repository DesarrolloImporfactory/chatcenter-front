import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Hero from "./componentes/Hero";
import Segmentos from "./componentes/Segmentos";
import TabProductos from "./TabProductos";
import TabAnuncios from "./TabAnuncios";
import TabTiendas from "./TabTiendas";
import { EstadoLista, Modal, PAISES, btnSuave, fmtFecha, tarjeta, useConsulta, useCopiar } from "./ui";

/**
 * /espia-mercado — Dropkiller propio de GRUPO IMPOR. Solo super administrador
 * (el back lo exige en cada endpoint).
 *
 * Estructura:
 *   - Hero oscuro: país, KPIs, estado del recolector (avance en vivo),
 *     cuenta Dropi en uso, acciones y «¿Cómo funciona?».
 *   - Segmentos: Productos · Anuncios · Tiendas, con contadores.
 *   - Cada pestaña en ./Tab*.jsx; piezas reutilizables en ./componentes.
 *
 * La pestaña y los filtros viven en la URL (?tab=…&pais=…&atajo=…): si la URL
 * trae filtros, mandan sobre lo guardado en localStorage (el enlace del
 * reporte siempre abre lo que dice). El país se recuerda en `espia_pais`.
 * `producto=<dropi_product_id>` abre el detalle de ese producto al cargar
 * (lo usa la extensión desde el catálogo de Dropi) y no se guarda como filtro.
 */

const TABS = [
  { id: "productos", label: "Productos", icon: "bx-package" },
  { id: "anuncios", label: "Anuncios", icon: "bx-images" },
  { id: "tiendas", label: "Tiendas", icon: "bx-store" },
];

const CLAVE_PAIS = "espia_pais";
const CLAVE_FILTROS = "espia_filtros";
/* Lo que no es filtro de pestaña y no va a cada tab ni a localStorage. */
const RESERVADAS = new Set(["tab", "pais", "producto"]);

const filtrosPorDefecto = (tab) => {
  if (tab === "productos") return { atajo: "top_7d", orden: "v7" };
  // Anuncios entra sin el atajo «Funcionando ahora»: recién instalada la extensión
  // casi todo tiene menos de 7 días y la pestaña se veía vacía.
  if (tab === "anuncios") return { orden: "dias" };
  return {};
};

function leerGuardados() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_FILTROS) || "{}") || {};
  } catch {
    return {};
  }
}

function ReporteModal({ pais, onClose }) {
  const { data, cargando, error, recargar } = useConsulta("/espia/reporte", { pais });
  const { copiado, copiar } = useCopiar();
  return (
    <Modal
      titulo={`Reporte de hoy · ${pais}`}
      subtitulo={data?.generado_en ? `Generado ${fmtFecha(data.generado_en)}` : "Es el mismo texto que llega por WhatsApp a las 7:30"}
      onClose={onClose}
      ancho="max-w-2xl"
      acciones={
        <button type="button" className={btnSuave} disabled={!data?.texto} onClick={() => copiar(data?.texto)}>
          <i className={`bx ${copiado ? "bx-check" : "bx-copy"}`} /> {copiado ? "Copiado" : "Copiar"}
        </button>
      }
    >
      <EstadoLista cargando={cargando} error={error} vacio={!cargando && !error && !data?.texto} textoVacio="Todavía no hay datos para armar el reporte." onReintentar={recargar} />
      {data?.texto ? <pre className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 font-sans text-sm leading-6 text-slate-800 ring-1 ring-slate-100">{data.texto}</pre> : null}
    </Modal>
  );
}

/* ── Vista ────────────────────────────────────────────────────────────── */
export default function EspiaMercadoView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [verReporte, setVerReporte] = useState(false);

  const tab = TABS.some((t) => t.id === searchParams.get("tab")) ? searchParams.get("tab") : "productos";
  const pais = useMemo(() => {
    const deUrl = (searchParams.get("pais") || "").toUpperCase();
    if (PAISES.some((p) => p.code === deUrl)) return deUrl;
    const guardado = (localStorage.getItem(CLAVE_PAIS) || "").toUpperCase();
    return PAISES.some((p) => p.code === guardado) ? guardado : "EC";
  }, [searchParams]);
  const productoUrl = searchParams.get("producto") || null;

  /* Filtros de la pestaña: la URL manda; si no trae nada, lo guardado; si
     tampoco, el atajo por defecto. */
  const filtros = useMemo(() => {
    const deUrl = {};
    searchParams.forEach((v, k) => {
      if (!RESERVADAS.has(k)) deUrl[k] = v;
    });
    if (Object.keys(deUrl).length) return deUrl;
    const guardados = leerGuardados()[tab];
    return guardados && Object.keys(guardados).length ? guardados : filtrosPorDefecto(tab);
  }, [searchParams, tab]);

  const escribir = useCallback(
    (nuevaTab, nuevoPais, nuevosFiltros, producto) => {
      const next = new URLSearchParams();
      next.set("tab", nuevaTab);
      next.set("pais", nuevoPais);
      if (producto) next.set("producto", String(producto));
      Object.entries(nuevosFiltros || {}).forEach(([k, v]) => {
        if (RESERVADAS.has(k)) return;
        if (v !== "" && v !== null && v !== undefined && !(k === "page" && Number(v) <= 1)) next.set(k, String(v));
      });
      setSearchParams(next, { replace: true });
      try {
        const guardados = leerGuardados();
        guardados[nuevaTab] = nuevosFiltros || {};
        localStorage.setItem(CLAVE_FILTROS, JSON.stringify(guardados));
      } catch {
        /* sin localStorage: seguimos con la URL */
      }
    },
    [setSearchParams],
  );

  /* Al entrar sin país ni pestaña en la URL, la completamos para que el
     enlace sea compartible (conservando ?producto si venía). */
  useEffect(() => {
    if (!searchParams.get("tab") || !searchParams.get("pais")) escribir(tab, pais, filtros, productoUrl);
  }, [searchParams, tab, pais, filtros, escribir, productoUrl]);

  useEffect(() => {
    localStorage.setItem(CLAVE_PAIS, pais);
  }, [pais]);

  const setFiltros = (f) => escribir(tab, pais, f, productoUrl);
  const cambiarTab = (t) => {
    const guardados = leerGuardados()[t];
    escribir(t, pais, guardados && Object.keys(guardados).length ? guardados : filtrosPorDefecto(t));
  };
  const cambiarPais = (p) => escribir(tab, p, filtros);
  const verTienda = (dominio) => escribir("tiendas", pais, { q: dominio, dominio });
  const verAnunciosDe = (dominio) => escribir("anuncios", pais, { dominio });
  const cerrarProducto = () => escribir(tab, pais, filtros, null);

  /* Estado: se refresca solo cada 30 s mientras hay una pasada corriendo. */
  const [enVivo, setEnVivo] = useState(false);
  const estado = useConsulta("/espia/estado", { pais }, { cada: enVivo ? 30000 : 0 });
  useEffect(() => {
    const corriendo = !!estado.data?.corriendo || estado.data?.ultima_pasada?.estado === "corriendo";
    setEnVivo(corriendo);
  }, [estado.data]);

  const segmentos = TABS.map((t) => ({
    ...t,
    count: t.id === "productos" ? estado.data?.productos_total : t.id === "anuncios" ? estado.data?.extension?.anuncios_total : estado.data?.extension?.tiendas_total,
  }));

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-3 sm:p-4 md:p-6">
      <Hero pais={pais} onPais={cambiarPais} estado={estado.data} cargando={estado.cargando} error={estado.error} onRecargar={estado.recargar} onVerReporte={() => setVerReporte(true)} />

      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center justify-between gap-3 px-1 py-2 backdrop-blur-sm" style={{ background: "linear-gradient(180deg, rgba(243,244,246,0.95) 60%, rgba(243,244,246,0))" }}>
        <Segmentos opciones={segmentos} valor={tab} onChange={cambiarTab} />
        <p className="hidden text-xs text-slate-500 md:block">
          {tab === "productos" ? "Ventas estimadas por baja de stock en Dropi. Toca una fila para ver el detalle." : tab === "anuncios" ? "Lo que la extensión leyó en la Biblioteca de anuncios de Meta." : "Dominios que pautan, con su tendencia diaria. Sigue los que te interesen."}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${tab}-${pais}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className={`${tarjeta} p-4 sm:p-5`}>
          {tab === "productos" ? (
            <TabProductos pais={pais} filtros={filtros} setFiltros={setFiltros} productoInicial={productoUrl} onCerrarProducto={cerrarProducto} diasMedidos={estado.data?.dias_con_ventas} />
          ) : null}
          {tab === "anuncios" ? <TabAnuncios pais={pais} filtros={filtros} setFiltros={setFiltros} onVerTienda={verTienda} /> : null}
          {tab === "tiendas" ? <TabTiendas key={filtros.dominio || "lista"} pais={pais} filtros={filtros} setFiltros={setFiltros} onVerAnuncios={verAnunciosDe} /> : null}
        </motion.div>
      </AnimatePresence>

      {verReporte ? <ReporteModal pais={pais} onClose={() => setVerReporte(false)} /> : null}
    </div>
  );
}
