import { TOKENS } from "../ui";

/* ═══════════════════════════════════════════════════════════════════════
   Tile de indicador para el hero oscuro. Etiqueta pequeña en mayúsculas,
   valor grande, texto secundario y, si aplica, punto «en vivo».
   ═══════════════════════════════════════════════════════════════════════ */
export default function KpiTile({ label, valor, sub, icono, live = false, tono = "sky", cargando = false, onClick, title }) {
  const colores = {
    sky: TOKENS.sky,
    cyan: TOKENS.cyan,
    verde: TOKENS.verde,
    ambar: TOKENS.ambar,
    rosa: TOKENS.rosa,
    blanco: "#ffffff",
  };
  const c = colores[tono] || TOKENS.sky;
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      className={`group relative flex min-h-[96px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-left backdrop-blur-sm transition ${
        onClick ? "cursor-pointer hover:border-white/20 hover:bg-white/[0.09]" : ""
      }`}
    >
      <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40" style={{ background: c }} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300/90">{label}</span>
        {live ? (
          <span className="relative flex h-2 w-2" aria-label="En vivo">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: TOKENS.verde }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: TOKENS.verde }} />
          </span>
        ) : icono ? (
          <i className={`bx ${icono} text-lg`} style={{ color: c }} />
        ) : null}
      </div>
      <div>
        {cargando ? (
          <div className="mt-1 h-8 w-24 animate-pulse rounded-lg bg-white/10" />
        ) : (
          <div className="mt-1 text-[26px] font-extrabold leading-none tracking-tight text-white sm:text-[28px]" style={{ fontVariantNumeric: "tabular-nums" }}>
            {valor}
          </div>
        )}
        {sub ? <div className="mt-1.5 truncate text-[12px] text-slate-400">{sub}</div> : null}
      </div>
    </Comp>
  );
}
