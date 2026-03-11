import React, { useState, useEffect } from "react";

// Descarga forzada via blob
const forceDownload = async (url, fileName) => {
  try {
    const response = await fetch(url, { mode: "cors" });
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName || `landing-ia-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || `landing-ia-${Date.now()}.png`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

const ResultCard = ({
  result,
  index,
  onPreview,
  onEdit,
  onDownload,
  isRegenerating,
  visible,
}) => {
  const [settled, setSettled] = useState(visible);
  const [showShine, setShowShine] = useState(false);

  useEffect(() => {
    if (visible && !settled) {
      setSettled(true);
      setShowShine(true);
      const t = setTimeout(() => setShowShine(false), 1200);
      return () => clearTimeout(t);
    }
  }, [visible, settled]);

  useEffect(() => {
    if (visible) {
      setShowShine(true);
      const t = setTimeout(() => setShowShine(false), 1200);
      return () => clearTimeout(t);
    }
  }, [result.image_url, result.image_base64]);

  if (!result.success) {
    return (
      <div className="group relative rounded-2xl border border-rose-200/60 bg-gradient-to-br from-rose-50 to-white overflow-hidden rc-fadeIn">
        <div className="p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 grid place-items-center shrink-0">
            <i className="bx bx-error-circle text-rose-500 text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-md bg-rose-500 text-white text-[9px] font-bold grid place-items-center">
                {index + 1}
              </span>
              <p className="text-xs font-bold text-rose-700 truncate">
                {result.etapa.nombre}
              </p>
            </div>
            <p className="text-[11px] text-rose-500 leading-relaxed">
              {result.error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!visible) return null;

  const imgSrc =
    result.image_url || `data:image/png;base64,${result.image_base64}`;

  const fileName = `landing-ia-${result.etapa?.nombre?.replace(/\s+/g, "-").toLowerCase() || "seccion"}-${Date.now()}.png`;

  const handleDownloadClick = (e) => {
    e.stopPropagation();
    if (result.image_url) {
      forceDownload(result.image_url, fileName);
    } else {
      onDownload(imgSrc);
    }
  };

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden bg-white border transition-all duration-500 rc-appear
        ${
          isRegenerating
            ? "border-blue-300 shadow-lg shadow-blue-500/10"
            : "border-gray-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5"
        }`}
    >
      {/* Section badge */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md border border-white/10">
        <span className="w-4 h-4 rounded-md bg-white text-[9px] font-black text-indigo-700 grid place-items-center">
          {index + 1}
        </span>
        <span className="text-[10px] font-bold text-white/90 max-w-[120px] truncate">
          {result.etapa.nombre}
        </span>
      </div>

      {/* ───── REGENERATING OVERLAY ───── */}
      {isRegenerating && (
        <div className="absolute inset-0 z-30 bg-gradient-to-br from-indigo-900/80 via-blue-900/70 to-cyan-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-blue-400/30 animate-ping" />
            <div
              className="absolute inset-0 w-20 h-20 rounded-full border-4 border-cyan-400/20 animate-ping"
              style={{ animationDelay: "0.5s" }}
            />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-500 grid place-items-center shadow-2xl shadow-cyan-500/40">
              <svg
                className="animate-spin w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            </div>
          </div>
          <div className="text-center px-4">
            <p className="text-base font-black text-white mb-1">
              Regenerando sección
            </p>
            <p className="text-sm text-cyan-200 font-semibold">
              {result.etapa.nombre}
            </p>
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {[0, 150, 300].map((delay) => (
                <div
                  key={delay}
                  className="w-2 h-2 rounded-full bg-cyan-300 animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="rc-scan-line" />
          </div>
        </div>
      )}

      {/* ───── IMAGE ───── */}
      <div
        className="relative overflow-hidden bg-gray-50 cursor-pointer"
        onClick={() => !isRegenerating && onPreview(result)}
      >
        <img
          src={imgSrc}
          alt={result.etapa.nombre}
          className={`w-full object-contain transition-all duration-500 ${
            isRegenerating
              ? "blur-sm scale-105 opacity-40"
              : "group-hover:scale-[1.02]"
          }`}
          style={{ maxHeight: "300px" }}
        />

        {showShine && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="rc-shine" />
          </div>
        )}

        {!isRegenerating && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-5">
            <div className="flex items-center gap-2 translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(result);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/95 hover:bg-white text-gray-900 text-[11px] font-bold transition shadow-lg backdrop-blur-sm"
              >
                <i className="bx bx-expand text-indigo-600 text-sm" /> Preview
              </button>
              <button
                onClick={handleDownloadClick}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/95 hover:bg-white text-gray-900 text-[11px] font-bold transition shadow-lg backdrop-blur-sm"
              >
                <i className="bx bx-download text-emerald-600 text-sm" />{" "}
                Descargar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ───── BOTTOM BAR ───── */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-gray-50 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-1.5 h-1.5 rounded-full ${isRegenerating ? "bg-blue-400 animate-pulse" : "bg-emerald-400"}`}
          />
          <span
            className={`text-[11px] font-semibold truncate ${isRegenerating ? "text-blue-500" : "text-gray-500"}`}
          >
            {isRegenerating ? "Regenerando..." : "Generada con éxito"}
          </span>
        </div>
        <button
          onClick={() => !isRegenerating && onEdit(result)}
          disabled={isRegenerating}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition ${
            isRegenerating
              ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
              : "border-gray-200 hover:border-indigo-300 bg-white hover:bg-indigo-50 text-gray-600 hover:text-indigo-700"
          }`}
        >
          <i className="bx bx-edit-alt text-xs" /> Editar
        </button>
      </div>

      <style>{`
        .rc-appear {
          animation: rcAppear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes rcAppear {
          from { opacity: 0; transform: scale(0.85) translateY(15px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .rc-shine {
          position: absolute; top: 0; left: -80%; width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
          animation: rcShine 0.7s ease-in-out forwards;
          transform: skewX(-15deg);
        }
        @keyframes rcShine { from { left: -60%; } to { left: 130%; } }
        .rc-scan-line {
          position: absolute; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, transparent, rgba(56,189,248,0.9), transparent);
          box-shadow: 0 0 20px rgba(56,189,248,0.6), 0 0 40px rgba(99,102,241,0.3);
          animation: rcScan 1.8s ease-in-out infinite;
        }
        @keyframes rcScan { 0% { top: -3px; } 50% { top: 100%; } 100% { top: -3px; } }
        .rc-fadeIn { animation: rcFadeIn 0.4s ease-out forwards; }
        @keyframes rcFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default ResultCard;
