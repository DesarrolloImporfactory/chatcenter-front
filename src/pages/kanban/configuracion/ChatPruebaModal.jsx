// src/pages/kanban/configuracion/modales/ChatPruebaModal.jsx
import React, { useState, useEffect, useRef } from "react";
import chatApi from "../../../api/chatcenter";

const parsearMensaje = (texto) => {
  const tags = [
    "producto_imagen_url",
    "servicio_imagen_url",
    "upsell_imagen_url",
    "producto_video_url",
    "servicio_video_url",
  ];
  const tagPattern = tags
    .map((t) => `\\[${t}\\]:\\s*https?://[^\\s\\n\\r]+`)
    .join("|");
  const splitRegex = new RegExp(`(${tagPattern})`, "gi");
  const segmentos = texto.split(splitRegex).filter((s) => s && s.trim());

  const textos = [];
  const medias = [];

  for (const seg of segmentos) {
    const mediaMatch = seg.match(
      /^\[(producto_imagen_url|servicio_imagen_url|upsell_imagen_url|producto_video_url|servicio_video_url)\]:\s*(https?:\/\/[^\s\n\r]+)$/i,
    );
    if (mediaMatch) {
      const tag = mediaMatch[1].toLowerCase();
      const url = mediaMatch[2].trim();
      medias.push({ tipo: tag.includes("video") ? "video" : "imagen", url });
    } else {
      const limpio = seg.trim();
      if (limpio) textos.push(limpio);
    }
  }

  const partes = [];
  // Todo el texto junto primero
  if (textos.length > 0) {
    partes.push({ tipo: "texto", contenido: textos.join("\n").trim() });
  }
  // Luego los medias
  partes.push(...medias);

  if (partes.length === 0) partes.push({ tipo: "texto", contenido: texto });
  return partes;
};

const renderTexto = (texto) => {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>;
    }
    return <span key={i}>{parte}</span>;
  });
};

const ChatPruebaModal = ({
  open,
  onClose,
  columnaId,
  columnaNombre,
  columnaIcono,
  columnaColor,
}) => {
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setCargando] = useState(false);
  const [previousResponseId, setPreviousResponseId] = useState(null);
  const chatBodyRef = useRef(null);
  const inputRef = useRef(null);

  // Reset al abrir/cambiar columna
  useEffect(() => {
    if (open) {
      setMensajes([]);
      setPreviousResponseId(null);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, columnaId]);

  // Scroll al último mensaje
  useEffect(() => {
    if (!chatBodyRef.current) return;
    setTimeout(() => {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }, 80);
  }, [mensajes, loading]);

  const enviar = async () => {
    if (!input.trim() || loading) return;
    const texto = input.trim();
    setInput("");
    setMensajes((prev) => [...prev, { rol: "user", texto, ts: new Date() }]);
    setCargando(true);

    try {
      const { data } = await chatApi.post("/kanban_columnas/chat_prueba", {
        id: columnaId,
        mensaje: texto,
        previous_response_id: previousResponseId,
      });
      if (data?.success) {
        setMensajes((prev) => [
          ...prev,
          { rol: "assistant", texto: data.respuesta, ts: new Date() },
        ]);
        setPreviousResponseId(data.response_id);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Error al conectar con el asistente";
      setMensajes((prev) => [
        ...prev,
        { rol: "error", texto: msg, ts: new Date() },
      ]);
    } finally {
      setCargando(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const reiniciar = () => {
    setMensajes([]);
    setPreviousResponseId(null);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const formatHora = (d) =>
    d?.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes cpm-in {
          from { opacity: 0; transform: scale(.95) translateY(16px); }
          to   { opacity: 1; transform: scale(1)  translateY(0); }
        }
        @keyframes cpm-overlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cpm-dot {
          0%, 80%, 100% { transform: scale(.55); opacity: .35; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
        .cpm-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(8,10,22,.72);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: cpm-overlay .2s ease;
        }
        .cpm-modal {
          width: 100%; max-width: 480px; height: 84vh; max-height: 700px;
          display: flex; flex-direction: column;
          border-radius: 22px; overflow: hidden;
          box-shadow: 0 40px 100px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.06) inset;
          animation: cpm-in .28s cubic-bezier(.34,1.56,.64,1);
        }
        .cpm-header {
          flex-shrink: 0;
          background: linear-gradient(135deg, #0d1117 0%, #161b27 60%, #0d1117 100%);
          padding: 14px 16px 12px;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }
        .cpm-body {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          padding: 16px 14px 8px;
          background: #e5ded8;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M0 0h60v60H0z' fill='%23d4c9bc' fill-opacity='.18'/%3E%3C/svg%3E");
          display: flex; flex-direction: column; gap: 3px;
        }
        .cpm-footer {
          flex-shrink: 0;
          background: #f0f0f0;
          padding: 10px 12px;
          border-top: 1px solid rgba(0,0,0,.08);
          display: flex; gap: 8px; align-items: flex-end;
        }
        .cpm-input {
          flex: 1; min-height: 42px; max-height: 100px;
          padding: 10px 14px;
          border-radius: 22px;
          border: none;
          background: #fff;
          font-size: .88rem;
          color: #111;
          outline: none;
          resize: none;
          line-height: 1.4;
          box-shadow: 0 1px 3px rgba(0,0,0,.1);
          font-family: inherit;
        }
        .cpm-send {
          width: 42px; height: 42px; border-radius: 50%;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: transform .15s, background .15s;
        }
        .cpm-send:active { transform: scale(.9); }
        .cpm-bubble-user {
          align-self: flex-end;
          background: #dcf8c6;
          border-radius: 14px 14px 3px 14px;
          padding: 8px 12px 5px;
          max-width: 78%;
          box-shadow: 0 1px 1px rgba(0,0,0,.1);
          position: relative;
        }
        .cpm-bubble-bot {
          align-self: flex-start;
          background: #fff;
          border-radius: 14px 14px 14px 3px;
          padding: 8px 12px 5px;
          max-width: 78%;
          box-shadow: 0 1px 1px rgba(0,0,0,.1);
          position: relative;
        }
        .cpm-bubble-error {
          align-self: flex-start;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 14px 14px 14px 3px;
          padding: 8px 12px 5px;
          max-width: 78%;
        }
        .cpm-texto {
          font-size: .86rem;
          color: #111;
          line-height: 1.48;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .cpm-hora {
          font-size: .67rem;
          color: #8c9099;
          text-align: right;
          margin-top: 2px;
        }
        .cpm-typing {
          align-self: flex-start;
          background: #fff;
          border-radius: 14px 14px 14px 3px;
          padding: 10px 14px;
          display: flex; gap: 5px; align-items: center;
          box-shadow: 0 1px 1px rgba(0,0,0,.1);
        }
        .cpm-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #6366f1;
          animation: cpm-dot 1.1s ease-in-out infinite;
        }
        .cpm-scrollbar::-webkit-scrollbar { width: 4px; }
        .cpm-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 4px; }
        .cpm-date-sep {
          align-self: center;
          background: rgba(0,0,0,.15);
          color: #fff;
          font-size: .68rem;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 8px;
          margin: 6px 0;
          backdrop-filter: blur(4px);
        }
        .cpm-empty {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 10px; text-align: center;
          color: #8c9099;
          padding: 20px;
        }
      `}</style>

      <div
        className="cpm-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="cpm-modal">
          {/* ── HEADER ── */}
          <div className="cpm-header">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {/* Avatar + info */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: columnaColor
                      ? `${columnaColor}25`
                      : "rgba(99,102,241,.2)",
                    border: `2px solid ${columnaColor || "#6366f1"}60`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <i
                    className={columnaIcono || "bx bx-bot"}
                    style={{
                      fontSize: "1.3rem",
                      color: columnaColor || "#6366f1",
                    }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: ".9rem",
                      lineHeight: 1.2,
                    }}
                  >
                    {columnaNombre || "Asistente"}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      marginTop: 2,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#4ade80",
                        display: "inline-block",
                      }}
                    />
                    <span
                      style={{
                        fontSize: ".68rem",
                        color: "rgba(255,255,255,.5)",
                        fontWeight: 600,
                      }}
                    >
                      Online · Responses API
                    </span>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {/* Reiniciar */}
                <button
                  onClick={reiniciar}
                  title="Reiniciar conversación"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(255,255,255,.06)",
                    color: "rgba(255,255,255,.7)",
                    fontSize: ".72rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background .15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(255,255,255,.12)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(255,255,255,.06)")
                  }
                >
                  <i className="bx bx-refresh" style={{ fontSize: 13 }} />
                  Reiniciar
                </button>

                {/* Cerrar */}
                <button
                  onClick={onClose}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(255,255,255,.06)",
                    color: "rgba(255,255,255,.6)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background .15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(239,68,68,.2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(255,255,255,.06)")
                  }
                >
                  <i className="bx bx-x" style={{ fontSize: 16 }} />
                </button>
              </div>
            </div>

            {/* Barra contexto */}
            {previousResponseId && (
              <div
                style={{
                  marginTop: 8,
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: "rgba(99,102,241,.15)",
                  border: "1px solid rgba(99,102,241,.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <i
                  className="bx bx-link-alt"
                  style={{ color: "#818cf8", fontSize: ".8rem" }}
                />
                <span
                  style={{
                    fontSize: ".65rem",
                    color: "rgba(255,255,255,.45)",
                    fontFamily: "monospace",
                  }}
                >
                  ctx: ...{previousResponseId.slice(-12)}
                </span>
                <span
                  style={{ fontSize: ".65rem", color: "rgba(255,255,255,.3)" }}
                >
                  · {mensajes.filter((m) => m.rol === "user").length} mensajes
                </span>
              </div>
            )}
          </div>

          {/* ── BODY ── */}
          <div className="cpm-body cpm-scrollbar" ref={chatBodyRef}>
            {mensajes.length === 0 && !loading && (
              <div className="cpm-empty">
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    background: "rgba(0,0,0,.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 4,
                  }}
                >
                  <i
                    className="bx bx-bot"
                    style={{ fontSize: "1.8rem", color: "#8c9099" }}
                  />
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: ".88rem",
                    color: "#5a5f66",
                  }}
                >
                  {columnaNombre}
                </div>
                <div
                  style={{
                    fontSize: ".78rem",
                    color: "#8c9099",
                    maxWidth: 260,
                    lineHeight: 1.5,
                  }}
                >
                  Escribe un mensaje para probar cómo responde este asistente
                </div>
              </div>
            )}

            {mensajes.length > 0 && <div className="cpm-date-sep">Hoy</div>}

            {mensajes.map((msg, i) => {
              if (msg.rol === "user") {
                return (
                  <div key={i} className="cpm-bubble-user">
                    <div className="cpm-texto">{msg.texto}</div>
                    <div
                      className="cpm-hora"
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      {formatHora(msg.ts)}
                      <i
                        className="bx bx-check-double"
                        style={{ color: "#53bdeb", fontSize: ".8rem" }}
                      />
                    </div>
                  </div>
                );
              }

              if (msg.rol === "error") {
                return (
                  <div key={i} className="cpm-bubble-error">
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "flex-start",
                      }}
                    >
                      <i
                        className="bx bx-error-circle"
                        style={{
                          color: "#dc2626",
                          fontSize: "1rem",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      />
                      <div className="cpm-texto" style={{ color: "#dc2626" }}>
                        {msg.texto}
                      </div>
                    </div>
                    <div className="cpm-hora">{formatHora(msg.ts)}</div>
                  </div>
                );
              }

              // assistant

              const partes = parsearMensaje(msg.texto);
              return partes.map((parte, pi) => (
                <div
                  key={`${i}-${pi}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 6,
                    marginBottom: 2,
                  }}
                >
                  {/* Avatar — solo en la última parte */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: columnaColor
                        ? `${columnaColor}20`
                        : "rgba(99,102,241,.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      visibility:
                        pi === partes.length - 1 ? "visible" : "hidden",
                    }}
                  >
                    <i
                      className={columnaIcono || "bx bx-bot"}
                      style={{
                        fontSize: ".9rem",
                        color: columnaColor || "#6366f1",
                      }}
                    />
                  </div>

                  {/* Burbuja según tipo */}
                  {parte.tipo === "imagen" && (
                    <div
                      style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        boxShadow: "0 1px 4px rgba(0,0,0,.15)",
                        maxWidth: "78%",
                      }}
                    >
                      <img
                        src={parte.url}
                        alt="Imagen"
                        style={{
                          width: "100%",
                          maxWidth: 260,
                          display: "block",
                          borderRadius: 12,
                          cursor: "pointer",
                        }}
                        onClick={() => window.open(parte.url, "_blank")}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                      <div
                        style={{
                          display: "none",
                          padding: "10px 14px",
                          background: "#fff",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          alignItems: "center",
                          gap: 8,
                          fontSize: ".78rem",
                          color: "#64748b",
                        }}
                      >
                        <i
                          className="bx bx-image-alt"
                          style={{ color: "#94a3b8", fontSize: "1.1rem" }}
                        />
                        <a
                          href={parte.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#6366f1", textDecoration: "none" }}
                        >
                          Ver imagen
                        </a>
                      </div>
                    </div>
                  )}

                  {parte.tipo === "video" && (
                    <div
                      style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#000",
                        boxShadow: "0 1px 4px rgba(0,0,0,.15)",
                        maxWidth: "78%",
                      }}
                    >
                      <video
                        src={(() => {
                          const token = localStorage.getItem("token");
                          const url = parte.url;
                          if (token && url.includes("/Videos/stream/")) {
                            return `${url}?token=${token}`;
                          }
                          return url;
                        })()}
                        controls
                        playsInline
                        preload="metadata"
                        style={{
                          width: "100%",
                          maxWidth: 260,
                          display: "block",
                          borderRadius: 12,
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                      <div
                        style={{
                          display: "none",
                          padding: "10px 14px",
                          background: "#fff",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          alignItems: "center",
                          gap: 8,
                          fontSize: ".78rem",
                          color: "#64748b",
                        }}
                      >
                        <i
                          className="bx bx-video"
                          style={{ color: "#94a3b8", fontSize: "1.1rem" }}
                        />
                        <a
                          href={parte.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#6366f1", textDecoration: "none" }}
                        >
                          Ver video
                        </a>
                      </div>
                    </div>
                  )}

                  {parte.tipo === "texto" && (
                    <div className="cpm-bubble-bot">
                      <div className="cpm-texto">{renderTexto(parte.contenido)}</div>
                      {pi === partes.length - 1 && (
                        <div className="cpm-hora">{formatHora(msg.ts)}</div>
                      )}
                    </div>
                  )}
                </div>
              ));
            })}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: columnaColor
                      ? `${columnaColor}20`
                      : "rgba(99,102,241,.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i
                    className={columnaIcono || "bx bx-bot"}
                    style={{
                      fontSize: ".9rem",
                      color: columnaColor || "#6366f1",
                    }}
                  />
                </div>
                <div className="cpm-typing">
                  {[0, 1, 2].map((n) => (
                    <div
                      key={n}
                      className="cpm-dot"
                      style={{ animationDelay: `${n * 0.18}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="cpm-footer">
            <textarea
              ref={inputRef}
              className="cpm-input"
              rows={1}
              placeholder="Escribe un mensaje..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize
                e.target.style.height = "42px";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 100) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
            />
            <button
              onClick={enviar}
              disabled={loading || !input.trim()}
              className="cpm-send"
              style={{
                background:
                  loading || !input.trim()
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, #6366f1, #4f46e5)",
                boxShadow:
                  loading || !input.trim()
                    ? "none"
                    : "0 4px 14px rgba(99,102,241,.4)",
              }}
            >
              <i
                className={loading ? "bx bx-loader-alt bx-spin" : "bx bx-send"}
                style={{
                  fontSize: "1.1rem",
                  color: loading || !input.trim() ? "#94a3b8" : "#fff",
                  marginLeft: loading ? 0 : 2,
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatPruebaModal;
