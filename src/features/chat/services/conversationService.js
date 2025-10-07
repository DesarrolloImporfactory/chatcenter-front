import api from "../../../api/chatcenter";
import { MESSAGE_SOURCES } from "../types";
import {
  sanitizeConversation,
  validateConversation,
} from "../utils/validators";
import { mapConversationBySource } from "../utils/conversationMappers";

class ConversationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  // Obtener conversaciones por fuente con caché
  async getConversationsBySource(source, options = {}) {
    const { page = 1, limit = 50, search = "", forceRefresh = false } = options;

    const cacheKey = `${source}-${page}-${limit}-${search}`;

    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      let endpoint;
      let params = { page, limit };

      if (search) {
        params.search = search;
      }

      switch (source) {
        case MESSAGE_SOURCES.MESSENGER:
          endpoint = "/api/mensajeria/conversaciones-messenger";
          break;
        case MESSAGE_SOURCES.INSTAGRAM:
          endpoint = "/api/mensajeria/conversaciones-instagram";
          break;
        case MESSAGE_SOURCES.WHATSAPP:
          endpoint = "/api/mensajeria/conversaciones-whatsapp";
          break;
        case MESSAGE_SOURCES.TIKTOK:
          endpoint = "/api/mensajeria/conversaciones-tiktok";
          break;
        default:
          throw new Error(`Fuente no soportada: ${source}`);
      }

      const response = await api.get(endpoint, { params });

      if (response.data?.status === "success") {
        const rawConversations = response.data.data || [];
        const mappedConversations = rawConversations
          .map((conv) => mapConversationBySource(conv, source))
          .map((conv) => sanitizeConversation(conv))
          .filter((conv) => {
            const validation = validateConversation(conv);
            if (!validation.isValid) {
              console.warn(
                "Conversación inválida filtrada:",
                validation.errors
              );
              return false;
            }
            return true;
          });

        const result = {
          conversations: mappedConversations,
          total: response.data.total || mappedConversations.length,
          page,
          totalPages: Math.ceil(
            (response.data.total || mappedConversations.length) / limit
          ),
        };

        // Actualizar caché
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });

        return result;
      }

      throw new Error(
        response.data?.message || "Error al obtener conversaciones"
      );
    } catch (error) {
      console.error(`Error obteniendo conversaciones ${source}:`, error);
      throw new Error(`No se pudieron cargar las conversaciones de ${source}`);
    }
  }

  // Obtener todas las conversaciones unificadas
  async getAllConversations(options = {}) {
    const sources = [
      MESSAGE_SOURCES.WHATSAPP,
      MESSAGE_SOURCES.MESSENGER,
      MESSAGE_SOURCES.INSTAGRAM,
      MESSAGE_SOURCES.TIKTOK,
    ];

    try {
      const promises = sources.map((source) =>
        this.getConversationsBySource(source, options).catch((error) => {
          console.warn(`Error cargando ${source}:`, error);
          return { conversations: [], total: 0 };
        })
      );

      const results = await Promise.all(promises);

      const allConversations = results
        .flatMap((result) => result.conversations)
        .sort(
          (a, b) =>
            new Date(b.mensaje_created_at) - new Date(a.mensaje_created_at)
        );

      return {
        conversations: allConversations,
        total: allConversations.length,
        bySource: {
          [MESSAGE_SOURCES.WHATSAPP]: results[0],
          [MESSAGE_SOURCES.MESSENGER]: results[1],
          [MESSAGE_SOURCES.INSTAGRAM]: results[2],
          [MESSAGE_SOURCES.TIKTOK]: results[3],
        },
      };
    } catch (error) {
      console.error("Error obteniendo todas las conversaciones:", error);
      throw new Error("No se pudieron cargar las conversaciones");
    }
  }

  // Obtener conversación específica
  async getConversationById(conversationId, source) {
    try {
      let endpoint;

      switch (source) {
        case MESSAGE_SOURCES.MESSENGER:
          endpoint = `/api/mensajeria/conversacion-messenger/${conversationId}`;
          break;
        case MESSAGE_SOURCES.INSTAGRAM:
          endpoint = `/api/mensajeria/conversacion-instagram/${conversationId}`;
          break;
        case MESSAGE_SOURCES.WHATSAPP:
          endpoint = `/api/mensajeria/conversacion-whatsapp/${conversationId}`;
          break;
        case MESSAGE_SOURCES.TIKTOK:
          endpoint = `/api/mensajeria/conversacion-tiktok/${conversationId}`;
          break;
        default:
          throw new Error(`Fuente no soportada: ${source}`);
      }

      const response = await api.get(endpoint);

      if (response.data?.status === "success") {
        const rawConversation = response.data.data;
        const mappedConversation = mapConversationBySource(
          rawConversation,
          source
        );
        const sanitizedConversation = sanitizeConversation(mappedConversation);

        const validation = validateConversation(sanitizedConversation);
        if (!validation.isValid) {
          throw new Error(
            `Conversación inválida: ${validation.errors.join(", ")}`
          );
        }

        return sanitizedConversation;
      }

      throw new Error(response.data?.message || "Conversación no encontrada");
    } catch (error) {
      console.error(`Error obteniendo conversación ${conversationId}:`, error);
      throw new Error("No se pudo cargar la conversación");
    }
  }

  // Actualizar conversación
  async updateConversation(conversationId, source, updateData) {
    try {
      let endpoint;

      switch (source) {
        case MESSAGE_SOURCES.MESSENGER:
          endpoint = `/api/mensajeria/conversacion-messenger/${conversationId}`;
          break;
        case MESSAGE_SOURCES.INSTAGRAM:
          endpoint = `/api/mensajeria/conversacion-instagram/${conversationId}`;
          break;
        case MESSAGE_SOURCES.WHATSAPP:
          endpoint = `/api/mensajeria/conversacion-whatsapp/${conversationId}`;
          break;
        case MESSAGE_SOURCES.TIKTOK:
          endpoint = `/api/mensajeria/conversacion-tiktok/${conversationId}`;
          break;
        default:
          throw new Error(`Fuente no soportada: ${source}`);
      }

      const response = await api.put(endpoint, updateData);

      if (response.data?.status === "success") {
        // Invalidar caché relacionado
        this.invalidateCache(source);
        return response.data.data;
      }

      throw new Error(
        response.data?.message || "Error al actualizar conversación"
      );
    } catch (error) {
      console.error(
        `Error actualizando conversación ${conversationId}:`,
        error
      );
      throw new Error("No se pudo actualizar la conversación");
    }
  }

  // Marcar conversación como leída
  async markAsRead(conversationId, source) {
    return this.updateConversation(conversationId, source, {
      mensajes_pendientes: 0,
      last_read_at: new Date().toISOString(),
    });
  }

  // Buscar conversaciones
  async searchConversations(query, sources = null) {
    const searchSources = sources || [
      MESSAGE_SOURCES.WHATSAPP,
      MESSAGE_SOURCES.MESSENGER,
      MESSAGE_SOURCES.INSTAGRAM,
      MESSAGE_SOURCES.TIKTOK,
    ];

    try {
      const promises = searchSources.map((source) =>
        this.getConversationsBySource(source, {
          search: query,
          limit: 20,
        }).catch((error) => {
          console.warn(`Error buscando en ${source}:`, error);
          return { conversations: [] };
        })
      );

      const results = await Promise.all(promises);

      const searchResults = results
        .flatMap((result) => result.conversations)
        .filter(
          (conv) =>
            conv.nombre_cliente?.toLowerCase().includes(query.toLowerCase()) ||
            conv.texto_mensaje?.toLowerCase().includes(query.toLowerCase()) ||
            conv.celular_cliente?.includes(query)
        )
        .sort(
          (a, b) =>
            new Date(b.mensaje_created_at) - new Date(a.mensaje_created_at)
        );

      return {
        conversations: searchResults,
        total: searchResults.length,
        query,
      };
    } catch (error) {
      console.error("Error en búsqueda de conversaciones:", error);
      throw new Error("Error al buscar conversaciones");
    }
  }

  // Limpiar caché
  clearCache() {
    this.cache.clear();
  }

  // Invalidar caché por fuente
  invalidateCache(source = null) {
    if (source) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(source)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.clearCache();
    }
  }

  // Obtener estadísticas de conversaciones
  async getConversationStats() {
    try {
      const response = await api.get(
        "/api/mensajeria/estadisticas-conversaciones"
      );

      if (response.data?.status === "success") {
        return response.data.data;
      }

      throw new Error(
        response.data?.message || "Error al obtener estadísticas"
      );
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error);
      return {
        total: 0,
        pending: 0,
        bySource: {},
      };
    }
  }
}

// Singleton
const conversationService = new ConversationService();

export default conversationService;
