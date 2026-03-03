import React, { useState, useEffect, useCallback } from "react";
import chatApi from "../../../api/chatcenter";

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const HistorialModal = ({ open, onClose, usage }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [preview, setPreview] = useState(null);

  const fetchHistory = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await chatApi.get(`gemini/historial?page=${page}&limit=15`);
      if (res.data?.isSuccess) {
        setHistory(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
      }
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchHistory(1);
  }, [open, fetchHistory]);

  const handleDownload = (url) => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `ia-generacion-${Date.now()}.png`;
    a.click();
  };

  if (!open) return null;

  const pct =
    usage.limit > 0 ? Math.min((usage.used / usage.limit) * 100, 100) : 0;
  const isEmpty = usage.remaining <= 0;
  const isLow = usage.remaining <= 3 && usage.remaining > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={() => {
          onClose();
          setPreview(null);
        }}
      />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200/50">
        {/* ── Header ── */}
        <div className="bg-gradient-to-r bg-[#171931] px-6 py-5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur grid place-items-center">
                <i className="bx bx-history text-xl text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white text-base">
                  Historial de imágenes generadas
                </h2>
                <p className="text-white/60 text-xs mt-0.5">
                  {pagination.total} imagen{pagination.total !== 1 ? "es" : ""}{" "}
                  generada{pagination.total !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                setPreview(null);
              }}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 grid place-items-center text-white transition"
            >
              <i className="bx bx-x text-xl" />
            </button>
          </div>

          {/* Usage bar in header */}
          {usage.limit > 0 && (
            <div className="mt-4 bg-white/10 rounded-xl p-3 backdrop-blur">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                  <i className="bx bx-bar-chart-alt-2 text-sm" />
                  {isEmpty
                    ? "Límite alcanzado"
                    : `${usage.remaining} imagen${usage.remaining !== 1 ? "es" : ""} restante${usage.remaining !== 1 ? "s" : ""}`}
                </span>
                <span className="text-[10px] text-white/60 font-semibold">
                  {usage.used}/{usage.limit} · {usage.plan}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isEmpty
                      ? "bg-rose-400"
                      : isLow
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 grid place-items-center">
                <svg
                  className="animate-spin w-5 h-5 text-indigo-500"
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
              <p className="text-xs text-gray-400 font-medium">
                Cargando historial...
              </p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-20 h-20 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 grid place-items-center">
                <i className="bx bx-image text-3xl text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 font-semibold">
                  Aún no has generado imágenes
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Crea tu primera imagen publicitaria y aparecerá aquí
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Preview */}
              {preview && (
                <div className="mb-5 rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 shadow-sm">
                  <div className="relative">
                    <img
                      src={preview.image_url}
                      alt="Preview"
                      className="w-full object-contain bg-gray-50"
                      style={{ maxHeight: "400px" }}
                    />
                    <button
                      onClick={() => setPreview(null)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-white/90 shadow border border-gray-200 grid place-items-center text-gray-500 hover:text-gray-700 transition"
                    >
                      <i className="bx bx-x text-lg" />
                    </button>
                  </div>
                  <div className="p-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {preview.etapa && (
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-indigo-700">
                          {preview.etapa.nombre}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-[10px] font-semibold text-gray-500">
                        {preview.aspect_ratio}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatDate(preview.created_at)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDownload(preview.image_url)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
                    >
                      <i className="bx bx-download text-sm" />
                      Descargar
                    </button>
                  </div>
                  {preview.description && (
                    <div className="px-4 pb-3">
                      <p className="text-[11px] text-gray-500 italic leading-relaxed">
                        &ldquo;{preview.description}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.image_url && setPreview(item)}
                    className={`group relative rounded-2xl overflow-hidden border-2 transition aspect-square ${
                      preview?.id === item.id
                        ? "border-indigo-500 ring-2 ring-indigo-200"
                        : "border-transparent hover:border-indigo-300"
                    }`}
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={`Gen ${item.id}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <i className="bx bx-image text-2xl text-gray-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                      <div>
                        {item.etapa && (
                          <span className="block text-white text-[8px] font-bold drop-shadow leading-tight">
                            {item.etapa.nombre}
                          </span>
                        )}
                        <span className="text-white/60 text-[8px] drop-shadow">
                          {new Date(item.created_at).toLocaleDateString(
                            "es-EC",
                            { day: "2-digit", month: "short" },
                          )}
                        </span>
                      </div>
                      <span className="text-white/50 text-[8px] drop-shadow">
                        {item.aspect_ratio}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Paginación */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-5 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => fetchHistory(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-30"
                  >
                    <i className="bx bx-chevron-left text-sm" /> Anterior
                  </button>
                  <span className="text-xs text-gray-500 font-semibold">
                    {pagination.page} / {pagination.pages}
                  </span>
                  <button
                    onClick={() => fetchHistory(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-30"
                  >
                    Siguiente <i className="bx bx-chevron-right text-sm" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistorialModal;
