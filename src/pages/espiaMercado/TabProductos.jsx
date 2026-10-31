import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TAMANOS, usePorPagina } from "./componentes/BarraHerramientas";
import FichaProducto from "./componentes/FichaProducto";
import { Sparkline } from "./componentes/Sparkline";
import { Buscador, Chip, CopiarId, Esqueleto, EstadoLista, Foto, PAISES, Paginacion, btnChico, btnPrimario, btnSuave, fmtDia, fmtMoneda, fmtNum, input, monedaDe, select, tarjeta, useConsulta } from "./ui";

/* ═══════════════════════════════════════════════════════════════════════
   Pestaña Productos al estilo Dropkiller.
     · Barra: buscador (nombre, proveedor, SKU o ID) · orden · por página ·
       «Filtros avanzados» con badge.
     · Chips de atajos + chips de filtros activos con ×.
     · Panel de filtros avanzados desplegado debajo (categorías en
       checkboxes con conteo, rangos Min/Max, ganancia mínima, creado en
       los últimos N días, proveedor). Aplicar / Limpiar. Todo en la URL.
     · Tabla: Producto · Precio proveedor · Ganancia · Gráfica · 7 d · 30 d ·
       Facturación 30 d · Totales · Creado · Ver detalle. Cabeceras
       ordenables donde el back lo soporta.
     · Ficha en modal centrado (componentes/FichaProducto). `productoInicial`
       (?producto=<id>) la abre al cargar.
   Facturación 7 d/30 d = ventas × precio; ganancia = sugerido − precio
   (se calculan aquí; el back solo filtra/ordena por ellas).
   ═══════════════════════════════════════════════════════════════════════ */

const TIP_VENTAS = "Ventas estimadas por baja de stock";

export const ATAJOS = [
  { id: "top_7d", label: "Los mejores de la semana", icon: "bx-hot", title: "Los más vendidos de los últimos 7 días" },
  { id: "sin_escalar", label: "Productos sin escalar", icon: "bx-rocket", title: "7 días: 10–120 · 30 días: 120–500 · stock ≥ 80. Venden pero nadie los ha escalado." },
  { id: "nuevos_traccion", label: "Nuevos con tracción", icon: "bx-leaf", title: "Creado en ≤ 90 días · total 100–2.000 · ≤ 5 reabastecimientos · stock ≥ 100" },
  { id: "todos", label: "Los más vendidos", icon: "bx-trophy", title: "Todo el catálogo, ordenado por ventas" },
];

const ORDENES = [
  { id: "v7", label: "Ventas 7 días" },
  { id: "v30", label: "Ventas 30 días" },
  { id: "total", label: "Ventas totales" },
  { id: "subida", label: "Lo que más subió" },
  { id: "fact7", label: "Facturación 7 días" },
  { id: "fact30", label: "Facturación 30 días" },
  { id: "ganancia", label: "Mayor ganancia" },
  { id: "precio_desc", label: "Precio: mayor a menor" },
  { id: "precio", label: "Precio: menor a mayor" },
  { id: "stock", label: "Stock" },
  { id: "nuevos", label: "Más nuevos" },
  { id: "anuncios", label: "Más anuncios" },
];

/* Filtros avanzados: clave en la URL → etiqueta del chip. */
const RANGOS = [
  { base: "v7", label: "Ventas 7 d", icon: "bx-cart" },
  { base: "v30", label: "Ventas 30 d", icon: "bx-cart" },
  { base: "fact7", label: "Facturación 7 d", icon: "bx-dollar", moneda: true },
  { base: "fact30", label: "Facturación 30 d", icon: "bx-dollar", moneda: true },
  { base: "stock", label: "Stock", icon: "bx-box" },
  { base: "precio", label: "Precio", icon: "bx-purchase-tag", moneda: true },
];
const CLAVES_AVANZADAS = [...RANGOS.flatMap((r) => [`min_${r.base}`, `max_${r.base}`]), "min_ganancia", "creado_dias", "proveedor", "categoria"];

/* Columnas ordenables: cabecera → orden del back (precio alterna asc/desc). */
const COLUMNAS_ORDEN = { v7: ["v7"], v30: ["v30"], total: ["total"], fact30: ["fact30"], ganancia: ["ganancia"], precio: ["precio_desc", "precio"], nuevos: ["nuevos"], anuncios: ["anuncios"] };

export default function TabProductos({ pais, filtros, setFiltros, productoInicial, onCerrarProducto, diasMedidos }) {
  const atajo = filtros.atajo || "top_7d";
  const page = Number(filtros.page) || 1;
  const [limit, setLimit] = usePorPagina(25);
  const [panel, setPanel] = useState(() => CLAVES_AVANZADAS.some((k) => filtros[k]));
  const [detalle, setDetalle] = useState(productoInicial ? String(productoInicial) : null);
  const moneda = monedaDe(pais);
  const bandera = PAISES.find((x) => x.code === pais)?.bandera || "";

  useEffect(() => {
    if (productoInicial) setDetalle(String(productoInicial));
  }, [productoInicial]);

  const orden = filtros.orden || (atajo === "top_7d" ? "v7" : atajo === "todos" ? "total" : "v30");
  const params = {
    pais,
    atajo,
    q: filtros.q || "",
    orden,
    page,
    limit,
    con_anuncios: filtros.con_anuncios || "",
    ...Object.fromEntries(CLAVES_AVANZADAS.map((k) => [k, filtros[k] || ""])),
  };
  const { data, cargando, error, recargar, setData } = useConsulta("/espia/productos", params);
  const categorias = useConsulta("/espia/categorias", { pais }, { inicial: [] });
  const listaCategorias = useMemo(() => (categorias.data || []).map((c) => (typeof c === "string" ? { categoria: c, n: null } : c)).filter((c) => c?.categoria), [categorias.data]);
  const items = data?.items || [];

  const set = (cambios) => setFiltros({ ...filtros, ...cambios, page: cambios.page || 1 });
  const quitar = (...claves) => {
    const limpio = { ...filtros, page: 1 };
    claves.forEach((k) => delete limpio[k]);
    setFiltros(limpio);
  };
  const limpiarAvanzados = () => quitar(...CLAVES_AVANZADAS);
  const nAvanzados = CLAVES_AVANZADAS.filter((k) => filtros[k]).length;
  const marcarSeguido = (id, s) => setData((d) => (d ? { ...d, items: (d.items || []).map((p) => (String(p.dropi_product_id) === String(id) ? { ...p, seguido: s } : p)) } : d));
  const cerrarDetalle = () => {
    setDetalle(null);
    onCerrarProducto?.();
  };

  const ordenarPor = (col) => {
    const opciones = COLUMNAS_ORDEN[col];
    if (!opciones) return;
    const i = opciones.indexOf(orden);
    set({ orden: opciones[(i + 1) % opciones.length] });
  };

  const vacio = !cargando && !error && items.length === 0;
  const atajo30 = atajo === "sin_escalar" || atajo === "nuevos_traccion";

  /* Chips de filtros activos. */
  const chipsActivos = [];
  RANGOS.forEach((r) => {
    const min = filtros[`min_${r.base}`];
    const max = filtros[`max_${r.base}`];
    if (!min && !max) return;
    const f = (v) => (r.moneda ? fmtMoneda(v, pais) : fmtNum(v));
    const texto = min && max ? `${f(min)} – ${f(max)}` : min ? `≥ ${f(min)}` : `≤ ${f(max)}`;
    chipsActivos.push({ claves: [`min_${r.base}`, `max_${r.base}`], texto: `${r.label} ${texto}`, icon: r.icon });
  });
  if (filtros.min_ganancia) chipsActivos.push({ claves: ["min_ganancia"], texto: `Ganancia ≥ ${fmtMoneda(filtros.min_ganancia, pais)}`, icon: "bx-trending-up" });
  if (filtros.creado_dias) chipsActivos.push({ claves: ["creado_dias"], texto: `Creado en los últimos ${fmtNum(filtros.creado_dias)} días`, icon: "bx-calendar" });
  if (filtros.proveedor) chipsActivos.push({ claves: ["proveedor"], texto: `Proveedor: ${filtros.proveedor}`, icon: "bx-store" });
  if (filtros.categoria) {
    const n = String(filtros.categoria).split(",").filter(Boolean).length;
    chipsActivos.push({ claves: ["categoria"], texto: n === 1 ? `Categoría: ${filtros.categoria}` : `${n} categorías`, icon: "bx-category" });
  }

  return (
    <div className="space-y-4">
      {/* ── Barra de herramientas ── */}
      <div className={`${tarjeta} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-2 p-3">
          <Buscador valor={filtros.q} onChange={(q) => set({ q })} placeholder="Nombre, proveedor, SKU o ID de Dropi" className="min-w-[240px] flex-1" />
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="hidden lg:inline">Ordenar por</span>
            <select className={`${select} w-auto min-w-[190px]`} value={orden} onChange={(e) => set({ orden: e.target.value })} aria-label="Ordenar por">
              {ORDENES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="hidden lg:inline">Por página</span>
            <select
              className={`${select} w-[84px]`}
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                set({ page: 1 });
              }}
              aria-label="Resultados por página"
            >
              {TAMANOS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setPanel((v) => !v)}
            aria-expanded={panel}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-bold transition ${panel || nAvanzados ? "border-[#0B1426] bg-[#0B1426] text-white shadow-[0_10px_24px_-10px_rgba(11,20,38,0.7)]" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            <i className="bx bx-slider-alt" /> Filtros avanzados
            {nAvanzados ? <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-sky-400 px-1 text-[11px] font-extrabold text-[#0B1426]">{nAvanzados}</span> : null}
            <i className={`bx ${panel ? "bx-chevron-up" : "bx-chevron-down"} text-base`} />
          </button>
        </div>

        {/* Atajos + filtros activos */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3 py-2.5">
          {ATAJOS.map((a) => (
            <Chip key={a.id} activo={atajo === a.id} title={a.title} onClick={() => set({ atajo: a.id, orden: a.id === "top_7d" ? "v7" : a.id === "todos" ? "total" : "v30" })}>
              <i className={`bx ${a.icon} text-sm`} /> {a.label}
            </Chip>
          ))}
          <Chip activo={!!filtros.con_anuncios} tono="emerald" title="Solo productos con anuncios de Meta vinculados por el radar de la extensión" onClick={() => set({ con_anuncios: filtros.con_anuncios ? "" : "1", ...(filtros.con_anuncios ? {} : { orden: "anuncios" }) })}>
            <i className="bx bx-images text-sm" /> Con anuncios
          </Chip>
          {chipsActivos.length ? <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" /> : null}
          <Chip activo={false} title="Plataforma">
            <i className="bx bx-package text-sm text-orange-500" /> Dropi
          </Chip>
          <Chip activo={false} title="País">
            {bandera} {PAISES.find((x) => x.code === pais)?.nombre || pais}
          </Chip>
          {chipsActivos.map((c) => (
            <button key={c.texto} type="button" onClick={() => quitar(...c.claves)} title="Quitar este filtro" className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 transition hover:bg-sky-100">
              <i className={`bx ${c.icon} text-sm`} /> {c.texto} <i className="bx bx-x text-sm" />
            </button>
          ))}
          {chipsActivos.length ? (
            <button type="button" onClick={limpiarAvanzados} className="text-xs font-bold text-slate-500 hover:text-rose-600">
              Limpiar todo
            </button>
          ) : null}
        </div>

        {panel ? (
          <PanelFiltros pais={pais} filtros={filtros} categorias={listaCategorias} onAplicar={(f) => setFiltros({ ...filtros, ...f, page: 1 })} onLimpiar={limpiarAvanzados} />
        ) : null}
      </div>

      {atajo30 && Number(diasMedidos) > 0 && Number(diasMedidos) < 14 && !vacio ? (
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          <i className="bx bx-info-circle mr-1" /> Este atajo compara ventas de 7 y 30 días y apenas llevamos {fmtNum(diasMedidos)} {Number(diasMedidos) === 1 ? "día" : "días"} medidos: los resultados se vuelven confiables con unas semanas de fotos.
        </p>
      ) : null}

      <EstadoLista
        cargando={cargando}
        error={error}
        vacio={vacio}
        onReintentar={recargar}
        esqueleto={<Esqueleto filas={8} alto="h-[72px]" />}
        vacioNodo={
          data && Number(data.total) === 0 && atajo === "todos" && !filtros.q && !nAvanzados ? (
            <VacioPanel icono="bx-camera" titulo="Todavía no hay productos de este país" texto="El recolector no ha hecho su primera foto del catálogo. Pulsa «Correr pasada ahora» arriba o espera la foto automática." />
          ) : atajo30 && !filtros.q && !nAvanzados ? (
            <VacioPanel
              icono="bx-hourglass"
              titulo={atajo === "sin_escalar" ? "«Productos sin escalar» necesita unas semanas de fotos" : "«Nuevos con tracción» necesita unas semanas de fotos"}
              texto={`Este atajo compara ventas de 7 y 30 días${Number(diasMedidos) ? ` y llevamos ${fmtNum(diasMedidos)} ${Number(diasMedidos) === 1 ? "día medido" : "días medidos"}` : ""}. Mientras se acumulan fotos, mira qué se está moviendo esta semana o recorre todo el catálogo.`}
              acciones={
                <>
                  <button type="button" className={`${btnChico} bg-[#0B1426] text-white hover:bg-[#13244a]`} onClick={() => set({ atajo: "top_7d", orden: "v7" })}>
                    <i className="bx bx-hot" /> Los mejores de la semana
                  </button>
                  <button type="button" className={`${btnChico} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => set({ atajo: "todos", orden: "total" })}>
                    <i className="bx bx-trophy" /> Los más vendidos
                  </button>
                </>
              }
            />
          ) : (
            <VacioPanel
              icono="bx-search-alt"
              titulo="Ningún producto cumple con estos filtros"
              texto="Prueba con otra palabra, amplía algún rango o quita un filtro."
              acciones={nAvanzados ? <button type="button" className={`${btnChico} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`} onClick={limpiarAvanzados}>Limpiar filtros</button> : null}
            />
          )
        }
      />

      {!cargando && !error && items.length ? (
        <div className={`${tarjeta} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {ATAJOS.find((a) => a.id === atajo)?.label || "Productos"}
              {filtros.q ? <span className="font-normal normal-case tracking-normal text-slate-400"> · «{filtros.q}»</span> : null}
              <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">precios en {moneda}</span>
            </span>
            <Paginacion compacta siempre page={page} limit={limit} total={data?.total} onPage={(p) => setFiltros({ ...filtros, page: p })} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1260px] text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-left text-[11px] uppercase tracking-[0.06em] text-slate-500">
                  <th className="px-4 py-3 font-bold">Producto</th>
                  <Th col="precio" orden={orden} onClick={ordenarPor} align="right">
                    Precio proveedor
                  </Th>
                  <Th col="ganancia" orden={orden} onClick={ordenarPor} align="right" title="Sugerido − precio del proveedor">
                    Ganancia
                  </Th>
                  <th className="px-3 py-3 font-bold" title="Ventas estimadas de los últimos 7 días">
                    Gráfica
                  </th>
                  <Th col="v7" orden={orden} onClick={ordenarPor} align="right" title={TIP_VENTAS}>
                    Ventas 7 d
                  </Th>
                  <Th col="v30" orden={orden} onClick={ordenarPor} align="right" title={TIP_VENTAS}>
                    Ventas 30 d
                  </Th>
                  <Th col="fact30" orden={orden} onClick={ordenarPor} align="right" title="Ventas 30 d × precio del proveedor">
                    Facturación 30 d
                  </Th>
                  <Th col="total" orden={orden} onClick={ordenarPor} align="right" title="Desde que lo vigilamos">
                    Totales
                  </Th>
                  <Th col="anuncios" orden={orden} onClick={ordenarPor} align="right" title="Anuncios activos en Meta vinculados a este producto por el radar de la extensión">
                    Anuncios
                  </Th>
                  <Th col="nuevos" orden={orden} onClick={ordenarPor} title="Primera vez que lo vimos en el catálogo">
                    Creado
                  </Th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((p, i) => {
                  const ganancia = p.precio != null && p.sugerido != null ? Number(p.sugerido) - Number(p.precio) : null;
                  const fact30 = Number(p.ventas_30d || 0) * Number(p.precio || 0);
                  const serie7 = Array.isArray(p.serie7) ? p.serie7.map((v) => ({ v: Number(v) || 0 })) : [];
                  const haySerie = serie7.some((x) => x.v > 0);
                  return (
                    <motion.tr
                      key={`${pais}-${p.dropi_product_id}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 12) * 0.02 }}
                      className="group cursor-pointer transition hover:bg-sky-50/50"
                      onClick={() => setDetalle(String(p.dropi_product_id))}
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === "Enter" ? setDetalle(String(p.dropi_product_id)) : null)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Foto src={p.imagen_url} alt={p.nombre} className="h-14 w-14" />
                          <div className="min-w-0">
                            <p className="max-w-[360px] truncate text-[13.5px] font-extrabold uppercase text-slate-900" title={p.nombre}>
                              {p.nombre}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                              <span className="truncate">
                                Proveedor: <b className="text-slate-700">{p.proveedor_nombre || "sin nombre"}</b>
                              </span>
                              <span>
                                Stock: <b className={Number(p.stock_actual) > 0 ? "text-emerald-600" : "text-rose-500"}>{fmtNum(p.stock_actual)}</b>
                              </span>
                            </p>
                            <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                              <CopiarId id={p.dropi_product_id} prefijo="ID: " />
                              <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                                <i className="bx bx-package" /> Dropi
                              </span>
                              <span className="text-sm leading-none" title={pais}>
                                {bandera}
                              </span>
                              {p.categoria ? <span className="truncate text-slate-400">{p.categoria}</span> : null}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-800 tabular-nums">{fmtMoneda(p.precio, pais)}</td>
                      <td className={`px-3 py-3 text-right font-bold tabular-nums ${ganancia == null ? "text-slate-300" : ganancia > 0 ? "text-emerald-600" : "text-rose-500"}`} title={p.sugerido != null ? `Sugerido ${fmtMoneda(p.sugerido, pais)}` : "Sin precio sugerido"}>
                        {ganancia == null ? "—" : fmtMoneda(ganancia, pais)}
                      </td>
                      <td className="px-3 py-3">
                        {haySerie ? (
                          <span title={`Últimos 7 días: ${serie7.map((x) => fmtNum(x.v)).join(" · ")}`}>
                            <Sparkline serie={serie7} campo="v" ancho={96} alto={34} color="#3b82f6" />
                          </span>
                        ) : (
                          <span className="block h-[34px] w-[96px] rounded-md bg-slate-50 ring-1 ring-slate-100" title="Sin ventas estimadas en los últimos 7 días" />
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-base font-extrabold text-slate-900 tabular-nums" title={TIP_VENTAS}>
                        {fmtNum(p.ventas_7d)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-800 tabular-nums" title={TIP_VENTAS}>
                        {fmtNum(p.ventas_30d)}
                      </td>
                      <td className={`px-3 py-3 text-right font-bold tabular-nums ${fact30 > 0 ? "text-emerald-600" : "text-slate-400"}`}>{fmtMoneda(fact30, pais)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700 tabular-nums">{fmtNum(p.ventas_total)}</td>
                      <td className="px-3 py-3 text-right">
                        {Number(p.n_anuncios) > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-xs font-extrabold text-violet-700 tabular-nums" title={`${fmtNum(p.n_anuncios)} anuncios activos en Meta · buscado ${fmtDia(p.radar_en)}`}>
                            <i className="bx bx-images" /> {fmtNum(p.n_anuncios)}
                          </span>
                        ) : p.radar_en ? (
                          <span className="text-xs text-slate-400" title={`El radar lo buscó el ${fmtDia(p.radar_en)} y Meta no mostró anuncios`}>
                            0
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300" title="El radar todavía no ha buscado este producto en Meta">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-600">
                        <i className="bx bx-calendar mr-1 text-slate-400" />
                        {fmtDia(p.primera_vez)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          className={`${btnChico} whitespace-nowrap bg-[#0B1426] text-white hover:bg-[#13244a]`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetalle(String(p.dropi_product_id));
                          }}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-3">
            <Paginacion page={page} limit={limit} total={data?.total} onPage={(p) => setFiltros({ ...filtros, page: p })} />
          </div>
        </div>
      ) : null}

      {detalle ? <FichaProducto pais={pais} id={detalle} onClose={cerrarDetalle} onSeguido={(s) => marcarSeguido(detalle, s)} /> : null}
    </div>
  );
}

/* Cabecera ordenable. */
function Th({ col, orden, onClick, align = "left", title, children }) {
  const opciones = COLUMNAS_ORDEN[col] || [];
  const activa = opciones.includes(orden);
  const asc = activa && orden === "precio";
  return (
    <th className={`px-3 py-3 font-bold ${align === "right" ? "text-right" : ""}`} title={title} aria-sort={activa ? (asc ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onClick(col)} className={`inline-flex items-center gap-1 uppercase transition hover:text-slate-900 ${activa ? "text-[#0B1426]" : ""}`}>
        {children}
        <i className={`bx ${activa ? (asc ? "bx-up-arrow-alt" : "bx-down-arrow-alt") : "bx-sort-alt-2 text-slate-300"} text-sm`} />
      </button>
    </th>
  );
}

/* ── Panel de filtros avanzados (borrador local, se aplica con el botón) ── */
function PanelFiltros({ pais, filtros, categorias, onAplicar, onLimpiar }) {
  const [b, setB] = useState(() => Object.fromEntries(CLAVES_AVANZADAS.map((k) => [k, filtros[k] || ""])));
  useEffect(() => {
    setB(Object.fromEntries(CLAVES_AVANZADAS.map((k) => [k, filtros[k] || ""])));
  }, [filtros]);
  const seleccionadas = new Set(String(b.categoria || "").split(",").filter(Boolean));
  const toggleCat = (c) => {
    const s = new Set(seleccionadas);
    if (s.has(c)) s.delete(c);
    else s.add(c);
    setB({ ...b, categoria: [...s].join(",") });
  };
  const todas = categorias.length > 0 && seleccionadas.size === categorias.length;
  const campo = (k, props = {}) => <input className={`${input} h-9`} type="number" min="0" value={b[k] || ""} onChange={(e) => setB({ ...b, [k]: e.target.value })} {...props} />;

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden border-t border-slate-100 bg-slate-50/70">
      <div className="grid gap-5 p-4 lg:grid-cols-[1.1fr_1fr]">
        {/* Categorías */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Selecciona una o más categorías</p>
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-[#0B1426]" checked={todas} onChange={() => setB({ ...b, categoria: todas ? "" : categorias.map((c) => c.categoria).join(",") })} />
              Seleccionar todas
            </label>
          </div>
          {categorias.length ? (
            <div className="grid max-h-56 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-3 xl:grid-cols-4">
              {categorias.map((c) => (
                <label key={c.categoria} className="inline-flex min-w-0 cursor-pointer items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[#0B1426]" checked={seleccionadas.has(c.categoria)} onChange={() => toggleCat(c.categoria)} />
                  <span className="truncate" title={c.categoria}>
                    {c.categoria}
                  </span>
                  {c.n != null ? <span className="ml-auto shrink-0 text-[10px] text-slate-400 tabular-nums">{fmtNum(c.n)}</span> : null}
                </label>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-xs text-slate-500">Las categorías aparecen cuando el recolector haya hecho su primera foto.</p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Proveedor
              <input className={`${input} mt-1 h-9 normal-case tracking-normal`} type="text" placeholder="Nombre del proveedor" value={b.proveedor || ""} onChange={(e) => setB({ ...b, proveedor: e.target.value })} />
            </label>
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Creado en los últimos (días)
              <input className={`${input} mt-1 h-9`} type="number" min="1" placeholder="90" value={b.creado_dias || ""} onChange={(e) => setB({ ...b, creado_dias: e.target.value })} />
            </label>
          </div>
        </div>

        {/* Rangos */}
        <div className="grid gap-3 sm:grid-cols-2">
          {RANGOS.map((r) => (
            <div key={r.base}>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <i className={`bx ${r.icon} mr-1`} />
                {r.label}
                {r.moneda ? <span className="ml-1 font-normal text-slate-400">({monedaDe(pais)})</span> : null}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Min</span>
                {campo(`min_${r.base}`, { placeholder: "0" })}
                <span className="text-[11px] text-slate-400">Max</span>
                {campo(`max_${r.base}`, { placeholder: "∞" })}
              </div>
            </div>
          ))}
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <i className="bx bx-trending-up mr-1" />
              Ganancia mínima <span className="font-normal text-slate-400">({monedaDe(pais)})</span>
            </p>
            {campo("min_ganancia", { placeholder: "0" })}
          </div>
          <div className="flex items-end justify-end gap-2">
            <button type="button" className={`${btnSuave} h-9`} onClick={onLimpiar}>
              <i className="bx bx-eraser" /> Limpiar
            </button>
            <button type="button" className={`${btnPrimario} h-9`} onClick={() => onAplicar(b)}>
              <i className="bx bx-check" /> Aplicar filtros
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function VacioPanel({ icono, titulo, texto, acciones }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[22px] border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-3xl text-sky-500 shadow-[0_12px_30px_-12px_rgba(11,20,38,0.35)] ring-1 ring-slate-100">
        <i className={`bx ${icono}`} />
      </span>
      <h3 className="text-base font-extrabold text-slate-900">{titulo}</h3>
      <p className="max-w-lg text-sm leading-6 text-slate-500">{texto}</p>
      {acciones ? <div className="mt-1 flex flex-wrap justify-center gap-2">{acciones}</div> : null}
    </div>
  );
}
