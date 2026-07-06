import React, { useEffect, useMemo, useState } from "react";
import chatApi from "../../api/chatcenter";

// ── Límites de WhatsApp (bytes) ──
const WA_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  video: 16 * 1024 * 1024, // 16MB
  audio: 16 * 1024 * 1024, // 16MB
  document: 100 * 1024 * 1024, // 100MB
};

const mb = (b) => (b / 1048576).toFixed(1);

const EditarPlantillaRapidaModal = ({
  respuesta,
  onClose,
  onSuccess,
  setStatusMessage,
}) => {
  const [fileError, setFileError] = useState("");
  const [atajo, setAtajo] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [tipoMensaje, setTipoMensaje] = useState("text");
  const [archivo, setArchivo] = useState(null);

  // preview (puede ser URL existente o blob)
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewMime, setPreviewMime] = useState(null);
  const [previewName, setPreviewName] = useState(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!respuesta) return;

    setAtajo(respuesta.atajo || "");
    setMensaje(respuesta.mensaje || "");
    setTipoMensaje((respuesta.tipo_mensaje || "text").toLowerCase());

    setArchivo(null);

    // preview desde backend (URL pública)
    setPreviewUrl(respuesta.ruta_archivo || null);
    setPreviewMime(respuesta.mime_type || null);
    setPreviewName(respuesta.file_name || null);
  }, [respuesta]);

  // Limpie objectURL
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:"))
        URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const acceptByType = useMemo(() => {
    if (tipoMensaje === "image") return "image/*";
    if (tipoMensaje === "video") return "video/*";
    if (tipoMensaje === "audio") return "audio/*";
    if (tipoMensaje === "document")
      return ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf";
    return "";
  }, [tipoMensaje]);

  // ── Upload helpers ──────────────────────────────────────────────

  /** Sube a S3 (image, document, audio) */
  async function uploadToS3(file) {
    const form = new FormData();
    form.append("file", file);

    const resp = await fetch(
      "https://uploader.imporfactory.app/api/files/upload",
      {
        method: "POST",
        body: form,
      },
    );

    const json = await resp.json();
    if (!json?.success)
      throw new Error(json?.message || "Error subiendo archivo");
    return json.data;
  }

  /** Sube VIDEO a la Video API (vía backend con conversión FFmpeg) */
  async function uploadVideoToAPI(file) {
    const form = new FormData();
    form.append("file", file);

    const resp = await chatApi.post(
      "/whatsapp_managment/uploadVideoPlantillaRapida",
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      },
    );

    if (!resp?.data?.success) {
      throw new Error(resp?.data?.message || "Error subiendo video");
    }
    return resp.data.data; // { url, fileName, mimeType, size, video_id }
  }

  /** Decide a dónde subir según el tipo */
  async function uploadFile(file, tipo) {
    if (tipo === "video") return uploadVideoToAPI(file);
    return uploadToS3(file);
  }

  // ── Resto del componente ────────────────────────────────────────

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFileError("");

    // ── Validación de tamaño ──
    if (file) {
      const limite = WA_LIMITS[tipoMensaje];
      if (limite && file.size > limite) {
        setFileError(
          `La ${tipoMensaje === "image" ? "imagen" : tipoMensaje} pesa ${mb(file.size)}MB. El máximo permitido es ${(limite / 1048576).toFixed(0)}MB. Selecciona un archivo más liviano.`,
        );
        e.target.value = "";
        setArchivo(null);
        return; // conserva el archivo actual
      }
    }

    setArchivo(file);

    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    if (previewUrl && previewUrl.startsWith("blob:"))
      URL.revokeObjectURL(previewUrl);

    setPreviewUrl(localUrl);
    setPreviewMime(file.type || null);
    setPreviewName(file.name || null);
  };

  const renderPreview = () => {
    if (tipoMensaje === "text") return null;
    if (!previewUrl) return null;

    const mime = previewMime || "";
    const name = previewName || "";
    const isPdf = mime.includes("pdf") || name.toLowerCase().endsWith(".pdf");

    return (
      <div className="mt-3 rounded-xl border bg-gray-50 p-3">
        <div className="text-xs text-gray-600 mb-2">
          <b>Vista previa:</b> {name || "archivo"}
        </div>

        {tipoMensaje === "image" && (
          <img
            src={previewUrl}
            alt="preview"
            className="w-full max-h-56 object-contain rounded-lg border bg-white"
          />
        )}

        {tipoMensaje === "video" && (
          <video
            src={
              previewUrl &&
              previewUrl.includes("/Videos/stream/") &&
              !previewUrl.startsWith("blob:")
                ? `${previewUrl}${previewUrl.includes("?") ? "&" : "?"}token=${localStorage.getItem("token")}`
                : previewUrl
            }
            controls
            className="w-full max-h-56 rounded-lg border bg-black"
          />
        )}

        {tipoMensaje === "audio" && (
          <audio src={previewUrl} controls className="w-full" />
        )}

        {tipoMensaje === "document" && (
          <>
            {isPdf ? (
              <iframe
                title="pdf-preview"
                src={previewUrl}
                className="w-full h-56 rounded-lg border bg-white"
              />
            ) : (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-700 underline"
              >
                Abrir documento
              </a>
            )}
          </>
        )}
      </div>
    );
  };

  const validate = () => {
    if (!respuesta?.id_template) {
      setStatusMessage?.({
        type: "error",
        text: "No se encontró la plantilla a editar.",
      });
      return false;
    }
    const at = (atajo || "").trim();
    if (!at) {
      setStatusMessage?.({ type: "error", text: "El atajo es obligatorio." });
      return false;
    }

    if (tipoMensaje === "text") {
      if (!(mensaje || "").trim()) {
        setStatusMessage?.({
          type: "error",
          text: "El mensaje es obligatorio si el tipo es texto.",
        });
        return false;
      }
    } else {
      // si es media, debe existir: o archivo nuevo, o una ruta existente
      const tieneRuta =
        Boolean(respuesta?.ruta_archivo) ||
        Boolean(previewUrl && !previewUrl.startsWith("blob:"));
      if (!archivo && !tieneRuta) {
        setStatusMessage?.({
          type: "error",
          text: "Debe mantener o seleccionar un archivo para este tipo.",
        });
        return false;
      }

      // ── Validación de tamaño (solo si seleccionó archivo nuevo) ──
      const limite = WA_LIMITS[tipoMensaje];
      if (archivo && limite && archivo.size > limite) {
        setStatusMessage?.({
          type: "error",
          text: `El archivo pesa ${mb(archivo.size)}MB. El máximo permitido para ${tipoMensaje} es ${(limite / 1048576).toFixed(0)}MB.`,
        });
        return false;
      }
    }

    return true;
  };

  const handleEditar = async () => {
    if (loading) return;
    if (!validate()) return;

    setLoading(true);
    try {
      const at = (atajo || "").trim();
      const msg = (mensaje || "").trim();

      let payload = {
        id_template: respuesta.id_template,
        atajo: at,
        mensaje: msg,
        tipo_mensaje: tipoMensaje,
      };

      if (tipoMensaje === "text") {
        payload = {
          ...payload,
          tipo_mensaje: "text",
          ruta_archivo: null,
          mime_type: null,
          file_name: null,
        };
      } else {
        // si seleccionó archivo nuevo => subir y reemplazar
        if (archivo) {
          // ✅ Sube a S3 o Video API según tipo
          const up = await uploadFile(archivo, tipoMensaje);
          payload = {
            ...payload,
            ruta_archivo: up.url,
            mime_type: up.mimeType || archivo.type || null,
            file_name: up.fileName || archivo.name || null,
          };
        } else {
          // mantener el actual (lo que ya venía en respuesta)
          payload = {
            ...payload,
            ruta_archivo: respuesta.ruta_archivo,
            mime_type: respuesta.mime_type || null,
            file_name: respuesta.file_name || null,
          };
        }
      }

      const resp = await chatApi.put(
        "/whatsapp_managment/EditarPlantilla",
        payload,
      );

      if (resp?.data?.success) {
        setStatusMessage?.({
          type: "success",
          text: resp.data.message || "Plantilla editada correctamente.",
        });
        await onSuccess?.();
        onClose?.();
      } else {
        setStatusMessage?.({
          type: "error",
          text: resp?.data?.message || "Error al editar la plantilla.",
        });
      }
    } catch (error) {
      console.error("Error al editar plantilla rápida:", error);
      setStatusMessage?.({
        type: "error",
        text: error?.message || "Error al conectar con el servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-[9999]">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-md relative">
        <h2 className="text-xl font-semibold mb-4">Editar Respuesta Rápida</h2>

        <label className="block mb-2">Atajo</label>
        <input
          type="text"
          value={atajo}
          onChange={(e) => setAtajo(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-4"
        />

        <label className="block mb-2">Tipo de mensaje</label>
        <select
          value={tipoMensaje}
          onChange={(e) => {
            const v = e.target.value;
            setTipoMensaje(v);
            setArchivo(null);

            // si cambia a text, limpiar preview de media
            if (v === "text") {
              if (previewUrl && previewUrl.startsWith("blob:"))
                URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
              setPreviewMime(null);
              setPreviewName(null);
            } else {
              // si tenía media en respuesta, vuelva a mostrarla
              setPreviewUrl(respuesta?.ruta_archivo || null);
              setPreviewMime(respuesta?.mime_type || null);
              setPreviewName(respuesta?.file_name || null);
            }
          }}
          className="w-full border px-3 py-2 rounded mb-4 bg-white"
        >
          <option value="text">Texto</option>
          <option value="image">Imagen</option>
          <option value="video">Video</option>
          <option value="document">Documento</option>
          <option value="audio">Audio</option>
        </select>

        <label className="block mb-2">
          {tipoMensaje === "text" ? "Mensaje" : "Texto (opcional) / Caption"}
        </label>
        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-2"
          rows={4}
        />

        {tipoMensaje !== "text" && (
          <div className="mb-2">
            <label className="block mb-2">Reemplazar archivo (opcional)</label>
            <input
              type="file"
              accept={acceptByType}
              onChange={handleFileChange}
              className="w-full border px-3 py-2 rounded bg-white"
            />
            {/* ── Error de tamaño ── */}
            {fileError && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                <span>{fileError}</span>
              </div>
            )}

            {renderPreview()}

            {!archivo && respuesta?.ruta_archivo && (
              <div className="mt-2 text-xs text-gray-500">
                * Si no selecciona un nuevo archivo, se mantiene el actual.
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleEditar}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditarPlantillaRapidaModal;
