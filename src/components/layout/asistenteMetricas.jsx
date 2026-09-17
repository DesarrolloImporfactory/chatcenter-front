/**
 * asistenteMetricas.jsx — tarjetas de métricas del asistente de la cuenta.
 *
 * Dibujan el resultado de cada herramienta del backend
 * (asistente_cuenta/preguntar con formato "tablero"): KPIs, barra apilada por
 * estado y rankings. Las usan las dos vistas del asistente (FloatingSupportChat
 * y AsistenteCuentaTablero).
 */

import { useState } from "react";

// Color por estado: Dropi usa la clave de classified_status; Aliclik su
// estado canónico en mayúsculas.
const COLOR_ESTADO = {
  pendiente: "#d97706",
  guia_generada: "#475569",
  en_transito: "#2563eb",
  en_reparto: "#0891b2",
  retiro_agencia: "#7c3aed",
  novedad: "#ea580c",
  entregada: "#059669",
  devolucion: "#dc2626",
  cancelada: "#94a3b8",
  indemnizada: "#be123c",
  "PENDIENTE CONFIRMACION": "#d97706",
  PENDIENTE: "#b45309",
  "GUIA GENERADA": "#475569",
  "EN TRANSITO": "#2563eb",
  "RETIRO EN AGENCIA": "#7c3aed",
  NOVEDAD: "#ea580c",
  ENTREGADA: "#059669",
  DEVOLUCION: "#dc2626",
  CANCELADO: "#94a3b8",
};
const COLOR_OTRO = "#cbd5e1";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatoRango(periodo) {
  if (!periodo?.desde || !periodo?.hasta) return "";
  const [, m1, d1] = periodo.desde.split("-").map(Number);
  const [, m2, d2] = periodo.hasta.split("-").map(Number);
  if (periodo.desde === periodo.hasta) return `${d2} ${MESES[m2 - 1]}`;
  if (m1 === m2) return `${d1}–${d2} ${MESES[m2 - 1]}`;
  return `${d1} ${MESES[m1 - 1]} – ${d2} ${MESES[m2 - 1]}`;
}

const numero = (v) => Number(v || 0).toLocaleString("es-EC");
const dinero = (v) =>
  `$${Number(v || 0).toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const porcentaje = (v) => (v === null || v === undefined ? "—" : `${v}%`);

// Solo **negritas** y saltos de línea: en este formato el texto es corto.
export function TextoRespuesta({ texto }) {
  return texto.split("\n").filter((l) => l.trim()).map((linea, i) => (
    <p key={i} className="m-0">
      {linea.split(/(\*\*[^*]+\*\*)/g).map((parte, j) =>
        parte.startsWith("**") && parte.endsWith("**") ? (
          <strong key={j} className="font-semibold text-[#0a1628]">
            {parte.slice(2, -2)}
          </strong>
        ) : (
          <span key={j}>{parte.replace(/^[-*]\s+/, "")}</span>
        ),
      )}
    </p>
  ));
}

/* ─── Piezas de tarjeta ─── */

function Tarjeta({ titulo, periodo, children }) {
  return (
    <section className="grid gap-2.5 rounded-xl border border-[#e3e8ee] bg-white p-3">
      <header className="flex items-baseline justify-between gap-2">
        <h4 className="m-0 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
          {titulo}
        </h4>
        {periodo && (
          <span className="whitespace-nowrap text-[10.5px] tabular-nums text-slate-400">
            {formatoRango(periodo)}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function Kpis({ items }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {items.map((k) => (
        <div key={k.label} className="rounded-lg bg-slate-50 px-2 py-1.5">
          <b className="block text-[16px] font-bold leading-tight tabular-nums text-[#0a1628]">
            {k.valor}
          </b>
          <small className="text-[10.5px] text-slate-500">{k.label}</small>
        </div>
      ))}
    </div>
  );
}

function AvisoMuestra({ texto }) {
  if (!texto) return null;
  return (
    <p className="m-0 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-800">
      <i className="bx bx-info-circle mt-px text-sm" />
      {texto}
    </p>
  );
}

function DistribucionEstados({ grupos, campo }) {
  const total = grupos.reduce((s, g) => s + Number(g[campo] || 0), 0);
  if (!total) return <p className="m-0 text-[12px] text-slate-500">Sin pedidos en este periodo.</p>;
  return (
    <>
      <div
        className="flex h-2.5 gap-0.5 overflow-hidden rounded"
        role="img"
        aria-label="Distribución por estado"
      >
        {grupos.map((g) => (
          <i
            key={g.clave || g.estado}
            title={`${g.estado}: ${g[campo]}`}
            style={{ flex: Number(g[campo]), background: COLOR_ESTADO[g.clave || g.estado] || COLOR_OTRO }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {grupos.map((g) => (
          <div key={g.clave || g.estado} className="flex items-center gap-2 text-[11.5px]">
            <i
              className="h-2 w-2 flex-none rounded-sm"
              style={{ background: COLOR_ESTADO[g.clave || g.estado] || COLOR_OTRO }}
            />
            <span className="min-w-0 flex-1 truncate text-slate-600" title={g.estado}>
              {g.estado}
            </span>
            <b className="font-semibold tabular-nums text-[#0a1628]">{numero(g[campo])}</b>
          </div>
        ))}
      </div>
    </>
  );
}

// Fila de ranking: barra proporcional al máximo; si trae entregas y
// devoluciones, la barra se divide en verde / rojo / pendiente.
function Ranking({ filas }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <div className="grid gap-2">
      {filas.map((f) => (
        <div key={f.nombre} className="grid gap-1 text-[11.5px]">
          <header className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate font-semibold text-[#102033]" title={f.nombre}>
              {f.nombre}
            </span>
            <span className="flex flex-none items-center gap-1.5 whitespace-nowrap tabular-nums text-slate-500">
              {f.detalle}
              {f.aviso && (
                <span
                  className="rounded-full bg-amber-50 px-1.5 text-[10px] font-medium text-amber-700"
                  title={f.aviso}
                >
                  muestra baja
                </span>
              )}
            </span>
          </header>
          <div className="h-1.5 overflow-hidden rounded bg-slate-100">
            <div className="flex h-full" style={{ width: `${(f.valor / max) * 100}%` }}>
              {f.partes ? (
                f.partes.map((p, i) => (
                  <i key={i} style={{ flex: p.valor, background: p.color }} />
                ))
              ) : (
                <i className="flex-1 rounded bg-cyan-700" />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Tarjetas por herramienta ─── */

function TarjetaGuias({ r }) {
  const kpis = (
    <Kpis
      items={[
        { label: "órdenes", valor: numero(r.total_ordenes) },
        { label: "con guía", valor: numero(r.ordenes_con_guia) },
        { label: "tasa entrega", valor: porcentaje(r.tasa_entrega_pct) },
      ]}
    />
  );

  if (r.agrupado_por === "estado") {
    return (
      <Tarjeta titulo="Guías Dropi por estado" periodo={r.periodo}>
        {kpis}
        <DistribucionEstados grupos={r.grupos || []} campo="ordenes" />
        <p className="m-0 text-[11px] text-slate-500">
          Vendido {dinero(r.monto_total)} · entregado {dinero(r.monto_entregado)}
        </p>
        <AvisoMuestra texto={r.aviso_tasa} />
      </Tarjeta>
    );
  }

  if (r.agrupado_por === "estado_detallado") {
    return (
      <Tarjeta titulo="Estado exacto de la transportadora" periodo={r.periodo}>
        <Ranking
          filas={(r.grupos || []).slice(0, 12).map((g) => ({
            nombre: g.estado,
            valor: g.ordenes,
            detalle: numero(g.ordenes),
          }))}
        />
      </Tarjeta>
    );
  }

  const campo = r.agrupado_por; // transportadora | ciudad
  return (
    <Tarjeta
      titulo={campo === "ciudad" ? "Guías por ciudad" : "Entrega por transportadora"}
      periodo={r.periodo}
    >
      {kpis}
      <Ranking
        filas={(r.grupos || []).slice(0, 10).map((g) => ({
          nombre: g[campo],
          valor: g.ordenes,
          detalle: `${numero(g.ordenes)} · ${porcentaje(g.tasa_entrega_pct)}`,
          aviso: g.aviso,
          partes: [
            { valor: g.entregadas, color: "#059669" },
            { valor: g.devoluciones, color: "#dc2626" },
            { valor: Math.max(0, g.ordenes - g.entregadas - g.devoluciones), color: "#cbd5e1" },
          ],
        }))}
      />
      <div className="flex flex-wrap gap-3 text-[10.5px] text-slate-500">
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#059669]" />Entregadas</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#dc2626]" />Devoluciones</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#cbd5e1]" />En curso / otras</span>
      </div>
    </Tarjeta>
  );
}

function TarjetaProductos({ r }) {
  const metrica = {
    unidades_entregadas: { titulo: "unidades entregadas", valor: (p) => p.unidades_entregadas, texto: (p) => `${numero(p.unidades_entregadas)} u` },
    ordenes: { titulo: "órdenes", valor: (p) => p.ordenes, texto: (p) => `${numero(p.ordenes)} órd.` },
    venta_entregada: { titulo: "venta entregada", valor: (p) => p.venta_entregada, texto: (p) => dinero(p.venta_entregada) },
  }[r.ordenado_por] || { titulo: "unidades", valor: (p) => p.unidades, texto: (p) => `${numero(p.unidades)} u` };

  const productos = r.productos || [];
  return (
    <Tarjeta titulo={`Más vendidos · ${metrica.titulo}`} periodo={r.periodo}>
      {productos.length ? (
        <Ranking
          filas={productos.map((p) => ({
            nombre: p.producto,
            valor: metrica.valor(p),
            detalle: `${metrica.texto(p)} · ${numero(p.ordenes)} órd.`,
          }))}
        />
      ) : (
        <p className="m-0 text-[12px] text-slate-500">Sin ventas con detalle de productos en este periodo.</p>
      )}
    </Tarjeta>
  );
}

function TarjetaAliclik({ r }) {
  const grupos = r.grupos || [];
  return (
    <Tarjeta
      titulo={`Pedidos Aliclik por ${r.agrupado_por}`}
      periodo={r.periodo}
    >
      <Kpis
        items={[
          { label: "pedidos", valor: numero(r.total_pedidos) },
          { label: "entregados", valor: numero(r.entregados) },
          { label: "tasa entrega", valor: porcentaje(r.tasa_entrega_pct) },
        ]}
      />
      {r.agrupado_por === "estado" ? (
        <DistribucionEstados grupos={grupos} campo="pedidos" />
      ) : (
        <Ranking
          filas={grupos.slice(0, 10).map((g) => ({
            nombre: g[r.agrupado_por],
            valor: g.pedidos,
            detalle: `${numero(g.pedidos)} · ${dinero(g.monto)}`,
          }))}
        />
      )}
    </Tarjeta>
  );
}

function TarjetaPedido({ r }) {
  const resultados = r.resultados || [];
  if (!resultados.length) {
    return (
      <Tarjeta titulo="Búsqueda de pedido">
        <p className="m-0 text-[12px] text-slate-500">{r.mensaje || "No se encontró el pedido."}</p>
      </Tarjeta>
    );
  }
  return (
    <>
      {resultados.map((p) => (
        <Tarjeta key={`${p.plataforma}-${p.orden}`} titulo={`${p.plataforma} · orden ${p.orden}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-cyan-800">
              {p.estado_general || p.estado}
            </span>
            {p.estado_general && p.estado !== p.estado_general && (
              <span className="text-[11px] text-slate-500">{p.estado}</span>
            )}
          </div>
          <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
            {[
              ["Guía", p.guia],
              ["Transportadora", p.transportadora],
              ["Ciudad", p.ciudad],
              ["Total", dinero(p.total)],
              ["Cliente", p.cliente],
              ["Fecha", p.fecha ? String(p.fecha).slice(0, 10) : null],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[10px] text-slate-400">{k}</dt>
                  <dd className="m-0 truncate font-medium text-[#102033]" title={String(v)}>{v}</dd>
                </div>
              ))}
          </dl>
        </Tarjeta>
      ))}
    </>
  );
}

function rangoPrecio(p) {
  if (p.precio_venta_min === null || p.precio_venta_max === null) return null;
  if (Math.abs(p.precio_venta_max - p.precio_venta_min) < 0.01) return null;
  return `${dinero(p.precio_venta_min)} – ${dinero(p.precio_venta_max)}`;
}

function TarjetaVentasProducto({ r }) {
  const productos = r.productos || [];
  const catalogo = (r.catalogo || []).find((c) => c.precio !== null);
  return (
    <>
      {productos.map((p) => {
        const rango = rangoPrecio(p);
        const detalles = [
          rango && ["Rango de precio", rango],
          p.costo_proveedor !== null && ["Costo proveedor", dinero(p.costo_proveedor)],
          catalogo && ["Precio en catálogo", dinero(catalogo.precio)],
          ["Venta entregada", dinero(p.venta_entregada)],
          ["Devoluciones", numero(p.devoluciones)],
          ["Última venta", p.ultima_venta ? String(p.ultima_venta).slice(0, 10) : null],
        ].filter((d) => d && d[1]);
        return (
          <Tarjeta key={`${p.producto}-${p.sku}`} titulo="Ventas del producto" periodo={r.periodo}>
            <p className="m-0 text-[13px] font-semibold leading-snug text-[#0a1628]">
              {p.producto}
              {p.sku && (
                <span className="ml-1.5 text-[10.5px] font-normal text-slate-400">{p.sku}</span>
              )}
            </p>
            <Kpis
              items={[
                { label: "unidades", valor: numero(p.unidades) },
                { label: "entregadas", valor: numero(p.unidades_entregadas) },
                {
                  label: "precio prom.",
                  valor: p.precio_venta_promedio === null ? "—" : dinero(p.precio_venta_promedio),
                },
              ]}
            />
            <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
              {detalles.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[10px] text-slate-400">{k}</dt>
                  <dd className="m-0 truncate font-medium tabular-nums text-[#102033]">{v}</dd>
                </div>
              ))}
            </dl>
          </Tarjeta>
        );
      })}
      {r.aliclik && (
        <Tarjeta titulo={`Aliclik · ${r.producto_buscado}`} periodo={r.periodo}>
          <Kpis
            items={[
              { label: "pedidos", valor: numero(r.aliclik.pedidos) },
              { label: "entregados", valor: numero(r.aliclik.entregados) },
              { label: "monto", valor: dinero(r.aliclik.monto_total) },
            ]}
          />
        </Tarjeta>
      )}
    </>
  );
}

// Solo embeds de Bunny Stream (mismo reproductor que imporsuit-pro). Cualquier
// otra URL no se mete en un iframe.
const RE_EMBED_BUNNY =
  /^https:\/\/(?:player|iframe)\.mediadelivery\.net\/embed\/(\d+)\/([0-9a-f-]{36})$/i;

function srcBunny(url) {
  const m = RE_EMBED_BUNNY.exec(String(url || "").trim());
  if (!m) return null;
  return `https://player.mediadelivery.net/embed/${m[1]}/${m[2]}?autoplay=true&preload=true&loop=false&muted=false&responsive=true`;
}

function duracion(segundos) {
  const s = Number(segundos) || 0;
  if (!s) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

function VideoTutorial({ video }) {
  const [reproduciendo, setReproduciendo] = useState(false);
  const src = srcBunny(video.embed_url);
  if (!src) return null;
  const tiempo = duracion(video.duracion_segundos);

  return (
    <div className="grid gap-1.5">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#0a1628]">
        {reproduciendo ? (
          <iframe
            src={src}
            title={video.titulo}
            loading="lazy"
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setReproduciendo(true)}
            className="group absolute inset-0 grid place-items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            aria-label={`Reproducir: ${video.titulo}`}
          >
            {video.thumbnail && (
              <img
                src={video.thumbnail}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
              />
            )}
            <span className="relative grid h-10 w-10 place-items-center rounded-full bg-white/95 text-cyan-700 shadow-lg transition-transform group-hover:scale-105">
              <i className="bx bx-play text-2xl" />
            </span>
            {tiempo && (
              <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-px text-[10px] font-medium tabular-nums text-white">
                {tiempo}
              </span>
            )}
          </button>
        )}
      </div>
      <p className="m-0 text-[12px] font-semibold leading-snug text-[#0a1628]">
        {video.titulo}
      </p>
      {video.descripcion && video.descripcion !== video.titulo && (
        <p className="m-0 line-clamp-2 text-[11px] leading-snug text-slate-500">
          {video.descripcion}
        </p>
      )}
    </div>
  );
}

function TarjetaVideos({ r }) {
  const videos = (r.videos || []).filter((v) => srcBunny(v.embed_url));
  return (
    <Tarjeta titulo={videos.length > 1 ? "Videos tutoriales" : "Video tutorial"}>
      <div className="grid gap-3">
        {videos.map((v) => (
          <VideoTutorial key={v.id} video={v} />
        ))}
      </div>
    </Tarjeta>
  );
}

function datoVacio({ herramienta, resultado: r = {} }) {
  if (herramienta === "buscar_videos_tutoriales") {
    return !(r.videos || []).some((v) => srcBunny(v.embed_url));
  }
  if (herramienta === "guias_dropi_resumen") return !Number(r.total_ordenes);
  if (herramienta === "pedidos_aliclik_resumen") return !Number(r.total_pedidos);
  if (herramienta === "productos_mas_vendidos") return !(r.productos || []).length;
  if (herramienta === "ventas_producto") return !(r.productos || []).length && !r.aliclik;
  return false;
}

const TARJETAS = {
  guias_dropi_resumen: TarjetaGuias,
  productos_mas_vendidos: TarjetaProductos,
  pedidos_aliclik_resumen: TarjetaAliclik,
  ventas_producto: TarjetaVentasProducto,
  buscar_videos_tutoriales: TarjetaVideos,
  buscar_pedido: TarjetaPedido,
};

// Tarjetas de una respuesta. Las consultas sin resultados no se dibujan: el
// texto del asistente ya explica que no hubo datos (y ofrece alternativas).
export function MetricasRespuesta({ datos }) {
  const visibles = (Array.isArray(datos) ? datos : []).filter((d) => !datoVacio(d));
  return visibles.map((d, j) => {
    const Componente = TARJETAS[d.herramienta];
    return Componente ? <Componente key={j} r={d.resultado} /> : null;
  });
}
