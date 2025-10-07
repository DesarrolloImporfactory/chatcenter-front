// Configuración centralizada de la aplicación
export const APP_CONFIG = {
  // Información básica de la app
  app: {
    name: "ChatCenter Business Messenger",
    version: "1.0.0",
    description:
      "Professional messaging platform that facilitates secure business communication between companies and TikTok users.",
    author: "Imporfactory",
    website: "https://imporsuit.ec",
  },

  // URLs base para diferentes entornos
  api: {
    baseURL:
      import.meta.env.VITE_API_URL || import.meta.env.VITE_socket + "/api/v1",
    timeout: 30000,
    retries: 3,
  },

  // Configuración de Socket.IO
  socket: {
    url: import.meta.env.VITE_socket || "http://localhost:3001",
    options: {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    },
  },

  // Configuración de TikTok
  tiktok: {
    clientKey: import.meta.env.VITE_TIKTOK_CLIENT_KEY,
    redirectURI:
      import.meta.env.VITE_TIKTOK_REDIRECT_URI ||
      (import.meta.env.NODE_ENV === "production"
        ? "https://chatcenter.imporsuit.ec/auth/tiktok/callback"
        : "http://localhost:5173/auth/tiktok/callback"),
    scopes: ["user.info.basic"],
    endpoints: {
      auth: "https://www.tiktok.com/v2/auth/authorize/",
      token: "https://open.tiktokapis.com/v2/oauth/token/",
      userInfo: "https://open.tiktokapis.com/v2/user/info/",
    },
  },

  // Configuración de autenticación
  auth: {
    tokenKey: "chat_token",
    userKey: "chat_user",
    cookieName: "chat_token",
    tokenExpiry: 24 * 60 * 60 * 1000, // 24 horas
    refreshThreshold: 5 * 60 * 1000, // 5 minutos antes de expirar
  },

  // Configuración de la UI
  ui: {
    theme: {
      primary: "#0075ff",
      secondary: "#6b7280",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#3b82f6",
    },
    pagination: {
      defaultLimit: 20,
      maxLimit: 100,
    },
    notifications: {
      duration: 5000,
      position: "top-right",
    },
  },

  // Configuración de características
  features: {
    enableTikTokIntegration: import.meta.env.VITE_ENABLE_TIKTOK === "true",
    enableWhatsAppIntegration: import.meta.env.VITE_ENABLE_WHATSAPP !== "false",
    enableCalendar: import.meta.env.VITE_ENABLE_CALENDAR !== "false",
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === "true",
    enableNotifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS !== "false",
  },

  // Límites y restricciones
  limits: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxMessageLength: 4096,
    maxConnectionsPerUser: 10,
    rateLimit: {
      messages: 100, // por minuto
      api: 1000, // por hora
    },
  },
};

// Validación de configuración requerida
export const validateConfig = () => {
  const required = ["VITE_socket"];

  const missing = required.filter((key) => !import.meta.env[key]);

  if (missing.length > 0) {
    console.error("Missing required environment variables:", missing);
    return false;
  }

  return true;
};

// Helper para obtener configuración por clave
export const getConfig = (key) => {
  const keys = key.split(".");
  return keys.reduce((config, k) => config?.[k], APP_CONFIG);
};

// Helper para verificar si una característica está habilitada
export const isFeatureEnabled = (feature) => {
  return APP_CONFIG.features[feature] ?? false;
};

export default APP_CONFIG;
