// src/components/modales/ModalMasivo.jsx
import React from "react";
import Select from "react-select";

const EnviarTemplateMasivo = ({
  isOpen,
  closeModal,
  selected,
  templates,
  headerRequired,
  headerFormat,
  headerPlaceholders,
  headerPlaceholderValues,
  setHeaderPlaceholderValues,
  headerDefaultAssetMasivo,
  headerFileMasivo,
  setHeaderFileMasivo,
  previewUrl,
  programarMasivo,
  fechaHoraProgramada,
  timezoneProgramada,
  setProgramarMasivo,
  setFechaHoraProgramada,
  setTimezoneProgramada,
  loadingTemplates,
  customSelectStyles,
  templateText,
  handleTextareaChange,
  handlePlaceholderChange,
  placeholders,
  placeholderValues,
  templateReady,
  enviarTemplateMasivo,
  programarTemplateMasivo,
  abrirModalTemplates,
  handleTemplateSelect,
  useDefaultHeaderAssetMasivo,
  PreviewFile,
  setUseDefaultHeaderAssetMasivo,
  swalToast,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-h-[80vh] w-full max-w-2xl overflow-hidden ring-1 ring-slate-900/10 flex flex-col min-h-0">
        {/* Header fijo del modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Enviar mensaje masivo
            </h2>
            <p className="text-xs text-slate-500">
              Seleccionados: {selected.length} cliente(s)
            </p>
          </div>
          <button
            onClick={closeModal}
            className="rounded p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <i className="bx bx-x text-xl text-slate-600" />
          </button>
        </div>

        {/* ✅ ÚNICO contenedor scrolleable: headerRequired + form */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {/* ===== NUEVO: HEADER requerido por template ===== */}
          {headerRequired && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <i className="bx bx-image-alt text-sm" />
                  </span>
                  Header requerido
                </h4>
                <span className="text-[11px] text-slate-500">
                  Tipo: <b>{headerFormat}</b>
                </span>
              </div>

              {/* HEADER TEXT con placeholders */}
              {headerFormat === "TEXT" && headerPlaceholders.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {headerPlaceholders.map((ph) => (
                    <div key={`h-${ph}`}>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Header valor para {"{{" + ph + "}}"}
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        placeholder="Texto para el header"
                        value={headerPlaceholderValues[ph] || ""}
                        onChange={(e) =>
                          setHeaderPlaceholderValues((prev) => ({
                            ...prev,
                            [ph]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* HEADER MEDIA (IMAGE/VIDEO/DOCUMENT) */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-700">
                  {headerDefaultAssetMasivo?.url
                    ? `Adjunto del header (${headerFormat})`
                    : `Subir archivo (${headerFormat})`}
                </label>

                {/* Adjunto predeterminado del template (ejemplo Meta) */}
                {!!headerDefaultAssetMasivo?.url && !headerFileMasivo && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-indigo-900">
                          Adjunto predeterminado del template detectado
                        </p>
                        <p className="text-[11px] text-indigo-700 mt-0.5">
                          Se usará este archivo automáticamente si no sube uno
                          manual. Puede reemplazarlo si desea.
                        </p>
                      </div>

                      {!headerFileMasivo && !!useDefaultHeaderAssetMasivo && (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Usando predeterminado
                        </span>
                      )}
                    </div>

                    <div className="mt-3 rounded-lg border border-white/80 bg-white p-2">
                      <PreviewFile url={headerDefaultAssetMasivo.url} />
                      <div className="mt-2 text-[11px] text-slate-500 break-all">
                        {headerDefaultAssetMasivo.name ||
                          "Adjunto predeterminado del template"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Acciones (sin choose file visible) */}
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="header_file_input_masivo"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <i className="bx bx-upload" />
                    {headerFileMasivo
                      ? "Cambiar archivo"
                      : "Subir / reemplazar archivo"}
                  </label>

                  <input
                    id="header_file_input_masivo"
                    type="file"
                    accept={
                      headerFormat === "IMAGE"
                        ? "image/*"
                        : headerFormat === "VIDEO"
                          ? "video/*"
                          : "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*"
                    }
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (!file) return;

                      const fmt = headerFormat;

                      const ok =
                        (fmt === "IMAGE" && file.type.startsWith("image/")) ||
                        (fmt === "VIDEO" && file.type.startsWith("video/")) ||
                        (fmt === "DOCUMENT" && file.type !== "");

                      if (!ok) {
                        swalToast(`Archivo inválido para ${fmt}.`, "warning");
                        e.target.value = "";
                        setHeaderFileMasivo(null);
                        return;
                      }

                      const MAX_MB = 16;
                      if (file.size / (1024 * 1024) > MAX_MB) {
                        swalToast(`El archivo excede ${MAX_MB} MB.`, "error");
                        e.target.value = "";
                        setHeaderFileMasivo(null);
                        return;
                      }

                      setHeaderFileMasivo(file);
                      setUseDefaultHeaderAssetMasivo(false); // ✅ al subir uno nuevo, deja de usar el default
                    }}
                    className="hidden"
                  />

                  {/* Volver a usar el predeterminado (si existe y ya subió uno) */}
                  {!!headerDefaultAssetMasivo?.url && !!headerFileMasivo && (
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderFileMasivo(null);
                        setUseDefaultHeaderAssetMasivo(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <i className="bx bx-reset" />
                      Usar adjunto predeterminado
                    </button>
                  )}

                  {/* Quitar archivo (solo si NO hay predeterminado) */}
                  {!headerDefaultAssetMasivo?.url && !!headerFileMasivo && (
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderFileMasivo(null);
                        const input = document.getElementById(
                          "header_file_input_masivo",
                        );
                        if (input) input.value = "";
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                    >
                      <i className="bx bx-trash" />
                      Quitar archivo
                    </button>
                  )}
                </div>

                {/* Estado actual */}
                <div className="text-xs text-slate-500">
                  {headerFileMasivo ? (
                    <span>Archivo seleccionado: {headerFileMasivo.name}</span>
                  ) : headerDefaultAssetMasivo?.url &&
                    useDefaultHeaderAssetMasivo ? (
                    <span>
                      Se enviará el adjunto predeterminado del template. Si
                      desea, puede reemplazarlo.
                    </span>
                  ) : (
                    <span>No hay archivo seleccionado.</span>
                  )}
                </div>

                {/* Vista previa archivo manual */}
                {headerFileMasivo && (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs text-slate-600 mb-2">
                      <b>Vista previa:</b> {headerFileMasivo.name} ·{" "}
                      {(headerFileMasivo.size / (1024 * 1024)).toFixed(2)} MB
                    </div>

                    {headerFileMasivo.type.startsWith("image/") &&
                      previewUrl && (
                        <img
                          src={previewUrl}
                          alt="preview"
                          className="max-h-48 rounded-lg border border-slate-200 object-contain bg-white"
                        />
                      )}

                    {headerFileMasivo.type.startsWith("video/") &&
                      previewUrl && (
                        <video
                          src={previewUrl}
                          controls
                          className="w-full max-h-60 rounded-lg border border-slate-200 bg-black"
                        />
                      )}

                    {!headerFileMasivo.type.startsWith("image/") &&
                      !headerFileMasivo.type.startsWith("video/") && (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-slate-50"
                        >
                          <i className="bx bxs-file text-lg text-slate-500" />
                          Ver documento
                        </a>
                      )}
                  </div>
                )}
              </div>
            </div>
          )}

          <form className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <i className="bx bx-phone text-sm" />
                </span>
                Template de WhatsApp
              </h4>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">
                <i className="bx bx-check-shield text-xs" />
                Templates {templates.length}
              </span>
            </div>

            <Select
              id="lista_templates"
              options={templates.map((t) => ({
                value: t.name,
                label: t.name,
              }))}
              placeholder="Selecciona un template aprobado"
              onMenuOpen={() => {
                // ✅ solo consulta cuando el usuario abre el dropdown
                if (selected.length) abrirModalTemplates();
              }}
              isLoading={loadingTemplates}
              loadingMessage={() => "Cargando..."}
              noOptionsMessage={() =>
                loadingTemplates ? "Cargando..." : "No hay templates"
              }
              onChange={(opcion) =>
                handleTemplateSelect({
                  target: { value: opcion ? opcion.value : "" },
                })
              }
              isClearable
              styles={customSelectStyles}
              classNamePrefix="react-select"
            />

            <div>
              <label
                htmlFor="template_textarea"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Vista previa del mensaje
              </label>
              <textarea
                id="template_textarea"
                rows="6"
                value={templateText}
                onChange={handleTextareaChange}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {!!placeholders.length && (
              <div className="grid gap-3 md:grid-cols-2">
                {placeholders.map((ph) => {
                  const key = `body_${ph}`;
                  return (
                    <div key={ph}>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Valor para {"{{" + ph + "}}"}
                      </label>

                      <input
                        type="text"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        placeholder="Ej: {nombre}, {direccion}, {productos} o texto fijo…"
                        value={placeholderValues[key] || ""}
                        onChange={(e) =>
                          handlePlaceholderChange(key, e.target.value)
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Modo de envío
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Por defecto se envía ahora. Active programación si desea
                    enviarlo más tarde.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setProgramarMasivo((prev) => {
                      const next = !prev;
                      if (!next) setFechaHoraProgramada(""); // si cancela programación, limpia fecha/hora
                      return next;
                    });
                  }}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                    programarMasivo
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <i
                    className={
                      programarMasivo
                        ? "bx bx-calendar-check"
                        : "bx bx-calendar"
                    }
                  />
                  {programarMasivo ? "Programando envío" : "Enviar ahora"}
                </button>
              </div>

              {programarMasivo && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Fecha y hora
                      </label>
                      <input
                        type="datetime-local"
                        value={fechaHoraProgramada}
                        onChange={(e) => setFechaHoraProgramada(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Se interpretará según la zona horaria seleccionada.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Zona horaria
                      </label>
                      <input
                        type="text"
                        value={timezoneProgramada}
                        onChange={(e) => setTimezoneProgramada(e.target.value)}
                        placeholder="Ej: America/Guayaquil"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setTimezoneProgramada(
                            Intl.DateTimeFormat().resolvedOptions().timeZone ||
                              "America/Guayaquil",
                          )
                        }
                        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <i className="bx bx-reset" />
                        Usar zona detectada
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              {!templateReady ? (
                <p className="text-[11px] text-amber-600 flex items-center gap-1">
                  <i className="bx bx-error-circle text-sm" />
                  Completa todos los campos del template para enviar.
                </p>
              ) : (
                <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                  <i className="bx bx-check-circle text-sm" />
                  Template listo para enviar.
                </p>
              )}

              <button
                type="button"
                onClick={
                  programarMasivo
                    ? programarTemplateMasivo
                    : enviarTemplateMasivo
                }
                disabled={
                  !templateReady ||
                  !selected.length ||
                  (programarMasivo && !fechaHoraProgramada)
                }
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-4 ${
                  templateReady &&
                  selected.length &&
                  (!programarMasivo || !!fechaHoraProgramada)
                    ? programarMasivo
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-200"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-200"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed"
                }`}
              >
                <i
                  className={
                    programarMasivo ? "bx bx-calendar-check" : "bx bx-send"
                  }
                />
                {programarMasivo ? "Programar template" : "Enviar template"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EnviarTemplateMasivo;
