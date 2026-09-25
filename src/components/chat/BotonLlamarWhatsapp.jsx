import { useCallback, useEffect, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";
import { useSocket } from "../../context/SocketProvider";

/**
 * Botón "Llamar" en la cabecera del chat (solo WhatsApp).
 *
 * Solo aparece si la conexión tiene encendidas las llamadas (switch en
 * administrador-whatsapp). Según el permiso del cliente en Meta:
 *   - sin permiso y se puede pedir → "Pedir permiso": manda al cliente el
 *     mensaje "¿podemos llamarte?" (1 por día, 2 por semana).
 *   - pedido y sin respuesta → "Esperando permiso" (deshabilitado).
 *   - aceptado (7 días o permanente) → "Llamar": abre el panel flotante y
 *     arranca la llamada (se cobra por minuto según el país del cliente).
 * Cuando el cliente responde, el back avisa por socket (LLAMADA_PERMISO) y
 * el botón se actualiza solo.
 */
const cacheConfig = new Map(); // id_configuracion → { activo, at }
const CACHE_MS = 5 * 60_000;

async function llamadasActivas(id_configuracion) {
  const c = cacheConfig.get(id_configuracion);
  if (c && Date.now() - c.at < CACHE_MS) return c.activo;
  try {
    const { data } = await chatApi.get("/llamadas/configuracion", {
      params: { id_configuracion },
    });
    const activo = !!data?.data?.activo;
    cacheConfig.set(id_configuracion, { activo, at: Date.now() });
    return activo;
  } catch {
    cacheConfig.set(id_configuracion, { activo: false, at: Date.now() });
    return false;
  }
}

const fechaCorta = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("es-EC", { day: "2-digit", month: "short" });
};

export default function BotonLlamarWhatsapp({ selectedChat, id_configuracion }) {
  const { socket } = useSocket() || {};
  const [activo, setActivo] = useState(false);
  const [permiso, setPermiso] = useState(null); // { status, puede_pedir, puede_llamar, expira_at }
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");
  const idChat = selectedChat?.id || null;
  const esWa = selectedChat?.source === "wa";
  const vigenteRef = useRef(0);

  const cargarPermiso = useCallback(async () => {
    if (!id_configuracion || !idChat) return;
    const marca = ++vigenteRef.current;
    try {
      const { data } = await chatApi.get("/llamadas/permiso", {
        params: { id_configuracion, id_cliente_chat_center: idChat },
      });
      if (marca !== vigenteRef.current) return;
      setPermiso(data?.data || null);
    } catch {
      if (marca === vigenteRef.current) setPermiso(null);
    }
  }, [id_configuracion, idChat]);

  // ¿La conexión tiene llamadas encendidas?
  useEffect(() => {
    let vigente = true;
    setActivo(false);
    if (!id_configuracion || !esWa) return undefined;
    llamadasActivas(Number(id_configuracion)).then((v) => vigente && setActivo(v));
    return () => {
      vigente = false;
    };
  }, [id_configuracion, esWa]);

  // Permiso del cliente al abrir el chat
  useEffect(() => {
    setPermiso(null);
    setAviso("");
    if (activo && idChat) cargarPermiso();
  }, [activo, idChat, cargarPermiso]);

  // El cliente respondió a la solicitud
  useEffect(() => {
    if (!socket) return undefined;
    const h = (p) => {
      if (String(p?.id_cliente_chat_center) !== String(idChat)) return;
      setAviso(p.response === "accept" ? "El cliente aceptó" : "El cliente no aceptó");
      cargarPermiso();
    };
    socket.on("LLAMADA_PERMISO", h);
    return () => socket.off("LLAMADA_PERMISO", h);
  }, [socket, idChat, cargarPermiso]);

  if (!activo || !esWa || !idChat) return null;

  const pedir = async () => {
    setOcupado(true);
    setAviso("");
    try {
      await chatApi.post("/llamadas/permiso/solicitar", {
        id_configuracion,
        id_cliente_chat_center: idChat,
      });
      setAviso("Solicitud enviada");
      await cargarPermiso();
    } catch (err) {
      setAviso(err?.response?.data?.message || "No se pudo enviar la solicitud");
    } finally {
      setOcupado(false);
    }
  };

  const llamar = () => {
    window.dispatchEvent(
      new CustomEvent("llamada:iniciar", {
        detail: {
          id_configuracion: Number(id_configuracion),
          id_cliente_chat_center: idChat,
          nombre_cliente: selectedChat?.nombre_cliente || "",
          telefono: selectedChat?.celular_cliente || "",
        },
      }),
    );
  };

  const base =
    "hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition";

  if (!permiso) {
    return (
      <button type="button" disabled className={`${base} border-slate-200 bg-white text-slate-400`} title="Consultando permiso de llamada">
        <i className="bx bx-phone text-[15px]" />
        <span className="hidden lg:inline">Llamar</span>
      </button>
    );
  }

  if (permiso.puede_llamar) {
    const hasta = permiso.status === "permanent" ? "permiso permanente" : `permiso hasta ${fechaCorta(permiso.expira_at)}`;
    return (
      <button
        type="button"
        onClick={llamar}
        className={`${base} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
        title={`Llamar por WhatsApp (${hasta}). Se cobra por minuto según el país del cliente.`}
      >
        <i className="bx bx-phone-call text-[15px]" />
        <span className="hidden lg:inline">Llamar</span>
      </button>
    );
  }

  if (permiso.puede_pedir) {
    return (
      <button
        type="button"
        onClick={pedir}
        disabled={ocupado}
        className={`${base} border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50`}
        title={aviso || "Le manda al cliente un mensaje de WhatsApp preguntando si podemos llamarle. Si acepta, el botón cambia a Llamar."}
      >
        <i className={`bx ${ocupado ? "bx-loader-alt bx-spin" : "bx-phone-outgoing"} text-[15px]`} />
        <span className="hidden lg:inline">Pedir permiso</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled
      className={`${base} border-amber-200 bg-amber-50 text-amber-700`}
      title={
        aviso ||
        permiso.error ||
        (permiso.status === "no_permission"
          ? "Ya se pidió permiso; hay que esperar la respuesta del cliente (máximo 1 solicitud por día, 2 por semana)."
          : "Sin permiso para llamar por ahora")
      }
    >
      <i className="bx bx-time-five text-[15px]" />
      <span className="hidden lg:inline">Esperando permiso</span>
    </button>
  );
}
