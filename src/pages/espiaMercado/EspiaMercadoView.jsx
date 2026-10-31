import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import chatApi from "../../api/chatcenter";
import TabProductos from "./TabProductos";
import TabAnuncios, { ATAJO_ANUNCIOS } from "./TabAnuncios";
import TabTiendas from "./TabTiendas";
import { Aviso, EstadoLista, Etiqueta, Modal, PAISES, btnPrimario, btnSuave, fmtFecha, fmtNum, select, textoError, useConsulta } from "./ui";

/**
 * /espia-mercado — Dropkiller propio de GRUPO IMPOR. Solo super administrador
 * (el back lo exige en cada endpoint).
 *
 * Qué hay:
 *   - Cabecera: país (EC / MX), estado del recolector (última pasada, freno,
 *     productos) y lo que ha mandado la extensión de Chrome (anuncios y
 *     tiendas), botón para correr una pasada y el reporte del día.
 *   - Tres pestañas: Productos (ventas estimadas por baja de stock en Dropi),
 *     Anuncios (lo que la extensión lee en la Biblioteca de Meta) y Tiendas
 *     (dominios que pautan, con tendencia diaria y seguimiento).
 *
 * La pestaña y los filtros viven en la URL (?tab=…&pais=…&atajo=…): si la URL
 * trae filtros, mandan sobre lo guardado en localStorage (el enlace del
 * reporte siempre abre lo que dice). El país se recuerda en `espia_pais`.
 */

const TABS = [
  { id: "productos", label: "Productos", icon: "bx-package" },
  { id: "anuncios", label: "Anuncios", icon: "bx-images" },
  { id: "tiendas", label: "Tiendas", icon: "bx-store" },
];

const CLAVE_PAIS = "espia_pais";
const CLAVE_FILTROS = "espia_filtros";
/* Lo que no es filtro de pestaña y no va a cada tab. */
const RESERVADAS = new Set(["tab", "pais"]);

const filtrosPorDefecto = (tab) => {
  if (tab === "productos") return { atajo: "sin_escalar" };
  if (tab === "anuncios") return { ...ATAJO_ANUNCIOS };
  return {};
};

function leerGuardados() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_FILTROS) || "{}") || {};
  } catch {
    return {};
  }
}

/* ── Estado del recolector y de la extensión ──────────────────────────── */
function TarjetaEstado({ pais, estado, cargando, error, onRecargar }) {
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const correr = async (corta = false) => {
    setOcupado(true);
    setMsg(null);
    try {
      await chatApi.post("/espia/pasada", corta ? { pais, max_paginas: 5 } : { pais });
      setMsg({
        tipo: "ok",
        texto: corta
          ? "Prueba corta iniciada (5 páginas, unos 20 segundos). Refresca el estado: si queda «Completa» con ~200 productos, la llave y la IP del servidor están bien."
          : "Pasada iniciada. Tarda alrededor de una hora; puedes seguir trabajando y refrescar el estado después.",
      });
      onRecargar();
    } catch (err) {
      setMsg({ tipo: "error", texto: textoError(err) });
    } finally {
      setOcupado(false);
    }
  };
  const u = estado?.ultima_pasada;
  const tonoPasada = !u ? "slate" : u.estado === "ok" ? "emerald" : u.estado === "en_curso" ? "sky" : "rose";
  const freno = estado?.freno_hasta ? new Date(estado.freno_hasta) : null;
  const frenado = freno && freno.getTime() > Date.now();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Recolector de Dropi · {pais}</h2>
          <p className="text-xs text-slate-500">Foto del stock de todo el catálogo dos veces al día. Las ventas se estiman por la baja de stock entre fotos.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={btnSuave} onClick={onRecargar} title="Refrescar estado">
            <i className="bx bx-refresh" />
          </button>
          <button
            type="button"
            className={btnSuave}
            disabled={ocupado || frenado || u?.estado === "en_curso"}
            onClick={() => correr(true)}
            title="Lee solo 5 páginas del catálogo para comprobar la llave y la IP del servidor"
          >
            <i className="bx bx-test-tube" /> Prueba corta
          </button>
          <button type="button" className={btnPrimario} disabled={ocupado || frenado || u?.estado === "en_curso"} onClick={() => correr(false)}>
            <i className={`bx ${ocupado ? "bx-loader-alt animate-spin" : "bx-play"}`} /> Correr pasada ahora
          </button>
        </div>
      </div>
      {cargando ? (
        <p className="mt-3 text-sm text-slate-500">Cargando estado…</p>
      ) : error ? (
        <Aviso tipo="error" className="mt-3">
          {error}
        </Aviso>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-7">
          <Indicador label="Cuenta Dropi" valor={estado?.cuenta?.store_name || (estado?.cuenta?.error ? "Sin cuenta" : "—")}>
            {estado?.cuenta?.error ? (
              <Etiqueta tono="rose">{estado.cuenta.error}</Etiqueta>
            ) : (
              <span className="text-[11px] text-slate-400">
                {estado?.cuenta?.nombre_configuracion} · cfg {estado?.cuenta?.id_configuracion} · integración #{estado?.cuenta?.integracion_id}
              </span>
            )}
          </Indicador>
          <Indicador label="Última pasada" valor={u ? fmtFecha(u.fin || u.inicio) : "Nunca"}>
            {u ? (
              <Etiqueta tono={tonoPasada}>{u.estado === "ok" ? "Completa" : u.estado === "en_curso" ? "En curso" : u.estado || "—"}</Etiqueta>
            ) : (
              <Etiqueta tono="slate">Sin pasadas</Etiqueta>
            )}
          </Indicador>
          <Indicador label="Páginas / fotos" valor={u ? `${fmtNum(u.paginas)} / ${fmtNum(u.fotos_escritas)}` : "—"} />
          <Indicador label="Productos seguidos" valor={fmtNum(estado?.productos_total)} />
          <Indicador label="Freno de Dropi" valor={frenado ? `Hasta ${fmtFecha(freno)}` : "Libre"}>
            <Etiqueta tono={frenado ? "rose" : "emerald"}>{frenado ? "Frenado (429)" : estado?.cron_activo ? "Cron activo" : "Cron apagado"}</Etiqueta>
          </Indicador>
          <Indicador label="Anuncios (extensión)" valor={fmtNum(estado?.extension?.anuncios_total)} />
          <Indicador label="Tiendas (extensión)" valor={fmtNum(estado?.extension?.tiendas_total)}>
            <span className="text-[11px] text-slate-400">Último envío: {estado?.extension?.ultimo_envio ? fmtFecha(estado.extension.ultimo_envio) : "nunca"}</span>
          </Indicador>
        </div>
      )}
      {u?.error ? (
        <Aviso tipo="warn" className="mt-3">
          La última pasada terminó con error: {u.error}
        </Aviso>
      ) : null}
      {msg ? (
        <Aviso tipo={msg.tipo} className="mt-3">
          {msg.texto}
        </Aviso>
      ) : null}
    </div>
  );
}

function Indicador({ label, valor, children }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="truncate text-sm font-bold text-slate-800" title={String(valor)}>
        {valor}
      </p>
      {children ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}

function BloqueExtension() {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm">
      <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setAbierto((v) => !v)}>
        <span className="flex items-center gap-2 font-bold text-slate-800">
          <i className="bx bxl-chrome text-lg text-indigo-600" /> Extensión de Chrome «Espía de tiendas»
        </span>
        <i className={`bx ${abierto ? "bx-chevron-up" : "bx-chevron-down"} text-slate-400`} />
      </button>
      {abierto ? (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-600">
          <li>
            Abre <code className="rounded bg-slate-100 px-1">chrome://extensions</code>, activa «Modo desarrollador» y pulsa «Cargar descomprimida».
          </li>
          <li>
            Elige la carpeta <code className="rounded bg-slate-100 px-1">extension/espia-tiendas</code> del repo del front.
          </li>
          <li>Con Imporchat abierto en este mismo Chrome, la extensión inicia sesión sola. Luego busca una tienda en la Biblioteca de anuncios de Meta: lo que lea aparece aquí en Anuncios y Tiendas.</li>
        </ol>
      ) : null}
    </div>
  );
}

function ReporteModal({ pais, onClose }) {
  const { data, cargando, error, recargar } = useConsulta("/espia/reporte", { pais });
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(data?.texto || "");
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };
  return (
    <Modal
      titulo={`Reporte de hoy · ${pais}`}
      subtitulo={data?.generado_en ? `Generado ${fmtFecha(data.generado_en)}` : "Es el mismo texto que llega por WhatsApp a las 7:30"}
      onClose={onClose}
      ancho="max-w-2xl"
      acciones={
        <button type="button" className={btnSuave} disabled={!data?.texto} onClick={copiar}>
          <i className={`bx ${copiado ? "bx-check" : "bx-copy"}`} /> {copiado ? "Copiado" : "Copiar"}
        </button>
      }
    >
      <EstadoLista cargando={cargando} error={error} vacio={!cargando && !error && !data?.texto} textoVacio="Todavía no hay datos para armar el reporte." onReintentar={recargar} />
      {data?.texto ? <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm text-slate-800">{data.texto}</pre> : null}
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
    (nuevaTab, nuevoPais, nuevosFiltros) => {
      const next = new URLSearchParams();
      next.set("tab", nuevaTab);
      next.set("pais", nuevoPais);
      Object.entries(nuevosFiltros || {}).forEach(([k, v]) => {
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
     enlace sea compartible. */
  useEffect(() => {
    if (!searchParams.get("tab") || !searchParams.get("pais")) escribir(tab, pais, filtros);
  }, [searchParams, tab, pais, filtros, escribir]);

  useEffect(() => {
    localStorage.setItem(CLAVE_PAIS, pais);
  }, [pais]);

  const setFiltros = (f) => escribir(tab, pais, f);
  const cambiarTab = (t) => {
    const guardados = leerGuardados()[t];
    escribir(t, pais, guardados && Object.keys(guardados).length ? guardados : filtrosPorDefecto(t));
  };
  const cambiarPais = (p) => escribir(tab, p, filtros);
  const verTienda = (dominio) => escribir("tiendas", pais, { q: dominio, dominio });
  const verAnunciosDe = (dominio) => escribir("anuncios", pais, { dominio });

  const estado = useConsulta("/espia/estado", { pais });

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <i className="bx bx-radar text-indigo-600" /> Espía de mercado
          </h1>
          <p className="text-sm text-slate-500">Qué se vende en Dropi, qué anuncios están activos y qué tiendas pautan. Solo dirección.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className={`${select} w-40`} value={pais} onChange={(e) => cambiarPais(e.target.value)} aria-label="País">
            {PAISES.map((p) => (
              <option key={p.code} value={p.code}>
                {p.nombre} ({p.code})
              </option>
            ))}
          </select>
          <button type="button" className={btnSuave} onClick={() => setVerReporte(true)}>
            <i className="bx bx-receipt" /> Ver reporte de hoy
          </button>
        </div>
      </div>

      <TarjetaEstado pais={pais} estado={estado.data} cargando={estado.cargando} error={estado.error} onRecargar={estado.recargar} />
      <BloqueExtension />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => cambiarTab(t.id)}
              className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-bold transition ${
                tab === t.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <i className={`bx ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>
        {tab === "productos" ? <TabProductos key={pais} pais={pais} filtros={filtros} setFiltros={setFiltros} /> : null}
        {tab === "anuncios" ? <TabAnuncios key={pais} pais={pais} filtros={filtros} setFiltros={setFiltros} onVerTienda={verTienda} /> : null}
        {tab === "tiendas" ? <TabTiendas key={`${pais}-${filtros.dominio || ""}`} pais={pais} filtros={filtros} setFiltros={setFiltros} onVerAnuncios={verAnunciosDe} /> : null}
      </div>

      {verReporte ? <ReporteModal pais={pais} onClose={() => setVerReporte(false)} /> : null}
    </div>
  );
}
