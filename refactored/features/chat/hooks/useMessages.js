/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CHAT — Hook useMessages                          ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Extrae la lógica de carga de mensajes que estaba inline  ║
 * ║  en ChatPrincipal.jsx (~200 líneas de useEffect + fetch)  ║
 * ║                                                           ║
 * ║  USO:                                                     ║
 * ║    const { messages, loading, send, refresh } =           ║
 * ║      useMessages(chatId, source);                         ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback, useRef } from "react";
import chatMessageService from "../services/chatMessageService";

/**
 * @param {number|string} chatId - ID del chat seleccionado
 * @param {string}        source - "whatsapp"|"messenger"|"instagram"|"tiktok"
 */
export function useMessages(chatId, source = "whatsapp") {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  // Cargar primera página al cambiar de chat
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    setPage(1);
    setHasMore(true);
    fetchMessages(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, source]);

  const fetchMessages = useCallback(
    async (pg = page, replace = false) => {
      if (!chatId || loading) return;
      setLoading(true);
      setError(null);
      try {
        const result = await chatMessageService.getMessages(chatId, {
          page: pg,
          source,
        });
        if (!mountedRef.current) return;

        setMessages((prev) =>
          replace ? result.messages : [...result.messages, ...prev]
        );
        setHasMore(pg < result.totalPages);
        setPage(pg);
      } catch (err) {
        if (mountedRef.current) setError(err.message);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [chatId, source, page, loading]
  );

  // Cargar más mensajes (scroll hacia arriba)
  const loadMore = useCallback(() => {
    if (hasMore && !loading) fetchMessages(page + 1, false);
  }, [hasMore, loading, fetchMessages, page]);

  // Añadir mensaje en tiempo real (desde socket)
  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // Refrescar (volver a cargar desde 0)
  const refresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    chatMessageService.invalidateChat(chatId);
    fetchMessages(1, true);
  }, [chatId, fetchMessages]);

  // Enviar mensaje de texto
  const sendText = useCallback(
    async (texto, extraPayload = {}) => {
      const result = await chatMessageService.sendText(chatId, texto, extraPayload);
      return result;
    },
    [chatId]
  );

  // Enviar archivo
  const sendMedia = useCallback(
    async (file, tipo = "image", onProgress) => {
      const result = await chatMessageService.sendMedia(chatId, file, tipo, onProgress);
      return result;
    },
    [chatId]
  );

  return {
    messages,
    loading,
    error,
    hasMore,
    // Acciones
    loadMore,
    addMessage,
    refresh,
    sendText,
    sendMedia,
  };
}

export default useMessages;
