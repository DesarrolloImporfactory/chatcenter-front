/**
 * Estado de vencimiento de la cartera de un cliente, para avisar de un vistazo
 * (sin abrir cada chat): VENCIDA (roja), POR VENCER (ámbar) o al día (rosa).
 *
 * Umbral "por vencer": la fecha_limite cae dentro de los próximos DIAS_POR_VENCER
 * días. Debe coincidir con el del backend (Carterachat: deudas_pendientes_por_correos).
 */
export const DIAS_POR_VENCER = 7;

/** Días desde hoy hasta la fecha límite (negativo = ya venció). null si inválida. */
export function diasHastaVencer(fechaLimite, hoy = new Date()) {
  if (!fechaLimite) return null;
  const f = new Date(String(fechaLimite).slice(0, 10) + "T00:00:00");
  if (isNaN(f)) return null;
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.floor((f - h) / 86400000);
}

/**
 * Cuenta vencidas / por vencer a partir de una lista de deudas (filas con
 * estado, monto_pendiente y fecha_limite). Para la cabecera, que ya trae las
 * deudas completas.
 */
export function contarVencimientos(deudas, hoy = new Date()) {
  let vencidas = 0;
  let porVencer = 0;
  for (const d of Array.isArray(deudas) ? deudas : []) {
    if (Number(d.estado) === 2) continue; // anuladas no cuentan
    if ((Number(d.monto_pendiente) || 0) <= 0) continue;
    const dias = diasHastaVencer(d.fecha_limite, hoy);
    if (dias == null) continue;
    if (dias < 0) vencidas += 1;
    else if (dias <= DIAS_POR_VENCER) porVencer += 1;
  }
  return { vencidas, porVencer };
}

/** Deriva el estado peor: vencida > por_vencer > al_dia. */
export function estadoDeuda({ vencidas = 0, porVencer = 0 } = {}) {
  if (vencidas > 0) return "vencida";
  if (porVencer > 0) return "por_vencer";
  return "al_dia";
}

/** Estilos por estado (clases Tailwind + ícono + etiqueta). */
export const ESTILO_DEUDA = {
  vencida: {
    badge: "border-red-300 bg-red-50 text-red-700",
    dot: "bg-red-500",
    icon: "bx bx-error-circle",
    label: "Vencida",
  },
  por_vencer: {
    badge: "border-amber-300 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    icon: "bx bx-time-five",
    label: "Por vencer",
  },
  al_dia: {
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-400",
    icon: "bx bx-error-circle",
    label: "Deuda",
  },
};
