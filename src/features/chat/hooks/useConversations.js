import { useState, useCallback, useRef, useEffect } from "react";
import conversationService from "../services/conversationService";
import { validateConversation } from "../utils/validators";
import { groupConversationsByDate } from "../utils/conversationMappers";
import { MESSAGE_SOURCES } from "../types";

export const useConversations = (initialSource = "all") => {
  // Estados principales
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados de filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState(initialSource);
  const [sortBy, setSortBy] = useState("fecha_desc"); // fecha_desc, fecha_asc, nombre, mensajes_pendientes
  const [filterBy, setFilterBy] = useState("all"); // all, unread, assigned, unassigned

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalConversations, setTotalConversations] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Referencias y control
  const mountedRef = useRef(true);
  const searchTimeoutRef = useRef(null);
  const loadingRef = useRef(false);
  const pendingUpdatesRef = useRef(new Map());

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Función principal para cargar conversaciones
  const loadConversations = useCallback(
    async (options = {}) => {
      if (loadingRef.current || !mountedRef.current) return;

      const {
        page = 1,
        append = false,
        forceRefresh = false,
        source = selectedSource,
        search = searchQuery,
      } = options;

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        let result;

        if (source === "all") {
          result = await conversationService.getAllConversations({
            page,
            search,
            forceRefresh,
          });
        } else {
          result = await conversationService.getConversationsBySource(source, {
            page,
            search,
            forceRefresh,
          });
        }

        if (!mountedRef.current) return;

        const validConversations = result.conversations.filter((conv) => {
          const validation = validateConversation(conv);
          if (!validation.isValid) {
            console.warn("Conversación inválida filtrada:", validation.errors);
            return false;
          }
          return true;
        });

        if (append && page > 1) {
          setConversations((prev) => {
            const existingIds = new Set(prev.map((conv) => conv.id));
            const newConversations = validConversations.filter(
              (conv) => !existingIds.has(conv.id)
            );
            return [...prev, ...newConversations];
          });
        } else {
          setConversations(validConversations);
        }

        setCurrentPage(page);
        setTotalPages(result.totalPages || 1);
        setTotalConversations(result.total || 0);
        setHasMore(page < (result.totalPages || 1));
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message);
          console.error("Error cargando conversaciones:", err);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    },
    [selectedSource, searchQuery]
  );

  // Aplicar filtros y ordenamiento local
  const applyFiltersAndSort = useCallback(() => {
    if (!mountedRef.current) return;

    let filtered = [...conversations];

    // Aplicar filtro por fuente
    if (selectedSource !== "all") {
      filtered = filtered.filter((conv) => conv.source === selectedSource);
    }

    // Aplicar filtro por estado
    switch (filterBy) {
      case "unread":
        filtered = filtered.filter((conv) => conv.mensajes_pendientes > 0);
        break;
      case "assigned":
        filtered = filtered.filter((conv) => conv.id_encargado);
        break;
      case "unassigned":
        filtered = filtered.filter((conv) => !conv.id_encargado);
        break;
      default:
        break;
    }

    // Aplicar búsqueda local si hay query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (conv) =>
          conv.nombre_cliente?.toLowerCase().includes(query) ||
          conv.texto_mensaje?.toLowerCase().includes(query) ||
          conv.celular_cliente?.includes(query) ||
          conv.etiquetas?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Aplicar ordenamiento
    switch (sortBy) {
      case "fecha_asc":
        filtered.sort(
          (a, b) =>
            new Date(a.mensaje_created_at) - new Date(b.mensaje_created_at)
        );
        break;
      case "fecha_desc":
        filtered.sort(
          (a, b) =>
            new Date(b.mensaje_created_at) - new Date(a.mensaje_created_at)
        );
        break;
      case "nombre":
        filtered.sort((a, b) =>
          (a.nombre_cliente || "").localeCompare(b.nombre_cliente || "")
        );
        break;
      case "mensajes_pendientes":
        filtered.sort((a, b) => b.mensajes_pendientes - a.mensajes_pendientes);
        break;
      default:
        break;
    }

    setFilteredConversations(filtered);
  }, [conversations, selectedSource, filterBy, searchQuery, sortBy]);

  // Aplicar filtros cuando cambien las dependencias
  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  // Cargar conversaciones iniciales
  useEffect(() => {
    loadConversations();
  }, [selectedSource]);

  // Función para buscar con debounce
  const searchConversations = useCallback(
    (query) => {
      setSearchQuery(query);

      // Limpiar timeout anterior
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Si no hay query, aplicar filtros locales
      if (!query.trim()) {
        applyFiltersAndSort();
        return;
      }

      // Buscar con debounce para evitar muchas requests
      searchTimeoutRef.current = setTimeout(() => {
        loadConversations({ search: query, page: 1 });
      }, 500);
    },
    [loadConversations, applyFiltersAndSort]
  );

  // Función para cambiar fuente
  const changeSource = useCallback((source) => {
    setSelectedSource(source);
    setCurrentPage(1);
    setSearchQuery("");
  }, []);

  // Función para cambiar filtro
  const changeFilter = useCallback((filter) => {
    setFilterBy(filter);
  }, []);

  // Función para cambiar ordenamiento
  const changeSort = useCallback((sort) => {
    setSortBy(sort);
  }, []);

  // Función para cargar más conversaciones (paginación)
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadConversations({
        page: currentPage + 1,
        append: true,
      });
    }
  }, [hasMore, loading, currentPage, loadConversations]);

  // Función para refrescar
  const refresh = useCallback(() => {
    setCurrentPage(1);
    loadConversations({ forceRefresh: true });
  }, [loadConversations]);

  // Función para actualizar conversación específica con batching
  const updateConversation = useCallback(
    (conversationId, updates, immediate = false) => {
      if (!mountedRef.current) return;

      if (immediate) {
        // Actualización inmediata para UI responsiva
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId ? { ...conv, ...updates } : conv
          )
        );
      } else {
        // Batching de actualizaciones para mejor performance
        pendingUpdatesRef.current.set(conversationId, {
          ...pendingUpdatesRef.current.get(conversationId),
          ...updates,
        });

        // Procesar actualizaciones pendientes
        setTimeout(() => {
          if (!mountedRef.current) return;

          const updates = Array.from(pendingUpdatesRef.current.entries());
          if (updates.length === 0) return;

          setConversations((prev) =>
            prev.map((conv) => {
              const pendingUpdate = pendingUpdatesRef.current.get(conv.id);
              return pendingUpdate ? { ...conv, ...pendingUpdate } : conv;
            })
          );

          pendingUpdatesRef.current.clear();
        }, 16); // Next frame
      }
    },
    []
  );

  // Función para agregar nueva conversación
  const addConversation = useCallback((newConversation) => {
    if (!mountedRef.current) return;

    const validation = validateConversation(newConversation);
    if (!validation.isValid) {
      console.warn(
        "Intentando agregar conversación inválida:",
        validation.errors
      );
      return;
    }

    setConversations((prev) => {
      // Evitar duplicados
      const exists = prev.some((conv) => conv.id === newConversation.id);
      if (exists) return prev;

      // Agregar al principio (más reciente)
      return [newConversation, ...prev];
    });
  }, []);

  // Función para remover conversación
  const removeConversation = useCallback((conversationId) => {
    if (!mountedRef.current) return;

    setConversations((prev) =>
      prev.filter((conv) => conv.id !== conversationId)
    );
  }, []);

  // Función para marcar como leída
  const markAsRead = useCallback(
    async (conversationId, source) => {
      try {
        await conversationService.markAsRead(conversationId, source);
        updateConversation(conversationId, { mensajes_pendientes: 0 });
      } catch (err) {
        console.error("Error marcando conversación como leída:", err);
      }
    },
    [updateConversation]
  );

  // Funciones de utilidad
  const getConversationById = useCallback(
    (conversationId) => {
      return conversations.find((conv) => conv.id === conversationId);
    },
    [conversations]
  );

  const getUnreadCount = useCallback(() => {
    return filteredConversations.reduce(
      (total, conv) => total + conv.mensajes_pendientes,
      0
    );
  }, [filteredConversations]);

  const getConversationsBySource = useCallback(
    (source) => {
      return conversations.filter((conv) => conv.source === source);
    },
    [conversations]
  );

  const getGroupedConversations = useCallback(() => {
    return groupConversationsByDate(filteredConversations);
  }, [filteredConversations]);

  // Estados derivados
  const hasUnreadMessages = filteredConversations.some(
    (conv) => conv.mensajes_pendientes > 0
  );
  const totalUnread = getUnreadCount();
  const isEmpty = filteredConversations.length === 0;
  const isSearching = searchQuery.trim().length > 0;

  return {
    // Estados principales
    conversations: filteredConversations,
    allConversations: conversations,
    loading,
    error,

    // Estados de filtros
    searchQuery,
    selectedSource,
    sortBy,
    filterBy,

    // Estados de paginación
    currentPage,
    totalPages,
    totalConversations,
    hasMore,

    // Estados derivados
    hasUnreadMessages,
    totalUnread,
    isEmpty,
    isSearching,

    // Acciones principales
    loadConversations,
    searchConversations,
    changeSource,
    changeFilter,
    changeSort,
    loadMore,
    refresh,

    // Acciones de modificación
    updateConversation,
    addConversation,
    removeConversation,
    markAsRead,

    // Utilidades
    getConversationById,
    getUnreadCount,
    getConversationsBySource,
    getGroupedConversations,

    // Control de errores
    clearError: () => setError(null),
  };
};
