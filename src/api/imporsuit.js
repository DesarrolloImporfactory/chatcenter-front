import axios from "axios";

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

export default imporsuitApi;
