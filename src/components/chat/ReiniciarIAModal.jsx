import { useEffect } from "react";

/* Confirmación para reiniciar lo que la IA recuerda de un contacto.

   Es un modal propio y no un Swal: los de la vista de Conexiones se ven como el
   resto de la app —tarjeta blanca, ring slate, ícono en su cuadro— y el de Swal
   metía su propio tipografía, su ícono gigante y un montón de aire para decir
   dos líneas. */
export default function ReiniciarIAModal({ abierto, cargando, onCancelar, onAceptar }) {
  useEffect(() => {
    if (!abierto) return;
    const alTecla = (e) => {
      if (e.key === "Escape" && !cargando) onCancelar();
      if (e.key === "Enter" && !cargando) onAceptar();
    };
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [abierto, cargando, onCancelar, onAceptar]);

  if (!abierto) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[999] bg-slate-950/60 backdrop-blur-sm"
        onClick={() => !cargando && onCancelar()}
      />
      <div className="fixed inset-0 z-[1000] grid place-items-center px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-[0_30px_80px_rgba(2,6,23,.35)]">
          <div className="flex items-start gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 ring-1 ring-indigo-200">
              <i className="bx bx-refresh text-2xl text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold text-slate-900">
                Empezar conversación desde 0
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                La IA olvida lo hablado con este contacto y vuelve a atenderlo
                desde el estado inicial.
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-emerald-700">
                <i className="bx bx-check-shield text-base" />
                Los mensajes del chat no se borran
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelar}
              disabled={cargando}
              className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onAceptar}
              disabled={cargando}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {cargando && (
                <i className="bx bx-loader-alt animate-spin text-base" />
              )}
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
