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
  org_no_verificada: "Todavía no está verificada",
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
   Devuelve true solo si la cuenta quedó reactivada. También la usa la
   tarjeta de /conexiones. */
export async function reintentarOpenAI(id_configuracion) {
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
const URL_VERIFICAR_ORG =
  "https://platform.openai.com/settings/organization/general";
const SNOOZE_ORG_MS = 24 * 60 * 60 * 1000;

/* "Ya verifiqué": el backend hace una llamada real con gpt-5-mini a la cuenta
   del cliente. true solo si GPT-5 ya responde (y el aviso quedó retirado). */
async function comprobarGpt5(id_configuracion) {
  inyectarEstilos();
  Swal.fire({
    title: "Comprobando con OpenAI…",
    html: `
      <div style="font-size:14px; line-height:1.6; color:#64748b;">
        Estamos probando GPT-5 en tu cuenta. Toma unos segundos.
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
      "/openai_assistants/openai_comprobar_gpt5",
      { id_configuracion },
    );
    await Swal.fire({
      icon: data?.ok ? "success" : "warning",
      title: data?.ok
        ? "¡Listo, GPT-5 ya responde!"
        : TITULOS_FALLO[data?.motivo] || "Todavía no está verificada",
      html: `
        <div style="font-size:14px; line-height:1.6; color:#64748b;">
          ${data?.mensaje || ""}
        </div>
      `,
      confirmButtonText: "Entendido",
      confirmButtonColor: "#4f46e5",
      customClass: CLASE_POP,
    });
    return !!data?.ok;
  } catch (err) {
    console.error("Error al comprobar GPT-5:", err);
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

/* Aviso NO bloqueante: la organización de OpenAI del cliente no está
   verificada para GPT-5 y el bot está respondiendo con el modelo de respaldo.
   Sin esto el dueño lanzaba campaña creyendo que todo iba con GPT-5 y nadie le
   decía nada (cfg 1478, 2026-10-22). "Más tarde" lo silencia 24 h en este
   navegador; vuelve a salir mientras el backend siga con el aviso puesto. */
async function avisoOrgNoVerificada(id_configuracion, aviso) {
  const claveSnooze = `oa_org_snooze_${id_configuracion}`;
  try {
    const snooze = Number(localStorage.getItem(claveSnooze) || 0);
    if (snooze && snooze > Date.now()) return;
  } catch (_) {
    /* sin storage */
  }
  inyectarEstilos();

  let seguir = true;
  while (seguir) {
    seguir = false;
    let comprobar = false;
    const result = await Swal.fire({
      icon: "info",
      title: "Tu asistente está usando un modelo de respaldo",
      html: `
        <div style="font-size:14px; line-height:1.6; text-align:left;">
          ${aviso?.msg || "Tu organización de OpenAI no está verificada para GPT-5."}
          <br/><br/>
          Tus clientes <b>sí</b> están recibiendo respuesta, pero no con el modelo
          que elegiste. Para volver a GPT-5, entra a OpenAI con el correo dueño
          de tu API Key y pulsa <b>Verify Organization</b>. Tarda hasta 15 minutos
          en activarse. No es un problema de saldo ni de tu plan.
          <br/><br/>
          Si ya lo hiciste,
          <a href="#" id="oa-ya-verifique"
             style="color:#4f46e5; font-weight:600;">pulsa aquí y lo comprobamos</a>.
        </div>
      `,
      confirmButtonText: "Verificar en OpenAI",
      showCancelButton: true,
      cancelButtonText: "Más tarde",
      confirmButtonColor: "#4f46e5",
      customClass: CLASE_POP,
      didOpen: () => {
        const link = document.getElementById("oa-ya-verifique");
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
      const ok = await comprobarGpt5(id_configuracion);
      if (!ok) seguir = true;
    } else if (result.isConfirmed) {
      window.open(URL_VERIFICAR_ORG, "_blank");
      seguir = true;
    } else {
      try {
        localStorage.setItem(claveSnooze, String(Date.now() + SNOOZE_ORG_MS));
      } catch (_) {
        /* sin storage */
      }
    }
  }
}

export async function checkOpenAIStatus() {
  const tipo = localStorage.getItem("tipo_configuracion");
  const id_configuracion = localStorage.getItem("id_configuracion");

  if (tipo !== "kanban" || !id_configuracion) return;

  try {
    const { data } = await chatApi.get("/openai_assistants/openai_status", {
      params: { id_configuracion },
    });

    if (data.openai_activo === 1) {
      // El bot responde, pero hay algo que el dueño debe hacer (organización
      // de OpenAI sin verificar para GPT-5: está contestando con el respaldo).
      if (data.openai_aviso?.codigo === "ORG_NO_VERIFICADA") {
        await avisoOrgNoVerificada(id_configuracion, data.openai_aviso);
      }
      return;
    }

    inyectarEstilos();

    /* Por qué está apagada, clasificado por el back (openai_error_codigo):
       SIN_SALDO se arregla recargando; KEY_INVALIDA, cargando otra llave en
       Asistentes (recargar no sirve de nada); ERROR es otra cosa y se ofrece
       comprobar. Hasta hoy el aviso decía "sin saldo" para cualquier 0. */
    const codigo = data.openai_error_codigo || "SIN_SALDO";
    const esClaude = String(data.proveedor_ia || "").toLowerCase() === "claude";
    const proveedor = esClaude ? "Claude" : "OpenAI";

    if (codigo === "KEY_INVALIDA") {
      const r = await Swal.fire({
        icon: "error",
        title: `Tu API Key de ${proveedor} ya no es válida`,
        html: `
          <div style="font-size:14px; line-height:1.6; text-align:left;">
            ${proveedor} rechaza la llave guardada en esta cuenta (inválida o
            revocada) y el asistente dejó de responder a tus clientes. No es un
            problema de saldo ni de tu plan de la plataforma.
            <br/><br/>
            Se soluciona generando una llave nueva en ${proveedor} y
            cargándola en <b>Asistentes AI</b>. Al guardarla, el bot retoma
            solo los chats que quedaron sin respuesta.
          </div>
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonText: "Cargar API Key",
        showCancelButton: true,
        cancelButtonText: "Más tarde",
        confirmButtonColor: "#4f46e5",
        customClass: CLASE_POP,
      });
      if (r.isConfirmed && window.location.pathname !== "/asistentes") {
        window.location.assign("/asistentes");
      }
      return;
    }

    const urlRecarga = esClaude
      ? "https://console.anthropic.com/settings/billing"
      : URL_BILLING;
    const textoMotivo =
      codigo === "SIN_SALDO"
        ? `Tu cuenta de ${proveedor} se quedó sin saldo y el asistente dejó de
            responder a tus clientes. Esto no tiene relación con tu plan de la
            plataforma, que sigue activo.
            <br/><br/>
            Se soluciona recargando saldo en tu cuenta de ${proveedor}.`
        : `${proveedor} rechazó la última llamada del asistente y está en
            pausa${
              data.openai_error_msg
                ? `: <i>${String(data.openai_error_msg).slice(0, 220)}</i>`
                : "."
            }
            <br/><br/>
            Si ya lo revisaste en tu cuenta de ${proveedor}, compruébalo aquí.`;

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
            ${textoMotivo}
            ${
              esClaude
                ? "<br/><br/>Con la próxima conversación el bot vuelve a responder solo."
                : ` Si ya lo hiciste,
            <a href="#" id="oa-ya-recargue"
               style="color:#4f46e5; font-weight:600;">pulsa aquí y lo
            comprobamos al instante</a>.`
            }
          </div>
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonText:
          codigo === "SIN_SALDO" ? `Recargar en ${proveedor}` : `Abrir ${proveedor}`,
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
        window.open(urlRecarga, "_blank");
        // Vuelve a salir el aviso para que "pulsa aquí" esté a mano al volver.
        seguirMostrando = !esClaude;
      }
    }
  } catch (err) {
    console.error("Error al verificar OpenAI status:", err);
  }
}
