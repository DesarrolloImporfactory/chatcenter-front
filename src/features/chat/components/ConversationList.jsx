import React, { memo, useMemo, useCallback } from "react";
import ConversationItem from "./ConversationItem";
import { useInstantSelection } from "../hooks/useInstantSelection";

const ConversationList = memo(
  ({
    conversations = [],
    activeConversationId,
    onSelectConversation,
    onContextMenu,
    loading = false,
    error = null,
    onRetry,
  }) => {
    const {
      select: selectConversation,
      isSelected,
      isSelecting,
    } = useInstantSelection(onSelectConversation, {
      debounceTime: 50, // Muy rápido para mejor UX
      enableOptimisticUpdates: true,
      enableClickPrevention: true,
    });

    // Memoizar items para evitar re-renders innecesarios
    const conversationItems = useMemo(() => {
      return conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={
            conversation.id === activeConversationId ||
            isSelected(conversation.id)
          }
          isLoading={isSelecting && isSelected(conversation.id)}
          onClick={selectConversation}
          onContextMenu={onContextMenu}
        />
      ));
    }, [
      conversations,
      activeConversationId,
      isSelected,
      isSelecting,
      selectConversation,
      onContextMenu,
    ]);

    const handleRetry = useCallback(() => {
      if (onRetry) {
        onRetry();
      }
    }, [onRetry]);

    // Estados de loading y error
    if (loading && conversations.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-sm text-gray-500">Cargando conversaciones...</p>
          </div>
        </div>
      );
    }

    if (error && conversations.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-3 text-center px-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Error al cargar conversaciones
              </p>
              <p className="text-xs text-gray-500 mt-1">{error}</p>
            </div>
            <button
              onClick={handleRetry}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    if (conversations.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-3 text-center px-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-400"
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
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                No hay conversaciones
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Las conversaciones aparecerán aquí cuando recibas mensajes
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        {/* Lista de conversaciones */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="divide-y divide-gray-100">{conversationItems}</div>
        </div>

        {/* Indicador de loading adicional */}
        {loading && conversations.length > 0 && (
          <div className="flex items-center justify-center py-3 border-t">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <p className="text-xs text-gray-500">
                Cargando más conversaciones...
              </p>
            </div>
          </div>
        )}

        {/* Indicador de selección global */}
        {isSelecting && (
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="text-sm">Cargando chat...</span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ConversationList.displayName = "ConversationList";

export default ConversationList;
