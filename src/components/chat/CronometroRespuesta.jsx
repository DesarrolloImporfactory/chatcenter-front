import { useEffect, useMemo, useRef, useState } from "react";
import chatApi from "../../api/chatcenter";
import {
  MINUTOS_ADVERTENCIA,
  MINUTOS_CRITICO,
  alertasSinRespuestaActivas,
  formatEspera,
  inicioEsperaDelChat,
  parseFechaMensaje,
  segundosHabiles,
  HORARIO_DEFAULT,
} from "../../config/alertasSinRespuesta";

/**
 * Cronómetro del asesor en la cabecera del chat abierto.
 *
 * Son dos relojes distintos y este es el segundo:
 *   - El sidebar dice cuánto lleva esperando el CLIENTE (desde su mensaje).
 *   - Este arranca en 0:00 cuando el asesor ABRE el chat con el cliente
 *     esperando, y corre hasta que le contesta: mide cuánto se demora él.
 *
 * La hora de apertura se guarda en el backend (POST /dashboard/atencion/abrir,
 * tabla atencion_aperturas) la primera vez que se abre el chat con ese
 * mensaje pendiente. Por eso recargar la página o pasar a otro chat y
 * volver no lo reinicia: se retoma desde la hora guardada.
 *
 * Dos modos, los decide el backend:
 *   - propio: el reloj es de quien mira (asesor de ventas, o el encargado
 *     del chat). Verde hasta 5 min, naranja hasta 10, rojo con pulso después.
 *   - observador: un administrador que entra a leer un chat de otro. No se
 *     le registra apertura ni se le cuenta nada: ve el reloj del encargado
 *     ("Adrian lleva 15:33 con el chat abierto") o, si nadie lo abrió,
 *     "Ningún asesor ha abierto este chat".
 *
 * Solo cuenta dentro del horario de atención de la conexión (lo manda el
 * back junto con la apertura): fuera de horario el reloj queda en pausa y
 * lo dice.
 */
const formatoReloj = (segundos) => {
  const s = Math.max(0, Math.floor(segundos));
  if (s < 3600) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  const h = Math.floor(s / 3600);
  if (h < 24) {
    return `${h}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`;
  }
  return `${Math.floor(h / 24)}d ${h % 24}h`;
};

const primerNombre = (nombre) =>
  String(nombre || "")
    .trim()
    .split(/\s+/)[0] || "El asesor";

const TEMAS = {
  ok: {
    caja: "border-emerald-200 bg-emerald-50",
    icono: "bg-emerald-100 text-emerald-700",
    texto: "text-emerald-700",
  },
  advertencia: {
    caja: "border-orange-300 bg-orange-50",
    icono: "bg-orange-100 text-orange-700",
    texto: "text-orange-700",
  },
  critico: {
    caja: "border-rose-300 bg-rose-50 animate-pulse",
    icono: "bg-rose-100 text-rose-700",
    texto: "text-rose-700",
  },
  neutro: {
    caja: "border-slate-200 bg-slate-50",
    icono: "bg-slate-100 text-slate-500",
    texto: "text-slate-600",
  },
};

const nivelDe = (minutos) =>
  minutos >= MINUTOS_CRITICO
    ? "critico"
    : minutos >= MINUTOS_ADVERTENCIA
      ? "advertencia"
      : "ok";

function Caja({ tema, icono, titulo, detalle, title, pulso }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 shadow-sm ${tema.caja} ${pulso ? "" : "animate-none"}`}
      title={title}
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${tema.icono}`}
      >
        <i className={`bx ${icono} text-[15px]`} />
      </span>
      <div className="leading-tight">
        <div
          className={`text-sm font-extrabold tabular-nums ${tema.texto}`}
          aria-live="off"
        >
          {titulo}
        </div>
        <div className={`text-[10px] font-medium hidden lg:block ${tema.texto}`}>
          {detalle}
        </div>
      </div>
    </div>
  );
}

export default function CronometroRespuesta({
  chatMessages,
  selectedChat,
  id_configuracion,
}) {
  const activo =
    alertasSinRespuestaActivas(id_configuracion) && !!selectedChat?.id;
  const cerrado = Number(selectedChat?.chat_cerrado) === 1;
  const idChat = selectedChat?.id != null ? String(selectedChat.id) : "";

  /* ── Desde cuándo espera el cliente ──
     Primero con los mensajes del chat (permite ignorar al bot). Chat.jsx los
     guarda como lista de chats con `mensajes` adentro: se aplana y se filtra
     por chat, porque al cambiar de chat la lista tarda un instante en
     reemplazarse. Si aún no cargaron, el resumen que trae el chat de la
     lista (mensaje_rol / mensaje_created_at). */
  const esperaDesde = useMemo(() => {
    if (!activo || cerrado) return null;
    const planos = (chatMessages || []).flatMap((item) =>
      Array.isArray(item?.mensajes) ? item.mensajes : [item],
    );
    const propios = planos.filter(
      (m) =>
        m &&
        m.rol_mensaje !== undefined &&
        (m.celular_recibe == null || String(m.celular_recibe) === idChat),
    );
    if (propios.length > 0) return inicioEsperaDelChat(propios);
    if (Number(selectedChat?.mensaje_rol) === 0) {
      return parseFechaMensaje(selectedChat.mensaje_created_at);
    }
    return null;
  }, [activo, cerrado, chatMessages, selectedChat, idChat]);

  /* ── Apertura (una consulta por chat + mensaje pendiente) ──
     Hasta que el back responde se muestra "cargando" sin arrancar ningún
     reloj: así a un administrador nunca se le pinta un tiempo propio. */
  const claveEspera = esperaDesde ? `${idChat}|${esperaDesde.getTime()}` : "";
  const [aperturas, setAperturas] = useState({});
  const pedidasRef = useRef(new Set());
  useEffect(() => {
    if (!claveEspera || pedidasRef.current.has(claveEspera)) return undefined;
    pedidasRef.current.add(claveEspera);
    const pedidoEn = new Date();
    let vigente = true;
    chatApi
      .post("/dashboard/atencion/abrir", {
        id_cliente_chat_center: selectedChat.id,
      })
      .then(({ data }) => {
        if (!vigente) return;
        const d = data?.data || {};
        setAperturas((prev) => ({
          ...prev,
          [claveEspera]: {
            estado: d.modo === "observador" ? "observador" : "propio",
            abierto: parseFechaMensaje(d.abierto_at) || (d.modo === "observador" ? null : pedidoEn),
            horario: d.horario?.inicio != null ? d.horario : HORARIO_DEFAULT,
            encargado: d.encargado || null,
            quienAbrio: d.quien_abrio || null,
          },
        }));
      })
      .catch(() => {
        // Sin backend: reloj propio desde ahora, para no dejar al asesor sin dato.
        if (!vigente) return;
        setAperturas((prev) => ({
          ...prev,
          [claveEspera]: {
            estado: "propio",
            abierto: pedidoEn,
            horario: HORARIO_DEFAULT,
            encargado: null,
            quienAbrio: null,
          },
        }));
      });
    return () => {
      vigente = false;
    };
    // selectedChat.id ya va dentro de claveEspera
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveEspera]);

  const apertura = claveEspera ? aperturas[claveEspera] || null : null;

  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!esperaDesde) return undefined;
    setAhora(Date.now());
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [esperaDesde]);

  if (!activo) return null;

  if (!esperaDesde) {
    return (
      <div
        className="hidden sm:flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 shadow-sm"
        title="El cliente no está esperando respuesta"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100">
          <i className="bx bx-check-double text-[14px] text-emerald-700" />
        </span>
        <span className="text-xs font-semibold text-emerald-700 hidden lg:inline">
          Al día
        </span>
      </div>
    );
  }

  const minutosCliente = Math.max(0, (ahora - esperaDesde.getTime()) / 60000);
  const espera = `cliente espera ${formatEspera(minutosCliente)}`;

  if (!apertura) {
    return (
      <Caja
        tema={TEMAS.neutro}
        icono="bx-timer"
        titulo="…"
        detalle={espera}
        title="Consultando quién abrió este chat"
      />
    );
  }

  const horario = apertura.horario || HORARIO_DEFAULT;
  // Fuera de horario el reloj no avanza: el último minuto no suma.
  const enHorario = segundosHabiles(ahora - 60_000, ahora, horario) > 0;
  const pausa = enHorario ? "" : " · fuera de horario, reloj en pausa";

  /* ── Observador (administrador leyendo un chat ajeno) ── */
  if (apertura.estado === "observador") {
    if (!apertura.abierto) {
      return (
        <Caja
          tema={TEMAS.neutro}
          icono="bx-hourglass"
          titulo="Sin abrir"
          detalle={`Ningún asesor ha abierto este chat · ${espera}`}
          title={`Nadie del equipo ha abierto este chat desde que el cliente escribió. Como administrador no se te cuenta tiempo. El cliente escribió hace ${formatEspera(minutosCliente)}.`}
        />
      );
    }
    const seg = segundosHabiles(apertura.abierto.getTime(), ahora, horario);
    const nivel = nivelDe(seg / 60);
    const quien = primerNombre(
      apertura.quienAbrio?.nombre || apertura.encargado?.nombre,
    );
    const esEncargado =
      apertura.encargado &&
      apertura.quienAbrio &&
      Number(apertura.encargado.id_sub_usuario) ===
        Number(apertura.quienAbrio.id_sub_usuario);
    return (
      <Caja
        tema={TEMAS[nivel]}
        icono="bx-timer"
        titulo={formatoReloj(seg)}
        detalle={`${quien} lleva el chat abierto sin responder · ${espera}${pausa}`}
        title={`Estás viendo el reloj de ${apertura.quienAbrio?.nombre || "el asesor"}${
          esEncargado ? " (encargado del chat)" : ""
        }. A ti no se te cuenta tiempo: entraste como administrador a leer un chat ajeno. Solo cuenta dentro del horario de atención.`}
      />
    );
  }

  /* ── Propio ── */
  const seg = segundosHabiles(
    (apertura.abierto || new Date(ahora)).getTime(),
    ahora,
    horario,
  );
  const nivel = nivelDe(seg / 60);
  const etiqueta =
    nivel === "critico"
      ? "¡Te estás demorando!"
      : nivel === "advertencia"
        ? "Responde ya"
        : "Tu tiempo en este chat";
  return (
    <Caja
      tema={TEMAS[nivel]}
      icono="bx-timer"
      titulo={formatoReloj(seg)}
      detalle={`${etiqueta} · ${espera}${pausa}`}
      title={`Llevas ${formatoReloj(seg)} de horario de atención con este chat abierto sin responder. El cliente escribió hace ${formatEspera(minutosCliente)}.`}
    />
  );
}
