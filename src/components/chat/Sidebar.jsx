import Select from "react-select";
import ReactDOM from "react-dom";
import { useMemo, useState, useRef, useEffect } from "react";
/* === IMPORTS CLAVE PARA PREVIEW AL ESTILO ChatPrincipal.jsx === */
import CustomAudioPlayer from "./CustomAudioPlayer";
import ImageWithModal from "./modales/ImageWithModal";

/* ===================== Estilos de canal ===================== */
const CHANNEL_STYLES = {
  wa: { icon: "bx bxl-whatsapp", cls: "bg-green-50 text-green-700 border border-green-200" },
  ms: { icon: "bx bxl-messenger", cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  ig: { icon: "bx bxl-instagram", cls: "bg-red-50 text-red-700 border border-red-200" }
};

/* Normalizador de canal: wa|ms|ig o null (acepta alias comunes) */
function getChannelKey(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim().toLowerCase();
  if (["wa", "whatsapp", "wsp", "wp"].includes(s)) return "wa";
  if (["ms", "messenger", "fb", "facebook", "facebook messenger"].includes(s)) return "ms";
  if (["ig", "instagram", "insta"].includes(s)) return "ig";
  return null;
}

function PillCanal({ source }) {
  const key = getChannelKey(source);
  const cfg = key ? CHANNEL_STYLES[key] : null;
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.cls}`}
      title={cfg.label}
    >
      <i className={`${cfg.icon} text-sm`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

function PillEstado({ texto, colorClass }) {
  if (!texto) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-[3px] text-[10px] font-semibold uppercase tracking-wide text-slate-700 transition-colors duration-200"
      title={`Estado: ${texto}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${colorClass || "bg-slate-400"}`} />
      {texto}
    </span>
  );
}

/* ===================== Helpers de texto ===================== */
function expandirTemplate(texto = "", ruta_archivo, limite = 90) {
  if (!texto) return "";
  let out = texto;
  if (texto.includes("{{") && ruta_archivo) {
    try {
      const valores = JSON.parse(ruta_archivo);
      out = texto.replace(/\{\{(.*?)\}\}/g, (m, key) => valores[key.trim()] ?? m);
    } catch { /* ignore */ }
  }
  return out.length > limite ? `${out.substring(0, limite)}…` : out;
}

const normalizeSpaces = (s = "") => String(s).replace(/\s+/g, " ").trim();
const toTitleCaseEs = (str = "") => {
  const ex = new Set(["de","del","la","las","el","los","y","e","o","u","en","al","a","con","por","para"]);
  const words = str.toLowerCase().split(" ");
  return words.map((w, i) => (i > 0 && ex.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
};
const formatNombreCliente = (nombre = "") => {
  const s = normalizeSpaces(nombre);
  const hasLetters = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(s);
  if (hasLetters && s === s.toUpperCase()) return toTitleCaseEs(s);
  return s;
};
const getIdLabel = (m) =>
  (getChannelKey(m?.source) === "wa" ? (m?.celular_cliente || "") : (m?.username || formatNombreCliente(m?.nombre_cliente) || ""));

/* ===================== Heurísticas ===================== */
const esMensajePropio = (m) => Boolean(m?.from_me ?? m?.es_propio ?? m?.yo ?? m?.is_from_me ?? (m?.rol_mensaje === 1));
function extraerRespuesta(m) {
  const ref = m?.reply_to_text ?? m?.reply_text ?? m?.respuesta_texto ?? m?.respuesta_a ?? m?.mensaje_referencia?.texto ?? m?.mensaje_referencia?.text ?? m?.referencia?.texto ?? null;
  const autor = m?.reply_to_author ?? m?.respuesta_autor ?? m?.mensaje_referencia?.autor ?? m?.referencia?.autor ?? null;
  return { ref, autor };
}

/* === Normalizador de tipo (para asegurar audio/foto/ubicación) === */
function normalizarTipoMensaje(rawTipo) {
  const t = String(rawTipo || "").toLowerCase();
  if (["voice", "ptt", "audio"].includes(t)) return "audio";
  if (["photo", "image", "imagen", "picture", "pic"].includes(t)) return "image";
  if (["video", "mp4"].includes(t)) return "video";
  if (["sticker"].includes(t)) return "sticker";
  if (["document", "file", "archivo", "doc"].includes(t)) return "document";
  if (["location", "ubicacion", "ubicación", "mapa", "gps"].includes(t)) return "location";
  if (["template"].includes(t)) return "template";
  return "text";
}

/* === Detección extra (para cuando tipo_mensaje viene como 'text') === */
const AUDIO_EXT = /\.(ogg|mp3|m4a|wav|aac|oga)(\?.*)?$/i;
const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;

function esUbicacionJson(s) {
  if (!s) return false;
  try {
    const j = JSON.parse(s);
    const lat = j.latitude ?? j.lat;
    const lng = j.longitude ?? j.longitud ?? j.lng;
    return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  } catch { return false; }
}

function inferirTipoContenido(m) {
  const base = normalizarTipoMensaje(m?.tipo_mensaje);
  const texto = m?.texto_mensaje || "";
  const ruta = m?.ruta_archivo || "";
  const mime = (m?.mime || m?.mimetype || "").toLowerCase();

  if (base !== "text" && base !== "template") return base;

  // Si es ubicación en texto (JSON coords)
  if (esUbicacionJson(texto)) return "location";

  // Audio por ruta, mime o texto típico (“Audio recibido…”)
  if (AUDIO_EXT.test(ruta) || mime.startsWith("audio") || /audio recibido/i.test(texto)) return "audio";

  // Imagen por ruta o mime
  if (IMAGE_EXT.test(ruta) || mime.startsWith("image")) return "image";

  return base; // text o template
}
function PreviewAudioPlayer({ src, autoTrigger, isOpen }) {
  const audioRef = useRef(null);
  const wrapperRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);

  // --- bus global para “solo uno a la vez” ---
  const BUS = "preview-audio:stopAll";
  const myId = useRef(Symbol("preview-audio"));

  const fmt = (s) => {
    const t = Math.max(0, Math.floor(s || 0));
    const m = Math.floor(t / 60).toString();
    const ss = (t % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  const pauseAndReset = (a) => {
    try { a.pause(); } catch {}
    try { a.currentTime = 0; } catch {}
    setPlaying(false);
  };

  // escucha el bus: si otro quiere reproducir, pauso
  useEffect(() => {
    const handler = (ev) => {
      const from = ev?.detail?.from;
      if (from !== myId.current) {
        const a = audioRef.current;
        if (a && !a.paused) pauseAndReset(a);
      }
    };
    document.addEventListener(BUS, handler);
    return () => document.removeEventListener(BUS, handler);
  }, []);

  // reproduce de forma robusta + avisa al resto que se paren
  const safePlay = (audio) => {
    if (!audio) return;
    // anuncio: “paren todos menos yo”
    document.dispatchEvent(new CustomEvent(BUS, { detail: { from: myId.current } }));

    try { audio.muted = false; } catch {}
    audio.autoplay = true;

    const play = () => {
      const p = audio.play?.();
      p?.catch?.(() => {
        // desbloqueo por interacción dentro del player
        const unlock = () => {
          audio.play().finally(() => {
            wrapperRef.current?.removeEventListener("pointerdown", unlock, true);
            wrapperRef.current?.removeEventListener("pointerenter", unlock, true);
          });
        };
        wrapperRef.current?.addEventListener("pointerdown", unlock, true);
        wrapperRef.current?.addEventListener("pointerenter", unlock, true);
      });
    };

    if (audio.readyState >= 2) play();
    else {
      const onCanPlay = () => { audio.removeEventListener("canplay", onCanPlay); play(); };
      audio.addEventListener("canplay", onCanPlay, { once: true });
      try { audio.load(); } catch {}
      setTimeout(play, 250);
    }
  };

  // autoplay cuando cambia el src (hover nuevo) Y cuando la preview está abierta
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    try { a.pause(); a.currentTime = 0; } catch {}
    if (isOpen) {
      safePlay(a);
      setPlaying(true);
    }
    return () => { if (a) pauseAndReset(a); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTrigger, src, isOpen]);

  // si la preview se cierra, detengo y reseteo
  useEffect(() => {
    if (!isOpen) {
      const a = audioRef.current;
      if (a) pauseAndReset(a);
    }
  }, [isOpen]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setTime(a.currentTime || 0);
    const onMeta = () => setDuration(a.duration || 0);

    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) safePlay(a);
    else a.pause();
  };

  const onSeek = (e) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const pct = Number(e.target.value) / 100;
    a.currentTime = duration * pct;
  };

  const pct = duration ? Math.min(100, (time / duration) * 100) : 0;

  const rangeStyle = {
    background: `linear-gradient(to right, #2563eb ${pct}%, #e5e7eb ${pct}%)`,
    height: 8,
    borderRadius: 9999,
    appearance: "none",
  };

  return (
    <div ref={wrapperRef} className="rounded-xl border border-slate-200 bg-white/90 shadow-sm p-3">
      <audio ref={audioRef} src={src} preload="auto" playsInline style={{ display: "none" }} />
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className={`h-10 w-10 shrink-0 rounded-full grid place-items-center text-white transition
            ${playing ? "bg-blue-600" : "bg-blue-500 hover:bg-blue-600"}`}
          aria-label={playing ? "Pausar" : "Reproducir"}
        >
          <i className={`bx ${playing ? "bx-pause" : "bx-play"} text-xl`} />
        </button>

        <div className="flex-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="tabular-nums">{fmt(time)}</span>
            <span className="tabular-nums">{fmt(duration)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={pct}
            onChange={onSeek}
            onInput={onSeek}
            className="w-full outline-none accent-blue-600"
            style={rangeStyle}
            aria-label="Progreso"
          />
        </div>
      </div>
    </div>
  );
}




/* ===================== Renderizadores de contenido (Preview) ===================== */
function PreviewContent({ tipo, texto, ruta, rutaRaw, replyRef, replyAuthor, isOpen }) {
  // Document meta (si aplica)
  const parseDocMeta = (raw) => {
    try { return JSON.parse(raw); }
    catch { return { ruta: raw, nombre: "Documento", size: 0, mimeType: "" }; }
  };

  /* === Ubicación con Google Maps Embed V1, como en ChatPrincipal.jsx === */
  const renderLocation = () => {
    try {
      const json = JSON.parse(texto || "{}");
      let { latitude, longitude, longitud } = json;
      if (longitude === undefined && longitud !== undefined) {
        longitude = longitud;
      }
      if (latitude === undefined || longitude === undefined) {
        return <div className="text-[13px] text-slate-600">No se pudo leer la ubicación.</div>;
      }

      const src = `https://www.google.com/maps/embed/v1/place?key=AIzaSyDGulcdBtz_Mydtmu432GtzJz82J_yb-rs&q=${latitude},${longitude}&zoom=15`;
      const link = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

      return (
        <div className="w-full">
          <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
            <iframe
              title="Mapa de ubicación"
              width="100%"
              height="220"
              frameBorder="0"
              style={{ border: 0 }}
              src={src}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-blue-700 hover:underline"
          >
            <i className="bx bx-map-pin" /> Ver ubicación en Google Maps
          </a>
        </div>
      );
    } catch (error) {
      console.error("Error al parsear la ubicación:", error);
      return <div className="text-[13px] text-slate-600">Error al mostrar la ubicación.</div>;
    }
  };

  // Cita (si existe)
  const Quote = () => (replyRef ? (
    <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white/90">
      <div className="flex">
        <div className="w-1.5 bg-slate-300/70" />
        <div className="flex-1 p-3">
          <div className="mb-1 text-[11px] font-semibold text-slate-600">
            <i className="bx bx-reply text-[14px] align-[-1px]" /> Respondiendo a {replyAuthor || "mensaje"}
          </div>
          <div className="whitespace-pre-wrap break-words text-[13px] text-slate-700 line-clamp-6">
            {replyRef}
          </div>
        </div>
      </div>
    </div>
  ) : null);

  /* === AUDIO: usa CustomAudioPlayer como en ChatPrincipal.jsx === */
  // dentro de PreviewContent(...)
  if (tipo === "audio") {
    const src = rutaRaw || ruta;
    return (
      <div>
        <Quote />
        {/* Reproductor de preview con autoplay visible */}
        <PreviewAudioPlayer src={src} autoTrigger={Date.now()} isOpen={isOpen} />
      </div>
    );
  }



  /* === IMAGEN (foto/sticker): mostrar la imagen directamente === */
  if (tipo === "image" || tipo === "sticker") {
    const src = ruta;
    return (
      <div>
        <Quote />
        <img src={src} alt="Imagen" className="max-w-[480px] w-full h-auto rounded-xl border border-slate-200 shadow-sm" />
      </div>
    );
  }

  /* === VIDEO === */
  if (tipo === "video") {
    const src = ruta;
    return (
      <div>
        <Quote />
        <video controls className="w-full max-w-[480px] rounded-xl border border-slate-200 shadow-sm" src={src} />
      </div>
    );
  }

  /* === DOCUMENTO === */
  if (tipo === "document") {
    const meta = parseDocMeta(ruta);
    const href = /^https?:\/\//.test(meta.ruta) ? meta.ruta : `https://new.imporsuitpro.com/${meta.ruta || ""}`;
    const sizeLabel = meta.size ? (meta.size > 1024 * 1024 ? `${(meta.size/1024/1024).toFixed(2)} MB` : `${(meta.size/1024).toFixed(0)} KB`) : "";
    const ext = (meta.ruta?.split(".").pop() || meta.mimeType?.split("/").pop() || "").toUpperCase();
    return (
      <div>
        <Quote />
        <a className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white/80 shadow-sm hover:bg-slate-50 transition" href={href} target="_blank" rel="noreferrer">
          <i className="bx bxs-file-blank text-2xl text-slate-600" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-slate-800">{meta.nombre || "Documento"}</div>
            <div className="text-[12px] text-slate-500">{[sizeLabel, ext].filter(Boolean).join(" • ")}</div>
          </div>
          <i className="bx bx-download text-xl text-blue-600" />
        </a>
      </div>
    );
  }

  /* === UBICACIÓN === */
  if (tipo === "location") {
    return (
      <div>
        <Quote />
        {renderLocation()}
      </div>
    );
  }

  /* === TEXTO / TEMPLATE === */
  return (
    <div>
      <Quote />
      <div className="whitespace-pre-wrap break-words text-[15px] leading-[1.7] tracking-[0.005em] text-slate-800">
        {texto}
      </div>
    </div>
  );
}

/* ===================== Preview en Portal con cierre robusto ===================== */
function HoverPreviewPortal({
  anchorRef,
  open,
  onForceClose,
  tipo,
  texto,
  ruta,
  rutaRaw,
  isTemplate,
  replyRef,
  replyAuthor
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, side: "right" });
  const [shown, setShown] = useState(false);
  const [width, setWidth] = useState(360);
  const containerRef = useRef(null);
  const insideRef = useRef(false);
  const leaveTimer = useRef(null);

  // Tema
  const theme = {
    shellGrad: "from-slate-900/5 via-slate-300/10 to-white",
    innerBg: "bg-gradient-to-b from-slate-50 to-white",
    ring: "ring-1 ring-slate-900/5",
    border: "border border-slate-200/80",
    shadow: "shadow-[0_12px_28px_-16px_rgba(2,6,23,0.38)]",
    headerBg: "bg-slate-100/80",
    headerText: "text-slate-700",
  };

  // Medición de ancho (texto) con Canvas
  const measureTextWidth = (txt) => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.font = "15px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial";
      return Math.ceil(ctx.measureText(String(txt || "")).width);
    } catch { return 360; }
  };

  const computeWidth = () => {
    const vw = window.innerWidth;
    const max = Math.min(760, Math.floor(vw * 0.58));
    const min = 220;

    // Ancho base por tipo
    if (["audio"].includes(tipo)) return Math.max(min, Math.min(max, 420));
    if (["video", "image", "sticker"].includes(tipo)) return Math.max(min, Math.min(max, 480));
    if (["document", "location"].includes(tipo)) return Math.max(min, Math.min(max, 440));

    // Texto/Template
    const lines = String(texto || "").split(/\r?\n/);
    const longest = lines.reduce((m, l) => Math.max(m, measureTextWidth(l)), 0);
    return Math.max(min, Math.min(max, longest + 40)); // + padding
  };

  // Posición + ancho
  useEffect(() => {
    if (!open || !anchorRef?.current) return;
    const update = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const margin = 16;
      const w = computeWidth();
      setWidth(w);

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let side = "right";
      let left = rect.right + margin;
      if (vw - rect.right - margin < w) {
        side = "left";
        left = Math.max(margin, rect.left - w - margin);
      }
      const top = Math.max(margin, Math.min(vh - margin, rect.top));
      setPos({ top, left, side });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorRef, texto, ruta, tipo, isTemplate, replyRef]);

  // Animación
  useEffect(() => {
    if (open) requestAnimationFrame(() => setShown(true));
    else setShown(false);
  }, [open]);

  // === AUTOPLAY AUDIO EN PREVIEW ===
  // === AUTOPLAY AUDIO EN PREVIEW (robusto, en cada apertura) ===
  useEffect(() => {
    if (!open || tipo !== "audio") return;

    let poll = null;
    let retry = null;

    const root = containerRef.current;
    if (!root) return;

    const tryPlayNow = (audio) => {
      if (!audio) return;
      // estado inicial “clean” en cada apertura
      try { audio.pause(); } catch {}
      try { audio.currentTime = 0; } catch {}
      try { audio.muted = false; } catch {}
      audio.autoplay = true;

      const doPlay = () => {
        const p = audio.play?.();
        if (p && typeof p.catch === "function") {
          p.catch(() => {
            // Fallback: primer interacción dentro del preview
            const unlock = () => {
              audio.play().finally(() => {
                root.removeEventListener("pointerdown", unlock, true);
                root.removeEventListener("pointerenter", unlock, true);
              });
            };
            root.addEventListener("pointerdown", unlock, true);
            root.addEventListener("pointerenter", unlock, true);
          });
        }
      };

      if (audio.readyState >= 2) {
        // ya tenemos metadata/buffer suficiente
        doPlay();
      } else {
        // forzamos carga y esperamos canplay
        const onCanPlay = () => {
          audio.removeEventListener("canplay", onCanPlay);
          doPlay();
        };
        audio.addEventListener("canplay", onCanPlay, { once: true });
        try { audio.load(); } catch {}
        // segundo intento por si el evento no llega a tiempo
        retry = setTimeout(doPlay, 300);
      }
    };

    // Espera activa breve hasta que React pinte el <audio data-preview-autoplay>
    let tries = 0;
    poll = setInterval(() => {
      tries += 1;
      const audio = root.querySelector('audio[data-preview-autoplay]');
      if (audio || tries > 20) {
        clearInterval(poll);
        poll = null;
        if (audio) tryPlayNow(audio);
      }
    }, 50);

    // Cleanup: siempre detener y limpiar
    return () => {
      if (poll) clearInterval(poll);
      if (retry) clearTimeout(retry);
      const audio = root.querySelector('audio[data-preview-autoplay]');
      if (audio) {
        try { audio.pause(); } catch {}
        try { audio.currentTime = 0; } catch {}
      }
      root.removeEventListener("pointerdown", () => {}, true);
      root.removeEventListener("pointerenter", () => {}, true);
    };
  }, [open, tipo]);


  // Cierres robustos
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => e.key === "Escape" && onForceClose?.();
    const onDown = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target) && !anchorRef?.current?.contains(e.target)) onForceClose?.();
    };
    const onWheel = () => onForceClose?.();

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("wheel", onWheel);
    };
  }, [open, onForceClose, anchorRef]);

  // Grace period
  const scheduleMaybeClose = () => {
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      if (!insideRef.current) onForceClose?.();
    }, 120);
  };

  if (!open) return null;

  const bubble = (
    <div
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999, width }}
      ref={containerRef}
      onPointerEnter={() => { insideRef.current = true; clearTimeout(leaveTimer.current); }}
      onPointerLeave={() => { insideRef.current = false; scheduleMaybeClose(); }}
    >
      <div className={`p-[1px] rounded-[20px] bg-gradient-to-br ${theme.shellGrad} ${theme.shadow}`}>
        <div className={`relative rounded-[18px] ${theme.innerBg} ${theme.ring} ${theme.border} overflow-visible`}>
          <div
            className={[
              "max-h-[76vh] overflow-auto rounded-[18px]",
              "transition-all duration-200 ease-[cubic-bezier(.2,.8,.2,1)] will-change-[opacity,transform]",
              shown ? "opacity-100 translate-y-0 scale-[1]" : "opacity-0 translate-y-1 scale-[0.99]"
            ].join(" ")}
          >
            <div className={`sticky top-0 z-[1] ${theme.headerBg} ${theme.headerText} border-b border-slate-200 rounded-t-[18px] px-5 py-2.5 text-[12px] font-semibold tracking-[0.06em]`}>
              VISTA PREVIA:
            </div>
            <div className="px-5 py-4">
              <PreviewContent
                tipo={tipo}
                texto={texto}
                ruta={ruta}
                rutaRaw={rutaRaw}
                replyRef={replyRef}
                replyAuthor={replyAuthor}
                isOpen={open}
              />
              <div className="mt-3 text-[11px] text-slate-500">Vista previa generada desde el último mensaje.</div>
            </div>
          </div>

          {/* Cola */}
          {pos.side === "right" ? (
            <div className="absolute top-8 -left-3 h-3.5 w-3.5 bg-gradient-to-b from-slate-100 to-white shadow-[0_2px_6px_rgba(2,6,23,0.12)]" style={{ clipPath: "polygon(0% 50%, 100% 0%, 100% 100%)" }} />
          ) : (
            <div className="absolute top-8 -right-3 h-3.5 w-3.5 bg-gradient-to-b from-slate-100 to-white shadow-[0_2px_6px_rgba(2,6,23,0.12)]" style={{ clipPath: "polygon(0% 0%, 0% 100%, 100% 50%)" }} />
          )}
        </div>
      </div>
    </div>
  );

  const container = typeof document !== "undefined" ? document.body : null;
  return container ? ReactDOM.createPortal(bubble, container) : null;
}

/* ===================== Item de mensaje ===================== */
function MessageItem({
  mensaje,
  chatTemporales = 90,
  estado_guia,
  color,
  acortarTexto,
  formatNombreCliente,
  getIdLabel,
  formatFecha,
  onClick,
  seleccionado = false
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const liRef = useRef(null);
  const [imgError, setImgError] = useState(false);

  // Eventos hover determinísticos
  const handleEnter = () => setPreviewOpen(true);
  const handleLeave = () => setPreviewOpen(false);

  const nombre = acortarTexto(formatNombreCliente(mensaje?.nombre_cliente ?? ""), 10, 25);
  const numero = getIdLabel(mensaje);
  const tienePendientes = (mensaje?.mensajes_pendientes ?? 0) > 0;

  // === Tipo real (con heurística adicional) ===
  const tipoDetectado = inferirTipoContenido(mensaje);
  const isTemplate = tipoDetectado === "template";

  // Texto para preview (si es location necesitamos el JSON crudo)
  const textoPlano = mensaje?.texto_mensaje || "";
  const textoPreview =
    tipoDetectado === "location"
      ? textoPlano // el iframe necesita el JSON
      : isTemplate
      ? expandirTemplate(textoPlano, mensaje?.ruta_archivo, 20000)
      : textoPlano;

  const previewCorto = expandirTemplate(
    tipoDetectado === "location" ? "[Ubicación]" : textoPreview,
    mensaje?.ruta_archivo,
    chatTemporales
  );

  // Ruta normalizada para media
  const rawRuta = mensaje?.ruta_archivo || "";
  const rutaMedia = (() => {
    if (!rawRuta) return "";
    if (tipoDetectado === "document") return rawRuta; // puede ser JSON
    return /^https?:\/\//.test(rawRuta) ? rawRuta : `https://new.imporsuitpro.com/${rawRuta}`;
  })();

  const fallbackAvatar = "https://tiendas.imporsuitpro.com/imgs/react/user.png";
  const avatarUrl = !imgError && mensaje?.profile_pic_url ? mensaje.profile_pic_url : fallbackAvatar;

  const own = esMensajePropio(mensaje);
  const { ref: replyRef, autor: replyAuthor } = extraerRespuesta(mensaje);

  return (
    <li
      ref={liRef}
      className={[
        "group relative cursor-pointer px-3 py-3 sm:px-4 sm:py-3.5",
        "transition-all duration-150 ease-out",
        seleccionado ? "bg-slate-50 cursor-default" : "hover:bg-slate-50 hover:shadow-xs"
      ].join(" ")}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={() => { if (!seleccionado && typeof onClick === "function") onClick(); }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-slate-900/0 transition-all duration-150 group-hover:ring-4 group-hover:ring-slate-900/5" />

      {/* Preview lateral */}
      <HoverPreviewPortal
        anchorRef={liRef}
        open={previewOpen}
        onForceClose={() => setPreviewOpen(false)}
        tipo={tipoDetectado}
        texto={textoPreview}
        ruta={rutaMedia}
        rutaRaw={rawRuta}  /* pasa ruta cruda para CustomAudioPlayer */
        isTemplate={isTemplate}
        replyRef={replyRef}
        replyAuthor={replyAuthor || (!own ? nombre : "Tú")}
      />

      <div className="grid grid-cols-[3rem_1fr_auto] grid-rows-[auto_auto] items-center gap-x-3 gap-y-2.5">
        {/* Avatar premium (sin badge de canal) */}
        <div className="relative col-[1] row-span-2 h-12 w-12 shrink-0">
          <div className={["h-12 w-12 overflow-hidden rounded-full ring-2 transition-all duration-150", tienePendientes ? "ring-blue-500" : "ring-slate-200", "group-hover:ring-slate-300 shadow-sm"].join(" ")}>
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" loading="lazy" onError={() => setImgError(true)} />
            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-transparent to-white/20" />
          </div>
        </div>

        {/* Nombre + Número */}
        <div className="col-[2] row-[1] min-w-0 flex items-end gap-2 leading-[1.2]">
          <span className="truncate text-[13.5px] font-semibold text-slate-900">{nombre}</span>
          <span className="select-none text-slate-300">•</span>
          <span className="min-w-0 truncate text-[12px] text-slate-500 tabular-nums" title={numero}>{numero}</span>
        </div>

        {/* Pill estado */}
        <div className="col-[3] row-[1] flex justify-end">
          <PillEstado texto={estado_guia} colorClass={color} />
        </div>

        {/* Fecha + contador */}
        <div className="col-[3] row-[2] mt-0.5 flex items-center justify-end gap-2">
          <span className="text-[11px] text-slate-500 leading-[1.2]">{formatFecha(mensaje?.mensaje_created_at)}</span>
          {tienePendientes && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold text-white">
              {mensaje.mensajes_pendientes}
            </span>
          )}
        </div>

        {/* Canal + Preview breve */}
        <div className="col-[2/4] row-[2] min-w-0 flex items-center gap-2 pt-0.5 text-[12.5px] text-slate-700 leading-[1.45]">
          <PillCanal source={mensaje?.source} />
          <span className="truncate" title={tipoDetectado === "location" ? "Ubicación" : textoPreview}>
            {tipoDetectado === "audio"
              ? "🎧 Audio"
              : tipoDetectado === "image"
              ? "🖼️ Imagen"
              : tipoDetectado === "location"
              ? "📍 Ubicación"
              : previewCorto}
          </span>
        </div>
      </div>
    </li>
  );
}

/* ===================== Sidebar ===================== */
export const Sidebar = ({
  setSearchTerm,
  setNumeroModal,
  openNumeroModal,
  handleSelectChat,
  acortarTexto,
  filteredChats,
  searchTerm,
  selectedChat,
  chatTemporales,
  formatFecha,
  setFiltro_chats,
  filtro_chats,
  handleFiltro_chats,
  setSearchTermEtiqueta,
  searchTermEtiqueta,
  etiquetas_api,
  selectedEtiquetas,
  setSelectedEtiquetas,
  handleChange,
  etiquetasOptions,
  selectedEstado,
  setSelectedEstado,
  selectedTransportadora,
  setSelectedTransportadora,
  setSelectedNovedad,
  selectedNovedad,
  Loading,
  validar_estadoLaar,
  validar_estadoServi,
  validar_estadoGintracom,
  validar_estadoSpeed,
  selectedTab,
  setSelectedTab,
  mensajesAcumulados,
  mensajesVisibles,
  setMensajesVisibles,
  scrollRef,
  handleScrollMensajes,
  id_plataforma_conf,
  setSelectedPedidos_confirmados,
  selectedPedidos_confirmados,
  isLoadingWA = false,
  isLoadingMS = false,
  isLoadingIG = false,
}) => {
  // react-select styles
  const selectStyles = useMemo(
    () => ({
      control: (base, state) => ({
        ...base,
        borderRadius: 12,
        borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
        boxShadow: state.isFocused ? "0 0 0 4px rgba(37,99,235,.15)" : "none",
        minHeight: 44,
        ":hover": { borderColor: state.isFocused ? "#2563eb" : "#cbd5e1" },
        transition: "all .15s ease-out",
      }),
      menu: (base) => ({ ...base, borderRadius: 12, overflow: "hidden" }),
      option: (base, { isFocused, isSelected }) => ({
        ...base,
        backgroundColor: isSelected ? "#2563eb" : isFocused ? "#eff6ff" : undefined,
        color: isSelected ? "#fff" : "#0f172a",
      }),
      multiValue: (base) => ({ ...base, borderRadius: 9999, backgroundColor: "#eef2ff" }),
      multiValueLabel: (base) => ({ ...base, color: "#1e293b", fontWeight: 600 }),
      multiValueRemove: (base) => ({ ...base, ":hover": { backgroundColor: "#dbeafe", color: "#0f172a" } }),
      placeholder: (base) => ({ ...base, color: "#64748b" }),
      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    }),
    []
  );

  const FilterChip = ({ label, onClear }) => (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
      title="Quitar filtro"
    >
      <i className="bx bx-filter-alt text-sm" />
      {label}
      <i className="bx bx-x text-base" />
    </button>
  );

  // Estado guía unificado
  const obtenerEstadoGuia = (transporte, estadoFactura, novedadInfo) => {
    let estado_guia = { color: "", estado_guia: "" };
    switch (transporte) {
      case "LAAR": estado_guia = validar_estadoLaar(estadoFactura); break;
      case "SERVIENTREGA": estado_guia = validar_estadoServi(estadoFactura); break;
      case "GINTRACOM": estado_guia = validar_estadoGintracom(estadoFactura); break;
      case "SPEED": estado_guia = validar_estadoSpeed(estadoFactura); break;
      default: estado_guia = { color: "", estado_guia: "" }; break;
    }
    if (estado_guia.estado_guia === "Novedad") {
      try {
        const parsed = typeof novedadInfo === "string" ? JSON.parse(novedadInfo) : novedadInfo;
        if (parsed?.terminado === 1 || parsed?.solucionada === 1) {
          estado_guia = { estado_guia: "Novedad resuelta", color: "bg-yellow-500" };
        }
      } catch { /* noop */ }
    }
    return estado_guia;
  };

  // Pintado diferido
  const [channelFilter, setChannelFilter] = useState("all");
  const [allowPaint, setAllowPaint] = useState(false);
  const hasPaintedRef = useRef(false);

  useEffect(() => {
    if (!hasPaintedRef.current && !isLoadingWA && !isLoadingMS && !isLoadingIG) {
      hasPaintedRef.current = true;
      setAllowPaint(true);
    }
  }, [isLoadingWA, isLoadingMS, isLoadingIG]);

  useEffect(() => {
    if (hasPaintedRef.current) return;
    const t = setTimeout(() => setAllowPaint(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Ordenar chats
  const compareChats = (a, b) => {
    const ta = new Date(a.mensaje_created_at).getTime() || 0;
    const tb = new Date(b.mensaje_created_at).getTime() || 0;
    if (tb !== ta) return tb - ta;
    return (b.id ?? 0) - (a.id ?? 0);
  };

  const matchesFilter = (c, key) => getChannelKey(c?.source) === key;

  return (
    <aside
      ref={scrollRef}
      onScroll={handleScrollMensajes}
      className={`h-[calc(100vh_-_130px)] overflow-y-auto overflow-x-hidden ${selectedChat ? "hidden sm:block" : "block"}`}
    >
      <div className="ml-3 mr-0 my-3 rounded-2xl border border-slate-200 bg-white shadow-sm min-h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="inline-flex w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-1">
              <button className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${selectedTab === "abierto" ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-700"}`} onClick={() => setSelectedTab("abierto")}>
                <i className="bx bx-download mr-2 align-[-2px]" /> ABIERTO
              </button>
              <button className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${selectedTab === "resueltos" ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-700"}`} onClick={() => setSelectedTab("resueltos")}>
                <i className="bx bx-check mr-2 align-[-2px]" /> RESUELTOS
              </button>
            </div>
          </div>

          {/* Búsqueda + acciones */}
          <div className="px-4 py-3 space-y-3">
            <div className="relative w-full">
              <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o número de teléfono.."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar chats"
              />
              {searchTerm?.length > 0 && (
                <button type="button" onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Limpiar búsqueda">
                  <i className="bx bx-x text-lg" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full">
              <details className="relative ml-auto shrink-0">
                <summary className="list-none inline-flex w-[199px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer select-none" title="Filtrar por canal" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    if (channelFilter === "wa") return <i className="bx bxl-whatsapp text-lg text-green-600 shrink-0" />;
                    if (channelFilter === "ms") return <i className="bx bxl-messenger text-lg text-blue-600 shrink-0" />;
                    if (channelFilter === "ig") return <i className="bx bxl-instagram text-lg text-pink-500 shrink-0" />;
                    return <i className="bx bx-layout text-lg text-slate-600 shrink-0" />;
                  })()}
                  <span className="flex-1 min-w-0 whitespace-nowrap truncate">
                    <span className="font-bold">
                      {channelFilter === "wa" ? "WhatsApp" : channelFilter === "ms" ? "Messenger" : channelFilter === "ig" ? "Instagram" : "Todos los canales"}
                    </span>
                  </span>
                  <i className="bx bx-chevron-down text-lg ml-1 shrink-0" />
                </summary>

                <div className="absolute right-0 mt-2 w-[199px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 z-30">
                  <button className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${channelFilter === "all" ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50"}`} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setChannelFilter("all"); const d = e.currentTarget.closest("details"); if (d) d.open = false; }}>
                    <i className="bx bx-layout text-base text-slate-500" /> Todos los canales
                  </button>
                  <button className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${channelFilter === "wa" ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50"}`} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setChannelFilter("wa"); const d = e.currentTarget.closest("details"); if (d) d.open = false; }}>
                    <i className="bx bxl-whatsapp text-base text-green-600" /> WhatsApp
                  </button>
                  <button className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${channelFilter === "ms" ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50"}`} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setChannelFilter("ms"); const d = e.currentTarget.closest("details"); if (d) d.open = false; }}>
                    <i className="bx bxl-messenger text-base text-blue-600" /> Messenger
                  </button>
                  <button className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-sm ${channelFilter === "ig" ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50"}`} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setChannelFilter("ig"); const d = e.currentTarget.closest("details"); if (d) d.open = false; }}>
                    <span className="inline-flex items-center gap-2"><i className="bx bxl-instagram text-base text-pink-500" /> Instagram</span>
                  </button>
                </div>
              </details>

              <button onClick={(e) => { e.stopPropagation(); handleFiltro_chats(); }} aria-pressed={!!filtro_chats} className={`relative inline-flex h-11 items-center rounded-xl border px-3 text-slate-700 shadow-sm transition ${filtro_chats ? "border-blue-200 bg-blue-50 hover:bg-blue-100" : "border-slate-200 bg-white hover:bg-slate-50"}`} title="Mostrar filtros" aria-controls="sidebar-filtros">
                <i className="bx bx-filter-alt text-xl" />
                <span className="ml-2 hidden text-sm md:inline font-bold">Filtros</span>
              </button>

              <button onClick={() => (typeof openNumeroModal === "function" ? openNumeroModal() : setNumeroModal(true))} className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900" title="Nuevo chat" aria-label="Nuevo chat">
                <i className="bx bx-plus text-xl" />
              </button>
            </div>
          </div>

          {/* Panel de filtros */}
          <div id="sidebar-filtros" className={`grid gap-3 px-4 pb-4 transition-all duration-300 ${filtro_chats ? "max-h-[600px] opacity-100" : "max-h-0 overflow-hidden opacity-0"}`}>
            {id_plataforma_conf !== null && (
              <Select
                isClearable
                options={[{ value: "1", label: "Pedidos confirmados" }, { value: "0", label: "Pedidos no confirmados" }]}
                value={selectedPedidos_confirmados}
                onChange={(opt) => setSelectedPedidos_confirmados(opt)}
                placeholder="Seleccione pedidos confirmados"
                className="w-full"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                styles={selectStyles}
              />
            )}

            <Select
              isMulti
              options={etiquetasOptions}
              value={selectedEtiquetas}
              onChange={handleChange}
              placeholder="Selecciona etiquetas"
              className="w-full"
              classNamePrefix="react-select"
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
              styles={selectStyles}
            />

            {id_plataforma_conf !== null && (
              <Select
                isClearable
                options={[{ value: "gestionadas", label: "Gestionadas" }, { value: "no_gestionadas", label: "No gestionadas" }]}
                value={selectedNovedad}
                onChange={(opt) => setSelectedNovedad(opt)}
                placeholder="Selecciona novedad"
                className="w-full"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                styles={selectStyles}
              />
            )}

            {id_plataforma_conf !== null && (
              <Select
                isClearable
                options={[{ value: "LAAR", label: "Laar" }, { value: "SPEED", label: "Speed" }, { value: "SERVIENTREGA", label: "Servientrega" }, { value: "GINTRACOM", label: "Gintracom" }]}
                value={selectedTransportadora}
                onChange={(opt) => { setSelectedTransportadora(opt); if (!opt) setSelectedEstado([]); }}
                placeholder="Selecciona transportadora"
                className="w-full"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                styles={selectStyles}
              />
            )}

            {selectedTransportadora && (
              <Select
                isClearable
                options={[
                  { value: "Generada", label: "Generada / Por recolectar" },
                  { value: "En transito", label: "En tránsito / Procesamiento / En ruta" },
                  { value: "Entregada", label: "Entregada" },
                  { value: "Novedad", label: "Novedad" },
                  { value: "Devolucion", label: "Devolución" },
                ]}
                value={selectedEstado}
                onChange={(opt) => setSelectedEstado(opt)}
                placeholder="Selecciona estado"
                className="w-full"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                styles={selectStyles}
              />
            )}

            {/* Chips activos */}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {Array.isArray(selectedEtiquetas) && selectedEtiquetas.length > 0 && selectedEtiquetas.map((e) => (
                <FilterChip key={e.value} label={`Etiqueta: ${e.label}`} onClear={() => { const next = selectedEtiquetas.filter((x) => x.value !== e.value); setSelectedEtiquetas(next); }} />
              ))}
              {selectedNovedad && (<FilterChip label={`Novedad: ${selectedNovedad.label}`} onClear={() => setSelectedNovedad(null)} />)}
              {selectedTransportadora && (<FilterChip label={`Transp.: ${selectedTransportadora.label}`} onClear={() => { setSelectedTransportadora(null); setSelectedEstado([]); }} />)}
              {selectedEstado && selectedEstado.label && (<FilterChip label={`Estado: ${selectedEstado.label}`} onClear={() => setSelectedEstado(null)} />)}

              {Array.isArray(selectedEtiquetas) &&
                selectedEtiquetas.length + (selectedNovedad ? 1 : 0) + (selectedTransportadora ? 1 : 0) + (selectedEstado ? 1 : 0) > 0 && (
                <button type="button" onClick={() => { setSelectedEtiquetas([]); setSelectedNovedad(null); setSelectedTransportadora(null); setSelectedEstado([]); }} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
                  Limpiar filtros <i className="bx bx-eraser" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de chats */}
        <ul className="divide-y divide-slate-100 flex-1">
          {(() => {
            if (!allowPaint) {
              return (
                <div className="flex h-64 items-center justify-center gap-2 text-slate-500">
                  <i className="bx bx-loader-alt animate-spin text-xl" />
                  <span className="text-sm">Sincronizando chats…</span>
                </div>
              );
            }
            const base =
              channelFilter === "ms" ? filteredChats.filter((c) => matchesFilter(c, "ms"))
              : channelFilter === "wa" ? filteredChats.filter((c) => matchesFilter(c, "wa"))
              : channelFilter === "ig" ? filteredChats.filter((c) => matchesFilter(c, "ig"))
              : filteredChats;

            const list = [...base].sort(compareChats);

            if (list.length === 0) {
              return mensajesAcumulados.length === 0 ? (
                <div className="flex h-64 items-center justify-center">
                  {Loading ? <Loading /> : <div className="text-slate-500">Cargando…</div>}
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
                  <i className="bx bx-chat text-4xl" />
                  <p className="text-sm">No se encontraron chats con esos filtros.</p>
                </div>
              );
            }

            return list.slice(0, mensajesVisibles).map((mensaje) => {
              const { color, estado_guia } = obtenerEstadoGuia(mensaje.transporte, mensaje.estado_factura, mensaje.novedad_info);
              const seleccionado = selectedChat?.id === mensaje.id;

              return (
                <MessageItem
                  key={mensaje.id}
                  mensaje={mensaje}
                  chatTemporales={chatTemporales}
                  estado_guia={estado_guia}
                  color={color}
                  acortarTexto={acortarTexto}
                  formatNombreCliente={formatNombreCliente}
                  getIdLabel={getIdLabel}
                  formatFecha={formatFecha}
                  onClick={() => handleSelectChat(mensaje)}
                  seleccionado={seleccionado}
                />
              );
            });
          })()}

          {/* Loader de paginación */}
          {mensajesVisibles <
            (channelFilter === "ms"
              ? filteredChats.filter((c) => matchesFilter(c, "ms")).length
              : channelFilter === "wa"
              ? filteredChats.filter((c) => matchesFilter(c, "wa")).length
              : channelFilter === "ig"
              ? filteredChats.filter((c) => matchesFilter(c, "ig")).length
              : filteredChats.length) && (
            <div className="flex justify-center py-4">
              <span className="animate-pulse text-sm text-slate-500">Cargando más chats…</span>
            </div>
          )}
        </ul>
      </div>
    </aside>
  );
};
