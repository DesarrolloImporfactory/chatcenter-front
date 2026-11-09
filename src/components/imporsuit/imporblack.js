/**
 * ¿El contacto es ImporBlack? (programa del 09-nov-2026: Club de Importadores
 * + DropSystem + Bóveda USA por 2 años).
 *
 * Fuentes, en orden:
 *   · `productos_imporsuit_txt` del contacto (`clientes_chat_center`), que el
 *     PHP de Imporsuit reescribe al dar ImporBlack: «… · ImporBlack». Llega
 *     en el listado de Contactos; en el chat abierto solo si el socket lo
 *     expone en `vista_chats`.
 *   · `planes.imporblack` — los paquetes que trae GET_CHATS_BOX (`dataPlanes`),
 *     por si el socket lo suma a esa consulta.
 */
export function esImporblack(contacto, planes = null) {
  const txt = contacto?.productos_imporsuit_txt;
  if (txt && /imporblack/i.test(String(txt))) return true;
  return Number(planes?.imporblack) === 1;
}

/** "2028-11-09" → "09 nov 2028" (o "" si no es una fecha). */
export function fmtHastaImporblack(hasta) {
  if (!hasta) return "";
  const [a, m, d] = String(hasta).slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return "";
  return new Date(a, m - 1, d).toLocaleDateString("es-EC", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}
