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
  const pendingRef = useRef(new Set()); // secciones acumuladas durante el debounce

  const scheduleRefresh = useCallback(
    (sections) => {
      // Acumula las secciones que llegaron
      sections.forEach((s) => pendingRef.current.add(s));

      // Reinicia el timer de 800ms
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const toRefresh = [...pendingRef.current];
        pendingRef.current.clear();
        onRefreshSections(toRefresh); // ← dispara el fetch selectivo
      }, 800);
    },
    [onRefreshSections],
  );

  useEffect(() => {
    if (!socket || !id_usuario) return;

    // Entrar al room del dashboard de este usuario
    socket.emit("dashboard:join", { id_usuario });

    const handler = ({ tipo }) => {
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
