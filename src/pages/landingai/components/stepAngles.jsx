import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const TONO_ICONS = {
  urgencia: "bx-time-five",
  escasez: "bx-error",
  exclusividad: "bx-crown",
  confianza: "bx-shield-quarter",
  aspiracional: "bx-star",
  ahorro: "bx-wallet",
  emocional: "bx-heart",
  racional: "bx-brain",
  social: "bx-group",
  miedo: "bx-error-alt",
  curiosidad: "bx-search-alt",
  transformación: "bx-refresh",
};

const getTonoIcon = (tono = "") => {
  const lower = tono.toLowerCase();
  for (const [key, icon] of Object.entries(TONO_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "bx-bulb";
};

const GRADIENT_CLASSES = [
  "from-indigo-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-teal-600",
];

const StepAngles = ({
  description,
  pricing,
  selectedAngle,
  setSelectedAngle,
  customAngle,
  setCustomAngle,
  onBack,
  onContinue,
}) => {
  const [angles, setAngles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useCustom, setUseCustom] = useState(false);

  const fetchAngles = useCallback(async () => {
    setLoading(true);
    setAngles([]);
    setSelectedAngle(null);
    setUseCustom(false);
    setCustomAngle("");

    try {
      const res = await chatApi.post("gemini/generar-angulos", {
        description,
        pricing,
      });
      if (res.data?.isSuccess && res.data?.data) {
        setAngles(res.data.data);
      }
    } catch (err) {
      Toast.fire({
        icon: "error",
        title:
          err?.response?.data?.message || "Error al generar ángulos de venta",
      });
    } finally {
      setLoading(false);
    }
  }, [description, pricing, setSelectedAngle, setCustomAngle]);

  useEffect(() => {
    fetchAngles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectAngle = (angle) => {
    setUseCustom(false);
    setCustomAngle("");
    setSelectedAngle(angle);
  };

  const handleUseCustom = () => {
    setUseCustom(true);
    setSelectedAngle(null);
  };

  const canContinue = useCustom
    ? customAngle.trim().length >= 10
    : !!selectedAngle;

  const getAngleText = () => {
    if (useCustom) return customAngle.trim();
    if (selectedAngle)
      return `${selectedAngle.titulo}: ${selectedAngle.descripcion}`;
    return "";
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center shrink-0 shadow-lg shadow-orange-500/20">
            <i className="bx bx-target-lock text-white text-lg" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">
              Elige tu ángulo de venta
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              La IA ha investigado 3 estrategias diferentes para tu producto
            </p>
          </div>
        </div>
        {!loading && angles.length > 0 && (
          <button
            onClick={fetchAngles}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-[11px] font-semibold hover:bg-gray-50 transition"
          >
            <i className="bx bx-refresh text-sm" /> Regenerar
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center shadow-xl shadow-orange-500/25">
              <i className="bx bx-brain text-3xl text-white animate-pulse" />
            </div>
            <div className="absolute -inset-2 rounded-3xl border-2 border-orange-300/30 animate-ping" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800">
              Investigando ángulos de venta...
            </p>
            <p className="text-xs text-gray-400 mt-1">
              La IA está analizando tu producto y mercado
            </p>
          </div>
        </div>
      )}

      {/* Angles grid */}
      {!loading && angles.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {angles.map((angle, idx) => {
              const isSelected =
                !useCustom && selectedAngle?.titulo === angle.titulo;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAngle(angle)}
                  className={`relative text-left rounded-2xl border-2 p-4 transition-all duration-200 group ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-500/10 scale-[1.02]"
                      : "border-gray-100 bg-white hover:border-indigo-200 hover:shadow-md"
                  }`}
                >
                  {/* Selected badge */}
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-indigo-600 grid place-items-center shadow-md">
                      <i className="bx bx-check text-white text-xs" />
                    </div>
                  )}

                  {/* Gradient tag */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r ${GRADIENT_CLASSES[idx]} mb-3`}
                  >
                    <i
                      className={`bx ${getTonoIcon(angle.tono)} text-white text-xs`}
                    />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                      {angle.tono}
                    </span>
                  </div>

                  <h3
                    className={`text-sm font-bold mb-1.5 transition ${
                      isSelected ? "text-indigo-800" : "text-gray-900"
                    }`}
                  >
                    {angle.titulo}
                  </h3>
                  <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
                    {angle.descripcion}
                  </p>

                  {angle.ejemplo_headline && (
                    <div
                      className={`px-3 py-2 rounded-lg border text-[11px] italic ${
                        isSelected
                          ? "bg-indigo-100/50 border-indigo-200 text-indigo-700"
                          : "bg-gray-50 border-gray-100 text-gray-500"
                      }`}
                    >
                      <span className="not-italic font-semibold mr-1">Ej:</span>
                      "{angle.ejemplo_headline}"
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="relative flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              o escribe el tuyo
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Custom angle */}
          <div
            className={`rounded-2xl border-2 p-4 transition-all ${
              useCustom
                ? "border-amber-400 bg-amber-50/40"
                : "border-gray-100 bg-gray-50/50"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={handleUseCustom}
                className={`w-5 h-5 rounded-md border-2 grid place-items-center transition ${
                  useCustom
                    ? "bg-amber-500 border-amber-500"
                    : "border-gray-300 hover:border-amber-400"
                }`}
              >
                {useCustom && <i className="bx bx-check text-white text-xs" />}
              </button>
              <span
                className={`text-xs font-bold ${
                  useCustom ? "text-amber-700" : "text-gray-500"
                }`}
              >
                Usar mi propio ángulo de venta
              </span>
            </div>
            {useCustom && (
              <textarea
                value={customAngle}
                onChange={(e) => setCustomAngle(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Describe tu ángulo de venta personalizado. Ej: Enfocarse en la exclusividad del producto, destacar que es edición limitada, transmitir lujo y sofisticación..."
                className="w-full border border-amber-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none text-gray-800 placeholder-gray-300 bg-white transition mt-2"
              />
            )}
          </div>
        </>
      )}

      {/* Error / empty state */}
      {!loading && angles.length === 0 && (
        <div className="flex flex-col items-center py-12 gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-50 grid place-items-center">
            <i className="bx bx-error-circle text-2xl text-rose-400" />
          </div>
          <p className="text-sm text-gray-600 font-semibold">
            No se pudieron generar los ángulos
          </p>
          <button
            onClick={fetchAngles}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
          >
            <i className="bx bx-refresh text-sm" /> Intentar de nuevo
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-5 border-t border-gray-100">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition"
        >
          <i className="bx bx-left-arrow-alt text-base" /> Atrás
        </button>
        <button
          onClick={() => onContinue(getAngleText())}
          disabled={!canContinue}
          className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition ${
            canContinue
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          Continuar <i className="bx bx-right-arrow-alt text-base" />
        </button>
      </div>
    </div>
  );
};

export default StepAngles;
