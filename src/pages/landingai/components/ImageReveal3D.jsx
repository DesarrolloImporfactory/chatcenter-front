import React, { useState, useEffect } from "react";

/**
 * Fullscreen 3D reveal overlay.
 * Shows the generated image doing a dramatic 3D rotation in the center of the viewport,
 * then shrinks and fades so the card can appear in its grid position.
 *
 * Props:
 *  - result: { etapa, image_base64, image_url }
 *  - index: section number
 *  - onComplete: callback when animation finishes
 */
const ImageReveal3D = ({ result, index, onComplete }) => {
  const [phase, setPhase] = useState("enter"); // enter -> showcase -> exit

  useEffect(() => {
    // Phase timeline
    const t1 = setTimeout(() => setPhase("showcase"), 100); // start anim
    const t2 = setTimeout(() => setPhase("exit"), 2600); // begin exit
    const t3 = setTimeout(() => onComplete?.(), 3200); // done
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  if (!result?.success) return null;

  const imgSrc =
    result.image_url || `data:image/png;base64,${result.image_base64}`;

  return (
    <div
      className={`fixed inset-0 z-[9998] flex items-center justify-center reveal-backdrop reveal-backdrop-${phase}`}
    >
      {/* Radial light burst behind image */}
      <div className={`absolute reveal-burst reveal-burst-${phase}`} />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`reveal-sparkle reveal-sparkle-${phase}`}
            style={{
              "--x": `${Math.random() * 100}%`,
              "--y": `${Math.random() * 100}%`,
              "--size": `${3 + Math.random() * 5}px`,
              "--delay": `${Math.random() * 0.8}s`,
              "--duration": `${1 + Math.random() * 1.5}s`,
              "--drift": `${-40 + Math.random() * 80}px`,
            }}
          />
        ))}
      </div>

      {/* Section label */}
      <div className={`absolute top-[12%] reveal-label reveal-label-${phase}`}>
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
          <span className="w-7 h-7 rounded-lg bg-white text-indigo-700 text-xs font-black grid place-items-center shadow-lg">
            {index + 1}
          </span>
          <span className="text-white text-sm font-bold tracking-wide">
            {result.etapa?.nombre}
          </span>
        </div>
      </div>

      {/* 3D Image Container */}
      <div className="reveal-perspective">
        <div className={`reveal-card reveal-card-${phase}`}>
          {/* Glow ring behind */}
          <div
            className={`absolute -inset-4 rounded-3xl reveal-glow reveal-glow-${phase}`}
          />

          {/* The image */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
            <img
              src={imgSrc}
              alt={result.etapa?.nombre || ""}
              className="max-h-[55vh] max-w-[85vw] md:max-w-[50vw] w-auto object-contain bg-gray-900"
            />

            {/* Shine sweep */}
            <div
              className={`absolute inset-0 pointer-events-none reveal-shine reveal-shine-${phase}`}
            />
          </div>

          {/* "IA Generated" badge */}
          <div
            className={`absolute -bottom-5 left-1/2 -translate-x-1/2 reveal-badge reveal-badge-${phase}`}
          >
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 shadow-xl shadow-indigo-500/30 border border-indigo-400/30">
              <i className="bx bx-magic-wand text-white text-xs" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">
                Generada con IA
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* ═══ BACKDROP ═══ */
        .reveal-backdrop {
          pointer-events: none;
          transition: all 0.5s ease;
        }
        .reveal-backdrop-enter {
          background: rgba(0,0,0,0);
        }
        .reveal-backdrop-showcase {
          background: rgba(5,5,20,0.85);
          backdrop-filter: blur(8px);
        }
        .reveal-backdrop-exit {
          background: rgba(5,5,20,0);
          backdrop-filter: blur(0px);
        }

        /* ═══ RADIAL BURST ═══ */
        .reveal-burst {
          width: 600px; height: 600px;
          border-radius: 50%;
          transition: all 0.8s ease;
        }
        .reveal-burst-enter {
          transform: scale(0);
          opacity: 0;
          background: radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%);
        }
        .reveal-burst-showcase {
          transform: scale(1);
          opacity: 1;
          background: radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(59,130,246,0.1) 40%, transparent 70%);
          animation: burstPulse 2s ease-in-out infinite;
        }
        .reveal-burst-exit {
          transform: scale(0.5);
          opacity: 0;
        }
        @keyframes burstPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }

        /* ═══ SPARKLES ═══ */
        .reveal-sparkle {
          position: absolute;
          left: var(--x); top: var(--y);
          width: var(--size); height: var(--size);
          background: white;
          border-radius: 50%;
          opacity: 0;
        }
        .reveal-sparkle-showcase {
          animation: sparkleFloat var(--duration) ease-out var(--delay) forwards;
        }
        .reveal-sparkle-exit {
          opacity: 0;
          transition: opacity 0.3s;
        }
        @keyframes sparkleFloat {
          0% { opacity: 0; transform: scale(0) translateY(0); }
          20% { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(0.5) translateY(var(--drift)); }
        }

        /* ═══ SECTION LABEL ═══ */
        .reveal-label {
          transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .reveal-label-enter {
          opacity: 0; transform: translateY(30px) scale(0.8);
        }
        .reveal-label-showcase {
          opacity: 1; transform: translateY(0) scale(1);
          animation: labelFloat 2s ease-in-out infinite;
        }
        .reveal-label-exit {
          opacity: 0; transform: translateY(-20px) scale(0.9);
          transition: all 0.3s ease;
        }
        @keyframes labelFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        /* ═══ 3D PERSPECTIVE ═══ */
        .reveal-perspective {
          perspective: 1200px;
          perspective-origin: center;
        }

        /* ═══ 3D CARD ═══ */
        .reveal-card {
          position: relative;
          transform-style: preserve-3d;
          transition: all 0.6s ease;
        }
        .reveal-card-enter {
          transform: scale(0.1) rotateY(180deg) rotateX(20deg);
          opacity: 0;
        }
        .reveal-card-showcase {
          animation: card3DReveal 2.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .reveal-card-exit {
          animation: card3DExit 0.5s cubic-bezier(0.55, 0, 1, 0.45) forwards;
        }

        @keyframes card3DReveal {
          0% {
            transform: scale(0.1) rotateY(180deg) rotateX(30deg);
            opacity: 0;
            filter: brightness(3) saturate(0);
          }
          15% {
            transform: scale(0.6) rotateY(120deg) rotateX(15deg);
            opacity: 1;
            filter: brightness(2) saturate(0.5);
          }
          35% {
            transform: scale(1.1) rotateY(45deg) rotateX(-5deg);
            filter: brightness(1.5) saturate(0.8);
          }
          50% {
            transform: scale(1.05) rotateY(-10deg) rotateX(3deg);
            filter: brightness(1.2) saturate(1);
          }
          65% {
            transform: scale(1.02) rotateY(5deg) rotateX(-1deg);
            filter: brightness(1.1) saturate(1);
          }
          80% {
            transform: scale(1) rotateY(-2deg) rotateX(0deg);
            filter: brightness(1) saturate(1);
          }
          100% {
            transform: scale(1) rotateY(0deg) rotateX(0deg);
            filter: brightness(1) saturate(1);
          }
        }

        @keyframes card3DExit {
          0% {
            transform: scale(1) rotateY(0deg);
            opacity: 1;
          }
          100% {
            transform: scale(0.3) rotateY(-30deg) translateY(40px);
            opacity: 0;
          }
        }

        /* ═══ GLOW RING ═══ */
        .reveal-glow {
          transition: all 0.6s ease;
        }
        .reveal-glow-enter {
          opacity: 0;
          box-shadow: none;
        }
        .reveal-glow-showcase {
          opacity: 1;
          box-shadow:
            0 0 60px rgba(99,102,241,0.4),
            0 0 120px rgba(99,102,241,0.2),
            inset 0 0 60px rgba(99,102,241,0.1);
          animation: glowPulse 2s ease-in-out infinite;
        }
        .reveal-glow-exit {
          opacity: 0;
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 60px rgba(99,102,241,0.4), 0 0 120px rgba(99,102,241,0.2); }
          50% { box-shadow: 0 0 80px rgba(99,102,241,0.5), 0 0 160px rgba(99,102,241,0.3); }
        }

        /* ═══ SHINE ═══ */
        .reveal-shine {
          overflow: hidden;
        }
        .reveal-shine-enter { opacity: 0; }
        .reveal-shine-showcase::after {
          content: '';
          position: absolute; top: 0; left: -80%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: skewX(-15deg);
          animation: revealShine 1.2s ease-in-out 1.2s forwards;
        }
        .reveal-shine-exit { opacity: 0; }

        @keyframes revealShine {
          from { left: -50%; }
          to { left: 130%; }
        }

        /* ═══ BADGE ═══ */
        .reveal-badge {
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .reveal-badge-enter {
          opacity: 0; transform: translate(-50%, 20px) scale(0.5);
        }
        .reveal-badge-showcase {
          opacity: 1; transform: translate(-50%, 0) scale(1);
          transition-delay: 0.8s;
        }
        .reveal-badge-exit {
          opacity: 0; transform: translate(-50%, 10px) scale(0.8);
          transition-delay: 0s;
        }
      `}</style>
    </div>
  );
};

export default ImageReveal3D;
