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

function getTemplateBodyText(template) {
  if (!template?.components) return null;
  const body = template.components.find((c) => c.type === "BODY");
  return body?.text || null;
}

/* ═══════════════════════════════════════════════════════════
   Preview estilo WhatsApp real (burbuja + header + botones)
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

  // Renderizar texto con variables {{1}} {{2}} resaltadas
  const renderTextWithVars = (text, paramsMap) => {
    if (!text) return null;
    const parts = text.split(/(\{\{\d+\}\})/g);
    return parts.map((part, i) => {
      const match = part.match(/\{\{(\d+)\}\}/);
      if (match) {
        const paramIdx = parseInt(match[1]) - 1;
        const varKey = paramsMap?.[paramIdx];
        const label =
          VARIABLES_DISPONIBLES.find((v) => v.key === varKey)?.label ||
          `Param ${match[1]}`;
        return (
          <span
            key={i}
            style={{
              background: "#e0e7ff",
              color: "#4338ca",
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

  // Patrón de fondo WhatsApp (SVG doodles discreto)
  const waBgPattern = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><g fill='%23d1c7b7' fill-opacity='0.25'><circle cx='10' cy='10' r='1.2'/><circle cx='40' cy='25' r='1'/><circle cx='60' cy='55' r='1.2'/><circle cx='20' cy='65' r='1'/><circle cx='70' cy='15' r='1'/></g></svg>")`;

  const hasAnyContent =
    bodyText || header?.text || headerExampleUrl || headerFmt !== "";

  if (!hasAnyContent && !buttonsComp?.buttons?.length) return null;

  return (
    <div
      style={{
        marginTop: 8,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #d1d7db",
        boxShadow: "0 2px 8px rgba(11,20,26,.08)",
      }}
    >
      {/* Label superior */}
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
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Vista previa WhatsApp
      </div>

      {/* Fondo estilo WhatsApp */}
      <div
        style={{
          background: "#efeae2",
          backgroundImage: waBgPattern,
          padding: "14px 10px 14px 14px",
          minHeight: 60,
        }}
      >
        {/* Burbuja del mensaje */}
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
          {/* Cola de la burbuja (triángulo izquierdo arriba) */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: -7,
              width: 0,
              height: 0,
              borderTop: "0 solid transparent",
              borderRight: "8px solid #fff",
              borderBottom: "8px solid transparent",
            }}
          />

          {/* HEADER media (imagen) */}
          {headerFmt === "IMAGE" &&
            headerExampleUrl &&
            isPublicUrl(headerExampleUrl) && (
              <div
                style={{
                  padding: 3,
                  paddingBottom: 0,
                }}
              >
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

          {/* HEADER video */}
          {headerFmt === "VIDEO" && (
            <div
              style={{
                padding: 3,
                paddingBottom: 0,
              }}
            >
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #1f2937 0%, #374151 100%)",
                  height: 140,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  borderRadius: 6,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#111">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* HEADER documento */}
          {headerFmt === "DOCUMENT" && (
            <div
              style={{
                padding: "8px 10px",
                margin: 3,
                marginBottom: 0,
                background: "#f5f6f6",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 40,
                  background: "#e53935",
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: ".65rem",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                PDF
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: ".8rem",
                    fontWeight: 600,
                    color: "#111b21",
                  }}
                >
                  Documento
                </div>
                <div style={{ fontSize: ".7rem", color: "#667781" }}>
                  Archivo adjunto
                </div>
              </div>
            </div>
          )}

          {/* Contenido de texto */}
          <div style={{ padding: "7px 10px 6px" }}>
            {/* HEADER texto (negrita) */}
            {headerFmt === "TEXT" && header?.text && (
              <div
                style={{
                  fontWeight: 700,
                  fontSize: ".88rem",
                  color: "#111b21",
                  marginBottom: 4,
                  lineHeight: 1.3,
                  wordBreak: "break-word",
                  fontFamily:
                    '"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif',
                }}
              >
                {renderTextWithVars(header.text, [])}
              </div>
            )}

            {/* BODY */}
            {bodyText && (
              <div
                style={{
                  fontSize: ".83rem",
                  color: "#111b21",
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily:
                    '"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif',
                }}
              >
                {renderTextWithVars(bodyText, bodyParams)}
              </div>
            )}

            {/* FOOTER */}
            {footer?.text && (
              <div
                style={{
                  fontSize: ".72rem",
                  color: "#667781",
                  marginTop: 5,
                  lineHeight: 1.3,
                  wordBreak: "break-word",
                }}
              >
                {footer.text}
              </div>
            )}

            {/* Hora + checks azules */}
            <div
              style={{
                fontSize: ".62rem",
                color: "#667781",
                textAlign: "right",
                marginTop: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 3,
                lineHeight: 1,
              }}
            >
              <span>{horaStr}</span>
              <svg
                width="16"
                height="11"
                viewBox="0 0 16 11"
                fill="none"
                style={{ marginLeft: 1 }}
              >
                <path
                  d="M11.071.653a.457.457 0 0 0-.304-.102.47.47 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.653.05L.289 7.24a.461.461 0 0 0 .05.646l3.732 3.482a.464.464 0 0 0 .655-.043L11.926 1.4a.46.46 0 0 0 .05-.646l-.905-.1z"
                  fill="#53bdeb"
                />
                <path
                  d="M15.071.653a.457.457 0 0 0-.304-.102.47.47 0 0 0-.381.178l-6.19 7.636-.692-.654-.652.806 1.375 1.291a.464.464 0 0 0 .655-.043L15.926 1.4a.46.46 0 0 0 .05-.646l-.905-.1z"
                  fill="#53bdeb"
                />
              </svg>
            </div>
          </div>

          {/* BOTONES estilo WhatsApp */}
          {Array.isArray(buttonsComp?.buttons) &&
            buttonsComp.buttons.length > 0 && (
              <div>
                {buttonsComp.buttons.map((btn, idx) => {
                  const type = (btn.type || "").toUpperCase();
                  let icon = null;

                  if (type === "URL") {
                    icon = (
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#00a5f4"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    );
                  } else if (type === "PHONE_NUMBER") {
                    icon = (
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#00a5f4"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    );
                  } else if (type === "COPY_CODE") {
                    icon = (
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#00a5f4"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"
                        />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    );
                  } else {
                    // QUICK_REPLY u otro
                    icon = (
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#00a5f4"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 17 4 12 9 7" />
                        <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                      </svg>
                    );
                  }

                  return (
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
                        letterSpacing: ".01em",
                        fontFamily:
                          '"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif',
                      }}
                    >
                      {icon}
                      <span
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "85%",
                        }}
                      >
                        {btn.text || "Botón"}
                      </span>
                    </div>
                  );
                })}
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

const DropisPlantillas = ({ id_configuracion }) => {
  const [showModal, setShowModal] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [respuestasRapidas, setRespuestasRapidas] = useState([]);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(null);
  const [guardadoOk, setGuardadoOk] = useState(null);
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

          let bodyText = val.body_text || null;
          if (val.nombre_template && !bodyText) {
            const tpl = uniquePlantillas.find(
              (p) => p.name === val.nombre_template,
            );
            bodyText = getTemplateBodyText(tpl) || null;
          }

          parsed[key] = { ...val, _params, body_text: bodyText };
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
        body_text: cfg.body_text || null,
      });
      Toast.fire({ icon: "success", title: "Guardado" });
      setTotalActivos(Object.values(config).filter((v) => v.activo).length);

      // ✅ Cerrar panel "Ajustar" si estaba abierto en este estado
      if (expandedParams === estado) setExpandedParams(null);

      // ✅ Flash verde 1.5s en el card
      setGuardadoOk(estado);
      setTimeout(
        () => setGuardadoOk((prev) => (prev === estado ? null : prev)),
        1500,
      );
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al guardar";
      Toast.fire({ icon: "error", title: msg });
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
      updateConfig(estado, "body_text", getTemplateBodyText(tpl) || null);
    } else {
      updateConfig(estado, "_params", {});
      updateConfig(estado, "body_text", null);
    }
  };

  return (
    <>
      <style>{`
        @keyframes dp-fadeIn { from{opacity:0;transform:scale(.97) translateY(6px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes dp-overlayIn { from{opacity:0} to{opacity:1} }
        @keyframes dp-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes dp-flash { 0%{background:rgba(16,185,129,.18)} 100%{background:rgba(16,185,129,.06)} }
        .dp-skeleton { background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:400px 100%;animation:dp-shimmer 1.4s infinite;border-radius:10px; }
        .dp-trigger-btn { display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:12px;border:1.5px solid rgba(99,102,241,.3);background:rgba(99,102,241,.06);color:#4338ca;font-size:.82rem;font-weight:700;cursor:pointer;transition:all .18s;white-space:nowrap;font-family:inherit; }
        .dp-trigger-btn:hover { background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.6);box-shadow:0 3px 12px rgba(99,102,241,.2);transform:translateY(-1px); }
        .dp-overlay { position:fixed;inset:0;background:rgba(10,10,20,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;animation:dp-overlayIn .2s ease; }
        .dp-modal { background:#fff;border-radius:18px;width:100%;max-width:700px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 32px 80px rgba(0,0,0,.22);animation:dp-fadeIn .25s ease;overflow:hidden; }
        .dp-header { background:${BG_DARK};padding:20px 24px;border-radius:18px 18px 0 0;flex-shrink:0; }
        .dp-body { padding:16px 24px 24px;overflow-y:auto;-webkit-overflow-scrolling:touch; }
        .dp-estado-card { border-radius:12px;border:1.5px solid #e5e7eb;background:#fafafa;margin-bottom:10px;overflow:hidden;transition:all .25s; }
        .dp-estado-card.activo { border-color:rgba(99,102,241,.3);background:rgba(99,102,241,.02); }
        .dp-estado-card.guardado-ok { border-color:#10b981 !important;background:rgba(16,185,129,.06) !important;animation:dp-flash 1.2s ease-out; }
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

                    const tplObj = cfg.nombre_template
                      ? plantillas.find((p) => p.name === cfg.nombre_template)
                      : null;

                    const cardClass = [
                      "dp-estado-card",
                      isActivo ? "activo" : "",
                      guardadoOk === estado ? "guardado-ok" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <div key={estado} className={cardClass}>
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

                            {cfg.nombre_template && tplObj && (
                              <>
                                <TemplatePreview
                                  template={tplObj}
                                  bodyParams={params.body}
                                />

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
                                ) : guardadoOk === estado ? (
                                  <>
                                    <i
                                      className="bx bx-check"
                                      style={{ fontSize: 13 }}
                                    />{" "}
                                    Guardado
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
                              style={{
                                background:
                                  guardadoOk === estado ? "#10b981" : "#64748b",
                              }}
                            >
                              {guardando === estado ? (
                                <>
                                  <i
                                    className="bx bx-loader-alt bx-spin"
                                    style={{ fontSize: 13 }}
                                  />{" "}
                                  Guardando
                                </>
                              ) : guardadoOk === estado ? (
                                <>
                                  <i
                                    className="bx bx-check"
                                    style={{ fontSize: 13 }}
                                  />{" "}
                                  Guardado
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
