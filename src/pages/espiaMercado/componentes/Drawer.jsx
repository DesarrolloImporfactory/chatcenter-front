import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════════════
   Panel lateral (drawer) para los detalles: producto, tienda.
   Entra desde la derecha, fondo oscurecido con desenfoque, cierra con
   Escape, clic afuera o la X. Cabecera fija con título, subtítulo y
   acciones; cuerpo con scroll propio.
   ═══════════════════════════════════════════════════════════════════════ */
export default function Drawer({ abierto = true, titulo, subtitulo, onClose, ancho = "max-w-2xl", children, acciones, cabeceraExtra }) {
  useEffect(() => {
    if (!abierto) return undefined;
    const esc = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [abierto, onClose]);

  return createPortal(
    <AnimatePresence>
      {abierto ? (
        <motion.div
          key="fondo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[9000] flex justify-end"
          style={{ background: "rgba(3,7,18,0.55)", backdropFilter: "blur(6px)" }}
          onClick={onClose}
        >
          <motion.aside
            key="panel"
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={typeof titulo === "string" ? titulo : "Detalle"}
            className={`flex h-full w-full ${ancho} flex-col bg-white shadow-[-30px_0_80px_-30px_rgba(0,0,0,0.6)] sm:my-3 sm:mr-3 sm:h-[calc(100%-1.5rem)] sm:rounded-[24px]`}
          >
            <header className="relative shrink-0 overflow-hidden rounded-t-[24px] px-5 pb-4 pt-5 text-white sm:px-6" style={{ background: "linear-gradient(135deg, #0B1426 0%, #13244a 100%)" }}>
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.14]"
                style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[17px] font-extrabold leading-6" title={typeof titulo === "string" ? titulo : undefined}>
                    {titulo}
                  </h3>
                  {subtitulo ? <p className="mt-0.5 truncate text-[12px] text-slate-300">{subtitulo}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {acciones}
                  <button
                    type="button"
                    onClick={onClose}
                    className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-slate-200 ring-1 ring-white/15 transition hover:bg-white/20 hover:text-white"
                    aria-label="Cerrar panel"
                  >
                    <i className="bx bx-x text-2xl" />
                  </button>
                </div>
              </div>
              {cabeceraExtra ? <div className="relative mt-3">{cabeceraExtra}</div> : null}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
