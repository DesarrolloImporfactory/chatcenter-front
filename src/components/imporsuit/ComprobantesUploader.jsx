import { useRef, useState } from "react";
import { uploadFile } from "../../services/imporsuit/uploader";

/**
 * Drag-and-drop + click para subir comprobantes de pago a S3.
 * Cada archivo se sube al instante (uploader.imporfactory.app) y se guarda su
 * URL; al registrar el pago se mandan esas URLs en `imagenes_urls`.
 *
 * Props:
 *  - urls: string[]            URLs ya subidas
 *  - onChange: (urls) => void
 *  - disabled?: bool
 *  - maxSizeMb?: number (default 50)
 */
const MAX_MB_DEFAULT = 50;

const isImage = (url) => /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url);

function iconFor(url) {
  const u = String(url).toLowerCase();
  if (u.match(/\.pdf(\?|$)/)) return "bxs-file-pdf";
  if (u.match(/\.(doc|docx)(\?|$)/)) return "bxs-file-doc";
  if (u.match(/\.(xls|xlsx|csv)(\?|$)/)) return "bxs-spreadsheet";
  if (u.match(/\.(zip|rar|7z)(\?|$)/)) return "bxs-file-archive";
  return "bxs-file";
}

export function ComprobantesUploader({
  urls = [],
  onChange,
  disabled = false,
  maxSizeMb = MAX_MB_DEFAULT,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState([]); // [{id, name, error?}]

  const pushUrl = (url) => onChange?.([...(urls ?? []), url]);
  const removeUrl = (idx) => onChange?.((urls ?? []).filter((_, i) => i !== idx));

  const handleFiles = async (fileList) => {
    if (disabled) return;
    const files = Array.from(fileList ?? []).filter((f) => {
      const mb = f.size / (1024 * 1024);
      if (mb > maxSizeMb) {
        window.alert(`"${f.name}" supera ${maxSizeMb} MB y no se subirá.`);
        return false;
      }
      return true;
    });

    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setUploading((prev) => [...prev, { id, name: file.name, error: null }]);
      try {
        const url = await uploadFile(file);
        pushUrl(url);
      } catch (err) {
        setUploading((prev) =>
          prev.map((u) => (u.id === id ? { ...u, error: err.message } : u)),
        );
        setTimeout(() => {
          setUploading((prev) => prev.filter((u) => u.id !== id));
        }, 4000);
        continue;
      }
      setUploading((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-5 text-center transition disabled:opacity-50 ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-blue-300"
        }`}
      >
        <i className="bx bx-cloud-upload text-2xl text-blue-500" />
        <p className="text-xs font-semibold text-gray-700">
          Arrastrá comprobantes o hacé click
        </p>
        <p className="text-[10px] text-gray-400">
          PNG, JPG, PDF, ZIP — hasta {maxSizeMb} MB c/u
        </p>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept="image/*,.pdf,.doc,.docx,.zip,.rar"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* En curso / errores */}
      {uploading.length > 0 && (
        <ul className="space-y-1">
          {uploading.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px]"
            >
              {u.error ? (
                <>
                  <i className="bx bx-error-circle text-red-500" />
                  <span className="flex-1 truncate text-red-600">{u.name}</span>
                  <span className="text-[10px] text-red-500">{u.error}</span>
                </>
              ) : (
                <>
                  <i className="bx bx-loader-alt bx-spin text-blue-500" />
                  <span className="flex-1 truncate text-gray-600">{u.name}</span>
                  <span className="text-[10px] text-gray-400">Subiendo…</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Miniaturas */}
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {urls.map((url, idx) => {
            const image = isImage(url);
            return (
              <div
                key={url + idx}
                className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
              >
                {image ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block h-full w-full"
                    title="Ver comprobante"
                  >
                    <img
                      src={url}
                      alt={`Comprobante ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </a>
                ) : (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-blue-600 hover:text-blue-700"
                  >
                    <i className={`bx ${iconFor(url)} text-2xl`} />
                    <span className="truncate text-[9px] text-gray-400">
                      Ver archivo
                    </span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => removeUrl(idx)}
                  disabled={disabled}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80 disabled:hidden"
                  title="Quitar"
                >
                  <i className="bx bx-x" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
