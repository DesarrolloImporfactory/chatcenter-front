import { useEffect, useRef } from "react";
import chatApi from "../api/chatcenter";
import authService from "../auth/AuthService";
import {
  handleSessionExpired,
  isSessionExpiredHandled,
} from "../auth/sessionExpired";

/**
 * Vigilante de la sesión + renovación deslizante del JWT.
 *
 * Problema que resuelve: antes NADIE miraba la expiración con el paso del
 * tiempo. `ProtectedRoutes` sólo revalidaba al montar y al cambiar de ruta, y
 * en el chat los mensajes llegan por socket, así que el usuario podía estar
 * horas en la misma pantalla con el token vencido y todas las APIs fallando
 * sin que nada lo avisara ni lo redirigiera (sólo al recargar).
 *
 * Qué hace, cada minuto y también al volver a la pestaña:
 *   - token vencido  → avisa con Swal, limpia y redirige a /login.
 *   - a punto de vencer → pide `GET /auth/renew` y guarda el token nuevo
 *     (7 días más). Mientras el usuario use la plataforma, no lo echa nunca.
 *   - sin token      → no hace nada: de eso se encarga `ProtectedRoutes`
 *     (no queremos decir "tu sesión caducó" a quien nunca inició sesión).
 */

const CHECK_EVERY_MS = 60 * 1000; // cada minuto
const RENEW_WHEN_MS_LEFT = 24 * 60 * 60 * 1000; // renovar en el último día
const RENEW_RETRY_COOLDOWN_MS = 5 * 60 * 1000; // si falla la red, no martillar

export default function useSessionGuard() {
  const renovandoRef = useRef(false);
  const proximoIntentoRef = useRef(0);

  useEffect(() => {
    let cancelado = false;

    const renovar = async () => {
      if (renovandoRef.current) return;
      if (Date.now() < proximoIntentoRef.current) return;

      renovandoRef.current = true;
      try {
        const { data } = await chatApi.get("/auth/renew", {
          silentError: true,
          timeout: 15000,
        });

        if (!cancelado && data?.token) {
          authService.setToken(data.token);
          console.info("[sesión] token renovado");
        }
      } catch (err) {
        // Si fue 401 con code de sesión, el interceptor ya disparó el Swal.
        // Si fue red/timeout, reintentamos más tarde: el token sigue válido.
        proximoIntentoRef.current = Date.now() + RENEW_RETRY_COOLDOWN_MS;
      } finally {
        renovandoRef.current = false;
      }
    };

    const revisar = () => {
      if (cancelado || isSessionExpiredHandled()) return;

      const restante = authService.msUntilExpiry();

      // Sin token o token ilegible → lo maneja ProtectedRoutes.
      if (restante === null) return;

      if (restante <= 0) {
        handleSessionExpired({ code: "TOKEN_EXPIRED" });
        return;
      }

      if (restante < RENEW_WHEN_MS_LEFT) {
        renovar();
      }
    };

    // Chequeo inmediato (cubre el caso "la laptop estuvo suspendida")
    revisar();

    const intervalo = setInterval(revisar, CHECK_EVERY_MS);

    const alVolver = () => {
      if (document.visibilityState === "visible") revisar();
    };

    window.addEventListener("focus", revisar);
    window.addEventListener("online", revisar);
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      window.removeEventListener("focus", revisar);
      window.removeEventListener("online", revisar);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);
}
