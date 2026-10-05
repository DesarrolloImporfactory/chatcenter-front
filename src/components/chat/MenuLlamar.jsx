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
  try {
    localStorage.setItem(CLAVE_RECORDADA(idCfg), JSON.stringify({ wa, saldo }));
  } catch {
    // sin localStorage solo se pierde el arranque sin salto
  }
  return out;
}

/* Lo último que se supo de esta conexión, sin esperar a la red. La consulta
   tarda un par de segundos y, hasta que respondía, el botón no existía: al
   aparecer empujaba al cronómetro y a los interruptores de al lado. Se pinta
   con lo recordado y la consulta lo corrige si cambió. */
const CLAVE_RECORDADA = (idCfg) => `menuLlamar:disp:${idCfg}`;

function recordada(idCfg) {
  const c = cache.get(idCfg);
  if (c) return c;
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_RECORDADA(idCfg)));
    return g ? { wa: !!g.wa, saldo: !!g.saldo } : null;
  } catch {
    return null;
  }
}

export default function MenuLlamar({
  selectedChat,
  id_configuracion,
  verEtiqueta = true,
}) {
  const [abierto, setAbierto] = useState(false);
  const [pruebaMsg, setPruebaMsg] = useState("");
  const ref = useRef(null);
  const esWa = selectedChat?.source === "wa";
  const idCfg = Number(id_configuracion) || null;
  const [disp, setDisp] = useState(() =>
    idCfg && esWa ? recordada(idCfg) : null,
  );

  useEffect(() => {
    let vigente = true;
    setDisp(idCfg && esWa ? recordada(idCfg) : null);
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
    <div ref={ref} className="relative hidden sm:block shrink-0">
      {/* Mismo molde que la pastilla "Bot IA" de al lado */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-2.5 py-1 shadow-sm transition ${
          abierto ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"
        }`}
        title="Llamar al cliente"
        aria-haspopup="menu"
        aria-expanded={abierto}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-sky-100">
          <i className="bx bx-phone-call text-[14px] text-sky-700" />
        </span>
        {/* La cabecera decide si cabe el texto (mide su ancho real) */}
        {verEtiqueta && (
          <span className="text-xs font-medium text-slate-600">Llamar</span>
        )}
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
          {disp.saldo ? (
            /* Prueba de eco de Zadarma (gratis): el asesor se escucha a sí
               mismo y ve cómo está su red antes de llamar a un cliente. */
            <button
              type="button"
              onClick={async () => {
                setPruebaMsg("Preparando teléfono…");
                try {
                  if (!window.telefoniaZadarma?.probarAudio) throw new Error("Recarga la página para usar la prueba de audio.");
                  await window.telefoniaZadarma.probarAudio();
                  setPruebaMsg("");
                  setAbierto(false);
                } catch (err) {
                  setPruebaMsg(err?.message || "No se pudo iniciar la prueba");
                  setTimeout(() => setPruebaMsg(""), 8000);
                }
              }}
              className="mt-1 flex w-full items-center gap-3 rounded-lg border-t border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                <i className="bx bx-headphone text-lg" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">Probar mi audio</span>
                <span className="block text-[11px] text-slate-500">{pruebaMsg || "Gratis · te escuchas a ti mismo y mide tu conexión"}</span>
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
