import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const location = useLocation();
  const navigate = useNavigate();

  // ── Extract product context from navigation state ──
  const productState = location.state || {};
  const fromProducto = productState.fromProducto === true;

  // ── Config state ──
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [step, setStep] = useState("home");
  const [userImages, setUserImages] = useState([]);
  const [description, setDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");

  // ── Product linkage ──
  const [idProducto, setIdProducto] = useState(null);
  const [productoNombre, setProductoNombre] = useState("");

  // ── Pricing state ──
  const [pricing, setPricing] = useState({
    precio_unitario: "",
    combos: [],
  });

  // ── Angle state ──
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
  const [moneda, setMoneda] = useState("USD");
  const [idioma, setIdioma] = useState("es");

  // ── Usage state ──
  const [usage, setUsage] = useState({
    used: 0,
    limit: 0,
    remaining: 0,
    plan: "",
    angles_used: 0,
    angles_limit: 0,
    angles_remaining: 0,
  });

  // ── Modal state ──
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // ── Assign to product modal ──
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [productos, setProductos] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  // ── Background templates ──
  const [bgTemplates, setBgTemplates] = useState([]);
  const [etapas, setEtapas] = useState([]);

  const stepRef = useRef(null);
  const initializedRef = useRef(false);

  const scrollToStep = useCallback(() => {
    setTimeout(() => {
      stepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }, []);

  // ── Initialize with product data if coming from ProductoDetallePage ──
  useEffect(() => {
    if (fromProducto && !initializedRef.current) {
      initializedRef.current = true;

      if (productState.id_producto) setIdProducto(productState.id_producto);
      if (productState.nombre) setProductoNombre(productState.nombre);
      if (productState.descripcion) setDescription(productState.descripcion);
      if (productState.marca) setMarca(productState.marca);
      if (productState.moneda) setMoneda(productState.moneda);
      if (productState.precio_unitario || productState.combos) {
        setPricing({
          precio_unitario: productState.precio_unitario || "",
          combos: productState.combos || [],
        });
      }

      // Pre-load product portada as user image
      if (productState.imagen_portada) {
        fetch(productState.imagen_portada, { mode: "cors" })
          .then((r) => r.blob())
          .then((blob) => {
            const file = new File([blob], "portada-producto.png", {
              type: blob.type || "image/png",
            });
            setUserImages([
              {
                id: Date.now() + Math.random(),
                file,
                dataUrl: productState.imagen_portada,
                name: "portada-producto.png",
                fromProduct: true,
              },
            ]);
          })
          .catch(() => {});
      }

      // Clear navigation state so refresh doesn't re-apply
      window.history.replaceState({}, document.title);
    }
  }, [fromProducto, productState]);

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
    chatApi
      .get("gemini/etapas")
      .then((r) => {
        if (r.data?.data) setEtapas(r.data.data);
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
        fd.append("moneda", moneda);
        fd.append("idioma", idioma);

        // ✅ FIX: enviar id_producto si está vinculado
        if (idProducto) {
          fd.append("id_producto", String(idProducto));
        }

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

  // ── Regenerate single etapa with edited prompt ──
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
      fd.append("marca", marca);
      fd.append("moneda", moneda);
      fd.append("idioma", idioma);
      fd.append("prompt_extra", promptExtra);

      if (idProducto) {
        fd.append("id_producto", String(idProducto));
      }

      userImages.forEach((img) => {
        if (img.file) fd.append("user_images", img.file);
      });

      const res = await chatApi.post("gemini/regenerar-etapa", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 150000,
        silentError: true,
      });

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

  // ── Assign results to existing product ──
  const handleOpenAssignModal = async () => {
    setShowAssignModal(true);
    setLoadingProductos(true);
    try {
      const res = await chatApi.get("gemini/productos");
      if (res.data?.isSuccess) setProductos(res.data.data || []);
    } catch {
      Toast.fire({ icon: "error", title: "Error al cargar productos" });
    } finally {
      setLoadingProductos(false);
    }
  };

  const handleAssignToProduct = async (productoId) => {
    // Re-assign the image URLs from results to the selected product
    const imageUrls = results
      .filter((r) => r.success && r.image_url)
      .map((r) => r.image_url);

    if (imageUrls.length === 0) {
      return Toast.fire({
        icon: "error",
        title: "No hay imágenes para asignar",
      });
    }

    try {
      await chatApi.post(`gemini/productos/${productoId}/asignar-imagenes`, {
        image_urls: imageUrls,
      });

      setIdProducto(productoId);
      const prod = productos.find((p) => p.id === productoId);
      if (prod) setProductoNombre(prod.nombre);

      setShowAssignModal(false);
      Toast.fire({
        icon: "success",
        title: `${imageUrls.length} imagen${imageUrls.length !== 1 ? "es" : ""} asignada${imageUrls.length !== 1 ? "s" : ""} al producto`,
      });
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al asignar imágenes",
      });
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
    setMoneda("USD");
    setIdioma("es");
    setIdProducto(null);
    setProductoNombre("");
  };

  // ── Go back to product detail ──
  const goBackToProduct = () => {
    if (idProducto) {
      navigate(`/insta_landing_productos/${idProducto}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ══════════════ PRODUCT CONTEXT BANNER ══════════════ */}
      {idProducto && (
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-2xl mb-3"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(59,130,246,0.06))",
            border: "1px solid rgba(99,102,241,0.15)",
          }}
        >
          <div
            className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
            style={{ background: "rgba(99,102,241,0.1)" }}
          >
            <i className="bx bx-package text-sm" style={{ color: "#6366f1" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-700 truncate">
              Generando para: {productoNombre || `Producto #${idProducto}`}
            </p>
            <p className="text-[10px] text-gray-400">
              Las imágenes se vincularán automáticamente a este producto
            </p>
          </div>
          <button
            onClick={goBackToProduct}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition hover:bg-white"
            style={{ border: "1px solid #e2e8f0", color: "#6366f1" }}
          >
            <i className="bx bx-arrow-back text-xs" />
            Volver al producto
          </button>
          <button
            onClick={() => {
              setIdProducto(null);
              setProductoNombre("");
            }}
            className="shrink-0 w-7 h-7 rounded-lg grid place-items-center hover:bg-white transition"
            title="Desvincular producto"
          >
            <i className="bx bx-x text-sm text-gray-400" />
          </button>
        </div>
      )}

      {/* ══════════════ HERO ══════════════ */}
      <HeroSection
        usage={usage}
        step={step}
        onShowHistory={() => setShowHistory(true)}
      />

      {/* ══════════════ BODY ══════════════ */}
      <div className="pt-5" ref={stepRef}>
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
            moneda={moneda}
            setMoneda={setMoneda}
            idioma={idioma}
            setIdioma={setIdioma}
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
            usage={usage}
            setUsage={setUsage}
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
          <>
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

            {/* ── Assign to product bar (only when results exist and not linked) ── */}
            {!generating && results.some((r) => r.success) && !idProducto && (
              <div
                className="mt-5 flex items-center gap-3 px-5 py-4 rounded-2xl"
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                  style={{ background: "rgba(99,102,241,0.06)" }}
                >
                  <i
                    className="bx bx-link text-lg"
                    style={{ color: "#6366f1" }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-700">
                    ¿Vincular a un producto?
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Asigna estas imágenes a un producto existente para segmentar
                    tus landings
                  </p>
                </div>
                <button
                  onClick={handleOpenAssignModal}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
                  style={{
                    background: "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.15)",
                    color: "#6366f1",
                  }}
                >
                  <i className="bx bx-package text-sm" />
                  Asignar a producto
                </button>
              </div>
            )}

            {/* Show linked product info */}
            {!generating && results.some((r) => r.success) && idProducto && (
              <div
                className="mt-5 flex items-center gap-3 px-5 py-4 rounded-2xl"
                style={{
                  background: "rgba(16,185,129,0.04)",
                  border: "1px solid rgba(16,185,129,0.15)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                  style={{ background: "rgba(16,185,129,0.1)" }}
                >
                  <i
                    className="bx bx-check-circle text-lg"
                    style={{ color: "#10b981" }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-700">
                    Vinculado a: {productoNombre || `Producto #${idProducto}`}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Las imágenes están asignadas a este producto
                  </p>
                </div>
                <button
                  onClick={goBackToProduct}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition hover:bg-white"
                  style={{ border: "1px solid #e2e8f0", color: "#10b981" }}
                >
                  Ver producto
                  <i className="bx bx-right-arrow-alt text-sm" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════ MODALS ══════════ */}
      <TemplateModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onConfirm={handleTemplateConfirm}
        templates={bgTemplates}
        etapas={etapas}
      />
      <HistorialModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        usage={usage}
      />

      {/* ══════════ ASSIGN TO PRODUCT MODAL ══════════ */}
      {showAssignModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(15,17,41,0.5)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowAssignModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl grid place-items-center"
                    style={{ background: "rgba(99,102,241,0.06)" }}
                  >
                    <i
                      className="bx bx-package text-lg"
                      style={{ color: "#6366f1" }}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">
                      Asignar a producto
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      Selecciona el producto destino
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="w-8 h-8 rounded-lg grid place-items-center hover:bg-gray-100 transition"
                >
                  <i className="bx bx-x text-lg text-gray-400" />
                </button>
              </div>

              {loadingProductos ? (
                <div className="flex items-center justify-center py-12">
                  <svg
                    className="animate-spin w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#6366f1"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="#6366f1"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                </div>
              ) : productos.length === 0 ? (
                <div className="text-center py-10">
                  <i className="bx bx-package text-3xl text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">
                    No tienes productos
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Crea uno primero en el catálogo de productos
                  </p>
                </div>
              ) : (
                <div
                  className="space-y-2 max-h-80 overflow-y-auto"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {productos.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleAssignToProduct(p.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition hover:bg-gray-50 text-left"
                      style={{ border: "1px solid #e2e8f0" }}
                    >
                      {p.imagen_portada ? (
                        <img
                          src={p.imagen_portada}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-lg grid place-items-center shrink-0"
                          style={{ background: "#f1f5f9" }}
                        >
                          <i className="bx bx-package text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-700 truncate">
                          {p.nombre}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.marca && (
                            <span className="text-[10px] text-gray-400">
                              {p.marca}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-300">
                            {p.total_generaciones || 0} imgs
                          </span>
                        </div>
                      </div>
                      <i
                        className="bx bx-right-arrow-alt text-lg shrink-0"
                        style={{ color: "#6366f1" }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingAi;
