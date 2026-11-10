import { useState } from "react";
import { motion } from "framer-motion";
import { BarraHerramientas, usePorPagina } from "./componentes/BarraHerramientas";
import EmptyGuia from "./componentes/EmptyGuia";
import { BotonDescargar, Campo, Chip, Creativo, EstadoLista, Etiqueta, EtiquetaPlataforma, GrupoFiltro, LogoTienda, PLATAFORMAS, Paginacion, btnChico, fmtDia, fmtNum, haceCuanto, input, tarjeta, urlMeta, useConsulta } from "./ui";

/* ═══════════════════════════════════════════════════════════════════════
   Pestaña Anuncios: anuncios activos de la Biblioteca de Meta.
   Arriba, tres grupos de filtros con título (tiempo activo, formato, dónde
   vende); debajo buscador y orden; y la grilla de tarjetas con el creativo,
   los días activo como insignia, quién pauta (con su logo) y las acciones:
   ver en Meta, abrir la tienda y descargar el creativo. Vacío → guía.
   ═══════════════════════════════════════════════════════════════════════ */

/* Atajo del curso: anuncios de 7 a 50 días activos, vistos en los últimos 3. */
export const ATAJO_ANUNCIOS = { min_dias: "7", max_dias: "50", visto_dias: "3" };

/* Tiempo activo en palabras: cada opción pone los tres campos de días. */
const SIN_DIAS = { min_dias: "", max_dias: "", visto_dias: "" };
const TIEMPOS = [
  { id: "todos", label: "Todos", f: SIN_DIAS },
  { id: "ahora", label: "Funcionando ahora", icono: "bx-target-lock", nota: "Entre 7 y 50 días activos y vistos en los últimos 3 días: lo que está dando resultado hoy", f: ATAJO_ANUNCIOS },
  { id: "nuevos", label: "Recién lanzados", icono: "bx-rocket", nota: "Menos de una semana activos: todavía en prueba", f: { ...SIN_DIAS, max_dias: "6" } },
  { id: "mes", label: "Más de un mes", icono: "bx-check-shield", nota: "Más de 30 días activos: ya pasaron la prueba", f: { ...SIN_DIAS, min_dias: "30" } },
  { id: "veteranos", label: "Más de 3 meses", icono: "bx-medal", nota: "Más de 90 días activos: nadie paga tres meses por un anuncio que no vende", f: { ...SIN_DIAS, min_dias: "90" } },
];
const CAMPOS_DIAS = ["min_dias", "max_dias", "visto_dias"];
const tiempoPuesto = (filtros) => TIEMPOS.find((t) => CAMPOS_DIAS.every((k) => String(filtros[k] ?? "") === t.f[k]))?.id || "personalizado";

const ORDENES = [
  { id: "dias", label: "Más días activo" },
  { id: "recientes", label: "Más recientes" },
  { id: "duplicados", label: "Más copias" },
  { id: "vistos", label: "Vistos hace poco" },
];

function tonoDias(d) {
  const n = Number(d) || 0;
  if (n >= 90) return { bg: "bg-[#0B1426] text-white", nota: "Veterano: lleva meses pautando, está dando resultados" };
  if (n >= 30) return { bg: "bg-emerald-500 text-white", nota: "Más de un mes activo: ya pasó la prueba" };
  if (n >= 7) return { bg: "bg-sky-500 text-white", nota: "Entre una semana y un mes: en validación" };
  return { bg: "bg-slate-200 text-slate-700", nota: "Menos de una semana" };
}

/* Tarjeta de un anuncio. La usan la pestaña, el detalle de una tienda y la
   ficha de producto (`compacta`; `insignia` = etiqueta extra junto al logo). */
export function TarjetaAnuncio({ a, onVerTienda, compacta = false, insignia = null }) {
  const dias = tonoDias(a.dias_activo);
  const tienda = a.url_destino || (a.dominio ? `https://${a.dominio}` : null);
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${tarjeta} group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(11,20,38,0.45)]`}
    >
      {/* Quién pauta: logo de la tienda, nombre de la página y dominio. */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <LogoTienda dominio={a.dominio} plataforma={a.tienda_plataforma} className="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-extrabold leading-tight text-slate-900" title={a.pagina_nombre}>
            {a.pagina_nombre || a.dominio || "Página sin nombre"}
          </p>
          {a.dominio ? (
            onVerTienda ? (
              <button type="button" className="block max-w-full truncate text-[11.5px] font-semibold text-sky-700 hover:underline" onClick={() => onVerTienda(a.dominio)} title="Ver esta tienda y todos sus anuncios">
                {a.dominio}
              </button>
            ) : (
              <p className="truncate text-[11.5px] text-slate-500">{a.dominio}</p>
            )
          ) : (
            <p className="truncate text-[11.5px] text-slate-400">Página de Facebook</p>
          )}
        </div>
        {insignia}
        {a.tienda_plataforma ? <EtiquetaPlataforma plataforma={a.tienda_plataforma} className="shrink-0" /> : null}
      </div>

      <div className={`relative ${compacta ? "h-44" : "h-64"} overflow-hidden bg-slate-900`}>
        <Creativo anuncio={a} />
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <span className={`inline-flex items-baseline gap-1 rounded-xl px-2.5 py-1 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.8)] ${dias.bg}`} title={`${dias.nota}. En circulación desde ${fmtDia(a.inicio)}`}>
            <span className="text-lg font-extrabold leading-none tabular-nums">{fmtNum(a.dias_activo)}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-90">días activo</span>
          </span>
          {Number(a.n_duplicados) > 1 ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-amber-950 shadow" title="Versiones del mismo anuncio corriendo a la vez: mientras más, más está invirtiendo">
              <i className="bx bx-copy" /> {fmtNum(a.n_duplicados)} copias
            </span>
          ) : null}
        </div>
        <div className="pointer-events-none absolute right-3 top-3 flex gap-1">
          <span className="inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
            <i className={`bx ${a.tipo === "video" ? "bx-movie-play" : "bx-image"}`} /> {a.tipo === "video" ? "Video" : "Imagen"}
          </span>
          {a.activo === false || a.activo === 0 ? <span className="rounded-lg bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">Inactivo</span> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3.5 py-3 text-sm">
        {a.titulo ? <p className="line-clamp-1 font-extrabold text-slate-900">{a.titulo}</p> : null}
        {a.texto ? (
          <p className={`${compacta ? "line-clamp-2" : "line-clamp-3"} text-xs leading-5 text-slate-600`} title={a.texto}>
            {a.texto}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-slate-400">
          {a.producto ? (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-slate-500" title={a.producto}>
              <i className="bx bx-package text-sm" /> <span className="truncate">{a.producto}</span>
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <i className="bx bx-calendar text-sm" /> Desde {fmtDia(a.inicio)}
          </span>
          {a.ultima_vez_visto ? <span>Visto {haceCuanto(a.ultima_vez_visto)}</span> : null}
        </div>
        <div className="flex gap-2 pt-1">
          <a href={urlMeta(a)} target="_blank" rel="noreferrer" className={`${btnChico} ${compacta ? "" : "flex-1"} whitespace-nowrap bg-[#0B1426] text-white hover:bg-[#13244a]`}>
            <i className="bx bx-link-external" /> Ver en Meta
          </a>
          {/* En la tarjeta compacta no caben tres botones con texto: la tienda va como ícono. */}
          {tienda ? (
            <a href={tienda} target="_blank" rel="noreferrer" className={`${btnChico} ${compacta ? "" : "flex-1"} whitespace-nowrap border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`} title={a.tienda_plataforma === "whatsapp" ? "Abrir el chat de WhatsApp" : `Abrir la tienda: ${tienda}`} aria-label="Abrir la tienda">
              <i className={`bx ${a.tienda_plataforma === "whatsapp" ? "bxl-whatsapp" : "bx-shopping-bag"}`} /> {compacta ? null : a.tienda_plataforma === "whatsapp" ? "Abrir chat" : "Abrir tienda"}
            </a>
          ) : null}
          <BotonDescargar anuncio={a} conTexto={compacta || !tienda} corto={compacta} className={compacta || !tienda ? "min-w-0 flex-1 whitespace-nowrap" : ""} />
        </div>
      </div>
    </motion.article>
  );
}

/* Columnas de la grilla: crece con la pantalla (hasta 6 en monitores anchos). */
export const GRILLA_ANUNCIOS = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1800px]:grid-cols-5 min-[2200px]:grid-cols-6";

export default function TabAnuncios({ pais, filtros, setFiltros, onVerTienda }) {
  const page = Number(filtros.page) || 1;
  const [limit, setLimit] = usePorPagina(25);
  const tiempo = tiempoPuesto(filtros);
  const [mostrarFiltros, setMostrarFiltros] = useState(() => tiempo === "personalizado");
  const params = {
    pais,
    q: filtros.q || "",
    dominio: filtros.dominio || "",
    tipo: filtros.tipo || "",
    plataforma: filtros.plataforma || "",
    min_dias: filtros.min_dias ?? "",
    max_dias: filtros.max_dias ?? "",
    visto_dias: filtros.visto_dias ?? "",
    orden: filtros.orden || "dias",
    page,
    limit,
  };
  const { data, cargando, error, recargar } = useConsulta("/espia/anuncios", params);
  const items = data?.items || [];
  const set = (cambios) => setFiltros({ ...filtros, ...cambios, page: cambios.page || 1 });
  const sinFiltros = !filtros.q && !filtros.dominio && !filtros.tipo && !filtros.plataforma && !filtros.min_dias && !filtros.max_dias && !filtros.visto_dias;

  /* Sin filtros y sin nada en la base → guía de la extensión. Con filtros
     puestos y total 0, se consulta aparte si existe algo sin filtros para
     distinguir «no hay nada» de «los filtros lo esconden». */
  const sonda = useConsulta("/espia/anuncios", { pais, limit: 1 }, { activo: !cargando && !error && items.length === 0 && !sinFiltros });
  const baseVacia = !cargando && !error && items.length === 0 && (sinFiltros ? Number(data?.total) === 0 : sonda.data && Number(sonda.data.total) === 0);

  return (
    <div className="space-y-4">
      {/* ── Filtros con nombre ── */}
      <div className="grid gap-x-8 gap-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 lg:grid-cols-[minmax(0,1.5fr)_auto_minmax(0,1fr)]">
        <GrupoFiltro titulo="Tiempo activo" icono="bx-time-five">
          {TIEMPOS.map((t) => (
            <Chip key={t.id} activo={tiempo === t.id} title={t.nota} onClick={() => set(t.f)}>
              {t.icono ? <i className={`bx ${t.icono} text-sm`} /> : null} {t.label}
            </Chip>
          ))}
          {tiempo === "personalizado" ? (
            <Chip activo tono="emerald" title="Rango de días elegido a mano. Tócalo para ajustarlo." onClick={() => setMostrarFiltros(true)}>
              <i className="bx bx-slider-alt text-sm" /> Rango propio
            </Chip>
          ) : null}
        </GrupoFiltro>
        <GrupoFiltro titulo="Formato" icono="bx-photo-album">
          <Chip activo={!filtros.tipo} onClick={() => set({ tipo: "" })}>
            Todos
          </Chip>
          <Chip activo={filtros.tipo === "video"} onClick={() => set({ tipo: "video" })}>
            <i className="bx bx-movie-play text-sm" /> Video
          </Chip>
          <Chip activo={filtros.tipo === "imagen"} onClick={() => set({ tipo: "imagen" })}>
            <i className="bx bx-image text-sm" /> Imagen
          </Chip>
        </GrupoFiltro>
        <GrupoFiltro titulo="Dónde vende" icono="bx-store-alt">
          <Chip activo={!filtros.plataforma} onClick={() => set({ plataforma: "" })}>
            Todos
          </Chip>
          {PLATAFORMAS.map((p) => (
            <Chip key={p.id} activo={filtros.plataforma === p.id} title={p.nota} onClick={() => set({ plataforma: p.id })}>
              <i className={`bx ${p.icono} text-sm`} /> {p.label}
            </Chip>
          ))}
        </GrupoFiltro>
        {filtros.dominio ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 lg:col-span-3">
            Solo anuncios de la tienda
            <Chip activo tono="emerald" onClick={() => set({ dominio: "" })} title="Quitar el filtro de tienda">
              <LogoTienda dominio={filtros.dominio} className="h-4 w-4" redondeo="rounded" /> {filtros.dominio} <i className="bx bx-x" />
            </Chip>
          </div>
        ) : null}
      </div>

      <BarraHerramientas
        buscador={{ valor: filtros.q, onChange: (q) => set({ q }), placeholder: "Buscar por producto, texto del anuncio, página o tienda" }}
        orden={{ valor: params.orden, opciones: ORDENES, onChange: (orden) => set({ orden }) }}
        porPagina={{
          valor: limit,
          onChange: (n) => {
            setLimit(n);
            set({ page: 1 });
          },
        }}
        filtros={{ etiqueta: "Rango de días", onToggle: () => setMostrarFiltros((v) => !v), contador: tiempo === "personalizado" ? CAMPOS_DIAS.filter((k) => filtros[k]).length : 0 }}
        panelAbierto={mostrarFiltros}
      >
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
          <Campo label="Activo desde hace al menos (días)">
            <input className={input} type="number" min="0" placeholder="Ej. 7" value={filtros.min_dias ?? ""} onChange={(e) => set({ min_dias: e.target.value })} />
          </Campo>
          <Campo label="Activo desde hace máximo (días)">
            <input className={input} type="number" min="0" placeholder="Ej. 50" value={filtros.max_dias ?? ""} onChange={(e) => set({ max_dias: e.target.value })} />
          </Campo>
          <Campo label="Visto en los últimos (días)">
            <input className={input} type="number" min="1" placeholder="Ej. 3" value={filtros.visto_dias ?? ""} onChange={(e) => set({ visto_dias: e.target.value })} />
          </Campo>
          <div className="flex items-end">
            <button type="button" className={`${btnChico} h-10 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => set(SIN_DIAS)} disabled={!filtros.min_dias && !filtros.max_dias && !filtros.visto_dias}>
              <i className="bx bx-eraser" /> Quitar rango
            </button>
          </div>
        </div>
      </BarraHerramientas>

      {!cargando && !error && items.length ? <Paginacion compacta siempre page={page} limit={limit} total={data?.total} onPage={(p) => setFiltros({ ...filtros, page: p })} /> : null}

      <EstadoLista
        cargando={cargando}
        error={error}
        vacio={!cargando && !error && items.length === 0}
        onReintentar={recargar}
        esqueleto={
          <div className={GRILLA_ANUNCIOS}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[430px] animate-pulse rounded-2xl bg-gradient-to-b from-slate-100 to-slate-50" />
            ))}
          </div>
        }
        vacioNodo={
          baseVacia ? (
            <EmptyGuia pais={pais} seccion="anuncios" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[22px] border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-14 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-3xl text-sky-500 shadow-[0_12px_30px_-12px_rgba(11,20,38,0.35)] ring-1 ring-slate-100">
                <i className="bx bx-filter-alt" />
              </span>
              <h3 className="text-base font-extrabold text-slate-900">Ningún anuncio cumple con estos filtros</h3>
              <p className="max-w-md text-sm leading-6 text-slate-500">Hay anuncios guardados, pero los filtros o la búsqueda los esconden. Prueba con «Todos» en tiempo activo o quita la tienda.</p>
              <button type="button" className={`${btnChico} bg-[#0B1426] text-white hover:bg-[#13244a]`} onClick={() => setFiltros({ orden: filtros.orden || "dias" })}>
                <i className="bx bx-eraser" /> Quitar todos los filtros
              </button>
            </div>
          )
        }
      />

      {!cargando && !error && items.length ? (
        <div className={GRILLA_ANUNCIOS}>
          {items.map((a) => (
            <TarjetaAnuncio key={a.ad_archive_id} a={a} onVerTienda={onVerTienda} />
          ))}
        </div>
      ) : null}

      {!cargando && !error && items.length ? <Paginacion page={page} limit={limit} total={data?.total} onPage={(p) => setFiltros({ ...filtros, page: p })} /> : null}
      {!cargando && !error && items.length ? (
        <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          Color de los días activo: <Etiqueta tono="navy">90+</Etiqueta> veteranos · <Etiqueta tono="emerald">30+</Etiqueta> validados · <Etiqueta tono="sky">7+</Etiqueta> en prueba. Se cuentan desde la fecha de inicio que publica Meta.
        </p>
      ) : null}
    </div>
  );
}
