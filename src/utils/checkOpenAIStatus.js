import Swal from "sweetalert2";
import chatApi from "../api/chatcenter";

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
        <div style="font-size:14px; line-height:1.5;">
          El asistente IA no esta respondiendo a tus clientes porque
          tu cuenta de OpenAI no tiene saldo disponible.
          <br/><br/>
          Recarga tu cuenta para que el asistente vuelva a funcionar.
        </div>
      `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText: "Ir a OpenAI Billing",
      showCancelButton: true,
      cancelButtonText: "Mas tarde",
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