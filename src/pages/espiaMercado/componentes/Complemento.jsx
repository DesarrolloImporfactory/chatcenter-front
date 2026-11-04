import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { comprarAddon } from "../../facturacion/addons";
import { ADDON_IMPORKILLER, EXTENSION_VERSION, TOKENS, URL_EXTENSION_ZIP, btnBlanco, btnOscuro, btnPrimario, btnSuave, useCopiar } from "../ui";

/* ═══════════════════════════════════════════════════════════════════════
   Complemento «ImporKiller» ($10/mes) dentro de la pantalla: lo que se
   vende, cómo se compra y cómo se instala la extensión.

   - ModalComplemento: la venta (mismo lenguaje que el modal de límite de
     Usuarios/Conexiones). Compra con comprarAddon('imporkiller').
   - ModalExtension: descarga del zip y pasos para cargarla en Chrome.
   - BloqueoComplemento: panel que ocupa la pestaña Anuncios/Tiendas cuando
     la cuenta no tiene el complemento.

   Cualquier pieza de la pantalla puede abrir los modales sin pasar props:
   abrirComplemento() / abrirExtension() disparan un evento que escucha
   EspiaMercadoView.
   ═══════════════════════════════════════════════════════════════════════ */

export const EV_COMPLEMENTO = "imporkiller:complemento";
export const EV_EXTENSION = "imporkiller:extension";
export const abrirComplemento = () => window.dispatchEvent(new CustomEvent(EV_COMPLEMENTO));
export const abrirExtension = () => window.dispatchEvent(new CustomEvent(EV_EXTENSION));

const BENEFICIOS = [
  { icono: "bx-store-alt", titulo: "Ventas estimadas dentro de Dropi", texto: "Debajo de cada producto del catálogo de Dropi (EC, MX y CO): 24 h, 7 d, 30 d y tendencia, sin salir de Dropi." },
  { icono: "bx-cloud-download", titulo: "Descargador de anuncios", texto: "En la Biblioteca de anuncios de Meta: agrupa por producto, baja los creativos en masa y manda lo visto a ImporChat." },
  { icono: "bx-radar", titulo: "Anuncios y tiendas", texto: "Qué anuncios tiene cada producto que más vende, cuántos días llevan activos y qué tiendas están pautando." },
];

/* Lo que sabe la pantalla del que entró (viene en /espia/estado → acceso). */
export const accesoDe = (estado) => {
  const a = estado?.acceso || {};
  let rol = a.rol || null;
  if (!rol) {
    try {
      rol = localStorage.getItem("user_role") || null;
    } catch {
      rol = null;
    }
  }
  return {
    rol,
    superAdmin: !!a.super_admin || rol === "super_administrador",
    administrador: !!a.administrador || rol === "administrador",
    addon: !!a.addon,
    addonComprado: !!a.addon_comprado,
    cargado: !!estado?.acceso,
  };
};

function Portal({ children }) {
  return createPortal(children, document.body);
}

function Capa({ onClose, children, ancho = "max-w-md" }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
          style={{ background: "rgba(3,7,18,0.62)", backdropFilter: "blur(6px)" }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={`flex max-h-[92vh] w-full ${ancho} flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_50px_140px_-30px_rgba(0,0,0,0.7)] ring-1 ring-black/5`}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}

function Cabecera({ icono, titulo, texto, onClose, chip }) {
  return (
    <div className="relative bg-gradient-to-br from-[#0a1a36] via-[#102a5c] to-[#1e4fd6] px-6 pb-6 pt-6 text-center text-white">
      <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar">
        <i className="bx bx-x text-xl" />
      </button>
      <span className="inline-grid h-12 w-12 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
        <i className={`bx ${icono} text-2xl`} />
      </span>
      {chip ? <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-sky-300/30 bg-sky-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-200">{chip}</div> : null}
      <h3 className="mt-2 text-lg font-extrabold tracking-tight">{titulo}</h3>
      {texto ? <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-5 text-white/70">{texto}</p> : null}
    </div>
  );
}

/* ── Venta ───────────────────────────────────────────────────────────── */
export function ModalComplemento({ acceso, onClose, onActivado }) {
  const navigate = useNavigate();
  const [ocupado, setOcupado] = useState(false);
  const puedeComprar = acceso?.administrador || acceso?.superAdmin;

  const comprar = async () => {
    if (ocupado) return;
    setOcupado(true);
    try {
      const data = await comprarAddon(ADDON_IMPORKILLER.clave, 1);
      if (data.actionRequired && data.hosted_invoice_url) {
        window.location.href = data.hosted_invoice_url;
        return;
      }
      const r = await Swal.fire({
        icon: "success",
        iconColor: "#16a34a",
        title: data.ya_activo ? "ImporKiller ya estaba activo" : data.en_trial ? "¡Activado en tu prueba!" : "¡ImporKiller activado!",
        html: `<p style="margin:6px 0 0;color:#475569;font-size:14px;line-height:1.55">${
          data.en_trial
            ? "Lo usarás <b style='color:#0a1a36'>gratis durante tu prueba</b>; se cobrará junto con tu plan cuando termine el período.<br/>Ya puedes descargar la extensión."
            : "La extensión de Chrome y los anuncios de Meta ya están habilitados en tu cuenta.<br/>Descarga la extensión para verlo dentro de Dropi."
        }</p>`,
        confirmButtonText: "Descargar extensión",
        confirmButtonColor: "#1d4ed8",
        showCancelButton: true,
        cancelButtonText: "Después",
        customClass: { popup: "rounded-2xl" },
      });
      onActivado?.(r.isConfirmed ? "extension" : null);
    } catch (e) {
      if (e?.code === "NO_SUBSCRIPTION") {
        const r = await Swal.fire({
          icon: "info",
          title: "Primero elige un plan",
          text: "Los complementos se suman a una suscripción activa. Elige tu plan y vuelve aquí para activar ImporKiller.",
          confirmButtonText: "Ver planes",
          confirmButtonColor: "#1d4ed8",
          showCancelButton: true,
          cancelButtonText: "Ahora no",
          customClass: { popup: "rounded-2xl" },
        });
        if (r.isConfirmed) navigate("/planes");
        return;
      }
      Swal.fire({ icon: "error", title: "No se pudo activar ImporKiller", text: e?.message || "Intenta nuevamente.", confirmButtonColor: "#1d4ed8", customClass: { popup: "rounded-2xl" } });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Capa onClose={ocupado ? undefined : onClose}>
      <Cabecera icono="bx-radar" chip="Complemento" titulo="Activa ImporKiller" texto="Ventas estimadas dentro de Dropi con la extensión de Chrome y el descargador de anuncios de Meta. Se suma a tu plan." onClose={onClose} />
      <div className="min-h-0 overflow-auto px-5 py-5">
        <ul className="space-y-2.5">
          {BENEFICIOS.map((b) => (
            <li key={b.icono} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eff6ff] text-[#1d4ed8]">
                <i className={`bx ${b.icono} text-xl`} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-[#171931]">{b.titulo}</span>
                <span className="mt-0.5 block text-[12px] leading-4 text-slate-500">{b.texto}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border-2 border-[#1d4ed8] bg-gradient-to-r from-[#eff6ff] to-white px-4 py-3">
          <div>
            <div className="text-[13px] font-extrabold text-[#171931]">ImporKiller</div>
            <div className="text-[11.5px] text-slate-500">Recurrente, se mantiene mientras tu plan siga activo.</div>
          </div>
          <div className="text-right leading-none">
            <div className="text-2xl font-extrabold text-[#171931]">+${ADDON_IMPORKILLER.precio}</div>
            <div className="text-[10px] text-slate-400">/mes</div>
          </div>
        </div>

        {puedeComprar ? (
          <button type="button" onClick={comprar} disabled={ocupado} className={`${btnPrimario} mt-4 w-full justify-center py-3 text-[14px]`}>
            <i className={`bx ${ocupado ? "bx-loader-alt animate-spin" : "bx-bolt-circle"}`} /> {ocupado ? "Activando…" : `Activar por $${ADDON_IMPORKILLER.precio}/mes`}
          </button>
        ) : (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] leading-5 text-amber-900">
            <i className="bx bx-info-circle mt-0.5 text-base" />
            <span>
              Solo el <b>administrador de tu cuenta</b> puede comprar complementos. Pídele que lo active en <b>Planes y facturación → Productos adicionales</b>.
            </span>
          </div>
        )}
        <p className="mt-3 flex items-start gap-1.5 px-0.5 text-[10.5px] leading-4 text-slate-400">
          <i className="bx bx-info-circle mt-px text-[12px]" />
          <span>Ej.: un plan de $39/mes pasaría a $49/mes. Se cobra el prorrateo de hoy al corte y luego con tu plan. El buscador de productos sigue incluido en tu plan sin el complemento.</span>
        </p>
        <button type="button" onClick={onClose} disabled={ocupado} className="mt-2 w-full rounded-lg py-1.5 text-center text-[12px] font-medium text-slate-400 transition hover:text-slate-600">
          Ahora no
        </button>
      </div>
    </Capa>
  );
}

/* ── Extensión: descarga e instalación ───────────────────────────────── */
const PASOS_INSTALAR = [
  { icono: "bx-download", titulo: "Descarga el zip y descomprímelo", texto: "Queda una carpeta «imporkiller-imporchat». No la borres después: Chrome carga la extensión desde ahí." },
  { icono: "bxl-chrome", titulo: "Abre chrome://extensions y activa «Modo de desarrollador»", texto: "El interruptor está arriba a la derecha. Luego pulsa «Cargar descomprimida» y elige la carpeta." },
  { icono: "bx-log-in-circle", titulo: "Abre ImporChat en ese mismo Chrome", texto: "La extensión toma tu sesión sola (sin pedir usuario ni clave). Si no la toma, el icono de la extensión tiene «Opciones» para pegar el token." },
  { icono: "bx-store-alt", titulo: "Entra a Dropi o a la Biblioteca de anuncios", texto: "En app.dropi.ec / .mx / .co verás las ventas estimadas debajo de cada producto; en la Biblioteca de Meta aparece la barra de ImporKiller." },
];

export function ModalExtension({ acceso, onClose }) {
  const { copiado, copiar } = useCopiar();
  // La descarga es parte del complemento: sin él se ofrece activarlo, no el zip.
  const puedeDescargar = !!(acceso?.superAdmin || acceso?.addon);
  return (
    <Capa onClose={onClose} ancho="max-w-lg">
      <Cabecera icono="bxl-chrome" chip={`Extensión v${EXTENSION_VERSION}`} titulo="Instala la extensión ImporKiller" texto="Mientras no esté en la Chrome Web Store se carga a mano. Son dos minutos y se hace una sola vez." onClose={onClose} />
      <div className="min-h-0 overflow-auto px-5 py-5">
        {puedeDescargar ? (
          <a href={URL_EXTENSION_ZIP} download className={`${btnPrimario} w-full justify-center py-3 text-[14px]`}>
            <i className="bx bx-download" /> Descargar extensión (zip)
          </a>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[13px] font-bold text-amber-900">
              <i className="bx bx-lock-alt mr-1" /> La extensión es parte del complemento ImporKiller (${ADDON_IMPORKILLER.precio}/mes)
            </p>
            <p className="mt-0.5 text-[12px] leading-5 text-amber-800">Al activarlo se habilita la descarga aquí mismo y las ventas aparecen dentro de Dropi con tu cuenta de ImporChat.</p>
            <button
              type="button"
              className={`${btnPrimario} mt-3 w-full justify-center py-2.5 text-[13px]`}
              onClick={() => {
                onClose?.();
                abrirComplemento();
              }}
            >
              <i className="bx bx-bolt-circle" /> Activar por ${ADDON_IMPORKILLER.precio}/mes
            </button>
          </div>
        )}
        <ol className="mt-4 space-y-3">
          {PASOS_INSTALAR.map((p, i) => (
            <li key={p.icono} className="flex items-start gap-3">
              <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eff6ff] text-[#1d4ed8]">
                <i className={`bx ${p.icono} text-xl`} />
                <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#0B1426] text-[10px] font-extrabold text-white">{i + 1}</span>
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-[#171931]">{p.titulo}</span>
                <span className="mt-0.5 block text-[12px] leading-4 text-slate-500">{p.texto}</span>
              </span>
            </li>
          ))}
        </ol>
        {/* Dos botones a la misma altura, mitad y mitad. */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className={`${btnSuave} w-full justify-center`} onClick={() => copiar("chrome://extensions")} title="Chrome no permite abrir chrome://extensions desde un enlace: se copia para pegarlo en la barra de direcciones">
            <i className={`bx ${copiado ? "bx-check" : "bxl-chrome"}`} /> {copiado ? "Copiado, pégalo en Chrome" : "Abrir chrome://extensions"}
          </button>
          <a href="https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=EC&media_type=all" target="_blank" rel="noreferrer" className={`${btnSuave} w-full justify-center`}>
            <i className="bx bxl-meta" /> Abrir Biblioteca de anuncios
          </a>
        </div>
        <p className="mt-3 text-[11px] leading-4 text-slate-400">Chrome no deja abrir chrome://extensions desde un enlace, así que el botón copia la dirección: pégala en la barra. Cuando salga una versión nueva, basta con reemplazar la carpeta y pulsar «Actualizar» en chrome://extensions.</p>
      </div>
    </Capa>
  );
}

/* ── Pestaña bloqueada ────────────────────────────────────────────────── */
export function BloqueoComplemento({ seccion = "anuncios", acceso }) {
  const titulo = seccion === "tiendas" ? "Las tiendas que pautan son parte del complemento ImporKiller" : "Los anuncios son parte del complemento ImporKiller";
  const sub =
    seccion === "tiendas"
      ? "Qué dominios están pautando en Meta, cuántos anuncios activos tienen y cómo cambian día a día. Llegan desde la extensión de Chrome."
      : "Los anuncios de la Biblioteca de Meta, agrupados por producto, con días activos, copias y creativos descargables. Llegan desde la extensión de Chrome.";
  const puedeComprar = acceso?.administrador || acceso?.superAdmin;
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-[26px] text-white shadow-[0_30px_80px_-30px_rgba(11,20,38,0.7)] ring-1 ring-white/10"
      style={{
        background:
          "radial-gradient(110% 80% at 0% 0%, rgba(14,165,233,0.30) 0%, rgba(11,20,38,0) 55%), radial-gradient(70% 60% at 100% 100%, rgba(37,211,102,0.16) 0%, rgba(11,20,38,0) 60%), linear-gradient(180deg, #0B1426 0%, #0a1222 100%)",
      }}
      aria-label={titulo}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-200">
            <i className="bx bx-lock-alt" /> Complemento · ${ADDON_IMPORKILLER.precio}/mes
          </div>
          <h2 className="mt-3 text-[24px] font-extrabold leading-tight tracking-tight sm:text-[28px]">{titulo}</h2>
          <p className="mt-2 max-w-[56ch] text-[14px] leading-6 text-slate-300">{sub}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {puedeComprar ? (
              <button type="button" className={btnBlanco} onClick={abrirComplemento}>
                <i className="bx bx-bolt-circle" /> Activar por ${ADDON_IMPORKILLER.precio}/mes
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-[12.5px] text-amber-100">
                <i className="bx bx-info-circle" /> Pídele al administrador de tu cuenta que lo active en Planes y facturación → Productos adicionales.
              </span>
            )}
            <button type="button" className={btnOscuro} onClick={abrirExtension}>
              <i className="bx bxl-chrome" /> Ver cómo se instala la extensión
            </button>
          </div>
        </div>
        <ul className="space-y-2.5 self-center">
          {BENEFICIOS.map((b) => (
            <li key={b.icono} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#0f1b33] text-sky-300">
                <i className={`bx ${b.icono} text-lg`} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-extrabold text-white">{b.titulo}</span>
                <span className="mt-0.5 block text-[12px] leading-4 text-slate-300">{b.texto}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative border-t border-white/10 px-6 py-3 text-[11.5px] text-slate-400 sm:px-8">
        <i className="bx bx-check-circle mr-1" style={{ color: TOKENS.verde }} /> El buscador de productos y las métricas de cada uno van incluidos en tu plan.
      </div>
    </motion.section>
  );
}
