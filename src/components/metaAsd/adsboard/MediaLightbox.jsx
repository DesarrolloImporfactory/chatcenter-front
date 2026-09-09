import React, { useEffect, useState } from "react";
import { fetchVideoInfo } from "./adsMedia";

/**
 * MediaLightbox
 *
 * Vista ampliada de un creativo del lanzador: la imagen completa sin recorte,
 * o el video reproduciéndose. Lo usan el wizard (paso 3 y preview) y la
 * tarjeta de plantilla del tab.
 *
 * item: { tipo: 'imagen'|'video', url, thumb_url, video_id, local_url }
 *  - local_url: ObjectURL del archivo recién subido (solo en la sesión del
 *    wizard); evita pedirle a Meta un video que acabamos de mandar.
 */
const MediaLightbox = ({ item, id_configuracion, titulo, onClose }) => {
  const esVideo = item?.tipo === "video";
  const [src, setSrc] = useState(
    esVideo ? item?.local_url || null : item?.url || null,
  );
  const [cargando, setCargando] = useState(esVideo && !item?.local_url);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!esVideo || item?.local_url || !item?.video_id) return undefined;
    let vivo = true;
    (async () => {
      setCargando(true);
      try {
        const info = await fetchVideoInfo(id_configuracion, item.video_id);
        if (!vivo) return;
        if (info?.source) setSrc(info.source);
        else
          setError(
            info?.status === "processing"
              ? "Meta todavía está procesando este video. Inténtalo en un momento."
              : "Meta no entregó una fuente reproducible para este video.",
          );
      } catch {
        if (vivo) setError("No se pudo cargar el video desde Meta.");
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [esVideo, item, id_configuracion]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white grid place-items-center transition"
        title="Cerrar (Esc)"
      >
        <i className="bx bx-x text-2xl" />
      </button>

      <div
        className="max-w-[min(92vw,900px)] max-h-[90vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {esVideo ? (
          cargando ? (
            <div className="w-[320px] aspect-[9/16] max-h-[70vh] rounded-2xl bg-slate-900 grid place-items-center text-white/70">
              <div className="text-center">
                <i className="bx bx-loader-alt animate-spin text-3xl" />
                <p className="text-[11px] mt-2 font-semibold">
                  Cargando video desde Meta...
                </p>
              </div>
            </div>
          ) : src ? (
            <video
              src={src}
              poster={item.thumb_url || item.url || undefined}
              controls
              autoPlay
              playsInline
              className="max-h-[80vh] max-w-full rounded-2xl bg-black shadow-2xl"
            />
          ) : (
            <div className="w-[320px] rounded-2xl bg-slate-900 px-6 py-10 text-center text-white/80">
              <i className="bx bx-video-off text-4xl" />
              <p className="text-xs mt-3 leading-relaxed">{error}</p>
            </div>
          )
        ) : (
          <img
            src={src}
            alt={titulo || "Creativo"}
            className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl bg-slate-900"
          />
        )}
        {titulo && (
          <p className="text-[11px] font-semibold text-white/70 truncate max-w-full">
            {titulo}
          </p>
        )}
      </div>
    </div>
  );
};

export default MediaLightbox;
