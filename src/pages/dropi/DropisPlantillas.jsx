// src/pages/dropi/DropisPlantillas.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.parentNode.style.zIndex = 99999;
  },
});

const ESTADOS_DROPI = [
  "PENDIENTE CONFIRMACION",
  "CANCELADO",
  "CARRITOS ABANDONADOS",
  "PENDIENTE",
  "GUIA GENERADA",
  "EN TRANSITO",
  "RETIRO EN AGENCIA",
  "NOVEDAD",
  "ENTREGADA",
  "DEVOLUCION",
];

const ESTADO_ICONS = {
  "PENDIENTE CONFIRMACION": { icon: "bx bx-time", color: "#f59e0b" },
  CANCELADO: { icon: "bx bx-x-circle", color: "#ef4444" },
  "CARRITOS ABANDONADOS": { icon: "bx bx-cart", color: "#f97316" },
  PENDIENTE: { icon: "bx bx-loader", color: "#eab308" },
  "GUIA GENERADA": { icon: "bx bx-file", color: "#6366f1" },
  "EN TRANSITO": { icon: "bx bx-car", color: "#3b82f6" },
  "RETIRO EN AGENCIA": { icon: "bx bx-store", color: "#8b5cf6" },
  NOVEDAD: { icon: "bx bx-error", color: "#ec4899" },
  ENTREGADA: { icon: "bx bx-check-circle", color: "#10b981" },
  DEVOLUCION: { icon: "bx bx-undo", color: "#6b7280" },
};

const SIEMPRE_TEMPLATE = new Set(["PENDIENTE CONFIRMACION"]);

const VARIABLES_DISPONIBLES = [
  { key: "nombre", label: "Nombre del cliente" },
  { key: "contenido", label: "Productos del pedido" },
  { key: "direccion", label: "Dirección de envío" },
  { key: "costo", label: "Valor total ($)" },
  { key: "ciudad", label: "Ciudad" },
  { key: "provincia", label: "Provincia" },
  { key: "numero_guia", label: "Número de guía" },
  { key: "transportadora", label: "Transportadora" },
  { key: "tracking", label: "URL de tracking" },
  { key: "guia_pdf", label: "URL PDF de guía" },
  { key: "order_id", label: "ID de la orden" },
  { key: "telefono", label: "Teléfono del cliente" },
];

const BG_DARK = "rgb(23, 25, 49)";
const CACHE_TTL = 5 * 60 * 1000;

/* ═══════════════════════════════════════════════════════════
   Auto-detección de parámetros
   ═══════════════════════════════════════════════════════════ */

function autoDetectParams(template) {
  if (!template?.components) return null;
  const bodyComp = template.components.find((c) => c.type === "BODY");
  const buttonsComp = template.components.find((c) => c.type === "BUTTONS");
  const result = { body: [], buttons: [] };

  if (bodyComp?.text) {
    const text = bodyComp.text;
    const matches = text.match(/\{\{\d+\}\}/g) || [];

    for (const match of matches) {
      const idx = text.indexOf(match);
      // Solo mirar 20 chars ANTES del placeholder (no después)
      const before = text.substring(Math.max(0, idx - 20), idx).toLowerCase();

      let variable = "nombre";
      if (/\$|valor|costo|total|monto|precio|pago/.test(before))
        variable = "costo";
      else if (/producto|artículo|contenido/.test(before))
        variable = "contenido";
      else if (/direcci[oó]n|domicilio|ubicaci/.test(before))
        variable = "direccion";
      else if (/tel[eé]fono|celular|m[oó]vil/.test(before))
        variable = "telefono";
      else if (/ciudad|localidad|destino/.test(before)) variable = "ciudad";
      else if (/gu[ií]a|tracking|seguimiento/.test(before))
        variable = "numero_guia";
      else if (/transportadora|courier/.test(before))
        variable = "transportadora";
      else if (/agencia|oficina|sucursal/.test(before)) variable = "direccion";
      else if (/nombre/.test(before)) variable = "nombre";
      else if (/hola|estimad|buen/.test(before)) variable = "nombre";

      result.body.push(variable);
    }
  }

  if (buttonsComp?.buttons) {
    buttonsComp.buttons.forEach((btn, idx) => {
      if (btn.type === "URL" && btn.url?.includes("{{")) {
        const urlLower = (btn.url || "").toLowerCase();
        let variable = "numero_guia";
        if (
          urlLower.includes("cloudfront") ||
          urlLower.includes("pdf") ||
          btn.text?.toLowerCase().includes("descargar")
        )
          variable = "guia_pdf";
        result.buttons.push({ index: idx, variable });
      }
    });
  }

  if (!result.body.length && !result.buttons.length) return null;
  return result;
}

function safeJsonParse(str) {
  try {
    return str ? JSON.parse(str) : {};
  } catch {
    return {};
  }
}

/* ═══════════════════════════════════════════════════════════
   Obtener body text de un template
   ═══════════════════════════════════════════════════════════ */

function getTemplateBodyText(template) {
  if (!template?.components) return null;
  const body = template.components.find((c) => c.type === "BODY");
  return body?.text || null;
}

/* ═══════════════════════════════════════════════════════════
   Preview del template con variables resaltadas
   ═══════════════════════════════════════════════════════════ */

function TemplatePreview({ templateText, bodyParams }) {
  if (!templateText) return null;

  const parts = templateText.split(/(\{\{\d+\}\})/g);

  return (
    <div
      style={{
        marginTop: 8,
        padding: "10px 12px",
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: 10,
        fontSize: ".78rem",
        lineHeight: 1.6,
        color: "#1e293b",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        maxHeight: 200,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          fontSize: ".65rem",
          fontWeight: 700,
          color: "#15803d",
          textTransform: "uppercase",
          letterSpacing: ".05em",
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <i className="bx bx-show" style={{ fontSize: 12 }} />
        Vista previa
      </div>
      {parts.map((part, i) => {
        const match = part.match(/\{\{(\d+)\}\}/);
        if (match) {
          const paramIdx = parseInt(match[1]) - 1;
          const varKey = bodyParams?.[paramIdx];
          const label =
            VARIABLES_DISPONIBLES.find((v) => v.key === varKey)?.label ||
            `Param ${match[1]}`;
          return (
            <span
              key={i}
              style={{
                background: "#e0e7ff",
                color: "#4338ca",
                padding: "1px 5px",
                borderRadius: 4,
                fontWeight: 700,
                fontSize: ".75rem",
              }}
            >
              {label}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Componente principal
   ═══════════════════════════════════════════════════════════ */

const DropisPlantillas = ({ id_configuracion }) => {
  const [showModal, setShowModal] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [respuestasRapidas, setRespuestasRapidas] = useState([]);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(null);
  const [totalActivos, setTotalActivos] = useState(0);
  const [expandedParams, setExpandedParams] = useState(null);

  const cacheRef = useRef({ plantillas: null, rapidas: null, at: 0 });

  // ── Badge inicial ──
  useEffect(() => {
    if (!id_configuracion) return;
    chatApi
      .post("/dropi_plantillas/obtener", { id_configuracion })
      .then((res) => {
        if (res.data?.success) {
          setTotalActivos(
            Object.values(res.data.data).filter((v) => v.activo).length,
          );
        }
      })
      .catch(() => {});
  }, [id_configuracion]);

  // ── Abrir modal ──
  const handleAbrir = async () => {
    setShowModal(true);
    setLoading(true);

    try {
      const now = Date.now();
      const cacheValido =
        cacheRef.current.plantillas && now - cacheRef.current.at < CACHE_TTL;

      const [resPlantillas, resConfig, resRapidas] = await Promise.all([
        cacheValido
          ? Promise.resolve({ data: { data: cacheRef.current.plantillas } })
          : chatApi.post("whatsapp_managment/obtenerTemplatesWhatsapp", {
              id_configuracion,
            }),
        chatApi.post("/dropi_plantillas/obtener", { id_configuracion }),
        cacheValido && cacheRef.current.rapidas
          ? Promise.resolve({
              data: { success: true, data: cacheRef.current.rapidas },
            })
          : chatApi.post("whatsapp_managment/obtenerRespuestasRapidas", {
              id_configuracion,
            }),
      ]);

      const rawPlantillas = resPlantillas.data?.data || [];
      const uniquePlantillas = rawPlantillas.filter(
        (t, i, s) => i === s.findIndex((x) => x.id === t.id),
      );
      setPlantillas(uniquePlantillas);

      const rapidas = resRapidas.data?.data || [];
      setRespuestasRapidas(rapidas);

      if (!cacheValido) {
        cacheRef.current = {
          plantillas: rawPlantillas,
          rapidas,
          at: Date.now(),
        };
      }

      if (resConfig.data?.success) {
        const parsed = {};
        for (const [key, val] of Object.entries(resConfig.data.data)) {
          let _params = safeJsonParse(val.parametros_json);

          // Auto-detect si tiene template pero no tiene params guardados
          if (
            val.nombre_template &&
            !_params.body?.length &&
            !_params.buttons?.length
          ) {
            const tpl = uniquePlantillas.find(
              (p) => p.name === val.nombre_template,
            );
            const detected = autoDetectParams(tpl);
            if (detected) _params = detected;
          }

          parsed[key] = { ...val, _params };
        }
        setConfig(parsed);
        setTotalActivos(Object.values(parsed).filter((v) => v.activo).length);
      }
    } catch {
      Toast.fire({ icon: "error", title: "Error al cargar datos" });
    } finally {
      setLoading(false);
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setExpandedParams(null);
  };

  // ── Guardar estado ──
  const guardarEstado = async (estado) => {
    const cfg = config[estado] || {};
    setGuardando(estado);
    try {
      const params = cfg._params || {};
      await chatApi.post("/dropi_plantillas/guardar", {
        id_configuracion,
        estado_dropi: estado,
        nombre_template: cfg.nombre_template || null,
        language_code: cfg.language_code || "es",
        activo: cfg.activo ? 1 : 0,
        mensaje_rapido: cfg.mensaje_rapido || null,
        usar_respuesta_rapida: cfg.usar_respuesta_rapida ? 1 : 0,
        parametros_json:
          params.body?.length || params.buttons?.length
            ? JSON.stringify(params)
            : null,
      });
      Toast.fire({ icon: "success", title: "Guardado" });
      setTotalActivos(Object.values(config).filter((v) => v.activo).length);
    } catch {
      Toast.fire({ icon: "error", title: "Error al guardar" });
    } finally {
      setGuardando(null);
    }
  };

  const updateConfig = useCallback((estado, field, value) => {
    setConfig((prev) => ({
      ...prev,
      [estado]: { ...prev[estado], [field]: value },
    }));
  }, []);

  const updateParams = useCallback((estado, newParams) => {
    setConfig((prev) => ({
      ...prev,
      [estado]: { ...prev[estado], _params: newParams },
    }));
  }, []);

  const addBodyParam = (estado) => {
    const params = config[estado]?._params || {};
    updateParams(estado, {
      ...params,
      body: [...(params.body || []), "nombre"],
    });
  };
  const removeBodyParam = (estado, idx) => {
    const params = config[estado]?._params || {};
    updateParams(estado, {
      ...params,
      body: (params.body || []).filter((_, i) => i !== idx),
    });
  };
  const updateBodyParam = (estado, idx, value) => {
    const params = config[estado]?._params || {};
    const body = [...(params.body || [])];
    body[idx] = value;
    updateParams(estado, { ...params, body });
  };
  const addButtonParam = (estado) => {
    const params = config[estado]?._params || {};
    updateParams(estado, {
      ...params,
      buttons: [
        ...(params.buttons || []),
        { index: (params.buttons || []).length, variable: "numero_guia" },
      ],
    });
  };
  const removeButtonParam = (estado, idx) => {
    const params = config[estado]?._params || {};
    updateParams(estado, {
      ...params,
      buttons: (params.buttons || []).filter((_, i) => i !== idx),
    });
  };
  const updateButtonParam = (estado, idx, field, value) => {
    const params = config[estado]?._params || {};
    const buttons = [...(params.buttons || [])];
    buttons[idx] = { ...buttons[idx], [field]: value };
    updateParams(estado, { ...params, buttons });
  };

  const handleSelectTemplate = (estado, templateName) => {
    updateConfig(estado, "nombre_template", templateName);
    if (templateName) {
      const tpl = plantillas.find((p) => p.name === templateName);
      const detected = autoDetectParams(tpl);
      updateConfig(estado, "_params", detected || {});
    } else {
      updateConfig(estado, "_params", {});
    }
  };

  return (
    <>
      <style>{`
        @keyframes dp-fadeIn { from{opacity:0;transform:scale(.97) translateY(6px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes dp-overlayIn { from{opacity:0} to{opacity:1} }
        @keyframes dp-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .dp-skeleton { background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:400px 100%;animation:dp-shimmer 1.4s infinite;border-radius:10px; }
        .dp-trigger-btn { display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:12px;border:1.5px solid rgba(99,102,241,.3);background:rgba(99,102,241,.06);color:#4338ca;font-size:.82rem;font-weight:700;cursor:pointer;transition:all .18s;white-space:nowrap;font-family:inherit; }
        .dp-trigger-btn:hover { background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.6);box-shadow:0 3px 12px rgba(99,102,241,.2);transform:translateY(-1px); }
        .dp-overlay { position:fixed;inset:0;background:rgba(10,10,20,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;animation:dp-overlayIn .2s ease; }
        .dp-modal { background:#fff;border-radius:18px;width:100%;max-width:700px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 32px 80px rgba(0,0,0,.22);animation:dp-fadeIn .25s ease;overflow:hidden; }
        .dp-header { background:${BG_DARK};padding:20px 24px;border-radius:18px 18px 0 0;flex-shrink:0; }
        .dp-body { padding:16px 24px 24px;overflow-y:auto;-webkit-overflow-scrolling:touch; }
        .dp-estado-card { border-radius:12px;border:1.5px solid #e5e7eb;background:#fafafa;margin-bottom:10px;overflow:hidden;transition:border-color .15s; }
        .dp-estado-card.activo { border-color:rgba(99,102,241,.3);background:rgba(99,102,241,.02); }
        .dp-estado-header { display:flex;align-items:center;justify-content:space-between;padding:11px 14px;cursor:pointer;user-select:none; }
        .dp-select { width:100%;padding:9px 12px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;font-size:.83rem;color:#111827;outline:none;transition:border-color .2s;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:32px;font-family:inherit;cursor:pointer; }
        .dp-select:focus { border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.1); }
        .dp-toggle { width:40px;height:22px;border-radius:999px;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0; }
        .dp-toggle-knob { position:absolute;top:2px;width:18px;height:18px;border-radius:999px;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.2);transition:left .2s; }
        .dp-save-btn { display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9px;border:none;background:${BG_DARK};color:#fff;font-weight:700;font-size:.78rem;cursor:pointer;transition:all .15s;font-family:inherit; }
        .dp-save-btn:hover:not(:disabled) { background:rgb(35,38,68); }
        .dp-save-btn:disabled { opacity:.5;cursor:not-allowed; }
        .dp-close-btn { width:28px;height:28px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;font-family:inherit; }
        .dp-close-btn:hover { background:rgba(255,255,255,.18);color:#fff; }
        .dp-section-label { font-size:.7rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin:10px 0 6px;display:flex;align-items:center;gap:6px; }
        .dp-param-row { display:flex;align-items:center;gap:6px;margin-bottom:5px; }
        .dp-param-index { width:28px;height:28px;border-radius:7px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800;color:#64748b;flex-shrink:0; }
        .dp-param-select { flex:1;padding:7px 10px;border-radius:8px;border:1.5px solid #e5e7eb;background:#fff;font-size:.78rem;color:#111827;outline:none;appearance:none;font-family:inherit;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;padding-right:26px; }
        .dp-param-select:focus { border-color:#6366f1; }
        .dp-btn-sm { width:24px;height:24px;border-radius:6px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .15s;flex-shrink:0;font-family:inherit; }
        .dp-btn-add { background:#e0e7ff;color:#4338ca; }
        .dp-btn-add:hover { background:#c7d2fe; }
        .dp-btn-remove { background:#fee2e2;color:#dc2626; }
        .dp-btn-remove:hover { background:#fecaca; }
        .dp-expand-btn { display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:7px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-size:.72rem;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit; }
        .dp-expand-btn:hover { background:#e2e8f0; }
        .dp-divider { height:1px;background:#e5e7eb;margin:10px 0; }
        .dp-hint { font-size:.68rem;color:#94a3b8;margin-top:4px;line-height:1.4; }
      `}</style>

      <button className="dp-trigger-btn" type="button" onClick={handleAbrir}>
        <i className="bx bx-package" style={{ fontSize: 15 }} />
        Plantillas Dropi
        {totalActivos > 0 && (
          <span
            style={{
              background: "#6366f1",
              color: "#fff",
              borderRadius: 999,
              fontSize: ".68rem",
              padding: "1px 7px",
              fontWeight: 700,
            }}
          >
            {totalActivos}
          </span>
        )}
      </button>

      {showModal && (
        <div
          className="dp-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >
          <div className="dp-modal">
            {/* ── Header ── */}
            <div className="dp-header">
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
                      className="bx bx-package"
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
                      Automatización
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
                      Plantillas por estado Dropi
                    </h2>
                  </div>
                </div>
                <button
                  className="dp-close-btn"
                  type="button"
                  onClick={cerrarModal}
                >
                  <i className="bx bx-x" style={{ fontSize: 16 }} />
                </button>
              </div>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: ".76rem",
                  color: "rgba(255,255,255,.5)",
                  lineHeight: 1.5,
                }}
              >
                Configura plantillas y respuestas rápidas que se enviarán
                automáticamente al cambiar el estado de un pedido Dropi.
              </p>
            </div>

            {/* ── Body ── */}
            <div className="dp-body">
              {loading ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginTop: 4,
                  }}
                >
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="dp-skeleton"
                      style={{ height: 52 }}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: ".75rem",
                      color: "#94a3b8",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      marginBottom: 10,
                      marginTop: 4,
                    }}
                  >
                    Estados ({ESTADOS_DROPI.length})
                  </div>

                  {ESTADOS_DROPI.map((estado) => {
                    const cfg = config[estado] || {
                      nombre_template: "",
                      activo: 0,
                      mensaje_rapido: "",
                      usar_respuesta_rapida: 1,
                      _params: {},
                    };
                    const meta = ESTADO_ICONS[estado] || {
                      icon: "bx bx-circle",
                      color: "#6b7280",
                    };
                    const isActivo = !!cfg.activo;
                    const esSiempreTemplate = SIEMPRE_TEMPLATE.has(estado);
                    const params = cfg._params || {};
                    const isParamsExpanded = expandedParams === estado;
                    const hasParams =
                      (params.body?.length || 0) +
                        (params.buttons?.length || 0) >
                      0;

                    // Template object para preview
                    const tplObj = cfg.nombre_template
                      ? plantillas.find((p) => p.name === cfg.nombre_template)
                      : null;
                    const bodyText = getTemplateBodyText(tplObj);

                    return (
                      <div
                        key={estado}
                        className={`dp-estado-card ${isActivo ? "activo" : ""}`}
                      >
                        {/* Card header */}
                        <div className="dp-estado-header">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: isActivo
                                  ? `${meta.color}15`
                                  : "#f1f5f9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <i
                                className={meta.icon}
                                style={{
                                  color: isActivo ? meta.color : "#94a3b8",
                                  fontSize: "1rem",
                                }}
                              />
                            </div>
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: ".83rem",
                                  color: "#0f172a",
                                }}
                              >
                                {estado}
                              </div>
                              {isActivo && cfg.nombre_template && (
                                <div
                                  style={{
                                    fontSize: ".7rem",
                                    color: "#6366f1",
                                    marginTop: 1,
                                  }}
                                >
                                  {cfg.nombre_template}
                                  {hasParams && (
                                    <span
                                      style={{
                                        color: "#94a3b8",
                                        marginLeft: 4,
                                      }}
                                    >
                                      ·{" "}
                                      {(params.body?.length || 0) +
                                        (params.buttons?.length || 0)}{" "}
                                      param
                                    </span>
                                  )}
                                </div>
                              )}
                              {isActivo && !cfg.nombre_template && (
                                <div
                                  style={{
                                    fontSize: ".7rem",
                                    color: "#f59e0b",
                                    marginTop: 1,
                                  }}
                                >
                                  ⚠️ Sin plantilla seleccionada
                                </div>
                              )}
                            </div>
                          </div>
                          <div
                            className="dp-toggle"
                            style={{
                              background: isActivo ? "#6366f1" : "#cbd5e1",
                            }}
                            onClick={() =>
                              updateConfig(estado, "activo", isActivo ? 0 : 1)
                            }
                          >
                            <div
                              className="dp-toggle-knob"
                              style={{ left: isActivo ? 20 : 2 }}
                            />
                          </div>
                        </div>

                        {/* Contenido expandido */}
                        {isActivo && (
                          <div style={{ padding: "0 14px 14px" }}>
                            {/* Template selector */}
                            <div className="dp-section-label">
                              <i
                                className="bx bx-envelope"
                                style={{ fontSize: 13 }}
                              />
                              Plantilla de WhatsApp
                            </div>
                            <select
                              className="dp-select"
                              value={cfg.nombre_template || ""}
                              onChange={(e) =>
                                handleSelectTemplate(estado, e.target.value)
                              }
                            >
                              <option value="">Selecciona una plantilla</option>
                              {plantillas.map((tpl) => (
                                <option key={tpl.id} value={tpl.name}>
                                  {tpl.name}
                                  {tpl.status !== "APPROVED"
                                    ? " — No aprobada"
                                    : ""}
                                </option>
                              ))}
                            </select>

                            {/* Estado aprobación */}
                            {cfg.nombre_template && (
                              <div
                                style={{
                                  marginTop: 6,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                {tplObj?.status === "APPROVED" ? (
                                  <>
                                    <span
                                      style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: "50%",
                                        background: "#22c55e",
                                        flexShrink: 0,
                                        display: "inline-block",
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontSize: ".72rem",
                                        color: "#15803d",
                                      }}
                                    >
                                      Aprobada por Meta
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span
                                      style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: "50%",
                                        background: "#f59e0b",
                                        flexShrink: 0,
                                        display: "inline-block",
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontSize: ".72rem",
                                        color: "#92400e",
                                      }}
                                    >
                                      No aprobada — no se enviará
                                    </span>
                                  </>
                                )}
                              </div>
                            )}

                            {/* ── Preview + Parámetros ── */}
                            {cfg.nombre_template && (
                              <>
                                {/* Preview siempre visible */}
                                {bodyText && (
                                  <TemplatePreview
                                    templateText={bodyText}
                                    bodyParams={params.body}
                                  />
                                )}

                                {/* Parámetros */}
                                {hasParams ? (
                                  <div style={{ marginTop: 8 }}>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                      }}
                                    >
                                      <div
                                        className="dp-hint"
                                        style={{
                                          margin: 0,
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                        }}
                                      >
                                        <i
                                          className="bx bx-check-circle"
                                          style={{
                                            color: "#10b981",
                                            fontSize: 14,
                                          }}
                                        />
                                        {params.body?.length || 0} parámetro
                                        {(params.body?.length || 0) !== 1
                                          ? "s"
                                          : ""}{" "}
                                        del cuerpo
                                        {(params.buttons?.length || 0) > 0 &&
                                          ` + ${params.buttons.length} botón${params.buttons.length !== 1 ? "es" : ""}`}
                                        {" — datos del pedido"}
                                      </div>
                                      <button
                                        className="dp-expand-btn"
                                        onClick={() =>
                                          setExpandedParams(
                                            isParamsExpanded ? null : estado,
                                          )
                                        }
                                      >
                                        <i
                                          className={`bx ${isParamsExpanded ? "bx-chevron-up" : "bx-chevron-down"}`}
                                          style={{ fontSize: 13 }}
                                        />
                                        {isParamsExpanded
                                          ? "Ocultar"
                                          : "Ajustar"}
                                      </button>
                                    </div>

                                    {isParamsExpanded && (
                                      <div
                                        style={{
                                          marginTop: 8,
                                          padding: 10,
                                          background: "#f8fafc",
                                          borderRadius: 10,
                                          border: "1px solid #e2e8f0",
                                        }}
                                      >
                                        <div className="dp-section-label">
                                          <i
                                            className="bx bx-text"
                                            style={{ fontSize: 12 }}
                                          />{" "}
                                          Cuerpo {"{{1}}, {{2}}..."}
                                        </div>
                                        {(params.body || []).map(
                                          (varKey, idx) => (
                                            <div
                                              key={idx}
                                              className="dp-param-row"
                                            >
                                              <div className="dp-param-index">{`{{${idx + 1}}}`}</div>
                                              <select
                                                className="dp-param-select"
                                                value={varKey}
                                                onChange={(e) =>
                                                  updateBodyParam(
                                                    estado,
                                                    idx,
                                                    e.target.value,
                                                  )
                                                }
                                              >
                                                {VARIABLES_DISPONIBLES.map(
                                                  (v) => (
                                                    <option
                                                      key={v.key}
                                                      value={v.key}
                                                    >
                                                      {v.label}
                                                    </option>
                                                  ),
                                                )}
                                              </select>
                                              <button
                                                className="dp-btn-sm dp-btn-remove"
                                                onClick={() =>
                                                  removeBodyParam(estado, idx)
                                                }
                                              >
                                                <i className="bx bx-x" />
                                              </button>
                                            </div>
                                          ),
                                        )}
                                        <button
                                          className="dp-btn-sm dp-btn-add"
                                          onClick={() => addBodyParam(estado)}
                                          style={{
                                            width: "auto",
                                            padding: "3px 10px",
                                            fontSize: ".72rem",
                                            gap: 4,
                                            display: "inline-flex",
                                            alignItems: "center",
                                          }}
                                        >
                                          <i className="bx bx-plus" /> Agregar
                                        </button>

                                        {(params.buttons || []).length > 0 && (
                                          <>
                                            <div className="dp-divider" />
                                            <div className="dp-section-label">
                                              <i
                                                className="bx bx-link"
                                                style={{ fontSize: 12 }}
                                              />{" "}
                                              Botones URL
                                            </div>
                                            {params.buttons.map((btn, idx) => (
                                              <div
                                                key={idx}
                                                className="dp-param-row"
                                              >
                                                <div className="dp-param-index">
                                                  B{btn.index ?? idx}
                                                </div>
                                                <select
                                                  className="dp-param-select"
                                                  value={
                                                    btn.variable ||
                                                    "numero_guia"
                                                  }
                                                  onChange={(e) =>
                                                    updateButtonParam(
                                                      estado,
                                                      idx,
                                                      "variable",
                                                      e.target.value,
                                                    )
                                                  }
                                                >
                                                  {VARIABLES_DISPONIBLES.map(
                                                    (v) => (
                                                      <option
                                                        key={v.key}
                                                        value={v.key}
                                                      >
                                                        {v.label}
                                                      </option>
                                                    ),
                                                  )}
                                                </select>
                                                <button
                                                  className="dp-btn-sm dp-btn-remove"
                                                  onClick={() =>
                                                    removeButtonParam(
                                                      estado,
                                                      idx,
                                                    )
                                                  }
                                                >
                                                  <i className="bx bx-x" />
                                                </button>
                                              </div>
                                            ))}
                                          </>
                                        )}
                                        <div className="dp-hint">
                                          Ajusta si la detección automática no
                                          es correcta.
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div
                                    className="dp-hint"
                                    style={{
                                      marginTop: 8,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <i
                                      className="bx bx-check-circle"
                                      style={{ color: "#10b981", fontSize: 14 }}
                                    />
                                    Plantilla sin parámetros variables — se
                                    envía tal cual.
                                  </div>
                                )}
                              </>
                            )}

                            {/* ── Respuesta rápida (ventana 24h) ── */}
                            {!esSiempreTemplate && (
                              <>
                                <div className="dp-divider" />
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: 6,
                                  }}
                                >
                                  <div
                                    className="dp-section-label"
                                    style={{ margin: 0 }}
                                  >
                                    <i
                                      className="bx bx-message-dots"
                                      style={{ fontSize: 13 }}
                                    />
                                    Respuesta rápida (ventana 24h)
                                  </div>
                                  <div
                                    className="dp-toggle"
                                    style={{
                                      background: cfg.usar_respuesta_rapida
                                        ? "#10b981"
                                        : "#cbd5e1",
                                      width: 36,
                                      height: 20,
                                    }}
                                    onClick={() =>
                                      updateConfig(
                                        estado,
                                        "usar_respuesta_rapida",
                                        cfg.usar_respuesta_rapida ? 0 : 1,
                                      )
                                    }
                                  >
                                    <div
                                      className="dp-toggle-knob"
                                      style={{
                                        left: cfg.usar_respuesta_rapida
                                          ? 17
                                          : 2,
                                        width: 16,
                                        height: 16,
                                      }}
                                    />
                                  </div>
                                </div>

                                {!!cfg.usar_respuesta_rapida && (
                                  <>
                                    <select
                                      className="dp-select"
                                      value={cfg.mensaje_rapido || ""}
                                      onChange={(e) =>
                                        updateConfig(
                                          estado,
                                          "mensaje_rapido",
                                          e.target.value,
                                        )
                                      }
                                    >
                                      <option value="">
                                        Selecciona una respuesta rápida
                                      </option>
                                      {respuestasRapidas.map((rr) => (
                                        <option
                                          key={rr.id_template}
                                          value={rr.mensaje}
                                        >
                                          /{rr.atajo} —{" "}
                                          {rr.mensaje?.substring(0, 60)}
                                          {rr.mensaje?.length > 60 ? "..." : ""}
                                        </option>
                                      ))}
                                    </select>

                                    {cfg.mensaje_rapido && (
                                      <div
                                        style={{
                                          marginTop: 6,
                                          padding: "8px 10px",
                                          background: "#f0fdf4",
                                          border: "1px solid #bbf7d0",
                                          borderRadius: 8,
                                          fontSize: ".76rem",
                                          color: "#1e293b",
                                          lineHeight: 1.5,
                                          whiteSpace: "pre-wrap",
                                          maxHeight: 100,
                                          overflowY: "auto",
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontSize: ".62rem",
                                            fontWeight: 700,
                                            color: "#15803d",
                                            textTransform: "uppercase",
                                            marginBottom: 4,
                                          }}
                                        >
                                          Mensaje que se enviará:
                                        </div>
                                        {cfg.mensaje_rapido}
                                      </div>
                                    )}

                                    <div className="dp-hint">
                                      Si el cliente escribió en las últimas 24h,
                                      se envía esta respuesta rápida (gratis).
                                      Si no, se usa la plantilla de arriba
                                      (pagada).
                                    </div>
                                  </>
                                )}
                              </>
                            )}

                            {esSiempreTemplate && (
                              <div className="dp-hint" style={{ marginTop: 8 }}>
                                <i
                                  className="bx bx-info-circle"
                                  style={{
                                    fontSize: 12,
                                    verticalAlign: "middle",
                                  }}
                                />{" "}
                                Este estado siempre usa plantilla porque es el
                                primer contacto con el cliente.
                              </div>
                            )}

                            {/* Guardar */}
                            <div
                              style={{
                                marginTop: 12,
                                display: "flex",
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                className="dp-save-btn"
                                disabled={guardando === estado}
                                onClick={() => guardarEstado(estado)}
                              >
                                {guardando === estado ? (
                                  <>
                                    <i
                                      className="bx bx-loader-alt bx-spin"
                                      style={{ fontSize: 13 }}
                                    />{" "}
                                    Guardando
                                  </>
                                ) : (
                                  <>
                                    <i
                                      className="bx bx-save"
                                      style={{ fontSize: 13 }}
                                    />{" "}
                                    Guardar
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Guardar al desactivar */}
                        {!isActivo && config[estado] !== undefined && (
                          <div
                            style={{
                              padding: "0 14px 10px",
                              display: "flex",
                              justifyContent: "flex-end",
                            }}
                          >
                            <button
                              className="dp-save-btn"
                              disabled={guardando === estado}
                              onClick={() => guardarEstado(estado)}
                              style={{ background: "#64748b" }}
                            >
                              {guardando === estado ? (
                                <>
                                  <i
                                    className="bx bx-loader-alt bx-spin"
                                    style={{ fontSize: 13 }}
                                  />{" "}
                                  Guardando
                                </>
                              ) : (
                                <>
                                  <i
                                    className="bx bx-save"
                                    style={{ fontSize: 13 }}
                                  />{" "}
                                  Guardar
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DropisPlantillas;
