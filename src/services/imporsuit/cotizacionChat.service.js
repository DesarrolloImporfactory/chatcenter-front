import imporsuitApi from "../../api/imporsuit";

/**
 * Solicitud de cotización desde el chat (pedido 2026-10-12, partes 1 y 2).
 * Controlador Cotizachat de Imporsuit, mismo token compartido que Carterachat.
 *
 *   GET  /Cotizachat/del_chat?chat=ID        → pedidos del chat + reglas
 *   POST /Cotizachat/pedir                   → crea la solicitud para pricing
 *   POST /Cotizachat/responder               → contesta el dato que pide pricing
 *
 * El sobre siempre llega con HTTP 200: {status, message, data}. Un status
 * >= 400 es error y se lanza con el message del servidor tal cual (403 sin
 * silla, 404 chat ajeno, 429 demasiados pedidos, 503 no disponible). Los
 * países, tipos, tope de productos y reglas de tiempo NO se escriben aquí:
 * vienen en data.reglas.
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

/** Reglas por defecto mientras el servidor no responde (se pisan con data.reglas). */
export const REGLAS_COTIZACION_DEFAULT = {
  meta_min: 30,
  meta: "30 min",
  dias: "lunes a viernes",
  cierre_semanal: "viernes",
  cierre_hoy: false,
  paises: { ec: "Ecuador", mx: "México" },
  tipos: { grupal: "Carga grupal", cajas: "Por cajas" },
  max_productos: 8,
};

/**
 * Solicitudes del chat (abiertas + últimos 14 días) y reglas vigentes.
 * @returns {Promise<{chat:number, pedidos:object[], reglas:object}>}
 */
export async function getCotizacionesDelChat(chatId, { signal } = {}) {
  const { data } = await imporsuitApi.get("/Cotizachat/del_chat", {
    params: { chat: Number(chatId) },
    signal,
  });
  unwrap(data);
  const d = data?.data || {};
  return {
    chat: d.chat ?? Number(chatId),
    pedidos: Array.isArray(d.pedidos) ? d.pedidos : [],
    reglas: { ...REGLAS_COTIZACION_DEFAULT, ...(d.reglas || {}) },
  };
}

/**
 * Crea la solicitud. `productos` ya viene con la forma del tipo:
 *  grupal → { producto, precio, unidades_caja, cbm_caja, cantidad? }
 *  cajas  → { producto, cajas }
 * El interceptor del axios agrega `_cc_actor` (id_sub_usuario) al body.
 */
export async function pedirCotizacion({ chatId, pais, tipo = "grupal", productos, nota }) {
  const body = {
    chat: Number(chatId),
    pais,
    tipo,
    productos,
    ...(nota && String(nota).trim() ? { nota: String(nota).trim() } : {}),
  };
  const { data } = await imporsuitApi.post("/Cotizachat/pedir", body);
  unwrap(data);
  return data;
}

/** Contesta el dato que pidió pricing. Devuelve lo mismo que del_chat, actualizado. */
export async function responderCotizacion({ chatId, id, respuesta }) {
  const { data } = await imporsuitApi.post("/Cotizachat/responder", {
    id: Number(id),
    chat: Number(chatId),
    respuesta: String(respuesta || "").trim(),
  });
  unwrap(data);
  const d = data?.data || {};
  return {
    message: data?.message || "Respuesta enviada a pricing",
    pedidos: Array.isArray(d.pedidos) ? d.pedidos : null,
    reglas: d.reglas ? { ...REGLAS_COTIZACION_DEFAULT, ...d.reglas } : null,
  };
}
