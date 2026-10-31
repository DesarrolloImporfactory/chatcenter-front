import { useCallback, useEffect, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";

/* ═══════════════════════════════════════════════════════════════════════
   Utilidades y piezas básicas de /espia-mercado.

   Lenguaje visual: el mismo del modal de implementación (navy #0B1426,
   acentos sky/cyan, verde WhatsApp para «éxito», sombras suaves y radios
   generosos). El cuerpo de la pantalla va en claro para combinar con el
   resto de Imporchat; el hero y los paneles de énfasis van en navy.
   Los componentes grandes viven en ./componentes.
   ═══════════════════════════════════════════════════════════════════════ */

export const TOKENS = {
  navy: "#0B1426",
  navy2: "#0f1b33",
  sky: "#38bdf8",
  cyan: "#22d3ee",
  verde: "#25D366",
  ambar: "#f59e0b",
  rosa: "#fb7185",
};

export const PAISES = [
  { code: "EC", nombre: "Ecuador", bandera: "🇪🇨" },
  { code: "MX", nombre: "México", bandera: "🇲🇽" },
  // QA = datos de prueba (pasadas con respuestas guardadas). Solo aparece si
  // la URL lo trae (?pais=QA) o ya se eligió antes.
  ...(/[?&]pais=QA/i.test(window.location.search) ||
  localStorage.getItem("espia_pais") === "QA"
    ? [{ code: "QA", nombre: "Pruebas (QA)", bandera: "🧪" }]
    : []),
];

export const nombrePais = (code) => PAISES.find((p) => p.code === code)?.nombre || code;

/* Ficha del producto en Dropi (misma ruta en cada país). */
export const urlDropi = (pais, id) => {
  const dominio = pais === "MX" ? "app.dropi.mx" : pais === "CO" ? "app.dropi.co" : "app.dropi.ec";
  return `https://${dominio}/dashboard/product-details/${id}`;
};

/* Biblioteca de anuncios de Meta: anuncios activos del país, lista para pegar el dominio. */
export const urlBiblioteca = (pais = "EC", q = "") =>
  `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${pais === "QA" ? "EC" : pais}&q=${encodeURIComponent(q)}&search_type=keyword_unordered&media_type=all`;

/* Cuando la extensión esté publicada en la Chrome Web Store, poner aquí su URL:
   la guía muestra entonces «Instalar desde Chrome Web Store». */
export const URL_EXTENSION_WEB_STORE = null;

/* ── Clases base ─────────────────────────────────────────────────────── */
export const input =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
export const select = `${input} pr-8`;
const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimario = `${btn} bg-[#0B1426] text-white shadow-[0_10px_24px_-10px_rgba(11,20,38,0.7)] hover:bg-[#13244a]`;
export const btnAcento = `${btn} bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-[0_10px_24px_-10px_rgba(56,189,248,0.8)] hover:from-sky-400 hover:to-cyan-300`;
export const btnSuave = `${btn} border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50`;
export const btnChico = `${btn} px-2.5 py-1.5 text-xs`;
export const btnFantasma = `${btn} text-slate-600 hover:bg-slate-100`;
/* Sobre fondo navy. */
export const btnOscuro = `${btn} border border-white/15 bg-white/10 text-white backdrop-blur hover:bg-white/20`;
export const btnBlanco = `${btn} bg-white text-[#0B1426] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] hover:bg-sky-50`;

export const tarjeta = "rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_-14px_rgba(11,20,38,0.25)]";

/* ── Formato ─────────────────────────────────────────────────────────── */
export const fmtNum = (n) =>
  n === null || n === undefined || n === "" ? "—" : Number(n).toLocaleString("es-EC");
export const fmtCorto = (n) => {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString("es-EC", { maximumFractionDigits: 1 })} M`;
  if (Math.abs(v) >= 10_000) return `${(v / 1000).toLocaleString("es-EC", { maximumFractionDigits: 1 })} k`;
  return v.toLocaleString("es-EC");
};
/* Moneda por país: EC en USD con centavos ($ 12,50), MX en pesos sin centavos ($ 450). */
export const monedaDe = (pais) => (pais === "MX" ? "MXN" : pais === "CO" ? "COP" : "USD");
export const fmtMoneda = (n, pais = "EC") => {
  if (n === null || n === undefined || n === "" || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  if (pais === "MX" || pais === "CO") return `$ ${v.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
  return `$ ${v.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
export const fmtMoney = (n) =>
  n === null || n === undefined || n === "" ? "—" : `$${Number(n).toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtFecha = (f) => {
  if (!f) return "—";
  const d = new Date(f);
  if (Number.isNaN(d.getTime())) return String(f);
  return d.toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" });
};
export const fmtDia = (f) => {
  if (!f) return "—";
  const d = new Date(f);
  if (Number.isNaN(d.getTime())) return String(f);
  return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short" });
};
export const fmtHora = (f) => {
  if (!f) return "—";
  const d = new Date(f);
  if (Number.isNaN(d.getTime())) return String(f);
  return d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
};
/* «hace 5 min», «hace 3 h», «ayer» */
export const haceCuanto = (f) => {
  if (!f) return "nunca";
  const d = new Date(f);
  if (Number.isNaN(d.getTime())) return String(f);
  const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (s < 60) return "hace un momento";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  return fmtDia(f);
};

/* Mensaje según lo que devolvió el back: 403 (solo super admin), error del
   servidor con texto, o caída de red. Así cada estado se ve distinto. */
export function textoError(err) {
  const status = err?.response?.status;
  const msg = err?.response?.data?.message;
  if (status === 403) return "Esta pantalla es solo para super administradores.";
  if (status === 401) return "Tu sesión venció. Vuelve a iniciar sesión.";
  if (msg) return msg;
  if (!err?.response) return "No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.";
  return "Algo falló en el servidor. Intenta de nuevo en un momento.";
}

/* Consulta con los tres estados: cargando / vacío / error. `params` se
   serializa para que el efecto solo corra cuando cambian de verdad.
   `cada` (ms) repite la consulta en segundo plano sin pasar a «cargando». */
export function useConsulta(url, params, { activo = true, inicial = null, cada = 0 } = {}) {
  const [data, setData] = useState(inicial);
  const [cargando, setCargando] = useState(!!activo);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const llave = JSON.stringify(params || {});
  const recargar = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!activo) return undefined;
    let vigente = true;
    setCargando(true);
    setError(null);
    chatApi
      .get(url, { params: JSON.parse(llave) })
      .then(({ data: r }) => {
        if (!vigente) return;
        setData(r?.data ?? null);
      })
      .catch((err) => {
        if (!vigente) return;
        setError(textoError(err));
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [url, llave, activo, tick]);

  useEffect(() => {
    if (!activo || !cada) return undefined;
    const t = setInterval(() => {
      chatApi
        .get(url, { params: JSON.parse(llave) })
        .then(({ data: r }) => setData(r?.data ?? null))
        .catch(() => {});
    }, cada);
    return () => clearInterval(t);
  }, [url, llave, activo, cada]);

  return { data, cargando, error, recargar, setData };
}

/* Copiar al portapapeles con confirmación de 2 s. */
export function useCopiar() {
  const [copiado, setCopiado] = useState(false);
  const copiar = useCallback(async (texto) => {
    try {
      await navigator.clipboard.writeText(texto || "");
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      return true;
    } catch {
      setCopiado(false);
      return false;
    }
  }, []);
  return { copiado, copiar };
}

/* ── Piezas básicas ──────────────────────────────────────────────────── */
export function Aviso({ tipo = "info", children, className = "", icono = true }) {
  const cls =
    tipo === "ok"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tipo === "error"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : tipo === "warn"
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-sky-50 text-sky-800 border-sky-200";
  const ico = tipo === "ok" ? "bx-check-circle" : tipo === "error" ? "bx-error-circle" : tipo === "warn" ? "bx-error" : "bx-info-circle";
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${cls} ${className}`} role={tipo === "error" ? "alert" : undefined}>
      {icono ? <i className={`bx ${ico} mt-0.5 shrink-0 text-base`} /> : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Modal({ titulo, subtitulo, onClose, ancho = "max-w-lg", children, acciones }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4" style={{ background: "rgba(3,7,18,0.6)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className={`flex max-h-[90vh] w-full ${ancho} flex-col rounded-[22px] bg-white shadow-[0_50px_140px_-30px_rgba(0,0,0,0.7)] ring-1 ring-black/5`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-extrabold text-slate-900">{titulo}</h3>
            {subtitulo ? <p className="mt-0.5 text-xs text-slate-500">{subtitulo}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {acciones}
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100" aria-label="Cerrar">
              <i className="bx bx-x text-2xl" />
            </button>
          </div>
        </div>
        <div className="min-h-0 overflow-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* Píldora de filtro/atajo. Activa = navy. */
export function Chip({ activo, onClick, children, tono = "navy", title, className = "" }) {
  const base = "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition";
  const estilo = activo
    ? tono === "emerald"
      ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_8px_20px_-10px_rgba(16,185,129,0.9)]"
      : "border-[#0B1426] bg-[#0B1426] text-white shadow-[0_8px_20px_-10px_rgba(11,20,38,0.9)]"
    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900";
  if (!onClick) {
    return (
      <span title={title} className={`${base} ${estilo} ${className}`}>
        {children}
      </span>
    );
  }
  return (
    <button type="button" title={title} onClick={onClick} aria-pressed={!!activo} className={`${base} ${estilo} ${className}`}>
      {children}
    </button>
  );
}

/* A dónde manda el anuncio / sobre qué corre la tienda. Lo deduce la extensión
   del enlace de destino de cada anuncio (wa.me → WhatsApp, myshopify o tema
   Shopify → Shopify, dropi → Dropi, el resto → Web). */
export const PLATAFORMAS = [
  { id: "whatsapp", label: "WhatsApp", icono: "bxl-whatsapp", tono: "verde", nota: "El anuncio manda directo a WhatsApp: venta por chat, casi siempre contra entrega" },
  { id: "shopify", label: "Shopify", icono: "bxl-shopify", tono: "emerald", nota: "Tienda Shopify: hay catálogo y checkout propios" },
  { id: "dropi", label: "Dropi", icono: "bx-package", tono: "amber", nota: "Landing o checkout de Dropi: dropshipping con el mismo proveedor que nosotros" },
  { id: "web", label: "Web", icono: "bx-globe", tono: "sky", nota: "Sitio propio sin Shopify ni WhatsApp" },
];
export function EtiquetaPlataforma({ plataforma, className = "" }) {
  const p = PLATAFORMAS.find((x) => x.id === plataforma);
  if (!p) return null;
  return (
    <Etiqueta tono={p.tono} title={p.nota} className={className}>
      <i className={`bx ${p.icono}`} /> {p.label}
    </Etiqueta>
  );
}

export function Etiqueta({ children, tono = "slate", title, className = "" }) {
  const tonos = {
    slate: "bg-slate-100 text-slate-700",
    navy: "bg-[#0B1426] text-white",
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    verde: "bg-[#25D366]/15 text-emerald-800",
    amber: "bg-amber-50 text-amber-800",
    rose: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-sky-800",
    cyan: "bg-cyan-50 text-cyan-800",
  };
  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${tonos[tono] || tonos.slate} ${className}`}>
      {children}
    </span>
  );
}

/* Esqueleto de carga: filas grises que respiran. */
export function Esqueleto({ filas = 6, alto = "h-14" }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className={`${alto} animate-pulse rounded-xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100`} style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}

/* Estado de una lista: cargando, error o vacío. Devuelve null si hay datos.
   `vacioNodo` permite un panel vacío propio (guía de la extensión, etc.). */
export function EstadoLista({ cargando, error, vacio, textoVacio, vacioNodo, onReintentar, esqueleto }) {
  if (cargando) {
    return esqueleto || <Esqueleto />;
  }
  if (error) {
    return (
      <div className="py-6">
        <Aviso tipo="error">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            {onReintentar ? (
              <button type="button" className={`${btnChico} border border-rose-300 bg-white text-rose-700`} onClick={onReintentar}>
                <i className="bx bx-refresh" /> Reintentar
              </button>
            ) : null}
          </div>
        </Aviso>
      </div>
    );
  }
  if (vacio) {
    if (vacioNodo) return vacioNodo;
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center text-sm text-slate-500">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl text-slate-300 shadow-sm">
          <i className="bx bx-search-alt" />
        </span>
        <span className="max-w-md">{textoVacio || "Sin resultados con estos filtros."}</span>
      </div>
    );
  }
  return null;
}

/* Gráfico de barras sin librerías: una barra por día (versión div). */
export function Barras({ serie, campo = "n", alto = 48, titulo, tono = "bg-sky-500" }) {
  const valores = (serie || []).map((p) => Number(p?.[campo]) || 0);
  const max = Math.max(1, ...valores);
  if (!serie?.length) {
    return <div className="text-xs text-slate-400">Sin datos todavía</div>;
  }
  return (
    <div className="flex items-end gap-[2px]" style={{ height: alto }} title={titulo}>
      {serie.map((p, i) => {
        const v = valores[i];
        const h = Math.max(2, Math.round((v / max) * alto));
        return (
          <div
            key={p.fecha || i}
            className={`flex-1 rounded-t-sm ${v ? tono : "bg-slate-200"}`}
            style={{ height: h, minWidth: 3 }}
            title={`${fmtDia(p.fecha)}: ${fmtNum(v)}${p.reabastecido ? " · reabastecido" : ""}`}
          />
        );
      })}
    </div>
  );
}

/* Números de página con elipsis: 1 … 7 8 [9] 10 11 … 948 */
function paginasVisibles(page, paginas, vecinos = 2) {
  const set = new Set([1, paginas]);
  for (let i = page - vecinos; i <= page + vecinos; i += 1) if (i >= 1 && i <= paginas) set.add(i);
  const orden = [...set].sort((a, b) => a - b);
  const out = [];
  orden.forEach((n, i) => {
    if (i > 0 && n - orden[i - 1] > 1) out.push(n - orden[i - 1] === 2 ? orden[i - 1] + 1 : "…");
    out.push(n);
  });
  return out;
}

/* Paginador completo: Anterior/Siguiente, números con elipsis, «Ir a» y
   «Mostrando 401–450 de 47.401». `compacta` para la fila superior (sin
   borde) y `siempre` para mostrarlo aunque haya una sola página. */
export function Paginacion({ page, limit, total, onPage, compacta = false, siempre = false, className = "" }) {
  const [irA, setIrA] = useState("");
  const t = Number(total) || 0;
  const l = Math.max(1, Number(limit) || 1);
  const paginas = Math.max(1, Math.ceil(t / l));
  const p = Math.min(Math.max(1, Number(page) || 1), paginas);
  if (paginas <= 1 && !siempre) return null;
  const desde = t ? (p - 1) * l + 1 : 0;
  const hasta = Math.min(t, p * l);
  const ir = () => {
    const n = Math.min(paginas, Math.max(1, Number(irA)));
    if (Number.isFinite(n) && n !== p) onPage(n);
    setIrA("");
  };
  const num = "grid h-8 min-w-[32px] place-items-center rounded-lg px-1.5 text-xs font-bold tabular-nums transition";
  return (
    <nav aria-label="Paginación" className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-slate-600 ${compacta ? "" : "border-t border-slate-100 pt-3"} ${className}`}>
      <span className="text-xs text-slate-500">
        Mostrando <b className="text-slate-900 tabular-nums">{fmtNum(desde)}–{fmtNum(hasta)}</b> de <b className="text-slate-900 tabular-nums">{fmtNum(t)}</b>
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={`${btnChico} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`} disabled={p <= 1} onClick={() => onPage(p - 1)} aria-label="Página anterior">
          <i className="bx bx-chevron-left" /> <span className="hidden sm:inline">Anterior</span>
        </button>
        <div className="flex items-center gap-0.5">
          {paginasVisibles(p, paginas).map((n, i) =>
            n === "…" ? (
              <span key={`e${i}`} className="grid h-8 w-6 place-items-center text-xs text-slate-400" aria-hidden="true">
                …
              </span>
            ) : (
              <button key={n} type="button" onClick={() => onPage(n)} aria-current={n === p ? "page" : undefined} aria-label={`Página ${n}`} className={`${num} ${n === p ? "bg-[#0B1426] text-white shadow-[0_8px_20px_-10px_rgba(11,20,38,0.9)]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                {fmtNum(n)}
              </button>
            ),
          )}
        </div>
        <button type="button" className={`${btnChico} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`} disabled={p >= paginas} onClick={() => onPage(p + 1)} aria-label="Página siguiente">
          <span className="hidden sm:inline">Siguiente</span> <i className="bx bx-chevron-right" />
        </button>
        {paginas > 5 ? (
          <label className="ml-1 inline-flex items-center gap-1 text-xs text-slate-500">
            Ir a
            <input
              type="number"
              min="1"
              max={paginas}
              value={irA}
              onChange={(e) => setIrA(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ir()}
              onBlur={() => irA && ir()}
              placeholder={String(p)}
              aria-label="Ir a la página"
              className="h-8 w-16 rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-bold tabular-nums outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </label>
        ) : null}
      </div>
    </nav>
  );
}

/* «#123» que se copia con un clic. */
export function CopiarId({ id, className = "", prefijo = "#" }) {
  const { copiado, copiar } = useCopiar();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        copiar(String(id));
      }}
      title="Copiar ID"
      aria-label={`Copiar ID ${id}`}
      className={`inline-flex items-center gap-0.5 rounded px-1 font-mono text-[11px] tabular-nums transition hover:bg-slate-100 ${copiado ? "text-emerald-600" : "text-slate-400 hover:text-slate-700"} ${className}`}
    >
      {prefijo}
      {id}
      <i className={`bx ${copiado ? "bx-check" : "bx-copy"} text-[12px]`} />
    </button>
  );
}

/* Buscador que espera a que dejes de escribir antes de consultar. */
export function Buscador({ valor, onChange, placeholder, className = "" }) {
  const [texto, setTexto] = useState(valor || "");
  const timer = useRef(null);
  useEffect(() => setTexto(valor || ""), [valor]);
  return (
    <div className={`relative ${className}`}>
      <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
      <input
        className={`${input} pl-10 pr-9`}
        value={texto}
        placeholder={placeholder}
        aria-label={placeholder || "Buscar"}
        onChange={(e) => {
          const v = e.target.value;
          setTexto(v);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => onChange(v.trim()), 450);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            clearTimeout(timer.current);
            onChange(texto.trim());
          }
        }}
      />
      {texto ? (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          onClick={() => {
            setTexto("");
            clearTimeout(timer.current);
            onChange("");
          }}
        >
          <i className="bx bx-x" />
        </button>
      ) : null}
    </div>
  );
}

export function Campo({ label, children, ancho = "" }) {
  return (
    <label className={`flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 ${ancho}`}>
      {label}
      {children}
    </label>
  );
}

export const urlMeta = (ad) => ad?.url_meta || `https://www.facebook.com/ads/library/?id=${ad?.ad_archive_id || ""}`;

/* Creativo del anuncio: video con póster y botón de play (el video solo se
   carga al tocarlo, para no bajar cientos de MB en una grilla), o imagen. */
export function Creativo({ anuncio, className = "" }) {
  const [reproducir, setReproducir] = useState(false);
  const [vencido, setVencido] = useState(false);
  const esVideo = anuncio?.tipo === "video" && anuncio?.media_url;
  if (esVideo) {
    /* Meta firma las URL del video y las vence a los días: si ya no carga, se
       manda a verlo en la Biblioteca en vez de dejar un recuadro negro. */
    if (vencido) {
      return (
        <a href={urlMeta(anuncio)} target="_blank" rel="noreferrer" className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-900 px-4 text-center text-slate-300 ${className}`}>
          <i className="bx bx-movie-play text-4xl" />
          <span className="text-xs font-semibold leading-5">El video ya venció en Meta.<br />Ábrelo en la Biblioteca de anuncios ›</span>
        </a>
      );
    }
    if (reproducir) {
      return <video controls autoPlay preload="metadata" poster={anuncio.imagen_url || undefined} src={anuncio.media_url} onError={() => setVencido(true)} className={`h-full w-full bg-slate-900 object-contain ${className}`} />;
    }
    return (
      <button type="button" onClick={() => setReproducir(true)} className={`group relative block h-full w-full overflow-hidden bg-slate-900 ${className}`} aria-label="Reproducir video">
        {anuncio.imagen_url ? (
          <img src={anuncio.imagen_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full w-full place-items-center text-slate-500">
            <i className="bx bx-movie-play text-4xl" />
          </div>
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/20 transition group-hover:bg-black/30">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-[#0B1426] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] transition group-hover:scale-105">
            <i className="bx bx-play text-3xl" />
          </span>
        </span>
      </button>
    );
  }
  const src = anuncio?.imagen_url || anuncio?.media_url;
  if (!src) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 ${className}`}>
        <i className="bx bx-image text-3xl" />
      </div>
    );
  }
  return <img src={src} alt={anuncio?.titulo || anuncio?.producto || "Anuncio"} loading="lazy" className={`h-full w-full bg-slate-100 object-cover ${className}`} />;
}

/* Miniatura de producto con respaldo. */
export function Foto({ src, alt, className = "h-12 w-12", redondeo = "rounded-xl" }) {
  if (!src) {
    return (
      <div className={`${className} flex shrink-0 items-center justify-center ${redondeo} bg-slate-100 text-slate-300 ring-1 ring-slate-200/70`}>
        <i className="bx bx-image text-xl" />
      </div>
    );
  }
  return <img src={src} alt={alt || ""} loading="lazy" className={`${className} shrink-0 ${redondeo} bg-slate-100 object-cover ring-1 ring-slate-200/70`} />;
}
