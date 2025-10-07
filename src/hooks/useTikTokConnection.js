import { useState, useEffect, useCallback } from "react";
import authService from "../auth/AuthService";
import { apiHelpers } from "../api/chatcenter";
import { notify, logger } from "../utils/notifications";
import { APP_CONFIG } from "../config";

export const useTikTokConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionData, setConnectionData] = useState(null);
  const [error, setError] = useState(null);

  // Verificar estado de conexión al cargar
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  // Verificar estado de conexión con TikTok
  const checkConnectionStatus = useCallback(async () => {
    try {
      const result = await apiHelpers.get("/integrations/tiktok/status");
      if (result.success) {
        setIsConnected(result.data.connected);
        setConnectionData(result.data);
        logger.info("Estado de conexión TikTok verificado", result.data);
      }
    } catch (error) {
      logger.error("Error verificando conexión TikTok", error);
    }
  }, []);

  // Iniciar conexión con TikTok
  const connectToTikTok = useCallback((customState = null) => {
    try {
      setIsConnecting(true);
      setError(null);

      // Generar y guardar state para OAuth
      const state = customState || authService.generateState();
      sessionStorage.setItem("tiktok_oauth_state", state);

      // Obtener URL de autorización
      const authURL = authService.getTikTokAuthURL(state);

      logger.info("Iniciando conexión TikTok", { state, authURL });

      // Redirigir a TikTok
      window.location.href = authURL;
    } catch (error) {
      setIsConnecting(false);
      setError(error.message);
      logger.error("Error iniciando conexión TikTok", error);
      notify.error("Error al conectar con TikTok");
    }
  }, []);

  // Desconectar de TikTok
  const disconnectFromTikTok = useCallback(async () => {
    try {
      setIsConnecting(true);

      const result = await apiHelpers.post("/integrations/tiktok/disconnect");

      if (result.success) {
        setIsConnected(false);
        setConnectionData(null);
        setError(null);

        notify.success("Desconectado de TikTok exitosamente");
        logger.info("Desconexión TikTok exitosa");
      } else {
        throw new Error(result.error?.message || "Error al desconectar");
      }
    } catch (error) {
      setError(error.message);
      logger.error("Error desconectando TikTok", error);
      notify.error("Error al desconectar de TikTok");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Refrescar token de acceso
  const refreshTikTokToken = useCallback(async () => {
    try {
      const result = await apiHelpers.post("/integrations/tiktok/refresh");

      if (result.success) {
        setConnectionData(result.data);
        notify.success("Token de TikTok actualizado");
        logger.info("Token TikTok actualizado exitosamente");
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Error actualizando token TikTok", error);
      return false;
    }
  }, []);

  return {
    isConnected,
    isConnecting,
    connectionData,
    error,
    connectToTikTok,
    disconnectFromTikTok,
    refreshTikTokToken,
    checkConnectionStatus,
  };
};

export default useTikTokConnection;
