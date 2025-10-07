import { toast } from "react-hot-toast";
import { APP_CONFIG } from "../config";

// Configuración de toast
const toastConfig = {
  duration: APP_CONFIG.ui.notifications.duration,
  position: APP_CONFIG.ui.notifications.position,
  style: {
    borderRadius: "8px",
    background: "#333",
    color: "#fff",
    fontSize: "14px",
    maxWidth: "500px",
  },
};

// Sistema de notificaciones mejorado
export const notify = {
  success: (message, options = {}) => {
    return toast.success(message, {
      ...toastConfig,
      iconTheme: {
        primary: APP_CONFIG.ui.theme.success,
        secondary: "#fff",
      },
      ...options,
    });
  },

  error: (message, options = {}) => {
    return toast.error(message, {
      ...toastConfig,
      iconTheme: {
        primary: APP_CONFIG.ui.theme.error,
        secondary: "#fff",
      },
      ...options,
    });
  },

  info: (message, options = {}) => {
    return toast(message, {
      ...toastConfig,
      icon: "ℹ️",
      ...options,
    });
  },

  warning: (message, options = {}) => {
    return toast(message, {
      ...toastConfig,
      icon: "⚠️",
      style: {
        ...toastConfig.style,
        background: APP_CONFIG.ui.theme.warning,
        color: "#000",
      },
      ...options,
    });
  },

  loading: (message, options = {}) => {
    return toast.loading(message, {
      ...toastConfig,
      ...options,
    });
  },

  promise: (promise, messages, options = {}) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading || "Cargando...",
        success: messages.success || "Éxito!",
        error: messages.error || "Error!",
      },
      {
        ...toastConfig,
        ...options,
      }
    );
  },

  dismiss: (toastId) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },

  // Notificación personalizada para conexiones
  connection: {
    connected: (platform) => notify.success(`✅ Conectado a ${platform}`),
    disconnected: (platform) =>
      notify.warning(`⚠️ Desconectado de ${platform}`),
    error: (platform, error) =>
      notify.error(`❌ Error en ${platform}: ${error}`),
  },

  // Notificación para mensajes
  message: {
    sent: () => notify.success("📤 Mensaje enviado"),
    received: (from) => notify.info(`📨 Nuevo mensaje de ${from}`),
    failed: () => notify.error("❌ Error al enviar mensaje"),
  },

  // Notificación para archivos
  file: {
    uploading: (filename) => notify.loading(`📤 Subiendo ${filename}...`),
    uploaded: (filename) =>
      notify.success(`✅ ${filename} subido exitosamente`),
    failed: (filename) => notify.error(`❌ Error al subir ${filename}`),
  },
};

// Sistema de logging
export const logger = {
  info: (message, data = null) => {
    if (import.meta.env.NODE_ENV === "development") {
      console.log(`ℹ️ [INFO] ${message}`, data);
    }
  },

  warn: (message, data = null) => {
    console.warn(`⚠️ [WARN] ${message}`, data);
  },

  error: (message, error = null) => {
    console.error(`❌ [ERROR] ${message}`, error);

    // En producción, enviar error a servicio de logging
    if (
      import.meta.env.NODE_ENV === "production" &&
      APP_CONFIG.features.enableAnalytics
    ) {
      // Aquí puedes integrar con Sentry, LogRocket, etc.
      // trackError(message, error);
    }
  },

  debug: (message, data = null) => {
    if (import.meta.env.NODE_ENV === "development") {
      console.debug(`🐛 [DEBUG] ${message}`, data);
    }
  },

  api: (method, url, data = null) => {
    if (import.meta.env.NODE_ENV === "development") {
      console.log(`🌐 [API] ${method.toUpperCase()} ${url}`, data);
    }
  },
};

// Utilidades para manejo de errores
export const errorHandler = {
  // Manejar errores de validación
  validation: (errors) => {
    if (typeof errors === "object") {
      Object.entries(errors).forEach(([field, messages]) => {
        if (Array.isArray(messages)) {
          messages.forEach((message) => notify.error(`${field}: ${message}`));
        } else {
          notify.error(`${field}: ${messages}`);
        }
      });
    } else {
      notify.error("Error de validación");
    }
  },

  // Manejar errores de red
  network: (error) => {
    if (error.code === "NETWORK_ERROR") {
      notify.error("Error de conexión. Verifica tu internet.");
    } else if (error.code === "ECONNABORTED") {
      notify.error("La solicitud tardó demasiado. Intenta nuevamente.");
    } else {
      notify.error("Error de red inesperado.");
    }
    logger.error("Network Error", error);
  },

  // Manejar errores generales
  general: (error, context = "") => {
    const message =
      error?.message || error?.data?.message || "Error inesperado";
    notify.error(`${context ? context + ": " : ""}${message}`);
    logger.error(`General Error${context ? ` in ${context}` : ""}`, error);
  },

  // Manejar errores async/await
  async: (error, context = "") => {
    logger.error(`Async Error${context ? ` in ${context}` : ""}`, error);

    if (error.response) {
      // Error de respuesta HTTP
      const status = error.response.status;
      const message = error.response.data?.message || `Error ${status}`;
      notify.error(message);
    } else if (error.request) {
      // Error de red
      errorHandler.network(error);
    } else {
      // Error general
      errorHandler.general(error, context);
    }
  },
};

// Utilidades para debugging
export const debug = {
  performance: {
    start: (label) => {
      if (import.meta.env.NODE_ENV === "development") {
        console.time(`⏱️ ${label}`);
      }
    },

    end: (label) => {
      if (import.meta.env.NODE_ENV === "development") {
        console.timeEnd(`⏱️ ${label}`);
      }
    },
  },

  render: (componentName, props = {}) => {
    if (import.meta.env.NODE_ENV === "development") {
      console.log(`🎨 [RENDER] ${componentName}`, props);
    }
  },

  state: (stateName, oldValue, newValue) => {
    if (import.meta.env.NODE_ENV === "development") {
      console.log(`🔄 [STATE] ${stateName}`, { old: oldValue, new: newValue });
    }
  },
};

export default { notify, logger, errorHandler, debug };
