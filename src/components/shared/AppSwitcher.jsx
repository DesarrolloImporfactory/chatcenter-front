import { useEffect, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";

const IMPORSUIT_URL =
  import.meta.env.VITE_IMPORSUIT_URL || "https://new.imporsuitpro.com";

/**
 * App Switcher al estilo AWS Service Switcher.
 * Muestra las apps disponibles y permite saltar a Imporsuit (PHP) sin
 * volver a iniciar sesión — la sesión PHP en .imporsuitpro.com sigue viva.
 *
 * Si el usuario no tiene cuenta en imporsuit (no existe en users por email/usuario),
 * la tarjeta aparece bloqueada.
 */
export default function AppSwitcher() {
  const [open, setOpen] = useState(false);
  const [hasImporsuit, setHasImporsuit] = useState(null); // null = cargando
  const wrapRef = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Cargar el estado de cross-app la primera vez que se abre el menú
  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    chatApi
      .get("/auth/cross-app-status", { silentError: true })
      .then(({ data }) => {
        setHasImporsuit(Boolean(data?.hasImporsuit));
      })
      .catch(() => {
        // fail-open: si el endpoint falla, permitimos navegar (mejor UX)
        setHasImporsuit(true);
      });
  }, [open]);

  const goImporsuit = () => {
    if (hasImporsuit === false) return;
    window.location.href = `${IMPORSUIT_URL.replace(/\/$/, "")}/dashboard/home`;
  };

  const importsuitBlocked = hasImporsuit === false;
  const importsuitLoading = hasImporsuit === null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Cambiar de aplicación"
        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-semibold transition ${
          open
            ? "bg-white/20 text-white"
            : "bg-white/10 text-white/90 hover:bg-white/15"
        }`}
      >
        <span
          aria-hidden="true"
          className="grid grid-cols-3 grid-rows-3 gap-[2px]"
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="block w-[4px] h-[4px] rounded-[1px] bg-current"
            />
          ))}
        </span>
        <span className="hidden sm:inline">Apps</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 mt-2 w-[340px] max-w-[calc(100vw-32px)] bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl p-2.5 z-[60]"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2.5 pt-1.5 pb-2.5">
            Tus aplicaciones
          </div>

          {importsuitBlocked ? (
            <div
              className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 opacity-60 cursor-not-allowed"
              role="menuitem"
              aria-disabled="true"
              title="No tienes cuenta de ImporSuit asociada a este correo"
            >
              <span
                className="w-[38px] h-[38px] rounded-xl grid place-items-center text-slate-400 text-xl flex-shrink-0"
                style={{ background: "#e5e7eb" }}
              >
                <i className="bx bxs-lock-alt" />
              </span>
              <span className="flex flex-col gap-[2px] flex-1 min-w-0">
                <span className="text-sm font-bold text-slate-700">
                  ImporSuit
                </span>
                <span className="text-[11px] text-slate-500 leading-snug">
                  Sin cuenta asociada a tu correo
                </span>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={goImporsuit}
              disabled={importsuitLoading}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 transition text-left disabled:opacity-60"
              role="menuitem"
            >
              <span
                className="w-[38px] h-[38px] rounded-xl grid place-items-center text-white text-xl flex-shrink-0"
                style={{ background: "#171931" }}
              >
                <i className="bx bxs-store" />
              </span>
              <span className="flex flex-col gap-[2px] flex-1 min-w-0">
                <span className="text-sm font-bold text-slate-900">
                  ImporSuit
                </span>
                <span className="text-[11px] text-slate-500 leading-snug">
                  {importsuitLoading
                    ? "Verificando acceso…"
                    : "Cotizador, cursos, importaciones"}
                </span>
              </span>
              <i className="bx bx-right-arrow-alt text-2xl text-slate-400 flex-shrink-0" />
            </button>
          )}

          <div
            className="mt-1 flex items-center gap-3 p-2.5 rounded-xl bg-slate-50"
            role="menuitem"
            aria-current="true"
          >
            <span
              className="w-[38px] h-[38px] rounded-xl grid place-items-center text-white text-xl flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#3b82f6,#22d3ee)" }}
            >
              <i className="bx bxs-chat" />
            </span>
            <span className="flex flex-col gap-[2px] flex-1 min-w-0">
              <span className="text-sm font-bold text-slate-900">
                ImporChat
              </span>
              <span className="text-[11px] text-slate-500 leading-snug">
                WhatsApp, Instagram, Messenger con IA
              </span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-[3px] rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">
              Activo
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
