// src/pages/productos2/wizard/WaPreview.jsx
// Simulación de WhatsApp dentro de un teléfono: el mensaje del cliente, el
// paquete de media (hasta 3 imágenes + 1 video), el mensaje fijo y, si se
// pasan, turnos extra (cliente/bot) para ilustrar lo que sigue. Presentacional.
import React, { useEffect, useRef } from "react";

const fondoWa = {
  backgroundColor: "#e5ddd5",
  backgroundImage:
    "radial-gradient(rgba(255,255,255,.35) 1px, transparent 1px)",
  backgroundSize: "14px 14px",
};

function Hora() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function Burbuja({ lado = "out", children, className = "", tag = null, remitente = null }) {
  const esOut = lado === "out";
  return (
    <div className={`flex ${esOut ? "justify-end" : "justify-start"} w-full`}>
      <div
        className={`relative max-w-[88%] rounded-lg px-2.5 py-1.5 text-[12px] leading-snug shadow-sm whitespace-pre-line break-words ${
          esOut
            ? "bg-[#dcf8c6] rounded-tr-sm text-slate-900"
            : "bg-white rounded-tl-sm text-slate-900"
        } ${className}`}
      >
        {remitente ? (
          <div className="text-[10.5px] font-bold text-slate-700 mb-0.5 leading-none">
            Enviado por {remitente}:
          </div>
        ) : null}
        {children}
        <div className="mt-1 flex items-center justify-end gap-1.5">
          {tag ? (
            <span className="rounded bg-black/5 px-1.5 py-0.5 text-[9.5px] font-mono text-slate-600">
              {tag}
            </span>
          ) : null}
          <span className="text-[9.5px] text-slate-400">
            <Hora />
            {esOut ? " ✓✓" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

function MediaBurbuja({ item }) {
  return (
    <Burbuja lado="out" className="!p-1.5">
      {item.tipo === "video" ? (
        <video
          src={item.url}
          className="h-28 w-32 rounded-md object-cover bg-black"
          muted
          playsInline
          controls
        />
      ) : (
        <img
          src={item.url}
          alt={item.etiqueta || "imagen"}
          className="h-28 w-32 rounded-md object-cover bg-slate-200"
          loading="lazy"
        />
      )}
    </Burbuja>
  );
}

export default function WaPreview({
  nombreNegocio = "Tu negocio",
  mensajeCliente = "Hola, quiero información",
  media = [],
  mensaje = "",
  extras = [],
  nota = null,
  children = null,
}) {
  const imagenes = media.filter((m) => m.tipo === "image").slice(0, 3);
  const videos = media.filter((m) => m.tipo === "video").slice(0, 1);
  const iniciales = String(nombreNegocio || "TN")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [extras.length, mensaje, media.length]);

  return (
    <div className="mx-auto w-full max-w-[300px]">
      {/* Marco del teléfono */}
      <div className="rounded-[2rem] bg-slate-900 p-2 shadow-2xl ring-1 ring-slate-700">
        <div
          className="rounded-[1.6rem] overflow-hidden bg-white flex flex-col"
          style={{ height: "min(760px, calc(93vh - 200px))", minHeight: 460 }}
        >
          {/* Barra de estado */}
          <div className="bg-[#075e54] text-white px-4 pt-1.5 pb-0.5 flex items-center justify-between text-[9.5px]">
            <span className="font-semibold">
              <Hora />
            </span>
            <span className="h-4 w-20 rounded-full bg-black/40" />
            <span className="flex items-center gap-1.5">
              <span className="flex items-end gap-[2px]" aria-hidden="true">
                <span className="block w-[3px] h-[4px] rounded-sm bg-white" />
                <span className="block w-[3px] h-[6px] rounded-sm bg-white" />
                <span className="block w-[3px] h-[8px] rounded-sm bg-white" />
                <span className="block w-[3px] h-[10px] rounded-sm bg-white" />
              </span>
              <i className="bx bx-wifi text-[13px]" />
              <i className="bx bxs-battery-full text-[14px]" />
            </span>
          </div>
          {/* Cabecera del chat */}
          <div className="flex items-center gap-2 bg-[#075e54] px-2.5 pb-2 text-white">
            <i className="bx bx-arrow-back text-lg opacity-80" />
            <div className="h-7 w-7 rounded-full bg-emerald-400 text-emerald-950 text-[11px] font-bold flex items-center justify-center">
              {iniciales || "TN"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold truncate">{nombreNegocio}</div>
              <div className="text-[11px] text-emerald-100">en línea</div>
            </div>
            <i className="bx bx-video text-lg opacity-80" />
            <i className="bx bx-phone text-lg opacity-80" />
          </div>

          {/* Conversación */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5"
            style={fondoWa}
          >
            <div className="flex justify-center">
              <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] text-slate-500 shadow-sm">
                Hoy
              </span>
            </div>
            {mensajeCliente ? (
              <Burbuja lado="in">{mensajeCliente}</Burbuja>
            ) : null}

            {imagenes.map((m, i) => (
              <MediaBurbuja key={`img-${i}-${m.url}`} item={m} />
            ))}
            {videos.map((m, i) => (
              <MediaBurbuja key={`vid-${i}-${m.url}`} item={m} />
            ))}

            {mensaje ? (
              <Burbuja lado="out" tag="sin IA" remitente="Mensaje fijo">
                {mensaje}
              </Burbuja>
            ) : (
              <Burbuja lado="out" className="text-slate-400 italic">
                Todavía no hay mensaje: completa los pasos anteriores.
              </Burbuja>
            )}

            {extras.map((e, i) => (
              <React.Fragment key={`extra-${i}`}>
                {e.cliente ? <Burbuja lado="in">{e.cliente}</Burbuja> : null}
                {/* Adjuntos del turno (pasos del flujo, IA, venta realizada):
                    salen ANTES del texto, igual que en el envío real. */}
                {Array.isArray(e.media)
                  ? e.media.map((m, k) => (
                      <MediaBurbuja key={`extra-${i}-media-${k}-${m.url}`} item={m} />
                    ))
                  : null}
                {e.bot ? (
                  <Burbuja lado="out" tag={e.tag || null} remitente={e.remitente || null}>
                    {e.bot}
                  </Burbuja>
                ) : null}
                {e.pensando ? (
                  <div className="flex justify-end">
                    <div className="rounded-xl bg-[#dcf8c6] px-3 py-2 text-[12px] text-slate-500 shadow-sm inline-flex items-center gap-2">
                      <i className="bx bx-loader-alt bx-spin" /> El bot está respondiendo…
                    </div>
                  </div>
                ) : null}
                {e.nota ? (
                  <div className="flex justify-center">
                    <span className="max-w-[92%] rounded-md bg-amber-50 ring-1 ring-amber-200 px-2 py-1 text-[10.5px] text-amber-800 text-center shadow-sm">
                      {e.nota}
                    </span>
                  </div>
                ) : null}
              </React.Fragment>
            ))}
          </div>

          {/* Caja de escritura (el simulador la reemplaza con children) */}
          <div className="border-t border-slate-200 bg-[#f0f2f5] px-2 py-1.5">
            {children ? (
              children
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-full bg-white px-3 py-1.5 text-[12px] text-slate-400">
                  Escribe un mensaje
                </div>
                <div className="h-8 w-8 rounded-full bg-[#00a884] text-white flex items-center justify-center">
                  <i className="bx bxs-microphone" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {nota ? (
        <div className="mt-2 text-center text-[11px] text-slate-500 px-2">
          {nota}
        </div>
      ) : null}
    </div>
  );
}
