/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  CAPA SHARED — PreviewContent unificado                    ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Reemplaza las 4 copias IDÉNTICAS de PreviewContent():    ║
 * ║  - src/components/chat/Sidebar.jsx (L381-580)             ║
 * ║  - src/pages/contactos/Estado_contactos_ventas.jsx (L20)  ║
 * ║  - src/pages/contactos/Estado_contactos_imporshop.jsx     ║
 * ║  - src/pages/contactos/Estado_contactos_imporfactory.jsx  ║
 * ║                                                           ║
 * ║  USO DESPUÉS DE MIGRACIÓN:                                ║
 * ║    import PreviewContent from "@shared/ui/PreviewContent"; ║
 * ║    <PreviewContent tipo="image" ruta={url} />             ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import React from "react";

/* ─────── helpers ─────── */

const parseDocMeta = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return { ruta: raw, nombre: "Documento", size: 0, mimeType: "" };
  }
};

const formatSize = (size) => {
  if (!size) return "";
  return size > 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(2)} MB`
    : `${(size / 1024).toFixed(0)} KB`;
};

const getExtension = (meta) =>
  (
    meta.ruta?.split(".").pop() ||
    meta.mimeType?.split("/").pop() ||
    ""
  ).toUpperCase();

/* ─────── Sub-componente Quote ─────── */

function Quote({ replyRef, replyAuthor }) {
  if (!replyRef) return null;
  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white/90">
      <div className="flex">
        <div className="w-1.5 bg-slate-300/70" />
        <div className="flex-1 p-3">
          <div className="mb-1 text-[11px] font-semibold text-slate-600">
            <i className="bx bx-reply text-[14px] align-[-1px]" />{" "}
            Respondiendo a {replyAuthor || "mensaje"}
          </div>
          <div className="whitespace-pre-wrap break-words text-[13px] text-slate-700 line-clamp-6">
            {replyRef}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────── Sub-componente Location ─────── */

function LocationPreview({ texto }) {
  try {
    const json = JSON.parse(texto || "{}");
    let { latitude, longitude, longitud } = json;
    if (longitude === undefined && longitud !== undefined) longitude = longitud;
    if (
      !Number.isFinite(Number(latitude)) ||
      !Number.isFinite(Number(longitude))
    ) {
      return (
        <div className="text-[13px] text-slate-600">
          No se pudo leer la ubicación.
        </div>
      );
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
  } catch {
    return (
      <div className="text-[13px] text-slate-600">
        Error al mostrar la ubicación.
      </div>
    );
  }
}

/* ─────── Componente principal ─────── */

/**
 * Vista previa de contenido multimedia en chats.
 *
 * @param {object}  props
 * @param {string}  props.tipo        - "text"|"image"|"video"|"audio"|"document"|"sticker"|"location"
 * @param {string}  props.texto       - Texto del mensaje
 * @param {string}  props.ruta        - URL procesada del medio
 * @param {string}  props.rutaRaw     - URL cruda del medio (para audio)
 * @param {string}  props.replyRef    - Texto del mensaje al que responde
 * @param {string}  props.replyAuthor - Autor del mensaje al que responde
 * @param {boolean} props.isOpen      - Si el preview está visible
 * @param {React.ComponentType} props.AudioPlayer - Componente de audio a usar
 *
 * NOTA: AudioPlayer se pasa como prop para evitar acoplar este componente
 * a una implementación específica de reproductor (CustomAudioPlayer vs PreviewAudioPlayer)
 */
export default function PreviewContent({
  tipo,
  texto,
  ruta,
  rutaRaw,
  replyRef,
  replyAuthor,
  isOpen,
  AudioPlayer,
}) {
  const quoteProps = { replyRef, replyAuthor };

  // AUDIO
  if (tipo === "audio") {
    const src = rutaRaw || ruta;
    return (
      <div>
        <Quote {...quoteProps} />
        {AudioPlayer ? (
          <AudioPlayer src={src} />
        ) : (
          <audio controls src={src} className="w-full max-w-[480px]" />
        )}
      </div>
    );
  }

  // IMAGEN / STICKER
  if (tipo === "image" || tipo === "sticker") {
    return (
      <div>
        <Quote {...quoteProps} />
        <img
          src={ruta}
          alt="Imagen"
          className="max-w-[480px] w-full h-auto rounded-xl border border-slate-200 shadow-sm"
        />
      </div>
    );
  }

  // VIDEO
  if (tipo === "video") {
    return (
      <div>
        <Quote {...quoteProps} />
        <video
          controls
          className="w-full max-w-[480px] rounded-xl border border-slate-200 shadow-sm"
          src={ruta}
        />
      </div>
    );
  }

  // DOCUMENTO
  if (tipo === "document") {
    const meta = parseDocMeta(ruta);
    const href = /^https?:\/\//.test(meta.ruta)
      ? meta.ruta
      : `https://new.imporsuitpro.com/${meta.ruta || ""}`;

    return (
      <div>
        <Quote {...quoteProps} />
        <a
          className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white/80 shadow-sm hover:bg-slate-50 transition"
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          <i className="bx bxs-file-blank text-2xl text-slate-600" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-slate-800">
              {meta.nombre || "Documento"}
            </div>
            <div className="text-[12px] text-slate-500">
              {[formatSize(meta.size), getExtension(meta)]
                .filter(Boolean)
                .join(" • ")}
            </div>
          </div>
          <i className="bx bx-download text-xl text-blue-600" />
        </a>
      </div>
    );
  }

  // UBICACIÓN
  if (tipo === "location") {
    return (
      <div>
        <Quote {...quoteProps} />
        <LocationPreview texto={texto} />
      </div>
    );
  }

  // TEXTO / TEMPLATE (fallback)
  return (
    <div>
      <Quote {...quoteProps} />
      <div className="whitespace-pre-wrap break-words text-[15px] leading-[1.7] tracking-[0.005em] text-slate-800">
        {texto}
      </div>
    </div>
  );
}
