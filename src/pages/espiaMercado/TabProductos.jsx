import { useState } from "react";
import chatApi from "../../api/chatcenter";
import {
  Aviso,
  Barras,
  Buscador,
  Campo,
  Chip,
  Creativo,
  EstadoLista,
  Etiqueta,
  Modal,
  Paginacion,
  btnSuave,
  fmtDia,
  fmtMoney,
  fmtNum,
  input,
  select,
  textoError,
  urlMeta,
  useConsulta,
} from "./ui";

const TIP_VENTAS = "Ventas estimadas por baja de stock";

export const ATAJOS = [
  { id: "sin_escalar", label: "Sin escalar", title: "7 días: 10–120 · 30 días: 120–500 · stock ≥ 80" },
  { id: "nuevos_traccion", label: "Nuevos con tracción", title: "Creado en ≤ 90 días · total 100–2.000 · ≤ 5 reabastecimientos · stock ≥ 100" },
  { id: "top_7d", label: "Más vendidos 7 días", title: "Orden por ventas de 7 días" },
  { id: "todos", label: "Todos", title: "Sin atajo" },
];

const ORDENES = [
  { id: "v7", label: "Ventas 7 días" },
  { id: "v30", label: "Ventas 30 días" },
  { id: "total", label: "Ventas totales" },
  { id: "subida", label: "Lo que más subió" },
  { id: "stock", label: "Stock" },
  { id: "nuevos", label: "Más nuevos" },
];

const FILTROS_AVANZADOS = ["categoria", "min_v7", "max_v7", "min_v30", "max_v30", "min_stock", "max_stock", "creado_dias", "max_reab"];

function Foto({ src, alt, className = "h-12 w-12" }) {
  if (!src) {
    return (
      <div className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400`}>
        <i className="bx bx-image" />
      </div>
    );
  }
  return <img src={src} alt={alt || ""} loading="lazy" className={`${className} shrink-0 rounded-lg bg-slate-100 object-cover`} />;
}

/* ── Detalle de un producto ───────────────────────────────────────────── */
function DetalleProducto({ pais, id, onClose, onSeguido }) {
  const { data, cargando, error, recargar } = useConsulta(`/espia/productos/${pais}/${id}`, {});
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const p = data?.producto;
  const iguales = data?.iguales || [];
  const suma = data?.suma_iguales;
  const anuncios = data?.anuncios || [];

  const seguir = async () => {
    setOcupado(true);
    setMsg(null);
    try {
      const { data: r } = await chatApi.post("/espia/seguir", { tipo: "producto", ref: String(id), pais });
      const seguida = !!r?.data?.seguida;
      setMsg({ tipo: "ok", texto: seguida ? "Producto en seguimiento: entra en el reporte diario." : "Dejaste de seguir este producto." });
      if (onSeguido) onSeguido(seguida);
    } catch (err) {
      setMsg({ tipo: "error", texto: textoError(err) });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Modal
      titulo={p?.nombre || "Producto"}
      subtitulo={p ? `Dropi #${p.dropi_product_id} · ${p.proveedor_nombre || "Proveedor sin nombre"} · ${pais}` : undefined}
      onClose={onClose}
      ancho="max-w-4xl"
      acciones={
        p ? (
          <button type="button" className={btnSuave} disabled={ocupado} onClick={seguir}>
            <i className="bx bx-bookmark" /> Seguir producto
          </button>
        ) : null
      }
    >
      <EstadoLista cargando={cargando} error={error} vacio={!cargando && !error && !p} textoVacio="No se encontró este producto." onReintentar={recargar} />
      {p ? (
        <div className="space-y-5">
          {msg ? <Aviso tipo={msg.tipo}>{msg.texto}</Aviso> : null}

          {suma && suma.proveedores > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-lg font-black text-amber-900">
                El mismo producto lo tienen {fmtNum(suma.proveedores)} proveedor{suma.proveedores === 1 ? "" : "es"}: {fmtNum(suma.ventas_30d)} ventas en 30 días
              </p>
              <p className="text-xs text-amber-800">
                Sumando todos los proveedores lleva {fmtNum(suma.ventas_total)} ventas totales. Lo que parece poco en una ficha puede ser mucho en el mercado.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-4 sm:flex-row">
            <Foto src={p.imagen_url} alt={p.nombre} className="h-40 w-40" />
            <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <Dato label="Precio proveedor" valor={fmtMoney(p.precio)} />
              <Dato label="Precio sugerido" valor={fmtMoney(p.sugerido)} />
              <Dato label="Stock actual" valor={fmtNum(p.stock_actual)} />
              <Dato label="Ventas 1 día" valor={fmtNum(p.ventas_1d)} title={TIP_VENTAS} />
              <Dato label="Ventas 7 días" valor={fmtNum(p.ventas_7d)} title={TIP_VENTAS} />
              <Dato label="Ventas 30 días" valor={fmtNum(p.ventas_30d)} title={TIP_VENTAS} />
              <Dato label="Ventas totales" valor={fmtNum(p.ventas_total)} title="Desde que lo seguimos" />
              <Dato label="Reabastecimientos" valor={fmtNum(p.reabastecimientos)} />
              <Dato label="Categoría" valor={p.categoria || "—"} />
              <Dato label="Primera vez visto" valor={fmtDia(p.primera_vez)} />
              <Dato label="Última vez visto" valor={fmtDia(p.ultima_vez)} />
            </div>
          </div>

          <div>
            <h4 className="mb-1 text-sm font-bold text-slate-800">Ventas estimadas por día (últimos 30 días)</h4>
            <p className="mb-2 text-xs text-slate-500">Se estiman por la baja de stock entre una foto y la siguiente. Un reabastecimiento no resta ventas.</p>
            <Barras serie={data?.historial || []} campo="unidades" alto={72} />
            {data?.historial?.length ? (
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>{fmtDia(data.historial[0]?.fecha)}</span>
                <span>{fmtDia(data.historial[data.historial.length - 1]?.fecha)}</span>
              </div>
            ) : null}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-bold text-slate-800">El mismo producto en otros proveedores</h4>
            {iguales.length ? (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {iguales.map((g) => (
                  <div key={g.dropi_product_id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <Foto src={g.imagen_url} alt={g.nombre} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-800">{g.nombre}</p>
                      <p className="truncate text-xs text-slate-500">
                        {g.proveedor_nombre || "Proveedor"} · Dropi #{g.dropi_product_id} · {fmtMoney(g.precio)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                      <div title={TIP_VENTAS}>
                        <b>{fmtNum(g.ventas_30d)}</b> en 30 d
                      </div>
                      <div className="text-slate-400">{fmtNum(g.ventas_total)} totales</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No encontramos este producto en otros proveedores.</p>
            )}
          </div>

          {anuncios.length ? (
            <div>
              <h4 className="mb-2 text-sm font-bold text-slate-800">Anuncios de este producto</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {anuncios.map((a) => (
                  <div key={a.ad_archive_id} className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="h-32">
                      <Creativo anuncio={a} />
                    </div>
                    <div className="space-y-1 px-2 py-2 text-xs">
                      <p className="truncate font-semibold text-slate-800">{a.pagina_nombre || a.dominio}</p>
                      <div className="flex items-center justify-between">
                        <Etiqueta tono="indigo">{fmtNum(a.dias_activo)} días</Etiqueta>
                        <a href={urlMeta(a)} target="_blank" rel="noreferrer" className="font-bold text-indigo-600 hover:underline">
                          Ver en Meta
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

function Dato({ label, valor, title }) {
  return (
    <div title={title}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800">{valor}</p>
    </div>
  );
}

/* ── Pestaña Productos ────────────────────────────────────────────────── */
export default function TabProductos({ pais, filtros, setFiltros }) {
  const atajo = filtros.atajo || "sin_escalar";
  const page = Number(filtros.page) || 1;
  const limit = 50;
  const [mostrarFiltros, setMostrarFiltros] = useState(() => FILTROS_AVANZADOS.some((k) => filtros[k]));
  const [detalle, setDetalle] = useState(null);

  const params = {
    pais,
    atajo,
    q: filtros.q || "",
    categoria: filtros.categoria || "",
    min_v7: filtros.min_v7 || "",
    max_v7: filtros.max_v7 || "",
    min_v30: filtros.min_v30 || "",
    max_v30: filtros.max_v30 || "",
    min_stock: filtros.min_stock || "",
    max_stock: filtros.max_stock || "",
    creado_dias: filtros.creado_dias || "",
    max_reab: filtros.max_reab || "",
    orden: filtros.orden || (atajo === "top_7d" ? "v7" : "v30"),
    page,
    limit,
  };
  const { data, cargando, error, recargar } = useConsulta("/espia/productos", params);
  const categorias = useConsulta("/espia/categorias", { pais }, { inicial: [] });
  const items = data?.items || [];

  const set = (cambios) => setFiltros({ ...filtros, ...cambios, page: cambios.page || 1 });
  const limpiarAvanzados = () => {
    const limpio = { ...filtros, page: 1 };
    FILTROS_AVANZADOS.forEach((k) => delete limpio[k]);
    setFiltros(limpio);
  };
  const hayAvanzados = FILTROS_AVANZADOS.some((k) => filtros[k]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {ATAJOS.map((a) => (
          <Chip key={a.id} activo={atajo === a.id} title={a.title} onClick={() => set({ atajo: a.id, orden: a.id === "top_7d" ? "v7" : filtros.orden })}>
            {a.label}
          </Chip>
        ))}
        <span className="ml-auto" />
        <button type="button" className={btnSuave} onClick={() => setMostrarFiltros((v) => !v)}>
          <i className="bx bx-filter-alt" /> Filtros{hayAvanzados ? " •" : ""}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
        <Buscador valor={filtros.q} onChange={(q) => set({ q })} placeholder="Buscar por nombre de producto o proveedor" />
        <select className={select} value={params.orden} onChange={(e) => set({ orden: e.target.value })} aria-label="Ordenar por">
          {ORDENES.map((o) => (
            <option key={o.id} value={o.id}>
              Ordenar: {o.label}
            </option>
          ))}
        </select>
      </div>

      {mostrarFiltros ? (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3 md:grid-cols-5">
          <Campo label="Categoría" ancho="sm:col-span-2">
            <select className={select} value={filtros.categoria || ""} onChange={(e) => set({ categoria: e.target.value })}>
              <option value="">Todas</option>
              {(categorias.data || []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Campo>
          <Rango label="Ventas 7 días" min={filtros.min_v7} max={filtros.max_v7} onChange={(min, max) => set({ min_v7: min, max_v7: max })} />
          <Rango label="Ventas 30 días" min={filtros.min_v30} max={filtros.max_v30} onChange={(min, max) => set({ min_v30: min, max_v30: max })} />
          <Rango label="Stock" min={filtros.min_stock} max={filtros.max_stock} onChange={(min, max) => set({ min_stock: min, max_stock: max })} />
          <Campo label="Creado en los últimos (días)">
            <input className={input} type="number" min="1" value={filtros.creado_dias || ""} onChange={(e) => set({ creado_dias: e.target.value })} placeholder="90" />
          </Campo>
          <Campo label="Máx. reabastecimientos">
            <input className={input} type="number" min="0" value={filtros.max_reab || ""} onChange={(e) => set({ max_reab: e.target.value })} placeholder="5" />
          </Campo>
          <div className="flex items-end">
            <button type="button" className={btnSuave} onClick={limpiarAvanzados} disabled={!hayAvanzados}>
              Limpiar filtros
            </button>
          </div>
        </div>
      ) : null}

      <EstadoLista
        cargando={cargando}
        error={error}
        vacio={!cargando && !error && items.length === 0}
        textoVacio={
          data && Number(data.total) === 0 && atajo === "todos" && !filtros.q
            ? "Todavía no hay productos de este país: el recolector no ha hecho su primera pasada."
            : "Ningún producto cumple con este atajo o estos filtros."
        }
        onReintentar={recargar}
      />

      {!cargando && !error && items.length ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Proveedor</th>
                <th className="px-3 py-2 text-right">Precio / sugerido</th>
                <th className="px-3 py-2 text-right">Stock</th>
                <th className="px-3 py-2 text-right" title={TIP_VENTAS}>1 d</th>
                <th className="px-3 py-2 text-right" title={TIP_VENTAS}>7 d</th>
                <th className="px-3 py-2 text-right" title={TIP_VENTAS}>30 d</th>
                <th className="px-3 py-2 text-right" title="Desde que lo seguimos">Total</th>
                <th className="px-3 py-2 text-right" title="Veces que subió el stock">Reab.</th>
                <th className="px-3 py-2">Iguales</th>
                <th className="px-3 py-2">Visto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((p) => (
                <tr key={`${p.pais}-${p.dropi_product_id}`} className="cursor-pointer hover:bg-indigo-50/40" onClick={() => setDetalle(p)}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Foto src={p.imagen_url} alt={p.nombre} className="h-10 w-10" />
                      <div className="min-w-0">
                        <p className="max-w-[320px] truncate font-semibold text-slate-800" title={p.nombre}>
                          {p.nombre}
                        </p>
                        <p className="text-xs text-slate-400">
                          #{p.dropi_product_id}
                          {p.categoria ? ` · ${p.categoria}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-slate-600" title={p.proveedor_nombre}>
                    {p.proveedor_nombre || "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    <div>{fmtMoney(p.precio)}</div>
                    <div className="text-xs text-slate-400">{fmtMoney(p.sugerido)}</div>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmtNum(p.stock_actual)}</td>
                  <td className="px-3 py-2 text-right text-slate-700" title={TIP_VENTAS}>{fmtNum(p.ventas_1d)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800" title={TIP_VENTAS}>
                    {fmtNum(p.ventas_7d)}
                    {Number(p.ventas_7d_prev) > 0 && Number(p.ventas_7d) > Number(p.ventas_7d_prev) ? (
                      <span className="ml-1 text-[10px] text-emerald-600" title={`Semana anterior: ${fmtNum(p.ventas_7d_prev)}`}>
                        ▲
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800" title={TIP_VENTAS}>{fmtNum(p.ventas_30d)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmtNum(p.ventas_total)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmtNum(p.reabastecimientos)}</td>
                  <td className="px-3 py-2">
                    {Number(p.n_iguales) > 0 ? (
                      <Etiqueta tono="amber" title="Otros proveedores con el mismo producto">
                        {fmtNum(p.n_iguales)} prov.
                      </Etiqueta>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500" title={`Primera vez: ${fmtDia(p.primera_vez)}`}>
                    {fmtDia(p.ultima_vez)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!cargando && !error ? <Paginacion page={page} limit={limit} total={data?.total} onPage={(p) => setFiltros({ ...filtros, page: p })} /> : null}

      {detalle ? <DetalleProducto pais={pais} id={detalle.dropi_product_id} onClose={() => setDetalle(null)} /> : null}
    </div>
  );
}

function Rango({ label, min, max, onChange }) {
  return (
    <Campo label={label}>
      <div className="flex items-center gap-1">
        <input className={input} type="number" min="0" placeholder="mín" value={min || ""} onChange={(e) => onChange(e.target.value, max || "")} />
        <span className="text-slate-400">–</span>
        <input className={input} type="number" min="0" placeholder="máx" value={max || ""} onChange={(e) => onChange(min || "", e.target.value)} />
      </div>
    </Campo>
  );
}
