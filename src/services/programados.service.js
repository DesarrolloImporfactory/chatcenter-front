import chatApi from "../api/chatcenter";

/**
 * Plantillas programadas vistas desde el chat center.
 *
 * Regla de la casa: NUNCA se piden todos los programados de la cuenta. Los
 * lotes masivos dejan decenas de miles de filas y traerlas para pintar un
 * badge tumba la vista. Solo se consulta:
 *   - el resumen de los chats que el asesor tiene a la vista (1 batch), y
 *   - el detalle del chat que abre.
 */

const BASE = "/whatsapp_managment";

/** Fecha local (`YYYY-MM-DD HH:mm:ss` de MySQL) -> Date sin corrimiento de zona. */
export function parseFechaProgramada(valor) {
  if (!valor) return null;
  const s = String(valor).trim().replace(" ", "T");
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "8 ago, 15:30" — corto porque va dentro de un badge o una línea de aviso. */
export function formatFechaProgramada(valor) {
  const d = parseFechaProgramada(valor);
  if (!d) return "";
  return d.toLocaleString("es-EC", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Resumen (conteo + próximo envío) de varios chats en UNA llamada.
 * @param {number} idConfiguracion
 * @param {number[]} ids  ids de clientes_chat_center visibles
 * @returns {Promise<Record<string, object>>} mapa id -> resumen
 */
export async function getProgramadosResumenChats(idConfiguracion, ids) {
  if (!idConfiguracion || !ids?.length) return {};

  const { data } = await chatApi.get(`${BASE}/programados_resumen_chats`, {
    params: { id_configuracion: idConfiguracion, ids: ids.join(",") },
  });

  return data?.ok ? data.data || {} : {};
}

/**
 * Programados VIGENTES (pendiente/procesando) de un solo chat, el próximo
 * primero. Es el detalle que se muestra al abrir la conversación.
 */
export async function getProgramadosVigentesPorChat(
  idConfiguracion,
  idClienteChatCenter,
) {
  if (!idConfiguracion || !idClienteChatCenter) return [];

  const { data } = await chatApi.get(`${BASE}/programados_por_chat`, {
    params: {
      id_configuracion: idConfiguracion,
      id_cliente_chat_center: idClienteChatCenter,
      vigentes: 1,
      limit: 50,
    },
  });

  return data?.ok && Array.isArray(data.data) ? data.data : [];
}
