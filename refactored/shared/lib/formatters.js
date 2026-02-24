/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  CAPA SHARED — Utilidades de formato y transformación     ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Centraliza helpers que estaban sueltos inline en varios  ║
 * ║  componentes:                                             ║
 * ║                                                           ║
 * ║  toSnakeCase:                                             ║
 * ║  - src/pages/admintemplates/CrearPlantillaModal.jsx (L4)  ║
 * ║                                                           ║
 * ║  detectPlaceholders:                                      ║
 * ║  - src/pages/admintemplates/CrearPlantillaModal.jsx (L18) ║
 * ║                                                           ║
 * ║  expandirTemplate:                                        ║
 * ║  - src/components/chat/Sidebar.jsx (L95)                  ║
 * ║                                                           ║
 * ║  normalizeSpaces / toTitleCaseEs:                         ║
 * ║  - src/components/chat/Sidebar.jsx (L106-120)             ║
 * ╚════════════════════════════════════════════════════════════╝
 */

/**
 * Convierte string a snake_case, removiendo acentos y caracteres especiales.
 * Ideal para nombres de plantillas de WhatsApp.
 *
 * @example toSnakeCase("Plantilla de Ventas!") → "plantilla_de_ventas"
 */
export const toSnakeCase = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/[^a-z0-9_]/g, "");

/**
 * Detecta placeholders {{n}} en texto y retorna array de números.
 *
 * @example detectPlaceholders("Hola {{1}}, tu pedido {{2}}") → [1, 2]
 */
export const detectPlaceholders = (text) => {
  const regex = /\{\{(\d+)\}\}/g;
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(parseInt(match[1], 10));
  }
  return matches;
};

/**
 * Expande un texto con placeholders {{key}} usando valores de un JSON.
 * Si el texto excede el límite, lo trunca con "…".
 *
 * @example expandirTemplate("Hola {{nombre}}", '{"nombre":"Ana"}') → "Hola Ana"
 */
export const expandirTemplate = (texto = "", rutaArchivo, limite = 90) => {
  if (!texto) return "";
  let out = texto;
  if (texto.includes("{{") && rutaArchivo) {
    try {
      const valores = JSON.parse(rutaArchivo);
      out = texto.replace(
        /\{\{(.*?)\}\}/g,
        (m, key) => valores[key.trim()] ?? m
      );
    } catch {
      /* ignore */
    }
  }
  return out.length > limite ? `${out.substring(0, limite)}…` : out;
};

/**
 * Normaliza espacios múltiples a uno solo y trim.
 */
export const normalizeSpaces = (s = "") => String(s).replace(/\s+/g, " ").trim();

/**
 * Convierte a Title Case respetando excepciones en español
 * (de, del, la, las, el, los, y, e, o, u, en, al, a, con, por, para).
 *
 * @example toTitleCaseEs("el mejor producto de la tienda") → "El Mejor Producto de la Tienda"
 */
export const toTitleCaseEs = (str = "") => {
  const excepciones = new Set([
    "de", "del", "la", "las", "el", "los", "y", "e",
    "o", "u", "en", "al", "a", "con", "por", "para",
  ]);
  return str
    .toLowerCase()
    .split(" ")
    .map((word, i) =>
      i === 0 || !excepciones.has(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word
    )
    .join(" ");
};

/**
 * Formatea un valor datetime-local a formato SQL "YYYY-MM-DD HH:mm:ss".
 *
 * @param {string} value - Valor del input datetime-local
 * @returns {string|null} Fecha en SQL o null si inválida
 */
export const formatDatetimeToSQL = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:00`;
};

/**
 * Formatea centavos a moneda USD.
 *
 * @example fmtMoney(2500) → "USD 25.00"
 */
export const fmtMoney = (cents) =>
  `USD ${(Number(cents || 0) / 100).toFixed(2)}`;

/**
 * Trunca texto a un máximo de caracteres con "…".
 */
export const truncate = (str = "", max = 100) =>
  str.length > max ? `${str.substring(0, max)}…` : str;
