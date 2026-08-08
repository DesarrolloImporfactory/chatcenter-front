import React from "react";

/**
 * Formato de texto de WhatsApp → nodos de React.
 *
 * WhatsApp marca el formato con caracteres dentro del propio texto
 * (`*negrita*`, `_cursiva_`, `~tachado~`, ```monoespaciado```). El chat los
 * pintaba tal cual, así que el asesor veía los asteriscos en vez de la
 * negrita — y sobre todo, no veía el mensaje como lo ve el cliente.
 *
 * Reglas de WhatsApp que se respetan:
 *  - El marcador solo abre si va pegado al contenido (`*hola*`, no `* hola *`).
 *  - No se anida el mismo marcador.
 *  - El monoespaciado con ``` no interpreta nada adentro y sí acepta saltos.
 *  - Un marcador suelto se queda como texto literal.
 *
 * No se usa lookbehind en las expresiones regulares a propósito: Safari no lo
 * soporta hasta 16.4 y un regex literal inválido revienta el módulo entero al
 * cargarlo, no solo la función.
 */

/* Solo letras y números: el guion bajo NO cuenta como carácter de palabra
   para este chequeo. Si contara, `*a*_b_` dejaba de poner en negrita la `a`
   porque el `_` siguiente parecía pegarla a una palabra. El caso
   `snake_case_variable` igual se respeta: ahí el `_` va precedido de letra. */
const ES_PALABRA = /[\p{L}\p{N}]/u;
const ES_ESPACIO = /\s/;

/* Orden importa: el monoespaciado va primero porque su contenido es literal. */
const REGLAS = [
  { tag: "mono", marcador: "```", multilinea: true },
  { tag: "bold", marcador: "*", multilinea: false },
  { tag: "italic", marcador: "_", multilinea: false },
  { tag: "strike", marcador: "~", multilinea: false },
];

/**
 * Busca el primer par válido de un marcador.
 * @returns {{inicio:number, fin:number, contenido:string}|null}
 */
function buscarPar(texto, marcador, multilinea) {
  const largo = marcador.length;

  for (let i = 0; i + largo < texto.length; i++) {
    if (!texto.startsWith(marcador, i)) continue;

    // No abre si viene pegado a una palabra o al mismo marcador.
    const previo = i > 0 ? texto[i - 1] : "";
    if (previo && (ES_PALABRA.test(previo) || previo === marcador[0])) continue;

    // No abre si lo que sigue es espacio (WhatsApp exige contenido pegado).
    const siguiente = texto[i + largo];
    if (!siguiente || ES_ESPACIO.test(siguiente)) continue;

    for (let j = i + largo + 1; j <= texto.length - largo; j++) {
      if (!texto.startsWith(marcador, j)) continue;

      // No cierra si el carácter anterior es espacio.
      if (ES_ESPACIO.test(texto[j - 1])) continue;

      // No cierra si lo que sigue lo pega a una palabra o al mismo marcador.
      const posterior = texto[j + largo];
      if (
        posterior &&
        (ES_PALABRA.test(posterior) || posterior === marcador[0])
      ) {
        continue;
      }

      const contenido = texto.slice(i + largo, j);
      if (!contenido) break;
      if (!multilinea && contenido.includes("\n")) break;

      return { inicio: i, fin: j + largo, contenido };
    }
  }

  return null;
}

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]}])/g;

/** Convierte URLs sueltas en enlaces, respetando el resto del texto. */
function enlazar(texto, keyBase) {
  const partes = String(texto).split(URL_RE);

  return partes.map((parte, i) =>
    i % 2 === 1 ? (
      <a
        key={`${keyBase}-a${i}`}
        href={parte}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-1 underline-offset-2 hover:opacity-80 break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {parte}
      </a>
    ) : (
      <React.Fragment key={`${keyBase}-t${i}`}>{parte}</React.Fragment>
    ),
  );
}

function envolver(tag, hijos, key) {
  switch (tag) {
    case "bold":
      return (
        <strong key={key} className="font-semibold">
          {hijos}
        </strong>
      );
    case "italic":
      return <em key={key}>{hijos}</em>;
    case "strike":
      return <s key={key}>{hijos}</s>;
    case "mono":
      return (
        <code
          key={key}
          className="rounded bg-black/5 px-1 py-[1px] font-mono text-[0.92em]"
        >
          {hijos}
        </code>
      );
    default:
      return <React.Fragment key={key}>{hijos}</React.Fragment>;
  }
}

/**
 * Parsea aplicando la primera regla que encuentre.
 * `desde` limita qué marcadores siguen disponibles: dentro de una negrita ya
 * no se vuelve a buscar negrita (WhatsApp tampoco anida el mismo marcador).
 */
function parsear(texto, desde = 0, keyBase = "f") {
  if (!texto) return [];

  for (let i = desde; i < REGLAS.length; i++) {
    const { tag, marcador, multilinea } = REGLAS[i];
    const par = buscarPar(texto, marcador, multilinea);
    if (!par) continue;

    const antes = texto.slice(0, par.inicio);
    const despues = texto.slice(par.fin);
    // El monoespaciado no interpreta formato adentro.
    const dentro =
      tag === "mono"
        ? enlazar(par.contenido, `${keyBase}-m`)
        : parsear(par.contenido, i + 1, `${keyBase}-i`);

    return [
      ...parsear(antes, i, `${keyBase}-b${par.inicio}`),
      envolver(tag, dentro, `${keyBase}-w${par.inicio}`),
      ...parsear(despues, i, `${keyBase}-d${par.fin}`),
    ];
  }

  return enlazar(texto, keyBase);
}

/**
 * Renderiza texto de WhatsApp con su formato real.
 * Los saltos de línea se conservan con `whitespace-pre-wrap` en el contenedor.
 *
 * @param {string} texto
 * @returns {React.ReactNode}
 */
export function renderTextoWhatsapp(texto) {
  if (texto === null || texto === undefined) return null;
  const s = String(texto);
  if (!s) return null;
  return parsear(s);
}

/**
 * Versión en texto plano: quita los marcadores sin pintar formato.
 * Para previews de una línea (listado de chats, notificaciones) donde no se
 * pueden usar nodos de React pero tampoco deben verse los asteriscos.
 */
export function limpiarFormatoWhatsapp(texto) {
  if (!texto) return "";

  let out = String(texto);

  for (const { marcador, multilinea } of REGLAS) {
    let par = buscarPar(out, marcador, multilinea);
    let guardas = 0;
    while (par && guardas++ < 200) {
      out = out.slice(0, par.inicio) + par.contenido + out.slice(par.fin);
      par = buscarPar(out, marcador, multilinea);
    }
  }

  return out;
}

/** Sustituye {{1}}, {{2}}… por sus valores. Deja el marcador si no hay valor. */
export function aplicarVariables(texto, valores) {
  if (!texto) return "";

  let mapa = valores || {};

  if (Array.isArray(valores)) {
    mapa = {};
    valores.forEach((v, i) => {
      mapa[String(i + 1)] =
        v && typeof v === "object" ? (v.text ?? v.value ?? "") : v;
    });
  }

  return String(texto).replace(/\{\{(.*?)\}\}/g, (match, key) => {
    const k = String(key).trim();
    const v = mapa?.[k];
    return v === undefined || v === null || v === "" ? match : String(v);
  });
}
