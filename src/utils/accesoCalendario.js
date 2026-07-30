/* Acceso a la sección Calendario.
 *
 * TEMPORAL: habilitado para TODOS los planes mientras se termina de definir la
 * sección de planes. Se abre a propósito, no por descuido.
 *
 * Antes la regla era la lista `PLANES_CALENDARIO = [1, 3, 4]` copiada en
 * MainLayout, Cabecera y DatosUsuarioModerno. Tres copias de la misma regla es
 * justamente cómo se llega a que una cuenta vea el menú en un lado y le salte el
 * bloqueo en otro. Ahora vive en un solo sitio.
 *
 * Para volver a restringir: poner los ids de plan en PLANES_CON_CALENDARIO
 * (ej. [1, 3, 4]). Con `null` entran todos.
 */
export const PLANES_CON_CALENDARIO = null;

export function puedeAccederCalendario(idPlan) {
  if (!Array.isArray(PLANES_CON_CALENDARIO)) return true;
  return PLANES_CON_CALENDARIO.includes(Number(idPlan));
}
