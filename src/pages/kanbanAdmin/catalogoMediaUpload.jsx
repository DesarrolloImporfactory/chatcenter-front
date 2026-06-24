import chatApi from "../../api/chatcenter";

export const LIMITES_WHATSAPP = {
  IMAGE: {
    maxMB: 5,
    label: "imagen",
    accept: "image/jpeg,image/png",
  },
  VIDEO: {
    maxMB: 16,
    label: "video",
    accept: "video/mp4,video/3gpp",
  },
  AUDIO: {
    maxMB: 16,
    label: "audio",
    accept: "audio/aac,audio/amr,audio/mpeg,audio/mp4,audio/ogg",
  },
  DOCUMENT: {
    maxMB: 100,
    label: "documento",
    accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf",
  },
};

// tipo_mensaje de respuesta rápida ('image'/'video'/'audio'/'document') → formato
export const formatDeTipoRapida = (tipo) => {
  const t = String(tipo || "").toLowerCase();
  if (t === "image") return "IMAGE";
  if (t === "video") return "VIDEO";
  if (t === "audio") return "AUDIO";
  return "DOCUMENT";
};

// Chequeo de peso en cliente (UX inmediata antes de subir).
export function validarPesoCliente(file, format) {
  const lim = LIMITES_WHATSAPP[format] || LIMITES_WHATSAPP.DOCUMENT;
  const mb = file.size / (1024 * 1024);
  if (mb > lim.maxMB) {
    return `El ${lim.label} pesa ${mb.toFixed(1)}MB y supera el máximo de ${lim.maxMB}MB que admite WhatsApp.`;
  }
  return null;
}

// Sube el archivo y devuelve { url, mime_type, file_name, size, format }.
// modo: 'respuesta_rapida' (valida peso en el back) | 'template' (lenient)
export async function subirMediaCatalogo(
  file,
  { modo = "respuesta_rapida", format } = {},
) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("modo", modo);
  if (format) fd.append("format", format);

  const { data } = await chatApi.post(
    "/kanban_plantillas_admin/catalogo_subir_media",
    fd,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  if (!data?.url) throw new Error("No se obtuvo la URL del archivo");
  return data;
}
