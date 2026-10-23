/**
 * Pinta el motivo por el que Meta rechazó un lanzamiento.
 *
 * El backend ya no devuelve el error de Meta en crudo: manda un objeto
 * `motivo` con { titulo, porque, pasos, enlace, culpa, codigo } traducido al
 * español (ver src/utils/metaAdsErrores.js en el socket). Aquí solo se decide
 * cómo se ve, para que el aviso diga siempre lo mismo: qué pasó, por qué, y
 * qué tiene que hacer el cliente.
 *
 * `culpa` marca el tono. Importa sobre todo 'nuestro': cuando el fallo es de
 * ChatCenter no se le da al cliente una lista de cosas que revisar en su
 * cuenta, porque no hay nada que revisar.
 */

const escapar = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const TONOS = {
  cuenta: { icon: "warning", encabezado: "Qué tienes que hacer" },
  plantilla: { icon: "warning", encabezado: "Cómo se arregla" },
  nuestro: { icon: "error", encabezado: "Qué sigue" },
  reintentar: { icon: "info", encabezado: "Antes de volver a lanzar" },
  desconocido: { icon: "error", encabezado: "Qué hacer" },
};

/* Opciones listas para Swal.fire(). `fallback` es el texto plano de siempre,
   por si una respuesta vieja del backend todavía no trae `motivo`. */
export function swalMotivo(motivo, fallback) {
  if (!motivo?.titulo) {
    return {
      icon: "error",
      title: "Meta rechazó el lanzamiento",
      text: fallback || "Inténtalo de nuevo.",
      customClass: { popup: "rounded-2xl" },
    };
  }

  const tono = TONOS[motivo.culpa] || TONOS.desconocido;
  const partes = [`<div style="text-align:left;font-size:14px;color:#334155">`];

  if (motivo.culpa === "nuestro") {
    partes.push(
      `<p style="margin:0 0 10px;padding:8px 10px;border-radius:8px;
         background:#eef2ff;color:#3730a3;font-size:13px">
         Esto es un fallo nuestro, no de tu cuenta. No tienes que cambiar nada.
       </p>`,
    );
  }

  partes.push(
    `<p style="margin:0 0 12px;line-height:1.5">${escapar(motivo.porque)}</p>`,
  );

  if (motivo.pasos?.length) {
    partes.push(
      `<p style="margin:0 0 6px;font-weight:700;color:#0f172a;font-size:13px">
         ${tono.encabezado}
       </p>`,
      `<ol style="margin:0 0 12px;padding-left:20px;line-height:1.55">`,
      ...motivo.pasos.map((p) => `<li>${escapar(p)}</li>`),
      `</ol>`,
    );
  }

  if (motivo.enlace?.url) {
    partes.push(
      `<a href="${escapar(motivo.enlace.url)}" target="_blank" rel="noreferrer"
          style="color:#4f46e5;font-weight:600;text-decoration:none">
          ${escapar(motivo.enlace.texto || "Abrir")} →
       </a>`,
    );
  }

  if (motivo.codigo) {
    partes.push(
      `<p style="margin:12px 0 0;font-size:11px;color:#94a3b8">
         Código de Meta: ${escapar(motivo.codigo)}
       </p>`,
    );
  }

  partes.push(`</div>`);

  return {
    icon: tono.icon,
    title: motivo.titulo,
    html: partes.join(""),
    confirmButtonText: "Entendido",
    customClass: { popup: "rounded-2xl" },
    width: 540,
  };
}

/* Una línea para la tabla de la bitácora, donde no cabe la ficha entera. */
export function resumenMotivo(motivo, fallback) {
  if (!motivo?.titulo) return fallback || "";
  return motivo.titulo;
}

/* Texto largo para el `title` del elemento (tooltip del navegador). */
export function detalleMotivo(motivo, fallback) {
  if (!motivo?.titulo) return fallback || "";
  const pasos = motivo.pasos?.length ? `\n\n${motivo.pasos.join("\n")}` : "";
  const cod = motivo.codigo ? `\n\nCódigo de Meta: ${motivo.codigo}` : "";
  return `${motivo.titulo}\n\n${motivo.porque}${pasos}${cod}`;
}
