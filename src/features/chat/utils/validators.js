import { MESSAGE_SOURCES, MESSAGE_TYPES, CONVERSATION_STATUS } from "../types";

// Validaciones básicas
export const isValidString = (value) => {
  return typeof value === "string" && value.trim().length > 0;
};

export const isValidNumber = (value) => {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
};

export const isValidDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
};

export const isValidArray = (value) => {
  return Array.isArray(value);
};

export const isValidObject = (value) => {
  return value && typeof value === "object" && !Array.isArray(value);
};

// Validaciones específicas del chat
export const isValidMessageSource = (source) => {
  return Object.values(MESSAGE_SOURCES).includes(source);
};

export const isValidMessageType = (type) => {
  return Object.values(MESSAGE_TYPES).includes(type);
};

export const isValidConversationStatus = (status) => {
  return Object.values(CONVERSATION_STATUS).includes(status);
};

// Validación de estructura de conversación
export const validateConversation = (conversation) => {
  const errors = [];

  if (!isValidObject(conversation)) {
    errors.push("Conversación debe ser un objeto válido");
    return { isValid: false, errors };
  }

  // Campos requeridos
  if (!isValidString(conversation.id)) {
    errors.push("ID de conversación es requerido");
  }

  if (!isValidMessageSource(conversation.source)) {
    errors.push("Fuente de mensaje inválida");
  }

  if (
    !isValidString(conversation.celular_cliente) &&
    !isValidString(conversation.psid) &&
    !isValidString(conversation.igsid)
  ) {
    errors.push("Identificador del cliente es requerido");
  }

  // Campos opcionales pero validados si existen
  if (
    conversation.mensaje_created_at &&
    !isValidDate(conversation.mensaje_created_at)
  ) {
    errors.push("Fecha de mensaje inválida");
  }

  if (
    conversation.mensajes_pendientes !== undefined &&
    !isValidNumber(conversation.mensajes_pendientes)
  ) {
    errors.push("Cantidad de mensajes pendientes debe ser un número");
  }

  if (conversation.etiquetas && !isValidArray(conversation.etiquetas)) {
    errors.push("Etiquetas deben ser un array");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validación de estructura de mensaje
export const validateMessage = (message) => {
  const errors = [];

  if (!isValidObject(message)) {
    errors.push("Mensaje debe ser un objeto válido");
    return { isValid: false, errors };
  }

  // Campos requeridos
  if (!isValidString(message.id)) {
    errors.push("ID de mensaje es requerido");
  }

  if (!isValidMessageType(message.type)) {
    errors.push("Tipo de mensaje inválido");
  }

  if (!isValidDate(message.created_at)) {
    errors.push("Fecha de creación es requerida y válida");
  }

  // Validación condicional basada en tipo
  if (message.type === MESSAGE_TYPES.TEXT && !isValidString(message.text)) {
    errors.push("Mensaje de texto requiere contenido de texto");
  }

  if (
    [
      MESSAGE_TYPES.IMAGE,
      MESSAGE_TYPES.VIDEO,
      MESSAGE_TYPES.AUDIO,
      MESSAGE_TYPES.FILE,
    ].includes(message.type)
  ) {
    if (!isValidString(message.attachment_url)) {
      errors.push("Mensaje multimedia requiere URL de adjunto");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validación de datos de usuario
export const validateUserData = (userData) => {
  const errors = [];

  if (!isValidObject(userData)) {
    errors.push("Datos de usuario deben ser un objeto válido");
    return { isValid: false, errors };
  }

  if (!isValidString(userData.nombre_cliente)) {
    errors.push("Nombre del cliente es requerido");
  }

  // Validar según la fuente
  if (userData.source === MESSAGE_SOURCES.WHATSAPP) {
    if (!isValidString(userData.celular_cliente)) {
      errors.push("Número de celular es requerido para WhatsApp");
    }
  }

  if (userData.source === MESSAGE_SOURCES.MESSENGER) {
    if (!isValidString(userData.psid)) {
      errors.push("PSID es requerido para Messenger");
    }
  }

  if (userData.source === MESSAGE_SOURCES.INSTAGRAM) {
    if (!isValidString(userData.igsid)) {
      errors.push("IGSID es requerido para Instagram");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Sanitización de datos
export const sanitizeConversation = (conversation) => {
  if (!isValidObject(conversation)) return null;

  return {
    ...conversation,
    id: String(conversation.id || "").trim(),
    texto_mensaje: String(conversation.texto_mensaje || "").trim(),
    nombre_cliente: String(conversation.nombre_cliente || "").trim(),
    celular_cliente: conversation.celular_cliente
      ? String(conversation.celular_cliente).trim()
      : null,
    mensajes_pendientes: Math.max(
      0,
      parseInt(conversation.mensajes_pendientes) || 0
    ),
    etiquetas: isValidArray(conversation.etiquetas)
      ? conversation.etiquetas
      : [],
    mensaje_created_at: isValidDate(conversation.mensaje_created_at)
      ? conversation.mensaje_created_at
      : new Date().toISOString(),
  };
};

export const sanitizeMessage = (message) => {
  if (!isValidObject(message)) return null;

  const sanitized = {
    ...message,
    id: String(message.id || "").trim(),
    text: String(message.text || "").trim(),
    created_at: isValidDate(message.created_at)
      ? message.created_at
      : new Date().toISOString(),
  };

  // Limpiar URLs si existen
  if (message.attachment_url) {
    sanitized.attachment_url = String(message.attachment_url).trim();
  }

  return sanitized;
};

// Utilidad para validar múltiples elementos
export const validateConversationList = (conversations) => {
  if (!isValidArray(conversations)) {
    return {
      isValid: false,
      errors: ["Lista de conversaciones debe ser un array"],
    };
  }

  const results = conversations.map((conv, index) => ({
    index,
    ...validateConversation(conv),
  }));

  const hasErrors = results.some((result) => !result.isValid);
  const allErrors = results.filter((result) => !result.isValid);

  return {
    isValid: !hasErrors,
    results,
    errors: allErrors,
  };
};

export default {
  isValidString,
  isValidNumber,
  isValidDate,
  isValidArray,
  isValidObject,
  isValidMessageSource,
  isValidMessageType,
  isValidConversationStatus,
  validateConversation,
  validateMessage,
  validateUserData,
  sanitizeConversation,
  sanitizeMessage,
  validateConversationList,
};
