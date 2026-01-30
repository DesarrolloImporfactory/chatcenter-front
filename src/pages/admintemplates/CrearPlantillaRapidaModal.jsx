import React, { useState, useEffect, useMemo } from "react";
import chatApi from "../../api/chatcenter";

const CrearPlantillaRapidaModal = ({
  onClose,
  onSuccess,
  setStatusMessage,
}) => {
  const [atajo, setAtajo] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [tipoMensaje, setTipoMensaje] = useState("text"); // text|image|video|document|audio
  const [archivo, setArchivo] = useState(null);

  // preview
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewMime, setPreviewMime] = useState(null);
  const [previewName, setPreviewName] = useState(null);

  const [loading, setLoading] = useState(false);
  const [idConfig, setIdConfig] = useState(null);

  useEffect(() => {
    const val = localStorage.getItem("id_configuracion");
    setIdConfig(val ? Number(val) : null);
  }, []);

  // Limpie objectURL cuando cambia
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
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

  // ✅ helper: subir a tu uploader S3
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
    return json.data; // { url, fileName, size, mimeType, ... }
  }

  const resetForm = () => {
    setAtajo("");
    setMensaje("");
    setTipoMensaje("text");
    setArchivo(null);

    // reset preview
    if (previewUrl && previewUrl.startsWith("blob:"))
      URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewMime(null);
    setPreviewName(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setArchivo(file);

    // preview local inmediato (sin subir)
    if (!file) {
      if (previewUrl && previewUrl.startsWith("blob:"))
        URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPreviewMime(null);
      setPreviewName(null);
      return;
    }

    const localUrl = URL.createObjectURL(file);
    if (previewUrl && previewUrl.startsWith("blob:"))
      URL.revokeObjectURL(previewUrl);

    setPreviewUrl(localUrl);
    setPreviewMime(file.type || null);
    setPreviewName(file.name || null);
  };

  const validate = () => {
    const at = (atajo || "").trim();
    const msg = (mensaje || "").trim();

    if (!idConfig || !at) {
      setStatusMessage?.({
        type: "error",
        text: "Por favor complete el atajo.",
      });
      return false;
    }

    if (tipoMensaje === "text") {
      if (!msg) {
        setStatusMessage?.({
          type: "error",
          text: "Por favor escriba el mensaje.",
        });
        return false;
      }
      return true;
    }

    if (!archivo) {
      setStatusMessage?.({
        type: "error",
        text: "Debe seleccionar un archivo.",
      });
      return false;
    }

    // validaciones rápidas
    if (tipoMensaje === "image" && !archivo.type.startsWith("image/")) {
      setStatusMessage?.({
        type: "error",
        text: "El archivo no es una imagen.",
      });
      return false;
    }
    if (tipoMensaje === "video" && !archivo.type.startsWith("video/")) {
      setStatusMessage?.({ type: "error", text: "El archivo no es un video." });
      return false;
    }
    if (tipoMensaje === "audio" && !archivo.type.startsWith("audio/")) {
      setStatusMessage?.({ type: "error", text: "El archivo no es un audio." });
      return false;
    }

    return true;
  };

  const renderPreview = () => {
    if (tipoMensaje === "text") return null;

    // si el preview es local blob => OK
    // si luego sube a S3, podríamos mostrar link final con previewUrl actualizado
    if (!previewUrl) return null;

    const mime = previewMime || "";
    const isPdf =
      mime.includes("pdf") ||
      (previewName || "").toLowerCase().endsWith(".pdf");

    return (
      <div className="mt-3 rounded-xl border bg-gray-50 p-3">
        <div className="text-xs text-gray-600 mb-2">
          <b>Vista previa:</b> {previewName || "archivo"}
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
            src={previewUrl}
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

  const handleCrear = async () => {
    if (loading) return;
    if (!validate()) return;

    const at = (atajo || "").trim();
    const msg = (mensaje || "").trim();

    setLoading(true);
    try {
      let payload = {
        atajo: at,
        mensaje: msg,
        id_configuracion: idConfig,
        tipo_mensaje: tipoMensaje,
      };

      if (tipoMensaje !== "text") {
        // 1) subir
        const up = await uploadToS3(archivo);

        // 2) usar URL pública como ruta_archivo
        payload = {
          ...payload,
          mensaje: msg || "",
          ruta_archivo: up.url,
          mime_type: up.mimeType || archivo.type || null,
          file_name: up.fileName || archivo.name || null,
        };

        // 3) actualizar preview para que sea ya el URL final (opcional)
        if (previewUrl && previewUrl.startsWith("blob:"))
          URL.revokeObjectURL(previewUrl);
        setPreviewUrl(up.url);
        setPreviewMime(payload.mime_type);
        setPreviewName(payload.file_name);
      } else {
        payload = {
          ...payload,
          tipo_mensaje: "text",
          ruta_archivo: null,
          mime_type: null,
          file_name: null,
        };
      }

      const resp = await chatApi.post(
        "/whatsapp_managment/crearPlantillaRapida",
        payload,
      );

      if (resp?.data?.success) {
        setStatusMessage?.({
          type: "success",
          text: "Respuesta rápida creada correctamente.",
        });
        resetForm();
        await onSuccess?.();
        onClose?.();
      } else {
        setStatusMessage?.({
          type: "error",
          text: resp?.data?.message || "Error al crear la respuesta rápida.",
        });
      }
    } catch (error) {
      console.error("Error al crear respuesta rápida:", error);
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
        <h2 className="text-xl font-semibold mb-4">Crear Respuesta Rápida</h2>

        <label className="block mb-2">Atajo</label>
        <input
          type="text"
          value={atajo}
          onChange={(e) => setAtajo(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-4"
          placeholder="Ej: Gracias por tu compra"
        />

        <label className="block mb-2">Tipo de mensaje</label>
        <select
          value={tipoMensaje}
          onChange={(e) => {
            const v = e.target.value;
            setTipoMensaje(v);

            // reset archivo/preview cuando cambia tipo
            setArchivo(null);
            if (previewUrl && previewUrl.startsWith("blob:"))
              URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setPreviewMime(null);
            setPreviewName(null);
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
          placeholder={
            tipoMensaje === "text" ? "Escriba el texto…" : "Opcional…"
          }
        />

        {tipoMensaje !== "text" && (
          <div className="mb-2">
            <label className="block mb-2">Archivo</label>
            <input
              type="file"
              accept={acceptByType}
              onChange={handleFileChange}
              className="w-full border px-3 py-2 rounded bg-white"
            />
            {archivo && (
              <div className="mt-2 text-sm text-gray-600">
                <div>
                  <b>Archivo:</b> {archivo.name}
                </div>
                <div>
                  <b>Tipo:</b> {archivo.type || "—"}
                </div>
                <div>
                  <b>Tamaño:</b> {(archivo.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            )}

            {/* ✅ Preview */}
            {renderPreview()}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose?.();
            }}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleCrear}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Creando..." : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrearPlantillaRapidaModal;
