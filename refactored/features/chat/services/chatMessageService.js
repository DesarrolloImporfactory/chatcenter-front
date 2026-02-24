/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CHAT — Servicio de mensajes                      ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Consolida la lógica de API de mensajes dispersa en:     ║
 * ║  - src/pages/chat/Chat.jsx (~30 llamadas a chatApi)       ║
 * ║  - src/components/chat/ChatPrincipal.jsx (~20 llamadas)   ║
 * ║  - src/components/chat/Modales.jsx (~15 llamadas)         ║
 * ║  - src/features/chat/services/messageService.js (parcial) ║
 * ║                                                           ║
 * ║  USO DESPUÉS DE MIGRACIÓN:                                ║
 * ║    import { chatMessageService } from "@features/chat";   ║
 * ║    const msgs = await chatMessageService.getMessages(id); ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import chatApi from "../../../shared/api/chatcenter";

class ChatMessageService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 2 * 60 * 1000; // 2 min
  }

  /* ─────── Mensajes ─────── */

  async getMessages(chatId, { page = 1, limit = 50, source = "whatsapp" } = {}) {
    const cacheKey = `msg-${chatId}-${source}-${page}-${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.cacheTimeout) return cached.data;

    const endpoints = {
      whatsapp: `/api/mensajeria/mensajes-whatsapp/${chatId}`,
      messenger: `/api/mensajeria/mensajes-messenger/${chatId}`,
      instagram: `/api/mensajeria/mensajes-instagram/${chatId}`,
      tiktok: `/api/mensajeria/mensajes-tiktok/${chatId}`,
    };

    const endpoint = endpoints[source] || endpoints.whatsapp;
    const { data } = await chatApi.get(endpoint, { params: { page, limit } });

    const result = {
      messages: data.data || [],
      total: data.total || 0,
      page,
      totalPages: Math.ceil((data.total || 0) / limit),
    };

    this.cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  }

  /* ─────── Enviar mensaje de texto ─────── */

  async sendText(chatId, texto, extraPayload = {}) {
    const { data } = await chatApi.post("enviarMensaje", {
      id_cliente_chat_center: chatId,
      texto,
      ...extraPayload,
    });
    return data;
  }

  /* ─────── Enviar archivo / imagen ─────── */

  async sendMedia(chatId, file, tipo = "image", onProgress) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("id_cliente_chat_center", chatId);
    fd.append("tipo", tipo);

    const { data } = await chatApi.post("enviarArchivo", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
        : undefined,
    });
    return data;
  }

  /* ─────── Enviar plantilla ─────── */

  async sendTemplate(payload) {
    const { data } = await chatApi.post("enviarMensajePlantilla", payload);
    return data;
  }

  /* ─────── Programar plantilla ─────── */

  async scheduleTemplate(formData) {
    const { data } = await chatApi.post("plantillas/programar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }

  /* ─────── Reenviar mensaje ─────── */

  async forwardMessage(messageId, targetChatId) {
    const { data } = await chatApi.post("reenviarMensaje", {
      id_mensaje: messageId,
      id_cliente_destino: targetChatId,
    });
    return data;
  }

  /* ─────── Marcar como leído ─────── */

  async markAsRead(chatId) {
    const { data } = await chatApi.post("marcarLeido", {
      id_cliente_chat_center: chatId,
    });
    return data;
  }

  /* ─────── Cache ─────── */

  invalidateChat(chatId) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`msg-${chatId}`)) this.cache.delete(key);
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export default new ChatMessageService();
