import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Página de ruta no encontrada.
 *
 * Reemplaza al `<h1>Esta ruta no existe</h1>` pelado que había en el catch-all
 * de App.jsx.
 *
 * A dónde manda al usuario depende de si tiene sesión: sin ella, a iniciar
 * sesión; con ella, a Conexiones, que es su pantalla de trabajo. Un 404 que
 * solo dice "no existe" deja al cliente sin salida, y la salida útil no es la
 * misma para los dos casos.
 *
 * Caso de uso principal hoy: las rutas de Insta Landing quedaron retiradas y
 * quien tenga un enlace viejo guardado aterriza acá.
 */
const RutaNoEncontrada = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const haySesion = (() => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    try {
      const d = JSON.parse(atob(token.split(".")[1]));
      return d.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  })();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{
        background:
          "linear-gradient(135deg, #0B1426 0%, #162033 60%, #1e293b 100%)",
      }}
    >
      {/* Halo cálido, el mismo acento del resto de la marca */}
      <div
        className="absolute top-0 right-1/4 w-[420px] h-[220px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(245,158,11,0.10), transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-lg text-center">
        <div
          className="mx-auto w-16 h-16 rounded-2xl grid place-items-center mb-6"
          style={{
            background: "rgba(245,158,11,0.10)",
            border: "1px solid rgba(245,158,11,0.20)",
          }}
        >
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7.5" />
            <path d="M20.5 20.5 16.4 16.4" />
            <path d="M11 7.8v3.6" />
            <path d="M11 14.4h.01" />
          </svg>
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400/70">
          Error 404
        </p>

        <h1 className="mt-3 text-[28px] sm:text-[34px] font-extrabold text-white tracking-[-0.03em] leading-[1.15] text-balance">
          Esta página ya no está aquí
        </h1>

        <p className="mt-3.5 text-[14.5px] text-slate-400 leading-relaxed max-w-md mx-auto">
          El enlace puede estar mal escrito, o la sección se retiró del sistema.
        </p>

        {location?.pathname && (
          <p className="mt-4 inline-block px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-500 bg-white/[0.04] border border-white/[0.06] break-all">
            {location.pathname}
          </p>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(haySesion ? "/conexiones" : "/login")}
            className="w-full sm:w-auto px-7 py-3 rounded-xl text-sm font-bold text-[#0B1426] bg-white hover:bg-slate-100 transition-all shadow-md"
          >
            {haySesion ? "Ir a mis conexiones" : "Iniciar sesión"}
          </button>
          <button
            onClick={() => navigate(haySesion ? "/planes" : "/home")}
            className="w-full sm:w-auto px-7 py-3 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all"
          >
            {haySesion ? "Ver planes" : "Conocer ImporChat"}
          </button>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="mt-6 text-[12px] font-semibold text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Volver atrás
        </button>
      </div>
    </div>
  );
};

export default RutaNoEncontrada;
