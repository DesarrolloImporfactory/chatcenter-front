import { useEffect, useRef, useCallback, useState } from "react";
import { useSelector } from "react-redux";
import io from "socket.io-client";
import { MESSAGE_SOURCES } from "../types";
import { sanitizeMessage, sanitizeConversation } from "../utils/validators";
import messageService from "../services/messageService";

export const useSocket = (
  onNewMessage,
  onConversationUpdate,
  onTypingStatus
) => {
  const user = useSelector((state) => state.user);
  const socketRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const mountedRef = useRef(true);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Conectar/desconectar socket basado en autenticación
  useEffect(() => {
    if (user?.isAuthenticated && user?.token) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [user?.isAuthenticated, user?.token]);

  // Función para conectar socket
  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    try {
      const socketUrl =
        import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

      socketRef.current = io(socketUrl, {
        auth: {
          token: user?.token,
        },
        transports: ["websocket", "polling"],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 5,
      });

      setupSocketListeners();
    } catch (error) {
      console.error("Error conectando socket:", error);
      setConnectionStatus("error");
    }
  }, [user?.token]);

  // Función para desconectar socket
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnectionStatus("disconnected");
    setReconnectAttempts(0);
  }, []);

  // Configurar listeners del socket
  const setupSocketListeners = useCallback(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    // Eventos de conexión
    socket.on("connect", () => {
      if (!mountedRef.current) return;
      console.log("Socket conectado:", socket.id);
      setConnectionStatus("connected");
      setReconnectAttempts(0);

      // Unirse a las salas del usuario
      socket.emit("join-user-rooms", {
        userId: user?.data?.id,
        companyId: user?.data?.company_id,
      });
    });

    socket.on("disconnect", (reason) => {
      if (!mountedRef.current) return;
      console.log("Socket desconectado:", reason);
      setConnectionStatus("disconnected");
    });

    socket.on("connect_error", (error) => {
      if (!mountedRef.current) return;
      console.error("Error de conexión socket:", error);
      setConnectionStatus("error");
      setReconnectAttempts((prev) => prev + 1);
    });

    socket.on("reconnect", (attemptNumber) => {
      if (!mountedRef.current) return;
      console.log("Socket reconectado después de", attemptNumber, "intentos");
      setConnectionStatus("connected");
      setReconnectAttempts(0);
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      if (!mountedRef.current) return;
      console.log("Intento de reconexión:", attemptNumber);
      setConnectionStatus("reconnecting");
      setReconnectAttempts(attemptNumber);
    });

    socket.on("reconnect_failed", () => {
      if (!mountedRef.current) return;
      console.error("Falló la reconexión del socket");
      setConnectionStatus("failed");
    });

    // Eventos de mensajería
    socket.on("new-message", handleNewMessage);
    socket.on("message-status-update", handleMessageStatusUpdate);
    socket.on("conversation-update", handleConversationUpdate);
    socket.on("typing-status", handleTypingStatus);
    socket.on("user-online-status", handleUserOnlineStatus);

    // Eventos específicos por plataforma
    socket.on("whatsapp-message", (data) =>
      handlePlatformMessage(data, MESSAGE_SOURCES.WHATSAPP)
    );
    socket.on("messenger-message", (data) =>
      handlePlatformMessage(data, MESSAGE_SOURCES.MESSENGER)
    );
    socket.on("instagram-message", (data) =>
      handlePlatformMessage(data, MESSAGE_SOURCES.INSTAGRAM)
    );
    socket.on("tiktok-message", (data) =>
      handlePlatformMessage(data, MESSAGE_SOURCES.TIKTOK)
    );

    // Eventos de sistema
    socket.on("system-notification", handleSystemNotification);
    socket.on("error", handleSocketError);
  }, [user?.data]);

  // Manejar nuevo mensaje
  const handleNewMessage = useCallback(
    (data) => {
      if (!mountedRef.current) return;

      try {
        const mappedMessage = messageService.mapRawMessage(data, data.source);
        const sanitizedMessage = sanitizeMessage(mappedMessage);

        if (onNewMessage) {
          onNewMessage(sanitizedMessage);
        }
      } catch (error) {
        console.error("Error procesando nuevo mensaje:", error);
      }
    },
    [onNewMessage]
  );

  // Manejar mensaje específico de plataforma
  const handlePlatformMessage = useCallback(
    (data, source) => {
      if (!mountedRef.current) return;

      try {
        const mappedMessage = messageService.mapRawMessage(
          { ...data, source },
          source
        );
        const sanitizedMessage = sanitizeMessage(mappedMessage);

        if (onNewMessage) {
          onNewMessage(sanitizedMessage);
        }
      } catch (error) {
        console.error(`Error procesando mensaje de ${source}:`, error);
      }
    },
    [onNewMessage]
  );

  // Manejar actualización de estado de mensaje
  const handleMessageStatusUpdate = useCallback((data) => {
    if (!mountedRef.current) return;

    console.log("Estado de mensaje actualizado:", data);
    // Aquí podrías actualizar el estado del mensaje en la UI
  }, []);

  // Manejar actualización de conversación
  const handleConversationUpdate = useCallback(
    (data) => {
      if (!mountedRef.current) return;

      try {
        const sanitizedConversation = sanitizeConversation(data);

        if (onConversationUpdate) {
          onConversationUpdate(sanitizedConversation);
        }
      } catch (error) {
        console.error("Error procesando actualización de conversación:", error);
      }
    },
    [onConversationUpdate]
  );

  // Manejar estado de escritura
  const handleTypingStatus = useCallback(
    (data) => {
      if (!mountedRef.current) return;

      if (onTypingStatus) {
        onTypingStatus(data);
      }
    },
    [onTypingStatus]
  );

  // Manejar estado online de usuario
  const handleUserOnlineStatus = useCallback((data) => {
    if (!mountedRef.current) return;

    console.log("Estado online actualizado:", data);
    // Implementar lógica para mostrar usuarios online
  }, []);

  // Manejar notificación del sistema
  const handleSystemNotification = useCallback((data) => {
    if (!mountedRef.current) return;

    console.log("Notificación del sistema:", data);
    // Implementar lógica para notificaciones del sistema
  }, []);

  // Manejar errores del socket
  const handleSocketError = useCallback((error) => {
    if (!mountedRef.current) return;

    console.error("Error del socket:", error);
    setConnectionStatus("error");
  }, []);

  // Funciones para emitir eventos
  const emitTypingStatus = useCallback(
    (conversationId, source, isTyping) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("typing-status", {
          conversationId,
          source,
          isTyping,
          userId: user?.data?.id,
        });
      }
    },
    [user?.data?.id]
  );

  const emitJoinConversation = useCallback(
    (conversationId, source) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("join-conversation", {
          conversationId,
          source,
          userId: user?.data?.id,
        });
      }
    },
    [user?.data?.id]
  );

  const emitLeaveConversation = useCallback(
    (conversationId, source) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("leave-conversation", {
          conversationId,
          source,
          userId: user?.data?.id,
        });
      }
    },
    [user?.data?.id]
  );

  const emitMarkAsRead = useCallback(
    (conversationId, source, messageId) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("mark-as-read", {
          conversationId,
          source,
          messageId,
          userId: user?.data?.id,
        });
      }
    },
    [user?.data?.id]
  );

  // Función para forzar reconexión
  const forceReconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      setTimeout(() => {
        connectSocket();
      }, 1000);
    }
  }, [connectSocket]);

  // Estado de conexión legible
  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Conectado";
      case "connecting":
        return "Conectando...";
      case "reconnecting":
        return `Reconectando... (${reconnectAttempts}/5)`;
      case "disconnected":
        return "Desconectado";
      case "error":
        return "Error de conexión";
      case "failed":
        return "Conexión fallida";
      default:
        return "Desconocido";
    }
  };

  return {
    // Estado de conexión
    connectionStatus,
    reconnectAttempts,
    isConnected: connectionStatus === "connected",
    connectionStatusText: getConnectionStatusText(),

    // Funciones de control
    connect: connectSocket,
    disconnect: disconnectSocket,
    forceReconnect,

    // Funciones para emitir eventos
    emitTypingStatus,
    emitJoinConversation,
    emitLeaveConversation,
    emitMarkAsRead,

    // Socket ref para casos especiales
    socket: socketRef.current,
  };
};
