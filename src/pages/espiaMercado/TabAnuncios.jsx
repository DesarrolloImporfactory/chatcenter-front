import { useState } from "react";
import { motion } from "framer-motion";
import { BarraHerramientas, usePorPagina } from "./componentes/BarraHerramientas";
import EmptyGuia from "./componentes/EmptyGuia";
import { Campo, Chip, Creativo, Esqueleto, EstadoLista, Etiqueta, EtiquetaPlataforma, PLATAFORMAS, Paginacion, btnChico, fmtDia, fmtNum, haceCuanto, input, tarjeta, urlMeta, useConsulta } from "./ui";

/* ═══════════════════════════════════════════════════════════════════════
   Pestaña Anuncios: lo que la extensión lee en la Biblioteca de Meta.
   Grilla de tarjetas con creativo (video con play / imagen), días activos
   como insignia grande, copias, tienda y producto. Vacío → guía.
   ═══════════════════════════════════════════════════════════════════════ */

/* Atajo del curso: anuncios de 7 a 50 días activos, vistos en los últimos 3. */
export const ATAJO_ANUNCIOS = { min_dias: "7", max_dias: "50", visto_dias: "3" };

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

export function TarjetaAnuncio({ a, onVerTienda, compacta = false }) {
  const dias = tonoDias(a.dias_activo);
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${tarjeta} group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(11,20,38,0.45)]`}
    >
      <div className={`relative ${compacta ? "h-40" : "h-60"} overflow-hidden bg-slate-900`}>
        <Creativo anuncio={a} />
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <span className={`inline-flex items-baseline gap-1 rounded-xl px-2.5 py-1 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.8)] ${dias.bg}`} title={`${dias.nota}. En circulación desde ${fmtDia(a.inicio)}`}>
            <span className="text-lg font-extrabold leading-none tabular-nums">{fmtNum(a.dias_activo)}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-90">días</span>
          </span>
          {Number(a.n_duplicados) > 1 ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-amber-950 shadow" title="Variantes del mismo anuncio que agrupó Meta">
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

      <div className="flex flex-1 flex-col gap-2 px-4 py-3 text-sm">
        {a.titulo ? <p className="line-clamp-1 font-extrabold text-slate-900">{a.titulo}</p> : null}
        <p className={`${compacta ? "line-clamp-2" : "line-clamp-3"} text-xs leading-5 text-slate-600`} title={a.texto}>
          {a.texto || "Sin texto"}
        </p>
        <div className="mt-auto space-y-1 pt-1 text-xs text-slate-500">
          {a.tienda_plataforma ? (
            <div className="flex flex-wrap gap-1 pb-0.5">
              <EtiquetaPlataforma plataforma={a.tienda_plataforma} />
            </div>
          ) : null}
          <p className="flex items-center gap-1.5 truncate" title={a.pagina_nombre}>
            <i className="bx bxl-facebook-circle text-base text-[#1877F2]" /> <span className="truncate">{a.pagina_nombre || "Página sin nombre"}</span>
          </p>
          {a.dominio ? (
            <button type="button" className="flex max-w-full items-center gap-1.5 truncate font-bold text-sky-700 hover:underline" onClick={() => onVerTienda && onVerTienda(a.dominio)} title="Ver la tienda">
              <i className="bx bx-store text-base" /> <span className="truncate">{a.dominio}</span>
            </button>
          ) : null}
          {a.producto ? (
            <p className="flex items-center gap-1.5 truncate" title={a.producto}>
              <i className="bx bx-package text-base" /> <span className="truncate">{a.producto}</span>
            </p>
          ) : null}
          <p className="text-[11px] text-slate-400">Visto {haceCuanto(a.ultima_vez_visto)}</p>
        </div>
        <div className="flex gap-2 pt-1">
          <a href={urlMeta(a)} target="_blank" rel="noreferrer" className={`${btnChico} flex-1 bg-[#0B1426] text-white hover:bg-[#13244a]`}>
            <i className="bx bx-link-external" /> Ver en Meta
          </a>
          {a.url_destino ? (
            <a href={a.url_destino} target="_blank" rel="noreferrer" className={`${btnChico} flex-1 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`} title={a.url_destino}>
              <i className="bx bx-shopping-bag" /> Abrir tienda
            </a>
          ) : a.dominio ? (
            <a href={`https://${a.dominio}`} target="_blank" rel="noreferrer" className={`${btnChico} flex-1 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
              <i className="bx bx-shopping-bag" /> Abrir tienda
            </a>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}

export default function TabAnuncios({ pais, filtros, setFiltros, onVerTienda }) {
  const page = Number(filtros.page) || 1;
  const [limit, setLimit] = usePorPagina(25);
  const [mostrarFiltros, setMostrarFiltros] = useState(() => !!(filtros.min_dias || filtros.max_dias || filtros.visto_dias) && !["min_dias", "max_dias", "visto_dias"].every((k) => String(filtros[k] ?? "") === ATAJO_ANUNCIOS[k]));
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
  const atajoPuesto = ["min_dias", "max_dias", "visto_dias"].every((k) => String(filtros[k] ?? "") === ATAJO_ANUNCIOS[k]);
  const sinFiltros = !filtros.q && !filtros.dominio && !filtros.tipo && !filtros.plataforma && !filtros.min_dias && !filtros.max_dias && !filtros.visto_dias;

  /* Sin filtros y sin nada en la base → guía de la extensión. Con el atajo
     puesto y total 0, se consulta aparte si existe algo sin filtros para
     distinguir «no hay nada» de «el atajo lo esconde». */
  const sonda = useConsulta("/espia/anuncios", { pais, limit: 1 }, { activo: !cargando && !error && items.length === 0 && !sinFiltros });
  const baseVacia = !cargando && !error && items.length === 0 && (sinFiltros ? Number(data?.total) === 0 : sonda.data && Number(sonda.data.total) === 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip activo={atajoPuesto} title="7 a 50 días activos, vistos en los últimos 3 días: los que están funcionando ahora" onClick={() => set(atajoPuesto ? { min_dias: "", max_dias: "", visto_dias: "" } : ATAJO_ANUNCIOS)}>
          <i className="bx bx-target-lock text-sm" /> Funcionando ahora (7–50 días)
        </Chip>
        <Chip activo={filtros.tipo === "video"} onClick={() => set({ tipo: filtros.tipo === "video" ? "" : "video" })}>
          <i className="bx bx-movie-play text-sm" /> Solo video
        </Chip>
        <Chip activo={filtros.tipo === "imagen"} onClick={() => set({ tipo: filtros.tipo === "imagen" ? "" : "imagen" })}>
          <i className="bx bx-image text-sm" /> Solo imagen
        </Chip>
        <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" aria-hidden />
        {PLATAFORMAS.map((p) => (
          <Chip key={p.id} activo={filtros.plataforma === p.id} title={p.nota} onClick={() => set({ plataforma: filtros.plataforma === p.id ? "" : p.id })}>
            <i className={`bx ${p.icono} text-sm`} /> {p.label}
          </Chip>
        ))}
        {filtros.dominio ? (
          <Chip activo tono="emerald" onClick={() => set({ dominio: "" })} title="Quitar el filtro de tienda">
            <i className="bx bx-store" /> {filtros.dominio} <i className="bx bx-x" />
          </Chip>
        ) : null}
      </div>

      <BarraHerramientas
        buscador={{ valor: filtros.q, onChange: (q) => set({ q }), placeholder: "Buscar en el texto, título, página o producto" }}
        orden={{ valor: params.orden, opciones: ORDENES, onChange: (orden) => set({ orden }) }}
        porPagina={{
          valor: limit,
          onChange: (n) => {
            setLimit(n);
            set({ page: 1 });
          },
        }}
        filtros={{ onToggle: () => setMostrarFiltros((v) => !v), contador: atajoPuesto ? 0 : ["min_dias", "max_dias", "visto_dias"].filter((k) => filtros[k]).length }}
        panelAbierto={mostrarFiltros}
      >
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
          <Campo label="Días activo mín.">
            <input className={input} type="number" min="0" value={filtros.min_dias ?? ""} onChange={(e) => set({ min_dias: e.target.value })} />
          </Campo>
          <Campo label="Días activo máx.">
            <input className={input} type="number" min="0" value={filtros.max_dias ?? ""} onChange={(e) => set({ max_dias: e.target.value })} />
          </Campo>
          <Campo label="Visto en últimos (días)">
            <input className={input} type="number" min="1" value={filtros.visto_dias ?? ""} onChange={(e) => set({ visto_dias: e.target.value })} />
          </Campo>
          <div className="flex items-end">
            <button type="button" className={`${btnChico} h-10 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => set({ min_dias: "", max_dias: "", visto_dias: "" })} disabled={!filtros.min_dias && !filtros.max_dias && !filtros.visto_dias}>
              <i className="bx bx-eraser" /> Limpiar días
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[380px] animate-pulse rounded-2xl bg-gradient-to-b from-slate-100 to-slate-50" />
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
              <p className="max-w-md text-sm leading-6 text-slate-500">Hay anuncios guardados, pero el atajo, la plataforma o la búsqueda los esconden. Prueba quitando el atajo, el dominio o ampliando los días.</p>
              <button type="button" className={`${btnChico} bg-[#0B1426] text-white hover:bg-[#13244a]`} onClick={() => setFiltros({ orden: filtros.orden || "dias" })}>
                <i className="bx bx-eraser" /> Quitar todos los filtros
              </button>
            </div>
          )
        }
      />

      {!cargando && !error && items.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((a) => (
            <TarjetaAnuncio key={a.ad_archive_id} a={a} onVerTienda={onVerTienda} />
          ))}
        </div>
      ) : null}

      {!cargando && !error && items.length ? <Paginacion page={page} limit={limit} total={data?.total} onPage={(p) => setFiltros({ ...filtros, page: p })} /> : null}
      {!cargando && !error && items.length ? (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Etiqueta tono="navy">90+</Etiqueta> veteranos · <Etiqueta tono="emerald">30+</Etiqueta> validados · <Etiqueta tono="sky">7+</Etiqueta> en prueba · días activos según la fecha de inicio que publica Meta.
        </p>
      ) : null}
    </div>
  );
}
