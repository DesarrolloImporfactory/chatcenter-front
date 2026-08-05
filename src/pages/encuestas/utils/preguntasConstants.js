/* ── Schema, tipos y plantillas prearmadas de preguntas ── */

/**
 * Una pregunta se guarda así en `encuestas.preguntas` (JSON):
 *   {
 *     key:         'presupuesto_importacion',   // identificador estable
 *     label:       '¿Cuál es tu presupuesto?',  // lo que ve el cliente
 *     type:        'radio',
 *     required:    true,
 *     placeholder: 'Tu respuesta...',           // solo text/textarea/number
 *     hint:        'Texto de ayuda opcional',
 *     options:     ['Menos de $1.000', ...]     // solo radio/checkbox/select
 *   }
 *
 * El backend re-normaliza este shape en utils/encuestaPreguntas.js,
 * así que cualquier cambio de tipos debe hacerse en ambos lados.
 */

export const TIPOS_PREGUNTA = {
  text: {
    label: "Texto corto",
    icon: "bx-text",
    descripcion: "Una línea. Nombres, productos, respuestas breves.",
    tieneOpciones: false,
    tienePlaceholder: true,
  },
  textarea: {
    label: "Párrafo",
    icon: "bx-align-left",
    descripcion: "Varias líneas. Comentarios y respuestas abiertas.",
    tieneOpciones: false,
    tienePlaceholder: true,
  },
  radio: {
    label: "Opción única",
    icon: "bx-radio-circle-marked",
    descripcion: "Elige una. Respuestas normalizadas que puedes agrupar.",
    tieneOpciones: true,
    tienePlaceholder: false,
  },
  checkbox: {
    label: "Opción múltiple",
    icon: "bx-checkbox-checked",
    descripcion: "Puede marcar varias a la vez.",
    tieneOpciones: true,
    tienePlaceholder: false,
  },
  select: {
    label: "Lista desplegable",
    icon: "bx-chevron-down-square",
    descripcion: "Como opción única, pero compacta si hay muchas opciones.",
    tieneOpciones: true,
    tienePlaceholder: false,
  },
  rating_1_5: {
    label: "Escala 1 a 5",
    icon: "bx-star",
    descripcion: "Calificación con emojis del 1 al 5.",
    tieneOpciones: false,
    tienePlaceholder: false,
  },
  number: {
    label: "Número",
    icon: "bx-hash",
    descripcion: "Solo cifras. Cantidades, montos, horas.",
    tieneOpciones: false,
    tienePlaceholder: true,
  },
};

export const TIPOS_CON_OPCIONES = Object.entries(TIPOS_PREGUNTA)
  .filter(([, v]) => v.tieneOpciones)
  .map(([k]) => k);

export const MAX_PREGUNTAS = 30;
export const MAX_OPCIONES = 20;

/**
 * Convierte un label en key estable. DEBE producir el mismo resultado que
 * slugifyKey() en el backend (src/utils/encuestaPreguntas.js).
 */
export function slugifyKey(texto, fallback = "pregunta") {
  const base = String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

  return base || fallback;
}

/** Key única dentro de la lista actual (agrega _2, _3... si choca). */
export function keyUnica(label, preguntas, idxIgnorar = -1) {
  const base = slugifyKey(label, `pregunta_${preguntas.length + 1}`);
  const usadas = new Set(
    preguntas.filter((_, i) => i !== idxIgnorar).map((p) => p.key),
  );
  if (!usadas.has(base)) return base;

  let n = 2;
  while (usadas.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

/** Pregunta en blanco lista para editar. */
export function preguntaVacia(preguntas = []) {
  return {
    key: `pregunta_${preguntas.length + 1}`,
    label: "",
    type: "text",
    required: false,
    placeholder: "",
    hint: "",
    options: [],
  };
}

/**
 * Errores de una lista de preguntas. Devuelve [] si está todo bien.
 * Se usa para bloquear el guardado con un mensaje concreto.
 */
export function validarPreguntas(preguntas) {
  const errores = [];
  const vistas = new Set();

  preguntas.forEach((p, i) => {
    const n = i + 1;
    if (!p.label?.trim()) {
      errores.push(`Pregunta ${n}: falta el enunciado.`);
    }
    if (TIPOS_CON_OPCIONES.includes(p.type)) {
      const ops = (p.options || []).map((o) => o.trim()).filter(Boolean);
      if (ops.length < 2) {
        errores.push(
          `Pregunta ${n} ("${p.label || "sin título"}"): necesita al menos 2 opciones.`,
        );
      }
      if (new Set(ops).size !== ops.length) {
        errores.push(
          `Pregunta ${n} ("${p.label || "sin título"}"): hay opciones repetidas.`,
        );
      }
    }
    if (p.key && vistas.has(p.key)) {
      errores.push(`Pregunta ${n}: el identificador "${p.key}" está repetido.`);
    }
    vistas.add(p.key);
  });

  return errores;
}

/** Limpia la lista antes de mandarla al backend. */
export function serializarPreguntas(preguntas) {
  return preguntas
    .filter((p) => p.label?.trim())
    .map((p) => {
      const out = {
        key: p.key,
        label: p.label.trim(),
        type: p.type,
        required: !!p.required,
      };
      if (p.placeholder?.trim()) out.placeholder = p.placeholder.trim();
      if (p.hint?.trim()) out.hint = p.hint.trim();
      if (TIPOS_CON_OPCIONES.includes(p.type)) {
        out.options = (p.options || []).map((o) => o.trim()).filter(Boolean);
      }
      return out;
    });
}

/** Parse defensivo de lo que devuelve el backend. */
export function parsePreguntas(raw) {
  let lista = raw;
  if (typeof lista === "string") {
    try {
      lista = JSON.parse(lista);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(lista)) return [];

  return lista.map((p, i) => ({
    key: p.key || `pregunta_${i + 1}`,
    label: p.label || "",
    type: TIPOS_PREGUNTA[p.type] ? p.type : "text",
    required: !!p.required,
    placeholder: p.placeholder || "",
    hint: p.hint || "",
    options: Array.isArray(p.options) ? p.options : [],
    // Marca de "ya vive en la BD": su key NO se re-deriva al editar el
    // enunciado, porque las respuestas históricas están guardadas con ella.
    _persistida: true,
  }));
}

/* ═══════════════ Plantillas prearmadas ═══════════════ */

export const PLANTILLAS_PREGUNTAS = [
  {
    id: "perfilamiento_importador",
    nombre: "Perfilamiento de importador",
    descripcion:
      "Para alumnos que acaban de entrar al curso. Perfila presupuesto, producto, meta y disponibilidad.",
    icon: "bx-package",
    color: "blue",
    preguntas: [
      {
        key: "presupuesto_importacion",
        label: "¿Cuál es tu presupuesto de importación?",
        type: "radio",
        required: true,
        options: [
          "Menos de $1.000",
          "Entre $1.000 y $3.000",
          "Entre $3.000 y $10.000",
          "Más de $10.000",
          "Aún no lo tengo definido",
        ],
      },
      {
        key: "producto_a_importar",
        label: "¿Qué producto quieres importar?",
        type: "text",
        required: true,
        placeholder: "Ej: audífonos bluetooth, ropa deportiva...",
        hint: "Si aún no lo tienes claro, los productos en tendencia serían lo mejor para empezar.",
      },
      {
        key: "meta_principal",
        label: "¿Cuál es tu meta principal con este programa?",
        type: "radio",
        required: true,
        options: [
          "Generar un ingreso extra",
          "Vivir de mi negocio de importación",
          "Escalar el negocio que ya tengo",
          "Aprender el proceso antes de invertir",
        ],
      },
      {
        key: "horas_por_dia",
        label: "¿Cuántas horas al día le puedes dedicar a la plataforma?",
        type: "radio",
        required: true,
        options: [
          "Menos de 1 hora",
          "Entre 1 y 2 horas",
          "Entre 3 y 4 horas",
          "Más de 4 horas",
        ],
      },
    ],
  },
  {
    id: "satisfaccion_basica",
    nombre: "Satisfacción post-atención",
    descripcion:
      "Calificación del 1 al 5 más un comentario abierto sobre la atención recibida.",
    icon: "bx-happy-heart-eyes",
    color: "emerald",
    preguntas: [
      {
        key: "comentario",
        label: "¿Algún comentario adicional?",
        type: "textarea",
        required: false,
        placeholder: "Cuéntanos más sobre tu experiencia...",
      },
      {
        key: "recomendaria",
        label: "¿Nos recomendarías a un amigo o familiar?",
        type: "radio",
        required: false,
        options: ["Sí, sin dudarlo", "Tal vez", "No"],
      },
    ],
  },
  {
    id: "calificacion_lead",
    nombre: "Calificación de lead",
    descripcion:
      "Para leads nuevos: mide interés real, urgencia y capacidad de compra.",
    icon: "bx-target-lock",
    color: "violet",
    preguntas: [
      {
        key: "interes_principal",
        label: "¿Qué es lo que más te interesa de lo que ofrecemos?",
        type: "textarea",
        required: true,
        placeholder: "Cuéntanos brevemente...",
      },
      {
        key: "cuando_empezar",
        label: "¿Cuándo te gustaría empezar?",
        type: "radio",
        required: true,
        options: [
          "Lo antes posible",
          "En las próximas 2 semanas",
          "En 1 o 2 meses",
          "Solo estoy explorando",
        ],
      },
      {
        key: "presupuesto_disponible",
        label: "¿Cuentas con presupuesto disponible ahora mismo?",
        type: "radio",
        required: false,
        options: ["Sí", "Todavía no", "Prefiero no decirlo"],
      },
    ],
  },
  {
    id: "vacia",
    nombre: "Empezar desde cero",
    descripcion: "Sin preguntas prearmadas. Arma la encuesta a tu manera.",
    icon: "bx-plus",
    color: "gray",
    preguntas: [],
  },
];
