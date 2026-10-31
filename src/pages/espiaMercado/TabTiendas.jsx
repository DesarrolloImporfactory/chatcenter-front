import { useState } from "react";
import { motion } from "framer-motion";
import { TarjetaAnuncio } from "./TabAnuncios";
import { BarraHerramientas, usePorPagina } from "./componentes/BarraHerramientas";
import BotonSeguir from "./componentes/BotonSeguir";
import Drawer from "./componentes/Drawer";
import EmptyGuia from "./componentes/EmptyGuia";
import { BarrasSVG, Sparkline } from "./componentes/Sparkline";
import { Aviso, Chip, Esqueleto, EstadoLista, Etiqueta, EtiquetaPlataforma, PLATAFORMAS, Paginacion, btnChico, btnOscuro, fmtDia, fmtNum, haceCuanto, tarjeta, useConsulta } from "./ui";

/* ═══════════════════════════════════════════════════════════════════════
   Pestaña Tiendas: dominios que pautan, con anuncios activos, nuevos hoy,
   tendencia de 30 días y seguimiento. Tarjetas; detalle en panel lateral
   con los productos agrupados y sus anuncios.
   ═══════════════════════════════════════════════════════════════════════ */

const ORDENES = [
  { id: "activos", label: "Más anuncios activos" },
  { id: "nuevos", label: "Descubiertas hace poco" },
  { id: "recientes", label: "Analizadas hace poco" },
  { id: "productos", label: "Más productos" },
];

function TipoTienda({ productos }) {
  const n = Number(productos);
  if (!n) return null;
  if (n <= 30) return <Etiqueta tono="sky" title="Hasta 30 productos: suele ser una marca">Marca</Etiqueta>;
  return <Etiqueta tono="amber" title="Más de 30 productos: suele ser dropshipping">Dropshipping</Etiqueta>;
}

function Inicial({ texto }) {
  const letra = String(texto || "?").replace(/^www\./, "").charAt(0).toUpperCase();
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(11,20,38,0.7)]" style={{ background: "linear-gradient(135deg, #0B1426 0%, #1e3a8a 100%)" }} aria-hidden="true">
      {letra}
    </span>
  );
}

/* ── Detalle de una tienda ───────────────────────────────────────────── */
function DetalleTienda({ dominio, pais, onClose, onVerAnuncios, seguidaInicial, onSeguida }) {
  const { data, cargando, error, recargar, setData } = useConsulta(`/espia/tiendas/${encodeURIComponent(dominio)}`, { pais });
  const t = data?.tienda;
  const productos = data?.productos || [];
  const [abierto, setAbierto] = useState(null);
  const seguida = t ? !!t.seguida : !!seguidaInicial;

  const cambio = (s) => {
    setData((d) => (d ? { ...d, tienda: { ...d.tienda, seguida: s } } : d));
    onSeguida?.(s);
  };

  return (
    <Drawer
      titulo={t?.nombre || dominio}
      subtitulo={t ? `${dominio}${t.plataforma ? ` · ${PLATAFORMAS.find((p) => p.id === t.plataforma)?.label || t.plataforma}` : t.es_shopify ? " · Shopify" : ""}${t.moneda ? ` · ${t.moneda}` : ""}${t.tema ? ` · tema ${t.tema}` : ""}` : dominio}
      onClose={onClose}
      ancho="max-w-4xl"
      acciones={
        <>
          <a href={`https://${dominio}`} target="_blank" rel="noreferrer" className={`${btnOscuro} px-3 py-1.5 text-xs`}>
            <i className="bx bx-link-external" /> Abrir tienda
          </a>
          <button type="button" className={`${btnOscuro} px-3 py-1.5 text-xs`} onClick={() => onVerAnuncios(dominio)}>
            <i className="bx bx-images" /> Todos sus anuncios
          </button>
          <BotonSeguir tipo="tienda" objetivo={dominio} pais={pais} seguida={seguida} onCambio={cambio} variante="texto" claro />
        </>
      }
      cabeceraExtra={
        t ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Mini label="Anuncios activos" valor={fmtNum(t.anuncios_activos)} />
            <Mini label="Nuevos hoy" valor={Number(t.anuncios_nuevos_hoy) > 0 ? `+${fmtNum(t.anuncios_nuevos_hoy)}` : "0"} />
            <Mini label="Productos" valor={fmtNum(t.productos)} />
            <Mini label="Última revisión" valor={fmtDia(t.ultima_revision || t.ultima_vez)} />
          </div>
        ) : null
      }
    >
      <EstadoLista cargando={cargando} error={error} vacio={!cargando && !error && !t} textoVacio="No encontramos esta tienda." onReintentar={recargar} esqueleto={<Esqueleto filas={5} alto="h-20" />} />
      {t ? (
        <div className="space-y-6">
          <section className={`${tarjeta} p-4`}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Anuncios activos por día · 30 días</h4>
                <p className="text-xs text-slate-500">Cada punto es un día en que alguien del equipo analizó la tienda con la extensión.</p>
              </div>
              <div className="flex gap-1.5">
                {t.plataforma ? (
                  <EtiquetaPlataforma plataforma={t.plataforma} />
                ) : t.es_shopify ? (
                  <Etiqueta tono="verde">
                    <i className="bx bxl-shopify" /> Shopify
                  </Etiqueta>
                ) : null}
                <TipoTienda productos={t.productos} />
              </div>
            </div>
            <BarrasSVG serie={data?.tendencia || []} campo="anuncios_activos" alto={96} vacio="Todavía no hay historial: aparece al analizar la tienda varios días." />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-900">Productos con anuncios</h4>
              <Etiqueta tono="navy">{fmtNum(productos.length)}</Etiqueta>
            </div>
            {productos.length ? (
              <div className={`${tarjeta} divide-y divide-slate-100 overflow-hidden`}>
                {productos.map((p, i) => {
                  const key = p.url_destino || p.producto || i;
                  const open = abierto === key;
                  return (
                    <div key={key}>
                      <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-slate-50" onClick={() => setAbierto(open ? null : key)} aria-expanded={open}>
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition ${open ? "bg-[#0B1426] text-white" : "bg-slate-100 text-slate-500"}`}>
                          <i className={`bx ${open ? "bx-chevron-down" : "bx-chevron-right"}`} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">{p.producto || "Sin nombre"}</p>
                          {p.url_destino ? (
                            <a href={p.url_destino} target="_blank" rel="noreferrer" className="block truncate text-xs text-sky-700 hover:underline" onClick={(e) => e.stopPropagation()}>
                              {p.url_destino}
                            </a>
                          ) : null}
                        </div>
                        <Etiqueta tono="sky">{fmtNum(p.n_anuncios)} anuncios</Etiqueta>
                      </button>
                      {open ? (
                        <div className="grid grid-cols-1 gap-3 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
                          {(p.anuncios || []).map((a) => (
                            <TarjetaAnuncio key={a.ad_archive_id} a={a} compacta />
                          ))}
                          {!(p.anuncios || []).length ? <p className="text-xs text-slate-500">Sin anuncios cargados para este producto.</p> : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <Aviso>Todavía no hay anuncios agrupados por producto para esta tienda. Analízala con la extensión en la Biblioteca de Meta y vuelve aquí.</Aviso>
            )}
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}

function Mini({ label, valor }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300/80">{label}</p>
      <p className="text-base font-extrabold text-white tabular-nums">{valor}</p>
    </div>
  );
}

/* ── Tarjeta de tienda ───────────────────────────────────────────────── */
function TarjetaTienda({ t, pais, onAbrir, onSeguida, onVerAnuncios }) {
  const nuevos = Number(t.anuncios_nuevos_hoy) || 0;
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${tarjeta} group relative flex cursor-pointer flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(11,20,38,0.45)]`}
      onClick={() => onAbrir(t.dominio)}
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" ? onAbrir(t.dominio) : null)}
    >
      <div className="flex items-start gap-3">
        <Inicial texto={t.nombre || t.dominio} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold text-slate-900" title={t.nombre || t.dominio}>
            {t.nombre || t.dominio}
          </p>
          <p className="truncate text-xs text-slate-500">{t.dominio}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {t.plataforma ? (
              <EtiquetaPlataforma plataforma={t.plataforma} />
            ) : t.es_shopify ? (
              <Etiqueta tono="verde">
                <i className="bx bxl-shopify" /> Shopify
              </Etiqueta>
            ) : null}
            <TipoTienda productos={t.productos} />
            {t.pais_principal ? <Etiqueta tono="slate">{t.pais_principal}</Etiqueta> : null}
          </div>
        </div>
        <BotonSeguir tipo="tienda" objetivo={t.dominio} pais={pais} seguida={t.seguida} onCambio={(s) => onSeguida(t.dominio, s)} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Cifra label="Activos" valor={fmtNum(t.anuncios_activos)} destacada />
        <Cifra label="Nuevos hoy" valor={nuevos > 0 ? `+${fmtNum(nuevos)}` : "0"} tono={nuevos > 0 ? "text-emerald-600" : "text-slate-400"} />
        <Cifra label="Productos" valor={fmtNum(t.productos)} />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tendencia 30 d</p>
          <Sparkline serie={t.tendencia} campo="anuncios_activos" ancho={150} alto={36} color="auto" />
        </div>
        <div className="text-right text-[11px] text-slate-400">
          <p>Analizada {haceCuanto(t.ultima_revision || t.ultima_vez)}</p>
          {t.producto_top ? (
            <p className="max-w-[160px] truncate" title={t.producto_top}>
              <i className="bx bx-crown text-amber-500" /> {t.producto_top}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          className={`${btnChico} flex-1 bg-[#0B1426] text-white hover:bg-[#13244a]`}
          onClick={(e) => {
            e.stopPropagation();
            onAbrir(t.dominio);
          }}
        >
          <i className="bx bx-show" /> Ver detalle
        </button>
        <button
          type="button"
          className={`${btnChico} flex-1 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          onClick={(e) => {
            e.stopPropagation();
            onVerAnuncios(t.dominio);
          }}
        >
          <i className="bx bx-images" /> Anuncios
        </button>
        <a href={`https://${t.dominio}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className={`${btnChico} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`} title="Abrir la tienda" aria-label="Abrir la tienda">
          <i className="bx bx-link-external" />
        </a>
      </div>
    </motion.article>
  );
}

function Cifra({ label, valor, destacada = false, tono }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${destacada ? "bg-[#0B1426] text-white" : "bg-slate-50"}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wide ${destacada ? "text-slate-300" : "text-slate-400"}`}>{label}</p>
      <p className={`text-lg font-extrabold leading-tight tabular-nums ${destacada ? "text-white" : tono || "text-slate-800"}`}>{valor}</p>
    </div>
  );
}

/* ── Pestaña ──────────────────────────────────────────────────────────── */
export default function TabTiendas({ pais, filtros, setFiltros, onVerAnuncios }) {
  const page = Number(filtros.page) || 1;
  const [limit, setLimit] = usePorPagina(25);
  const params = {
    pais,
    q: filtros.q || "",
    orden: filtros.orden || "activos",
    solo_seguidas: filtros.solo_seguidas ? 1 : "",
    plataforma: filtros.plataforma || "",
    page,
    limit,
  };
  const { data, cargando, error, recargar, setData } = useConsulta("/espia/tiendas", params);
  const items = data?.items || [];
  const set = (cambios) => setFiltros({ ...filtros, ...cambios, page: cambios.page || 1 });
  const [detalle, setDetalle] = useState(filtros.dominio || null);

  const marcarSeguida = (dominio, seguida) => setData((d) => (d ? { ...d, items: (d.items || []).map((t) => (t.dominio === dominio ? { ...t, seguida } : t)) } : d));
  const baseVacia = !cargando && !error && items.length === 0 && !filtros.q && !filtros.solo_seguidas && !filtros.plataforma && Number(data?.total) === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip activo={!!filtros.solo_seguidas} tono="emerald" onClick={() => set({ solo_seguidas: filtros.solo_seguidas ? "" : "1" })}>
          <i className="bx bxs-star" /> Solo seguidas
        </Chip>
        <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" aria-hidden />
        {PLATAFORMAS.map((p) => (
          <Chip key={p.id} activo={filtros.plataforma === p.id} title={p.nota} onClick={() => set({ plataforma: filtros.plataforma === p.id ? "" : p.id })}>
            <i className={`bx ${p.icono} text-sm`} /> {p.label}
          </Chip>
        ))}
      </div>

      <BarraHerramientas
        buscador={{ valor: filtros.q, onChange: (q) => set({ q }), placeholder: "Buscar por dominio o nombre de la tienda" }}
        orden={{ valor: params.orden, opciones: ORDENES, onChange: (orden) => set({ orden }) }}
        porPagina={{
          valor: limit,
          onChange: (n) => {
            setLimit(n);
            set({ page: 1 });
          },
        }}
      />

      {!cargando && !error && items.length ? <Paginacion compacta siempre page={page} limit={limit} total={data?.total} onPage={(p) => setFiltros({ ...filtros, page: p })} /> : null}

      <EstadoLista
        cargando={cargando}
        error={error}
        vacio={!cargando && !error && items.length === 0}
        onReintentar={recargar}
        esqueleto={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[260px] animate-pulse rounded-2xl bg-gradient-to-b from-slate-100 to-slate-50" />
            ))}
          </div>
        }
        vacioNodo={
          baseVacia ? (
            <EmptyGuia pais={pais} seccion="tiendas" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[22px] border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-14 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-3xl text-sky-500 shadow-[0_12px_30px_-12px_rgba(11,20,38,0.35)] ring-1 ring-slate-100">
                <i className={`bx ${filtros.solo_seguidas ? "bx-star" : "bx-search-alt"}`} />
              </span>
              <h3 className="text-base font-extrabold text-slate-900">{filtros.solo_seguidas ? "Todavía no sigues ninguna tienda de este país" : "Ninguna tienda coincide con la búsqueda"}</h3>
              <p className="max-w-md text-sm leading-6 text-slate-500">
                {filtros.solo_seguidas ? "Pulsa la estrella de una tienda para seguirla: entra al reporte diario cuando lance anuncios nuevos." : "Prueba con otra palabra o quita el filtro de seguidas."}
              </p>
              {filtros.solo_seguidas ? (
                <button type="button" className={`${btnChico} bg-[#0B1426] text-white hover:bg-[#13244a]`} onClick={() => set({ solo_seguidas: "" })}>
                  Ver todas las tiendas
                </button>
              ) : null}
            </div>
          )
        }
      />

      {!cargando && !error && items.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((t) => (
            <TarjetaTienda key={t.dominio} t={t} pais={pais} onAbrir={setDetalle} onSeguida={marcarSeguida} onVerAnuncios={onVerAnuncios} />
          ))}
        </div>
      ) : null}

      {!cargando && !error && items.length ? <Paginacion page={page} limit={limit} total={data?.total} onPage={(p) => setFiltros({ ...filtros, page: p })} /> : null}

      {detalle ? (
        <DetalleTienda
          dominio={detalle}
          pais={pais}
          seguidaInicial={items.find((t) => t.dominio === detalle)?.seguida}
          onSeguida={(s) => marcarSeguida(detalle, s)}
          onClose={() => {
            setDetalle(null);
            if (filtros.dominio) set({ dominio: "" });
          }}
          onVerAnuncios={(d) => {
            setDetalle(null);
            onVerAnuncios(d);
          }}
        />
      ) : null}
    </div>
  );
}
