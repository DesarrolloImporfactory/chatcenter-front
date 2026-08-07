import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  claveProgramados,
  ensureProgramados,
  getProgramados,
  subscribe,
} from "./programadosChatStore";
import { formatFechaProgramada } from "../../services/programados.service";

/**
 * Plantillas programadas VIGENTES del chat abierto.
 *
 * Una sola consulta por chat (compartida por todos los consumidores vía
 * store) + parches por socket. Nunca consulta la cuenta completa.
 *
 * @returns {{items: object[], total: number, proximo: object|null,
 *            proximoTexto: string, resumenTexto: string}}
 */
export default function useProgramadosChat(
  idConfiguracion,
  idClienteChatCenter,
) {
  const clave = claveProgramados(idConfiguracion, idClienteChatCenter);

  const items = useSyncExternalStore(
    subscribe,
    () => getProgramados(clave),
    () => getProgramados(clave),
  );

  useEffect(() => {
    if (!clave) return;
    ensureProgramados(idConfiguracion, idClienteChatCenter);
  }, [clave, idConfiguracion, idClienteChatCenter]);

  return useMemo(() => {
    const proximo = items[0] || null;
    const proximoTexto = proximo
      ? formatFechaProgramada(proximo.fecha_programada)
      : "";

    const resumenTexto = !items.length
      ? ""
      : items.length === 1
        ? `Este contacto ya tiene la plantilla “${proximo?.nombre_template || "—"}” programada para el ${proximoTexto}.`
        : `Este contacto ya tiene ${items.length} plantillas programadas. La próxima (“${proximo?.nombre_template || "—"}”) sale el ${proximoTexto}.`;

    return {
      items,
      total: items.length,
      proximo,
      proximoTexto,
      resumenTexto,
    };
  }, [items]);
}
