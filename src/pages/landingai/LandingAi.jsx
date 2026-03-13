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

// Modals
import HistorialModal from "./modales/HistorialModal";
import TemplateModal from "./modales/TemplateModal";
import ModalAsignarProducto from "./modales/ModalAsignarProducto";
import ModalNuevoProducto from "./modales/ModalNuevoProducto";

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

  const productState = location.state || {};
  const fromProducto = productState.fromProducto === true;

  // Config state
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [step, setStep] = useState("home");
  const [userImages, setUserImages] = useState([]);
  const [description, setDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");

  // Product linkage
  const [idProducto, setIdProducto] = useState(null);
  const [productoNombre, setProductoNombre] = useState("");
  const [productPortada, setProductPortada] = useState(null);

  // Pricing
  const [pricing, setPricing] = useState({ precio_unitario: "", combos: [] });

  // Angle
  const [selectedAngle, setSelectedAngle] = useState(null);
  const [customAngle, setCustomAngle] = useState("");
  const [anguloVenta, setAnguloVenta] = useState("");

  // Generation
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

  // Usage
  const [usage, setUsage] = useState({
    used: 0,
    limit: 0,
    remaining: 0,
    plan: "",
    angles_used: 0,
    angles_limit: 0,
    angles_remaining: 0,
  });

  // Derived flags — dependen de idProducto para resetear si desvincula
  const canSkipToAngles =
    fromProducto &&
    !!productState.imagen_portada &&
    !!productState.descripcion &&
    !!idProducto;

  const canSkipImages =
    fromProducto && !!productState.imagen_portada && !!idProducto;

  // Modals
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [productos, setProductos] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  // New product modal
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Background templates / etapas
  const [bgTemplates, setBgTemplates] = useState([]);
  const [etapas, setEtapas] = useState([]);

  // Track si la portada se está cargando
  const [loadingPortada, setLoadingPortada] = useState(false);

  const stepRef = useRef(null);
  const initializedRef = useRef(false);

  const scrollToStep = useCallback(() => {
    setTimeout(() => {
      stepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }, []);

  // ── Helper: appendear imágenes al FormData (file local + URL remota) ──
  const appendUserImages = (fd) => {
    const remoteUrls = [];
    userImages.forEach((img) => {
      if (img.file) {
        fd.append("user_images", img.file);
      } else if (img.remoteUrl) {
        remoteUrls.push(img.remoteUrl);
      }
    });
    if (remoteUrls.length > 0) {
      fd.append("user_image_urls", JSON.stringify(remoteUrls));
    }
  };

  // ── Inicializar con datos del producto (solo una vez) ──
  useEffect(() => {
    if (fromProducto && !initializedRef.current) {
      initializedRef.current = true;

      if (productState.id_producto) setIdProducto(productState.id_producto);
      if (productState.nombre) setProductoNombre(productState.nombre);
      if (productState.descripcion) setDescription(productState.descripcion);
      if (productState.marca) setMarca(productState.marca);
      if (productState.moneda) setMoneda(productState.moneda);
      if (productState.idioma) setIdioma(productState.idioma || "es");
      if (productState.precio_unitario || productState.combos) {
        setPricing({
          precio_unitario: productState.precio_unitario || "",
          combos: productState.combos || [],
        });
      }

      if (productState.imagen_portada) {
        setProductPortada(productState.imagen_portada);
        setLoadingPortada(true);

        const createFileAndSet = (blob) => {
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
          setLoadingPortada(false);
        };

        // Intento 1: fetch directo
        fetch(productState.imagen_portada)
          .then((r) => r.blob())
          .then(createFileAndSet)
          .catch(() => {
            // CORS bloqueó el fetch — guardar solo la URL,
            // el backend la descargará server-side
            setUserImages([
              {
                id: Date.now() + Math.random(),
                file: null,
                remoteUrl: productState.imagen_portada,
                dataUrl: productState.imagen_portada,
                name: "portada-producto.png",
                fromProduct: true,
              },
            ]);
            setLoadingPortada(false);
          });
      }

      window.history.replaceState({}, document.title);
    }
  }, [fromProducto]);

  // ── Fetch inicial ──
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

  // ── Determinar siguiente paso después de seleccionar template ──
  const getStepAfterTemplate = () => {
    if (canSkipToAngles) return "angles";
    if (canSkipImages) return "pricing";
    return "images";
  };

  // ── Handlers ──
  const handleTemplateConfirm = ({ template, etapas, mode }) => {
    setSelectedConfig({ template, etapas, mode });
    setShowTemplateModal(false);
    const nextStep = getStepAfterTemplate();
    setStep(nextStep);
    scrollToStep();
  };

  const goToStep = (s) => {
    setStep(s);
    scrollToStep();
  };

  const handleBackToHome = () => {
    setStep("home");
    if (selectedConfig) {
      setTimeout(() => setShowTemplateModal(true), 150);
    }
    scrollToStep();
  };

  const handleAnglesContinue = (angleText) => {
    setAnguloVenta(angleText);
    goToStep("generate");
  };

  // ── GENERATE ──
  const handleGenerate = async () => {
    if (!selectedConfig) {
      return Toast.fire({
        icon: "error",
        title: "Selecciona un template primero",
      });
    }
    if (userImages.length === 0) {
      if (loadingPortada) {
        return Toast.fire({
          icon: "info",
          title: "La imagen de portada aún se está cargando, espera un momento",
        });
      }
      return Toast.fire({
        icon: "error",
        title: "No hay imágenes del producto. Sube al menos una.",
      });
    }

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
        if (idProducto) fd.append("id_producto", String(idProducto));
        appendUserImages(fd);

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
      if (idProducto) fd.append("id_producto", String(idProducto));
      appendUserImages(fd);

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

  // ── Assign to product ──
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
    const imageUrls = results
      .filter((r) => r.success && r.image_url)
      .map((r) => r.image_url);
    if (imageUrls.length === 0)
      return Toast.fire({
        icon: "error",
        title: "No hay imágenes para asignar",
      });

    try {
      await chatApi.post(`gemini/productos/${productoId}/asignar-imagenes`, {
        image_urls: imageUrls,
      });

      const prod = productos.find((p) => p.id === productoId);
      setIdProducto(productoId);
      if (prod) setProductoNombre(prod.nombre);
      setShowAssignModal(false);

      Toast.fire({
        icon: "success",
        title: `${imageUrls.length} imagen${imageUrls.length !== 1 ? "es" : ""} asignada${imageUrls.length !== 1 ? "s" : ""} a ${prod?.nombre || "el producto"}`,
      });
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al asignar imágenes",
      });
    }
  };

  // ── Create new product and assign ──
  const handleCreateAndAssign = async () => {
    if (!newProductName.trim())
      return Toast.fire({ icon: "error", title: "El nombre es requerido" });

    const imageUrls = results
      .filter((r) => r.success && r.image_url)
      .map((r) => r.image_url);
    if (imageUrls.length === 0)
      return Toast.fire({ icon: "error", title: "No hay imágenes" });

    setCreatingProduct(true);
    try {
      const res = await chatApi.post("gemini/productos", {
        nombre: newProductName.trim(),
        descripcion: description || "",
        marca: marca || "",
        moneda: moneda || "USD",
        idioma: idioma || "es",
        precio_unitario: pricing.precio_unitario || null,
        combos: pricing.combos || [],
      });

      if (res.data?.isSuccess && res.data?.data?.id) {
        const newId = res.data.data.id;
        await chatApi.post(`gemini/productos/${newId}/asignar-imagenes`, {
          image_urls: imageUrls,
        });

        setIdProducto(newId);
        setProductoNombre(newProductName.trim());
        setShowNewProductModal(false);
        setNewProductName("");

        Toast.fire({
          icon: "success",
          title: `Producto creado con ${imageUrls.length} imagen${imageUrls.length !== 1 ? "es" : ""}`,
        });
      }
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al crear producto",
      });
    } finally {
      setCreatingProduct(false);
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

  const goBackToProduct = () => {
    if (idProducto) navigate(`/insta_landing_productos/${idProducto}`);
  };

  /* ─────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* PRODUCT CONTEXT BANNER */}
      {idProducto && (
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-2xl mb-3"
          style={{
            background:
              "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(59,130,246,0.06))",
            border: "1px solid rgba(99,102,241,0.15)",
          }}
        >
          {productPortada ? (
            <img
              src={productPortada}
              alt=""
              className="w-8 h-8 rounded-lg object-cover shrink-0"
              style={{ border: "1.5px solid rgba(99,102,241,0.2)" }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
              style={{ background: "rgba(99,102,241,0.1)" }}
            >
              <i
                className="bx bx-package text-sm"
                style={{ color: "#6366f1" }}
              />
            </div>
          )}
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
            <i className="bx bx-arrow-back text-xs" /> Volver al producto
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

      {/* HERO */}
      <HeroSection
        usage={usage}
        step={step}
        onShowHistory={() => setShowHistory(true)}
      />

      {/* BODY */}
      <div className="pt-5" ref={stepRef}>
        {step === "home" && (
          <StepHome
            bgTemplates={bgTemplates}
            selectedConfig={selectedConfig}
            onShowTemplateModal={() => setShowTemplateModal(true)}
            onContinue={() => goToStep(getStepAfterTemplate())}
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
            onBack={() => goToStep(canSkipImages ? "home" : "images")}
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
            onBack={() =>
              canSkipToAngles ? handleBackToHome() : goToStep("pricing")
            }
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

            {/* Assign bar — solo si no hay producto vinculado */}
            {!generating && results.some((r) => r.success) && !idProducto && (
              <div
                className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-5 py-4 rounded-2xl"
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
                    ¿Guardar estas imágenes?
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Asígnalas a un producto existente o crea uno nuevo
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleOpenAssignModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
                    style={{
                      background: "rgba(99,102,241,0.08)",
                      border: "1px solid rgba(99,102,241,0.15)",
                      color: "#6366f1",
                    }}
                  >
                    <i className="bx bx-package text-sm" /> Producto existente
                  </button>
                  <button
                    onClick={() => {
                      setNewProductName(
                        description ? description.slice(0, 80) : "",
                      );
                      setShowNewProductModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
                    style={{
                      background: "rgba(16,185,129,0.08)",
                      border: "1px solid rgba(16,185,129,0.15)",
                      color: "#10b981",
                    }}
                  >
                    <i className="bx bx-plus-circle text-sm" /> Nuevo producto
                  </button>
                </div>
              </div>
            )}

            {/* Linked product banner */}
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
                  Ver producto <i className="bx bx-right-arrow-alt text-sm" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODALS */}
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

      <ModalAsignarProducto
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        productos={productos}
        loadingProductos={loadingProductos}
        onAssign={handleAssignToProduct}
      />

      <ModalNuevoProducto
        open={showNewProductModal}
        onClose={() => setShowNewProductModal(false)}
        newProductName={newProductName}
        setNewProductName={setNewProductName}
        creatingProduct={creatingProduct}
        onCreateAndAssign={handleCreateAndAssign}
        marca={marca}
        description={description}
        moneda={moneda}
        pricing={pricing}
        successCount={results.filter((r) => r.success).length}
      />
    </div>
  );
};

export default LandingAi;
