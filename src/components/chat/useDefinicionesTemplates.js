import { useEffect, useMemo, useState } from "react";
import chatApi from "../../api/chatcenter";

/**
 * Definición (header/body/footer/botones) de las plantillas que aparecen en el
 * chat abierto.
 *
 * De cada envío el chat guarda solo el body y sus variables, así que footer y
 * botones hay que resolverlos contra el WABA. Para que eso no cueste caro:
 *  - se piden en lote los nombres distintos del chat (suelen ser 2 o 3), no
 *    uno por mensaje;
 *  - caché de módulo sin expiración por sesión: la definición de una plantilla
 *    aprobada no cambia mientras el asesor tiene el chat abierto;
 *  - el backend responde desde su propia caché de 30 min, compartida con el
 *    cron, así que casi nunca se pega a Meta.
 *
 * Silencioso: si no se resuelve, el chat pinta el body como siempre.
 */

const cache = new Map(); // `${cfg}::${nombre}` -> definicion | null
const enVuelo = new Set();

export default function useDefinicionesTemplates(idConfiguracion, nombres) {
  const [version, setVersion] = useState(0);

  const lista = useMemo(() => {
    if (!idConfiguracion) return [];
    const out = new Set();
    for (const n of Array.isArray(nombres) ? nombres : []) {
      const nombre = String(n || "").trim();
      if (nombre) out.add(nombre);
    }
    return [...out].sort();
  }, [nombres, idConfiguracion]);

  const clave = lista.join(",");

  useEffect(() => {
    if (!lista.length) return;

    const faltantes = lista.filter((n) => {
      const k = `${idConfiguracion}::${n}`;
      return !cache.has(k) && !enVuelo.has(k);
    });
    if (!faltantes.length) return;

    let cancelado = false;
    faltantes.forEach((n) => enVuelo.add(`${idConfiguracion}::${n}`));

    (async () => {
      try {
        const { data } = await chatApi.post(
          "/whatsapp_managment/definiciones_templates",
          { id_configuracion: idConfiguracion, nombres: faltantes },
        );

        // Se cachea también el "no se pudo resolver" (null) para no reintentar
        // en cada render; una plantilla borrada del BM no va a reaparecer.
        for (const n of faltantes) {
          cache.set(`${idConfiguracion}::${n}`, data?.data?.[n] || null);
        }

        if (!cancelado) setVersion((v) => v + 1);
      } catch {
        // Silencioso: el chat sigue mostrando el body en texto.
      } finally {
        faltantes.forEach((n) => enVuelo.delete(`${idConfiguracion}::${n}`));
      }
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, idConfiguracion]);

  return useMemo(() => {
    const map = {};
    for (const n of lista) {
      const def = cache.get(`${idConfiguracion}::${n}`);
      if (def) map[n] = def;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, idConfiguracion, version]);
}
