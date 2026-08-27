import Swal from "sweetalert2";
import chatApi from "../api/chatcenter";

const URL_BILLING = "https://platform.openai.com/account/billing";

/* Título del aviso según por qué falló la comprobación. El backend manda el
   `motivo`; acá solo se le pone cara. */
const TITULOS_FALLO = {
  sin_saldo: "Todavía sin saldo",
  key_invalida: "Tu API Key ya no es válida",
  rate_limit: "OpenAI está saturado",
  sin_key: "Falta cargar la API Key",
  indeterminado: "No pudimos comprobarlo",
};

/* "Ya pagué": le pide al backend que compruebe el saldo AHORA.
   Devuelve true solo si la cuenta quedó reactivada. */
async function reintentarOpenAI(id_configuracion) {
  Swal.fire({
    title: "Comprobando con OpenAI...",
    html: `
      <div style="font-size:14px; line-height:1.6;">
        Estamos haciendo una llamada de prueba a tu cuenta.
      </div>
    `,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const { data } = await chatApi.post(
      "/openai_assistants/openai_reintentar",
      { id_configuracion },
    );

    if (data?.ok) {
      await Swal.fire({
        icon: "success",
        title: "¡Listo!",
        text: data.mensaje || "Tu asistente vuelve a responder.",
        confirmButtonColor: "#6366f1",
      });
      return true;
    }

    await Swal.fire({
      // Sin saldo es el caso esperado (el pago tarda en acreditarse), no un
      // error del sistema: se muestra como advertencia para no alarmar.
      icon: data?.motivo === "sin_saldo" ? "warning" : "error",
      title: TITULOS_FALLO[data?.motivo] || "No pudimos reactivarlo",
      text: data?.mensaje || "Vuelve a intentarlo en un momento.",
      confirmButtonColor: "#6366f1",
    });
    return false;
  } catch (err) {
    console.error("Error al reintentar OpenAI:", err);
    await Swal.fire({
      icon: "error",
      title: "No pudimos comprobarlo",
      text: "No se pudo contactar al servidor. Revisa tu conexión e inténtalo de nuevo.",
      confirmButtonColor: "#6366f1",
    });
    return false;
  }
}

/* Aviso de OpenAI sin saldo.
   ─────────────────────────────────────────────────────────────
   El backend marca `openai_activo = 0` cuando una llamada falla por saldo, y
   por su cuenta lo vuelve a poner en 1 recién en la PRIMERA LLAMADA EXITOSA —
   es decir, cuando el bot recibe y contesta el siguiente mensaje. No hay un
   cron que verifique el saldo.

   Ese hueco generaba tickets en cadena ("ya recargué y me sigue apareciendo"),
   porque el cliente no tenía forma de comprobarlo. Para eso está "Ya pagué":
   pide una comprobación real contra OpenAI en el momento. */
export async function checkOpenAIStatus() {
  const tipo = localStorage.getItem("tipo_configuracion");
  const id_configuracion = localStorage.getItem("id_configuracion");

  if (tipo !== "kanban" || !id_configuracion) return;

  try {
    const { data } = await chatApi.get("/openai_assistants/openai_status", {
      params: { id_configuracion },
    });

    if (data.openai_activo === 1) return;

    /* Se vuelve a mostrar mientras el cliente siga intentando: tras abrir la
       página de pago querrá pulsar "Ya pagué" al volver, y tras un intento
       fallido querrá reintentar. Cada vuelta exige un clic suyo, y "Más tarde"
       cierra siempre. */
    let seguirMostrando = true;
    while (seguirMostrando) {
      seguirMostrando = false;

      const result = await Swal.fire({
        icon: "warning",
        title: "OpenAI sin saldo",
        html: `
          <div style="font-size:14px; line-height:1.6; text-align:left;">
            Tu asistente no está respondiendo porque tu cuenta de OpenAI se
            quedó sin saldo. Recárgala para que vuelva a funcionar.
            <br/><br/>
            Si ya la recargaste, pulsa <strong>Ya pagué</strong> y lo
            comprobamos al instante contra tu cuenta.
          </div>
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonText: "Ir a recargar en OpenAI",
        showDenyButton: true,
        denyButtonText: "Ya pagué",
        showCancelButton: true,
        cancelButtonText: "Más tarde",
        confirmButtonColor: "#6366f1",
        denyButtonColor: "#16a34a",
      });

      if (result.isConfirmed) {
        window.open(URL_BILLING, "_blank");
        // Vuelve a salir el aviso para que "Ya pagué" esté a mano al regresar.
        seguirMostrando = true;
      } else if (result.isDenied) {
        const reactivado = await reintentarOpenAI(id_configuracion);
        if (!reactivado) seguirMostrando = true;
      }
    }
  } catch (err) {
    console.error("Error al verificar OpenAI status:", err);
  }
}
