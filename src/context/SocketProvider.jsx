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
import { handleSessionExpired } from "../auth/sessionExpired";

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

    // El namespace /presence sí valida el JWT (sockets/middlewares/socketAuth.js).
    // Si el token está muerto rechazaba el handshake y socket.io reintentaba
    // infinitamente con el mismo token. Ahora cortamos y avisamos una sola vez.
    const onConnectError = (err) => {
      const motivo = err?.message;
      if (motivo === "INVALID_TOKEN" || motivo === "NO_TOKEN") {
        s.close(); // corta la reconexión infinita
        handleSessionExpired({
          code: motivo === "NO_TOKEN" ? "TOKEN_MISSING" : "TOKEN_EXPIRED",
        });
      }
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onConnectError);
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
