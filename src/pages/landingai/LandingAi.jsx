import React, { useState, useRef, useCallback, useEffect } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import HistorialModal from "./modales/HistorialModal";
import TemplateModal from "./modales/TemplateModal";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const ASPECT_RATIOS = [
  {
    label: "Banner",
    value: "16:9",
    icon: "bx-landscape",
    sub: "Facebook · Web · Landing",
  },
  { label: "Cuadrado", value: "1:1", icon: "bx-square", sub: "Feed Instagram" },
  {
    label: "Historia",
    value: "9:16",
    icon: "bx-mobile-alt",
    sub: "Stories · Reels",
  },
];

const BENEFITS = [
  {
    icon: "bx-time-five",
    title: "De horas a segundos",
    desc: "La IA crea las secciones de tu landing en segundos.",
  },
  {
    icon: "bx-layer",
    title: "Landing completa",
    desc: "Genera hasta 10 secciones profesionales de una sola vez.",
  },
  {
    icon: "bx-trending-up",
    title: "Listo para publicar",
    desc: "Imágenes optimizadas para tu landing page de producto.",
  },
];

const fileToDataUrl = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

const LandingAi = () => {
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [step, setStep] = useState("home");
  const [userImages, setUserImages] = useState([]);
  const [description, setDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");

  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({
    current: 0,
    total: 0,
    etapa: "",
  });
  const [results, setResults] = useState([]);

  const [usage, setUsage] = useState({
    used: 0,
    limit: 0,
    remaining: 0,
    plan: "",
  });

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // ── Templates para el blur de fondo ──
  const [bgTemplates, setBgTemplates] = useState([]);

  const fileInputRef = useRef(null);
  const stepRef = useRef(null);

  const scrollToStep = useCallback(() => {
    setTimeout(() => {
      stepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }, []);

  // ── Fetch usage + templates para fondo ──
  useEffect(() => {
    chatApi
      .get("gemini/usage")
      .then((r) => {
        if (r.data?.usage) setUsage(r.data.usage);
      })
      .catch(() => {});
    chatApi
      .get("gemini/templates")
      .then((r) => {
        if (r.data?.data) setBgTemplates(r.data.data);
      })
      .catch(() => {});
  }, []);

  const handleFileUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await fileToDataUrl(file);
      setUserImages((prev) => [
        ...prev,
        { id: Date.now() + Math.random(), file, dataUrl, name: file.name },
      ]);
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      handleFileUpload({ target: { files: e.dataTransfer.files } });
    },
    [handleFileUpload],
  );

  const handleTemplateConfirm = ({ template, etapas, mode }) => {
    setSelectedConfig({ template, etapas, mode });
    setShowTemplateModal(false);
    setStep("images");
    scrollToStep();
  };

  const handleGenerate = async () => {
    if (!selectedConfig || userImages.length === 0) return;
    const { template, etapas } = selectedConfig;

    if (usage.limit > 0 && usage.remaining < etapas.length) {
      return Toast.fire({
        icon: "error",
        title: `Necesitas ${etapas.length} imágenes pero solo te quedan ${usage.remaining}`,
      });
    }

    setGenerating(true);
    setResults([]);
    setGenProgress({ current: 0, total: etapas.length, etapa: "" });
    setStep("results");
    scrollToStep();

    const generated = [];

    for (let i = 0; i < etapas.length; i++) {
      const etapa = etapas[i];
      setGenProgress({
        current: i + 1,
        total: etapas.length,
        etapa: etapa.nombre,
      });

      try {
        const fd = new FormData();
        fd.append("template_url", template.src_url);
        fd.append("template_id", String(template.id));
        fd.append("etapa_id", String(etapa.id));
        fd.append("description", description);
        fd.append("aspect_ratio", aspectRatio);
        userImages.forEach((img) => {
          if (img.file) fd.append("user_images", img.file);
        });

        const res = await chatApi.post("gemini/generar-etapa", fd, {
          headers: { "Content-Type": "multipart/form-data" },
          silentError: true,
        });

        generated.push({
          etapa: { id: etapa.id, nombre: etapa.nombre, slug: etapa.slug },
          image_base64: res.data.image_base64,
          image_url: res.data.image_url,
          success: true,
        });
        setResults([...generated]);

        if (res.data.usage) {
          setUsage((prev) => ({
            ...prev,
            used: res.data.usage.used,
            remaining: res.data.usage.remaining,
          }));
        }
      } catch (err) {
        generated.push({
          etapa: { id: etapa.id, nombre: etapa.nombre, slug: etapa.slug },
          error: err?.response?.data?.message || err.message || "Error",
          success: false,
        });
        setResults([...generated]);

        if (err?.response?.status === 429 || err?.response?.status === 402) {
          Toast.fire({ icon: "error", title: "Límite alcanzado" });
          break;
        }
      }
    }

    setGenerating(false);
    const ok = generated.filter((g) => g.success).length;
    if (ok > 0)
      Toast.fire({
        icon: "success",
        title: `¡${ok} imagen${ok !== 1 ? "es" : ""} lista${ok !== 1 ? "s" : ""}!`,
      });
  };

  const handleDownload = (src) => {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `landing-ia-${Date.now()}.png`;
    a.click();
  };

  const handleReset = () => {
    setSelectedConfig(null);
    setUserImages([]);
    setDescription("");
    setResults([]);
    setStep("home");
  };

  const UsageBar = ({ compact = false }) => {
    if (usage.limit <= 0) return null;
    const pct = Math.min((usage.used / usage.limit) * 100, 100);
    const isEmpty = usage.remaining <= 0;
    const isLow = usage.remaining <= 3 && usage.remaining > 0;
    return (
      <div
        className={`rounded-xl border ${isEmpty ? "border-rose-200 bg-rose-50" : isLow ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"} ${compact ? "p-2" : "p-3"}`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span
            className={`text-[11px] font-bold flex items-center gap-1.5 ${isEmpty ? "text-rose-700" : isLow ? "text-amber-700" : "text-emerald-700"}`}
          >
            <i className="bx bx-bar-chart-alt-2 text-sm" />
            {isEmpty
              ? "Límite alcanzado"
              : `${usage.remaining} restante${usage.remaining !== 1 ? "s" : ""}`}
          </span>
          <span className="text-[10px] text-gray-500 font-semibold">
            {usage.used}/{usage.limit}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/80 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isEmpty ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {!compact && usage.plan && (
          <p className="text-[10px] text-gray-400 mt-1.5">
            {usage.plan} · Se renueva cada mes
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ══════════════ HERO ══════════════ */}
      <div className="bg-[#171931] relative overflow-hidden rounded-3xl">
        <div className="relative p-6 pb-0">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none">
                Crea tu landing
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-blue-300">
                  completa con IA
                </span>
              </h1>
              <p className="text-white/60 mt-3 max-w-xl text-sm leading-relaxed">
                Elige un template, sube las fotos de tu producto y la IA genera
                todas las secciones de tu landing page.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {usage.limit > 0 && (
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${
                    usage.remaining > 0
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                  }`}
                >
                  <i className="bx bx-image text-sm" />
                  {usage.used}/{usage.limit}
                </div>
              )}
              {usage.plan && (
                <span className="text-[10px] text-white/40">{usage.plan}</span>
              )}
              <button
                onClick={() => setShowHistory(true)}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white transition px-4 py-2 rounded-xl text-xs font-bold"
              >
                <i className="bx bx-history text-sm" /> Mi historial
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-6 border-b border-white/10">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 grid place-items-center shrink-0">
                  <i className={`bx ${b.icon} text-sm text-indigo-300`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{b.title}</p>
                  <p className="text-[11px] text-white/50 mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-1 py-4 overflow-x-auto">
            {[
              { key: "home", label: "Template" },
              { key: "images", label: "Imágenes" },
              { key: "generate", label: "Generar" },
              { key: "results", label: "Resultado" },
            ].map(({ key, label }, i, arr) => {
              const ci = arr.map((x) => x.key).indexOf(step);
              const completed = i < ci;
              const current = i === ci;
              return (
                <React.Fragment key={key}>
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition ${
                      current
                        ? "bg-white text-indigo-700"
                        : completed
                          ? "bg-white/15 text-white/90"
                          : "bg-white/5 text-white/30 border border-white/10"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-md text-[9px] font-bold grid place-items-center ${
                        current
                          ? "bg-indigo-600 text-white"
                          : completed
                            ? "bg-white/20 text-white"
                            : "bg-white/10 text-white/40"
                      }`}
                    >
                      {completed ? (
                        <i className="bx bx-check text-[9px]" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    {label}
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      className={`h-px w-4 shrink-0 ${completed ? "bg-white/30" : "bg-white/10"}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════════ BODY ══════════════ */}
      <div className="p-5" ref={stepRef}>
        {/* ── HOME: Real templates with blur ── */}
        {step === "home" && (
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 min-h-[400px]">
            {/* Real templates blurred behind */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 p-3 opacity-40">
                {(bgTemplates.length > 0
                  ? bgTemplates
                  : Array.from({ length: 10 })
                ).map((t, i) => (
                  <div
                    key={t?.id || i}
                    className="rounded-lg overflow-hidden aspect-[3/4]"
                  >
                    {t?.src_url ? (
                      <img
                        src={t.src_url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-200 to-blue-200" />
                    )}
                  </div>
                ))}
              </div>
              {/* Blur + fade overlay */}
              <div className="absolute inset-0 backdrop-blur-md bg-white/60" />
            </div>

            {/* CTA Content */}
            <div className="relative flex flex-col items-center justify-center text-center py-16 px-6 min-h-[400px]">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-600 grid place-items-center mb-5">
                <i className="bx bx-grid-alt text-3xl text-white" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">
                Selecciona el template a utilizar
              </h2>
              <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">
                Elige un diseño de referencia y las secciones que necesitas. La
                IA generará cada sección con el estilo del template y las fotos
                de tu producto.
              </p>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-bold hover:opacity-90 transition"
              >
                <i className="bx bx-grid-alt text-lg" /> Ver templates y
                secciones
              </button>

              {selectedConfig && (
                <div className="mt-5 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-indigo-200">
                  <img
                    src={selectedConfig.template.src_url}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover border border-indigo-100"
                  />
                  <div className="text-left">
                    <p className="text-xs font-bold text-indigo-700">
                      {selectedConfig.template.nombre}
                    </p>
                    <p className="text-[10px] text-indigo-500">
                      {selectedConfig.etapas.length} secciones
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setStep("images");
                      scrollToStep();
                    }}
                    className="ml-2 text-xs font-bold text-indigo-600 underline"
                  >
                    Continuar →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── IMAGES ── */}
        {step === "images" && selectedConfig && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
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
                onClick={() => setShowTemplateModal(true)}
                className="text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold underline underline-offset-2 shrink-0"
              >
                Cambiar
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div
                className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${userImages.length > 0 ? "bg-blue-600" : "bg-blue-50 border border-blue-100"}`}
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
                <p className="text-xs text-gray-400">
                  o haz clic para explorar
                </p>
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
                onClick={() => setStep("home")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition"
              >
                <i className="bx bx-left-arrow-alt text-base" /> Atrás
              </button>
              <button
                onClick={() => {
                  setStep("generate");
                  scrollToStep();
                }}
                disabled={userImages.length === 0}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition ${userImages.length > 0 ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
              >
                Continuar <i className="bx bx-right-arrow-alt text-base" />
              </button>
            </div>
          </div>
        )}

        {/* ── GENERATE ── */}
        {step === "generate" && selectedConfig && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-gray-50 border border-gray-100 flex-wrap">
              <img
                src={selectedConfig.template.src_url}
                alt=""
                className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
              />
              <span className="text-[11px] font-semibold text-gray-700">
                {selectedConfig.template.nombre}
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-[11px] text-gray-500">
                {selectedConfig.etapas.length} secciones
              </span>
              <span className="text-gray-300">·</span>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-md bg-blue-600 text-white text-[9px] font-bold grid place-items-center">
                  {userImages.length}
                </span>
                <span className="text-[11px] text-gray-500">
                  imagen{userImages.length !== 1 ? "es" : ""}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Describe tu producto o marca{" "}
                    <span className="ml-1 font-normal text-gray-400 normal-case">
                      (recomendado)
                    </span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Ej: Crema hidratante premium, colores azul y blanco, marca 'HydraSkin', público femenino adulto..."
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-800 placeholder-gray-300 bg-gray-50 focus:bg-white transition"
                  />
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <i className="bx bx-layer text-xs" /> Secciones a generar (
                    {selectedConfig.etapas.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedConfig.etapas.map((e, i) => (
                      <span
                        key={e.id}
                        className="px-2.5 py-1 rounded-lg bg-white border border-indigo-100 text-[10px] font-semibold text-gray-700"
                      >
                        <span className="text-indigo-500 mr-1">{i + 1}.</span>
                        {e.nombre}
                      </span>
                    ))}
                  </div>
                </div>
                <UsageBar />
              </div>

              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Formato de salida
                </p>
                <div className="space-y-1.5">
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setAspectRatio(r.value)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition ${aspectRatio === r.value ? "border-indigo-400 bg-indigo-50" : "border-gray-100 bg-gray-50 hover:border-indigo-200"}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg grid place-items-center transition ${aspectRatio === r.value ? "bg-indigo-600" : "bg-white border border-gray-200"}`}
                      >
                        <i
                          className={`bx ${r.icon} text-sm ${aspectRatio === r.value ? "text-white" : "text-gray-400"}`}
                        />
                      </div>
                      <div>
                        <p
                          className={`text-xs font-semibold ${aspectRatio === r.value ? "text-indigo-700" : "text-gray-700"}`}
                        >
                          {r.label}
                        </p>
                        <p className="text-[10px] text-gray-400">{r.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={usage.limit > 0 && usage.remaining <= 0}
              className={`mt-4 w-full py-4 rounded-2xl text-sm font-black tracking-wide transition flex items-center justify-center gap-2.5 ${
                usage.limit > 0 && usage.remaining <= 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:opacity-90"
              }`}
            >
              {usage.limit > 0 && usage.remaining <= 0 ? (
                <>
                  <i className="bx bx-lock-alt text-lg" /> Límite alcanzado
                </>
              ) : (
                <>
                  <i className="bx bx-magic-wand text-lg" /> Generar{" "}
                  {selectedConfig.etapas.length} sección
                  {selectedConfig.etapas.length !== 1 ? "es" : ""} →
                </>
              )}
            </button>

            <div className="pt-4 mt-2 border-t border-gray-100">
              <button
                onClick={() => setStep("images")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition"
              >
                <i className="bx bx-left-arrow-alt text-base" /> Atrás
              </button>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {step === "results" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            {generating && (
              <div className="mb-5 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 grid place-items-center shrink-0">
                    <svg
                      className="animate-spin w-5 h-5 text-white"
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
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">
                      Generando sección {genProgress.current}/
                      {genProgress.total}
                    </p>
                    <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                      {genProgress.etapa}
                    </p>
                  </div>
                  <span className="text-lg font-black text-indigo-600">
                    {Math.round(
                      (genProgress.current / genProgress.total) * 100,
                    )}
                    %
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-700"
                    style={{
                      width: `${(genProgress.current / genProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {!generating && results.length > 0 && (
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 grid place-items-center shrink-0">
                    <i className="bx bx-check-double text-white text-lg" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-sm">
                      ¡{results.filter((r) => r.success).length} sección
                      {results.filter((r) => r.success).length !== 1
                        ? "es"
                        : ""}{" "}
                      lista
                      {results.filter((r) => r.success).length !== 1 ? "s" : ""}
                      !
                    </h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Descarga o regenera
                    </p>
                  </div>
                </div>
                <UsageBar compact />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border overflow-hidden ${r.success ? "border-gray-100" : "border-rose-200 bg-rose-50"}`}
                >
                  {r.success ? (
                    <>
                      <div className="relative group">
                        <img
                          src={
                            r.image_url ||
                            `data:image/png;base64,${r.image_base64}`
                          }
                          alt={r.etapa.nombre}
                          className="w-full object-contain bg-gray-50"
                          style={{ maxHeight: "300px" }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() =>
                              handleDownload(
                                r.image_url ||
                                  `data:image/png;base64,${r.image_base64}`,
                              )
                            }
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-gray-900 text-xs font-semibold transition"
                          >
                            <i className="bx bx-download text-sm text-indigo-600" />{" "}
                            Descargar
                          </button>
                        </div>
                      </div>
                      <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-bold grid place-items-center">
                            {i + 1}
                          </span>
                          <span className="text-xs font-bold text-gray-800">
                            {r.etapa.nombre}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleDownload(
                              r.image_url ||
                                `data:image/png;base64,${r.image_base64}`,
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 transition"
                        >
                          <i className="bx bx-download text-sm" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-100 grid place-items-center shrink-0">
                        <i className="bx bx-error-circle text-rose-500 text-lg" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-rose-700">
                          {r.etapa.nombre}
                        </p>
                        <p className="text-[10px] text-rose-500 mt-0.5">
                          {r.error}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!generating && results.length > 0 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
                >
                  <i className="bx bx-plus text-sm" /> Nueva generación
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={
                    generating || (usage.limit > 0 && usage.remaining <= 0)
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#171931] text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-50"
                >
                  <i className="bx bx-refresh text-sm" /> Regenerar todas
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════ MODALS ══════════ */}
      <TemplateModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onConfirm={handleTemplateConfirm}
      />
      <HistorialModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        usage={usage}
      />
    </div>
  );
};

export default LandingAi;
