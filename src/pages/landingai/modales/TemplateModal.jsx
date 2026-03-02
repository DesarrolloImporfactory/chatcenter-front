import React, { useState, useEffect, useCallback, useRef } from "react";
import chatApi from "../../../api/chatcenter";

/**
 * TemplateModal
 *
 * Props:
 *   open       (bool)
 *   onClose    ()
 *   onConfirm  ({ template, etapas, mode }) → parent proceeds
 */
const TemplateModal = ({ open, onClose, onConfirm }) => {
  // ── Data from API
  const [templates, setTemplates] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // ── UI State
  const [activeTab, setActiveTab] = useState(null); // id_etapa for filtering
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [modalStep, setModalStep] = useState("gallery"); // 'gallery' | 'etapas'
  const [selectedEtapas, setSelectedEtapas] = useState([]);

  const tabsRef = useRef(null);

  // ── Fetch data
  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [tRes, eRes] = await Promise.all([
        chatApi.get("gemini/templates"),
        chatApi.get("gemini/etapas"),
      ]);
      if (tRes.data?.data) setTemplates(tRes.data.data);
      if (eRes.data?.data) {
        setEtapas(eRes.data.data);
        if (eRes.data.data.length > 0) setActiveTab(eRes.data.data[0].id);
      }
    } catch {
      /* silencioso */
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchData();
      setSelectedTemplate(null);
      setModalStep("gallery");
      setSelectedEtapas([]);
    }
  }, [open, fetchData]);

  // Pre-select recommended stages when going to step 2
  const goToEtapasStep = () => {
    const recomendadas = etapas
      .filter((e) => e.es_obligatoria)
      .map((e) => e.id);
    setSelectedEtapas(recomendadas);
    setModalStep("etapas");
  };

  // Select all
  const selectAll = () => setSelectedEtapas(etapas.map((e) => e.id));

  // Toggle etapa — ALL are deselectable
  const toggleEtapa = (id) => {
    setSelectedEtapas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleConfirm = () => {
    if (!selectedTemplate || selectedEtapas.length === 0) return;
    const template = templates.find((t) => t.id === selectedTemplate);
    const selectedFull = etapas.filter((e) => selectedEtapas.includes(e.id));
    onConfirm({
      template,
      etapas: selectedFull,
      mode: selectedEtapas.length === etapas.length ? "all" : "custom",
    });
  };

  // Scroll tabs
  const scrollTabs = (dir) => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
    }
  };

  // Filtered templates by active tab
  const filteredTemplates = activeTab
    ? templates.filter((t) => t.id_etapa === activeTab)
    : templates;

  const activeEtapa = etapas.find((e) => e.id === activeTab);

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

          {/* ── Tabs por etapa (solo en gallery) ── */}
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
                  const count = templates.filter(
                    (t) => t.id_etapa === e.id,
                  ).length;
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
              {/* Etapa info */}
              {activeEtapa && (
                <div className="flex items-center gap-2 mb-3 mt-1">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                      activeEtapa.es_obligatoria
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {activeEtapa.es_obligatoria ? "RECOMENDADA" : "OPCIONAL"}
                  </span>
                  {activeEtapa.descripcion && (
                    <span className="text-[11px] text-gray-400">
                      {activeEtapa.descripcion}
                    </span>
                  )}
                </div>
              )}

              {/* Templates grid */}
              {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 grid place-items-center">
                    <i className="bx bx-image text-2xl text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">
                    No hay templates en esta sección
                  </p>
                  <p className="text-[11px] text-gray-300">
                    El administrador puede agregar desde el panel
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
          ) : (
            /* ── ETAPAS STEP ── */
            <div className="py-3">
              {/* Selected template preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100 mb-4">
                <img
                  src={
                    templates.find((t) => t.id === selectedTemplate)?.src_url
                  }
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover border border-indigo-200 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-indigo-700 truncate">
                    {templates.find((t) => t.id === selectedTemplate)?.nombre}
                  </p>
                  <p className="text-[10px] text-indigo-500 mt-0.5">
                    Template seleccionado como referencia visual
                  </p>
                </div>
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
                      {/* Checkbox */}
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

                      {/* Number */}
                      <div
                        className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 text-[10px] font-black ${
                          checked
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {String(e.orden).padStart(2, "0")}
                      </div>

                      {/* Info */}
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
                Haz clic en un template para seleccionarlo
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
