import React, { useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const TIEMPOS = [
  { value: "1", label: "1 hora", desc: "Seguimiento rápido" },
  { value: "3", label: "3 horas", desc: "Leads calientes" },
  { value: "5", label: "5 horas", desc: "Recomendado" },
  { value: "10", label: "10 horas", desc: "Moderado" },
  { value: "20", label: "20 horas", desc: "Al día siguiente" },
];

const BG_DARK = "rgb(23, 25, 49)";

const RemarketingIaVentas = ({ id_configuracion }) => {
  const [showModal, setShowModal] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState("");
  const [tiempoRemarketing, setTiempoRemarketing] = useState("0");
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [configActiva, setConfigActiva] = useState(false);

  const fetchPlantillas = async () => {
    if (!id_configuracion) return;
    setLoadingPlantillas(true);
    try {
      const res = await chatApi.post(
        "whatsapp_managment/obtenerTemplatesWhatsapp",
        { id_configuracion },
      );
      const data = res.data?.data || [];
      const unicas = data.filter(
        (tpl, i, self) => i === self.findIndex((t) => t.id === tpl.id),
      );
      setPlantillas(unicas);
    } catch (e) {
      console.error(e);
      setPlantillas([]);
    } finally {
      setLoadingPlantillas(false);
    }
  };

  const handleAbrir = async () => {
    setShowModal(true);
    setLoadingConfig(true);
    fetchPlantillas();
    try {
      const res = await chatApi.post("openai_assistants/obtener_remarketing", {
        id_configuracion,
        estado_contacto: "ia_ventas",
      });
      const config = res.data?.data;
      if (config) {
        setTiempoRemarketing(String(config.tiempo_espera_horas ?? "0"));
        setPlantillaSeleccionada(config.nombre_template ?? "");
        setConfigActiva(true);
      } else {
        setTiempoRemarketing("0");
        setPlantillaSeleccionada("");
        setConfigActiva(false);
      }
    } catch (e) {
      console.error("Error cargando config de remarketing:", e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const cerrarModal = () => setShowModal(false);

  const handleGuardar = async () => {
    if (!plantillaSeleccionada || tiempoRemarketing === "0") {
      Toast.fire({
        icon: "warning",
        title: "Seleccione una plantilla y un tiempo",
      });
      return;
    }
    setGuardando(true);
    try {
      await chatApi.post("openai_assistants/configurar_remarketing", {
        id_configuracion,
        estado_contacto: "ia_ventas",
        tiempo_espera_horas: Number(tiempoRemarketing),
        nombre_template: plantillaSeleccionada,
        language_code: "es",
      });
      Toast.fire({
        icon: "success",
        title: configActiva
          ? "Remarketing actualizado correctamente"
          : "Remarketing activado correctamente",
      });
      setConfigActiva(true);
      setShowModal(false);
    } catch (e) {
      console.error(e);
      Toast.fire({ icon: "error", title: "Error al guardar la configuración" });
    } finally {
      setGuardando(false);
    }
  };

  const tiempoSeleccionado = TIEMPOS.find((t) => t.value === tiempoRemarketing);
  const plantillaObj = plantillas.find((p) => p.name === plantillaSeleccionada);
  const formularioListo =
    tiempoRemarketing !== "0" && plantillaSeleccionada !== "";

  return (
    <>
      <style>{`
        @keyframes rm-fadeIn {
          from { opacity:0; transform:scale(.97) translateY(6px); }
          to   { opacity:1; transform:scale(1)   translateY(0);   }
        }
        @keyframes rm-overlayIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes rm-pulse-dot {
          0%,100% { transform:scale(1);   opacity:1;  }
          50%      { transform:scale(1.5); opacity:.5; }
        }
        @keyframes rm-shimmer {
          0%   { background-position:-400px 0; }
          100% { background-position: 400px 0; }
        }
        .rm-skeleton {
          background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
          background-size:400px 100%;
          animation:rm-shimmer 1.4s infinite;
          border-radius:10px;
        }

        .rm-trigger-btn {
          display:inline-flex; align-items:center; gap:6px;
          padding:5px 12px; border-radius:999px;
          border:1px solid rgba(99,102,241,.35);
          background:rgba(99,102,241,.07);
          color:#4338ca; font-size:.74rem; font-weight:600;
          cursor:pointer; transition:all .18s ease; white-space:nowrap;
          font-family:inherit;
        }
        .rm-trigger-btn:hover {
          background:rgba(99,102,241,.15);
          border-color:rgba(99,102,241,.6);
          box-shadow:0 2px 10px rgba(99,102,241,.18);
          transform:translateY(-1px);
        }
        .rm-dot {
          width:6px; height:6px; border-radius:50%;
          background:#22c55e;
          animation:rm-pulse-dot 2s infinite;
          box-shadow:0 0 0 2px rgba(34,197,94,.2);
        }

        .rm-overlay {
          position:fixed; inset:0;
          background:rgba(10,10,20,.6);
          backdrop-filter:blur(4px);
          display:flex; align-items:center; justify-content:center;
          z-index:9999; padding:16px;
          animation:rm-overlayIn .2s ease;
        }
.rm-modal {
  background: #ffffff;
  border-radius: 16px;          /* ← pequeño en las 4 esquinas */
  width: 100%; max-width: 500px;
  max-height: 90vh;             /* ← límite de altura */
  display: flex;
  flex-direction: column;       /* ← para que header quede fijo */
  box-shadow: 0 32px 80px rgba(0,0,0,.22), 0 0 0 1px rgba(0,0,0,.07);
  animation: rm-fadeIn .25s ease;
  overflow: hidden;
}

.rm-modal-header {
  background: ${BG_DARK};
  padding: 24px 24px 20px;
  position: relative; overflow: hidden;
  border-radius: 16px 16px 0 0;  /* ← coincide con el modal, tapa el blanco */
  flex-shrink: 0;                 /* ← no se comprime */
}

        .rm-flow-diagram {
          display:flex; align-items:center; gap:6px;
          padding:10px 14px;
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.08);
          border-radius:12px; margin-top:14px;
        }
        .rm-flow-node {
          display:flex; flex-direction:column; align-items:center; gap:3px;
          font-size:.67rem; color:rgba(255,255,255,.6); text-align:center;
          min-width:52px;
        }
        .rm-flow-node .fn-icon {
          width:30px; height:30px; border-radius:8px;
          background:rgba(255,255,255,.1);
          display:flex; align-items:center; justify-content:center;
          font-size:14px; color:#fff;
        }
        .rm-flow-arrow { color:rgba(255,255,255,.22); flex:1; text-align:center; font-size:.85rem; }

      .rm-modal-body {
  padding: 22px 24px 24px;
  overflow-y: auto;              /* ← scroll solo en el body */
  -webkit-overflow-scrolling: touch;
}

        .rm-step {
          display:flex; flex-direction:column; gap:10px;
          padding:14px 16px; border-radius:14px;
          border:1.5px solid #e5e7eb; background:#fafafa;
          margin-bottom:10px;
        }
        .rm-step.done { border-color:rgba(23,25,49,.2); background:rgba(23,25,49,.03); }
        .rm-step-header { display:flex; align-items:center; gap:12px; }
        .rm-step-num {
          min-width:26px; height:26px; border-radius:50%;
          background:#e5e7eb; color:#6b7280;
          display:flex; align-items:center; justify-content:center;
          font-size:.72rem; font-weight:700; flex-shrink:0;
          transition:background .2s, color .2s;
        }
        .rm-step.done .rm-step-num { background:${BG_DARK}; color:#fff; }

        .rm-time-grid {
          display:grid; grid-template-columns:repeat(5,1fr); gap:7px;
        }
        .rm-time-chip {
          display:flex; flex-direction:column; align-items:center;
          padding:9px 4px; border-radius:10px;
          border:1.5px solid #e5e7eb; background:#f9fafb;
          cursor:pointer; transition:all .15s ease; text-align:center;
        }
        .rm-time-chip:hover { border-color:rgba(23,25,49,.3); background:rgba(23,25,49,.04); }
        .rm-time-chip.sel {
          border-color:${BG_DARK};
          background:rgba(23,25,49,.06);
          box-shadow:0 0 0 3px rgba(23,25,49,.08);
        }
        .rm-time-chip .tl { font-size:.8rem; font-weight:700; color:#111827; }
        .rm-time-chip .ts { font-size:.63rem; color:#6b7280; margin-top:2px; line-height:1.2; }
        .rm-time-chip.sel .tl { color:${BG_DARK}; }

        .rm-select {
          width:100%; padding:10px 14px; border-radius:11px;
          border:1.5px solid #e5e7eb; background:#f9fafb;
          font-size:.875rem; color:#111827; outline:none;
          transition:border-color .2s, box-shadow .2s;
          appearance:none;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat:no-repeat;
          background-position:right 12px center;
          padding-right:36px; cursor:pointer; font-family:inherit;
        }
        .rm-select:focus {
          border-color:${BG_DARK};
          box-shadow:0 0 0 3px rgba(23,25,49,.1);
          background-color:#fff;
        }

        /* Estado plantilla — sin texto justificado, limpio */
        .rm-plantilla-ok {
          display:flex; align-items:center; gap:10px;
          padding:10px 13px; border-radius:10px; margin-top:6px;
          background:#f0fdf4; border:1.5px solid #bbf7d0;
        }
        .rm-plantilla-warn {
          display:flex; align-items:center; gap:10px;
          padding:10px 13px; border-radius:10px; margin-top:6px;
          background:#fffbeb; border:1.5px solid #fde68a;
        }
        .rm-ps-dot {
          width:8px; height:8px; border-radius:50%; flex-shrink:0;
        }
        .rm-ps-text { font-size:.78rem; line-height:1.45; }
        .rm-ps-text strong { font-weight:700; }

        .rm-summary {
          display:flex; gap:10px; align-items:flex-start;
          padding:12px 14px; border-radius:12px; margin-bottom:4px;
          background:rgba(23,25,49,.04);
          border:1.5px solid rgba(23,25,49,.11);
        }

        .rm-btn-save {
          display:inline-flex; align-items:center; gap:8px;
          padding:11px 22px; border-radius:12px; border:none;
          background:${BG_DARK};
          color:#fff; font-weight:700; font-size:.875rem;
          cursor:pointer; transition:all .2s ease;
          box-shadow:0 4px 14px rgba(23,25,49,.25); font-family:inherit;
        }
        .rm-btn-save:hover:not(:disabled) {
          transform:translateY(-2px);
          box-shadow:0 8px 22px rgba(23,25,49,.35);
          background:rgb(35,38,68);
        }
        .rm-btn-save:disabled { opacity:.5; cursor:not-allowed; transform:none; }

        .rm-btn-cancel {
          padding:11px 18px; border-radius:12px;
          border:1.5px solid #e5e7eb; background:#fff;
          color:#374151; font-weight:600; font-size:.875rem;
          cursor:pointer; transition:all .15s ease; font-family:inherit;
        }
        .rm-btn-cancel:hover { background:#f9fafb; border-color:#d1d5db; }

        .rm-close-btn {
          width:30px; height:30px; border-radius:8px;
          border:1px solid rgba(255,255,255,.15);
          background:rgba(255,255,255,.08);
          color:rgba(255,255,255,.7); cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0; transition:all .15s; font-family:inherit;
        }
        .rm-close-btn:hover { background:rgba(255,255,255,.18); color:#fff; }
      `}</style>

      {/* ── Botón disparador ── */}
      <button className="rm-trigger-btn" type="button" onClick={handleAbrir}>
        {configActiva && <span className="rm-dot" />}
        <i className="bx bx-radar" style={{ fontSize: "13px" }} />
        Remarketing
        {configActiva && (
          <span style={{ fontSize: ".64rem", opacity: 0.7, fontWeight: 500 }}>
            • Activo
          </span>
        )}
      </button>

      {/* ── Modal ── */}
      {showModal && (
        <div
          className="rm-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >
          <div className="rm-modal">
            {/* Header oscuro */}
            <div className="rm-modal-header">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        background: "rgba(255,255,255,.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <i
                        className="bx bx-radar"
                        style={{ fontSize: 18, color: "#fff" }}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: ".66rem",
                          color: "rgba(255,255,255,.42)",
                          fontWeight: 600,
                          letterSpacing: ".07em",
                          textTransform: "uppercase",
                        }}
                      >
                        Automatización
                      </div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          color: "#fff",
                          lineHeight: 1.2,
                        }}
                      >
                        Remarketing IA Ventas
                      </h2>
                    </div>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: ".77rem",
                      color: "rgba(255,255,255,.52)",
                      maxWidth: 340,
                      lineHeight: 1.55,
                    }}
                  >
                    Recupera clientes que no respondieron enviándoles un mensaje
                    automático tras el tiempo que definas.
                  </p>
                </div>

                {/* Botón cerrar — funciona con cerrarModal() */}
                <button
                  className="rm-close-btn"
                  type="button"
                  onClick={cerrarModal}
                >
                  <i className="bx bx-x" style={{ fontSize: 18 }} />
                </button>
              </div>

              {/* Diagrama de flujo */}
              <div className="rm-flow-diagram">
                {[
                  {
                    icon: "bx-message-dots",
                    label: "Cliente\nescribe",
                    bg: null,
                    color: "#fff",
                  },
                  {
                    icon: "bx-bot",
                    label: "IA\nresponde",
                    bg: null,
                    color: "#fff",
                  },
                  {
                    icon: "bx-time",
                    label: "Sin\nrespuesta",
                    bg: "rgba(251,191,36,.15)",
                    color: "#fbbf24",
                  },
                  {
                    icon: "bx-send",
                    label: "Auto\nenvío",
                    bg: "rgba(34,197,94,.15)",
                    color: "#4ade80",
                  },
                  {
                    icon: "bxs-zap",
                    label: "Lead\nreactivado",
                    bg: "rgba(255,255,255,.12)",
                    color: "#e2e8f0",
                  },
                ].reduce((acc, node, i, arr) => {
                  acc.push(
                    <div className="rm-flow-node" key={i}>
                      <div
                        className="fn-icon"
                        style={node.bg ? { background: node.bg } : {}}
                      >
                        <i
                          className={`bx ${node.icon}`}
                          style={{ color: node.color }}
                        />
                      </div>
                      <span style={{ whiteSpace: "pre-line" }}>
                        {node.label}
                      </span>
                    </div>,
                  );
                  if (i < arr.length - 1)
                    acc.push(
                      <div className="rm-flow-arrow" key={`a${i}`}>
                        →
                      </div>,
                    );
                  return acc;
                }, [])}
              </div>
            </div>

            {/* Body */}
            <div className="rm-modal-body">
              {loadingConfig ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div className="rm-skeleton" style={{ height: 68 }} />
                  <div className="rm-skeleton" style={{ height: 68 }} />
                </div>
              ) : (
                <>
                  {/* Paso 1 — Tiempo */}
                  <div
                    className={`rm-step ${tiempoRemarketing !== "0" ? "done" : ""}`}
                  >
                    <div className="rm-step-header">
                      <div className="rm-step-num">
                        {tiempoRemarketing !== "0" ? (
                          <i className="bx bx-check" style={{ fontSize: 13 }} />
                        ) : (
                          "1"
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: ".85rem",
                            color: "#111827",
                          }}
                        >
                          ¿Cuánto tiempo esperar antes de recontactar?
                        </div>
                        <div
                          style={{
                            fontSize: ".74rem",
                            color: "#6b7280",
                            marginTop: 2,
                          }}
                        >
                          Si el cliente no responde en este lapso, se enviará el
                          mensaje de forma automática.
                        </div>
                      </div>
                      {tiempoRemarketing !== "0" && (
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 999,
                            background: "rgba(23,25,49,.08)",
                            color: BG_DARK,
                            fontSize: ".72rem",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {tiempoSeleccionado?.label}
                        </span>
                      )}
                    </div>
                    <div className="rm-time-grid">
                      {TIEMPOS.map((t) => (
                        <div
                          key={t.value}
                          className={`rm-time-chip ${tiempoRemarketing === t.value ? "sel" : ""}`}
                          onClick={() => setTiempoRemarketing(t.value)}
                        >
                          <span className="tl">{t.label}</span>
                          <span className="ts">{t.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Paso 2 — Plantilla */}
                  <div
                    className={`rm-step ${plantillaSeleccionada ? "done" : ""}`}
                  >
                    <div className="rm-step-header">
                      <div className="rm-step-num">
                        {plantillaSeleccionada ? (
                          <i className="bx bx-check" style={{ fontSize: 13 }} />
                        ) : (
                          "2"
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: ".85rem",
                            color: "#111827",
                          }}
                        >
                          ¿Qué mensaje se enviará?
                        </div>
                        <div
                          style={{
                            fontSize: ".74rem",
                            color: "#6b7280",
                            marginTop: 2,
                          }}
                        >
                          Elige una plantilla aprobada por Meta. Solo las
                          activas serán procesadas.
                        </div>
                      </div>
                    </div>

                    {loadingPlantillas ? (
                      <div className="rm-skeleton" style={{ height: 42 }} />
                    ) : (
                      <>
                        <select
                          className="rm-select"
                          value={plantillaSeleccionada}
                          onChange={(e) =>
                            setPlantillaSeleccionada(e.target.value)
                          }
                        >
                          <option value=""> Selecciona una plantilla</option>
                          {plantillas.map((tpl) => (
                            <option key={tpl.id} value={tpl.name}>
                              {tpl.name}
                            </option>
                          ))}
                        </select>

                        {/* Estado de plantilla — punto de color + texto limpio */}
                        {plantillaSeleccionada &&
                          plantillaObj &&
                          (plantillaObj.status === "APPROVED" ? (
                            <div className="rm-plantilla-ok">
                              <span
                                className="rm-ps-dot"
                                style={{ background: "#22c55e" }}
                              />
                              <p
                                className="rm-ps-text"
                                style={{ color: "#15803d", margin: 0 }}
                              >
                                <strong>{plantillaSeleccionada}</strong> está
                                aprobada por Meta y lista para enviar.
                              </p>
                            </div>
                          ) : (
                            <div className="rm-plantilla-warn">
                              <span
                                className="rm-ps-dot"
                                style={{ background: "#f59e0b" }}
                              />
                              <p
                                className="rm-ps-text"
                                style={{ color: "#92400e", margin: 0 }}
                              >
                                <strong>{plantillaSeleccionada}</strong> todavía
                                no tiene aprobación de Meta — no se enviará
                                hasta que sea aprobada.
                              </p>
                            </div>
                          ))}
                      </>
                    )}
                  </div>

                  {/* Resumen final */}
                  {formularioListo && (
                    <div className="rm-summary">
                      <i
                        className="bx bxs-zap"
                        style={{
                          fontSize: 17,
                          color: BG_DARK,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      />
                      <p
                        style={{
                          margin: 0,
                          fontSize: ".78rem",
                          color: BG_DARK,
                          lineHeight: 1.55,
                        }}
                      >
                        Si el cliente no responde en{" "}
                        <strong>{tiempoSeleccionado?.label}</strong>, el sistema
                        enviará automáticamente la plantilla{" "}
                        <strong>"{plantillaSeleccionada}"</strong>.
                      </p>
                    </div>
                  )}

                  {/* Acciones */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 10,
                      marginTop: 16,
                    }}
                  >
                    <button
                      className="rm-btn-cancel"
                      type="button"
                      onClick={cerrarModal}
                    >
                      Cancelar
                    </button>
                    <button
                      className="rm-btn-save"
                      type="button"
                      onClick={handleGuardar}
                      disabled={guardando || !formularioListo}
                    >
                      {guardando ? (
                        <>
                          <i
                            className="bx bx-loader-alt bx-spin"
                            style={{ fontSize: 15 }}
                          />{" "}
                          Guardando...
                        </>
                      ) : configActiva ? (
                        <>
                          <i
                            className="bx bx-refresh"
                            style={{ fontSize: 15 }}
                          />{" "}
                          Actualizar remarketing
                        </>
                      ) : (
                        <>
                          <i className="bx bxs-zap" style={{ fontSize: 15 }} />{" "}
                          Activar remarketing
                        </>
                      )}
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

export default RemarketingIaVentas;
