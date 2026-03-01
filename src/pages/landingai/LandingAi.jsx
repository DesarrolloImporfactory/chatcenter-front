import React, { useState, useRef, useCallback, useEffect } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import GeminiApiKeyModal from "./modales/GeminiApiKeyModal";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const TEMPLATES = [
  {
    id: 1,
    src: "https://imp-datas.s3.amazonaws.com/images/2026-03-01T01-56-54-307Z-1_897eadca-1217-47ad-9b19-e678e20ecc59.jpg",
  },
  {
    id: 2,
    src: "https://imp-datas.s3.amazonaws.com/images/2026-03-01T01-56-45-143Z-OfertaEspecial.png",
  },
  {
    id: 3,
    src: "https://imp-datas.s3.amazonaws.com/images/2026-03-01T01-56-33-398Z-banner-21952-optimized_1.webp",
  },
  {
    id: 4,
    src: "https://imp-datas.s3.amazonaws.com/images/2026-03-01T01-56-23-020Z-imgi_25_section-31433-optimized.jpg",
  },
  {
    id: 5,
    src: "https://imp-datas.s3.amazonaws.com/images/2026-03-01T01-56-13-698Z-1_eac83223-90b8-46bf-b6c9-d39da5eebefb.jpg",
  },
  {
    id: 6,
    src: "https://imp-datas.s3.amazonaws.com/images/2026-03-01T01-55-40-657Z-1_5f79b1a6-be88-4329-b009-3b90bc81bd17.jpg",
  },
];

const ASPECT_RATIOS = [
  { label: "Cuadrado", value: "1:1", icon: "bx-square", sub: "Feed Instagram" },
  {
    label: "Historia",
    value: "9:16",
    icon: "bx-mobile-alt",
    sub: "Stories · Reels",
  },
  {
    label: "Banner",
    value: "16:9",
    icon: "bx-landscape",
    sub: "Facebook · Web",
  },
];

const BENEFITS = [
  {
    icon: "bx-time-five",
    title: "De horas a segundos",
    desc: "La IA crea tu anuncio en menos de 30 segundos.",
  },
  {
    icon: "bx-palette",
    title: "Estilo consistente",
    desc: "Replica el estilo de tus mejores landings con tu producto.",
  },
  {
    icon: "bx-trending-up",
    title: "Listo para publicar",
    desc: "Instagram, Stories, Facebook Ads y banners web.",
  },
];

const STEPS_META = [
  { n: 1, icon: "bx-grid-alt", label: "Diseño" },
  { n: 2, icon: "bx-image-add", label: "Imágenes" },
  { n: 3, icon: "bx-send", label: "Generar" },
  { n: 4, icon: "bx-check-circle", label: "Resultado" },
];

// Preview base64 para UI (dataURL)
const fileToDataUrl = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

// ─────────────────────────────────────────────────────────────────────────────
const LandingAi = () => {
  const [idConfiguracion] = useState(() => {
    const v = localStorage.getItem("id_configuracion");
    return v ? parseInt(v) : null;
  });

  const [hasApiKey, setHasApiKey] = useState(false);
  const [showModalApiKey, setShowModalApiKey] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [userImages, setUserImages] = useState([]);
  const [description, setDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);

  const fileInputRef = useRef(null);
  const stepCardRef = useRef(null);
  const template = TEMPLATES.find((t) => t.id === selectedTemplate);

  // Scroll suave al card del paso activo
  const goToStep = useCallback((n) => {
    setStep(n);
    setTimeout(() => {
      stepCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);
  }, []);

  // ✅ Verificar si existe API Key (Gemini)
  useEffect(() => {
    const check = async () => {
      if (!idConfiguracion) return;
      try {
        const res = await chatApi.post("gemini/obtener_api_key", {
          id_configuracion: idConfiguracion,
        });
        // Tu backend puede devolver { api_key: true/false } o { has_api_key: true/false }
        const v = res.data?.api_key ?? res.data?.has_api_key;
        setHasApiKey(Boolean(v));
      } catch {
        setHasApiKey(false);
      }
    };
    check();
  }, [idConfiguracion]);

  // ✅ Subida de imágenes: guardamos `file` (para enviar) + `dataUrl` (para preview)
  const handleFileUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      const dataUrl = await fileToDataUrl(file);

      setUserImages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          file,
          dataUrl,
          mimeType: file.type,
          name: file.name,
        },
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

  // ✅ Generar (multipart/form-data) para evitar 413 por base64
  const handleGenerate = async () => {
    if (!hasApiKey) return setShowModalApiKey(true);

    if (!selectedTemplate) {
      return Toast.fire({
        icon: "warning",
        title: "Selecciona un diseño primero",
      });
    }

    if (userImages.length === 0) {
      return Toast.fire({
        icon: "warning",
        title: "Sube al menos una imagen de tu producto",
      });
    }

    setLoading(true);
    setGeneratedImage(null);
    setGeneratedPrompt("");
    setLoadingProgress(0);

    try {
      setLoadingMsg("Analizando tu diseño con IA...");
      setLoadingProgress(30);

      const fd = new FormData();
      fd.append("id_configuracion", String(idConfiguracion));
      fd.append("template_url", template.src);
      fd.append("description", description);
      fd.append("aspect_ratio", aspectRatio);

      // El backend debe tener multer.array('user_images')
      userImages.forEach((img) => {
        if (img.file) fd.append("user_images", img.file);
      });

      // Ruta correcta: gemini/generar
      const res = await chatApi.post("gemini/generar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        silentError: true, // evita toast global
      });

      setLoadingProgress(100);
      setGeneratedImage(`data:image/png;base64,${res.data.image_base64}`);
      setGeneratedPrompt(res.data.prompt || "");
      goToStep(4);
      Toast.fire({ icon: "success", title: "¡Imagen lista!" });
    } catch (err) {
      console.error(err);
      Toast.fire({
        icon: "error",
        title:
          err?.response?.data?.message || err.message || "Error al generar",
      });
    } finally {
      setLoading(false);
      setLoadingMsg("");
      setLoadingProgress(0);
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = generatedImage;
    a.download = `adgen-diseno-${selectedTemplate}-${Date.now()}.png`;
    a.click();
  };

  const handleReset = () => {
    setGeneratedImage(null);
    setGeneratedPrompt("");
    setSelectedTemplate(null);
    setUserImages([]);
    setDescription("");
    setShowPrompt(false);
    goToStep(1);
  };

  // ── Barra de navegación inferior (pasos 2 y 3) ──
  const NavBar = ({
    canNext = true,
    onNext,
    nextLabel = "Continuar",
    showSkip = false,
  }) => (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
      <button
        onClick={() => goToStep(step - 1)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition"
      >
        <i className="bx bx-left-arrow-alt text-base" />
        Atrás
      </button>
      <div className="flex items-center gap-3">
        {showSkip && userImages.length === 0 && (
          <button
            onClick={() => goToStep(step + 1)}
            className="text-[11px] text-gray-400 hover:text-gray-600 transition underline underline-offset-2"
          >
            Saltar
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            disabled={!canNext}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition
              ${
                canNext
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
          >
            {nextLabel} <i className="bx bx-right-arrow-alt text-base" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ══════════════════════════ HERO ══════════════════════════ */}
      <div className="bg-[#171931] relative overflow-hidden rounded-3xl">
        <div className="relative p-6 pb-0">
          {/* Título + API Key */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none">
                Crea anuncios que
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-blue-300">
                  convierten, en segundos.
                </span>
              </h1>
              <p className="text-white/60 mt-3 max-w-xl text-sm leading-relaxed">
                Elige el estilo de tu landing, sube las fotos de tu producto y
                la IA genera una imagen publicitaria profesional. Sin
                diseñadores. Sin esperas.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold
                ${
                  hasApiKey
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    hasApiKey ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                {hasApiKey ? "IA conectada" : "Sin API Key"}
              </div>
              <button
                onClick={() => setShowModalApiKey(true)}
                className="inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 transition px-4 py-2 rounded-xl text-xs font-bold"
              >
                <i
                  className={`bx ${hasApiKey ? "bx-edit" : "bx-plug"} text-sm`}
                />
                {hasApiKey ? "Editar API Key" : "Conectar IA"}
              </button>
            </div>
          </div>

          {/* Beneficios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-6 border-b border-white/10">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 grid place-items-center shrink-0">
                  <i className={`bx ${b.icon} text-sm text-indigo-300`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{b.title}</p>
                  <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Stepper ── */}
          <div className="flex items-center gap-1 py-4 overflow-x-auto">
            {STEPS_META.map(({ n, label }, i) => {
              const completed = step > n;
              const current = step === n;
              return (
                <React.Fragment key={n}>
                  <button
                    onClick={() => completed && goToStep(n)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition
                      ${
                        current
                          ? "bg-white text-indigo-700"
                          : completed
                            ? "bg-white/15 text-white/90 cursor-pointer hover:bg-white/20"
                            : "bg-white/5 text-white/30 cursor-default border border-white/10"
                      }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-md text-[9px] font-bold grid place-items-center
                      ${
                        current
                          ? "bg-indigo-600 text-white"
                          : completed
                            ? "bg-white/20 text-white"
                            : "bg-white/10 text-white/40"
                      }`}
                    >
                      {completed ? <i className="bx bx-check text-[9px]" /> : n}
                    </span>
                    {label}
                  </button>
                  {i < STEPS_META.length - 1 && (
                    <div
                      className={`h-px w-4 shrink-0 ${
                        completed ? "bg-white/30" : "bg-white/10"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════ PASO ACTIVO ══════════════════════════ */}
      <div className="p-5" ref={stepCardRef}>
        {/* ── PASO 1: GALERÍA ── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 grid place-items-center shrink-0">
                <i className="bx bx-grid-alt text-lg text-indigo-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">
                  Galería de diseños
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Toca el diseño que más te guste — la IA replicará su estilo
                  con tu producto
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATES.map((t) => {
                const active = selectedTemplate === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTemplate(t.id);
                      goToStep(2);
                    }}
                    className={`group relative rounded-xl overflow-hidden border-2 transition
                      ${
                        active
                          ? "border-indigo-500 ring-2 ring-indigo-100"
                          : "border-transparent hover:border-indigo-300"
                      }`}
                  >
                    <div
                      className="relative w-full"
                      style={{ paddingBottom: "100%" }}
                    >
                      <img
                        src={t.src}
                        alt={`Diseño ${t.id}`}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                      <span className="absolute bottom-1.5 left-2 text-white text-[10px] font-bold drop-shadow">
                        #{t.id}
                      </span>

                      {active && (
                        <div className="absolute inset-0 bg-indigo-600/25 flex items-start justify-end p-1.5 pointer-events-none">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white grid place-items-center shadow">
                            <i className="bx bx-check text-sm" />
                          </div>
                        </div>
                      )}

                      {!active && (
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition pointer-events-none" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-center text-[11px] text-gray-400 mt-3">
              Toca un diseño para continuar al siguiente paso
            </p>
          </div>
        )}

        {/* ── PASO 2: IMÁGENES ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
              <img
                src={template?.src}
                alt="Diseño elegido"
                className="w-14 h-14 rounded-xl object-contain bg-white border border-indigo-100 shrink-0 p-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-indigo-700">
                  Diseño #{selectedTemplate} seleccionado
                </p>
                <p className="text-[10px] text-indigo-500 mt-0.5">
                  La IA usará este estilo con tus fotos
                </p>
              </div>
              <button
                onClick={() => goToStep(1)}
                className="text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold transition underline underline-offset-2 shrink-0"
              >
                Cambiar
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div
                className={`w-9 h-9 rounded-xl grid place-items-center shrink-0
                ${
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
                  Fotos del producto, logo o referencias de tu marca — cuantas
                  más, mejor resultado
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="relative rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-300
                  bg-gray-50 hover:bg-indigo-50/30 transition cursor-pointer group
                  flex flex-col items-center justify-center gap-3 p-10 text-center min-h-[200px] overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                  <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-indigo-100/50" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 rounded-full bg-blue-100/50" />
                </div>
                <div className="relative w-12 h-12 rounded-2xl bg-white border border-gray-200 group-hover:border-indigo-200 grid place-items-center transition">
                  <i className="bx bx-cloud-upload text-2xl text-indigo-400" />
                </div>
                <div className="relative">
                  <p className="text-sm font-bold text-gray-700 group-hover:text-indigo-700 transition">
                    Arrastra tus imágenes aquí
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    o haz clic para explorar
                  </p>
                </div>
                <span className="relative px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-[11px] font-semibold">
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

              {/* Preview */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 min-h-[200px] flex flex-col">
                {userImages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
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
                          imagen{userImages.length !== 1 ? "es" : ""} cargada
                          {userImages.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <button
                        onClick={() => setUserImages([])}
                        className="text-[11px] text-rose-400 hover:text-rose-600 transition font-semibold"
                      >
                        Limpiar todo
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
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white
                              text-[9px] font-bold grid place-items-center opacity-0 group-hover/img:opacity-100 transition"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition grid place-items-center text-gray-300 hover:text-indigo-400"
                      >
                        <i className="bx bx-plus text-xl" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <NavBar canNext={true} onNext={() => goToStep(3)} showSkip={true} />
          </div>
        )}

        {/* ── PASO 3: CONFIGURAR Y GENERAR ── */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <img
                src={template?.src}
                alt="Diseño"
                className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-200 shrink-0 p-0.5"
              />
              <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
                <span className="text-[11px] font-semibold text-gray-700">
                  Diseño #{selectedTemplate}
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
              <button
                onClick={() => goToStep(2)}
                className="text-[11px] text-gray-400 hover:text-gray-600 font-semibold transition underline underline-offset-2 shrink-0"
              >
                Editar
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 grid place-items-center shrink-0">
                <i className="bx bx-send text-lg text-emerald-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">
                  Último paso — genera tu imagen
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Describe tu producto y elige el formato de salida
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Descripción */}
              <div className="lg:col-span-2 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Describe tu producto o marca
                    <span className="ml-1 font-normal text-gray-400 normal-case">
                      (recomendado)
                    </span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Ej: Crema hidratante premium para piel seca. Colores azul y blanco. Marca 'HydraSkin'. Público femenino adulto. Sensación de lujo..."
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none
                      text-gray-800 placeholder-gray-300 bg-gray-50 focus:bg-white transition"
                  />
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <i className="bx bx-list-check text-xs" />
                    Resumen de tu solicitud
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      {
                        label: "Diseño",
                        value: selectedTemplate ? `#${selectedTemplate}` : "—",
                        ok: !!selectedTemplate,
                      },
                      {
                        label: "Imágenes",
                        value: `${userImages.length} archivo${
                          userImages.length !== 1 ? "s" : ""
                        }`,
                        ok: userImages.length > 0,
                      },
                      {
                        label: "Descripción",
                        value: description ? "Incluida" : "No incluida",
                        ok: !!description,
                      },
                      { label: "Formato", value: aspectRatio, ok: true },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px]
                        ${
                          item.ok
                            ? "bg-white border border-indigo-100"
                            : "bg-rose-50 border border-rose-100"
                        }`}
                      >
                        <i
                          className={`bx ${
                            item.ok
                              ? "bx-check-circle text-emerald-500"
                              : "bx-error-circle text-rose-400"
                          } text-sm shrink-0`}
                        />
                        <span className="text-gray-500">{item.label}:</span>
                        <span
                          className={`font-semibold truncate ${
                            item.ok ? "text-gray-800" : "text-rose-600"
                          }`}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Formato */}
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Formato de salida
                </p>
                <div className="space-y-1.5">
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setAspectRatio(r.value)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition
                        ${
                          aspectRatio === r.value
                            ? "border-indigo-400 bg-indigo-50"
                            : "border-gray-100 bg-gray-50 hover:border-indigo-200"
                        }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg grid place-items-center transition
                        ${
                          aspectRatio === r.value
                            ? "bg-indigo-600"
                            : "bg-white border border-gray-200"
                        }`}
                      >
                        <i
                          className={`bx ${r.icon} text-sm ${
                            aspectRatio === r.value
                              ? "text-white"
                              : "text-gray-400"
                          }`}
                        />
                      </div>
                      <div>
                        <p
                          className={`text-xs font-semibold ${
                            aspectRatio === r.value
                              ? "text-indigo-700"
                              : "text-gray-700"
                          }`}
                        >
                          {r.label}
                        </p>
                        <p className="text-[10px] text-gray-400">{r.sub}</p>
                      </div>
                      {aspectRatio === r.value && (
                        <i className="bx bx-check-circle text-indigo-500 text-sm ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Progreso */}
            {loading && (
              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-indigo-700 flex items-center gap-2">
                    <svg
                      className="animate-spin w-3.5 h-3.5"
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
                    {loadingMsg}
                  </span>
                  <span className="text-[11px] text-indigo-500 font-bold">
                    {loadingProgress}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-indigo-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-700"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Botón generar */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`mt-4 w-full py-4 rounded-2xl text-sm font-black tracking-wide transition flex items-center justify-center gap-2.5
                ${
                  loading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : !hasApiKey
                      ? "bg-[#171931] text-white hover:opacity-90"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
            >
              {loading ? (
                <span className="text-gray-400">
                  {loadingMsg || "Procesando..."}
                </span>
              ) : !hasApiKey ? (
                <>
                  <i className="bx bx-key text-lg" /> Conecta tu API Key para
                  continuar
                </>
              ) : (
                <>
                  <i className="bx bx-magic-wand text-lg" /> Generar imagen
                  publicitaria →
                </>
              )}
            </button>

            {/* Solo flecha atrás en paso 3 */}
            <div className="pt-4 mt-2 border-t border-gray-100">
              <button
                onClick={() => goToStep(2)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition"
              >
                <i className="bx bx-left-arrow-alt text-base" />
                Atrás
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 4: RESULTADO ── */}
        {step === 4 && generatedImage && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 grid place-items-center shrink-0">
                  <i className="bx bx-check-double text-white text-lg" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">
                    ¡Tu imagen está lista!
                  </h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Descárgala o cópiala directamente
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  <i className="bx bx-code-alt text-sm" />
                  {showPrompt ? "Ocultar" : "Ver prompt"}
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 transition"
                >
                  <i className="bx bx-download text-sm" />
                  Descargar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-gray-100">
                <div className="relative group">
                  <img
                    src={generatedImage}
                    alt="Imagen generada"
                    className="w-full object-contain bg-gray-50"
                    style={{ maxHeight: "75vh" }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      onClick={handleDownload}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-gray-900 text-sm font-semibold hover:bg-indigo-50 transition"
                    >
                      <i className="bx bx-download text-lg text-indigo-600" />
                      Descargar
                    </button>
                  </div>
                </div>
                <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
                  {[`Diseño #${selectedTemplate}`, aspectRatio].map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-lg bg-white border border-gray-200 text-[10px] font-semibold text-gray-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {showPrompt && (
                  <div className="p-4 border-t border-gray-100">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <i className="bx bx-brain text-xs" />
                      Prompt enviado a la IA
                    </p>
                    <p className="text-[11px] text-gray-600 leading-relaxed font-mono bg-gray-50 rounded-xl p-3 border border-gray-100">
                      {generatedPrompt}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">
                    Diseño usado
                  </p>
                  <div className="w-full rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                    <img
                      src={template?.src}
                      alt="Diseño base"
                      className="w-full object-contain"
                      style={{ maxHeight: "200px" }}
                    />
                  </div>
                </div>

                {userImages.length > 0 && (
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">
                      Tus imágenes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {userImages.map((img) => (
                        <img
                          key={img.id}
                          src={img.dataUrl}
                          alt={img.name}
                          className="w-12 h-12 object-cover rounded-lg border border-gray-100"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-gray-100 p-4 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                    Acciones
                  </p>
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                      bg-[#171931] text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-50"
                  >
                    <i className="bx bx-refresh text-sm" />
                    Regenerar
                  </button>
                  <button
                    onClick={handleReset}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                      border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
                  >
                    <i className="bx bx-plus text-sm" />
                    Empezar de nuevo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModalApiKey && (
        <GeminiApiKeyModal
          onClose={() => setShowModalApiKey(false)}
          hasApiKey={hasApiKey}
          idConfiguracion={idConfiguracion}
          // ✅ Este modal internamente debe pegar a gemini/guardar_api_key (ajústalo en ese archivo)
          onSaved={() => setHasApiKey(true)}
        />
      )}
    </div>
  );
};

export default LandingAi;
