import { fmtHastaImporblack } from "./imporblack";

/**
 * Distintivo negro «IMPORBLACK» para la cabecera del chat, el panel del
 * cliente y la ficha de la cartera. `hasta` (AAAA-MM-DD) solo va al tooltip.
 */
export default function InsigniaImporblack({ hasta = null, className = "" }) {
  const fecha = fmtHastaImporblack(hasta);
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-[#0b0b0b] px-2 py-0.5 text-[10px] font-bold uppercase leading-4 tracking-wider text-white shadow-sm ${className}`}
      title={`Cliente ImporBlack${fecha ? ` · vigente hasta el ${fecha}` : ""}`}
    >
      ImporBlack
    </span>
  );
}
