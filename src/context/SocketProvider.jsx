// src/context/SocketProvider.jsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import { Outlet } from "react-router-dom";

const SocketContext = createContext(null);

export function useSocket() {
  return useContext(SocketContext);
}

export default function SocketProvider({ token, children }) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const s = io(import.meta.env.VITE_socket + "/presence", {
      transports: ["websocket"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
    });

    socketRef.current = s;
    setSocket(s);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

  const value = useMemo(
    () => ({
      socket, // ✅ ya es reactivo
      isSocketConnected: isConnected,
    }),
    [socket, isConnected],
  );

  return (
    <SocketContext.Provider value={value}>
      {children ?? <Outlet />}
    </SocketContext.Provider>
  );
}
