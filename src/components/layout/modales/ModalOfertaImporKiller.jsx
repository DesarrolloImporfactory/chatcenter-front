import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import chatApi from "../../../api/chatcenter";
import { comprarAddon } from "../../../pages/facturacion/addons";
import { URL_EXTENSION_ZIP } from "../../../pages/espiaMercado/ui";

/* ═══════════════════════════════════════════════════════════════════════
   Oferta del complemento ImporKiller (pedido 2026-11-11, tras la clase donde
   se mostró la herramienta).

   Sale SIEMPRE que entra el administrador de una cuenta con suscripción viva
   que todavía no tiene el complemento (lo decide el back en
   GET /onboarding/imporkiller), hasta que lo compra o pulsa «No volver a
   mostrar». La X, Escape y el clic afuera solo lo cierran en esa carga de la
   página: al volver a entrar o recargar sale otra vez (no se guarda nada).

   Salidas:
     · Obtenerlo ahora     → comprarAddon('imporkiller'): se suma al plan con
                             la tarjeta guardada, igual que comprarlo desde
                             /complementos o desde la herramienta. En prueba
                             no cobra hoy. Si el banco pide verificación (3DS)
                             se va a la página de pago de Stripe.
     · No volver a mostrar → nunca más (por cuenta).

   Diseño: a la izquierda la oferta (titular, tres pruebas, precio, botón); a
   la derecha un «escenario» con lo que el cliente va a ver: la tarjeta de
   Dropi con la capa de ventas y un anuncio de Meta descargable. Las cifras
   son de muestra y lo dice.

   El precio va escrito en el botón a propósito: es un cobro con un clic y
   quien lo pulsa tiene que saber cuánto y cuándo (menos reclamos al banco).
   ═══════════════════════════════════════════════════════════════════════ */

const CIAN = "#22d3ee";
const VERDE = "#34d399";

const PRUEBAS = [
  "Ventas de 24 h, 7 y 30 días dentro de Dropi",
  "Anuncios ganadores de Meta, listos para descargar",
  "Qué tiendas están pautando cada producto",
];

function limpiarNombre(n) {
  const t = document.createElement("textarea");
  t.innerHTML = String(n || "");
  return t.value.trim();
}

/* Número que sube hasta su valor: le da vida a la maqueta. */
function Contador({ hasta, duracion = 1400, retraso = 500 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    let inicio = null;
    const paso = (t) => {
      if (inicio === null) inicio = t;
      const p = Math.min(1, Math.max(0, (t - inicio - retraso) / duracion));
      setV(Math.round(hasta * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [hasta, duracion, retraso]);
  return <>{v.toLocaleString("es-EC")}</>;
}

const BARRAS = [22, 26, 24, 31, 35, 33, 44, 48, 46, 58, 64, 62, 78, 92];

/* Escenario: la tarjeta de Dropi con la capa de ImporKiller y, encima, un
   anuncio de la Biblioteca de Meta. */
function Escenario() {
  return (
    <div className="relative mx-auto h-[400px] w-full max-w-[380px]">
      {/* halo */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0) 65%)" }}
      />

      {/* Tarjeta de Dropi + capa de ventas */}
      <motion.div
        initial={{ opacity: 0, y: 26, rotate: -5 }}
        animate={{ opacity: 1, y: 0, rotate: -3 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 160, damping: 18 }}
        className="absolute bottom-7 left-0 w-[270px] rounded-[20px] bg-white p-3 text-[#0B1426] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.85)]"
      >
        <div
          className="relative grid h-[92px] place-items-center overflow-hidden rounded-xl"
          style={{ background: "linear-gradient(135deg, #e0f2fe 0%, #f1f5f9 55%, #cffafe 100%)" }}
        >
          <i className="bx bx-package text-[44px] text-sky-400/70" />
          <span className="absolute left-2 top-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-slate-500">
            Catálogo Dropi
          </span>
        </div>
        <div className="mt-2.5 h-2.5 w-[70%] rounded-full bg-slate-200" />
        <div className="mt-1.5 h-2 w-[42%] rounded-full bg-slate-100" />

        <div className="mt-3 rounded-xl p-3 text-white" style={{ background: "linear-gradient(160deg, #0B1426 0%, #10305c 100%)" }}>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: CIAN }}>
              <i className="bx bx-radar text-[13px]" /> ImporKiller
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold" style={{ background: "rgba(52,211,153,0.16)", color: VERDE }}>
              <i className="bx bx-trending-up text-[12px]" /> +32 %
            </span>
          </div>
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <div>
              <div className="text-[30px] font-extrabold leading-none tracking-tight">
                <Contador hasta={1284} />
              </div>
              <div className="mt-1 text-[10.5px] text-slate-300">ventas en 30 días</div>
            </div>
            <div className="flex h-[46px] items-end gap-[3px]" aria-hidden="true">
              {BARRAS.map((h, i) => (
                <motion.span
                  key={i}
                  className="w-[5px] rounded-t-sm"
                  style={{ background: i >= BARRAS.length - 4 ? CIAN : "rgba(125,211,252,0.45)" }}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: 0.5 + i * 0.05, duration: 0.5, ease: "easeOut" }}
                />
              ))}
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-center">
            <div className="rounded-lg bg-white/10 py-1">
              <div className="text-[13px] font-extrabold">74</div>
              <div className="text-[9.5px] text-slate-300">últimas 24 h</div>
            </div>
            <div className="rounded-lg bg-white/10 py-1">
              <div className="text-[13px] font-extrabold">385</div>
              <div className="text-[9.5px] text-slate-300">últimos 7 días</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Anuncio de Meta */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotate: 8 }}
        animate={{ opacity: 1, y: [0, -6, 0], rotate: 4 }}
        transition={{
          opacity: { delay: 0.55, duration: 0.4 },
          rotate: { delay: 0.55, type: "spring", stiffness: 160, damping: 18 },
          y: { delay: 0.9, duration: 5, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute right-0 top-0 z-10 w-[176px] rounded-[18px] bg-white p-2.5 text-[#0B1426] shadow-[0_30px_70px_-18px_rgba(0,0,0,0.9)] ring-1 ring-black/5"
      >
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <i className="bx bxl-meta text-[15px] text-[#0866ff]" /> Biblioteca de anuncios
        </div>
        <div
          className="relative mt-2 grid h-[86px] place-items-center overflow-hidden rounded-xl"
          style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 60%, #22d3ee 100%)" }}
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/25 backdrop-blur">
            <i className="bx bx-play text-[24px] text-white" />
          </span>
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-black/45 px-1.5 py-0.5 text-[9px] font-bold text-white">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: VERDE }} /> Activo 23 días
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-bold text-slate-600">12 copias</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#0B1426] px-2 py-1 text-[10px] font-extrabold text-white">
            <i className="bx bx-download text-[12px]" /> Descargar
          </span>
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-1 text-[10px] text-slate-500">Cifras de muestra</div>
    </div>
  );
}

export default function ModalOfertaImporKiller({ datos, onCerrar }) {
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(null);
  const [error, setError] = useState(null);
  // null = oferta; objeto = ya activado (pantalla de descarga).
  const [activado, setActivado] = useState(null);

  const precio = Number(datos?.precio || 10);
  const enTrial = !!datos?.en_trial;
  const nombre = limpiarNombre(datos?.nombre).split(/\s+/)[0] || "";
  const porDia = (precio / 30).toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    chatApi.post("onboarding/imporkiller/mostrado").catch(() => {});
  }, []);

  const cerrar = () => {
    if (enviando) return;
    onCerrar?.(activado ? "activado" : "cerrar");
  };

  const noMostrar = async () => {
    if (enviando) return;
    setEnviando("no_mostrar");
    try {
      await chatApi.post("onboarding/imporkiller/no-mostrar");
    } catch (_) {
      /* si falla el registro igual se cierra; volverá a salir la próxima vez */
    }
    setEnviando(null);
    onCerrar?.("no_mostrar");
  };

  const obtener = async () => {
    if (enviando) return;
    setError(null);
    setEnviando("comprar");
    try {
      const data = await comprarAddon("imporkiller", 1);
      if (data.actionRequired && data.hosted_invoice_url) {
        // El banco pide verificación: se paga en Stripe y el webhook lo activa.
        window.location.href = data.hosted_invoice_url;
        return;
      }
      window.dispatchEvent(new CustomEvent("imporkiller:activado"));
      setActivado(data);
    } catch (e) {
      if (e?.code === "NO_SUBSCRIPTION") {
        onCerrar?.("sin_suscripcion");
        navigate("/planes");
        return;
      }
      setError(e?.message || "No se pudo activar. Intenta nuevamente.");
    } finally {
      setEnviando(null);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") cerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enviando, activado]);

  const irAImporKiller = () => {
    onCerrar?.("activado");
    navigate("/imporkiller");
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99990] flex items-center justify-center px-3 py-4 sm:px-4"
        style={{ background: "rgba(3,7,18,0.8)", backdropFilter: "blur(10px)" }}
        onClick={cerrar}
      >
        <motion.div
          key="card"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ik-titulo"
          className={`relative w-full ${activado ? "max-w-[520px]" : "max-w-[940px]"} max-h-[94vh] overflow-y-auto md:overflow-hidden rounded-[28px] text-white shadow-[0_50px_140px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/10`}
          style={{ background: "linear-gradient(180deg, #0B1426 0%, #091020 100%)" }}
        >
          <button
            type="button"
            onClick={cerrar}
            disabled={!!enviando}
            className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-slate-300 ring-1 ring-white/15 transition hover:bg-white/20 hover:text-white disabled:opacity-50"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <i className="bx bx-x text-2xl" />
          </button>

          {activado ? (
            /* ─── Ya activado: que lo instale ahora mismo ─── */
            <div className="relative px-6 py-9 text-center sm:px-10">
              <span className="inline-grid h-16 w-16 place-items-center rounded-2xl ring-1 ring-white/20" style={{ background: "rgba(52,211,153,0.15)" }}>
                <i className="bx bx-check text-[40px]" style={{ color: VERDE }} />
              </span>
              <h2 id="ik-titulo" className="mt-4 text-[26px] font-extrabold leading-tight tracking-tight">
                {activado.ya_activo ? "ImporKiller ya estaba activo" : "ImporKiller activado"}
              </h2>
              <p className="mx-auto mt-2 max-w-[42ch] text-[14px] leading-6 text-slate-300">
                {activado.en_trial
                  ? `Lo usas gratis durante tu prueba; después se cobra $${precio}/mes junto con tu plan.`
                  : "La extensión de Chrome y los anuncios de Meta ya están habilitados en tu cuenta."}{" "}
                Instala la extensión para ver las ventas dentro de Dropi.
              </p>
              <a
                href={URL_EXTENSION_ZIP}
                download
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[15px] font-extrabold text-[#06121f] shadow-[0_18px_40px_-12px_rgba(34,211,238,0.6)] transition hover:-translate-y-0.5"
                style={{ background: "linear-gradient(90deg, #22d3ee 0%, #38bdf8 100%)" }}
              >
                <i className="bx bx-download text-xl" /> Descargar la extensión
              </a>
              <button
                type="button"
                onClick={irAImporKiller}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-[13px] font-bold text-white transition hover:bg-white/10"
              >
                <i className="bx bx-radar text-lg" /> Abrir ImporKiller y ver cómo se instala
              </button>
            </div>
          ) : (
            <div className="relative grid md:grid-cols-[1.08fr_1fr]">
              {/* ─── Izquierda: la oferta ─── */}
              <div className="relative px-6 py-8 sm:px-9 md:py-10 md:pl-11 md:pr-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-200">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: CIAN }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: CIAN }} />
                  </span>
                  Nuevo · ImporKiller
                </div>

                <h2 id="ik-titulo" className="mt-4 text-[32px] font-extrabold leading-[1.04] tracking-tight sm:text-[40px]">
                  Deja de adivinar
                  <span
                    className="block bg-clip-text text-transparent"
                    style={{ backgroundImage: `linear-gradient(90deg, ${CIAN} 0%, #60a5fa 100%)` }}
                  >
                    qué producto vender.
                  </span>
                </h2>
                <p className="mt-3 max-w-[40ch] text-[14.5px] leading-6 text-slate-300">
                  {nombre ? `${nombre}, mira` : "Mira"} cuánto vende cada producto de Dropi y con qué anuncios lo están vendiendo,
                  antes de gastar un dólar en pauta.
                </p>

                <ul className="mt-5 space-y-2.5">
                  {PRUEBAS.map((t, i) => (
                    <motion.li
                      key={t}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.1 }}
                      className="flex items-center gap-2.5 text-[14px] font-semibold text-slate-100"
                    >
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: "rgba(52,211,153,0.18)" }}>
                        <i className="bx bx-check text-[15px]" style={{ color: VERDE }} />
                      </span>
                      {t}
                    </motion.li>
                  ))}
                </ul>

                <div className="mt-6 flex items-end gap-3">
                  <div className="flex items-start leading-none">
                    <span className="mt-1.5 text-[20px] font-extrabold text-slate-300">$</span>
                    <span className="text-[52px] font-extrabold tracking-tight">{precio}</span>
                    <span className="mb-1.5 ml-1 self-end text-[14px] font-semibold text-slate-400">/mes</span>
                  </div>
                  <div className="mb-1.5 border-l border-white/15 pl-3 text-[12.5px] leading-[1.35] text-slate-300">
                    {enTrial ? (
                      <>
                        <b className="text-white">Gratis durante tu prueba</b>
                        <br />
                        después se suma a tu plan
                      </>
                    ) : (
                      <>
                        <b className="text-white">Unos ${porDia} al día</b>
                        <br />
                        se suma a tu plan actual
                      </>
                    )}
                  </div>
                </div>

                <div className="relative mt-5">
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-1 rounded-[20px]"
                    style={{ background: "linear-gradient(90deg, #22d3ee, #3b82f6, #22d3ee)", filter: "blur(16px)" }}
                    animate={{ opacity: [0.35, 0.75, 0.35] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.button
                    type="button"
                    onClick={obtener}
                    disabled={!!enviando}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-[17px] text-[16px] font-extrabold text-[#06121f] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] disabled:opacity-70"
                    style={{ background: "linear-gradient(90deg, #22d3ee 0%, #38bdf8 55%, #60a5fa 100%)" }}
                  >
                    <span
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent"
                      style={{ animation: "ik-shine 2.8s ease-in-out 1.2s infinite" }}
                    />
                    {enviando === "comprar" ? (
                      <>
                        <i className="bx bx-loader-alt animate-spin text-xl" /> Activando…
                      </>
                    ) : (
                      <>
                        Obtenerlo ahora · ${precio}/mes <i className="bx bx-right-arrow-alt text-[22px]" />
                      </>
                    )}
                  </motion.button>
                </div>
                <style>{`@keyframes ik-shine { 0% { transform: translateX(-100%);} 60% { transform: translateX(100%);} 100% { transform: translateX(100%);} }`}</style>

                {error ? (
                  <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-center text-[12.5px] leading-5 text-rose-100" role="alert">
                    {error}
                  </p>
                ) : (
                  <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-[12px] leading-5 text-slate-400">
                    <i className="bx bx-lock-alt mt-[3px] text-[13px]" />
                    <span>
                      {enTrial
                        ? `Hoy no se cobra nada: se factura $${precio}/mes con tu plan cuando termine tu prueba.`
                        : "Se activa al instante con la tarjeta de tu plan. Hoy pagas solo los días que faltan de este ciclo."}
                    </span>
                  </p>
                )}

                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={noMostrar}
                    disabled={!!enviando}
                    className="text-[12.5px] text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline disabled:opacity-60"
                  >
                    No volver a mostrar
                  </button>
                </div>
              </div>

              {/* ─── Derecha: lo que va a ver ─── */}
              <div
                className="relative hidden items-center overflow-hidden px-8 py-10 md:flex"
                style={{
                  background:
                    "radial-gradient(90% 70% at 70% 20%, rgba(14,165,233,0.35) 0%, rgba(11,20,38,0) 60%), radial-gradient(70% 60% at 20% 100%, rgba(59,130,246,0.25) 0%, rgba(11,20,38,0) 60%), #0d1a33",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.14]"
                  style={{
                    backgroundImage: "radial-gradient(rgba(255,255,255,0.45) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />
                <Escenario />
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
