import { useEffect } from "react";
import { useSocket } from "../context/SocketProvider";

export default function usePresenceRegister() {
  const token = localStorage.getItem("token");
  const { socket, isSocketConnected } = useSocket();

  useEffect(() => {
    if (!token) return;
    if (!socket || !isSocketConnected) return;

    // Back debe leer id_sub_usuario desde auth token del socket
    socket.emit("PRESENCE_REGISTER");
    socket.emit("PRESENCE_SNAPSHOT_REQUEST");

    console.log("[PRESENCE] register + snapshot request sent");
  }, [token, socket, isSocketConnected]);
}
