import imporsuitApi from "../../api/imporsuit";

/**
 * Servicio de AUDITORÍA de la cartera de Imporsuit (lectura).
 * Endpoint "libre" del controlador `Carterachat` (token compartido):
 *   POST /Carterachat/auditoria
 *
 * Las acciones se registran automáticamente en el backend cuando un agente opera
 * la cartera desde el panel del chat (crear cliente, generar cartera, agregar
 * deuda, registrar pago, eliminar deuda). Acá solo se LISTAN.
 */

/**
 * Lista paginada de auditoría con filtros.
 *
 * @param {{
 *   accion?: string, resultado?: 'ok'|'error',
 *   actor_id_sub_usuario?: number, actor_id_usuario?: number,
 *   desde?: string, hasta?: string, search?: string,
 *   page?: number, limit?: number
 * }} filtros
 * @returns {Promise<{status:number, data:Array, total:number, page:number, limit:number, total_pages:number}>}
 */
export async function listarAuditoria(filtros = {}, { signal } = {}) {
  const { data } = await imporsuitApi.post("/Carterachat/auditoria", filtros, {
    signal,
  });
  if (data && Number(data.status) >= 400) {
    const err = new Error(data.message || `Error ${data.status}`);
    err.status = Number(data.status);
    throw err;
  }
  return {
    data: Array.isArray(data?.data) ? data.data : [],
    total: Number(data?.total ?? 0),
    page: Number(data?.page ?? 1),
    limit: Number(data?.limit ?? 25),
    total_pages: Number(data?.total_pages ?? 1),
  };
}
