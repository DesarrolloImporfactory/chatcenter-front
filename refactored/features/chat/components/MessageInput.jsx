/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CHAT — MessageInput (input de mensajes)          ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Extrae la barra de input de:                             ║
 * ║  - src/components/chat/ChatPrincipal.jsx (parte inferior) ║
 * ║                                                           ║
 * ║  Solo UI + estado local del texto. El envío se delega     ║
 * ║  al padre vía onSend.                                     ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useCallback } from "react";

/**
 * @param {object}   props
 * @param {Function} props.onSend       - Callback(texto) al enviar
 * @param {Function} props.onSendMedia  - Callback(file, tipo) al enviar archivo
 * @param {Function} props.onTemplate   - Abrir modal de plantillas
 * @param {boolean}  props.disabled     - Input deshabilitado (chat cerrado, etc.)
 * @param {string}   props.placeholder  - Placeholder del textarea
 */
export default function MessageInput({
  onSend,
  onSendMedia,
  onTemplate,
  disabled = false,
  placeholder = "Escribe un mensaje...",
}) {
  const [text, setText] = useState("");
  const fileRef = useRef(null);
  const textareaRef = useRef(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend?.(trimmed);
    setText("");
    textareaRef.current?.focus();
  }, [text, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const tipo = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
        ? "audio"
        : "document";
      onSendMedia?.(file, tipo);
      e.target.value = "";
    },
    [onSendMedia]
  );

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      {/* Barra de acciones */}
      <div className="flex items-end gap-2">
        {/* Adjuntar */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition disabled:opacity-40"
          aria-label="Adjuntar archivo"
        >
          <i className="bx bx-paperclip text-xl" />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileChange}
        />

        {/* Plantillas */}
        {onTemplate && (
          <button
            onClick={onTemplate}
            disabled={disabled}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition disabled:opacity-40"
            aria-label="Enviar plantilla"
          >
            <i className="bx bx-file text-xl" />
          </button>
        )}

        {/* Textarea */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-40"
            style={{ maxHeight: "120px", overflowY: "auto" }}
          />
        </div>

        {/* Enviar */}
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Enviar"
        >
          <i className="bx bx-send text-lg" />
        </button>
      </div>
    </div>
  );
}
