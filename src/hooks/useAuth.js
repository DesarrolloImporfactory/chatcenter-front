import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUser } from "../store/slices/user.slice";
import authService from "../auth/AuthService";
import { notify, logger } from "../utils/notifications";

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const login = async (credentials) => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info("Iniciando proceso de login", { email: credentials.email });

      const result = await authService.login(credentials);

      if (result.success) {
        // Actualizar el estado de Redux con los datos del usuario
        dispatch(setUser(result.user));

        notify.success(
          `¡Bienvenido ${result.user.nombre_encargado || result.user.usuario}!`
        );
        logger.info("Login exitoso", {
          user: result.user.email || result.user.usuario,
        });

        // Redirigir a la página principal
        navigate("/conexiones");

        return { success: true, user: result.user };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error.message || "Error al iniciar sesión";
      setError(errorMessage);
      notify.error(errorMessage);
      logger.error("Error en login", error);

      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      authService.logout();
      dispatch(setUser(null));
      notify.info("Sesión cerrada exitosamente");
      navigate("/login");
    } catch (error) {
      logger.error("Error en logout", error);
    }
  };

  const checkAuth = () => {
    return authService.isAuthenticated();
  };

  const getCurrentUser = () => {
    return authService.getCurrentUser();
  };

  const clearError = () => {
    setError(null);
  };

  return {
    login,
    logout,
    checkAuth,
    getCurrentUser,
    isLoading,
    error,
    clearError,
  };
};

export default useAuth;
