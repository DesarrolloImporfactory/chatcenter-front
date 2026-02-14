import chatApi from "../api/chatcenter";

/* Normaliza fila -> llaves del front (id = chat_id) */
function mapRow(row) {
  const chatId = row.id_cliente_chat_center ?? row.id ?? null;
  const lastAt = row.ultimo_mensaje_at ?? row.updated_at ?? row.created_at;

  // 👇 NUEVO: ids externos típicos IG/MS
  const externalId =
    row.external_id ??
    row.external_mid ??
    row.mid ??
    row.psid ??
    row.ig_user_id ??
    row.fb_user_id ??
    "";

  const pageId = row.page_id ?? row.id_page ?? "";
  const convId =
    row.conversation_id ?? row.thread_id ?? row.id_conversation ?? "";

  // 👇 NUEVO: “contacto visible” para UI (WhatsApp o IG/MS)
  const telefonoLimpio = row.telefono_limpio || "";
  const telefono = row.celular_cliente || "";
  const display_contact =
    telefonoLimpio || telefono || externalId || pageId || convId || "";

  return {
    id: chatId,
    id_cliente_chat_center: chatId,

    nombre: row.nombre_cliente || "",
    apellido: row.apellido_cliente || "",
    email: row.email_cliente || "",
    telefono: telefono,
    telefono_limpio: telefonoLimpio,

    // ✅ NUEVOS
    external_id: externalId,
    page_id: pageId,
    conversation_id: convId,
    display_contact,

    createdAt: row.created_at,
    ultima_actividad: lastAt,

    ultimo_mensaje_at: row.ultimo_mensaje_at ?? null,
    ultimo_texto: row.ultimo_texto ?? "",
    ultimo_tipo_mensaje: row.ultimo_tipo_mensaje ?? "",
    ultimo_rol_mensaje: row.ultimo_rol_mensaje ?? null,
    ultimo_msg_id: row.ultimo_msg_id ?? null,

    estado: row.estado_cliente,
    id_etiqueta: row.id_etiqueta ?? null,
    id_plataforma: row.id_plataforma ?? null,
    id_configuracion: row.id_configuracion ?? null,
    chat_cerrado: row.chat_cerrado ?? 0,
    bot_openia: row.bot_openia ?? 1,
    uid_cliente: row.uid_cliente || "",
    mensajes_por_dia_cliente: row.mensajes_por_dia_cliente ?? 0,
    pedido_confirmado: row.pedido_confirmado ?? 0,
    imagePath: row.imagePath || "",
    etiquetas: Array.isArray(row.etiquetas) ? row.etiquetas : [],
    _raw: row,
  };
}

export async function apiUpdateClienteChatCenter(id, c) {
  const payload = {
    id_plataforma: c.id_plataforma || null,
    id_configuracion: c.id_configuracion || null,
    id_etiqueta: c.id_etiqueta || null,
    uid_cliente: c.uid_cliente || "",
    nombre_cliente: c.nombre || c.nombre_cliente || "",
    apellido_cliente: c.apellido || c.apellido_cliente || "",
    email_cliente: c.email || c.email_cliente || "",
    celular_cliente: c.telefono || c.celular_cliente || "",
    imagePath: c.imagePath || "",
    mensajes_por_dia_cliente: c.mensajes_por_dia_cliente ?? 0,
    estado_cliente: c.estado ?? 1,
    chat_cerrado: c.chat_cerrado ?? 0,
    bot_openia: c.bot_openia ?? 1,
    pedido_confirmado: c.pedido_confirmado ?? 0,
  };

  const { data } = await chatApi.put(
    `/clientes_chat_center/actualizar/${id}`,
    payload,
  );

  return mapRow(data?.data || data);
}
