import chatApi from "../../api/chatcenter";

/**
 * Cartera Imporchat: resuelve la cuenta del sistema que hay detrás de la
 * persona que escribe al soporte y lee sus KPIs.
 *
 * Back: socket/src/controllers/imporchat_cartera.controller.js
 *   GET /imporchat_cartera/buscar?telefono=&email=
 *   GET /imporchat_cartera/resumen?id_configuracion=&from=&until=
 *
 * Ambos exigen que el asesor pertenezca a una conexión de soporte (251/265);
 * si no, el back responde 403.
 */

/** id_configuracion donde se muestra la sección (espejo del back). */
export const IMPORCHAT_CONFIGS_HABILITADAS = [251, 265];

/**
 * @returns {Promise<{encontrado:boolean, coincidencia?:string, detalle?:string,
 *   usuario?:object, conexiones?:object[], buscado?:object}>}
 */
export async function buscarCuenta({ telefono, email }, { signal } = {}) {
  const { data } = await chatApi.get("imporchat_cartera/buscar", {
    params: {
      telefono: telefono || undefined,
      email: email || undefined,
    },
    signal,
    silentError: true,
  });
  return data;
}

/** KPIs del periodo para una conexión del cliente. */
export async function getResumenConexion(
  { id_configuracion, from, until },
  { signal } = {},
) {
  const { data } = await chatApi.get("imporchat_cartera/resumen", {
    params: { id_configuracion, from, until },
    signal,
    silentError: true,
  });
  return data;
}

/** Etiquetas legibles del campo por el que se encontró la cuenta. */
export const ETIQUETA_COINCIDENCIA = {
  telefono_personal: "Coincidió por el teléfono del registro",
  telefono_conexion: "Escribió desde el número de su propia conexión",
  email_propietario: "Coincidió por el correo del dueño de la cuenta",
  email_subusuario: "Coincidió por el correo de un colaborador de la cuenta",
};

/** Rangos rápidos: devuelve {from, until} en YYYY-MM-DD. */
export function rangoUltimosDias(dias) {
  const iso = (d) => d.toISOString().slice(0, 10);
  const hoy = new Date();
  const desde = new Date(hoy);
  desde.setDate(desde.getDate() - (dias - 1));
  return { from: iso(desde), until: iso(hoy) };
}
