/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE CONEXIONES — Servicio de configuraciones         ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Consolida las llamadas API de conexiones dispersas en:   ║
 * ║  - src/pages/conexiones/Conexiones.jsx (~1700 líneas)     ║
 * ║  - src/pages/conexiones/Conexionespruebas.jsx (~1700 lín) ║
 * ║  - src/pages/conexiones/AdminConexiones.jsx               ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import chatApi from "../../../shared/api/chatcenter";

class ConexionesService {
  /* ─────── CRUD de configuraciones ─────── */

  async fetchAll() {
    const { data } = await chatApi.get("configuraciones");
    return data;
  }

  async getById(id) {
    const { data } = await chatApi.get(`configuraciones/${id}`);
    return data;
  }

  async create(payload) {
    const { data } = await chatApi.post("configuraciones", payload);
    return data;
  }

  async update(id, payload) {
    const { data } = await chatApi.put(`configuraciones/${id}`, payload);
    return data;
  }

  async delete(id) {
    const { data } = await chatApi.delete(`configuraciones/${id}`);
    return data;
  }

  /* ─────── WhatsApp ─────── */

  async connectWhatsApp(configId) {
    const { data } = await chatApi.post(`configuraciones/${configId}/whatsapp/connect`);
    return data;
  }

  async disconnectWhatsApp(configId) {
    const { data } = await chatApi.post(`configuraciones/${configId}/whatsapp/disconnect`);
    return data;
  }

  async getQRCode(configId) {
    const { data } = await chatApi.get(`configuraciones/${configId}/whatsapp/qr`);
    return data;
  }

  /* ─────── Messenger ─────── */

  async connectMessenger(configId, pageToken) {
    const { data } = await chatApi.post(`configuraciones/${configId}/messenger/connect`, {
      page_token: pageToken,
    });
    return data;
  }

  /* ─────── Instagram ─────── */

  async connectInstagram(configId, payload) {
    const { data } = await chatApi.post(
      `configuraciones/${configId}/instagram/connect`,
      payload
    );
    return data;
  }

  /* ─────── Estado de conexiones ─────── */

  async getStatus(configId) {
    const { data } = await chatApi.get(`configuraciones/${configId}/status`);
    return data;
  }
}

export default new ConexionesService();
