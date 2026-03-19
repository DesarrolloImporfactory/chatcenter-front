import React, { useState, useEffect, useCallback } from "react";
import chatApi from "../../api/chatcenter";

/* ── Helpers ── */
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const shortDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short" });
};

const forceDownload = async (url) => {
  try {
    const resp = await fetch(url, { mode: "cors", cache: "no-store" });
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `landing-ia-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    window.open(url, "_blank");
  }
};

const ITEMS_PER_PAGE = 6;

/* ══════════════════════════════════════════════════════════════════
   HISTORIAL PAGE
   ══════════════════════════════════════════════════════════════════ */
const HistorialPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [preview, setPreview] = useState(null);
  const [usage, setUsage] = useState({
    used: 0,
    limit: 0,
    remaining: 0,
    plan: "",
  });

  const fetchHistory = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await chatApi.get(
        `gemini/historial?page=${page}&limit=${ITEMS_PER_PAGE}`,
      );
      if (res.data?.isSuccess) {
        setHistory(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
      }
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(1);
    chatApi
      .get("gemini/usage")
      .then((r) => {
        if (r.data?.usage) setUsage(r.data.usage);
      })
      .catch(() => {});
  }, [fetchHistory]);

  const pct =
    usage.limit > 0 ? Math.min((usage.used / usage.limit) * 100, 100) : 0;
  const isEmpty = usage.remaining <= 0;
  const isLow = usage.remaining <= 3 && usage.remaining > 0;

  /* ── Pagination range ── */
  const getPaginationRange = () => {
    const { page, pages } = pagination;
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, "...", pages];
    if (page >= pages - 2) return [1, "...", pages - 2, pages - 1, pages];
    return [1, "...", page - 1, page, page + 1, "...", pages];
  };

  /* ── Etapa stats for sidebar ── */
  const etapaStats = history.reduce((acc, item) => {
    const name = item.etapa?.nombre || "Sin etapa";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ══════════ HEADER ══════════ */}
      <div className="bg-[#0f1129] relative overflow-hidden rounded-3xl">
        {/* Subtle glow accents */}
        <div
          className="absolute rounded-full"
          style={{
            top: "-80px",
            right: "-40px",
            width: "280px",
            height: "280px",
            background: "rgba(99,102,241,0.12)",
            filter: "blur(100px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: "-60px",
            left: "-30px",
            width: "200px",
            height: "200px",
            background: "rgba(59,130,246,0.08)",
            filter: "blur(80px)",
          }}
        />

        <div className="relative px-5 sm:px-8 py-5 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3"
                style={{
                  background: "rgba(99,102,241,0.1)",
                  border: "1px solid rgba(99,102,241,0.2)",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "#818cf8" }}
                />
                <span
                  className="text-[10px] font-bold uppercase"
                  style={{ color: "#a5b4fc", letterSpacing: "0.08em" }}
                >
                  Historial de Generaciones
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                Tus imágenes
                <span
                  className="block mt-0.5"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #a5b4fc, #93c5fd, #67e8f9)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  generadas con IA
                </span>
              </h1>
              <p
                className="mt-2 text-sm"
                style={{ color: "rgba(255,255,255,0.4)", maxWidth: "480px" }}
              >
                {pagination.total} imagen{pagination.total !== 1 ? "es" : ""}{" "}
                creada
                {pagination.total !== 1 ? "s" : ""}. Selecciona cualquiera para
                previsualizar y descargar.
              </p>
            </div>

            {/* Right badges */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              {usage.limit > 0 && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{
                    background: isEmpty
                      ? "rgba(244,63,94,0.1)"
                      : "rgba(16,185,129,0.1)",
                    border: `1px solid ${isEmpty ? "rgba(244,63,94,0.2)" : "rgba(16,185,129,0.2)"}`,
                    color: isEmpty ? "#fda4af" : "#6ee7b7",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <i className="bx bx-image text-sm" />
                  {usage.used}/{usage.limit}
                </div>
              )}
              {usage.plan && (
                <span
                  className="text-[10px] font-medium"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  {usage.plan}
                </span>
              )}
            </div>
          </div>

          {/* Usage bar */}
          {usage.limit > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: isEmpty
                      ? "linear-gradient(90deg, #f43f5e, #fb7185)"
                      : isLow
                        ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                        : "linear-gradient(90deg, #818cf8, #67e8f9)",
                  }}
                />
              </div>
              <span
                className="text-[10px] font-semibold shrink-0"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {usage.remaining} restante{usage.remaining !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ══════════ BODY ══════════ */}
      <div className="p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div
              className="w-12 h-12 rounded-2xl grid place-items-center"
              style={{ background: "rgba(99,102,241,0.08)" }}
            >
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
            <p className="text-sm font-medium text-gray-400">
              Cargando historial…
            </p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div
              className="w-20 h-20 rounded-3xl grid place-items-center"
              style={{ background: "#f1f5f9", border: "2px dashed #d1d5db" }}
            >
              <i className="bx bx-image-add text-3xl text-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-500">
              Aún no has generado imágenes
            </p>
            <p className="text-xs text-gray-400">
              Crea tu primera imagen publicitaria y aparecerá aquí
            </p>
          </div>
        ) : (
          <div>
            {/* Mobile preview */}
            {preview && (
              <div className="lg:hidden mb-5">
                <PreviewCard item={preview} onClose={() => setPreview(null)} />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
              {/* ── Left: Image grid (2×3 = 6 items) ── */}
              <div className="lg:col-span-7 xl:col-span-8">
                <div className="grid grid-cols-3 gap-2.5">
                  {history.map((item) => {
                    const isActive = preview?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => item.image_url && setPreview(item)}
                        className="group relative rounded-2xl overflow-hidden aspect-square transition-all duration-300"
                        style={{
                          border: isActive
                            ? "2.5px solid #6366f1"
                            : "2.5px solid transparent",
                          boxShadow: isActive
                            ? "0 0 0 4px rgba(99,102,241,0.12), 0 8px 30px rgba(0,0,0,0.1)"
                            : "0 2px 8px rgba(0,0,0,0.06)",
                          borderRadius: "16px",
                        }}
                      >
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={`Gen ${item.id}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <i className="bx bx-image text-3xl text-gray-300" />
                          </div>
                        )}

                        {/* Hover overlay */}
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{
                            background:
                              "linear-gradient(to top, rgba(15,17,41,0.85) 0%, rgba(15,17,41,0.2) 40%, transparent 100%)",
                          }}
                        />

                        {/* Bottom info on hover */}
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

                        {/* Active check */}
                        {isActive && (
                          <div
                            className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full text-white grid place-items-center"
                            style={{
                              background: "#6366f1",
                              boxShadow: "0 2px 8px rgba(99,102,241,0.4)",
                            }}
                          >
                            <i className="bx bx-check text-sm" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* ── Pagination ── */}
                {pagination.pages > 1 && (
                  <div
                    className="flex items-center justify-between mt-6 pt-4"
                    style={{ borderTop: "1px solid #e2e8f0" }}
                  >
                    <button
                      onClick={() => fetchHistory(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-25"
                      style={{
                        background: "white",
                        border: "1px solid #e2e8f0",
                        color: "#475569",
                      }}
                    >
                      <i className="bx bx-chevron-left text-sm" />
                      Anterior
                    </button>

                    <div className="flex items-center gap-1">
                      {getPaginationRange().map((p, i) =>
                        p === "..." ? (
                          <span
                            key={`dot-${i}`}
                            className="px-1.5 text-xs text-gray-400"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => fetchHistory(p)}
                            className="w-8 h-8 rounded-lg text-xs font-bold transition"
                            style={
                              pagination.page === p
                                ? {
                                    background: "#0f1129",
                                    color: "white",
                                    boxShadow: "0 2px 8px rgba(15,17,41,0.25)",
                                  }
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
                      onClick={() => fetchHistory(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-25"
                      style={{
                        background: "white",
                        border: "1px solid #e2e8f0",
                        color: "#475569",
                      }}
                    >
                      Siguiente
                      <i className="bx bx-chevron-right text-sm" />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Right sidebar ── */}
              <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col gap-4">
                <div className="sticky top-6 flex flex-col gap-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
                  {/* Preview or placeholder */}
                  {preview ? (
                    <PreviewCard
                      item={preview}
                      onClose={() => setPreview(null)}
                    />
                  ) : (
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: "white",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      {/* Visual area */}
                      <div
                        className="flex items-center justify-center py-16"
                        style={{ background: "#f8fafc" }}
                      >
                        <div className="text-center">
                          <div
                            className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-3"
                            style={{ background: "rgba(99,102,241,0.06)" }}
                          >
                            <i
                              className="bx bx-pointer text-2xl"
                              style={{ color: "#a5b4fc" }}
                            />
                          </div>
                          <p className="text-sm font-bold text-gray-500">
                            Selecciona una imagen
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1 px-4">
                            Haz clic en cualquier imagen de la izquierda
                          </p>
                        </div>
                      </div>
                      {/* Disabled button area (visual consistency) */}
                    </div>
                  )}

                  {/* Stats card */}
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: "white", border: "1px solid #e2e8f0" }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-7 h-7 rounded-lg grid place-items-center"
                        style={{ background: "rgba(99,102,241,0.06)" }}
                      >
                        <i
                          className="bx bx-bar-chart-alt-2 text-sm"
                          style={{ color: "#6366f1" }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700">
                        Resumen
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <StatMini
                        label="Total"
                        value={pagination.total}
                        icon="bx-image"
                        color="#6366f1"
                      />
                      <StatMini
                        label="Restantes"
                        value={usage.remaining}
                        icon="bx-layer"
                        color={
                          isEmpty ? "#f43f5e" : isLow ? "#f59e0b" : "#10b981"
                        }
                      />
                      <StatMini
                        label="Usadas"
                        value={usage.used}
                        icon="bx-check-circle"
                        color="#3b82f6"
                      />
                      <StatMini
                        label="Límite"
                        value={usage.limit}
                        icon="bx-shield"
                        color="#8b5cf6"
                      />
                    </div>
                  </div>

                  {/* Secciones breakdown */}
                  {Object.keys(etapaStats).length > 0 && (
                    <div
                      className="rounded-2xl p-4"
                      style={{
                        background: "white",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-7 h-7 rounded-lg grid place-items-center"
                          style={{ background: "rgba(99,102,241,0.06)" }}
                        >
                          <i
                            className="bx bx-category text-sm"
                            style={{ color: "#6366f1" }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-700">
                          Secciones en esta página
                        </span>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(etapaStats).map(([name, count]) => (
                          <div
                            key={name}
                            className="flex items-center justify-between"
                          >
                            <span className="text-[11px] text-gray-500 font-medium truncate mr-2">
                              {name}
                            </span>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0"
                              style={{
                                background: "rgba(99,102,241,0.06)",
                                color: "#6366f1",
                              }}
                            >
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── StatMini ── */
const StatMini = ({ label, value, icon, color }) => (
  <div className="rounded-xl p-2.5" style={{ background: `${color}08` }}>
    <div className="flex items-center gap-1.5 mb-1">
      <i className={`bx ${icon} text-xs`} style={{ color }} />
      <span className="text-[10px] font-medium text-gray-400">{label}</span>
    </div>
    <p className="text-lg font-black" style={{ color: "#1e293b" }}>
      {value ?? 0}
    </p>
  </div>
);

/* ── PreviewCard ── */
const PreviewCard = ({ item, onClose }) => (
  <div
    className="rounded-2xl overflow-hidden flex flex-col"
    style={{
      background: "white",
      border: "1px solid #e2e8f0",
      boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
      /* nunca más alto que el viewport menos header+margen */
      maxHeight: "calc(100vh - 8rem)",
    }}
  >
    {/* ── Imagen: flex-1 + min-h-0 = se encoge si falta espacio ── */}
    <div
      className="relative flex-1 min-h-0 overflow-hidden"
      style={{ background: "#f1f5f9" }}
    >
      <img
        src={item.image_url}
        alt="Preview"
        className="w-full h-full object-contain"
      />
      <button
        onClick={onClose}
        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg grid place-items-center transition hover:scale-105"
        style={{
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(4px)",
          border: "1px solid #e2e8f0",
          color: "#64748b",
        }}
      >
        <i className="bx bx-x text-base" />
      </button>
    </div>

    {/* ── Info + Botón: shrink-0 = SIEMPRE visible ── */}
    <div className="shrink-0 p-4 space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        {item.etapa && (
          <span
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
            style={{
              background: "rgba(99,102,241,0.08)",
              color: "#6366f1",
              border: "1px solid rgba(99,102,241,0.12)",
            }}
          >
            {item.etapa.nombre}
          </span>
        )}
        {item.aspect_ratio && (
          <span
            className="px-2 py-0.5 rounded-lg text-[10px] font-semibold"
            style={{ background: "#f1f5f9", color: "#64748b" }}
          >
            {item.aspect_ratio}
          </span>
        )}
        <span className="text-[10px] ml-auto" style={{ color: "#94a3b8" }}>
          {formatDate(item.created_at)}
        </span>
      </div>

      <button
        onClick={() => forceDownload(item.image_url)}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition active:scale-[0.97]"
        style={{
          background: "#0f1129",
          boxShadow: "0 2px 10px rgba(15,17,41,0.2)",
        }}
      >
        <i className="bx bx-download text-sm" />
        Descargar imagen
      </button>
    </div>
  </div>
);

export default HistorialPage;
