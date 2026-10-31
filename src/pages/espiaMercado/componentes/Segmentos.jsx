import { motion } from "framer-motion";
import { fmtCorto } from "../ui";

/* ═══════════════════════════════════════════════════════════════════════
   Control segmentado para las pestañas: el segmento activo es una píldora
   navy que se desliza; cada uno lleva ícono, nombre y contador.
   ═══════════════════════════════════════════════════════════════════════ */
export default function Segmentos({ opciones, valor, onChange, className = "" }) {
  return (
    <div role="tablist" aria-label="Secciones" className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100/80 p-1 ${className}`}>
      {opciones.map((o) => {
        const activo = o.id === valor;
        return (
          <button
            key={o.id}
            role="tab"
            type="button"
            aria-selected={activo}
            onClick={() => onChange(o.id)}
            className={`relative inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${activo ? "text-white" : "text-slate-600 hover:text-slate-900"}`}
          >
            {activo ? (
              <motion.span
                layoutId="segmento-activo"
                className="absolute inset-0 rounded-xl bg-[#0B1426] shadow-[0_10px_24px_-10px_rgba(11,20,38,0.8)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <i className={`bx ${o.icon} relative text-lg ${activo ? "text-sky-300" : "text-slate-400"}`} />
            <span className="relative">{o.label}</span>
            {o.count !== undefined && o.count !== null ? (
              <span className={`relative rounded-full px-2 py-0.5 text-[11px] font-extrabold tabular-nums ${activo ? "bg-white/15 text-sky-100" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
                {fmtCorto(o.count)}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
