import {
  fmtMoneda,
  normalizarMoneda,
  ordenarPorMoneda,
  SIN,
} from "../../services/imporsuit/moneda";

/**
 * Estado de vencimiento de la cartera de un cliente, para avisar de un vistazo
 * (sin abrir cada chat): VENCIDA (roja), POR VENCER (ámbar) o al día (verde).
 *
 * Umbral "por vencer": la fecha_limite cae dentro de los próximos DIAS_POR_VENCER
 * días. Debe coincidir con el del backend (Carterachat: deudas_pendientes_por_correos).
 *
 * Los MONTOS van siempre por moneda (separacion_monedas.md en imporsutipro):
 * `porMoneda = { USD: { pendiente, montoVencido, montoPorVencer }, MXN: …, SIN: … }`.
 * Un cliente puede deber dólares y pesos a la vez: nunca se suman.
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

const centavos = (n) => Math.round(n * 100) / 100;

/**
 * Cuenta pendientes / vencidas / por vencer a partir de una lista de deudas
 * (filas con estado, monto_pendiente, fecha_limite y moneda). Para la
 * cabecera, que ya trae las deudas completas. Los montos salen por moneda.
 */
export function contarVencimientos(deudas, hoy = new Date()) {
  let numPendientes = 0;
  let vencidas = 0;
  let porVencer = 0;
  const porMoneda = {};
  for (const d of Array.isArray(deudas) ? deudas : []) {
    if (Number(d.estado) === 2) continue; // anuladas no cuentan
    const m = Number(d.monto_pendiente) || 0;
    if (m <= 0) continue;
    numPendientes += 1;
    const mon = normalizarMoneda(d.moneda) ?? SIN;
    const t = (porMoneda[mon] ??= { pendiente: 0, montoVencido: 0, montoPorVencer: 0 });
    t.pendiente = centavos(t.pendiente + m);
    const dias = diasHastaVencer(d.fecha_limite, hoy);
    if (dias == null) continue;
    if (dias < 0) {
      vencidas += 1;
      t.montoVencido = centavos(t.montoVencido + m);
    } else if (dias <= DIAS_POR_VENCER) {
      porVencer += 1;
      t.montoPorVencer = centavos(t.montoPorVencer + m);
    }
  }
  return { numPendientes, vencidas, porVencer, porMoneda: ordenarPorMoneda(porMoneda) };
}

/**
 * `por_moneda` del backend (deudas_por_correos: snake_case) al formato del
 * front: { USD: { pendiente, montoVencido, montoPorVencer }, … }.
 */
export function porMonedaDesdeApi(porMoneda) {
  const out = {};
  for (const [m, v] of Object.entries(porMoneda ?? {})) {
    out[m] = {
      pendiente: Number(v?.pendiente) || 0,
      montoVencido: Number(v?.monto_vencido) || 0,
      montoPorVencer: Number(v?.monto_por_vencer) || 0,
    };
  }
  return ordenarPorMoneda(out);
}

/** ¿Debe algo, en cualquier moneda? (no suma: solo mira si alguna es > 0) */
export function tienePendiente(info) {
  return Object.values(info?.porMoneda ?? {}).some((v) => Number(v?.pendiente) > 0);
}

/**
 * «US$ 120,00 · MX$ 2.500,00»: un monto por moneda, nunca sumados. `montos`
 * es { USD: n, MXN: n, SIN: n }; lo sin moneda se marca como tal.
 */
export function textoPorMoneda(montos, sep = " · ") {
  return Object.entries(montos ?? {})
    .filter(([, v]) => Number(v) > 0)
    .map(([m, v]) =>
      m === SIN ? `${fmtMoneda(v, null)} (sin moneda)` : fmtMoneda(v, m),
    )
    .join(sep);
}

/** De `porMoneda` toma un solo campo: { USD: n, MXN: n }. */
export function campoPorMoneda(info, campo) {
  const out = {};
  for (const [m, v] of Object.entries(info?.porMoneda ?? {})) {
    const n = Number(v?.[campo]) || 0;
    if (n > 0) out[m] = n;
  }
  return out;
}

/**
 * ¿Hay algo que alertar? Solo si tiene deudas VENCIDAS o POR VENCER. Un saldo
 * pendiente con vencimiento lejano NO es alerta: en ese caso no se pinta nada.
 */
export function hayAlertaDeuda(info) {
  return (
    (Number(info?.vencidas) || 0) > 0 || (Number(info?.porVencer) || 0) > 0
  );
}

/**
 * Montos que debe MOSTRAR el badge, POR MONEDA ({ USD: n, MXN: n }): las
 * VENCIDAS o, si no hay ninguna vencida, las que están por vencer.
 * Nunca el total pendiente: ese incluía deudas con vencimiento lejano e
 * inflaba la cifra que ve el asesor.
 */
export function montosAlerta(info) {
  const vencidas = Number(info?.vencidas) || 0;
  const porVencer = Number(info?.porVencer) || 0;
  const campo =
    vencidas > 0 ? "montoVencido" : porVencer > 0 ? "montoPorVencer" : null;
  if (!campo) return {};
  const montos = campoPorMoneda(info, campo);
  // Fallback al pendiente: es preferible mostrar el total por moneda antes
  // que un badge vacío que parecería un error.
  return Object.keys(montos).length ? montos : campoPorMoneda(info, "pendiente");
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
  // Hay saldo pendiente pero NADA vencido ni por vencer: es un estado sano, así
  // que va en verde y con ícono de check. (Antes iba en rosa + ícono de error,
  // por lo que un cliente al día se veía en rojo igual que uno vencido.)
  al_dia: {
    badge: "border-emerald-300 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    icon: "bx bx-check-circle",
    label: "Al día",
  },
};
