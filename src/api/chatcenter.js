import axios from "axios";
import Swal from "sweetalert2";
import { APP_CONFIG } from "../config";
import authService from "../auth/AuthService";
import { toast } from "react-hot-toast";
import { jwtDecode } from "jwt-decode";

const chatApi = axios.create({
  baseURL: APP_CONFIG.api.baseURL,
  timeout: APP_CONFIG.api.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

// ═══════════════════════════════════════════════════════
// Códigos del middleware checkPlanActivo que disparan
// el modal global en MainLayout
// ═══════════════════════════════════════════════════════
const PLAN_BLOCK_CODES = new Set([
  "TRIAL_EXHAUSTED",
  "PROMO_EXHAUSTED",
  "PLAN_REQUIRED",
  "PLAN_EXPIRED",
  "PLAN_INACTIVE",
  "PLAN_UNAVAILABLE",
  "ACCOUNT_BLOCKED",
]);

chatApi.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers["X-Timestamp"] = Date.now();

    if (import.meta.env.NODE_ENV === "development") {
      console.log(
        `🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`,
        { headers: config.headers, data: config.data },
      );
    }

    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  },
);

chatApi.interceptors.response.use(
  (response) => {
    if (import.meta.env.NODE_ENV === "development") {
      console.log(
        `✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`,
        { status: response.status, data: response.data },
      );
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    console.error("❌ API Error:", {
      url: originalRequest?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });

    const silent = Boolean(originalRequest?.silentError);

    const responseCode = error.response?.data?.code;

    // ═══════════════════════════════════════════════════════
    // Plan block: capturar TODOS los códigos del middleware
    // y disparar evento global → MainLayout muestra el modal.
    // ═══════════════════════════════════════════════════════
    if (responseCode && PLAN_BLOCK_CODES.has(responseCode)) {
      window.dispatchEvent(
        new CustomEvent("plan:blocked", {
          detail: {
            code: responseCode,
            message: error.response?.data?.message || "",
            redirectTo: error.response?.data?.redirectTo || "/planes",
            trialInfo: error.response?.data?.trial_info || null,
            promoInfo: error.response?.data?.promo_info || null,
          },
        }),
      );
      return Promise.reject(error);
    }

    // ═══════════════════════════════════════════════════════
    // CARD_CAPTURE_REQUIRED: Plan 21 sin tarjeta registrada
    // Muestra modal → llama a capturarTarjetaPlan21 → redirige a Stripe
    // ═══════════════════════════════════════════════════════
    if (responseCode === "CARD_CAPTURE_REQUIRED") {
      // Evitar mostrar múltiples modales si varios requests fallan a la vez
      if (!window.__cardCaptureModalOpen) {
        window.__cardCaptureModalOpen = true;

        Swal.fire({
          icon: "info",
          title: "Registra tu método de pago",
          html: `
            <div style="text-align:left; line-height:1.6; font-size:14px;">
              <p style="margin:0 0 12px; color:#334155;">
                Para usar esta función necesitas registrar tu tarjeta.
              </p>
              <div style="
                display:flex; align-items:center; gap:10px;
                padding:12px 14px; border-radius:12px;
                background:#F0FDF4; border:1px solid #BBF7D0; margin:0 0 12px;">
                <span style="font-size:20px;">🔒</span>
                <div>
                  <div style="font-weight:700; color:#166534; font-size:13px;">
                    No se cobra nada hoy
                  </div>
                  <div style="color:#15803D; font-size:12px;">
                    El cobro de $29/mes inicia cuando termine tu período incluido.
                  </div>
                </div>
              </div>
              <p style="margin:0; color:#64748B; font-size:12px;">
                Solo toma 30 segundos.
              </p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Registrar tarjeta",
          cancelButtonText: "Ahora no",
          confirmButtonColor: "#4f46e5",
          reverseButtons: true,
          allowOutsideClick: false,
        }).then(async (result) => {
          window.__cardCaptureModalOpen = false;

          if (result.isConfirmed) {
            try {
              // Obtener id_usuario del token
              const token = authService.getToken();
              if (!token) {
                toast.error("Sesión expirada. Inicia sesión nuevamente.");
                return;
              }
              const decoded = jwtDecode(token);
              const id_usuario = decoded?.id_usuario;

              if (!id_usuario) {
                toast.error("No se pudo identificar tu usuario.");
                return;
              }

              // Mostrar loading
              Swal.fire({
                title: "Preparando checkout...",
                text: "Serás redirigido a Stripe en un momento.",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading(),
              });

              const { data } = await chatApi.post(
                "stripe_plan/capturarTarjetaPlan21",
                { id_usuario },
              );

              if (data?.success && data?.url) {
                // Redirigir a Stripe Checkout
                window.location.href = data.url;
              } else {
                Swal.close();
                toast.error(
                  data?.message || "No se pudo crear la sesión de pago.",
                );
              }
            } catch (err) {
              Swal.close();
              toast.error(
                err?.response?.data?.message ||
                  "Error al conectar con Stripe. Intenta de nuevo.",
              );
            }
          }
        });
      }

      return Promise.reject(error);
    }

    if (silent) {
      return Promise.reject(error);
    }

    const isAuthRequest = originalRequest?.url?.includes("/auth/");

    switch (error.response?.status) {
      case 401:
        // En rutas de auth, un 401 es normal (credenciales incorrectas)
        if (isAuthRequest) {
          break;
        }
        if (!originalRequest._retry) {
          originalRequest._retry = true;

          // Si ya estamos en login, no hacer nada (evita loop infinito)
          if (
            window.location.pathname === "/login" ||
            window.location.pathname === "/register"
          ) {
            break;
          }

          const isStillAuthenticated = authService.isAuthenticated();
          if (!isStillAuthenticated) {
            authService.logout();
            window.location.href = "/login";
            toast.error(
              "Sesión expirada. Por favor, inicia sesión nuevamente.",
            );
          } else {
            const errorMsg =
              error.response?.data?.message ||
              error.response?.data?.error ||
              "Error de autorización en el servicio externo";
            toast.error(errorMsg);
          }
        }
        break;

      case 402:
        toast.error(
          error.response?.data?.message ||
            "Se requiere un plan activo para continuar.",
        );
        break;

      case 403:
        toast.error("No tienes permisos para realizar esta acción.");
        break;

      case 404:
        toast.error("Recurso no encontrado.");
        break;

      case 422: {
        const validationErrors = error.response?.data?.errors;
        if (validationErrors) {
          Object.values(validationErrors).forEach((errorMessages) => {
            if (Array.isArray(errorMessages)) {
              errorMessages.forEach((msg) => toast.error(msg));
            } else {
              toast.error(errorMessages);
            }
          });
        } else {
          toast.error(error.response?.data?.message || "Datos inválidos.");
        }
        break;
      }

      case 429:
        toast.error(
          "Demasiadas solicitudes. Intenta nuevamente en unos minutos.",
        );
        break;

      case 500:
        toast.error(
          "Error interno del servidor. Intenta nuevamente más tarde.",
        );
        break;

      default:
        if (error.code === "NETWORK_ERROR" || error.code === "ECONNABORTED") {
          toast.error("Error de conexión. Verifica tu internet.");
        } else {
          toast.error(
            error.response?.data?.message || "Ha ocurrido un error inesperado.",
          );
        }
    }

    return Promise.reject(error);
  },
);

export const apiHelpers = {
  async get(url, config = {}) {
    try {
      const response = await chatApi.get(url, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error };
    }
  },
  async post(url, data = {}, config = {}) {
    try {
      const response = await chatApi.post(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error };
    }
  },
  async put(url, data = {}, config = {}) {
    try {
      const response = await chatApi.put(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error };
    }
  },
  async delete(url, config = {}) {
    try {
      const response = await chatApi.delete(url, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error };
    }
  },
  async upload(url, file, onProgress = null) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await chatApi.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            onProgress(percentCompleted);
          }
        },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error };
    }
  },
};

export default chatApi;
