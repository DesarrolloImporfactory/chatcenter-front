/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CHAT — Servicio de conversaciones / clientes     ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Consolida llamadas a chatApi de:                         ║
 * ║  - src/pages/chat/Chat.jsx (cargar chats, buscar, etc.)   ║
 * ║  - src/components/chat/Sidebar.jsx (listar, filtrar)      ║
 * ║  - src/services/clientesChatCenter.service.js             ║
 * ║  - src/features/chat/services/conversationService.js      ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import chatApi from "../../../shared/api/chatcenter";

class ChatConversationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 min
  }

  /* ─────── Listar conversaciones ─────── */

  async getConversations({ page = 1, limit = 50, search = "", source = "all" } = {}) {
    const endpoints = {
      all: "/api/mensajeria/conversaciones",
      whatsapp: "/api/mensajeria/conversaciones-whatsapp",
      messenger: "/api/mensajeria/conversaciones-messenger",
      instagram: "/api/mensajeria/conversaciones-instagram",
      tiktok: "/api/mensajeria/conversaciones-tiktok",
    };

    const endpoint = endpoints[source] || endpoints.all;
    const { data } = await chatApi.get(endpoint, {
      params: { page, limit, ...(search ? { search } : {}) },
    });

    return {
      conversations: data.data || [],
      total: data.total || 0,
      page,
      totalPages: Math.ceil((data.total || 0) / limit),
    };
  }

  /* ─────── Obtener un chat por ID ─────── */

  async getById(chatId) {
    const { data } = await chatApi.get(`clientes/${chatId}`);
    return data;
  }

  /* ─────── Toggle bot IA ─────── */

  async toggleBot(chatId, active) {
    const { data } = await chatApi.post(`chats/${chatId}/bot`, {
      bot_openia: active ? 1 : 0,
    });
    return data;
  }

  /* ─────── Cerrar / abrir chat ─────── */

  async closeChat(chatId) {
    const { data } = await chatApi.post("cerrarChat", {
      id_cliente_chat_center: chatId,
    });
    return data;
  }

  async reopenChat(chatId) {
    const { data } = await chatApi.post("reabrirChat", {
      id_cliente_chat_center: chatId,
    });
    return data;
  }

  /* ─────── Transferir chat ─────── */

  async transferChat(chatId, targetUserId) {
    const { data } = await chatApi.post("transferirChat", {
      id_cliente_chat_center: chatId,
      id_usuario_destino: targetUserId,
    });
    return data;
  }

  /* ─────── Etiquetas ─────── */

  async assignTag(chatId, tagId) {
    const { data } = await chatApi.post("asignarEtiqueta", {
      id_cliente_chat_center: chatId,
      id_etiqueta: tagId,
    });
    return data;
  }

  async removeTag(chatId, tagId) {
    const { data } = await chatApi.post("removerEtiqueta", {
      id_cliente_chat_center: chatId,
      id_etiqueta: tagId,
    });
    return data;
  }

  /* ─────── Cache ─────── */

  clearCache() {
    this.cache.clear();
  }
}

export default new ChatConversationService();
