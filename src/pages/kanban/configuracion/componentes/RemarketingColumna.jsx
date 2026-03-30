// src/page/kanban/configuracion/componentes/RemarketingColumna.jsx
import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../../api/chatcenter";

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

// ─────────────────────────────────────────────────────────────
// Props:
//   id_configuracion  — número
//   estado_db         — string (ej: "contacto_inicial")
//   nombreColumna     — string (ej: "Contacto Inicial") para mostrar en UI
//   columnas          — array de todas las columnas para el select de destino
// ─────────────────────────────────────────────────────────────
const RemarketingColumna = ({
  id_configuracion,
  estado_db,
  nombreColumna,
  columnas = [],
}) => {
  const [showModal, setShowModal] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState("");
  const [tiempoRemarketing, setTiempoRemarketing] = useState("0");
  const [estadoDestino, setEstadoDestino] = useState("");
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [configActiva, setConfigActiva] = useState(false);

  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  const [headerInfo, setHeaderInfo] = useState(null); // { format, url }

  // ── Verificar si hay config activa al cargar ──────────────
  useEffect(() => {
    if (!id_configuracion || !estado_db) return;
    chatApi
      .post("openai_assistants/obtener_remarketing", {
        id_configuracion,
        estado_contacto: estado_db,
      })
      .then((res) => {
        if (res.data?.data) setConfigActiva(true);
      })
      .catch(() => {});
  }, [id_configuracion, estado_db]);

  // ── Cargar plantillas ──────────────────────────────────────
  const fetchPlantillas = async () => {
    setLoadingPlantillas(true);
    try {
      const res = await chatApi.post(
        "whatsapp_managment/obtenerTemplatesWhatsapp",
        { id_configuracion },
      );
      const data = res.data?.data || [];
      setPlantillas(
        data.filter((t, i, s) => i === s.findIndex((x) => x.id === t.id)),
      );
    } catch {
      setPlantillas([]);
    } finally {
      setLoadingPlantillas(false);
    }
  };

  const getTemplateHeaderDefaultUrl = (template) => {
    try {
      const headerComp = template?.components?.find((c) => c.type === "HEADER");
      if (!headerComp) return null;
      const candidates = [
        headerComp?.example?.header_handle?.[0],
        headerComp?.example?.header_url?.[0],
        headerComp?.example?.url?.[0],
        headerComp?.url,
        template?.header_url,
        template?.example?.header_handle?.[0],
      ].filter(Boolean);
      const first = candidates[0];
      if (!first) return null;
      // ✅ decodificar antes de guardar en BD
      return String(first).replace(/&amp;/g, "&");
    } catch {
      return null;
    }
  };

  const handlePlantillaChange = (nombreTemplate) => {
    setPlantillaSeleccionada(nombreTemplate);
    setHeaderMediaUrl("");
    setHeaderInfo(null);

    const tpl = plantillas.find((p) => p.name === nombreTemplate);
    if (!tpl) return;

    const headerComp = tpl?.components?.find((c) => c.type === "HEADER");
    if (!headerComp) return;

    const fmt = String(headerComp.format || "").toUpperCase();
    if (!["IMAGE", "VIDEO", "DOCUMENT"].includes(fmt)) return;

    const url = getTemplateHeaderDefaultUrl(tpl);
    if (url) {
      setHeaderMediaUrl(url);
      setHeaderInfo({ format: fmt, url });
    }
  };

  // ── Abrir modal + cargar config existente ─────────────────
  const handleAbrir = async () => {
    setShowModal(true);
    setLoadingConfig(true);
    fetchPlantillas();
    try {
      const res = await chatApi.post("openai_assistants/obtener_remarketing", {
        id_configuracion,
        estado_contacto: estado_db,
      });
      const config = res.data?.data;
      if (config) {
        setTiempoRemarketing(String(config.tiempo_espera_horas ?? "0"));
        setPlantillaSeleccionada(config.nombre_template ?? "");
        setEstadoDestino(config.estado_destino ?? "");
        setHeaderMediaUrl(config.header_media_url ?? "");

        if (config.header_format && config.header_media_url) {
          setHeaderInfo({
            format: config.header_format,
            url: config.header_media_url,
          });
        } else if (config.header_format && !config.header_media_url) {
          // ← header_format existe pero media_url nunca se guardó en BD
          // headerInfo queda null — handleGuardar lo recuperará de plantillas[]
          setHeaderInfo({ format: config.header_format, url: null });
        }
        setConfigActiva(true);
      } else {
        setTiempoRemarketing("0");
        setPlantillaSeleccionada("");
        setEstadoDestino("");
        setHeaderMediaUrl("");
        setHeaderInfo(null);
        setConfigActiva(false);
      }
    } catch {
      // no hay config aún
    } finally {
      setLoadingConfig(false);
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setHeaderMediaUrl(""); // ✅
    setHeaderInfo(null); // ✅
  };

  // ── Guardar ───────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!plantillaSeleccionada || tiempoRemarketing === "0") {
      Toast.fire({ icon: "warning", title: "Seleccione plantilla y tiempo" });
      return;
    }

    // ── Fuente 1: lo que el usuario cambió en el select (handlePlantillaChange)
    let headerFormatFinal = headerInfo?.format || null;
    let headerMediaUrlFinal = headerMediaUrl || null;
    let headerMediaNameFinal = null;

    // ── Fuente 2: si no hay nada en estado, buscar en el array de plantillas cargadas
    if (!headerFormatFinal || !headerMediaUrlFinal) {
      const tplObj = plantillas.find((p) => p.name === plantillaSeleccionada);
      if (tplObj) {
        const headerComp = tplObj?.components?.find((c) => c.type === "HEADER");
        if (headerComp) {
          const fmt = String(headerComp.format || "").toUpperCase();
          if (["IMAGE", "VIDEO", "DOCUMENT"].includes(fmt)) {
            headerFormatFinal = headerFormatFinal || fmt;
            if (!headerMediaUrlFinal) {
              headerMediaUrlFinal = getTemplateHeaderDefaultUrl(tplObj);
            }
          }
        }
      }
    }

    const payload = {
      id_configuracion,
      estado_contacto: estado_db,
      tiempo_espera_horas: Number(tiempoRemarketing),
      nombre_template: plantillaSeleccionada,
      language_code: "es",
      estado_destino: estadoDestino || null,
      header_format: headerFormatFinal,
      header_media_url: headerMediaUrlFinal,
      header_media_name: headerMediaNameFinal,
    };

    console.log(
      "📤 [remarketing] payload guardando:",
      JSON.stringify(payload, null, 2),
    );

    setGuardando(true);
    try {
      await chatApi.post("openai_assistants/configurar_remarketing", payload);
      Toast.fire({
        icon: "success",
        title: configActiva
          ? "Remarketing actualizado"
          : "Remarketing activado",
      });
      setConfigActiva(true);
      cerrarModal();
    } catch {
      Toast.fire({ icon: "error", title: "Error al guardar" });
    } finally {
      setGuardando(false);
    }
  };

  const tiempoObj = TIEMPOS.find((t) => t.value === tiempoRemarketing);
  const plantillaObj = plantillas.find((p) => p.name === plantillaSeleccionada);
  const formularioListo = tiempoRemarketing !== "0" && !!plantillaSeleccionada;

  // columnas destino — excluir la columna actual
  const columnasDestino = columnas.filter((c) => c.estado_db !== estado_db);

  return (
    <>
      <style>{`
        @keyframes rm2-fadeIn {
          from { opacity:0; transform:scale(.97) translateY(6px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes rm2-overlayIn { from{opacity:0} to{opacity:1} }
        @keyframes rm2-pulse-dot {
          0%,100%{transform:scale(1);opacity:1}
          50%{transform:scale(1.5);opacity:.5}
        }
        @keyframes rm2-shimmer {
          0%{background-position:-400px 0}
          100%{background-position:400px 0}
        }
        .rm2-skeleton {
          background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
          background-size:400px 100%;
          animation:rm2-shimmer 1.4s infinite;
          border-radius:10px;
        }
        .rm2-trigger-btn {
          display:inline-flex; align-items:center; gap:6px;
          padding:5px 12px; border-radius:999px;
          border:1px solid rgba(99,102,241,.35);
          background:rgba(99,102,241,.07);
          color:#4338ca; font-size:.74rem; font-weight:600;
          cursor:pointer; transition:all .18s; white-space:nowrap;
          font-family:inherit;
        }
        .rm2-trigger-btn:hover {
          background:rgba(99,102,241,.15);
          border-color:rgba(99,102,241,.6);
          box-shadow:0 2px 10px rgba(99,102,241,.18);
          transform:translateY(-1px);
        }
        .rm2-dot {
          width:6px; height:6px; border-radius:50%;
          background:#22c55e;
          animation:rm2-pulse-dot 2s infinite;
          box-shadow:0 0 0 2px rgba(34,197,94,.2);
        }
        .rm2-overlay {
          position:fixed; inset:0;
          background:rgba(10,10,20,.6);
          backdrop-filter:blur(4px);
          display:flex; align-items:center; justify-content:center;
          z-index:9999; padding:16px;
          animation:rm2-overlayIn .2s ease;
        }
        .rm2-modal {
          background:#fff;
          border-radius:16px;
          width:100%; max-width:520px;
          max-height:90vh;
          display:flex; flex-direction:column;
          box-shadow:0 32px 80px rgba(0,0,0,.22),0 0 0 1px rgba(0,0,0,.07);
          animation:rm2-fadeIn .25s ease;
          overflow:hidden;
        }
        .rm2-header {
          background:${BG_DARK};
          padding:22px 24px 18px;
          border-radius:16px 16px 0 0;
          flex-shrink:0;
        }
        .rm2-body {
          padding:20px 24px 24px;
          overflow-y:auto;
          -webkit-overflow-scrolling:touch;
        }
        .rm2-step {
          display:flex; flex-direction:column; gap:10px;
          padding:14px 16px; border-radius:14px;
          border:1.5px solid #e5e7eb; background:#fafafa;
          margin-bottom:10px;
        }
        .rm2-step.done { border-color:rgba(23,25,49,.2); background:rgba(23,25,49,.03); }
        .rm2-step-header { display:flex; align-items:center; gap:12px; }
        .rm2-step-num {
          min-width:26px; height:26px; border-radius:50%;
          background:#e5e7eb; color:#6b7280;
          display:flex; align-items:center; justify-content:center;
          font-size:.72rem; font-weight:700; flex-shrink:0;
          transition:background .2s,color .2s;
        }
        .rm2-step.done .rm2-step-num { background:${BG_DARK}; color:#fff; }
        .rm2-time-grid {
          display:grid; grid-template-columns:repeat(5,1fr); gap:7px;
        }
        .rm2-time-chip {
          display:flex; flex-direction:column; align-items:center;
          padding:9px 4px; border-radius:10px;
          border:1.5px solid #e5e7eb; background:#f9fafb;
          cursor:pointer; transition:all .15s; text-align:center;
        }
        .rm2-time-chip:hover { border-color:rgba(23,25,49,.3); background:rgba(23,25,49,.04); }
        .rm2-time-chip.sel {
          border-color:${BG_DARK}; background:rgba(23,25,49,.06);
          box-shadow:0 0 0 3px rgba(23,25,49,.08);
        }
        .rm2-time-chip .tl { font-size:.8rem; font-weight:700; color:#111827; }
        .rm2-time-chip .ts { font-size:.63rem; color:#6b7280; margin-top:2px; line-height:1.2; }
        .rm2-time-chip.sel .tl { color:${BG_DARK}; }
        .rm2-select {
          width:100%; padding:10px 14px; border-radius:11px;
          border:1.5px solid #e5e7eb; background:#f9fafb;
          font-size:.875rem; color:#111827; outline:none;
          transition:border-color .2s,box-shadow .2s;
          appearance:none;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat:no-repeat; background-position:right 12px center;
          padding-right:36px; cursor:pointer; font-family:inherit;
        }
        .rm2-select:focus {
          border-color:${BG_DARK};
          box-shadow:0 0 0 3px rgba(23,25,49,.1);
          background-color:#fff;
        }
        .rm2-plantilla-ok {
          display:flex; align-items:center; gap:10px;
          padding:10px 13px; border-radius:10px; margin-top:6px;
          background:#f0fdf4; border:1.5px solid #bbf7d0;
        }
        .rm2-plantilla-warn {
          display:flex; align-items:center; gap:10px;
          padding:10px 13px; border-radius:10px; margin-top:6px;
          background:#fffbeb; border:1.5px solid #fde68a;
        }
        .rm2-ps-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .rm2-ps-text { font-size:.78rem; line-height:1.45; margin:0; }
        .rm2-summary {
          display:flex; gap:10px; align-items:flex-start;
          padding:12px 14px; border-radius:12px; margin-bottom:4px;
          background:rgba(23,25,49,.04); border:1.5px solid rgba(23,25,49,.11);
        }
        .rm2-btn-save {
          display:inline-flex; align-items:center; gap:8px;
          padding:11px 22px; border-radius:12px; border:none;
          background:${BG_DARK}; color:#fff;
          font-weight:700; font-size:.875rem; cursor:pointer;
          transition:all .2s; box-shadow:0 4px 14px rgba(23,25,49,.25);
          font-family:inherit;
        }
        .rm2-btn-save:hover:not(:disabled) {
          transform:translateY(-2px);
          box-shadow:0 8px 22px rgba(23,25,49,.35);
          background:rgb(35,38,68);
        }
        .rm2-btn-save:disabled { opacity:.5; cursor:not-allowed; transform:none; }
        .rm2-btn-cancel {
          padding:11px 18px; border-radius:12px;
          border:1.5px solid #e5e7eb; background:#fff;
          color:#374151; font-weight:600; font-size:.875rem;
          cursor:pointer; transition:all .15s; font-family:inherit;
        }
        .rm2-btn-cancel:hover { background:#f9fafb; border-color:#d1d5db; }
        .rm2-close-btn {
          width:30px; height:30px; border-radius:8px;
          border:1px solid rgba(255,255,255,.15);
          background:rgba(255,255,255,.08);
          color:rgba(255,255,255,.7); cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0; transition:all .15s; font-family:inherit;
        }
        .rm2-close-btn:hover { background:rgba(255,255,255,.18); color:#fff; }
      `}</style>

      {/* ── Botón disparador ── */}
      <button className="rm2-trigger-btn" type="button" onClick={handleAbrir}>
        {configActiva && <span className="rm2-dot" />}
        <i className="bx bx-radar" style={{ fontSize: 13 }} />
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
          className="rm2-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >
          <div className="rm2-modal">
            {/* Header */}
            <div className="rm2-header">
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
                        Automatización · {nombreColumna}
                      </div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "1.05rem",
                          fontWeight: 700,
                          color: "#fff",
                          lineHeight: 1.2,
                        }}
                      >
                        Remarketing automático
                      </h2>
                    </div>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: ".77rem",
                      color: "rgba(255,255,255,.52)",
                      maxWidth: 360,
                      lineHeight: 1.55,
                    }}
                  >
                    Si el cliente no responde en esta etapa, se le enviará un
                    mensaje automático con la plantilla que configures.
                  </p>
                </div>
                <button
                  className="rm2-close-btn"
                  type="button"
                  onClick={cerrarModal}
                >
                  <i className="bx bx-x" style={{ fontSize: 18 }} />
                </button>
              </div>

              {/* Diagrama flujo */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 14px",
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 12,
                  marginTop: 14,
                }}
              >
                {[
                  { icon: "bx-message-dots", label: "Cliente\nescribe" },
                  { icon: "bx-bot", label: "IA\nresponde" },
                  {
                    icon: "bx-time",
                    label: "Sin\nrespuesta",
                    color: "#fbbf24",
                    bg: "rgba(251,191,36,.15)",
                  },
                  {
                    icon: "bx-send",
                    label: "Auto\nenvío",
                    color: "#4ade80",
                    bg: "rgba(34,197,94,.15)",
                  },
                  {
                    icon: "bxs-zap",
                    label: "Lead\nreactivado",
                    color: "#e2e8f0",
                    bg: "rgba(255,255,255,.12)",
                  },
                ].reduce((acc, node, i, arr) => {
                  acc.push(
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 3,
                        fontSize: ".67rem",
                        color: "rgba(255,255,255,.6)",
                        textAlign: "center",
                        minWidth: 52,
                      }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: node.bg || "rgba(255,255,255,.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <i
                          className={`bx ${node.icon}`}
                          style={{ fontSize: 14, color: node.color || "#fff" }}
                        />
                      </div>
                      <span style={{ whiteSpace: "pre-line" }}>
                        {node.label}
                      </span>
                    </div>,
                  );
                  if (i < arr.length - 1)
                    acc.push(
                      <div
                        key={`a${i}`}
                        style={{
                          color: "rgba(255,255,255,.22)",
                          flex: 1,
                          textAlign: "center",
                          fontSize: ".85rem",
                        }}
                      >
                        →
                      </div>,
                    );
                  return acc;
                }, [])}
              </div>
            </div>

            {/* Body */}
            <div className="rm2-body">
              {loadingConfig ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div className="rm2-skeleton" style={{ height: 68 }} />
                  <div className="rm2-skeleton" style={{ height: 68 }} />
                  <div className="rm2-skeleton" style={{ height: 68 }} />
                </div>
              ) : (
                <>
                  {/* Paso 1 — Tiempo */}
                  <div
                    className={`rm2-step ${tiempoRemarketing !== "0" ? "done" : ""}`}
                  >
                    <div className="rm2-step-header">
                      <div className="rm2-step-num">
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
                          mensaje automático.
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
                          {tiempoObj?.label}
                        </span>
                      )}
                    </div>
                    <div className="rm2-time-grid">
                      {TIEMPOS.map((t) => (
                        <div
                          key={t.value}
                          className={`rm2-time-chip ${tiempoRemarketing === t.value ? "sel" : ""}`}
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
                    className={`rm2-step ${plantillaSeleccionada ? "done" : ""}`}
                  >
                    <div className="rm2-step-header">
                      <div className="rm2-step-num">
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
                          Elige una plantilla aprobada por Meta.
                        </div>
                      </div>
                    </div>
                    {loadingPlantillas ? (
                      <div className="rm2-skeleton" style={{ height: 42 }} />
                    ) : (
                      <>
                        <select
                          className="rm2-select"
                          value={plantillaSeleccionada}
                          onChange={(e) =>
                            handlePlantillaChange(e.target.value)
                          }
                        >
                          <option value="">Selecciona una plantilla</option>
                          {plantillas.map((tpl) => (
                            <option key={tpl.id} value={tpl.name}>
                              {tpl.name}
                            </option>
                          ))}
                        </select>
                        {plantillaSeleccionada && headerInfo && (
                          <div
                            className="rm2-plantilla-ok"
                            style={{ marginTop: 6 }}
                          >
                            <span
                              className="rm2-ps-dot"
                              style={{ background: "#6366f1" }}
                            />
                            <p
                              className="rm2-ps-text"
                              style={{ color: "#3730a3" }}
                            >
                              Se detectó un header de{" "}
                              <strong>{headerInfo.format}</strong> en esta
                              plantilla. Se enviará automáticamente al cliente.
                            </p>
                          </div>
                        )}
                        {plantillaSeleccionada &&
                          !headerInfo &&
                          // no mostrar nada extra, plantilla sin header multimedia
                          null}
                        {plantillaSeleccionada &&
                          plantillaObj &&
                          (plantillaObj.status === "APPROVED" ? (
                            <div className="rm2-plantilla-ok">
                              <span
                                className="rm2-ps-dot"
                                style={{ background: "#22c55e" }}
                              />
                              <p
                                className="rm2-ps-text"
                                style={{ color: "#15803d" }}
                              >
                                <strong>{plantillaSeleccionada}</strong> está
                                aprobada por Meta y lista para enviar.
                              </p>
                            </div>
                          ) : (
                            <div className="rm2-plantilla-warn">
                              <span
                                className="rm2-ps-dot"
                                style={{ background: "#f59e0b" }}
                              />
                              <p
                                className="rm2-ps-text"
                                style={{ color: "#92400e" }}
                              >
                                <strong>{plantillaSeleccionada}</strong> todavía
                                no tiene aprobación de Meta.
                              </p>
                            </div>
                          ))}
                      </>
                    )}
                  </div>

                  {/* Paso 3 — Estado destino (opcional) */}
                  <div className={`rm2-step ${estadoDestino ? "done" : ""}`}>
                    <div className="rm2-step-header">
                      <div className="rm2-step-num">
                        {estadoDestino ? (
                          <i className="bx bx-check" style={{ fontSize: 13 }} />
                        ) : (
                          "3"
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
                          ¿A qué columna mover al enviar?{" "}
                          <span style={{ fontWeight: 400, color: "#6b7280" }}>
                            (opcional)
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: ".74rem",
                            color: "#6b7280",
                            marginTop: 2,
                          }}
                        >
                          Si no seleccionas ninguna, el contacto se moverá a{" "}
                          <strong>seguimiento</strong> por defecto.
                        </div>
                      </div>
                    </div>
                    <select
                      className="rm2-select"
                      value={estadoDestino}
                      onChange={(e) => setEstadoDestino(e.target.value)}
                    >
                      <option value="">Seleccione la columna de destino</option>
                      {columnasDestino.map((c) => (
                        <option key={c.id} value={c.estado_db}>
                          {c.nombre} ({c.estado_db})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Resumen */}
                  {formularioListo && (
                    <div className="rm2-summary">
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
                        <strong>{tiempoObj?.label}</strong>, se enviará{" "}
                        <strong>"{plantillaSeleccionada}"</strong> y se moverá a{" "}
                        <strong>
                          {estadoDestino
                            ? columnasDestino.find(
                                (c) => c.estado_db === estadoDestino,
                              )?.nombre || estadoDestino
                            : "Seguimiento"}
                        </strong>
                        .
                      </p>
                    </div>
                  )}

                  {/* Botones */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 10,
                      marginTop: 16,
                    }}
                  >
                    <button
                      className="rm2-btn-cancel"
                      type="button"
                      onClick={cerrarModal}
                    >
                      Cancelar
                    </button>
                    <button
                      className="rm2-btn-save"
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

export default RemarketingColumna;
