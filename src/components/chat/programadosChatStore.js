import { getProgramadosVigentesPorChat } from "../../services/programados.service";

/**
 * Estado compartido de las plantillas programadas del CHAT ABIERTO.
 *
 * Vive fuera de React porque tres consumidores necesitan lo mismo al mismo
 * tiempo (el aviso sobre el input, el modal de plantillas y el guardia antes
 * de enviar) y no tiene sentido que cada uno consulte por su lado: una sola
 * carga por chat, más los parches que llegan por socket.
 *
 * Solo guarda el chat que el asesor tiene abierto y el anterior — nunca la
 * cuenta completa.
 */

const ESTADOS_VIGENTES = new Set(["pendiente", "procesando"]);
const TTL_MS = 60 * 1000; // revalidar al reabrir un chat después de 1 min

const store = new Map(); // clave -> { items, ts, cargando, error }
const suscriptores = new Set();
const enVuelo = new Set();

export function claveProgramados(idConfiguracion, idClienteChatCenter) {
  const cfg = Number(idConfiguracion);
  const cli = Number(idClienteChatCenter);
  if (!cfg || !cli) return null;
  return `${cfg}:${cli}`;
}

function notificar() {
  suscriptores.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error("programadosChatStore:", e);
    }
  });
}

export function subscribe(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

/** Snapshot inmutable: [] estable cuando no hay nada, para no re-renderizar. */
const VACIO = [];

export function getProgramados(clave) {
  return store.get(clave)?.items || VACIO;
}

/** Carga el chat si no está fresco. Silenciosa: si falla, no hay aviso. */
export async function ensureProgramados(
  idConfiguracion,
  idClienteChatCenter,
  { force = false } = {},
) {
  const clave = claveProgramados(idConfiguracion, idClienteChatCenter);
  if (!clave || enVuelo.has(clave)) return;

  const hit = store.get(clave);
  if (!force && hit && Date.now() - hit.ts < TTL_MS) return;

  enVuelo.add(clave);
  try {
    const items = await getProgramadosVigentesPorChat(
      idConfiguracion,
      idClienteChatCenter,
    );
    store.set(clave, { items, ts: Date.now() });
    notificar();
  } catch {
    // Silencioso: el chat sigue funcionando sin el aviso.
  } finally {
    enVuelo.delete(clave);
  }
}

/** Invalida un chat para que la próxima apertura vuelva a consultar. */
export function invalidarProgramados(idConfiguracion, idClienteChatCenter) {
  const clave = claveProgramados(idConfiguracion, idClienteChatCenter);
  if (clave) store.delete(clave);
  notificar();
}

/**
 * Aplica un PROGRAMADO_ESTADO recibido por socket.
 *
 * Si el evento deja de ser vigente (enviado/error/cancelado) se saca de la
 * lista; si es uno nuevo o cambió de fecha, se inserta/actualiza y se
 * reordena. Así el aviso se limpia solo cuando el cron manda el mensaje, sin
 * que el asesor tenga que recargar.
 */
export function aplicarEventoProgramado(evento = {}) {
  const clave = claveProgramados(
    evento.id_configuracion,
    evento.id_cliente_chat_center,
  );
  if (!clave) return;

  const actual = store.get(clave);
  // Sin carga previa no hay nada que parchear: al abrir el chat se consulta.
  if (!actual) return;

  const mismoRegistro = (a, b) =>
    a.id != null && b.id != null
      ? Number(a.id) === Number(b.id)
      : a.uuid_lote === b.uuid_lote &&
        String(a.telefono || "") === String(b.telefono || "");

  let items = actual.items.filter((it) => !mismoRegistro(it, evento));

  if (ESTADOS_VIGENTES.has(String(evento.estado))) {
    items.push(evento);
    items.sort((a, b) =>
      String(a.fecha_programada_utc || a.fecha_programada || "").localeCompare(
        String(b.fecha_programada_utc || b.fecha_programada || ""),
      ),
    );
  }

  store.set(clave, { items, ts: actual.ts });
  notificar();
}
