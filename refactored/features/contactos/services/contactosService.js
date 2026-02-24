/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CONTACTOS — Servicio                             ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Consolida llamadas API de contactos de:                  ║
 * ║  - src/services/clientesChatCenter.service.js             ║
 * ║  - src/components/clientes/Contactos.jsx                  ║
 * ║  - src/pages/contactos/Estado_contactos_ventas.jsx        ║
 * ║  - src/pages/contactos/Estado_contactos_imporshop.jsx     ║
 * ║  - src/pages/contactos/Estado_contactos_imporfactory.jsx  ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import chatApi from "../../../shared/api/chatcenter";

class ContactosService {
  async fetchAll({ page = 1, limit = 50, search = "", estado = "" } = {}) {
    const params = { page, limit };
    if (search) params.search = search;
    if (estado) params.estado = estado;

    const { data } = await chatApi.get("clientes", { params });
    return {
      contactos: data.data || [],
      total: data.total || 0,
      page,
      totalPages: Math.ceil((data.total || 0) / limit),
    };
  }

  async getById(id) {
    const { data } = await chatApi.get(`clientes/${id}`);
    return data;
  }

  async update(id, payload) {
    const { data } = await chatApi.put(`clientes/${id}`, payload);
    return data;
  }

  async updateEstado(id, estado) {
    const { data } = await chatApi.post("clientes/estado", {
      id_cliente_chat_center: id,
      estado,
    });
    return data;
  }

  async assignTag(clientId, tagId) {
    const { data } = await chatApi.post("clientes/etiqueta", {
      id_cliente_chat_center: clientId,
      id_etiqueta: tagId,
    });
    return data;
  }

  async removeTag(clientId, tagId) {
    const { data } = await chatApi.post("clientes/etiqueta/remover", {
      id_cliente_chat_center: clientId,
      id_etiqueta: tagId,
    });
    return data;
  }

  /**
   * Mover contacto en Kanban (drag & drop).
   */
  async moveKanban(clientId, fromColumn, toColumn) {
    const { data } = await chatApi.post("clientes/kanban/mover", {
      id_cliente_chat_center: clientId,
      from: fromColumn,
      to: toColumn,
    });
    return data;
  }
}

export default new ContactosService();
