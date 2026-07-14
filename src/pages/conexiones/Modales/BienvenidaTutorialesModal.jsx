import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import chatApi from "../../../api/chatcenter";

/**
 * Guía de bienvenida para cuentas nuevas en Conexiones (coach-mark en 2 pasos):
 *  Paso 1: spotlight sobre el botón ☰ del header + tarjeta a la izquierda.
 *  Paso 2: al abrir el menú, el spotlight y la flecha "viajan" hasta el botón
 *          Tutoriales del menú ("🎯 ¡Aquí es!"); tocarlo navega de verdad.
 * Reutiliza la preferencia del tour antiguo:
 * usuarios_chat_center/tour-conexiones/get|set (tour_conexiones_dismissed).
 * Se muestra en cada visita hasta que el cliente marque "No volver a mostrar".
 */
export default function BienvenidaTutorialesModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 = señala ☰, 2 = señala Tutoriales
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [idUsuario, setIdUsuario] = useState(null);
  const [anchorMenu, setAnchorMenu] = useState(null); // rect del ☰
  const [anchorTut, setAnchorTut] = useState(null); // rect del botón Tutoriales

  /* ── Leer preferencia ── */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const id_usuario = jwtDecode(token)?.id_usuario;
        if (!id_usuario) return;
        setIdUsuario(id_usuario);

        const { data } = await chatApi.post(
          "usuarios_chat_center/tour-conexiones/get",
          { id_usuario },
        );
        const dismissed = Number(data?.tour_conexiones_dismissed) === 1;
        if (!cancel && !dismissed) {
          // pequeño delay para no chocar con el splash de bienvenida
          setTimeout(() => !cancel && setOpen(true), 900);
        }
      } catch (e) {
        // sin preferencia legible no molestamos al usuario
        console.error("BienvenidaTutoriales: no se pudo leer preferencia", e);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const rectOf = (selector, { checkVisible = false } = {}) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return null; // sin tamaño
    if (checkVisible) {
      // El menú colapsa con w-0 + overflow-hidden: el botón conserva su
      // tamaño aunque esté clipeado. La única prueba fiable es preguntar
      // qué elemento vive realmente en el centro del botón. La propia guía
      // puede estar encima (su tarjeta captura clics), así que la ocultamos
      // un instante durante el hit-test — es síncrono, no alcanza a pintarse.
      const guideRoot = document.getElementById("bvt-guide-root");
      const prevDisplay = guideRoot ? guideRoot.style.display : null;
      if (guideRoot) guideRoot.style.display = "none";
      const hit = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2,
      );
      if (guideRoot) guideRoot.style.display = prevDisplay || "";
      if (!hit || (hit !== el && !el.contains(hit))) return null;
    }
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  };

  /* ── Medir anclas (☰ siempre; Tutoriales si el menú está abierto) ── */
  const measure = useCallback(() => {
    setAnchorMenu(rectOf('[data-tour="hamburger"]'));
    setAnchorTut(rectOf('[data-tour="tutoriales"]', { checkVisible: true }));
  }, []);

  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, measure]);

  /* ── Reaccionar a los clics del usuario:
        · en el ☰ o dentro del menú → re-medimos al terminar la animación
          (~300ms) y avanzamos/retrocedemos entre paso 1 y 2;
        · en la propia guía → nada (sus botones tienen su lógica);
        · en CUALQUIER otra parte → la guía se oculta por esta visita
          (sin persistir: solo el checkbox "No volver a mostrar" persiste).
        Escape cierra el menú → re-sincroniza (vuelve al paso 1). ── */
  useEffect(() => {
    if (!open) return;
    let t;
    const resync = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const tut = rectOf('[data-tour="tutoriales"]', { checkVisible: true });
        setAnchorTut(tut);
        setStep(tut ? 2 : 1);
      }, 450);
    };
    const onDocClick = (e) => {
      const el = e.target instanceof Element ? e.target : null;
      const enGuia = el?.closest?.("#bvt-guide-root");
      const enMenu = el?.closest?.(
        '[data-tour="hamburger"], [data-tour="sidebar"]',
      );
      if (enMenu) return resync();
      if (enGuia) return;
      setOpen(false); // clic fuera: se oculta, sin obligar a "no mostrar"
    };
    const onKey = (e) => e.key === "Escape" && resync();
    document.addEventListener("click", onDocClick, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", onDocClick, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const persistIfChecked = async () => {
    if (!dontShowAgain || !idUsuario) return;
    try {
      await chatApi.post("usuarios_chat_center/tour-conexiones/set", {
        id_usuario: idUsuario,
        tour_conexiones_dismissed: 1,
      });
    } catch (e) {
      console.error("BienvenidaTutoriales: no se pudo guardar", e);
    }
  };

  const handleClose = async () => {
    await persistIfChecked();
    setOpen(false);
  };

  const handleVerTutoriales = async () => {
    await persistIfChecked();
    setOpen(false);
    navigate("/tutoriales");
  };

  if (!open) return null;

  const showStep2 = step === 2 && anchorTut;
  const target = showStep2 ? anchorTut : anchorMenu;

  // Tarjeta del paso 1: colgando bajo el ☰, pegada a la izquierda
  const card1Top = anchorMenu ? anchorMenu.top + anchorMenu.height + 52 : null;
  const card1Left = anchorMenu ? Math.max(12, anchorMenu.left - 6) : null;

  // Callout del paso 2: a la derecha del botón Tutoriales
  const calloutLeft = showStep2
    ? Math.min(anchorTut.left + anchorTut.width + 46, window.innerWidth - 292)
    : 0;
  const calloutTop = showStep2
    ? Math.max(12, anchorTut.top + anchorTut.height / 2 - 78)
    : 0;

  return (
    // pointer-events-none: el usuario SÍ puede tocar el ☰ y el menú real;
    // solo las tarjetas de la guía capturan clics.
    <div
      id="bvt-guide-root"
      className="fixed inset-0 z-[1200] pointer-events-none"
    >
      <style>{`
        @keyframes bvt-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes bvt-slide { from { opacity: 0; transform: translateX(-28px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes bvt-rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes bvt-bounce { 0%,100% { transform: translateY(7px) } 50% { transform: translateY(-5px) } }
        @keyframes bvt-bounce-x { 0%,100% { transform: translateX(7px) } 50% { transform: translateX(-5px) } }
        @keyframes bvt-ping { 0% { transform: scale(1); opacity: .9 } 100% { transform: scale(1.6); opacity: 0 } }
        @keyframes bvt-wave { 0%,60%,100% { transform: rotate(0) } 10%,30% { transform: rotate(16deg) } 20%,40% { transform: rotate(-8deg) } }
        @keyframes bvt-pop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.08) } 100% { transform: scale(1); opacity: 1 } }
        .bvt-item { opacity: 0; animation: bvt-rise .4s ease-out forwards; }
        .bvt-spot { transition: top .45s cubic-bezier(.22,1,.36,1), left .45s cubic-bezier(.22,1,.36,1), width .45s cubic-bezier(.22,1,.36,1), height .45s cubic-bezier(.22,1,.36,1), border-radius .45s; }
      `}</style>

      {/* Spotlight que "viaja" del ☰ al botón Tutoriales */}
      {target ? (
        <div
          className="bvt-spot fixed pointer-events-none"
          style={{
            top: target.top - 8,
            left: target.left - 8,
            width: target.width + 16,
            height: target.height + 16,
            borderRadius: showStep2 ? 14 : 999,
            boxShadow: "0 0 0 9999px rgba(7,11,20,0.68)",
            animation: "bvt-fade .35s ease-out both",
          }}
        >
          <span
            className="absolute inset-0 ring-2 ring-indigo-300/90"
            style={{
              borderRadius: "inherit",
              animation: "bvt-ping 1.7s ease-out infinite",
            }}
          />
          <span
            className="absolute inset-0 ring-2 ring-white/70"
            style={{
              borderRadius: "inherit",
              animation: "bvt-ping 1.7s ease-out .5s infinite",
            }}
          />
          <span
            className="absolute inset-0 ring-2 ring-white/90"
            style={{ borderRadius: "inherit" }}
          />
        </div>
      ) : (
        <div
          className="absolute inset-0 bg-[#070b14]/70 backdrop-blur-[2px]"
          style={{ animation: "bvt-fade .35s ease-out both" }}
        />
      )}

      {/* ══════════ PASO 1 — señala el ☰ ══════════ */}
      {!showStep2 && anchorMenu && (
        <div
          className="fixed pointer-events-none text-white"
          style={{
            top: anchorMenu.top + anchorMenu.height + 10,
            left: anchorMenu.left + anchorMenu.width / 2 - 16,
            animation: "bvt-fade .4s ease-out .25s both",
          }}
        >
          <i
            className="bx bx-up-arrow-alt text-4xl drop-shadow-[0_2px_8px_rgba(99,102,241,.8)]"
            style={{
              display: "inline-block",
              animation: "bvt-bounce 1.1s ease-in-out infinite",
            }}
          />
        </div>
      )}

      {!showStep2 && (
        <div
          className="fixed w-[340px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          style={{
            top: card1Top ?? "50%",
            left: card1Left ?? "50%",
            transform: anchorMenu ? "none" : "translate(-50%, -50%)",
            animation: "bvt-slide .45s cubic-bezier(.22,1,.36,1) .15s both",
          }}
        >
          {/* Cabecera navy de marca */}
          <div className="relative bg-gradient-to-br from-[#0a1a36] via-[#102a5c] to-[#1e4fd6] px-5 pt-4 pb-5">
            <button
              onClick={handleClose}
              className="absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Cerrar"
            >
              <i className="bx bx-x text-lg" />
            </button>
            <div className="flex items-center gap-2.5">
              <span
                className="text-2xl"
                style={{
                  display: "inline-block",
                  transformOrigin: "70% 70%",
                  animation: "bvt-wave 2.2s ease-in-out .6s infinite",
                }}
              >
                👋
              </span>
              <div>
                <h3 className="text-[15px] font-bold tracking-tight text-white leading-tight">
                  ¡Bienvenido a ImporChat!
                </h3>
                <p className="text-[11.5px] text-white/65 leading-snug">
                  Te enseñamos por dónde empezar.
                </p>
              </div>
            </div>
          </div>

          {/* Cuerpo con pasos (entrada escalonada) */}
          <div className="px-4 py-4 space-y-2.5">
            <div
              className="bvt-item flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5"
              style={{ animationDelay: ".35s" }}
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1d4ed8] text-white text-[11px] font-bold">
                1
              </span>
              <p className="text-[12.5px] leading-snug text-slate-600">
                Toca el <b className="text-slate-800">menú</b>{" "}
                <i className="bx bx-menu align-middle text-slate-800" /> que
                está brillando aquí arriba.
              </p>
            </div>

            <div
              className="bvt-item flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5"
              style={{ animationDelay: ".5s" }}
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1d4ed8] text-white text-[11px] font-bold">
                2
              </span>
              <p className="text-[12.5px] leading-snug text-slate-600">
                Entra a{" "}
                <b className="text-slate-800">
                  <i className="bx bx-play-circle align-middle" /> Tutoriales
                </b>
                : videos paso a paso para conectar tu WhatsApp Business y
                conocer el sistema de forma completa.
              </p>
            </div>

            <button
              onClick={handleVerTutoriales}
              className="bvt-item group flex w-full items-center gap-3 rounded-xl border-2 border-[#1d4ed8] bg-gradient-to-r from-[#eff6ff] to-white p-3 text-left transition-all duration-200 hover:shadow-md hover:shadow-[#1d4ed8]/15"
              style={{ animationDelay: ".65s" }}
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1d4ed8] text-white shadow-sm">
                <i className="bx bx-play-circle text-lg" />
              </span>
              <span className="flex-1">
                <span className="block text-[13px] font-bold text-[#171931]">
                  Llévame directo
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-4 text-slate-500">
                  Sin tour: abrir tutoriales ahora.
                </span>
              </span>
              <i className="bx bx-chevron-right text-xl text-[#1d4ed8] transition-transform group-hover:translate-x-1" />
            </button>

            <div
              className="bvt-item flex items-center justify-between gap-2 pt-0.5"
              style={{ animationDelay: ".8s" }}
            >
              <label className="flex items-center gap-1.5 text-[11.5px] text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#1d4ed8]"
                />
                No volver a mostrar
              </label>
              <button
                onClick={handleClose}
                className="text-[11.5px] font-medium text-slate-400 transition-colors hover:text-slate-600"
              >
                Explorar por mi cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ PASO 2 — ¡aquí es! señala Tutoriales ══════════ */}
      {showStep2 && (
        <>
          {/* Flecha rebotando hacia el botón (desde la derecha) */}
          <div
            className="fixed pointer-events-none text-white"
            style={{
              top: anchorTut.top + anchorTut.height / 2 - 22,
              left: anchorTut.left + anchorTut.width + 8,
              animation: "bvt-fade .3s ease-out .15s both",
            }}
          >
            <i
              className="bx bx-left-arrow-alt text-4xl drop-shadow-[0_2px_8px_rgba(99,102,241,.8)]"
              style={{
                display: "inline-block",
                animation: "bvt-bounce-x 1s ease-in-out infinite",
              }}
            />
          </div>

          {/* Callout "¡Aquí es!" */}
          <div
            className="fixed w-[280px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              top: calloutTop,
              left: calloutLeft,
              animation: "bvt-pop .4s cubic-bezier(.22,1,.36,1) .2s both",
            }}
          >
            <div className="bg-gradient-to-br from-[#0a1a36] via-[#102a5c] to-[#1e4fd6] px-4 pt-3.5 pb-4">
              <div className="flex items-center gap-2">
                <span
                  className="text-xl"
                  style={{
                    display: "inline-block",
                    animation:
                      "bvt-pop .5s cubic-bezier(.22,1,.36,1) .45s both",
                  }}
                >
                  🎯
                </span>
                <h3 className="text-[14px] font-bold tracking-tight text-white">
                  ¡Aquí es!
                </h3>
              </div>
              <p className="mt-1 text-[11.5px] leading-4 text-white/70">
                Toca{" "}
                <b className="text-white">
                  <i className="bx bx-play-circle align-middle" /> Tutoriales
                </b>{" "}
                y arranca con los videos paso a paso.
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <label className="flex items-center gap-1.5 text-[11.5px] text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#1d4ed8]"
                />
                No volver a mostrar
              </label>
              <button
                onClick={handleClose}
                className="text-[11.5px] font-medium text-slate-400 transition-colors hover:text-slate-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
