import { createElement } from "react";
import Swal from "sweetalert2";
import { toast } from "react-hot-toast";
import chatApi from "../api/chatcenter";

/* Estados del número que devuelve el backend (wa_status).
 *
 * `critico: true` corta la operación: no entra ni sale ningún mensaje y hay
 * que hacer algo para arreglarlo. Esos siguen con el modal que bloquea la
 * pantalla, porque una notificación que se va sola puede dejar a un cliente
 * días sin darse cuenta de que su WhatsApp está muerto.
 *
 * Los demás son informativos: el número funciona, solo está limitado o con
 * mala calificación. Esos salen como notificación arriba a la derecha. */
const MENSAJES = {
  BANNED: {
    critico: true,
    title: "Número de WhatsApp bloqueado",
    text: "Tu número fue bloqueado por Meta. No puedes enviar ni recibir mensajes. Revisa tu cuenta de WhatsApp Business.",
  },
  SUSPENDED: {
    critico: true,
    title: "Cuenta suspendida",
    text: "Tu cuenta de WhatsApp Business fue suspendida o desconectada por Meta. Debes reconectar tu número en la sección de Conexiones.",
  },
  // Meta 100/33: el número o la WABA ya no existen o nos quitaron el acceso.
  // Antes el back lo reportaba como SUSPENDED; mismo aviso.
  SIN_ACCESO: {
    critico: true,
    title: "Cuenta suspendida",
    text: "Tu cuenta de WhatsApp Business fue suspendida o desconectada por Meta. Debes reconectar tu número en la sección de Conexiones.",
  },
  TOKEN_EXPIRED: {
    critico: true,
    title: "Token de acceso vencido",
    text: "El token de acceso de WhatsApp expiró. Debes reconectar tu número en la sección de Conexiones.",
  },
  FLAGGED: {
    critico: false,
    title: "Número con baja calidad",
    text: "Tu número tiene calificación roja en Meta. Puedes seguir trabajando, pero esto limita el envío de mensajes.",
  },
  RATE_LIMITED: {
    critico: false,
    title: "Límite de mensajes alcanzado",
    text: "Alcanzaste el límite de mensajes de Meta temporalmente. Se resuelve solo en unas horas.",
  },
};

const STORAGE_KEY = "whatsapp_status_notification";
const URL_META_BUSINESS =
  "https://business.facebook.com/latest/settings/whatsapp_account/";

/* Notificación arriba a la derecha para los avisos informativos. Dura más
   que un toast normal (4 s) porque trae una acción, y se puede cerrar. */
function avisoNoInvasivo(info) {
  toast(
    (t) =>
      createElement(
        "div",
        { style: { display: "grid", gap: 4 } },
        createElement(
          "div",
          { style: { fontWeight: 600, fontSize: 13 } },
          info.title,
        ),
        createElement(
          "div",
          { style: { fontSize: 12, opacity: 0.9, lineHeight: 1.45 } },
          info.text,
        ),
        createElement(
          "div",
          { style: { display: "flex", gap: 12, marginTop: 4 } },
          createElement(
            "button",
            {
              type: "button",
              onClick: () => {
                toast.dismiss(t.id);
                window.open(URL_META_BUSINESS, "_blank", "noopener,noreferrer");
              },
              style: {
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "#a5b4fc",
                fontSize: 12,
                fontWeight: 600,
              },
            },
            "Ver en Meta Business",
          ),
          createElement(
            "button",
            {
              type: "button",
              onClick: () => toast.dismiss(t.id),
              style: {
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "rgba(255,255,255,0.55)",
                fontSize: 12,
              },
            },
            "Cerrar",
          ),
        ),
      ),
    { icon: "⚠️", duration: 12000 },
  );
}

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

    // Informativos: el número sigue operando, no hay que frenar al usuario.
    if (!info.critico) {
      avisoNoInvasivo(info);
      return;
    }

    /* Ya no se limpian las credenciales en el back: /conexiones recibe
       status_whatsapp (wa_status) y con cualquier valor distinto de CONNECTED
       muestra "Pendiente" + botón de conectar, y embeddedSignupComplete
       actualiza la misma fila. Limpiar borraba wa_status y los ids, con lo
       que la conexión volvía a ser editable y el historial podía partirse
       entre el número viejo y el nuevo. */
    const shouldClearCredentials =
      status === "TOKEN_EXPIRED" ||
      status === "SUSPENDED" ||
      status === "SIN_ACCESO";

    const confirmButtonText = shouldClearCredentials
      ? "Ir a Conexiones"
      : "Ir al Meta Business";

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
      window.open(URL_META_BUSINESS, "_blank", "noopener,noreferrer");
    }
  } catch (err) {
    console.error("Error al verificar estado WhatsApp:", err);
  }
}
