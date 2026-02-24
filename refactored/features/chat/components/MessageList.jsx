/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CHAT — MessageList (lista de mensajes)           ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Extrae el renderizado de la lista de mensajes de:        ║
 * ║  - src/components/chat/ChatPrincipal.jsx (~500 líneas)    ║
 * ║                                                           ║
 * ║  Solo renderiza. Toda la lógica de carga, scroll, etc.    ║
 * ║  viene del hook useMessages y props.                      ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import React, { useRef, useEffect, useCallback } from "react";
import PreviewContent from "../../../shared/ui/PreviewContent";

/**
 * @param {object}   props
 * @param {Array}    props.messages  - Lista de mensajes
 * @param {boolean}  props.loading   - Si está cargando
 * @param {boolean}  props.hasMore   - Si hay más mensajes arriba
 * @param {Function} props.onLoadMore - Callback para cargar más
 * @param {Function} props.onReply   - Callback al responder un mensaje
 * @param {string}   props.currentUserId - ID del usuario actual
 */
export default function MessageList({
  messages = [],
  loading,
  hasMore,
  onLoadMore,
  onReply,
  currentUserId,
}) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const prevLengthRef = useRef(0);

  // Auto-scroll al fondo cuando llegan nuevos mensajes
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  // Detectar scroll arriba para cargar más
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollTop < 100) {
      onLoadMore?.();
    }
  }, [loading, hasMore, onLoadMore]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
    >
      {/* Indicador de carga */}
      {loading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
        </div>
      )}

      {/* Mensajes */}
      {messages.map((msg, i) => {
        const isOwn = msg.rol === "admin" || msg.id_usuario === currentUserId;
        return (
          <div
            key={msg.id || msg.id_mensaje || i}
            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm
                ${
                  isOwn
                    ? "bg-indigo-600 text-white rounded-br-md"
                    : "bg-white text-slate-800 border border-slate-200 rounded-bl-md"
                }`}
            >
              <PreviewContent
                tipo={msg.tipo_mensaje || msg.tipo || "text"}
                texto={msg.texto || msg.mensaje || ""}
                ruta={msg.ruta_archivo || msg.media_url || ""}
                rutaRaw={msg.ruta_archivo_raw || ""}
                replyRef={msg.reply_text || ""}
                replyAuthor={msg.reply_author || ""}
              />

              {/* Hora */}
              <div
                className={`text-[10px] mt-1 text-right
                  ${isOwn ? "text-indigo-200" : "text-slate-400"}`}
              >
                {msg.created_at
                  ? new Date(msg.created_at).toLocaleTimeString("es-EC", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </div>
            </div>
          </div>
        );
      })}

      {/* Ancla para auto-scroll */}
      <div ref={bottomRef} />
    </div>
  );
}
