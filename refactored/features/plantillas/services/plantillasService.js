/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  FEATURE PLANTILLAS — Servicio                            ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Consolida llamadas API de plantillas desde:              ║
 * ║  - src/pages/admintemplates/CrearPlantillaModal.jsx       ║
 * ║  - src/pages/admintemplates/CrearConfiguracionModal.jsx   ║
 * ║  - src/components/chat/Modales.jsx                        ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import chatApi from "../../../shared/api/chatcenter";

class PlantillasService {
  async fetchAll(configId) {
    const { data } = await chatApi.get("plantillas", {
      params: configId ? { id_configuracion: configId } : {},
    });
    return data;
  }

  async getById(id) {
    const { data } = await chatApi.get(`plantillas/${id}`);
    return data;
  }

  async create(payload) {
    const { data } = await chatApi.post("plantillas", payload);
    return data;
  }

  async update(id, payload) {
    const { data } = await chatApi.put(`plantillas/${id}`, payload);
    return data;
  }

  async delete(id) {
    const { data } = await chatApi.delete(`plantillas/${id}`);
    return data;
  }

  /**
   * Buscar plantillas por nombre (para el modal de envío).
   */
  async search(query, configId) {
    const { data } = await chatApi.get("plantillas/buscar", {
      params: { q: query, id_configuracion: configId },
    });
    return data;
  }

  /**
   * Crear plantilla en WhatsApp Business API.
   */
  async createInWhatsApp(payload) {
    const { data } = await chatApi.post("plantillas/whatsapp", payload);
    return data;
  }
}

export default new PlantillasService();
