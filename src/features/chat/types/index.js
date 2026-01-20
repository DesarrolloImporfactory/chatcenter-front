// Tipos de datos para el sistema de chat

// Tipos de fuentes de mensajes
export const MESSAGE_SOURCES = {
  WHATSAPP: "ws",
  MESSENGER: "ms",
  INSTAGRAM: "ig",
  TIKTOK: "tiktok",
  MANUAL: "manual",
};

// Estados de conversación
export const CONVERSATION_STATUS = {
  ACTIVE: "active",
  PENDING: "pending",
  CLOSED: "closed",
  ARCHIVED: "archived",
};

// Tipos de mensaje
export const MESSAGE_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  AUDIO: "audio",
  VIDEO: "video",
  DOCUMENT: "document",
  LOCATION: "location",
  TEMPLATE: "template",
  INTERACTIVE: "interactive",
};

// Estados de mensaje
export const MESSAGE_STATUS = {
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
  PENDING: "pending",
};

// Roles de usuario
export const USER_ROLES = {
  ADMIN: "administrador",
  AGENT: "agente",
  SUPERVISOR: "supervisor",
};

// Estructura base de conversación
export const createConversationBase = () => ({
  id: null,
  source: null,
  page_id: null,
  mensaje_created_at: new Date().toISOString(),
  texto_mensaje: "",
  celular_cliente: null,
  mensajes_pendientes: 0,
  visto: 0,
  nombre_cliente: "",
  imagePath: null,
  id_encargado: null,
  etiquetas: [],
  transporte: null,
  estado_factura: null,
  novedad_info: null,
});

// Estructura base de mensaje
export const createMessageBase = () => ({
  id: null,
  conversation_id: null,
  content: "",
  type: MESSAGE_TYPES.TEXT,
  status: MESSAGE_STATUS.PENDING,
  timestamp: new Date().toISOString(),
  sender: null,
  recipient: null,
  metadata: {},
});

// Estructura de usuario
export const createUserBase = () => ({
  id: null,
  id_sub_usuario: null,
  nombre: "",
  email: "",
  rol: USER_ROLES.AGENT,
  estado: "active",
  avatar: null,
  configuraciones: {},
});

export default {
  MESSAGE_SOURCES,
  CONVERSATION_STATUS,
  MESSAGE_TYPES,
  MESSAGE_STATUS,
  USER_ROLES,
  createConversationBase,
  createMessageBase,
  createUserBase,
};
