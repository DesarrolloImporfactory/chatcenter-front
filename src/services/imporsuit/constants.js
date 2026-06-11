/**
 * Catálogos espejo del panel Asesor de imporsuit-front, para que la mini-vista
 * de chatcenter use exactamente los mismos roles, paquetes y medios de pago.
 *
 * Fuente: imporsuit-front/src/features/asesor/roles.js y AgregarPagoModal.jsx
 */

/** Roles asignables al crear un usuario (id_rol). */
export const ROLES_ASIGNABLES = [
  { id: 16, label: "Estudiantes" },
  { id: 18, label: "Desafío" },
];

/** Paquetes/membresías — cada key es una columna flag (0/1) en `users`. */
export const PAQUETES = [
  { key: "membresia_ecommerce", label: "Membresía de Importaciones" },
  { key: "ecommerce", label: "Ecommerce" },
  { key: "importacion", label: "Importaciones" },
  { key: "infoaduana", label: "Infoaduana" },
  { key: "kit", label: "Kit" },
  { key: "tiendas", label: "50 Tiendas" },
  { key: "franquicias", label: "Franquicias" },
];

/** Medios de pago aceptados por Asesor/agregar_pago. */
export const MEDIOS_PAGO = [
  { value: "transferencia_ec", label: "Transferencia Ecuador" },
  { value: "transferencia_mx", label: "Transferencia México" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "stripe", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
  { value: "efectivo", label: "Efectivo" },
  { value: "otro", label: "Otro" },
];

export const MONEDAS = [
  { value: "USD", label: "USD" },
  { value: "MXN", label: "MXN" },
];

export const TIPOS_VENTA = [
  { value: "fria", label: "Fría" },
  { value: "caliente", label: "Caliente" },
];

/** Asesores a los que se puede atribuir una deuda (id_users en Imporsuit). */
export const ASESORES = [
  { id: 9884, nombre: "Sin Asesor" },
  { id: 5753, nombre: "Kathy Mallitaxi" },
  { id: 9262, nombre: "Diego" },
  { id: 5752, nombre: "Adrián Velez" },
  { id: 10026, nombre: "Jorge Sharupi" },
];

/**
 * id_configuracion (de chatcenter) donde se habilita la CARTERA (cuenta de
 * VENTAS). Agregá más ids a este array para habilitarla en otras configuraciones.
 */
export const CARTERA_CONFIGS_HABILITADAS = [242];

/**
 * id_configuracion donde se habilita el CHECKLIST DEL ALUMNO (cuenta de
 * IMPORTACIONES). Gate INDEPENDIENTE de la cartera: la cartera vive en ventas
 * (242) y el checklist en la(s) cuenta(s) de importaciones, para que cada sistema
 * se vea por separado.
 *
 * TODO: agregar el id_configuracion de la cuenta de importaciones. Mientras esté
 * vacío, el checklist NO se muestra en ninguna config (incluida ventas 242).
 */
export const CHECKLIST_CONFIGS_HABILITADAS = [265];

/** Estado de una deuda (cuenta_por_pagar.estado). */
export const ESTADO_DEUDA = {
  0: "Pendiente",
  1: "Pagada",
  2: "Anulada",
};

/**
 * Acciones registradas por la auditoría de cartera (columna `accion`).
 * Para mostrar etiquetas e iconos en la vista de auditoría.
 */
export const ACCIONES_AUDITORIA = {
  crear_cliente: {
    label: "Crear / asignar cliente",
    icon: "bx-user-plus",
    color: "indigo",
  },
  generar_cartera: {
    label: "Generar cartera",
    icon: "bx-wallet",
    color: "emerald",
  },
  agregar_deuda: { label: "Agregar deuda", icon: "bx-receipt", color: "amber" },
  agregar_pago: {
    label: "Registrar pago",
    icon: "bx-dollar-circle",
    color: "green",
  },
  eliminar_deuda: { label: "Eliminar deuda", icon: "bx-trash", color: "red" },
};
