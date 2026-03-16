import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TabImporChat from "./TabImporChat";
import TabInstaLanding from "./TabInstaLanding";

/* ── Comparison Table ── */
const ROWS = [
  { f: "Insta Landing", il: "SI", ic: "—", pro: "SI", av: "MAX" },
  { f: "ImporChat", il: "—", ic: "SI", pro: "SI", av: "PRO" },
  { f: "Banners/mes", il: "120", ic: "—", pro: "300", av: "500" },
  { f: "Angulos AI", il: "30", ic: "—", pro: "75", av: "125" },
  { f: "Secciones", il: "5", ic: "—", pro: "10", av: "10 + custom" },
  { f: "Dropi", il: "20 prod.", ic: "—", pro: "Ilimitado", av: "Multi-tienda" },
  { f: "Agentes WhatsApp", il: "—", ic: "1", pro: "1", av: "3" },
  {
    f: "Conversaciones",
    il: "—",
    ic: "Ilimitadas",
    pro: "Ilimitadas",
    av: "Ilimitadas",
  },
  { f: "Landing > WA", il: "—", ic: "—", pro: "SI", av: "SI" },
  { f: "A/B Testing", il: "—", ic: "—", pro: "SI", av: "SI" },
  { f: "Bot entrenado", il: "—", ic: "—", pro: "—", av: "SI" },
  { f: "Analytics", il: "Basico", ic: "Basico", pro: "SI", av: "Avanzado" },
  { f: "Sub-cuentas", il: "—", ic: "—", pro: "—", av: "5" },
  { f: "Soporte", il: "Chat 24h", ic: "Chat 24h", pro: "WA 4h", av: "VIP" },
];
const COLS = [
  { k: "il", n: "Insta Landing", p: "$29", c: "#10B981" },
  { k: "ic", n: "ImporChat", p: "$29", c: "#00BFFF" },
  { k: "pro", n: "Pro Ecosistema", p: "$59", c: "#6366F1" },
  { k: "av", n: "Avanzado", p: "$99", c: "#F59E0B" },
];

const LandingHome = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("imporchat");

  const handleLogin = () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const d = JSON.parse(atob(token.split(".")[1]));
        if (d.exp > Date.now() / 1000) {
          navigate("/conexiones");
          return;
        }
      } catch {}
    }
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ═══ HEADER — Compact navy ═══ */}
      <header
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0B1426 0%, #162033 60%, #1e293b 100%)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-100"
          style={{
            backgroundImage: "linear-gradient(rgba(11,20,38,0.04) 1px",
          }}
        />
        <div
          className="absolute top-0 right-1/4 w-[300px] h-[150px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, rgba(0,191,255,0.06), transparent 70%)",
          }}
        />

        {/* Nav */}
        <div className="relative w-full flex items-center justify-between px-5 sm:px-8 py-3">
          <span className="text-lg font-extrabold text-white tracking-tight">
            Imporfactory
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/register")}
              className="hidden sm:inline-flex px-4 py-2 rounded-xl text-[12px] font-semibold text-white/70 hover:text-white transition"
            >
              Crear cuenta
            </button>
            <button
              onClick={handleLogin}
              className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-[#0B1426] bg-white hover:bg-slate-100 transition-all shadow-sm"
            >
              Iniciar sesion
            </button>
          </div>
        </div>

        {/* Hero — compact */}
        <div className="relative text-center px-5 sm:px-8 pt-4 pb-8 sm:pt-6 sm:pb-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-[-0.03em] leading-[1.15] max-w-3xl mx-auto">
            Cree contenido que{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              convierte
            </span>{" "}
            y venda por{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-300 bg-clip-text text-transparent">
              WhatsApp
            </span>{" "}
            con IA
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
            Dos herramientas conectadas por inteligencia artificial para generar
            ventas 24/7.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={handleLogin}
              className="px-6 py-3 rounded-xl text-sm font-bold text-[#0B1426] bg-white hover:bg-slate-100 transition-all shadow-md"
            >
              Comenzar gratis
            </button>
            <button
              onClick={() => navigate("/planes")}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all"
            >
              Ver planes
            </button>
          </div>
        </div>
      </header>

      {/* ═══ TAB SWITCHER ═══ */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200/60 shadow-sm">
        <div className="w-full px-5 sm:px-8 flex items-center justify-center py-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/60">
            <button
              onClick={() => setTab("imporchat")}
              className={`px-5 py-2.5 rounded-lg text-[12px] font-bold transition-all ${tab === "imporchat" ? "bg-white text-[#0B1426] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={tab === "imporchat" ? "#00BFFF" : "#94a3b8"}
                  strokeWidth="1.8"
                >
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                ImporChat{" "}
                <span className="hidden sm:inline text-[10px] font-medium text-slate-400">
                  Agente AI
                </span>
              </span>
            </button>
            <button
              onClick={() => setTab("instalanding")}
              className={`px-5 py-2.5 rounded-lg text-[12px] font-bold transition-all ${tab === "instalanding" ? "bg-white text-[#0B1426] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={tab === "instalanding" ? "#10B981" : "#94a3b8"}
                  strokeWidth="1.8"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                Insta Landing{" "}
                <span className="hidden sm:inline text-[10px] font-medium text-slate-400">
                  Generador AI
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      {tab === "imporchat" && <TabImporChat onLogin={handleLogin} />}
      {tab === "instalanding" && <TabInstaLanding onLogin={handleLogin} />}

      {/* ═══ COMPARISON TABLE ═══ */}
      <section className="pt-8 pb-14 sm:pt-10 sm:pb-20 border-t border-slate-100">
        <div className="w-full px-5 sm:px-8">
          <div className="text-center mb-10">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B1426] tracking-tight">
              Cada plan en detalle
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Todos incluyen promo de $5 el primer mes.
            </p>
          </div>
          <div className="max-w-6xl mx-auto overflow-x-auto rounded-2xl border border-slate-200/60 shadow-sm">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-[#0B1426]">
                  <th className="text-left px-5 py-4 text-slate-400 font-semibold text-xs">
                    Caracteristica
                  </th>
                  {COLS.map((c) => (
                    <th key={c.k} className="px-4 py-4 text-center">
                      <span
                        className="block text-xs font-bold"
                        style={{ color: c.c }}
                      >
                        {c.n}
                      </span>
                      <span className="block text-white/50 text-[10px] mt-0.5">
                        {c.p}/mes
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                  >
                    <td className="px-5 py-3 text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {r.f}
                    </td>
                    {COLS.map((c) => (
                      <td
                        key={c.k}
                        className="px-4 py-3 text-center text-xs whitespace-nowrap"
                      >
                        {r[c.k] !== "—" ? (
                          <span className="font-bold" style={{ color: c.c }}>
                            {r[c.k]}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══ PROMO CTA ═══ */}
      <section
        className="py-12"
        style={{
          background:
            "linear-gradient(135deg, #0B1426 0%, #162033 60%, #1e293b 100%)",
        }}
      >
        <div className="w-full px-5 sm:px-8 text-center">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Empiece desde <span className="text-cyan-400">$5/mes</span>
          </h3>
          <p className="mt-2 text-sm text-slate-400 max-w-lg mx-auto">
            10 imagenes gratis en Insta Landing + 7 dias gratis en ImporChat.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={handleLogin}
              className="px-7 py-3.5 rounded-xl text-sm font-bold text-[#0B1426] bg-white hover:bg-slate-100 transition-all shadow-md"
            >
              Iniciar sesion
            </button>
            <button
              onClick={() => navigate("/registro")}
              className="px-7 py-3.5 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all"
            >
              Crear cuenta
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-6 border-t border-slate-100">
        <div className="w-full px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-500">
            Imporfactory
          </span>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <a
              href="/politica-privacidad"
              className="hover:text-slate-600 transition"
            >
              Privacidad
            </a>
            <a
              href="/condiciones-servicio"
              className="hover:text-slate-600 transition"
            >
              Terminos
            </a>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingHome;
