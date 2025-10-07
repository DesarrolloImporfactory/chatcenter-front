import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { es } from "date-fns/locale";
import { MESSAGE_SOURCES, createConversationBase } from "../types";

// Utilidad para formatear fechas
export const formatFecha = (fechaISO) => {
  if (!fechaISO) return "";

  try {
    const fecha = new Date(fechaISO);
    if (isNaN(fecha.getTime())) return "";

    if (isToday(fecha)) {
      return format(fecha, "HH:mm", { locale: es });
    } else if (isYesterday(fecha)) {
      return "Ayer";
    } else if (isThisWeek(fecha)) {
      return format(fecha, "EEEE", { locale: es });
    } else {
      return format(fecha, "dd/MM/yy", { locale: es });
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

// Utilidad para procesar fecha raw
export const processRawDate = (rawFecha) => {
  if (!rawFecha) return new Date();

  const date = rawFecha instanceof Date ? rawFecha : new Date(rawFecha);
  return isNaN(date.getTime()) ? new Date() : date;
};

// Mapeo genérico de conversación
const mapConversationBase = (row, source, idField, namePrefix) => {
  const rawFecha =
    row.last_message_at ??
    row.mensaje_created_at ??
    row.updated_at ??
    row.first_contact_at ??
    null;

  const fecha = processRawDate(rawFecha);
  const clientId = row[idField] ?? row.celular_cliente;
  const clientName =
    row.customer_name ??
    row.nombre_cliente ??
    (clientId ? `${namePrefix} • ${String(clientId).slice(-6)}` : namePrefix);

  return {
    ...createConversationBase(),
    id: row.id,
    source,
    page_id: row.page_id,
    mensaje_created_at: fecha.toISOString(),
    texto_mensaje: row.preview ?? row.texto_mensaje ?? "",
    celular_cliente: clientId,
    mensajes_pendientes: (row.unread_count ?? row.mensajes_pendientes) || 0,
    nombre_cliente: clientName,
    profile_pic_url: row.profile_pic_url || null,
    id_encargado: row.id_encargado ?? null,
    etiquetas: row.etiquetas || [],
    transporte: row.transporte || null,
    estado_factura: row.estado_factura || null,
    novedad_info: row.novedad_info || null,
  };
};

// Mapeo específico para Messenger
export const mapMsConvToSidebar = (row) => {
  return mapConversationBase(
    row,
    MESSAGE_SOURCES.MESSENGER,
    "psid",
    "Facebook"
  );
};

// Mapeo específico para Instagram
export const mapIgConvToSidebar = (row) => {
  return mapConversationBase(
    row,
    MESSAGE_SOURCES.INSTAGRAM,
    "igsid",
    "Instagram"
  );
};

// Mapeo específico para WhatsApp
export const mapWsConvToSidebar = (row) => {
  return mapConversationBase(
    row,
    MESSAGE_SOURCES.WHATSAPP,
    "celular_cliente",
    "WhatsApp"
  );
};

// Mapeo específico para TikTok
export const mapTikTokConvToSidebar = (row) => {
  return mapConversationBase(
    row,
    MESSAGE_SOURCES.TIKTOK,
    "tiktok_id",
    "TikTok"
  );
};

// Mapeo unificado basado en fuente
export const mapConversationBySource = (row, source) => {
  switch (source) {
    case MESSAGE_SOURCES.MESSENGER:
      return mapMsConvToSidebar(row);
    case MESSAGE_SOURCES.INSTAGRAM:
      return mapIgConvToSidebar(row);
    case MESSAGE_SOURCES.WHATSAPP:
      return mapWsConvToSidebar(row);
    case MESSAGE_SOURCES.TIKTOK:
      return mapTikTokConvToSidebar(row);
    default:
      return mapConversationBase(row, source, "client_id", "Chat");
  }
};

// Utilidad para sanitizar texto
export const sanitizeText = (text) => {
  if (!text) return "";
  return text.trim().replace(/\s+/g, " ");
};

// Utilidad para extraer preview de mensaje
export const extractMessagePreview = (message, maxLength = 50) => {
  if (!message) return "";
  const sanitized = sanitizeText(message);
  return sanitized.length > maxLength
    ? sanitized.substring(0, maxLength) + "..."
    : sanitized;
};

// Utilidad para generar ID único
export const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Utilidad para agrupar conversaciones por fecha
export const groupConversationsByDate = (conversations) => {
  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  conversations.forEach((conv) => {
    const date = new Date(conv.mensaje_created_at);

    if (isToday(date)) {
      groups.today.push(conv);
    } else if (isYesterday(date)) {
      groups.yesterday.push(conv);
    } else if (isThisWeek(date)) {
      groups.thisWeek.push(conv);
    } else {
      groups.older.push(conv);
    }
  });

  return groups;
};

export default {
  formatFecha,
  processRawDate,
  mapMsConvToSidebar,
  mapIgConvToSidebar,
  mapWsConvToSidebar,
  mapTikTokConvToSidebar,
  mapConversationBySource,
  sanitizeText,
  extractMessagePreview,
  generateUniqueId,
  groupConversationsByDate,
};
