import React from "react";
import { ASPECT_RATIOS } from "./constants";
import UsageBar from "./UsageBar";

const StepGenerate = ({
  selectedConfig,
  userImages,
  description,
  aspectRatio,
  setAspectRatio,
  anguloVenta,
  pricing,
  usage,
  onBack,
  onGenerate,
}) => {
  if (!selectedConfig) return null;

  const isDisabled = usage.limit > 0 && usage.remaining <= 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* Summary bar */}
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
          {/* Ángulo seleccionado */}
          {anguloVenta && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                <i className="bx bx-target-lock text-xs" /> Ángulo de venta
              </p>
              <p className="text-xs text-gray-700 leading-relaxed">
                {anguloVenta}
              </p>
            </div>
          )}

          {/* Precios */}
          {(pricing?.precio_unitario ||
            (pricing?.combos?.length > 0 &&
              pricing.combos.some((c) => c.cantidad && c.precio))) && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <i className="bx bx-dollar-circle text-xs" /> Precios
                configurados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {pricing.precio_unitario && (
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-100 text-[11px] font-bold text-gray-700">
                    Unitario: ${pricing.precio_unitario}
                  </span>
                )}
                {pricing.combos
                  .filter((c) => c.cantidad && c.precio)
                  .map((c, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-white border border-emerald-100 text-[11px] font-bold text-gray-700"
                    >
                      {c.cantidad}x ${c.precio}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Descripción */}
          {description && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                <i className="bx bx-text text-xs" /> Descripción del producto
              </p>
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                {description}
              </p>
            </div>
          )}

          {/* Secciones */}
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

          <UsageBar usage={usage} />
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition ${
                  aspectRatio === r.value
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-gray-100 bg-gray-50 hover:border-indigo-200"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg grid place-items-center transition ${
                    aspectRatio === r.value
                      ? "bg-indigo-600"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <i
                    className={`bx ${r.icon} text-sm ${
                      aspectRatio === r.value ? "text-white" : "text-gray-400"
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
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={isDisabled}
        className={`mt-4 w-full py-4 rounded-2xl text-sm font-black tracking-wide transition flex items-center justify-center gap-2.5 ${
          isDisabled
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-slate-900 to-blue-800 text-white hover:opacity-90 shadow-lg shadow-indigo-500/25"
        }`}
      >
        {isDisabled ? (
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
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition"
        >
          <i className="bx bx-left-arrow-alt text-base" /> Atrás
        </button>
      </div>
    </div>
  );
};

export default StepGenerate;
