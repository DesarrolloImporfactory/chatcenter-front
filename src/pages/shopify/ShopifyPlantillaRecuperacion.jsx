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

const BG_DARK = "rgb(23, 25, 49)";
const CACHE_TTL = 5 * 60 * 1000;

/* Variables disponibles para Shopify (datos del carrito abandonado) */
const VARIABLES_SHOPIFY = [
  { key: "nombre", label: "Nombre del cliente" },
  { key: "apellido", label: "Apellido del cliente" },
  { key: "nombre_completo", label: "Nombre completo" },
  { key: "producto", label: "Primer producto" },
  { key: "productos", label: "Todos los productos" },
  { key: "cantidad", label: "Cantidad total" },
  { key: "total", label: "Total ($)" },
  { key: "moneda", label: "Moneda" },
  { key: "recovery_url", label: "URL de recuperación" },
  { key: "ciudad", label: "Ciudad" },
  { key: "provincia", label: "Provincia" },
  { key: "telefono", label: "Teléfono del cliente" },
];

/* ═══════════════════════════════════════════════════════════
   Helpers (mismo patrón que DropisPlantillas)
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
      const before = text.substring(Math.max(0, idx - 25), idx).toLowerCase();

      let variable = "nombre";
      if (/\$|valor|costo|total|monto|precio|pago/.test(before))
        variable = "total";
      else if (/producto|art[ií]culo|contenido|item/.test(before))
        variable = "producto";
      else if (/carrito|recovery|recuperaci|completar|enlace|link|url/.test(before))
        variable = "recovery_url";
      else if (/ciudad|localidad|destino/.test(before)) variable = "ciudad";
      else if (/provincia|estado|regi[oó]n/.test(before)) variable = "provincia";
      else if (/tel[eé]fono|celular|m[oó]vil|whatsapp/.test(before))
        variable = "telefono";
      else if (/cantidad|unidades|n[uú]mero de/.test(before))
        variable = "cantidad";
      else if (/apellido/.test(before)) variable = "apellido";
      else if (/nombre|hola|estimad|buen/.test(before)) variable = "nombre";

      result.body.push(variable);
    }
  }

  if (buttonsComp?.buttons) {
    buttonsComp.buttons.forEach((btn, idx) => {
      if (btn.type === "URL" && btn.url?.includes("{{")) {
        // En Shopify, casi siempre el botón URL apunta al recovery
        result.buttons.push({ index: idx, variable: "recovery_url" });
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

function getTemplateBodyText(template) {
  if (!template?.components) return null;
  const body = template.components.find((c) => c.type === "BODY");
  return body?.text || null;
}

/* ═══════════════════════════════════════════════════════════
   Preview WhatsApp (mismo patrón que DropisPlantillas)
   ═══════════════════════════════════════════════════════════ */

function TemplatePreview({ template, bodyParams }) {
  if (!template?.components) return null;

  const header = template.components.find((c) => c.type === "HEADER");
  const body = template.components.find((c) => c.type === "BODY");
  const footer = template.components.find((c) => c.type === "FOOTER");
  const buttonsComp = template.components.find((c) => c.type === "BUTTONS");

  const bodyText = body?.text || "";
  const headerFmt = (header?.format || "").toUpperCase();

  const headerExampleUrl =
    (Array.isArray(header?.example?.header_handle) &&
      header.example.header_handle[0]) ||
    (Array.isArray(header?.example?.header_url) &&
      header.example.header_url[0]) ||
    null;

  const isPublicUrl = (u) => /^https?:\/\//i.test(String(u || ""));

  const renderTextWithVars = (text, paramsMap) => {
    if (!text) return null;
    const parts = text.split(/(\{\{\d+\}\})/g);
    return parts.map((part, i) => {
      const match = part.match(/\{\{(\d+)\}\}/);
      if (match) {
        const paramIdx = parseInt(match[1]) - 1;
        const varKey = paramsMap?.[paramIdx];
        const label =
          VARIABLES_SHOPIFY.find((v) => v.key === varKey)?.label ||
          `Param ${match[1]}`;
        return (
          <span
            key={i}
            style={{
              background: "#dbeafe",
              color: "#1e40af",
              padding: "1px 6px",
              borderRadius: 4,
              fontWeight: 700,
              fontSize: ".78rem",
              display: "inline-block",
            }}
          >
            {label}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const now = new Date();
  const horaStr = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

  const waBgPattern = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><g fill='%23d1c7b7' fill-opacity='0.25'><circle cx='10' cy='10' r='1.2'/><circle cx='40' cy='25' r='1'/><circle cx='60' cy='55' r='1.2'/><circle cx='20' cy='65' r='1'/><circle cx='70' cy='15' r='1'/></g></svg>")`;

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #d1d7db",
        boxShadow: "0 2px 8px rgba(11,20,26,.08)",
      }}
    >
      <div
        style={{
          padding: "6px 12px",
          background: "#25d366",
          fontSize: ".62rem",
          fontWeight: 700,
          color: "#fff",
          textTransform: "uppercase",
          letterSpacing: ".08em",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <i className="bx bxl-whatsapp" style={{ fontSize: 14 }} />
        Vista previa
      </div>

      <div
        style={{
          background: "#efeae2",
          backgroundImage: waBgPattern,
          padding: "14px 10px 14px 14px",
          minHeight: 60,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "0px 8px 8px 8px",
            maxWidth: "92%",
            boxShadow: "0 1px 0.5px rgba(11,20,26,.13)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: -7,
              width: 0,
              height: 0,
              borderRight: "8px solid #fff",
              borderBottom: "8px solid transparent",
            }}
          />

          {headerFmt === "IMAGE" &&
            headerExampleUrl &&
            isPublicUrl(headerExampleUrl) && (
              <div style={{ padding: 3, paddingBottom: 0 }}>
                <img
                  src={headerExampleUrl}
                  alt="Header"
                  style={{
                    width: "100%",
                    maxHeight: 180,
                    objectFit: "cover",
                    display: "block",
                    borderRadius: 6,
                  }}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}

          <div style={{ padding: "7px 10px 6px" }}>
            {headerFmt === "TEXT" && header?.text && (
              <div
                style={{
                  fontWeight: 700,
                  fontSize: ".88rem",
                  color: "#111b21",
                  marginBottom: 4,
                  lineHeight: 1.3,
                }}
              >
                {renderTextWithVars(header.text, [])}
              </div>
            )}

            {bodyText && (
              <div
                style={{
                  fontSize: ".83rem",
                  color: "#111b21",
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {renderTextWithVars(bodyText, bodyParams)}
              </div>
            )}

            {footer?.text && (
              <div
                style={{
                  fontSize: ".72rem",
                  color: "#667781",
                  marginTop: 5,
                }}
              >
                {footer.text}
              </div>
            )}

            <div
              style={{
                fontSize: ".62rem",
                color: "#667781",
                textAlign: "right",
                marginTop: 3,
              }}
            >
              {horaStr} ✓✓
            </div>
          </div>

          {Array.isArray(buttonsComp?.buttons) &&
            buttonsComp.buttons.length > 0 && (
              <div>
                {buttonsComp.buttons.map((btn, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "9px 10px",
                      textAlign: "center",
                      fontSize: ".83rem",
                      color: "#00a5f4",
                      fontWeight: 500,
                      borderTop: "1px solid #e9edef",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                    }}
                  >
                    {btn.type === "URL" ? (
                      <i className="bx bx-link-external" />
                    ) : (
                      <i className="bx bx-message-rounded" />
                    )}
                    <span>{btn.text || "Botón"}</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Componente principal
   ═══════════════════════════════════════════════════════════ */

const ShopifyPlantillaRecuperacion = ({ id_configuracion }) => {
  const [showModal, setShowModal] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedParams, setExpandedParams] = useState(false);
  const [estaConfigurado, setEstaConfigurado] = useState(false);

  // Form state
  const [activo, setActivo] = useState(false);
  const [nombreTemplate, setNombreTemplate] = useState("");
  const [languageCode, setLanguageCode] = useState("es");
  const [params, setParams] = useState({});
  const [bodyText, setBodyText] = useState("");

  const cacheRef = useRef({ plantillas: null, at: 0 });

  // ─── Badge: ya está configurado? ───
  useEffect(() => {
    if (!id_configuracion) return;
    chatApi
      .post("/shopify_plantilla/obtener", { id_configuracion })
      .then((res) => {
        if (res.data?.success && res.data.data) {
          setEstaConfigurado(!!res.data.data.envio_automatico);
        }
      })
      .catch(() => {});
  }, [id_configuracion]);

  // ─── Abrir modal y cargar datos ───
  const handleAbrir = async () => {
    setShowModal(true);
    setLoading(true);

    try {
      const now = Date.now();
      const cacheValido =
        cacheRef.current.plantillas && now - cacheRef.current.at < CACHE_TTL;

      const [resPlantillas, resConfig] = await Promise.all([
        cacheValido
          ? Promise.resolve({ data: { data: cacheRef.current.plantillas } })
          : chatApi.post("whatsapp_managment/obtenerTemplatesWhatsapp", {
              id_configuracion,
            }),
        chatApi.post("/shopify_plantilla/obtener", { id_configuracion }),
      ]);

      const rawPlantillas = resPlantillas.data?.data || [];
      const uniquePlantillas = rawPlantillas.filter(
        (t, i, s) => i === s.findIndex((x) => x.id === t.id),
      );
      setPlantillas(uniquePlantillas);

      if (!cacheValido) {
        cacheRef.current = { plantillas: rawPlantillas, at: Date.now() };
      }

      // Cargar config existente
      const data = resConfig.data?.data;
      if (data) {
        setActivo(!!data.envio_automatico);
        setNombreTemplate(data.nombre_template || "");
        setLanguageCode(data.language_code || "es");
        let _params = safeJsonParse(data.parametros_json);

        // Si tiene template pero no params guardados → auto-detectar
        if (
          data.nombre_template &&
          !_params.body?.length &&
          !_params.buttons?.length
        ) {
          const tpl = uniquePlantillas.find(
            (p) => p.name === data.nombre_template,
          );
          const detected = autoDetectParams(tpl);
          if (detected) _params = detected;
        }
        setParams(_params);

        let body = data.body_text || null;
        if (data.nombre_template && !body) {
          const tpl = uniquePlantillas.find(
            (p) => p.name === data.nombre_template,
          );
          body = getTemplateBodyText(tpl) || "";
        }
        setBodyText(body || "");
      }
    } catch {
      Toast.fire({ icon: "error", title: "Error al cargar datos" });
    } finally {
      setLoading(false);
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setExpandedParams(false);
  };

  // ─── Seleccionar template ───
  const handleSelectTemplate = (templateName) => {
    setNombreTemplate(templateName);
    if (templateName) {
      const tpl = plantillas.find((p) => p.name === templateName);
      const detected = autoDetectParams(tpl);
      setParams(detected || {});
      setBodyText(getTemplateBodyText(tpl) || "");
      setLanguageCode(tpl?.language || "es");
    } else {
      setParams({});
      setBodyText("");
    }
  };

  // ─── Editar params ───
  const updateBodyParam = (idx, value) => {
    const body = [...(params.body || [])];
    body[idx] = value;
    setParams({ ...params, body });
  };
  const addBodyParam = () => {
    setParams({ ...params, body: [...(params.body || []), "nombre"] });
  };
  const removeBodyParam = (idx) => {
    setParams({
      ...params,
      body: (params.body || []).filter((_, i) => i !== idx),
    });
  };
  const updateButtonParam = (idx, value) => {
    const buttons = [...(params.buttons || [])];
    buttons[idx] = { ...buttons[idx], variable: value };
    setParams({ ...params, buttons });
  };

  // ─── Guardar ───
  const handleGuardar = async () => {
    if (activo && !nombreTemplate) {
      Toast.fire({
        icon: "warning",
        title: "Selecciona una plantilla para activar el envío",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id_configuracion,
        nombre_template: nombreTemplate || null,
        language_code: languageCode,
        parametros_json:
          params.body?.length || params.buttons?.length
            ? JSON.stringify(params)
            : null,
        body_text: bodyText || null,
        envio_automatico: activo ? 1 : 0,
      };

      const res = await chatApi.post("/shopify_plantilla/guardar", payload);
      if (res.data?.success) {
        Toast.fire({ icon: "success", title: "Configuración guardada" });
        setEstaConfigurado(activo);
        setTimeout(cerrarModal, 600);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al guardar";
      Toast.fire({ icon: "error", title: msg });
    } finally {
      setSaving(false);
    }
  };

  const tplObj = nombreTemplate
    ? plantillas.find((p) => p.name === nombreTemplate)
    : null;

  const hasParams =
    (params.body?.length || 0) + (params.buttons?.length || 0) > 0;

  return (
    <>
      <style>{`
        @keyframes sp-fadeIn { from{opacity:0;transform:scale(.97) translateY(6px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes sp-overlayIn { from{opacity:0} to{opacity:1} }
        .sp-overlay { position:fixed;inset:0;background:rgba(10,10,20,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;animation:sp-overlayIn .2s ease; }
        .sp-modal { background:#fff;border-radius:18px;width:100%;max-width:680px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 32px 80px rgba(0,0,0,.22);animation:sp-fadeIn .25s ease;overflow:hidden; }
        .sp-header { background:${BG_DARK};padding:20px 24px;flex-shrink:0; }
        .sp-body { padding:18px 24px 24px;overflow-y:auto; }
        .sp-select { width:100%;padding:9px 12px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;font-size:.85rem;color:#111827;outline:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:32px;font-family:inherit;cursor:pointer; }
        .sp-select:focus { border-color:#171931;box-shadow:0 0 0 3px rgba(23,25,49,.1); }
        .sp-toggle { width:42px;height:24px;border-radius:999px;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0; }
        .sp-toggle-knob { position:absolute;top:2px;width:20px;height:20px;border-radius:999px;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.2);transition:left .2s; }
        .sp-save-btn { display:inline-flex;align-items:center;gap:6px;padding:9px 20px;border-radius:10px;border:none;background:${BG_DARK};color:#fff;font-weight:700;font-size:.85rem;cursor:pointer;font-family:inherit; }
        .sp-save-btn:hover:not(:disabled) { background:rgb(35,38,68); }
        .sp-save-btn:disabled { opacity:.5;cursor:not-allowed; }
        .sp-close-btn { width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);cursor:pointer;display:flex;align-items:center;justify-content:center; }
        .sp-close-btn:hover { background:rgba(255,255,255,.18);color:#fff; }
        .sp-section-label { font-size:.7rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin:14px 0 6px;display:flex;align-items:center;gap:6px; }
        .sp-param-row { display:flex;align-items:center;gap:6px;margin-bottom:5px; }
        .sp-param-index { width:34px;height:30px;border-radius:7px;background:#dbeafe;color:#1e40af;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800;flex-shrink:0; }
        .sp-param-select { flex:1;padding:7px 10px;border-radius:8px;border:1.5px solid #e5e7eb;background:#fff;font-size:.78rem;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;padding-right:26px; }
        .sp-btn-sm { width:28px;height:28px;border-radius:6px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0; }
        .sp-btn-add { background:#dbeafe;color:#1e40af;width:auto;padding:5px 12px;font-size:.74rem;font-weight:600;gap:4px;display:inline-flex;align-items:center; }
        .sp-btn-remove { background:#fee2e2;color:#dc2626; }
        .sp-expand-btn { display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-size:.74rem;font-weight:600;cursor:pointer;font-family:inherit; }
        .sp-trigger-btn { display:flex;align-items:center;justify-content:center;gap:8px;padding:9px 16px;border-radius:10px;background:#fff;color:${BG_DARK};font-weight:700;font-size:.85rem;cursor:pointer;border:1.5px solid #e2e8f0;transition:all .15s;font-family:inherit;width:100%; }
        .sp-trigger-btn:hover { background:#f8fafc;border-color:#cbd5e1; }
        .sp-trigger-btn.configured { background:${BG_DARK};color:#fff;border-color:${BG_DARK}; }
        .sp-trigger-btn.configured:hover { background:rgb(35,38,68); }
      `}</style>

      {/* TRIGGER BUTTON */}
      <button
        className={`sp-trigger-btn ${estaConfigurado ? "configured" : ""}`}
        type="button"
        onClick={handleAbrir}
      >
        <i className="bx bxl-whatsapp" style={{ fontSize: 18 }} />
        Plantilla de recuperación
        {estaConfigurado && (
          <span
            style={{
              background: "rgba(34,197,94,.25)",
              border: "1px solid rgba(34,197,94,.4)",
              borderRadius: 999,
              padding: "1px 8px",
              fontSize: ".68rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <i className="bx bx-check" style={{ fontSize: 12 }} />
            Activa
          </span>
        )}
      </button>

      {/* MODAL */}
      {showModal && (
        <div
          className="sp-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >
          <div className="sp-modal">
            {/* HEADER */}
            <div className="sp-header">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "rgba(255,255,255,.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i
                      className="bx bxl-whatsapp"
                      style={{ fontSize: 22, color: "#fff" }}
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
                      Shopify · Recuperación automática
                    </div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      Plantilla de carrito abandonado
                    </h2>
                  </div>
                </div>
                <button
                  className="sp-close-btn"
                  type="button"
                  onClick={cerrarModal}
                >
                  <i className="bx bx-x" style={{ fontSize: 18 }} />
                </button>
              </div>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: ".78rem",
                  color: "rgba(255,255,255,.5)",
                  lineHeight: 1.5,
                }}
              >
                Cuando llegue un carrito abandonado desde Shopify, se enviará
                este template de WhatsApp con la URL de recuperación.
              </p>
            </div>

            {/* BODY */}
            <div className="sp-body">
              {loading ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <i
                    className="bx bx-loader-alt bx-spin"
                    style={{ fontSize: 28, color: "#94a3b8" }}
                  />
                  <p
                    style={{
                      marginTop: 8,
                      color: "#94a3b8",
                      fontSize: ".82rem",
                    }}
                  >
                    Cargando plantillas...
                  </p>
                </div>
              ) : (
                <>
                  {/* TOGGLE ENVÍO AUTOMÁTICO */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 14,
                      background: activo ? "#f0fdf4" : "#f8fafc",
                      border: `1.5px solid ${activo ? "#86efac" : "#e2e8f0"}`,
                      borderRadius: 12,
                      marginBottom: 4,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: ".88rem",
                          color: activo ? "#15803d" : "#475569",
                        }}
                      >
                        Envío automático
                      </div>
                      <div
                        style={{
                          fontSize: ".72rem",
                          color: activo ? "#16a34a" : "#94a3b8",
                          marginTop: 2,
                        }}
                      >
                        {activo
                          ? "Se enviará el WhatsApp en cuanto se reciba cada carrito abandonado"
                          : "Apagado — los carritos se guardan pero no se envía WhatsApp automático"}
                      </div>
                    </div>
                    <div
                      className="sp-toggle"
                      style={{ background: activo ? "#22c55e" : "#cbd5e1" }}
                      onClick={() => setActivo(!activo)}
                    >
                      <div
                        className="sp-toggle-knob"
                        style={{ left: activo ? 20 : 2 }}
                      />
                    </div>
                  </div>

                  {/* SELECTOR DE TEMPLATE */}
                  <div className="sp-section-label">
                    <i className="bx bx-envelope" style={{ fontSize: 13 }} />
                    Plantilla de WhatsApp
                  </div>
                  <select
                    className="sp-select"
                    value={nombreTemplate}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                  >
                    <option value="">Selecciona una plantilla</option>
                    {plantillas.map((tpl) => (
                      <option key={tpl.id} value={tpl.name}>
                        {tpl.name}
                        {tpl.status !== "APPROVED" ? " — No aprobada" : ""}
                      </option>
                    ))}
                  </select>

                  {nombreTemplate && tplObj && (
                    <>
                      <div
                        style={{
                          marginTop: 6,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {tplObj.status === "APPROVED" ? (
                          <>
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: "#22c55e",
                              }}
                            />
                            <span
                              style={{
                                fontSize: ".72rem",
                                color: "#15803d",
                                fontWeight: 600,
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
                              }}
                            />
                            <span
                              style={{
                                fontSize: ".72rem",
                                color: "#92400e",
                                fontWeight: 600,
                              }}
                            >
                              No aprobada — no se enviará
                            </span>
                          </>
                        )}
                      </div>

                      <TemplatePreview
                        template={tplObj}
                        bodyParams={params.body}
                      />

                      {/* PARAMS UI */}
                      {hasParams ? (
                        <>
                          <div
                            style={{
                              marginTop: 14,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <div
                              style={{
                                fontSize: ".75rem",
                                color: "#64748b",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <i
                                className="bx bx-check-circle"
                                style={{ color: "#22c55e", fontSize: 14 }}
                              />
                              {params.body?.length || 0} parámetro
                              {(params.body?.length || 0) !== 1 ? "s" : ""}
                              {(params.buttons?.length || 0) > 0 &&
                                ` + ${params.buttons.length} botón${params.buttons.length !== 1 ? "es" : ""}`}{" "}
                              detectados
                            </div>
                            <button
                              className="sp-expand-btn"
                              onClick={() =>
                                setExpandedParams(!expandedParams)
                              }
                            >
                              <i
                                className={`bx ${expandedParams ? "bx-chevron-up" : "bx-chevron-down"}`}
                                style={{ fontSize: 13 }}
                              />
                              {expandedParams ? "Ocultar" : "Ajustar"}
                            </button>
                          </div>

                          {expandedParams && (
                            <div
                              style={{
                                marginTop: 10,
                                padding: 12,
                                background: "#f8fafc",
                                borderRadius: 10,
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              <div className="sp-section-label" style={{ marginTop: 0 }}>
                                <i className="bx bx-text" style={{ fontSize: 12 }} />
                                Cuerpo
                              </div>
                              {(params.body || []).map((varKey, idx) => (
                                <div key={idx} className="sp-param-row">
                                  <div className="sp-param-index">{`{{${idx + 1}}}`}</div>
                                  <select
                                    className="sp-param-select"
                                    value={varKey}
                                    onChange={(e) =>
                                      updateBodyParam(idx, e.target.value)
                                    }
                                  >
                                    {VARIABLES_SHOPIFY.map((v) => (
                                      <option key={v.key} value={v.key}>
                                        {v.label}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    className="sp-btn-sm sp-btn-remove"
                                    onClick={() => removeBodyParam(idx)}
                                  >
                                    <i className="bx bx-x" />
                                  </button>
                                </div>
                              ))}
                              <button
                                className="sp-btn-sm sp-btn-add"
                                onClick={addBodyParam}
                              >
                                <i className="bx bx-plus" /> Agregar
                              </button>

                              {(params.buttons || []).length > 0 && (
                                <>
                                  <div
                                    style={{
                                      height: 1,
                                      background: "#e5e7eb",
                                      margin: "12px 0",
                                    }}
                                  />
                                  <div className="sp-section-label" style={{ marginTop: 0 }}>
                                    <i className="bx bx-link" style={{ fontSize: 12 }} />
                                    Botones URL
                                  </div>
                                  {params.buttons.map((btn, idx) => (
                                    <div key={idx} className="sp-param-row">
                                      <div
                                        className="sp-param-index"
                                        style={{ background: "#fef3c7", color: "#92400e" }}
                                      >
                                        B{btn.index ?? idx}
                                      </div>
                                      <select
                                        className="sp-param-select"
                                        value={btn.variable || "recovery_url"}
                                        onChange={(e) =>
                                          updateButtonParam(idx, e.target.value)
                                        }
                                      >
                                        {VARIABLES_SHOPIFY.map((v) => (
                                          <option key={v.key} value={v.key}>
                                            {v.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        nombreTemplate && (
                          <div
                            style={{
                              marginTop: 14,
                              fontSize: ".74rem",
                              color: "#64748b",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <i
                              className="bx bx-info-circle"
                              style={{ color: "#94a3b8", fontSize: 14 }}
                            />
                            Plantilla sin variables — se enviará tal cual
                          </div>
                        )
                      )}
                    </>
                  )}

                  {!nombreTemplate && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 14,
                        background: "#fef3c7",
                        border: "1px solid #fde68a",
                        borderRadius: 10,
                        fontSize: ".78rem",
                        color: "#92400e",
                      }}
                    >
                      <i
                        className="bx bx-info-circle"
                        style={{ marginRight: 6 }}
                      />
                      Selecciona una plantilla Meta aprobada para configurar el
                      envío automático.
                    </div>
                  )}

                  {/* BOTÓN GUARDAR */}
                  <div
                    style={{
                      marginTop: 20,
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <button
                      onClick={cerrarModal}
                      style={{
                        padding: "9px 16px",
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                        color: "#64748b",
                        fontWeight: 600,
                        fontSize: ".85rem",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      className="sp-save-btn"
                      onClick={handleGuardar}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <i className="bx bx-loader-alt bx-spin" />
                          Guardando
                        </>
                      ) : (
                        <>
                          <i className="bx bx-save" />
                          Guardar
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

export default ShopifyPlantillaRecuperacion;