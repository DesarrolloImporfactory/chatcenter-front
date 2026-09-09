import chatApi from "../../../api/chatcenter";

/**
 * Helpers de media del lanzador de campañas.
 *
 * Los videos viven en la cuenta publicitaria de Meta y no tienen URL estable:
 * `source` es un enlace temporal del CDN que se pide cada vez que se abre la
 * vista previa. La miniatura (`picture`) sí es estable y sirve para rellenar
 * el thumb cuando el video seguía procesándose al subirlo.
 */
export async function fetchVideoInfo(id_configuracion, video_id) {
  const { data } = await chatApi.get("/meta_ads/launcher/media/video", {
    params: { id_configuracion, video_id },
    silentError: true,
  });
  return data?.success ? data.data : null;
}

/* Lista de creativos de una plantilla guardada (imagenes_json → array).
   Las entradas anteriores al soporte de video no traen `tipo`. */
export function creativosDePlantilla(p) {
  let arr = [];
  try {
    const parsed = p?.imagenes_json ? JSON.parse(p.imagenes_json) : null;
    if (Array.isArray(parsed)) arr = parsed;
  } catch {
    arr = [];
  }
  if (!arr.length && p?.imagen_hash) {
    arr = [{ hash: p.imagen_hash, url: p.imagen_url || null }];
  }
  return arr.map((c) => ({ tipo: c.tipo || "imagen", ...c }));
}
