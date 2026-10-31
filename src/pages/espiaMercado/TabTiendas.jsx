import { useState } from "react";
import chatApi from "../../api/chatcenter";
import { TarjetaAnuncio } from "./TabAnuncios";
import { Aviso, Barras, Buscador, Chip, EstadoLista, Etiqueta, Modal, Paginacion, btnChico, fmtDia, fmtNum, select, textoError, useConsulta } from "./ui";

const ORDENES = [
  { id: "activos", label: "Más anuncios activos" },
  { id: "nuevos", label: "Más anuncios nuevos" },
  { id: "productos", label: "Más productos" },
];

function TipoTienda({ productos }) {
  const n = Number(productos);
  if (!n) return <span className="text-xs text-slate-300">—</span>;
  if (n <= 30) return <Etiqueta tono="sky" title="Hasta 30 productos: suele ser una marca">Marca</Etiqueta>;
  return <Etiqueta tono="amber" title="Más de 30 productos: suele ser dropshipping">Dropshipping</Etiqueta>;
}

function BotonSeguir({ tienda, pais, onCambio }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);
  const seguida = !!tienda.seguida;
  const toggle = async (e) => {
    e.stopPropagation();
    setOcupado(true);
    setError(null);
    try {
      const { data } = await chatApi.post("/espia/seguir", { tipo: "tienda", ref: tienda.dominio, pais });
      onCambio(!!data?.data?.seguida);
    } catch (err) {
      setError(textoError(err));
    } finally {
      setOcupado(false);
    }
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={ocupado}
        onClick={toggle}
        title={seguida ? "Dejar de seguir" : "Seguir: entra al reporte diario cuando lance anuncios nuevos"}
        className={`${btnChico} ${seguida ? "border border-emerald-600 bg-emerald-50 text-emerald-700" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
      >
        <i className={`bx ${seguida ? "bxs-bookmark" : "bx-bookmark"}`} /> {seguida ? "Siguiendo" : "Seguir"}
      </button>
      {error ? <span className="text-[10px] text-rose-600">{error}</span> : null}
    </div>
  );
}

/* ── Detalle de una tienda: productos agrupados y sus anuncios ────────── */
function DetalleTienda({ dominio, pais, onClose, onVerAnuncios }) {
  const { data, cargando, error, recargar } = useConsulta(`/espia/tiendas/${encodeURIComponent(dominio)}`, { pais });
  const t = data?.tienda;
  const productos = data?.productos || [];
  const [abierto, setAbierto] = useState(null);

  return (
    <Modal
      titulo={t?.nombre || dominio}
      subtitulo={t ? `${dominio}${t.es_shopify ? " · Shopify" : ""}${t.moneda ? ` · ${t.moneda}` : ""}${t.tema ? ` · tema ${t.tema}` : ""}` : dominio}
      onClose={onClose}
      ancho="max-w-5xl"
      acciones={
        <>
          <a href={`https://${dominio}`} target="_blank" rel="noreferrer" className={`${btnChico} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
            <i className="bx bx-link-external" /> Abrir tienda
          </a>
          <button type="button" className={`${btnChico} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => onVerAnuncios(dominio)}>
            <i className="bx bx-images" /> Todos sus anuncios
          </button>
        </>
      }
    >
      <EstadoLista cargando={cargando} error={error} vacio={!cargando && !error && !t} textoVacio="No encontramos esta tienda." onReintentar={recargar} />
      {t ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Dato label="Anuncios activos" valor={fmtNum(t.anuncios_activos)} />
            <Dato label="Nuevos hoy" valor={fmtNum(t.anuncios_nuevos_hoy)} />
            <Dato label="Productos" valor={fmtNum(t.productos)} />
            <Dato label="Última revisión" valor={fmtDia(t.ultima_revision)} />
          </div>
          <div>
            <p className="mb-1 text-xs font-bold text-slate-500">Anuncios activos por día (30 días)</p>
            <Barras serie={data?.tendencia || []} alto={56} />
          </div>
          <div>
            <h4 className="mb-2 text-sm font-bold text-slate-800">Productos con anuncios ({fmtNum(productos.length)})</h4>
            {productos.length ? (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {productos.map((p, i) => {
                  const key = p.url_destino || p.producto || i;
                  const open = abierto === key;
                  return (
                    <div key={key}>
                      <button type="button" className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => setAbierto(open ? null : key)}>
                        <i className={`bx ${open ? "bx-chevron-down" : "bx-chevron-right"} text-slate-400`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-800">{p.producto || "Sin nombre"}</p>
                          {p.url_destino ? (
                            <a href={p.url_destino} target="_blank" rel="noreferrer" className="truncate text-xs text-indigo-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                              {p.url_destino}
                            </a>
                          ) : null}
                        </div>
                        <Etiqueta tono="indigo">{fmtNum(p.n_anuncios)} anuncios</Etiqueta>
                      </button>
                      {open ? (
                        <div className="grid grid-cols-1 gap-3 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
                          {(p.anuncios || []).map((a) => (
                            <TarjetaAnuncio key={a.ad_archive_id} a={a} />
                          ))}
                          {!(p.anuncios || []).length ? <p className="text-xs text-slate-500">Sin anuncios cargados para este producto.</p> : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <Aviso>Todavía no hay anuncios agrupados por producto para esta tienda. Analízala con la extensión en la Biblioteca de Meta.</Aviso>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function Dato({ label, valor }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-base font-bold text-slate-800">{valor}</p>
    </div>
  );
}

/* ── Pestaña Tiendas ──────────────────────────────────────────────────── */
export default function TabTiendas({ pais, filtros, setFiltros, onVerAnuncios }) {
  const page = Number(filtros.page) || 1;
  const limit = 50;
  const params = {
    pais,
    q: filtros.q || "",
    orden: filtros.orden || "activos",
    solo_seguidas: filtros.solo_seguidas ? 1 : "",
    page,
    limit,
  };
  const { data, cargando, error, recargar, setData } = useConsulta("/espia/tiendas", params);
  const items = data?.items || [];
  const set = (cambios) => setFiltros({ ...filtros, ...cambios, page: cambios.page || 1 });
  const [detalle, setDetalle] = useState(filtros.dominio || null);

  const marcarSeguida = (dominio, seguida) =>
    setData((d) => (d ? { ...d, items: (d.items || []).map((t) => (t.dominio === dominio ? { ...t, seguida } : t)) } : d));

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_220px_auto]">
        <Buscador valor={filtros.q} onChange={(q) => set({ q })} placeholder="Buscar por dominio o nombre de la tienda" />
        <select className={select} value={params.orden} onChange={(e) => set({ orden: e.target.value })} aria-label="Ordenar por">
          {ORDENES.map((o) => (
            <option key={o.id} value={o.id}>
              Ordenar: {o.label}
            </option>
          ))}
        </select>
        <div className="flex items-center">
          <Chip activo={!!filtros.solo_seguidas} tono="emerald" onClick={() => set({ solo_seguidas: filtros.solo_seguidas ? "" : "1" })}>
            <i className="bx bxs-bookmark" /> Solo seguidas
          </Chip>
        </div>
      </div>

      <EstadoLista
        cargando={cargando}
        error={error}
        vacio={!cargando && !error && items.length === 0}
        textoVacio={
          filtros.solo_seguidas
            ? "Todavía no sigues ninguna tienda de este país."
            : data && Number(data.total) === 0 && !filtros.q
              ? "Todavía no hay tiendas de este país: analiza una con la extensión en la Biblioteca de Meta."
              : "Ninguna tienda coincide con la búsqueda."
        }
        onReintentar={recargar}
      />

      {!cargando && !error && items.length ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Tienda</th>
                <th className="px-3 py-2">Shopify</th>
                <th className="px-3 py-2 text-right">Productos</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Moneda</th>
                <th className="px-3 py-2 text-right">Activos</th>
                <th className="px-3 py-2 text-right">Nuevos hoy</th>
                <th className="px-3 py-2">30 días</th>
                <th className="px-3 py-2">Revisada</th>
                <th className="px-3 py-2 text-right">Seguir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((t) => (
                <tr key={t.dominio} className="cursor-pointer hover:bg-indigo-50/40" onClick={() => setDetalle(t.dominio)}>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-800">{t.nombre || t.dominio}</p>
                    <p className="text-xs text-slate-500">
                      {t.dominio}
                      {t.pais_principal ? ` · ${t.pais_principal}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2">{t.es_shopify ? <Etiqueta tono="emerald">Sí</Etiqueta> : <span className="text-xs text-slate-400">No</span>}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmtNum(t.productos)}</td>
                  <td className="px-3 py-2">
                    <TipoTienda productos={t.productos} />
                  </td>
                  <td className="px-3 py-2 text-slate-600">{t.moneda || "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">{fmtNum(t.anuncios_activos)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{Number(t.anuncios_nuevos_hoy) > 0 ? <Etiqueta tono="emerald">+{fmtNum(t.anuncios_nuevos_hoy)}</Etiqueta> : "0"}</td>
                  <td className="w-40 px-3 py-2">
                    <Barras serie={t.tendencia || []} alto={28} titulo="Anuncios activos por día" />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{fmtDia(t.ultima_revision)}</td>
                  <td className="px-3 py-2 text-right">
                    <BotonSeguir tienda={t} pais={pais} onCambio={(s) => marcarSeguida(t.dominio, s)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!cargando && !error ? <Paginacion page={page} limit={limit} total={data?.total} onPage={(p) => setFiltros({ ...filtros, page: p })} /> : null}

      {detalle ? (
        <DetalleTienda
          dominio={detalle}
          pais={pais}
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
