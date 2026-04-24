// src/pages/kanban/configuracion/componentes/PlantillasKanban.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../../api/chatcenter";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const BG_DARK = "rgb(23, 25, 49)";

const ICONOS_PLANTILLA = {
  ventas: { icon: "bx bx-store", color: "#10b981", bg: "#f0fdf4" },
};

// Columnas fallback para plantillas hardcoded
const COLUMNAS_FALLBACK = {
  ventas: [
    {
      nombre: "CONTACTO INICIAL",
      estado: "contacto_inicial",
      color: "#EFF6FF",
      texto: "#1D4ED8",
      icono: "bx bx-phone",
      ia: true,
      final: false,
    },
    {
      nombre: "IA VENTAS",
      estado: "ia_ventas",
      color: "#F0FDF4",
      texto: "#15803D",
      icono: "bx bx-bot",
      ia: true,
      final: false,
    },
    {
      nombre: "GENERAR GUIA",
      estado: "generar_guia",
      color: "#FFFBEB",
      texto: "#B45309",
      icono: "bx bx-cart",
      ia: false,
      final: true,
    },
    {
      nombre: "SEGUIMIENTO",
      estado: "seguimiento",
      color: "#ECFEFF",
      texto: "#0E7490",
      icono: "bx bx-calendar",
      ia: true,
      final: false,
    },
    {
      nombre: "ASESOR",
      estado: "asesor",
      color: "#FFF7ED",
      texto: "#C2410C",
      icono: "bx bx-user",
      ia: false,
      final: false,
    },
  ],
};

// Etapas de la animación del paso 3
const STAGES = [
  {
    title: "Creando columnas del Kanban",
    desc: "Estructurando el flujo de atención y estados de cada contacto.",
    icon: "bx bx-columns",
    color: "#6366f1",
  },
  {
    title: "Configurando templates de mensajes",
    desc: "Creando los templates en tu Business Manager de Meta.",
    icon: "bx bx-message-square-dots",
    color: "#3b82f6",
  },
  {
    title: "Creando asistentes de IA",
    desc: "Generando los prompts personalizados para tu empresa.",
    icon: "bx bx-bot",
    color: "#10b981",
  },
  {
    title: "Configurando respuestas rápidas y Dropi",
    desc: "Cargando respuestas rápidas y automatización por estado Dropi.",
    icon: "bx bx-reply",
    color: "#f59e0b",
  },
  {
    title: "Indexando catálogo de productos",
    desc: "Sincronizando tu catálogo y cargándolo en los asistentes.",
    icon: "bx bx-package",
    color: "#8b5cf6",
  },
];

const STAGE_DURATION_MS = 12000;
const MIN_TOTAL_MS = STAGES.length * STAGE_DURATION_MS;

// Ejemplos rotativos de nombres de empresa
const EMPRESA_PLACEHOLDERS = [
  "Imporfactory",
  "Mi Tienda Online",
  "ShopEcuador",
  "TuNegocio",
  "DropiStore",
];

const PlantillasKanban = ({ id_configuracion, onPlantillaAplicada }) => {
  const [showModal, setShowModal] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paso, setPaso] = useState(1);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
  const [empresa, setEmpresa] = useState("");
  const [resultado, setResultado] = useState(null);

  const [stageIndex, setStageIndex] = useState(0);
  const stageTimerRef = useRef(null);
  const abortRef = useRef(false);

  // Placeholder rotativo
  const [phIdx, setPhIdx] = useState(0);
  useEffect(() => {
    if (paso !== 2) return;
    const t = setInterval(
      () => setPhIdx((p) => (p + 1) % EMPRESA_PLACEHOLDERS.length),
      2400,
    );
    return () => clearInterval(t);
  }, [paso]);

  useEffect(() => {
    return () => {
      if (stageTimerRef.current) clearInterval(stageTimerRef.current);
    };
  }, []);

  const columnasParaMostrar = useMemo(() => {
    if (!plantillaSeleccionada) return [];
    const cols = plantillaSeleccionada.columnas;
    if (Array.isArray(cols) && cols.length) {
      return cols
        .slice()
        .sort((a, b) => (a.orden || 0) - (b.orden || 0))
        .map((c) => ({
          nombre:
            c.nombre ||
            (c.estado_db || c.estado || "").toUpperCase().replace(/_/g, " "),
          estado: c.estado_db || c.estado || c.estado_contacto || "",
          color: c.color_fondo || c.color || c.bg_color || "#EFF6FF",
          texto: c.color_texto || c.texto || c.text_color || "#1D4ED8",
          icono: c.icono || c.icon || "bx bx-columns",
          ia: Boolean(c.activa_ia ?? c.ia ?? c.tiene_ia ?? false),
          final: Boolean(c.es_estado_final ?? c.final ?? c.es_final ?? false),
        }));
    }
    return COLUMNAS_FALLBACK[plantillaSeleccionada.key] || [];
  }, [plantillaSeleccionada]);

  const handleAbrir = async () => {
    setShowModal(true);
    setPaso(1);
    setPlantillaSeleccionada(null);
    setEmpresa("");
    setLoading(true);
    try {
      const [resHard, resGlobal] = await Promise.all([
        chatApi.post("/kanban_plantillas/listar"),
        chatApi.post("/kanban_plantillas/listar_globales"),
      ]);
      const hardcoded = (resHard.data?.data || []).map((p) => ({
        ...p,
        tipo: "hardcoded",
      }));
      const globales = resGlobal.data?.data || [];
      setPlantillas([...hardcoded, ...globales]);
    } catch {
      Toast.fire({ icon: "error", title: "Error al cargar plantillas" });
    } finally {
      setLoading(false);
    }
  };

  const cerrarModal = () => {
    if (stageTimerRef.current) {
      clearInterval(stageTimerRef.current);
      stageTimerRef.current = null;
    }
    abortRef.current = true;
    setShowModal(false);
    setPaso(1);
    setStageIndex(0);
  };

  const seleccionarPlantilla = (p) => {
    setPlantillaSeleccionada(p);
    setPaso(2);
  };

  const aplicarPlantilla = async () => {
    if (!empresa.trim()) {
      Toast.fire({ icon: "warning", title: "Ingresa el nombre de tu empresa" });
      return;
    }

    abortRef.current = false;
    setStageIndex(0);
    setPaso(3);
    const startTime = Date.now();

    if (stageTimerRef.current) clearInterval(stageTimerRef.current);
    stageTimerRef.current = setInterval(() => {
      if (abortRef.current) return;
      setStageIndex((prev) => (prev >= STAGES.length - 1 ? prev : prev + 1));
    }, STAGE_DURATION_MS);

    const esGlobal = plantillaSeleccionada.tipo === "global";
    const endpoint = esGlobal
      ? "/kanban_plantillas/aplicar_global"
      : "/kanban_plantillas/aplicar";
    const body = esGlobal
      ? {
          id_configuracion,
          id_plantilla: plantillaSeleccionada.id,
          empresa: empresa.trim(),
        }
      : {
          id_configuracion,
          plantilla_key: plantillaSeleccionada.key,
          empresa: empresa.trim(),
        };

    try {
      const { data } = await chatApi.post(endpoint, body, { timeout: 180000 });

      if (!data?.success) {
        abortRef.current = true;
        if (stageTimerRef.current) {
          clearInterval(stageTimerRef.current);
          stageTimerRef.current = null;
        }
        Toast.fire({
          icon: "error",
          title: data?.message || "Error al aplicar",
        });
        setPaso(2);
        return;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_TOTAL_MS) {
        const waitMs = MIN_TOTAL_MS - elapsed;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      if (abortRef.current) return;

      if (stageTimerRef.current) {
        clearInterval(stageTimerRef.current);
        stageTimerRef.current = null;
      }
      setStageIndex(STAGES.length - 1);
      setResultado(data.data || {});
      setPaso(4);
      onPlantillaAplicada?.();
    } catch (err) {
      abortRef.current = true;
      if (stageTimerRef.current) {
        clearInterval(stageTimerRef.current);
        stageTimerRef.current = null;
      }
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al aplicar plantilla",
      });
      setPaso(2);
    }
  };

  const currentStage = STAGES[Math.min(stageIndex, STAGES.length - 1)];

  // Calcular stats para el paso 4
  const stats = useMemo(() => {
    if (!resultado) return null;

    // Si viene como array (plantilla hardcoded legacy)
    if (Array.isArray(resultado)) {
      return {
        columnas: resultado,
        columnasCreadas: resultado.filter((r) => !r.omitida).length,
        columnasOmitidas: resultado.filter((r) => r.omitida).length,
        asistentesIA: resultado.filter((r) => r.assistant_id).length,
        templatesCreados: 0,
        rapidasCreadas: 0,
        dropiCreados: 0,
      };
    }

    // Formato nuevo (aplicar_global)
    const columnas = resultado.columnas || [];
    const templatesCreados = (resultado.templates_meta || []).filter(
      (t) => t.status === "success",
    ).length;
    const rapidasCreadas = (resultado.respuestas_rapidas || []).filter(
      (r) => r.status === "success",
    ).length;
    const dropiCreados = (resultado.dropi_config || []).filter(
      (d) => d.status === "creado",
    ).length;

    return {
      columnas,
      columnasCreadas: columnas.filter((c) => !c.omitida).length,
      columnasOmitidas: columnas.filter((c) => c.omitida).length,
      asistentesIA: columnas.filter((c) => c.assistant_id).length,
      templatesCreados,
      rapidasCreadas,
      dropiCreados,
    };
  }, [resultado]);

  return (
    <>
      <style>{`
        @keyframes pk-fadeIn {from{opacity:0;transform:scale(.97) translateY(6px)} to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes pk-overlayIn{from{opacity:0}to{opacity:1}}
        @keyframes pk-spin{to{transform:rotate(360deg)}}
        @keyframes pk-pulse {0%,100%{transform:scale(1);opacity:1;} 50%{transform:scale(1.08);opacity:.9;}}
        @keyframes pk-blink {0%,100%{opacity:1;} 50%{opacity:.25;}}
        @keyframes pk-slideIn {from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);}}
        @keyframes pk-successBounce {0%{transform:scale(0)} 50%{transform:scale(1.15)} 100%{transform:scale(1)}}
        @keyframes pk-confetti-fall {0%{transform:translateY(-100vh) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
        @keyframes pk-shimmer {0%{background-position:-400px 0} 100%{background-position:400px 0}}
        @keyframes pk-arrowPulse {0%,100%{transform:translateX(0);opacity:.4} 50%{transform:translateX(3px);opacity:1}}
        @keyframes pk-cardHover {from{transform:translateY(0)} to{transform:translateY(-4px)}}

        .pk-overlay {position:fixed;inset:0;background:rgba(10,10,20,.6);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;animation:pk-overlayIn .2s ease;}
        .pk-modal {background:#fff;border-radius:20px;width:100%;max-width:680px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 40px 100px rgba(0,0,0,.28);animation:pk-fadeIn .28s cubic-bezier(.4,0,.2,1);overflow:hidden;}
        .pk-header {background:${BG_DARK};padding:20px 26px;flex-shrink:0;position:relative;overflow:hidden;}
        .pk-header::before {content:"";position:absolute;top:-50%;right:-20%;width:250px;height:250px;background:radial-gradient(circle,rgba(99,102,241,.3) 0%,transparent 70%);pointer-events:none;}
        .pk-body {padding:22px 26px 26px;overflow-y:auto;-webkit-overflow-scrolling:touch;}
        .pk-trigger-btn {display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:12px;border:1.5px solid rgba(99,102,241,.3);background:rgba(99,102,241,.06);color:#4338ca;font-size:.82rem;font-weight:700;cursor:pointer;transition:all .18s;white-space:nowrap;font-family:inherit;}
        .pk-trigger-btn:hover {background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.6);box-shadow:0 3px 12px rgba(99,102,241,.2);transform:translateY(-1px);}
        .pk-input {width:100%;padding:12px 16px;border-radius:12px;border:1.5px solid #e5e7eb;background:#fff;font-size:.95rem;color:#111827;outline:none;transition:all .2s;font-family:inherit;box-sizing:border-box;}
        .pk-input:focus {border-color:#6366f1;box-shadow:0 0 0 4px rgba(99,102,241,.12);}
        .pk-btn-primary {display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:12px;border:none;background:linear-gradient(135deg,${BG_DARK},#2a2d50);color:#fff;font-weight:700;font-size:.875rem;cursor:pointer;transition:all .2s;font-family:inherit;box-shadow:0 6px 20px rgba(23,25,49,.3);}
        .pk-btn-primary:hover:not(:disabled) {transform:translateY(-1px);box-shadow:0 10px 24px rgba(23,25,49,.4);}
        .pk-btn-primary:disabled{opacity:.4;cursor:not-allowed;transform:none;}
        .pk-btn-secondary {padding:11px 18px;border-radius:12px;border:1.5px solid #e5e7eb;background:#fff;color:#374151;font-weight:600;font-size:.875rem;cursor:pointer;transition:all .15s;font-family:inherit;}
        .pk-btn-secondary:hover{background:#f9fafb;border-color:#d1d5db;}
        .pk-close-btn {width:30px;height:30px;border-radius:9px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;font-family:inherit;position:relative;z-index:1;}
        .pk-close-btn:hover{background:rgba(255,255,255,.18);color:#fff;}
        .pk-spinner {width:48px;height:48px;border-radius:50%;border:4px solid rgba(99,102,241,.2);border-top-color:#6366f1;animation:pk-spin .8s linear infinite;margin:0 auto;}
        .pk-plantilla-card {border-radius:16px;overflow:hidden;cursor:pointer;transition:all .25s cubic-bezier(.4,0,.2,1);background:#fff;border:2px solid #e5e7eb;position:relative;}
        .pk-plantilla-card:hover {border-color:#6366f1;transform:translateY(-3px);box-shadow:0 16px 32px rgba(99,102,241,.18);}
        .pk-plantilla-card:hover .pk-card-arrow {animation:pk-arrowPulse .8s ease-in-out infinite;}
        .pk-feature-chip {display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:.68rem;font-weight:700;}
        .pk-confetti {position:absolute;width:10px;height:10px;pointer-events:none;}
        .pk-flow-column {display:flex;flex-direction:column;align-items:center;min-width:100px;transition:all .2s;}
        .pk-flow-column:hover {transform:translateY(-2px);}
        .swal-over-modal { z-index: 99999 !important; }
      `}</style>

      <button className="pk-trigger-btn" type="button" onClick={handleAbrir}>
        <i className="bx bx-layout" style={{ fontSize: 15 }} />
        Plantillas Kanban
      </button>

      {showModal && (
        <div
          className="pk-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && paso !== 3) cerrarModal();
          }}
        >
          <div className="pk-modal">
            {/* ═══════════ HEADER ═══════════ */}
            <div className="pk-header">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 11,
                      background:
                        "linear-gradient(135deg,rgba(99,102,241,.25),rgba(139,92,246,.15))",
                      border: "1px solid rgba(99,102,241,.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i
                      className="bx bxs-rocket"
                      style={{ fontSize: 20, color: "#a5b4fc" }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: ".65rem",
                        color: "rgba(255,255,255,.45)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".08em",
                      }}
                    >
                      Setup instantáneo
                    </div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "1.05rem",
                        fontWeight: 800,
                        color: "#fff",
                        lineHeight: 1.2,
                      }}
                    >
                      {paso === 1 && "Elige tu plantilla de arranque"}
                      {paso === 2 && "Personaliza y aplica"}
                      {paso === 3 && "Configurando tu tablero"}
                      {paso === 4 && "¡Tu tablero está listo!"}
                    </h2>
                  </div>
                </div>
                {paso !== 3 && (
                  <button
                    className="pk-close-btn"
                    type="button"
                    onClick={cerrarModal}
                  >
                    <i className="bx bx-x" style={{ fontSize: 17 }} />
                  </button>
                )}
              </div>

              {paso === 1 && (
                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: ".82rem",
                    color: "rgba(255,255,255,.6)",
                    lineHeight: 1.55,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  Aplica una plantilla y tendrás columnas, asistentes IA,
                  templates de WhatsApp y automatización de estados en Dropi
                  listos en menos de un minuto.
                </p>
              )}

              {paso <= 2 && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 16,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {["Diseño", "Personalizar", "Aplicar"].map((s, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flex: i < 2 ? 1 : undefined,
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background:
                            paso > i + 1
                              ? "#22c55e"
                              : paso === i + 1
                                ? "#fff"
                                : "rgba(255,255,255,.15)",
                          color:
                            paso > i + 1
                              ? "#fff"
                              : paso === i + 1
                                ? BG_DARK
                                : "rgba(255,255,255,.5)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: ".75rem",
                          fontWeight: 800,
                          flexShrink: 0,
                          transition: "all .25s",
                        }}
                      >
                        {paso > i + 1 ? (
                          <i className="bx bx-check" style={{ fontSize: 14 }} />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: ".75rem",
                          color:
                            paso === i + 1 ? "#fff" : "rgba(255,255,255,.5)",
                          fontWeight: paso === i + 1 ? 700 : 500,
                        }}
                      >
                        {s}
                      </span>
                      {i < 2 && (
                        <div
                          style={{
                            flex: 1,
                            height: 2,
                            background:
                              paso > i + 1 ? "#22c55e" : "rgba(255,255,255,.1)",
                            borderRadius: 999,
                            transition: "background .3s",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ═══════════ BODY ═══════════ */}
            <div className="pk-body">
              {/* ─────── PASO 1: Catálogo ─────── */}
              {paso === 1 && (
                <>
                  {loading ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px 0",
                        color: "#94a3b8",
                      }}
                    >
                      <div className="pk-spinner" />
                      <div
                        style={{
                          fontSize: ".88rem",
                          marginTop: 14,
                          fontWeight: 600,
                        }}
                      >
                        Cargando plantillas disponibles...
                      </div>
                    </div>
                  ) : plantillas.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px 20px",
                        color: "#94a3b8",
                      }}
                    >
                      <i
                        className="bx bx-ghost"
                        style={{
                          fontSize: "3rem",
                          display: "block",
                          marginBottom: 12,
                        }}
                      />
                      <div style={{ fontWeight: 700, color: "#475569" }}>
                        No hay plantillas disponibles
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      {plantillas.map((p) => {
                        const meta =
                          p.tipo === "global"
                            ? {
                                icon: p.icono || "bx bx-layout",
                                color: p.color || "#6366f1",
                                bg: `${p.color || "#6366f1"}20`,
                              }
                            : ICONOS_PLANTILLA[p.key] || {
                                icon: "bx bx-layout",
                                color: "#6366f1",
                                bg: "#eff6ff",
                              };

                        return (
                          <div
                            key={p.tipo === "global" ? `global-${p.id}` : p.key}
                            onClick={() => seleccionarPlantilla(p)}
                            className="pk-plantilla-card"
                          >
                            {/* Hero visual */}
                            <div
                              style={{
                                background: `linear-gradient(135deg, ${meta.color} 0%, ${meta.color}cc 60%, ${BG_DARK} 100%)`,
                                padding: "18px 20px",
                                position: "relative",
                                overflow: "hidden",
                                minHeight: 90,
                              }}
                            >
                              <div
                                style={{
                                  position: "absolute",
                                  top: -30,
                                  right: -20,
                                  width: 130,
                                  height: 130,
                                  borderRadius: "50%",
                                  background: "rgba(255,255,255,.08)",
                                }}
                              />
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: -40,
                                  left: -15,
                                  width: 100,
                                  height: 100,
                                  borderRadius: "50%",
                                  background: "rgba(255,255,255,.05)",
                                }}
                              />

                              <div
                                style={{
                                  position: "relative",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                }}
                              >
                                <div
                                  style={{
                                    width: 54,
                                    height: 54,
                                    borderRadius: 14,
                                    background: "rgba(255,255,255,.15)",
                                    border: "1px solid rgba(255,255,255,.25)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backdropFilter: "blur(10px)",
                                    flexShrink: 0,
                                  }}
                                >
                                  <i
                                    className={meta.icon}
                                    style={{
                                      fontSize: "1.7rem",
                                      color: "#fff",
                                    }}
                                  />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: ".62rem",
                                      color: "rgba(255,255,255,.7)",
                                      fontWeight: 700,
                                      textTransform: "uppercase",
                                      letterSpacing: ".08em",
                                      marginBottom: 3,
                                    }}
                                  >
                                    {p.tipo === "global"
                                      ? "Plantilla global"
                                      : "Plantilla oficial"}
                                    {p.tipo === "global" && (
                                      <span
                                        style={{
                                          marginLeft: 6,
                                          background: "#fbbf24",
                                          color: "#78350f",
                                          padding: "1px 6px",
                                          borderRadius: 999,
                                          fontSize: ".58rem",
                                        }}
                                      >
                                        ★ Recomendada
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "1.05rem",
                                      color: "#fff",
                                      fontWeight: 800,
                                      lineHeight: 1.25,
                                    }}
                                  >
                                    {p.nombre}
                                  </div>
                                  {p.descripcion && (
                                    <div
                                      style={{
                                        fontSize: ".76rem",
                                        color: "rgba(255,255,255,.8)",
                                        marginTop: 4,
                                        lineHeight: 1.45,
                                      }}
                                    >
                                      {p.descripcion}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Features incluidos */}
                            <div
                              style={{
                                padding: "14px 18px",
                                background: "#fff",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: ".66rem",
                                  color: "#94a3b8",
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                  letterSpacing: ".07em",
                                  marginBottom: 8,
                                }}
                              >
                                <i
                                  className="bx bx-package"
                                  style={{
                                    marginRight: 4,
                                    verticalAlign: "middle",
                                  }}
                                />
                                Todo esto se configura automáticamente
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 6,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  className="pk-feature-chip"
                                  style={{
                                    background: "#eef2ff",
                                    color: "#4338ca",
                                  }}
                                >
                                  <i
                                    className="bx bx-columns"
                                    style={{ fontSize: 11 }}
                                  />
                                  {p.total_columnas} columnas
                                </span>
                                <span
                                  className="pk-feature-chip"
                                  style={{
                                    background: "#f0fdf4",
                                    color: "#15803d",
                                  }}
                                >
                                  <i
                                    className="bx bx-bot"
                                    style={{ fontSize: 11 }}
                                  />
                                  {p.columnas_ia} asistentes IA
                                </span>
                                <span
                                  className="pk-feature-chip"
                                  style={{
                                    background: "#fef3c7",
                                    color: "#b45309",
                                  }}
                                >
                                  <i
                                    className="bx bxl-whatsapp"
                                    style={{ fontSize: 11 }}
                                  />
                                  Templates Meta
                                </span>
                                <span
                                  className="pk-feature-chip"
                                  style={{
                                    background: "#fce7f3",
                                    color: "#be185d",
                                  }}
                                >
                                  <i
                                    className="bx bx-reply"
                                    style={{ fontSize: 11 }}
                                  />
                                  Respuestas rápidas
                                </span>
                                <span
                                  className="pk-feature-chip"
                                  style={{
                                    background: "#ecfeff",
                                    color: "#0e7490",
                                  }}
                                >
                                  <i
                                    className="bx bx-package"
                                    style={{ fontSize: 11 }}
                                  />
                                  Auto Dropi
                                </span>
                              </div>
                            </div>

                            {/* Footer CTA */}
                            <div
                              style={{
                                padding: "10px 18px",
                                borderTop: "1px solid #f1f5f9",
                                background: "#fafafa",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: ".75rem",
                                  color: meta.color,
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                }}
                              >
                                <i className="bx bxs-zap" /> Aplicar en 45
                                segundos
                              </span>
                              <i
                                className="bx bx-right-arrow-alt pk-card-arrow"
                                style={{
                                  color: meta.color,
                                  fontSize: "1.25rem",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ─────── PASO 2: Personalizar ─────── */}
              {paso === 2 && plantillaSeleccionada && (
                <>
                  {/* Banner plantilla seleccionada */}
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 14,
                      background: `linear-gradient(135deg, ${plantillaSeleccionada.color || "#6366f1"}0f, transparent)`,
                      border: `1.5px solid ${plantillaSeleccionada.color || "#6366f1"}33`,
                      marginBottom: 22,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: `${plantillaSeleccionada.color || "#6366f1"}18`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <i
                        className={
                          plantillaSeleccionada.icono || "bx bx-layout"
                        }
                        style={{
                          fontSize: "1.4rem",
                          color: plantillaSeleccionada.color || "#6366f1",
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: ".62rem",
                          color: "#94a3b8",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: ".07em",
                        }}
                      >
                        Plantilla seleccionada
                      </div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "1rem",
                          color: "#0f172a",
                          marginTop: 1,
                        }}
                      >
                        {plantillaSeleccionada.nombre}
                      </div>
                    </div>
                    <button
                      onClick={() => setPaso(1)}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(0,0,0,.1)",
                        borderRadius: 8,
                        padding: "5px 10px",
                        fontSize: ".72rem",
                        fontWeight: 600,
                        color: "#64748b",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Cambiar
                    </button>
                  </div>

                  {/* Input empresa */}
                  <div style={{ marginBottom: 22 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: ".82rem",
                        fontWeight: 700,
                        color: "#0f172a",
                        marginBottom: 6,
                      }}
                    >
                      ¿Cuál es el nombre de tu empresa?
                    </label>
                    <div
                      style={{
                        fontSize: ".75rem",
                        color: "#64748b",
                        marginBottom: 8,
                      }}
                    >
                      Se usará para personalizar los prompts de los asistentes
                      de IA.
                    </div>
                    <input
                      className="pk-input"
                      placeholder={`Ej: ${EMPRESA_PLACEHOLDERS[phIdx]}`}
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") aplicarPlantilla();
                      }}
                      autoFocus
                    />
                  </div>

                  {/* Flujo visual */}
                  {columnasParaMostrar.length > 0 && (
                    <div style={{ marginBottom: 22 }}>
                      <div
                        style={{
                          fontSize: ".72rem",
                          fontWeight: 800,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                          letterSpacing: ".07em",
                          marginBottom: 10,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <i className="bx bx-git-branch" />
                        Así se verá tu flujo
                      </div>

                      <div
                        style={{
                          background: "linear-gradient(135deg,#0f172a,#1e293b)",
                          borderRadius: 14,
                          padding: "18px 16px",
                          overflowX: "auto",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 4,
                            minWidth: "max-content",
                          }}
                        >
                          {columnasParaMostrar.map((col, i, arr) => (
                            <React.Fragment key={`${col.estado}-${i}`}>
                              <div className="pk-flow-column">
                                <div
                                  style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: col.color,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginBottom: 8,
                                    border: `1.5px solid ${col.texto}30`,
                                    boxShadow: `0 4px 12px ${col.texto}22`,
                                  }}
                                >
                                  <i
                                    className={col.icono}
                                    style={{
                                      color: col.texto,
                                      fontSize: "1.3rem",
                                    }}
                                  />
                                </div>
                                <div
                                  style={{
                                    fontSize: ".68rem",
                                    color: "#fff",
                                    fontWeight: 700,
                                    textAlign: "center",
                                    maxWidth: 96,
                                    lineHeight: 1.25,
                                    marginBottom: 5,
                                  }}
                                >
                                  {col.nombre}
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 3,
                                    justifyContent: "center",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {col.ia && (
                                    <span
                                      style={{
                                        fontSize: ".58rem",
                                        background: "rgba(34,197,94,.15)",
                                        color: "#4ade80",
                                        borderRadius: 999,
                                        padding: "1px 6px",
                                        fontWeight: 700,
                                        border:
                                          "1px solid rgba(74,222,128,.25)",
                                      }}
                                    >
                                      IA
                                    </span>
                                  )}
                                  {col.final && (
                                    <span
                                      style={{
                                        fontSize: ".58rem",
                                        background: "rgba(251,191,36,.15)",
                                        color: "#fbbf24",
                                        borderRadius: 999,
                                        padding: "1px 6px",
                                        fontWeight: 700,
                                        border:
                                          "1px solid rgba(251,191,36,.25)",
                                      }}
                                    >
                                      FINAL
                                    </span>
                                  )}
                                </div>
                              </div>
                              {i < arr.length - 1 && (
                                <div
                                  style={{
                                    color: "rgba(255,255,255,.25)",
                                    fontSize: "1rem",
                                    marginTop: 16,
                                    flexShrink: 0,
                                  }}
                                >
                                  →
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Qué se incluye */}
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 14,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      marginBottom: 22,
                    }}
                  >
                    <div
                      style={{
                        fontSize: ".72rem",
                        fontWeight: 800,
                        color: "#475569",
                        textTransform: "uppercase",
                        letterSpacing: ".07em",
                        marginBottom: 10,
                      }}
                    >
                      <i
                        className="bx bx-gift"
                        style={{ marginRight: 4, verticalAlign: "middle" }}
                      />
                      Se configurará automáticamente
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      {[
                        {
                          icon: "bx bx-columns",
                          label: `${plantillaSeleccionada.total_columnas} columnas del tablero`,
                          color: "#6366f1",
                        },
                        {
                          icon: "bx bx-bot",
                          label: `${plantillaSeleccionada.columnas_ia} asistentes IA con prompt`,
                          color: "#10b981",
                        },
                        {
                          icon: "bxl bxl-whatsapp",
                          label: "Templates de WhatsApp en Meta",
                          color: "#25d366",
                        },
                        {
                          icon: "bx bx-reply",
                          label: "Respuestas rápidas pre-cargadas",
                          color: "#ec4899",
                        },
                        {
                          icon: "bx bx-package",
                          label: "Flujo Dropi por estado",
                          color: "#0ea5e9",
                        },
                        {
                          icon: "bx bx-sync",
                          label: "Sync de catálogo al asistente",
                          color: "#8b5cf6",
                        },
                      ].map((item, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          <i
                            className={item.icon}
                            style={{
                              fontSize: "1rem",
                              color: item.color,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: ".77rem",
                              color: "#334155",
                              fontWeight: 600,
                            }}
                          >
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <button
                      className="pk-btn-secondary"
                      onClick={() => setPaso(1)}
                    >
                      <i
                        className="bx bx-arrow-back"
                        style={{ marginRight: 4 }}
                      />
                      Volver
                    </button>
                    <button
                      className="pk-btn-primary"
                      onClick={aplicarPlantilla}
                      disabled={!empresa.trim()}
                    >
                      <i className="bx bxs-zap" style={{ fontSize: 15 }} />
                      Aplicar plantilla
                    </button>
                  </div>
                </>
              )}

              {/* ─────── PASO 3: Aplicando ─────── */}
              {paso === 3 && (
                <div style={{ padding: "14px 4px 4px" }}>
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div
                      key={stageIndex}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 100,
                        height: 100,
                        borderRadius: "50%",
                        background: `${currentStage.color}14`,
                        border: `2px solid ${currentStage.color}33`,
                        position: "relative",
                        animation: "pk-slideIn .35s ease",
                      }}
                    >
                      <i
                        className={currentStage.icon}
                        style={{
                          fontSize: "2.8rem",
                          color: currentStage.color,
                          animation: "pk-pulse 1.6s ease-in-out infinite",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: -6,
                          borderRadius: "50%",
                          border: `3px solid ${currentStage.color}`,
                          borderTopColor: "transparent",
                          animation: "pk-spin 1.2s linear infinite",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    key={`txt-${stageIndex}`}
                    style={{
                      textAlign: "center",
                      marginBottom: 20,
                      animation: "pk-slideIn .35s ease",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "1.08rem",
                        color: "#0f172a",
                        marginBottom: 6,
                      }}
                    >
                      {currentStage.title}
                    </div>
                    <div
                      style={{
                        fontSize: ".84rem",
                        color: "#64748b",
                        lineHeight: 1.55,
                        padding: "0 8px",
                      }}
                    >
                      {currentStage.desc}
                    </div>
                  </div>

                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: "#f1f5f9",
                      overflow: "hidden",
                      marginBottom: 22,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${((stageIndex + 1) / STAGES.length) * 100}%`,
                        background: `linear-gradient(90deg, ${STAGES[0].color}, ${currentStage.color})`,
                        transition: "width .8s ease",
                        borderRadius: 999,
                      }}
                    />
                  </div>

                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {STAGES.map((s, i) => {
                      const done = i < stageIndex;
                      const current = i === stageIndex;
                      return (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 14px",
                            borderRadius: 10,
                            background: current
                              ? `${s.color}0A`
                              : done
                                ? "#f0fdf4"
                                : "#fafafa",
                            border: `1px solid ${current ? `${s.color}40` : done ? "#bbf7d0" : "#e5e7eb"}`,
                            transition: "all .3s ease",
                          }}
                        >
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              background: current
                                ? s.color
                                : done
                                  ? "#16a34a"
                                  : "#e5e7eb",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {done ? (
                              <i
                                className="bx bx-check"
                                style={{ fontSize: 15, color: "#fff" }}
                              />
                            ) : current ? (
                              <div
                                style={{
                                  width: 9,
                                  height: 9,
                                  borderRadius: "50%",
                                  background: "#fff",
                                  animation: "pk-blink 1s ease-in-out infinite",
                                }}
                              />
                            ) : (
                              <span
                                style={{
                                  fontSize: ".72rem",
                                  color: "#94a3b8",
                                  fontWeight: 700,
                                }}
                              >
                                {i + 1}
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: ".84rem",
                              fontWeight: current ? 700 : 600,
                              color: done
                                ? "#166534"
                                : current
                                  ? s.color
                                  : "#94a3b8",
                            }}
                          >
                            {s.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      textAlign: "center",
                      marginTop: 20,
                      fontSize: ".74rem",
                      color: "#94a3b8",
                      lineHeight: 1.5,
                    }}
                  >
                    <i
                      className="bx bx-lock-alt"
                      style={{ verticalAlign: "middle", marginRight: 4 }}
                    />
                    No cierres esta ventana · el proceso está en curso
                  </div>
                </div>
              )}

              {/* ─────── PASO 4: Éxito ─────── */}
              {paso === 4 && stats && (
                <>
                  {/* Confetti decorativo */}
                  {[...Array(14)].map((_, i) => {
                    const colors = [
                      "#10b981",
                      "#6366f1",
                      "#f59e0b",
                      "#ec4899",
                      "#3b82f6",
                      "#8b5cf6",
                    ];
                    const left = Math.random() * 100;
                    const delay = Math.random() * 1.5;
                    const duration = 2 + Math.random() * 1.5;
                    return (
                      <div
                        key={i}
                        className="pk-confetti"
                        style={{
                          left: `${left}%`,
                          top: 0,
                          background: colors[i % colors.length],
                          borderRadius: i % 2 ? "50%" : 2,
                          animation: `pk-confetti-fall ${duration}s ${delay}s ease-in forwards`,
                        }}
                      />
                    );
                  })}

                  <div style={{ textAlign: "center", padding: "16px 0 20px" }}>
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg,#10b981,#059669)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px",
                        boxShadow: "0 12px 30px rgba(16,185,129,.3)",
                        animation:
                          "pk-successBounce .6s cubic-bezier(.34,1.56,.64,1)",
                      }}
                    >
                      <i
                        className="bx bx-check"
                        style={{
                          fontSize: "2.4rem",
                          color: "#fff",
                          fontWeight: 800,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "1.3rem",
                        color: "#0f172a",
                        marginBottom: 6,
                      }}
                    >
                      ¡Todo listo, {empresa}!
                    </div>
                    <div
                      style={{
                        fontSize: ".88rem",
                        color: "#64748b",
                        lineHeight: 1.5,
                      }}
                    >
                      Tu tablero{" "}
                      <strong>{plantillaSeleccionada?.nombre}</strong> ya está
                      operativo.
                    </div>
                  </div>

                  {/* Resumen stats */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                      gap: 10,
                      marginBottom: 20,
                    }}
                  >
                    {[
                      {
                        label: "Columnas",
                        value: stats.columnasCreadas,
                        icon: "bx bx-columns",
                        color: "#6366f1",
                      },
                      {
                        label: "Asistentes IA",
                        value: stats.asistentesIA,
                        icon: "bx bx-bot",
                        color: "#10b981",
                      },
                      {
                        label: "Templates Meta",
                        value: stats.templatesCreados,
                        icon: "bxl bxl-whatsapp",
                        color: "#25d366",
                      },
                      {
                        label: "Respuestas rápidas",
                        value: stats.rapidasCreadas,
                        icon: "bx bx-reply",
                        color: "#ec4899",
                      },
                      {
                        label: "Estados Dropi",
                        value: stats.dropiCreados,
                        icon: "bx bx-package",
                        color: "#0ea5e9",
                      },
                    ]
                      .filter((s) => s.value > 0)
                      .map((stat, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "12px 14px",
                            borderRadius: 12,
                            background: `${stat.color}08`,
                            border: `1px solid ${stat.color}25`,
                            textAlign: "center",
                          }}
                        >
                          <i
                            className={stat.icon}
                            style={{
                              fontSize: "1.5rem",
                              color: stat.color,
                              display: "block",
                              marginBottom: 4,
                            }}
                          />
                          <div
                            style={{
                              fontSize: "1.4rem",
                              fontWeight: 800,
                              color: "#0f172a",
                              lineHeight: 1,
                            }}
                          >
                            {stat.value}
                          </div>
                          <div
                            style={{
                              fontSize: ".68rem",
                              color: "#64748b",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: ".05em",
                              marginTop: 3,
                            }}
                          >
                            {stat.label}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Columnas omitidas (si las hay) */}
                  {stats.columnasOmitidas > 0 && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        marginBottom: 18,
                        fontSize: ".78rem",
                        color: "#92400e",
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <i
                        className="bx bx-info-circle"
                        style={{
                          fontSize: "1rem",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      />
                      <span>
                        Se omitieron <strong>{stats.columnasOmitidas}</strong>{" "}
                        columna{stats.columnasOmitidas > 1 ? "s" : ""} que ya
                        existían en tu tablero.
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 10,
                    }}
                  >
                    <button
                      className="pk-btn-primary"
                      onClick={cerrarModal}
                      style={{
                        background: "linear-gradient(135deg,#10b981,#059669)",
                        boxShadow: "0 6px 20px rgba(16,185,129,.3)",
                      }}
                    >
                      <i
                        className="bx bx-right-arrow-alt"
                        style={{ fontSize: 16 }}
                      />
                      Empezar a usar el tablero
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlantillasKanban;
