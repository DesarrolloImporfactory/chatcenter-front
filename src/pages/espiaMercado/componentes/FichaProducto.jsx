import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import BotonSeguir from "./BotonSeguir";
import { Delta, GraficaLinea } from "./Sparkline";
import { CopiarId, Creativo, Esqueleto, EstadoLista, Etiqueta, EtiquetaPlataforma, Foto, PAISES, TOKENS, btnChico, fmtDia, fmtMoneda, fmtNum, haceCuanto, select, tarjeta, urlDropi, urlMeta, useConsulta } from "../ui";

/* Búsqueda en la Biblioteca de Meta con el mismo término que usa el radar. */
const urlBiblioteca = (pais, termino) =>
  `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${pais}&q=${encodeURIComponent(termino || "")}&search_type=keyword_unordered&media_type=all`;

/* ═══════════════════════════════════════════════════════════════════════
   Ficha de producto al estilo Dropkiller: modal centrado grande con
   cabecera (imagen, nombre, proveedor, ID, Ver en Dropi, precio grande,
   sugerido, ganancia, stock, creado), KPI tiles, «Evolución de ventas» con
   selector de período (recarga ?dias=) y gráfica de línea + área, «Otros
   proveedores con este producto» y «Anuncios relacionados».
   ═══════════════════════════════════════════════════════════════════════ */

const PERIODOS = [7, 14, 30, 60, 90];

/* Rellena los días sin fila con 0 para que la curva sea continua. */
function serieContinua(historial, dias) {
  const porFecha = new Map((historial || []).map((h) => [String(h.fecha).slice(0, 10), h]));
  const out = [];
  const hoy = new Date();
  for (let i = dias - 1; i >= 0; i -= 1) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    const h = porFecha.get(k);
    out.push({ fecha: k, unidades: Number(h?.unidades) || 0, reabastecido: !!h?.reabastecido });
  }
  return out;
}

/* Variación: segunda mitad del período frente a la primera. */
function variacion(serie) {
  const n = serie.length;
  if (n < 2) return null;
  const mitad = Math.floor(n / 2);
  const a = serie.slice(0, mitad).reduce((s, p) => s + p.unidades, 0);
  const b = serie.slice(mitad).reduce((s, p) => s + p.unidades, 0);
  if (!a && !b) return { tipo: "sin", pct: 0 };
  if (!a) return { tipo: "nuevo", pct: 100 };
  return { tipo: "pct", pct: Math.round(((b - a) / a) * 100) };
}

export default function FichaProducto({ pais, id, onClose, onSeguido }) {
  const [dias, setDias] = useState(30);
  const [ordenAnuncios, setOrdenAnuncios] = useState("recientes");
  const { data, cargando, error, recargar, setData } = useConsulta(`/espia/productos/${pais}/${id}`, { dias });
  const p = data?.producto;
  const iguales = data?.iguales || [];
  const suma = data?.suma_iguales;
  const anuncios = useMemo(() => {
    const lista = [...(data?.anuncios || [])];
    if (ordenAnuncios === "dias") lista.sort((a, b) => (Number(b.dias_activo) || 0) - (Number(a.dias_activo) || 0));
    else lista.sort((a, b) => String(b.inicio || "").localeCompare(String(a.inicio || "")));
    return lista;
  }, [data, ordenAnuncios]);
  const serie = useMemo(() => serieContinua(data?.historial, dias), [data, dias]);
  const diasConDatos = (data?.historial || []).length;
  const totalPeriodo = serie.reduce((s, x) => s + x.unidades, 0);
  const vari = variacion(serie);
  const bandera = PAISES.find((x) => x.code === pais)?.bandera || "";
  const ganancia = p && p.precio != null && p.sugerido != null ? Number(p.sugerido) - Number(p.precio) : null;

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const cambioSeguido = (s) => {
    setData((d) => (d ? { ...d, producto: { ...d.producto, seguido: s } } : d));
    onSeguido?.(s);
  };

  return createPortal(
    <AnimatePresence>
      <motion.div key="fondo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9000] flex items-start justify-center overflow-y-auto px-3 py-4 sm:items-center sm:px-6" style={{ background: "rgba(3,7,18,0.62)", backdropFilter: "blur(8px)" }} onClick={onClose}>
        <motion.div
          key="ficha"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={p?.nombre || "Producto"}
          className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_50px_140px_-30px_rgba(0,0,0,0.8)] ring-1 ring-black/5"
        >
          <button type="button" onClick={onClose} className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900" aria-label="Cerrar">
            <i className="bx bx-x text-2xl" />
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* ── Cabecera ── */}
            <header className="border-b border-slate-100 px-5 pb-5 pt-6 sm:px-7">
              {cargando && !p ? (
                <Esqueleto filas={2} alto="h-24" />
              ) : error ? (
                <EstadoLista error={error} onReintentar={recargar} />
              ) : p ? (
                <div className="flex flex-col gap-5 sm:flex-row">
                  <Foto src={p.imagen_url} alt={p.nombre} className="h-36 w-36 sm:h-40 sm:w-40" redondeo="rounded-2xl" />
                  <div className="min-w-0 flex-1 pr-10">
                    <div className="flex flex-wrap items-center gap-2">
                      <Etiqueta tono="navy">
                        <i className="bx bx-package" /> Dropi
                      </Etiqueta>
                      <Etiqueta tono="slate">
                        {bandera} {pais}
                      </Etiqueta>
                      {p.categoria ? <Etiqueta tono="sky">{p.categoria}</Etiqueta> : null}
                      {p.tipo ? <Etiqueta tono="slate">{p.tipo}</Etiqueta> : null}
                    </div>
                    <h2 className="mt-2 text-[20px] font-extrabold leading-tight text-slate-900 sm:text-[22px]">{p.nombre}</h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-600">
                      <span>
                        Proveedor: <b className="text-slate-800">{p.proveedor_nombre || "sin nombre"}</b>
                      </span>
                      <CopiarId id={p.dropi_product_id} prefijo="ID: " className="text-[12px]" />
                      {p.sku ? <span className="text-slate-400">SKU {p.sku}</span> : null}
                      <a href={urlDropi(pais, p.dropi_product_id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-sky-700 hover:underline">
                        Ver en Dropi <i className="bx bx-link-external" />
                      </a>
                    </div>
                    <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
                      <div>
                        <div className="text-[28px] font-extrabold leading-none tracking-tight text-sky-600 tabular-nums">{fmtMoneda(p.precio, pais)}</div>
                        <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Precio del proveedor</div>
                      </div>
                      {p.sugerido != null ? (
                        <div>
                          <div className="text-lg font-bold text-slate-500 tabular-nums">{fmtMoneda(p.sugerido, pais)}</div>
                          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Sugerido</div>
                        </div>
                      ) : null}
                      {ganancia != null ? (
                        <div>
                          <div className={`text-lg font-extrabold tabular-nums ${ganancia > 0 ? "text-emerald-600" : "text-rose-500"}`}>{ganancia > 0 ? "+" : ""}{fmtMoneda(ganancia, pais)}</div>
                          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Ganancia</div>
                        </div>
                      ) : null}
                      <div>
                        <div className={`text-lg font-extrabold tabular-nums ${Number(p.stock_actual) > 0 ? "text-emerald-600" : "text-rose-500"}`}>{fmtNum(p.stock_actual)}</div>
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Stock</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700">{fmtDia(p.primera_vez)}</div>
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Visto por primera vez</div>
                      </div>
                      <div className="ml-auto">
                        <BotonSeguir tipo="producto" objetivo={p.dropi_product_id} pais={pais} seguida={!!p.seguido} onCambio={cambioSeguido} variante="texto" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </header>

            {p ? (
              <div className="space-y-5 px-5 py-5 sm:px-7">
                {/* ── KPIs ── */}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  <Kpi label="Últimas 24 h" valor={fmtNum(p.ventas_1d)} />
                  <Kpi label="7 días" valor={fmtNum(p.ventas_7d)} extra={<Delta actual={p.ventas_7d} previo={p.ventas_7d_prev} chico />} />
                  <Kpi label="30 días" valor={fmtNum(p.ventas_30d)} />
                  <Kpi label="Totales" valor={fmtNum(p.ventas_total)} sub="desde que lo vigilamos" />
                  <Kpi label="Facturación 30 d" valor={fmtMoneda(Number(p.ventas_30d || 0) * Number(p.precio || 0), pais)} sub="ventas × precio" />
                  <Kpi label="Proveedores" valor={fmtNum((Number(p.n_iguales) || 0) + 1)} sub={Number(p.n_iguales) > 0 ? "venden lo mismo" : "solo este"} />
                </div>

                {/* ── Evolución ── */}
                <section className={`${tarjeta} p-4 sm:p-5`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-extrabold text-slate-900">Evolución de ventas de este producto</h3>
                      <p className="text-xs text-slate-500">Unidades estimadas por día (baja de stock entre fotos) · últimos {dias} días</p>
                    </div>
                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                      {PERIODOS.map((d) => (
                        <button key={d} type="button" onClick={() => setDias(d)} aria-pressed={dias === d} className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${dias === d ? "bg-[#0B1426] text-white shadow" : "text-slate-600 hover:text-slate-900"}`}>
                          {d} d
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    {vari?.tipo === "pct" ? (
                      <span className={`inline-flex items-center gap-1 font-extrabold ${vari.pct >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                        <i className={`bx ${vari.pct >= 0 ? "bx-trending-up" : "bx-trending-down"}`} /> {vari.pct >= 0 ? "+" : ""}
                        {fmtNum(vari.pct)} % <span className="font-normal text-slate-500">vs inicio del período</span>
                      </span>
                    ) : vari?.tipo === "nuevo" ? (
                      <span className="inline-flex items-center gap-1 font-extrabold text-sky-600">
                        <i className="bx bx-sparkles" /> Empezó a vender en este período
                      </span>
                    ) : null}
                    <span className="text-slate-500">
                      <b className="text-slate-800">{fmtNum(totalPeriodo)}</b> unidades en el período · <b className="text-slate-800">{fmtNum(diasConDatos)}</b> {diasConDatos === 1 ? "día medido" : "días medidos"}
                    </span>
                  </div>
                  <div className="mt-3">
                    {cargando ? (
                      <div className="h-[220px] animate-pulse rounded-xl bg-slate-50" />
                    ) : diasConDatos >= 2 ? (
                      <GraficaLinea serie={serie} campo="unidades" alto={220} color={TOKENS.sky} />
                    ) : (
                      <div className="flex h-[160px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center text-sm text-slate-500">
                        <i className="bx bx-line-chart text-3xl text-slate-300" />
                        {diasConDatos === 1 ? (
                          <span>
                            Solo hay un día medido ({fmtNum(totalPeriodo)} unidades). La curva se forma con las fotos de los próximos días.
                          </span>
                        ) : (
                          <span>Todavía no hay dos fotos para comparar: las ventas aparecen desde la segunda pasada.</span>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* ── Otros proveedores ── */}
                <section className={`${tarjeta} overflow-hidden`}>
                  <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <h3 className="text-[15px] font-extrabold text-slate-900">
                      Otros proveedores con este producto <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{fmtNum(iguales.length)}</span>
                    </h3>
                    {suma && suma.proveedores > 1 ? (
                      <span className="text-xs text-slate-500">
                        Entre todos: <b className="text-slate-800">{fmtNum(suma.ventas_30d)}</b> en 30 d · <b className="text-slate-800">{fmtNum(suma.ventas_total)}</b> totales
                      </span>
                    ) : null}
                  </div>
                  {iguales.length ? (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-2 font-bold sm:px-5">Proveedor</th>
                          <th className="px-3 py-2 text-right font-bold">Precio</th>
                          <th className="px-3 py-2 text-right font-bold">Stock</th>
                          <th className="px-3 py-2 text-right font-bold">Ventas 30 d</th>
                          <th className="px-3 py-2 text-right font-bold">Totales</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {iguales.map((g) => (
                          <tr key={g.dropi_product_id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 sm:px-5">
                              <div className="flex items-center gap-2">
                                <Foto src={g.imagen_url} alt="" className="h-9 w-9" redondeo="rounded-lg" />
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-800">{g.proveedor_nombre || "Proveedor"}</p>
                                  <p className="truncate text-[11px] text-slate-400" title={g.nombre}>
                                    {g.nombre}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmtMoneda(g.precio, pais)}</td>
                            <td className={`px-3 py-2 text-right font-bold tabular-nums ${Number(g.stock_actual) > 0 ? "text-emerald-600" : "text-rose-500"}`}>{fmtNum(g.stock_actual)}</td>
                            <td className="px-3 py-2 text-right font-bold text-slate-900 tabular-nums">{fmtNum(g.ventas_30d)}</td>
                            <td className="px-3 py-2 text-right text-slate-600 tabular-nums">{fmtNum(g.ventas_total)}</td>
                            <td className="px-3 py-2 text-right">
                              <a href={urlDropi(pais, g.dropi_product_id)} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[#0B1426]" title="Ver en Dropi" aria-label="Ver en Dropi">
                                <i className="bx bx-link-external text-lg" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="border-t border-slate-100 px-4 py-4 text-sm text-slate-500 sm:px-5">Ningún otro proveedor vende este producto en {pais}.</p>
                  )}
                </section>

                {/* ── Anuncios ── */}
                <section>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-extrabold text-slate-900">
                        Anuncios relacionados <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{fmtNum(anuncios.length)}</span>
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {p.radar?.buscado_en ? (
                          <>
                            <i className="bx bx-radar mr-1 text-violet-500" />
                            El radar lo buscó en Meta {haceCuanto(p.radar.buscado_en)} como «{p.radar.termino}»: {fmtNum(p.radar.vinculados)} {Number(p.radar.vinculados) === 1 ? "anuncio exacto" : "anuncios exactos"}
                            {anuncios.length > Number(p.radar.vinculados) ? ` y ${fmtNum(anuncios.length - Number(p.radar.vinculados))} más por palabras del nombre` : ""}.
                          </>
                        ) : (
                          <>
                            <i className="bx bx-radar mr-1 text-slate-400" />
                            El radar de la extensión todavía no buscó este producto en Meta.{" "}
                            <a href={urlBiblioteca(pais, p.radar?.termino)} target="_blank" rel="noreferrer" className="font-bold text-sky-700 hover:underline">
                              Buscarlo ahora en la Biblioteca
                            </a>{" "}
                            con la extensión abierta y «Enviar a IMPORCHAT».
                          </>
                        )}
                      </p>
                    </div>
                    {anuncios.length > 1 ? (
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                        Ordenar por
                        <select className={`${select} h-9 w-auto`} value={ordenAnuncios} onChange={(e) => setOrdenAnuncios(e.target.value)}>
                          <option value="recientes">Recientes</option>
                          <option value="dias">Más días activo</option>
                        </select>
                      </label>
                    ) : null}
                  </div>
                  {anuncios.length ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {anuncios.map((a) => (
                        <article key={a.ad_archive_id} className={`${tarjeta} overflow-hidden`}>
                          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-extrabold text-slate-600">{String(a.pagina_nombre || a.dominio || "?").charAt(0).toUpperCase()}</span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900">{a.pagina_nombre || a.dominio || "Página"}</p>
                                <p className="truncate text-[11px] text-slate-400">{a.ad_archive_id}</p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600" title="Días activo">
                              {fmtNum(a.dias_activo)} d
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pb-2 text-[11px]">
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Activo
                            </span>
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <i className="bx bx-calendar" /> Desde {fmtDia(a.inicio)}
                            </span>
                            {a.origen === "radar" ? (
                              <Etiqueta tono="indigo" title="Salió al buscar este producto por nombre en Meta con el radar">
                                <i className="bx bx-radar" /> Exacto
                              </Etiqueta>
                            ) : (
                              <Etiqueta tono="slate" title="Coincide por palabras del nombre, puede ser otro producto parecido">
                                Por nombre
                              </Etiqueta>
                            )}
                            {a.tienda_plataforma ? <EtiquetaPlataforma plataforma={a.tienda_plataforma} /> : null}
                          </div>
                          <div className="h-44 bg-slate-900">
                            <Creativo anuncio={a} />
                          </div>
                          <div className="flex gap-2 p-2.5">
                            <a href={urlMeta(a)} target="_blank" rel="noreferrer" className={`${btnChico} flex-1 bg-[#0B1426] text-white hover:bg-[#13244a]`}>
                              <i className="bx bx-link-external" /> Ver en Meta
                            </a>
                            {a.media_url || a.imagen_url ? (
                              <a href={a.media_url || a.imagen_url} target="_blank" rel="noreferrer" download className={`${btnChico} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`} title="Descargar creativo" aria-label="Descargar creativo">
                                <i className="bx bx-download" />
                              </a>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                      {p.radar?.buscado_en
                        ? `El radar buscó «${p.radar.termino}» en Meta ${haceCuanto(p.radar.buscado_en)} y no había anuncios activos. Lo volverá a intentar en el próximo barrido.`
                        : "Todavía no hay anuncios de este producto. El radar de la extensión los va vinculando en orden de ventas; también puedes buscarlo en la Biblioteca con la extensión abierta."}
                    </p>
                  )}
                </section>
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

function Kpi({ label, valor, sub, extra }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <div className="mt-0.5 flex items-center gap-1.5">
        <p className="text-lg font-extrabold text-slate-900 tabular-nums">{valor}</p>
        {extra}
      </div>
      {sub ? <p className="text-[10px] text-slate-400">{sub}</p> : null}
    </div>
  );
}
