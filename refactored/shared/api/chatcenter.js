/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  CAPA SHARED — Cliente HTTP centralizado                  ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Reemplaza: src/api/chatcenter.js (sin cambios de API)    ║
 * ║  este archivo es idéntico al original, lo re-exportamos   ║
 * ║  desde shared/ para que las features lo importen así:     ║
 * ║    import chatApi from "@shared/api/chatcenter"           ║
 * ╚════════════════════════════════════════════════════════════╝
 *
 * NOTA: Para la migración incremental, este archivo simplemente
 * re-exporta el cliente existente. Cuando el refactor esté completo,
 * mover el código real aquí.
 */

// ---- RE-EXPORT TEMPORAL (durante migración) ----
// import chatApi, { apiHelpers } from "../../src/api/chatcenter";
// export { apiHelpers };
// export default chatApi;

// ---- VERSIÓN FINAL (cuando se complete la migración) ----
import axios from "axios";
import { APP_CONFIG } from "../../src/config";
import authService from "../auth/AuthService";
import { toast } from "react-hot-toast";

const chatApi = axios.create({
  baseURL: APP_CONFIG.api.baseURL,
  timeout: APP_CONFIG.api.timeout,
  headers: { "Content-Type": "application/json" },
});

// Interceptor de request — añadir token
chatApi.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers["X-Timestamp"] = Date.now();
    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// Interceptor de response — manejo global de errores
chatApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    switch (status) {
      case 401:
        if (!originalRequest._retry) {
          originalRequest._retry = true;
          if (!authService.isAuthenticated()) {
            authService.logout();
            window.location.href = "/login";
            toast.error("Sesión expirada. Por favor, inicia sesión nuevamente.");
          } else {
            toast.error(
              error.response?.data?.message || "Error de autorización en el servicio externo"
            );
          }
        }
        break;
      case 403:
        toast.error("No tienes permisos para realizar esta acción.");
        break;
      case 404:
        toast.error("Recurso no encontrado.");
        break;
      case 422: {
        const validationErrors = error.response?.data?.errors;
        if (validationErrors) {
          Object.values(validationErrors).forEach((msgs) =>
            (Array.isArray(msgs) ? msgs : [msgs]).forEach((m) => toast.error(m))
          );
        } else {
          toast.error(error.response?.data?.message || "Datos inválidos.");
        }
        break;
      }
      case 429:
        toast.error("Demasiadas solicitudes. Intenta nuevamente en unos minutos.");
        break;
      case 500:
        toast.error("Error interno del servidor. Intenta nuevamente más tarde.");
        break;
      default:
        if (error.code === "NETWORK_ERROR" || error.code === "ECONNABORTED") {
          toast.error("Error de conexión. Verifica tu internet.");
        } else {
          toast.error(error.response?.data?.message || "Ha ocurrido un error inesperado.");
        }
    }

    return Promise.reject(error);
  }
);

/**
 * Helpers para requests comunes con manejo de errores uniforme.
 */
export const apiHelpers = {
  async get(url, config = {}) {
    try {
      const response = await chatApi.get(url, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error };
    }
  },

  async post(url, data = {}, config = {}) {
    try {
      const response = await chatApi.post(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error };
    }
  },

  async put(url, data = {}, config = {}) {
    try {
      const response = await chatApi.put(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error };
    }
  },

  async delete(url, config = {}) {
    try {
      const response = await chatApi.delete(url, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error };
    }
  },

  async upload(url, file, onProgress = null) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await chatApi.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onProgress
          ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
          : undefined,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error };
    }
  },
};

export default chatApi;
