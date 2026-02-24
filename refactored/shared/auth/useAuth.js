/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  CAPA SHARED — Hook useAuth (para componentes React)      ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Reemplaza: src/hooks/useAuth.js                          ║
 * ║  + El patrón repetido en +10 archivos:                    ║
 * ║    const token = localStorage.getItem("token");           ║
 * ║    const decoded = jwtDecode(token);                      ║
 * ║    if (decoded.exp < Date.now() / 1000) { redirect }      ║
 * ║                                                           ║
 * ║  ARCHIVOS QUE DEBERÍAN MIGRAR A USAR ESTE HOOK:          ║
 * ║  - src/pages/chat/Chat.jsx                                ║
 * ║  - src/pages/conexiones/Conexiones.jsx                    ║
 * ║  - src/pages/conexiones/Conexionespruebas.jsx             ║
 * ║  - src/pages/conexiones/AdminConexiones.jsx               ║
 * ║  - src/pages/admintemplates/CrearConfiguracionModal.jsx   ║
 * ║  - src/components/chat/DatosUsuario.jsx                   ║
 * ║  - src/components/chat/DatosUsuarioModerno.jsx            ║
 * ║  - src/components/chat/Modales.jsx                        ║
 * ║  - src/pages/calendario/Calendario.jsx                    ║
 * ║  - src/pages/asistentes/Asistentes.jsx                    ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUser } from "../../src/store/slices/user.slice";
import authService from "./AuthService";
import { notify, logger } from "../../src/utils/notifications";

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  /* ─────── Datos del usuario ─────── */
  const token = authService.getToken();
  const user = authService.getCurrentUser();
  const isAuthenticated = authService.isAuthenticated();
  const userId = user?.id || null;
  const idSubUsuario = user?.id_sub_usuario || null;

  /* ─────── Guard: redirige a /login si no hay sesión ─────── */
  const requireAuth = () => {
    if (!isAuthenticated) {
      authService.logout();
      navigate("/login");
      return false;
    }
    return true;
  };

  /* ─────── Login ─────── */
  const login = async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      logger.info("Iniciando proceso de login", { email: credentials.email });
      const result = await authService.login(credentials);
      if (result.success) {
        dispatch(setUser(result.user));
        notify.success(
          `¡Bienvenido ${result.user.nombre_encargado || result.user.usuario}!`
        );
        navigate("/conexiones");
        return { success: true, user: result.user };
      }
      throw new Error(result.error);
    } catch (err) {
      const msg = err.message || "Error al iniciar sesión";
      setError(msg);
      notify.error(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  /* ─────── Logout ─────── */
  const logout = () => {
    authService.logout();
    dispatch(setUser(null));
    notify.info("Sesión cerrada exitosamente");
    navigate("/login");
  };

  /* ─────── Helpers ─────── */
  const clearError = () => setError(null);

  return {
    // Estado
    token,
    user,
    userId,
    idSubUsuario,
    isAuthenticated,
    isLoading,
    error,
    // Acciones
    login,
    logout,
    requireAuth,
    clearError,
    // Servicio directo (para casos edge)
    authService,
  };
};

export default useAuth;
