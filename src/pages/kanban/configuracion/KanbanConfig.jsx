import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter"; // ajusta si tu ruta es diferente
import TabAsistente from "./TabAsistente";

// ─────────────────────────────────────────────────────────────
// Constantes de UI
// ─────────────────────────────────────────────────────────────
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

const TIPOS_ACCION = {
  cambiar_estado: {
    label: "Cambiar estado",
    icono: "bx bx-transfer-alt",
    color: "#6366f1",
  },
  contexto_productos: {
    label: "Contexto de productos",
    icono: "bx bx-package",
    color: "#10b981",
  },
  contexto_calendario: {
    label: "Contexto de calendario",
    icono: "bx bx-calendar",
    color: "#3b82f6",
  },
  enviar_media: {
    label: "Enviar imágenes/videos",
    icono: "bx bx-image",
    color: "#f59e0b",
  },
  agendar_cita: {
    label: "Agendar cita",
    icono: "bx bx-calendar-check",
    color: "#8b5cf6",
  },
  /* separador_productos: {
    label: "Separador de productos",
    icono: "bx bx-list-ul",
    color: "#ec4899",
  }, */
};

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const parseConfig = (c) => {
  try {
    return typeof c === "string" ? JSON.parse(c) : c || {};
  } catch {
    return {};
  }
};

// ─────────────────────────────────────────────────────────────
// KanbanConfig
// ─────────────────────────────────────────────────────────────
const KanbanConfig = () => {
  const [id_configuracion] = useState(() =>
    parseInt(localStorage.getItem("id_configuracion"), 10),
  );

  const [columnas, setColumnas] = useState([]);
  const [loadingCol, setLoadingCol] = useState(true);
  const [columnaActiva, setColumnaActiva] = useState(null);
  const [tabActiva, setTabActiva] = useState("columna");

  const [formCol, setFormCol] = useState(null);

  const [acciones, setAcciones] = useState([]);
  const [loadingAcc, setLoadingAcc] = useState(false);
  const [guardandoAcc, setGuardandoAcc] = useState(false);

  const [showModalNueva, setShowModalNueva] = useState(false);
  const [formNueva, setFormNueva] = useState({
    nombre: "",
    estado_db: "",
    color_fondo: "#EFF6FF",
    color_texto: "#1D4ED8",
    icono: "bx bx-phone",
    es_estado_final: 0,
  });
  const [guardandoNueva, setGuardandoNueva] = useState(false);

  // ── Cargar columnas ──────────────────────────────────────
  const cargarColumnas = useCallback(async () => {
    setLoadingCol(true);
    try {
      const { data } = await chatApi.post("/kanban_columnas/listar", {
        id_configuracion,
      });
      if (data?.success) {
        const cols = data.data || [];
        setColumnas(cols);
        if (cols.length && !columnaActiva) setColumnaActiva(cols[0].id);
      }
    } catch {
      Toast.fire({ icon: "error", title: "Error cargando columnas" });
    } finally {
      setLoadingCol(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id_configuracion]);

  useEffect(() => {
    cargarColumnas();
  }, [cargarColumnas]);

  // ── Sync form al cambiar columna activa ──────────────────
  useEffect(() => {
    if (!columnaActiva) return;
    const col = columnas.find((c) => c.id === columnaActiva);
    if (!col) return;
    setFormCol({
      nombre: col.nombre || "",
      color_fondo: col.color_fondo || "#EFF6FF",
      color_texto: col.color_texto || "#1D4ED8",
      icono: col.icono || "bx bx-phone",
      activo: col.activo ?? 1,
      es_estado_final: col.es_estado_final ?? 0,
    });
    cargarAcciones(col.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnaActiva, columnas]);

  const cargarAcciones = async (id_kanban_columna) => {
    setLoadingAcc(true);
    try {
      const { data } = await chatApi.post("/kanban_acciones/listar", {
        id_kanban_columna,
      });
      if (data?.success) setAcciones(data.data || []);
      else setAcciones([]);
    } catch {
      setAcciones([]);
    } finally {
      setLoadingAcc(false);
    }
  };

  // ── Guardar columna ──────────────────────────────────────
  const guardarColumna = async () => {
    try {
      const { data } = await chatApi.post("/kanban_columnas/actualizar", {
        id: columnaActiva,
        id_configuracion,
        ...formCol,
      });
      if (data?.success) {
        Toast.fire({ icon: "success", title: "Columna actualizada" });
        cargarColumnas();
      }
    } catch {
      Toast.fire({ icon: "error", title: "Error al guardar" });
    }
  };

  // ── Agregar acción ───────────────────────────────────────
  const agregarAccion = async (tipo_accion) => {
    const defaults = {
      cambiar_estado: { trigger: "", estado_destino: "" },
      agendar_cita: { trigger: "[cita_confirmada]: true" },
      separador_productos: { assistant_id: "" },
    };
    setGuardandoAcc(true);
    try {
      const { data } = await chatApi.post("/kanban_acciones/crear", {
        id_kanban_columna: columnaActiva,
        id_configuracion,
        tipo_accion,
        config: defaults[tipo_accion] || {},
        orden: acciones.length,
      });
      if (data?.success) {
        Toast.fire({ icon: "success", title: "Acción agregada" });
        cargarAcciones(columnaActiva);

        // ← AUTO-SYNC al agregar contexto_productos
        if (tipo_accion === "contexto_productos") {
          Swal.fire({
            title: "Sincronizando catálogo",
            html: "Por favor espere mientras se sincronizan todos los productos.<br><br><small style='color:#64748b'>Esto puede demorar un momento dependiendo de la cantidad de productos que posea.</small>",
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading(),
          });

          chatApi
            .post("/kanban_columnas/sincronizar_catalogo", {
              id: columnaActiva,
            })
            .then(({ data: syncData }) => {
              Swal.fire({
                icon: "success",
                title: "¡Catálogo sincronizado!",
                text: `Se indexaron ${syncData.data.total_items} productos correctamente.`,
                confirmButtonColor: "#6366f1",
              });
            })
            .catch(() => {
              Swal.fire({
                icon: "warning",
                title: "Acción guardada",
                text: "No se pudo sincronizar el catálogo automáticamente. Puedes hacerlo manualmente desde la pestaña Asistente.",
                confirmButtonColor: "#6366f1",
              });
            });
        }
      }
    } catch {
      Toast.fire({ icon: "error", title: "Error al agregar acción" });
    } finally {
      setGuardandoAcc(false);
    }
  };

  const actualizarConfigAccion = async (id_accion, newConfig) => {
    try {
      await chatApi.post("/kanban_acciones/actualizar", {
        id: id_accion,
        config: newConfig,
      });
      setAcciones((prev) =>
        prev.map((a) => (a.id === id_accion ? { ...a, config: newConfig } : a)),
      );
    } catch {
      Toast.fire({ icon: "error", title: "Error al actualizar acción" });
    }
  };

  const eliminarAccion = async (id_accion) => {
    const res = await Swal.fire({
      title: "¿Eliminar acción?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Eliminar",
    });
    if (!res.isConfirmed) return;
    try {
      await chatApi.post("/kanban_acciones/eliminar", { id: id_accion });
      Toast.fire({ icon: "success", title: "Acción eliminada" });
      cargarAcciones(columnaActiva);
    } catch {
      Toast.fire({ icon: "error", title: "Error al eliminar" });
    }
  };

  // ── Crear columna nueva ──────────────────────────────────
  const crearColumna = async () => {
    if (!formNueva.nombre || !formNueva.estado_db) {
      Toast.fire({
        icon: "warning",
        title: "Nombre y estado_db son obligatorios",
      });
      return;
    }
    setGuardandoNueva(true);
    try {
      const { data } = await chatApi.post("/kanban_columnas/crear", {
        id_configuracion,
        ...formNueva,
      });
      if (data?.success) {
        Toast.fire({ icon: "success", title: "Columna creada" });
        setShowModalNueva(false);
        setFormNueva({
          nombre: "",
          estado_db: "",
          color_fondo: "#EFF6FF",
          color_texto: "#1D4ED8",
          icono: "bx bx-phone",
          es_estado_final: 0,
        });
        cargarColumnas();
      } else {
        Toast.fire({ icon: "error", title: data?.message || "Error al crear" });
      }
    } catch {
      Toast.fire({ icon: "error", title: "Error al crear columna" });
    } finally {
      setGuardandoNueva(false);
    }
  };

  const columnaSeleccionada = columnas.find((c) => c.id === columnaActiva);

  // ── Loading ──────────────────────────────────────────────
  if (loadingCol)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          flexDirection: "column",
          gap: 12,
          color: "#888",
        }}
      >
        <i
          className="bx bx-loader-alt bx-spin"
          style={{ fontSize: "2.5rem" }}
        />
        <span>Cargando configuración...</span>
      </div>
    );

  return (
    <div
      style={{ padding: 24, fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              margin: 0,
              color: "#0f172a",
              letterSpacing: "-0.5px",
            }}
          >
            <i
              className="bx bx-columns"
              style={{ marginRight: 10, color: "#6366f1" }}
            />
            Configuración del Kanban
          </h1>
          <p
            style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.9rem" }}
          >
            Define columnas, asistentes de IA y acciones automáticas por etapa.
          </p>
        </div>
        <button onClick={() => setShowModalNueva(true)} style={btnPrimario}>
          <i className="bx bx-plus" style={{ fontSize: "1.1rem" }} />
          Nueva columna
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Sidebar columnas */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,.07)",
            overflow: "hidden",
            boxShadow: "0 2px 12px rgba(0,0,0,.05)",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(0,0,0,.06)",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Columnas ({columnas.length})
          </div>
          {columnas.map((col) => (
            <div
              key={col.id}
              onClick={() => {
                setColumnaActiva(col.id);
                setTabActiva("columna");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 14px",
                cursor: "pointer",
                borderLeft:
                  col.id === columnaActiva
                    ? "3px solid #6366f1"
                    : "3px solid transparent",
                background:
                  col.id === columnaActiva
                    ? "rgba(99,102,241,.06)"
                    : "transparent",
                transition: "all .12s",
                borderBottom: "1px solid rgba(0,0,0,.04)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: col.color_fondo,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <i
                  className={col.icono || "bx bx-circle"}
                  style={{ color: col.color_texto, fontSize: "1rem" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.83rem",
                    color: col.id === columnaActiva ? "#4338ca" : "#1e293b",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.nombre}
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "#94a3b8",
                    fontFamily: "monospace",
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
                }}
              >
                {!!col.activa_ia && (
                  <span
                    style={{
                      fontSize: "0.62rem",
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
                {!col.activo && (
                  <span
                    style={{
                      fontSize: "0.62rem",
                      background: "#fee2e2",
                      color: "#dc2626",
                      borderRadius: 999,
                      padding: "1px 5px",
                      fontWeight: 700,
                    }}
                  >
                    OFF
                  </span>
                )}
              </div>
            </div>
          ))}
          {!columnas.length && (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "0.83rem",
              }}
            >
              Sin columnas.
              <br />
              Crea la primera.
            </div>
          )}
        </div>

        {/* Panel principal */}
        {columnaSeleccionada ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid rgba(0,0,0,.07)",
              boxShadow: "0 2px 12px rgba(0,0,0,.05)",
              overflow: "hidden",
            }}
          >
            {/* Preview columna */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid rgba(0,0,0,.06)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "linear-gradient(135deg,#fafbff,#f1f5f9)",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background:
                    formCol?.color_fondo || columnaSeleccionada.color_fondo,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 3px 10px rgba(0,0,0,.1)",
                }}
              >
                <i
                  className={
                    formCol?.icono ||
                    columnaSeleccionada.icono ||
                    "bx bx-circle"
                  }
                  style={{
                    color:
                      formCol?.color_texto || columnaSeleccionada.color_texto,
                    fontSize: "1.3rem",
                  }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "1.05rem",
                    color: "#0f172a",
                  }}
                >
                  {formCol?.nombre || columnaSeleccionada.nombre}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    fontFamily: "monospace",
                    marginTop: 2,
                  }}
                >
                  estado_db: <strong>{columnaSeleccionada.estado_db}</strong>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid rgba(0,0,0,.06)",
                padding: "0 24px",
              }}
            >
              {[
                { key: "columna", label: "Columna", icono: "bx bx-customize" },
                { key: "asistente", label: "Asistente", icono: "bx bx-bot" },
                {
                  key: "acciones",
                  label: "Acciones",
                  icono: "bx bx-zap",
                  badge: acciones.length,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setTabActiva(tab.key)}
                  style={{
                    padding: "13px 18px",
                    border: "none",
                    background: "transparent",
                    fontSize: "0.87rem",
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
                    transition: "all .12s",
                    marginBottom: -1,
                  }}
                >
                  <i className={tab.icono} style={{ fontSize: "1rem" }} />
                  {tab.label}
                  {tab.badge > 0 && (
                    <span
                      style={{
                        background: "#6366f1",
                        color: "#fff",
                        borderRadius: 999,
                        fontSize: "0.68rem",
                        padding: "0 5px",
                        fontWeight: 700,
                        lineHeight: "1.5",
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── TAB COLUMNA ──────────────────────────────── */}
            {tabActiva === "columna" && formCol && (
              <div style={{ padding: 24 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 20,
                  }}
                >
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={lbl}>Nombre visible</label>
                    <input
                      value={formCol.nombre}
                      onChange={(e) =>
                        setFormCol((p) => ({ ...p, nombre: e.target.value }))
                      }
                      style={inp}
                      placeholder="Ej: Contacto Inicial"
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={lbl}>Paleta de color</label>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: 6,
                      }}
                    >
                      {PALETA_COLORES.map((p) => (
                        <button
                          key={p.label}
                          title={p.label}
                          onClick={() =>
                            setFormCol((prev) => ({
                              ...prev,
                              color_fondo: p.fondo,
                              color_texto: p.texto,
                            }))
                          }
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            border:
                              formCol.color_fondo === p.fondo
                                ? "2.5px solid #6366f1"
                                : "1.5px solid rgba(0,0,0,.1)",
                            background: p.fondo,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow:
                              formCol.color_fondo === p.fondo
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
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: 6,
                      }}
                    >
                      {ICONOS.map((ic) => (
                        <button
                          key={ic}
                          onClick={() =>
                            setFormCol((p) => ({ ...p, icono: ic }))
                          }
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border:
                              formCol.icono === ic
                                ? "2px solid #6366f1"
                                : "1px solid rgba(0,0,0,.1)",
                            background:
                              formCol.icono === ic
                                ? "rgba(99,102,241,.08)"
                                : "#fafafa",
                            cursor: "pointer",
                            transition: "all .1s",
                          }}
                        >
                          <i
                            className={ic}
                            style={{
                              fontSize: "1.2rem",
                              color:
                                formCol.icono === ic ? "#6366f1" : "#374151",
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Estado de la columna</label>
                    <SwitchRow
                      label="Columna activa"
                      checked={!!formCol.activo}
                      onChange={(v) =>
                        setFormCol((p) => ({ ...p, activo: v ? 1 : 0 }))
                      }
                      desc="Aparece en el tablero"
                    />
                  </div>
                  <div>
                    <label style={lbl}>Comportamiento de IA</label>
                    <SwitchRow
                      label="Estado final"
                      checked={!!formCol.es_estado_final}
                      onChange={(v) =>
                        setFormCol((p) => ({
                          ...p,
                          es_estado_final: v ? 1 : 0,
                        }))
                      }
                      desc="Desactiva IA en esta columna"
                      colorOn="#ef4444"
                    />
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 24,
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button onClick={guardarColumna} style={btnPrimario}>
                    <i className="bx bx-save" /> Guardar cambios
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB ASISTENTE ────────────────────────────── */}
            {tabActiva === "asistente" && (
              <TabAsistente
                columnaId={columnaActiva}
                columnaActiva_ia={columnaSeleccionada?.activa_ia}
                columnaMax_tokens={columnaSeleccionada?.max_tokens}
                idConfiguracion={localStorage.getItem("id_configuracion")}
                columnas={columnas} // ← agregar
                onAssistantCreado={(assistant_id) => {
                  setColumnas((prev) =>
                    prev.map((c) =>
                      c.id === columnaActiva
                        ? { ...c, assistant_id, activa_ia: 1 }
                        : c,
                    ),
                  );
                }}
                onColumnaActualizada={({ activa_ia, max_tokens }) => {
                  setColumnas((prev) =>
                    prev.map((c) =>
                      c.id === columnaActiva
                        ? { ...c, activa_ia, max_tokens }
                        : c,
                    ),
                  );
                }}
              />
            )}
            {/* ── TAB ACCIONES ─────────────────────────────── */}
            {tabActiva === "acciones" && (
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 22 }}>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 10,
                    }}
                  >
                    Agregar acción
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {Object.entries(TIPOS_ACCION).map(([tipo, meta]) => {
                      const yaExiste =
                        tipo !== "cambiar_estado" &&
                        acciones.some((a) => a.tipo_accion === tipo);
                      return (
                        <button
                          key={tipo}
                          disabled={yaExiste || guardandoAcc}
                          onClick={() => agregarAccion(tipo)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 7,
                            padding: "8px 14px",
                            borderRadius: 999,
                            border: `1.5px solid ${yaExiste ? "#e5e7eb" : meta.color + "44"}`,
                            background: yaExiste
                              ? "#f9fafb"
                              : `${meta.color}0d`,
                            color: yaExiste ? "#9ca3af" : meta.color,
                            fontWeight: 600,
                            fontSize: "0.82rem",
                            cursor: yaExiste ? "not-allowed" : "pointer",
                            transition: "all .12s",
                          }}
                        >
                          <i
                            className={meta.icono}
                            style={{ fontSize: "1rem" }}
                          />
                          {meta.label}
                          {yaExiste && (
                            <i
                              className="bx bx-check"
                              style={{ fontSize: "0.9rem" }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                  }}
                >
                  Configuradas ({acciones.length})
                </div>

                {loadingAcc && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 30,
                      color: "#94a3b8",
                    }}
                  >
                    <i
                      className="bx bx-loader-alt bx-spin"
                      style={{ fontSize: "1.5rem" }}
                    />
                  </div>
                )}

                {!loadingAcc && !acciones.length && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "36px 20px",
                      borderRadius: 14,
                      border: "2px dashed #e5e7eb",
                      color: "#94a3b8",
                    }}
                  >
                    <i
                      className="bx bx-zap"
                      style={{
                        fontSize: "2rem",
                        marginBottom: 8,
                        display: "block",
                      }}
                    />
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      Sin acciones configuradas
                    </div>
                    <div style={{ fontSize: "0.82rem" }}>
                      Agrega una acción desde los botones de arriba.
                    </div>
                  </div>
                )}

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {acciones.map((acc) => (
                    <AccionCard
                      key={acc.id}
                      accion={acc}
                      columnas={columnas}
                      onUpdate={(cfg) => actualizarConfigAccion(acc.id, cfg)}
                      onDelete={() => eliminarAccion(acc.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid rgba(0,0,0,.07)",
              padding: 40,
              textAlign: "center",
              color: "#94a3b8",
            }}
          >
            <i
              className="bx bx-columns"
              style={{ fontSize: "3rem", marginBottom: 12, display: "block" }}
            />
            <div style={{ fontWeight: 600 }}>
              Selecciona una columna para editarla
            </div>
          </div>
        )}
      </div>

      {/* Modal nueva columna */}
      {showModalNueva && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 28,
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 25px 60px rgba(0,0,0,.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Nueva columna
              </h3>
              <button
                onClick={() => setShowModalNueva(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  fontSize: "1.4rem",
                  lineHeight: 1,
                  padding: 4,
                }}
              >
                <i className="bx bx-x" />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Nombre visible *</label>
                <input
                  value={formNueva.nombre}
                  onChange={(e) =>
                    setFormNueva((p) => ({ ...p, nombre: e.target.value }))
                  }
                  style={inp}
                  placeholder="Ej: Contacto Inicial"
                />
              </div>
              <div>
                <label style={lbl}>
                  estado_db *{" "}
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.73rem",
                      color: "#94a3b8",
                    }}
                  >
                    (clave interna, no editable después)
                  </span>
                </label>
                <input
                  value={formNueva.estado_db}
                  onChange={(e) =>
                    setFormNueva((p) => ({
                      ...p,
                      estado_db: e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "_"),
                    }))
                  }
                  style={{ ...inp, fontFamily: "monospace" }}
                  placeholder="contacto_inicial"
                />
              </div>
              <div>
                <label style={lbl}>Color</label>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 6,
                  }}
                >
                  {PALETA_COLORES.map((p) => (
                    <button
                      key={p.label}
                      title={p.label}
                      onClick={() =>
                        setFormNueva((prev) => ({
                          ...prev,
                          color_fondo: p.fondo,
                          color_texto: p.texto,
                        }))
                      }
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border:
                          formNueva.color_fondo === p.fondo
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
                          width: 12,
                          height: 12,
                          borderRadius: 3,
                          background: p.texto,
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Icono</label>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    marginTop: 6,
                  }}
                >
                  {ICONOS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setFormNueva((p) => ({ ...p, icono: ic }))}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border:
                          formNueva.icono === ic
                            ? "2px solid #6366f1"
                            : "1px solid rgba(0,0,0,.1)",
                        background:
                          formNueva.icono === ic
                            ? "rgba(99,102,241,.08)"
                            : "#fafafa",
                        cursor: "pointer",
                      }}
                    >
                      <i
                        className={ic}
                        style={{
                          fontSize: "1.1rem",
                          color: formNueva.icono === ic ? "#6366f1" : "#374151",
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 22,
              }}
            >
              <button
                onClick={() => setShowModalNueva(false)}
                style={btnSecundario}
              >
                Cancelar
              </button>
              <button
                onClick={crearColumna}
                disabled={guardandoNueva}
                style={btnPrimario}
              >
                {guardandoNueva ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" /> Creando...
                  </>
                ) : (
                  <>
                    <i className="bx bx-plus" /> Crear columna
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// AccionCard
// ─────────────────────────────────────────────────────────────
const AccionCard = ({ accion, columnas, onUpdate, onDelete }) => {
  const meta = TIPOS_ACCION[accion.tipo_accion] || {
    label: accion.tipo_accion,
    icono: "bx bx-cog",
    color: "#6b7280",
  };
  const [local, setLocal] = useState(parseConfig(accion.config));
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    setSaving(true);
    await onUpdate(local);
    setSaving(false);
    Toast.fire({ icon: "success", title: "Acción guardada" });
  };

  return (
    <div
      style={{
        borderRadius: 14,
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
          padding: "11px 16px",
          borderBottom: `1px solid ${meta.color}15`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `${meta.color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i
              className={meta.icono}
              style={{ color: meta.color, fontSize: "1.1rem" }}
            />
          </div>
          <div>
            <div
              style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}
            >
              {meta.label}
            </div>
            <div
              style={{
                fontSize: "0.7rem",
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
          title="Eliminar acción"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#ef4444",
            padding: 6,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
          }}
        >
          <i className="bx bx-trash" style={{ fontSize: "1.1rem" }} />
        </button>
      </div>

      <div style={{ padding: "14px 16px" }}>
        {accion.tipo_accion === "cambiar_estado" && (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label style={lbl}>
                Trigger (texto en la respuesta del asistente)
              </label>
              <input
                value={local.trigger || ""}
                onChange={(e) =>
                  setLocal((p) => ({ ...p, trigger: e.target.value }))
                }
                style={inp}
                placeholder="Ej: [pedido_confirmado]: true"
              />
              <div
                style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 3 }}
              >
                Si la respuesta contiene este texto exacto…
              </div>
            </div>
            <div>
              <label style={lbl}>Mover contacto a columna</label>
              <select
                value={local.estado_destino || ""}
                onChange={(e) =>
                  setLocal((p) => ({ ...p, estado_destino: e.target.value }))
                }
                style={sel}
              >
                <option value="">Seleccionar columna destino</option>
                {columnas.map((c) => (
                  <option key={c.id} value={c.estado_db}>
                    {c.nombre} ({c.estado_db})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {accion.tipo_accion === "agendar_cita" && (
          <div>
            <label style={lbl}>Trigger para agendar cita</label>
            <input
              value={local.trigger || "[cita_confirmada]: true"}
              onChange={(e) =>
                setLocal((p) => ({ ...p, trigger: e.target.value }))
              }
              style={{ ...inp, fontFamily: "monospace" }}
            />
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 3 }}>
              El asistente debe incluir este tag en su respuesta para disparar
              el agendamiento.
            </div>
          </div>
        )}

        {accion.tipo_accion === "separador_productos" && (
          <div>
            <label style={lbl}>Assistant ID del separador</label>
            <input
              value={local.assistant_id || ""}
              onChange={(e) =>
                setLocal((p) => ({ ...p, assistant_id: e.target.value }))
              }
              style={{ ...inp, fontFamily: "monospace" }}
              placeholder="asst_xxxxxxxxxxxxxxxx"
            />
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 3 }}>
              Asistente que identifica los productos mencionados antes de
              pasarlos al principal.
            </div>
          </div>
        )}

        {["contexto_productos", "contexto_calendario", "enviar_media"].includes(
          accion.tipo_accion,
        ) && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: `${meta.color}08`,
              fontSize: "0.82rem",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <i
              className="bx bx-info-circle"
              style={{ color: meta.color, fontSize: "1.1rem", flexShrink: 0 }}
            />
            {accion.tipo_accion === "contexto_productos" &&
              "El catálogo se inyecta automáticamente. Usa el botón Sincronizar en la pestaña Asistente para actualizarlo."}
            {accion.tipo_accion === "contexto_calendario" &&
              "Los horarios disponibles se inyectan como contexto antes de llamar al asistente."}
            {accion.tipo_accion === "enviar_media" &&
              "Las URLs [producto_imagen_url] y [producto_video_url] de la respuesta se enviarán automáticamente por WhatsApp."}
          </div>
        )}

        {["cambiar_estado", "agendar_cita", "separador_productos"].includes(
          accion.tipo_accion,
        ) && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 12,
            }}
          >
            <button
              onClick={guardar}
              disabled={saving}
              style={{
                ...btnPrimario,
                fontSize: "0.8rem",
                padding: "7px 14px",
              }}
            >
              {saving ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <i className="bx bx-save" />
                  Guardar
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-componentes de UI
// ─────────────────────────────────────────────────────────────
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
      <div style={{ fontWeight: 600, fontSize: "0.87rem", color: "#0f172a" }}>
        {label}
      </div>
      {desc && (
        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{desc}</div>
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
  fontSize: "0.8rem",
  fontWeight: 700,
  color: "#374151",
  marginBottom: 5,
};
const inp = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.12)",
  fontSize: "0.85rem",
  outline: "none",
  background: "#fafafa",
  color: "#1e293b",
  boxSizing: "border-box",
};
const sel = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.12)",
  fontSize: "0.85rem",
  outline: "none",
  background: "#fafafa",
  color: "#1e293b",
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
  fontSize: "0.875rem",
  cursor: "pointer",
  boxShadow: "0 3px 10px rgba(99,102,241,.3)",
  transition: "all .15s",
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
  fontSize: "0.875rem",
  cursor: "pointer",
  transition: "all .15s",
};

export default KanbanConfig;
