import { useMemo, useEffect, useState, useCallback } from "react";
import io from "socket.io-client";
import { APP_CONFIG } from "../config";
import { logger, notify } from "../utils/notifications";
import authService from "../auth/AuthService";

export const useSocket = (serverPath = null) => {
  const [online, setOnline] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState(null);

  // Crear socket con configuración profesional
  const socket = useMemo(() => {
    const socketURL = serverPath || APP_CONFIG.socket.url;
    const user = authService.getCurrentUser();

    logger.info("Iniciando conexión Socket.IO", {
      url: socketURL,
      user: user?.email,
    });

    const socketInstance = io.connect(socketURL, {
      ...APP_CONFIG.socket.options,
      auth: {
        token: authService.getToken(),
        userId: user?.id,
        userEmail: user?.email,
      },
      query: {
        clientType: "web",
        version: APP_CONFIG.app.version,
      },
    });

    return socketInstance;
  }, [serverPath]);

  // Manejar conexión exitosa
  useEffect(() => {
    const handleConnect = () => {
      setOnline(true);
      setReconnectAttempts(0);
      setLastError(null);

      logger.info("Socket conectado exitosamente", {
        id: socket.id,
        transport: socket.io.engine.transport.name,
      });

      notify.connection.connected("ChatCenter");
    };

    socket.on("connect", handleConnect);
    return () => socket.off("connect", handleConnect);
  }, [socket]);

  // Manejar desconexión
  useEffect(() => {
    const handleDisconnect = (reason) => {
      setOnline(false);

      logger.warn("Socket desconectado", { reason });

      if (reason === "io server disconnect") {
        // El servidor forzó la desconexión, reconectar manualmente
        socket.connect();
      }

      notify.connection.disconnected("ChatCenter");
    };

    socket.on("disconnect", handleDisconnect);
    return () => socket.off("disconnect", handleDisconnect);
  }, [socket]);

  // Manejar errores de conexión
  useEffect(() => {
    const handleConnectError = (error) => {
      setLastError(error.message);
      setReconnectAttempts((prev) => prev + 1);

      logger.error("Error de conexión Socket", error);

      if (reconnectAttempts >= APP_CONFIG.socket.options.reconnectionAttempts) {
        notify.connection.error("ChatCenter", "No se pudo establecer conexión");
      }
    };

    socket.on("connect_error", handleConnectError);
    return () => socket.off("connect_error", handleConnectError);
  }, [socket, reconnectAttempts]);

  // Manejar autenticación fallida
  useEffect(() => {
    const handleAuthError = (error) => {
      logger.error("Error de autenticación Socket", error);
      notify.error("Error de autenticación. Recargando sesión...");

      // Recargar página para renovar token
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    };

    socket.on("auth_error", handleAuthError);
    return () => socket.off("auth_error", handleAuthError);
  }, [socket]);

  // Actualizar estado inicial
  useEffect(() => {
    setOnline(socket.connected);
  }, [socket]);

  // Método para reconectar manualmente
  const reconnect = useCallback(() => {
    if (!socket.connected) {
      logger.info("Intentando reconexión manual");
      socket.connect();
    }
  }, [socket]);

  // Método para desconectar
  const disconnect = useCallback(() => {
    if (socket.connected) {
      logger.info("Desconectando socket manualmente");
      socket.disconnect();
    }
  }, [socket]);

  // Método para enviar evento con manejo de errores
  const emit = useCallback(
    (event, data, callback) => {
      if (socket.connected) {
        socket.emit(event, data, callback);
        logger.debug("Socket emit", { event, data });
      } else {
        logger.warn("Intento de emit con socket desconectado", { event });
        notify.warning("Sin conexión. Intenta nuevamente.");
      }
    },
    [socket]
  );

  // Método para escuchar eventos con cleanup automático
  const on = useCallback(
    (event, handler) => {
      socket.on(event, handler);

      // Retornar función de cleanup
      return () => {
        socket.off(event, handler);
      };
    },
    [socket]
  );

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (socket) {
        logger.info("Limpiando socket al desmontar componente");
        socket.disconnect();
      }
    };
  }, [socket]);

  return {
    socket,
    online,
    reconnectAttempts,
    lastError,
    reconnect,
    disconnect,
    emit,
    on,
  };
};
