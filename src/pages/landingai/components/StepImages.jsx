import React, { useRef, useCallback } from "react";
import { fileToDataUrl } from "./constants";

const StepImages = ({
  selectedConfig,
  userImages,
  setUserImages,
  onShowTemplateModal,
  onBack,
  onContinue,
}) => {
  const fileInputRef = useRef(null);

  const handleFileUpload = useCallback(
    async (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const dataUrl = await fileToDataUrl(file);
        setUserImages((prev) => [
          ...prev,
          { id: Date.now() + Math.random(), file, dataUrl, name: file.name },
        ]);
      }
    },
    [setUserImages],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      handleFileUpload({ target: { files: e.dataTransfer.files } });
    },
    [handleFileUpload],
  );

  if (!selectedConfig) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* Template banner */}
      <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
        <img
          src={selectedConfig.template.src_url}
          alt=""
          className="w-14 h-14 rounded-xl object-cover bg-white border border-indigo-100 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-indigo-700">
            {selectedConfig.template.nombre}
          </p>
          <p className="text-[10px] text-indigo-500 mt-0.5">
            {selectedConfig.etapas.length} secciones ·{" "}
            {selectedConfig.mode === "all"
              ? "Landing completa"
              : "Personalizado"}
          </p>
        </div>
        <button
          onClick={onShowTemplateModal}
          className="text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold underline underline-offset-2 shrink-0"
        >
          Cambiar
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div
          className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
            userImages.length > 0
              ? "bg-blue-600"
              : "bg-blue-50 border border-blue-100"
          }`}
        >
          {userImages.length > 0 ? (
            <i className="bx bx-check text-white text-lg" />
          ) : (
            <i className="bx bx-image-add text-lg text-blue-600" />
          )}
        </div>
        <div>
          <h2 className="font-bold text-gray-900 text-sm">
            Sube las imágenes de tu producto
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            La IA integrará tu producto en cada sección
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-300 bg-gray-50 hover:bg-indigo-50/30 transition cursor-pointer group flex flex-col items-center justify-center gap-3 p-10 text-center min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 group-hover:border-indigo-200 grid place-items-center transition">
            <i className="bx bx-cloud-upload text-2xl text-indigo-400" />
          </div>
          <p className="text-sm font-bold text-gray-700 group-hover:text-indigo-700 transition">
            Arrastra tus imágenes aquí
          </p>
          <p className="text-xs text-gray-400">o haz clic para explorar</p>
          <span className="px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-[11px] font-semibold">
            PNG · JPG · WEBP
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 min-h-[200px] flex flex-col">
          {userImages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 grid place-items-center">
                <i className="bx bx-image text-xl text-gray-300" />
              </div>
              <p className="text-xs text-gray-400">
                Tus imágenes aparecerán aquí
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-blue-600 text-white text-[10px] font-bold grid place-items-center">
                    {userImages.length}
                  </span>
                  <span className="text-[11px] font-semibold text-gray-600">
                    imagen{userImages.length !== 1 ? "es" : ""}
                  </span>
                </div>
                <button
                  onClick={() => setUserImages([])}
                  className="text-[11px] text-rose-400 hover:text-rose-600 font-semibold"
                >
                  Limpiar
                </button>
              </div>
              <div className="flex flex-wrap gap-2 flex-1">
                {userImages.map((img) => (
                  <div key={img.id} className="relative group/img">
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-16 h-16 object-cover rounded-xl border border-gray-200"
                    />
                    <button
                      onClick={() =>
                        setUserImages((prev) =>
                          prev.filter((i) => i.id !== img.id),
                        )
                      }
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center opacity-0 group-hover/img:opacity-100 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 transition grid place-items-center text-gray-300 hover:text-indigo-400"
                >
                  <i className="bx bx-plus text-xl" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition"
        >
          <i className="bx bx-left-arrow-alt text-base" /> Atrás
        </button>
        <button
          onClick={onContinue}
          disabled={userImages.length === 0}
          className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition ${
            userImages.length > 0
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          Continuar <i className="bx bx-right-arrow-alt text-base" />
        </button>
      </div>
    </div>
  );
};

export default StepImages;
