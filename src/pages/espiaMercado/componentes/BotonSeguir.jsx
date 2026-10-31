import { useState } from "react";
import chatApi from "../../../api/chatcenter";
import { btnChico, textoError } from "../ui";

/* ═══════════════════════════════════════════════════════════════════════
   Seguir / dejar de seguir (producto o tienda). Variante «estrella» para
   filas y tarjetas, variante con texto para cabeceras de detalle.
   Lo seguido entra al reporte diario.
   ═══════════════════════════════════════════════════════════════════════ */
/* `objetivo` = dropi_product_id o dominio (no se llama `ref`: React se lo quedaría). */
export default function BotonSeguir({ tipo, objetivo: refId, pais, seguida, onCambio, variante = "estrella", claro = false }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);
  const esta = !!seguida;

  const toggle = async (e) => {
    e?.stopPropagation?.();
    if (ocupado) return;
    setOcupado(true);
    setError(null);
    try {
      const { data } = await chatApi.post("/espia/seguir", { tipo, ref: String(refId), pais });
      onCambio?.(!!data?.data?.seguida);
    } catch (err) {
      setError(textoError(err));
      setTimeout(() => setError(null), 3500);
    } finally {
      setOcupado(false);
    }
  };

  const titulo = esta ? "Dejar de seguir" : tipo === "tienda" ? "Seguir: entra al reporte diario cuando lance anuncios nuevos" : "Seguir: entra al reporte diario";

  if (variante === "estrella") {
    return (
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={toggle}
          disabled={ocupado}
          title={titulo}
          aria-label={titulo}
          aria-pressed={esta}
          className={`grid h-8 w-8 place-items-center rounded-full text-lg transition ${
            esta
              ? "bg-amber-50 text-amber-500 hover:bg-amber-100"
              : claro
                ? "text-slate-300 hover:bg-white/10 hover:text-amber-300"
                : "text-slate-300 hover:bg-slate-100 hover:text-amber-500"
          } disabled:opacity-50`}
        >
          <i className={`bx ${ocupado ? "bx-loader-alt animate-spin" : esta ? "bxs-star" : "bx-star"}`} />
        </button>
        {error ? <span className="absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-md bg-rose-600 px-2 py-1 text-[10px] font-bold text-white shadow">{error}</span> : null}
      </span>
    );
  }

  return (
    <span className="relative inline-flex flex-col items-end">
      <button
        type="button"
        onClick={toggle}
        disabled={ocupado}
        title={titulo}
        aria-pressed={esta}
        className={`${btnChico} ${
          claro
            ? esta
              ? "border border-amber-300/40 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25"
              : "border border-white/15 bg-white/10 text-white hover:bg-white/20"
            : esta
              ? "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        <i className={`bx ${ocupado ? "bx-loader-alt animate-spin" : esta ? "bxs-star" : "bx-star"}`} /> {esta ? "Siguiendo" : "Seguir"}
      </button>
      {error ? <span className="mt-1 text-[10px] text-rose-500">{error}</span> : null}
    </span>
  );
}
