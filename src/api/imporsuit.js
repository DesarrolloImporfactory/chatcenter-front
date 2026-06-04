import axios from "axios";
import { getActorChatcenter, getCarteraCtx } from "../services/imporsuit/actor";

/**
 * Instancia axios para las APIs "libres" de Imporsuit (controlador Carterachat).
 *
 * Autenticación: UN ÚNICO token compartido (API key) en
 * `VITE_IMPORSUIT_CHATCENTER_TOKEN`, enviado como `Authorization: Bearer`.
 * No usa el JWT por usuario ni el SSO — cualquier agente puede operar la
 * cartera de un CLIENTE.
 *
 * - baseURL: VITE_IMPORSUIT_URL (new.imporsuitpro.com)
 * - withCredentials:false → necesario para el CORS con `*` del .htaccess.
 *
 * ⚠️ El token va embebido en el bundle del front, así que es visible para quien
 * inspeccione el JS. Si necesitás que no sea extraíble, hay que proxiar por el
 * backend de chatcenter (ver README). Para uso interno/operativo es aceptable.
 */

const IMPORSUIT_URL = (
  import.meta.env.VITE_IMPORSUIT_URL || "https://new.imporsuitpro.com"
).replace(/\/+$/, "");

const TOKEN = import.meta.env.VITE_IMPORSUIT_CHATCENTER_TOKEN || "";

if (!TOKEN && import.meta.env.DEV) {
  console.warn(
    "[imporsuit] Falta VITE_IMPORSUIT_CHATCENTER_TOKEN — las llamadas a Carterachat darán 401.",
  );
}

const imporsuitApi = axios.create({
  baseURL: IMPORSUIT_URL,
  timeout: 30000,
  withCredentials: false,
  headers: {
    Accept: "application/json",
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
  },
});

/**
 * Auditoría: inyecta el actor (agente chatcenter) en el body de las MUTACIONES
 * como `_cc_actor`. El backend `Carterachat` lo persiste para saber quién hizo
 * cada cosa. Se manda por body (no header) para no requerir cambios de CORS.
 * Nunca rompe la request: si algo falla, sigue sin el actor.
 */
imporsuitApi.interceptors.request.use((config) => {
  try {
    const method = (config.method || "get").toLowerCase();
    if (method !== "get" && method !== "head") {
      const actor = { ...getActorChatcenter(), ...getCarteraCtx() };
      if (config.data && typeof config.data === "object" && !Array.isArray(config.data)) {
        config.data = { ...config.data, _cc_actor: actor };
      } else if (config.data == null) {
        config.data = { _cc_actor: actor };
      }
    }
  } catch {
    // noop — la auditoría jamás debe impedir la operación real
  }
  return config;
});

export default imporsuitApi;
