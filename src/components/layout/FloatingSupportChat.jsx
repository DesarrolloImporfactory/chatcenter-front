import { useState, useEffect, useRef, useCallback } from "react";
import chatApi from "../../api/chatcenter";
import { MetricasRespuesta } from "./asistenteMetricas";

/**
 * FloatingSupportChat — Asistente de la cuenta (botón flotante)
 *
 * Responde preguntas con datos reales de la cuenta seleccionada: guías Dropi
 * por estado, transportadoras, ciudades, productos más vendidos y pedidos
 * Aliclik. Backend: POST asistente_cuenta/preguntar (valida que la
 * configuración pertenezca a la sesión).
 *
 * Diseño "Lienzo" con las métricas del "Tablero": pide formato "tablero", así
 * las cifras llegan en `datos` y se dibujan como tarjetas (asistenteMetricas)
 * y el texto del modelo queda como una conclusión corta.
 */

const WA_SUPPORT_NUMBER = "593998979214";

// Sin conexión elegida: arranque del negocio (módulo 1 y 2 del curso).
const SUGERENCIAS_GENERAL = [
  { icon: "bxl-whatsapp", texto: "¿Cómo conecto mi número a WhatsApp Business?" },
  { icon: "bx-buildings", texto: "¿Cómo creo mi portafolio comercial en Meta?" },
  { icon: "bx-package", texto: "¿Cómo creo mi cuenta en Dropi?" },
  { icon: "bx-rocket", texto: "¿Qué necesito para empezar a vender?" },
];

const SUGERENCIAS = [
  { icon: "bx-bar-chart-alt-2", texto: "¿Cuántas guías tengo por estado este mes?" },
  { icon: "bx-package", texto: "¿Cuáles son mis 5 productos más vendidos?" },
  { icon: "bxs-truck", texto: "¿Qué transportadora me entrega mejor?" },
  { icon: "bx-undo", texto: "¿Cuántas devoluciones tuve la semana pasada?" },
];

// Orbe de marca (marino → cian) del avatar y del botón flotante.
const ORBE = {
  background:
    "conic-gradient(from 200deg, #0e7490, #22d3ee, #0a1628, #0e7490)",
};

function IconoChispa({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.5l-1.8-5L5 9.7l5.2-1.8z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </svg>
  );
}

/* ─── Markdown simple renderer ─── */
function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let listItems = [];
  let listType = null;

  const flushList = () => {
    if (listItems.length > 0) {
      const Tag = listType === "ol" ? "ol" : "ul";
      const cls =
        listType === "ol"
          ? "list-decimal pl-4 my-1 space-y-0.5 marker:text-cyan-700"
          : "list-disc pl-4 my-1 space-y-0.5 marker:text-cyan-700";
      elements.push(
        <Tag key={`list-${elements.length}`} className={cls}>
          {listItems.map((item, i) => (
            <li
              key={i}
              className={item.anidado ? "ml-4 list-[circle]" : undefined}
            >
              {renderInline(item.texto)}
            </li>
          ))}
        </Tag>,
      );
      listItems = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Un ítem indentado es sublista del ítem anterior: se queda en la lista
    // abierta aunque cambie el tipo de viñeta.
    const itemMatch = line.match(/^(\s*)(?:([-*])|(\d+)[.)])\s+(.+)/);
    if (itemMatch) {
      const anidado = itemMatch[1].length >= 2 && listItems.length > 0;
      const tipo = itemMatch[2] ? "ul" : "ol";
      if (!anidado) {
        if (listType && listType !== tipo) flushList();
        listType = tipo;
      }
      listItems.push({ texto: itemMatch[4], anidado });
      continue;
    }

    flushList();

    if (line.trim() === "") {
      elements.push(<div key={`br-${i}`} className="h-1.5" />);
      continue;
    }

    const heading = line.match(/^#{1,6}\s+(.+)/);
    elements.push(
      <p key={`p-${i}`} className={heading ? "my-0 font-semibold" : "my-0"}>
        {renderInline(heading ? heading[1] : line)}
      </p>,
    );
  }

  flushList();

  return <>{elements}</>;
}

/* ─── Inline markdown: bold, italic, links, code ─── */
function renderInline(text) {
  if (!text) return null;

  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const patterns = [
      { regex: /\*\*(.+?)\*\*/, type: "bold" },
      { regex: /\*(.+?)\*/, type: "italic" },
      { regex: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/, type: "link" },
      { regex: /`([^`]+)`/, type: "code" },
    ];

    let firstMatch = null;
    let firstIndex = Infinity;
    let matchedPattern = null;

    for (const p of patterns) {
      const m = remaining.match(p.regex);
      if (m && m.index < firstIndex) {
        firstMatch = m;
        firstIndex = m.index;
        matchedPattern = p.type;
      }
    }

    if (!firstMatch) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    if (firstIndex > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, firstIndex)}</span>);
    }

    switch (matchedPattern) {
      case "bold":
        parts.push(
          <strong key={key++} className="font-semibold">
            {firstMatch[1]}
          </strong>,
        );
        break;
      case "italic":
        parts.push(
          <em key={key++} className="italic">
            {firstMatch[1]}
          </em>,
        );
        break;
      case "link":
        parts.push(
          <a
            key={key++}
            href={firstMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-600 underline hover:text-cyan-800 break-all"
          >
            {firstMatch[1]}
          </a>,
        );
        break;
      case "code":
        parts.push(
          <code
            key={key++}
            className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs font-mono"
          >
            {firstMatch[1]}
          </code>,
        );
        break;
      default:
        break;
    }

    remaining = remaining.slice(firstIndex + firstMatch[0].length);
  }

  return <>{parts}</>;
}

function buildWhatsAppLink(context) {
  const baseMsg = context
    ? `Hola, necesito ayuda con: ${context}`
    : "Hola, necesito ayuda con la plataforma ImporChat";
  return `https://wa.me/${WA_SUPPORT_NUMBER}?text=${encodeURIComponent(baseMsg)}`;
}

/* ─── Componente ─── */
export default function FloatingSupportChat({
  idConfiguracion: propIdConf,
  general: forzarGeneral = false,
  bottomClass,
  position = "right",
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const chatRef = useRef(null);

  const idConf =
    propIdConf ||
    parseInt(localStorage.getItem("id_configuracion"), 10) ||
    null;
  const nombreCuenta = localStorage.getItem("nombre_configuracion") || "";
  // Modo general: sin conexión elegida (o forzado desde la pantalla de
  // conexiones, donde localStorage puede tener un id viejo).
  const general = forzarGeneral || !idConf;

  const isLeft = position === "left";
  const sideClass = isLeft ? "left-6" : "right-6";
  const originClass = isLeft ? "origin-bottom-left" : "origin-bottom-right";
  const fabBottom = bottomClass || "bottom-6";
  const panelBottom = bottomClass ? "bottom-40" : "bottom-24";

  // La conversación es de una cuenta: al cambiar de configuración se reinicia.
  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [idConf]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (open && chatRef.current && !chatRef.current.contains(e.target)) {
        const fab = document.getElementById("support-fab");
        if (fab && fab.contains(e.target)) return;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const enviar = useCallback(
    async (texto) => {
      const text = (texto ?? input).trim();
      if (!text || loading) return;

      const newMessages = [...messages, { role: "user", content: text }];
      setMessages(newMessages);
      setInput("");
      setLoading(true);

      try {
        const res = await chatApi.post("asistente_cuenta/preguntar", {
          ...(general ? {} : { id_configuracion: idConf }),
          formato: "tablero",
          messages: newMessages
            .filter((m) => !m.error)
            .map((m) => ({ role: m.role, content: m.content })),
        });
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: res.data?.respuesta || "",
            datos: Array.isArray(res.data?.datos) ? res.data.datos : [],
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            error: true,
            content:
              err.response?.data?.message ||
              "Error al consultar. Intenta nuevamente.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, messages, loading, idConf, general],
  );

  const reiniciar = () => {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  const irAsesor = () => {
    const contexto = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(". ");
    window.open(buildWhatsAppLink(contexto), "_blank");
  };

  const preguntadas = new Set(
    messages.filter((m) => m.role === "user").map((m) => m.content),
  );
  const sugerencias = (general ? SUGERENCIAS_GENERAL : SUGERENCIAS).filter(
    (s) => !preguntadas.has(s.texto),
  );

  return (
    <>
      <button
        id="support-fab"
        onClick={() => setOpen((v) => !v)}
        className={`fixed ${fabBottom} ${sideClass} z-50 flex items-center gap-2
             rounded-full bg-white py-1.5 pl-1.5 pr-1.5 sm:pr-3.5 text-[13px] font-semibold text-[#0a1628]
             shadow-[0_12px_28px_rgba(10,22,40,0.16)] ring-1 ring-[#e3e8ee]
             transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(10,22,40,0.2)]
             focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600`}
        aria-label={
          open
            ? "Cerrar asistente"
            : general
              ? "Abrir asistente de ImporChat"
              : "Abrir asistente de tu cuenta"
        }
        aria-expanded={open}
      >
        <span
          className="grid h-7 w-7 place-items-center rounded-full text-white"
          style={ORBE}
        >
          {open ? <i className="bx bx-x text-lg" /> : <IconoChispa className="h-3.5 w-3.5" />}
        </span>
        <span className="hidden sm:inline">
          {open ? "Cerrar" : general ? "¿Cómo empiezo?" : "Pregúntale a tu cuenta"}
        </span>
      </button>

      <div
        ref={chatRef}
        role="dialog"
        aria-label="Asistente de tu cuenta"
        className={`fixed ${panelBottom} ${sideClass} z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col
               overflow-hidden rounded-2xl bg-white text-[#102033]
               shadow-[0_30px_70px_-24px_rgba(10,22,40,0.35)] ring-1 ring-[#e3e8ee]
               transition-all duration-300 ${originClass}
               ${open ? "scale-100 opacity-100 pointer-events-auto" : "scale-90 opacity-0 pointer-events-none"}`}
        style={{ height: "min(540px, calc(100vh - 7rem))" }}
      >
        {/* Cabecera */}
        <div className="relative flex-shrink-0 bg-gradient-to-b from-cyan-50 to-white px-4 pb-2.5 pt-3.5">
          <div className="absolute right-2 top-2 flex">
            {messages.length > 0 && (
              <button
                onClick={reiniciar}
                disabled={loading}
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"
                title="Nueva conversación"
              >
                <i className="bx bx-refresh text-base" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
              title="Cerrar"
            >
              <i className="bx bx-x text-base" />
            </button>
          </div>
          <div
            className="mb-2 h-8 w-8 rounded-full shadow-[0_0_0_3px_#fff,0_0_0_4px_#cdeff5]"
            style={ORBE}
          />
          <h3 className="m-0 truncate pr-14 text-[15px] font-bold leading-tight tracking-tight">
            {general
              ? "Hola 👋"
              : nombreCuenta
                ? `Hola, ${nombreCuenta}`
                : "Hola 👋"}
          </h3>
          <p className="mt-0.5 text-[11.5px] text-slate-500">
            {general
              ? "Te guío para crear tus cuentas y configurar ImporChat."
              : "Pregúntame por tus guías, pedidos y ventas."}
          </p>
        </div>

        {/* Conversación */}
        <div
          ref={bodyRef}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-3 pt-1.5"
        >
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <div
                key={i}
                className="max-w-[80%] self-end break-words rounded-2xl bg-[#0a1628] px-3 py-1.5 text-[12.5px] leading-relaxed text-white"
              >
                {msg.content}
              </div>
            ) : (
              <div
                key={i}
                className="grid grid-cols-[20px_1fr] items-start gap-2"
              >
                <span
                  className="mt-0.5 h-5 w-5 rounded-full"
                  style={ORBE}
                />
                {msg.error ? (
                  <div className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[12px] leading-relaxed text-amber-800">
                    {msg.content}
                  </div>
                ) : (
                  <div className="grid min-w-0 gap-2">
                    <MetricasRespuesta datos={msg.datos} />
                    {msg.content && (
                      <div className="break-words text-[12.5px] leading-relaxed text-[#243446]">
                        {renderMarkdown(msg.content)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ),
          )}

          {loading && (
            <div className="grid grid-cols-[20px_1fr] items-center gap-2">
              <span
                className="h-5 w-5 animate-pulse rounded-full"
                style={ORBE}
              />
              <div className="flex gap-1.5">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-700/60"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && sugerencias.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {sugerencias.map((s) => (
                <button
                  key={s.texto}
                  onClick={() => enviar(s.texto)}
                  className="grid content-start gap-1.5 rounded-xl border border-[#e3e8ee] p-2.5 text-left text-[12px] leading-snug text-[#102033]
                             transition-colors hover:border-cyan-300 hover:bg-cyan-50/50
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-cyan-50 text-cyan-700">
                    <i className={`bx ${s.icon} text-sm`} />
                  </span>
                  {s.texto}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Entrada */}
        <div className="flex-shrink-0 px-3 pb-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
            className="flex items-center gap-2 rounded-full border border-[#e3e8ee] bg-slate-50 py-1 pl-3.5 pr-1
                       transition-colors focus-within:border-cyan-700 focus-within:bg-white"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              maxLength={1500}
              onChange={(e) => setInput(e.target.value)}
              placeholder={general ? "¿Qué quieres configurar?" : "Escribe tu pregunta…"}
              aria-label="Pregunta para el asistente"
              className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-[#102033] placeholder-slate-400 outline-none focus:ring-0"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-cyan-700 text-white
                         transition-all hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              aria-label="Enviar"
            >
              <i className="bx bx-up-arrow-alt text-lg" />
            </button>
          </form>

          <div className="mt-1 flex items-center justify-between gap-2 px-1 text-[10.5px] text-slate-400">
            <span>
              {general
                ? "Videos y guías oficiales de Imporfactory"
                : "Datos sincronizados de Dropi y Aliclik"}
            </span>
            <button
              type="button"
              onClick={irAsesor}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-500 transition-colors hover:bg-green-50 hover:text-green-700"
            >
              <i className="bx bxl-whatsapp text-xs" />
              Asesor
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
