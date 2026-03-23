import React, { useState, useCallback, useEffect } from "react";
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
  marca,
  description,
  setDescription,
  pricing,
  selectedAngle,
  setSelectedAngle,
  customAngle,
  setCustomAngle,
  usage,
  setUsage,
  onBack,
  onContinue,
}) => {
  const [angles, setAngles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useCustomAngle, setUseCustomAngle] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const anglesLimit = usage?.angles_limit ?? null;
  const anglesRemaining = usage?.angles_remaining ?? 0;
  const hasAngleAccess = anglesLimit !== null;
  const canGenerateAngles = hasAngleAccess && anglesRemaining > 0;

  const marcaValid = (marca || "").trim().length >= 1;

  // ═══ Generar descripción + ángulos con IA ═══
  const fetchAll = useCallback(async () => {
    if (!canGenerateAngles || !marcaValid) return;
    setLoading(true);
    setAngles([]);
    setSelectedAngle(null);
    setUseCustomAngle(false);
    setCustomAngle("");
    try {
      const res = await chatApi.post("gemini/generar-angulos", {
        marca,
        pricing,
      });
      if (res.data?.isSuccess && res.data?.data) {
        const data = res.data.data;

        // Llenar descripción generada por IA
        if (data.descripcion) {
          setDescription(data.descripcion);
        }

        // Llenar ángulos
        if (Array.isArray(data.angulos)) {
          setAngles(data.angulos);
        } else if (Array.isArray(data)) {
          // Fallback: respuesta legacy (solo array)
          setAngles(data);
        }
      }

      if (res.data.angles_usage && setUsage) {
        setUsage((prev) => ({
          ...prev,
          angles_used: res.data.angles_usage.used,
          angles_remaining: res.data.angles_usage.remaining,
        }));
      }
      setHasGenerated(true);
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al generar con IA",
      });
    } finally {
      setLoading(false);
    }
  }, [
    marca,
    pricing,
    setDescription,
    setSelectedAngle,
    setCustomAngle,
    canGenerateAngles,
    marcaValid,
    setUsage,
  ]);

  // Auto-generar al montar (viene de StepPricing donde el botón dice "Generar con IA")
  useEffect(() => {
    if (canGenerateAngles && marcaValid && !hasGenerated) {
      fetchAll();
    } else if (!canGenerateAngles) {
      // Sin acceso o sin cuota → modo manual directo
      setUseCustomAngle(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectAngle = (angle) => {
    setUseCustomAngle(false);
    setCustomAngle("");
    setSelectedAngle(angle);
  };

  const handleUseCustomAngle = () => {
    setUseCustomAngle(true);
    setSelectedAngle(null);
  };

  const descriptionValid = description.trim().length >= 5;
  const angleValid = useCustomAngle
    ? customAngle.trim().length >= 10
    : !!selectedAngle;
  const canContinue = descriptionValid && angleValid;

  const getAngleText = () => {
    if (useCustomAngle) return customAngle.trim();
    if (selectedAngle)
      return `${selectedAngle.titulo}: ${selectedAngle.descripcion}`;
    return "";
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center shrink-0 shadow-lg shadow-orange-500/20">
          <i className="bx bx-target-lock text-white text-lg" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 text-sm">
            Descripción y ángulo de venta
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Genera ambos con IA o personalízalos manualmente
          </p>
        </div>
      </div>

      {/* ═══ BOTÓN PRINCIPAL: Generar todo con IA ═══ */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          {/* Botón regenerar (solo visible después de la primera generación) */}
          <div className="flex items-center gap-2">
            {canGenerateAngles && marcaValid && hasGenerated && !loading && (
              <button
                onClick={fetchAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-[11px] font-semibold hover:bg-gray-50 transition"
              >
                <i className="bx bx-refresh text-sm" /> Regenerar descripción y
                ángulos
              </button>
            )}

            {canGenerateAngles && !marcaValid && (
              <span className="text-[11px] text-gray-400 italic">
                <i className="bx bx-info-circle mr-1" />
                Vuelve al paso anterior para agregar el nombre del producto
              </span>
            )}
          </div>

          {/* Badge cuota */}
          {hasAngleAccess && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                anglesRemaining <= 0
                  ? "bg-rose-50 border-rose-200 text-rose-600"
                  : anglesRemaining <= 2
                    ? "bg-amber-50 border-amber-200 text-amber-600"
                    : "bg-indigo-50 border-indigo-200 text-indigo-600"
              }`}
            >
              <i
                className={`bx ${anglesRemaining <= 0 ? "bx-lock-alt" : "bx-brain"} text-xs`}
              />
              {anglesRemaining <= 0
                ? `0/${anglesLimit} generaciones`
                : `${anglesRemaining} de ${anglesLimit} restantes`}
            </div>
          )}
        </div>

        {/* Banner: sin acceso al feature */}
        {!hasAngleAccess && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 grid place-items-center shrink-0 mt-0.5">
                <i className="bx bx-lock-alt text-rose-500 text-lg" />
              </div>
              <div>
                <p className="text-sm font-bold text-rose-800 mb-1">
                  Tu plan no incluye generación con IA
                </p>
                <p className="text-xs text-rose-600 leading-relaxed">
                  Actualiza tu plan para generar descripción y ángulos
                  automáticamente. Por ahora puedes escribir ambos manualmente
                  abajo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Banner: agotó cuota */}
        {hasAngleAccess && anglesRemaining <= 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 grid place-items-center shrink-0 mt-0.5">
                <i className="bx bx-error text-amber-600 text-lg" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800 mb-1">
                  Agotaste tus {anglesLimit} generaciones del mes
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Se renuevan el próximo mes. Puedes escribir tu descripción y
                  ángulo manualmente.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
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
              Generando descripción y ángulos de venta...
            </p>
            <p className="text-xs text-gray-400 mt-1">
              La IA está analizando "{marca}" y su mercado
            </p>
          </div>
        </div>
      )}

      {/* ═══ CONTENIDO (oculto durante loading) ═══ */}
      {!loading && (
        <>
          {/* ═══ Descripción del producto ═══ */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                <i className="bx bx-edit mr-1 text-xs" />
                Descripción del producto{" "}
                <span className="text-rose-400">*</span>
              </label>
              {hasGenerated && description.trim() && (
                <span className="text-[10px] text-emerald-500 font-semibold">
                  <i className="bx bx-check-circle mr-0.5" />
                  Generada con IA — puedes editarla
                </span>
              )}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Ej: Crema hidratante premium de la marca HydraSkin. Presentación de 120ml, colores azul y blanco. Ideal para piel seca y sensible. Público femenino 25-45 años..."
              className={`w-full border rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-800 placeholder-gray-300 transition ${
                hasGenerated && description.trim()
                  ? "border-emerald-200 bg-emerald-50/30 focus:bg-white"
                  : "border-gray-200 bg-gray-50 focus:bg-white"
              }`}
            />
            <p className="text-[10px] text-gray-400 mt-1.5">
              <i className="bx bx-info-circle mr-1" />
              {hasGenerated
                ? "Edita libremente — esta descripción se usará para generar las imágenes"
                : "Escríbela manualmente o genera con IA usando el botón de arriba"}
            </p>
          </div>

          {/* ═══ Separador ═══ */}
          <div className="relative flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">
              Ángulo de venta
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* ═══ Ángulos generados ═══ */}
          {angles.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-gray-500 font-semibold">
                  <i className="bx bx-check-circle text-emerald-500 mr-1" />
                  Selecciona un ángulo generado por IA
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {angles.map((angle, idx) => {
                  const isSelected =
                    !useCustomAngle && selectedAngle?.titulo === angle.titulo;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectAngle(angle)}
                      className={`relative text-left rounded-2xl border-2 p-4 transition-all duration-200 ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-500/10 scale-[1.02]"
                          : "border-gray-100 bg-white hover:border-indigo-200 hover:shadow-md"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-indigo-600 grid place-items-center shadow-md">
                          <i className="bx bx-check text-white text-xs" />
                        </div>
                      )}
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
                        className={`text-sm font-bold mb-1.5 ${isSelected ? "text-indigo-800" : "text-gray-900"}`}
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
                          <span className="not-italic font-semibold mr-1">
                            Ej:
                          </span>
                          "{angle.ejemplo_headline}"
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="relative flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  o escribe el tuyo
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            </>
          )}

          {/* Custom angle — siempre visible */}
          <div
            className={`rounded-2xl border-2 p-4 transition-all ${
              useCustomAngle
                ? "border-amber-400 bg-amber-50/40"
                : "border-gray-100 bg-gray-50/50"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={handleUseCustomAngle}
                className={`w-5 h-5 rounded-md border-2 grid place-items-center transition ${
                  useCustomAngle
                    ? "bg-amber-500 border-amber-500"
                    : "border-gray-300 hover:border-amber-400"
                }`}
              >
                {useCustomAngle && (
                  <i className="bx bx-check text-white text-xs" />
                )}
              </button>
              <span
                className={`text-xs font-bold ${useCustomAngle ? "text-amber-700" : "text-gray-500"}`}
              >
                {angles.length === 0
                  ? "Escribe tu ángulo de venta"
                  : "Usar mi propio ángulo de venta"}
              </span>
            </div>
            {useCustomAngle && (
              <textarea
                value={customAngle}
                onChange={(e) => setCustomAngle(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Describe tu ángulo de venta. Ej: Enfocarse en la exclusividad del producto, destacar que es edición limitada, transmitir lujo y sofisticación..."
                className="w-full border border-amber-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none text-gray-800 placeholder-gray-300 bg-white transition mt-2"
              />
            )}
          </div>
        </>
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
