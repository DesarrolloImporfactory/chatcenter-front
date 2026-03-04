import React, { useState, useRef, useCallback, useEffect } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

// Components
import HeroSection from "./components/HeroSection";
import StepHome from "./components/StepHome";
import StepImages from "./components/StepImages";
import StepPricing from "./components/StepPricing";
import StepAngles from "./components/stepAngles";
import StepGenerate from "./components/StepGenerate";
import StepResults from "./components/StepResults";

// Modals (existing)
import HistorialModal from "./modales/HistorialModal";
import TemplateModal from "./modales/TemplateModal";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const LandingAi = () => {
  // ── Config state ──
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [step, setStep] = useState("home");
  const [userImages, setUserImages] = useState([]);
  const [description, setDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");

  // ── NEW: Pricing state ──
  const [pricing, setPricing] = useState({
    precio_unitario: "",
    combos: [],
  });

  // ── NEW: Angle state ──
  const [selectedAngle, setSelectedAngle] = useState(null);
  const [customAngle, setCustomAngle] = useState("");
  const [anguloVenta, setAnguloVenta] = useState("");

  // ── Generation state ──
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({
    current: 0,
    total: 0,
    etapa: "",
  });
  const [results, setResults] = useState([]);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [marca, setMarca] = useState("");

  // ── Usage state ──
  const [usage, setUsage] = useState({
    used: 0,
    limit: 0,
    remaining: 0,
    plan: "",
  });

  // ── Modal state ──
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // ── Background templates ──
  const [bgTemplates, setBgTemplates] = useState([]);

  const stepRef = useRef(null);

  const scrollToStep = useCallback(() => {
    setTimeout(() => {
      stepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }, []);

  // ── Fetch initial data ──
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

  // ── Handlers ──

  const handleTemplateConfirm = ({ template, etapas, mode }) => {
    setSelectedConfig({ template, etapas, mode });
    setShowTemplateModal(false);
    setStep("images");
    scrollToStep();
  };

  const goToStep = (s) => {
    setStep(s);
    scrollToStep();
  };

  const handleAnglesContinue = (angleText) => {
    setAnguloVenta(angleText);
    goToStep("generate");
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
        fd.append("angulo_venta", anguloVenta);
        fd.append("pricing", JSON.stringify(pricing));
        fd.append("marca", marca);
        userImages.forEach((img) => {
          if (img.file) fd.append("user_images", img.file);
        });

        const res = await chatApi.post("gemini/generar-etapa", fd, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 150000,
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
    if (ok > 0) {
      Toast.fire({
        icon: "success",
        title: `¡${ok} imagen${ok !== 1 ? "es" : ""} lista${ok !== 1 ? "s" : ""}!`,
      });
    }
  };

  // ── NEW: Regenerate single etapa with edited prompt ──
  const handleRegenerateEtapa = async (result, promptExtra) => {
    if (!selectedConfig) return;
    const { template } = selectedConfig;

    setRegeneratingId(result.etapa.id);

    try {
      const fd = new FormData();
      fd.append("template_url", template.src_url);
      fd.append("template_id", String(template.id));
      fd.append("etapa_id", String(result.etapa.id));
      fd.append("description", description);
      fd.append("aspect_ratio", aspectRatio);
      fd.append("angulo_venta", anguloVenta);
      fd.append("pricing", JSON.stringify(pricing));
      fd.append("prompt_extra", promptExtra);
      userImages.forEach((img) => {
        if (img.file) fd.append("user_images", img.file);
      });

      const res = await chatApi.post("gemini/regenerar-etapa", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 150000,
        silentError: true,
      });

      // Replace the result in the array
      setResults((prev) =>
        prev.map((r) =>
          r.etapa.id === result.etapa.id
            ? {
                etapa: r.etapa,
                image_base64: res.data.image_base64,
                image_url: res.data.image_url,
                success: true,
              }
            : r,
        ),
      );

      if (res.data.usage) {
        setUsage((prev) => ({
          ...prev,
          used: res.data.usage.used,
          remaining: res.data.usage.remaining,
        }));
      }

      Toast.fire({ icon: "success", title: "¡Sección regenerada!" });
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al regenerar la sección",
      });
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleReset = () => {
    setSelectedConfig(null);
    setUserImages([]);
    setDescription("");
    setPricing({ precio_unitario: "", combos: [] });
    setMarca("");
    setSelectedAngle(null);
    setCustomAngle("");
    setAnguloVenta("");
    setResults([]);
    setStep("home");
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ══════════════ HERO ══════════════ */}
      <HeroSection
        usage={usage}
        step={step}
        onShowHistory={() => setShowHistory(true)}
      />

      {/* ══════════════ BODY ══════════════ */}
      <div className="p-5" ref={stepRef}>
        {step === "home" && (
          <StepHome
            bgTemplates={bgTemplates}
            selectedConfig={selectedConfig}
            onShowTemplateModal={() => setShowTemplateModal(true)}
            onContinue={() => goToStep("images")}
          />
        )}

        {step === "images" && (
          <StepImages
            selectedConfig={selectedConfig}
            userImages={userImages}
            setUserImages={setUserImages}
            onShowTemplateModal={() => setShowTemplateModal(true)}
            onBack={() => goToStep("home")}
            onContinue={() => goToStep("pricing")}
          />
        )}

        {step === "pricing" && (
          <StepPricing
            description={description}
            setDescription={setDescription}
            pricing={pricing}
            setPricing={setPricing}
            marca={marca}
            setMarca={setMarca}
            onBack={() => goToStep("images")}
            onContinue={() => goToStep("angles")}
          />
        )}

        {step === "angles" && (
          <StepAngles
            description={description}
            pricing={pricing}
            selectedAngle={selectedAngle}
            setSelectedAngle={setSelectedAngle}
            customAngle={customAngle}
            setCustomAngle={setCustomAngle}
            onBack={() => goToStep("pricing")}
            onContinue={handleAnglesContinue}
          />
        )}

        {step === "generate" && (
          <StepGenerate
            selectedConfig={selectedConfig}
            userImages={userImages}
            description={description}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            anguloVenta={anguloVenta}
            pricing={pricing}
            usage={usage}
            onBack={() => goToStep("angles")}
            onGenerate={handleGenerate}
          />
        )}

        {step === "results" && (
          <StepResults
            generating={generating}
            genProgress={genProgress}
            results={results}
            setResults={setResults}
            usage={usage}
            setUsage={setUsage}
            onReset={handleReset}
            onRegenerate={handleGenerate}
            onRegenerateEtapa={handleRegenerateEtapa}
            regeneratingId={regeneratingId}
          />
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
