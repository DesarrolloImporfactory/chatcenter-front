import { useState, useEffect, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import conversationService from "../services/conversationService";
import messageService from "../services/messageService";
import { MESSAGE_SOURCES } from "../types";

export const useChat = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);

  // Estados principales
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados de UI
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState("all");
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Referencias para control de estado
  const conversationsRef = useRef(conversations);
  const messagesRef = useRef(messages);
  const mountedRef = useRef(true);
  const loadingConversationRef = useRef(false);
  const currentConversationIdRef = useRef(null);

  // Actualizar refs cuando cambien los estados
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Cargar conversaciones iniciales
  useEffect(() => {
    if (user?.isAuthenticated) {
      loadConversations();
    }
  }, [user?.isAuthenticated, selectedSource]);

  // Función para cargar conversaciones
  const loadConversations = useCallback(
    async (options = {}) => {
      if (!mountedRef.current) return;

      setLoading(true);
      setError(null);

      try {
        let result;

        if (selectedSource === "all") {
          result = await conversationService.getAllConversations({
            search: searchQuery,
            ...options,
          });
        } else {
          result = await conversationService.getConversationsBySource(
            selectedSource,
            {
              search: searchQuery,
              ...options,
            }
          );
        }

        if (mountedRef.current) {
          setConversations(result.conversations || []);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message);
          console.error("Error cargando conversaciones:", err);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [selectedSource, searchQuery]
  );

  // Función para cargar mensajes de una conversación
  const loadMessages = useCallback(
    async (conversationId, source, options = {}) => {
      if (!mountedRef.current || !conversationId || !source) return;

      setLoading(true);
      setError(null);

      try {
        const result = await messageService.getMessages(
          conversationId,
          source,
          options
        );

        if (mountedRef.current) {
          setMessages(result.messages || []);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message);
          console.error("Error cargando mensajes:", err);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Función para seleccionar conversación con prevención de clicks múltiples
  const selectConversation = useCallback(
    async (conversation) => {
      // Prevenir clicks múltiples y cambios simultáneos
      if (loadingConversationRef.current) {
        return;
      }

      if (!conversation) {
        setActiveConversation(null);
        setMessages([]);
        currentConversationIdRef.current = null;
        return;
      }

      // Si ya es la conversación activa, no hacer nada
      if (currentConversationIdRef.current === conversation.id) {
        return;
      }

      loadingConversationRef.current = true;
      currentConversationIdRef.current = conversation.id;

      try {
        // Cambio inmediato de UI para feedback instantáneo
        setActiveConversation(conversation);
        setMessages([]); // Limpiar mensajes anteriores inmediatamente
        setLoading(true);

        // Cargar mensajes de la nueva conversación
        await loadMessages(conversation.id, conversation.source);

        // Marcar como leída si tiene mensajes pendientes
        if (conversation.mensajes_pendientes > 0) {
          // Actualizar UI inmediatamente
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === conversation.id
                ? { ...conv, mensajes_pendientes: 0 }
                : conv
            )
          );

          // Actualizar en servidor en background
          conversationService
            .markAsRead(conversation.id, conversation.source)
            .catch((err) => {
              console.warn("Error marcando conversación como leída:", err);
              // Revertir cambio local si falla
              setConversations((prev) =>
                prev.map((conv) =>
                  conv.id === conversation.id
                    ? {
                        ...conv,
                        mensajes_pendientes: conversation.mensajes_pendientes,
                      }
                    : conv
                )
              );
            });
        }
      } catch (err) {
        console.error("Error seleccionando conversación:", err);
        setError(err.message);
      } finally {
        loadingConversationRef.current = false;
        setLoading(false);
      }
    },
    [loadMessages]
  );

  // Función para enviar mensaje
  const sendMessage = useCallback(
    async (text, options = {}) => {
      if (!activeConversation || !text.trim()) return;

      try {
        const sentMessage = await messageService.sendTextMessage(
          activeConversation.id,
          activeConversation.source,
          text,
          options
        );

        if (mountedRef.current) {
          // Agregar mensaje localmente
          setMessages((prev) => [...prev, sentMessage]);

          // Actualizar conversación en la lista
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === activeConversation.id
                ? {
                    ...conv,
                    texto_mensaje: text,
                    mensaje_created_at: sentMessage.created_at,
                  }
                : conv
            )
          );
        }

        return sentMessage;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [activeConversation]
  );

  // Función para enviar archivo
  const sendFile = useCallback(
    async (file, options = {}) => {
      if (!activeConversation || !file) return;

      try {
        const sentMessage = await messageService.sendFileMessage(
          activeConversation.id,
          activeConversation.source,
          file,
          options
        );

        if (mountedRef.current) {
          setMessages((prev) => [...prev, sentMessage]);
        }

        return sentMessage;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [activeConversation]
  );

  // Función para buscar conversaciones
  const searchConversations = useCallback(
    async (query) => {
      setSearchQuery(query);

      if (!query.trim()) {
        await loadConversations();
        return;
      }

      setLoading(true);
      try {
        const sources =
          selectedSource === "all"
            ? Object.values(MESSAGE_SOURCES)
            : [selectedSource];

        const result = await conversationService.searchConversations(
          query,
          sources
        );

        if (mountedRef.current) {
          setConversations(result.conversations || []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [selectedSource, loadConversations]
  );

  // Función para refrescar datos
  const refresh = useCallback(async () => {
    await loadConversations({ forceRefresh: true });

    if (activeConversation) {
      await loadMessages(activeConversation.id, activeConversation.source, {
        forceRefresh: true,
      });
    }
  }, [loadConversations, loadMessages, activeConversation]);

  // Función para cambiar fuente de mensajes
  const changeSource = useCallback((source) => {
    setSelectedSource(source);
    setActiveConversation(null);
    setMessages([]);
    setSearchQuery("");
  }, []);

  // Función para toggle panel de usuario
  const toggleUserInfo = useCallback(() => {
    setShowUserInfo((prev) => !prev);
  }, []);

  // Función para limpiar error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Obtener estadísticas
  const getStats = useCallback(async () => {
    try {
      const stats = await conversationService.getConversationStats();
      return stats;
    } catch (err) {
      console.error("Error obteniendo estadísticas:", err);
      return null;
    }
  }, []);

  // Estado derivado
  const hasUnreadMessages = conversations.some(
    (conv) => conv.mensajes_pendientes > 0
  );
  const totalUnread = conversations.reduce(
    (total, conv) => total + conv.mensajes_pendientes,
    0
  );
  const filteredConversations = conversations.filter((conv) => {
    if (selectedSource === "all") return true;
    return conv.source === selectedSource;
  });

  return {
    // Estados principales
    conversations: filteredConversations,
    activeConversation,
    messages,
    loading,
    error,

    // Estados de UI
    searchQuery,
    selectedSource,
    showUserInfo,
    isTyping,

    // Estados derivados
    hasUnreadMessages,
    totalUnread,

    // Acciones principales
    selectConversation,
    sendMessage,
    sendFile,
    searchConversations,
    refresh,
    changeSource,

    // Acciones de UI
    toggleUserInfo,
    clearError,
    setIsTyping,

    // Utilidades
    getStats,
    loadConversations,
    loadMessages,
  };
};
