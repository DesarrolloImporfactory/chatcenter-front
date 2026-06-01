import { useRef, useState } from "react";
import toast from "react-hot-toast";
import chatApi from "../../../../api/chatcenter";
import { fmtTamanoBytes } from "./constants";

const UPLOAD_PATH = "media/upload";

const kindFromMime = (mime = "") => {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
};

export default function EvidenciaUploader({
  evidencias,
  setEvidencias,
  folder = "seguimientos",
  isEdit = false,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setUploading(true);

    for (const file of files) {
      try {
        const kind = kindFromMime(file.type);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("kind", kind);
        formData.append("folder", folder);

        const { data } = await chatApi.post(UPLOAD_PATH, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (!data?.success || !data?.url) {
          toast.error(`Error subiendo ${file.name}`);
          continue;
        }

        setEvidencias((prev) => [
          ...prev,
          {
            url: data.url,
            tipo: kind === "audio" ? "file" : kind,
            nombre_archivo: file.name,
            mime_type: file.type,
            tamano_bytes: file.size,
          },
        ]);
        toast.success(`${file.name} subido`);
      } catch (err) {
        console.error(err);
        toast.error(`Error subiendo ${file.name}`);
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeEvidencia = (idx) => {
    setEvidencias((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
          {isEdit ? "Agregar nuevas evidencias" : "Evidencias"}{" "}
          <span className="text-slate-400 normal-case">
            (capturas, audios, PDFs)
          </span>
        </label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition disabled:opacity-50"
        >
          <i
            className={`bx ${uploading ? "bx-loader-alt bx-spin" : "bx-plus"}`}
          />
          {uploading ? "Subiendo…" : "Agregar archivo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {evidencias.length === 0 ? (
        <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center">
          {isEdit
            ? "Sin nuevas evidencias agregadas"
            : "Sin evidencias adjuntas"}
        </div>
      ) : (
        <div className="space-y-1.5">
          {evidencias.map((ev, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs"
            >
              <i
                className={`bx ${
                  ev.tipo === "image"
                    ? "bx-image"
                    : ev.tipo === "video"
                      ? "bx-video"
                      : "bx-file"
                } text-lg text-slate-500 flex-shrink-0`}
              />
              <a
                href={ev.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-cyan-700 hover:underline font-semibold"
                onClick={(e) => e.stopPropagation()}
              >
                {ev.nombre_archivo || "archivo"}
              </a>
              <span className="text-slate-400 font-mono">
                {fmtTamanoBytes(ev.tamano_bytes)}
              </span>
              <button
                type="button"
                onClick={() => removeEvidencia(idx)}
                className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                title="Quitar"
              >
                <i className="bx bx-x text-base" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
