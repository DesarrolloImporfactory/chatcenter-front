import { useCallback, useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import { useSocket } from "../../context/SocketProvider";

/**
 * "Llamar al celular" en la cabecera del chat: llamada telefónica normal por
 * Zadarma, pagada con el saldo de la conexión (no necesita que el cliente
 * tenga datos). Al pulsarlo el back pide el callback: primero suena el
 * widget de Zadarma en este navegador, el asesor contesta ahí, y Zadarma
 * marca al cliente. El estado (timbrando, contestó, no contestó) y el costo
 * llegan por socket (TELEFONIA_ESTADO).
 *
 * Solo aparece si la telefonía está configurada y la conexión está activa;
 * con saldo en cero se muestra deshabilitado con "Sin saldo".
 */
const cacheSaldo = new Map(); // id_configuracion → { data, at }
const CACHE_MS = 60_000;

const fmtUSD = (centavos) => `$${(Number(centavos || 0) / 100).toFixed(2)}`;

const ESTADO_TXT = {
  pedida: "Llamando… contesta el teléfono del widget",
  ringing: "Timbrando al cliente…",
  answered: "Llamada terminada",
  no_answer: "No contestó",
  busy: "Ocupado",
  cancel: "Cancelada",
  failed: "No se pudo conectar",
};

export default function BotonLlamarTelefono({ selectedChat, id_configuracion }) {
  const { socket } = useSocket() || {};
  const [cuenta, setCuenta] = useState(null); // { activo, saldo_centavos, tarifa_centavos_min, minutos_disponibles }
  const [ocupado, setOcupado] = useState(false);
  const [estado, setEstado] = useState(null); // { texto, tono, hasta }
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

  // Estado de la llamada en curso, desde el back (webhooks de Zadarma).
  useEffect(() => {
    if (!socket) return undefined;
    const h = (p) => {
      if (String(p?.id_cliente_chat_center) !== String(idChat)) return;
      const final = ["answered", "no_answer", "busy", "cancel", "failed"].includes(p.estado);
      const texto =
        p.estado === "answered" && p.duracion_seg != null
          ? `Llamada de ${Math.floor(p.duracion_seg / 60)}:${String(p.duracion_seg % 60).padStart(2, "0")} · ${fmtUSD(p.costo_centavos)}`
          : ESTADO_TXT[p.estado] || p.estado;
      setEstado({ texto, tono: final ? (p.estado === "answered" ? "ok" : "warn") : "info" });
      if (final) {
        setOcupado(false);
        if (p.saldo_centavos != null) {
          setCuenta((c) => (c ? { ...c, saldo_centavos: p.saldo_centavos } : c));
          cacheSaldo.delete(idCfg);
        }
        setTimeout(() => setEstado(null), 8000);
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
    setEstado({ texto: ESTADO_TXT.pedida, tono: "info" });
    try {
      await chatApi.post("/telefonia/llamar", {
        id_configuracion: idCfg,
        id_cliente_chat_center: idChat,
      });
    } catch (err) {
      setOcupado(false);
      setEstado({
        texto: err?.response?.data?.message || "No se pudo llamar",
        tono: "warn",
      });
      setTimeout(() => setEstado(null), 8000);
      if (err?.response?.data?.code === "SIN_SALDO") cargarSaldo(true);
    }
  };

  const base =
    "hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition";
  const tonoCls =
    estado?.tono === "ok"
      ? "text-emerald-700"
      : estado?.tono === "warn"
        ? "text-rose-700"
        : "text-slate-600";

  return (
    <div className="hidden sm:flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={llamar}
        disabled={ocupado || sinSaldo}
        className={`${base} ${
          sinSaldo
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
        } disabled:opacity-60`}
        title={
          sinSaldo
            ? `Sin saldo telefónico (${fmtUSD(cuenta.saldo_centavos)}). Recarga para llamar.`
            : `Llamar al celular del cliente por la red telefónica (no necesita datos). Saldo ${fmtUSD(cuenta.saldo_centavos)} · ${cuenta.minutos_disponibles} min aprox. a ${fmtUSD(cuenta.tarifa_centavos_min)}/min. Primero suena el teléfono del widget; contesta ahí.`
        }
      >
        <i className={`bx ${ocupado ? "bx-loader-alt bx-spin" : "bx-mobile-alt"} text-[15px]`} />
        <span className="hidden lg:inline">{sinSaldo ? "Sin saldo" : "Llamar al celular"}</span>
      </button>
      {estado ? <span className={`text-[10px] font-medium ${tonoCls}`}>{estado.texto}</span> : null}
    </div>
  );
}
