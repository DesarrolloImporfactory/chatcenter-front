import imporsuitApi from "../../api/imporsuit";

/**
 * Servicio de USUARIOS/cliente de Imporsuit consumido desde chatcenter.
 * Endpoints "libres" del controlador `Carterachat` (token compartido):
 *   - GET  /Carterachat/cursos
 *   - POST /Carterachat/crear_cliente
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
 * Crea un CLIENTE con paquetes y cursos. Si el correo YA existe, el back
 * actualiza paquetes y asigna cursos (y devuelve title "Usuario existente").
 *
 * ⚠️ Para clientes existentes los flags de paquete se SOBRESCRIBEN con lo que
 * mandes — pre-cargá los flags actuales (buscarPorCorreo) antes de llamar.
 *
 * @returns {Promise<{status, title, message, id_users?, cursosAsignados?}>}
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

  const { data } = await imporsuitApi.post(
    "/Carterachat/crear_cliente",
    body,
    { signal },
  );
  return unwrap(data);
}
