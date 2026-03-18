import { useEffect, useRef, useCallback } from "react";

// Qué secciones refrescar según el tipo de evento
const SECTIONS_BY_TIPO = {
  new_chat: ["summary", "pendingQueue", "charts", "agentLoad"],
  chat_resolved: ["summary", "slaToday", "charts", "agentLoad"],
  chat_transferred: ["pendingQueue", "frequentTransfers", "agentLoad"],
  queue_change: ["pendingQueue", "agentLoad"],
};

export function useDashboardRealtime({
  socket,
  id_usuario,
  onRefreshSections,
}) {
  const timerRef = useRef(null);
  const pendingRef = useRef(new Set()); // secciones acumuladas
  const lastExecutionRef = useRef(0); // timestamp de última ejecución

  const scheduleRefresh = useCallback(
    (sections) => {
      // Acumula las secciones que llegaron
      sections.forEach((s) => pendingRef.current.add(s));

      // Si ya hay un timer programado, no hacer nada (throttle)
      if (timerRef.current) return;

      const now = Date.now();
      const timeSinceLastExecution = now - lastExecutionRef.current;
      const THROTTLE_MS = 5000; // 5 segundos

      // Si pasaron más de 5s desde la última ejecución, ejecutar inmediatamente
      if (timeSinceLastExecution >= THROTTLE_MS) {
        const toRefresh = [...pendingRef.current];
        pendingRef.current.clear();
        lastExecutionRef.current = now;
        onRefreshSections(toRefresh);
      } else {
        // Si no, programar para cuando se cumplan los 5s
        const delay = THROTTLE_MS - timeSinceLastExecution;
        timerRef.current = setTimeout(() => {
          const toRefresh = [...pendingRef.current];
          pendingRef.current.clear();
          lastExecutionRef.current = Date.now();
          timerRef.current = null;
          onRefreshSections(toRefresh);
        }, delay);
      }
    },
    [onRefreshSections],
  );

  useEffect(() => {
    if (!socket || !id_usuario) return;
    console.log("[RT] join con id_usuario:", id_usuario);
    // Entrar al room del dashboard de este usuario
    socket.emit("dashboard:join", { id_usuario });

    const handler = ({ tipo }) => {
      console.log("[RT] evento recibido:", tipo);

      const sections = SECTIONS_BY_TIPO[tipo] ?? ["summary", "pendingQueue"];
      scheduleRefresh(sections);
    };

    socket.on("dashboard:update", handler);

    return () => {
      socket.off("dashboard:update", handler);
      socket.emit("dashboard:leave", { id_usuario });
      clearTimeout(timerRef.current);
    };
  }, [socket, id_usuario, scheduleRefresh]);
}
