import { useCallback, useEffect, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";

/* Piezas compartidas de /espia-mercado. Mismo estilo que /telefonia. */

export const PAISES = [
  { code: "EC", nombre: "Ecuador" },
  { code: "MX", nombre: "México" },
  // QA = datos de prueba (pasadas con respuestas guardadas). Solo aparece si
  // la URL lo trae (?pais=QA) o ya se eligió antes.
  ...(/[?&]pais=QA/i.test(window.location.search) ||
  localStorage.getItem("espia_pais") === "QA"
    ? [{ code: "QA", nombre: "Pruebas (QA)" }]
    : []),
];

export const input =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
export const select = `${input} pr-8`;
const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimario = `${btn} bg-indigo-600 text-white hover:bg-indigo-700`;
export const btnSuave = `${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
export const btnChico = `${btn} px-2 py-1 text-xs`;

export const fmtNum = (n) =>
  n === null || n === undefined || n === "" ? "—" : Number(n).toLocaleString("es-EC");
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
   serializa para que el efecto solo corra cuando cambian de verdad. */
export function useConsulta(url, params, { activo = true, inicial = null } = {}) {
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

  return { data, cargando, error, recargar, setData };
}

export function Aviso({ tipo = "info", children, className = "" }) {
  const cls =
    tipo === "ok"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tipo === "error"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : tipo === "warn"
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-sky-50 text-sky-800 border-sky-200";
  return <div className={`rounded-lg border px-3 py-2 text-sm ${cls} ${className}`}>{children}</div>;
}

export function Modal({ titulo, subtitulo, onClose, ancho = "max-w-lg", children, acciones }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className={`flex max-h-[90vh] w-full ${ancho} flex-col rounded-2xl bg-white shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">{titulo}</h3>
            {subtitulo ? <p className="mt-0.5 text-xs text-slate-500">{subtitulo}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {acciones}
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
              <i className="bx bx-x text-2xl" />
            </button>
          </div>
        </div>
        <div className="min-h-0 overflow-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Chip({ activo, onClick, children, tono = "indigo", title }) {
  const base = "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition";
  const estilo = activo
    ? tono === "indigo"
      ? "border-indigo-600 bg-indigo-600 text-white"
      : "border-emerald-600 bg-emerald-600 text-white"
    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
  if (!onClick) {
    return (
      <span title={title} className={`${base} ${estilo}`}>
        {children}
      </span>
    );
  }
  return (
    <button type="button" title={title} onClick={onClick} className={`${base} ${estilo}`}>
      {children}
    </button>
  );
}

export function Etiqueta({ children, tono = "slate", title }) {
  const tonos = {
    slate: "bg-slate-100 text-slate-700",
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
    rose: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-sky-800",
  };
  return (
    <span title={title} className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold ${tonos[tono] || tonos.slate}`}>
      {children}
    </span>
  );
}

/* Estado de una lista: cargando, error o vacío. Devuelve null si hay datos. */
export function EstadoLista({ cargando, error, vacio, textoVacio, onReintentar }) {
  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
        <i className="bx bx-loader-alt animate-spin text-xl" /> Cargando…
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-8">
        <Aviso tipo="error">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            {onReintentar ? (
              <button type="button" className={btnChico + " border border-rose-300 bg-white text-rose-700"} onClick={onReintentar}>
                Reintentar
              </button>
            ) : null}
          </div>
        </Aviso>
      </div>
    );
  }
  if (vacio) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-12 text-center text-sm text-slate-500">
        <i className="bx bx-search-alt text-3xl text-slate-300" />
        <span>{textoVacio || "Sin resultados con estos filtros."}</span>
      </div>
    );
  }
  return null;
}

/* Gráfico de barras sin librerías: una barra por día. */
export function Barras({ serie, campo = "n", alto = 48, titulo, tono = "bg-indigo-500" }) {
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

export function Paginacion({ page, limit, total, onPage }) {
  const paginas = Math.max(1, Math.ceil((Number(total) || 0) / (Number(limit) || 1)));
  if (paginas <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 text-sm text-slate-600">
      <span>
        Página {page} de {paginas} · {fmtNum(total)} resultados
      </span>
      <div className="flex gap-2">
        <button type="button" className={btnSuave} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <i className="bx bx-chevron-left" /> Anterior
        </button>
        <button type="button" className={btnSuave} disabled={page >= paginas} onClick={() => onPage(page + 1)}>
          Siguiente <i className="bx bx-chevron-right" />
        </button>
      </div>
    </div>
  );
}

/* Buscador que espera a que dejes de escribir antes de consultar. */
export function Buscador({ valor, onChange, placeholder }) {
  const [texto, setTexto] = useState(valor || "");
  const timer = useRef(null);
  useEffect(() => setTexto(valor || ""), [valor]);
  return (
    <div className="relative">
      <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        className={`${input} pl-9`}
        value={texto}
        placeholder={placeholder}
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
    </div>
  );
}

export function Campo({ label, children, ancho = "" }) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-bold text-slate-600 ${ancho}`}>
      {label}
      {children}
    </label>
  );
}

export const urlMeta = (ad) => ad?.url_meta || `https://www.facebook.com/ads/library/?id=${ad?.ad_archive_id || ""}`;

/* Creativo del anuncio: video con póster, o imagen. */
export function Creativo({ anuncio, className = "" }) {
  const esVideo = anuncio?.tipo === "video" && anuncio?.media_url;
  if (esVideo) {
    return (
      <video
        controls
        preload="none"
        poster={anuncio.imagen_url || undefined}
        src={anuncio.media_url}
        className={`h-full w-full bg-slate-900 object-contain ${className}`}
      />
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
