/**
 * Alerta de chats sin respuesta — piloto para configuraciones puntuales.
 *
 * Marca en la lista de chats a los clientes que escribieron y siguen sin
 * respuesta: ámbar a los 15 minutos, rojo a los 30. Los de más de 30 minutos
 * además disparan un aviso emergente.
 *
 * Todo el gating vive acá: si la configuración no está en
 * CONFIGURACIONES_HABILITADAS, las funciones devuelven null y la vista de chat
 * queda exactamente igual que hoy para el resto de las cuentas.
 */

export const CONFIGURACIONES_HABILITADAS = [265, 242];

export const MINUTOS_ADVERTENCIA = 15;
export const MINUTOS_CRITICO = 30;

export const NIVEL_ADVERTENCIA = "advertencia";
export const NIVEL_CRITICO = "critico";

/** Cada cuánto se recalculan los minutos de espera de la lista visible. */
export const INTERVALO_REFRESCO_MS = 30_000;

/** Cada cuánto se le pregunta al backend por toda la configuración. */
export const INTERVALO_CONSULTA_MS = 60_000;

export const alertasSinRespuestaActivas = (id_configuracion) => {
  const id = Number(id_configuracion);
  return Number.isFinite(id) && CONFIGURACIONES_HABILITADAS.includes(id);
};

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
