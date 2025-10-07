import { APP_CONFIG } from "../config";
import { jwtDecode } from "jwt-decode";

class AuthService {
  constructor() {
    this.tokenKey = APP_CONFIG.auth.tokenKey;
    this.userKey = APP_CONFIG.auth.userKey;
    this.cookieName = APP_CONFIG.auth.cookieName;
  }

  // Obtener token del localStorage o cookies
  getToken() {
    // Buscar token en diferentes claves por compatibilidad
    let token =
      localStorage.getItem(this.tokenKey) ||
      localStorage.getItem("token") ||
      localStorage.getItem("chat_token");

    if (!token || token === "undefined" || token === "") {
      const cookieToken = this.getCookie(this.cookieName);
      if (cookieToken) {
        localStorage.setItem(this.tokenKey, cookieToken);
        token = cookieToken;
      }
    }

    return token;
  }

  // Guardar token
  setToken(token) {
    if (token) {
      // Guardar en múltiples claves para compatibilidad
      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem("token", token);
      localStorage.setItem("chat_token", token);
      this.setCookie(this.cookieName, token, 7); // 7 días
    } else {
      this.removeToken();
    }
  }

  // Remover token
  removeToken() {
    // Limpiar todas las claves de token
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem("token");
    localStorage.removeItem("chat_token");
    localStorage.removeItem(this.userKey);
    localStorage.removeItem("id_sub_usuario");
    localStorage.removeItem("id_usuario");
    localStorage.removeItem("user_role");
    this.deleteCookie(this.cookieName);
  }

  // Verificar si el usuario está autenticado
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded = jwtDecode(token);
      return decoded.exp > Date.now() / 1000;
    } catch (error) {
      console.error("Token inválido:", error);
      this.removeToken();
      return false;
    }
  }

  // Obtener información del usuario del token
  getCurrentUser() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const decoded = jwtDecode(token);
      return {
        id: decoded.id_usuario || decoded.id || decoded.userId,
        id_sub_usuario: decoded.id_sub_usuario,
        email: decoded.email,
        name: decoded.nombre || decoded.name || decoded.nombre_encargado,
        usuario: decoded.usuario,
        role: decoded.rol || decoded.role,
        id_plan: decoded.id_plan,
        estado: decoded.estado,
        subusuarios_adicionales: decoded.subusuarios_adicionales,
        conexiones_adicionales: decoded.conexiones_adicionales,
        permissions: decoded.permissions || [],
        exp: decoded.exp,
      };
    } catch (error) {
      console.error("Error decodificando token:", error);
      return null;
    }
  }

  // Verificar si el token está próximo a expirar
  isTokenExpiringSoon() {
    const user = this.getCurrentUser();
    if (!user) return true;

    const timeUntilExpiry = user.exp * 1000 - Date.now();
    return timeUntilExpiry < APP_CONFIG.auth.refreshThreshold;
  }

  // Verificar permisos
  hasPermission(permission) {
    const user = this.getCurrentUser();
    return user?.permissions?.includes(permission) || false;
  }

  // Verificar rol
  hasRole(role) {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  // Login directo con credenciales
  async login(credentials) {
    try {
      const response = await fetch(`${APP_CONFIG.api.baseURL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error en el login");
      }

      const data = await response.json();

      // Manejar respuesta del backend
      if (data.status === "success" && data.token) {
        this.setToken(data.token);

        // Guardar datos adicionales del usuario
        if (data.data) {
          localStorage.setItem("user_data", JSON.stringify(data.data));
          if (data.data.id_sub_usuario) {
            localStorage.setItem("id_sub_usuario", data.data.id_sub_usuario);
          }
          if (data.data.id_usuario) {
            localStorage.setItem("id_usuario", data.data.id_usuario);
          }
        }

        return { success: true, user: data.data, token: data.token };
      } else {
        throw new Error("Respuesta del servidor inválida");
      }
    } catch (error) {
      console.error("Error en login:", error);
      return { success: false, error: error.message };
    }
  }

  // Utilidades para cookies
  getCookie(name) {
    const match = document.cookie.match(
      new RegExp(
        "(?:^|; )" + name.replace(/([$?*|{}\]\\[\]\/+^])/g, "\\$1") + "=([^;]*)"
      )
    );
    return match ? decodeURIComponent(match[1]) : null;
  }

  setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(
      value
    )};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
  }

  deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }

  // Login con TikTok
  async loginWithTikTok(code, state) {
    try {
      const response = await fetch(
        `${APP_CONFIG.api.baseURL}/auth/tiktok/callback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            state,
            client_key: APP_CONFIG.tiktok.clientKey,
            redirect_uri: APP_CONFIG.tiktok.redirectURI,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Error en autenticación con TikTok");
      }

      const data = await response.json();

      if (data.success && data.token) {
        this.setToken(data.token);
        localStorage.setItem(this.userKey, JSON.stringify(data.user));
        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || "Error desconocido");
      }
    } catch (error) {
      console.error("Error en login TikTok:", error);
      return { success: false, error: error.message };
    }
  }

  // Generar URL de autorización de TikTok
  getTikTokAuthURL(state = null) {
    const params = new URLSearchParams({
      client_key: APP_CONFIG.tiktok.clientKey,
      scope: APP_CONFIG.tiktok.scopes.join(","),
      response_type: "code",
      redirect_uri: APP_CONFIG.tiktok.redirectURI,
      state: state || this.generateState(),
    });

    return `${APP_CONFIG.tiktok.endpoints.auth}?${params.toString()}`;
  }

  // Generar state para OAuth
  generateState() {
    return btoa(
      Math.random().toString(36).substring(2) + Date.now().toString(36)
    );
  }

  // Logout
  logout() {
    this.removeToken();
    // Opcional: notificar al servidor
    // fetch(`${APP_CONFIG.api.baseURL}/auth/logout`, { method: 'POST' });
  }
}

// Instancia singleton
const authService = new AuthService();

export default authService;
export { AuthService };
