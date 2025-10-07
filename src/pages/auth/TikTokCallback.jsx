import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import authService from "../../auth/AuthService";
import { notify, logger, errorHandler } from "../../utils/notifications";
import { APP_CONFIG } from "../../config";

const TikTokCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("processing"); // processing, success, error
  const [message, setMessage] = useState(
    "Procesando autenticación con TikTok..."
  );
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleTikTokCallback = async () => {
      try {
        logger.info("Iniciando callback de TikTok", {
          url: location.search,
          params: Object.fromEntries(searchParams.entries()),
        });

        // Obtener parámetros de la URL
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        // Verificar errores de OAuth
        if (error) {
          throw new Error(errorDescription || `Error de OAuth: ${error}`);
        }

        // Verificar que tenemos el código de autorización
        if (!code) {
          throw new Error("No se recibió código de autorización de TikTok");
        }

        // Validar state (si lo implementas)
        const savedState = sessionStorage.getItem("tiktok_oauth_state");
        if (savedState && state !== savedState) {
          throw new Error("Estado de OAuth inválido. Posible ataque CSRF.");
        }

        setMessage("Intercambiando código por token...");

        // Llamar al servicio de autenticación
        const result = await authService.loginWithTikTok(code, state);

        if (result.success) {
          setStatus("success");
          setMessage("¡Autenticación exitosa! Redirigiendo...");

          notify.success("¡Conectado exitosamente con TikTok!");
          logger.info("Autenticación TikTok exitosa", { user: result.user });

          // Limpiar state guardado
          sessionStorage.removeItem("tiktok_oauth_state");

          // Redirigir después de un breve delay
          setTimeout(() => {
            const from = location.state?.from?.pathname || "/conexiones";
            navigate(from + "?tiktok=connected", { replace: true });
          }, 2000);
        } else {
          throw new Error(result.error || "Error en autenticación");
        }
      } catch (error) {
        logger.error("Error en callback de TikTok", error);
        setStatus("error");
        setMessage(`Error: ${error.message}`);

        notify.error("Error al conectar con TikTok");
        errorHandler.general(error, "TikTok Callback");

        // Redirigir a login después de un delay
        setTimeout(() => {
          navigate("/login?error=tiktok_auth_failed", { replace: true });
        }, 3000);
      }
    };

    // Solo ejecutar si tenemos parámetros
    if (searchParams.toString()) {
      handleTikTokCallback();
    } else {
      setStatus("error");
      setMessage("No se recibieron parámetros de autenticación");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    }
  }, [searchParams, navigate, location]);

  // Renderizar UI basada en el estado
  const renderContent = () => {
    const baseClasses =
      "flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100";

    switch (status) {
      case "processing":
        return (
          <div className={baseClasses}>
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md mx-4">
              <div className="relative mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-pink-500 mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-2xl">🎵</div>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Conectando con TikTok
              </h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
                <span>Powered by</span>
                <span className="font-semibold text-pink-500">
                  TikTok Business
                </span>
              </div>
            </div>
          </div>
        );

      case "success":
        return (
          <div className={baseClasses}>
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md mx-4">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                ¡Conexión Exitosa!
              </h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <div className="animate-pulse">
                <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full animate-progress"></div>
                </div>
              </div>
            </div>
          </div>
        );

      case "error":
        return (
          <div className={baseClasses}>
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md mx-4">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-red-800 mb-2">
                Error de Conexión
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <button
                onClick={() => navigate("/login")}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Volver al Login
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {renderContent()}
      <style jsx>{`
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        .animate-progress {
          animation: progress 2s ease-in-out;
        }
      `}</style>
    </>
  );
};

export default TikTokCallback;
