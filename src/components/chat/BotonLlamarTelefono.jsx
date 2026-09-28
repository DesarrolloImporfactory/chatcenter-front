import { useCallback, useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import { useSocket } from "../../context/SocketProvider";

/**
 * Opción "Al celular (saldo)" del menú de llamar: llamada telefónica normal
 * por Zadarma, pagada con el saldo de la conexión (no necesita que el
 * cliente tenga datos).
 *
 * Flujo: POST /telefonia/llamar registra la llamada, fija el número de
 * salida de la conexión (si está verificado) y devuelve el destino; el
 * navegador marca directo con el teléfono integrado
 * (window.telefoniaZadarma.llamar). El panel de la llamada lo pinta
 * WidgetZadarma; el costo y el estado final llegan del back por socket
 * (TELEFONIA_ESTADO) cuando Zadarma avisa que terminó.
 *
 * Solo aparece si la conexión tiene telefonía; con saldo en cero se
 * muestra deshabilitado con "Sin saldo".
 */
const cacheSaldo = new Map(); // id_configuracion → { data, at }
const CACHE_MS = 60_000;
const fmtUSD = (c) => `$${(Number(c || 0) / 100).toFixed(2)}`;

export default function BotonLlamarTelefono({ selectedChat, id_configuracion, variante = "menu", onLanzada }) {
  const { socket } = useSocket() || {};
  const [cuenta, setCuenta] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");
  const idChat = selectedChat?.id || null;
  const idCfg = Number(id_configuracion) || null;

  const cargarSaldo = useCallback(async (forzar = false) => {
    if (!idCfg) return;
    const c = cacheSaldo.get(idCfg);
    if (!forzar && c && Date.now() - c.at < CACHE_MS) {
      setCuenta(c.data);
      return;
    }
    try {
      const { data } = await chatApi.get("/telefonia/saldo", { params: { id_configuracion: idCfg } });
      const d = data?.data || null;
      cacheSaldo.set(idCfg, { data: d, at: Date.now() });
      setCuenta(d);
    } catch {
      setCuenta(null);
    }
  }, [idCfg]);

  useEffect(() => {
    setCuenta(null);
    cargarSaldo();
  }, [cargarSaldo]);

  // Cierre real de la llamada (desde el webhook de Zadarma): costo y saldo.
  useEffect(() => {
    if (!socket) return undefined;
    const h = (p) => {
      if (String(p?.id_cliente_chat_center) !== String(idChat)) return;
      if (["answered", "no_answer", "busy", "cancel", "failed"].includes(p.estado)) {
        setOcupado(false);
        if (p.saldo_centavos != null) {
          setCuenta((c) => (c ? { ...c, saldo_centavos: p.saldo_centavos, minutos_disponibles: Math.floor(p.saldo_centavos / (c.tarifa_centavos_min || 1)) } : c));
          cacheSaldo.delete(idCfg);
        }
      }
    };
    socket.on("TELEFONIA_ESTADO", h);
    return () => socket.off("TELEFONIA_ESTADO", h);
  }, [socket, idChat, idCfg]);

  if (!cuenta?.activo || !idChat) return null;

  const sinSaldo = Number(cuenta.saldo_centavos) < Number(cuenta.tarifa_centavos_min);

  const llamar = async () => {
    if (ocupado || sinSaldo) return;
    setOcupado(true);
    setAviso("");
    try {
      const { data } = await chatApi.post("/telefonia/llamar", {
        id_configuracion: idCfg,
        id_cliente_chat_center: idChat,
        modo: "directo",
      });
      const d = data?.data || {};
      if (!window.telefoniaZadarma?.listo?.()) {
        throw new Error("El teléfono todavía se está conectando. Espera unos segundos y vuelve a intentar.");
      }
      window.telefoniaZadarma.llamar(d.telefono, { nombre: selectedChat?.nombre_cliente || "" });
      onLanzada?.();
    } catch (err) {
      setAviso(err?.response?.data?.message || err?.message || "No se pudo llamar");
      setOcupado(false);
      if (err?.response?.data?.code === "SIN_SALDO") cargarSaldo(true);
      setTimeout(() => setAviso(""), 8000);
    }
  };

  const titulo = sinSaldo
    ? `Sin saldo telefónico (${fmtUSD(cuenta.saldo_centavos)}). Recarga para llamar.`
    : `Saldo ${fmtUSD(cuenta.saldo_centavos)} · ${cuenta.minutos_disponibles} min aprox. a ${fmtUSD(cuenta.tarifa_centavos_min)}/min`;

  if (variante === "menu") {
    return (
      <button
        type="button"
        onClick={llamar}
        disabled={ocupado || sinSaldo}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        title={titulo}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-700">
          <i className={`bx ${ocupado ? "bx-loader-alt bx-spin" : "bx-mobile-alt"} text-lg`} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-800">Con saldo (celular)</span>
          <span className="block text-[11px] text-slate-500">
            {aviso || (sinSaldo ? "Sin saldo: recarga para llamar" : `Se cobra por segundo · ${fmtUSD(cuenta.saldo_centavos)} disponibles`)}
          </span>
        </span>
      </button>
    );
  }

  return null;
}
