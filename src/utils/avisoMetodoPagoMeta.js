import Swal from "sweetalert2";

/* Aviso "Acción requerida en Meta" — problema con el método de pago.
   ─────────────────────────────────────────────────────────────
   Vivía copiado y pegado en Chat.jsx y Contactos.jsx; ahora hay UNA sola
   fuente, que es la única forma de que un cambio llegue a las dos pantallas
   (ya nos pasó con el dedupe de fotos: dos copias, un incidente).

   El tutorial va dentro del aviso porque el cliente que lee "revisa la
   facturación en Meta Business Suite" no sabe dónde tocar, y los tutoriales
   del menú no los abre nadie. Tono sobrio: sin emojis ni recuadros de alarma,
   es un aviso administrativo, no una emergencia. */

const TUTORIAL_METODO_PAGO = "https://www.youtube.com/watch?v=_CzUpgnuXAU";

export function avisoMetodoPagoMeta(dataAdmin) {
  if (!dataAdmin || dataAdmin.metodo_pago != 0) return;

  const businessId = dataAdmin.meta_business_id;
  const metaUrl = businessId
    ? `https://business.facebook.com/latest/settings/whatsapp_account/?business_id=${businessId}`
    : "https://business.facebook.com/latest/settings/whatsapp_account/";

  Swal.fire({
    icon: "warning",
    title: "Acción requerida en Meta",
    html: `
      <div style="font-size:14px; line-height:1.6; text-align:left;">
        Detectamos un inconveniente con el método de pago de tu cuenta de
        WhatsApp Business. Mientras no se corrija, tus mensajes pueden dejar
        de enviarse.
        <br/><br/>
        Se soluciona en la configuración de facturación de Meta Business Suite.
        <a href="${TUTORIAL_METODO_PAGO}" target="_blank" rel="noopener noreferrer"
           style="color:#4f46e5; font-weight:600;">Mira cómo solucionarlo aquí</a>.
      </div>
    `,
    allowOutsideClick: false,
    allowEscapeKey: false,
    confirmButtonText: "Abrir Meta Business Suite",
    showCancelButton: true,
    cancelButtonText: "Más tarde",
  }).then((result) => {
    if (result.isConfirmed) {
      window.open(metaUrl, "_blank");
    }
  });
}
