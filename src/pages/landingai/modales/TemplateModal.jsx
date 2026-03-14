import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const TemplateModal = ({
  open,
  onClose,
  onConfirm,
  templates = [],
  etapas = [],
}) => {
  // ── UI State
  const [activeTab, setActiveTab] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [modalStep, setModalStep] = useState("gallery"); // 'gallery' | 'etapas'
  const [selectedEtapas, setSelectedEtapas] = useState([]);
  const [sourceTab, setSourceTab] = useState("public"); // 'public' | 'private'
  const loadingData = templates.length === 0 || etapas.length === 0;

  // ── Private templates state
  const [privateTemplates, setPrivateTemplates] = useState([]);
  const [loadingPrivate, setLoadingPrivate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadEtapa, setUploadEtapa] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const uploadFileRef = useRef(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);

  // ── Refs
  const tabsRef = useRef(null);

  // ── Reset on open
  useEffect(() => {
    if (open) {
      setSelectedTemplate(null);
      setModalStep("gallery");
      setSelectedEtapas([]);
      setSourceTab("public");
      setShowUploadForm(false);
      setUploadName("");
      setUploadEtapa("");
      setUploadFile(null);
      setUploadPreview(null);
      if (etapas.length > 0) setActiveTab(etapas[0].id);
    }
  }, [open, etapas]);

  // ── Fetch private templates
  const fetchPrivate = async () => {
    setLoadingPrivate(true);
    try {
      const res = await chatApi.get("gemini/mis-templates");
      if (res.data?.isSuccess) setPrivateTemplates(res.data.data || []);
    } catch {
      /* silent */
    } finally {
      setLoadingPrivate(false);
    }
  };

  useEffect(() => {
    if (open && sourceTab === "private" && privateTemplates.length === 0) {
      fetchPrivate();
    }
  }, [open, sourceTab]);

  // ── Go to etapas step
  const goToEtapasStep = () => {
    const recomendadas = etapas
      .filter((e) => e.es_obligatoria)
      .map((e) => e.id);
    setSelectedEtapas(recomendadas);
    setModalStep("etapas");
  };

  const selectAll = () => setSelectedEtapas(etapas.map((e) => e.id));

  const toggleEtapa = (id) => {
    setSelectedEtapas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleConfirm = () => {
    if (!selectedTemplate || selectedEtapas.length === 0) return;

    // Find in public or private
    let template =
      templates.find((t) => t.id === selectedTemplate) ||
      privateTemplates.find((t) => `priv-${t.id}` === selectedTemplate);

    // If private, normalize the object
    if (!template) return;
    if (template && !template.src_url && template.id) {
      // shouldn't happen but safety
      return;
    }

    const selectedFull = etapas.filter((e) => selectedEtapas.includes(e.id));
    onConfirm({
      template: {
        id: template.id,
        nombre: template.nombre,
        src_url: template.src_url,
      },
      etapas: selectedFull,
      mode: selectedEtapas.length === etapas.length ? "all" : "custom",
    });
  };

  // ── Scroll tabs
  const scrollTabs = (dir) => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
    }
  };

  // ── Filtered public templates by active tab
  const filteredTemplates = activeTab
    ? templates.filter((t) => t.id_etapa === activeTab)
    : templates;

  // ── Filtered private templates by active tab
  const filteredPrivate = activeTab
    ? privateTemplates.filter((t) => t.id_etapa === activeTab)
    : privateTemplates;

  const activeEtapa = etapas.find((e) => e.id === activeTab);

  // ── Upload handlers
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ""));
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) {
      return Toast.fire({
        icon: "error",
        title: "Nombre e imagen son requeridos",
      });
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("imagen", uploadFile);
      fd.append("nombre", uploadName.trim());
      if (uploadEtapa) fd.append("id_etapa", uploadEtapa);

      const res = await chatApi.post("gemini/mis-templates", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });

      if (res.data?.isSuccess) {
        setPrivateTemplates((prev) => [res.data.data, ...prev]);
        setShowUploadForm(false);
        setUploadName("");
        setUploadEtapa("");
        setUploadFile(null);
        if (uploadPreview) URL.revokeObjectURL(uploadPreview);
        setUploadPreview(null);
        Toast.fire({ icon: "success", title: "Template subido" });
      }
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al subir",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePrivate = async (id) => {
    try {
      await chatApi.delete(`gemini/mis-templates/${id}`);
      setPrivateTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selectedTemplate === `priv-${id}`) setSelectedTemplate(null);
      Toast.fire({ icon: "success", title: "Eliminado" });
    } catch {
      Toast.fire({ icon: "error", title: "Error al eliminar" });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
        {/* ══════════ HEADER ══════════ */}
        <div className="px-5 pt-5 pb-0 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 grid place-items-center">
                <i
                  className={`bx ${modalStep === "gallery" ? "bx-grid-alt" : "bx-list-check"} text-lg text-indigo-600`}
                />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">
                  {modalStep === "gallery"
                    ? "Galería de Diseños"
                    : "Secciones de tu Landing"}
                </h2>
                {modalStep === "gallery" && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Haz clic en un template para seleccionarlo
                  </p>
                )}
                {modalStep === "etapas" && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Elige qué secciones generar con la IA
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-gray-200 grid place-items-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
            >
              <i className="bx bx-x text-lg" />
            </button>
          </div>

          {/* ── Source toggle (solo en gallery) ── */}
          {modalStep === "gallery" && (
            <div className="flex items-center gap-2 mb-3">
              <div
                className="inline-flex rounded-lg p-0.5"
                style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}
              >
                <button
                  onClick={() => setSourceTab("public")}
                  className="px-3 py-1.5 rounded-md text-[11px] font-bold transition-all"
                  style={{
                    background:
                      sourceTab === "public" ? "white" : "transparent",
                    color: sourceTab === "public" ? "#6366f1" : "#94a3b8",
                    boxShadow:
                      sourceTab === "public"
                        ? "0 1px 3px rgba(0,0,0,0.08)"
                        : "none",
                  }}
                >
                  <i className="bx bx-grid-alt text-xs mr-1" />
                  Galería pública
                </button>
                <button
                  onClick={() => setSourceTab("private")}
                  className="px-3 py-1.5 rounded-md text-[11px] font-bold transition-all"
                  style={{
                    background:
                      sourceTab === "private" ? "white" : "transparent",
                    color: sourceTab === "private" ? "#f59e0b" : "#94a3b8",
                    boxShadow:
                      sourceTab === "private"
                        ? "0 1px 3px rgba(0,0,0,0.08)"
                        : "none",
                  }}
                >
                  <i className="bx bx-lock-alt text-xs mr-1" />
                  Mis templates
                  {privateTemplates.length > 0 && (
                    <span
                      className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{
                        background:
                          sourceTab === "private"
                            ? "rgba(245,158,11,0.1)"
                            : "#e2e8f0",
                        color: sourceTab === "private" ? "#f59e0b" : "#94a3b8",
                      }}
                    >
                      {privateTemplates.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Tabs por etapa (en gallery, ambos source tabs) ── */}
          {modalStep === "gallery" && (
            <div className="relative flex items-center gap-1 -mx-1">
              <button
                onClick={() => scrollTabs(-1)}
                className="shrink-0 w-7 h-7 rounded-lg border border-gray-200 grid place-items-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
              >
                <i className="bx bx-chevron-left text-base" />
              </button>

              <div
                ref={tabsRef}
                className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 px-1 pb-3"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {etapas.map((e) => {
                  const isActive = activeTab === e.id;
                  const count =
                    sourceTab === "public"
                      ? templates.filter((t) => t.id_etapa === e.id).length
                      : privateTemplates.filter((t) => t.id_etapa === e.id)
                          .length;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setActiveTab(e.id)}
                      className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        isActive
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {e.nombre}
                      {count > 0 && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => scrollTabs(1)}
                className="shrink-0 w-7 h-7 rounded-lg border border-gray-200 grid place-items-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
              >
                <i className="bx bx-chevron-right text-base" />
              </button>
            </div>
          )}
        </div>

        {/* ══════════ BODY ══════════ */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          {loadingData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <svg
                className="animate-spin w-6 h-6 text-indigo-500"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              <p className="text-xs text-gray-400">Cargando diseños...</p>
            </div>
          ) : modalStep === "gallery" ? (
            <>
              {/* ── PUBLIC TAB ── */}
              {sourceTab === "public" && (
                <>
                  {activeEtapa && (
                    <div className="flex items-center gap-2 mb-3 mt-1">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                          activeEtapa.es_obligatoria
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {activeEtapa.es_obligatoria
                          ? "RECOMENDADA"
                          : "OPCIONAL"}
                      </span>
                      {activeEtapa.descripcion && (
                        <span className="text-[11px] text-gray-400">
                          {activeEtapa.descripcion}
                        </span>
                      )}
                    </div>
                  )}

                  {filteredTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 grid place-items-center">
                        <i className="bx bx-image text-2xl text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-400 font-medium">
                        No hay templates en esta sección
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                      {filteredTemplates.map((t) => {
                        const active = selectedTemplate === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTemplate(t.id)}
                            className={`group relative rounded-xl overflow-hidden border-2 transition ${
                              active
                                ? "border-indigo-500 ring-2 ring-indigo-200 scale-[1.02]"
                                : "border-gray-200 hover:border-indigo-300"
                            }`}
                          >
                            <div
                              className="relative"
                              style={{ paddingBottom: "130%" }}
                            >
                              <img
                                src={t.src_url}
                                alt={t.nombre}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                              />
                              {active && (
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-600 text-white grid place-items-center">
                                  <i className="bx bx-check text-sm" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ── PRIVATE TAB ── */}
              {sourceTab === "private" && (
                <>
                  {/* Upload form */}
                  {showUploadForm ? (
                    <div
                      className="mb-4 p-4 rounded-xl"
                      style={{
                        background: "rgba(245,158,11,0.03)",
                        border: "1px solid rgba(245,158,11,0.15)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-gray-700">
                          Subir nuevo template
                        </p>
                        <button
                          onClick={() => {
                            setShowUploadForm(false);
                            setUploadFile(null);
                            setUploadPreview(null);
                            setUploadName("");
                            setUploadEtapa("");
                          }}
                          className="text-[10px] text-gray-400 hover:text-gray-600"
                        >
                          Cancelar
                        </button>
                      </div>
                      <div className="flex gap-3">
                        {/* Preview / upload area */}
                        <div
                          className="shrink-0 rounded-lg overflow-hidden cursor-pointer group"
                          style={{
                            width: 80,
                            height: 130,
                            border: "1.5px dashed #d1d5db",
                            background: "#fafafa",
                          }}
                          onClick={() => uploadFileRef.current?.click()}
                        >
                          {uploadPreview ? (
                            <img
                              src={uploadPreview}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                              <i className="bx bx-cloud-upload text-xl text-gray-300 group-hover:text-amber-400 transition" />
                              <p className="text-[8px] text-gray-400">Subir</p>
                            </div>
                          )}
                        </div>
                        <input
                          ref={uploadFileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileSelect}
                        />

                        {/* Fields */}
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={uploadName}
                            onChange={(e) => setUploadName(e.target.value)}
                            placeholder="Nombre del template"
                            className="w-full px-3 py-2 rounded-lg text-xs outline-none transition focus:ring-2 focus:ring-amber-200"
                            style={{
                              border: "1px solid #e2e8f0",
                              background: "white",
                            }}
                          />
                          <select
                            value={uploadEtapa}
                            onChange={(e) => setUploadEtapa(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
                            style={{
                              border: "1px solid #e2e8f0",
                              background: "white",
                              color: uploadEtapa ? "#374151" : "#9ca3af",
                            }}
                          >
                            <option value="">Sección (opcional)</option>
                            {etapas.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.nombre}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleUpload}
                            disabled={
                              uploading || !uploadFile || !uploadName.trim()
                            }
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition active:scale-95 disabled:opacity-40"
                            style={{
                              background: "#f59e0b",
                              color: "white",
                            }}
                          >
                            {uploading ? (
                              <>
                                <svg
                                  className="animate-spin w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8z"
                                  />
                                </svg>
                                Subiendo...
                              </>
                            ) : (
                              <>
                                <i className="bx bx-upload text-sm" /> Subir
                                template
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowUploadForm(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition active:scale-[.98] mb-4"
                      style={{
                        border: "1.5px dashed rgba(245,158,11,0.3)",
                        background: "rgba(245,158,11,0.03)",
                        color: "#f59e0b",
                      }}
                    >
                      <i className="bx bx-cloud-upload text-sm" /> Subir mi
                      propio template
                    </button>
                  )}

                  {/* Private templates grid */}
                  {loadingPrivate ? (
                    <div className="flex items-center justify-center py-12">
                      <svg
                        className="animate-spin w-5 h-5 text-amber-500"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                    </div>
                  ) : filteredPrivate.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div
                        className="w-14 h-14 rounded-2xl grid place-items-center"
                        style={{ background: "rgba(245,158,11,0.06)" }}
                      >
                        <i
                          className="bx bx-lock-open-alt text-2xl"
                          style={{ color: "#fbbf24" }}
                        />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">
                        {privateTemplates.length === 0
                          ? "Aún no tienes templates propios"
                          : "No hay templates en esta sección"}
                      </p>
                      <p className="text-[11px] text-gray-400 text-center max-w-xs">
                        Sube tus propios diseños para usarlos como referencia
                        visual
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                      {filteredPrivate.map((t) => {
                        const key = `priv-${t.id}`;
                        const active = selectedTemplate === key;
                        return (
                          <div key={t.id} className="relative group">
                            <button
                              onClick={() => setSelectedTemplate(key)}
                              className={`w-full relative rounded-xl overflow-hidden border-2 transition ${
                                active
                                  ? "border-amber-500 ring-2 ring-amber-200 scale-[1.02]"
                                  : "border-gray-200 hover:border-amber-300"
                              }`}
                            >
                              <div
                                className="relative"
                                style={{ paddingBottom: "130%" }}
                              >
                                <img
                                  src={t.src_url}
                                  alt={t.nombre}
                                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  loading="lazy"
                                />
                                {active && (
                                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500 text-white grid place-items-center">
                                    <i className="bx bx-check text-sm" />
                                  </div>
                                )}
                                {/* Private badge */}
                                <div
                                  className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[8px] font-bold truncate"
                                  style={{
                                    background: "rgba(0,0,0,0.6)",
                                    color: "white",
                                  }}
                                >
                                  {t.nombre}
                                </div>
                              </div>
                            </button>
                            {/* Delete button */}
                            <button
                              onClick={() => handleDeletePrivate(t.id)}
                              className="absolute top-1.5 left-1.5 w-5 h-5 rounded grid place-items-center opacity-0 group-hover:opacity-100 transition"
                              style={{ background: "rgba(239,68,68,0.9)" }}
                              title="Eliminar"
                            >
                              <i
                                className="bx bx-trash text-white"
                                style={{ fontSize: 10 }}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            /* ── ETAPAS STEP ── */
            <div className="py-3">
              {/* Selected template preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100 mb-4">
                {(() => {
                  const tpl =
                    templates.find((t) => t.id === selectedTemplate) ||
                    privateTemplates.find(
                      (t) => `priv-${t.id}` === selectedTemplate,
                    );
                  return tpl ? (
                    <>
                      <img
                        src={tpl.src_url}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover border border-indigo-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-indigo-700 truncate">
                          {tpl.nombre}
                        </p>
                        <p className="text-[10px] text-indigo-500 mt-0.5">
                          Template seleccionado como referencia visual
                        </p>
                      </div>
                    </>
                  ) : null;
                })()}
                <button
                  onClick={() => setModalStep("gallery")}
                  className="text-[11px] text-indigo-600 font-semibold underline underline-offset-2 shrink-0"
                >
                  Cambiar
                </button>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={selectAll}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition ${
                    selectedEtapas.length === etapas.length
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                  }`}
                >
                  <i className="bx bx-layer text-sm" />
                  Landing Completa ({etapas.length})
                </button>
                <span className="text-[10px] text-gray-400">
                  o elige individualmente ↓
                </span>
              </div>

              {/* Etapas list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {etapas.map((e) => {
                  const checked = selectedEtapas.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleEtapa(e.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition ${
                        checked
                          ? "border-indigo-400 bg-indigo-50/50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border-2 grid place-items-center shrink-0 transition ${
                          checked
                            ? "bg-indigo-600 border-indigo-600"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {checked && (
                          <i className="bx bx-check text-white text-xs" />
                        )}
                      </div>
                      <div
                        className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 text-[10px] font-black ${
                          checked
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {String(e.orden).padStart(2, "0")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-xs font-bold truncate ${checked ? "text-gray-900" : "text-gray-600"}`}
                          >
                            {e.nombre}
                          </p>
                          {e.es_obligatoria ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[8px] font-bold text-amber-700 shrink-0">
                              <i className="bx bx-star text-[8px]" />
                              RECOMENDADA
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-[8px] font-semibold text-gray-400 shrink-0">
                              OPCIONAL
                            </span>
                          )}
                        </div>
                        {e.descripcion && (
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                            {e.descripcion}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-center text-[10px] text-gray-400 mt-4">
                <i className="bx bx-info-circle text-xs mr-0.5" />
                Cada sección generada consume 1 imagen de tu plan mensual
              </p>
            </div>
          )}
        </div>

        {/* ══════════ FOOTER ══════════ */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-3.5 flex items-center justify-between bg-gray-50/80">
          {modalStep === "gallery" ? (
            <>
              <p className="text-[11px] text-gray-400">
                {selectedTemplate
                  ? "Template seleccionado ✓"
                  : "Haz clic en un template para seleccionarlo"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={goToEtapasStep}
                  disabled={!selectedTemplate}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition ${
                    selectedTemplate
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <i className="bx bx-check text-sm" />
                  Usar Este Template
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setModalStep("gallery")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition"
              >
                <i className="bx bx-left-arrow-alt text-base" />
                Cambiar template
              </button>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-500 font-semibold">
                  {selectedEtapas.length} sección
                  {selectedEtapas.length !== 1 ? "es" : ""}
                </span>
                <button
                  onClick={handleConfirm}
                  disabled={selectedEtapas.length === 0}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition ${
                    selectedEtapas.length > 0
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <i className="bx bx-magic-wand text-sm" />
                  Continuar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;
