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

/* Misma línea en TODOS los avisos de este flujo: esquinas 18px, spinner
   índigo y botón de marca. Sin esto, el "Comprobando..." y el resultado
   salían con el look cuadrado default de SweetAlert. */
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

/* "Ya recargué": le pide al backend que compruebe el saldo AHORA.
   Devuelve true solo si la cuenta quedó reactivada. */
async function reintentarOpenAI(id_configuracion) {
  inyectarEstilos();
  Swal.fire({
    title: "Comprobando con OpenAI…",
    html: `
      <div style="font-size:14px; line-height:1.6; color:#64748b;">
        Estamos haciendo una llamada de prueba a tu cuenta. Toma unos segundos.
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
      "/openai_assistants/openai_reintentar",
      { id_configuracion },
    );

    if (data?.ok) {
      await Swal.fire({
        icon: "success",
        title: "¡Tu asistente está de vuelta!",
        html: `
          <div style="font-size:14px; line-height:1.6; color:#64748b;">
            ${data.mensaje || "Comprobamos tu cuenta de OpenAI y ya responde con normalidad."}
          </div>
        `,
        confirmButtonText: "Entendido",
        confirmButtonColor: "#4f46e5",
        customClass: CLASE_POP,
      });
      return true;
    }

    await Swal.fire({
      // Sin saldo es el caso esperado (el pago tarda en acreditarse), no un
      // error del sistema: se muestra como advertencia para no alarmar.
      icon: data?.motivo === "sin_saldo" ? "warning" : "error",
      title: TITULOS_FALLO[data?.motivo] || "No pudimos reactivarlo",
      html: `
        <div style="font-size:14px; line-height:1.6; color:#64748b;">
          ${
            data?.mensaje ||
            "OpenAI todavía no refleja el pago. Suele acreditarse en unos minutos: vuelve a intentarlo enseguida."
          }
        </div>
      `,
      confirmButtonText: "Entendido",
      confirmButtonColor: "#4f46e5",
      customClass: CLASE_POP,
    });
    return false;
  } catch (err) {
    console.error("Error al reintentar OpenAI:", err);
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

/* Aviso de OpenAI sin saldo.
   ─────────────────────────────────────────────────────────────
   Misma línea sobria que el aviso "Acción requerida en Meta"
   (avisoMetodoPagoMeta): título, explicación en texto plano y dos botones.
   "Ya recargué" va como enlace dentro del texto — es la acción de quien
   vuelve después de pagar, no necesita un botonzote.

   El backend marca `openai_activo = 0` cuando una llamada falla por saldo, y
   lo vuelve a poner en 1 recién en la primera llamada exitosa. "Ya recargué"
   pide una comprobación real contra OpenAI en el momento, sin esperar al
   siguiente mensaje de un cliente. */
export async function checkOpenAIStatus() {
  const tipo = localStorage.getItem("tipo_configuracion");
  const id_configuracion = localStorage.getItem("id_configuracion");

  if (tipo !== "kanban" || !id_configuracion) return;

  try {
    const { data } = await chatApi.get("/openai_assistants/openai_status", {
      params: { id_configuracion },
    });

    if (data.openai_activo === 1) return;

    inyectarEstilos();

    /* Se vuelve a mostrar mientras el cliente siga intentando: tras abrir la
       página de pago querrá comprobar al volver, y tras un intento fallido
       querrá reintentar. "Más tarde" cierra siempre. */
    let seguirMostrando = true;
    while (seguirMostrando) {
      seguirMostrando = false;

      // La marca el enlace "Ya recargué" del texto antes de cerrar el aviso.
      let comprobar = false;

      const result = await Swal.fire({
        icon: "warning",
        title: "Tu asistente está en pausa",
        html: `
          <div style="font-size:14px; line-height:1.6; text-align:left;">
            Tu cuenta de OpenAI se quedó sin saldo y el asistente dejó de
            responder a tus clientes. Esto no tiene relación con tu plan de la
            plataforma, que sigue activo.
            <br/><br/>
            Se soluciona recargando saldo en tu cuenta de OpenAI. Si ya lo
            hiciste,
            <a href="#" id="oa-ya-recargue"
               style="color:#4f46e5; font-weight:600;">pulsa aquí y lo
            comprobamos al instante</a>.
          </div>
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonText: "Recargar en OpenAI",
        showCancelButton: true,
        cancelButtonText: "Más tarde",
        confirmButtonColor: "#4f46e5",
        customClass: CLASE_POP,
        didOpen: () => {
          const link = document.getElementById("oa-ya-recargue");
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
        const reactivado = await reintentarOpenAI(id_configuracion);
        if (!reactivado) seguirMostrando = true;
      } else if (result.isConfirmed) {
        window.open(URL_BILLING, "_blank");
        // Vuelve a salir el aviso para que "pulsa aquí" esté a mano al volver.
        seguirMostrando = true;
      }
    }
  } catch (err) {
    console.error("Error al verificar OpenAI status:", err);
  }
}
