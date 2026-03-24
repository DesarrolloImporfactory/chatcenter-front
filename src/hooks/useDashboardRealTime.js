import { useEffect, useRef, useCallback } from "react";

export function useDashboardRealtime({
  socket,
  id_usuario,
  onRefreshSections,
  onApplyDeltas,
}) {
  const timerRef = useRef(null);
  const pendingRef = useRef(new Set());
  const lastExecutionRef = useRef(0);

  const scheduleRefresh = useCallback(
    (sections) => {
      sections.forEach((s) => pendingRef.current.add(s));

      if (timerRef.current) return;

      const now = Date.now();
      const timeSinceLastExecution = now - lastExecutionRef.current;
      const THROTTLE_MS = 2000; // 2s (reducido de 5s porque el server ya throttlea a 3s)

      if (timeSinceLastExecution >= THROTTLE_MS) {
        const toRefresh = [...pendingRef.current];
        pendingRef.current.clear();
        lastExecutionRef.current = now;
        onRefreshSections(toRefresh);
      } else {
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
    console.log("[RT] join dashboard room:", id_usuario);

    socket.emit("dashboard:join", { id_usuario });

    const handler = (payload) => {
      const isV2 = Array.isArray(payload?.sections);

      if (isV2) {
        // ── Formato v2 (server-side throttle) ──────────────────────
        console.log(
          "[RT] v2 event:",
          payload.tipos,
          "sections:",
          payload.sections,
        );

        // 1) Aplicar deltas instantáneamente (si el front lo soporta)
        if (
          onApplyDeltas &&
          payload.deltas &&
          Object.keys(payload.deltas).length > 0
        ) {
          onApplyDeltas(payload.deltas);
        }

        // 2) Programar HTTP fetch solo de las secciones indicadas por el server
        scheduleRefresh(payload.sections);
      } else {
        // ── Formato v1 (compatibilidad hacia atrás) ────────────────
        const tipo = payload?.tipo;
        console.log("[RT] v1 event:", tipo);

        const SECTIONS_BY_TIPO = {
          new_chat: ["summary", "pendingQueue", "charts", "agentLoad"],
          chat_resolved: ["summary", "slaToday", "charts", "agentLoad"],
          chat_transferred: ["pendingQueue", "frequentTransfers", "agentLoad"],
          queue_change: ["pendingQueue", "agentLoad"],
        };

        const sections = SECTIONS_BY_TIPO[tipo] ?? ["summary", "pendingQueue"];
        scheduleRefresh(sections);
      }
    };

    socket.on("dashboard:update", handler);

    return () => {
      socket.off("dashboard:update", handler);
      socket.emit("dashboard:leave", { id_usuario });
      clearTimeout(timerRef.current);
    };
  }, [socket, id_usuario, scheduleRefresh, onApplyDeltas]);
}
