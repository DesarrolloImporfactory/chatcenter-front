import { Buscador, Campo, Chip, Creativo, EstadoLista, Etiqueta, Paginacion, fmtDia, fmtNum, input, select, urlMeta, useConsulta } from "./ui";

/* Atajo del curso: anuncios de 7 a 50 días activos, vistos en los últimos 3. */
export const ATAJO_ANUNCIOS = { min_dias: "7", max_dias: "50", visto_dias: "3" };

const ORDENES = [
  { id: "dias", label: "Más días activo" },
  { id: "recientes", label: "Más recientes" },
  { id: "duplicados", label: "Más duplicados" },
];

export function TarjetaAnuncio({ a, onVerTienda }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="h-56">
        <Creativo anuncio={a} />
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-1">
          <Etiqueta tono="indigo" title={`En circulación desde ${fmtDia(a.inicio)}`}>
            {fmtNum(a.dias_activo)} días
          </Etiqueta>
          <Etiqueta tono={a.tipo === "video" ? "sky" : "slate"}>{a.tipo === "video" ? "Video" : "Imagen"}</Etiqueta>
          {Number(a.n_duplicados) > 1 ? <Etiqueta tono="amber" title="Variantes del mismo anuncio">{fmtNum(a.n_duplicados)} copias</Etiqueta> : null}
          {a.activo === false || a.activo === 0 ? <Etiqueta tono="rose">Inactivo</Etiqueta> : null}
        </div>
        {a.titulo ? <p className="line-clamp-1 font-semibold text-slate-800">{a.titulo}</p> : null}
        <p className="line-clamp-3 text-xs text-slate-600" title={a.texto}>
          {a.texto || "Sin texto"}
        </p>
        <div className="mt-auto space-y-1 text-xs text-slate-500">
          <p className="truncate" title={a.pagina_nombre}>
            <i className="bx bxl-facebook-circle" /> {a.pagina_nombre || "Página sin nombre"}
          </p>
          {a.dominio ? (
            <button type="button" className="truncate font-semibold text-indigo-600 hover:underline" onClick={() => onVerTienda && onVerTienda(a.dominio)} title="Ver tienda">
              <i className="bx bx-store" /> {a.dominio}
            </button>
          ) : null}
          {a.producto ? (
            <p className="truncate" title={a.producto}>
              <i className="bx bx-package" /> {a.producto}
            </p>
          ) : null}
          <p>Visto por última vez: {fmtDia(a.ultima_vez_visto)}</p>
        </div>
        <div className="flex gap-2 pt-1">
          <a href={urlMeta(a)} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-indigo-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">
            <i className="bx bx-link-external" /> Ver en Meta
          </a>
          {a.dominio && onVerTienda ? (
            <button type="button" className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50" onClick={() => onVerTienda(a.dominio)}>
              <i className="bx bx-store" /> Ver tienda
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function TabAnuncios({ pais, filtros, setFiltros, onVerTienda }) {
  const page = Number(filtros.page) || 1;
  const limit = 24;
  const params = {
    pais,
    q: filtros.q || "",
    dominio: filtros.dominio || "",
    tipo: filtros.tipo || "",
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip activo={atajoPuesto} title="7 a 50 días activos, vistos en los últimos 3 días" onClick={() => set(atajoPuesto ? { min_dias: "", max_dias: "", visto_dias: "" } : ATAJO_ANUNCIOS)}>
          7 a 50 días, vistos en los últimos 3
        </Chip>
        <Chip activo={filtros.tipo === "video"} onClick={() => set({ tipo: filtros.tipo === "video" ? "" : "video" })}>
          Solo video
        </Chip>
        <Chip activo={filtros.tipo === "imagen"} onClick={() => set({ tipo: filtros.tipo === "imagen" ? "" : "imagen" })}>
          Solo imagen
        </Chip>
        {filtros.dominio ? (
          <Chip activo tono="emerald" onClick={() => set({ dominio: "" })} title="Quitar el filtro de tienda">
            <i className="bx bx-store" /> {filtros.dominio} <i className="bx bx-x" />
          </Chip>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_160px_160px_160px_200px]">
        <Buscador valor={filtros.q} onChange={(q) => set({ q })} placeholder="Buscar por palabra en el texto, título, página o producto" />
        <Campo label="Días activo mín.">
          <input className={input} type="number" min="0" value={filtros.min_dias ?? ""} onChange={(e) => set({ min_dias: e.target.value })} />
        </Campo>
        <Campo label="Días activo máx.">
          <input className={input} type="number" min="0" value={filtros.max_dias ?? ""} onChange={(e) => set({ max_dias: e.target.value })} />
        </Campo>
        <Campo label="Visto en últimos (días)">
          <input className={input} type="number" min="1" value={filtros.visto_dias ?? ""} onChange={(e) => set({ visto_dias: e.target.value })} />
        </Campo>
        <Campo label="Orden">
          <select className={select} value={params.orden} onChange={(e) => set({ orden: e.target.value })}>
            {ORDENES.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <EstadoLista
        cargando={cargando}
        error={error}
        vacio={!cargando && !error && items.length === 0}
        textoVacio={
          data && Number(data.total) === 0 && !filtros.q && !filtros.dominio && !filtros.tipo && !filtros.min_dias && !filtros.max_dias && !filtros.visto_dias
            ? "Todavía no hay anuncios de este país: analiza una tienda con la extensión."
            : "Ningún anuncio cumple con estos filtros. Prueba quitando el atajo o el dominio."
        }
        onReintentar={recargar}
      />

      {!cargando && !error && items.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((a) => (
            <TarjetaAnuncio key={a.ad_archive_id} a={a} onVerTienda={onVerTienda} />
          ))}
        </div>
      ) : null}

      {!cargando && !error ? <Paginacion page={page} limit={limit} total={data?.total} onPage={(p) => setFiltros({ ...filtros, page: p })} /> : null}
    </div>
  );
}
