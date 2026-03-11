import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const shortDate = (d) =>
  new Date(d).toLocaleDateString("es-EC", { day: "2-digit", month: "short" });

const forceDownload = async (url) => {
  try {
    const r = await fetch(url, { mode: "cors" });
    const blob = await r.blob();
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `landing-ia-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  } catch {
    window.open(url, "_blank");
  }
};

const ITEMS_PER_PAGE = 9;

/* ── MINI COMPONENTS ── */
const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-[11px] text-gray-400">{label}</span>
    <span className="text-[11px] font-semibold text-gray-600 truncate ml-3 max-w-[180px] text-right">
      {value}
    </span>
  </div>
);

const EmptyState = ({ onOpenGen, onGoFull }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div
      className="w-20 h-20 rounded-3xl grid place-items-center"
      style={{
        background: "rgba(99,102,241,.04)",
        border: "2px dashed rgba(99,102,241,.15)",
      }}
    >
      <i className="bx bx-image-add text-3xl" style={{ color: "#a5b4fc" }} />
    </div>
    <p className="text-sm font-bold text-gray-600">Sin imágenes aún</p>
    <p className="text-xs text-gray-400 text-center max-w-xs">
      Genera imágenes de este producto con IA
    </p>
    <div className="flex gap-2 mt-1">
      <button
        onClick={onOpenGen}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
        style={{ background: "#0f1129", color: "white" }}
      >
        <i className="bx bx-bolt-circle text-sm" /> Rápido
      </button>
      <button
        onClick={onGoFull}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold transition active:scale-95"
        style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
      >
        <i className="bx bx-expand text-sm" /> Completo
      </button>
    </div>
  </div>
);

const PreviewCard = ({ item, onClose, producto, onSetPortada }) => {
  const isP = producto?.imagen_portada === item.image_url;
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 20px rgba(0,0,0,.06)",
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{ background: "#f1f5f9" }}
      >
        <img
          src={item.image_url}
          alt=""
          className="w-full h-auto object-contain max-h-[60vh]"
        />
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg grid place-items-center transition hover:scale-105"
          style={{
            background: "rgba(255,255,255,.9)",
            border: "1px solid #e2e8f0",
            color: "#64748b",
          }}
        >
          <i className="bx bx-x text-base" />
        </button>
        {isP && (
          <div
            className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1"
            style={{ background: "#10b981", color: "white" }}
          >
            <i className="bx bx-star text-[10px]" /> Portada
          </div>
        )}
      </div>
      <div className="p-4 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {item.etapa && (
            <span
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
              style={{
                background: "rgba(99,102,241,.08)",
                color: "#6366f1",
                border: "1px solid rgba(99,102,241,.12)",
              }}
            >
              {item.etapa.nombre}
            </span>
          )}
          <span className="text-[10px] ml-auto" style={{ color: "#94a3b8" }}>
            {fmtDate(item.created_at)}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => forceDownload(item.image_url)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition active:scale-[.97]"
            style={{ background: "#0f1129" }}
          >
            <i className="bx bx-download text-sm" /> Descargar
          </button>
          {!isP && onSetPortada && (
            <button
              onClick={() => onSetPortada(item.image_url)}
              className="px-3 py-2.5 rounded-xl text-xs font-bold transition active:scale-[.97] flex items-center gap-1.5"
              style={{ border: "1px solid #e2e8f0", color: "#10b981" }}
            >
              <i className="bx bx-star text-sm" />
              <span className="hidden xl:inline">Portada</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── 3D REVEAL ── */
const MiniReveal3D = ({ item, phase }) => {
  if (!item?.image_url) return null;
  return (
    <div
      className={`fixed inset-0 z-[9998] flex items-center justify-center mR-bg mR-bg-${phase}`}
    >
      <div className={`absolute mR-burst mR-burst-${phase}`}></div>
      <div className={`absolute top-[12%] mR-label mR-label-${phase}`}>
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
          <span className="w-7 h-7 rounded-lg bg-white text-indigo-700 text-xs font-black grid place-items-center shadow-lg">
            {(item.index || 0) + 1}
          </span>
          <span className="text-white text-sm font-bold">{item.etapa}</span>
        </div>
      </div>
      <div style={{ perspective: 1200 }}>
        <div
          className={`mR-card mR-card-${phase}`}
          style={{ position: "relative", transformStyle: "preserve-3d" }}
        >
          <div
            className={`absolute -inset-4 rounded-3xl mR-glow mR-glow-${phase}`}
          ></div>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
            <img
              src={item.image_url}
              alt=""
              className="max-h-[55vh] max-w-[85vw] md:max-w-[50vw] w-auto object-contain bg-gray-900"
            />
            <div
              className={`absolute inset-0 pointer-events-none mR-shine mR-shine-${phase}`}
            ></div>
          </div>
        </div>
      </div>
      <style>{`
        .mR-bg{pointer-events:none;transition:all .5s ease}.mR-bg-enter{background:rgba(0,0,0,0)}.mR-bg-showcase{background:rgba(5,5,20,.85);backdrop-filter:blur(8px)}.mR-bg-exit{background:rgba(5,5,20,0)}
        .mR-burst{width:500px;height:500px;border-radius:50%;transition:all .8s ease}.mR-burst-enter{transform:scale(0);opacity:0}.mR-burst-showcase{transform:scale(1);opacity:1;background:radial-gradient(circle,rgba(99,102,241,.3)0%,transparent 70%);animation:mrBP 2s ease-in-out infinite}.mR-burst-exit{transform:scale(.5);opacity:0}@keyframes mrBP{0%,100%{transform:scale(1)}50%{transform:scale(1.15);opacity:.7}}
        .mR-label{transition:all .6s cubic-bezier(.34,1.56,.64,1)}.mR-label-enter{opacity:0;transform:translateY(30px) scale(.8)}.mR-label-showcase{opacity:1;transform:translateY(0) scale(1)}.mR-label-exit{opacity:0;transform:translateY(-20px) scale(.9)}
        .mR-card{transition:all .6s ease}.mR-card-enter{transform:scale(.1) rotateY(180deg) rotateX(20deg);opacity:0}.mR-card-showcase{animation:mrC 2.4s cubic-bezier(.22,1,.36,1) forwards}.mR-card-exit{animation:mrCE .5s cubic-bezier(.55,0,1,.45) forwards}
        @keyframes mrC{0%{transform:scale(.1) rotateY(180deg) rotateX(30deg);opacity:0}35%{transform:scale(1.1) rotateY(45deg) rotateX(-5deg)}100%{transform:scale(1) rotateY(0)}}
        @keyframes mrCE{0%{transform:scale(1);opacity:1}100%{transform:scale(.3) rotateY(-30deg) translateY(40px);opacity:0}}
        .mR-glow{transition:all .6s}.mR-glow-enter{opacity:0}.mR-glow-showcase{opacity:1;box-shadow:0 0 60px rgba(99,102,241,.4),0 0 120px rgba(99,102,241,.2)}.mR-glow-exit{opacity:0}
        .mR-shine-enter{opacity:0}.mR-shine-exit{opacity:0}
      `}</style>
    </div>
  );
};

/* ── MAIN COMPONENT ── */
const ProductoDetallePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [producto, setProducto] = useState(null);
  const [generaciones, setGeneraciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [preview, setPreview] = useState(null);

  // Generator wizard
  const [genOpen, setGenOpen] = useState(false);
  const [genStep, setGenStep] = useState(1); // 1 | 2 | 3
  const [templates, setTemplates] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedEtapas, setSelectedEtapas] = useState([]);
  const [userImages, setUserImages] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({
    current: 0,
    total: 0,
    etapa: "",
  });
  const [templateSearch, setTemplateSearch] = useState("");
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  // 3D reveal
  const [revealItem, setRevealItem] = useState(null);
  const [revealPhase, setRevealPhase] = useState("enter");
  const revealQueueRef = useRef([]);

  const [usage, setUsage] = useState({ used: 0, limit: 0, remaining: 0 });
  const fileInputRef = useRef(null);
  const portadaLoadedRef = useRef(false);

  /* ── Fetch ── */
  const fetchProducto = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await chatApi.get(
          `gemini/productos/${id}?page=${page}&limit=${ITEMS_PER_PAGE}`,
        );
        if (res.data?.isSuccess) {
          setProducto(res.data.producto);
          setGeneraciones(res.data.generaciones || []);
          setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
        }
      } catch {
        Toast.fire({ icon: "error", title: "Error al cargar" });
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    fetchProducto(1);
    chatApi
      .get("gemini/templates")
      .then((r) => r.data?.data && setTemplates(r.data.data))
      .catch(() => {});
    chatApi
      .get("gemini/etapas")
      .then((r) => r.data?.data && setEtapas(r.data.data))
      .catch(() => {});
    chatApi
      .get("gemini/usage")
      .then((r) => r.data?.usage && setUsage(r.data.usage))
      .catch(() => {});
  }, [fetchProducto]);

  useEffect(() => {
    if (
      producto?.imagen_portada &&
      genOpen &&
      !portadaLoadedRef.current &&
      userImages.length === 0
    ) {
      portadaLoadedRef.current = true;
      fetch(producto.imagen_portada, { mode: "cors" })
        .then((r) => r.blob())
        .then((blob) => {
          const file = new File([blob], "portada.png", {
            type: blob.type || "image/png",
          });
          setUserImages([
            { file, preview: producto.imagen_portada, fromProduct: true },
          ]);
        })
        .catch(() => {});
    }
    if (!genOpen) portadaLoadedRef.current = false;
  }, [producto, genOpen]);

  /* ── 3D Reveal ── */
  const processRevealQueue = useCallback(() => {
    if (revealQueueRef.current.length === 0) return;
    const next = revealQueueRef.current.shift();
    setRevealItem(next);
    setRevealPhase("enter");
    setTimeout(() => setRevealPhase("showcase"), 100);
    setTimeout(() => setRevealPhase("exit"), 2600);
    setTimeout(() => {
      setRevealItem(null);
      setRevealPhase("enter");
      setTimeout(() => processRevealQueue(), 300);
    }, 3200);
  }, []);

  /* ── Image handlers ── */
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const imgs = files
      .slice(0, 6 - userImages.length)
      .map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setUserImages((prev) => [...prev, ...imgs].slice(0, 6));
  };

  const removeImage = (i) => {
    setUserImages((prev) => {
      const c = [...prev];
      if (!c[i].fromProduct) URL.revokeObjectURL(c[i].preview);
      c.splice(i, 1);
      return c;
    });
  };

  const toggleEtapa = (et) =>
    setSelectedEtapas((prev) =>
      prev.find((e) => e.id === et.id)
        ? prev.filter((e) => e.id !== et.id)
        : [...prev, et],
    );

  const selectAllEtapas = () =>
    setSelectedEtapas(
      selectedEtapas.length === etapas.length ? [] : [...etapas],
    );

  const closeGenerator = () => {
    setGenOpen(false);
    setGenStep(1);
    setSelectedTemplate(null);
    setSelectedEtapas([]);
    setUserImages([]);
  };

  /* ── Generate ── */
  const handleQuickGenerate = async () => {
    if (!selectedTemplate || !userImages.length || !selectedEtapas.length)
      return Toast.fire({ icon: "error", title: "Completa los 3 pasos" });
    if (usage.limit > 0 && usage.remaining < selectedEtapas.length)
      return Toast.fire({
        icon: "error",
        title: `Solo quedan ${usage.remaining} imágenes`,
      });

    setGenerating(true);
    setGenProgress({ current: 0, total: selectedEtapas.length, etapa: "" });
    const pricing = {};
    if (producto.precio_unitario)
      pricing.precio_unitario = producto.precio_unitario;
    if (producto.combos?.length) pricing.combos = producto.combos;

    for (let i = 0; i < selectedEtapas.length; i++) {
      const etapa = selectedEtapas[i];
      setGenProgress({
        current: i + 1,
        total: selectedEtapas.length,
        etapa: etapa.nombre,
      });
      try {
        const fd = new FormData();
        fd.append("template_url", selectedTemplate.src_url);
        fd.append("template_id", String(selectedTemplate.id));
        fd.append("etapa_id", String(etapa.id));
        fd.append("description", producto.descripcion || "");
        fd.append("aspect_ratio", "9:16");
        fd.append("marca", producto.marca || "");
        fd.append("moneda", producto.moneda || "USD");
        fd.append("id_producto", String(id));
        fd.append("pricing", JSON.stringify(pricing));
        userImages.forEach((img) => {
          if (img.file) fd.append("user_images", img.file);
        });
        const res = await chatApi.post("gemini/generar-etapa", fd, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 150000,
          silentError: true,
        });
        if (res.data?.usage)
          setUsage((prev) => ({
            ...prev,
            used: res.data.usage.used,
            remaining: res.data.usage.remaining,
          }));
        if (res.data?.image_url) {
          const item = {
            etapa: etapa.nombre,
            image_url: res.data.image_url,
            index: i,
          };
          revealQueueRef.current.push(item);
          if (revealQueueRef.current.length === 1) processRevealQueue();
        }
      } catch (err) {
        if (err?.response?.status === 429 || err?.response?.status === 402) {
          Toast.fire({ icon: "error", title: "Límite alcanzado" });
          break;
        }
      }
    }
    setGenerating(false);
    closeGenerator();
    fetchProducto(1);
    Toast.fire({ icon: "success", title: "¡Generación completada!" });
  };

  const goToFullGenerator = () => {
    navigate("/insta_landing", {
      state: {
        fromProducto: true,
        id_producto: Number(id),
        nombre: producto?.nombre || "",
        descripcion: producto?.descripcion || "",
        marca: producto?.marca || "",
        moneda: producto?.moneda || "USD",
        precio_unitario: producto?.precio_unitario || "",
        combos: producto?.combos || [],
        imagen_portada: producto?.imagen_portada || null,
      },
    });
  };

  const handleSetPortada = async (url) => {
    try {
      await chatApi.patch(`gemini/productos/${id}/portada`, { image_url: url });
      setProducto((p) => ({ ...p, imagen_portada: url }));
      Toast.fire({ icon: "success", title: "Portada actualizada" });
    } catch {
      Toast.fire({ icon: "error", title: "Error" });
    }
  };

  /* ── Derived ── */
  const filteredTemplates = templates.filter(
    (t) =>
      !templateSearch ||
      t.nombre?.toLowerCase().includes(templateSearch.toLowerCase()),
  );
  const displayTemplates = showAllTemplates
    ? filteredTemplates
    : filteredTemplates.slice(0, 20);

  const getPaginationRange = () => {
    const { page, pages } = pagination;
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, "...", pages];
    if (page >= pages - 2) return [1, "...", pages - 2, pages - 1, pages];
    return [1, "...", page - 1, page, page + 1, "...", pages];
  };

  /* ── Loading/404 ── */
  if (loading && !producto)
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4"
            style={{ background: "rgba(99,102,241,0.08)" }}
          >
            <svg
              className="animate-spin w-6 h-6"
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
          <p className="text-sm text-gray-400">Cargando…</p>
        </div>
      </div>
    );

  if (!producto)
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Producto no encontrado</p>
      </div>
    );

  /* ── RENDER ── */
  return (
    <div className="min-h-screen bg-gray-50/50">
      {revealItem && <MiniReveal3D item={revealItem} phase={revealPhase} />}

      {/* HEADER */}
      <div className="bg-[#0f1129] relative overflow-hidden rounded-3xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/15 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4"></div>
        <div className="relative px-5 sm:px-8 py-5 sm:py-6">
          <button
            onClick={() => navigate("/insta_landing_productos")}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold mb-3 transition hover:opacity-80"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <i className="bx bx-arrow-back text-sm" /> Productos
          </button>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-1">
                {producto.imagen_portada && (
                  <div
                    className="w-10 h-10 rounded-xl overflow-hidden shrink-0 hidden sm:block"
                    style={{ border: "2px solid rgba(255,255,255,0.1)" }}
                  >
                    <img
                      src={producto.imagen_portada}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none truncate">
                  {producto.nombre}
                </h1>
              </div>
              <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                {producto.marca && (
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={{
                      background: "rgba(99,102,241,0.1)",
                      color: "#a5b4fc",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                  >
                    {producto.marca}
                  </span>
                )}
                {producto.precio_unitario && (
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={{
                      background: "rgba(16,185,129,0.1)",
                      color: "#6ee7b7",
                      border: "1px solid rgba(16,185,129,0.2)",
                    }}
                  >
                    {producto.moneda === "USD" ? "$" : producto.moneda}{" "}
                    {producto.precio_unitario}
                  </span>
                )}
                <span
                  className="text-[10px]"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {pagination.total} imagen{pagination.total !== 1 ? "es" : ""}
                </span>
                {usage.limit > 0 && (
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold ml-auto hidden sm:inline-flex items-center gap-1"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      color: "rgba(255,255,255,0.35)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <i className="bx bx-zap text-xs" /> {usage.remaining}/
                    {usage.limit}
                  </span>
                )}
              </div>
              {producto.descripcion && (
                <p
                  className="mt-2 text-sm line-clamp-2"
                  style={{ color: "rgba(255,255,255,0.35)", maxWidth: 600 }}
                >
                  {producto.descripcion}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setGenOpen(!genOpen);
                  if (genOpen) setGenStep(1);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
                style={{
                  background: genOpen
                    ? "rgba(239,68,68,0.15)"
                    : "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(59,130,246,0.2))",
                  border: `1px solid ${genOpen ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)"}`,
                  color: genOpen ? "#fca5a5" : "#a5b4fc",
                }}
              >
                <i
                  className={`bx ${genOpen ? "bx-x" : "bx-bolt-circle"} text-base`}
                />
                <span className="hidden sm:inline">
                  {genOpen ? "Cerrar" : "Generador rápido"}
                </span>
              </button>
              <button
                onClick={goToFullGenerator}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <i className="bx bx-expand text-sm" />
                <span className="hidden sm:inline">Completo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GENERATOR PANEL */}
      {genOpen && (
        <div
          className="mt-3 rounded-2xl overflow-hidden"
          style={{
            background: "white",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}
        >
          {/* STATE: GENERATING */}
          {generating && (
            <div
              style={{
                minHeight: 400,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 28,
                padding: "48px 24px",
              }}
            >
              <div style={{ position: "relative", width: 110, height: 110 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      inset: i * -20,
                      borderRadius: "50%",
                      border: `1.5px solid rgba(99,102,241,${0.22 - i * 0.06})`,
                      animation: `gRing ${3.5 + i * 0.8}s ease-in-out infinite`,
                      animationDelay: `${i * 0.5}s`,
                    }}
                  ></div>
                ))}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg,#6366f1 0%,#38bdf8 55%,#67e8f9 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 48px rgba(56,189,248,.45)",
                    animation: "gPulse 2.2s ease-in-out infinite",
                  }}
                >
                  <i
                    className="bx bx-magic-wand"
                    style={{ fontSize: 38, color: "white" }}
                  />
                </div>
              </div>
              <div style={{ textAlign: "center", maxWidth: 360 }}>
                <p
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: "#111827",
                    margin: "0 0 8px",
                  }}
                >
                  La IA está creando tu landing
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "#6b7280",
                    margin: "0 0 20px",
                    lineHeight: 1.65,
                  }}
                >
                  Generando sección{" "}
                  <span style={{ color: "#6366f1", fontWeight: 800 }}>
                    {genProgress.current}/{genProgress.total}
                  </span>
                  {genProgress.etapa && (
                    <>
                      {" "}
                      —{" "}
                      <span style={{ color: "#6366f1", fontWeight: 700 }}>
                        {genProgress.etapa}
                      </span>
                    </>
                  )}
                </p>
                <div
                  style={{ display: "flex", justifyContent: "center", gap: 10 }}
                >
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: i % 2 === 0 ? "#6366f1" : "#38bdf8",
                        animation: "gDot 1.4s ease-in-out infinite",
                        animationDelay: `${i * 0.18}s`,
                      }}
                    ></div>
                  ))}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  justifyContent: "center",
                  maxWidth: 440,
                }}
              >
                {selectedEtapas.map((et, i) => {
                  const done = i < genProgress.current;
                  const active = i === genProgress.current - 1;
                  return (
                    <div
                      key={et.id}
                      style={{
                        padding: "5px 14px",
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 700,
                        background: done
                          ? "rgba(56,189,248,.1)"
                          : active
                            ? "rgba(99,102,241,.1)"
                            : "rgba(0,0,0,.04)",
                        color: done
                          ? "#0284c7"
                          : active
                            ? "#6366f1"
                            : "#9ca3af",
                        border: `1.5px solid ${done ? "rgba(56,189,248,.35)" : active ? "rgba(99,102,241,.35)" : "rgba(0,0,0,.07)"}`,
                        animation: active
                          ? "gPill 1.6s ease-in-out infinite"
                          : "none",
                      }}
                    >
                      {done ? "✓ " : active ? "⟳ " : ""}
                      {et.nombre}
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  width: "100%",
                  maxWidth: 360,
                  height: 5,
                  borderRadius: 99,
                  background: "#e2e8f0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 99,
                    transition: "width 0.7s ease-out",
                    width: `${genProgress.total > 0 ? (genProgress.current / genProgress.total) * 100 : 0}%`,
                    background:
                      "linear-gradient(90deg,#6366f1,#3b82f6,#06b6d4)",
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* WIZARD */}
          {!generating && (
            <div className="p-5 sm:p-6">
              {/* STEPPER */}
              <div
                className="flex items-center gap-2 mb-6 pb-4"
                style={{ borderBottom: "1px solid #f1f5f9" }}
              >
                {[
                  { n: 1, label: "Template", icon: "bx-palette" },
                  { n: 2, label: "Fotos", icon: "bx-image-add" },
                  { n: 3, label: "Secciones", icon: "bx-layer" },
                ].map((s, idx) => {
                  const isActive = genStep === s.n;
                  const isDone = genStep > s.n;
                  return (
                    <React.Fragment key={s.n}>
                      <button
                        onClick={() => isDone && setGenStep(s.n)}
                        className="flex items-center gap-2 transition-all"
                        style={{ cursor: isDone ? "pointer" : "default" }}
                      >
                        <div
                          className="w-8 h-8 rounded-xl grid place-items-center text-xs font-black transition-all duration-300"
                          style={{
                            background: isDone
                              ? "rgba(16,185,129,.1)"
                              : isActive
                                ? "#6366f1"
                                : "#f1f5f9",
                            border: isDone
                              ? "1.5px solid rgba(16,185,129,.25)"
                              : isActive
                                ? "none"
                                : "1.5px solid #e2e8f0",
                            color: isDone
                              ? "#10b981"
                              : isActive
                                ? "white"
                                : "#94a3b8",
                            boxShadow: isActive
                              ? "0 4px 12px rgba(99,102,241,.35)"
                              : "none",
                            transform: isActive ? "scale(1.1)" : "scale(1)",
                          }}
                        >
                          {isDone ? (
                            <i className="bx bx-check text-sm" />
                          ) : (
                            <i className={`bx ${s.icon} text-sm`} />
                          )}
                        </div>
                        <span
                          className="text-[11px] font-bold hidden sm:block transition-colors"
                          style={{
                            color: isDone
                              ? "#10b981"
                              : isActive
                                ? "#6366f1"
                                : "#94a3b8",
                          }}
                        >
                          {s.label}
                        </span>
                      </button>
                      {idx < 2 && (
                        <div
                          className="flex-1 h-px transition-all duration-500"
                          style={{
                            background:
                              genStep > s.n
                                ? "rgba(16,185,129,.3)"
                                : genStep === s.n
                                  ? "rgba(99,102,241,.2)"
                                  : "#e2e8f0",
                          }}
                        ></div>
                      )}
                    </React.Fragment>
                  );
                })}
                <div
                  className="ml-2 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0"
                  style={{
                    background: "rgba(16,185,129,.06)",
                    border: "1px solid rgba(16,185,129,.12)",
                  }}
                >
                  <i
                    className="bx bx-check-circle text-xs"
                    style={{ color: "#10b981" }}
                  />
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: "#10b981" }}
                  >
                    Datos auto-incluidos
                  </span>
                </div>
              </div>

              {/* PASO 1: TEMPLATE */}
              {genStep === 1 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-black text-gray-800">
                        Elige un template
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        El estilo visual de tu landing page
                      </p>
                    </div>
                    {templates.length > 20 && (
                      <div className="relative">
                        <i className="bx bx-search absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-300" />
                        <input
                          type="text"
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          placeholder="Buscar..."
                          className="pl-7 pr-3 py-1.5 rounded-lg text-[11px] w-36 outline-none"
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2.5 mb-3">
                    {displayTemplates.map((t) => {
                      const sel = selectedTemplate?.id === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTemplate(t)}
                          className="group relative rounded-xl overflow-hidden transition-all duration-200"
                          style={{
                            aspectRatio: "9/16",
                            border: sel
                              ? "2.5px solid #6366f1"
                              : "2px solid #e2e8f0",
                            boxShadow: sel
                              ? "0 0 0 3px rgba(99,102,241,.15)"
                              : "0 1px 3px rgba(0,0,0,.06)",
                            transform: sel ? "scale(1.05)" : "scale(1)",
                          }}
                        >
                          <img
                            src={t.src_url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                          />
                          {sel && (
                            <div
                              className="absolute inset-0 grid place-items-center"
                              style={{ background: "rgba(99,102,241,.15)" }}
                            >
                              <div
                                className="w-8 h-8 rounded-full grid place-items-center"
                                style={{
                                  background: "#6366f1",
                                  boxShadow: "0 2px 12px rgba(99,102,241,.5)",
                                }}
                              >
                                <i className="bx bx-check text-white text-base" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {filteredTemplates.length > 20 && (
                    <button
                      onClick={() => setShowAllTemplates(!showAllTemplates)}
                      className="mb-4 text-[11px] font-semibold"
                      style={{ color: "#6366f1" }}
                    >
                      {showAllTemplates
                        ? "← Menos"
                        : `Ver todos (${filteredTemplates.length}) →`}
                    </button>
                  )}
                  <div
                    className="flex items-center justify-between pt-4"
                    style={{ borderTop: "1px solid #f1f5f9" }}
                  >
                    <span className="text-[11px] text-gray-400">
                      {selectedTemplate ? (
                        <span style={{ color: "#10b981", fontWeight: 700 }}>
                          ✓ {selectedTemplate.nombre || "Template seleccionado"}
                        </span>
                      ) : (
                        "Selecciona un template para continuar"
                      )}
                    </span>
                    <button
                      onClick={() => setGenStep(2)}
                      disabled={!selectedTemplate}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background: selectedTemplate
                          ? "linear-gradient(135deg,#6366f1,#3b82f6)"
                          : "#e2e8f0",
                        color: selectedTemplate ? "white" : "#94a3b8",
                        boxShadow: selectedTemplate
                          ? "0 4px 16px rgba(99,102,241,.25)"
                          : "none",
                      }}
                    >
                      Siguiente{" "}
                      <i className="bx bx-right-arrow-alt text-base" />
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 2: FOTOS */}
              {genStep === 2 && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-black text-gray-800">
                      Sube las fotos del producto
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Hasta 6 fotos · La portada se incluye automáticamente
                    </p>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
                    {userImages.map((img, i) => (
                      <div
                        key={i}
                        className="relative group rounded-2xl overflow-hidden"
                        style={{
                          aspectRatio: "1/1",
                          border: "2px solid #e2e8f0",
                        }}
                      >
                        <img
                          src={img.preview}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {img.fromProduct && (
                          <div
                            className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[9px] font-bold text-center"
                            style={{
                              background: "rgba(99,102,241,.85)",
                              color: "white",
                            }}
                          >
                            Portada
                          </div>
                        )}
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg grid place-items-center opacity-0 group-hover:opacity-100 transition"
                          style={{ background: "rgba(239,68,68,.9)" }}
                        >
                          <i className="bx bx-x text-white text-sm" />
                        </button>
                      </div>
                    ))}
                    {userImages.length < 6 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-2xl grid place-items-center transition hover:border-indigo-400"
                        style={{
                          aspectRatio: "1/1",
                          border: "2px dashed #d1d5db",
                          background: "#fafafa",
                        }}
                      >
                        <div className="text-center">
                          <i className="bx bx-image-add text-2xl text-gray-300" />
                          <p className="text-[9px] mt-1 text-gray-300 font-semibold">
                            Subir
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {userImages.length === 0 && (
                    <div
                      className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl"
                      style={{
                        background: "rgba(251,191,36,.05)",
                        border: "1px solid rgba(251,191,36,.15)",
                      }}
                    >
                      <i
                        className="bx bx-info-circle text-sm shrink-0"
                        style={{ color: "#f59e0b" }}
                      />
                      <p className="text-[11px] text-gray-500">
                        No se encontró portada. Sube al menos una foto.
                      </p>
                    </div>
                  )}
                  <div
                    className="flex items-center justify-between pt-4"
                    style={{ borderTop: "1px solid #f1f5f9" }}
                  >
                    <button
                      onClick={() => setGenStep(1)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition hover:bg-gray-50"
                      style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
                    >
                      <i className="bx bx-left-arrow-alt text-base" /> Anterior
                    </button>
                    <span className="text-[11px] text-gray-400">
                      {userImages.length > 0 ? (
                        <span style={{ color: "#10b981", fontWeight: 700 }}>
                          {userImages.length} foto
                          {userImages.length !== 1 ? "s" : ""} listas
                        </span>
                      ) : (
                        "Sube al menos una foto"
                      )}
                    </span>
                    <button
                      onClick={() => setGenStep(3)}
                      disabled={userImages.length === 0}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background:
                          userImages.length > 0
                            ? "linear-gradient(135deg,#6366f1,#3b82f6)"
                            : "#e2e8f0",
                        color: userImages.length > 0 ? "white" : "#94a3b8",
                        boxShadow:
                          userImages.length > 0
                            ? "0 4px 16px rgba(99,102,241,.25)"
                            : "none",
                      }}
                    >
                      Siguiente{" "}
                      <i className="bx bx-right-arrow-alt text-base" />
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 3: SECCIONES */}
              {genStep === 3 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-black text-gray-800">
                        Elige las secciones
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Cada sección genera una imagen distinta
                      </p>
                    </div>
                    <button
                      onClick={selectAllEtapas}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition"
                      style={{
                        color: "#6366f1",
                        background: "rgba(99,102,241,.06)",
                        border: "1px solid rgba(99,102,241,.12)",
                      }}
                    >
                      {selectedEtapas.length === etapas.length
                        ? "Deseleccionar todas"
                        : "Seleccionar todas"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
                    {etapas.map((e) => {
                      const sel = !!selectedEtapas.find((s) => s.id === e.id);
                      return (
                        <button
                          key={e.id}
                          onClick={() => toggleEtapa(e)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200"
                          style={{
                            background: sel ? "rgba(99,102,241,.06)" : "white",
                            border: `1.5px solid ${sel ? "rgba(99,102,241,.3)" : "#e2e8f0"}`,
                            boxShadow: sel
                              ? "0 2px 8px rgba(99,102,241,.1)"
                              : "0 1px 3px rgba(0,0,0,.04)",
                          }}
                        >
                          <div
                            className="w-5 h-5 rounded-md grid place-items-center shrink-0 transition-all"
                            style={{
                              background: sel ? "#6366f1" : "#f1f5f9",
                              border: sel ? "none" : "1.5px solid #e2e8f0",
                            }}
                          >
                            {sel && (
                              <i className="bx bx-check text-white text-xs" />
                            )}
                          </div>
                          <span
                            className="text-xs font-semibold transition-colors"
                            style={{ color: sel ? "#4f46e5" : "#475569" }}
                          >
                            {e.nombre}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedEtapas.length > 0 && (
                    <div
                      className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{
                        background: "rgba(99,102,241,.04)",
                        border: "1px solid rgba(99,102,241,.12)",
                      }}
                    >
                      <i
                        className="bx bx-bolt-circle text-base shrink-0"
                        style={{ color: "#6366f1" }}
                      />
                      <p className="text-[11px] text-gray-600 flex-1">
                        Se generarán{" "}
                        <span
                          className="font-black"
                          style={{ color: "#6366f1" }}
                        >
                          {selectedEtapas.length} imagen
                          {selectedEtapas.length !== 1 ? "es" : ""}
                        </span>
                        {usage.limit > 0 && (
                          <>
                            {" "}
                            · Te quedan{" "}
                            <span className="font-bold">
                              {usage.remaining}
                            </span>{" "}
                            créditos
                          </>
                        )}
                      </p>
                    </div>
                  )}
                  <div
                    className="flex items-center justify-between pt-4"
                    style={{ borderTop: "1px solid #f1f5f9" }}
                  >
                    <button
                      onClick={() => setGenStep(2)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition hover:bg-gray-50"
                      style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
                    >
                      <i className="bx bx-left-arrow-alt text-base" /> Anterior
                    </button>
                    <button
                      onClick={handleQuickGenerate}
                      disabled={selectedEtapas.length === 0}
                      className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-[.97] disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background:
                          selectedEtapas.length > 0
                            ? "linear-gradient(135deg,#6366f1,#3b82f6)"
                            : "#e2e8f0",
                        boxShadow:
                          selectedEtapas.length > 0
                            ? "0 4px 20px rgba(99,102,241,.3)"
                            : "none",
                        color: selectedEtapas.length > 0 ? "white" : "#94a3b8",
                      }}
                    >
                      <i className="bx bx-magic-wand text-base" />
                      Generar{" "}
                      {selectedEtapas.length > 0
                        ? `${selectedEtapas.length} sección${selectedEtapas.length !== 1 ? "es" : ""}`
                        : ""}
                    </button>
                  </div>
                  <div
                    className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{
                      background: "rgba(251,191,36,.04)",
                      border: "1px solid rgba(251,191,36,.12)",
                    }}
                  >
                    <i
                      className="bx bx-bulb text-base shrink-0"
                      style={{ color: "#f59e0b" }}
                    />
                    <p className="text-[11px] flex-1 text-gray-500">
                      ¿Ángulos de venta personalizados?{" "}
                      <button
                        onClick={goToFullGenerator}
                        className="font-bold underline"
                        style={{ color: "#f59e0b" }}
                      >
                        Generador completo →
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* GALLERY */}
      <div className="pt-5">
        {generaciones.length === 0 && !loading ? (
          <EmptyState
            onOpenGen={() => setGenOpen(true)}
            onGoFull={goToFullGenerator}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
            {/* IMAGE GRID */}
            <div className="lg:col-span-8">
              {preview && (
                <div className="lg:hidden mb-5">
                  <PreviewCard
                    item={preview}
                    onClose={() => setPreview(null)}
                    producto={producto}
                    onSetPortada={handleSetPortada}
                  />
                </div>
              )}
              <div className="grid grid-cols-3 gap-2.5">
                {generaciones.map((item) => {
                  const isActive = preview?.id === item.id;
                  const isPortada = producto.imagen_portada === item.image_url;
                  return (
                    <button
                      key={item.id}
                      onClick={() => item.image_url && setPreview(item)}
                      className="group relative rounded-2xl overflow-hidden aspect-square transition-all duration-300"
                      style={{
                        border: isActive
                          ? "2.5px solid #6366f1"
                          : isPortada
                            ? "2.5px solid #10b981"
                            : "2.5px solid transparent",
                        boxShadow: isActive
                          ? "0 0 0 4px rgba(99,102,241,.12)"
                          : "0 2px 8px rgba(0,0,0,.06)",
                        borderRadius: 16,
                      }}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <i className="bx bx-image text-3xl text-gray-300" />
                        </div>
                      )}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background:
                            "linear-gradient(to top,rgba(15,17,41,.85) 0%,rgba(15,17,41,.2) 40%,transparent)",
                        }}
                      ></div>
                      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        {item.etapa && (
                          <span className="block text-white text-[11px] font-bold drop-shadow">
                            {item.etapa.nombre}
                          </span>
                        )}
                        <span
                          className="text-[10px] drop-shadow"
                          style={{ color: "#c7d2fe" }}
                        >
                          {shortDate(item.created_at)}
                        </span>
                      </div>
                      {isPortada && (
                        <div
                          className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-1"
                          style={{ background: "#10b981", color: "white" }}
                        >
                          <i className="bx bx-star text-[9px]" /> Portada
                        </div>
                      )}
                      {isActive && (
                        <div
                          className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full text-white grid place-items-center"
                          style={{ background: "#6366f1" }}
                        >
                          <i className="bx bx-check text-sm" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* PAGINATION */}
              {pagination.pages > 1 && (
                <div
                  className="flex items-center justify-between mt-6 pt-4"
                  style={{ borderTop: "1px solid #e2e8f0" }}
                >
                  <button
                    onClick={() => fetchProducto(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-25"
                    style={{
                      background: "white",
                      border: "1px solid #e2e8f0",
                      color: "#475569",
                    }}
                  >
                    <i className="bx bx-chevron-left text-sm" /> Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {getPaginationRange().map((p, i) =>
                      p === "..." ? (
                        <span
                          key={`d${i}`}
                          className="px-1.5 text-xs text-gray-400"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => fetchProducto(p)}
                          className="w-8 h-8 rounded-lg text-xs font-bold transition"
                          style={
                            pagination.page === p
                              ? { background: "#0f1129", color: "white" }
                              : {
                                  background: "white",
                                  color: "#64748b",
                                  border: "1px solid #e2e8f0",
                                }
                          }
                        >
                          {p}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    onClick={() => fetchProducto(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-25"
                    style={{
                      background: "white",
                      border: "1px solid #e2e8f0",
                      color: "#475569",
                    }}
                  >
                    Siguiente <i className="bx bx-chevron-right text-sm" />
                  </button>
                </div>
              )}
            </div>

            {/* SIDEBAR */}
            <div className="hidden lg:flex lg:col-span-4 flex-col gap-4">
              <div className="sticky top-6 flex flex-col gap-4">
                {preview ? (
                  <PreviewCard
                    item={preview}
                    onClose={() => setPreview(null)}
                    producto={producto}
                    onSetPortada={handleSetPortada}
                  />
                ) : (
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{ background: "white", border: "1px solid #e2e8f0" }}
                  >
                    <div
                      className="flex items-center justify-center py-16"
                      style={{ background: "#f8fafc" }}
                    >
                      <div className="text-center">
                        <div
                          className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-3"
                          style={{ background: "rgba(99,102,241,.06)" }}
                        >
                          <i
                            className="bx bx-pointer text-2xl"
                            style={{ color: "#a5b4fc" }}
                          />
                        </div>
                        <p className="text-sm font-bold text-gray-500">
                          Selecciona una imagen
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Clic en cualquier imagen del grid
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes gRing { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.07);opacity:1} }
        @keyframes gPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes gPill  { 0%,100%{opacity:.7} 50%{opacity:1} }
        @keyframes gDot   { 0%,80%,100%{transform:translateY(0);opacity:.45} 40%{transform:translateY(-10px);opacity:1} }
      `}</style>
    </div>
  );
};

export default ProductoDetallePage;
