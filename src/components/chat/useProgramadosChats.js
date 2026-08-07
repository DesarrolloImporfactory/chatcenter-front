import { useEffect, useMemo, useState } from "react";
import { getProgramadosResumenChats } from "../../services/programados.service";

/**
 * Plantillas programadas para el LISTADO de chats, sin ponerlo lento.
 *
 *  - UNA llamada batch por página visible de chats (no una por chat, y jamás
 *    "todos los programados de la cuenta": con lotes masivos son decenas de
 *    miles de filas).
 *  - Caché a nivel de módulo con TTL corto: scrollear o filtrar no vuelve a
 *    consultar lo ya resuelto. También se recuerda el "no tiene nada", que es
 *    la mayoría de los chats.
 *  - Debounce de 250ms: tipear en el buscador o scrollear rápido se agrupa en
 *    una sola petición.
 *  - Silencioso: si falla, simplemente no se pinta el badge.
 *
 * El TTL es corto (60s) porque el estado caduca solo: cuando el cron manda la
 * plantilla, el chat abierto se entera por socket, pero el resto del listado
 * se corrige en la siguiente revalidación.
 */

const TTL_MS = 60 * 1000;
/* El backend recorta a 200 ids por llamada. Se trocea igual acá: si se manda
   de más, los sobrantes volverían vacíos y se cachearían como "sin nada
   programado", que es peor que no mostrar el badge. */
const TAM_LOTE = 150;
const cache = new Map(); // `${cfg}:${idCliente}` -> { resumen, ts }
const enVuelo = new Set();

export default function useProgramadosChats(chats, idConfiguracion) {
  const [version, setVersion] = useState(0);

  const ids = useMemo(() => {
    if (!idConfiguracion) return [];
    const out = new Set();
    for (const c of Array.isArray(chats) ? chats : []) {
      const id = Number(c?.id_cliente_chat_center ?? c?.id);
      if (id > 0) out.add(id);
    }
    return [...out];
  }, [chats, idConfiguracion]);

  // Clave estable: si la página visible no cambió, no se re-dispara el efecto.
  const idsKey = ids.join(",");

  useEffect(() => {
    if (!ids.length) return undefined;

    const timer = setTimeout(async () => {
      const ahora = Date.now();
      const faltantes = ids.filter((id) => {
        const k = `${idConfiguracion}:${id}`;
        if (enVuelo.has(k)) return false;
        const hit = cache.get(k);
        return !hit || ahora - hit.ts > TTL_MS;
      });
      if (!faltantes.length) return;

      faltantes.forEach((id) => enVuelo.add(`${idConfiguracion}:${id}`));
      try {
        const lotes = [];
        for (let i = 0; i < faltantes.length; i += TAM_LOTE) {
          lotes.push(faltantes.slice(i, i + TAM_LOTE));
        }

        const respuestas = await Promise.all(
          lotes.map((lote) =>
            getProgramadosResumenChats(idConfiguracion, lote).then((data) => ({
              lote,
              data,
            })),
          ),
        );

        const ts = Date.now();
        // Se cachea TODO lo pedido, no solo lo que vino con datos: el "este
        // chat no tiene nada programado" es la respuesta más común y también
        // hay que recordarla o se repregunta en cada scroll.
        for (const { lote, data } of respuestas) {
          for (const id of lote) {
            cache.set(`${idConfiguracion}:${id}`, {
              resumen: data?.[String(id)] || null,
              ts,
            });
          }
        }
        setVersion((v) => v + 1);
      } catch {
        // Silencioso: sin badge si el backend no responde.
      } finally {
        faltantes.forEach((id) => enVuelo.delete(`${idConfiguracion}:${id}`));
      }
    }, 250);

    return () => clearTimeout(timer);
    // `idsKey` evita re-disparar por identidad nueva del array con mismos ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, idConfiguracion]);

  // Mapa id -> resumen SOLO de los que tienen algo pendiente (lookup O(1)).
  return useMemo(() => {
    const map = {};
    for (const id of ids) {
      const hit = cache.get(`${idConfiguracion}:${id}`);
      if (hit?.resumen?.pendientes > 0) map[id] = hit.resumen;
    }
    return map;
    // `version` fuerza recomputar cuando llega la respuesta del batch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, idConfiguracion, version]);
}

/** Invalida un chat del listado (p.ej. tras programar o cancelar desde el chat). */
export function invalidarResumenProgramados(idConfiguracion, idCliente) {
  cache.delete(`${idConfiguracion}:${Number(idCliente)}`);
}
