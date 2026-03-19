import React, { useEffect } from "react";

// Descarga forzada via blob para evitar que el navegador abra la URL de S3
const forceDownload = async (url, fileName) => {
  try {
    const response = await fetch(url, { mode: "cors", cache: "no-store" });
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    // fallback si falla el fetch (CORS estricto)
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

const ImagePreviewModal = ({ open, onClose, result }) => {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !result) return null;

  const imgSrc =
    result.image_url || `data:image/png;base64,${result.image_base64}`;

  const fileName = `landing-ia-${result.etapa?.nombre?.replace(/\s+/g, "-").toLowerCase() || "seccion"}-${Date.now()}.png`;

  const handleDownload = async () => {
    if (result.image_url) {
      await forceDownload(result.image_url, fileName);
    } else {
      // base64 directo
      const a = document.createElement("a");
      a.href = imgSrc;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Content */}
      <div
        className="relative w-full max-w-5xl mx-4 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="w-full flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 grid place-items-center">
              <i className="bx bx-image text-white text-sm" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {result.etapa?.nombre || "Sección"}
              </p>
              <p className="text-[10px] text-white/50">
                Vista previa · Haz clic fuera para cerrar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-gray-900 text-xs font-bold hover:bg-gray-100 transition shadow-lg"
            >
              <i className="bx bx-download text-sm" /> Descargar
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 grid place-items-center transition"
            >
              <i className="bx bx-x text-white text-lg" />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-gray-900/50 max-h-[75vh]">
          <img
            src={imgSrc}
            alt={result.etapa?.nombre || "Preview"}
            className="max-h-[75vh] w-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
