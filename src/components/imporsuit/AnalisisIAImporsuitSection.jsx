import { useCallback, useEffect, useRef, useState } from "react";
import {
  IA_AGENTES_HABILITADOS,
  IA_CONFIGS_HABILITADAS,
  analizarCotizacionIA,
  getActorChatcenter,
  getCotizacionesIA,
} from "../../services/imporsuit";

/**
 * Análisis IA de cotizaciones — panel "Información del cliente".
 *
 * Lista las cotizaciones del cliente de este chat que llevan más de 3 días sin
 * cerrarse (o se anularon), de cualquier asesor, con el análisis de la IA: por
 * qué no se cerró, qué hacer para recuperarla y un WhatsApp sugerido para
 * copiar. Lo lee el agente; nunca se le envía al cliente.
 *
 * Pedido del 2026-09-24: solo en la línea 265 y solo para Johan (ver
 * IA_AGENTES_HABILITADOS); desde el 25 ve las de todos los asesores. Espejo
 * del botón «IA» de Imporsuit; los endpoints son los de Carterachat
 * (ia_cotizaciones / ia_analizar).
 */
export default function AnalisisIAImporsuitSection({ selectedChat, idConfiguracion }) {
  const [open, setOpen] = useState(false);
  const telefono = selectedChat?.celular_cliente || "";
  const agente = getActorChatcenter().id_sub_usuario;

  if (
    !IA_CONFIGS_HABILITADAS.includes(Number(idConfiguracion)) ||
    !IA_AGENTES_HABILITADOS.includes(Number(agente)) ||
    !telefono
  ) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-1 mb-3 mt-1 flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.07]"
      >
        <span className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-500/10">
            <i className="bx bx-brain text-[16px] text-violet-300" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[8px] font-semibold uppercase tracking-[0.22em] text-white/35">
              Imporsuit · solo tú
            </span>
            <span className="text-[12px] font-bold uppercase tracking-wide text-white">
              Análisis IA de cotizaciones
            </span>
          </span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[11px] font-bold text-violet-200">
          Abrir <i className="bx bx-chevron-right text-[14px]" />
        </span>
      </button>

      {open && (
        <>
          {/* Fondo sólido, sin blur: el panel no compite con el chat de atrás. */}
          <div className="fixed inset-0 z-[60] bg-black/70" onClick={() => setOpen(false)} role="presentation" />
          <div
            className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div className="w-full max-w-2xl">
              <PanelAnalisis
                key={telefono}
                telefono={telefono}
                nombre={selectedChat?.nombre_cliente || ""}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

const INTERVALO_SONDEO_MS = 5000;
const MAX_SONDEOS = 40; // ~3 min

function PanelAnalisis({ telefono, nombre, onClose }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState("");
  // Claves "tipo:id" que se están analizando.
  const [analizando, setAnalizando] = useState({});
  const vivo = useRef(true);

  const cargar = useCallback(async () => {
    const r = await getCotizacionesIA({ telefono });
    if (vivo.current) setLista(r);
    return r;
  }, [telefono]);

  useEffect(() => {
    vivo.current = true;
    cargar()
      .then((r) => {
        // Si alguna quedó "procesando" (análisis que siguió después de cerrar), se sondea.
        r.filter((c) => c.analisis?.estado === "procesando").forEach((c) => sondear(`${c.tipo}:${c.id}`));
      })
      .catch((e) => vivo.current && setError(e.message || "No se pudieron cargar las cotizaciones."));
    return () => {
      vivo.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargar]);

  const marcar = (clave, on) =>
    setAnalizando((a) => {
      const b = { ...a };
      if (on) b[clave] = true;
      else delete b[clave];
      return b;
    });

  const reemplazar = (tipo, id, analisis) =>
    setLista((l) => (l || []).map((c) => (c.tipo === tipo && c.id === id ? { ...c, analisis } : c)));

  async function sondear(clave) {
    marcar(clave, true);
    const [tipo, idTxt] = clave.split(":");
    for (let i = 0; i < MAX_SONDEOS && vivo.current; i += 1) {
      await new Promise((r) => setTimeout(r, INTERVALO_SONDEO_MS));
      try {
        const r = await getCotizacionesIA({ telefono });
        const c = r.find((x) => x.tipo === tipo && String(x.id) === idTxt);
        if (c?.analisis && c.analisis.estado !== "procesando") {
          if (vivo.current) setLista(r);
          break;
        }
      } catch {
        /* se reintenta */
      }
    }
    if (vivo.current) marcar(clave, false);
  }

  async function analizar(c) {
    const clave = `${c.tipo}:${c.id}`;
    marcar(clave, true);
    try {
      const a = await analizarCotizacionIA({ tipo: c.tipo, id: c.id });
      if (!vivo.current) return;
      if (a?.estado === "procesando") {
        sondear(clave);
        return;
      }
      reemplazar(c.tipo, c.id, a);
      marcar(clave, false);
    } catch (e) {
      if (!vivo.current) return;
      // Timeout, corte de red o 5xx del proxy (no un error del back, que
      // trae `payload`): el análisis termina igual, se sondea.
      if (!e.payload && (!e.status || e.status >= 500)) {
        sondear(clave);
        return;
      }
      reemplazar(c.tipo, c.id, { estado: "error", error: e.message });
      marcar(clave, false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between gap-3 bg-slate-900 px-5 py-4 text-white">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold">
            <i className="bx bx-brain text-violet-300" />
            Análisis IA de cotizaciones
          </p>
          <p className="mt-0.5 truncate text-[11px] text-white/60">
            {nombre ? `${nombre} · ` : ""}por qué no se cerraron y cómo recuperarlas. Solo lo ves tú.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white/10 text-lg transition hover:bg-white/20"
        >
          <i className="bx bx-x" />
        </button>
      </div>

      <div className="max-h-[75vh] space-y-3 overflow-y-auto p-5">
        {error && <Aviso tono="err">{error}</Aviso>}
        {!error && lista === null && (
          <div className="space-y-2">
            {[90, 70, 80].map((w) => (
              <div key={w} className="h-3 animate-pulse rounded bg-slate-100" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
        {!error && lista?.length === 0 && (
          <Aviso>
            Este cliente no tiene cotizaciones sin respuesta: solo aparecen las que llevan más de 3 días sin
            cerrarse (ni anuladas ni descartadas del seguimiento).
          </Aviso>
        )}
        {lista?.map((c) => (
          <TarjetaCotizacion
            key={`${c.tipo}:${c.id}`}
            cot={c}
            analizando={!!analizando[`${c.tipo}:${c.id}`]}
            onAnalizar={() => analizar(c)}
          />
        ))}
      </div>
    </div>
  );
}

export const SITUACIONES = {
  no_cerrada: ["No cerrada", "border-amber-300 bg-amber-50 text-amber-800"],
  cerrada_no_reflejada: ["Cerrada, falta actualizar", "border-emerald-300 bg-emerald-50 text-emerald-800"],
  reemplazada_por_otra: ["Reemplazada por otra", "border-sky-300 bg-sky-50 text-sky-800"],
  sin_informacion: ["Sin información", "border-slate-200 bg-slate-50 text-slate-600"],
};
export const MOTIVOS = {
  precio_alto: "Precio alto",
  costo_flete_o_impuestos: "Flete o impuestos",
  sin_liquidez: "Sin liquidez",
  tiempo_de_entrega: "Tiempo de entrega",
  desconfianza: "Desconfianza",
  cliente_no_respondio: "Cliente no respondió",
  asesor_no_dio_seguimiento: "Faltó seguimiento del asesor",
  demora_en_cotizar: "Demora en cotizar",
  error_en_cotizacion: "Error en la cotización",
  cambio_de_producto_o_cantidades: "Cambió productos o cantidades",
  compro_con_otro_proveedor: "Compró con otro proveedor",
  solo_estaba_explorando: "Solo estaba explorando",
  problema_con_pedido_anterior: "Problema con un pedido anterior",
  otro: "Otro",
  no_aplica: "No aplica",
};
export const RECUPERAR = {
  alta: ["Alta", "border-emerald-300 bg-emerald-50 text-emerald-800"],
  media: ["Media", "border-amber-300 bg-amber-50 text-amber-800"],
  baja: ["Baja", "border-rose-300 bg-rose-50 text-rose-800"],
  no_aplica: ["No aplica", "border-slate-200 bg-slate-50 text-slate-600"],
};

function TarjetaCotizacion({ cot, analizando, onAnalizar }) {
  const a = cot.analisis;
  const r = a?.estado === "listo" ? a.resultado : null;
  const tipo = cot.tipo === "grupal" ? "Carga grupal" : cot.modo === "cajas" ? "Por cajas" : "Carga externa";

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-900">
            <span className="font-mono text-sky-700">{cot.codigo || `#${cot.id}`}</span>
            <span className="font-normal text-slate-400"> · {tipo}</span>
          </p>
          <p className="text-[11px] text-slate-500">
            {cot.asesor ? `Asesor ${cot.asesor} · ` : ""}estado {cot.estado} · creada{" "}
            {String(cot.fecha_creacion || "").slice(0, 10)}
          </p>
        </div>
        {!analizando && (
          <button
            type="button"
            onClick={onAnalizar}
            className="inline-flex items-center gap-1 rounded-lg border border-violet-300 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 transition hover:bg-violet-100"
            title={r ? "Vuelve a leer el chat. Si no hay mensajes nuevos, el resultado es el mismo." : undefined}
          >
            <i className={`bx ${r ? "bx-refresh" : "bx-brain"}`} />
            {r ? "Volver a analizar" : "Analizar"}
          </button>
        )}
      </div>

      {analizando && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800">
          <i className="bx bx-loader-alt bx-spin text-base" />
          Leyendo el chat y escuchando los audios… suele tardar entre 10 segundos y 1 minuto.
        </div>
      )}

      {!analizando && a?.estado === "error" && (
        <Aviso tono="err" className="mt-3">
          {a.error || "La IA no pudo analizar esta cotización."}
        </Aviso>
      )}

      {!analizando && a?.sin_cambios && (
        <Aviso className="mt-3">No hubo mensajes nuevos desde el último análisis, así que se muestra el mismo.</Aviso>
      )}

      {!analizando && r && <Resultado analisis={a} r={r} />}
    </div>
  );
}

export function Resultado({ analisis, r }) {
  const sit = SITUACIONES[r.situacion] || SITUACIONES.sin_informacion;
  const rec = RECUPERAR[r.probabilidad_recuperar] || RECUPERAR.no_aplica;
  return (
    <div className="mt-3 space-y-3 text-[13px] text-slate-800">
      <div className="flex flex-wrap gap-1.5">
        <Chip cls={sit[1]}>{sit[0]}</Chip>
        <Chip>
          <i className="bx bx-target-lock" /> {MOTIVOS[r.motivo_principal] || r.motivo_principal}
        </Chip>
        <Chip cls={rec[1]}>Recuperar: {rec[0]}</Chip>
      </div>

      <p className="leading-relaxed">{r.resumen}</p>

      {r.recomendaciones?.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-sky-700">Qué hacer para recuperarla</p>
          <ol className="list-decimal space-y-1 pl-5 marker:text-sky-600">
            {r.recomendaciones.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ol>
        </div>
      )}

      {r.mensaje_sugerido && <MensajeSugerido texto={r.mensaje_sugerido} />}

      {r.evidencia?.length > 0 && (
        <details className="rounded-lg bg-slate-50 px-3 py-2">
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Evidencia del chat ({r.evidencia.length})
          </summary>
          <ul className="mt-2 space-y-1 text-[12px] text-slate-600">
            {r.evidencia.map((x, i) => (
              <li key={i} className="border-l-2 border-slate-300 pl-2">
                {x}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-[10px] text-slate-400">
        Analizado el {String(analisis.fecha_creacion || "").slice(0, 16)} · {analisis.n_mensajes ?? 0} mensajes
        {Number(analisis.n_audios) > 0 ? ` · ${analisis.n_audios} audios` : ""} · confianza {r.confianza}. Sugerencia
        de la IA para el asesor: no se le envía al cliente.
      </p>
    </div>
  );
}

function MensajeSugerido({ texto }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin portapapeles: el texto sigue a la vista */
    }
  };
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-700">
          <i className="bx bxl-whatsapp text-sm" /> Mensaje sugerido para el cliente
        </p>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex items-center gap-1 rounded-md border border-sky-300 bg-white px-2 py-0.5 text-[11px] font-bold text-sky-700 hover:bg-sky-100"
        >
          <i className={`bx ${copiado ? "bx-check" : "bx-copy"}`} />
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-slate-900">{texto}</p>
    </div>
  );
}

export function Chip({ cls = "border-slate-200 bg-slate-50 text-slate-700", children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

export function Aviso({ tono = "info", className = "", children }) {
  const cls =
    tono === "err" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-sky-200 bg-sky-50 text-sky-800";
  return <div className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${cls} ${className}`}>{children}</div>;
}
