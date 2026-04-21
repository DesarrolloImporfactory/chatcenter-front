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

// ─────────────────────────────────────────────────────────────
// Columnas fallback para plantillas hardcoded (por si la plantilla
// no trae el array `columnas` desde la BD).
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Etapas de la animación del paso 3. 5 etapas x 9s = 45s.
// ─────────────────────────────────────────────────────────────
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
    title: "Configurando respuestas rápidas",
    desc: "Cargando las respuestas rápidas del flujo.",
    icon: "bx bx-reply",
    color: "#f59e0b",
  },
  {
    title: "Indexando catálogo de productos",
    desc: "Sincronizando tu catálogo y cargándolo en los asistentes. Esto puede tomar un poco.",
    icon: "bx bx-package",
    color: "#8b5cf6",
  },
];

const STAGE_DURATION_MS = 12000; // ~12s por etapa
const MIN_TOTAL_MS = STAGES.length * STAGE_DURATION_MS; // 45s

const PlantillasKanban = ({ id_configuracion, onPlantillaAplicada }) => {
  const [showModal, setShowModal] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paso, setPaso] = useState(1); // 1=lista, 2=configurar, 3=aplicando, 4=éxito
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
  const [empresa, setEmpresa] = useState("");
  const [resultado, setResultado] = useState([]);

  // Estado animación paso 3
  const [stageIndex, setStageIndex] = useState(0);
  const stageTimerRef = useRef(null);
  const abortRef = useRef(false);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (stageTimerRef.current) clearInterval(stageTimerRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  // Normaliza las columnas que se mostrarán en el paso 2.
  // Prioridad: plantillaSeleccionada.columnas (desde BD) →
  // fallback hardcoded por `key`.
  // ─────────────────────────────────────────────────────────
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

    // Fallback hardcoded (plantillas key-based como "ventas")
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
    // Por seguridad, si por algo se cierra el modal a la mitad
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

    const confirmacion = await Swal.fire({
      title: "¿Aplicar plantilla?",
      html: `Se crearán templates de mensajes en tu <strong>Business Manager</strong>, respuestas rapidas, <strong>${plantillaSeleccionada.total_columnas} columnas</strong> y <strong>${plantillaSeleccionada.columnas_ia} asistentes de IA</strong> para <strong>${empresa}</strong>.<br><br><small style="color:#64748b">Esto no eliminará columnas existentes.</small>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: BG_DARK,
      confirmButtonText: "Sí, aplicar",
      cancelButtonText: "Cancelar",
      customClass: { container: "swal-over-modal" },
    });
    if (!confirmacion.isConfirmed) return;

    // Reseteamos estado de animación y arrancamos
    abortRef.current = false;
    setStageIndex(0);
    setPaso(3);

    const startTime = Date.now();

    // Timer que avanza las etapas cada STAGE_DURATION_MS
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

      // La API respondió → revisamos si viene con success o error semántico
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

      // API OK → aseguramos que hayan pasado mínimo 45s para la animación
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_TOTAL_MS) {
        const waitMs = MIN_TOTAL_MS - elapsed;
        await new Promise((resolve) => {
          const t = setTimeout(resolve, waitMs);
          // Si se aborta mientras esperamos, resolvemos igual para no colgar.
          // (No debería abortarse después de un success, pero por seguridad.)
          return () => clearTimeout(t);
        });
      }

      if (abortRef.current) return; // por si cerró el modal mientras esperábamos

      if (stageTimerRef.current) {
        clearInterval(stageTimerRef.current);
        stageTimerRef.current = null;
      }
      setStageIndex(STAGES.length - 1);
      setResultado(data.data || []);
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

  // Stage activo (seguro para índices fuera de rango)
  const currentStage = STAGES[Math.min(stageIndex, STAGES.length - 1)];

  return (
    <>
      <style>{`
        @keyframes pk-fadeIn {
          from{opacity:0;transform:scale(.97) translateY(6px)}
          to{opacity:1;transform:scale(1) translateY(0)}
        }
        @keyframes pk-overlayIn{from{opacity:0}to{opacity:1}}
        @keyframes pk-spin{to{transform:rotate(360deg)}}
        @keyframes pk-pulse {
          0%,100% { transform: scale(1); opacity: 1; }
          50%     { transform: scale(1.08); opacity: .9; }
        }
        @keyframes pk-blink {
          0%,100% { opacity: 1; }
          50%     { opacity: .25; }
        }
        @keyframes pk-slideIn {
          from { opacity:0; transform: translateY(8px); }
          to   { opacity:1; transform: translateY(0); }
        }
        .pk-overlay {
          position:fixed;inset:0;
          background:rgba(10,10,20,.55);
          backdrop-filter:blur(4px);
          display:flex;align-items:center;justify-content:center;
          z-index:9999;padding:16px;
          animation:pk-overlayIn .2s ease;
        }
        .pk-modal {
          background:#fff;border-radius:18px;
          width:100%;max-width:560px;max-height:88vh;
          display:flex;flex-direction:column;
          box-shadow:0 32px 80px rgba(0,0,0,.22);
          animation:pk-fadeIn .25s ease;overflow:hidden;
        }
        .pk-header {
          background:${BG_DARK};
          padding:20px 24px;
          border-radius:18px 18px 0 0;flex-shrink:0;
        }
        .pk-body {
          padding:20px 24px 24px;
          overflow-y:auto;-webkit-overflow-scrolling:touch;
        }
        .pk-card {
          border-radius:14px;border:2px solid #e5e7eb;
          padding:18px;cursor:pointer;
          transition:all .15s;background:#fafafa;
          display:flex;align-items:flex-start;gap:14px;
          margin-bottom:10px;
        }
        .pk-card:hover {
          border-color:#6366f1;background:rgba(99,102,241,.03);
          transform:translateY(-1px);box-shadow:0 4px 14px rgba(99,102,241,.1);
        }
        .pk-card.selected {
          border-color:#6366f1;background:rgba(99,102,241,.04);
        }
        .pk-trigger-btn {
          display:inline-flex;align-items:center;gap:8px;
          padding:8px 16px;border-radius:12px;
          border:1.5px solid rgba(99,102,241,.3);
          background:rgba(99,102,241,.06);
          color:#4338ca;font-size:.82rem;font-weight:700;
          cursor:pointer;transition:all .18s;white-space:nowrap;
          font-family:inherit;
        }
        .pk-trigger-btn:hover {
          background:rgba(99,102,241,.12);
          border-color:rgba(99,102,241,.6);
          box-shadow:0 3px 12px rgba(99,102,241,.2);
          transform:translateY(-1px);
        }
        .pk-input {
          width:100%;padding:10px 14px;border-radius:11px;
          border:1.5px solid #e5e7eb;background:#f9fafb;
          font-size:.875rem;color:#111827;outline:none;
          transition:border-color .2s;font-family:inherit;
          box-sizing:border-box;
        }
        .pk-input:focus {
          border-color:#6366f1;
          box-shadow:0 0 0 3px rgba(99,102,241,.1);
          background:#fff;
        }
        .pk-btn-primary {
          display:inline-flex;align-items:center;gap:8px;
          padding:11px 22px;border-radius:12px;border:none;
          background:${BG_DARK};color:#fff;
          font-weight:700;font-size:.875rem;cursor:pointer;
          transition:all .2s;font-family:inherit;
          box-shadow:0 4px 14px rgba(23,25,49,.25);
        }
        .pk-btn-primary:hover:not(:disabled) {
          background:rgb(35,38,68);transform:translateY(-1px);
        }
        .pk-btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none;}
        .pk-btn-secondary {
          padding:11px 18px;border-radius:12px;
          border:1.5px solid #e5e7eb;background:#fff;
          color:#374151;font-weight:600;font-size:.875rem;
          cursor:pointer;transition:all .15s;font-family:inherit;
        }
        .pk-btn-secondary:hover{background:#f9fafb;border-color:#d1d5db;}
        .pk-close-btn {
          width:28px;height:28px;border-radius:8px;
          border:1px solid rgba(255,255,255,.15);
          background:rgba(255,255,255,.08);
          color:rgba(255,255,255,.7);cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          transition:all .15s;font-family:inherit;
        }
        .pk-close-btn:hover{background:rgba(255,255,255,.18);color:#fff;}
        .pk-spinner {
          width:48px;height:48px;border-radius:50%;
          border:4px solid rgba(99,102,241,.2);
          border-top-color:#6366f1;
          animation:pk-spin .8s linear infinite;
          margin:0 auto;
        }
        .pk-col-badge {
          display:inline-flex;align-items:center;gap:5px;
          padding:3px 10px;border-radius:999px;
          font-size:.72rem;font-weight:700;
        }
        .swal-over-modal { z-index: 99999 !important; }
      `}</style>

      {/* Botón disparador */}
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
            {/* Header */}
            <div className="pk-header">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(255,255,255,.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i
                      className="bx bx-layout"
                      style={{ fontSize: 20, color: "#fff" }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: ".65rem",
                        color: "rgba(255,255,255,.4)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: ".07em",
                      }}
                    >
                      Configuración rápida
                    </div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: "#fff",
                        lineHeight: 1.2,
                      }}
                    >
                      Plantillas de Kanban
                    </h2>
                  </div>
                </div>
                {paso !== 3 && (
                  <button
                    className="pk-close-btn"
                    type="button"
                    onClick={cerrarModal}
                  >
                    <i className="bx bx-x" style={{ fontSize: 16 }} />
                  </button>
                )}
              </div>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: ".76rem",
                  color: "rgba(255,255,255,.5)",
                  lineHeight: 1.5,
                }}
              >
                Aplica un diseño predefinido con columnas, asistentes de IA y
                acciones ya configurados.
              </p>

              {/* Steps */}
              {paso <= 2 && (
                <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
                  {["Elegir diseño", "Personalizar", "Listo"].map((s, i) => (
                    <div
                      key={i}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background:
                            paso > i + 1
                              ? "#22c55e"
                              : paso === i + 1
                                ? "#fff"
                                : "rgba(255,255,255,.2)",
                          color:
                            paso > i + 1
                              ? "#fff"
                              : paso === i + 1
                                ? BG_DARK
                                : "rgba(255,255,255,.5)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: ".72rem",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {paso > i + 1 ? (
                          <i className="bx bx-check" style={{ fontSize: 13 }} />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: ".72rem",
                          color:
                            paso === i + 1 ? "#fff" : "rgba(255,255,255,.45)",
                          fontWeight: paso === i + 1 ? 700 : 400,
                        }}
                      >
                        {s}
                      </span>
                      {i < 2 && (
                        <div
                          style={{
                            width: 20,
                            height: 1,
                            background: "rgba(255,255,255,.15)",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="pk-body">
              {/* PASO 1 — Catálogo de plantillas */}
              {paso === 1 && (
                <>
                  {loading ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "30px 0",
                        color: "#94a3b8",
                      }}
                    >
                      <div
                        className="pk-spinner"
                        style={{
                          width: 32,
                          height: 32,
                          borderWidth: 3,
                          margin: "0 auto 10px",
                        }}
                      />
                      <div style={{ fontSize: ".85rem" }}>
                        Cargando plantillas...
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                      }}
                    >
                      {plantillas.map((p) => {
                        const meta =
                          p.tipo === "global"
                            ? {
                                icon: p.icono || "bx bx-layout",
                                color: p.color || "#6366f1",
                                bg: `${p.color || "#6366f1"}22`,
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
                            style={{
                              borderRadius: 14,
                              border: "2px solid #e5e7eb",
                              overflow: "hidden",
                              cursor: "pointer",
                              transition: "all .15s",
                              background: "#fff",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#6366f1";
                              e.currentTarget.style.boxShadow =
                                "0 6px 20px rgba(99,102,241,.15)";
                              e.currentTarget.style.transform =
                                "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "#e5e7eb";
                              e.currentTarget.style.boxShadow = "none";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            {/* Preview visual */}
                            <div
                              style={{
                                background:
                                  "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
                                padding: "18px 14px",
                                borderBottom: "1px solid #e5e7eb",
                                position: "relative",
                                overflow: "hidden",
                                minHeight: 110,
                              }}
                            >
                              <div
                                style={{
                                  position: "absolute",
                                  top: -20,
                                  right: -20,
                                  width: 100,
                                  height: 100,
                                  borderRadius: "50%",
                                  background: "rgba(255,255,255,.04)",
                                }}
                              />
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: -30,
                                  left: -10,
                                  width: 80,
                                  height: 80,
                                  borderRadius: "50%",
                                  background: "rgba(255,255,255,.03)",
                                }}
                              />

                              {p.tipo === "global" && (
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    height: 74,
                                    gap: 8,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 48,
                                      height: 48,
                                      borderRadius: 14,
                                      background: `${p.color || "#6366f1"}25`,
                                      border: `1px solid ${p.color || "#6366f1"}50`,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <i
                                      className={p.icono || "bx bx-layout"}
                                      style={{
                                        fontSize: "1.6rem",
                                        color: p.color || "#6366f1",
                                      }}
                                    />
                                  </div>
                                  <span
                                    style={{
                                      fontSize: ".6rem",
                                      color: "rgba(255,255,255,.5)",
                                      fontWeight: 600,
                                      textTransform: "uppercase",
                                      letterSpacing: ".06em",
                                    }}
                                  >
                                    Plantilla personalizada
                                  </span>
                                </div>
                              )}

                              {p.key === "ventas" && (
                                <>
                                  <div
                                    style={{
                                      fontSize: ".6rem",
                                      color: "rgba(255,255,255,.45)",
                                      fontWeight: 700,
                                      textTransform: "uppercase",
                                      letterSpacing: ".08em",
                                      marginBottom: 10,
                                    }}
                                  >
                                    Flujo de ventas
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                  >
                                    {[
                                      {
                                        icon: "bx bx-phone",
                                        label: "Contacto",
                                        color: "#60a5fa",
                                        bg: "rgba(96,165,250,.15)",
                                      },
                                      {
                                        icon: "bx bx-bot",
                                        label: "IA Ventas",
                                        color: "#4ade80",
                                        bg: "rgba(74,222,128,.15)",
                                      },
                                      {
                                        icon: "bx bx-cart",
                                        label: "Guía",
                                        color: "#fbbf24",
                                        bg: "rgba(251,191,36,.15)",
                                      },
                                      {
                                        icon: "bx bx-send",
                                        label: "Envío",
                                        color: "#a78bfa",
                                        bg: "rgba(167,139,250,.15)",
                                      },
                                    ].map((step, i, arr) => (
                                      <React.Fragment key={i}>
                                        <div
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 4,
                                            flex: 1,
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: 32,
                                              height: 32,
                                              borderRadius: 9,
                                              background: step.bg,
                                              border: `1px solid ${step.color}40`,
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                            }}
                                          >
                                            <i
                                              className={step.icon}
                                              style={{
                                                fontSize: "1rem",
                                                color: step.color,
                                              }}
                                            />
                                          </div>
                                          <span
                                            style={{
                                              fontSize: ".52rem",
                                              color: "rgba(255,255,255,.55)",
                                              fontWeight: 600,
                                              textAlign: "center",
                                            }}
                                          >
                                            {step.label}
                                          </span>
                                        </div>
                                        {i < arr.length - 1 && (
                                          <div
                                            style={{
                                              color: "rgba(255,255,255,.2)",
                                              fontSize: ".7rem",
                                              flexShrink: 0,
                                              marginBottom: 14,
                                            }}
                                          >
                                            →
                                          </div>
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 6,
                                      marginTop: 10,
                                    }}
                                  >
                                    <div
                                      style={{
                                        flex: 1,
                                        padding: "4px 8px",
                                        borderRadius: 6,
                                        background: "rgba(74,222,128,.1)",
                                        border: "1px solid rgba(74,222,128,.2)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                    >
                                      <i
                                        className="bx bx-trending-up"
                                        style={{
                                          color: "#4ade80",
                                          fontSize: ".75rem",
                                        }}
                                      />
                                      <span
                                        style={{
                                          fontSize: ".58rem",
                                          color: "rgba(255,255,255,.6)",
                                          fontWeight: 600,
                                        }}
                                      >
                                        COD / Dropshipping
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        flex: 1,
                                        padding: "4px 8px",
                                        borderRadius: 6,
                                        background: "rgba(96,165,250,.1)",
                                        border: "1px solid rgba(96,165,250,.2)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                    >
                                      <i
                                        className="bx bx-radar"
                                        style={{
                                          color: "#60a5fa",
                                          fontSize: ".75rem",
                                        }}
                                      />
                                      <span
                                        style={{
                                          fontSize: ".58rem",
                                          color: "rgba(255,255,255,.6)",
                                          fontWeight: 600,
                                        }}
                                      >
                                        Remarketing IA
                                      </span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Info plantilla */}
                            <div style={{ padding: "12px 14px" }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  marginBottom: 5,
                                }}
                              >
                                <div
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 8,
                                    background: meta.bg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <i
                                    className={meta.icon}
                                    style={{
                                      fontSize: "1rem",
                                      color: meta.color,
                                    }}
                                  />
                                </div>
                                <div
                                  style={{
                                    fontWeight: 800,
                                    fontSize: ".88rem",
                                    color: "#0f172a",
                                  }}
                                >
                                  {p.nombre}
                                </div>
                              </div>
                              <div
                                style={{
                                  fontSize: ".73rem",
                                  color: "#64748b",
                                  lineHeight: 1.5,
                                  marginBottom: 8,
                                }}
                              >
                                {p.descripcion}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 5,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: ".62rem",
                                    fontWeight: 700,
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    borderRadius: 999,
                                    padding: "2px 7px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                >
                                  <i
                                    className="bx bx-columns"
                                    style={{ fontSize: 10 }}
                                  />
                                  {p.total_columnas} columnas
                                </span>
                                <span
                                  style={{
                                    fontSize: ".62rem",
                                    fontWeight: 700,
                                    background: "#f0fdf4",
                                    color: "#15803d",
                                    borderRadius: 999,
                                    padding: "2px 7px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                >
                                  <i
                                    className="bx bx-bot"
                                    style={{ fontSize: 10 }}
                                  />
                                  {p.columnas_ia} con IA
                                </span>
                                {p.tipo === "global" && (
                                  <span
                                    style={{
                                      fontSize: ".62rem",
                                      fontWeight: 700,
                                      background: "#fef3c7",
                                      color: "#92400e",
                                      borderRadius: 999,
                                      padding: "2px 7px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 3,
                                    }}
                                  >
                                    <i
                                      className="bx bx-globe"
                                      style={{ fontSize: 10 }}
                                    />
                                    Global
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Footer acción */}
                            <div
                              style={{
                                padding: "9px 14px",
                                borderTop: "1px solid #f1f5f9",
                                background: "#fafafa",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: ".72rem",
                                  color: "#6366f1",
                                  fontWeight: 600,
                                }}
                              >
                                Usar esta plantilla
                              </span>
                              <i
                                className="bx bx-right-arrow-alt"
                                style={{ color: "#6366f1", fontSize: "1.1rem" }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* PASO 2 — Personalizar */}
              {paso === 2 && plantillaSeleccionada && (
                <>
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "rgba(99,102,241,.04)",
                      border: "1.5px solid rgba(99,102,241,.15)",
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: ".85rem",
                        color: "#4338ca",
                        marginBottom: 2,
                      }}
                    >
                      <i
                        className="bx bx-check-circle"
                        style={{ marginRight: 6 }}
                      />
                      Plantilla seleccionada: {plantillaSeleccionada.nombre}
                    </div>
                    <div style={{ fontSize: ".75rem", color: "#6366f1" }}>
                      {plantillaSeleccionada.total_columnas} columnas ·{" "}
                      {plantillaSeleccionada.columnas_ia} asistentes IA
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: ".8rem",
                        fontWeight: 700,
                        color: "#374151",
                        marginBottom: 6,
                      }}
                    >
                      Nombre de tu empresa *
                    </label>
                    <input
                      className="pk-input"
                      placeholder="Ej: Imporfactory, Mi Tienda Online..."
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") aplicarPlantilla();
                      }}
                    />
                    <div
                      style={{
                        fontSize: ".72rem",
                        color: "#94a3b8",
                        marginTop: 5,
                      }}
                    >
                      Se usará para personalizar los prompts de los asistentes.
                    </div>
                  </div>

                  {/* Preview columnas — ahora dinámico */}
                  {columnasParaMostrar.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div
                        style={{
                          fontSize: ".75rem",
                          fontWeight: 700,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                          letterSpacing: ".06em",
                          marginBottom: 10,
                        }}
                      >
                        Columnas que se crearán
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {columnasParaMostrar.map((col, i) => (
                          <div
                            key={`${col.estado}-${i}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "8px 12px",
                              borderRadius: 10,
                              border: "1px solid rgba(0,0,0,.06)",
                              background: "#fafafa",
                            }}
                          >
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                background: col.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <i
                                className={col.icono}
                                style={{ color: col.texto, fontSize: ".9rem" }}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span
                                style={{
                                  fontWeight: 600,
                                  fontSize: ".82rem",
                                  color: "#0f172a",
                                }}
                              >
                                {col.nombre}
                              </span>
                              {col.estado && (
                                <span
                                  style={{
                                    fontSize: ".7rem",
                                    color: "#94a3b8",
                                    fontFamily: "monospace",
                                    marginLeft: 8,
                                  }}
                                >
                                  {col.estado}
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                              {col.ia && (
                                <span
                                  style={{
                                    fontSize: ".62rem",
                                    background: "#dcfce7",
                                    color: "#16a34a",
                                    borderRadius: 999,
                                    padding: "1px 6px",
                                    fontWeight: 700,
                                  }}
                                >
                                  IA
                                </span>
                              )}
                              {col.final && (
                                <span
                                  style={{
                                    fontSize: ".62rem",
                                    background: "#fef3c7",
                                    color: "#d97706",
                                    borderRadius: 999,
                                    padding: "1px 6px",
                                    fontWeight: 700,
                                  }}
                                >
                                  FINAL
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      padding: "11px 14px",
                      borderRadius: 10,
                      background: "#fef3c7",
                      border: "1px solid #fde68a",
                      fontSize: ".78rem",
                      color: "#92400e",
                      marginBottom: 20,
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    <i
                      className="bx bx-info-circle"
                      style={{ fontSize: "1rem", flexShrink: 0, marginTop: 1 }}
                    />
                    <span>
                      Después de aplicar la plantilla, ve a cada columna →
                      pestaña <strong>Asistente</strong> para subir el catálogo
                      de productos y activar el catálogo.
                    </span>
                  </div>

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
                      />{" "}
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

              {/* PASO 3 — Aplicando (animación bonita 45s) */}
              {paso === 3 && (
                <div style={{ padding: "14px 4px 4px" }}>
                  {/* Icono central grande animado */}
                  <div style={{ textAlign: "center", marginBottom: 22 }}>
                    <div
                      key={
                        stageIndex
                      } /* fuerza re-mount para animar al cambiar de etapa */
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 96,
                        height: 96,
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
                          fontSize: "2.6rem",
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

                  {/* Título y descripción de la etapa actual */}
                  <div
                    key={`txt-${stageIndex}`}
                    style={{
                      textAlign: "center",
                      marginBottom: 18,
                      animation: "pk-slideIn .35s ease",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "1.02rem",
                        color: "#0f172a",
                        marginBottom: 6,
                      }}
                    >
                      {currentStage.title}
                    </div>
                    <div
                      style={{
                        fontSize: ".82rem",
                        color: "#64748b",
                        lineHeight: 1.55,
                        padding: "0 8px",
                      }}
                    >
                      {currentStage.desc}
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div
                    style={{
                      height: 6,
                      borderRadius: 999,
                      background: "#f1f5f9",
                      overflow: "hidden",
                      marginBottom: 20,
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

                  {/* Lista de etapas */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
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
                            padding: "7px 12px",
                            borderRadius: 10,
                            background: current
                              ? `${s.color}0A`
                              : done
                                ? "#f0fdf4"
                                : "#fafafa",
                            border: `1px solid ${
                              current
                                ? `${s.color}40`
                                : done
                                  ? "#bbf7d0"
                                  : "#e5e7eb"
                            }`,
                            transition: "all .3s ease",
                          }}
                        >
                          <div
                            style={{
                              width: 24,
                              height: 24,
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
                                style={{ fontSize: 14, color: "#fff" }}
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
                                  fontSize: ".68rem",
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
                              fontSize: ".82rem",
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
                      marginTop: 18,
                      fontSize: ".72rem",
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

              {/* PASO 4 — Éxito */}
              {paso === 4 && (
                <>
                  <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "#dcfce7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 14px",
                      }}
                    >
                      <i
                        className="bx bx-check"
                        style={{ fontSize: "2rem", color: "#16a34a" }}
                      />
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "1.1rem",
                        color: "#0f172a",
                        marginBottom: 6,
                      }}
                    >
                      ¡Plantilla aplicada!
                    </div>
                    <div style={{ fontSize: ".83rem", color: "#64748b" }}>
                      Se crearon {resultado.length} columnas correctamente.
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      marginBottom: 20,
                    }}
                  >
                    {resultado.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 14px",
                          borderRadius: 10,
                          background: r.omitida ? "#fafafa" : "#f0fdf4",
                          border: `1px solid ${r.omitida ? "#e5e7eb" : "#bbf7d0"}`,
                        }}
                      >
                        <i
                          className={
                            r.omitida
                              ? "bx bx-minus-circle"
                              : "bx bx-check-circle"
                          }
                          style={{
                            color: r.omitida ? "#94a3b8" : "#16a34a",
                            fontSize: "1.1rem",
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: ".82rem",
                              color: r.omitida ? "#64748b" : "#166534",
                            }}
                          >
                            {r.columna}
                          </span>
                          {r.omitida && (
                            <span
                              style={{
                                fontSize: ".7rem",
                                color: "#94a3b8",
                                marginLeft: 8,
                              }}
                            >
                              ya existe
                            </span>
                          )}
                          {!r.omitida && r.assistant_id && (
                            <span
                              style={{
                                fontSize: ".7rem",
                                color: "#15803d",
                                marginLeft: 8,
                                fontFamily: "monospace",
                              }}
                            >
                              IA ✓
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      fontSize: ".78rem",
                      color: "#1e40af",
                      marginBottom: 20,
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <i
                      className="bx bx-bulb"
                      style={{ fontSize: "1rem", flexShrink: 0 }}
                    />
                    <span>
                      Próximo paso: ve a{" "}
                      <strong>
                        IA VENTAS → Asistente → Catálogo de productos
                      </strong>{" "}
                      para subir tu catálogo y activarlo.
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button className="pk-btn-primary" onClick={cerrarModal}>
                      <i className="bx bx-check" style={{ fontSize: 15 }} />
                      Entendido
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
