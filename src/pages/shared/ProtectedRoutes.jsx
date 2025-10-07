import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import authService from "../../auth/AuthService";
import { logger } from "../../utils/notifications";

const ProtectedRoutes = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      try {
        const authenticated = authService.isAuthenticated();
        const currentUser = authService.getCurrentUser();

        setIsAuthenticated(authenticated);
        setUser(currentUser);

        if (authenticated) {
          logger.info("Usuario autenticado", {
            user: currentUser?.email,
            route: location.pathname,
          });

          // Verificar si el token está próximo a expirar
          if (authService.isTokenExpiringSoon()) {
            logger.warn("Token próximo a expirar", {
              exp: currentUser?.exp,
              timeLeft: currentUser?.exp * 1000 - Date.now(),
            });
            // Aquí podrías implementar refresh token automático
          }
        } else {
          logger.info("Usuario no autenticado, redirigiendo a login");
        }
      } catch (error) {
        logger.error("Error verificando autenticación", error);
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    checkAuth();
  }, [location.pathname]);

  // Mostrar loading mientras verificamos autenticación
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Redirigir a login si no está autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Renderizar rutas protegidas con contexto de usuario
  return (
    <div data-user-id={user?.id} data-user-role={user?.role}>
      <Outlet context={{ user }} />
    </div>
  );
};

export default ProtectedRoutes;
