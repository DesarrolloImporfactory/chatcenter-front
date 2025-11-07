import axios from "axios";
import { APP_CONFIG } from "../config";
import authService from "../auth/AuthService";
import { toast } from "react-hot-toast";

// Crear instancia de axios
const chatApi = axios.create({
  baseURL: APP_CONFIG.api.baseURL,
  timeout: APP_CONFIG.api.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor de request - añadir token y configuración
chatApi.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Añadir timestamp para evitar caché
    config.headers["X-Timestamp"] = Date.now();

    // Log para desarrollo
    if (import.meta.env.NODE_ENV === "development") {
      console.log(
        `🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`,
        {
          headers: config.headers,
          data: config.data,
        }
      );
    }

    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// Interceptor de response - manejar errores globalmente
chatApi.interceptors.response.use(
  (response) => {
    // Log para desarrollo
    if (import.meta.env.NODE_ENV === "development") {
      console.log(
        `✅ API Response: ${response.config.method?.toUpperCase()} ${
          response.config.url
        }`,
        {
          status: response.status,
          data: response.data,
        }
      );
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log error
    console.error("❌ API Error:", {
      url: originalRequest?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });

    // Manejar diferentes tipos de error
    switch (error.response?.status) {
      case 401:
        // IMPORTANTE: Primero verificar si realmente el token está expirado
        // antes de cerrar sesión del usuario
        if (!originalRequest._retry) {
          originalRequest._retry = true;

          // Verificar si el token está realmente expirado
          const isStillAuthenticated = authService.isAuthenticated();

          if (!isStillAuthenticated) {
            // Token realmente expirado - cerrar sesión
            authService.logout();
            window.location.href = "/login";
            toast.error(
              "Sesión expirada. Por favor, inicia sesión nuevamente."
            );
          } else {
            // Token válido pero error 401 - probablemente es de una API externa
            // No cerrar sesión, solo mostrar el error
            const errorMsg =
              error.response?.data?.message ||
              error.response?.data?.error ||
              "Error de autorización en el servicio externo";
            toast.error(errorMsg);
            console.warn(
              "Error 401 pero token válido - posible error de API externa:",
              {
                url: originalRequest?.url,
                error: errorMsg,
              }
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

      case 422:
        // Error de validación
        const validationErrors = error.response?.data?.errors;
        if (validationErrors) {
          Object.values(validationErrors).forEach((errorMessages) => {
            if (Array.isArray(errorMessages)) {
              errorMessages.forEach((msg) => toast.error(msg));
            } else {
              toast.error(errorMessages);
            }
          });
        } else {
          toast.error(error.response?.data?.message || "Datos inválidos.");
        }
        break;

      case 429:
        toast.error(
          "Demasiadas solicitudes. Intenta nuevamente en unos minutos."
        );
        break;

      case 500:
        toast.error(
          "Error interno del servidor. Intenta nuevamente más tarde."
        );
        break;

      default:
        if (error.code === "NETWORK_ERROR" || error.code === "ECONNABORTED") {
          toast.error("Error de conexión. Verifica tu internet.");
        } else {
          toast.error(
            error.response?.data?.message || "Ha ocurrido un error inesperado."
          );
        }
    }

    return Promise.reject(error);
  }
);

// Helper functions para requests comunes
export const apiHelpers = {
  // GET con manejo de errores
  async get(url, config = {}) {
    try {
      const response = await chatApi.get(url, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error };
    }
  },

  // POST con manejo de errores
  async post(url, data = {}, config = {}) {
    try {
      const response = await chatApi.post(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error };
    }
  },

  // PUT con manejo de errores
  async put(url, data = {}, config = {}) {
    try {
      const response = await chatApi.put(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error };
    }
  },

  // DELETE con manejo de errores
  async delete(url, config = {}) {
    try {
      const response = await chatApi.delete(url, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error };
    }
  },

  // Upload de archivos
  async upload(url, file, onProgress = null) {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await chatApi.post(url, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error };
    }
  },
};

export default chatApi;
