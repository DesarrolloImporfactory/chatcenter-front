import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Hero from "./componentes/Hero";
import Segmentos from "./componentes/Segmentos";
import TabProductos from "./TabProductos";
import TabAnuncios from "./TabAnuncios";
import TabTiendas from "./TabTiendas";
import { BloqueoComplemento, EV_COMPLEMENTO, EV_EXTENSION, ModalComplemento, ModalExtension, accesoDe } from "./componentes/Complemento";
import { EstadoLista, Modal, PAISES, SelectorPais, btnSuave, fmtNum, haceCuanto, nombrePais, tarjeta, useConsulta, useCopiar } from "./ui";

/**
 * /imporkiller — ImporKiller, el Dropkiller propio de GRUPO IMPOR.
 *
 * Quién ve qué (lo decide el back y llega en /espia/estado → acceso):
 *   - Cualquier usuario con plan activo: buscador de productos, ficha y
 *     métricas (pestaña Productos), reporte.
 *   - Complemento «ImporKiller» ($10/mes): la extensión de Chrome y las
 *     pestañas Anuncios y Tiendas. Sin él, salen con candado y un panel que
 *     explica y vende (componentes/Complemento).
 *   - Super administrador: además opera el recolector y las cuentas de
 *     mapeo desde el Hero.
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

/* Resumen del día: tres listas (los más vendidos / sin escalar / nuevos con
   tracción) pintadas como filas con la foto del producto; cada fila abre la
   ficha y cada bloque lleva a la lista completa con ese atajo. El texto plano
   (el que sale por WhatsApp a las 7:30) solo lo copia el super admin. */
function ReporteModal({ pais, acceso, onClose, onIr, onProducto }) {
  const { data, cargando, error, recargar } = useConsulta("/espia/reporte", { pais });
  const { copiado, copiar } = useCopiar();
  const dias = Number(data?.dias_medidos || 0);
  const metrica = (sec, p) => {
    if (sec.clave === "subieron") {
      return data?.compara_semanas
        ? { valor: fmtNum(p.ventas_7d), nota: `antes ${fmtNum(p.ventas_7d_prev)}` }
        : { valor: fmtNum(p.ventas_7d), nota: "en 7 días" };
    }
    if (sec.clave === "sin_escalar") return { valor: fmtNum(p.ventas_7d), nota: `7 d · ${fmtNum(p.ventas_30d)} en 30 d` };
    return { valor: fmtNum(p.ventas_total), nota: `en total · ${fmtNum(p.ventas_7d)} esta semana` };
  };
  return (
    <Modal
      titulo={`Resumen de hoy · ${nombrePais(pais)}`}
      subtitulo={
        data
          ? `${fmtNum(data.catalogo)} productos analizados · ${fmtNum(dias)} ${dias === 1 ? "día" : "días"} de historial${data.actualizado_en ? ` · actualizado ${haceCuanto(data.actualizado_en)}` : ""}`
          : "Lo que se movió en Dropi en las últimas semanas"
      }
      onClose={onClose}
      ancho="max-w-3xl"
      acciones={
        acceso?.superAdmin ? (
          <button type="button" className={btnSuave} disabled={!data?.texto} onClick={() => copiar(data?.texto)} title="Texto plano, el mismo que sale por WhatsApp">
            <i className={`bx ${copiado ? "bx-check" : "bx-copy"}`} /> {copiado ? "Copiado" : "Copiar texto"}
          </button>
        ) : null
      }
    >
      <EstadoLista cargando={cargando} error={error} vacio={!cargando && !error && !data?.secciones?.length} textoVacio="Todavía no hay datos para armar el resumen." onReintentar={recargar} />
      {data?.secciones?.length ? (
        <div className="space-y-5">
          {data.secciones.map((sec) => {
            const faltan = sec.necesita_dias && dias < sec.necesita_dias ? sec.necesita_dias - dias : 0;
            return (
              <section key={sec.clave}>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-[15px] font-extrabold text-slate-900">{sec.titulo}</h4>
                    <p className="text-[12px] text-slate-500">{sec.descripcion}</p>
                  </div>
                  <button type="button" className={`${btnSuave} px-3 py-1.5 text-xs`} onClick={() => onIr(sec.filtros)}>
                    Ver la lista completa <i className="bx bx-right-arrow-alt" />
                  </button>
                </div>
                {sec.items.length ? (
                  <ol className="mt-2.5 divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                    {sec.items.map((p, i) => {
                      const m = metrica(sec, p);
                      return (
                        <li key={`${sec.clave}-${p.dropi_product_id}`}>
                          <button type="button" onClick={() => onProducto(p.dropi_product_id)} className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-slate-50">
                            <span className="w-5 shrink-0 text-center text-[12px] font-extrabold text-slate-400">{i + 1}</span>
                            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                              {p.imagen_url ? <img src={p.imagen_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <i className="bx bx-package text-xl text-slate-400" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-bold text-slate-800">{p.nombre}</span>
                              <span className="block truncate text-[11.5px] text-slate-500">
                                {p.proveedor ? `${p.proveedor} · ` : ""}stock {fmtNum(p.stock)}
                                {p.n_anuncios ? ` · ${fmtNum(p.n_anuncios)} anuncios` : ""}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block text-[15px] font-extrabold tabular-nums text-slate-900">{m.valor}</span>
                              <span className="block text-[10.5px] text-slate-400">{m.nota}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="mt-2.5 rounded-2xl bg-slate-50 px-4 py-3 text-[12.5px] text-slate-500 ring-1 ring-slate-100">
                    {faltan ? `Esta lista necesita ${sec.necesita_dias} días de historial y llevamos ${fmtNum(dias)}: aparece en ${fmtNum(faltan)} ${faltan === 1 ? "día" : "días"}.` : "Hoy ningún producto cumple estas condiciones."}
                  </p>
                )}
              </section>
            );
          })}
          {data.tiendas?.length ? (
            <section>
              <h4 className="text-[15px] font-extrabold text-slate-900">Tiendas que sigues</h4>
              <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                {data.tiendas.map((t) => (
                  <li key={t.dominio} className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px]">
                    <span className="truncate font-semibold text-slate-800">{t.nombre || t.dominio}</span>
                    <span className="shrink-0 text-slate-500">
                      {fmtNum(t.anuncios_activos)} activos{t.nuevos ? ` · ${fmtNum(t.nuevos)} nuevos` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <p className="text-[11px] text-slate-400">Las ventas son estimadas a partir del inventario de cada proveedor en Dropi; los ajustes de inventario no se cuentan.</p>
        </div>
      ) : null}
    </Modal>
  );
}

/* ── Vista ────────────────────────────────────────────────────────────── */
export default function EspiaMercadoView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [verReporte, setVerReporte] = useState(false);
  const [verComplemento, setVerComplemento] = useState(false);
  const [verExtension, setVerExtension] = useState(false);

  /* Cualquier pieza (Hero, ficha, guía vacía) abre la venta o la descarga
     sin pasar props: escucha los eventos de componentes/Complemento. */
  useEffect(() => {
    const abrirC = () => setVerComplemento(true);
    const abrirE = () => setVerExtension(true);
    window.addEventListener(EV_COMPLEMENTO, abrirC);
    window.addEventListener(EV_EXTENSION, abrirE);
    return () => {
      window.removeEventListener(EV_COMPLEMENTO, abrirC);
      window.removeEventListener(EV_EXTENSION, abrirE);
    };
  }, []);

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

  const acceso = accesoDe(estado.data);
  // Anuncios y Tiendas son del complemento: con candado hasta que se sepa que lo tiene.
  const bloqueada = (id) => id !== "productos" && acceso.cargado && !acceso.addon;
  const segmentos = TABS.map((t) => ({
    ...t,
    bloqueado: bloqueada(t.id),
    count: t.id === "productos" ? estado.data?.productos_total : t.id === "anuncios" ? estado.data?.extension?.anuncios_total : estado.data?.extension?.tiendas_total,
  }));

  return (
    /* Ancho completo: antes había un tope de 1600 px y en pantallas grandes (o
       al bajar el zoom) quedaban franjas vacías a los lados. */
    <div className="w-full space-y-5 p-3 sm:p-4 md:p-6">
      <Hero pais={pais} estado={estado.data} cargando={estado.cargando} error={estado.error} onRecargar={estado.recargar} onVerReporte={() => setVerReporte(true)} acceso={acceso} />

      {/* Pestañas y país juntos, pegados arriba al bajar: el país filtra lo
          que se ve en las tres pestañas, así que va con ellas y no en la cabecera. */}
      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-x-3 gap-y-2 px-1 py-2 backdrop-blur-sm" style={{ background: "linear-gradient(180deg, rgba(243,244,246,0.95) 60%, rgba(243,244,246,0))" }}>
        <Segmentos opciones={segmentos} valor={tab} onChange={cambiarTab} />
        <SelectorPais pais={pais} onPais={cambiarPais} />
        <p className="ml-auto hidden text-xs text-slate-500 lg:block">
          {tab === "productos" ? "Los productos de Dropi con más ventas estimadas. Toca uno para ver su detalle." : tab === "anuncios" ? "Anuncios activos en Meta de los productos que más se venden." : "Tiendas que están pautando, con sus anuncios y productos."}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${tab}-${pais}-${bloqueada(tab) ? "b" : "a"}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className={bloqueada(tab) ? "" : `${tarjeta} p-4 sm:p-5`}>
          {tab === "productos" ? (
            <TabProductos pais={pais} filtros={filtros} setFiltros={setFiltros} productoInicial={productoUrl} onCerrarProducto={cerrarProducto} diasMedidos={estado.data?.dias_con_ventas} />
          ) : null}
          {tab !== "productos" && bloqueada(tab) ? <BloqueoComplemento seccion={tab} acceso={acceso} /> : null}
          {tab === "anuncios" && !bloqueada(tab) ? <TabAnuncios pais={pais} filtros={filtros} setFiltros={setFiltros} onVerTienda={verTienda} /> : null}
          {tab === "tiendas" && !bloqueada(tab) ? <TabTiendas key={filtros.dominio || "lista"} pais={pais} filtros={filtros} setFiltros={setFiltros} onVerAnuncios={verAnunciosDe} /> : null}
        </motion.div>
      </AnimatePresence>

      {verReporte ? (
        <ReporteModal
          pais={pais}
          acceso={acceso}
          onClose={() => setVerReporte(false)}
          onIr={(f) => {
            setVerReporte(false);
            escribir("productos", pais, f);
          }}
          onProducto={(id) => {
            setVerReporte(false);
            escribir("productos", pais, tab === "productos" ? filtros : filtrosPorDefecto("productos"), id);
          }}
        />
      ) : null}
      {verComplemento ? (
        <ModalComplemento
          acceso={acceso}
          onClose={() => setVerComplemento(false)}
          onActivado={(siguiente) => {
            setVerComplemento(false);
            estado.recargar();
            if (siguiente === "extension") setVerExtension(true);
          }}
        />
      ) : null}
      {verExtension ? <ModalExtension acceso={acceso} onClose={() => setVerExtension(false)} /> : null}
    </div>
  );
}
