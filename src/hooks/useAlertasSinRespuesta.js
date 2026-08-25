import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import chatApi from "../api/chatcenter";
import {
  INTERVALO_CONSULTA_MS,
  INTERVALO_REFRESCO_MS,
  MINUTOS_CRITICO,
  NIVEL_CRITICO,
  alertasSinRespuestaActivas,
  minutosSinRespuesta,
  nivelSinRespuesta,
} from "../config/alertasSinRespuesta";

/**
 * Alerta de chats sin respuesta.
 *
 * Trabaja con dos fuentes, porque ninguna alcanza sola:
 *
 *  - Los COLORES salen de la lista que ya está en pantalla. Ahí el dato es de
 *    este segundo: si el asesor acaba de responder, el color se apaga solo.
 *  - El AVISO sale del backend, que consulta toda la configuración. La lista
 *    de la vista pagina de 10 en 10 ordenada por fecha descendente, así que
 *    los chats que llevan más rato esperando son justamente los que quedan
 *    fuera; contarlos desde el cliente daría siempre de menos.
 *
 * @returns {{
 *   activo: boolean,
 *   niveles: Record<string, {nivel: string, minutos: number}>,
 *   criticos: Array<object>,
 *   total: number,
 *   aviso: Array<object>,
 *   cerrarAviso: () => void,
 * }}
 */
export const useAlertasSinRespuesta = (chats, id_configuracion) => {
  const activo = alertasSinRespuestaActivas(id_configuracion);

  /* ── Reloj ──
   * Uno solo para toda la lista: un setInterval por item haría que cientos
   * de chats reprogramen timers en cada render. */
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!activo) return undefined;
    const id = setInterval(() => setAhora(Date.now()), INTERVALO_REFRESCO_MS);
    return () => clearInterval(id);
  }, [activo]);

  /* ── Colores de la lista visible ── */
  const niveles = useMemo(() => {
    if (!activo) return {};

    const mapa = {};
    for (const chat of chats || []) {
      const nivel = nivelSinRespuesta(chat, ahora);
      if (!nivel) continue;
      mapa[chat.id] = { nivel, minutos: minutosSinRespuesta(chat, ahora) };
    }
    return mapa;
  }, [activo, chats, ahora]);

  /* ── Consulta sobre toda la configuración ── */
  const [remotos, setRemotos] = useState({
    chats: [],
    total: 0,
    truncado: false,
  });

  useEffect(() => {
    if (!activo) {
      setRemotos({ chats: [], total: 0, truncado: false });
      return undefined;
    }

    let vigente = true;

    const consultar = async () => {
      try {
        const { data } = await chatApi.get(
          "/clientes_chat_center/sin_respuesta",
          { params: { id_configuracion, minutos: MINUTOS_CRITICO } },
        );
        if (!vigente) return;
        setRemotos({
          chats: Array.isArray(data?.data) ? data.data : [],
          total: Number(data?.total) || 0,
          truncado: Boolean(data?.truncado),
        });
      } catch (error) {
        // El aviso es un extra: si falla, la vista de chat sigue igual.
        console.warn("chats sin respuesta:", error?.message);
      }
    };

    consultar();
    const id = setInterval(consultar, INTERVALO_CONSULTA_MS);
    return () => {
      vigente = false;
      clearInterval(id);
    };
  }, [activo, id_configuracion]);

  /* ── Críticos: lo que dice el backend, corregido con lo que se ve ──
   * La consulta puede tener hasta un minuto de atraso, así que un chat que
   * el asesor acaba de contestar todavía vendría en la lista. Si el chat
   * está cargado en pantalla, manda el estado de pantalla. */
  const criticos = useMemo(() => {
    if (!activo) return [];

    const cargados = new Map(
      (chats || []).map((chat) => [String(chat.id), chat]),
    );

    const lista = [];
    for (const remoto of remotos.chats) {
      const local = cargados.get(String(remoto.id));

      if (!local) {
        lista.push({ ...remoto, minutos: Number(remoto.minutos) || 0 });
        continue;
      }

      const minutos = minutosSinRespuesta(local, ahora);
      if (minutos === null || minutos < MINUTOS_CRITICO) continue;
      lista.push({ ...remoto, ...local, minutos });
    }

    lista.sort((a, b) => b.minutos - a.minutos);
    return lista;
  }, [activo, chats, remotos, ahora]);

  /* Los que sí están en pantalla y ya cruzaron los 30 min pero todavía no
     aparecen en la consulta: se suman para no esperar al siguiente ciclo. */
  const criticosCompletos = useMemo(() => {
    if (!activo) return [];

    const yaListados = new Set(criticos.map((c) => String(c.id)));
    const extra = [];

    for (const chat of chats || []) {
      if (yaListados.has(String(chat.id))) continue;
      if (niveles[chat.id]?.nivel !== NIVEL_CRITICO) continue;
      extra.push({ ...chat, minutos: niveles[chat.id].minutos });
    }

    if (!extra.length) return criticos;
    return [...criticos, ...extra].sort((a, b) => b.minutos - a.minutos);
  }, [activo, criticos, chats, niveles]);

  /* ── Aviso: una sola vez por chat ──
   * El chat que sale de la lista (lo respondieron o lo cerraron) se saca de
   * los notificados, así vuelve a avisar si más adelante queda otra vez sin
   * respuesta. */
  const notificadosRef = useRef(new Set());
  const [aviso, setAviso] = useState([]);

  useEffect(() => {
    if (!activo) return;

    const vigentes = new Set(criticosCompletos.map((c) => String(c.id)));
    notificadosRef.current.forEach((id) => {
      if (!vigentes.has(id)) notificadosRef.current.delete(id);
    });

    const nuevos = criticosCompletos.filter(
      (c) => !notificadosRef.current.has(String(c.id)),
    );
    if (nuevos.length) setAviso(nuevos);
  }, [activo, criticosCompletos]);

  const cerrarAviso = useCallback(() => {
    setAviso((actuales) => {
      actuales.forEach((c) => notificadosRef.current.add(String(c.id)));
      return [];
    });
  }, []);

  return {
    activo,
    niveles,
    criticos: criticosCompletos,
    total: Math.max(remotos.total, criticosCompletos.length),
    truncado: remotos.truncado,
    aviso,
    cerrarAviso,
  };
};

export default useAlertasSinRespuesta;
