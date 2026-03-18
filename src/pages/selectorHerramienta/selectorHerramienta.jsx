import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { motion } from "framer-motion";
import chatApi from "../../api/chatcenter";

/* ═══════════════════════════════════════════════════════════
   Tool Card
   ═══════════════════════════════════════════════════════════ */
const ToolCard = ({
  title,
  tagline,
  description,
  badges,
  stats,
  accent,
  icon,
  locked,
  lockedLabel,
  onClick,
  delay = 0,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 44 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={!locked ? { y: -7 } : { y: -2 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={locked ? undefined : onClick}
      className={[
        "relative rounded-2xl overflow-hidden transition-shadow duration-500",
        locked ? "cursor-default" : "cursor-pointer",
      ].join(" ")}
      style={{
        boxShadow:
          hovered && !locked
            ? `0 20px 50px ${accent}18, 0 0 0 1px ${accent}28`
            : "0 2px 16px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.04)",
      }}
    >
      <div
        className="relative p-7"
        style={{
          background: "linear-gradient(160deg, #111c33 0%, #0B1426 100%)",
          filter: locked ? "saturate(0.35)" : "none",
          transition: "filter 0.4s ease",
        }}
      >
        {/* Glow superior */}
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle, ${accent}${hovered && !locked ? "14" : "08"}, transparent 60%)`,
            filter: "blur(30px)",
          }}
        />

        {/* ── Header ── */}
        <div className="relative flex items-center gap-3.5">
          <div
            className="w-11 h-11 rounded-xl grid place-items-center shrink-0 transition-transform duration-300"
            style={{
              background: `${accent}10`,
              border: `1px solid ${accent}20`,
              transform: hovered && !locked ? "scale(1.06)" : "scale(1)",
            }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-white tracking-tight leading-tight">
              {title}
            </h2>
            <p
              className="text-[11px] font-semibold mt-0.5"
              style={{ color: `${accent}bb` }}
            >
              {tagline}
            </p>
          </div>
          {!locked && (
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: accent }}
              />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Activo
              </span>
            </div>
          )}
          {locked && (
            <div
              className="ml-auto flex items-center gap-1 shrink-0 px-2 py-1 rounded-md"
              style={{
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.07)",
              }}
            >
              <svg
                className="w-3 h-3 text-slate-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                Bloqueado
              </span>
            </div>
          )}
        </div>

        {/* ── Descripción ── */}
        <p className="relative mt-4 text-[12px] leading-[1.65] text-slate-400">
          {description}
        </p>

        {/* ── Badges ── */}
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {badges.map((b, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
              style={{
                color: locked ? "#64748b" : accent,
                background: locked ? "rgba(255,255,255,.03)" : `${accent}0a`,
                border: `1px solid ${locked ? "rgba(255,255,255,.06)" : `${accent}15`}`,
              }}
            >
              {b}
            </span>
          ))}
        </div>

        {/* ── Stats ── */}
        <div
          className="relative mt-5 grid grid-cols-3 rounded-lg py-2.5"
          style={{
            background: "rgba(255,255,255,.02)",
            border: "1px solid rgba(255,255,255,.04)",
          }}
        >
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div
                className="text-sm font-extrabold"
                style={{ color: locked ? "#64748b" : accent }}
              >
                {s.value}
              </div>
              <div className="text-[8px] text-slate-500 uppercase tracking-wider mt-0.5">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA zona — fuera del filtro grayscale ── */}
      <div
        className="relative px-7 pb-6 -mt-1"
        style={{ background: "#0B1426" }}
      >
        {locked ? (
          /* ── CTA bloqueado: visible, atractivo, invita al upgrade ── */
          <div className="pt-5 space-y-3">
            <div
              className="w-full py-3 rounded-xl text-[12px] font-bold text-center transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${accent}22, ${accent}11)`,
                border: `1px solid ${accent}20`,
                color: accent,
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                {lockedLabel}
              </span>
            </div>
            {/* <button
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = "/planes";
              }}
              className="w-full py-2.5 rounded-xl text-[11px] font-bold text-white text-center transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                boxShadow: `0 3px 16px ${accent}25`,
              }}
            >
              <span className="flex items-center justify-center gap-1.5">
                Desbloquear — Ver planes
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </button> */}
          </div>
        ) : (
          /* ── CTA activo ── */
          <motion.div
            className="mt-4 w-full py-3 rounded-xl text-[13px] font-bold text-center text-white"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
              boxShadow: `0 3px 16px ${accent}22`,
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <span className="flex items-center justify-center gap-2">
              Ingresar a {title}
              <motion.svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                animate={{ x: hovered ? 3 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </motion.svg>
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   Página principal
   ═══════════════════════════════════════════════════════════ */
export default function SelectorHerramienta() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [toolsAccess, setToolsAccess] = useState(null);
  const [planName, setPlanName] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");

        const decoded = jwtDecode(token);
        if (decoded.exp < Date.now() / 1000) {
          localStorage.clear();
          return navigate("/login");
        }

        const role = localStorage.getItem("user_role");
        if (role === "super_administrador") {
          return navigate("/administrador-conexiones");
        }

        setUserName(decoded.nombre || decoded.usuario || "");

        const { data } = await chatApi.post(
          "stripe_plan/obtenerSuscripcionActiva",
          { id_usuario: decoded.id_usuario },
        );

        const plan = data?.plan;
        if (!plan) return navigate("/planes");

        if (Number(plan.permanente) === 1) {
          setToolsAccess("both");
          setPlanName("Plan Permanente");
          return;
        }

        const estado = (plan.estado || "").toLowerCase();

        if (["activo", "trial_usage", "promo_usage"].includes(estado)) {
          setToolsAccess(plan.tools_access || "both");
          setPlanName(plan.nombre_plan || "");
          return;
        }

        return navigate("/planes");
      } catch (err) {
        console.error("Error cargando plan:", err);
        setToolsAccess("both");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  const canImporChat = toolsAccess === "imporchat" || toolsAccess === "both";
  const canInstaLanding =
    toolsAccess === "insta_landing" || toolsAccess === "both";

  if (loading) {
    return (
      <div
        className="min-h-screen grid place-items-center"
        style={{ background: "#0B1426" }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "#00BFFF44", borderTopColor: "transparent" }}
          />
          <p className="text-sm text-slate-500">Preparando tu espacio…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-14"
      style={{ background: "#0B1426" }}
    >
      {/* ── Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            top: "-18%",
            right: "-12%",
            background:
              "radial-gradient(circle, rgba(0,191,255,.07), transparent 55%)",
            filter: "blur(70px)",
            animation: "orbDrift 26s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            bottom: "-14%",
            left: "-10%",
            background:
              "radial-gradient(circle, rgba(16,185,129,.06), transparent 55%)",
            filter: "blur(60px)",
            animation: "orbDrift 32s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute top-0 left-1/2 w-px h-full opacity-[0.035]"
          style={{
            background:
              "linear-gradient(to bottom, transparent, #00BFFF, transparent)",
            transform: "rotate(12deg)",
            transformOrigin: "top center",
          }}
        />
      </div>

      <style>{`
        @keyframes orbDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-20px, 12px) scale(1.02); }
          66% { transform: translate(12px, -16px) scale(.98); }
        }
      `}</style>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="relative z-10 text-center mb-10 sm:mb-14"
      >
        {userName && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-[13px] text-slate-500 mb-2"
          >
            Bienvenido,{" "}
            <span className="text-slate-300 font-semibold">{userName}</span>
          </motion.p>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-white tracking-[-0.03em] leading-tight">
          ¿Qué herramienta
          <br />
          <span style={{ color: "#00BFFF" }}>vamos a usar</span> hoy?
        </h1>
        {/* <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-4 flex items-center justify-center gap-2.5"
        >
          <span
            className="px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
            style={{
              color: "#00BFFF",
              background: "rgba(0,191,255,.08)",
              border: "1px solid rgba(0,191,255,.15)",
            }}
          >
            {planName}
          </span>
          <span className="text-slate-600 text-[10px]">·</span>
          <button
            onClick={() => navigate("/planes")}
            className="text-[10px] text-slate-500 hover:text-slate-300 transition underline underline-offset-2 decoration-slate-600"
          >
            Cambiar plan
          </button>
        </motion.div> */}
      </motion.div>

      {/* ── Cards ── */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-[860px]">
        <ToolCard
          title="ImporChat"
          tagline="Agente AI de Ventas por WhatsApp"
          description="Responde automáticamente 24/7 por WhatsApp, Messenger e Instagram. Gestiona conversaciones, automatiza seguimientos y cierra ventas mientras duermes."
          badges={["WhatsApp API", "Multi-canal", "Bot IA 24/7", "CRM"]}
          stats={[
            { value: "24/7", label: "Activo" },
            { value: "3", label: "Canales" },
            { value: "∞", label: "Mensajes" },
          ]}
          accent="#00BFFF"
          locked={!canImporChat}
          lockedLabel="Disponible en Pro Ecosistema"
          delay={0.08}
          onClick={() => navigate("/conexiones")}
          icon={
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00BFFF"
              strokeWidth="1.6"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              <circle cx="9" cy="10" r="1" fill="#00BFFF" />
              <circle cx="12" cy="10" r="1" fill="#00BFFF" />
              <circle cx="15" cy="10" r="1" fill="#00BFFF" />
            </svg>
          }
        />

        <ToolCard
          title="Insta Landing"
          tagline="Banners & Landing Pages con AI"
          description="Genera banners profesionales y landing pages optimizadas en segundos. Contenido visual que vende, potenciado por inteligencia artificial generativa."
          badges={["Generador AI", "120+ / mes", "10 secciones", "Dropi"]}
          stats={[
            { value: "120+", label: "Banners" },
            { value: "10", label: "Secciones" },
            { value: "AI", label: "Designer Pro" },
          ]}
          accent="#10B981"
          locked={!canInstaLanding}
          lockedLabel="Disponible en Pro Ecosistema"
          delay={0.2}
          onClick={() => navigate("/insta_landing")}
          icon={
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#10B981"
              strokeWidth="1.6"
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          }
        />
      </div>

      {/* ── Footer ── */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="relative z-10 mt-12"
      >
        <p className="text-[10px] text-slate-600">
          Imporfactory © {new Date().getFullYear()}
        </p>
      </motion.footer>
    </div>
  );
}
