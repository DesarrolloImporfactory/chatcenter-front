import React, { memo, useCallback, useEffect, useMemo } from "react";
import { useChat } from "../hooks/useChat";
import { useSocket } from "../hooks/useSocket";
import { useConversations } from "../hooks/useConversations";
import ConversationList from "./ConversationList";
import { toast } from "react-hot-toast";

const OptimizedChat = memo(() => {
  // Hooks principales
  const {
    activeConversation,
    messages,
    loading: chatLoading,
    error: chatError,
    selectConversation,
    sendMessage,
    sendFile,
    clearError,
  } = useChat();

  const {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
    searchConversations,
    changeSource,
    selectedSource,
    searchQuery,
    refresh: refreshConversations,
    updateConversation,
    addConversation,
  } = useConversations();

  // Callbacks para Socket.IO
  const handleNewMessage = useCallback(
    (message) => {
      // Actualizar conversación con el nuevo mensaje
      updateConversation(
        message.conversation_id,
        {
          texto_mensaje: message.text || message.content,
          mensaje_created_at: message.created_at,
          mensajes_pendientes: (prev) => prev + 1,
        },
        true
      ); // Actualización inmediata

      // Mostrar notificación si no es la conversación activa
      if (
        !activeConversation ||
        activeConversation.id !== message.conversation_id
      ) {
        toast.success(`Nuevo mensaje recibido`, {
          duration: 3000,
          position: "top-right",
        });
      }
    },
    [updateConversation, activeConversation]
  );

  const handleConversationUpdate = useCallback(
    (conversation) => {
      updateConversation(conversation.id, conversation, true);
    },
    [updateConversation]
  );

  const handleTypingStatus = useCallback((data) => {
    // Implementar indicador de escritura
    console.log("Typing status:", data);
  }, []);

  // Configurar Socket.IO
  const {
    connectionStatus,
    isConnected,
    emitJoinConversation,
    emitLeaveConversation,
  } = useSocket(handleNewMessage, handleConversationUpdate, handleTypingStatus);

  // Manejar selección de conversación
  const handleSelectConversation = useCallback(
    async (conversation) => {
      try {
        // Dejar conversación anterior si existe
        if (activeConversation) {
          emitLeaveConversation(
            activeConversation.id,
            activeConversation.source
          );
        }

        // Seleccionar nueva conversación
        await selectConversation(conversation);

        // Unirse a la nueva conversación
        emitJoinConversation(conversation.id, conversation.source);
      } catch (error) {
        toast.error("Error al abrir conversación");
        console.error("Error selecting conversation:", error);
      }
    },
    [
      activeConversation,
      selectConversation,
      emitJoinConversation,
      emitLeaveConversation,
    ]
  );

  // Manejar envío de mensajes
  const handleSendMessage = useCallback(
    async (text) => {
      if (!activeConversation || !text.trim()) return;

      try {
        await sendMessage(text);
        toast.success("Mensaje enviado");
      } catch (error) {
        toast.error("Error al enviar mensaje");
        console.error("Error sending message:", error);
      }
    },
    [activeConversation, sendMessage]
  );

  // Manejar envío de archivos
  const handleSendFile = useCallback(
    async (file, options = {}) => {
      if (!activeConversation || !file) return;

      try {
        await sendFile(file, options);
        toast.success("Archivo enviado");
      } catch (error) {
        toast.error("Error al enviar archivo");
        console.error("Error sending file:", error);
      }
    },
    [activeConversation, sendFile]
  );

  // Manejar búsqueda
  const handleSearch = useCallback(
    (query) => {
      searchConversations(query);
    },
    [searchConversations]
  );

  // Manejar cambio de fuente
  const handleSourceChange = useCallback(
    (source) => {
      changeSource(source);
    },
    [changeSource]
  );

  // Manejar context menu
  const handleContextMenu = useCallback((e, conversation) => {
    e.preventDefault();
    // Implementar menú contextual
    console.log("Context menu for:", conversation);
  }, []);

  // Manejar reintentos
  const handleRetry = useCallback(() => {
    refreshConversations();
    clearError();
  }, [refreshConversations, clearError]);

  // Efectos para manejo de errores
  useEffect(() => {
    if (chatError) {
      toast.error(`Error: ${chatError}`);
    }
  }, [chatError]);

  useEffect(() => {
    if (conversationsError) {
      toast.error(`Error cargando conversaciones: ${conversationsError}`);
    }
  }, [conversationsError]);

  // Datos memoizados
  const isLoading = useMemo(() => {
    return chatLoading || conversationsLoading;
  }, [chatLoading, conversationsLoading]);

  const hasError = useMemo(() => {
    return chatError || conversationsError;
  }, [chatError, conversationsError]);

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar de conversaciones */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Header del sidebar */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-gray-900">Chat Center</h1>

            {/* Indicador de conexión */}
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
              title={`Estado: ${connectionStatus}`}
            ></div>
          </div>

          {/* Barra de búsqueda */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Filtros de fuente */}
          <div className="flex space-x-2 mt-3">
            {["all", "whatsapp", "messenger", "instagram", "tiktok"].map(
              (source) => (
                <button
                  key={source}
                  onClick={() => handleSourceChange(source)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    selectedSource === source
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {source === "all"
                    ? "Todos"
                    : source.charAt(0).toUpperCase() + source.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        {/* Lista de conversaciones */}
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversation?.id}
          onSelectConversation={handleSelectConversation}
          onContextMenu={handleContextMenu}
          loading={conversationsLoading}
          error={conversationsError}
          onRetry={handleRetry}
        />
      </div>

      {/* Área principal del chat */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Header del chat activo */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    {activeConversation.nombre_cliente
                      ?.charAt(0)
                      ?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {activeConversation.nombre_cliente ||
                        "Cliente sin nombre"}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {activeConversation.source} •{" "}
                      {activeConversation.celular_cliente}
                    </p>
                  </div>
                </div>

                <button
                  onClick={refreshConversations}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Actualizar"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Área de mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">
                    No hay mensajes en esta conversación
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.is_from_user ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.is_from_user
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input de mensaje */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && e.target.value.trim()) {
                      handleSendMessage(e.target.value);
                      e.target.value = "";
                    }
                  }}
                />
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  onClick={() => {
                    const input = document.querySelector(
                      'input[placeholder="Escribe tu mensaje..."]'
                    );
                    if (input && input.value.trim()) {
                      handleSendMessage(input.value);
                      input.value = "";
                    }
                  }}
                >
                  Enviar
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Selecciona una conversación
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Elige una conversación de la lista para comenzar a chatear
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

OptimizedChat.displayName = "OptimizedChat";

export default OptimizedChat;
