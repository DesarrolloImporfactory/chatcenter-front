/**
 * Uploader a S3 vía imporfactory.app — el MISMO endpoint que usa el panel
 * Asesor de imporsuit-front para los comprobantes. Así los archivos terminan
 * en el mismo bucket (imp-datas.s3.amazonaws.com) y se ven igual en ambos lados.
 *
 * Acepta multipart con campo `file` y devuelve:
 *   { success: true, data: { url: "https://imp-datas.s3.amazonaws.com/…" } }
 */
const UPLOADER_URL = "https://uploader.imporfactory.app/api/files/upload";

export async function uploadFile(file, { signal } = {}) {
  if (!file) throw new Error("Selecciona un archivo primero.");

  const fd = new FormData();
  fd.append("file", file);

  const response = await fetch(UPLOADER_URL, {
    method: "POST",
    body: fd,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Upload falló (HTTP ${response.status})`);
  }

  const payload = await response.json().catch(() => null);
  if (!payload?.success || !payload?.data?.url) {
    throw new Error(payload?.message ?? "El uploader rechazó el archivo.");
  }

  return String(payload.data.url);
}
