import authService from "../auth/AuthService";
import { handleSessionExpired } from "../auth/sessionExpired";

// Sesiones que el servidor da por muertas aunque el token sea auténtico
// (sockets/middlewares/socketAuth.js y sockets/cortarSesiones.js en la API).
const SESION_MUERTA = new Set([
  "USER_SUSPENDED",
  "USER_NOT_FOUND",
  "TOKEN_REVOKED",
]);

/** `auth` del handshake del socket principal: manda la sesión del navegador. */
export const authDelSocket = () => ({
  token: authService.getToken() || undefined,
});

/**
 * Si el servidor rechaza el socket (al conectar) o lo corta después
 * (SESION_TERMINADA), se deja de reintentar y se cierra la sesión con el
 * mismo aviso que usa el resto de la app.
 */
export function vigilarSesionDelSocket(socket) {
  const terminar = (code) => {
    socket.close();
    handleSessionExpired({ code });
  };
  socket.on("SESION_TERMINADA", (data) => {
    if (SESION_MUERTA.has(data?.code)) terminar(data.code);
  });
  socket.on("connect_error", (err) => {
    const code = err?.data?.code || err?.message;
    if (SESION_MUERTA.has(code)) terminar(code);
  });
  return socket;
}
