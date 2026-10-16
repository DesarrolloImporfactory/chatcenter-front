import axios from "axios";
import { APP_CONFIG } from "../config";
import authService from "../auth/AuthService";
import {
  handleSessionExpired,
  isSessionExpiredHandled,
} from "../auth/sessionExpired";
import { getCarteraCtx } from "../services/imporsuit/actor";

/**
 * Instancia axios para las APIs de Imporsuit (controladores Carterachat y
 * Cotizachat).
 *
 * NO llama a Imporsuit directo: le pide al backend de ImporChat
 * (`/imporsuit_puente`), que valida la sesión, agrega la llave de la
 * integración y dice quién es el asesor. La llave vive solo en el servidor:
 * acá no hay ningún secreto y no debe volver a haberlo (nada de
 * `VITE_*_TOKEN`: todo lo que empieza por VITE_ termina en el bundle público).
 *
 * Las rutas no cambian: `imporsuitApi.get("/Carterachat/cursos")` sigue igual.
 */

const imporsuitApi = axios.create({
  baseURL: `${String(APP_CONFIG.api.baseURL || "").replace(/\/+$/, "")}/imporsuit_puente`,
  timeout: 30000,
  headers: { Accept: "application/json" },
});

// Mismos códigos que auth.middleware.protect y que api/chatcenter.js.
const SESSION_DEAD_CODES = new Set([
  "TOKEN_EXPIRED",
  "TOKEN_INVALID",
  "TOKEN_MISSING",
  "USER_NOT_FOUND",
  "TOKEN_REVOKED",
]);

/**
 * Sesión de ImporChat + contexto de la cartera abierta.
 *
 * `_cc_actor` ya no lleva la identidad: el backend la pone desde la sesión y
 * descarta la que llegue de acá. Solo viaja el contexto (conexión del chat y
 * correo del cliente) para enriquecer la auditoría. Nunca rompe la request.
 */
imporsuitApi.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  try {
    const method = (config.method || "get").toLowerCase();
    if (method !== "get" && method !== "head") {
      const ctx = getCarteraCtx();
      if (config.data && typeof config.data === "object" && !Array.isArray(config.data)) {
        config.data = { ...config.data, _cc_actor: ctx };
      } else if (config.data == null) {
        config.data = { _cc_actor: ctx };
      }
    }
  } catch {
    // noop — la auditoría jamás debe impedir la operación real
  }
  return config;
});

/**
 * Los errores HTTP del puente (403 cuenta no habilitada, 502/503 Imporsuit
 * caído) traen el motivo en `message`: se sube al Error para que las pantallas
 * muestren eso y no «Request failed with status code…».
 */
imporsuitApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    if (
      error.response?.status === 401 &&
      SESSION_DEAD_CODES.has(data?.code) &&
      !isSessionExpiredHandled()
    ) {
      handleSessionExpired({ code: data.code });
      error._handledByInterceptor = true;
    }
    if (data && typeof data === "object" && data.message) {
      error.message = data.message;
    }
    return Promise.reject(error);
  },
);

export default imporsuitApi;
