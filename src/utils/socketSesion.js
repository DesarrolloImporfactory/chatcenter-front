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
 *
 * Excepción: si en otra pestaña ya se volvió a entrar (el token guardado no es
 * el que usó este socket), no se cierra nada: se reconecta con el token nuevo.
 * Si no, cerrar sesión aquí borraría la sesión recién abierta en la otra.
 */
export function vigilarSesionDelSocket(socket) {
  let tokenUsado = socket.auth?.token;
  // Cada (re)conexión lee el token vigente, no el de cuando se abrió.
  socket.auth = (cb) => {
    tokenUsado = authService.getToken() || undefined;
    cb({ token: tokenUsado });
  };

  let reabrirAlCortar = false;
  const decidir = (code, yaDesconectado) => {
    const actual = authService.getToken();
    if (actual && actual !== tokenUsado) {
      if (yaDesconectado) socket.connect();
      else reabrirAlCortar = true;
      return;
    }
    socket.close();
    handleSessionExpired({ code });
  };

  socket.on("SESION_TERMINADA", (data) => {
    if (SESION_MUERTA.has(data?.code)) decidir(data.code, false);
  });
  socket.on("disconnect", (motivo) => {
    if (reabrirAlCortar && motivo === "io server disconnect") {
      reabrirAlCortar = false;
      socket.connect();
    }
  });
  socket.on("connect_error", (err) => {
    const code = err?.data?.code || err?.message;
    if (SESION_MUERTA.has(code)) decidir(code, true);
  });
  return socket;
}
