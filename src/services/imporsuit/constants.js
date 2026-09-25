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
  // "Dropsystem" es el nombre nuevo (sep-2026) del programa que se vendía como
  // The Ecommerce Method. La columna sigue siendo `ecommerce`.
  { key: "ecommerce", label: "Dropsystem" },
  { key: "importacion", label: "Importaciones" },
  { key: "infoaduana", label: "Infoaduana" },
  { key: "kit", label: "Kit" },
  { key: "tiendas", label: "50 Tiendas" },
  { key: "franquicias", label: "Franquicias" },
  // Kit del Importador (≠ "kit" legacy): curso 58 + calculadora del importador.
  { key: "kit_importador", label: "Kit del Importador" },
  // Motor de Ventas: curso 57 + botones ImporChat y Dropi.
  { key: "motor_ventas", label: "Motor de Ventas" },
  // El paquete `dropsystem` salió del alta en sep-2026: quedó absorbido por el
  // programa renombrado, que es el flag `ecommerce` de arriba.
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

/** Tipo de pago (`cartera_pagos.tipo_pago`). Obligatorio al registrar un pago. */
export const TIPOS_PAGO = [
  { value: "automatico", label: "Automático" },
  { value: "gestionado", label: "Gestionado" },
];

export const MONEDAS = [
  { value: "USD", label: "USD" },
  { value: "MXN", label: "MXN" },
];

export const TIPOS_VENTA = [
  { value: "fria", label: "Fría" },
  { value: "caliente", label: "Caliente" },
];

/**
 * id_configuracion (de chatcenter) donde se habilita la CARTERA.
 * Agregá más ids a este array para habilitarla en otras configuraciones.
 *   242 = Ventas · 265 = Soporte Importaciones Expertos
 */
export const CARTERA_CONFIGS_HABILITADAS = [242, 265];

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

/**
 * ANÁLISIS IA de cotizaciones no cerradas (por qué no se cerró y cómo
 * recuperarla). Pedido del 2026-09-24: solo en la línea 265 y solo para Johan,
 * que ve las cotizaciones del cliente de todos los asesores.
 *
 * El agente se reconoce por su id_sub_usuario (el JWT de chatcenter no trae el
 * correo del subusuario). El back busca su correo, lo cruza con su usuario de
 * Imporsuit y lo vuelve a validar (AnalisisCotizacionIA::USUARIOS_HABILITADOS);
 * acá es solo para no mostrar la sección a quien le daría 403.
 *   377 = Johan Bonilla (j.bonilla@imporfactorylatam.com → Imporsuit 9185)
 */
export const IA_CONFIGS_HABILITADAS = [265];
export const IA_AGENTES_HABILITADOS = [377];

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
  subir_comprobante: {
    label: "Subir comprobante",
    icon: "bx-upload",
    color: "amber",
  },
};
