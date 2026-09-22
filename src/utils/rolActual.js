import { jwtDecode } from "jwt-decode";

/**
 * Rol del subusuario logueado, leído del token (misma fuente que usa el
 * back en protect). Sirve para ocultar en el front lo que el back ya niega
 * por rol; la protección real vive en los middlewares del servidor.
 *
 * Roles: administrador (dueño de la cuenta), admin_limitado (supervisa los
 * chats de su departamento), ventas (asesor: solo sus chats),
 * gestor_clientes y super_administrador (internos de Imporsuit).
 */
export const getRolActual = () => {
  try {
    const t = localStorage.getItem("token");
    if (!t) return null;
    return jwtDecode(t)?.rol ?? null;
  } catch {
    return null;
  }
};

export const esRolVentas = () => getRolActual() === "ventas";

// Gestiona usuarios, departamentos y facturación de la cuenta.
export const esAdministrador = () => getRolActual() === "administrador";
