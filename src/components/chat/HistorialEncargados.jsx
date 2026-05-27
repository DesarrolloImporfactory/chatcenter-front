import React, { useState, useEffect, useCallback } from "react";
import chatApi from "../../api/chatcenter";

export default function HistorialEncargados({ clienteId }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchHistorial = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    try {
      const { data } = await chatApi.get(
        `/departamentos_chat_center/historial-encargados/${clienteId}`,
      );
      setHistorial(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      console.error("Error cargando historial:", err);
      setHistorial([]);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  if (!clienteId) return null;

  /* ── Helpers ── */
  const fmtFechaCorta = (d) => {
    if (!d) return "-";
    const x = new Date(d);
    if (isNaN(+x)) return "-";
    return x.toLocaleDateString("es-EC", { day: "2-digit", month: "short" });
  };

  const fmtHora = (d) => {
    if (!d) return "";
    const x = new Date(d);
    if (isNaN(+x)) return "";
    return x.toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fmtFechaCompleta = (d) => {
    if (!d) return "-";
    const x = new Date(d);
    if (isNaN(+x)) return "-";
    return x.toLocaleDateString("es-EC", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const timeAgo = (d) => {
    if (!d) return "";
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (!isFinite(s) || s < 0) return "";
    if (s < 60) return "ahora";
    const m = s / 60;
    if (m < 60) return `hace ${Math.round(m)} min`;
    const h = m / 60;
    if (h < 24) return `hace ${Math.round(h)}h`;
    const dd = h / 24;
    if (dd < 30) return `hace ${Math.round(dd)} días`;
    const mo = dd / 30;
    return `hace ${Math.round(mo)} meses`;
  };

  const getTipo = (item) => {
    if (!item.id_encargado_anterior && item.id_encargado_nuevo)
      return "asignacion";
    if (item.id_encargado_anterior && item.id_encargado_nuevo)
      return "transferencia";
    if (item.id_encargado_anterior && !item.id_encargado_nuevo)
      return "desasignacion";
    return "otro";
  };

  const ultimo = historial.length > 0 ? historial[historial.length - 1] : null;
  const encargadoActual =
    ultimo?.nombre_nuevo ||
    (ultimo?.id_encargado_nuevo ? `ID ${ultimo.id_encargado_nuevo}` : null);
  const deptoActual = ultimo?.nombre_departamento || null;
  const colorDepto = ultimo?.color_departamento || "#6366f1";

  /* Agrupar por fecha */
  const agrupadoPorFecha = historial.reduce((acc, item) => {
    const fecha = fmtFechaCompleta(item.fecha_registro);
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(item);
    return acc;
  }, {});
  const fechasOrdenadas = Object.keys(agrupadoPorFecha);

  /* ── Render de un evento ── */
  const renderEvento = (item, isLast) => {
    const tipo = getTipo(item);

    if (tipo === "transferencia") {
      return (
        <div
          key={item.id}
          className={`rounded-lg overflow-hidden transition-all ${
            isLast
              ? "border border-amber-500/30 shadow-md shadow-amber-500/5"
              : "border border-white/[0.08] hover:border-white/15"
          }`}
        >
          {/* Barra superior */}
          <div className="flex items-center justify-between px-2.5 py-1 bg-amber-500/10 border-b border-amber-500/15">
            <div className="flex items-center gap-1">
              <i className="bx bx-transfer-alt text-[10px] text-amber-400" />
              <span className="text-[9px] font-semibold text-amber-300 uppercase tracking-wider">
                Transferencia
              </span>
            </div>
            <span className="text-[9px] text-white/30">
              {fmtHora(item.fecha_registro)}
            </span>
          </div>

          {/* Flujo visual: DE → A */}
          <div className="px-2.5 py-2 bg-white/[0.02]">
            <div className="flex items-stretch gap-0">
              {/* DE */}
              <div className="flex-1 min-w-0">
                <p className="text-[8px] text-rose-400/60 uppercase tracking-wider font-semibold mb-1">
                  De
                </p>
                <div className="flex items-center gap-1.5 rounded-md bg-rose-500/[0.08] border border-rose-500/15 px-2 py-1.5">
                  <div className="h-5 w-5 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                    <i className="bx bx-user text-[10px] text-rose-400" />
                  </div>
                  <span className="text-[11px] text-white/75 font-medium truncate">
                    {item.nombre_anterior || `#${item.id_encargado_anterior}`}
                  </span>
                </div>
              </div>

              {/* Flecha central */}
              <div className="flex flex-col items-center justify-end px-1.5 pb-1.5">
                <div className="w-px h-2 bg-white/10" />
                <div className="h-5 w-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <i className="bx bx-right-arrow-alt text-[11px] text-amber-400" />
                </div>
                <div className="w-px h-2 bg-white/10" />
              </div>

              {/* A */}
              <div className="flex-1 min-w-0">
                <p className="text-[8px] text-emerald-400/60 uppercase tracking-wider font-semibold mb-1">
                  A
                </p>
                <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/[0.08] border border-emerald-500/15 px-2 py-1.5">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <i className="bx bx-user-check text-[10px] text-emerald-400" />
                  </div>
                  <span className="text-[11px] text-white/90 font-medium truncate">
                    {item.nombre_nuevo || `#${item.id_encargado_nuevo}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Departamento */}
            {item.nombre_departamento && (
              <div className="mt-2 flex items-center gap-1">
                <i
                  className="bx bx-buildings text-[10px]"
                  style={{ color: item.color_departamento || "#6366f1" }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: item.color_departamento || "#6366f1" }}
                >
                  {item.nombre_departamento}
                </span>
              </div>
            )}

            {/* Motivo completo */}
            {item.motivo && (
              <div className="mt-2 rounded-md bg-white/[0.03] border border-white/5 px-2.5 py-1.5">
                <p className="text-[8px] text-white/30 uppercase tracking-wider font-semibold mb-0.5">
                  Motivo
                </p>
                <p className="text-[10px] text-white/55 leading-relaxed">
                  {item.motivo}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (tipo === "asignacion") {
      return (
        <div
          key={item.id}
          className={`rounded-lg overflow-hidden transition-all ${
            isLast
              ? "border border-emerald-500/30 shadow-md shadow-emerald-500/5"
              : "border border-white/[0.08] hover:border-white/15"
          }`}
        >
          {/* Barra superior */}
          <div className="flex items-center justify-between px-2.5 py-1 bg-emerald-500/10 border-b border-emerald-500/15">
            <div className="flex items-center gap-1">
              <i className="bx bx-log-in text-[10px] text-emerald-400" />
              <span className="text-[9px] font-semibold text-emerald-300 uppercase tracking-wider">
                Asignación
              </span>
            </div>
            <span className="text-[9px] text-white/30">
              {fmtHora(item.fecha_registro)}
            </span>
          </div>

          <div className="px-2.5 py-2 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <i className="bx bx-user-check text-[13px] text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-white/90 font-medium truncate">
                  {item.nombre_nuevo || `#${item.id_encargado_nuevo}`}
                </p>
                <p className="text-[9px] text-white/35 mt-0.5">
                  fue asignado como encargado del chat
                </p>
              </div>
            </div>

            {/* Departamento */}
            {item.nombre_departamento && (
              <div className="mt-2 flex items-center gap-1">
                <i
                  className="bx bx-buildings text-[10px]"
                  style={{ color: item.color_departamento || "#6366f1" }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: item.color_departamento || "#6366f1" }}
                >
                  {item.nombre_departamento}
                </span>
              </div>
            )}

            {/* Motivo */}
            {item.motivo && (
              <div className="mt-2 rounded-md bg-white/[0.03] border border-white/5 px-2.5 py-1.5">
                <p className="text-[8px] text-white/30 uppercase tracking-wider font-semibold mb-0.5">
                  Motivo
                </p>
                <p className="text-[10px] text-white/55 leading-relaxed">
                  {item.motivo}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (tipo === "desasignacion") {
      return (
        <div
          key={item.id}
          className="rounded-lg overflow-hidden border border-white/[0.08] hover:border-white/15 transition-all"
        >
          <div className="flex items-center justify-between px-2.5 py-1 bg-rose-500/10 border-b border-rose-500/15">
            <div className="flex items-center gap-1">
              <i className="bx bx-log-out text-[10px] text-rose-400" />
              <span className="text-[9px] font-semibold text-rose-300 uppercase tracking-wider">
                Desasignación
              </span>
            </div>
            <span className="text-[9px] text-white/30">
              {fmtHora(item.fecha_registro)}
            </span>
          </div>

          <div className="px-2.5 py-2 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-rose-500/15 border border-rose-500/20 flex items-center justify-center shrink-0">
                <i className="bx bx-user-x text-[13px] text-rose-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-white/70 font-medium truncate">
                  {item.nombre_anterior || `#${item.id_encargado_anterior}`}
                </p>
                <p className="text-[9px] text-white/35 mt-0.5">
                  fue removido como encargado
                </p>
              </div>
            </div>

            {item.motivo && (
              <div className="mt-2 rounded-md bg-white/[0.03] border border-white/5 px-2.5 py-1.5">
                <p className="text-[8px] text-white/30 uppercase tracking-wider font-semibold mb-0.5">
                  Motivo
                </p>
                <p className="text-[10px] text-white/55 leading-relaxed">
                  {item.motivo}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="px-3 py-2.5 bg-[#0d1a30] border-t border-white/10">
      {/* ═══ Header ═══ */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full group"
      >
        <div className="flex items-center justify-between">
          <p className="text-[9px] text-white/45 uppercase tracking-[0.15em] flex items-center gap-1 font-semibold">
            <i className="bx bx-history text-[11px] text-violet-400" />
            Historial de encargados
            {!loading && historial.length > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center h-3.5 min-w-[14px] px-1 rounded-full bg-violet-500/20 text-[9px] text-violet-300 font-medium">
                {historial.length}
              </span>
            )}
          </p>
          <i
            className={`bx bx-chevron-down text-white/40 text-[14px] transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>

        {/* Mini resumen colapsado */}
        {!loading && encargadoActual && !expanded && (
          <div className="flex items-center gap-2 mt-2 mb-0.5">
            <div className="h-7 w-7 rounded-md bg-emerald-500/15 flex items-center justify-center shrink-0">
              <i className="bx bx-user-check text-[13px] text-emerald-400" />
            </div>
            <div className="min-w-0 text-left flex-1">
              <p className="text-[11px] text-white/85 font-medium truncate">
                {encargadoActual}
              </p>
              <p className="text-[9px] text-white/35 truncate">
                {deptoActual && (
                  <span style={{ color: colorDepto }}>{deptoActual}</span>
                )}
                {deptoActual && " · "}
                Encargado actual
              </p>
            </div>
            {ultimo?.fecha_registro && (
              <span className="ml-auto text-[9px] text-white/25 shrink-0">
                {timeAgo(ultimo.fecha_registro)}
              </span>
            )}
          </div>
        )}
      </button>

      {/* ═══ Expandido ═══ */}
      {expanded && (
        <div className="mt-2.5 space-y-3">
          {loading && (
            <div className="flex items-center gap-1.5 py-4 justify-center">
              <div className="h-2.5 w-2.5 rounded-full bg-violet-500/40 animate-pulse" />
              <span className="text-[10px] text-white/40">
                Cargando historial…
              </span>
            </div>
          )}

          {!loading && historial.length === 0 && (
            <div className="text-center py-5">
              <div className="h-10 w-10 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1.5">
                <i className="bx bx-history text-lg text-white/15" />
              </div>
              <p className="text-[10px] text-white/30">
                Sin historial de encargados
              </p>
            </div>
          )}

          {/* Card encargado actual destacada */}
          {!loading && encargadoActual && (
            <div className="rounded-lg border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-transparent to-emerald-500/5 p-3">
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <div className="h-9 w-9 rounded-lg bg-violet-500/20 border border-violet-500/25 flex items-center justify-center">
                    <i className="bx bx-user-check text-base text-violet-300" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#0d1a30] animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider font-semibold">
                    Encargado actual
                  </p>
                  <p className="text-[12px] text-white/90 font-semibold truncate mt-0.5">
                    {encargadoActual}
                  </p>
                  {deptoActual && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: colorDepto }}
                      />
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: colorDepto }}
                      >
                        {deptoActual}
                      </span>
                    </div>
                  )}
                </div>
                {ultimo?.fecha_registro && (
                  <div className="shrink-0 text-right">
                    <p className="text-[9px] text-white/25">
                      {fmtFechaCorta(ultimo.fecha_registro)}
                    </p>
                    <p className="text-[9px] text-white/20">
                      {fmtHora(ultimo.fecha_registro)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline agrupado por fecha */}
          {!loading && historial.length > 0 && (
            <div className="space-y-3">
              {fechasOrdenadas.map((fecha) => {
                const eventos = agrupadoPorFecha[fecha];
                return (
                  <div key={fecha}>
                    {/* Separador fecha */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      <div className="flex items-center gap-1 shrink-0">
                        <i className="bx bx-calendar text-[10px] text-white/25" />
                        <span className="text-[9px] text-white/35 font-medium">
                          {fecha}
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>

                    {/* Eventos */}
                    <div className="space-y-2">
                      {eventos.map((item) => {
                        const isLast =
                          item.id === historial[historial.length - 1]?.id;
                        return renderEvento(item, isLast);
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Colapsar */}
          {!loading && historial.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="w-full py-1.5 text-[10px] text-white/25 hover:text-white/40 transition flex items-center justify-center gap-1 rounded-md hover:bg-white/[0.02]"
            >
              <i className="bx bx-chevron-up text-[12px]" />
              Ocultar historial
            </button>
          )}
        </div>
      )}
    </div>
  );
}
