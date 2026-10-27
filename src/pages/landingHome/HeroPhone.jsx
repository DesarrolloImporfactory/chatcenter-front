import React, { useEffect, useRef, useState } from "react";
import { FiZap, FiSend, FiCpu } from "react-icons/fi";
import { PRODUCT_IMG } from "./data";
import { NAVY } from "./ui";

/* Colores de WhatsApp dentro del teléfono. La pantalla imita la app real
 * (burbuja verde a la derecha, fondo beige con patrón, checks azules) para
 * que el visitante entienda en medio segundo que la venta pasa en el
 * WhatsApp de su cliente. La marca ImporChat vive en la cabecera (navy +
 * cyan) y en las señales de automatización, no en las burbujas. */
const WA = {
  fondo: "#EFEAE2",
  verde: "#D9FDD3",
  verdeOscuro: "#1FA855",
  texto: "#111B21",
  gris: "#667781",
  check: "#53BDEB",
};

/* Patrón sutil estilo WhatsApp: puntos y trazos en un SVG repetido. */
const PATRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23111b21' stroke-opacity='0.07' stroke-width='1.3' stroke-linecap='round'%3E%3Ccircle cx='18' cy='22' r='5'/%3E%3Cpath d='M58 14l8 8M66 14l-8 8'/%3E%3Cpath d='M92 30c6-6 14-6 20 0'/%3E%3Crect x='28' y='58' width='10' height='10' rx='2'/%3E%3Ccircle cx='78' cy='70' r='7'/%3E%3Cpath d='M100 96l6 6M106 96l-6 6'/%3E%3Cpath d='M12 100c5 4 10 4 15 0'/%3E%3Cpath d='M52 104l5-9 5 9z'/%3E%3C/g%3E%3C/svg%3E\")";

/* Marco de teléfono. El contenido va dentro de la pantalla. */
export const Telefono = ({ children }) => (
  <div className="relative mx-auto" style={{ width: 272, height: 552 }}>
    <div
      className="absolute inset-0 rounded-[44px] shadow-[0_40px_90px_rgba(0,0,0,0.5)]"
      style={{ background: "linear-gradient(145deg,#2b2f44,#0c0f1c)" }}
    />
    <div className="absolute inset-[3px] rounded-[41px] bg-black" />
    <div className="absolute inset-[6px] rounded-[38px] overflow-hidden bg-white">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[96px] h-[24px] bg-black rounded-b-2xl z-20" />
      <div className="relative w-full h-full overflow-hidden">{children}</div>
    </div>
    <div
      className="absolute inset-0 rounded-[44px] pointer-events-none"
      style={{ background: "linear-gradient(160deg,rgba(255,255,255,0.12) 0%,transparent 35%)" }}
    />
  </div>
);

/* Conversación que se reproduce sola y vuelve a empezar. Los mensajes
 * mezclan venta y agenda para que se vea que el agente hace ambas cosas. */
const MENSAJES = [
  { s: "l", t: "Hola, vi el proyector portátil en Instagram. ¿Sigue disponible?", h: "10:21" },
  {
    s: "r",
    t: "¡Hola! Sí, tenemos disponible 😊 El proyector portátil HD cuesta $89,99, con envío gratis y pagas al recibirlo. Te lo muestro:",
    h: "10:21",
    ai: true,
  },
  { s: "r", t: null, img: PRODUCT_IMG, h: "10:21", ai: true },
  { s: "l", t: "¿Se conecta al celular?", h: "10:22" },
  {
    s: "r",
    t: "Sí, por WiFi o con cable, y proyecta hasta 120 pulgadas. Viene con 12 meses de garantía. ¿Te lo envío?",
    h: "10:22",
    ai: true,
  },
  { s: "l", t: "Dale. María Paz Ruiz, Cumbayá, calle Francisco de Orellana 120", h: "10:23" },
  {
    s: "r",
    h: "10:23",
    ai: true,
    resumen: {
      titulo: "Pedido confirmado · #48213",
      filas: [
        ["Producto", "Proyector portátil HD × 1"],
        ["Total", "$89,99 · envío gratis"],
        ["Entrega", "Cumbayá, Quito · Fco. de Orellana 120"],
        ["Pago", "Contra entrega"],
        ["Llega", "24 a 48 horas"],
      ],
    },
  },
  {
    s: "r",
    t: "Listo, María Paz 🙌 Te aviso por aquí cuando salga con la guía.",
    h: "10:23",
    ai: true,
  },
];

/* Checks de leído como en WhatsApp. */
const Checks = () => (
  <svg width="14" height="9" viewBox="0 0 16 10" fill="none" aria-hidden>
    <path d="M1 5.2l2.6 2.6L9.4 2" stroke={WA.check} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 5.2l2.6 2.6L14.4 2" stroke={WA.check} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* Hora, checks y la marca "IA" al pie de cada burbuja. */
const Pie = ({ m }) => (
  <div className={`flex items-center gap-1 mt-0.5 ${m.s === "r" ? "justify-end" : ""}`}>
    {m.ai && (
      <span className="text-[7px] font-bold flex items-center gap-0.5" style={{ color: "#0E7FB5" }}>
        <FiZap size={7} /> IA
      </span>
    )}
    <span className="text-[7px]" style={{ color: WA.gris }}>
      {m.h}
    </span>
    {m.s === "r" && <Checks />}
  </div>
);

/* Ficha del pedido dentro de una burbuja del agente: el cierre se ve real,
 * con datos, no solo con un "listo". */
const Resumen = ({ r }) => (
  <div>
    <p className="text-[10px] font-extrabold flex items-center gap-1" style={{ color: WA.verdeOscuro }}>
      <span
        className="w-3.5 h-3.5 rounded-full grid place-items-center text-[8px] text-white"
        style={{ background: WA.verdeOscuro }}
      >
        ✓
      </span>
      {r.titulo}
    </p>
    <div className="mt-1.5 space-y-1 pt-1.5" style={{ borderTop: "1px solid rgba(17,27,33,0.1)" }}>
      {r.filas.map(([k, v]) => (
        <div key={k} className="flex gap-2 text-[9.5px] leading-snug">
          <span className="w-[46px] shrink-0" style={{ color: WA.gris }}>
            {k}
          </span>
          <span className="font-semibold" style={{ color: WA.texto }}>
            {v}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const burbuja = (lado) =>
  lado === "r"
    ? { background: WA.verde, boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)" }
    : { background: "#fff", boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)" };

export const ChatAnimado = () => {
  const [idx, setIdx] = useState(0);
  const [typing, setTyping] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (idx >= MENSAJES.length) {
      const t = setTimeout(() => setIdx(0), 5000);
      return () => clearTimeout(t);
    }
    setTyping(true);
    const d = MENSAJES[idx].s === "r" ? (MENSAJES[idx].resumen ? 2000 : 1500) : 950;
    const t = setTimeout(() => {
      setTyping(false);
      setIdx((p) => p + 1);
    }, d);
    return () => clearTimeout(t);
  }, [idx]);

  const vis = MENSAJES.slice(0, idx);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [vis.length, typing]);

  /* text-left: el hero está centrado y las burbujas lo heredaban, por eso la
   * segunda línea de cada mensaje salía centrada. */
  return (
    <div className="w-full h-full flex flex-col text-left" style={{ background: WA.fondo }}>
      <div className="px-3 pt-7 pb-2.5 flex items-center gap-2 shrink-0" style={{ background: NAVY }}>
        <div className="w-8 h-8 rounded-full bg-cyan-500/20 grid place-items-center">
          <FiCpu size={15} color="#38bdf8" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-white">Agente IA · Tu tienda</p>
          <p className="text-[8px] text-cyan-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            En línea 24/7
          </p>
        </div>
      </div>

      <div
        ref={ref}
        className="flex-1 px-3 py-3 space-y-2 overflow-y-auto"
        style={{ scrollbarWidth: "none", backgroundImage: PATRON }}
      >
        {vis.map((m, i) => (
          <div key={i} className={`${m.resumen ? "max-w-[92%]" : "max-w-[84%]"} ${m.s === "r" ? "ml-auto" : ""}`}>
            <div className={`rounded-xl px-2.5 py-1.5 ${m.s === "r" ? "rounded-tr-sm" : "rounded-tl-sm"}`} style={burbuja(m.s)}>
              {m.img ? (
                <img src={m.img} alt="Producto" className="w-full rounded-lg mt-0.5" style={{ height: 150, objectFit: "cover" }} />
              ) : m.resumen ? (
                <Resumen r={m.resumen} />
              ) : (
                <p className="text-[10.5px] leading-relaxed" style={{ color: WA.texto }}>
                  {m.t}
                </p>
              )}
              <Pie m={m} />
            </div>
          </div>
        ))}
        {typing && (
          <div className={`max-w-[35%] ${MENSAJES[idx]?.s === "r" ? "ml-auto" : ""}`}>
            <div className="rounded-xl px-3 py-2.5" style={burbuja(MENSAJES[idx]?.s)}>
              <div className="flex items-center gap-1">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 rounded-full animate-bounce"
                    style={{ animationDelay: `${d}ms`, background: MENSAJES[idx]?.s === "r" ? WA.verdeOscuro : "#8696A0" }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-2 py-2 shrink-0 flex items-center gap-2" style={{ background: "#F0F2F5" }}>
        <div className="flex-1 flex items-center bg-white rounded-full px-3 py-2">
          <span className="text-[9px]" style={{ color: "#8696A0" }}>
            Escribe un mensaje
          </span>
        </div>
        <div className="w-7 h-7 rounded-full grid place-items-center shrink-0" style={{ background: "#00A884" }}>
          <FiSend size={11} color="white" />
        </div>
      </div>
    </div>
  );
};

/* Mini chat estático para las pestañas de industrias. */
export const ChatEstatico = ({ mensajes }) => (
  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm text-left" style={{ background: WA.fondo }}>
    <div className="px-3 py-2 flex items-center gap-2" style={{ background: NAVY }}>
      <div className="w-6 h-6 rounded-full bg-cyan-500/20 grid place-items-center">
        <FiCpu size={12} color="#38bdf8" />
      </div>
      <p className="text-[10px] font-bold text-white">Agente IA</p>
      <span className="ml-auto text-[8px] text-cyan-400">● en línea</span>
    </div>
    <div className="p-3 space-y-2" style={{ backgroundImage: PATRON }}>
      {mensajes.map((m, i) => (
        <div key={i} className={`max-w-[86%] ${m.s === "r" ? "ml-auto" : ""}`}>
          <div
            className={`rounded-xl px-2.5 py-1.5 text-[11px] leading-relaxed ${m.s === "r" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
            style={{ ...burbuja(m.s), color: WA.texto }}
          >
            {m.t}
            {m.s === "r" && (
              <div className="flex justify-end items-center gap-1 mt-0.5">
                <span className="text-[7px] font-bold flex items-center gap-0.5" style={{ color: "#0E7FB5" }}>
                  <FiZap size={7} /> IA
                </span>
                <Checks />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);
