import api from "../../../api/chatcenter";
import { MESSAGE_SOURCES, MESSAGE_TYPES, createMessage } from "../types";
import { sanitizeMessage, validateMessage } from "../utils/validators";

class MessageService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 2 * 60 * 1000; // 2 minutos
  }

  // Obtener mensajes de una conversación
  async getMessages(conversationId, source, options = {}) {
    const { page = 1, limit = 50, forceRefresh = false } = options;

    const cacheKey = `messages-${conversationId}-${source}-${page}-${limit}`;

    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      let endpoint;

      switch (source) {
        case MESSAGE_SOURCES.MESSENGER:
          endpoint = `/api/mensajeria/mensajes-messenger/${conversationId}`;
          break;
        case MESSAGE_SOURCES.INSTAGRAM:
          endpoint = `/api/mensajeria/mensajes-instagram/${conversationId}`;
          break;
        case MESSAGE_SOURCES.WHATSAPP:
          endpoint = `/api/mensajeria/mensajes-whatsapp/${conversationId}`;
          break;
        case MESSAGE_SOURCES.TIKTOK:
          endpoint = `/api/mensajeria/mensajes-tiktok/${conversationId}`;
          break;
        default:
          throw new Error(`Fuente no soportada: ${source}`);
      }

      const response = await api.get(endpoint, {
        params: { page, limit },
      });

      if (response.data?.status === "success") {
        const rawMessages = response.data.data || [];
        const processedMessages = rawMessages
          .map((msg) => this.mapRawMessage(msg, source))
          .map((msg) => sanitizeMessage(msg))
          .filter((msg) => {
            const validation = validateMessage(msg);
            if (!validation.isValid) {
              console.warn("Mensaje inválido filtrado:", validation.errors);
              return false;
            }
            return true;
          })
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        const result = {
          messages: processedMessages,
          total: response.data.total || processedMessages.length,
          page,
          totalPages: Math.ceil(
            (response.data.total || processedMessages.length) / limit
          ),
          conversationId,
          source,
        };

        // Actualizar caché
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });

        return result;
      }

      throw new Error(response.data?.message || "Error al obtener mensajes");
    } catch (error) {
      console.error(`Error obteniendo mensajes de ${conversationId}:`, error);
      throw new Error("No se pudieron cargar los mensajes");
    }
  }

  // Enviar mensaje de texto
  async sendTextMessage(conversationId, source, text, options = {}) {
    try {
      const messageData = {
        text: text.trim(),
        type: MESSAGE_TYPES.TEXT,
        ...options,
      };

      return await this.sendMessage(conversationId, source, messageData);
    } catch (error) {
      console.error("Error enviando mensaje de texto:", error);
      throw new Error("No se pudo enviar el mensaje de texto");
    }
  }

  // Enviar mensaje con archivo
  async sendFileMessage(conversationId, source, file, options = {}) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", this.getFileMessageType(file.type));

      if (options.caption) {
        formData.append("caption", options.caption);
      }

      let endpoint;

      switch (source) {
        case MESSAGE_SOURCES.MESSENGER:
          endpoint = `/api/mensajeria/enviar-archivo-messenger/${conversationId}`;
          break;
        case MESSAGE_SOURCES.INSTAGRAM:
          endpoint = `/api/mensajeria/enviar-archivo-instagram/${conversationId}`;
          break;
        case MESSAGE_SOURCES.WHATSAPP:
          endpoint = `/api/mensajeria/enviar-archivo-whatsapp/${conversationId}`;
          break;
        case MESSAGE_SOURCES.TIKTOK:
          endpoint = `/api/mensajeria/enviar-archivo-tiktok/${conversationId}`;
          break;
        default:
          throw new Error(`Fuente no soportada: ${source}`);
      }

      const response = await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data?.status === "success") {
        this.invalidateMessagesCache(conversationId, source);
        return response.data.data;
      }

      throw new Error(response.data?.message || "Error al enviar archivo");
    } catch (error) {
      console.error("Error enviando archivo:", error);
      throw new Error("No se pudo enviar el archivo");
    }
  }

  // Enviar mensaje genérico
  async sendMessage(conversationId, source, messageData) {
    try {
      let endpoint;

      switch (source) {
        case MESSAGE_SOURCES.MESSENGER:
          endpoint = `/api/mensajeria/enviar-messenger/${conversationId}`;
          break;
        case MESSAGE_SOURCES.INSTAGRAM:
          endpoint = `/api/mensajeria/enviar-instagram/${conversationId}`;
          break;
        case MESSAGE_SOURCES.WHATSAPP:
          endpoint = `/api/mensajeria/enviar-whatsapp/${conversationId}`;
          break;
        case MESSAGE_SOURCES.TIKTOK:
          endpoint = `/api/mensajeria/enviar-tiktok/${conversationId}`;
          break;
        default:
          throw new Error(`Fuente no soportada: ${source}`);
      }

      const response = await api.post(endpoint, messageData);

      if (response.data?.status === "success") {
        // Invalidar caché de mensajes
        this.invalidateMessagesCache(conversationId, source);

        // Retornar mensaje mapeado
        const sentMessage = this.mapRawMessage(response.data.data, source);
        return sanitizeMessage(sentMessage);
      }

      throw new Error(response.data?.message || "Error al enviar mensaje");
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      throw new Error("No se pudo enviar el mensaje");
    }
  }

  // Marcar mensaje como leído
  async markMessageAsRead(messageId, source) {
    try {
      let endpoint;

      switch (source) {
        case MESSAGE_SOURCES.MESSENGER:
          endpoint = `/api/mensajeria/marcar-leido-messenger/${messageId}`;
          break;
        case MESSAGE_SOURCES.INSTAGRAM:
          endpoint = `/api/mensajeria/marcar-leido-instagram/${messageId}`;
          break;
        case MESSAGE_SOURCES.WHATSAPP:
          endpoint = `/api/mensajeria/marcar-leido-whatsapp/${messageId}`;
          break;
        case MESSAGE_SOURCES.TIKTOK:
          endpoint = `/api/mensajeria/marcar-leido-tiktok/${messageId}`;
          break;
        default:
          throw new Error(`Fuente no soportada: ${source}`);
      }

      const response = await api.post(endpoint);

      if (response.data?.status === "success") {
        return true;
      }

      throw new Error(response.data?.message || "Error al marcar como leído");
    } catch (error) {
      console.error("Error marcando mensaje como leído:", error);
      return false;
    }
  }

  // Eliminar mensaje
  async deleteMessage(messageId, source) {
    try {
      let endpoint;

      switch (source) {
        case MESSAGE_SOURCES.MESSENGER:
          endpoint = `/api/mensajeria/eliminar-mensaje-messenger/${messageId}`;
          break;
        case MESSAGE_SOURCES.INSTAGRAM:
          endpoint = `/api/mensajeria/eliminar-mensaje-instagram/${messageId}`;
          break;
        case MESSAGE_SOURCES.WHATSAPP:
          endpoint = `/api/mensajeria/eliminar-mensaje-whatsapp/${messageId}`;
          break;
        case MESSAGE_SOURCES.TIKTOK:
          endpoint = `/api/mensajeria/eliminar-mensaje-tiktok/${messageId}`;
          break;
        default:
          throw new Error(`Fuente no soportada: ${source}`);
      }

      const response = await api.delete(endpoint);

      if (response.data?.status === "success") {
        // Invalidar caché
        this.clearCache();
        return true;
      }

      throw new Error(response.data?.message || "Error al eliminar mensaje");
    } catch (error) {
      console.error("Error eliminando mensaje:", error);
      throw new Error("No se pudo eliminar el mensaje");
    }
  }

  // Mapear mensaje raw a estructura estándar
  mapRawMessage(rawMessage, source) {
    const baseMessage = createMessage();

    return {
      ...baseMessage,
      id: rawMessage.id || rawMessage.message_id,
      conversation_id: rawMessage.conversation_id || rawMessage.chat_id,
      text: rawMessage.text || rawMessage.message || rawMessage.content || "",
      type: this.detectMessageType(rawMessage),
      source,
      is_from_user: rawMessage.is_from_user || rawMessage.from_user || false,
      created_at:
        rawMessage.created_at ||
        rawMessage.timestamp ||
        new Date().toISOString(),
      attachment_url: rawMessage.attachment_url || rawMessage.media_url || null,
      attachment_type:
        rawMessage.attachment_type || rawMessage.media_type || null,
      metadata: {
        platform_id: rawMessage.platform_id || rawMessage.external_id,
        sender_name: rawMessage.sender_name || rawMessage.from_name,
        sender_id: rawMessage.sender_id || rawMessage.from_id,
        delivery_status: rawMessage.delivery_status || "sent",
        read_status: rawMessage.read_status || rawMessage.is_read || false,
        ...rawMessage.metadata,
      },
    };
  }

  // Detectar tipo de mensaje basado en datos raw
  detectMessageType(rawMessage) {
    if (rawMessage.type) {
      return rawMessage.type;
    }

    if (rawMessage.attachment_url || rawMessage.media_url) {
      const mediaType =
        rawMessage.attachment_type || rawMessage.media_type || "";

      if (mediaType.includes("image")) return MESSAGE_TYPES.IMAGE;
      if (mediaType.includes("video")) return MESSAGE_TYPES.VIDEO;
      if (mediaType.includes("audio")) return MESSAGE_TYPES.AUDIO;
      return MESSAGE_TYPES.FILE;
    }

    if (rawMessage.text || rawMessage.message || rawMessage.content) {
      return MESSAGE_TYPES.TEXT;
    }

    return MESSAGE_TYPES.SYSTEM;
  }

  // Obtener tipo de mensaje para archivo
  getFileMessageType(mimeType) {
    if (mimeType.startsWith("image/")) return MESSAGE_TYPES.IMAGE;
    if (mimeType.startsWith("video/")) return MESSAGE_TYPES.VIDEO;
    if (mimeType.startsWith("audio/")) return MESSAGE_TYPES.AUDIO;
    return MESSAGE_TYPES.FILE;
  }

  // Invalidar caché de mensajes para una conversación
  invalidateMessagesCache(conversationId, source) {
    for (const key of this.cache.keys()) {
      if (key.includes(`messages-${conversationId}-${source}`)) {
        this.cache.delete(key);
      }
    }
  }

  // Limpiar todo el caché
  clearCache() {
    this.cache.clear();
  }

  // Obtener estadísticas de mensajes
  async getMessageStats(conversationId, source) {
    try {
      const endpoint = `/api/mensajeria/estadisticas-mensajes/${conversationId}`;
      const response = await api.get(endpoint, {
        params: { source },
      });

      if (response.data?.status === "success") {
        return response.data.data;
      }

      return {
        total: 0,
        sent: 0,
        received: 0,
        unread: 0,
      };
    } catch (error) {
      console.error("Error obteniendo estadísticas de mensajes:", error);
      return {
        total: 0,
        sent: 0,
        received: 0,
        unread: 0,
      };
    }
  }
}

// Singleton
const messageService = new MessageService();

export default messageService;
