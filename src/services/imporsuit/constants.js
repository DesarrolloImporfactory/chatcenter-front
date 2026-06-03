/**
 * Catálogos espejo del panel Asesor de imporsuit-front, para que la mini-vista
 * de chatcenter use exactamente los mismos roles, paquetes y medios de pago.
 *
 * Fuente: imporsuit-front/src/features/asesor/roles.js y AgregarPagoModal.jsx
 */

/** Roles asignables al crear un usuario (id_rol). */
export const ROLES_ASIGNABLES = [
  { id: 3, label: "Usuario Normal" },
  { id: 4, label: "Ecommerce" },
  { id: 5, label: "Vendedor" },
  { id: 12, label: "Asesor" },
  { id: 13, label: "Agente" },
  { id: 15, label: "Call Center" },
  { id: 16, label: "Estudiantes" },
  { id: 18, label: "Desafío" },
  { id: 19, label: "Instructor" },
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
  { id: 5753, nombre: "Kathy Mallitaxi" },
  { id: 9262, nombre: "Diego" },
  { id: 5752, nombre: "Adrián Velez" },
];

/**
 * id_configuracion (de chatcenter) donde se habilita la cartera de Imporsuit.
 * Agregá más ids a este array para habilitarla en otras configuraciones.
 */
export const CARTERA_CONFIGS_HABILITADAS = [242];

/** Estado de una deuda (cuenta_por_pagar.estado). */
export const ESTADO_DEUDA = {
  0: "Pendiente",
  1: "Pagada",
  2: "Anulada",
};
