/**
 * Monedas de la cartera: dólares (USD) y pesos mexicanos (MXN).
 *
 * Regla (20-oct-2026): cada monto está en su moneda real y NUNCA se suman
 * pesos con dólares. Todo total se arma por moneda (`totalesPorMoneda`) y se
 * muestra por separado. Espejo de `Class/Moneda.php` de Imporsuit y de
 * `src/lib/moneda.js` de su front React (copiado tal cual).
 *
 * El tipo de cambio es SIEMPRE pesos por 1 dólar (ej. 18.35), en los dos
 * sentidos de conversión.
 */

export const USD = "USD";
export const MXN = "MXN";
/** Clave de los montos sin moneda confirmada (deudas viejas por revisar). */
export const SIN = "SIN";

export const MONEDAS = [
  { value: USD, label: "USD — dólares", corto: "USD" },
  { value: MXN, label: "MXN — pesos mexicanos", corto: "MXN" },
];

/** Rango sano del tipo de cambio (MXN por USD). Igual que el backend. */
export const TC_MIN = 10;
export const TC_MAX = 30;

const NUM = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 'usd' / 'MX$' / 'pesos'… → "USD" | "MXN" | null */
export function normalizarMoneda(v) {
  const s = String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (["usd", "us$", "dolar", "dolares"].includes(s)) return USD;
  if (["mxn", "mx$", "peso", "pesos", "peso mexicano", "pesos mexicanos"].includes(s)) return MXN;
  return null;
}

export function simboloMoneda(moneda) {
  const m = normalizarMoneda(moneda);
  if (m === USD) return "US$";
  if (m === MXN) return "MX$";
  return "$";
}

/**
 * «US$ 1.234,56» / «MX$ 12.360,31». Sin moneda conocida queda «$ …» y el que
 * llama decide si marcarlo como «sin moneda».
 */
export function fmtMoneda(n, moneda) {
  return `${simboloMoneda(moneda)} ${NUM.format(Number(n) || 0)}`;
}

/** Nombre para textos: «dólares» / «pesos mexicanos» / «sin moneda». */
export function nombreMoneda(moneda) {
  const m = normalizarMoneda(moneda);
  if (m === USD) return "dólares";
  if (m === MXN) return "pesos mexicanos";
  return "sin moneda";
}

/**
 * Suma columnas de filas agrupando por moneda. Nunca mezcla.
 *   totalesPorMoneda(deudas, ["monto_pendiente"])
 *   → { USD: { monto_pendiente: 120 }, MXN: {...}, SIN: {...} }
 * Las claves salen en orden USD, MXN, SIN y solo las que tienen filas.
 */
export function totalesPorMoneda(filas, campos, campoMoneda = "moneda") {
  const out = {};
  for (const f of filas ?? []) {
    const m = normalizarMoneda(f?.[campoMoneda]) ?? SIN;
    out[m] ??= Object.fromEntries(campos.map((c) => [c, 0]));
    for (const c of campos) {
      out[m][c] = Math.round((out[m][c] + (Number(f?.[c]) || 0)) * 100) / 100;
    }
  }
  return ordenarPorMoneda(out);
}

/** Reordena un objeto { USD, MXN, SIN } en ese orden. */
export function ordenarPorMoneda(obj) {
  const orden = [USD, MXN, SIN];
  const out = {};
  for (const k of orden) if (obj?.[k] !== undefined) out[k] = obj[k];
  for (const k of Object.keys(obj ?? {})) if (!(k in out)) out[k] = obj[k];
  return out;
}

/** Convierte con un TC en pesos por dólar. Redondea a centavos. */
export function convertirMoneda(monto, de, a, tc) {
  const m = Number(monto) || 0;
  const t = Number(tc) || 0;
  if (de === a) return Math.round(m * 100) / 100;
  if (!t) return 0;
  const r = de === MXN ? m / t : m * t;
  return Math.round(r * 100) / 100;
}

/**
 * Pago que puede haber llegado en la otra moneda. `monto` es lo que tecleó el
 * asesor (en la moneda recibida). Devuelve el abono en la moneda de la deuda,
 * el error a mostrar (o null) y los campos que espera el back.
 *
 *   resolverPagoCruzado("USD", 1835, { monedaRecibida: "MXN", tipoCambio: 18.35 })
 *   → { cruzado: true, abono: 100, error: null, campos: { moneda_recibida: "MXN", monto_recibido: 1835, tipo_cambio: 18.35 } }
 */
export function resolverPagoCruzado(monedaDeuda, monto, { monedaRecibida, tipoCambio } = {}) {
  const deuda = normalizarMoneda(monedaDeuda);
  const recibida = normalizarMoneda(monedaRecibida) ?? deuda;
  const cruzado = Boolean(deuda && recibida && deuda !== recibida);
  if (!cruzado) {
    return { cruzado: false, abono: Number(monto) || 0, error: null, campos: {} };
  }
  return {
    cruzado: true,
    abono: convertirMoneda(monto, recibida, deuda, tipoCambio),
    error: errorTipoCambio(tipoCambio),
    campos: {
      moneda_recibida: recibida,
      monto_recibido: Number(monto) || 0,
      tipo_cambio: Number(tipoCambio) || null,
    },
  };
}

/** null si el TC es válido; si no, el mensaje de error. */
export function errorTipoCambio(tc) {
  if (tc === "" || tc === null || tc === undefined) return "Indica el tipo de cambio (pesos por 1 dólar).";
  const t = Number(tc);
  if (!Number.isFinite(t) || t < TC_MIN || t > TC_MAX) {
    return `El tipo de cambio debe estar entre ${TC_MIN} y ${TC_MAX} pesos por dólar.`;
  }
  return null;
}
