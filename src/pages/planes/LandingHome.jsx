import React from "react";
import { useNavigate } from "react-router-dom";
import TabImporChat from "./TabImporchat";

/* ── Tabla comparativa ──
 *
 * Insta Landing salió del catálogo, así que ya no hay columna ni filas suyas
 * (banners, ángulos, secciones landing, A/B testing, landing → WhatsApp).
 *
 * Las filas están alineadas con lo que el backend aplica de verdad: los únicos
 * límites reales son las conexiones (limiteConexiones) y los subusuarios
 * (limiteSub_usuarios). Todo lo demás va incluido en los tres planes, y la
 * tabla lo dice en vez de inventar una escalera de features que no existe.
 */
const COLS = [
  { k: "ic", n: "ImporChat", p: "$39", c: "#0891B2" },
  { k: "pro", n: "Pro Ecosistema", p: "$49", c: "#7C3AED" },
  { k: "av", n: "Avanzado", p: "$99", c: "#B45309" },
];

const ROWS = [
  { grupo: "Capacidad" },
  { f: "Negocios conectados", ic: "1", pro: "2", av: "5" },
  { f: "Usuarios del equipo", ic: "2", pro: "5", av: "10" },
  {
    f: "Conversaciones",
    ic: "Ilimitadas",
    pro: "Ilimitadas",
    av: "Ilimitadas",
  },

  { grupo: "Incluido en los tres planes" },
  { f: "Bot IA propio en cada negocio", ic: "SI", pro: "SI", av: "SI" },
  { f: "WhatsApp, Messenger e Instagram", ic: "SI", pro: "SI", av: "SI" },
  { f: "Respuestas y seguimiento 24/7", ic: "SI", pro: "SI", av: "SI" },
  { f: "Agenda de citas y recordatorios", ic: "SI", pro: "SI", av: "SI" },
  { f: "Sucursales, servicios y profesionales", ic: "SI", pro: "SI", av: "SI" },
  { f: "Catálogo, pedidos y cotizaciones", ic: "SI", pro: "SI", av: "SI" },
  { f: "Catálogo Dropi sincronizado", ic: "SI", pro: "SI", av: "SI" },
  { f: "Embudo de ventas (Kanban)", ic: "SI", pro: "SI", av: "SI" },
  { f: "Encuestas de satisfacción", ic: "SI", pro: "SI", av: "SI" },
  { f: "Departamentos y asignación de chats", ic: "SI", pro: "SI", av: "SI" },
];

const LandingHome = () => {
  const navigate = useNavigate();

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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-[-0.03em] leading-[1.15] max-w-3xl mx-auto text-balance">
            Un vendedor con IA que{" "}
            <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 bg-clip-text text-transparent">
              atiende, agenda y cierra
            </span>{" "}
            por WhatsApp
          </h1>
          <p className="mt-2.5 text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Responde al instante, toma pedidos, agenda citas y ordena tu CRM.
            Las 24 horas del día, sin sumar una persona más a la nómina.
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

      {/* ═══ CONTENIDO ═══
          El switch de pestañas se retiró junto con Insta Landing: con un solo
          producto no hay nada que alternar, y una pestaña única solo ocupaba
          espacio y hacía dudar de si faltaba algo. */}
      <TabImporChat onLogin={handleLogin} />

      {/* ═══ COMPARISON TABLE ═══ */}
      <section className="pt-8 pb-14 sm:pt-10 sm:pb-20 border-t border-slate-100">
        <div className="w-full px-5 sm:px-8">
          <div className="text-center mb-10">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B1426] tracking-tight">
              Cada plan en detalle
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Los tres traen el ecosistema completo. Solo cambia cuántos
              negocios conectas y cuánto equipo entra.
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
                {ROWS.map((r, i) =>
                  r.grupo ? (
                    // Separador: divide lo que cambia entre planes de lo que
                    // viene en todos. Sin él, once filas seguidas de "SI" se
                    // leen como relleno en vez de como argumento de venta.
                    <tr key={i} className="bg-slate-100/70">
                      <td
                        colSpan={COLS.length + 1}
                        className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500"
                      >
                        {r.grupo}
                      </td>
                    </tr>
                  ) : (
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
                  ),
                )}
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
            Su primer mes cuesta <span className="text-amber-400">$5</span>
          </h3>
          <p className="mt-2 text-sm text-slate-400 max-w-lg mx-auto">
            7 días gratis para probarlo. Después $39/mes. Cancele cuando quiera.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={handleLogin}
              className="px-7 py-3.5 rounded-xl text-sm font-bold text-[#0B1426] bg-white hover:bg-slate-100 transition-all shadow-md"
            >
              Iniciar sesion
            </button>
            <button
              onClick={() => navigate("/register")}
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
