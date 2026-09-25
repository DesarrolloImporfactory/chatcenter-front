import imporsuitApi from "../../api/imporsuit";
import chatApi from "../../api/chatcenter";
import { getActorChatcenter } from "./actor";

/**
 * Análisis IA de cotizaciones no cerradas, desde el panel del chat.
 * Endpoints del controlador Carterachat (token compartido):
 *   GET  /Carterachat/ia_cotizaciones?telefono=…&agente=<id_sub_usuario>   ← lectura
 *   POST /Carterachat/ia_analizar { tipo, id, forzar? }   (el interceptor
 *        agrega `_cc_actor`, de donde el back saca el id_sub_usuario)
 *
 * Solo para los agentes habilitados (hoy Johan), sobre cualquier asesor: el
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
 * Cotizaciones sin respuesta (más de 3 días sin cerrarse) del cliente
 * de este teléfono, de cualquier asesor, con su último análisis.
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
 * Bandeja de «Seguimiento IA» (página /seguimiento-ia): todas las
 * cotizaciones atascadas de todos los asesores con su análisis, el chat de
 * cada cliente en la línea (265) con su encargado, y el departamento del
 * agente en esa línea (lo pide la transferencia).
 *
 * @returns {Promise<{ total, total_paginas, pagina, total_alcance, conteos,
 *   asesores, data, linea, departamento_agente }>}
 */
export async function getBandejaIA(filtros = {}, { signal } = {}) {
  const params = { agente: getActorChatcenter().id_sub_usuario ?? "" };
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== "" && v != null) params[k] = v;
  });
  const { data } = await imporsuitApi.get("/Carterachat/ia_bandeja", { params, signal });
  unwrap(data);
  return data;
}

/** Saca una cotización del seguimiento; el motivo es obligatorio. */
export async function descartarCotizacionIA({ tipo, id, motivo }) {
  const { data } = await imporsuitApi.post("/Carterachat/ia_descartar", { tipo, id: Number(id), motivo });
  unwrap(data);
}

/** La vuelve a poner en el seguimiento. */
export async function restaurarCotizacionIA({ tipo, id }) {
  const { data } = await imporsuitApi.post("/Carterachat/ia_restaurar", { tipo, id: Number(id) });
  unwrap(data);
}

/**
 * El agente se asigna el chat de un cliente que hoy atiende otro asesor. Usa
 * la transferencia normal del socket (historial, aviso en el chat y refresco
 * en vivo); el socket solo lo permite a los subusuarios habilitados y solo
 * hacia sí mismos (SUB_USUARIOS_AUTOASIGNAN en utils/historialEncargados.js).
 */
export async function asignarmeChat({ idCliente, idConfiguracion, idDepartamento, motivo }) {
  const actor = getActorChatcenter();
  await chatApi.post(
    "departamentos_chat_center/transferirChat",
    {
      source: "wa",
      id_encargado: actor.id_sub_usuario,
      id_departamento: idDepartamento,
      id_cliente_chat_center: idCliente,
      id_configuracion: idConfiguracion,
      motivo,
      emisor: actor.nombre,
    },
    { silentError: true },
  );
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
