import { useEffect, useRef, useState } from "react";
import BotonLlamarWhatsapp from "./BotonLlamarWhatsapp";
import BotonLlamarTelefono from "./BotonLlamarTelefono";

/**
 * Un solo icono de teléfono en la cabecera del chat. Al pulsarlo se
 * despliegan las dos formas de llamar:
 *   - Por WhatsApp (gratis; pide permiso al cliente si hace falta).
 *   - Al celular con saldo (Zadarma; para clientes sin datos).
 * Cada opción solo aparece si aplica a la conexión: WhatsApp si tiene las
 * llamadas encendidas, saldo si el super admin le cargó telefonía.
 */
export default function MenuLlamar({ selectedChat, id_configuracion }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);
  const esWa = selectedChat?.source === "wa";

  useEffect(() => {
    if (!abierto) return undefined;
    const cerrar = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    const esc = (e) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  useEffect(() => setAbierto(false), [selectedChat?.id]);

  if (!esWa || !selectedChat?.id) return null;

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition ${
          abierto ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
        title="Llamar al cliente"
        aria-haspopup="menu"
        aria-expanded={abierto}
      >
        <i className="bx bx-phone-call text-[15px]" />
        <span className="hidden lg:inline">Llamar</span>
        <i className={`bx bx-chevron-down text-[14px] transition ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto ? (
        <div role="menu" className="absolute right-0 z-50 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <div className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Llamar a {selectedChat?.nombre_cliente || "este cliente"}</div>
          <BotonLlamarWhatsapp selectedChat={selectedChat} id_configuracion={id_configuracion} variante="menu" onLanzada={() => setAbierto(false)} />
          <BotonLlamarTelefono selectedChat={selectedChat} id_configuracion={id_configuracion} variante="menu" onLanzada={() => setAbierto(false)} />
          <div className="px-3 pb-1.5 pt-1 text-[10px] text-slate-400">
            Solo se muestran las opciones activas en esta conexión.
          </div>
        </div>
      ) : null}
    </div>
  );
}
