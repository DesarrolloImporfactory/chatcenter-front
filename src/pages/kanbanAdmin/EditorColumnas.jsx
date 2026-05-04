import React, { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import ModalEditarColumna from "./modales/ModalEditarColumna";

// ⭐ Fix de z-index: SweetAlert por defecto sale en 1060, queda detrás
// del modal del editor (z-index 9000). Este didOpen fuerza al swal
// container a un z-index más alto que cualquier otro elemento.
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
  timer: 2500,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.parentNode.style.zIndex = "99999";
  },
});

// ═════════════════════════════════════════════════════════════
// Constantes de validación de integridad
// ═════════════════════════════════════════════════════════════
const PLACEHOLDERS_RECONOCIDOS = [
  "[NOMBRE_TIENDA]",
  "[NOMBRE_ASISTENTE]",
  "[BLOQUE_INFO_ENVIO]",
  "[BLOQUE_INSTRUCCIONES_EXTRA]",
];

// ═════════════════════════════════════════════════════════════
// Helpers de validación
// ═════════════════════════════════════════════════════════════
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

/**
 * Valida la integridad del prompt de UNA columna.
 * Solo valida que los placeholders que estaban en el original sigan presentes.
 *
 * Retorna: { ok: boolean, faltantes: string[] }
 */
export const validarPromptIntegridad = (
  promptOriginal,
  promptActual,
  activaIa,
) => {
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

// ═════════════════════════════════════════════════════════════
// Constantes UI
// ═════════════════════════════════════════════════════════════
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

const sanitizarEstadoDb = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const validarColumnas = (columnas, snapshotsOriginales) => {
  const errores = [];
  if (!columnas.length) {
    errores.push("La plantilla debe tener al menos una columna");
    return errores;
  }
  const estados = new Set();
  columnas.forEach((c, i) => {
    if (!c.nombre?.trim()) errores.push(`Columna #${i + 1}: nombre vacío`);
    if (!c.estado_db?.trim())
      errores.push(`Columna "${c.nombre}": estado_db vacío`);
    if (estados.has(c.estado_db))
      errores.push(`estado_db duplicado: "${c.estado_db}"`);
    estados.add(c.estado_db);

    if (c.activa_ia) {
      const original =
        snapshotsOriginales?.[c.estado_db] ?? c.instrucciones ?? "";
      const integridad = validarPromptIntegridad(
        original,
        c.instrucciones,
        true,
      );
      if (!integridad.ok) {
        integridad.faltantes.forEach((f) => {
          errores.push(`Columna "${c.nombre}": ${f}`);
        });
      }
    }
  });
  const principales = columnas.filter((c) => c.es_principal).length;
  if (principales > 1) errores.push("Solo UNA columna puede ser principal");
  const dropi = columnas.filter((c) => c.es_dropi_principal).length;
  if (dropi > 1) errores.push("Solo UNA columna puede ser dropi_principal");
  return errores;
};

// ═════════════════════════════════════════════════════════════
// EditorColumnas
// ═════════════════════════════════════════════════════════════
const EditorColumnas = ({ plantillaId, onClose, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState(null);
  const [columnas, setColumnas] = useState([]);
  const [columnaActivaIdx, setColumnaActivaIdx] = useState(0);
  const [tabActiva, setTabActiva] = useState("columna");
  const [editandoColumna, setEditandoColumna] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [snapshotsOriginales, setSnapshotsOriginales] = useState({});

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const promptTextareaRef = useRef(null);

  // ── Cargar plantilla completa ────────────────────────────
  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      try {
        const { data } = await chatApi.post(
          "/kanban_plantillas_admin/obtener",
          { id: plantillaId },
        );
        if (cancelado) return;
        if (data?.success) {
          const p = data.data;
          setMeta({
            nombre: p.nombre,
            descripcion: p.descripcion,
            icono: p.icono,
            color: p.color,
          });
          const cols = (p.data?.columnas || []).map((c, i) => ({
            ...c,
            orden: c.orden ?? i + 1,
            activo: c.activo ?? 1,
            es_estado_final: c.es_estado_final ?? 0,
            es_principal: c.es_principal ?? 0,
            es_dropi_principal: c.es_dropi_principal ?? 0,
            activa_ia: c.activa_ia ?? 0,
            max_tokens: c.max_tokens ?? 500,
            modelo: c.modelo || "gpt-4o-mini",
            instrucciones: c.instrucciones ?? null,
            acciones: Array.isArray(c.acciones) ? c.acciones : [],
          }));

          const snaps = {};
          cols.forEach((c) => {
            snaps[c.estado_db] = c.instrucciones || "";
          });
          setSnapshotsOriginales(snaps);

          setColumnas(cols);
          setColumnaActivaIdx(0);
        }
      } catch (err) {
        const msg = err?.response?.data?.message || "Error cargando plantilla";
        Swal.fire({
          icon: "error",
          title: msg,
          confirmButtonColor: "#ef4444",
          ...Z_INDEX_FIX,
        });
        onClose();
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantillaId]);

  const marcarDirty = useCallback(() => setDirty(true), []);

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) {
      setDraggingIdx(null);
      return;
    }
    if (dragItem.current === dragOverItem.current) {
      setDraggingIdx(null);
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    const nuevas = [...columnas];
    const [moved] = nuevas.splice(dragItem.current, 1);
    nuevas.splice(dragOverItem.current, 0, moved);
    const conOrden = nuevas.map((c, i) => ({ ...c, orden: i + 1 }));
    setColumnas(conOrden);
    setColumnaActivaIdx(dragOverItem.current);
    setDraggingIdx(null);
    dragItem.current = null;
    dragOverItem.current = null;
    marcarDirty();
  };

  const agregarColumna = () => {
    const estadoDb = `nueva_${Date.now().toString().slice(-5)}`;
    const nuevaCol = {
      nombre: "Nueva columna",
      estado_db: estadoDb,
      color_fondo: "#EFF6FF",
      color_texto: "#1D4ED8",
      icono: "bx bx-circle",
      orden: columnas.length + 1,
      activo: 1,
      es_estado_final: 0,
      es_principal: 0,
      es_dropi_principal: 0,
      activa_ia: 0,
      max_tokens: 500,
      instrucciones: null,
      modelo: "gpt-4o-mini",
      acciones: [],
    };
    setSnapshotsOriginales((prev) => ({ ...prev, [estadoDb]: "" }));
    setColumnas((prev) => [...prev, nuevaCol]);
    setColumnaActivaIdx(columnas.length);
    setTabActiva("columna");
    marcarDirty();
  };

  const eliminarColumna = async (idx) => {
    const col = columnas[idx];
    const res = await Swal.fire({
      title: `¿Eliminar "${col.nombre}"?`,
      text: "La columna se quitará de la plantilla. Aún puedes cancelar sin guardar.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      ...Z_INDEX_FIX,
    });
    if (!res.isConfirmed) return;
    const nuevas = columnas
      .filter((_, i) => i !== idx)
      .map((c, i) => ({ ...c, orden: i + 1 }));
    setColumnas(nuevas);
    setColumnaActivaIdx(Math.max(0, Math.min(idx, nuevas.length - 1)));
    marcarDirty();
  };

  const abrirEditarColumna = (idx) => setEditandoColumna(idx);
  const cerrarEditarColumna = () => setEditandoColumna(null);
  const guardarColumnaEditada = (colActualizada) => {
    setColumnas((prev) =>
      prev.map((c, i) => (i === editandoColumna ? colActualizada : c)),
    );
    cerrarEditarColumna();
    marcarDirty();
  };

  const togglePrincipal = (idx) => {
    setColumnas((prev) =>
      prev.map((c, i) => ({
        ...c,
        es_principal: i === idx ? (c.es_principal ? 0 : 1) : 0,
      })),
    );
    marcarDirty();
  };

  const toggleDropiPrincipal = (idx) => {
    setColumnas((prev) =>
      prev.map((c, i) => ({
        ...c,
        es_dropi_principal: i === idx ? (c.es_dropi_principal ? 0 : 1) : 0,
      })),
    );
    marcarDirty();
  };

  const updateActivaField = (campo, valor) => {
    setColumnas((prev) =>
      prev.map((c, i) =>
        i === columnaActivaIdx ? { ...c, [campo]: valor } : c,
      ),
    );
    marcarDirty();
  };

  const insertarEnCursorPrompt = (texto) => {
    const ta = promptTextareaRef.current;
    if (!ta) {
      const actual = columnas[columnaActivaIdx]?.instrucciones || "";
      updateActivaField("instrucciones", `${actual}${texto}`);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    const nuevoValor = `${before}${texto}${after}`;
    updateActivaField("instrucciones", nuevoValor);
    setTimeout(() => {
      ta.focus();
      const pos = start + texto.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const guardar = async () => {
    const errores = validarColumnas(columnas, snapshotsOriginales);
    if (errores.length) {
      Swal.fire({
        icon: "error",
        title: "No se puede guardar — hay problemas en la plantilla",
        html: `
          <div style="text-align:left;font-size:.85rem;line-height:1.6;max-height:400px;overflow-y:auto">
            <p style="margin:0 0 10px;color:#475569">
              Corrige los siguientes problemas antes de guardar:
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

    setSaving(true);
    try {
      await chatApi.post("/kanban_plantillas_admin/actualizar_data", {
        id: plantillaId,
        data: { columnas },
      });
      Toast.fire({ icon: "success", title: "Plantilla guardada" });
      setDirty(false);
      const nuevosSnaps = {};
      columnas.forEach((c) => {
        nuevosSnaps[c.estado_db] = c.instrucciones || "";
      });
      setSnapshotsOriginales(nuevosSnaps);
      onSaved?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al guardar";
      Swal.fire({
        icon: "error",
        title: msg,
        confirmButtonColor: "#ef4444",
        ...Z_INDEX_FIX,
      });
    } finally {
      setSaving(false);
    }
  };

  const intentarCerrar = async () => {
    if (!dirty) {
      onClose();
      return;
    }
    const res = await Swal.fire({
      title: "¿Cerrar sin guardar?",
      text: "Perderás los cambios que hiciste en esta plantilla.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sí, descartar cambios",
      cancelButtonText: "Seguir editando",
      ...Z_INDEX_FIX,
    });
    if (res.isConfirmed) onClose();
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && !editandoColumna) intentarCerrar();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, editandoColumna]);

  const colActiva = columnas[columnaActivaIdx];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,20,.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9000,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#f8fafc",
          borderRadius: 18,
          width: "100%",
          maxWidth: 1400,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,.35)",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "rgb(23,25,49)",
            padding: "16px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: meta ? `${meta.color}30` : "rgba(255,255,255,.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i
                className={meta?.icono || "bx bx-layout"}
                style={{ fontSize: 20, color: meta?.color || "#fbbf24" }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: ".65rem",
                  color: "rgba(255,255,255,.4)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                }}
              >
                Editor de columnas · Plantilla #{plantillaId}
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {meta?.nombre || "Cargando..."}
              </h2>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {dirty && (
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "rgba(251,191,36,.2)",
                  color: "#fde047",
                  fontSize: ".7rem",
                  fontWeight: 700,
                  border: "1px solid rgba(251,191,36,.35)",
                }}
              >
                <i className="bx bx-edit" /> Cambios sin guardar
              </span>
            )}

            <button
              onClick={guardar}
              disabled={saving || loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 16px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg,#22d3ee,#0891b2)",
                color: "#171931",
                fontWeight: 800,
                fontSize: ".82rem",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(34,211,238,.3)",
                opacity: saving || loading ? 0.6 : 1,
              }}
            >
              {saving ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" /> Guardando...
                </>
              ) : (
                <>
                  <i className="bx bx-save" /> Guardar plantilla
                </>
              )}
            </button>

            <button
              onClick={intentarCerrar}
              disabled={saving}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.15)",
                background: "rgba(255,255,255,.08)",
                color: "rgba(255,255,255,.7)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Cerrar (Esc)"
            >
              <i className="bx bx-x" style={{ fontSize: 20 }} />
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 12,
              color: "#94a3b8",
            }}
          >
            <i className="bx bx-loader-alt bx-spin" style={{ fontSize: 32 }} />
            <span>Cargando plantilla...</span>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "280px 1fr",
              gap: 16,
              padding: 16,
              minHeight: 0,
            }}
          >
            {/* Sidebar columnas */}
            <div
              style={{
                background: "#fff",
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,.07)",
                overflow: "hidden",
                boxShadow: "0 2px 12px rgba(0,0,0,.05)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid rgba(0,0,0,.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: ".72rem",
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  Columnas ({columnas.length})
                </span>
                <button
                  onClick={agregarColumna}
                  title="Agregar columna"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: "1px solid #6366f130",
                    background: "#6366f110",
                    color: "#6366f1",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i className="bx bx-plus" />
                </button>
              </div>

              <div style={{ overflowY: "auto", flex: 1 }}>
                {columnas.map((col, idx) => {
                  const integridadCol = col.activa_ia
                    ? validarPromptIntegridad(
                        snapshotsOriginales[col.estado_db] ??
                          col.instrucciones ??
                          "",
                        col.instrucciones,
                        true,
                      )
                    : { ok: true };
                  return (
                    <div
                      key={`${col.estado_db}-${idx}`}
                      draggable
                      onDragStart={() => {
                        dragItem.current = idx;
                        setDraggingIdx(idx);
                      }}
                      onDragEnter={() => {
                        dragOverItem.current = idx;
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        setColumnaActivaIdx(idx);
                        setTabActiva("columna");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 12px",
                        cursor: "grab",
                        borderLeft:
                          idx === columnaActivaIdx
                            ? "3px solid #6366f1"
                            : "3px solid transparent",
                        background:
                          draggingIdx === idx
                            ? "rgba(99,102,241,.12)"
                            : idx === columnaActivaIdx
                              ? "rgba(99,102,241,.06)"
                              : "transparent",
                        borderBottom: "1px solid rgba(0,0,0,.04)",
                        opacity: draggingIdx === idx ? 0.5 : 1,
                        userSelect: "none",
                      }}
                    >
                      <i
                        className="bx bx-grid-vertical"
                        style={{
                          color: "#cbd5e1",
                          fontSize: ".95rem",
                          flexShrink: 0,
                        }}
                      />
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          background: col.color_fondo,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <i
                          className={col.icono || "bx bx-circle"}
                          style={{ color: col.color_texto, fontSize: ".95rem" }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: ".8rem",
                            color:
                              idx === columnaActivaIdx ? "#4338ca" : "#1e293b",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {col.nombre || "(sin nombre)"}
                        </div>
                        <div
                          style={{
                            fontSize: ".68rem",
                            color: "#94a3b8",
                            fontFamily: "monospace",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {col.estado_db}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          flexShrink: 0,
                          alignItems: "flex-end",
                        }}
                      >
                        {!integridadCol.ok && (
                          <span
                            title="Placeholder borrado"
                            style={{ fontSize: 12 }}
                          >
                            ⚠️
                          </span>
                        )}
                        {!!col.activa_ia && (
                          <span
                            style={{
                              fontSize: ".58rem",
                              background: "#dcfce7",
                              color: "#16a34a",
                              borderRadius: 999,
                              padding: "1px 5px",
                              fontWeight: 700,
                            }}
                          >
                            IA
                          </span>
                        )}
                        {!!col.es_principal && (
                          <span title="Principal" style={{ fontSize: 11 }}>
                            ⭐
                          </span>
                        )}
                        {!!col.es_dropi_principal && (
                          <span
                            title="Dropi principal"
                            style={{ fontSize: 11 }}
                          >
                            📦
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Panel detalle */}
            {colActiva ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,.07)",
                  boxShadow: "0 2px 12px rgba(0,0,0,.05)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                {/* Header columna activa */}
                <div
                  style={{
                    padding: "14px 22px",
                    borderBottom: "1px solid rgba(0,0,0,.06)",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "linear-gradient(135deg,#fafbff,#f1f5f9)",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 11,
                      background: colActiva.color_fondo,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 3px 10px rgba(0,0,0,.08)",
                    }}
                  >
                    <i
                      className={colActiva.icono || "bx bx-circle"}
                      style={{
                        color: colActiva.color_texto,
                        fontSize: "1.25rem",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "1rem",
                        color: "#0f172a",
                      }}
                    >
                      {colActiva.nombre}
                    </div>
                    <div
                      style={{
                        fontSize: ".74rem",
                        color: "#64748b",
                        fontFamily: "monospace",
                        marginTop: 2,
                      }}
                    >
                      estado_db: <strong>{colActiva.estado_db}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => abrirEditarColumna(columnaActivaIdx)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 13px",
                      borderRadius: 9,
                      border: "1px solid #6366f130",
                      background: "#6366f110",
                      color: "#6366f1",
                      fontSize: ".78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <i className="bx bx-expand-alt" /> Editor completo
                  </button>

                  <button
                    onClick={() => eliminarColumna(columnaActivaIdx)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      border: "1px solid #fee2e2",
                      background: "#fef2f2",
                      color: "#ef4444",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Eliminar columna"
                  >
                    <i className="bx bx-trash" />
                  </button>
                </div>

                {/* Tabs */}
                <div
                  style={{
                    display: "flex",
                    borderBottom: "1px solid rgba(0,0,0,.06)",
                    padding: "0 22px",
                    flexShrink: 0,
                  }}
                >
                  {[
                    {
                      key: "columna",
                      label: "Columna",
                      icono: "bx bx-customize",
                    },
                    {
                      key: "asistente",
                      label: "Asistente",
                      icono: "bx bx-bot",
                      badge: colActiva.activa_ia ? "IA" : null,
                    },
                    {
                      key: "acciones",
                      label: "Acciones",
                      icono: "bx bx-zap",
                      badge: colActiva.acciones?.length || null,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setTabActiva(tab.key)}
                      style={{
                        padding: "12px 18px",
                        border: "none",
                        background: "transparent",
                        fontSize: ".85rem",
                        fontWeight: tabActiva === tab.key ? 700 : 500,
                        color: tabActiva === tab.key ? "#6366f1" : "#64748b",
                        borderBottom:
                          tabActiva === tab.key
                            ? "2px solid #6366f1"
                            : "2px solid transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        marginBottom: -1,
                      }}
                    >
                      <i className={tab.icono} />
                      {tab.label}
                      {tab.badge && (
                        <span
                          style={{
                            background: "#6366f1",
                            color: "#fff",
                            borderRadius: 999,
                            fontSize: ".66rem",
                            padding: "0 6px",
                            fontWeight: 700,
                          }}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Contenido tabs */}
                <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
                  {tabActiva === "columna" && (
                    <TabColumna
                      col={colActiva}
                      onChange={updateActivaField}
                      onTogglePrincipal={() =>
                        togglePrincipal(columnaActivaIdx)
                      }
                      onToggleDropiPrincipal={() =>
                        toggleDropiPrincipal(columnaActivaIdx)
                      }
                    />
                  )}
                  {tabActiva === "asistente" && (
                    <TabAsistenteAdmin
                      col={colActiva}
                      onChange={updateActivaField}
                      promptOriginal={
                        snapshotsOriginales[colActiva.estado_db] ?? ""
                      }
                      textareaRef={promptTextareaRef}
                      onInsertarEnCursor={insertarEnCursorPrompt}
                    />
                  )}
                  {tabActiva === "acciones" && (
                    <TabAcciones
                      col={colActiva}
                      columnas={columnas}
                      onChange={(nuevasAcciones) =>
                        updateActivaField("acciones", nuevasAcciones)
                      }
                    />
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,.07)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94a3b8",
                }}
              >
                Selecciona una columna
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal anidado */}
      {editandoColumna !== null && columnas[editandoColumna] && (
        <ModalEditarColumna
          columna={columnas[editandoColumna]}
          columnasExistentes={columnas.filter((_, i) => i !== editandoColumna)}
          promptOriginal={
            snapshotsOriginales[columnas[editandoColumna].estado_db] ?? ""
          }
          onCancel={cerrarEditarColumna}
          onGuardar={guardarColumnaEditada}
        />
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════
// TabColumna
// ═════════════════════════════════════════════════════════════
const TabColumna = ({
  col,
  onChange,
  onTogglePrincipal,
  onToggleDropiPrincipal,
}) => {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={lbl}>Nombre visible</label>
        <input
          value={col.nombre || ""}
          onChange={(e) => onChange("nombre", e.target.value)}
          style={inp}
          placeholder="Ej: Contacto Inicial"
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={lbl}>
          estado_db{" "}
          <span
            style={{ fontWeight: 400, color: "#94a3b8", fontSize: ".75rem" }}
          >
            (clave interna — solo letras minúsculas, números y _)
          </span>
        </label>
        <input
          value={col.estado_db || ""}
          onChange={(e) =>
            onChange("estado_db", sanitizarEstadoDb(e.target.value))
          }
          style={{ ...inp, fontFamily: "monospace" }}
          placeholder="contacto_inicial"
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={lbl}>Paleta de color</label>
        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}
        >
          {PALETA_COLORES.map((p) => (
            <button
              key={p.label}
              title={p.label}
              onClick={() => {
                onChange("color_fondo", p.fondo);
                onChange("color_texto", p.texto);
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border:
                  col.color_fondo === p.fondo
                    ? "2.5px solid #6366f1"
                    : "1.5px solid rgba(0,0,0,.1)",
                background: p.fondo,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  col.color_fondo === p.fondo
                    ? "0 0 0 3px rgba(99,102,241,.2)"
                    : "none",
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background: p.texto,
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={lbl}>Icono</label>
        <div
          style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}
        >
          {ICONOS.map((ic) => (
            <button
              key={ic}
              onClick={() => onChange("icono", ic)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border:
                  col.icono === ic
                    ? "2px solid #6366f1"
                    : "1px solid rgba(0,0,0,.1)",
                background:
                  col.icono === ic ? "rgba(99,102,241,.08)" : "#fafafa",
                cursor: "pointer",
              }}
            >
              <i
                className={ic}
                style={{
                  fontSize: "1.1rem",
                  color: col.icono === ic ? "#6366f1" : "#374151",
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={lbl}>Estado</label>
        <SwitchRow
          label="Columna activa"
          checked={!!col.activo}
          onChange={(v) => onChange("activo", v ? 1 : 0)}
          desc="Aparece en el tablero del cliente"
        />
      </div>
      <div>
        <label style={lbl}>Comportamiento</label>
        <SwitchRow
          label="Estado final"
          checked={!!col.es_estado_final}
          onChange={(v) => onChange("es_estado_final", v ? 1 : 0)}
          desc="Desactiva IA en esta columna"
          colorOn="#ef4444"
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={lbl}>Columna principal</label>
        <SwitchRow
          label={
            col.es_principal ? "Esta es la principal" : "Marcar como principal"
          }
          checked={!!col.es_principal}
          onChange={onTogglePrincipal}
          desc="Solo UNA columna en toda la plantilla puede serlo. Los chats cerrados regresan aquí."
          colorOn="#ca8a04"
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={lbl}>Conexión principal de Dropi</label>
        <SwitchRow
          label={
            col.es_dropi_principal
              ? "Esta es la conexión principal de Dropi"
              : "Marcar como conexión Dropi"
          }
          checked={!!col.es_dropi_principal}
          onChange={onToggleDropiPrincipal}
          desc="Solo UNA columna recibe pedidos nuevos de Dropi."
          colorOn="#ea580c"
        />
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════
// TabAsistenteAdmin — solo valida placeholders preservados
// ═════════════════════════════════════════════════════════════
const TabAsistenteAdmin = ({
  col,
  onChange,
  promptOriginal,
  textareaRef,
  onInsertarEnCursor,
}) => {
  const promptLength = (col.instrucciones || "").length;

  const estadoPlaceholders = PLACEHOLDERS_RECONOCIDOS.map((ph) => {
    const enOriginal = contarOcurrencias(promptOriginal, ph);
    const enActual = contarOcurrencias(col.instrucciones || "", ph);
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

  const hayProblemas = estadoPlaceholders.some((e) => e.estado === "borrado");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SwitchRow
        label="Activar IA en esta columna"
        checked={!!col.activa_ia}
        onChange={(v) => onChange("activa_ia", v ? 1 : 0)}
        desc="Si está activado, los clientes que apliquen esta plantilla tendrán un asistente OpenAI creado en su cuenta."
        colorOn="#10b981"
      />

      {col.activa_ia ? (
        <>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div>
              <label style={lbl}>Modelo OpenAI</label>
              <select
                value={col.modelo || "gpt-4o-mini"}
                onChange={(e) => onChange("modelo", e.target.value)}
                style={inp}
              >
                <option value="gpt-4o-mini">gpt-4o-mini (recomendado)</option>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4-turbo">gpt-4-turbo</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Max tokens de respuesta</label>
              <input
                type="number"
                value={col.max_tokens || 500}
                onChange={(e) =>
                  onChange("max_tokens", Number(e.target.value) || 500)
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
                  hayProblemas ? "bx bx-error-circle" : "bx bx-shield-quarter"
                }
              />
              {hayProblemas
                ? "PLACEHOLDER BORRADO — corrige antes de guardar"
                : "Integridad de placeholders"}
            </div>

            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginBottom: 6,
              }}
            >
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
                  borrado: `BORRADO — estaba ${e.enOriginal}x. CLICK PARA INSERTAR`,
                  no_aplica: "No estaba en el original (opcional)",
                }[e.estado];
                const clickeable =
                  e.estado === "borrado" || e.estado === "no_aplica";

                return (
                  <button
                    key={e.ph}
                    onClick={() => {
                      if (clickeable) {
                        onInsertarEnCursor?.(e.ph);
                        Toast.fire({
                          icon: "success",
                          title: `${e.ph} insertado`,
                        });
                      } else {
                        navigator.clipboard.writeText(e.ph);
                        Toast.fire({
                          icon: "success",
                          title: `${e.ph} copiado`,
                        });
                      }
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
                      animation:
                        e.estado === "borrado"
                          ? "pulse-error 1.5s infinite"
                          : "none",
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

            {/* Info informativa sobre la cabecera (no validada) */}
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
                automáticamente cuando el cliente agrega instrucciones extra. NO
                necesitas escribirla en el prompt base. El sistema la pone solo
                y el cliente no puede borrarla.
              </span>
            </div>
          </div>

          {/* Editor del prompt */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 5,
              }}
            >
              <label style={{ ...lbl, marginBottom: 0 }}>
                Prompt del asistente (instrucciones)
              </label>
              <span
                style={{
                  fontSize: ".72rem",
                  color: promptLength > 8000 ? "#ef4444" : "#94a3b8",
                  fontFamily: "monospace",
                }}
              >
                {promptLength.toLocaleString()} caracteres
              </span>
            </div>

            <textarea
              ref={textareaRef}
              value={col.instrucciones || ""}
              onChange={(e) => onChange("instrucciones", e.target.value)}
              style={{
                ...inp,
                minHeight: 380,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: ".82rem",
                lineHeight: 1.55,
                resize: "vertical",
                borderColor: hayProblemas ? "#fca5a5" : "rgba(0,0,0,.12)",
              }}
              placeholder="Eres [NOMBRE_ASISTENTE], asesora de [NOMBRE_TIENDA]..."
            />
          </div>

          <style>{`
            @keyframes pulse-error {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
          `}</style>
        </>
      ) : (
        <div
          style={{
            padding: "30px 20px",
            border: "2px dashed #e5e7eb",
            borderRadius: 12,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: ".88rem",
          }}
        >
          <i
            className="bx bx-bot"
            style={{ fontSize: "2rem", display: "block", marginBottom: 8 }}
          />
          Activa IA arriba para configurar el prompt y modelo.
        </div>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════
// TabAcciones (sin cambios)
// ═════════════════════════════════════════════════════════════
const TIPOS_ACCION_META = {
  cambiar_estado: {
    label: "Cambiar estado",
    icono: "bx bx-transfer-alt",
    color: "#6366f1",
  },
  contexto_productos: {
    label: "Contexto productos",
    icono: "bx bx-package",
    color: "#10b981",
  },
  contexto_calendario: {
    label: "Contexto calendario",
    icono: "bx bx-calendar",
    color: "#3b82f6",
  },
  agendar_cita: {
    label: "Agendar cita",
    icono: "bx bx-calendar-check",
    color: "#8b5cf6",
  },
  enviar_media: {
    label: "Enviar media",
    icono: "bx bx-image",
    color: "#f59e0b",
  },
};

const TabAcciones = ({ col, columnas, onChange }) => {
  const acciones = col.acciones || [];

  const agregar = (tipo) => {
    const defaults = {
      cambiar_estado: { trigger: "", estado_destino: "" },
      agendar_cita: { trigger: "[cita_confirmada]: true" },
      contexto_productos: {},
      contexto_calendario: {},
      enviar_media: {},
    };
    const nueva = {
      tipo_accion: tipo,
      config: defaults[tipo] || {},
      orden: acciones.length + 1,
    };
    onChange([...acciones, nueva]);
  };

  const eliminar = (idx) => onChange(acciones.filter((_, i) => i !== idx));

  const actualizarConfig = (idx, nuevaConfig) => {
    onChange(
      acciones.map((a, i) => (i === idx ? { ...a, config: nuevaConfig } : a)),
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: ".72rem",
            fontWeight: 700,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: ".06em",
            marginBottom: 10,
          }}
        >
          Agregar acción
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(TIPOS_ACCION_META).map(([tipo, meta]) => {
            const yaExisteUnico =
              tipo !== "cambiar_estado" &&
              acciones.some((a) => a.tipo_accion === tipo);
            return (
              <button
                key={tipo}
                disabled={yaExisteUnico}
                onClick={() => agregar(tipo)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  borderRadius: 999,
                  border: `1.5px solid ${yaExisteUnico ? "#e5e7eb" : meta.color + "44"}`,
                  background: yaExisteUnico ? "#f9fafb" : `${meta.color}0d`,
                  color: yaExisteUnico ? "#9ca3af" : meta.color,
                  fontWeight: 600,
                  fontSize: ".78rem",
                  cursor: yaExisteUnico ? "not-allowed" : "pointer",
                }}
              >
                <i className={meta.icono} />
                {meta.label}
                {yaExisteUnico && <i className="bx bx-check" />}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          fontSize: ".72rem",
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          marginBottom: 10,
        }}
      >
        Configuradas ({acciones.length})
      </div>

      {acciones.length === 0 ? (
        <div
          style={{
            padding: "30px 20px",
            border: "2px dashed #e5e7eb",
            borderRadius: 12,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: ".85rem",
          }}
        >
          Sin acciones configuradas. Agrega una desde los botones de arriba.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {acciones.map((acc, idx) => (
            <AccionInlineCard
              key={idx}
              accion={acc}
              columnas={columnas}
              onChange={(cfg) => actualizarConfig(idx, cfg)}
              onDelete={() => eliminar(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const AccionInlineCard = ({ accion, columnas, onChange, onDelete }) => {
  const meta = TIPOS_ACCION_META[accion.tipo_accion] || {
    label: accion.tipo_accion,
    icono: "bx bx-cog",
    color: "#6b7280",
  };
  const cfg = accion.config || {};

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1.5px solid ${meta.color}22`,
        background: `${meta.color}05`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: `1px solid ${meta.color}15`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: `${meta.color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className={meta.icono} style={{ color: meta.color }} />
          </div>
          <div>
            <div
              style={{ fontWeight: 700, fontSize: ".87rem", color: "#0f172a" }}
            >
              {meta.label}
            </div>
            <div
              style={{
                fontSize: ".68rem",
                color: "#94a3b8",
                fontFamily: "monospace",
              }}
            >
              {accion.tipo_accion}
            </div>
          </div>
        </div>
        <button
          onClick={onDelete}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#ef4444",
            padding: 5,
            borderRadius: 7,
          }}
          title="Eliminar acción"
        >
          <i className="bx bx-trash" style={{ fontSize: "1.05rem" }} />
        </button>
      </div>

      <div style={{ padding: "12px 14px" }}>
        {accion.tipo_accion === "cambiar_estado" && (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div>
              <label style={lbl}>Palabra clave</label>
              <input
                value={(cfg.trigger || "").replace(/^\[|\]:true$/gi, "")}
                onChange={(e) => {
                  const palabra = e.target.value.replace(/[\[\]:]/g, "").trim();
                  onChange({
                    ...cfg,
                    trigger: palabra ? `[${palabra}]:true` : "",
                  });
                }}
                style={inp}
                placeholder="ej: asesor"
              />
              {cfg.trigger && (
                <code
                  style={{
                    display: "inline-block",
                    marginTop: 5,
                    fontSize: ".75rem",
                    background: "#ede9fe",
                    color: "#6d28d9",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  {cfg.trigger}
                </code>
              )}
            </div>
            <div>
              <label style={lbl}>Mover a columna</label>
              <select
                value={cfg.estado_destino || ""}
                onChange={(e) =>
                  onChange({ ...cfg, estado_destino: e.target.value })
                }
                style={inp}
              >
                <option value="">Seleccionar columna...</option>
                {columnas.map((c) => (
                  <option key={c.estado_db} value={c.estado_db}>
                    {c.nombre} ({c.estado_db})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {accion.tipo_accion === "agendar_cita" && (
          <div>
            <label style={lbl}>Trigger</label>
            <input
              value={cfg.trigger || ""}
              onChange={(e) => onChange({ ...cfg, trigger: e.target.value })}
              style={{ ...inp, fontFamily: "monospace" }}
              placeholder="[cita_confirmada]: true"
            />
          </div>
        )}

        {(accion.tipo_accion === "contexto_productos" ||
          accion.tipo_accion === "contexto_calendario" ||
          accion.tipo_accion === "enviar_media") && (
          <div
            style={{
              padding: "8px 12px",
              background: `${meta.color}08`,
              borderRadius: 8,
              fontSize: ".78rem",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <i className="bx bx-info-circle" style={{ color: meta.color }} />
            {accion.tipo_accion === "contexto_productos" &&
              "El catálogo de productos del cliente se inyecta automáticamente al asistente."}
            {accion.tipo_accion === "contexto_calendario" &&
              "Los horarios disponibles se inyectan como contexto."}
            {accion.tipo_accion === "enviar_media" &&
              "Las URLs [producto_imagen_url] y similares se extraen y envían por WhatsApp."}
          </div>
        )}
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════
// SwitchRow + estilos
// ═════════════════════════════════════════════════════════════
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
      marginTop: 6,
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

export default EditorColumnas;
