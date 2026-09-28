import { useEffect, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";
import BotonLlamarWhatsapp from "./BotonLlamarWhatsapp";
import BotonLlamarTelefono from "./BotonLlamarTelefono";

/**
 * Un solo botón "Llamar" en la cabecera del chat, con el mismo estilo que
 * "Bot IA". Al pulsarlo se despliegan las formas de llamar disponibles:
 *   - Por WhatsApp (si la conexión tiene encendidas las llamadas de Meta).
 *   - Con saldo, al celular (si el super admin le cargó telefonía).
 * Si la conexión no tiene ninguna de las dos, el botón NO aparece.
 */
const cache = new Map(); // id_configuracion → { wa, saldo, at }
const CACHE_MS = 5 * 60_000;

async function disponibilidad(idCfg) {
  const c = cache.get(idCfg);
  if (c && Date.now() - c.at < CACHE_MS) return c;
  const [wa, saldo] = await Promise.all([
    chatApi
      .get("/llamadas/configuracion", { params: { id_configuracion: idCfg } })
      .then(({ data }) => !!data?.data?.activo)
      .catch(() => false),
    chatApi
      .get("/telefonia/saldo", { params: { id_configuracion: idCfg } })
      .then(({ data }) => !!data?.data?.activo)
      .catch(() => false),
  ]);
  const out = { wa, saldo, at: Date.now() };
  cache.set(idCfg, out);
  return out;
}

export default function MenuLlamar({ selectedChat, id_configuracion }) {
  const [abierto, setAbierto] = useState(false);
  const [disp, setDisp] = useState(null);
  const ref = useRef(null);
  const esWa = selectedChat?.source === "wa";
  const idCfg = Number(id_configuracion) || null;

  useEffect(() => {
    let vigente = true;
    setDisp(null);
    if (!idCfg || !esWa) return undefined;
    disponibilidad(idCfg).then((d) => vigente && setDisp(d));
    return () => {
      vigente = false;
    };
  }, [idCfg, esWa]);

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

  if (!esWa || !selectedChat?.id || !disp || (!disp.wa && !disp.saldo)) return null;

  return (
    <div ref={ref} className="relative hidden sm:block">
      {/* Mismo molde que la pastilla "Bot IA" de al lado */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 shadow-sm transition ${
          abierto ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"
        }`}
        title="Llamar al cliente"
        aria-haspopup="menu"
        aria-expanded={abierto}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-sky-100">
          <i className="bx bx-phone-call text-[14px] text-sky-700" />
        </span>
        <span className="text-xs font-medium text-slate-600 hidden lg:inline">Llamar</span>
        <i className={`bx bx-chevron-down text-[14px] text-slate-400 transition ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto ? (
        <div role="menu" className="absolute right-0 z-50 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <div className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Llamar a {selectedChat?.nombre_cliente || "este cliente"}
          </div>
          {disp.wa ? (
            <BotonLlamarWhatsapp selectedChat={selectedChat} id_configuracion={id_configuracion} variante="menu" onLanzada={() => setAbierto(false)} />
          ) : null}
          {disp.saldo ? (
            <BotonLlamarTelefono selectedChat={selectedChat} id_configuracion={id_configuracion} variante="menu" onLanzada={() => setAbierto(false)} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
