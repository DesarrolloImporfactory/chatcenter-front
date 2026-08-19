import Swal from "sweetalert2";
import chatApi from "../api/chatcenter";

/* Aviso de OpenAI sin saldo.
   ─────────────────────────────────────────────────────────────
   El backend marca `openai_activo = 0` cuando una llamada falla por saldo, y
   lo vuelve a poner en 1 recién en la PRIMERA LLAMADA EXITOSA — es decir,
   cuando el bot recibe y contesta el siguiente mensaje. No hay un cron que
   verifique el saldo por su cuenta.

   Por eso el aviso aclara que recargar no lo apaga al instante: ese hueco
   generaba tickets en cadena ("ya recargué y me sigue apareciendo"). */
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
        <div style="font-size:14px; line-height:1.6; text-align:left;">
          Tu asistente no está respondiendo porque tu cuenta de OpenAI se quedó
          sin saldo. Recárgala para que vuelva a funcionar.
          <br/><br/>
          Si ya recargaste y sigues viendo este aviso, no hace falta nada más:
          el sistema lo detecta con el siguiente mensaje que reciba tu
          asistente y el aviso desaparece solo.
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
