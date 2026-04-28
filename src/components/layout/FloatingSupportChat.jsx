import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import chatApi from "../../api/chatcenter";

/**
 * FloatingSupportChat — Botón flotante de soporte con IA
 *
 * Cambios v2:
 *   - Renderizado Markdown (negrillas, links, listas)
 *   - "Hablar con asesor" → abre WhatsApp con contexto
 *   - Routing inteligente de KB: dropi vs plataforma
 *   - Chat libre auto-detecta qué KB usar
 */

const WA_SUPPORT_NUMBER = "593998979214";

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
          ? "list-decimal pl-5 my-1 space-y-0.5"
          : "list-disc pl-5 my-1 space-y-0.5";
      elements.push(
        <Tag key={`list-${elements.length}`} className={cls}>
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </Tag>,
      );
      listItems = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const ulMatch = line.match(/^[\s]*[-*]\s+(.+)/);
    if (ulMatch) {
      if (listType === "ol") flushList();
      listType = "ul";
      listItems.push(ulMatch[1]);
      continue;
    }

    const olMatch = line.match(/^[\s]*(\d+)[.)]\s+(.+)/);
    if (olMatch) {
      if (listType === "ul") flushList();
      listType = "ol";
      listItems.push(olMatch[2]);
      continue;
    }

    flushList();

    if (line.trim() === "") {
      elements.push(<div key={`br-${i}`} className="h-1.5" />);
      continue;
    }

    elements.push(
      <p key={`p-${i}`} className="my-0">
        {renderInline(line)}
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

/* ─── Temas predefinidos ─── */
const TEMAS_DROPI = [
  {
    id: "novedades",
    icon: "bx-error-circle",
    label: "Novedades de mi pedido",
    kbType: "dropi",
    prompt:
      "El usuario necesita ayuda con una novedad de transportadora en su pedido. Pregúntale cuál es la novedad exacta que aparece en Dropi y de qué transportadora.",
  },
  {
    id: "estado_pedido",
    icon: "bx-package",
    label: "Estado de mi pedido",
    kbType: "dropi",
    prompt:
      "El usuario quiere saber qué significa un estado de pedido en Dropi. Pregúntale qué estado ve actualmente.",
  },
  {
    id: "cobertura",
    icon: "bx-map",
    label: "Cobertura y tiempos de entrega",
    kbType: "dropi",
    prompt:
      "El usuario quiere saber si una ciudad tiene cobertura de transportadoras o cuánto tarda la entrega. Pregúntale la ciudad y provincia.",
  },
  {
    id: "empaque",
    icon: "bx-box",
    label: "Políticas de empaque",
    kbType: "dropi",
    prompt:
      "El usuario tiene dudas sobre cómo empacar sus productos para envío. Explica las políticas generales de empaque.",
  },
  {
    id: "reclamos",
    icon: "bx-shield-quarter",
    label: "Reclamos y garantías",
    kbType: "dropi",
    prompt:
      "El usuario necesita hacer un reclamo o activar garantía. Explica el proceso de reclamos según la documentación.",
  },
];

const TEMAS_PLATAFORMA = [
  {
    id: "asesor",
    icon: "bx-support",
    label: "Hablar con un asesor",
    isAsesor: true,
  },
  {
    id: "free_chat",
    icon: "bx-message-dots",
    label: "Consultar al asistente IA",
    isFreeChat: true,
  },
];

/* ─── Build WA link with context ─── */
function buildWhatsAppLink(context) {
  const baseMsg = context
    ? `Hola, necesito ayuda con: ${context}`
    : "Hola, necesito ayuda con la plataforma ImporChat";
  const encoded = encodeURIComponent(baseMsg);
  return `https://wa.me/${WA_SUPPORT_NUMBER}?text=${encoded}`;
}

/* ─── Componente ─── */
export default function FloatingSupportChat({
  idConfiguracion: propIdConf,
  bottomClass,
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("menu");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasDropi, setHasDropi] = useState(false);
  const [checkingDropi, setCheckingDropi] = useState(true);
  const [selectedTema, setSelectedTema] = useState(null);
  const [chatContext, setChatContext] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatRef = useRef(null);

  const idConf =
    propIdConf ||
    parseInt(localStorage.getItem("id_configuracion"), 10) ||
    null;

  useEffect(() => {
    const checkDropi = async () => {
      if (!idConf) {
        setCheckingDropi(false);
        return;
      }
      try {
        const res = await chatApi.get(
          `soporte_chat/check_dropi?id_configuracion=${idConf}`,
        );
        setHasDropi(res.data?.hasDropi || false);
      } catch {
        setHasDropi(false);
      } finally {
        setCheckingDropi(false);
      }
    };
    checkDropi();
  }, [idConf]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (view === "chat") {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [view]);

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

  const handleFreeChat = () => {
    setSelectedTema(null);
    setChatContext("");
    setMessages([
      {
        role: "assistant",
        content:
          "¡Hola! 👋 Escríbeme tu consulta y haré lo posible por ayudarte.",
      },
    ]);
    setView("chat");
  };

  const handleSelectTema = (tema) => {
    if (tema.isFreeChat) {
      handleFreeChat();
      return;
    }

    if (tema.isAsesor) {
      const contextSummary =
        chatContext ||
        messages
          .filter((m) => m.role === "user")
          .map((m) => m.content)
          .join(". ") ||
        "";

      const waLink = buildWhatsAppLink(contextSummary);

      setMessages([
        {
          role: "assistant",
          content: `¡Te conecto con un asesor! 🙏\n\nHaz clic en el botón de abajo para abrir WhatsApp y hablar directamente con nuestro equipo de soporte.`,
          waLink,
          waContext: contextSummary,
        },
      ]);
      setView("chat");
      return;
    }

    setSelectedTema(tema);
    setChatContext(tema.label);
    setMessages([
      {
        role: "assistant",
        content: `¡Hola! 👋 Estoy aquí para ayudarte con **${tema.label}**.\n\n¿Cuál es tu consulta específica?`,
      },
    ]);
    setView("chat");
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    if (!chatContext) setChatContext(text);

    try {
      const res = await chatApi.post("soporte_chat/ask", {
        id_configuracion: idConf,
        messages: newMessages
          .filter((m) => !m.waLink)
          .map((m) => ({
            role: m.role,
            content: m.content,
          })),
        tema_context: selectedTema?.prompt || null,
        has_dropi: hasDropi,
        kb_type: selectedTema?.kbType || "auto",
      });

      const respuesta = res.data?.respuesta || "No pude procesar tu consulta.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: respuesta },
      ]);
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        "Error al consultar. Intenta nuevamente.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${errMsg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, idConf, selectedTema, hasDropi, chatContext]);

  const handleBack = () => {
    setView("menu");
    setMessages([]);
    setSelectedTema(null);
    setInput("");
    setChatContext("");
  };

  const handleGoToAsesor = () => {
    const contextSummary =
      chatContext ||
      messages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join(". ") ||
      "";

    const waLink = buildWhatsAppLink(contextSummary);
    window.open(waLink, "_blank");
  };

  const temas = useMemo(
    () => [...(hasDropi ? TEMAS_DROPI : []), ...TEMAS_PLATAFORMA],
    [hasDropi],
  );

  return (
    <>
      <button
        id="support-fab"
        onClick={() => setOpen((v) => !v)}
        className={`fixed ${bottomClass || "bottom-6"} right-6 z-50 w-14 h-14 rounded-full shadow-lg
                   flex items-center justify-center transition-all duration-300
                   hover:scale-110 active:scale-95`}
        style={{
          background: "linear-gradient(135deg, #0A1628 0%, #0e7490 100%)",
        }}
        title="Soporte"
      >
        <i
          className={`bx ${open ? "bx-x" : "bx-support"} text-white text-2xl transition-transform duration-300`}
        />
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full animate-ping opacity-75" />
        )}
      </button>

      <div
        ref={chatRef}
        className={`fixed ${bottomClass ? "bottom-40" : "bottom-24"} right-6 z-50 w-[370px] max-w-[calc(100vw-2rem)]
                     rounded-2xl shadow-2xl overflow-hidden
                     transition-all duration-300 origin-bottom-right
                     ${open ? "scale-100 opacity-100 pointer-events-auto" : "scale-75 opacity-0 pointer-events-none"}`}
        style={{
          maxHeight: "min(600px, calc(100vh - 8rem))",
          border: "1px solid rgba(14,116,144,0.2)",
        }}
      >
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{
            background: "linear-gradient(135deg, #0A1628 0%, #0c4a6e 100%)",
          }}
        >
          {view === "chat" && (
            <button
              onClick={handleBack}
              className="text-white/70 hover:text-white transition-colors mr-1"
            >
              <i className="bx bx-arrow-back text-xl" />
            </button>
          )}
          <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <i className="bx bx-bot text-cyan-400 text-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">
              Asistente de Soporte
            </p>
            <p className="text-cyan-300/70 text-xs">
              {hasDropi ? "Dropi + Plataforma" : "Plataforma"}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-white/50 hover:text-white transition-colors"
          >
            <i className="bx bx-x text-2xl" />
          </button>
        </div>

        <div className="bg-white" style={{ maxHeight: "480px" }}>
          {view === "menu" ? (
            <div className="p-4 overflow-y-auto" style={{ maxHeight: "480px" }}>
              <p className="text-gray-600 text-sm mb-4">
                ¿En qué puedo ayudarte hoy?
              </p>

              {checkingDropi ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {hasDropi && (
                    <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wider mb-2 mt-1">
                      Transportadoras & Pedidos en Dropi
                    </p>
                  )}

                  {temas.map((tema) => (
                    <div key={tema.id}>
                      {tema.id === "asesor" && hasDropi && (
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">
                          Plataforma
                        </p>
                      )}
                      {tema.id === "asesor" && !hasDropi && (
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-1">
                          Soporte de Plataforma
                        </p>
                      )}
                      <button
                        onClick={() => handleSelectTema(tema)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                                   text-left text-sm text-gray-700
                                   bg-gray-50 hover:bg-cyan-50 hover:text-cyan-800
                                   border border-transparent hover:border-cyan-200
                                   transition-all duration-200 group"
                      >
                        <i
                          className={`bx ${tema.icon} text-lg text-gray-400 group-hover:text-cyan-600 transition-colors`}
                        />
                        <span className="flex-1">{tema.label}</span>
                        {tema.isAsesor ? (
                          <i className="bx bxl-whatsapp text-green-500 text-lg" />
                        ) : (
                          <i className="bx bx-chevron-right text-gray-300 group-hover:text-cyan-400 transition-colors" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col" style={{ height: "440px" }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i}>
                    <div
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                          ${
                            msg.role === "user"
                              ? "bg-cyan-600 text-white rounded-br-md"
                              : "bg-gray-100 text-gray-700 rounded-bl-md"
                          }`}
                      >
                        {msg.role === "user" ? (
                          msg.content
                        ) : (
                          <div className="prose-sm prose-gray">
                            {renderMarkdown(msg.content)}
                          </div>
                        )}
                      </div>
                    </div>

                    {msg.waLink && (
                      <div className="flex justify-start mt-2 ml-1">
                        <a
                          href={msg.waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                                     bg-green-500 hover:bg-green-600 text-white text-sm font-medium
                                     transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <i className="bx bxl-whatsapp text-lg" />
                          Abrir WhatsApp con Soporte
                        </a>
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1.5">
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Escribe tu consulta..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200
                               text-sm text-gray-700 placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-transparent
                               transition-all"
                    disabled={loading}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="w-10 h-10 rounded-xl flex items-center justify-center
                               transition-all duration-200 flex-shrink-0
                               disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background:
                        input.trim() && !loading
                          ? "linear-gradient(135deg, #0A1628, #0e7490)"
                          : "#e5e7eb",
                    }}
                  >
                    <i
                      className={`bx bx-send text-lg ${input.trim() && !loading ? "text-white" : "text-gray-400"}`}
                    />
                  </button>
                </div>

                <button
                  onClick={handleGoToAsesor}
                  className="w-full mt-2 flex items-center justify-center gap-2
                             py-2 rounded-lg text-xs text-gray-500
                             hover:text-green-600 hover:bg-green-50
                             transition-all duration-200"
                >
                  <i className="bx bxl-whatsapp text-sm" />
                  ¿No resolvió tu duda? Habla con un asesor
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
