import React, { useState, useMemo } from "react";
import Modal from "react-modal";

const BASE_URL = "https://new.imporsuitpro.com/";

function normalizeUrl(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return BASE_URL + u.replace(/^\/+/, "");
}

function extractUrlFromRuta(ruta_archivo) {
  if (!ruta_archivo) return "";

  // 1) Si ya es string simple (URL o ruta)
  if (typeof ruta_archivo === "string") {
    // ¿viene como JSON? (ej: '[{ "url": "...", ...}]' o '{ "url": "..."}')
    const trimmed = ruta_archivo.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        // array de attachments
        if (Array.isArray(parsed) && parsed.length) {
          return parsed[0]?.url || parsed[0]?.src || parsed[0]?.ruta || "";
        }
        // objeto con url/ruta/src
        if (parsed && typeof parsed === "object") {
          return parsed.url || parsed.src || parsed.ruta || "";
        }
      } catch {
        // si no parsea, lo tratamos como string normal
      }
    }
    return ruta_archivo;
  }

  // 2) Si es objeto
  if (typeof ruta_archivo === "object") {
    // array
    if (Array.isArray(ruta_archivo) && ruta_archivo.length) {
      return (
        ruta_archivo[0]?.url ||
        ruta_archivo[0]?.src ||
        ruta_archivo[0]?.ruta ||
        ""
      );
    }
    // objeto simple
    return ruta_archivo.url || ruta_archivo.src || ruta_archivo.ruta || "";
  }

  return "";
}

const ImageWithModal = ({ mensaje }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [fullError, setFullError] = useState(false);

  // Resuelve la URL de la imagen (venga como venga)
  const rawUrl = useMemo(
    () => extractUrlFromRuta(mensaje?.ruta_archivo),
    [mensaje?.ruta_archivo]
  );

  const imgUrl = useMemo(() => normalizeUrl(rawUrl), [rawUrl]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const fallbackThumb =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='100%' height='100%' fill='#eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#999' font-family='sans-serif' font-size='14'>Imagen no disponible</text></svg>`
    );

  return (
    <div>
      {/* Miniatura de la imagen en el chat */}
      <img
        className="max-w-[330px] max-h-[426px] cursor-pointer hover:opacity-90 transition-opacity duration-200 rounded-lg shadow"
        src={thumbError ? fallbackThumb : imgUrl}
        alt="Imagen en el chat"
        onClick={() => !thumbError && openModal()}
        onError={() => setThumbError(true)}
      />
      {mensaje?.texto_mensaje ? (
        <p className="pt-2">{mensaje.texto_mensaje}</p>
      ) : null}

      {/* Modal para ver la imagen ampliada */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Imagen Ampliada"
        ariaHideApp={false}
        overlayClassName="fixed inset-0 bg-black/75 z-[9998]"
        className="outline-none flex items-center justify-center h-full"
      >
        <div className="relative p-2 max-w-[90vw] max-h-[90vh]">
          {/* Botón cerrar */}
          <button
            className="absolute -top-10 right-0 text-white/90 hover:text-white text-3xl"
            onClick={closeModal}
            aria-label="Cerrar"
            title="Cerrar"
          >
            &times;
          </button>

          {/* Imagen ampliada */}
          <img
            src={fullError ? fallbackThumb : imgUrl}
            alt="Imagen ampliada"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-lg"
            onError={() => setFullError(true)}
            onClick={closeModal}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ImageWithModal;
