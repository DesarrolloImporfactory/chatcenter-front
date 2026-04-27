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
  instrucciones_extra: "",
  info_envio: "",
  productos_destacados: "",
  tono_personalizado: "",
};

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
  const [columna, setColumna] = useState(null);

  const cargar = useCallback(async () => {
    if (!columnaId) return;
    setLoading(true);
    try {
      const { data } = await chatApi.post(
        "/kanban_plantillas/personalizacion_obtener",
        { id_kanban_columna: columnaId },
      );
      if (data?.success) {
        setColumna(data.data.columna);
        const p = data.data.personalizacion || {};
        setForm({
          nombre_tienda: p.nombre_tienda || "",
          nombre_asistente_publico: p.nombre_asistente_publico || "",
          instrucciones_extra: p.instrucciones_extra || "",
          info_envio: p.info_envio || "",
          productos_destacados: p.productos_destacados || "",
          tono_personalizado: p.tono_personalizado || "",
        });
      }
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: "Error al cargar personalización",
      });
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
      Toast.fire({
        icon: "warning",
        title: "El nombre de la tienda es obligatorio",
      });
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
      Toast.fire({
        icon: "warning",
        title: "El nombre de la tienda es obligatorio",
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "¿Aplicar personalización?",
      html: `
        <div style="font-size:.85rem;color:#475569;text-align:left;line-height:1.5">
          <div style="margin-bottom:10px">
            <strong>Identidad y comportamiento</strong> (nombre de tienda, asistente, política de envío, productos, tono) se aplican a <strong>todas las columnas IA</strong> de tu kanban.
          </div>
          <div style="margin-bottom:10px">
            <strong>Instrucciones específicas</strong> solo aplican a <em>"${columnaNombre}"</em>. Las otras columnas mantienen las suyas.
          </div>
          <div style="font-size:.78rem;color:#64748b">
            La actualización afecta directamente a OpenAI.
          </div>
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
      title: "Aplicando personalización...",
      html: '<div style="font-size:.85rem;color:#64748b">Actualizando asistentes en OpenAI</div>',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
        const swalContainer = document.querySelector(".swal2-container");
        if (swalContainer) swalContainer.style.zIndex = "99999";
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
          title:
            errores === 0 ? "¡Personalización aplicada!" : "Aplicación parcial",
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
          maxWidth: 640,
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
            padding: "20px 22px",
            overflowY: "auto",
            flex: 1,
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
                Cargando personalización...
              </div>
            </div>
          ) : showPreview ? (
            <PreviewPanel
              text={previewText}
              onCerrar={() => setShowPreview(false)}
            />
          ) : (
            <>
              {/* Aviso superior — explica qué es opcional */}
              <div
                style={{
                  marginBottom: 18,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(99,102,241,.06)",
                  border: "1px solid rgba(99,102,241,.18)",
                  fontSize: ".78rem",
                  color: "#475569",
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  lineHeight: 1.5,
                }}
              >
                <i
                  className="bx bx-info-circle"
                  style={{
                    color: "#6366f1",
                    fontSize: "1rem",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <div>
                  <strong>Solo el nombre de la tienda es obligatorio.</strong>{" "}
                  El resto de los campos son opcionales: completalos solo si
                  necesitás <strong>cambiar</strong> el comportamiento por
                  defecto del bot. Los placeholders son ejemplos, no se aplican
                  a tu bot.
                </div>
              </div>

              <SectionTitle
                icono="bx bx-store"
                titulo="Identidad"
                descripcion="Nombre con el que se presenta tu bot."
              />

              <Campo
                label="Nombre de tu tienda *"
                hint="Obligatorio. Aparecerá donde el bot diga el nombre de tu tienda."
                value={form.nombre_tienda}
                onChange={(v) => set("nombre_tienda", v)}
                placeholder="Ej: Mexve TIENDA"
                maxLength={100}
                obligatorio
              />

              <Campo
                label="Nombre de la asistente"
                hint="Opcional. Si lo dejás vacío, el bot se presenta como 'Sara'."
                value={form.nombre_asistente_publico}
                onChange={(v) => set("nombre_asistente_publico", v)}
                placeholder="Ej: Sara, Carla, María..."
                maxLength={60}
              />

              <SectionTitle
                icono="bx bx-cog"
                titulo="Comportamiento (todo opcional)"
                descripcion="Solo completá si querés CAMBIAR el comportamiento por defecto. Si dejás vacío, el bot usa sus defaults."
                topMargin
              />

              <Campo
                label="Política de envío"
                hint="Opcional. Default del bot: envío gratis y pago contraentrega. Completá solo si tu caso es distinto."
                value={form.info_envio}
                onChange={(v) => set("info_envio", v)}
                placeholder="Ej: Envío gratis sobre $30. Demora 48h en sierra."
                multiline
                maxLength={4000}
              />

              <Campo
                label="Productos a destacar"
                hint="Opcional. Default: el bot trata todos los productos por igual."
                value={form.productos_destacados}
                onChange={(v) => set("productos_destacados", v)}
                placeholder="Ej: Siempre ofrecer combo 2x del Reloj X9."
                multiline
                maxLength={4000}
              />

              <Campo
                label="Ajuste de tono"
                hint="Opcional. Default: tono cálido, amigable y directo."
                value={form.tono_personalizado}
                onChange={(v) => set("tono_personalizado", v)}
                placeholder="Ej: Tono más formal. Voseo argentino."
                multiline
                maxLength={4000}
              />

              <SectionTitle
                icono="bx bx-target-lock"
                titulo={`Específico de "${columnaNombre || "esta columna"}"`}
                descripcion="Reglas extra que solo aplican a esta columna."
                topMargin
              />

              <Campo
                label="Instrucciones adicionales para esta columna"
                hint={`Opcional. Solo aplican a "${columnaNombre || "esta columna"}". Las otras columnas IA mantienen las suyas propias.`}
                value={form.instrucciones_extra}
                onChange={(v) => set("instrucciones_extra", v)}
                placeholder="Ej: En esta etapa solo confirmar pedidos. No tomar nuevos clientes."
                multiline
                maxLength={4000}
              />
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
            background: "#fafbff",
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

const SectionTitle = ({ icono, titulo, descripcion, topMargin }) => (
  <div style={{ marginTop: topMargin ? 22 : 0, marginBottom: 12 }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: ".88rem",
        fontWeight: 700,
        color: "#0f172a",
        marginBottom: 3,
      }}
    >
      <i className={icono} style={{ color: "#6366f1", fontSize: "1.05rem" }} />
      {titulo}
    </div>
    {descripcion && (
      <div style={{ fontSize: ".75rem", color: "#64748b", lineHeight: 1.4 }}>
        {descripcion}
      </div>
    )}
  </div>
);

const Campo = ({
  label,
  hint,
  value,
  onChange,
  placeholder,
  multiline,
  maxLength,
  obligatorio,
}) => (
  <div style={{ marginBottom: 14 }}>
    <label
      style={{
        display: "block",
        fontSize: ".8rem",
        fontWeight: 700,
        color: "#374151",
        marginBottom: 4,
      }}
    >
      {label}
    </label>
    {multiline ? (
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={3}
        style={{
          ...inp,
          resize: "vertical",
          minHeight: 70,
          fontFamily: "inherit",
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
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: 3,
        gap: 12,
      }}
    >
      <div style={{ fontSize: ".7rem", color: "#94a3b8", lineHeight: 1.4 }}>
        {hint}
      </div>
      {maxLength && (
        <div style={{ fontSize: ".68rem", color: "#cbd5e1", flexShrink: 0 }}>
          {(value || "").length}/{maxLength}
        </div>
      )}
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
  background: "#fafafa",
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
