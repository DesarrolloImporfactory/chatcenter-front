import chatApi from "../api/chatcenter";

/**
 * Logout global — invalida el JWT del usuario en imporsuit y chatcenter
 * actualizando users.logout_at = NOW() en la BD compartida.
 *
 * IMPORTANTE: siempre usar este helper, NO `localStorage.clear()` directo,
 * para que el cierre de sesión se propague al otro sistema.
 */
export async function globalLogout({ redirectTo = "/login" } = {}) {
  try {
    await chatApi.post(
      "/auth/logout-global",
      {},
      { silentError: true, timeout: 5000 },
    );
  } catch (_) {
    // No bloqueamos el cierre local si el endpoint falla — el local siempre debe completarse.
  }
  localStorage.clear();
  window.location.href = redirectTo;
}
