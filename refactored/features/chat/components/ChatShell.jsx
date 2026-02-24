/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CHAT — ChatShell (orquestador del chat)          ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Este componente reemplaza la composición gigante de:     ║
 * ║  - src/components/chat/ChatPrincipal.jsx (2400+ líneas)   ║
 * ║                                                           ║
 * ║  Solo COMPONE sub-componentes. Cero lógica de negocio.    ║
 * ║  La lógica viene de los hooks: useMessages, useBotToggle  ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback } from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { useMessages } from "../hooks/useMessages";
import { useBotToggle } from "../hooks/useBotToggle";
import { useAuth } from "../../../shared/auth/useAuth";

/**
 * @param {object}   props
 * @param {object}   props.chat             - Chat seleccionado
 * @param {string}   props.source           - "whatsapp"|"messenger"|...
 * @param {Function} props.onBack           - Volver a sidebar (mobile)
 * @param {Function} props.onOpenUserInfo   - Abrir panel derecho de info
 * @param {Function} props.onOpenTemplates  - Abrir modal de plantillas
 */
export default function ChatShell({
  chat,
  source = "whatsapp",
  onBack,
  onOpenUserInfo,
  onOpenTemplates,
}) {
  const { userId } = useAuth();
  const chatId = chat?.id_cliente_chat_center || chat?.id;

  // Hook de mensajes
  const {
    messages,
    loading,
    hasMore,
    loadMore,
    addMessage,
    sendText,
    sendMedia,
  } = useMessages(chatId, source);

  // Hook del bot
  const { botActivo, toggle: toggleBot } = useBotToggle(
    chatId,
    chat?.bot_openia === 1
  );

  // Estado del menú
  const [menuOpen, setMenuOpen] = useState(false);

  // Enviar texto
  const handleSend = useCallback(
    async (texto) => {
      const result = await sendText(texto);
      if (result) {
        addMessage({
          texto,
          tipo_mensaje: "text",
          rol: "admin",
          created_at: new Date().toISOString(),
        });
      }
    },
    [sendText, addMessage]
  );

  // Enviar archivo
  const handleSendMedia = useCallback(
    async (file, tipo) => {
      await sendMedia(file, tipo);
    },
    [sendMedia]
  );

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center text-slate-400">
          <i className="bx bx-message-dots text-6xl mb-3" />
          <p className="text-lg font-medium">Selecciona un chat</p>
          <p className="text-sm">Elige una conversación de la lista</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      <ChatHeader
        chat={chat}
        botActivo={botActivo}
        onToggleBot={toggleBot}
        onBack={onBack}
        onOpenInfo={onOpenUserInfo}
        onOpenMenu={() => setMenuOpen(!menuOpen)}
      />

      <MessageList
        messages={messages}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        currentUserId={userId}
      />

      <MessageInput
        onSend={handleSend}
        onSendMedia={handleSendMedia}
        onTemplate={onOpenTemplates}
        disabled={chat?.chat_cerrado === 1}
        placeholder={
          chat?.chat_cerrado === 1
            ? "Chat cerrado — envía una plantilla para reabrir"
            : "Escribe un mensaje..."
        }
      />
    </div>
  );
}
