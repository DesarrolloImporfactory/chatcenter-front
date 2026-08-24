// src/pages/productos2/wizard/MediaManager.jsx
// El paquete de media del primer mensaje: hasta 3 imágenes y 1 video. La foto
// y el video del producto (catálogo) son siempre las primeras piezas —llegan
// por `fijos` y se cambian en el paso Producto—; aquí solo se agregan imágenes
// adicionales, subidas o generadas con IA (con la API key del negocio). Cada
// imagen generada se revisa en grande antes de sumarla; cualquier adicional se
// puede abrir, mover, quitar o convertir en la foto principal del producto.
import React, { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";

export const MAX_IMAGENES = 3;
export const MAX_VIDEOS = 1;

const PIEZAS_IA = [
  {
    tipo: "beneficios",
    label: "Beneficios",
    icon: "bx-badge-check",
    hint: "El producto con sus 4 beneficios como texto",
  },
  {
    tipo: "antes_despues",
    label: "Antes / después",
    icon: "bx-transfer-alt",
    hint: "Composición dividida con las dos frases",
  },
  {
    tipo: "logistica",
    label: "Logística",
    icon: "bx-package",
    hint: "Envío gratis · pagas al recibir · garantía",
  },
  {
    tipo: "libre",
    label: "Personalizada",
    icon: "bx-palette",
    hint: "Describe lo que quieres ver",
  },
];

const FRASES_GENERANDO = [
  "Preparando la composición…",
  "Colocando el producto en escena…",
  "Escribiendo los textos en la imagen…",
  "Ajustando luces y colores…",
  "Últimos detalles…",
];

const ESTILOS = `
@keyframes mmShimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
@keyframes mmReveal { 0% { opacity: 0; transform: scale(.92) translateY(8px); filter: blur(6px) } 60% { filter: blur(0) } 100% { opacity: 1; transform: none } }
@keyframes mmPulseRing { 0% { box-shadow: 0 0 0 0 rgba(79,70,229,.45) } 100% { box-shadow: 0 0 0 14px rgba(79,70,229,0) } }
@keyframes mmBar { 0% { width: 8% } 70% { width: 82% } 100% { width: 96% } }
@keyframes mmFadeIn { from { opacity: 0 } to { opacity: 1 } }
.mm-reveal { animation: mmReveal .55s cubic-bezier(.2,.9,.3,1.2) both }
.mm-skeleton { background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 40%, #e2e8f0 80%); background-size: 800px 100%; animation: mmShimmer 1.4s linear infinite }
.mm-ring { animation: mmPulseRing 1.4s ease-out infinite }
.mm-bar { animation: mmBar 45s cubic-bezier(.2,.6,.3,1) forwards }
.mm-fade { animation: mmFadeIn .2s ease-out both }
`;

function Lightbox({ item, titulo, children, onClose }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  if (!item) return null;
  return (
    <div
      className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 mm-fade"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden bg-white shadow-2xl mm-reveal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
          <div className="text-[13px] font-semibold text-slate-800">{titulo}</div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center"
            title="Cerrar"
          >
            <i className="bx bx-x text-2xl" />
          </button>
        </div>
        <div className="bg-slate-900 flex items-center justify-center max-h-[68vh]">
          {item.tipo === "video" ? (
            <video
              src={item.url}
              className="max-h-[68vh] w-auto max-w-full"
              controls
              autoPlay
              muted
              playsInline
            />
          ) : (
            <img
              src={item.url}
              alt={item.etiqueta || "imagen"}
              className="max-h-[68vh] w-auto max-w-full object-contain"
            />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-50 border-t border-slate-100">
          <div className="text-[12px] text-slate-500 truncate">
            {item.etiqueta || (item.tipo === "video" ? "Video" : "Imagen")}
            {item.origen === "ia" ? " · generada con IA" : ""}
            {item.origen === "producto" ? " · del catálogo" : ""}
          </div>
          <div className="flex flex-wrap items-center gap-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Miniatura({ item }) {
  return item.tipo === "video" ? (
    <video src={item.url} className="h-28 w-full object-cover bg-black" muted playsInline />
  ) : (
    <img
      src={item.url}
      alt={item.etiqueta || "imagen"}
      className="h-28 w-full object-cover"
      loading="lazy"
    />
  );
}

export default function MediaManager({
  idProducto,
  fijos = [], // foto y video del producto (catálogo): siempre van primero
  media = [], // adicionales del wizard
  onChange,
  onUsarComoPrincipal,
  bullets = [],
  textoAntes = "",
  textoDespues = "",
  iaDisponible = false,
  tipoVenta = "fisico",
}) {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [generando, setGenerando] = useState(null); // tipo en curso
  const [fraseIdx, setFraseIdx] = useState(0);
  const [instrucciones, setInstrucciones] = useState("");
  const [mostrarLibre, setMostrarLibre] = useState(false);
  const [candidata, setCandidata] = useState(null); // imagen generada, pendiente de aprobar
  const [abierta, setAbierta] = useState(null); // { item, indice, fijo } en vista grande
  const [recienAgregada, setRecienAgregada] = useState(null);

  const idc = Number(localStorage.getItem("id_configuracion"));
  const nImgFijas = fijos.filter((m) => m.tipo === "image").length;
  const nVidFijos = fijos.filter((m) => m.tipo === "video").length;
  const nImg = nImgFijas + media.filter((m) => m.tipo === "image").length;
  const nVid = nVidFijos + media.filter((m) => m.tipo === "video").length;
  const cupoImg = Math.max(0, MAX_IMAGENES - nImg);
  const cupoVid = Math.max(0, MAX_VIDEOS - nVid);

  useEffect(() => {
    if (!generando) return undefined;
    setFraseIdx(0);
    const t = setInterval(
      () => setFraseIdx((i) => (i + 1) % FRASES_GENERANDO.length),
      4500,
    );
    return () => clearInterval(t);
  }, [generando]);

  useEffect(() => {
    if (!recienAgregada) return undefined;
    const t = setTimeout(() => setRecienAgregada(null), 900);
    return () => clearTimeout(t);
  }, [recienAgregada]);

  const agregarItem = (item) => {
    if (!item?.url) return false;
    if (item.tipo === "video" && cupoVid <= 0) {
      Swal.fire({
        icon: "info",
        title: "Solo un video",
        text: nVidFijos
          ? "El video del producto ya ocupa el lugar del paquete. Cámbialo en el paso Producto."
          : "El paquete lleva como máximo un video. Quita el actual para reemplazarlo.",
      });
      return false;
    }
    if (item.tipo !== "video" && cupoImg <= 0) {
      Swal.fire({
        icon: "info",
        title: "Máximo 3 imágenes",
        text: "Quita una adicional para agregar otra.",
      });
      return false;
    }
    onChange([...media, item]);
    setRecienAgregada(item.url);
    return true;
  };

  const subirArchivos = async (files) => {
    const lista = Array.from(files || []);
    if (!lista.length) return;
    setSubiendo(true);
    try {
      for (const file of lista) {
        const fd = new FormData();
        fd.append("archivo", file);
        fd.append("id_configuracion", String(idc));
        const { data } = await chatApi.post("/producto-wizard/subir-media", fd, {
          headers: { "Content-Type": "multipart/form-data" },
          silentError: true,
        });
        const item = data?.data;
        if (item?.url) {
          onChange((prev) => {
            const lst = Array.isArray(prev) ? prev : media;
            const imgs = nImgFijas + lst.filter((m) => m.tipo === "image").length;
            const vids = nVidFijos + lst.filter((m) => m.tipo === "video").length;
            if (item.tipo === "video" ? vids >= MAX_VIDEOS : imgs >= MAX_IMAGENES) {
              return lst;
            }
            return [...lst, { ...item, etiqueta: item.etiqueta || file.name }];
          });
          setRecienAgregada(item.url);
        }
      }
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "No se pudo subir",
        text: e?.response?.data?.message || e.message,
      });
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const generar = async (tipo) => {
    if (cupoImg <= 0) {
      Swal.fire({
        icon: "info",
        title: "Máximo 3 imágenes",
        text: "Quita una adicional para generar otra.",
      });
      return;
    }
    if (tipo === "antes_despues" && tipoVenta === "natural_salud") {
      const { isConfirmed } = await Swal.fire({
        icon: "warning",
        title: "Antes/después en productos de salud",
        html:
          "Un antes/después <b>generado</b> en productos de salud es publicidad engañosa y Meta lo rechaza. Lo recomendable es subir dos fotos reales.<br/><br/>Si igual la generas, queda marcada como <i>ilustrativa</i>.",
        showCancelButton: true,
        confirmButtonText: "Generar igual",
        cancelButtonText: "Subir fotos reales",
      });
      if (!isConfirmed) return;
    }
    setGenerando(tipo);
    try {
      const { data } = await chatApi.post(
        "/producto-wizard/generar-imagen",
        {
          id_configuracion: idc,
          id_producto: idProducto,
          tipo,
          bullets,
          texto_antes: textoAntes,
          texto_despues: textoDespues,
          instrucciones_extra: tipo === "libre" ? instrucciones : "",
        },
        { silentError: true, timeout: 200000 },
      );
      const item = data?.data;
      if (item?.url) {
        const etiqueta =
          tipo === "antes_despues" && tipoVenta === "natural_salud"
            ? `${item.etiqueta} (ilustrativa)`
            : item.etiqueta;
        // No se suma directo: se muestra en grande para aprobarla.
        setCandidata({ ...item, etiqueta, pieza: tipo });
      }
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "No se pudo generar",
        text:
          e?.response?.data?.message ||
          "OpenAI no respondió. Revisa tu API key y el saldo en Asistentes.",
      });
    } finally {
      setGenerando(null);
    }
  };

  const mover = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= media.length) return;
    const copia = [...media];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onChange(copia);
  };
  const quitar = (i) => onChange(media.filter((_, k) => k !== i));

  const piezaEnCurso = PIEZAS_IA.find((p) => p.tipo === generando);
  const sinFotoProducto = nImgFijas === 0;

  return (
    <div className="space-y-3 min-w-0">
      <style>{ESTILOS}</style>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-slate-800">
            Fotos y video del primer mensaje
          </div>
          <p className="text-[12px] text-slate-500 leading-snug">
            Orden de envío: la imagen principal del producto, las imágenes
            adicionales que agregues aquí (hasta {MAX_IMAGENES} en total) y, al
            final, el video. Haz clic en una pieza para verla en grande.
          </p>
        </div>
        <div className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
          <span className={nImg >= MAX_IMAGENES ? "text-amber-600 font-bold" : ""}>
            {nImg}/{MAX_IMAGENES} img
          </span>{" "}
          ·{" "}
          <span className={nVid >= MAX_VIDEOS ? "text-amber-600 font-bold" : ""}>
            {nVid}/{MAX_VIDEOS} video
          </span>
        </div>
      </div>

      {sinFotoProducto ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          El producto no tiene foto principal. Súbela en el paso Producto o genera
          una con IA y elige “Usar como foto principal”.
        </div>
      ) : null}

      {/* Lista en el orden REAL de envío: imagen principal, imágenes
          adicionales y, al final, el video (el sistema siempre manda las
          imágenes antes que el video). Las adicionales se reordenan entre sí. */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {fijos
          .filter((m) => m.tipo === "image")
          .map((m, i) => (
          <div
            key={`fijo-${m.url}-${i}`}
            className="relative rounded-xl overflow-hidden border-2 border-indigo-200 bg-slate-50 cursor-zoom-in"
            onClick={() => setAbierta({ item: m, indice: i, fijo: true })}
            title="Imagen principal del producto: se cambia en el paso Producto"
          >
            <Miniatura item={m} />
            <div className="absolute top-1 left-1 flex items-center gap-1">
              <span className="rounded bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 font-mono">
                1
              </span>
              <span className="rounded bg-indigo-600 text-white text-[10px] px-1.5 py-0.5">
                Imagen principal
              </span>
            </div>
            <div className="px-2 py-1 text-[11px] text-slate-600 truncate flex items-center gap-1">
              <i className="bx bx-lock-alt text-slate-400" />
              {m.etiqueta || "Imagen"}
            </div>
          </div>
        ))}

        {media.map((m, i) => (
          <div
            key={`${m.url}-${i}`}
            className={`relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group cursor-zoom-in ${
              recienAgregada === m.url ? "mm-reveal" : ""
            }`}
            onClick={() => setAbierta({ item: m, indice: i, fijo: false })}
          >
            <Miniatura item={m} />
            <div className="absolute top-1 left-1 flex items-center gap-1">
              <span className="rounded bg-black/65 text-white text-[10px] px-1.5 py-0.5 font-mono">
                {m.tipo === "video"
                  ? nImg + 1
                  : nImgFijas +
                    media.filter((x, k) => x.tipo === "image" && k <= i).length}
              </span>
              <span className="rounded bg-black/65 text-white text-[10px] px-1.5 py-0.5">
                {m.tipo === "video" ? "Video" : m.origen === "ia" ? "IA" : "Subida"}
              </span>
            </div>
            <div className="px-2 py-1 text-[11px] text-slate-600 truncate">
              {m.etiqueta || (m.tipo === "video" ? "Video" : "Imagen")}
            </div>
            <div
              className="absolute inset-x-0 bottom-6 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => mover(i, -1)}
                className="h-6 w-6 rounded bg-white/95 text-slate-700 text-sm shadow"
                title="Mover antes"
              >
                <i className="bx bx-chevron-left" />
              </button>
              <button
                type="button"
                onClick={() => quitar(i)}
                className="h-6 w-6 rounded bg-white/95 text-rose-600 text-sm shadow"
                title="Quitar"
              >
                <i className="bx bx-trash" />
              </button>
              <button
                type="button"
                onClick={() => mover(i, 1)}
                className="h-6 w-6 rounded bg-white/95 text-slate-700 text-sm shadow"
                title="Mover después"
              >
                <i className="bx bx-chevron-right" />
              </button>
            </div>
          </div>
        ))}

        {fijos
          .filter((m) => m.tipo === "video")
          .map((m, i) => (
          <div
            key={`fijo-video-${m.url}-${i}`}
            className="relative rounded-xl overflow-hidden border-2 border-indigo-200 bg-slate-50 cursor-zoom-in"
            onClick={() => setAbierta({ item: m, indice: i, fijo: true })}
            title="Video del producto: siempre se envía al final, después de las imágenes"
          >
            <Miniatura item={m} />
            <div className="absolute top-1 left-1 flex items-center gap-1">
              <span className="rounded bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 font-mono">
                {nImg + 1}
              </span>
              <span className="rounded bg-indigo-600 text-white text-[10px] px-1.5 py-0.5">
                Video · al final
              </span>
            </div>
            <div className="px-2 py-1 text-[11px] text-slate-600 truncate flex items-center gap-1">
              <i className="bx bx-lock-alt text-slate-400" />
              {m.etiqueta || "Video"}
            </div>
          </div>
        ))}

        {/* Tarjeta de generación en curso */}
        {generando ? (
          <div className="relative rounded-xl overflow-hidden border border-indigo-200 bg-white">
            <div className="h-28 w-full mm-skeleton relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center mm-ring">
                  <i className="bx bx-magic-wand text-lg" />
                </div>
                <div className="text-[11px] font-semibold text-indigo-900">
                  {piezaEnCurso?.label || "Imagen"}
                </div>
              </div>
            </div>
            <div className="px-2 pt-1.5 pb-2">
              <div className="h-1 w-full rounded-full bg-indigo-100 overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full mm-bar" />
              </div>
              <div className="text-[10.5px] text-indigo-700 mt-1 truncate">
                {FRASES_GENERANDO[fraseIdx]}
              </div>
            </div>
          </div>
        ) : null}

        {/* Subir */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subiendo || (cupoImg <= 0 && cupoVid <= 0)}
          className="h-[148px] rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-500 text-xs flex flex-col items-center justify-center gap-1 disabled:opacity-50"
        >
          {subiendo ? (
            <i className="bx bx-loader-alt bx-spin text-2xl" />
          ) : (
            <i className="bx bx-cloud-upload text-2xl" />
          )}
          <span>{subiendo ? "Subiendo…" : "Subir imagen adicional"}</span>
          <span className="text-[10px] text-slate-400">
            JPG · PNG{cupoVid > 0 ? " · MP4" : ""} · hasta 16 MB
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={cupoVid > 0 ? "image/*,video/mp4,video/quicktime,video/webm" : "image/*"}
          multiple
          className="hidden"
          onChange={(e) => subirArchivos(e.target.files)}
        />
      </div>

      {/* Generar con IA */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-2 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[12.5px] font-semibold text-indigo-900 flex items-center gap-1.5">
            <i className="bx bx-magic-wand" /> Generar imagen con IA
          </div>
          {iaDisponible ? (
            <span className="text-[11px] text-indigo-700/80">
              Usa tu API key de OpenAI y la foto del producto como referencia
            </span>
          ) : (
            <span className="text-[11px] text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-full px-2 py-0.5">
              Conecta tu API key en Asistentes
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PIEZAS_IA.map((p) => {
            const activa = p.tipo === "libre" ? mostrarLibre : false;
            return (
              <button
                key={p.tipo}
                type="button"
                disabled={!iaDisponible || Boolean(generando) || cupoImg <= 0}
                onClick={() =>
                  p.tipo === "libre" ? setMostrarLibre((v) => !v) : generar(p.tipo)
                }
                className={`min-w-0 rounded-lg border bg-white px-2.5 py-2 text-left hover:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition ${
                  activa ? "border-indigo-500 ring-2 ring-indigo-100" : "border-indigo-200"
                }`}
                title={p.hint}
              >
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-800 min-w-0">
                  {generando === p.tipo ? (
                    <i className="bx bx-loader-alt bx-spin text-indigo-600 shrink-0" />
                  ) : (
                    <i className={`bx ${p.icon} text-indigo-600 shrink-0`} />
                  )}
                  <span className="truncate">{p.label}</span>
                </div>
                <div className="text-[10.5px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                  {p.hint}
                </div>
              </button>
            );
          })}
        </div>
        {mostrarLibre ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && instrucciones.trim() && generar("libre")}
              placeholder="Ejemplo: el producto sobre una mesa de madera con luz cálida y el texto OFERTA en rojo"
              className="flex-1 min-w-0 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="button"
              disabled={!iaDisponible || Boolean(generando) || !instrucciones.trim()}
              onClick={() => generar("libre")}
              className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
            >
              {generando === "libre" ? "Generando…" : "Generar"}
            </button>
          </div>
        ) : null}
        {generando ? (
          <div className="flex items-center gap-2 text-[11.5px] text-indigo-800">
            <i className="bx bx-loader-alt bx-spin" />
            Generando “{piezaEnCurso?.label}”. Suele tardar entre 20 y 60 segundos;
            al terminar podrás verla en grande y decidir si la usas.
          </div>
        ) : null}
        {cupoImg <= 0 && !generando ? (
          <div className="text-[11px] text-slate-500">
            El paquete ya tiene {MAX_IMAGENES} imágenes. Quita una adicional para generar otra.
          </div>
        ) : null}
      </div>

      {/* Imagen generada: aprobar o descartar */}
      <Lightbox
        item={candidata}
        titulo="Imagen generada — ¿la sumamos al paquete?"
        onClose={() => setCandidata(null)}
      >
        <button
          type="button"
          onClick={() => setCandidata(null)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white"
        >
          Descartar
        </button>
        <button
          type="button"
          disabled={Boolean(generando)}
          onClick={() => {
            const pieza = candidata?.pieza;
            setCandidata(null);
            if (pieza) generar(pieza);
          }}
          className="rounded-lg border border-indigo-200 text-indigo-700 px-3 py-1.5 text-xs font-semibold hover:bg-indigo-50 disabled:opacity-50"
        >
          Generar otra versión
        </button>
        {onUsarComoPrincipal ? (
          <button
            type="button"
            onClick={() => {
              const it = candidata;
              setCandidata(null);
              if (it) onUsarComoPrincipal(it.url);
            }}
            className="rounded-lg border border-emerald-300 text-emerald-700 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-50"
            title="Pasa a ser la foto del producto en el catálogo y la primera del paquete"
          >
            Usar como foto principal
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            const it = candidata;
            setCandidata(null);
            if (it) agregarItem(it);
          }}
          className="rounded-lg bg-emerald-600 text-white px-4 py-1.5 text-xs font-semibold hover:bg-emerald-700 inline-flex items-center gap-1.5"
        >
          <i className="bx bx-check" /> Perfecto, me la quedo
        </button>
      </Lightbox>

      {/* Pieza del paquete en grande */}
      <Lightbox
        item={abierta?.item}
        titulo={
          abierta?.fijo
            ? abierta.item.tipo === "video"
              ? "Video del producto"
              : "Foto principal del producto"
            : `Imagen adicional ${abierta ? abierta.indice + 1 : ""}`
        }
        onClose={() => setAbierta(null)}
      >
        {abierta?.fijo ? (
          <span className="text-[11.5px] text-slate-500">
            Se cambia en el paso Producto.
          </span>
        ) : (
          <>
            {onUsarComoPrincipal && abierta?.item?.tipo === "image" ? (
              <button
                type="button"
                onClick={() => {
                  const it = abierta?.item;
                  setAbierta(null);
                  if (it) onUsarComoPrincipal(it.url);
                }}
                className="rounded-lg border border-emerald-300 text-emerald-700 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-50"
              >
                Usar como foto principal
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (abierta) quitar(abierta.indice);
                setAbierta(null);
              }}
              className="rounded-lg border border-rose-200 text-rose-600 px-3 py-1.5 text-xs font-semibold hover:bg-rose-50"
            >
              Quitar del paquete
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setAbierta(null)}
          className="rounded-lg bg-[#171931] text-white px-4 py-1.5 text-xs font-semibold"
        >
          Cerrar
        </button>
      </Lightbox>
    </div>
  );
}
