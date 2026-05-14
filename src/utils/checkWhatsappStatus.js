import Swal from "sweetalert2";
import chatApi from "../api/chatcenter";

const MENSAJES = {
  BANNED: {
    title: "Número de WhatsApp bloqueado",
    text: "Tu número fue bloqueado por Meta. No puedes enviar ni recibir mensajes. Revisa tu cuenta de WhatsApp Business.",
  },
  SUSPENDED: {
    title: "Cuenta suspendida",
    text: "Tu cuenta de WhatsApp Business fue suspendida o desconectada por Meta. Debes reconectar tu número en la sección de Conexiones.",
  },
  TOKEN_EXPIRED: {
    title: "Token de acceso vencido",
    text: "El token de acceso de WhatsApp expiró. Debes reconectar tu número en la sección de Conexiones.",
  },
  FLAGGED: {
    title: "Número con baja calidad",
    text: "Tu número tiene calificación roja en Meta. Esto puede limitar el envío de mensajes. Revisa tu cuenta.",
  },
  RATE_LIMITED: {
    title: "Límite de mensajes alcanzado",
    text: "Alcanzaste el límite de mensajes de Meta temporalmente. Esto se resuelve solo en unas horas.",
  },
};

const STORAGE_KEY = "whatsapp_status_notification";

export async function checkWhatsappStatus() {
  const id_configuracion = localStorage.getItem("id_configuracion");
  if (!id_configuracion) return;

  try {
    const { data } = await chatApi.get("/whatsapp_managment/numero_status", {
      params: { id_configuracion },
    });

    const status = data?.status;
    if (!status || status === "CONNECTED" || status === "UNKNOWN") return;

    const info = MENSAJES[status];
    if (!info) return;

    // Control de notificaciones (aporte del compañero)
    const saved = localStorage.getItem(STORAGE_KEY);
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    let lastStatus = null;
    let lastDate = null;

    if (saved) {
      const parsed = JSON.parse(saved);
      lastStatus = parsed.status;
      lastDate = parsed.date;
    }

    const shouldNotify = status !== lastStatus || today !== lastDate;
    if (!shouldNotify) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, date: today }));

    const shouldClearCredentials =
      status === "TOKEN_EXPIRED" || status === "SUSPENDED";

    const confirmButtonText = shouldClearCredentials
      ? "Ir a Conexiones"
      : "Ir al Meta Business";

    // Limpiar backend SIEMPRE si aplica, sin importar lo que elija el usuario
    if (shouldClearCredentials) {
      try {
        await chatApi.post(
          "/whatsapp_managment/limpiar_credenciales_whatsapp",
          { id_configuracion },
        );
      } catch (e) {
        console.error("Error al limpiar credenciales:", e);
      }
    }

    const result = await Swal.fire({
      icon: "warning",
      title: info.title,
      html: `<div style="font-size:14px; line-height:1.5;">${info.text}</div>`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText,
      showCancelButton: true,
      cancelButtonText: "Más tarde",
      confirmButtonColor: "#6366f1",
    });

    if (!result.isConfirmed) return;

    if (shouldClearCredentials) {
      localStorage.removeItem("id_configuracion");
      localStorage.removeItem("tipo_configuracion");
      localStorage.removeItem("id_plataforma_conf");
      window.location.href = "/conexiones";
    } else {
      window.open(
        "https://business.facebook.com/latest/settings/whatsapp_account/",
        "_blank",
      );
    }
  } catch (err) {
    console.error("Error al verificar estado WhatsApp:", err);
  }
}
