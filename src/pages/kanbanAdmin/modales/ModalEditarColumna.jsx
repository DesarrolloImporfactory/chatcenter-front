import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";

const Z_INDEX_FIX = {
  didOpen: () => {
    const swalContainer = document.querySelector(".swal2-container");
    if (swalContainer) swalContainer.style.zIndex = "99999";
  },
};

const PALETA_COLORES = [
  { label: "Azul", fondo: "#EFF6FF", texto: "#1D4ED8" },
  { label: "Verde", fondo: "#F0FDF4", texto: "#15803D" },
  { label: "Ámbar", fondo: "#FFFBEB", texto: "#B45309" },
  { label: "Violeta", fondo: "#F5F3FF", texto: "#6D28D9" },
  { label: "Rosa", fondo: "#FFF1F2", texto: "#BE123C" },
  { label: "Cian", fondo: "#ECFEFF", texto: "#0E7490" },
  { label: "Naranja", fondo: "#FFF7ED", texto: "#C2410C" },
  { label: "Lima", fondo: "#F7FEE7", texto: "#4D7C0F" },
  { label: "Gris", fondo: "#F9FAFB", texto: "#374151" },
  { label: "Índigo", fondo: "#EEF2FF", texto: "#4338CA" },
];

const ICONOS = [
  "bx bx-phone",
  "bx bx-bot",
  "bx bx-user",
  "bx bx-cart",
  "bx bx-check-circle",
  "bx bx-x-circle",
  "bx bx-time",
  "bx bx-star",
  "bx bx-package",
  "bx bx-dollar",
  "bx bx-calendar",
  "bx bx-send",
  "bx bx-chat",
  "bx bx-flag",
  "bx bx-trophy",
  "bx bxs-bolt",
];

const PLACEHOLDERS_RECONOCIDOS = [
  "[NOMBRE_TIENDA]",
  "[NOMBRE_ASISTENTE]",
  "[BLOQUE_INFO_ENVIO]",
  "[BLOQUE_INSTRUCCIONES_EXTRA]",
];

const sanitizarEstadoDb = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const contarOcurrencias = (texto, substring) => {
  if (!texto || !substring) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = texto.indexOf(substring, pos)) !== -1) {
    count++;
    pos += substring.length;
  }
  return count;
};

/** Validación de integridad — solo placeholders preservados */
const validarPromptIntegridad = (promptOriginal, promptActual, activaIa) => {
  if (!activaIa) return { ok: true, faltantes: [] };
  const original = promptOriginal || "";
  const actual = promptActual || "";
  const faltantes = [];

  for (const ph of PLACEHOLDERS_RECONOCIDOS) {
    const enOriginal = contarOcurrencias(original, ph);
    const enActual = contarOcurrencias(actual, ph);
    if (enOriginal > 0 && enActual < enOriginal) {
      faltantes.push(
        `Falta el placeholder ${ph} (estaba ${enOriginal} vez/veces, ahora hay ${enActual})`,
      );
    }
  }

  return { ok: faltantes.length === 0, faltantes };
};

const ModalEditarColumna = ({
  columna,
  columnasExistentes = [],
  promptOriginal = "",
  onCancel,
  onGuardar,
}) => {
  const [form, setForm] = useState({ ...columna });
  const textareaRef = useRef(null);

  useEffect(() => {
    setForm({ ...columna });
  }, [columna]);

  const update = (campo, valor) => setForm((p) => ({ ...p, [campo]: valor }));

  const insertarEnCursor = (texto) => {
    const ta = textareaRef.current;
    if (!ta) {
      update("instrucciones", `${form.instrucciones || ""}${texto}`);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    update("instrucciones", `${before}${texto}${after}`);
    setTimeout(() => {
      ta.focus();
      const pos = start + texto.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const validarTodo = () => {
    if (!form.nombre?.trim()) return ["El nombre es obligatorio"];
    if (!form.estado_db?.trim()) return ["El estado_db es obligatorio"];
    if (!/^[a-z0-9_]+$/.test(form.estado_db))
      return ["estado_db solo puede tener letras minúsculas, números y _"];
    const dup = columnasExistentes.find((c) => c.estado_db === form.estado_db);
    if (dup)
      return [`Ya existe otra columna con estado_db "${form.estado_db}"`];

    const integridad = validarPromptIntegridad(
      promptOriginal,
      form.instrucciones,
      !!form.activa_ia,
    );
    if (!integridad.ok) return integridad.faltantes;

    return [];
  };

  const guardar = () => {
    const errores = validarTodo();
    if (errores.length) {
      Swal.fire({
        icon: "error",
        title: "No se puede aplicar — hay problemas",
        html: `
          <div style="text-align:left;font-size:.85rem;line-height:1.6;max-height:380px;overflow-y:auto">
            <p style="margin:0 0 10px;color:#475569">
              Corrige antes de aplicar:
            </p>
            <ul style="padding-left:20px;margin:0;color:#dc2626">
              ${errores.map((e) => `<li style="margin-bottom:6px">${e}</li>`).join("")}
            </ul>
          </div>
        `,
        confirmButtonColor: "#ef4444",
        width: 580,
        ...Z_INDEX_FIX,
      });
      return;
    }
    onGuardar({
      ...form,
      activo: form.activo ? 1 : 0,
      es_estado_final: form.es_estado_final ? 1 : 0,
      es_principal: form.es_principal ? 1 : 0,
      es_dropi_principal: form.es_dropi_principal ? 1 : 0,
      activa_ia: form.activa_ia ? 1 : 0,
      max_tokens: Number(form.max_tokens) || 500,
      acciones: Array.isArray(form.acciones) ? form.acciones : [],
    });
  };

  const promptLength = (form.instrucciones || "").length;

  const estadoPlaceholders = PLACEHOLDERS_RECONOCIDOS.map((ph) => {
    const enOriginal = contarOcurrencias(promptOriginal, ph);
    const enActual = contarOcurrencias(form.instrucciones || "", ph);
    let estado;
    if (enOriginal > 0) {
      if (enActual >= enOriginal) estado = "preservado_ok";
      else estado = "borrado";
    } else {
      if (enActual > 0) estado = "agregado";
      else estado = "no_aplica";
    }
    return { ph, enOriginal, enActual, estado };
  });

  const hayProblemas =
    !!form.activa_ia && estadoPlaceholders.some((e) => e.estado === "borrado");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,20,.75)",
        backdropFilter: "blur(6px)",
        zIndex: 9500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          width: "100%",
          maxWidth: 720,
          maxHeight: "calc(100vh - 40px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,.4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "rgb(23,25,49)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: form.color_fondo,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i
                className={form.icono || "bx bx-circle"}
                style={{ color: form.color_texto, fontSize: "1.05rem" }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: ".62rem",
                  color: "rgba(255,255,255,.4)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                }}
              >
                Editor completo de columna
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: ".95rem",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {form.nombre || "(sin nombre)"}
              </h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,.15)",
              background: "rgba(255,255,255,.08)",
              color: "rgba(255,255,255,.7)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="bx bx-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 22,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <SeccionTitulo>Datos básicos</SeccionTitulo>
          <div>
            <label style={lbl}>Nombre visible</label>
            <input
              value={form.nombre || ""}
              onChange={(e) => update("nombre", e.target.value)}
              style={inp}
            />
          </div>
          <div>
            <label style={lbl}>
              estado_db{" "}
              <span
                style={{
                  fontWeight: 400,
                  color: "#94a3b8",
                  fontSize: ".75rem",
                }}
              >
                (clave interna)
              </span>
            </label>
            <input
              value={form.estado_db || ""}
              onChange={(e) =>
                update("estado_db", sanitizarEstadoDb(e.target.value))
              }
              style={{ ...inp, fontFamily: "monospace" }}
            />
          </div>

          <SeccionTitulo>Apariencia</SeccionTitulo>
          <div>
            <label style={lbl}>Paleta</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PALETA_COLORES.map((p) => (
                <button
                  key={p.label}
                  title={p.label}
                  onClick={() => {
                    update("color_fondo", p.fondo);
                    update("color_texto", p.texto);
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    border:
                      form.color_fondo === p.fondo
                        ? "2.5px solid #6366f1"
                        : "1.5px solid rgba(0,0,0,.1)",
                    background: p.fondo,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: 4,
                      background: p.texto,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>Icono</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ICONOS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => update("icono", ic)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border:
                      form.icono === ic
                        ? "2px solid #6366f1"
                        : "1px solid rgba(0,0,0,.1)",
                    background:
                      form.icono === ic ? "rgba(99,102,241,.08)" : "#fafafa",
                    cursor: "pointer",
                  }}
                >
                  <i
                    className={ic}
                    style={{
                      fontSize: "1.05rem",
                      color: form.icono === ic ? "#6366f1" : "#374151",
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          <SeccionTitulo>Comportamiento</SeccionTitulo>
          <SwitchRow
            label="Columna activa"
            checked={!!form.activo}
            onChange={(v) => update("activo", v ? 1 : 0)}
            desc="Aparece en el tablero del cliente"
          />
          <SwitchRow
            label="Estado final"
            checked={!!form.es_estado_final}
            onChange={(v) => update("es_estado_final", v ? 1 : 0)}
            desc="Desactiva IA en esta columna"
            colorOn="#ef4444"
          />

          <SeccionTitulo>Asistente IA</SeccionTitulo>
          <SwitchRow
            label="Activar IA"
            checked={!!form.activa_ia}
            onChange={(v) => update("activa_ia", v ? 1 : 0)}
            desc="Crea un asistente OpenAI cuando el cliente aplique la plantilla"
            colorOn="#10b981"
          />

          {form.activa_ia && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label style={lbl}>Modelo</label>
                  <select
                    value={form.modelo || "gpt-4o-mini"}
                    onChange={(e) => update("modelo", e.target.value)}
                    style={inp}
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="gpt-4-turbo">gpt-4-turbo</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Max tokens</label>
                  <input
                    type="number"
                    value={form.max_tokens || 500}
                    onChange={(e) =>
                      update("max_tokens", Number(e.target.value) || 500)
                    }
                    style={inp}
                    min={100}
                    max={4000}
                    step={100}
                  />
                </div>
              </div>

              {/* Panel de integridad — solo placeholders */}
              <div
                style={{
                  padding: "12px 14px",
                  border: `1.5px solid ${hayProblemas ? "#fca5a5" : "#c7d2fe"}`,
                  borderRadius: 12,
                  background: hayProblemas ? "#fef2f2" : "#eef2ff",
                }}
              >
                <div
                  style={{
                    fontSize: ".74rem",
                    fontWeight: 700,
                    color: hayProblemas ? "#991b1b" : "#3730a3",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i
                    className={
                      hayProblemas
                        ? "bx bx-error-circle"
                        : "bx bx-shield-quarter"
                    }
                  />
                  {hayProblemas
                    ? "PLACEHOLDER BORRADO — corrige antes de aplicar"
                    : "Integridad de placeholders"}
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {estadoPlaceholders.map((e) => {
                    const colors = {
                      preservado_ok: {
                        bg: "#dcfce7",
                        text: "#15803d",
                        icon: "bx-check-circle",
                      },
                      agregado: {
                        bg: "#dbeafe",
                        text: "#1e40af",
                        icon: "bx-plus-circle",
                      },
                      borrado: {
                        bg: "#fee2e2",
                        text: "#dc2626",
                        icon: "bx-x-circle",
                      },
                      no_aplica: {
                        bg: "#f1f5f9",
                        text: "#64748b",
                        icon: "bx-minus-circle",
                      },
                    };
                    const c = colors[e.estado];
                    const tooltip = {
                      preservado_ok: `Presente (${e.enActual}x)`,
                      agregado: `Agregado por ti (${e.enActual}x)`,
                      borrado: `BORRADO — click para insertar`,
                      no_aplica: "No estaba en el original (opcional)",
                    }[e.estado];
                    const clickeable =
                      e.estado === "borrado" || e.estado === "no_aplica";
                    return (
                      <button
                        key={e.ph}
                        onClick={() => {
                          if (clickeable) insertarEnCursor(e.ph);
                          else navigator.clipboard.writeText(e.ph);
                        }}
                        title={tooltip}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 9px",
                          borderRadius: 999,
                          background: c.bg,
                          color: c.text,
                          border: `1px solid ${c.text}33`,
                          fontSize: ".72rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "monospace",
                        }}
                      >
                        <i
                          className={`bx ${c.icon}`}
                          style={{ fontSize: ".82rem" }}
                        />
                        {e.ph}
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    padding: "7px 10px",
                    borderRadius: 8,
                    background: "#f0f9ff",
                    color: "#075985",
                    fontSize: ".72rem",
                    lineHeight: 1.5,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 7,
                  }}
                >
                  <i
                    className="bx bx-info-circle"
                    style={{ marginTop: 1, flexShrink: 0 }}
                  />
                  <span>
                    <strong>"EN TODAS LAS INTERACCIONES:"</strong> se inyecta
                    automáticamente cuando el cliente agrega instrucciones
                    extra.
                  </span>
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 5,
                  }}
                >
                  <label style={{ ...lbl, marginBottom: 0 }}>
                    Prompt (instrucciones)
                  </label>
                  <span
                    style={{
                      fontSize: ".7rem",
                      color: promptLength > 8000 ? "#ef4444" : "#94a3b8",
                      fontFamily: "monospace",
                    }}
                  >
                    {promptLength.toLocaleString()} caracteres
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={form.instrucciones || ""}
                  onChange={(e) => update("instrucciones", e.target.value)}
                  style={{
                    ...inp,
                    minHeight: 280,
                    fontFamily:
                      "ui-monospace, Menlo, Monaco, Consolas, monospace",
                    fontSize: ".8rem",
                    lineHeight: 1.55,
                    resize: "vertical",
                    borderColor: hayProblemas ? "#fca5a5" : "rgba(0,0,0,.12)",
                  }}
                  placeholder="Eres [NOMBRE_ASISTENTE], asesora de [NOMBRE_TIENDA]..."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid rgba(0,0,0,.06)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            background: "#fafbff",
          }}
        >
          <button onClick={onCancel} style={btnSec}>
            Cancelar
          </button>
          <button onClick={guardar} style={btnPrim}>
            <i className="bx bx-check" /> Aplicar cambios
          </button>
        </div>
      </div>
    </div>
  );
};

const SeccionTitulo = ({ children }) => (
  <div
    style={{
      fontSize: ".68rem",
      fontWeight: 700,
      color: "#94a3b8",
      textTransform: "uppercase",
      letterSpacing: ".08em",
      marginTop: 4,
      paddingBottom: 4,
      borderBottom: "1px solid #f1f5f9",
    }}
  >
    {children}
  </div>
);

const SwitchRow = ({ label, checked, onChange, desc, colorOn = "#6366f1" }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid rgba(0,0,0,.07)",
      background: checked ? `${colorOn}08` : "#fafafa",
    }}
  >
    <div>
      <div style={{ fontWeight: 600, fontSize: ".87rem", color: "#0f172a" }}>
        {label}
      </div>
      {desc && (
        <div style={{ fontSize: ".74rem", color: "#64748b", marginTop: 2 }}>
          {desc}
        </div>
      )}
    </div>
    <ToggleSwitch checked={checked} onChange={onChange} colorOn={colorOn} />
  </div>
);

const ToggleSwitch = ({ checked, onChange, colorOn = "#6366f1" }) => (
  <div
    onClick={() => onChange(!checked)}
    style={{
      width: 46,
      height: 26,
      borderRadius: 999,
      cursor: "pointer",
      background: checked ? colorOn : "#cbd5e1",
      position: "relative",
      transition: "background .2s",
      flexShrink: 0,
    }}
  >
    <div
      style={{
        position: "absolute",
        top: 3,
        left: checked ? 23 : 3,
        width: 20,
        height: 20,
        borderRadius: 999,
        background: "#fff",
        boxShadow: "0 2px 4px rgba(0,0,0,.2)",
        transition: "left .2s",
      }}
    />
  </div>
);

const lbl = {
  display: "block",
  fontSize: ".78rem",
  fontWeight: 700,
  color: "#374151",
  marginBottom: 5,
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
  fontFamily: "inherit",
};
const btnPrim = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 18px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg,#6366f1,#4f46e5)",
  color: "#fff",
  fontWeight: 700,
  fontSize: ".85rem",
  cursor: "pointer",
  boxShadow: "0 3px 10px rgba(99,102,241,.3)",
};
const btnSec = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 16px",
  borderRadius: 12,
  border: "1.5px solid rgba(0,0,0,.1)",
  background: "#fff",
  color: "#374151",
  fontWeight: 600,
  fontSize: ".85rem",
  cursor: "pointer",
};

export default ModalEditarColumna;
