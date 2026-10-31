import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Buscador, select, tarjeta } from "../ui";

/* ═══════════════════════════════════════════════════════════════════════
   Barra de herramientas común a las tres pestañas:
     [Buscador flex-1] [Ordenar por] [Por página 25/50/100] [Filtros · n]
   y el panel de filtros avanzados pegado debajo (mismo radio, borde
   continuo). El tamaño de página se recuerda en localStorage.
   ═══════════════════════════════════════════════════════════════════════ */

export const CLAVE_POR_PAGINA = "espia_por_pagina";
export const TAMANOS = [25, 50, 100];

export function usePorPagina(porDefecto = 25) {
  const [porPagina, setEstado] = useState(() => {
    const v = Number(localStorage.getItem(CLAVE_POR_PAGINA));
    return TAMANOS.includes(v) ? v : porDefecto;
  });
  const setPorPagina = useCallback((n) => {
    const v = TAMANOS.includes(Number(n)) ? Number(n) : 25;
    setEstado(v);
    try {
      localStorage.setItem(CLAVE_POR_PAGINA, String(v));
    } catch {
      /* sin localStorage */
    }
  }, []);
  return [porPagina, setPorPagina];
}

export function BarraHerramientas({ buscador, orden, porPagina, filtros, extra, panelAbierto = false, children }) {
  return (
    <div className={`${tarjeta} overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-2 p-3">
        {buscador ? <Buscador valor={buscador.valor} onChange={buscador.onChange} placeholder={buscador.placeholder} className="min-w-[220px] flex-1" /> : null}
        {extra}
        {orden ? (
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="hidden lg:inline">Ordenar por</span>
            <select className={`${select} w-auto min-w-[170px]`} value={orden.valor} onChange={(e) => orden.onChange(e.target.value)} aria-label="Ordenar por">
              {orden.opciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {porPagina ? (
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="hidden lg:inline">Por página</span>
            <select className={`${select} w-[84px]`} value={porPagina.valor} onChange={(e) => porPagina.onChange(Number(e.target.value))} aria-label="Resultados por página">
              {TAMANOS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {filtros ? (
          <button
            type="button"
            onClick={filtros.onToggle}
            aria-expanded={panelAbierto}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-bold transition ${
              panelAbierto || filtros.contador ? "border-[#0B1426] bg-[#0B1426] text-white shadow-[0_10px_24px_-10px_rgba(11,20,38,0.7)]" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <i className="bx bx-slider-alt" /> Filtros
            {filtros.contador ? <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-sky-400 px-1 text-[11px] font-extrabold text-[#0B1426]">{filtros.contador}</span> : null}
            <i className={`bx ${panelAbierto ? "bx-chevron-up" : "bx-chevron-down"} text-base`} />
          </button>
        ) : null}
      </div>
      {panelAbierto && children ? (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden border-t border-slate-100 bg-slate-50/70">
          <div className="p-4">{children}</div>
        </motion.div>
      ) : null}
    </div>
  );
}
