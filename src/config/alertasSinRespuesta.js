/**
 * Alerta de chats sin respuesta y cronómetro del asesor.
 *
 * Marca en la lista de chats a los clientes que escribieron y siguen sin
 * respuesta: ámbar a los 5 minutos, rojo a los 10. Los de más de 10 minutos
 * además disparan un aviso emergente. En la cabecera del chat abierto corre
 * el cronómetro del asesor (CronometroRespuesta.jsx).
 *
 * Nació como piloto para 265 y 242 (CONFIGURACIONES_HABILITADAS); desde el
 * 2026-09-25 aplica a todas las conexiones. El gating sigue viviendo en
 * alertasSinRespuestaActivas por si hay que volver a acotarlo.
 */

export const CONFIGURACIONES_HABILITADAS = [265, 242];

/* 2026-09-25: de 15/30 a 5/10. Para ventas, diez minutos sin contestar ya es
   demasiado. Los mismos umbrales usa el dashboard de atención en el back
   (atencion_asesores.service.js, UMBRALES_MIN): si se cambian, van juntos. */
export const MINUTOS_ADVERTENCIA = 5;
export const MINUTOS_CRITICO = 10;

/* Envíos que NO son respuesta a nadie (rol 1): plantillas del cron, avisos
   de Dropi/Shopify, remarketing… Copia de RESPONSABLES_AUTOMATICOS de
   liberar_sin_respuesta.service.js del back. Sirve al cronómetro del chat
   abierto: si el último mensaje es una plantilla del cron, el cliente sigue
   esperando. En cambio el bot (IA_*) SÍ atiende: si le contestó al cliente,
   el cliente no está esperando. Y lo enviado desde la app de
   Messenger/Instagram o desde el celular es una persona. */
const PREFIJOS_AUTOMATICOS = /^cron_/i;
export const RESPONSABLES_AUTOMATICOS = [
  "CRM Ventas",
  "Dropi Status",
  "Aliclik Status",
  "Bot Confirmación",
  "Sistema de valoraciones",
  "Shopify Confirmación",
  "Shopify Recovery",
  "Automatizador | Cotizador Pro",
  "Encuesta Link Público",
  "Aviso calendario",
  "Agenda",
  "sistema",
].map((r) => r.toLowerCase());

export const esResponsableAutomatico = (responsable) => {
  if (!responsable) return false;
  const r = String(responsable).trim();
  if (PREFIJOS_AUTOMATICOS.test(r)) return true;
  return RESPONSABLES_AUTOMATICOS.includes(r.toLowerCase());
};

/** Mensaje que atiende al cliente: una persona del equipo o el bot; no una
 *  plantilla del cron ni un aviso automático. */
export const esRespuestaHumana = (m) =>
  Number(m?.rol_mensaje) === 1 &&
  m?.tipo_mensaje !== "revoke" &&
  !m?.eliminado_at &&
  !esResponsableAutomatico(m?.responsable);

/** Horario de atención por defecto (el back manda el de cada conexión). */
export const HORARIO_DEFAULT = { inicio: 8, fin: 17, dias: [1, 2, 3, 4, 5] };
const MS_MIN = 60_000;
const MS_DIA = 24 * 60 * MS_MIN;
const OFFSET_MIN = -5 * 60;

/**
 * Segundos entre dos instantes contando solo el horario de atención.
 *
 * Misma cuenta que minutosHabiles() del back (liberar_sin_respuesta.service):
 * se trabaja en "hora de Ecuador como si fuera UTC" para cortar los días a
 * medianoche local sin depender de la zona del navegador. Abrir el chat el
 * viernes 16:57 y contestar el lunes 09:00 son 3 + 60 minutos, no 64 horas.
 */
export const segundosHabiles = (desdeMs, hastaMs, horario = HORARIO_DEFAULT) => {
  if (desdeMs == null || hastaMs == null || hastaMs <= desdeMs) return 0;
  const h = horario || HORARIO_DEFAULT;
  const dias = Array.isArray(h.dias) && h.dias.length ? h.dias : HORARIO_DEFAULT.dias;
  const aLocal = (ms) => ms + OFFSET_MIN * MS_MIN;
  const desde = aLocal(desdeMs);
  const hasta = aLocal(hastaMs);
  let total = 0;
  for (let dia = Math.floor(desde / MS_DIA) * MS_DIA; dia < hasta; dia += MS_DIA) {
    if (!dias.includes(new Date(dia).getUTCDay())) continue;
    const abre = Math.max(desde, dia + h.inicio * 60 * MS_MIN);
    const cierra = Math.min(hasta, dia + h.fin * 60 * MS_MIN);
    if (cierra > abre) total += (cierra - abre) / 1000;
  }
  return total;
};

/**
 * Desde cuándo espera el cliente en el chat abierto, o null si no espera.
 *
 * Misma regla que el back (liberar_sin_respuesta / atencion_asesores): la
 * espera arranca en el PRIMER mensaje del cliente posterior a la última
 * respuesta humana. Si el cliente escribe cinco veces seguidas, el reloj no
 * se reinicia; y una respuesta del bot no lo apaga.
 */
export const inicioEsperaDelChat = (lista) => {
  if (!Array.isArray(lista) || lista.length === 0) return null;
  /* Chat.jsx guarda `chatMessages` como una lista de chats, cada uno con su
     `mensajes` adentro (ver getOrderedChats). Se aplana y se ordena por
     fecha, que es lo único que garantiza "la última respuesta humana". */
  const mensajes = lista
    .flatMap((item) => (Array.isArray(item?.mensajes) ? item.mensajes : [item]))
    .filter((m) => m && m.rol_mensaje !== undefined)
    .map((m) => ({ m, t: parseFechaMensaje(m.created_at)?.getTime() ?? 0 }))
    .sort((a, b) => a.t - b.t)
    .map((x) => x.m);
  if (mensajes.length === 0) return null;
  let ultimaHumana = -1;
  for (let i = mensajes.length - 1; i >= 0; i -= 1) {
    if (esRespuestaHumana(mensajes[i])) {
      ultimaHumana = i;
      break;
    }
  }
  for (let i = ultimaHumana + 1; i < mensajes.length; i += 1) {
    const m = mensajes[i];
    if (Number(m?.rol_mensaje) === 0 && !m?.eliminado_at) {
      return parseFechaMensaje(m.created_at);
    }
  }
  return null;
};

export const NIVEL_ADVERTENCIA = "advertencia";
export const NIVEL_CRITICO = "critico";

/** Cada cuánto se recalculan los minutos de espera de la lista visible. */
export const INTERVALO_REFRESCO_MS = 30_000;

/** Cada cuánto se le pregunta al backend por toda la configuración. */
export const INTERVALO_CONSULTA_MS = 60_000;

/** Tiempo mínimo entre un aviso emergente y el siguiente. */
export const PAUSA_ENTRE_AVISOS_MS = 30 * 60_000;

/** Cuánto se recuerda que un chat ya fue avisado (para no crecer sin fin). */
export const RECUERDO_AVISADOS_MS = 7 * 24 * 60 * 60_000;

/* 2026-09-25: se abre a TODAS las conexiones (badges del sidebar, aviso
   emergente y cronómetro de la cabecera). El piloto en 265 y 242 ya validó
   la lógica; la lista queda como registro de dónde empezó. */
export const alertasSinRespuestaActivas = (id_configuracion) =>
  Number.isFinite(Number(id_configuracion)) && Number(id_configuracion) > 0;

/**
 * Zona en la que la base guarda y devuelve los DATETIME.
 *
 * `database/config.js` define un typeCast que devuelve los DATETIME como
 * string cruda (`field.string()`) justamente para que nadie los convierta a
 * UTC. Así que al navegador llega "2026-08-25 12:19:57" sin marca de zona,
 * y ese valor está en -05:00, no en UTC.
 */
export const OFFSET_BD = '-05:00';

/**
 * Convierte la fecha del último mensaje en Date.
 *
 * Una string sin zona hay que anclarla a OFFSET_BD. Dejar que `new Date()`
 * la interprete —o peor, asumir UTC— corre la cuenta cinco horas, que es
 * mucho más que los umbrales de 15 y 30 minutos: todos los chats saldrían
 * en rojo apenas el cliente escribe.
 */
export const parseFechaMensaje = (valor) => {
  if (!valor) return null;
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  const texto = String(valor).trim();
  if (!texto) return null;

  const sinZona = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/;
  const normalizado = sinZona.test(texto)
    ? `${texto.replace(" ", "T")}${OFFSET_BD}`
    : texto;

  const fecha = new Date(normalizado);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

/**
 * Minutos que lleva esperando el cliente, o null si el chat no está esperando.
 *
 * No hace falta columna nueva ni cron: la vista ya expone el rol del último
 * mensaje como `mensaje_rol` (0 = el cliente). En cuanto un asesor responde
 * pasa a 1 y la alerta se apaga sola.
 *
 * El fallback a `rol_mensaje` es por los objetos que arma el propio front
 * en memoria, que en algunos puntos usan ese nombre.
 */
export const minutosSinRespuesta = (chat, ahora = Date.now()) => {
  if (!chat) return null;

  const rol = chat.mensaje_rol ?? chat.rol_mensaje;
  if (Number(rol) !== 0) return null;
  // Un chat marcado como resuelto no sigue corriendo el reloj.
  if (Number(chat.chat_cerrado) === 1) return null;

  const fecha = parseFechaMensaje(chat.mensaje_created_at);
  if (!fecha) return null;

  const minutos = (ahora - fecha.getTime()) / 60000;
  // Negativo = fecha en el futuro (reloj desfasado): mejor no inventar alerta.
  return minutos < 0 ? null : minutos;
};

export const nivelSinRespuesta = (chat, ahora = Date.now()) => {
  const minutos = minutosSinRespuesta(chat, ahora);
  if (minutos === null) return null;
  if (minutos >= MINUTOS_CRITICO) return NIVEL_CRITICO;
  if (minutos >= MINUTOS_ADVERTENCIA) return NIVEL_ADVERTENCIA;
  return null;
};

/** "18m", "1h 05m", "2d 3h" — para el badge y el listado del aviso. */
export const formatEspera = (minutos) => {
  if (minutos === null || minutos === undefined) return "";
  const total = Math.floor(minutos);
  if (total < 60) return `${total}m`;

  const horas = Math.floor(total / 60);
  if (horas < 24) return `${horas}h ${String(total % 60).padStart(2, "0")}m`;

  const dias = Math.floor(horas / 24);
  return `${dias}d ${horas % 24}h`;
};
