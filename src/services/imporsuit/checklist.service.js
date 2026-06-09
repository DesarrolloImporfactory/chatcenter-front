import imporsuitApi from "../../api/imporsuit";

/**
 * Checklist del Alumno (Club de Importadores) — SOLO LECTURA desde chatcenter.
 * Endpoint "libre" del controlador Carterachat (token compartido):
 *   GET /Carterachat/checklist_usuario?correo=…  (o ?id_usuario=…)
 *
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
