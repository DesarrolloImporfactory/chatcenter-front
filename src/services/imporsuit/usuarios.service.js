import imporsuitApi from "../../api/imporsuit";

/**
 * Servicio de USUARIOS/cliente de Imporsuit consumido desde chatcenter.
 * Endpoints "libres" del controlador `Carterachat` (token compartido):
 *   - GET  /Carterachat/cursos
 *   - GET  /Carterachat/asesores
 *   - GET  /Carterachat/plantillas_correo
 *   - POST /Carterachat/crear_cliente
 *
 * Nota: los equivalentes de `Asesor/*` NO sirven acá — exigen JWT de usuario
 * con rol 1/6/20 y chatcenter se autentica con el token de integración.
 */

function unwrap(data) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const status = data.status;
    if (status != null && Number(status) >= 400) {
      const err = new Error(data.message || data.title || `Error ${status}`);
      err.status = Number(status);
      err.payload = data;
      throw err;
    }
  }
  return data;
}

/** Lista de cursos activos: [{ id_curso, nombre }]. */
export async function getCursosDisponibles({ signal } = {}) {
  const { data } = await imporsuitApi.get("/Carterachat/cursos", { signal });
  unwrap(data);
  return Array.isArray(data?.data) ? data.data : [];
}

/**
 * Lista de asesores/vendedores (id_rol = 6 en Imporsuit) para el selector de
 * "Agregar deuda": [{ id_users, nombre_users }].
 */
export async function getAsesores({ signal } = {}) {
  const { data } = await imporsuitApi.get("/Carterachat/asesores", { signal });
  unwrap(data);
  return Array.isArray(data?.data) ? data.data : [];
}

/**
 * Plantillas de correo ACTIVAS para el selector de bienvenida:
 * [{ id_plantilla, nombre, asunto, paquete }].
 *
 * Devuelve [] si la tabla `email_plantillas` todavía no existe — el formulario
 * simplemente no ofrece correo en ese caso.
 */
export async function getPlantillasCorreo({ signal } = {}) {
  const { data } = await imporsuitApi.get("/Carterachat/plantillas_correo", {
    signal,
  });
  unwrap(data);
  return Array.isArray(data?.data) ? data.data : [];
}

/**
 * Crea un CLIENTE con paquetes y cursos. Si el correo YA existe, el back
 * actualiza paquetes y asigna cursos (y devuelve title "Usuario existente").
 *
 * ⚠️ Para clientes existentes los flags de paquete se SOBRESCRIBEN con lo que
 * mandes — pre-cargá los flags actuales (buscarPorCorreo) antes de llamar.
 *
 * Al crear, el back dispara además:
 *   - `whatsapp` — bienvenida por WhatsApp según el paquete más prioritario.
 *   - `correo`   — plantilla de bienvenida (`id_plantilla`; 0 = no enviar,
 *                  omitido = la sugerida por los paquetes marcados). No se
 *                  manda a usuarios existentes: la plantilla trae credenciales.
 *
 * @returns {Promise<{status, title, message, id_users?, cursosAsignados?,
 *   whatsapp?: {enviado, plantilla, motivo}, correo?: {enviado, nombre_plantilla, motivo}}>}
 *   `id_users` solo viene cuando se CREA uno nuevo (no cuando ya existía).
 */
export async function crearUsuarioFull(payload, { signal } = {}) {
  // `dropsystem` ya no se ofrece en el form, pero se sigue enviando (con el
  // valor pre-cargado del cliente) para no borrárselo a quien ya lo tiene:
  // el back SOBRESCRIBE los flags con lo que se mande.
  const flags = [
    "membresia_ecommerce",
    "ecommerce",
    "importacion",
    "infoaduana",
    "kit",
    "tiendas",
    "franquicias",
    "dropsystem",
    "kit_importador",
    "motor_ventas",
  ];

  const body = {
    nombre: String(payload.nombre ?? "").trim(),
    correo: String(payload.correo ?? "").trim(),
    telefono: String(payload.telefono ?? "").trim(),
    rol: Number(payload.rol),
    contrasena: payload.contrasena || "Import.1",
    cursos: Array.isArray(payload.cursos) ? payload.cursos.map(Number) : [],
  };
  flags.forEach((f) => {
    body[f] = payload[f] ? 1 : 0;
  });

  // Solo se manda si el agente tomó una decisión explícita: omitirlo deja que
  // el back elija la plantilla sugerida por los paquetes marcados.
  if (payload.id_plantilla != null && payload.id_plantilla !== "") {
    body.id_plantilla = Number(payload.id_plantilla);
  }

  const { data } = await imporsuitApi.post(
    "/Carterachat/crear_cliente",
    body,
    { signal },
  );
  return unwrap(data);
}
