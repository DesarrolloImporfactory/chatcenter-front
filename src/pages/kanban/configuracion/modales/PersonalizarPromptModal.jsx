import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../../api/chatcenter";

const Z_INDEX_FIX = {
  didOpen: () => {
    const swalContainer = document.querySelector(".swal2-container");
    if (swalContainer) swalContainer.style.zIndex = "99999";
  },
};

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.parentNode.style.zIndex = "99999";
  },
});

const ESTADO_VACIO = {
  nombre_tienda: "",
  nombre_asistente_publico: "",
  info_envio: "",
  instrucciones_extra: "",
  // Lo mantenemos en el state aunque no se muestre, para no perder
  // valores guardados anteriormente cuando el cliente guarde de nuevo.
  tono_personalizado: "",
};

// Defaults visibles para que el cliente sepa qué pasa si deja vacío.
// Deben coincidir con lo que define el promptCompiler.js
const DEFAULT_ASISTENTE = "Sara";
const DEFAULT_INFO_ENVIO_PREVIEW =
  "Envío GRATIS al cliente. Pago contraentrega: el cliente paga al recibir el producto.";

// Ejemplos que aparecen como chips clickeables en "Reglas exclusivas"
const EJEMPLOS_INSTRUCCIONES_EXTRA = [
  "Solo confirmar pedidos. No tomar nuevos clientes.",
  "Ofrecer descuento del 10% si el cliente menciona dudas.",
  "Recordar al cliente que el pedido caduca en 24h.",
];

const PersonalizarPromptModal = ({
  open,
  onClose,
  columnaId,
  columnaNombre,
  onActualizado,
}) => {
  const [form, setForm] = useState(ESTADO_VACIO);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewText, setPreviewText] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const cargar = useCallback(async () => {
    if (!columnaId) return;
    setLoading(true);
    try {
      const { data } = await chatApi.post(
        "/kanban_plantillas/personalizacion_obtener",
        { id_kanban_columna: columnaId },
      );
      if (data?.success) {
        const p = data.data.personalizacion || {};
        setForm({
          nombre_tienda: p.nombre_tienda || "",
          nombre_asistente_publico: p.nombre_asistente_publico || "",
          info_envio: p.info_envio || "",
          instrucciones_extra: p.instrucciones_extra || "",
          tono_personalizado: p.tono_personalizado || "",
        });
      }
    } catch (err) {
      Toast.fire({ icon: "error", title: "Error al cargar personalización" });
    } finally {
      setLoading(false);
    }
  }, [columnaId]);

  useEffect(() => {
    if (open) {
      cargar();
      setShowPreview(false);
      setPreviewText(null);
    }
  }, [open, cargar]);

  const set = (campo, valor) => setForm((p) => ({ ...p, [campo]: valor }));

  const verPreview = async () => {
    if (!form.nombre_tienda.trim()) {
      Toast.fire({ icon: "warning", title: "Falta el nombre de la tienda" });
      return;
    }
    setPreviewing(true);
    try {
      const payload = limpiarPayload(form);
      const { data } = await chatApi.post(
        "/kanban_plantillas/personalizacion_preview",
        { id_kanban_columna: columnaId, personalizacion: payload },
      );
      if (data?.success) {
        setPreviewText(data.data.prompt_compilado);
        setShowPreview(true);
      }
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al generar preview",
      });
    } finally {
      setPreviewing(false);
    }
  };

  const guardar = async () => {
    if (!form.nombre_tienda.trim()) {
      Toast.fire({ icon: "warning", title: "Falta el nombre de la tienda" });
      return;
    }

    const confirm = await Swal.fire({
      title: "¿Aplicar personalización?",
      html: `
        <div style="font-size:.85rem;color:#475569;text-align:left;line-height:1.55">
          <div style="margin-bottom:8px">
            <b>Identidad y envío</b> aplican a <b>todas</b> tus columnas IA.
          </div>
          <div style="margin-bottom:8px">
            <b>Reglas específicas</b> aplican solo a <em>"${columnaNombre}"</em>.
          </div>
          <div style="font-size:.78rem;color:#64748b">Se actualiza directo en OpenAI.</div>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#6366f1",
      confirmButtonText: "Sí, aplicar",
      cancelButtonText: "Cancelar",
      ...Z_INDEX_FIX,
    });

    if (!confirm.isConfirmed) return;

    setSaving(true);
    Swal.fire({
      title: "Aplicando...",
      html: '<div style="font-size:.85rem;color:#64748b">Actualizando asistentes en OpenAI</div>',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
        const sc = document.querySelector(".swal2-container");
        if (sc) sc.style.zIndex = "99999";
      },
    });

    try {
      const payload = limpiarPayload(form);
      const { data } = await chatApi.post(
        "/kanban_plantillas/personalizacion_actualizar",
        { id_kanban_columna: columnaId, personalizacion: payload },
      );

      Swal.close();

      if (data?.success) {
        const exitos = data.data?.exitos || 0;
        const errores = data.data?.errores || 0;
        Swal.fire({
          icon: errores === 0 ? "success" : "warning",
          title: errores === 0 ? "¡Listo!" : "Aplicación parcial",
          html: `
            <div style="font-size:.85rem;color:#475569">
              ✓ ${exitos} columna(s) actualizada(s)
              ${errores ? `<br>✗ ${errores} con error` : ""}
            </div>
          `,
          confirmButtonColor: "#6366f1",
          ...Z_INDEX_FIX,
        });
        if (onActualizado) onActualizado(data.data);
        onClose();
      } else {
        Swal.fire({
          icon: "error",
          title: "No se pudo guardar",
          text: data?.message || "Intenta nuevamente.",
          ...Z_INDEX_FIX,
        });
      }
    } catch (err) {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Error al guardar",
        text: err?.response?.data?.message || err.message,
        ...Z_INDEX_FIX,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  // Determinar si cada bloque está personalizado o usa default
  const tienePersoIdentidad = !!form.nombre_asistente_publico.trim();
  const tienePersoEnvio = !!form.info_envio.trim();
  const tienePersoReglas = !!form.instrucciones_extra.trim();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,20,.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          width: "100%",
          maxWidth: 660,
          maxHeight: "92vh",
          boxShadow: "0 32px 80px rgba(0,0,0,.22)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "rgb(23,25,49)",
            padding: "18px 22px",
            flexShrink: 0,
          }}
        >
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
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(99,102,241,.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i
                  className="bx bx-edit-alt"
                  style={{ fontSize: 20, color: "#a5b4fc" }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: ".68rem",
                    color: "rgba(255,255,255,.5)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                  }}
                >
                  Personalización del asistente
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
                  {columnaNombre || "Columna IA"}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.15)",
                background: "rgba(255,255,255,.08)",
                color: "rgba(255,255,255,.7)",
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="bx bx-x" style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px 22px 18px",
            overflowY: "auto",
            flex: 1,
            background: "#fafbff",
          }}
        >
          {loading ? (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                color: "#94a3b8",
              }}
            >
              <i
                className="bx bx-loader-alt bx-spin"
                style={{ fontSize: "2rem" }}
              />
              <div style={{ marginTop: 10, fontSize: ".85rem" }}>
                Cargando...
              </div>
            </div>
          ) : showPreview ? (
            <PreviewPanel
              text={previewText}
              onCerrar={() => setShowPreview(false)}
            />
          ) : (
            <>
              {/* Tarjeta 1 — Identidad */}
              <Tarjeta
                icono="bx bx-store"
                titulo="Identidad de tu bot"
                scope="Aplica a todas las columnas IA"
                personalizado={tienePersoIdentidad}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <Campo
                    label="Tienda"
                    badge="obligatorio"
                    value={form.nombre_tienda}
                    onChange={(v) => set("nombre_tienda", v)}
                    placeholder="Ej: Mexve TIENDA"
                    maxLength={100}
                  />
                  <Campo
                    label="Asistente"
                    badge="opcional"
                    value={form.nombre_asistente_publico}
                    onChange={(v) => set("nombre_asistente_publico", v)}
                    placeholder={`Default: ${DEFAULT_ASISTENTE}`}
                    maxLength={60}
                  />
                </div>
              </Tarjeta>

              {/* Tarjeta 2 — Política de envío */}
              <Tarjeta
                icono="bx bx-package"
                titulo="Política de envío y pago"
                scope="Aplica a todas las columnas IA"
                personalizado={tienePersoEnvio}
                topMargin
              >
                <Campo
                  badge="opcional"
                  value={form.info_envio}
                  onChange={(v) => set("info_envio", v)}
                  placeholder="Ej: Envío gratis. Pago contraentrega en tu domicilio."
                  multiline
                  rows={3}
                  maxLength={4000}
                />
                {!tienePersoEnvio && (
                  <BloqueDefault texto={DEFAULT_INFO_ENVIO_PREVIEW} />
                )}
              </Tarjeta>

              {/* Tarjeta 3 — Reglas exclusivas */}
              <Tarjeta
                icono="bx bx-target-lock"
                titulo={`Reglas adicionales para "${columnaNombre || "esta columna"}"`}
                scope="Solo aplica en esta etapa del kanban"
                personalizado={tienePersoReglas}
                topMargin
              >
                <Campo
                  badge="opcional"
                  value={form.instrucciones_extra}
                  onChange={(v) => set("instrucciones_extra", v)}
                  placeholder="Reglas extra que solo aplican aquí..."
                  multiline
                  rows={3}
                  maxLength={4000}
                />
              </Tarjeta>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid rgba(0,0,0,.07)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            background: "#fff",
            flexShrink: 0,
          }}
        >
          <button onClick={onClose} disabled={saving} style={btnSecundario}>
            Cancelar
          </button>

          {showPreview ? (
            <button onClick={() => setShowPreview(false)} style={btnSecundario}>
              <i className="bx bx-arrow-back" /> Volver a editar
            </button>
          ) : (
            <>
              <button
                onClick={verPreview}
                disabled={previewing || saving}
                style={{
                  ...btnSecundario,
                  background: "#fff",
                  borderColor: "#c7d2fe",
                  color: "#4338ca",
                }}
              >
                {previewing ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" /> Generando...
                  </>
                ) : (
                  <>
                    <i className="bx bx-show" /> Vista previa
                  </>
                )}
              </button>

              <button
                onClick={guardar}
                disabled={saving || previewing}
                style={btnPrimario}
              >
                {saving ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <i className="bx bx-save" /> Guardar y aplicar
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────── Sub-componentes ───────────────

const Tarjeta = ({
  icono,
  titulo,
  scope,
  personalizado,
  topMargin,
  children,
}) => (
  <div
    style={{
      marginTop: topMargin ? 14 : 0,
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 14,
      padding: 16,
      boxShadow: "0 1px 2px rgba(15,23,42,.04)",
    }}
  >
    {/* Header de tarjeta */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 0,
          flex: 1,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "rgba(99,102,241,.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <i className={icono} style={{ color: "#6366f1", fontSize: "1rem" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: ".88rem",
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {titulo}
          </div>
          <div
            style={{
              fontSize: ".68rem",
              color: "#94a3b8",
              marginTop: 2,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <i className="bx bx-link" style={{ fontSize: ".82rem" }} />
            {scope}
          </div>
        </div>
      </div>
      <ChipEstado personalizado={personalizado} />
    </div>

    {children}
  </div>
);

const ChipEstado = ({ personalizado }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: ".64rem",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: ".05em",
      padding: "3px 8px",
      borderRadius: 999,
      background: personalizado ? "#ecfdf5" : "#f1f5f9",
      color: personalizado ? "#047857" : "#64748b",
      border: `1px solid ${personalizado ? "#a7f3d0" : "#e2e8f0"}`,
      flexShrink: 0,
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: personalizado ? "#10b981" : "#cbd5e1",
      }}
    />
    {personalizado ? "Personalizado" : "Default"}
  </div>
);

const Badge = ({ tipo }) => {
  const obligatorio = tipo === "obligatorio";
  return (
    <span
      style={{
        fontSize: ".62rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: ".05em",
        padding: "2px 7px",
        borderRadius: 4,
        background: obligatorio ? "#fef2f2" : "#f1f5f9",
        color: obligatorio ? "#dc2626" : "#64748b",
        border: `1px solid ${obligatorio ? "#fecaca" : "#e2e8f0"}`,
      }}
    >
      {obligatorio ? "Obligatorio" : "Opcional"}
    </span>
  );
};

const Campo = ({
  label,
  badge,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
  maxLength,
}) => (
  <div>
    {(label || badge) && (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        {label && (
          <label
            style={{
              fontSize: ".78rem",
              fontWeight: 700,
              color: "#374151",
            }}
          >
            {label}
          </label>
        )}
        {badge && <Badge tipo={badge} />}
      </div>
    )}
    {multiline ? (
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        style={{
          ...inp,
          resize: "vertical",
          minHeight: 70,
          fontFamily: "inherit",
          lineHeight: 1.45,
        }}
      />
    ) : (
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        style={inp}
      />
    )}
    {maxLength && (
      <div
        style={{
          fontSize: ".67rem",
          color: "#cbd5e1",
          textAlign: "right",
          marginTop: 3,
        }}
      >
        {(value || "").length}/{maxLength}
      </div>
    )}
  </div>
);

// Bloque que muestra el default que recibirá el bot si dejan vacío
const BloqueDefault = ({ texto }) => (
  <div
    style={{
      marginTop: 8,
      padding: "8px 12px",
      borderRadius: 8,
      background: "#f8fafc",
      border: "1px dashed #e2e8f0",
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
    }}
  >
    <i
      className="bx bx-info-circle"
      style={{
        fontSize: ".95rem",
        color: "#94a3b8",
        marginTop: 1,
        flexShrink: 0,
      }}
    />
    <div
      style={{
        fontSize: ".72rem",
        color: "#64748b",
        lineHeight: 1.5,
      }}
    >
      <span style={{ fontWeight: 600, color: "#475569" }}>
        Si dejas vacío, el bot usa:{" "}
      </span>
      {texto}
    </div>
  </div>
);

const PreviewPanel = ({ text, onCerrar }) => (
  <div>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontSize: ".88rem",
          fontWeight: 700,
          color: "#0f172a",
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <i className="bx bx-show" style={{ color: "#6366f1" }} />
        Vista previa del prompt
      </div>
      <button onClick={onCerrar} style={btnSecundarioSm}>
        <i className="bx bx-arrow-back" /> Volver
      </button>
    </div>
    <div
      style={{
        background: "#0f172a",
        color: "#e2e8f0",
        padding: 14,
        borderRadius: 10,
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: ".78rem",
        lineHeight: 1.55,
        whiteSpace: "pre-wrap",
        maxHeight: "55vh",
        overflowY: "auto",
        border: "1px solid rgba(0,0,0,.1)",
      }}
    >
      {text || "(vacío)"}
    </div>
    <div
      style={{
        marginTop: 8,
        fontSize: ".72rem",
        color: "#94a3b8",
        textAlign: "right",
      }}
    >
      {(text || "").length.toLocaleString()} caracteres
    </div>
  </div>
);

const limpiarPayload = (form) => {
  const out = {};
  for (const [k, v] of Object.entries(form)) {
    const t = (v || "").trim();
    out[k] = t.length ? t : null;
  }
  return out;
};

const inp = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.12)",
  fontSize: ".85rem",
  outline: "none",
  background: "#fff",
  color: "#1e293b",
  boxSizing: "border-box",
};

const btnPrimario = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 18px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg,#6366f1,#4f46e5)",
  color: "#fff",
  fontWeight: 700,
  fontSize: ".875rem",
  cursor: "pointer",
  boxShadow: "0 3px 10px rgba(99,102,241,.3)",
};

const btnSecundario = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 16px",
  borderRadius: 12,
  border: "1.5px solid rgba(0,0,0,.1)",
  background: "#fff",
  color: "#374151",
  fontWeight: 600,
  fontSize: ".875rem",
  cursor: "pointer",
};

const btnSecundarioSm = {
  ...btnSecundario,
  padding: "5px 11px",
  fontSize: ".78rem",
};

export default PersonalizarPromptModal;
