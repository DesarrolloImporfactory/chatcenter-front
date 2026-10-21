/**
 * Monedas de la cartera: dólares (USD), pesos mexicanos (MXN), pesos
 * colombianos (COP) y soles peruanos (PEN).
 *
 * Regla (20-oct-2026): cada monto está en su moneda real y NUNCA se suman
 * monedas distintas. Todo total se arma por moneda (`totalesPorMoneda`) y se
 * muestra por separado. Espejo de `Class/Moneda.php` de Imporsuit y copia tal
 * cual de `src/lib/moneda.js` de su front React. Es la ÚNICA
 * lista de monedas del front (selects, filtros y orden salen de acá).
 *
 * El tipo de cambio es SIEMPRE «unidades de la moneda local por 1 dólar»
 * (18.35 MXN, 4.100 COP, 3.75 PEN). Un cruce pasa siempre por el dólar: un
 * lado del pago tiene que ser USD.
 */

export const USD = "USD";
export const MXN = "MXN";
export const COP = "COP";
export const PEN = "PEN";
/** Clave de los montos sin moneda confirmada (deudas viejas por revisar). */
export const SIN = "SIN";

export const MONEDAS = [
  { value: USD, label: "USD — dólares", corto: "USD", simbolo: "US$", nombre: "dólares" },
  { value: MXN, label: "MXN — pesos mexicanos", corto: "MXN", simbolo: "MX$", nombre: "pesos mexicanos" },
  { value: COP, label: "COP — pesos colombianos", corto: "COP", simbolo: "COL$", nombre: "pesos colombianos" },
  { value: PEN, label: "PEN — soles peruanos", corto: "PEN", simbolo: "S/", nombre: "soles" },
];

/** Claves válidas en orden de presentación, y con SIN al final. */
export const CLAVES_MONEDA = MONEDAS.map((m) => m.value);
export const ORDEN_MONEDAS = [...CLAVES_MONEDA, SIN];

/** Opciones para un filtro de reporte: todas (por separado), cada moneda y «sin moneda». */
export const FILTRO_MONEDAS = [
  { value: "", label: "Todas (por separado)" },
  ...MONEDAS.map((m) => ({ value: m.value, label: m.label })),
  { value: SIN, label: "Sin moneda confirmada" },
];

/** Rango sano del TC (unidades locales por 1 USD). Igual que el backend. */
export const TC_RANGO = {
  [MXN]: [10, 30],
  [COP]: [2500, 6000],
  [PEN]: [2.5, 5.5],
};

/** Moneda local de cada país que puede cobrar en ella; el resto, solo USD. */
export const LOCAL_DE_PAIS = { MX: MXN, CO: COP, PE: PEN };

/** Monedas en que puede cobrar un país: USD y, si tiene, la local. */
export function monedasDelPais(pais) {
  const local = LOCAL_DE_PAIS[String(pais ?? "").toUpperCase()];
  return local ? [USD, local] : [USD];
}

const ALIAS = {
  [USD]: ["usd", "us$", "u$s", "dolar", "dolares"],
  // «pesos» a secas es México: es lo que siempre dijo el selector viejo.
  [MXN]: ["mxn", "mx$", "peso", "pesos", "peso mexicano", "pesos mexicanos"],
  [COP]: ["cop", "col$", "cop$", "peso colombiano", "pesos colombianos"],
  [PEN]: ["pen", "s/", "s/.", "sol", "soles", "sol peruano", "soles peruanos"],
};

const NUM = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 'usd' / 'MX$' / 'soles'… → "USD" | "MXN" | "COP" | "PEN" | null */
export function normalizarMoneda(v) {
  const s = String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (!s) return null;
  for (const [moneda, alias] of Object.entries(ALIAS)) {
    if (alias.includes(s)) return moneda;
  }
  return null;
}

const info = (moneda) => MONEDAS.find((m) => m.value === normalizarMoneda(moneda)) ?? null;

export function simboloMoneda(moneda) {
  return info(moneda)?.simbolo ?? "$";
}

/**
 * «US$ 1.234,56» / «MX$ 12.360,31» / «COL$ 973.340,00» / «S/ 450,00». Sin
 * moneda conocida queda «$ …» y el que llama decide si marcarlo como «sin moneda».
 */
export function fmtMoneda(n, moneda) {
  return `${simboloMoneda(moneda)} ${NUM.format(Number(n) || 0)}`;
}

/** Nombre para textos: «dólares» / «pesos mexicanos» / «sin moneda»… */
export function nombreMoneda(moneda) {
  return info(moneda)?.nombre ?? "sin moneda";
}

/**
 * Suma columnas de filas agrupando por moneda. Nunca mezcla.
 *   totalesPorMoneda(deudas, ["monto_pendiente"])
 *   → { USD: { monto_pendiente: 120 }, MXN: {...}, SIN: {...} }
 * Las claves salen en ORDEN_MONEDAS y solo las que tienen filas.
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

/** Reordena un objeto { USD, MXN, COP, PEN, SIN } en ese orden. */
export function ordenarPorMoneda(obj) {
  const out = {};
  for (const k of ORDEN_MONEDAS) if (obj?.[k] !== undefined) out[k] = obj[k];
  for (const k of Object.keys(obj ?? {})) if (!(k in out)) out[k] = obj[k];
  return out;
}

/**
 * La moneda local de un cruce (la que no es USD). null si el cruce no pasa
 * por el dólar (no se admite) o si las dos son iguales.
 */
export function monedaLocalDelCruce(a, b) {
  const x = normalizarMoneda(a);
  const y = normalizarMoneda(b);
  if (!x || !y || x === y) return null;
  if (x !== USD && y !== USD) return null;
  return x === USD ? y : x;
}

/**
 * Monedas en que se puede recibir un pago de una deuda: la suya y, como los
 * cruces pasan por el dólar, USD si la deuda es local, o cualquiera si la deuda
 * es USD.
 */
export function monedasRecibibles(monedaDeuda) {
  const deuda = normalizarMoneda(monedaDeuda);
  if (!deuda) return [];
  return MONEDAS.filter((m) => m.value === deuda || deuda === USD || m.value === USD);
}

/** Convierte entre el dólar y una moneda local con un TC en unidades locales por dólar. */
export function convertirMoneda(monto, de, a, tc) {
  const m = Number(monto) || 0;
  const t = Number(tc) || 0;
  const x = normalizarMoneda(de);
  const y = normalizarMoneda(a);
  if (x === y) return Math.round(m * 100) / 100;
  if (!t || !monedaLocalDelCruce(x, y)) return 0;
  const r = x === USD ? m * t : m / t;
  return Math.round(r * 100) / 100;
}

/** null si el TC es válido para esa moneda local; si no, el mensaje de error. */
export function errorTipoCambio(tc, monedaLocal = MXN) {
  const local = normalizarMoneda(monedaLocal) ?? MXN;
  const unidad = nombreMoneda(local);
  if (tc === "" || tc === null || tc === undefined) return `Indica el tipo de cambio (${unidad} por 1 dólar).`;
  const t = Number(tc);
  const [min, max] = TC_RANGO[local] ?? [0, Infinity];
  if (!Number.isFinite(t) || t < min || t > max) {
    return `El tipo de cambio debe estar entre ${min} y ${max} ${unidad} por dólar.`;
  }
  return null;
}

/**
 * Pago que puede haber llegado en otra moneda. `monto` es lo que tecleó el
 * asesor (en la moneda recibida). Devuelve el abono en la moneda de la deuda,
 * el error a mostrar (o null), la moneda local del cruce y los campos que
 * espera el back.
 *
 *   resolverPagoCruzado("USD", 1835, { monedaRecibida: "MXN", tipoCambio: 18.35 })
 *   → { cruzado: true, abono: 100, error: null, local: "MXN", campos: { moneda_recibida: "MXN", monto_recibido: 1835, tipo_cambio: 18.35 } }
 */
export function resolverPagoCruzado(monedaDeuda, monto, { monedaRecibida, tipoCambio } = {}) {
  const deuda = normalizarMoneda(monedaDeuda);
  const recibida = normalizarMoneda(monedaRecibida) ?? deuda;
  const cruzado = Boolean(deuda && recibida && deuda !== recibida);
  if (!cruzado) {
    return { cruzado: false, abono: Number(monto) || 0, error: null, local: null, campos: {} };
  }
  const local = monedaLocalDelCruce(deuda, recibida);
  if (!local) {
    return {
      cruzado: true,
      abono: 0,
      local: null,
      error: `Un pago en ${nombreMoneda(recibida)} no se abona a una deuda en ${nombreMoneda(deuda)}: los cruces pasan por el dólar.`,
      campos: {},
    };
  }
  return {
    cruzado: true,
    abono: convertirMoneda(monto, recibida, deuda, tipoCambio),
    error: errorTipoCambio(tipoCambio, local),
    local,
    campos: {
      moneda_recibida: recibida,
      monto_recibido: Number(monto) || 0,
      tipo_cambio: Number(tipoCambio) || null,
    },
  };
}
