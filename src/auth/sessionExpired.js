import Swal from "sweetalert2";
import authService from "./AuthService";

/**
 * Manejo ÚNICO de "la sesión se murió".
 *
 * Se dispara desde tres lados y siempre termina igual:
 *   1. interceptor de `api/chatcenter.js` — cuando el backend responde 401 con
 *      un `code` de sesión (TOKEN_EXPIRED, TOKEN_INVALID, TOKEN_REVOKED…).
 *   2. `hooks/useSessionGuard.js` — watchdog que mira `exp` sin esperar a que
 *      falle una API (antes nada revisaba esto y el usuario se quedaba en la
 *      página con todo fallando hasta que recargaba).
 *   3. `context/SocketProvider.jsx` — cuando el namespace /presence rechaza el
 *      handshake por token inválido.
 *
 * Es idempotente: por más peticiones que fallen en paralelo, un solo Swal.
 * Este módulo NO importa `chatApi` a propósito, para no crear un ciclo de
 * imports (chatApi → sessionExpired → chatApi).
 */

// Segundos antes de redirigir solo si el usuario no toca el botón
const AUTO_REDIRECT_MS = 8000;

const MENSAJES = {
  TOKEN_REVOKED: {
    title: "Cerraste sesión en otra aplicación",
    text: "Tu sesión se cerró desde otro dispositivo o desde Imporsuit. Vas a ser redirigido para iniciar sesión de nuevo.",
    icon: "info",
  },
  USER_NOT_FOUND: {
    title: "Tu usuario ya no está disponible",
    text: "No pudimos validar tu usuario. Vas a ser redirigido para iniciar sesión de nuevo.",
    icon: "warning",
  },
  DEFAULT: {
    title: "Tu sesión ha caducado",
    text: "Por seguridad cerramos tu sesión. Vas a ser redirigido al inicio de sesión y tendrás que ingresar de nuevo.",
    icon: "warning",
  },
};

/** ¿Ya estamos procesando una expiración? Sirve para callar toasts y reintentos. */
export const isSessionExpiredHandled = () =>
  Boolean(window.__sessionExpiredHandled);

/**
 * Limpia TODO el rastro de sesión y avisa al usuario antes de mandarlo a login.
 * @param {{ code?: string, redirectTo?: string }} opts
 */
export function handleSessionExpired({ code, redirectTo = "/login" } = {}) {
  if (window.__sessionExpiredHandled) return;
  window.__sessionExpiredHandled = true;

  // Si ya estamos en el login/registro no tiene sentido avisar ni redirigir
  // (evita el modal en loop mientras alguien intenta entrar). Sólo limpiamos.
  const enPantallaDeAcceso = ["/login", "/register"].includes(
    window.location.pathname,
  );
  if (enPantallaDeAcceso) {
    try {
      authService.logout();
    } catch (_) {
      /* noop */
    }
    // Permitimos un nuevo aviso más adelante: esta vez no hubo ninguno.
    window.__sessionExpiredHandled = false;
    return;
  }

  // 1) Limpieza local ANTES de cualquier UI, para que nada pueda seguir
  //    mandando el token muerto en paralelo.
  try {
    authService.logout();
  } catch (_) {
    // Fallback: si algo raro pasa, limpiamos a mano.
    try {
      localStorage.clear();
    } catch (_) {
      /* noop */
    }
  }
  try {
    sessionStorage.clear();
  } catch (_) {
    /* noop */
  }

  const salir = () => {
    // replace (no href) para que el botón "atrás" no devuelva a la pantalla muerta
    window.location.replace(redirectTo);
  };

  const { title, text, icon } = MENSAJES[code] || MENSAJES.DEFAULT;

  // 2) Aviso claro. Si Swal falla por cualquier motivo, igual redirigimos.
  try {
    // Cierra cualquier modal previo (plan bloqueado, loaders, etc.)
    Swal.close();
    Swal.fire({
      icon,
      title,
      text,
      confirmButtonText: "Iniciar sesión",
      confirmButtonColor: "#4f46e5",
      allowOutsideClick: false,
      allowEscapeKey: false,
      timer: AUTO_REDIRECT_MS,
      timerProgressBar: true,
    }).then(salir);
  } catch (_) {
    salir();
  }
}

export default handleSessionExpired;
