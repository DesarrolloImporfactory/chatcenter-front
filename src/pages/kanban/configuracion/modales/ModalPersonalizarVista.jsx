import React, { useState, useMemo } from "react";

// ── Toggle switch custom (sin librerías) ──
const ToggleSwitch = ({ checked, onChange, color = "#6366f1" }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onChange(!checked);
    }}
    style={{
      width: 38,
      height: 22,
      borderRadius: 999,
      border: "none",
      background: checked ? color : "#cbd5e1",
      position: "relative",
      cursor: "pointer",
      transition: "all .2s",
      padding: 2,
      flexShrink: 0,
    }}
  >
    <span
      style={{
        position: "absolute",
        top: 2,
        left: checked ? 18 : 2,
        width: 18,
        height: 18,
        borderRadius: 999,
        background: "#fff",
        boxShadow: "0 2px 4px rgba(0,0,0,.2)",
        transition: "left .2s",
      }}
    />
  </button>
);

const quickBtnStyle = (disabled) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: disabled ? "#cbd5e1" : "#475569",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: "0.78rem",
  fontWeight: 600,
  transition: "all .15s",
  opacity: disabled ? 0.6 : 1,
});

const ModalPersonalizarVista = ({
  open,
  onClose,
  kanbanColumnas = [],
  columnasVisibles = null,
  onColumnasVisiblesChange,
  mostrarHuerfanos = true,
  onMostrarHuerfanosChange,
}) => {
  const [busqueda, setBusqueda] = useState("");

  // ⚠️ Hooks antes del return condicional
  const columnasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return kanbanColumnas;
    const q = busqueda.toLowerCase();
    return kanbanColumnas.filter((c) =>
      (c.nombre || "").toLowerCase().includes(q),
    );
  }, [kanbanColumnas, busqueda]);

  if (!open) return null;

  const totalCols = kanbanColumnas.length;
  const visiblesCount = columnasVisibles?.size ?? totalCols;
  const todasVisibles = visiblesCount === totalCols;

  const isVisible = (estado_db) => columnasVisibles?.has(estado_db) ?? true;

  const toggle = (estado_db) => {
    const base = columnasVisibles
      ? [...columnasVisibles]
      : kanbanColumnas.map((c) => c.estado_db);
    const nuevo = new Set(base);
    if (nuevo.has(estado_db)) nuevo.delete(estado_db);
    else nuevo.add(estado_db);
    onColumnasVisiblesChange?.([...nuevo]);
  };

  const seleccionarTodas = () =>
    onColumnasVisiblesChange?.(kanbanColumnas.map((c) => c.estado_db));

  const invertir = () => {
    const nuevo = kanbanColumnas
      .filter((c) => !isVisible(c.estado_db))
      .map((c) => c.estado_db);
    onColumnasVisiblesChange?.(nuevo);
  };

  const dejarSoloPrimera = () => {
    if (kanbanColumnas.length > 0) {
      onColumnasVisiblesChange?.([kanbanColumnas[0].estado_db]);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.55)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "modalBackdropIn .15s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 520,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,.25)",
          overflow: "hidden",
          animation: "modalContentIn .25s cubic-bezier(.16,1,.3,1)",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    boxShadow: "0 4px 10px rgba(99,102,241,.3)",
                  }}
                >
                  <i className="bx bx-show" style={{ fontSize: 18 }} />
                </span>
                Personalizar vista
              </h3>
              <p
                style={{
                  margin: "6px 0 0 42px",
                  fontSize: "0.82rem",
                  color: "#64748b",
                }}
              >
                <strong style={{ color: "#4338ca" }}>{visiblesCount}</strong> de{" "}
                {totalCols} columnas visibles
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 6,
                borderRadius: 10,
                color: "#64748b",
                display: "grid",
                placeItems: "center",
                transition: "background .15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f1f5f9")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <i className="bx bx-x" style={{ fontSize: 22 }} />
            </button>
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div
          style={{
            padding: "12px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={seleccionarTodas}
            disabled={todasVisibles}
            style={quickBtnStyle(todasVisibles)}
          >
            <i className="bx bx-check-double" /> Mostrar todas
          </button>
          <button onClick={invertir} style={quickBtnStyle(false)}>
            <i className="bx bx-transfer-alt" /> Invertir
          </button>
          <button onClick={dejarSoloPrimera} style={quickBtnStyle(false)}>
            <i className="bx bx-collapse-horizontal" /> Solo la 1ra
          </button>
        </div>

        {/* ── Búsqueda (solo si 8+ columnas) ── */}
        {kanbanColumnas.length >= 8 && (
          <div
            style={{
              padding: "12px 24px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#f8fafc",
                borderRadius: 10,
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
              }}
            >
              <i
                className="bx bx-search"
                style={{ color: "#94a3b8", fontSize: 16 }}
              />
              <input
                type="text"
                placeholder="Buscar columna..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "0.85rem",
                  color: "#0f172a",
                }}
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    padding: 2,
                  }}
                >
                  <i className="bx bx-x" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Lista de columnas ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 12px",
          }}
        >
          {columnasFiltradas.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 32,
                color: "#94a3b8",
                fontSize: "0.85rem",
              }}
            >
              <i
                className="bx bx-search-alt"
                style={{ fontSize: 32, opacity: 0.5 }}
              />
              <div style={{ marginTop: 8 }}>No se encontraron columnas</div>
            </div>
          ) : (
            columnasFiltradas.map((col) => {
              const visible = isVisible(col.estado_db);
              return (
                <div
                  key={col.estado_db}
                  onClick={() => toggle(col.estado_db)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 12,
                    cursor: "pointer",
                    background: visible
                      ? "rgba(99,102,241,.04)"
                      : "transparent",
                    border: `1px solid ${visible ? "rgba(99,102,241,.15)" : "transparent"}`,
                    marginBottom: 4,
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!visible) e.currentTarget.style.background = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    if (!visible)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Ícono color */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: col.color_fondo || "#e2e8f0",
                      display: "grid",
                      placeItems: "center",
                      color: col.color_texto || "#475569",
                      flexShrink: 0,
                      border: "1px solid rgba(0,0,0,.04)",
                    }}
                  >
                    {col.icono && (
                      <i className={col.icono} style={{ fontSize: 18 }} />
                    )}
                  </div>

                  {/* Nombre + estado_db */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        color: visible ? "#0f172a" : "#64748b",
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
                        marginTop: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col.estado_db}
                    </div>
                  </div>

                  {/* Toggle */}
                  <ToggleSwitch
                    checked={visible}
                    onChange={() => toggle(col.estado_db)}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* ── Toggle huérfanos (footer) ── */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #f1f5f9",
            background: "#fffbeb",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#FEF3C7",
              display: "grid",
              placeItems: "center",
              color: "#92400E",
              flexShrink: 0,
            }}
          >
            <i className="bx bx-error-circle" style={{ fontSize: 18 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.85rem",
                color: "#0f172a",
              }}
            >
              Mostrar "Sin clasificar"
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "#92400E",
                marginTop: 1,
              }}
            >
              Contactos con estado eliminado o sin asignar
            </div>
          </div>
          <ToggleSwitch
            checked={mostrarHuerfanos}
            onChange={onMostrarHuerfanosChange}
            color="#f59e0b"
          />
        </div>

        {/* ── Botón Listo ── */}
        <div
          style={{
            padding: 16,
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(99,102,241,.3)",
              transition: "transform .15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "translateY(-1px)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            Listo
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalBackdropIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @keyframes modalContentIn {
          from { opacity: 0; transform: translateY(20px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ModalPersonalizarVista;
