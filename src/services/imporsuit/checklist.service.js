import imporsuitApi from "../../api/imporsuit";

/**
 * Checklist del Alumno (Club de Importadores) desde chatcenter.
 * Endpoints "libres" del controlador Carterachat (token compartido):
 *   GET  /Carterachat/checklist_usuario?correo=…  (o ?id_usuario=…)   ← lectura
 *   POST /Carterachat/checklist_marcar  { correo|id_usuario, id_item, completado }
 *   POST /Carterachat/checklist_nota    { correo|id_usuario, id_item, notas }
 *
 * El asesor puede ver Y llenar el checklist del cliente (marcar pasos y notas).
 * Devuelve { secciones:[{…, items:[{…, completado, notas}]}], metricas, id_usuario }.
 * Si el cliente no tiene cuenta en Imporsuit, devuelve estructura vacía (0%).
 */

const METRICAS_VACIAS = {
  total: 0,
  completados: 0,
  pct: 0,
  por_seccion: [],
  ultima_actividad: null,
};

function unwrap(data) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const status = data.status;
    if (status != null && Number(status) >= 400) {
      const err = new Error(data.message || data.title || `Error ${status}`);
      err.status = Number(status);
      err.payload = data;
      throw err;
    }
  }
  return data;
}

/**
 * @param {{ correo?: string, idUsuario?: number, signal?: AbortSignal }} opts
 * @returns {Promise<{ secciones: any[], metricas: object, id_usuario: number }>}
 */
export async function getChecklistUsuario({ correo, idUsuario, signal } = {}) {
  const params = {};
  if (idUsuario) params.id_usuario = idUsuario;
  else if (correo) params.correo = correo;

  const { data } = await imporsuitApi.get("/Carterachat/checklist_usuario", {
    params,
    signal,
  });
  unwrap(data);

  const d = data?.data || {};
  return {
    secciones: Array.isArray(d.secciones) ? d.secciones : [],
    metricas: d.metricas || { ...METRICAS_VACIAS },
    id_usuario: Number(d.id_usuario) || 0,
  };
}

/**
 * Marca/desmarca un paso del checklist del cliente (ESCRITURA).
 * Pasa idUsuario cuando lo tengas (lo devuelve getChecklistUsuario); si no, correo.
 *
 * @param {{ correo?: string, idUsuario?: number, idItem: number, completado: boolean, signal?: AbortSignal }} opts
 * @returns {Promise<{ ok: boolean, id_usuario: number }>}
 */
export async function marcarChecklistItem({
  correo,
  idUsuario,
  idItem,
  completado,
  signal,
} = {}) {
  const body = { id_item: Number(idItem), completado: !!completado };
  if (idUsuario) body.id_usuario = Number(idUsuario);
  else if (correo) body.correo = correo;

  const { data } = await imporsuitApi.post(
    "/Carterachat/checklist_marcar",
    body,
    { signal },
  );
  unwrap(data);
  return { ok: true, id_usuario: Number(data?.id_usuario) || Number(idUsuario) || 0 };
}

/**
 * Guarda/edita la nota de un paso del checklist del cliente (ESCRITURA).
 *
 * @param {{ correo?: string, idUsuario?: number, idItem: number, notas: string, signal?: AbortSignal }} opts
 * @returns {Promise<{ ok: boolean, id_usuario: number }>}
 */
export async function guardarNotaChecklist({
  correo,
  idUsuario,
  idItem,
  notas,
  signal,
} = {}) {
  const body = { id_item: Number(idItem), notas: String(notas ?? "") };
  if (idUsuario) body.id_usuario = Number(idUsuario);
  else if (correo) body.correo = correo;

  const { data } = await imporsuitApi.post(
    "/Carterachat/checklist_nota",
    body,
    { signal },
  );
  unwrap(data);
  return { ok: true, id_usuario: Number(data?.id_usuario) || Number(idUsuario) || 0 };
}
