import React, { useEffect, useState } from "react";

const GeneratingBar = ({ genProgress, inline = false }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  const pct =
    genProgress.total > 0
      ? Math.round((genProgress.current / genProgress.total) * 100)
      : 0;

  // ── Estilos según modo ──────────────────────────────────────────────────
  const wrapperStyle = inline
    ? {
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 20,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(-12px)",
        transition:
          "opacity 0.4s ease, transform 0.4s cubic-bezier(0.32,0.72,0,1)",
        boxShadow: "0 4px 32px rgba(99,102,241,0.18)",
      }
    : {
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9000,
        transform: mounted ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
      };

  return (
    <div style={wrapperStyle}>
      {/* Progress line */}
      <div
        style={{
          height: 3,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, #6366f1, #38bdf8, #67e8f9)",
            transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
              animation: "gbShimmer 1.8s infinite",
            }}
          />
        </div>
      </div>

      {/* Main bar */}
      <div
        style={{
          background:
            "linear-gradient(90deg, #080b1a 0%, #0f1129 50%, #0a0e20 100%)",
          borderTop: inline ? "none" : "1px solid rgba(99,102,241,0.2)",
          borderBottom: inline ? "1px solid rgba(99,102,241,0.15)" : "none",
          padding: inline ? "14px 20px" : "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Spinner */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #38bdf8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 0 16px rgba(99,102,241,0.5)",
          }}
        >
          <svg
            style={{
              animation: "gbSpin 1s linear infinite",
              width: 18,
              height: 18,
            }}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              style={{ opacity: 0.25 }}
              cx="12"
              cy="12"
              r="10"
              stroke="white"
              strokeWidth="4"
            />
            <path
              style={{ opacity: 0.9 }}
              fill="white"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
        </div>

        {/* Text + dots */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "rgba(255,255,255,0.9)",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {genProgress.etapa || "Iniciando..."}
            </p>
            <span
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: "white",
                marginLeft: 12,
                flexShrink: 0,
                fontFeatureSettings: '"tnum"',
              }}
            >
              {pct}
              <span style={{ fontSize: 10, opacity: 0.6 }}>%</span>
            </span>
          </div>

          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {Array.from({ length: genProgress.total }).map((_, i) => {
              const done = i < genProgress.current;
              const active = i === genProgress.current - 1 && pct < 100;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: done ? 6 : 3,
                    borderRadius: 99,
                    background: done
                      ? "#38bdf8"
                      : active
                        ? "rgba(99,102,241,0.8)"
                        : "rgba(255,255,255,0.1)",
                    transition: "all 0.35s ease",
                    boxShadow: done
                      ? "0 0 6px rgba(56,189,248,0.6)"
                      : active
                        ? "0 0 5px rgba(99,102,241,0.7)"
                        : "none",
                    animation: active
                      ? "gbPulse 1.4s ease-in-out infinite"
                      : "none",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Counter */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p
            style={{
              fontSize: 10,
              color: "rgba(129,140,248,0.8)",
              margin: 0,
              fontWeight: 600,
            }}
          >
            Sección
          </p>
          <p
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: "white",
              margin: 0,
              lineHeight: 1.1,
              fontFeatureSettings: '"tnum"',
            }}
          >
            {genProgress.current}
            <span style={{ fontSize: 11, opacity: 0.5, fontWeight: 600 }}>
              /{genProgress.total}
            </span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes gbSpin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes gbShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        @keyframes gbPulse   { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
      `}</style>
    </div>
  );
};

export default GeneratingBar;
