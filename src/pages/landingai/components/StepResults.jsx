import React, { useState, useRef, useEffect, useCallback } from "react";
import ResultCard from "./ResultCard";
import ImageReveal3D from "./ImageReveal3D";
import ImagePreviewModal from "./ImagePreviewModal";
import EditPromptModal from "./EditPromptModal";
import UsageBar from "./UsageBar";
import GeneratingBar from "./GeneratingBar";

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

  const [revealedSet, setRevealedSet] = useState(new Set());
  const [currentReveal, setCurrentReveal] = useState(null);
  const revealQueueRef = useRef([]);
  const processingRef = useRef(false);
  const prevResultsLenRef = useRef(0);

  const [regenReveal, setRegenReveal] = useState(null);
  const prevRegenIdRef = useRef(null);

  useEffect(() => {
    const prevLen = prevResultsLenRef.current;
    if (results.length > prevLen) {
      for (let i = prevLen; i < results.length; i++) {
        if (results[i].success) {
          revealQueueRef.current.push({ result: results[i], index: i });
        } else {
          setRevealedSet((prev) => new Set([...prev, i]));
        }
      }
      prevResultsLenRef.current = results.length;
      processQueue();
    }
    if (results.length < prevLen) {
      prevResultsLenRef.current = results.length;
      setRevealedSet(new Set());
      revealQueueRef.current = [];
      setCurrentReveal(null);
      processingRef.current = false;
    }
  }, [results]);

  useEffect(() => {
    if (prevRegenIdRef.current && !regeneratingId) {
      const finishedId = prevRegenIdRef.current;
      const idx = results.findIndex(
        (r) => r.etapa?.id === finishedId && r.success,
      );
      if (idx >= 0) setRegenReveal({ result: results[idx], index: idx });
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
    if (currentReveal)
      setRevealedSet((prev) => new Set([...prev, currentReveal.index]));
    setCurrentReveal(null);
    processingRef.current = false;
    setTimeout(() => {
      if (revealQueueRef.current.length > 0) {
        processingRef.current = true;
        const next = revealQueueRef.current.shift();
        setCurrentReveal(next);
      }
    }, 300);
  }, [currentReveal]);

  const handleRegenRevealComplete = useCallback(() => setRegenReveal(null), []);

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
      {/* 3D Reveal overlays */}
      {currentReveal && (
        <ImageReveal3D
          result={currentReveal.result}
          index={currentReveal.index}
          onComplete={handleRevealComplete}
        />
      )}
      {regenReveal && (
        <ImageReveal3D
          result={regenReveal.result}
          index={regenReveal.index}
          onComplete={handleRegenRevealComplete}
        />
      )}

      {/* ── ESPERA INICIAL: todavía no llega ninguna imagen ── */}
      {generating && results.length === 0 && (
        <div
          style={{
            minHeight: 420,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
            padding: "48px 24px 48px",
          }}
        >
          {/* Orb central */}
          <div style={{ position: "relative", width: 110, height: 110 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: i * -20,
                  borderRadius: "50%",
                  border: `1.5px solid rgba(99,102,241,${0.22 - i * 0.06})`,
                  animation: `waitRing ${3.5 + i * 0.8}s ease-in-out infinite`,
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, #6366f1 0%, #38bdf8 55%, #67e8f9 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  "0 0 48px rgba(56,189,248,0.45), 0 0 90px rgba(99,102,241,0.15)",
                animation: "waitPulse 2.2s ease-in-out infinite",
              }}
            >
              <i
                className="bx bx-magic-wand"
                style={{ fontSize: 38, color: "white" }}
              />
            </div>
          </div>

          {/* Texto */}
          <div style={{ textAlign: "center", maxWidth: 380 }}>
            <p
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#111827",
                margin: "0 0 10px",
                letterSpacing: "-0.5px",
              }}
            >
              La IA está creando tu landing
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#6b7280",
                margin: "0 0 24px",
                lineHeight: 1.65,
              }}
            >
              Estamos generando cada sección con el estilo de tu template y las
              fotos de tu producto.
              <br />
              <span style={{ color: "#9ca3af", fontSize: 12 }}>
                Esto toma ~30 segundos por sección — no cierres la página.
              </span>
            </p>

            {/* Dots loader */}
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: i % 2 === 0 ? "#6366f1" : "#38bdf8",
                    animation: "waitDot 1.4s ease-in-out infinite",
                    animationDelay: `${i * 0.18}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Pills de secciones */}
          {genProgress.total > 0 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                justifyContent: "center",
                maxWidth: 440,
              }}
            >
              {Array.from({ length: genProgress.total }).map((_, i) => {
                const done = i < genProgress.current;
                const active = i === genProgress.current - 1;
                return (
                  <div
                    key={i}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 700,
                      transition: "all 0.4s ease",
                      background: done
                        ? "rgba(56,189,248,0.1)"
                        : active
                          ? "rgba(99,102,241,0.1)"
                          : "rgba(0,0,0,0.04)",
                      color: done ? "#0284c7" : active ? "#6366f1" : "#9ca3af",
                      border: `1.5px solid ${
                        done
                          ? "rgba(56,189,248,0.35)"
                          : active
                            ? "rgba(99,102,241,0.35)"
                            : "rgba(0,0,0,0.07)"
                      }`,
                      animation: active
                        ? "waitPillPulse 1.6s ease-in-out infinite"
                        : "none",
                    }}
                  >
                    {done ? "✓ " : active ? "⟳ " : ""}
                    Sección {i + 1}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── INLINE BAR: ya llegó la primera imagen, sigue generando ── */}
      {generating && results.length > 0 && (
        <GeneratingBar genProgress={genProgress} inline />
      )}

      {/* ── HEADER FINAL: terminó de generar ── */}
      {!generating && results.length > 0 && (
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0 shadow-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/20">
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

      {/* Results grid */}
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

      {/* Bottom actions */}
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

      {/* Modals */}
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
        @keyframes waitRing {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%       { transform: scale(1.07); opacity: 1; }
        }
        @keyframes waitPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.05); }
        }
        @keyframes waitDot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
          40%            { transform: translateY(-11px); opacity: 1; }
        }
        @keyframes waitPillPulse {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default StepResults;
