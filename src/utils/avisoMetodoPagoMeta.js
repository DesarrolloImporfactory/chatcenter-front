import Swal from "sweetalert2";
import chatApi from "../api/chatcenter";

/* Aviso "Acción requerida en Meta" — problema con el método de pago.
   ─────────────────────────────────────────────────────────────
   Vivía copiado y pegado en Chat.jsx y Contactos.jsx; ahora hay UNA sola
   fuente, que es la única forma de que un cambio llegue a las dos pantallas
   (ya nos pasó con el dedupe de fotos: dos copias, un incidente).

   El tutorial va dentro del aviso porque el cliente que lee "revisa la
   facturación en Meta Business Suite" no sabe dónde tocar, y los tutoriales
   del menú no los abre nadie. Tono sobrio: sin emojis ni recuadros de alarma,
   es un aviso administrativo, no una emergencia.

   Mismo flujo que el aviso de OpenAI sin saldo (checkOpenAIStatus): el
   backend marca metodo_pago = 0 cuando Meta rebota una plantilla por pago
   (131042) y lo vuelve a 1 solo cuando Meta confirma vía health_status. Eso
   pasa solo en el webhook y al cargar el chat; "ya lo corregí" pide la
   comprobación al instante, sin esperar al siguiente mensaje. */

const TUTORIAL_METODO_PAGO = "https://www.youtube.com/watch?v=_CzUpgnuXAU";

const TITULOS_FALLO = {
  bloqueado: "Meta todavía no lo refleja",
  sin_conexion: "Esta conexión no tiene WhatsApp",
  indeterminado: "No pudimos comprobarlo",
};

/* Misma línea visual que el flujo de OpenAI (oa-css). Se comparte el id para
   no inyectar dos veces el mismo bloque si las dos utilidades conviven. */
function inyectarEstilos() {
  if (document.getElementById("oa-css")) return;
  const style = document.createElement("style");
  style.id = "oa-css";
  style.textContent = `
    .oa-pop { border-radius: 18px !important; }
    .oa-pop .swal2-title { font-size: 21px; color: #0f172a; letter-spacing: -0.01em; }
    .oa-pop .swal2-loader { border-color: #4f46e5 transparent #4f46e5 transparent !important; }
    .oa-pop .swal2-styled.swal2-confirm { border-radius: 10px; font-weight: 700; padding: 10px 22px; }
    .oa-pop .swal2-styled.swal2-cancel { border-radius: 10px; font-weight: 600; }
  `;
  document.head.appendChild(style);
}
const CLASE_POP = { popup: "oa-pop" };

function urlMetaBusiness(businessId) {
  return businessId
    ? `https://business.facebook.com/latest/settings/whatsapp_account/?business_id=${businessId}`
    : "https://business.facebook.com/latest/settings/whatsapp_account/";
}

/* "Ya lo corregí": le pide al backend que compruebe contra Meta AHORA.
   Devuelve true solo si la cuenta quedó reactivada. Lo usa el aviso y también
   el botón "Comprobar" de la tarjeta en Conexiones. */
export async function comprobarPagoMeta(id_configuracion) {
  inyectarEstilos();
  Swal.fire({
    title: "Comprobando con Meta…",
    html: `
      <div style="font-size:14px; line-height:1.6; color:#64748b;">
        Estamos consultando el estado de tu cuenta de WhatsApp Business.
        Toma unos segundos.
      </div>
    `,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    customClass: CLASE_POP,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const { data } = await chatApi.post(
      "/whatsapp_managment/metodoPagoReintentar",
      { id_configuracion },
    );

    if (data?.ok) {
      await Swal.fire({
        icon: "success",
        title: "¡Tu WhatsApp vuelve a enviar!",
        html: `
          <div style="font-size:14px; line-height:1.6; color:#64748b;">
            ${data.mensaje || "Meta confirma que tu cuenta ya envía mensajes con normalidad."}
          </div>
        `,
        confirmButtonText: "Entendido",
        confirmButtonColor: "#4f46e5",
        customClass: CLASE_POP,
      });
      return true;
    }

    await Swal.fire({
      // Que Meta aún no lo refleje es el caso esperado (tarda en propagarse),
      // no un error del sistema: se muestra como advertencia.
      icon: data?.motivo === "bloqueado" ? "warning" : "error",
      title: TITULOS_FALLO[data?.motivo] || "No pudimos reactivarlo",
      html: `
        <div style="font-size:14px; line-height:1.6; color:#64748b;">
          ${
            data?.mensaje ||
            "Meta todavía reporta la cuenta bloqueada. Suele reflejarse en unos minutos: vuelve a intentarlo enseguida."
          }
        </div>
      `,
      confirmButtonText: "Entendido",
      confirmButtonColor: "#4f46e5",
      customClass: CLASE_POP,
    });
    return false;
  } catch (err) {
    console.error("Error al comprobar el pago en Meta:", err);
    await Swal.fire({
      icon: "error",
      title: "No pudimos comprobarlo",
      html: `
        <div style="font-size:14px; line-height:1.6; color:#64748b;">
          No se pudo contactar al servidor. Revisa tu conexión e inténtalo de nuevo.
        </div>
      `,
      confirmButtonText: "Entendido",
      confirmButtonColor: "#4f46e5",
      customClass: CLASE_POP,
    });
    return false;
  }
}

export async function avisoMetodoPagoMeta(dataAdmin) {
  if (!dataAdmin || dataAdmin.metodo_pago != 0) return;

  const metaUrl = urlMetaBusiness(dataAdmin.meta_business_id);
  inyectarEstilos();

  /* Se vuelve a mostrar mientras el cliente siga intentando: tras abrir Meta
     querrá comprobar al volver, y tras un intento fallido querrá reintentar.
     "Más tarde" cierra siempre. */
  let seguirMostrando = true;
  while (seguirMostrando) {
    seguirMostrando = false;

    // La marca el enlace "ya lo corregí" del texto antes de cerrar el aviso.
    let comprobar = false;

    const result = await Swal.fire({
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
          Si ya lo hiciste,
          <a href="#" id="mp-ya-corregi"
             style="color:#4f46e5; font-weight:600;">pulsa aquí y lo
          comprobamos al instante</a>.
        </div>
      `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText: "Abrir Meta Business Suite",
      showCancelButton: true,
      cancelButtonText: "Más tarde",
      confirmButtonColor: "#4f46e5",
      customClass: CLASE_POP,
      didOpen: () => {
        const link = document.getElementById("mp-ya-corregi");
        if (link) {
          link.addEventListener("click", (e) => {
            e.preventDefault();
            comprobar = true;
            Swal.close();
          });
        }
      },
    });

    if (comprobar) {
      const reactivado = await comprobarPagoMeta(dataAdmin.id);
      if (reactivado) {
        // Para que el aviso no vuelva a salir con este mismo objeto.
        dataAdmin.metodo_pago = 1;
      } else {
        seguirMostrando = true;
      }
    } else if (result.isConfirmed) {
      window.open(metaUrl, "_blank");
      // Vuelve a salir el aviso para que "pulsa aquí" esté a mano al volver.
      seguirMostrando = true;
    }
  }
}
