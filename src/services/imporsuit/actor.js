import { jwtDecode } from "jwt-decode";

/**
 * Identidad del AGENTE de chatcenter (subusuario) para la auditoría de cartera.
 *
 * No hay JWT por usuario hacia Imporsuit (la integración usa un token compartido),
 * así que el actor se arma en el front desde el JWT de chatcenter (localStorage)
 * y se manda al backend en el body (`_cc_actor`) vía el interceptor de imporsuitApi.
 *
 * Se manda por BODY y no por header a propósito: el `.htaccess` de Imporsuit solo
 * permite `Content-Type, Authorization` en CORS; un header custom rompería el
 * preflight. Esto es atribución para auditoría, NO un mecanismo de seguridad.
 */

/**
 * Lee el actor actual del JWT de chatcenter. Tolerante a errores: si no hay token
 * o no se puede decodificar, devuelve un objeto con los campos en null.
 *
 * @returns {{id_usuario:?number, id_sub_usuario:?(number|string), nombre:string, email:string, rol:string}}
 */
export function getActorChatcenter() {
  const num = (v) => (v === undefined || v === null || v === "" ? null : Number(v));
  try {
    const token = localStorage.getItem("token");
    const d = token ? jwtDecode(token) : {};
    return {
      id_usuario: num(d?.id_usuario ?? localStorage.getItem("id_usuario")),
      id_sub_usuario: num(d?.id_sub_usuario ?? localStorage.getItem("id_sub_usuario")),
      nombre: d?.nombre_encargado || d?.nombre || d?.usuario || "",
      email: d?.email || "",
      rol: d?.rol || d?.role || localStorage.getItem("user_role") || "",
    };
  } catch {
    return {
      id_usuario: num(localStorage.getItem("id_usuario")),
      id_sub_usuario: num(localStorage.getItem("id_sub_usuario")),
      nombre: "",
      email: "",
      rol: localStorage.getItem("user_role") || "",
    };
  }
}

/**
 * Contexto liviano de la cartera abierta (id_configuracion del chat + correo del
 * cliente). Lo setea CarteraImporsuitSection al abrir el modal; el interceptor lo
 * mergea en `_cc_actor` para enriquecer la auditoría.
 */
let _carteraCtx = { id_configuracion: null, correo: null };

export function setCarteraCtx(ctx = {}) {
  _carteraCtx = {
    id_configuracion:
      ctx.id_configuracion != null && ctx.id_configuracion !== ""
        ? Number(ctx.id_configuracion)
        : null,
    correo: ctx.correo || null,
  };
}

export function getCarteraCtx() {
  return _carteraCtx;
}
