import Swal from "sweetalert2";

/* Aviso cuando Meta rechaza un envío hecho desde el chat.
   ─────────────────────────────────────────────────────────────
   Antes se mostraba `alert("Error: " + error.message)` con el texto de Meta en
   inglés, p. ej. «(#131056) (Business Account, Consumer Account) pair rate
   limit hit». El asesor no sabe qué hacer con eso y lo reporta como falla del
   chat (04-11-2026), cuando lo único que tenía que hacer era esperar un
   minuto. Aquí se traduce cada código a qué pasó y qué hacer; el código queda
   al pie para quien tenga que revisarlo.

   Códigos: https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes */

const ESPERA =
  "Espera uno o dos minutos y vuelve a enviarlo. No hace falta recargar la página.";

const AVISOS = {
  // Demasiados mensajes seguidos al MISMO cliente (bots + asesor cuentan juntos).
  131056: {
    icon: "info",
    title: "Espera un momento",
    text:
      "Se enviaron muchos mensajes seguidos a este cliente y WhatsApp pausó los envíos por unos segundos. " +
      ESPERA,
  },
  // Demasiados mensajes por segundo desde el número del negocio.
  130429: {
    icon: "info",
    title: "Espera un momento",
    text:
      "Tu número de WhatsApp está enviando muchos mensajes a la vez y WhatsApp pausó los envíos por unos segundos. " +
      ESPERA,
  },
  80007: {
    icon: "info",
    title: "Espera un momento",
    text:
      "Se alcanzó el límite de solicitudes a WhatsApp por ahora. " + ESPERA,
  },
  131047: {
    icon: "warning",
    title: "Pasaron más de 24 horas",
    text:
      "El cliente no ha escrito en las últimas 24 horas, así que WhatsApp solo permite enviarle una plantilla. Envía una plantilla y, cuando responda, podrás mandarle mensajes normales.",
  },
  131026: {
    icon: "warning",
    title: "No se pudo entregar",
    text:
      "Este número no tiene WhatsApp, o el cliente aún no aceptó los términos nuevos de WhatsApp. Verifica el número con el cliente.",
  },
  131042: {
    icon: "error",
    title: "Problema con el método de pago",
    text:
      "Meta rechazó el envío por un problema con el método de pago de tu WhatsApp Business. Se corrige en la facturación del Business Manager de Meta.",
  },
  131048: {
    icon: "warning",
    title: "Envíos limitados por spam",
    text:
      "WhatsApp limitó los envíos de este número porque varios clientes bloquearon o reportaron los mensajes. Baja la cantidad de envíos y vuelve a intentarlo más tarde.",
  },
  131049: {
    icon: "info",
    title: "WhatsApp no entregó el mensaje",
    text:
      "WhatsApp decidió no entregar este mensaje para cuidar la experiencia del cliente (suele pasar con muchas plantillas de marketing seguidas). Inténtalo más tarde.",
  },
  131031: {
    icon: "error",
    title: "Cuenta restringida por Meta",
    text:
      "Meta bloqueó o restringió la cuenta de WhatsApp. Revisa el estado de la cuenta en el Business Manager de Meta.",
  },
  131051: {
    icon: "warning",
    title: "Tipo de mensaje no soportado",
    text: "WhatsApp no acepta este tipo de mensaje. Prueba con otro formato.",
  },
  131052: {
    icon: "warning",
    title: "No se pudo descargar el archivo",
    text:
      "WhatsApp no pudo descargar el archivo que enviaste. Vuelve a adjuntarlo; si sigue fallando, prueba con otro archivo.",
  },
  131053: {
    icon: "warning",
    title: "No se pudo subir el archivo",
    text:
      "WhatsApp no aceptó el archivo: puede ser muy pesado o tener un formato no soportado. Prueba con un archivo más liviano o en otro formato.",
  },
  131000: {
    icon: "warning",
    title: "WhatsApp tuvo un problema",
    text:
      "WhatsApp tuvo un problema momentáneo y no envió el mensaje. " + ESPERA,
  },
  190: {
    icon: "error",
    title: "La conexión con WhatsApp venció",
    text:
      "El acceso de esta conexión a WhatsApp expiró. Vuelve a conectar el número en Conexiones.",
  },
};

// Códigos que comparten aviso.
AVISOS[133016] = AVISOS[131056]; // límite de registro/desregistro (mismo consejo)
AVISOS[1] = AVISOS[131000];
AVISOS[2] = AVISOS[131000];

/**
 * Muestra el aviso amigable para el `error` que devuelve la Cloud API de
 * WhatsApp (el objeto `result.error`). Devuelve la promesa de Swal.
 */
export function avisoErrorEnvioWhatsApp(error) {
  const codigo = error?.code;
  const aviso = AVISOS[codigo] || {
    icon: "error",
    title: "No se pudo enviar",
    text:
      "WhatsApp rechazó el envío. Inténtalo de nuevo en unos minutos; si sigue pasando, avisa a soporte con el código de abajo.",
  };

  const detalle = codigo
    ? `Código de WhatsApp: ${codigo}`
    : error?.message || "";

  return Swal.fire({
    icon: aviso.icon,
    title: aviso.title,
    text: aviso.text,
    footer: detalle
      ? `<span style="font-size:12px;color:#94a3b8">${escaparHtml(detalle)}</span>`
      : undefined,
    confirmButtonText: "Entendido",
  });
}

function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
