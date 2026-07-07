/**
 * Punto único de entrada para consumir Imporsuit desde chatcenter.
 *
 *   import * as imporsuit from "../../services/imporsuit";
 *   // o
 *   import { buscarPorCorreo, agregarPago } from "../../services/imporsuit";
 */

export {
  buscarPorCorreo,
  getUserData,
  getDeudasUsuario,
  getDeudasPorCorreos,
  generarCartera,
  agregarDeuda,
  agregarPago,
  eliminarDeuda,
} from "./cartera.service";

export { getCursosDisponibles, crearUsuarioFull } from "./usuarios.service";

export {
  getChecklistUsuario,
  marcarChecklistItem,
  guardarNotaChecklist,
} from "./checklist.service";

export { listarAuditoria } from "./auditoria.service";

export { getActorChatcenter, setCarteraCtx, getCarteraCtx } from "./actor";

export {
  ROLES_ASIGNABLES,
  PAQUETES,
  MEDIOS_PAGO,
  MONEDAS,
  TIPOS_VENTA,
  ASESORES,
  CARTERA_CONFIGS_HABILITADAS,
  CHECKLIST_CONFIGS_HABILITADAS,
  ESTADO_DEUDA,
  ACCIONES_AUDITORIA,
} from "./constants";
