// src/pages/remarketingProducto/EditorRemarketingProducto.jsx
// Configuración del remarketing de UN producto, en cuatro pasos numerados:
//   1. El recordatorio (cuánto esperar, el mensaje, la foto). Las variables
//      se meten con chips, nadie escribe llaves a mano.
//   2. Los botones: cada uno «manda contenido» o «el bot sigue cerrando la
//      venta» (respuestas rápidas del wizard → IA, como siempre).
//   3. El contenido de cada botón que manda contenido: capturas de opiniones,
//      fotos, video o PDF en una cuadrícula (subida múltiple, arrastrar para
//      ordenar) y un texto de cierre.
//   4. Qué pasa después (mover de columna; un segundo recordatorio opcional).
// A la derecha, la vista previa estilo WhatsApp y el envío de prueba.
import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

const MAX_TITULO = 20;
const MAX_ITEMS = 10;

const VARIABLES = [
  { token: "{{nombre}}", label: "Nombre del cliente", ejemplo: "Daniela" },
  { token: "{{producto}}", label: "Nombre del producto", ejemplo: null },
  { token: "{{precio}}", label: "Precio", ejemplo: null },
];

const OPCIONES_TIEMPO = [
  { v: 15, l: "15 minutos" },
  { v: 30, l: "30 minutos" },
  { v: 60, l: "1 hora" },
  { v: 120, l: "2 horas" },
  { v: 180, l: "3 horas" },
  { v: 300, l: "5 horas" },
  { v: 360, l: "6 horas" },
  { v: 480, l: "8 horas" },
  { v: 720, l: "12 horas" },
  { v: 1440, l: "1 día" },
  { v: 2880, l: "2 días" },
];

const fmtPrecio = (p) => {
  const n = Number(p);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `$${n.toFixed(2).replace(/\.00$/, "")}`;
};

const rellenar = (texto, vars) =>
  String(texto || "")
    .replace(/\{\{\s*nombre\s*\}\}/gi, vars.nombre)
    .replace(/\{\{\s*producto\s*\}\}/gi, vars.producto)
    .replace(/\{\{\s*precio\s*\}\}/gi, vars.precio);

const minutosATexto = (m) => {
  const o = OPCIONES_TIEMPO.find((x) => x.v === Number(m));
  if (o) return o.l;
  const n = Number(m) || 0;
  if (n < 60) return `${n} min`;
  if (n % 1440 === 0) return `${n / 1440} día${n / 1440 > 1 ? "s" : ""}`;
  if (n % 60 === 0) return `${n / 60} h`;
  return `${Math.floor(n / 60)} h ${n % 60} min`;
};

const largo = (s) => [...String(s || "")].length;

/* Tiempos por defecto al agregar recordatorios: 1 h → 5 h → 8 h suman 14 h,
   así los tres caen dentro de las 24 h y salen con botones. */
const MINUTOS_DEFECTO_POR_PASO = [60, 300, 480];
/* Textos de botón sugeridos para el 2.º y 3.º recordatorio: misma acción,
   otra forma de decirlo, para que la secuencia no se lea repetida. */
const TITULOS_DEFECTO_POR_PASO = [
  null,
  { opiniones: "👀 Ver qué opinan", quiero: "🛒 Pedirlo ahora" },
  { opiniones: "⭐ Opiniones reales", quiero: "✅ Quiero el mío" },
];
/* Botones de un paso: los de la tarjeta 2 con el texto propio del paso. */
const botonesDelPaso = (config, paso) =>
  (config.botones || []).map((b) => {
    const t = String(paso?.botones_titulos?.[b.clave] || "").trim();
    return t ? { ...b, titulo: t } : b;
  });

/* Plantillas de Meta utilizables en un recordatorio que cae fuera de las
   24 h: en contacto inicial no hay pedido ni datos con qué llenar {{n}},
   así que solo sirven las aprobadas sin variables (cuerpo, encabezado o URL
   de botón). El backend hace el mismo cuadre al guardar. */
const comp = (tpl, tipo) => tpl?.components?.find((c) => c.type === tipo);
const tieneVariables = (txt) => /\{\{\d+\}\}/.test(String(txt || ""));
const motivoPlantillaNoSirve = (tpl) => {
  if (String(tpl?.status || "").toUpperCase() !== "APPROVED") return "no aprobada";
  if (tieneVariables(comp(tpl, "BODY")?.text)) return "con variables";
  const h = comp(tpl, "HEADER");
  if (h && String(h.format || "").toUpperCase() === "TEXT" && tieneVariables(h.text)) return "con variables";
  if ((comp(tpl, "BUTTONS")?.buttons || []).some((b) => tieneVariables(b?.url))) return "botón con URL variable";
  return null;
};
const cabeceraPlantilla = (tpl) => {
  const h = comp(tpl, "HEADER");
  const fmt = h ? String(h.format || "").toUpperCase() : "";
  if (!["IMAGE", "VIDEO", "DOCUMENT"].includes(fmt)) return { header_format: null, header_media_url: null };
  const url = h?.example?.header_handle?.[0] || h?.example?.header_url?.[0] || null;
  return { header_format: fmt, header_media_url: url ? String(url).replace(/&amp;/g, "&") : null };
};

/* Selector de plantilla para un recordatorio fuera de ventana. */
function SelectorPlantilla({ paso, acumulado, plantillas, cargando, onChange }) {
  const elegida = paso?.plantilla?.nombre_template || "";
  const tpl = plantillas.find((t) => t.name === elegida);
  const motivo = tpl ? motivoPlantillaNoSirve(tpl) : null;
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 space-y-2">
      <div className="flex items-start gap-2">
        <i className="bx bxl-meta mt-0.5 text-sky-700" />
        <div className="text-sm text-sky-900">
          <b>Este recordatorio sale como plantilla de Meta.</b> Llegaría{" "}
          <b>{minutosATexto(acumulado)}</b> después del último mensaje del cliente, fuera de las 24 h en
          que WhatsApp permite mensajes con botones. Elige una plantilla aprobada (sin variables) o
          acorta los tiempos.
        </div>
      </div>
      <select
        value={elegida}
        onChange={(e) => {
          const nombre = e.target.value;
          const t = plantillas.find((x) => x.name === nombre);
          onChange(
            nombre
              ? { nombre_template: nombre, language_code: t?.language || "es", ...cabeceraPlantilla(t) }
              : null,
          );
        }}
        className="w-full rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm"
      >
        <option value="">{cargando ? "Cargando plantillas…" : "Selecciona una plantilla"}</option>
        {plantillas.map((t) => {
          const m = motivoPlantillaNoSirve(t);
          return (
            <option key={t.id || t.name} value={t.name} disabled={!!m}>
              {t.name}
              {m ? ` — ${m}` : ""}
            </option>
          );
        })}
      </select>
      {!cargando && !plantillas.length ? (
        <p className="text-xs text-sky-800">
          No encontramos plantillas en tu cuenta. Créala en Plantillas de WhatsApp y vuelve aquí.
        </p>
      ) : null}
      {elegida && motivo ? (
        <p className="text-xs text-red-600">
          «{elegida}» no sirve aquí: {motivo}. Elige otra.
        </p>
      ) : null}
      {elegida && tpl && !motivo ? (
        <p className="text-xs text-emerald-700">
          <i className="bx bx-check-circle align-middle" /> «{elegida}» está aprobada y lista para salir sola.
        </p>
      ) : null}
    </div>
  );
}

/* ── Piezas de UI ──────────────────────────────────────────────────── */
function Tarjeta({ numero, titulo, ayuda, children, derecha = null }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
            {numero}
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">{titulo}</h3>
            {ayuda ? <p className="text-xs text-slate-500 mt-0.5">{ayuda}</p> : null}
          </div>
        </div>
        {derecha}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/* Textarea con chips de variables: el chip inserta el token donde está el
   cursor; el usuario nunca escribe llaves. Debajo se ve cómo queda. */
function MensajeConVariables({ valor, onChange, vars, placeholder }) {
  const ref = useRef(null);
  const insertar = (token) => {
    const el = ref.current;
    const v = String(valor || "");
    if (!el) return onChange(`${v}${v && !v.endsWith(" ") ? " " : ""}${token}`);
    const a = el.selectionStart ?? v.length;
    const b = el.selectionEnd ?? v.length;
    const antes = v.slice(0, a);
    const despues = v.slice(b);
    const sep1 = antes && !/\s$/.test(antes) ? " " : "";
    const sep2 = despues && !/^\s/.test(despues) ? " " : "";
    const nuevo = `${antes}${sep1}${token}${sep2}${despues}`;
    onChange(nuevo);
    const pos = (antes + sep1 + token).length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-500 mr-1">Insertar:</span>
        {VARIABLES.map((v) => (
          <button
            key={v.token}
            type="button"
            onClick={() => insertar(v.token)}
            className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            + {v.label}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        rows={4}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        maxLength={1024}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm leading-relaxed focus:border-blue-400 focus:outline-none"
      />
      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>Así lo verá el cliente: <span className="text-slate-600">{rellenar(valor, vars) || "…"}</span></span>
        <span>{largo(valor)}/1024</span>
      </div>
    </div>
  );
}

/* Cuadrícula de contenido de un botón: subida múltiple, arrastrar para
   ordenar, X para quitar, texto opcional al pie. */
/* ── Tarjeta de opinión ──────────────────────────────────────────────────
   Convierte una opinión REAL (la escribe el dueño con lo que le dijo su
   cliente) en una imagen cuidada, tipo landing, para mandarla por el botón.
   Las tarjetas de EJEMPLO llevan marca de agua y nunca se suben ni se envían:
   solo muestran cómo queda y se reemplazan con opiniones reales. */
const TARJETA_W = 1080;
const TARJETA_H = 1080;

const envolverTexto = (ctx, texto, maxAncho, maxLineas) => {
  const palabras = String(texto || "").trim().split(/\s+/);
  const lineas = [];
  let actual = "";
  for (const w of palabras) {
    const prueba = actual ? `${actual} ${w}` : w;
    if (ctx.measureText(prueba).width <= maxAncho) actual = prueba;
    else {
      if (actual) lineas.push(actual);
      actual = w;
    }
    if (lineas.length === maxLineas) break;
  }
  if (lineas.length < maxLineas && actual) lineas.push(actual);
  if (lineas.length === maxLineas && palabras.join(" ") !== lineas.join(" ")) {
    lineas[maxLineas - 1] = lineas[maxLineas - 1].replace(/\s*\S*$/, "") + "…";
  }
  return lineas;
};

const rectRedondo = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const FUENTE = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/* Paletas del avatar generado y de los destellos del fondo. «Otro avatar»
   avanza la semilla y cambia de paleta. */
const PALETAS_AVATAR = [
  ["#6366f1", "#a855f7"],
  ["#0ea5e9", "#22d3ee"],
  ["#f97316", "#f43f5e"],
  ["#10b981", "#84cc16"],
  ["#ec4899", "#f472b6"],
  ["#171931", "#4338ca"],
  ["#eab308", "#f97316"],
  ["#14b8a6", "#0ea5e9"],
];

const iniciales = (nombre) => {
  const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "C";
  return (partes[0][0] + (partes[1]?.[0] || "")).toUpperCase();
};

const fechaBonita = (iso) => {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" }).replace(".", "");
};

const dibujarCheck = (ctx, cx, cy, r, color = "#2563eb") => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = Math.max(3, r / 4);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.45, cy + r * 0.02);
  ctx.lineTo(cx - r * 0.12, cy + r * 0.36);
  ctx.lineTo(cx + r * 0.5, cy - r * 0.34);
  ctx.stroke();
  ctx.restore();
};

const dibujarEstrella = (ctx, cx, cy, r, color) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.46;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

/**
 * Tarjeta de opinión 1080×1080 con aspecto de reseña real (tipo Shopify /
 * marketplace): avatar (foto del cliente o iniciales), nombre con insignia,
 * ciudad y fecha, estrellas, título, texto y pie con el producto.
 * `foto` es un HTMLImageElement ya cargado (archivo local) o null.
 */
function dibujarTarjetaOpinion({
  nombre,
  ciudad,
  fecha,
  estrellas,
  titulo,
  texto,
  producto,
  foto = null,
  semilla = 0,
  verificada = true,
  ejemplo = false,
}) {
  const c = document.createElement("canvas");
  c.width = TARJETA_W;
  c.height = TARJETA_H;
  const ctx = c.getContext("2d");
  const W = TARJETA_W;
  const H = TARJETA_H;
  const paleta = PALETAS_AVATAR[Math.abs(Number(semilla) || 0) % PALETAS_AVATAR.length];

  // Fondo: degradado suave + dos destellos de la paleta
  const fondo = ctx.createLinearGradient(0, 0, W, H);
  fondo.addColorStop(0, "#f4f5fb");
  fondo.addColorStop(1, "#eef2ff");
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, W, H);
  const destello = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `${color}55`);
    g.addColorStop(1, `${color}00`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  destello(120, 140, 420, paleta[0]);
  destello(W - 100, H - 120, 460, paleta[1]);

  // Tarjeta
  const cx0 = 70;
  const cy0 = 110;
  const cw = W - 140;
  const ch = H - 220;
  ctx.save();
  ctx.shadowColor = "rgba(23,25,49,.16)";
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 28;
  rectRedondo(ctx, cx0, cy0, cw, ch, 44);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  // Avatar
  const ax = 190;
  const ay = 235;
  const ar = 66;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (foto) {
    const lado = Math.min(foto.naturalWidth || foto.width, foto.naturalHeight || foto.height);
    const sx = ((foto.naturalWidth || foto.width) - lado) / 2;
    const sy = ((foto.naturalHeight || foto.height) - lado) / 2;
    ctx.drawImage(foto, sx, sy, lado, lado, ax - ar, ay - ar, ar * 2, ar * 2);
  } else {
    const g = ctx.createLinearGradient(ax - ar, ay - ar, ax + ar, ay + ar);
    g.addColorStop(0, paleta[0]);
    g.addColorStop(1, paleta[1]);
    ctx.fillStyle = g;
    ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.font = `bold 52px ${FUENTE}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(iniciales(nombre), ax, ay + 2);
  }
  ctx.restore();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  // Aro del avatar
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(ax, ay, ar + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ax, ay, ar + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Nombre + insignia (el nombre tiene todo el ancho: las estrellas van debajo)
  const nombreTxt = String(nombre || "").trim() || "Cliente";
  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 42px ${FUENTE}`;
  const nombreFinal = envolverTexto(ctx, nombreTxt, 600, 1)[0] || nombreTxt;
  ctx.fillText(nombreFinal, 280, 212);
  if (verificada) {
    const wN = ctx.measureText(nombreFinal).width;
    dibujarCheck(ctx, 280 + wN + 30, 198, 17);
  }
  // Ciudad · fecha
  const meta = [String(ciudad || "").trim(), fechaBonita(fecha)].filter(Boolean).join("  ·  ");
  ctx.fillStyle = "#64748b";
  ctx.font = `28px ${FUENTE}`;
  ctx.fillText(meta, 280, 256);

  // Estrellas, bajo el nombre
  const n = Math.min(5, Math.max(1, Number(estrellas) || 5));
  for (let i = 0; i < 5; i += 1) {
    dibujarEstrella(ctx, 300 + i * 48, 296, 21, i < n ? "#f5b301" : "#e5e7eb");
  }
  ctx.fillStyle = "#94a3b8";
  ctx.font = `24px ${FUENTE}`;
  ctx.fillText(`${n}.0 / 5`, 548, 305);

  // Comilla decorativa (detrás del texto, en el margen derecho)
  ctx.fillStyle = `${paleta[0]}1f`;
  ctx.font = "bold 190px Georgia, serif";
  ctx.fillText("“", 868, 470);

  // Título + texto: el bloque se centra verticalmente entre la cabecera y el
  // pie, y el tamaño de letra se adapta para que una opinión corta no quede
  // perdida ni una larga se corte.
  const topTexto = 372;
  const bottomTexto = 806;
  const anchoTexto = cw - 240;
  const tituloTxt = String(titulo || "").trim();
  let tituloLineas = [];
  if (tituloTxt) {
    ctx.font = `bold 46px ${FUENTE}`;
    tituloLineas = envolverTexto(ctx, tituloTxt, anchoTexto, 2);
  }
  const altoTitulo = tituloLineas.length ? tituloLineas.length * 58 + 14 : 0;
  const palabrasTotal = String(texto || "").trim().split(/\s+/).filter(Boolean).length;
  let fuente = palabrasTotal <= 14 ? 50 : palabrasTotal <= 26 ? 44 : 38;
  let lineas = [];
  let interlineado = 0;
  for (;;) {
    ctx.font = `400 ${fuente}px ${FUENTE}`;
    interlineado = Math.round(fuente * 1.42);
    const disponibles = Math.max(2, Math.floor((bottomTexto - topTexto - altoTitulo) / interlineado));
    lineas = envolverTexto(ctx, texto, anchoTexto, disponibles);
    const cortado = lineas.length && lineas[lineas.length - 1].endsWith("…");
    if (!cortado || fuente <= 32) break;
    fuente -= 4;
  }
  const altoBloque = altoTitulo + lineas.length * interlineado;
  let y = topTexto + Math.max(0, (bottomTexto - topTexto - altoBloque) / 2) + fuente * 0.8;
  if (tituloLineas.length) {
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold 46px ${FUENTE}`;
    tituloLineas.forEach((l) => {
      ctx.fillText(l, 150, y);
      y += 58;
    });
    y += 14;
  }
  ctx.fillStyle = "#1f2937";
  ctx.font = `400 ${fuente}px ${FUENTE}`;
  lineas.forEach((l) => {
    ctx.fillText(l, 150, y);
    y += interlineado;
  });

  // Pie
  ctx.strokeStyle = "#eef0f4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(130, 846);
  ctx.lineTo(cx0 + cw - 60, 846);
  ctx.stroke();
  ctx.fillStyle = "#94a3b8";
  ctx.font = `24px ${FUENTE}`;
  ctx.fillText("OPINIÓN SOBRE", 150, 900);
  ctx.fillStyle = "#171931";
  ctx.font = `bold 30px ${FUENTE}`;
  const prodTxt = envolverTexto(ctx, producto || "", verificada ? 480 : cw - 240, 1)[0] || "";
  ctx.fillText(prodTxt, 150, 940);
  if (verificada) {
    const etiqueta = "Compra verificada";
    ctx.font = `600 26px ${FUENTE}`;
    const wE = ctx.measureText(etiqueta).width;
    const px = cx0 + cw - 60 - (wE + 92);
    rectRedondo(ctx, px, 892, wE + 92, 56, 28);
    ctx.fillStyle = "#ecfdf5";
    ctx.fill();
    dibujarCheck(ctx, px + 34, 920, 14, "#059669");
    ctx.fillStyle = "#047857";
    ctx.fillText(etiqueta, px + 60, 929);
  }

  if (ejemplo) {
    ctx.save();
    ctx.fillStyle = "rgba(220,38,38,.92)";
    ctx.fillRect(0, 0, W, 70);
    ctx.fillStyle = "#fff";
    ctx.font = `bold 32px ${FUENTE}`;
    ctx.textAlign = "center";
    ctx.fillText("EJEMPLO · reemplázala con una opinión real de tu cliente", W / 2, 48);
    ctx.translate(W / 2, H / 2 + 40);
    ctx.rotate(-Math.PI / 7);
    ctx.fillStyle = "rgba(220,38,38,.22)";
    ctx.font = `bold 170px ${FUENTE}`;
    ctx.fillText("EJEMPLO", 0, 0);
    ctx.restore();
  }
  return c;
}

const tarjetaABlob = (canvas) => new Promise((res) => canvas.toBlob(res, "image/png", 0.92));

const HOY_ISO = () => new Date().toISOString().slice(0, 10);

/* Ejemplos: enseñan el diseño. Van marcados y no se pueden subir ni enviar. */
const EJEMPLOS_TARJETA = [
  {
    nombre: "Nombre de tu cliente",
    ciudad: "Guayaquil",
    fecha: HOY_ISO(),
    estrellas: 5,
    titulo: "¡Superó lo que esperaba!",
    texto: "Aquí va, con sus palabras, lo que te escribió tu cliente al recibir el producto. Copia el mensaje tal cual y la tarjeta se arma sola.",
    semilla: 0,
    verificada: true,
  },
  {
    nombre: "Otro cliente",
    ciudad: "Quito",
    fecha: HOY_ISO(),
    estrellas: 5,
    titulo: "Llegó rapidísimo",
    texto: "Puedes subir la foto de perfil del cliente o dejar el avatar con sus iniciales. Cambia de color con «Otro avatar».",
    semilla: 2,
    verificada: true,
  },
  {
    nombre: "Un tercero",
    ciudad: "Cuenca",
    fecha: HOY_ISO(),
    estrellas: 4,
    titulo: "",
    texto: "El título es opcional y las estrellas van de 1 a 5 según lo que dijo. Con tres opiniones reales el botón ya convence.",
    semilla: 3,
    verificada: false,
  },
];

const FORM_TARJETA_VACIO = () => ({
  nombre: "",
  ciudad: "",
  fecha: HOY_ISO(),
  estrellas: 5,
  titulo: "",
  texto: "",
  semilla: Math.floor(Math.random() * PALETAS_AVATAR.length),
  verificada: true,
});

/* Campo con etiqueta del generador. Vive fuera del componente: definido
   adentro, React lo trataría como un componente nuevo en cada render y los
   inputs perderían el foco a cada tecla. */
const Campo = ({ etiqueta, children, ayuda }) => (
  <label className="block">
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</span>
    {children}
    {ayuda ? <span className="mt-0.5 block text-[11px] text-slate-400">{ayuda}</span> : null}
  </label>
);

function GeneradorTarjeta({ producto, subir, onCreada, onCerrar }) {
  const [form, setForm] = useState(FORM_TARJETA_VACIO);
  const [foto, setFoto] = useState(null); // HTMLImageElement
  const [guardando, setGuardando] = useState(false);
  const refFoto = useRef(null);
  const previa = useMemo(() => {
    try {
      return dibujarTarjetaOpinion({ ...form, foto, producto }).toDataURL("image/png");
    } catch {
      return null;
    }
  }, [form, foto, producto]);
  const listo = form.texto.trim().length >= 12 && form.nombre.trim().length >= 2;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const cargarFoto = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setFoto(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      Swal.fire({ icon: "error", title: "No se pudo leer la foto" });
    };
    img.src = url;
  };

  const crear = async () => {
    if (!listo) return;
    setGuardando(true);
    try {
      const blob = await tarjetaABlob(dibujarTarjetaOpinion({ ...form, foto, producto }));
      const file = new File([blob], `opinion_${Date.now()}.png`, { type: "image/png" });
      const r = await subir(file);
      onCreada({ tipo: "image", url: r.url, texto: "", retraso_seg: 2 });
      setForm(FORM_TARJETA_VACIO());
      setFoto(null);
      if (refFoto.current) refFoto.current.value = "";
    } catch (e) {
      Swal.fire({ icon: "error", title: "No se pudo crear la tarjeta", text: e?.response?.data?.message || e.message });
    } finally {
      setGuardando(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

  return (
    <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">
            <i className="bx bxs-star mr-1 text-indigo-500" />
            Crear tarjeta de opinión
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Copia lo que te dijo tu cliente (WhatsApp, comentario, reseña) tal cual lo escribió. La tarjeta se arma sola y se agrega al contenido.
          </p>
        </div>
        <button type="button" onClick={onCerrar} className="text-slate-400 hover:text-slate-700" title="Cerrar">
          <i className="bx bx-x text-xl" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        <div className="space-y-4">
          {/* 1. Lo que dijo */}
          <div className="rounded-lg border border-slate-200 p-3 space-y-3">
            <div className="text-xs font-semibold text-slate-700">1. Lo que dijo</div>
            <Campo etiqueta="Opinión del cliente">
              <textarea
                value={form.texto}
                onChange={(e) => set("texto", e.target.value.slice(0, 320))}
                rows={3}
                placeholder="Ej: Me llegó al día siguiente y es tal cual el video. El sonido es brutal y la batería me dura todo el día. Ya pedí otro para mi mamá."
                className={inputCls}
              />
              <span className="mt-0.5 block text-right text-[11px] text-slate-400">{form.texto.length}/320</span>
            </Campo>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3">
              <Campo etiqueta="Título corto (opcional)">
                <input
                  value={form.titulo}
                  onChange={(e) => set("titulo", e.target.value.slice(0, 60))}
                  placeholder="Ej: ¡Superó lo que esperaba!"
                  className={inputCls}
                />
              </Campo>
              <Campo etiqueta="Calificación">
                <select value={form.estrellas} onChange={(e) => set("estrellas", Number(e.target.value))} className={inputCls}>
                  {[5, 4, 3, 2, 1].map((k) => (
                    <option key={k} value={k}>
                      {"★".repeat(k)}
                      {"☆".repeat(5 - k)} {k} de 5
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </div>

          {/* 2. Quién lo dijo */}
          <div className="rounded-lg border border-slate-200 p-3 space-y-3">
            <div className="text-xs font-semibold text-slate-700">2. Quién lo dijo</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Campo etiqueta="Nombre">
                <input
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value.slice(0, 40))}
                  placeholder="Ej: María José A."
                  className={inputCls}
                />
              </Campo>
              <Campo etiqueta="Ciudad">
                <input
                  value={form.ciudad}
                  onChange={(e) => set("ciudad", e.target.value.slice(0, 40))}
                  placeholder="Ej: Guayaquil"
                  className={inputCls}
                />
              </Campo>
              <Campo etiqueta="Fecha">
                <input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} className={inputCls} />
              </Campo>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={refFoto}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => cargarFoto(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => refFoto.current?.click()}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <i className="bx bx-user-circle mr-1" />
                {foto ? "Cambiar foto de perfil" : "Subir foto de perfil"}
              </button>
              {foto ? (
                <button
                  type="button"
                  onClick={() => {
                    setFoto(null);
                    if (refFoto.current) refFoto.current.value = "";
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Quitar foto
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => set("semilla", form.semilla + 1)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  title="Sin foto, el avatar lleva las iniciales; esto cambia el color"
                >
                  <i className="bx bx-palette mr-1" />
                  Otro color de avatar
                </button>
              )}
              <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={form.verificada}
                  onChange={(e) => set("verificada", e.target.checked)}
                  className="rounded border-slate-300"
                />
                Mostrar «Compra verificada»
              </label>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-4 self-start">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Así se enviará</div>
          {previa ? <img src={previa} alt="" className="w-full max-w-[280px] rounded-xl shadow-md ring-1 ring-slate-200" /> : null}
          <div className="mt-3 flex flex-col gap-2 max-w-[280px]">
            <button
              type="button"
              disabled={!listo || guardando}
              onClick={crear}
              className="w-full rounded-lg bg-[#171931] px-4 py-2 text-sm font-medium text-white hover:bg-[#242a52] disabled:opacity-50"
            >
              {guardando ? "Creando…" : "Agregar tarjeta al contenido"}
            </button>
            <button type="button" onClick={onCerrar} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            {!listo ? (
              <span className="text-center text-[11px] text-slate-400">Falta la opinión (mín. 12 letras) y el nombre.</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContenidoBoton({ boton, bloque, onChange, subir, producto }) {
  const [generador, setGenerador] = useState(false);
  const ejemplos = useMemo(
    () => EJEMPLOS_TARJETA.map((e) => dibujarTarjetaOpinion({ ...e, producto: producto?.nombre, ejemplo: true }).toDataURL("image/png")),
    [producto?.nombre],
  );
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(0);
  const [arrastrando, setArrastrando] = useState(null);
  const items = bloque?.items || [];
  const setItems = (nuevos) => onChange({ ...bloque, items: nuevos });

  const agregarArchivos = async (files) => {
    const lista = Array.from(files || []).slice(0, MAX_ITEMS - items.length);
    if (!lista.length) return;
    setSubiendo(lista.length);
    const nuevos = [];
    for (const f of lista) {
      try {
        const r = await subir(f);
        nuevos.push({ tipo: r.tipo, url: r.url, texto: "", retraso_seg: 2 });
      } catch (e) {
        Swal.fire({ icon: "error", title: `No se pudo subir ${f.name}`, text: e?.response?.data?.message || e.message });
      } finally {
        setSubiendo((n) => n - 1);
      }
    }
    if (nuevos.length) setItems([...items, ...nuevos]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const soltar = (i) => {
    if (arrastrando == null || arrastrando === i) return;
    const copia = [...items];
    const [mov] = copia.splice(arrastrando, 1);
    copia.splice(i, 0, mov);
    setItems(copia);
    setArrastrando(null);
  };

  const quedan = MAX_ITEMS - items.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-800">
          Al tocar <span className="rounded bg-slate-100 px-1.5 py-0.5">{boton.titulo || "el botón"}</span> el cliente recibe:
        </div>
        <span className="text-xs text-slate-400">
          {items.length}/{MAX_ITEMS} archivos
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf"
        className="hidden"
        onChange={(e) => agregarArchivos(e.target.files)}
      />

      {/* Dos formas de agregar contenido, con el mismo peso visual */}
      {!generador && quedan > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={subiendo > 0}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer?.files?.length) agregarArchivos(e.dataTransfer.files);
            }}
            className="group flex items-start gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-white p-3 text-left hover:border-blue-400 hover:bg-blue-50/40 disabled:opacity-50"
          >
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <i className="bx bx-cloud-upload text-2xl" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-800">
                {subiendo > 0 ? `Subiendo ${subiendo}…` : "Subir fotos, capturas o video"}
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Capturas de WhatsApp con opiniones, fotos del producto en manos del cliente, un video corto o un PDF. Varias a la vez o arrástralas aquí.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setGenerador(true)}
            className="group flex items-start gap-3 rounded-xl border-2 border-indigo-200 bg-white p-3 text-left hover:border-indigo-400 hover:bg-indigo-50/40"
          >
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <i className="bx bxs-star text-2xl" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-800">Crear tarjeta de opinión</span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Pega lo que te escribió un cliente y se arma una tarjeta con su nombre, foto, estrellas y fecha, lista para enviar.
              </span>
              <span className="mt-2 flex gap-1.5">
                {ejemplos.map((src, i) => (
                  <img key={i} src={src} alt="" className="h-12 w-12 rounded-md object-cover ring-1 ring-slate-200" />
                ))}
                <span className="self-center text-[11px] font-medium text-indigo-600 group-hover:underline">Crear ahora →</span>
              </span>
            </span>
          </button>
        </div>
      ) : null}

      {generador ? (
        <GeneradorTarjeta
          producto={producto?.nombre}
          subir={subir}
          onCreada={(it) => setItems([...items, it])}
          onCerrar={() => setGenerador(false)}
        />
      ) : null}

      {items.length ? (
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
            <span>
              Se envían en este orden, uno tras otro. Arrastra para reordenar.
            </span>
            {quedan > 0 ? <span>Puedes agregar {quedan} más</span> : <span className="text-amber-700">Llegaste al máximo de {MAX_ITEMS}</span>}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {items.map((it, i) => (
              <div
                key={i}
                draggable
                onDragStart={() => setArrastrando(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => soltar(i)}
                onDragEnd={() => setArrastrando(null)}
                className={`group relative aspect-square rounded-xl border bg-slate-50 overflow-hidden cursor-grab ${
                  arrastrando === i ? "opacity-40" : ""
                } border-slate-200`}
                title="Arrastra para cambiar el orden"
              >
                {it.tipo === "image" ? (
                  <img src={it.url} alt="" className="h-full w-full object-cover" />
                ) : it.tipo === "video" ? (
                  <div className="h-full w-full bg-slate-800 text-white flex flex-col items-center justify-center gap-1">
                    <i className="bx bx-play-circle text-3xl" />
                    <span className="text-[10px]">Video</span>
                  </div>
                ) : it.tipo === "document" ? (
                  <div className="h-full w-full bg-red-50 text-red-500 flex flex-col items-center justify-center gap-1">
                    <i className="bx bxs-file-pdf text-3xl" />
                    <span className="text-[10px]">PDF</span>
                  </div>
                ) : (
                  <div className="h-full w-full bg-amber-50 text-amber-800 p-2 text-[11px] leading-snug overflow-hidden">
                    <i className="bx bx-text mr-1" />
                    {it.texto}
                  </div>
                )}
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setItems(items.filter((_, k) => k !== i))}
                  className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow group-hover:flex hover:bg-red-500 hover:text-white"
                  title="Quitar"
                >
                  <i className="bx bx-x" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Todavía no hay nada cargado: mientras tanto, al tocar el botón el bot le dirá al cliente que aún no hay opiniones publicadas y pasará directo a la pregunta de cierre.
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <label className="text-xs font-semibold text-slate-800">
          <i className="bx bx-message-rounded-dots mr-1 text-slate-500" />
          Para terminar, el bot pregunta:
        </label>
        <input
          value={bloque?.remate ?? ""}
          onChange={(e) => onChange({ ...bloque, items, remate: e.target.value })}
          placeholder="¿Te gustaría pedir 1, 2 o 3 unidades? 😊"
          className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <p className="text-[11px] text-slate-500 mt-1.5">
          Sale después del último archivo. Lo que el cliente responda lo toma el bot para seguir cerrando la venta.
        </p>
      </div>
    </div>
  );
}

/* Ventana de 24 h de WhatsApp: el mensaje con botones solo puede salir si el
   cliente escribió en las últimas 24 h. Los recordatorios se encadenan sin
   respuesta del cliente, así que lo que cuenta es el tiempo ACUMULADO desde
   su último mensaje. Pasado ese límite el cron manda la plantilla del
   remarketing general (sin botones). */
const LIMITE_VENTANA_MIN = 24 * 60;
const acumuladoHasta = (pasos, idx) =>
  pasos.slice(0, idx + 1).reduce((t, p) => t + (Number(p.minutos) || 0), 0);

/* Vista previa WhatsApp: muestra la conversación tal como la vería el
   cliente hasta el recordatorio activo (los anteriores quedaron sin
   respuesta), con el tiempo de espera entre uno y otro. */
function Previa({ config, pasoIdx, producto, vars, plantillas = [] }) {
  const pasos = config.pasos.slice(0, pasoIdx + 1);
  // Al cambiar de pestaña, la previa baja sola hasta el recordatorio activo:
  // con 3 recordatorios el tercero quedaba abajo y tocaba buscarlo a mano.
  const refActivo = useRef(null);
  const refLista = useRef(null);
  useEffect(() => {
    // Se desplaza SOLO la lista del teléfono (no la página ni el modal).
    const t = setTimeout(() => {
      const lista = refLista.current;
      const el = refActivo.current;
      if (!lista || !el) return;
      lista.scrollTo({ top: Math.max(0, el.offsetTop - 8), behavior: "smooth" });
    }, 60);
    return () => clearTimeout(t);
  }, [pasoIdx, config.pasos.length]);
  return (
    <div className="rounded-[26px] border-[6px] border-slate-900 bg-slate-900 shadow-xl w-[290px] mx-auto">
      <div className="rounded-[20px] overflow-hidden bg-[#e5ddd5]">
        <div className="bg-[#075e54] text-white px-3 py-2 text-xs flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-white/30" />
          <div className="leading-tight">
            <div className="font-semibold">Tu negocio</div>
            <div className="text-[10px] opacity-80">en línea</div>
          </div>
        </div>
        <div ref={refLista} className="relative p-3 space-y-2 h-[400px] overflow-y-auto">
          <div className="flex justify-start">
            <div className="bg-white rounded-lg rounded-tl-sm px-2.5 py-1.5 text-[12px] shadow-sm max-w-[85%]">
              Hola, quiero info del producto
            </div>
          </div>
          {pasos.map((paso, k) => {
            const fuera = acumuladoHasta(config.pasos, k) > LIMITE_VENTANA_MIN;
            const esActivo = k === pasoIdx;
            const tpl = fuera ? plantillas.find((t) => t.name === paso?.plantilla?.nombre_template) : null;

            let imagen = null;
            let texto = null;
            let pie = null;
            let botones = [];
            if (!fuera) {
              imagen = paso?.con_imagen ? config.imagen_url || producto.imagen_url : null;
              texto = rellenar(paso?.mensaje, vars);
              botones = paso?.con_botones ? botonesDelPaso(config, paso).map((b) => b.titulo || "Botón") : [];
            } else if (tpl) {
              const cab = cabeceraPlantilla(tpl);
              imagen = cab.header_format === "IMAGE" ? cab.header_media_url : null;
              texto = comp(tpl, "BODY")?.text || "";
              pie = comp(tpl, "FOOTER")?.text || null;
              botones = (comp(tpl, "BUTTONS")?.buttons || []).map((b) => b.text || "Botón");
            }

            return (
              <React.Fragment key={k}>
                <div className="text-center text-[10px] text-slate-500 py-1">
                  ⏱ {minutosATexto(paso?.minutos)}{" "}
                  {k === 0 ? "sin respuesta…" : "después del anterior, sigue sin responder…"}
                </div>
                <div
                  ref={esActivo ? refActivo : null}
                  className={`flex justify-end scroll-mt-2 ${esActivo ? "" : "opacity-60"}`}
                >
                  <div
                    className={`bg-[#dcf8c6] rounded-lg rounded-tr-sm shadow-sm max-w-[88%] overflow-hidden ${
                      esActivo && pasos.length > 1 ? "ring-2 ring-[#171931]/60" : ""
                    }`}
                  >
                    {imagen ? <img src={imagen} alt="" className="w-full max-h-40 object-cover" /> : null}
                    <div className="px-2.5 py-1.5 text-[12px] whitespace-pre-line break-words">
                      {fuera && !tpl ? (
                        <span className="text-slate-500 italic">
                          {paso?.plantilla?.nombre_template
                            ? `Plantilla «${paso.plantilla.nombre_template}»`
                            : "[Elige la plantilla de Meta para este recordatorio]"}
                        </span>
                      ) : (
                        texto || <span className="text-slate-400">Escribe el mensaje…</span>
                      )}
                    </div>
                    {pie ? <div className="px-2.5 pb-1 text-[10px] text-slate-500">{pie}</div> : null}
                    {botones.length ? (
                      <div className="border-t border-black/5 divide-y divide-black/5">
                        {botones.map((t, i) => (
                          <div key={i} className="text-center text-[12px] font-medium text-[#00a5f4] py-1.5 bg-white/40">
                            {t}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                {fuera && esActivo ? (
                  <div className="mx-2 rounded-lg bg-sky-100 px-2 py-1.5 text-[10.5px] text-sky-800 scroll-mb-2">
                    Fuera de las 24 h: sale como plantilla de Meta
                    {tpl ? "." : paso?.plantilla?.nombre_template ? "." : " (falta elegirla)."}
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* Esqueleto del modal mientras llega la configuración: misma estructura,
   para que al cargar solo se rellene. */
function Esqueleto() {
  const Linea = ({ w = "w-full", h = "h-3" }) => (
    <div className={`${w} ${h} rounded bg-slate-200/80 animate-pulse`} />
  );
  const Tarj = ({ children }) => (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-3">
        <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-slate-200 animate-pulse" />
        <div className="space-y-1.5 py-0.5">
          <Linea w="w-36" h="h-4" />
          <Linea w="w-72" h="h-3" />
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
  return (
    <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 p-4 md:p-5">
      <div className="space-y-4">
        {/* 1. Recordatorios: pestañas, tiempo, mensaje, opciones */}
        <Tarj>
          <div className="mb-4 flex items-center gap-4 border-b border-slate-200 pb-2">
            <Linea w="w-24" h="h-4" />
            <Linea w="w-24" h="h-4" />
            <Linea w="w-24" h="h-4" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Linea w="w-40" h="h-4" />
              <Linea w="w-28" h="h-8" />
            </div>
            <Linea w="w-full" h="h-24" />
            <div className="flex items-center gap-3">
              <Linea w="w-24" h="h-6" />
              <Linea w="w-24" h="h-6" />
              <Linea w="w-24" h="h-6" />
            </div>
          </div>
        </Tarj>
        {/* 2. Botones */}
        <Tarj>
          <div className="space-y-3">
            <Linea w="w-full" h="h-24" />
            <Linea w="w-full" h="h-24" />
          </div>
        </Tarj>
        {/* 3. Contenido */}
        <Tarj>
          <Linea w="w-full" h="h-28" />
        </Tarj>
        {/* 4. Después */}
        <Tarj>
          <div className="flex items-center gap-2">
            <Linea w="w-32" h="h-4" />
            <Linea w="w-56" h="h-8" />
          </div>
        </Tarj>
      </div>
      {/* Derecha: misma estructura que la previa real */}
      <div className="space-y-4 lg:sticky lg:top-0 self-start">
        <div className="flex justify-center">
          <Linea w="w-24" h="h-3" />
        </div>
        <div className="rounded-[26px] border-[6px] border-slate-900 bg-slate-900 shadow-xl w-[290px] mx-auto">
          <div className="rounded-[20px] overflow-hidden bg-[#e5ddd5]">
            <div className="bg-[#075e54] px-3 py-2 flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-white/30" />
              <div className="space-y-1">
                <div className="h-3 w-20 rounded bg-white/50 animate-pulse" />
                <div className="h-2 w-10 rounded bg-white/30 animate-pulse" />
              </div>
            </div>
            <div className="p-3 space-y-2 h-[400px]">
              <div className="h-7 w-3/5 rounded-lg bg-white/90 animate-pulse" />
              <div className="mx-auto h-3 w-2/5 rounded bg-slate-300/60 animate-pulse" />
              <div className="ml-auto w-[88%] rounded-lg bg-[#dcf8c6] overflow-hidden animate-pulse">
                <div className="h-28 bg-black/5" />
                <div className="h-16" />
                <div className="h-8 border-t border-black/5" />
                <div className="h-8 border-t border-black/5" />
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2 shadow-sm">
          <Linea w="w-44" h="h-4" />
          <Linea h="h-9" />
          <Linea h="h-9" />
          <Linea w="w-5/6" h="h-3" />
        </div>
      </div>
    </div>
  );
}

/* ── Modal ─────────────────────────────────────────────────────────── */
export default function EditorRemarketingProducto({ idConfiguracion, producto, columnas = [], onClose }) {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [config, setConfig] = useState(null);
  const [existe, setExiste] = useState(false);
  const [pasoPrevia, setPasoPrevia] = useState(0);
  const [telPrueba, setTelPrueba] = useState(localStorage.getItem("rmkp_tel_prueba") || "");
  const [probando, setProbando] = useState(false);
  const inputCabecera = useRef(null);
  const [subiendoCabecera, setSubiendoCabecera] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [cargandoPlantillas, setCargandoPlantillas] = useState(true);

  // Plantillas aprobadas de la cuenta, para los recordatorios que caen fuera
  // de las 24 h. Se cargan aparte para no frenar el modal.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await chatApi.post("whatsapp_managment/obtenerTemplatesWhatsapp", {
          id_configuracion: idConfiguracion,
          limit: 100,
        });
        const lista = data?.data || [];
        setPlantillas(lista.filter((t, i, self) => i === self.findIndex((x) => x.id === t.id)));
      } catch {
        setPlantillas([]);
      } finally {
        setCargandoPlantillas(false);
      }
    })();
  }, []); // eslint-disable-line

  const vars = useMemo(
    () => ({ nombre: "Daniela", producto: producto.nombre, precio: fmtPrecio(producto.precio) }),
    [producto],
  );

  useEffect(() => {
    (async () => {
      try {
        const { data } = await chatApi.post("/remarketing-producto/obtener", {
          id_configuracion: idConfiguracion,
          id_producto: producto.id,
        });
        const c = data.data.config;
        // Acciones antiguas ('ia') se muestran como «sigue cerrando».
        c.botones = (c.botones || []).map((b) => ({ ...b, accion: b.accion === "bloque" ? "bloque" : "cerrar" }));
        setConfig(c);
        setExiste(!!data.data.existe);
      } catch (e) {
        Swal.fire({ icon: "error", title: e?.response?.data?.message || e.message });
        onClose(false);
      } finally {
        setCargando(false);
      }
    })();
  }, []); // eslint-disable-line

  const subir = async (file) => {
    const fd = new FormData();
    fd.append("archivo", file);
    fd.append("id_configuracion", String(idConfiguracion));
    const { data } = await chatApi.post("/remarketing-producto/subir-media", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  };

  const set = (patch) => setConfig((c) => ({ ...c, ...patch }));
  const setPaso = (i, patch) => set({ pasos: config.pasos.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
  const setBoton = (i, patch) => set({ botones: config.botones.map((b, k) => (k === i ? { ...b, ...patch } : b)) });

  const botonesBloque = useMemo(() => (config?.botones || []).filter((b) => b.accion === "bloque"), [config]);
  // El recordatorio visible cae fuera de las 24 h: sale como plantilla, así que
  // botones y contenido no le aplican (sí a los otros recordatorios).
  const pasoActivoEsPlantilla = !!config && acumuladoHasta(config.pasos, pasoPrevia) > LIMITE_VENTANA_MIN;
  const pasosConBotones = config
    ? config.pasos.map((p, i) => i + 1).filter((n) => acumuladoHasta(config.pasos, n - 1) <= LIMITE_VENTANA_MIN)
    : [];

  const validar = () => {
    if (!config.pasos.length) return "Escribe el mensaje del recordatorio.";
    for (let i = 0; i < config.pasos.length; i++) {
      if (!String(config.pasos[i].mensaje || "").trim()) return `El recordatorio ${i + 1} no tiene mensaje.`;
    }
    for (const b of config.botones) {
      if (!String(b.titulo || "").trim()) return "Hay un botón sin texto.";
      if (largo(b.titulo) > MAX_TITULO) return `El botón «${b.titulo}» supera ${MAX_TITULO} caracteres.`;
    }
    for (const b of botonesBloque) {
      const bl = config.bloques?.[b.clave];
      if (!bl || (!(bl.items || []).length && !String(bl.remate || "").trim())) {
        return `El botón «${b.titulo}» manda contenido pero aún no le subiste nada.`;
      }
    }
    return null;
  };

  const guardar = async () => {
    const err = validar();
    if (err) return Swal.fire({ icon: "warning", title: err });
    setGuardando(true);
    try {
      await chatApi.post("/remarketing-producto/guardar", {
        id_configuracion: idConfiguracion,
        id_producto: producto.id,
        config,
      });
      Swal.fire({ icon: "success", title: "Guardado", timer: 1200, showConfirmButton: false });
      onClose(true);
    } catch (e) {
      Swal.fire({ icon: "error", title: e?.response?.data?.message || e.message });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    const r = await Swal.fire({
      icon: "warning",
      title: "¿Quitar el remarketing de este producto?",
      text: "El producto vuelve al remarketing normal de la columna. Lo que esté en cola se cancela.",
      showCancelButton: true,
      confirmButtonText: "Sí, quitar",
      cancelButtonText: "Cancelar",
    });
    if (!r.isConfirmed) return;
    try {
      await chatApi.post("/remarketing-producto/eliminar", { id_configuracion: idConfiguracion, id_producto: producto.id });
      onClose(true);
    } catch (e) {
      Swal.fire({ icon: "error", title: e?.response?.data?.message || e.message });
    }
  };

  const probar = async () => {
    const tel = String(telPrueba || "").replace(/\D/g, "");
    if (tel.length < 8) return Swal.fire({ icon: "warning", title: "Escribe tu número con código de país (ej. 593999999999)" });
    const err = validar();
    if (err) return Swal.fire({ icon: "warning", title: err });
    localStorage.setItem("rmkp_tel_prueba", tel);
    setProbando(true);
    try {
      await chatApi.post(
        "/remarketing-producto/probar",
        { id_configuracion: idConfiguracion, id_producto: producto.id, telefono: tel, paso: pasoPrevia + 1, config },
        { silentError: true },
      );
      Swal.fire({ icon: "success", title: "Enviado", text: "Revisa tu WhatsApp.", timer: 1500, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "No se pudo enviar", text: e?.response?.data?.message || e.message });
    } finally {
      setProbando(false);
    }
  };

  const subirCabecera = async (file) => {
    if (!file) return;
    setSubiendoCabecera(true);
    try {
      const r = await subir(file);
      if (r.tipo !== "image") throw new Error("La foto debe ser una imagen.");
      set({ imagen_url: r.url });
    } catch (e) {
      Swal.fire({ icon: "error", title: e?.response?.data?.message || e.message });
    } finally {
      setSubiendoCabecera(false);
      if (inputCabecera.current) inputCabecera.current.value = "";
    }
  };

  const fotoActual = config?.imagen_url || producto.imagen_url || "";
  // El paso visible cae fuera de las 24 h y no tiene mensaje libre: solo plantilla.
  const soloPlantilla =
    !!config &&
    acumuladoHasta(config.pasos, pasoPrevia) > LIMITE_VENTANA_MIN &&
    !String(config.pasos[pasoPrevia]?.mensaje || "").trim();

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 flex items-start justify-center p-2 md:p-5 overflow-y-auto">
      <div className="w-full max-w-6xl rounded-2xl bg-slate-50 shadow-2xl flex flex-col max-h-[96vh]">
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-3 rounded-t-2xl bg-white border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {producto.imagen_url ? (
              <img src={producto.imagen_url} alt="" className="h-11 w-11 rounded-lg object-cover bg-slate-100" />
            ) : null}
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Remarketing del producto</div>
              <div className="font-semibold text-slate-900 truncate">{producto.nombre}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {config ? (
              <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={config.activo !== false}
                  onChange={(e) => set({ activo: e.target.checked })}
                />
                {config.activo !== false ? "Activo" : "Pausado"}
                <span
                  className="text-slate-400 cursor-help"
                  title="Activo: este producto usa sus propios recordatorios. Pausado: se guarda lo configurado pero no se envía; mientras tanto actúa el remarketing general de la columna."
                >
                  <i className="bx bx-info-circle" />
                </span>
              </label>
            ) : null}
            <button type="button" onClick={() => onClose(false)} className="text-slate-400 hover:text-slate-700">
              <i className="bx bx-x text-2xl" />
            </button>
          </div>
        </div>

        {cargando || !config ? (
          <Esqueleto />
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 p-4 md:p-5">
            {/* ── Izquierda ── */}
            <div className="space-y-4">
              {/* 1. Recordatorios: una pestaña por recordatorio (hasta 3) */}
              <Tarjeta
                numero={1}
                titulo="Los recordatorios"
                ayuda="Le llegan al cliente que escribió por un anuncio de este producto y dejó de responder. Cada uno sale solo si tampoco respondió al anterior."
              >
                <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-200">
                  {config.pasos.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPasoPrevia(i)}
                      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                        pasoPrevia === i
                          ? "border-[#171931] text-[#171931]"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Recordatorio {i + 1}
                    </button>
                  ))}
                  {config.pasos.length < 3 ? (
                    <button
                      type="button"
                      onClick={() => {
                        set({
                          pasos: [
                            ...config.pasos,
                            {
                              minutos: MINUTOS_DEFECTO_POR_PASO[config.pasos.length] || 480,
                              mensaje: "",
                              con_imagen: false,
                              con_botones: true,
                              botones_titulos: TITULOS_DEFECTO_POR_PASO[config.pasos.length] || null,
                            },
                          ],
                        });
                        setPasoPrevia(config.pasos.length);
                      }}
                      className="-mb-px ml-1 inline-flex items-center gap-1 rounded-t-lg px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                    >
                      <i className="bx bx-plus" />
                      Agregar otro
                    </button>
                  ) : null}
                </div>

                {config.pasos.map((p, i) => {
                  if (i !== pasoPrevia) return null;
                  const acumulado = acumuladoHasta(config.pasos, i);
                  const fuera = acumulado > LIMITE_VENTANA_MIN;

                  const campos = (
                    <>
                      <MensajeConVariables
                        valor={p.mensaje}
                        onChange={(v) => setPaso(i, { mensaje: v })}
                        vars={vars}
                        placeholder="Hola 👋 vi que te interesó el producto y quedó pendiente…"
                      />

                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" checked={p.con_imagen !== false} onChange={(e) => setPaso(i, { con_imagen: e.target.checked })} />
                          Con foto
                        </label>
                        {p.con_imagen !== false ? (
                          <div className="flex items-center gap-2">
                            {fotoActual ? <img src={fotoActual} alt="" className="h-10 w-10 rounded-lg object-cover bg-slate-100" /> : null}
                            <input
                              ref={inputCabecera}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => subirCabecera(e.target.files?.[0])}
                            />
                            <button
                              type="button"
                              disabled={subiendoCabecera}
                              onClick={() => inputCabecera.current?.click()}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                            >
                              {subiendoCabecera ? "Subiendo…" : config.imagen_url ? "Cambiar foto" : "Usar otra foto"}
                            </button>
                            {config.imagen_url ? (
                              <button type="button" onClick={() => set({ imagen_url: null })} className="text-xs text-slate-500 hover:underline">
                                volver a la del producto
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">(la del producto)</span>
                            )}
                          </div>
                        ) : null}
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" checked={p.con_botones !== false} onChange={(e) => setPaso(i, { con_botones: e.target.checked })} />
                          Con botones
                        </label>
                      </div>

                      {i > 0 && p.con_botones !== false ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-sm font-medium text-slate-700">Texto de los botones en este recordatorio</div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Hacen lo mismo que en el recordatorio 1 (tarjeta 2); solo cambia cómo se leen, para no repetir.
                          </p>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {config.botones.map((b) => {
                              const t = p.botones_titulos?.[b.clave] ?? "";
                              return (
                                <div key={b.clave} className="flex items-center gap-2">
                                  <input
                                    value={t}
                                    onChange={(e) =>
                                      setPaso(i, { botones_titulos: { ...(p.botones_titulos || {}), [b.clave]: e.target.value } })
                                    }
                                    maxLength={MAX_TITULO + 4}
                                    placeholder={b.titulo || "Botón"}
                                    className={`w-full rounded-lg border bg-white px-3 py-1.5 text-sm ${
                                      largo(t) > MAX_TITULO ? "border-red-400" : "border-slate-300"
                                    }`}
                                  />
                                  <span className={`text-[11px] shrink-0 ${largo(t) > MAX_TITULO ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                                    {largo(t || b.titulo)}/{MAX_TITULO}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </>
                  );

                  return (
                    <div key={i} className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                        <span>{i === 0 ? "Enviar si no responde en" : "Enviar si tampoco responde en"}</span>
                        <select
                          value={p.minutos}
                          onChange={(e) => setPaso(i, { minutos: Number(e.target.value) })}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                        >
                          {OPCIONES_TIEMPO.map((o) => (
                            <option key={o.v} value={o.v}>
                              {o.l}
                            </option>
                          ))}
                          {!OPCIONES_TIEMPO.some((o) => o.v === Number(p.minutos)) ? (
                            <option value={p.minutos}>{minutosATexto(p.minutos)}</option>
                          ) : null}
                        </select>
                        {i > 0 ? (
                          <span className="text-xs text-slate-400">
                            ({minutosATexto(acumulado)} desde el último mensaje del cliente)
                          </span>
                        ) : null}
                        {i > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              set({ pasos: config.pasos.filter((_, k) => k !== i) });
                              setPasoPrevia(Math.max(0, i - 1));
                            }}
                            className="ml-auto text-xs text-red-500 hover:underline"
                          >
                            Quitar este recordatorio
                          </button>
                        ) : null}
                      </div>

                      {fuera ? (
                        <>
                          <SelectorPlantilla
                            paso={p}
                            acumulado={acumulado}
                            plantillas={plantillas}
                            cargando={cargandoPlantillas}
                            onChange={(plantilla) => setPaso(i, { plantilla })}
                          />
                          <p className="text-xs text-slate-500">
                            Aquí no van el mensaje ni los botones «Ver opiniones / Sí, lo quiero»: sale la
                            plantilla tal cual está aprobada en Meta. Si la plantilla trae botones, lo que el
                            cliente toque lo atiende el bot como cualquier respuesta.
                          </p>
                        </>
                      ) : (
                        campos
                      )}
                    </div>
                  );
                })}
              </Tarjeta>

              {pasoActivoEsPlantilla ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                  <b className="text-slate-800">Botones y contenido</b> no aplican al recordatorio {pasoPrevia + 1}: sale como
                  plantilla de Meta.{" "}
                  {pasosConBotones.length
                    ? `Se configuran en ${pasosConBotones.length === 1 ? "el recordatorio" : "los recordatorios"} ${pasosConBotones.join(" y ")}.`
                    : "Ningún recordatorio de este producto lleva botones."}
                </div>
              ) : null}

              {/* 2. Botones */}
              {pasoActivoEsPlantilla ? null : (
              <Tarjeta
                numero={2}
                titulo="Los botones"
                ayuda={`Hasta 3 botones de máximo ${MAX_TITULO} caracteres (límite de WhatsApp). Elige qué pasa al tocar cada uno.`}
                derecha={
                  config.botones.length < 3 ? (
                    <button
                      type="button"
                      onClick={() => set({ botones: [...config.botones, { clave: `boton_${config.botones.length + 1}`, titulo: "", accion: "cerrar" }] })}
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                    >
                      + Otro botón
                    </button>
                  ) : null
                }
              >
                <div className="space-y-3">
                  {config.botones.map((b, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <input
                          value={b.titulo}
                          onChange={(e) => setBoton(i, { titulo: e.target.value })}
                          maxLength={MAX_TITULO + 4}
                          placeholder="⭐ Ver opiniones"
                          className={`w-56 rounded-lg border bg-white px-3 py-2 text-sm ${largo(b.titulo) > MAX_TITULO ? "border-red-400" : "border-slate-300"}`}
                        />
                        <span className={`text-[11px] ${largo(b.titulo) > MAX_TITULO ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                          {largo(b.titulo)}/{MAX_TITULO}
                        </span>
                        {config.botones.length > 1 ? (
                          <button type="button" onClick={() => set({ botones: config.botones.filter((_, k) => k !== i) })} className="ml-auto text-xs text-red-500 hover:underline">
                            Quitar
                          </button>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { v: "bloque", t: "Manda contenido", d: "Capturas de opiniones, fotos, video o PDF y luego una pregunta para seguir." },
                          { v: "cerrar", t: "El bot sigue cerrando la venta", d: "Como siempre: responde dudas frecuentes y toma los datos del pedido." },
                        ].map((op) => (
                          <label
                            key={op.v}
                            className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm ${
                              b.accion === op.v ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <input type="radio" name={`accion_${i}`} checked={b.accion === op.v} onChange={() => setBoton(i, { accion: op.v })} className="mt-0.5" />
                            <span>
                              <span className="font-medium text-slate-800">{op.t}</span>
                              <span className="block text-xs text-slate-500">{op.d}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Tarjeta>
              )}

              {/* 3. Contenido */}
              {botonesBloque.length && !pasoActivoEsPlantilla ? (
                <Tarjeta
                  numero={3}
                  titulo="El contenido"
                  ayuda="Opiniones reales de clientes (capturas de WhatsApp o comentarios), fotos del producto en uso, un video corto."
                >
                  <div className="space-y-6">
                    {botonesBloque.map((b) => (
                      <ContenidoBoton
                        key={b.clave}
                        boton={b}
                        bloque={config.bloques?.[b.clave] || { items: [], remate: "" }}
                        subir={subir}
                        producto={producto}
                        onChange={(bl) => set({ bloques: { ...(config.bloques || {}), [b.clave]: bl } })}
                      />
                    ))}
                  </div>
                </Tarjeta>
              ) : null}

              {/* 4. Después */}
              <Tarjeta
                numero={botonesBloque.length && !pasoActivoEsPlantilla ? 4 : pasoActivoEsPlantilla ? 2 : 3}
                titulo={config.pasos.length > 1 ? "Si no responde a ningún recordatorio" : "Si no responde al recordatorio"}
                ayuda="Si el cliente responde en cualquier momento, la secuencia se corta y el bot sigue la conversación donde está."
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <span>{config.pasos.length > 1 ? `Después del recordatorio ${config.pasos.length}, mover el contacto a` : "Mover el contacto a"}</span>
                    <select
                      value={config.estado_destino || ""}
                      onChange={(e) => set({ estado_destino: e.target.value || null })}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                    >
                      <option value="">no mover (se queda donde está)</option>
                      {columnas.map((c) => (
                        <option key={c.estado_db} value={c.estado_db}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-slate-500">
                    {(() => {
                      const destino = columnas.find((c) => c.estado_db === config.estado_destino)?.nombre;
                      const n = config.pasos.length;
                      if (!destino) {
                        return n > 1
                          ? `El cliente se queda en Contacto inicial durante los ${n} recordatorios, también si no responde al último.`
                          : "El cliente se queda en Contacto inicial aunque no responda.";
                      }
                      if (n === 1) return `Sale el recordatorio y, si el cliente no responde, pasa a la columna ${destino}.`;
                      const previos = n === 2 ? "El recordatorio 1 lo deja" : `Los recordatorios ${Array.from({ length: n - 1 }, (_, i) => i + 1).join(" y ")} lo dejan`;
                      return `${previos} en Contacto inicial. Si tampoco responde al ${n}, pasa a la columna ${destino}.`;
                    })()}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Mientras este producto tenga su remarketing activo, la columna Contacto inicial no le manda los suyos.
                  </p>
                </div>
              </Tarjeta>
            </div>

            {/* ── Derecha ── */}
            <div className="space-y-4 lg:sticky lg:top-0 self-start">
              <div className="text-xs text-slate-500 text-center">
                Vista previa{config.pasos.length > 1 ? ` · recordatorio ${pasoPrevia + 1}` : ""}
              </div>
              <Previa config={config} pasoIdx={pasoPrevia} producto={producto} vars={vars} plantillas={plantillas} />
              <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2 shadow-sm">
                <div className="text-sm font-semibold text-slate-800">Mándamelo a mi WhatsApp</div>
                <input
                  value={telPrueba}
                  onChange={(e) => setTelPrueba(e.target.value)}
                  placeholder="593999999999"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={probando || soloPlantilla}
                  onClick={probar}
                  className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {probando ? "Enviando…" : "Enviar prueba"}
                </button>
                <p className="text-[11px] text-slate-500">
                  {soloPlantilla
                    ? "Este recordatorio sale como plantilla de Meta; las plantillas se prueban desde el chat con «Responder con plantilla»."
                    : "Tu número tiene que haberle escrito al negocio en las últimas 24 h."}
                </p>
              </div>
            </div>
          </div>
        )}

        {!cargando && config ? (
          <div className="flex items-center justify-between rounded-b-2xl bg-white border-t border-slate-200 px-5 py-3">
            <div>
              {existe ? (
                <button type="button" onClick={eliminar} className="text-sm text-red-500 hover:underline">
                  Quitar remarketing de este producto
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onClose(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardando}
                onClick={guardar}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
