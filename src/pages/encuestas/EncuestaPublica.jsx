import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import chatApi from "../../api/chatcenter";

const EMOJIS = [
  {
    score: 1,
    emoji: "😡",
    label: "Muy mala",
    active: "bg-red-50 border-red-300 ring-red-200",
    text: "text-red-500",
  },
  {
    score: 2,
    emoji: "😞",
    label: "Mala",
    active: "bg-orange-50 border-orange-300 ring-orange-200",
    text: "text-orange-500",
  },
  {
    score: 3,
    emoji: "😐",
    label: "Regular",
    active: "bg-yellow-50 border-yellow-300 ring-yellow-200",
    text: "text-yellow-500",
  },
  {
    score: 4,
    emoji: "😊",
    label: "Buena",
    active: "bg-emerald-50 border-emerald-300 ring-emerald-200",
    text: "text-emerald-500",
  },
  {
    score: 5,
    emoji: "🤩",
    label: "Excelente",
    active: "bg-cyan-50 border-cyan-300 ring-cyan-200",
    text: "text-cyan-500",
  },
];

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4" />
      <p className="text-gray-400 text-sm">Cargando encuesta...</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="text-center py-20">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 mb-4">
        <i className="bx bx-error-circle text-3xl text-red-400" />
      </div>
      <h2 className="text-lg font-bold text-gray-700 mb-1">No disponible</h2>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

function AlreadyAnswered({ cliente }) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-50 mb-5">
        <i className="bx bx-check-circle text-4xl text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        ¡Gracias{cliente?.nombre ? `, ${cliente.nombre.split(" ")[0]}` : ""}!
      </h2>
      <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
        Ya registramos tu calificación. Agradecemos mucho tu tiempo y tu
        opinión.
      </p>
    </div>
  );
}

function ThankYouState({ score }) {
  const emoji = EMOJIS.find((e) => e.score === score);
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-5">{emoji?.emoji || "🙏"}</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        ¡Gracias por tu calificación!
      </h2>
      <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
        Tu opinión nos ayuda a mejorar cada día. Agradecemos mucho tu tiempo.
      </p>
      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200">
        <i className="bx bx-check text-emerald-500" />
        <span className="text-xs text-emerald-600 font-semibold">
          Respuesta registrada
        </span>
      </div>
    </div>
  );
}

function PreviewBanner() {
  return (
    <div className="mx-4 sm:mx-6 mt-4 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
      <i className="bx bx-show text-amber-500 text-sm" />
      <span className="text-[10px] text-amber-600 font-semibold">
        Vista previa — las respuestas no se guardarán
      </span>
    </div>
  );
}

export default function EncuestaPublica() {
  const { id: idEncuesta } = useParams();
  const [searchParams] = useSearchParams();
  const cid = searchParams.get("cid");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedScore, setSelectedScore] = useState(null);
  const [respuestas, setRespuestas] = useState({});

  const isPreview = cid === "preview";

  const fetchEncuesta = useCallback(async () => {
    try {
      setLoading(true);
      const url = cid
        ? `encuestas_publico/publica/${idEncuesta}?cid=${cid}`
        : `encuestas_publico/publica/${idEncuesta}`;
      const res = await chatApi.get(url);
      if (!res.data.ok) {
        setError(res.data.error || "Encuesta no disponible");
        return;
      }
      setData(res.data);
    } catch (err) {
      setError("Esta encuesta no está disponible en este momento");
    } finally {
      setLoading(false);
    }
  }, [idEncuesta, cid]);

  useEffect(() => {
    fetchEncuesta();
  }, [fetchEncuesta]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (data?.encuesta?.tipo === "satisfaccion" && !selectedScore) return;
    if (isPreview) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    try {
      await chatApi.post(`encuestas_publico/publica/${idEncuesta}/responder`, {
        cid: cid || null,
        score: selectedScore,
        respuestas: {
          ...respuestas,
          ...(selectedScore ? { score: selectedScore } : {}),
        },
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const updateRespuesta = (key, value) => {
    setRespuestas((prev) => ({ ...prev, [key]: value }));
  };

  const inputCls =
    "w-full bg-gray-50/80 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all resize-none";

  return (
    <div className="min-h-[100dvh] bg-[#0a0e1a] flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-blue-600/[0.07] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-indigo-600/[0.05] blur-[100px] pointer-events-none" />
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/40 border border-white/10 overflow-hidden ring-1 ring-white/5">
          {/* Header */}
          <div className="relative px-4 sm:px-6 pt-5 sm:pt-7 pb-4 sm:pb-5 bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzAtOS45NC04LjA2LTE4LTE4LTE4IDAgOS45NCA4LjA2IDE4IDE4IDE4em0wIDBjOS45NCAwIDE4IDguMDYgMTggMTgtOS45NCAwLTE4LTguMDYtMTgtMTh6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center shrink-0">
                <i className="bx bx-message-rounded-dots text-white text-xl sm:text-2xl" />
              </div>
              <div className="min-w-0">
                <h1 className="text-white font-bold text-base sm:text-lg truncate">
                  {data?.encuesta?.nombre || "Encuesta"}
                </h1>
                {data?.encuesta?.descripcion && (
                  <p className="text-white/50 text-[11px] sm:text-xs mt-0.5 truncate">
                    {data.encuesta.descripcion}
                  </p>
                )}
              </div>
            </div>
          </div>

          {isPreview && !submitted && <PreviewBanner />}

          {/* Content */}
          <div className="px-4 sm:px-6 pb-5 sm:pb-7 pt-4 sm:pt-5">
            {loading && <LoadingState />}
            {error && <ErrorState message={error} />}
            {data?.ya_respondida && <AlreadyAnswered cliente={data.cliente} />}

            {!loading &&
              !error &&
              data &&
              !data.ya_respondida &&
              !submitted && (
                <>
                  {data.cliente && (
                    <div className="mb-5 sm:mb-6">
                      <p className="text-gray-600 text-sm leading-relaxed">
                        Hola{" "}
                        <span className="font-bold text-gray-800">
                          {data.cliente.nombre?.split(" ")[0] || ""}
                        </span>
                        {data.encargado?.nombre && (
                          <>
                            , fuiste atendido por{" "}
                            <span className="font-bold text-blue-600">
                              {data.encargado.nombre}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  {data.encuesta?.tipo === "satisfaccion" && (
                    <div className="mb-6 sm:mb-7">
                      <p className="text-sm font-semibold text-gray-700 mb-3 sm:mb-4 text-center">
                        ¿Cómo calificarías tu experiencia?
                      </p>
                      <div className="flex justify-center gap-1.5 sm:gap-2.5">
                        {EMOJIS.map((item) => (
                          <button
                            key={item.score}
                            type="button"
                            onClick={() => setSelectedScore(item.score)}
                            className={`flex flex-col items-center gap-1 sm:gap-1.5 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 flex-1 max-w-[68px] ${
                              selectedScore === item.score
                                ? `${item.active} ring-2 scale-105 sm:scale-110 shadow-lg`
                                : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                            }`}
                          >
                            <span
                              className={`text-xl sm:text-2xl transition-transform ${selectedScore === item.score ? "scale-110" : ""}`}
                            >
                              {item.emoji}
                            </span>
                            <span
                              className={`text-[8px] sm:text-[9px] font-bold leading-tight text-center ${
                                selectedScore === item.score
                                  ? item.text
                                  : "text-gray-300"
                              }`}
                            >
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.encuesta?.preguntas?.length > 0 && (
                    <div className="space-y-4 mb-5">
                      {data.encuesta.preguntas
                        .filter((p) => p.type !== "rating_1_5")
                        .map((pregunta, idx) => (
                          <div key={pregunta.key || idx}>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                              {pregunta.label}
                            </label>
                            {(pregunta.type === "textarea" ||
                              !pregunta.type) && (
                              <textarea
                                value={respuestas[pregunta.key] || ""}
                                onChange={(e) =>
                                  updateRespuesta(pregunta.key, e.target.value)
                                }
                                rows={3}
                                className={inputCls}
                                placeholder={
                                  pregunta.placeholder || "Tu respuesta..."
                                }
                              />
                            )}
                            {pregunta.type === "text" && (
                              <input
                                type="text"
                                value={respuestas[pregunta.key] || ""}
                                onChange={(e) =>
                                  updateRespuesta(pregunta.key, e.target.value)
                                }
                                className={inputCls}
                                placeholder={
                                  pregunta.placeholder || "Tu respuesta..."
                                }
                              />
                            )}
                            {pregunta.type === "select" &&
                              pregunta.options?.length > 0 && (
                                <select
                                  value={respuestas[pregunta.key] || ""}
                                  onChange={(e) =>
                                    updateRespuesta(
                                      pregunta.key,
                                      e.target.value,
                                    )
                                  }
                                  className={inputCls}
                                >
                                  <option value="">Selecciona...</option>
                                  {pregunta.options.map((opt, i) => (
                                    <option key={i} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              )}
                          </div>
                        ))}
                    </div>
                  )}

                  {data.encuesta?.tipo === "satisfaccion" &&
                    !data.encuesta.preguntas?.some(
                      (p) => p.type === "textarea" && p.key === "comentario",
                    ) && (
                      <div className="mb-5 sm:mb-6">
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          ¿Algún comentario adicional?{" "}
                          <span className="text-gray-300 font-normal">
                            (opcional)
                          </span>
                        </label>
                        <textarea
                          value={respuestas.comentario || ""}
                          onChange={(e) =>
                            updateRespuesta("comentario", e.target.value)
                          }
                          rows={3}
                          className={inputCls}
                          placeholder="Cuéntanos más sobre tu experiencia..."
                        />
                      </div>
                    )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={
                      submitting ||
                      (data.encuesta?.tipo === "satisfaccion" && !selectedScore)
                    }
                    className={`w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm font-bold transition-all duration-200 ${
                      submitting ||
                      (data.encuesta?.tipo === "satisfaccion" && !selectedScore)
                        ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                        : "bg-slate-900 text-white shadow-lg shadow-slate-300/30 hover:shadow-xl hover:shadow-slate-400/30 hover:bg-slate-800 active:scale-[0.98]"
                    }`}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="bx bx-loader-alt bx-spin" /> Enviando...
                      </span>
                    ) : (
                      "Enviar mi respuesta"
                    )}
                  </button>

                  {data.encuesta?.tipo === "satisfaccion" && !selectedScore && (
                    <p className="text-center text-[10px] text-gray-300 mt-2">
                      Selecciona una calificación para continuar
                    </p>
                  )}
                </>
              )}

            {submitted && <ThankYouState score={selectedScore} />}
          </div>
        </div>

        <p className="text-center mt-3">
          <span className="text-[10px] text-white/20">
            Encuesta generada por{" "}
          </span>
          <span className="text-[10px] text-blue-400/40 font-bold">
            ImporChat
          </span>
        </p>
      </div>
    </div>
  );
}
