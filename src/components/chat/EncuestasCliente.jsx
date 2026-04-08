import React, { useEffect, useState, useCallback } from "react";
import chatApi from "../../api/chatcenter";

export default function EncuestasCliente({ clienteId, id_configuracion }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [respuestas, setRespuestas] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const fetchRespuestas = useCallback(async () => {
    if (!clienteId || !id_configuracion) {
      setRespuestas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await chatApi.get(
        `/encuestas/cliente/${clienteId}/respuestas`,
        { params: { id_configuracion } },
      );
      setRespuestas(data?.data || []);
    } catch (err) {
      console.error("Error cargando encuestas cliente:", err);
      setRespuestas([]);
    } finally {
      setLoading(false);
    }
  }, [clienteId, id_configuracion]);

  // Fetch silencioso al montar y cuando cambia el cliente
  useEffect(() => {
    setOpen(false);
    setExpandedId(null);
    setRespuestas([]);
    fetchRespuestas();
  }, [clienteId, id_configuracion]);

  // Agrupar por encuesta
  const agrupadas = respuestas.reduce((acc, r) => {
    const key = r.id_encuesta;
    if (!acc[key]) {
      acc[key] = {
        nombre: r.nombre_encuesta,
        tipo: r.tipo_encuesta,
        items: [],
      };
    }
    acc[key].items.push(r);
    return acc;
  }, {});

  const tipoLabel = (tipo) => {
    if (tipo === "satisfaccion") return "⭐ Satisfacción";
    if (tipo === "webhook_lead") return "📋 Webhook";
    return tipo;
  };

  const scoreColor = (score) => {
    if (score >= 4) return "text-emerald-400";
    if (score === 3) return "text-yellow-400";
    return "text-red-400";
  };

  const scoreEmoji = (score) => {
    if (score >= 4) return "😊";
    if (score === 3) return "😐";
    if (score <= 2 && score !== null) return "😞";
    return "";
  };

  const formatDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalRespuestas = respuestas.length;

  // No renderizar nada si no hay respuestas
  if (!loading && totalRespuestas === 0) return null;
  // Mientras carga por primera vez, tampoco mostrar nada (evita flash)
  if (loading && totalRespuestas === 0) return null;

  return (
    <div className="mt-2">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all duration-300 border ${
          open
            ? "bg-[#1e3a5f] border-blue-400"
            : "bg-[#162c4a] border-transparent hover:border-blue-300"
        }`}
      >
        <div className="flex items-center gap-2">
          <i
            className={`bx bx-poll text-sm ${
              open ? "glow-yellow" : "text-yellow-300"
            }`}
          />
          <span className="text-white">Encuestas</span>
          {totalRespuestas > 0 && !open && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px]">
              {totalRespuestas}
            </span>
          )}
        </div>
        <i
          className={`bx bx-chevron-down text-sm text-white/60 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Panel */}
      <div
        className={`transition-all duration-300 ease-in-out transform origin-top ${
          open
            ? "opacity-100 scale-100 max-h-[1500px] pointer-events-auto"
            : "opacity-0 scale-95 max-h-0 overflow-hidden pointer-events-none"
        }`}
      >
        <div className="mt-1.5 rounded-md bg-[#12172e] border border-white/10 p-2">
          {loading && (
            <p className="text-[10px] text-white/60 py-2">
              Cargando encuestas…
            </p>
          )}

          {!loading &&
            Object.entries(agrupadas).map(([encId, grupo]) => (
              <div key={encId} className="mb-2 last:mb-0">
                {/* Encuesta header */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] text-white/40">
                    {tipoLabel(grupo.tipo)}
                  </span>
                  <span className="text-[10px] text-white/80 font-medium truncate">
                    {grupo.nombre}
                  </span>
                  <span className="text-[9px] text-white/30 ml-auto">
                    {grupo.items.length} resp.
                  </span>
                </div>

                {/* Respuestas */}
                {grupo.items.map((r) => {
                  const isExpanded = expandedId === r.id;
                  let parsed = {};
                  try {
                    parsed =
                      typeof r.respuestas === "string"
                        ? JSON.parse(r.respuestas)
                        : r.respuestas || {};
                  } catch {
                    parsed = {};
                  }
                  const entries = Object.entries(parsed);

                  return (
                    <div
                      key={r.id}
                      className="rounded-md bg-white/5 border border-white/10 mb-1 last:mb-0"
                    >
                      {/* Row summary */}
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
                      >
                        {/* Score badge (satisfacción) */}
                        {grupo.tipo === "satisfaccion" && r.score != null && (
                          <span
                            className={`text-sm font-bold ${scoreColor(r.score)}`}
                          >
                            {scoreEmoji(r.score)} {r.score}/5
                          </span>
                        )}

                        {/* Estado */}
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                            r.estado === "respondida"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : r.estado === "recibida"
                                ? "bg-blue-500/15 text-blue-300"
                                : "bg-white/10 text-white/50"
                          }`}
                        >
                          {r.estado}
                        </span>

                        {r.escalado === 1 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-300">
                            escalado
                          </span>
                        )}

                        <span className="text-[9px] text-white/30 ml-auto">
                          {formatDate(r.created_at)}
                        </span>

                        <i
                          className={`bx bx-chevron-down text-xs text-white/40 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && entries.length > 0 && (
                        <div className="px-2 pb-2 pt-0.5 border-t border-white/5">
                          {entries.map(([pregunta, respuesta], i) => (
                            <div key={i} className="mb-1.5 last:mb-0">
                              <p className="text-[9px] text-white/45 leading-tight">
                                {pregunta}
                              </p>
                              <p className="text-[10px] text-white/85 leading-tight mt-0.5">
                                {String(respuesta)}
                              </p>
                            </div>
                          ))}

                          {/* Datos contacto si existen */}
                          {r.datos_contacto && (
                            <div className="mt-1.5 pt-1.5 border-t border-white/5">
                              <p className="text-[9px] text-white/35 mb-0.5">
                                Datos de contacto
                              </p>
                              {Object.entries(
                                typeof r.datos_contacto === "string"
                                  ? JSON.parse(r.datos_contacto)
                                  : r.datos_contacto,
                              )
                                .filter(([, v]) => v)
                                .map(([k, v]) => (
                                  <p
                                    key={k}
                                    className="text-[9px] text-white/60"
                                  >
                                    <span className="text-white/35">{k}:</span>{" "}
                                    {v}
                                  </p>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

          {/* Refresh */}
          {!loading && respuestas.length > 0 && (
            <button
              type="button"
              onClick={fetchRespuestas}
              className="mt-1 text-[9px] text-white/30 hover:text-white/50 transition"
            >
              <i className="bx bx-refresh text-xs" /> Actualizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
