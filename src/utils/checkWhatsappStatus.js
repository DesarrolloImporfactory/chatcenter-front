import Swal from "sweetalert2";
import chatApi from "../api/chatcenter";

const MENSAJES = {
  BANNED: {
    title: "Numero de WhatsApp bloqueado",
    text: "Tu numero fue bloqueado por Meta. No puedes enviar ni recibir mensajes. Revisa tu cuenta de WhatsApp Business.",
  },
  SUSPENDED: {
    title: "Cuenta suspendida",
    text: "Tu cuenta de WhatsApp Business fue suspendida por Meta. Contacta al soporte de Meta para resolverlo.",
  },
  TOKEN_EXPIRED: {
    title: "Token de acceso vencido",
    text: "El token de acceso de WhatsApp expiro. Debes reconectar tu numero en Canal de Conexiones.",
  },
  FLAGGED: {
    title: "Numero con baja calidad",
    text: "Tu numero tiene calificacion roja en Meta. Esto puede limitar el envio de mensajes. Revisa tu cuenta.",
  },
  RATE_LIMITED: {
    title: "Limite de mensajes alcanzado",
    text: "Alcanzaste el limite de mensajes de Meta temporalmente. Esto se resuelve solo en unas horas.",
  },
};

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

    await Swal.fire({
      icon: "warning",
      title: info.title,
      html: `<div style="font-size:14px; line-height:1.5;">${info.text}</div>`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText: "Ir a WhatsApp Business",
      showCancelButton: true,
      cancelButtonText: "Mas tarde",
      confirmButtonColor: "#6366f1",
    }).then((result) => {
      if (result.isConfirmed) {
        window.open("https://business.facebook.com/latest/settings/whatsapp_account/", "_blank");
      }
    });

  } catch (err) {
    console.error("Error al verificar estado WhatsApp:", err);
  }
}