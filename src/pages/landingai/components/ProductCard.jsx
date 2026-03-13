import React, { useState } from "react";

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ActionBtn = ({ icon, title, onClick, danger, color }) => (
  <button
    onClick={onClick}
    title={title}
    className="w-7 h-7 rounded-lg grid place-items-center transition-colors active:scale-90"
    onMouseEnter={(e) => {
      e.currentTarget.style.background = danger
        ? "#fef2f2"
        : color
          ? `${color}15`
          : "#f1f5f9";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "transparent";
    }}
  >
    <i
      className={`bx ${icon} text-sm`}
      style={{ color: danger ? "#fca5a5" : color || "#94a3b8" }}
    />
  </button>
);

const ProductCard = ({
  p,
  onNavigate,
  onEdit,
  onDelete,
  onAlimentar,
  onGenerateComplete,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        boxShadow: hovered
          ? "0 8px 28px rgba(0,0,0,0.1)"
          : "0 1px 4px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Imagen */}
      <div
        className="relative h-40 overflow-hidden cursor-pointer"
        onClick={onNavigate}
        style={{ background: p.imagen_portada ? "transparent" : "#f1f5f9" }}
      >
        {p.imagen_portada ? (
          <img
            src={p.imagen_portada}
            alt={p.nombre}
            className="w-full h-full object-cover transition-transform duration-500"
            style={{ transform: hovered ? "scale(1.05)" : "scale(1)" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="bx bx-package text-4xl text-gray-200" />
          </div>
        )}

        {/* Overlay hover */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
          style={{
            background: "rgba(15,17,41,0.45)",
            opacity: hovered ? 1 : 0,
          }}
        >
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
            style={{
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <i className="bx bx-images text-sm" /> Ver imágenes
          </div>
        </div>

        {/* Badge generaciones */}
        <div
          className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
          style={{
            background: "rgba(15,17,41,0.72)",
            backdropFilter: "blur(4px)",
            color: "#a5b4fc",
          }}
        >
          <i className="bx bx-image text-xs" /> {p.total_generaciones || 0}
        </div>

        {/* Badge Dropi */}
        {p.external_source && (
          <div
            className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase"
            style={{ background: "rgba(249,115,22,0.9)", color: "white" }}
          >
            {p.external_source === "DROPI" ? "Dropi" : p.external_source}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-800 truncate leading-tight">
              {p.nombre}
            </h3>
            {p.marca && (
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                {p.marca}
              </p>
            )}
          </div>
          {p.precio_unitario && (
            <span
              className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg whitespace-nowrap"
              style={{ background: "rgba(99,102,241,0.07)", color: "#6366f1" }}
            >
              {p.moneda === "USD" ? "$" : p.moneda} {p.precio_unitario}
            </span>
          )}
        </div>

        {p.descripcion && (
          <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed mt-1 mb-2">
            {p.descripcion}
          </p>
        )}

        {/* CTA — Generar landing completa (mismo estilo que el antiguo "Alimentar negocio con IA") */}
        <button
          onClick={onGenerateComplete}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-[0.97] mt-2 mb-3"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.07), rgba(79,70,229,0.07))",
            border: "1px solid rgba(99,102,241,0.14)",
            color: "#6366f1",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              "linear-gradient(135deg, rgba(99,102,241,0.13), rgba(79,70,229,0.13))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              "linear-gradient(135deg, rgba(99,102,241,0.07), rgba(79,70,229,0.07))";
          }}
        >
          <i className="bx bx-bolt-circle text-xs" /> Generar landing completa
        </button>

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-2.5"
          style={{ borderTop: "1px solid #f1f5f9" }}
        >
          <span className="text-[10px] text-gray-300">
            {formatDate(p.created_at)}
          </span>
          <div className="flex items-center gap-0.5">
            <ActionBtn
              icon="bxs-zap"
              title="Alimentar negocio con IA"
              onClick={onAlimentar}
              color="#f59e0b"
            />
            <ActionBtn icon="bx-edit-alt" title="Editar" onClick={onEdit} />
            <ActionBtn
              icon="bx-trash"
              title="Eliminar"
              onClick={onDelete}
              danger
            />
            <button
              onClick={onNavigate}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition hover:bg-indigo-50 active:scale-95"
              style={{ color: "#6366f1" }}
            >
              Ver <i className="bx bx-right-arrow-alt text-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
