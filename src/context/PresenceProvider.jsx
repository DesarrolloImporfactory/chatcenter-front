import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSocket } from "./SocketProvider";
import { Outlet } from "react-router-dom";

const PresenceContext = createContext(null);

export function usePresence() {
  return useContext(PresenceContext);
}

export default function PresenceProvider({ children }) {
  const { socket, isSocketConnected } = useSocket();
  const [presenceBySubUser, setPresenceBySubUser] = useState({}); // { [id_sub_usuario]: { online, connected_at, disconnected_at, last_seen } }

  useEffect(() => {
    if (!socket || !isSocketConnected) return;

    // Snapshot completo (ideal al entrar)
    const onSnapshot = (payload) => {
      // payload esperado: { presence: { "7": {...}, "8": {...} } } o directo { "7": {...} }
      const presence = payload?.presence ?? payload ?? {};
      setPresenceBySubUser(presence);
      console.log("[PRESENCE] snapshot:", presence);
    };

    // Evento puntual de cambio
    const onUpdate = (payload) => {
      // payload esperado: { id_sub_usuario: 7, online: true, connected_at: "...", ... }
      const id = Number(payload?.id_sub_usuario);
      if (!id) return;

      setPresenceBySubUser((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), ...payload },
      }));

      console.log("[PRESENCE] update:", payload);
    };

    socket.on("PRESENCE_SNAPSHOT", onSnapshot);
    socket.on("PRESENCE_UPDATE", onUpdate);

    return () => {
      socket.off("PRESENCE_SNAPSHOT", onSnapshot);
      socket.off("PRESENCE_UPDATE", onUpdate);
    };
  }, [socket, isSocketConnected]);

  const getPresence = (id_sub_usuario) => {
    const id = Number(id_sub_usuario);
    return presenceBySubUser?.[id] ?? null;
  };

  const value = useMemo(
    () => ({ presenceBySubUser, getPresence }),
    [presenceBySubUser],
  );

  return (
    <PresenceContext.Provider value={value}>
      {children ?? <Outlet />}
    </PresenceContext.Provider>
  );
}
