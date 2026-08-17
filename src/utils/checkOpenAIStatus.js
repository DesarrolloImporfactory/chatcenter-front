import Swal from "sweetalert2";
import chatApi from "../api/chatcenter";

/* Aviso de OpenAI sin saldo.
   ─────────────────────────────────────────────────────────────
   El backend marca `openai_activo = 0` cuando una llamada falla por saldo, y
   lo vuelve a poner en 1 recién en la PRIMERA LLAMADA EXITOSA — o sea, cuando
   el bot recibe y contesta el siguiente mensaje. No hay un cron que verifique
   el saldo por su cuenta.

   Eso significa que recargar NO apaga este aviso al instante, y ese hueco
   generaba tickets en cadena: "ya recargué pero me sigue apareciendo". No es
   un error, es cómo funciona la detección — así que el aviso lo dice. */
export async function checkOpenAIStatus() {
  const tipo = localStorage.getItem("tipo_configuracion");
  const id_configuracion = localStorage.getItem("id_configuracion");

  if (tipo !== "kanban" || !id_configuracion) return;

  try {
    const { data } = await chatApi.get("/openai_assistants/openai_status", {
      params: { id_configuracion },
    });

    if (data.openai_activo === 1) return;

    await Swal.fire({
      icon: "warning",
      title: "OpenAI sin saldo",
      html: `
        <div style="font-size:14px; line-height:1.55; text-align:left;">
          Tu asistente IA no está respondiendo a tus clientes porque tu cuenta
          de OpenAI se quedó sin saldo disponible.
          <br/><br/>
          <b>1.</b> Recarga tu cuenta con el botón de abajo.
          <br/>
          <b>2.</b> Listo: no hay que configurar nada más.
          <div style="margin-top:12px; padding:10px 12px; background:#eef2ff; border-radius:10px; font-size:13px; color:#3730a3;">
            <b>¿Ya recargaste y sigues viendo este aviso?</b> Es normal: el
            sistema lo detecta en automático con el <b>siguiente mensaje</b>
            que reciba tu asistente y este aviso desaparecerá solo. No hace
            falta hacer nada más.
          </div>
        </div>
      `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText: "Ir a recargar en OpenAI",
      showCancelButton: true,
      cancelButtonText: "Más tarde",
      confirmButtonColor: "#6366f1",
    }).then((result) => {
      if (result.isConfirmed) {
        window.open("https://platform.openai.com/account/billing", "_blank");
      }
    });
  } catch (err) {
    console.error("Error al verificar OpenAI status:", err);
  }
}
