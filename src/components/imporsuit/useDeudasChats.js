import { useEffect, useMemo, useState } from "react";
import {
  CARTERA_CONFIGS_HABILITADAS,
  getDeudasPorCorreos,
} from "../../services/imporsuit";

/**
 * Deudas de cartera para el LISTADO de chats sin ponerlo lento:
 *
 *  - UNA llamada batch (deudas_por_correos) por página visible de chats,
 *    en vez de 2 llamadas por chat como hace el badge de la cabecera.
 *  - Caché a nivel de módulo con TTL: scrollear, filtrar o re-renderizar NO
 *    re-consulta correos ya resueltos (incluye caché negativo: "sin deuda"
 *    también se recuerda).
 *  - Debounce de 250ms: los cambios rápidos de lista (tipeo en el buscador,
 *    scroll) se agrupan en una sola petición.
 *  - Silencioso: si Imporsuit no responde, simplemente no hay pill.
 *
 * Solo activo en las configuraciones de CARTERA_CONFIGS_HABILITADAS.
 */

const TTL_MS = 5 * 60 * 1000; // revalidar deudas cada 5 min
const cache = new Map(); // correo -> { pendiente, numPendientes, ts }
const enVuelo = new Set(); // correos con petición en curso (dedup)

/** Normaliza un email a la clave usada por el caché y el backend. */
export function correoKey(v) {
  return String(v || "")
    .trim()
    .toLowerCase();
}

export default function useDeudasChats(chats, idConfiguracion) {
  const habilitado = CARTERA_CONFIGS_HABILITADAS.includes(
    Number(idConfiguracion),
  );
  const [version, setVersion] = useState(0);

  const correos = useMemo(() => {
    if (!habilitado) return [];
    const out = new Set();
    for (const c of Array.isArray(chats) ? chats : []) {
      const e = correoKey(c?.email_cliente);
      if (e && e.includes("@")) out.add(e);
    }
    return [...out];
  }, [habilitado, chats]);

  useEffect(() => {
    if (!correos.length) return undefined;

    const timer = setTimeout(async () => {
      const ahora = Date.now();
      const faltantes = correos.filter((e) => {
        if (enVuelo.has(e)) return false;
        const hit = cache.get(e);
        return !hit || ahora - hit.ts > TTL_MS;
      });
      if (!faltantes.length) return;

      faltantes.forEach((e) => enVuelo.add(e));
      try {
        const data = await getDeudasPorCorreos(faltantes);
        const ts = Date.now();
        for (const e of faltantes) {
          const d = data?.[e];
          cache.set(e, {
            pendiente: Number(d?.pendiente) || 0,
            numPendientes: Number(d?.num_pendientes) || 0,
            vencidas: Number(d?.vencidas) || 0,
            porVencer: Number(d?.por_vencer) || 0,
            fechaLimiteMin: d?.fecha_limite_min || null,
            ts,
          });
        }
        setVersion((v) => v + 1);
      } catch {
        // Silencioso: sin pill si Imporsuit no responde.
      } finally {
        faltantes.forEach((e) => enVuelo.delete(e));
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [correos]);

  // Mapa correo -> deuda SOLO de los que deben (>0), para lookup O(1) por fila.
  return useMemo(() => {
    const map = {};
    if (!habilitado) return map;
    for (const e of correos) {
      const hit = cache.get(e);
      if (hit && hit.pendiente > 0) map[e] = hit;
    }
    return map;
    // `version` fuerza recomputar cuando llegan respuestas del batch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habilitado, correos, version]);
}
