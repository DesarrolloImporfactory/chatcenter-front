// src/pages/kanban/configuracion/componentes/MisPlantillas.jsx
import React, { useState } from "react";
import Swal from "sweetalert2";
import chatApi from "../../../../api/chatcenter";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const BG_DARK = "rgb(23, 25, 49)";

const MisPlantillas = ({ id_configuracion, onPlantillaAplicada }) => {
  // ── Modal guardar ─────────────────────────────────────────
  const [showGuardar, setShowGuardar] = useState(false);
  const [nombreNueva, setNombreNueva] = useState("");
  const [descNueva, setDescNueva] = useState("");
  const [guardando, setGuardando] = useState(false);

  // ── Modal listar ──────────────────────────────────────────
  const [showListar, setShowListar] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [aplicando, setAplicando] = useState(null);

  // ── Guardar plantilla actual ──────────────────────────────
  const handleGuardar = async () => {
    if (!nombreNueva.trim()) {
      Toast.fire({ icon: "warning", title: "Ingresa un nombre" });
      return;
    }
    setGuardando(true);
    try {
      const { data } = await chatApi.post(
        "/kanban_plantillas/guardar_cliente",
        {
          id_configuracion,
          nombre: nombreNueva.trim(),
          descripcion: descNueva.trim() || null,
        },
      );
      if (data?.success) {
        Toast.fire({ icon: "success", title: "Plantilla guardada" });
        setShowGuardar(false);
        setNombreNueva("");
        setDescNueva("");
      }
    } catch {
      Toast.fire({ icon: "error", title: "Error al guardar" });
    } finally {
      setGuardando(false);
    }
  };

  // ── Cargar lista ──────────────────────────────────────────
  const handleAbrirLista = async () => {
    setShowListar(true);
    setLoadingList(true);
    try {
      const { data } = await chatApi.post("/kanban_plantillas/listar_cliente", {
        id_configuracion,
      });
      if (data?.success) setPlantillas(data.data || []);
    } catch {
      Toast.fire({ icon: "error", title: "Error al cargar" });
    } finally {
      setLoadingList(false);
    }
  };

  // ── Aplicar plantilla guardada ────────────────────────────
  const handleAplicar = async (plantilla) => {
    const confirm = await Swal.fire({
      title: `¿Aplicar "${plantilla.nombre}"?`,
      html: `Se crearán <strong>${plantilla.total_columnas} columnas</strong>.<br><small style="color:#64748b">No elimina las columnas existentes.</small>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: BG_DARK,
      confirmButtonText: "Aplicar",
      cancelButtonText: "Cancelar",
      customClass: { container: "swal-over-modal" },
    });
    if (!confirm.isConfirmed) return;

    setAplicando(plantilla.id);
    try {
      const { data } = await chatApi.post(
        "/kanban_plantillas/aplicar_cliente",
        {
          id_configuracion,
          id_plantilla: plantilla.id,
        },
      );
      if (data?.success) {
        Toast.fire({ icon: "success", title: "¡Plantilla aplicada!" });
        setShowListar(false);
        onPlantillaAplicada?.();
      }
    } catch {
      Toast.fire({ icon: "error", title: "Error al aplicar" });
    } finally {
      setAplicando(null);
    }
  };

  // ── Eliminar plantilla guardada ───────────────────────────
  const handleEliminar = async (plantilla) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar plantilla?",
      text: `Se eliminará "${plantilla.nombre}" permanentemente.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      customClass: { container: "swal-over-modal" },
    });
    if (!confirm.isConfirmed) return;

    try {
      await chatApi.post("/kanban_plantillas/eliminar_cliente", {
        id: plantilla.id,
        id_configuracion,
      });
      setPlantillas((prev) => prev.filter((p) => p.id !== plantilla.id));
      Toast.fire({ icon: "success", title: "Eliminada" });
    } catch {
      Toast.fire({ icon: "error", title: "Error al eliminar" });
    }
  };

  return (
    <>
      <style>{`
        .swal-over-modal { z-index: 99999 !important; }
        @keyframes mp-fadeIn {
          from{opacity:0;transform:scale(.97) translateY(6px)}
          to{opacity:1;transform:scale(1) translateY(0)}
        }
        @keyframes mp-overlay{from{opacity:0}to{opacity:1}}
        .mp-overlay {
          position:fixed;inset:0;background:rgba(10,10,20,.55);
          backdrop-filter:blur(4px);
          display:flex;align-items:center;justify-content:center;
          z-index:9999;padding:16px;animation:mp-overlay .2s ease;
        }
        .mp-modal {
          background:#fff;border-radius:18px;
          width:100%;max-width:520px;max-height:88vh;
          display:flex;flex-direction:column;
          box-shadow:0 32px 80px rgba(0,0,0,.22);
          animation:mp-fadeIn .25s ease;overflow:hidden;
        }
        .mp-header {
          background:${BG_DARK};padding:18px 22px;
          border-radius:18px 18px 0 0;flex-shrink:0;
        }
        .mp-body { padding:18px 22px 22px;overflow-y:auto; }
        .mp-btn-save {
          display:inline-flex;align-items:center;gap:7px;
          padding:8px 14px;border-radius:11px;
          border:1.5px solid rgba(99,102,241,.3);
          background:rgba(99,102,241,.06);
          color:#4338ca;font-size:.82rem;font-weight:700;
          cursor:pointer;transition:all .15s;font-family:inherit;
        }
        .mp-btn-save:hover {
          background:rgba(99,102,241,.12);border-color:#6366f1;
          box-shadow:0 3px 10px rgba(99,102,241,.2);transform:translateY(-1px);
        }
        .mp-btn-list {
          display:inline-flex;align-items:center;gap:7px;
          padding:8px 14px;border-radius:11px;
          border:1.5px solid rgba(16,185,129,.3);
          background:rgba(16,185,129,.06);
          color:#047857;font-size:.82rem;font-weight:700;
          cursor:pointer;transition:all .15s;font-family:inherit;
        }
        .mp-btn-list:hover {
          background:rgba(16,185,129,.12);border-color:#10b981;
          box-shadow:0 3px 10px rgba(16,185,129,.2);transform:translateY(-1px);
        }
        .mp-input {
          width:100%;padding:9px 13px;border-radius:10px;
          border:1.5px solid #e5e7eb;background:#f9fafb;
          font-size:.85rem;color:#111;outline:none;
          font-family:inherit;box-sizing:border-box;transition:border-color .2s;
        }
        .mp-input:focus{border-color:#6366f1;background:#fff;}
        .mp-card {
          border-radius:12px;border:1.5px solid #e5e7eb;
          background:#fafafa;padding:14px 16px;
          display:flex;align-items:center;gap:12px;
          margin-bottom:8px;transition:border-color .15s;
        }
        .mp-card:hover{border-color:#d1d5db;}
        .mp-btn-primary {
          display:inline-flex;align-items:center;gap:7px;
          padding:10px 20px;border-radius:11px;border:none;
          background:${BG_DARK};color:#fff;
          font-weight:700;font-size:.85rem;cursor:pointer;
          font-family:inherit;transition:all .15s;
        }
        .mp-btn-primary:hover:not(:disabled){background:rgb(35,38,68);}
        .mp-btn-primary:disabled{opacity:.5;cursor:not-allowed;}
        .mp-btn-secondary {
          padding:10px 16px;border-radius:11px;
          border:1.5px solid #e5e7eb;background:#fff;
          color:#374151;font-weight:600;font-size:.85rem;
          cursor:pointer;font-family:inherit;
        }
        .mp-btn-secondary:hover{background:#f9fafb;}
        .mp-close {
          width:28px;height:28px;border-radius:8px;
          border:1px solid rgba(255,255,255,.15);
          background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);
          cursor:pointer;display:flex;align-items:center;justify-content:center;
          font-family:inherit;transition:all .15s;
        }
        .mp-close:hover{background:rgba(255,255,255,.18);color:#fff;}
      `}</style>

      {/* ── Botones disparadores ── */}
      <button
        className="mp-btn-save"
        type="button"
        onClick={() => setShowGuardar(true)}
      >
        <i className="bx bx-bookmark-plus" style={{ fontSize: 15 }} />
        Guardar plantilla
      </button>

      <button className="mp-btn-list" type="button" onClick={handleAbrirLista}>
        <i className="bx bx-collection" style={{ fontSize: 15 }} />
        Mis plantillas
        {plantillas.length > 0 && (
          <span
            style={{
              background: "#10b981",
              color: "#fff",
              borderRadius: 999,
              fontSize: ".68rem",
              padding: "1px 7px",
              fontWeight: 700,
            }}
          >
            {plantillas.length}
          </span>
        )}
      </button>

      {/* ── Modal Guardar ── */}
      {showGuardar && (
        <div
          className="mp-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuardar(false);
          }}
        >
          <div className="mp-modal" style={{ maxWidth: 440 }}>
            <div className="mp-header">
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
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      background: "rgba(255,255,255,.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i
                      className="bx bx-bookmark-plus"
                      style={{ fontSize: 18, color: "#fff" }}
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
                      Kanban
                    </div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: ".95rem",
                        fontWeight: 700,
                        color: "#fff",
                        lineHeight: 1.2,
                      }}
                    >
                      Guardar como plantilla
                    </h2>
                  </div>
                </div>
                <button
                  className="mp-close"
                  onClick={() => setShowGuardar(false)}
                >
                  <i className="bx bx-x" style={{ fontSize: 16 }} />
                </button>
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: ".74rem",
                  color: "rgba(255,255,255,.45)",
                  lineHeight: 1.5,
                }}
              >
                Se guardará la estructura actual de columnas y acciones (sin
                asistentes de IA).
              </p>
            </div>
            <div className="mp-body">
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: ".8rem",
                    fontWeight: 700,
                    color: "#374151",
                    marginBottom: 5,
                  }}
                >
                  Nombre *
                </label>
                <input
                  className="mp-input"
                  placeholder="Ej: Flujo ventas Ecuador"
                  value={nombreNueva}
                  onChange={(e) => setNombreNueva(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGuardar();
                  }}
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: ".8rem",
                    fontWeight: 700,
                    color: "#374151",
                    marginBottom: 5,
                  }}
                >
                  Descripción{" "}
                  <span style={{ fontWeight: 400, color: "#94a3b8" }}>
                    (opcional)
                  </span>
                </label>
                <textarea
                  className="mp-input"
                  placeholder="Breve descripción de este flujo..."
                  value={descNueva}
                  onChange={(e) => setDescNueva(e.target.value)}
                  rows={3}
                  style={{ resize: "none" }}
                />
              </div>
              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
              >
                <button
                  className="mp-btn-secondary"
                  onClick={() => setShowGuardar(false)}
                >
                  Cancelar
                </button>
                <button
                  className="mp-btn-primary"
                  onClick={handleGuardar}
                  disabled={guardando}
                >
                  {guardando ? (
                    <>
                      <i
                        className="bx bx-loader-alt bx-spin"
                        style={{ fontSize: 14 }}
                      />{" "}
                      Guardando...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-check" style={{ fontSize: 14 }} />{" "}
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Listar ── */}
      {showListar && (
        <div
          className="mp-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowListar(false);
          }}
        >
          <div className="mp-modal">
            <div className="mp-header">
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
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      background: "rgba(255,255,255,.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i
                      className="bx bx-collection"
                      style={{ fontSize: 18, color: "#fff" }}
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
                      Kanban
                    </div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: ".95rem",
                        fontWeight: 700,
                        color: "#fff",
                        lineHeight: 1.2,
                      }}
                    >
                      Mis plantillas guardadas
                    </h2>
                  </div>
                </div>
                <button
                  className="mp-close"
                  onClick={() => setShowListar(false)}
                >
                  <i className="bx bx-x" style={{ fontSize: 16 }} />
                </button>
              </div>
            </div>
            <div className="mp-body">
              {loadingList ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "30px 0",
                    color: "#94a3b8",
                  }}
                >
                  <i
                    className="bx bx-loader-alt bx-spin"
                    style={{
                      fontSize: "1.5rem",
                      display: "block",
                      marginBottom: 8,
                    }}
                  />
                  <span style={{ fontSize: ".85rem" }}>Cargando...</span>
                </div>
              ) : !plantillas.length ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "36px 20px",
                    color: "#94a3b8",
                  }}
                >
                  <i
                    className="bx bx-collection"
                    style={{
                      fontSize: "2.5rem",
                      display: "block",
                      marginBottom: 10,
                    }}
                  />
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Sin plantillas guardadas
                  </div>
                  <div style={{ fontSize: ".8rem" }}>
                    Usa el botón "Guardar plantilla" para guardar tu
                    configuración actual.
                  </div>
                </div>
              ) : (
                plantillas.map((p) => (
                  <div key={p.id} className="mp-card">
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "rgba(99,102,241,.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <i
                        className="bx bx-layout"
                        style={{ color: "#6366f1", fontSize: "1.2rem" }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: ".88rem",
                          color: "#0f172a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.nombre}
                      </div>
                      {p.descripcion && (
                        <div
                          style={{
                            fontSize: ".75rem",
                            color: "#64748b",
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.descripcion}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <span
                          style={{
                            fontSize: ".65rem",
                            fontWeight: 700,
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            borderRadius: 999,
                            padding: "1px 7px",
                          }}
                        >
                          {p.total_columnas} columnas
                        </span>
                        {p.total_prompts > 0 && (
                          <span
                            style={{
                              fontSize: ".65rem",
                              fontWeight: 700,
                              background: "#f0fdf4",
                              color: "#15803d",
                              borderRadius: 999,
                              padding: "1px 7px",
                            }}
                          >
                            <i
                              className="bx bx-bot"
                              style={{ fontSize: 10, marginRight: 3 }}
                            />
                            {p.total_prompts} prompts
                          </span>
                        )}
                        <span style={{ fontSize: ".65rem", color: "#94a3b8" }}>
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => handleAplicar(p)}
                        disabled={aplicando === p.id}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 9,
                          border: "none",
                          background: BG_DARK,
                          color: "#fff",
                          fontSize: ".75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          opacity: aplicando === p.id ? 0.5 : 1,
                        }}
                      >
                        {aplicando === p.id ? (
                          <>
                            <i
                              className="bx bx-loader-alt bx-spin"
                              style={{ fontSize: 12 }}
                            />{" "}
                            Aplicando
                          </>
                        ) : (
                          <>
                            <i
                              className="bx bxs-zap"
                              style={{ fontSize: 12 }}
                            />{" "}
                            Aplicar
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleEliminar(p)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          border: "1.5px solid #fecaca",
                          background: "#fef2f2",
                          color: "#ef4444",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "inherit",
                        }}
                      >
                        <i
                          className="bx bx-trash"
                          style={{ fontSize: "1rem" }}
                        />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MisPlantillas;
