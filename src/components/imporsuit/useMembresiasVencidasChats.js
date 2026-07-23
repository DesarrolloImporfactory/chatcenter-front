import { useEffect, useMemo, useState } from "react";
import {
  CARTERA_CONFIGS_HABILITADAS,
  getMembresiasVencidasPorCorreos,
} from "../../services/imporsuit";
import { correoKey } from "./useDeudasChats";

const TTL_MS = 5 * 60 * 1000;
const cache = new Map(); // correo -> { vencida, fechaVencimiento, diasVencida, ts }
const enVuelo = new Set();

/**
 * Hook batch + caché para pintar badge de membresía vencida en listado de chats.
 * Activo solo para configs 242 y 265 (mismas habilitadas de cartera).
 */
export default function useMembresiasVencidasChats(chats, idConfiguracion) {
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
        const data = await getMembresiasVencidasPorCorreos(faltantes);
        const ts = Date.now();

        for (const e of faltantes) {
          const d = data?.[e];
          cache.set(e, {
            vencida: Number(d?.vencida) === 1 ? 1 : 0,
            fechaVencimiento: d?.fecha_vencimiento || null,
            diasVencida: Number(d?.dias_vencida) || 0,
            ts,
          });
        }
        setVersion((v) => v + 1);
      } catch {
        // Silencioso: sin badge si Imporsuit no responde.
      } finally {
        faltantes.forEach((e) => enVuelo.delete(e));
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [correos]);

  return useMemo(() => {
    const map = {};
    if (!habilitado) return map;

    for (const e of correos) {
      const hit = cache.get(e);
      if (hit?.vencida === 1) map[e] = hit;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habilitado, correos, version]);
}
