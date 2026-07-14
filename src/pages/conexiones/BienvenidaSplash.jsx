import React, { useEffect, useState } from "react";

/**
 * Animación de bienvenida tras iniciar sesión: reemplaza el paso del selector de
 * herramienta. Se muestra un instante y se desvanece revelando las conexiones.
 * Autónomo: se auto-cierra vía onDone.
 */
export default function BienvenidaSplash({ onDone, nombre }) {
  const [fase, setFase] = useState("entrando"); // entrando → saliendo

  useEffect(() => {
    const t1 = setTimeout(() => setFase("saliendo"), 1900);
    const t2 = setTimeout(() => onDone?.(), 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-opacity duration-500"
      style={{
        background:
          "radial-gradient(1200px circle at 20% 10%, #1e1b4b, transparent 55%), radial-gradient(900px circle at 90% 100%, #312e81, transparent 45%), #070b14",
        opacity: fase === "saliendo" ? 0 : 1,
      }}
    >
      <style>{`
        @keyframes bs-pop { 0%{transform:scale(.6);opacity:0} 55%{transform:scale(1.08);opacity:1} 100%{transform:scale(1)} }
        @keyframes bs-ring { 0%{transform:scale(.7);opacity:.6} 100%{transform:scale(2.2);opacity:0} }
        @keyframes bs-bar { 0%{width:0%} 100%{width:100%} }
        @keyframes bs-rise { 0%{transform:translateY(14px);opacity:0} 100%{transform:translateY(0);opacity:1} }
        @keyframes bs-shine { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes bs-spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* Orbes decorativos */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div
        className="relative flex flex-col items-center"
        style={{ animation: "bs-pop .7s cubic-bezier(.2,.9,.3,1.3) both" }}
      >
        {/* Emblema con anillos */}
        <div className="relative w-24 h-24 grid place-items-center">
          <span
            className="absolute inset-0 rounded-full ring-2 ring-indigo-400/40"
            style={{ animation: "bs-ring 1.8s ease-out infinite" }}
          />
          <span
            className="absolute inset-0 rounded-full ring-2 ring-violet-400/30"
            style={{ animation: "bs-ring 1.8s ease-out .6s infinite" }}
          />
          <span
            className="absolute -inset-2 rounded-full border-2 border-dashed border-white/10"
            style={{ animation: "bs-spin 8s linear infinite" }}
          />
          <div className="relative w-20 h-20 grid place-items-center">
            <i
              className="bx bx-bot text-[52px] text-transparent bg-clip-text"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #c7d2fe 10%, #ffffff 50%, #ddd6fe 90%)",
                filter: "drop-shadow(0 4px 14px rgba(99,102,241,.45))",
              }}
            />
          </div>
        </div>

        {/* Texto */}
        <div
          className="mt-7 text-center"
          style={{ animation: "bs-rise .6s ease-out .25s both" }}
        >
          <div
            className="text-[26px] font-black tracking-tight text-transparent bg-clip-text"
            style={{
              backgroundImage:
                "linear-gradient(110deg, #c7d2fe 20%, #ffffff 40%, #ddd6fe 60%, #c7d2fe 80%)",
              backgroundSize: "200% auto",
              animation: "bs-shine 2s linear infinite",
            }}
          >
            {nombre ? `Te damos la bienvenida, ${nombre}` : "Te damos la bienvenida a ImporChat"}
          </div>
          <p className="mt-1.5 text-white/55 text-[13px]">
            Cargando tu información…
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="mt-6 w-56 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
            style={{ animation: "bs-bar 1.9s cubic-bezier(.4,0,.2,1) forwards" }}
          />
        </div>
      </div>
    </div>
  );
}
