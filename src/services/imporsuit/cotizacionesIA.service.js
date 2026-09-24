import imporsuitApi from "../../api/imporsuit";
import { getActorChatcenter } from "./actor";

/**
 * Análisis IA de cotizaciones no cerradas, desde el panel del chat.
 * Endpoints del controlador Carterachat (token compartido):
 *   GET  /Carterachat/ia_cotizaciones?telefono=…&agente=<id_sub_usuario>   ← lectura
 *   POST /Carterachat/ia_analizar { tipo, id, forzar? }   (el interceptor
 *        agrega `_cc_actor`, de donde el back saca el id_sub_usuario)
 *
 * Solo para los agentes habilitados (hoy Johan) y sobre SUS cotizaciones: el
 * back busca el correo del subusuario en chatcenter, lo cruza con su usuario
 * de Imporsuit y lo valida con AnalisisCotizacionIA::USUARIOS_HABILITADOS.
 *
 * El análisis lo lee el asesor; nunca se le envía al cliente.
 */

function unwrap(data) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const status = Number(data.status);
    if (data.status != null && status >= 400) {
      const err = new Error(data.message || data.title || `Error ${status}`);
      err.status = status;
      err.payload = data;
      throw err;
    }
  }
  return data;
}

/**
 * Cotizaciones atascadas (más de 3 días sin cerrarse, o anuladas) del cliente
 * de este teléfono que son del agente, con su último análisis.
 *
 * @returns {Promise<Array<{tipo:"grupal"|"directa", id:number, codigo:string,
 *   estado:string, fecha_creacion:string, modo:string, analisis:object|null}>>}
 */
export async function getCotizacionesIA({ telefono, signal } = {}) {
  const { data } = await imporsuitApi.get("/Carterachat/ia_cotizaciones", {
    params: { telefono, agente: getActorChatcenter().id_sub_usuario ?? "" },
    signal,
  });
  unwrap(data);
  return Array.isArray(data?.data) ? data.data : [];
}

/**
 * Analiza una cotización. Tarda de 10 s a 1 min: el timeout de la instancia
 * (30 s) no alcanza, así que se sube acá. Si igual se corta, el back termina
 * y el panel lo vuelve a pedir con getCotizacionesIA.
 *
 * @returns {Promise<object>} el análisis
 */
export async function analizarCotizacionIA({ tipo, id, forzar = false } = {}) {
  const { data } = await imporsuitApi.post(
    "/Carterachat/ia_analizar",
    { tipo, id: Number(id), forzar: forzar ? 1 : 0 },
    { timeout: 180000 },
  );
  unwrap(data);
  return data?.analisis ?? null;
}
