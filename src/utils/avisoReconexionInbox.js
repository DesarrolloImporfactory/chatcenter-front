import Swal from "sweetalert2";
import chatApi from "../api/chatcenter";

/* Aviso al entrar: Messenger o Instagram reciben mensajes pero no pueden
   responder (Facebook retiró el acceso a la página).
   ─────────────────────────────────────────────────────────────
   Caso JNstore (cfg 285, 10-11-2026): 234 mensajes de Messenger sin una
   sola respuesta desde julio y el dueño no lo sabía, porque el único aviso
   vivía dentro de la pestaña Messenger de /canal-conexiones. Mismo criterio
   que el número de WhatsApp caído (checkWhatsappStatus): es un corte de
   operación, así que sale como ventana y no como notificación que se va
   sola. La reconexión se hace en la tarjeta de /conexiones.

   Sale una vez al día por conexión mientras siga caído ("Más tarde" lo
   calla hasta mañana). */
const CLAVE = (id) => `inbox_reconexion_aviso_${id}`;

const hoy = () => new Date().toISOString().split("T")[0];

/* checkOpenAIStatus y checkWhatsappStatus también abren ventanas al entrar
   y SweetAlert solo muestra una a la vez: abrir otra encima cierra la
   anterior. Se espera a que no haya ninguna (máx. 2 min). */
async function esperarTurno() {
  for (let i = 0; i < 120; i++) {
    if (!Swal.isVisible()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

export async function checkInboxStatus() {
  const id_configuracion = localStorage.getItem("id_configuracion");
  if (!id_configuracion) return;

  try {
    const { data } = await chatApi.get("/messenger/inbox/salud", {
      params: { id_configuracion },
      // Chequeo secundario: si el back aún no tiene la ruta o falla, no se
      // muestra nada (ni toast de error ni aviso falso).
      silentError: true,
    });
    if (!data?.requiere_reconexion) return;

    try {
      if (localStorage.getItem(CLAVE(id_configuracion)) === hoy()) return;
    } catch (_) {
      /* sin storage */
    }

    const canales = [
      data.messenger ? "Messenger" : null,
      data.instagram ? "Instagram" : null,
    ].filter(Boolean);
    const nombres = canales.join(" e ");
    const motivo = data.messenger?.motivo || data.instagram?.motivo || "";
    const n = Number(data.personas_esperando || 0);
    const enConexiones = window.location.pathname === "/conexiones";

    // Un instante para que las otras ventanas del arranque abran primero.
    await new Promise((r) => setTimeout(r, 1500));
    if (!(await esperarTurno())) return;

    try {
      localStorage.setItem(CLAVE(id_configuracion), hoy());
    } catch (_) {
      /* sin storage */
    }

    const result = await Swal.fire({
      icon: "warning",
      title: `Vuelve a conectar ${nombres}`,
      html: `
        <div style="font-size:14px; line-height:1.6;">
          ${
            canales.length > 1 ? "Reciben" : "Recibe"
          } mensajes pero no ${
            canales.length > 1 ? "pueden" : "puede"
          } responder${motivo ? `: ${motivo}` : ""}.
          ${
            n > 0
              ? `<br/><br/><b>${n} ${
                  n === 1
                    ? "persona te escribió"
                    : "personas te escribieron"
                }</b> en los últimos 30 días.`
              : ""
          }
          <br/><br/>
          En <b>Conexiones</b>, pulsa <b>Reconectar</b> en tu negocio.
        </div>
      `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText: enConexiones ? "Entendido" : "Ir a Conexiones",
      showCancelButton: !enConexiones,
      cancelButtonText: "Más tarde",
      confirmButtonColor: "#4f46e5",
    });

    if (result.isConfirmed && !enConexiones) {
      window.location.assign("/conexiones");
    }
  } catch (err) {
    console.error("Error al verificar la salud del inbox:", err);
  }
}
