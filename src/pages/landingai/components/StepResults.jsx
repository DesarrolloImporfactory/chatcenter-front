import React, { useState, useRef, useEffect, useCallback } from "react";
import ResultCard from "./ResultCard";
import ImageReveal3D from "./ImageReveal3D";
import ImagePreviewModal from "./ImagePreviewModal";
import EditPromptModal from "./EditPromptModal";
import UsageBar from "./UsageBar";

const StepResults = ({
  generating,
  genProgress,
  results,
  setResults,
  usage,
  setUsage,
  onReset,
  onRegenerate,
  onRegenerateEtapa,
  regeneratingId,
}) => {
  const [previewResult, setPreviewResult] = useState(null);
  const [editResult, setEditResult] = useState(null);

  // ── Reveal queue system ──
  // Track which result indices have been "revealed" (3D animation shown)
  const [revealedSet, setRevealedSet] = useState(new Set());
  const [currentReveal, setCurrentReveal] = useState(null); // { result, index }
  const revealQueueRef = useRef([]);
  const processingRef = useRef(false);
  const prevResultsLenRef = useRef(0);

  // ── Regen reveal ──
  const [regenReveal, setRegenReveal] = useState(null);
  const prevRegenIdRef = useRef(null);

  // Detect new results and add to reveal queue
  useEffect(() => {
    const prevLen = prevResultsLenRef.current;
    if (results.length > prevLen) {
      for (let i = prevLen; i < results.length; i++) {
        if (results[i].success) {
          revealQueueRef.current.push({ result: results[i], index: i });
        } else {
          // Errors don't get 3D reveal, just mark as revealed
          setRevealedSet((prev) => new Set([...prev, i]));
        }
      }
      prevResultsLenRef.current = results.length;
      processQueue();
    }
    if (results.length < prevLen) {
      // Reset (new generation)
      prevResultsLenRef.current = results.length;
      setRevealedSet(new Set());
      revealQueueRef.current = [];
      setCurrentReveal(null);
      processingRef.current = false;
    }
  }, [results]);

  // Detect regeneration completion -> show 3D reveal for that result
  useEffect(() => {
    if (prevRegenIdRef.current && !regeneratingId) {
      const finishedId = prevRegenIdRef.current;
      // Find the result that was regenerated
      const idx = results.findIndex(
        (r) => r.etapa?.id === finishedId && r.success,
      );
      if (idx >= 0) {
        setRegenReveal({ result: results[idx], index: idx });
      }
    }
    prevRegenIdRef.current = regeneratingId;
  }, [regeneratingId, results]);

  const processQueue = useCallback(() => {
    if (processingRef.current) return;
    if (revealQueueRef.current.length === 0) return;

    processingRef.current = true;
    const next = revealQueueRef.current.shift();
    setCurrentReveal(next);
  }, []);

  const handleRevealComplete = useCallback(() => {
    if (currentReveal) {
      setRevealedSet((prev) => new Set([...prev, currentReveal.index]));
    }
    setCurrentReveal(null);
    processingRef.current = false;

    // Process next in queue
    setTimeout(() => {
      if (revealQueueRef.current.length > 0) {
        processingRef.current = true;
        const next = revealQueueRef.current.shift();
        setCurrentReveal(next);
      }
    }, 300);
  }, [currentReveal]);

  const handleRegenRevealComplete = useCallback(() => {
    setRegenReveal(null);
  }, []);

  const successCount = results.filter((r) => r.success).length;

  const handleDownload = (src) => {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `landing-ia-${Date.now()}.png`;
    a.click();
  };

  const handleDownloadAll = () => {
    results.forEach((r, i) => {
      if (!r.success) return;
      const src = r.image_url || `data:image/png;base64,${r.image_base64}`;
      setTimeout(() => handleDownload(src), i * 400);
    });
  };

  const handleEditRegenerate = (result, promptExtra) => {
    onRegenerateEtapa(result, promptExtra);
    setEditResult(null);
  };

  return (
    <div>
      {/* ───── 3D REVEAL OVERLAY (new generation) ───── */}
      {currentReveal && (
        <ImageReveal3D
          result={currentReveal.result}
          index={currentReveal.index}
          onComplete={handleRevealComplete}
        />
      )}

      {/* ───── 3D REVEAL OVERLAY (regeneration) ───── */}
      {regenReveal && (
        <ImageReveal3D
          result={regenReveal.result}
          index={regenReveal.index}
          onComplete={handleRegenRevealComplete}
        />
      )}

      {/* ───── GENERATING PROGRESS ───── */}
      {generating && (
        <div className="mb-5 rounded-2xl overflow-hidden border border-indigo-100">
          <div className="bg-gradient-to-r from-[#0f1129] to-[#1a1d45] p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 grid place-items-center shadow-xl shadow-indigo-500/30">
                  <svg
                    className="animate-spin w-6 h-6 text-white"
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
                <div className="absolute -inset-1 rounded-3xl border border-indigo-400/20 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-black text-white mb-0.5">
                  Generando sección {genProgress.current} de {genProgress.total}
                </p>
                <p className="text-sm font-semibold text-indigo-300">
                  {genProgress.etapa}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-3xl font-black text-white">
                  {Math.round((genProgress.current / genProgress.total) * 100)}
                  <span className="text-lg text-indigo-300">%</span>
                </span>
              </div>
            </div>

            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 transition-all duration-700 relative overflow-hidden"
                style={{
                  width: `${(genProgress.current / genProgress.total) * 100}%`,
                }}
              >
                <div className="absolute inset-0 sr-shimmer" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-3">
              {Array.from({ length: genProgress.total }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                    i < genProgress.current
                      ? "bg-emerald-400"
                      : i === genProgress.current
                        ? "bg-indigo-400 animate-pulse"
                        : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───── RESULTS HEADER ───── */}
      {!generating && results.length > 0 && (
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 grid place-items-center shrink-0 shadow-lg shadow-emerald-500/20">
              <i className="bx bx-check-double text-white text-lg" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-sm">
                ¡{successCount} sección{successCount !== 1 ? "es" : ""} lista
                {successCount !== 1 ? "s" : ""}!
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Previsualiza, descarga o edita cada sección
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UsageBar usage={usage} compact />
            {successCount > 1 && (
              <button
                onClick={handleDownloadAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 text-white text-[11px] font-bold hover:bg-gray-800 transition"
              >
                <i className="bx bx-download text-sm" /> Descargar todo
              </button>
            )}
          </div>
        </div>
      )}

      {/* ───── RESULTS GRID ───── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((r, i) => {
          const isRegen = regeneratingId === r.etapa?.id;
          const isVisible = revealedSet.has(i) || !r.success;

          return (
            <ResultCard
              key={`${r.etapa?.id}-${i}`}
              result={r}
              index={i}
              visible={isVisible}
              isRegenerating={isRegen}
              onPreview={setPreviewResult}
              onEdit={setEditResult}
              onDownload={handleDownload}
            />
          );
        })}
      </div>

      {/* ───── BOTTOM ACTIONS ───── */}
      {!generating && results.length > 0 && (
        <div className="flex items-center justify-between pt-5 mt-5 border-t border-gray-100">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
          >
            <i className="bx bx-plus text-sm" /> Nueva generación
          </button>
          <button
            onClick={onRegenerate}
            disabled={generating || (usage.limit > 0 && usage.remaining <= 0)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f1129] text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-50 shadow-lg"
          >
            <i className="bx bx-refresh text-sm" /> Regenerar todas
          </button>
        </div>
      )}

      {/* ───── MODALS ───── */}
      <ImagePreviewModal
        open={!!previewResult}
        onClose={() => setPreviewResult(null)}
        result={previewResult}
      />
      <EditPromptModal
        open={!!editResult}
        onClose={() => setEditResult(null)}
        result={editResult}
        loading={!!regeneratingId}
        onRegenerate={handleEditRegenerate}
      />

      <style>{`
        .sr-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: srShimmer 2s infinite;
        }
        @keyframes srShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default StepResults;
